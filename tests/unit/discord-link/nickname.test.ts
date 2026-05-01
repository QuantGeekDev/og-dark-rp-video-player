import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { rewardLedgerDiscordKey } from "@/lib/discord-link/codes";
import type { KvLike } from "@/lib/discord-link/kv";
import {
  normalizeDiscordNickname,
  syncDiscordGuildNickname,
  type FetchLike,
} from "@/lib/discord-link/nickname";

const TEST_SECRET = "0123456789abcdef0123456789abcdef";

const backend = {
  store: new Map<string, unknown>(),
};

const mockKv: KvLike = {
  async get<T>(key: string) {
    return {
      ok: true as const,
      value: backend.store.has(key) ? (backend.store.get(key) as T) : null,
    };
  },
  async setJson(key, value) {
    backend.store.set(key, value);
    return { ok: true as const, value: true };
  },
  async del(key) {
    return { ok: true as const, value: backend.store.delete(key) ? 1 : 0 };
  },
  async incrWithTtl() {
    return { ok: true as const, value: 1 };
  },
};

vi.mock("@/lib/discord-link/kv", () => ({ kv: mockKv }));

const { POST } = await import("@/app/api/link-discord/nickname-sync/route");

function setBaseEnv() {
  process.env.LINK_SHARED_SECRET = TEST_SECRET;
  process.env.DISCORD_NICKNAME_SYNC_ENABLED = "true";
  process.env.DISCORD_NICKNAME_SYNC_DRY_RUN = "false";
  process.env.DISCORD_BOT_TOKEN = "bot-token";
  process.env.DISCORD_NICKNAME_GUILD_ID = "1497692419729133661";
}

function clearEnv() {
  delete process.env.LINK_SHARED_SECRET;
  delete process.env.DISCORD_NICKNAME_SYNC_ENABLED;
  delete process.env.DISCORD_NICKNAME_SYNC_DRY_RUN;
  delete process.env.DISCORD_BOT_TOKEN;
  delete process.env.DISCORD_NICKNAME_GUILD_ID;
}

function buildRequest(body: unknown, secret: string | null = TEST_SECRET): Request {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (secret) headers["x-link-secret"] = secret;
  return new Request("https://example.test/api/link-discord/nickname-sync", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

describe("discord-link nickname normalization", () => {
  it("accepts normal roleplay names", () => {
    expect(normalizeDiscordNickname("John Smith")).toEqual({
      ok: true,
      nick: "John Smith",
    });
  });

  it("collapses whitespace and strips controls", () => {
    expect(normalizeDiscordNickname(" John\n\tSmith\u200B ")).toEqual({
      ok: true,
      nick: "John Smith",
    });
  });

  it("rejects blank names", () => {
    expect(normalizeDiscordNickname(" \n\t ")).toEqual({
      ok: false,
      error: "invalid_display_name",
    });
  });

  it("truncates to Discord's 32 character nickname limit", () => {
    const result = normalizeDiscordNickname("A".repeat(35));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.nick).toHaveLength(32);
      expect(result.nick).toBe("A".repeat(32));
    }
  });
});

describe("syncDiscordGuildNickname", () => {
  beforeEach(setBaseEnv);
  afterEach(clearEnv);

  it("returns disabled without fetching when the feature flag is off", async () => {
    process.env.DISCORD_NICKNAME_SYNC_ENABLED = "false";
    const fetchImpl = vi.fn() as unknown as FetchLike;
    const result = await syncDiscordGuildNickname(
      { discordId: "1499000000000000000", displayName: "John Smith" },
      fetchImpl,
    );
    expect(result.status).toBe("disabled");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("returns dry-run without fetching", async () => {
    process.env.DISCORD_NICKNAME_SYNC_DRY_RUN = "true";
    const fetchImpl = vi.fn() as unknown as FetchLike;
    const result = await syncDiscordGuildNickname(
      { discordId: "1499000000000000000", displayName: "John Smith" },
      fetchImpl,
    );
    expect(result).toEqual({ ok: true, status: "dry_run", appliedNick: "John Smith" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("maps Discord 403 to role hierarchy failure", async () => {
    const fetchImpl = vi.fn(async () => new Response("{}", { status: 403 })) as unknown as FetchLike;
    const result = await syncDiscordGuildNickname(
      { discordId: "1499000000000000000", displayName: "John Smith" },
      fetchImpl,
    );
    expect(result.status).toBe("forbidden");
    expect(result.error).toBe("discord_forbidden_role_hierarchy");
  });

  it("maps Discord 429 retry_after body", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(JSON.stringify({ retry_after: 2.5 }), {
          status: 429,
          headers: { "content-type": "application/json" },
        }),
    ) as unknown as FetchLike;
    const result = await syncDiscordGuildNickname(
      { discordId: "1499000000000000000", displayName: "John Smith" },
      fetchImpl,
    );
    expect(result.status).toBe("rate_limited");
    expect(result.retryAfterSeconds).toBe(2.5);
  });
});

describe("POST /api/link-discord/nickname-sync", () => {
  beforeEach(() => {
    setBaseEnv();
    process.env.DISCORD_NICKNAME_SYNC_DRY_RUN = "true";
    backend.store.clear();
  });

  afterEach(clearEnv);

  it("rejects requests without the shared secret", async () => {
    const res = await POST(
      buildRequest(
        {
          serverSaveId: "dev",
          steamId: "76561",
          discordId: "1499000000000000000",
          displayName: "John Smith",
          reason: "linked",
        },
        null,
      ),
    );
    expect(res.status).toBe(401);
  });

  it("rejects invalid Discord IDs", async () => {
    const res = await POST(
      buildRequest({
        serverSaveId: "dev",
        steamId: "76561",
        discordId: "abc",
        displayName: "John Smith",
        reason: "linked",
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("invalid_discord_id");
  });

  it("rejects unknown reasons", async () => {
    const res = await POST(
      buildRequest({
        serverSaveId: "dev",
        steamId: "76561",
        discordId: "1499000000000000000",
        displayName: "John Smith",
        reason: "mystery",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns dry-run result for a valid request", async () => {
    const res = await POST(
      buildRequest({
        serverSaveId: "dev",
        steamId: "76561",
        discordId: "1499000000000000000",
        displayName: "John Smith",
        reason: "linked",
      }),
    );
    const body = await res.json();
    expect(body).toEqual({
      ok: true,
      status: "dry_run",
      appliedNick: "John Smith",
    });
  });

  it("blocks duplicate Discord nickname ownership unless admin force-linking", async () => {
    backend.store.set(rewardLedgerDiscordKey("1499000000000000000"), {
      firstSteamId: "999",
      firstClaimAtUtc: "2026-04-29T00:00:00.000Z",
      serverSaveId: "dev",
    });

    const res = await POST(
      buildRequest({
        serverSaveId: "dev",
        steamId: "76561",
        discordId: "1499000000000000000",
        displayName: "John Smith",
        reason: "linked",
      }),
    );
    const body = await res.json();
    expect(body.status).toBe("nickname_sync_not_allowed");

    const forced = await POST(
      buildRequest({
        serverSaveId: "dev",
        steamId: "76561",
        discordId: "1499000000000000000",
        displayName: "John Smith",
        reason: "admin_force_link",
      }),
    );
    const forcedBody = await forced.json();
    expect(forcedBody.status).toBe("dry_run");
  });
});
