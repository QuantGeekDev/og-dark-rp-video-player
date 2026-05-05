import { Redis } from "@upstash/redis";
import {
  llmAuditFilterKey,
  llmLedgerPersonaKey,
  llmLedgerTopKey,
  utcDateStamp,
} from "./keys";
import { listPersonas } from "./personas";

let cached: Redis | null = null;
function client(): Redis {
  if (cached) return cached;
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token =
    process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error("Upstash Redis env vars missing");
  cached = new Redis({ url, token });
  return cached;
}

/** Test seam — clears cached client between tests that swap env vars. */
export function _resetLedgerClientForTests(): void {
  cached = null;
}

export interface LedgerToday {
  date: string;
  serverSaveId: string;
  personas: { id: string; tokens: number }[];
  topSpenders: { steamId: string; tokens: number }[];
  filterRejections: number;
}

export async function readLedgerToday(
  serverSaveId: string,
  date: string = utcDateStamp(),
  topN: number = 10,
): Promise<LedgerToday | null> {
  try {
    const c = client();
    const personaIds = listPersonas().map((p) => p.id);
    const personaResults = await Promise.all(
      personaIds.map(async (id) => {
        const v = await c.get<number | string>(
          llmLedgerPersonaKey(serverSaveId, id, date),
        );
        const n = typeof v === "number" ? v : parseInt((v as string) ?? "0", 10);
        return { id, tokens: Number.isFinite(n) ? n : 0 };
      }),
    );

    const top = await c.zrange<(string | number)[]>(
      llmLedgerTopKey(serverSaveId, date),
      0,
      Math.max(0, topN - 1),
      { rev: true, withScores: true },
    );
    const topSpenders: LedgerToday["topSpenders"] = [];
    for (let i = 0; i < top.length; i += 2) {
      const steamId = String(top[i]);
      const tokens = Number(top[i + 1]);
      topSpenders.push({ steamId, tokens: Number.isFinite(tokens) ? tokens : 0 });
    }

    const filterRejectionsRaw = await c.get<number | string>(
      llmAuditFilterKey(serverSaveId, date),
    );
    const filterRejections =
      typeof filterRejectionsRaw === "number"
        ? filterRejectionsRaw
        : parseInt((filterRejectionsRaw as string) ?? "0", 10) || 0;

    return {
      date,
      serverSaveId,
      personas: personaResults,
      topSpenders,
      filterRejections,
    };
  } catch {
    return null;
  }
}

/** Best-effort filter rejection counter. Never throws. */
export async function recordFilterRejection(
  serverSaveId: string,
): Promise<void> {
  try {
    const c = client();
    const key = llmAuditFilterKey(serverSaveId);
    await c.incr(key);
    // 25h TTL so the counter outlives the day cleanly.
    await c.expire(key, 25 * 3600);
  } catch {
    /* observability only */
  }
}
