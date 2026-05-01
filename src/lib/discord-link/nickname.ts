import type { NicknameSyncResponse } from "./types";

const DISCORD_NICK_MAX_LENGTH = 32;
const DISCORD_API_BASE = "https://discord.com/api/v10";

export type FetchLike = typeof fetch;

export function normalizeDiscordNickname(
  displayName: string,
): { ok: true; nick: string } | { ok: false; error: string } {
  if (typeof displayName !== "string") {
    return { ok: false, error: "invalid_display_name" };
  }

  const cleaned = displayName
    .replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2060-\u206F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) {
    return { ok: false, error: "invalid_display_name" };
  }

  const chars = Array.from(cleaned);
  return {
    ok: true,
    nick: chars.slice(0, DISCORD_NICK_MAX_LENGTH).join(""),
  };
}

export async function syncDiscordGuildNickname(
  input: {
    discordId: string;
    displayName: string;
  },
  fetchImpl: FetchLike = fetch,
): Promise<NicknameSyncResponse> {
  if (process.env.DISCORD_NICKNAME_SYNC_ENABLED !== "true") {
    return {
      ok: false,
      status: "disabled",
      error: "nickname_sync_disabled",
    };
  }

  const normalized = normalizeDiscordNickname(input.displayName);
  if (!normalized.ok) {
    return {
      ok: false,
      status: "bad_request",
      error: normalized.error,
    };
  }

  if (process.env.DISCORD_NICKNAME_SYNC_DRY_RUN === "true") {
    return {
      ok: true,
      status: "dry_run",
      appliedNick: normalized.nick,
    };
  }

  const botToken = process.env.DISCORD_BOT_TOKEN;
  const guildId =
    process.env.DISCORD_NICKNAME_GUILD_ID ??
    process.env.DISCORD_REQUIRED_GUILD_ID;

  if (!botToken || !guildId) {
    return {
      ok: false,
      status: "server_misconfigured",
      error: "discord_bot_not_configured",
    };
  }

  const url = `${DISCORD_API_BASE}/guilds/${encodeURIComponent(guildId)}/members/${encodeURIComponent(input.discordId)}`;
  let res: Response;
  try {
    res = await fetchImpl(url, {
      method: "PATCH",
      headers: {
        authorization: `Bot ${botToken}`,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({ nick: normalized.nick }),
      cache: "no-store",
    });
  } catch {
    return {
      ok: false,
      status: "discord_error",
      error: "discord_transport_error",
    };
  }

  if (res.status === 200 || res.status === 204) {
    return {
      ok: true,
      status: "synced",
      appliedNick: normalized.nick,
    };
  }

  if (res.status === 429) {
    const retryAfterSeconds = await readRetryAfterSeconds(res);
    return {
      ok: false,
      status: "rate_limited",
      error: "discord_rate_limited",
      retryAfterSeconds,
    };
  }

  if (res.status === 400) {
    return { ok: false, status: "bad_request", error: "discord_bad_request" };
  }

  if (res.status === 401) {
    return {
      ok: false,
      status: "server_misconfigured",
      error: "discord_bot_unauthorized",
    };
  }

  if (res.status === 403) {
    return {
      ok: false,
      status: "forbidden",
      error: "discord_forbidden_role_hierarchy",
    };
  }

  if (res.status === 404) {
    return {
      ok: false,
      status: "not_found",
      error: "discord_member_not_found",
    };
  }

  return {
    ok: false,
    status: "discord_error",
    error: `discord_status_${res.status}`,
  };
}

async function readRetryAfterSeconds(res: Response): Promise<number | undefined> {
  const header = res.headers.get("retry-after");
  if (header) {
    const parsed = Number(header);
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  }

  try {
    const body = (await res.json()) as { retry_after?: unknown };
    const parsed = Number(body.retry_after);
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  } catch {
    // Discord may return an empty body on intermediary failures.
  }

  return undefined;
}
