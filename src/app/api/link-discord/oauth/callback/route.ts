import { NextResponse } from "next/server";
import {
  codeKey,
  rewardLedgerDiscordKey,
  rewardLedgerSteamKey,
} from "@/lib/discord-link/codes";
import { kv } from "@/lib/discord-link/kv";
import { verifyState } from "@/lib/discord-link/secret";
import type { LinkRecord, RewardLedgerEntry } from "@/lib/discord-link/types";

export const dynamic = "force-dynamic";

const DISCORD_TOKEN_URL = "https://discord.com/api/oauth2/token";
const DISCORD_USER_URL = "https://discord.com/api/users/@me";
const DISCORD_GUILDS_URL = "https://discord.com/api/users/@me/guilds";

export async function GET(req: Request): Promise<NextResponse> {
  const url = new URL(req.url);
  const baseUrl = process.env.LINK_BASE_URL ?? `${url.protocol}//${url.host}`;

  const errorFromDiscord = url.searchParams.get("error");
  if (errorFromDiscord) {
    return redirectLanding(baseUrl, "", "discord_denied");
  }

  const oauthCode = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const stateCheck = verifyState(state);
  if (!stateCheck.ok || !oauthCode) {
    return redirectLanding(baseUrl, "", "invalid_state");
  }

  const sep = stateCheck.payload.indexOf("|");
  if (sep < 0) {
    return redirectLanding(baseUrl, "", "invalid_state");
  }
  const serverSaveId = stateCheck.payload.slice(0, sep);
  const pairingCode = stateCheck.payload.slice(sep + 1);

  const lookup = await kv.get<LinkRecord>(codeKey(serverSaveId, pairingCode));
  if (!lookup.ok) {
    return redirectLanding(baseUrl, pairingCode, "kv_unavailable");
  }
  const record = lookup.value;
  if (!record) {
    return redirectLanding(baseUrl, pairingCode, "not_found");
  }
  if (record.expiresAt < Date.now()) {
    return redirectLanding(baseUrl, pairingCode, "expired");
  }
  if (record.status !== "pending") {
    return redirectLanding(baseUrl, pairingCode, "already_used");
  }

  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  const redirectUri = process.env.DISCORD_REDIRECT_URI;
  const requiredGuildId = process.env.DISCORD_REQUIRED_GUILD_ID;
  if (!clientId || !clientSecret || !redirectUri || !requiredGuildId) {
    await markError(serverSaveId, pairingCode, record, "server_misconfigured");
    return redirectLanding(baseUrl, pairingCode, "server_misconfigured");
  }

  let accessToken: string;
  try {
    accessToken = await exchangeToken({
      code: oauthCode,
      clientId,
      clientSecret,
      redirectUri,
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : "token_exchange_failed";
    // Discord's token endpoint returns a JSON body with { error, error_description }
    // on failure. We log it server-side (visible in Vercel function logs) so an
    // operator can diagnose mismatched client_secret / redirect_uri without
    // exposing details to the player. The landing page only sees the short code.
    console.error("[link-discord] token exchange failed", {
      reason,
      clientIdSuffix: clientId?.slice(-4) ?? "?",
      redirectUri,
      hasSecret: Boolean(clientSecret),
      secretLength: clientSecret?.length ?? 0,
    });
    const tag = reason.startsWith("discord_") ? reason : "token_exchange_failed";
    await markError(serverSaveId, pairingCode, record, tag);
    return redirectLanding(baseUrl, pairingCode, tag);
  }

  let me: { id: string; username: string; global_name?: string | null };
  try {
    me = await fetchJson(DISCORD_USER_URL, accessToken) as typeof me;
  } catch {
    await markError(serverSaveId, pairingCode, record, "discord_user_failed");
    return redirectLanding(baseUrl, pairingCode, "discord_user_failed");
  }

  let guilds: Array<{ id: string }>;
  try {
    guilds = (await fetchJson(DISCORD_GUILDS_URL, accessToken)) as Array<{ id: string }>;
  } catch {
    await markError(serverSaveId, pairingCode, record, "discord_guilds_failed");
    return redirectLanding(baseUrl, pairingCode, "discord_guilds_failed");
  }

  if (!Array.isArray(guilds) || !guilds.some((g) => g?.id === requiredGuildId)) {
    return redirectLanding(baseUrl, pairingCode, "not_in_guild");
  }

  const discordId = me.id;
  const discordUsername = me.global_name?.trim() || me.username;

  // Atomic single-reward-per-Discord guard.
  const ledgerEntry: RewardLedgerEntry = {
    firstSteamId: record.steamId,
    firstClaimAtUtc: new Date().toISOString(),
    serverSaveId: record.serverSaveId,
  };
  const claim = await kv.setJson(
    rewardLedgerDiscordKey(discordId),
    ledgerEntry,
    { nx: true },
  );
  if (!claim.ok) {
    await markError(serverSaveId, pairingCode, record, "kv_unavailable");
    return redirectLanding(baseUrl, pairingCode, "kv_unavailable");
  }

  let rewardEligible = claim.value;
  if (!rewardEligible) {
    const existing = await kv.get<RewardLedgerEntry>(
      rewardLedgerDiscordKey(discordId),
    );
    if (existing.ok && existing.value && existing.value.firstSteamId === record.steamId) {
      // Same player retrying — still not eligible (already paid before).
      rewardEligible = false;
    }
  } else {
    await kv.setJson(
      rewardLedgerSteamKey(record.serverSaveId, record.steamId),
      { discordId, claimAtUtc: ledgerEntry.firstClaimAtUtc },
      {},
    );
  }

  const updated: LinkRecord = {
    ...record,
    status: "verified",
    discordId,
    discordUsername,
    rewardEligible,
  };
  const persist = await kv.setJson(
    codeKey(serverSaveId, pairingCode),
    updated,
    { ttlSeconds: secondsUntil(record.expiresAt) },
  );
  if (!persist.ok) {
    return redirectLanding(baseUrl, pairingCode, "kv_unavailable");
  }

  return redirectLanding(
    baseUrl,
    pairingCode,
    rewardEligible ? "verified" : "verified_no_reward",
  );
}

async function exchangeToken(params: {
  code: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): Promise<string> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: params.code,
    redirect_uri: params.redirectUri,
    client_id: params.clientId,
    client_secret: params.clientSecret,
  });
  const res = await fetch(DISCORD_TOKEN_URL, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      accept: "application/json",
    },
    body: body.toString(),
    cache: "no-store",
  });

  // Always read the body — Discord returns useful diagnostics on both
  // success and failure. On failure we log it server-side and translate
  // the OAuth error code into a distinct landing-page reason so the
  // operator can tell invalid_client / invalid_grant / redirect_uri_mismatch
  // apart at a glance.
  const text = await res.text();

  if (!res.ok) {
    let oauthError: string | undefined;
    let oauthDescription: string | undefined;
    try {
      const parsed = JSON.parse(text) as { error?: string; error_description?: string };
      oauthError = parsed.error;
      oauthDescription = parsed.error_description;
    } catch {
      // not JSON, fall through with raw text
    }
    console.error("[link-discord] discord token endpoint rejected", {
      status: res.status,
      oauthError,
      oauthDescription,
      bodyPreview: text.slice(0, 400),
    });
    const tag = oauthError ? `discord_${oauthError}` : `token_status_${res.status}`;
    throw new Error(tag);
  }

  let json: { access_token?: string };
  try {
    json = JSON.parse(text) as { access_token?: string };
  } catch {
    throw new Error("token_response_invalid_json");
  }
  if (!json.access_token) {
    throw new Error("token_missing");
  }
  return json.access_token;
}

async function fetchJson(url: string, accessToken: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: {
      authorization: `Bearer ${accessToken}`,
      accept: "application/json",
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`status_${res.status}`);
  }
  return await res.json();
}

async function markError(
  serverSaveId: string,
  pairingCode: string,
  record: LinkRecord,
  error: string,
): Promise<void> {
  await kv.setJson(
    codeKey(serverSaveId, pairingCode),
    { ...record, error },
    { ttlSeconds: secondsUntil(record.expiresAt) },
  );
}

function secondsUntil(epochMs: number): number {
  return Math.max(1, Math.floor((epochMs - Date.now()) / 1000));
}

function redirectLanding(baseUrl: string, code: string, status: string): NextResponse {
  const trimmed = baseUrl.replace(/\/$/, "");
  const url = new URL(`${trimmed}/link-discord`);
  if (code) url.searchParams.set("code", code);
  url.searchParams.set("status", status);
  return NextResponse.redirect(url.toString());
}
