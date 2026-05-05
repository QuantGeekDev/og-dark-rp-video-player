import { describe, expect, it } from "vitest";
import { HARD_LIMITS } from "@/lib/llm/types";
import { getPersona, listPersonas } from "@/lib/llm/personas";

describe("llm/personas", () => {
  it("returns null for unknown ids", () => {
    expect(getPersona("nope")).toBeNull();
    expect(getPersona("")).toBeNull();
  });

  it("returns null for non-string ids", () => {
    expect(getPersona(undefined)).toBeNull();
    expect(getPersona(null)).toBeNull();
    expect(getPersona(42)).toBeNull();
    expect(getPersona({})).toBeNull();
  });

  it("does not leak Object.prototype keys (prototype-pollution guard)", () => {
    expect(getPersona("toString")).toBeNull();
    expect(getPersona("hasOwnProperty")).toBeNull();
    expect(getPersona("__proto__")).toBeNull();
    expect(getPersona("constructor")).toBeNull();
  });

  it("seeds at least the documented personas", () => {
    expect(getPersona("ask")).not.toBeNull();
    expect(getPersona("scientist")).not.toBeNull();
    expect(getPersona("bartender")).not.toBeNull();
    expect(getPersona("colossus")).not.toBeNull();
  });

  it("colossus persona is configured for the police computer surface", () => {
    const p = getPersona("colossus");
    expect(p).not.toBeNull();
    if (!p) return;
    expect(p.model).toBe("deepseek-v4-flash");
    // Replies are spoken by TTS — keep them short. TikTok TTS hard-truncates
    // around 300 chars; staying under ~200 output tokens prevents mid-syllable cuts.
    expect(p.maxOutputTokens).toBeLessThanOrEqual(200);
    // Police-computer surface is a deliberate, in-character interaction; the
    // budget is generous but not unbounded.
    expect(p.dailyTokenBudget).toBeGreaterThanOrEqual(20_000);
    expect(p.dailyTokenBudget).toBeLessThanOrEqual(80_000);
    // Multi-turn history support — colossus is the only persona that needs
    // more than a single turn in v1.
    expect(p.maxHistoryTurns).toBeGreaterThanOrEqual(8);
  });

  it("each persona has a non-empty system prompt and sane numeric bounds", () => {
    for (const p of listPersonas()) {
      expect(p.systemPrompt.length).toBeGreaterThan(40);
      expect(p.maxOutputTokens).toBeGreaterThan(0);
      expect(p.timeoutMs).toBeGreaterThan(0);
      expect(p.dailyTokenBudget).toBeGreaterThan(0);
      expect(p.requestsPerMinute).toBeGreaterThan(0);
      expect(p.temperature).toBeGreaterThanOrEqual(0);
      expect(p.temperature).toBeLessThanOrEqual(2);
      expect(p.maxHistoryTurns).toBeGreaterThan(0);
      expect(p.maxHistoryTurns).toBeLessThanOrEqual(HARD_LIMITS.maxHistoryTurns);
    }
  });

  it("targets only the supported DeepSeek model ids", () => {
    const allowed = new Set(["deepseek-v4-flash", "deepseek-v4-pro"]);
    for (const p of listPersonas()) {
      expect(allowed.has(p.model)).toBe(true);
    }
  });

  it("listPersonas includes every registered id exactly once", () => {
    const ids = listPersonas().map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
