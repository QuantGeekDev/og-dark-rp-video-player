import { NextResponse } from "next/server";
import { rewardLedgerDiscordKey } from "@/lib/discord-link/codes";
import { kv } from "@/lib/discord-link/kv";
import { syncDiscordGuildNickname } from "@/lib/discord-link/nickname";
import {
  readSharedSecretHeader,
  verifySharedSecretHeader,
} from "@/lib/discord-link/secret";
import type {
  NicknameSyncReason,
  NicknameSyncRequest,
  NicknameSyncResponse,
  RewardLedgerEntry,
} from "@/lib/discord-link/types";

export const dynamic = "force-dynamic";

const STEAM_ID_PATTERN = /^[0-9]{1,20}$/;
const DISCORD_ID_PATTERN = /^[0-9]{5,32}$/;
const SERVER_SAVE_ID_PATTERN = /^[A-Za-z0-9_.-]{0,64}$/;
const VALID_REASONS = new Set<NicknameSyncReason>([
  "linked",
  "rpname_changed",
  "join_reconcile",
  "admin_manual",
  "admin_force_link",
]);

export async function POST(req: Request): Promise<NextResponse> {
  if (!verifySharedSecretHeader(readSharedSecretHeader(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = parseRequest(body);
  if (!parsed.ok) {
    return NextResponse.json<NicknameSyncResponse>(
      { ok: false, status: "bad_request", error: parsed.error },
      { status: 400 },
    );
  }

  const ledger = await kv.get<RewardLedgerEntry>(
    rewardLedgerDiscordKey(parsed.value.discordId),
  );
  if (!ledger.ok) {
    return NextResponse.json<NicknameSyncResponse>(
      { ok: false, status: "discord_error", error: "kv_unavailable" },
      { status: 503 },
    );
  }

  if (
    ledger.value &&
    ledger.value.firstSteamId !== parsed.value.steamId &&
    parsed.value.reason !== "admin_force_link"
  ) {
    return NextResponse.json<NicknameSyncResponse>({
      ok: false,
      status: "nickname_sync_not_allowed",
      error: "discord_already_linked_to_other_steam",
    });
  }

  const result = await syncDiscordGuildNickname({
    discordId: parsed.value.discordId,
    displayName: parsed.value.displayName,
  });

  return NextResponse.json<NicknameSyncResponse>(result, {
    status: result.status === "bad_request" ? 400 : 200,
  });
}

function parseRequest(
  body: unknown,
): { ok: true; value: NicknameSyncRequest } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "invalid_body" };
  }

  const value = body as Record<string, unknown>;
  const serverSaveId =
    typeof value.serverSaveId === "string" ? value.serverSaveId : "";
  const steamId = typeof value.steamId === "string" ? value.steamId : "";
  const discordId = typeof value.discordId === "string" ? value.discordId : "";
  const displayName =
    typeof value.displayName === "string" ? value.displayName : "";
  const reason = typeof value.reason === "string" ? value.reason : "";

  if (!SERVER_SAVE_ID_PATTERN.test(serverSaveId)) {
    return { ok: false, error: "invalid_server_save_id" };
  }
  if (!STEAM_ID_PATTERN.test(steamId) || steamId === "0") {
    return { ok: false, error: "invalid_steam_id" };
  }
  if (!DISCORD_ID_PATTERN.test(discordId)) {
    return { ok: false, error: "invalid_discord_id" };
  }
  if (!displayName.trim()) {
    return { ok: false, error: "invalid_display_name" };
  }
  if (!VALID_REASONS.has(reason as NicknameSyncReason)) {
    return { ok: false, error: "invalid_reason" };
  }

  return {
    ok: true,
    value: {
      serverSaveId,
      steamId,
      discordId,
      displayName,
      reason: reason as NicknameSyncReason,
    },
  };
}
