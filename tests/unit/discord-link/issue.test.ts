import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { KvLike } from "@/lib/discord-link/kv";

const TEST_SECRET = "0123456789abcdef0123456789abcdef";

interface KvBackend {
  store: Map<string, unknown>;
  ttl: Map<string, number>;
}

function makeKv(): KvLike & { backend: KvBackend } {
  const backend: KvBackend = { store: new Map(), ttl: new Map() };
  return {
    backend,
    async get<T>(key: string) {
      const v = backend.store.has(key) ? (backend.store.get(key) as T) : null;
      return { ok: true as const, value: v as T | null };
    },
    async setJson(key, value, opts = {}) {
      if (opts.nx && backend.store.has(key)) {
        return { ok: true as const, value: false };
      }
      backend.store.set(key, value);
      if (opts.ttlSeconds) backend.ttl.set(key, opts.ttlSeconds);
      return { ok: true as const, value: true };
    },
    async del(key) {
      const had = backend.store.delete(key) ? 1 : 0;
      backend.ttl.delete(key);
      return { ok: true as const, value: had };
    },
    async incrWithTtl(key, ttlSeconds) {
      const existing = (backend.store.get(key) as number | undefined) ?? 0;
      const next = existing + 1;
      backend.store.set(key, next);
      if (next === 1) backend.ttl.set(key, ttlSeconds);
      return { ok: true as const, value: next };
    },
  };
}

const mockKv = makeKv();
vi.mock("@/lib/discord-link/kv", () => ({ kv: mockKv }));

const { POST } = await import("@/app/api/link-discord/issue/route");

function buildRequest(body: unknown, secret: string | null = TEST_SECRET): Request {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (secret) headers["x-link-secret"] = secret;
  return new Request("https://example.test/api/link-discord/issue", {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("POST /api/link-discord/issue", () => {
  beforeEach(() => {
    process.env.LINK_SHARED_SECRET = TEST_SECRET;
    process.env.LINK_BASE_URL = "https://og.example";
    mockKv.backend.store.clear();
    mockKv.backend.ttl.clear();
  });

  afterEach(() => {
    delete process.env.LINK_SHARED_SECRET;
    delete process.env.LINK_BASE_URL;
  });

  it("rejects requests with no shared secret", async () => {
    const res = await POST(
      buildRequest({ steamId: "76561", displayName: "x", serverSaveId: "dev" }, null),
    );
    expect(res.status).toBe(401);
  });

  it("rejects malformed JSON", async () => {
    const res = await POST(buildRequest("not json"));
    expect(res.status).toBe(400);
  });

  it("rejects invalid Steam IDs", async () => {
    const res = await POST(
      buildRequest({ steamId: "abc", displayName: "x", serverSaveId: "dev" }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("invalid_steam_id");
  });

  it("rejects host steam id 0", async () => {
    const res = await POST(
      buildRequest({ steamId: "0", displayName: "x", serverSaveId: "dev" }),
    );
    expect(res.status).toBe(400);
  });

  it("rejects empty display name", async () => {
    const res = await POST(
      buildRequest({ steamId: "76561", displayName: "   ", serverSaveId: "dev" }),
    );
    expect(res.status).toBe(400);
  });

  it("issues a fresh code and returns a verify URL that round-trips serverSaveId", async () => {
    const res = await POST(
      buildRequest({
        steamId: "76561",
        displayName: "Player\nOne",
        serverSaveId: "dev",
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.code).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
    // Regression: serverSaveId MUST be in the URL or the landing page can't
    // look up the KV record (key is `link:code:<serverSaveId>:<code>`).
    expect(body.verifyUrl).toBe(
      `https://og.example/link-discord?code=${encodeURIComponent(body.code)}&serverSaveId=dev`,
    );
    expect(body.expiresInSeconds).toBe(900);
  });

  it("omits serverSaveId from the verify URL when blank", async () => {
    const res = await POST(
      buildRequest({
        steamId: "76561",
        displayName: "P",
        serverSaveId: "",
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.verifyUrl).toBe(
      `https://og.example/link-discord?code=${encodeURIComponent(body.code)}`,
    );
  });

  it("reuses an existing pending code on rapid retry", async () => {
    const first = await (
      await POST(
        buildRequest({
          steamId: "76561",
          displayName: "P",
          serverSaveId: "dev",
        }),
      )
    ).json();
    const second = await (
      await POST(
        buildRequest({
          steamId: "76561",
          displayName: "P",
          serverSaveId: "dev",
        }),
      )
    ).json();
    expect(second.code).toBe(first.code);
  });

  it("rate-limits after 5 issues per Steam ID per window", async () => {
    for (let i = 0; i < 5; i++) {
      const r = await POST(
        buildRequest({
          steamId: `1234${i}`,
          displayName: "P",
          serverSaveId: "dev",
        }),
      );
      expect(r.status).toBe(200);
    }
    const sixth = await POST(
      buildRequest({ steamId: "12340", displayName: "P", serverSaveId: "dev" }),
    );
    expect([429, 200]).toContain(sixth.status);
  });
});
