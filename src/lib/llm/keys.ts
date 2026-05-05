/**
 * KV key helpers for the LLM endpoint. All keys are prefixed `llm:` and
 * scoped by `serverSaveId` so multi-shard installs are isolated, mirroring
 * the discord-link pattern.
 *
 * Date-bucketed keys use UTC midnight (`utcDateStamp()`) so all servers roll
 * over at the same instant, even if request times skew across regions.
 */

/** "YYYY-MM-DD" in UTC for the given timestamp (defaults to now). */
export function utcDateStamp(now: Date = new Date()): string {
  const yyyy = now.getUTCFullYear().toString().padStart(4, "0");
  const mm = (now.getUTCMonth() + 1).toString().padStart(2, "0");
  const dd = now.getUTCDate().toString().padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/** Seconds remaining in the current UTC day. Floors at 60 to avoid 0 TTLs. */
export function secondsUntilUtcMidnight(now: Date = new Date()): number {
  const next = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1,
      0,
      0,
      0,
      0,
    ),
  );
  const seconds = Math.floor((next.getTime() - now.getTime()) / 1000);
  return Math.max(60, seconds);
}

const ns = (saveId: string) => (saveId ? `${saveId}:` : "");

/** Per-Steam-id RPM bucket. Window length lives at the call site. */
export function llmRpmKey(
  serverSaveId: string,
  steamId: string,
  personaId: string,
  windowSeconds: number,
): string {
  // Floor `now` to the window so all calls in the same window share a key.
  const bucket = Math.floor(Date.now() / 1000 / windowSeconds);
  return `llm:rl:${ns(serverSaveId)}${personaId}:${steamId}:${bucket}`;
}

/** Per-Steam-id-per-persona daily token counter. */
export function llmDailyTokensKey(
  serverSaveId: string,
  steamId: string,
  personaId: string,
  date: string = utcDateStamp(),
): string {
  return `llm:tokens:${date}:${ns(serverSaveId)}${personaId}:${steamId}`;
}

/** Per-day, per-persona aggregate counter (for the dashboard). */
export function llmLedgerPersonaKey(
  serverSaveId: string,
  personaId: string,
  date: string = utcDateStamp(),
): string {
  return `llm:ledger:${date}:${ns(serverSaveId)}persona:${personaId}`;
}

/** Per-day sorted set of top spenders by total tokens. */
export function llmLedgerTopKey(
  serverSaveId: string,
  date: string = utcDateStamp(),
): string {
  return `llm:ledger:${date}:${ns(serverSaveId)}top`;
}

/** Audit trail of filter rejections. Body is NOT logged — only metadata. */
export function llmAuditFilterKey(
  serverSaveId: string,
  date: string = utcDateStamp(),
): string {
  return `llm:audit:${date}:${ns(serverSaveId)}filter`;
}
