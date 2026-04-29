import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { codeKey } from "@/lib/discord-link/codes";
import type { KvLike } from "@/lib/discord-link/kv";
import type { LinkRecord } from "@/lib/discord-link/types";

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
    return {
      ok: true as const,
      value: backend.store.delete(key) ? 1 : 0,
    };
  },
  async incrWithTtl() {
    return { ok: true as const, value: 1 };
  },
};

vi.mock("@/lib/discord-link/kv", () => ({ kv: mockKv }));

const { GET } = await import("@/app/api/link-discord/status/route");

function buildRequest(qs: string, secret: string | null = TEST_SECRET): Request {
  const headers: Record<string, string> = {};
  if (secret) headers["x-link-secret"] = secret;
  return new Request(`https://example.test/api/link-discord/status${qs}`, {
    method: "GET",
    headers,
  });
}

describe("GET /api/link-discord/status", () => {
  beforeEach(() => {
    process.env.LINK_SHARED_SECRET = TEST_SECRET;
    backend.store.clear();
  });

  afterEach(() => {
    delete process.env.LINK_SHARED_SECRET;
  });

  it("rejects requests without a shared secret", async () => {
    const res = await GET(buildRequest("?code=ABCDEFGH&serverSaveId=dev", null));
    expect(res.status).toBe(401);
  });

  it("returns not_found for missing code", async () => {
    const res = await GET(buildRequest("?code=ABCDEFGH&serverSaveId=dev"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("not_found");
  });

  it("returns not_found for malformed code", async () => {
    const res = await GET(buildRequest("?code=abc&serverSaveId=dev"));
    const body = await res.json();
    expect(body.status).toBe("not_found");
  });

  it("returns expired when expiry has passed", async () => {
    const record: LinkRecord = {
      steamId: "1",
      serverSaveId: "dev",
      displayName: "P",
      issuedAt: Date.now() - 10_000,
      expiresAt: Date.now() - 1_000,
      status: "pending",
    };
    backend.store.set(codeKey("dev", "ABCDEFGH"), record);
    const res = await GET(buildRequest("?code=ABCDEFGH&serverSaveId=dev"));
    const body = await res.json();
    expect(body.status).toBe("expired");
  });

  it("returns pending while unverified", async () => {
    const record: LinkRecord = {
      steamId: "1",
      serverSaveId: "dev",
      displayName: "P",
      issuedAt: Date.now(),
      expiresAt: Date.now() + 60_000,
      status: "pending",
    };
    backend.store.set(codeKey("dev", "ABCDEFGH"), record);
    const res = await GET(buildRequest("?code=ABCDEFGH&serverSaveId=dev"));
    const body = await res.json();
    expect(body.status).toBe("pending");
  });

  it("returns verified data and consumes when consume=1", async () => {
    const record: LinkRecord = {
      steamId: "1",
      serverSaveId: "dev",
      displayName: "P",
      issuedAt: Date.now(),
      expiresAt: Date.now() + 60_000,
      status: "verified",
      discordId: "999",
      discordUsername: "ghost",
      rewardEligible: true,
    };
    backend.store.set(codeKey("dev", "ABCDEFGH"), record);
    const res = await GET(
      buildRequest("?code=ABCDEFGH&serverSaveId=dev&consume=1"),
    );
    const body = await res.json();
    expect(body).toEqual({
      status: "verified",
      discordId: "999",
      discordUsername: "ghost",
      rewardEligible: true,
    });
    expect(backend.store.has(codeKey("dev", "ABCDEFGH"))).toBe(false);

    const res2 = await GET(
      buildRequest("?code=ABCDEFGH&serverSaveId=dev&consume=1"),
    );
    const body2 = await res2.json();
    expect(body2.status).toBe("not_found");
  });
});
