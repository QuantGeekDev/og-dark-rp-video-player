import { describe, expect, it } from "vitest";
import {
  codeKey,
  generateCode,
  isValidCode,
  pendingBySteamKey,
  rateLimitSteamKey,
  rewardLedgerDiscordKey,
  rewardLedgerSteamKey,
} from "@/lib/discord-link/codes";

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

describe("discord-link/codes", () => {
  it("generates an 8-character code from the unambiguous alphabet", () => {
    let rngCallCount = 0;
    const sequence = [0, 0.99, 0.5, 0.1, 0.2, 0.6, 0.7, 0.8];
    const rng = () => sequence[rngCallCount++ % sequence.length];

    const code = generateCode(rng);
    expect(code.length).toBe(8);
    for (const ch of code) {
      expect(ALPHABET).toContain(ch);
    }
  });

  it("rejects ambiguous glyphs in isValidCode", () => {
    expect(isValidCode("ABCDEFGH")).toBe(true);
    expect(isValidCode("A0CDEFGH")).toBe(false);
    expect(isValidCode("AOCDEFGH")).toBe(false);
    expect(isValidCode("AICDEFGH")).toBe(false);
    expect(isValidCode("ALCDEFGH")).toBe(false);
    expect(isValidCode("abcdefgh")).toBe(false);
    expect(isValidCode("")).toBe(false);
    expect(isValidCode("ABCDEFG")).toBe(false);
    expect(isValidCode("ABCDEFGHI")).toBe(false);
    expect(isValidCode(null)).toBe(false);
    expect(isValidCode(undefined)).toBe(false);
    expect(isValidCode(123)).toBe(false);
  });

  it("namespaces KV keys by serverSaveId", () => {
    expect(codeKey("dev", "ABCDEFGH")).toBe("link:code:dev:ABCDEFGH");
    expect(codeKey("", "ABCDEFGH")).toBe("link:code::ABCDEFGH");
    expect(rewardLedgerDiscordKey("12345")).toBe("link:rewarded:discord:12345");
    expect(rewardLedgerSteamKey("dev", "76561")).toBe(
      "link:rewarded:steam:dev:76561",
    );
    expect(rateLimitSteamKey("dev", "76561")).toBe("link:rl:steam:dev:76561");
    expect(pendingBySteamKey("dev", "76561")).toBe(
      "link:pending:steam:dev:76561",
    );
  });
});
