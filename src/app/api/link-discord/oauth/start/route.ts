import { NextResponse } from "next/server";
import { codeKey, isValidCode } from "@/lib/discord-link/codes";
import { kv } from "@/lib/discord-link/kv";
import { signState } from "@/lib/discord-link/secret";
import type { LinkRecord } from "@/lib/discord-link/types";

export const dynamic = "force-dynamic";

const DISCORD_AUTHORIZE_URL = "https://discord.com/api/oauth2/authorize";

export async function GET(req: Request): Promise<NextResponse> {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const serverSaveId = url.searchParams.get("serverSaveId") ?? "";

  if (!isValidCode(code)) {
    return NextResponse.redirect(buildLandingErrorUrl(url, "invalid_code"));
  }

  const lookup = await kv.get<LinkRecord>(codeKey(serverSaveId, code));
  if (!lookup.ok) {
    return NextResponse.redirect(buildLandingErrorUrl(url, "kv_unavailable"));
  }
  const record = lookup.value;
  if (!record) {
    return NextResponse.redirect(buildLandingErrorUrl(url, "not_found"));
  }
  if (record.expiresAt < Date.now()) {
    return NextResponse.redirect(buildLandingErrorUrl(url, "expired"));
  }
  if (record.status !== "pending") {
    return NextResponse.redirect(buildLandingErrorUrl(url, "already_used"));
  }

  const clientId = process.env.DISCORD_CLIENT_ID;
  const redirectUri = process.env.DISCORD_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    return NextResponse.redirect(buildLandingErrorUrl(url, "server_misconfigured"));
  }

  const statePayload = `${serverSaveId}|${code}`;
  const state = signState(statePayload);

  const oauthUrl = new URL(DISCORD_AUTHORIZE_URL);
  oauthUrl.searchParams.set("response_type", "code");
  oauthUrl.searchParams.set("client_id", clientId);
  oauthUrl.searchParams.set("scope", "identify guilds");
  oauthUrl.searchParams.set("redirect_uri", redirectUri);
  oauthUrl.searchParams.set("state", state);
  oauthUrl.searchParams.set("prompt", "consent");

  return NextResponse.redirect(oauthUrl.toString());
}

function buildLandingErrorUrl(reqUrl: URL, error: string): string {
  const back = new URL(reqUrl);
  back.pathname = "/link-discord";
  back.searchParams.set("error", error);
  return back.toString();
}
