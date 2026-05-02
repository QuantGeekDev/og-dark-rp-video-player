import { NextResponse } from "next/server";
import {
  codeKey,
  generateCode,
  pendingBySteamKey,
  rateLimitSteamKey,
} from "@/lib/discord-link/codes";
import { kv } from "@/lib/discord-link/kv";
import {
  readSharedSecretHeader,
  verifySharedSecretHeader,
} from "@/lib/discord-link/secret";
import {
  PAIRING_TTL_SECONDS,
  RATE_LIMIT_MAX_PER_WINDOW,
  RATE_LIMIT_WINDOW_SECONDS,
  type IssueResponse,
  type LinkRecord,
} from "@/lib/discord-link/types";

export const dynamic = "force-dynamic";

const STEAM_ID_PATTERN = /^[0-9]{1,20}$/;
const SERVER_SAVE_ID_PATTERN = /^[A-Za-z0-9_.-]{0,64}$/;

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

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const { steamId, displayName, serverSaveId } = body as Record<string, unknown>;

  if (typeof steamId !== "string" || !STEAM_ID_PATTERN.test(steamId)) {
    return NextResponse.json({ error: "invalid_steam_id" }, { status: 400 });
  }
  if (steamId === "0") {
    return NextResponse.json({ error: "host_steam_id_not_supported" }, { status: 400 });
  }

  const normalizedServerSaveId =
    typeof serverSaveId === "string" ? serverSaveId : "";
  if (!SERVER_SAVE_ID_PATTERN.test(normalizedServerSaveId)) {
    return NextResponse.json({ error: "invalid_server_save_id" }, { status: 400 });
  }

  if (typeof displayName !== "string" || displayName.length === 0) {
    return NextResponse.json({ error: "invalid_display_name" }, { status: 400 });
  }
  const cleanedDisplayName = displayName
    .replace(/[\r\n\t]+/g, " ")
    .trim()
    .slice(0, 64);
  if (cleanedDisplayName.length === 0) {
    return NextResponse.json({ error: "invalid_display_name" }, { status: 400 });
  }

  const baseUrl = process.env.LINK_BASE_URL;
  if (!baseUrl) {
    return NextResponse.json({ error: "server_misconfigured" }, { status: 500 });
  }

  const rl = await kv.incrWithTtl(
    rateLimitSteamKey(normalizedServerSaveId, steamId),
    RATE_LIMIT_WINDOW_SECONDS,
  );
  if (!rl.ok) {
    return NextResponse.json({ error: "kv_unavailable" }, { status: 503 });
  }
  if (rl.value > RATE_LIMIT_MAX_PER_WINDOW) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "retry-after": String(RATE_LIMIT_WINDOW_SECONDS) } },
    );
  }

  const reuseKey = pendingBySteamKey(normalizedServerSaveId, steamId);
  const reuse = await kv.get<{ code: string; expiresAt: number }>(reuseKey);
  if (!reuse.ok) {
    return NextResponse.json({ error: "kv_unavailable" }, { status: 503 });
  }
  if (reuse.value && reuse.value.expiresAt - Date.now() > 60_000) {
    return NextResponse.json<IssueResponse>({
      code: reuse.value.code,
      verifyUrl: buildVerifyUrl(baseUrl, reuse.value.code, normalizedServerSaveId),
      expiresInSeconds: Math.max(
        0,
        Math.floor((reuse.value.expiresAt - Date.now()) / 1000),
      ),
    });
  }

  let code = "";
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = generateCode();
    const record: LinkRecord = {
      steamId,
      serverSaveId: normalizedServerSaveId,
      displayName: cleanedDisplayName,
      issuedAt: Date.now(),
      expiresAt: Date.now() + PAIRING_TTL_SECONDS * 1000,
      status: "pending",
    };
    const setResult = await kv.setJson(
      codeKey(normalizedServerSaveId, candidate),
      record,
      { ttlSeconds: PAIRING_TTL_SECONDS, nx: true },
    );
    if (!setResult.ok) {
      return NextResponse.json({ error: "kv_unavailable" }, { status: 503 });
    }
    if (setResult.value) {
      code = candidate;
      break;
    }
  }
  if (!code) {
    return NextResponse.json({ error: "code_generation_failed" }, { status: 500 });
  }

  await kv.setJson(
    reuseKey,
    { code, expiresAt: Date.now() + PAIRING_TTL_SECONDS * 1000 },
    { ttlSeconds: PAIRING_TTL_SECONDS },
  );

  return NextResponse.json<IssueResponse>({
    code,
    verifyUrl: buildVerifyUrl(baseUrl, code, normalizedServerSaveId),
    expiresInSeconds: PAIRING_TTL_SECONDS,
  });
}

// The verify URL must round-trip serverSaveId so the landing page can look up
// the pairing record under the same KV key the issue handler wrote it to
// (`link:code:<serverSaveId>:<code>`). Production servers launch with
// `+drp.server_save_id og-darkrp-main`, so omitting it here caused every
// player to see "Code not found" after running /linkdiscord.
function buildVerifyUrl(baseUrl: string, code: string, serverSaveId: string): string {
  const trimmed = baseUrl.replace(/\/$/, "");
  const params = new URLSearchParams({ code });
  if (serverSaveId) params.set("serverSaveId", serverSaveId);
  return `${trimmed}/link-discord?${params.toString()}`;
}
