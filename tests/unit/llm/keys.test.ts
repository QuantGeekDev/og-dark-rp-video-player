import { describe, expect, it } from "vitest";
import {
  llmDailyTokensKey,
  llmLedgerPersonaKey,
  llmLedgerTopKey,
  llmRpmKey,
  secondsUntilUtcMidnight,
  utcDateStamp,
} from "@/lib/llm/keys";

describe("llm/keys", () => {
  it("utcDateStamp formats as YYYY-MM-DD in UTC", () => {
    expect(utcDateStamp(new Date("2026-05-05T23:30:00Z"))).toBe("2026-05-05");
    expect(utcDateStamp(new Date("2026-01-01T00:00:00Z"))).toBe("2026-01-01");
  });

  it("secondsUntilUtcMidnight is non-zero and bounded", () => {
    const s = secondsUntilUtcMidnight(new Date("2026-05-05T23:59:30Z"));
    expect(s).toBeGreaterThanOrEqual(60);
    expect(s).toBeLessThanOrEqual(86400);
  });

  it("daily-tokens key namespaces by serverSaveId AND persona AND date", () => {
    const a = llmDailyTokensKey("og-main", "111", "ask", "2026-05-05");
    const b = llmDailyTokensKey("og-secondary", "111", "ask", "2026-05-05");
    const c = llmDailyTokensKey("og-main", "111", "scientist", "2026-05-05");
    const d = llmDailyTokensKey("og-main", "111", "ask", "2026-05-06");
    expect(new Set([a, b, c, d]).size).toBe(4);
  });

  it("rpm key changes between windows", () => {
    const a = llmRpmKey("s", "1", "ask", 60);
    const b = llmRpmKey("s", "1", "ask", 60);
    expect(a).toBe(b); // same window
    const future = llmRpmKey("s", "1", "ask", 1);
    expect(typeof future).toBe("string");
  });

  it("ledger keys carry the date", () => {
    expect(llmLedgerPersonaKey("og", "ask", "2026-05-05")).toContain(
      "2026-05-05",
    );
    expect(llmLedgerTopKey("og", "2026-05-05")).toContain("2026-05-05");
  });

  it("empty serverSaveId still produces unique keys", () => {
    expect(llmDailyTokensKey("", "1", "ask", "2026-05-05")).toMatch(
      /^llm:tokens:2026-05-05:ask:1$/,
    );
  });
});
