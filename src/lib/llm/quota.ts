import { Redis } from "@upstash/redis";
import {
  llmDailyTokensKey,
  llmRpmKey,
  llmLedgerPersonaKey,
  llmLedgerTopKey,
  secondsUntilUtcMidnight,
} from "./keys";

let cached: Redis | null = null;

function client(): Redis {
  if (cached) return cached;
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token =
    process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error(
      "Upstash Redis env vars missing: KV_REST_API_URL/KV_REST_API_TOKEN",
    );
  }
  cached = new Redis({ url, token });
  return cached;
}

/** Test seam — clears cached client between tests that swap env vars. */
export function _resetClientForTests(): void {
  cached = null;
}

export type RpmResult =
  | { ok: true; remaining: number }
  | { ok: false; reason: "rate_limited"; retryAfterSeconds: number }
  | { ok: false; reason: "kv_unavailable" };

export type TokenResult =
  | { ok: true; usedToday: number; remainingToday: number }
  | {
      ok: false;
      reason: "quota_exceeded";
      usedToday: number;
      remainingToday: 0;
      retryAfterSeconds: number;
    }
  | { ok: false; reason: "kv_unavailable" };

/**
 * Per-Steam-id RPM bucket. Increments first, then enforces; if over, callers
 * MUST short-circuit before consuming tokens. The bucket TTL is set to
 * `2 * windowSeconds` so the key reaps even if traffic stops.
 */
export async function tryConsumeRpm(
  serverSaveId: string,
  steamId: string,
  personaId: string,
  windowSeconds: number,
  perWindowMax: number,
): Promise<RpmResult> {
  try {
    const key = llmRpmKey(serverSaveId, steamId, personaId, windowSeconds);
    const c = client();
    const n = await c.incr(key);
    if (n === 1) {
      // Set TTL only on first write so we don't extend the window forever.
      await c.expire(key, Math.max(2, windowSeconds * 2));
    }
    if (n > perWindowMax) {
      return {
        ok: false,
        reason: "rate_limited",
        retryAfterSeconds: windowSeconds,
      };
    }
    return { ok: true, remaining: Math.max(0, perWindowMax - n) };
  } catch {
    return { ok: false, reason: "kv_unavailable" };
  }
}

/**
 * Atomic INCRBY against today's token counter for `steamId+personaId`.
 * Returns `quota_exceeded` if the new total crosses the budget, but the
 * INCRBY is committed regardless — that's intentional, the small overage on
 * the boundary call is cheap and avoids the read-then-write race.
 *
 * Also bumps the per-day per-persona aggregate and the top-spenders sorted
 * set used by the dashboard. Failures here do not propagate; observability
 * write-paths must not block player chat.
 */
export async function consumeTokens(
  serverSaveId: string,
  steamId: string,
  personaId: string,
  totalTokens: number,
  dailyBudget: number,
  now: Date = new Date(),
): Promise<TokenResult> {
  if (totalTokens < 0) totalTokens = 0;
  const c = client();
  const ttl = secondsUntilUtcMidnight(now);
  const key = llmDailyTokensKey(serverSaveId, steamId, personaId);
  let usedToday: number;
  try {
    usedToday = await c.incrby(key, totalTokens);
    if (usedToday === totalTokens) {
      // First write of the day for this (steam, persona) — set TTL.
      await c.expire(key, ttl);
    }
  } catch {
    return { ok: false, reason: "kv_unavailable" };
  }

  // Best-effort ledger writes; ignore failures so chat replies don't error.
  try {
    const personaKey = llmLedgerPersonaKey(serverSaveId, personaId);
    const topKey = llmLedgerTopKey(serverSaveId);
    await c.incrby(personaKey, totalTokens);
    await c.expire(personaKey, ttl);
    await c.zincrby(topKey, totalTokens, steamId);
    await c.expire(topKey, ttl);
  } catch {
    /* swallow — ledger is observability, not load-bearing */
  }

  if (usedToday > dailyBudget) {
    return {
      ok: false,
      reason: "quota_exceeded",
      usedToday,
      remainingToday: 0,
      retryAfterSeconds: ttl,
    };
  }
  return {
    ok: true,
    usedToday,
    remainingToday: Math.max(0, dailyBudget - usedToday),
  };
}

/** Read-only peek used by the health/dashboard endpoints. */
export async function readUsedToday(
  serverSaveId: string,
  steamId: string,
  personaId: string,
): Promise<number | null> {
  try {
    const v = await client().get<number | string>(
      llmDailyTokensKey(serverSaveId, steamId, personaId),
    );
    if (v === null || v === undefined) return 0;
    const n = typeof v === "number" ? v : parseInt(v, 10);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return null;
  }
}
