import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  signState,
  verifySharedSecretHeader,
  verifyState,
} from "@/lib/discord-link/secret";

const TEST_SECRET = "0123456789abcdef0123456789abcdef";

describe("discord-link/secret", () => {
  let originalSecret: string | undefined;

  beforeEach(() => {
    originalSecret = process.env.LINK_SHARED_SECRET;
    process.env.LINK_SHARED_SECRET = TEST_SECRET;
  });

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.LINK_SHARED_SECRET;
    } else {
      process.env.LINK_SHARED_SECRET = originalSecret;
    }
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
    delete process.env.LINK_SHARED_SECRET;
    expect(verifySharedSecretHeader(TEST_SECRET)).toBe(false);
  });

  it("round-trips signed state", () => {
    const payload = "dev|ABCDEFGH";
    const signed = signState(payload);
    expect(signed.startsWith(`${payload}.`)).toBe(true);

    const verified = verifyState(signed);
    expect(verified.ok).toBe(true);
    if (verified.ok) {
      expect(verified.payload).toBe(payload);
    }
  });

  it("rejects tampered state", () => {
    const signed = signState("dev|ABCDEFGH");
    const tampered = signed.replace("dev", "evil");
    expect(verifyState(tampered).ok).toBe(false);
  });

  it("rejects state with wrong-secret tag", () => {
    process.env.LINK_SHARED_SECRET = "wrongwrongwrongwrongwrongwrong00";
    const fakeSigned = signState("dev|ABCDEFGH");
    process.env.LINK_SHARED_SECRET = TEST_SECRET;
    expect(verifyState(fakeSigned).ok).toBe(false);
  });

  it("rejects malformed state", () => {
    expect(verifyState(null).ok).toBe(false);
    expect(verifyState("").ok).toBe(false);
    expect(verifyState("nodot").ok).toBe(false);
    expect(verifyState(".tagonly").ok).toBe(false);
  });
});
