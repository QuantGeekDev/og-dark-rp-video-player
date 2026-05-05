import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  SHARED_SECRET_HEADER_NAME,
  getSharedSecret,
  readSharedSecretHeader,
  verifySharedSecretHeader,
} from "@/lib/llm/secret";

const TEST_SECRET = "0123456789abcdef0123456789abcdef";

describe("llm/secret", () => {
  let originalSecret: string | undefined;

  beforeEach(() => {
    originalSecret = process.env.LLM_SHARED_SECRET;
    process.env.LLM_SHARED_SECRET = TEST_SECRET;
  });

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.LLM_SHARED_SECRET;
    } else {
      process.env.LLM_SHARED_SECRET = originalSecret;
    }
  });

  it("uses the dedicated x-llm-secret header (NOT x-link-secret)", () => {
    expect(SHARED_SECRET_HEADER_NAME).toBe("x-llm-secret");
  });

  it("does not fall back to LINK_SHARED_SECRET", () => {
    delete process.env.LLM_SHARED_SECRET;
    process.env.LINK_SHARED_SECRET = TEST_SECRET;
    expect(verifySharedSecretHeader(TEST_SECRET)).toBe(false);
    delete process.env.LINK_SHARED_SECRET;
  });

  it("accepts the configured shared secret", () => {
    expect(verifySharedSecretHeader(TEST_SECRET)).toBe(true);
  });

  it("rejects a wrong-but-same-length secret", () => {
    const wrong = "f" + TEST_SECRET.slice(1);
    expect(verifySharedSecretHeader(wrong)).toBe(false);
  });

  it("rejects different-length values without throwing", () => {
    expect(verifySharedSecretHeader("short")).toBe(false);
    expect(verifySharedSecretHeader(TEST_SECRET + "extra")).toBe(false);
  });

  it("rejects null/empty/undefined headers", () => {
    expect(verifySharedSecretHeader(null)).toBe(false);
    expect(verifySharedSecretHeader(undefined)).toBe(false);
    expect(verifySharedSecretHeader("")).toBe(false);
  });

  it("rejects when the secret is unconfigured", () => {
    delete process.env.LLM_SHARED_SECRET;
    expect(verifySharedSecretHeader(TEST_SECRET)).toBe(false);
  });

  it("rejects when the secret is too short (<8 chars)", () => {
    process.env.LLM_SHARED_SECRET = "tooshrt";
    expect(verifySharedSecretHeader("tooshrt")).toBe(false);
    expect(() => getSharedSecret()).toThrow(/too short/);
  });

  it("readSharedSecretHeader returns the header value when present", () => {
    const req = new Request("https://example.com/", {
      headers: { "x-llm-secret": "abc" },
    });
    expect(readSharedSecretHeader(req)).toBe("abc");
  });

  it("readSharedSecretHeader returns null when missing", () => {
    const req = new Request("https://example.com/");
    expect(readSharedSecretHeader(req)).toBeNull();
  });
});
