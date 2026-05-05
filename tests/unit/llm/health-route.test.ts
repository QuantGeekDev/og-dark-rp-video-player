import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ping = vi.fn<(...args: any[]) => Promise<string>>().mockResolvedValue("PONG");
vi.mock("@upstash/redis", () => ({
  Redis: class {
    ping = ping;
  },
}));

const SECRET = "0123456789abcdef0123456789abcdef";

function getReq(headers: Record<string, string> = {}) {
  return new Request("https://example.com/api/llm/health", {
    headers: { "x-llm-secret": SECRET, ...headers },
  });
}

describe("GET /api/llm/health", () => {
  beforeEach(() => {
    ping.mockReset().mockResolvedValue("PONG");
    process.env.LLM_SHARED_SECRET = SECRET;
    process.env.DEEPSEEK_API_KEY = "fake";
    process.env.KV_REST_API_URL = "https://kv.example";
    process.env.KV_REST_API_TOKEN = "tok";
  });
  afterEach(() => {
    delete process.env.LLM_SHARED_SECRET;
    delete process.env.DEEPSEEK_API_KEY;
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
  });

  it("200 when fully configured", async () => {
    const { GET } = await import("@/app/api/llm/health/route");
    const r = await GET(getReq());
    expect(r.status).toBe(200);
    const body = (await r.json()) as { ready: boolean };
    expect(body.ready).toBe(true);
  });

  it("401 without the shared secret", async () => {
    const { GET } = await import("@/app/api/llm/health/route");
    const r = await GET(getReq({ "x-llm-secret": "" }));
    expect(r.status).toBe(401);
  });

  it("503 when DEEPSEEK_API_KEY missing", async () => {
    delete process.env.DEEPSEEK_API_KEY;
    const { GET } = await import("@/app/api/llm/health/route");
    const r = await GET(getReq());
    expect(r.status).toBe(503);
    const body = (await r.json()) as {
      ready: boolean;
      hasDeepseekKey: boolean;
    };
    expect(body.ready).toBe(false);
    expect(body.hasDeepseekKey).toBe(false);
  });

  it("503 when KV unreachable", async () => {
    ping.mockRejectedValueOnce(new Error("kv down"));
    const { GET } = await import("@/app/api/llm/health/route");
    const r = await GET(getReq());
    expect(r.status).toBe(503);
  });
});
