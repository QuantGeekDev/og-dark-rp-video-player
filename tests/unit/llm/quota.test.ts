import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const incr = vi.fn<(...args: any[]) => Promise<number>>();
const incrby = vi.fn<(...args: any[]) => Promise<number>>();
const expire = vi.fn<(...args: any[]) => Promise<number>>();
const get = vi.fn<(...args: any[]) => Promise<unknown>>();
const zincrby = vi.fn<(...args: any[]) => Promise<number>>();

vi.mock("@upstash/redis", () => ({
  Redis: class {
    incr = incr;
    incrby = incrby;
    expire = expire;
    get = get;
    zincrby = zincrby;
  },
}));

const ENV = {
  KV_REST_API_URL: "https://kv.example",
  KV_REST_API_TOKEN: "tok",
};

describe("llm/quota", () => {
  beforeEach(async () => {
    incr.mockClear();
    incrby.mockClear();
    expire.mockClear();
    get.mockClear();
    zincrby.mockClear();
    Object.assign(process.env, ENV);
    const mod = await import("@/lib/llm/quota");
    mod._resetClientForTests();
  });

  afterEach(() => {
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
  });

  describe("tryConsumeRpm", () => {
    it("first call sets the TTL and returns ok", async () => {
      incr.mockResolvedValueOnce(1);
      expire.mockResolvedValueOnce(1);
      const { tryConsumeRpm } = await import("@/lib/llm/quota");
      const r = await tryConsumeRpm("save", "1", "ask", 60, 5);
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.remaining).toBe(4);
      expect(expire).toHaveBeenCalledOnce();
    });

    it("subsequent calls do NOT refresh the TTL", async () => {
      incr.mockResolvedValueOnce(2);
      const { tryConsumeRpm } = await import("@/lib/llm/quota");
      await tryConsumeRpm("save", "1", "ask", 60, 5);
      expect(expire).not.toHaveBeenCalled();
    });

    it("over the limit returns rate_limited with retry-after", async () => {
      incr.mockResolvedValueOnce(6);
      const { tryConsumeRpm } = await import("@/lib/llm/quota");
      const r = await tryConsumeRpm("save", "1", "ask", 60, 5);
      expect(r.ok).toBe(false);
      if (!r.ok && r.reason === "rate_limited") {
        expect(r.retryAfterSeconds).toBe(60);
      } else {
        throw new Error("expected rate_limited");
      }
    });

    it("KV outage maps to kv_unavailable, not silent allow", async () => {
      incr.mockRejectedValueOnce(new Error("network"));
      const { tryConsumeRpm } = await import("@/lib/llm/quota");
      const r = await tryConsumeRpm("save", "1", "ask", 60, 5);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toBe("kv_unavailable");
    });
  });

  describe("consumeTokens", () => {
    it("first write of the day sets TTL", async () => {
      incrby.mockResolvedValueOnce(123); // total = increment, so first write
      incrby.mockResolvedValueOnce(123); // persona aggregate
      zincrby.mockResolvedValueOnce(123);
      const { consumeTokens } = await import("@/lib/llm/quota");
      const r = await consumeTokens("save", "1", "ask", 123, 50_000);
      expect(r.ok).toBe(true);
      // expect at least the daily-key + persona-key + top-set TTLs
      expect(expire.mock.calls.length).toBeGreaterThanOrEqual(3);
    });

    it("returns quota_exceeded when over budget", async () => {
      incrby.mockResolvedValueOnce(60_000);
      incrby.mockResolvedValueOnce(60_000);
      zincrby.mockResolvedValueOnce(60_000);
      const { consumeTokens } = await import("@/lib/llm/quota");
      const r = await consumeTokens("save", "1", "ask", 60_000, 50_000);
      expect(r.ok).toBe(false);
      if (!r.ok && r.reason === "quota_exceeded") {
        expect(r.usedToday).toBe(60_000);
        expect(r.remainingToday).toBe(0);
      } else {
        throw new Error("expected quota_exceeded");
      }
    });

    it("ledger write failures do not propagate", async () => {
      incrby.mockResolvedValueOnce(100); // daily key ok
      incrby.mockRejectedValueOnce(new Error("ledger fail")); // persona aggregate fails
      const { consumeTokens } = await import("@/lib/llm/quota");
      const r = await consumeTokens("save", "1", "ask", 100, 50_000);
      expect(r.ok).toBe(true);
    });

    it("daily INCRBY failure surfaces as kv_unavailable", async () => {
      incrby.mockRejectedValueOnce(new Error("kv down"));
      const { consumeTokens } = await import("@/lib/llm/quota");
      const r = await consumeTokens("save", "1", "ask", 100, 50_000);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toBe("kv_unavailable");
    });

    it("clamps negative tokens to zero", async () => {
      incrby.mockResolvedValueOnce(0);
      incrby.mockResolvedValueOnce(0);
      zincrby.mockResolvedValueOnce(0);
      const { consumeTokens } = await import("@/lib/llm/quota");
      const r = await consumeTokens("save", "1", "ask", -10, 50_000);
      expect(r.ok).toBe(true);
      expect(incrby).toHaveBeenNthCalledWith(1, expect.any(String), 0);
    });
  });
});
