import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import {
  readSharedSecretHeader,
  verifySharedSecretHeader,
} from "@/lib/llm/secret";
import { listPersonas } from "@/lib/llm/personas";

export const dynamic = "force-dynamic";

/**
 * Cheap liveness for the C# LlmService. NEVER calls DeepSeek (we don't want
 * to bill for keepalives). Reports presence of env vars + KV reachability.
 *
 * Still requires `x-llm-secret` so this isn't a public probe surface for
 * `DEEPSEEK_API_KEY` presence.
 */
export async function GET(req: Request): Promise<NextResponse> {
  if (!verifySharedSecretHeader(readSharedSecretHeader(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const hasDeepseekKey = Boolean(process.env.DEEPSEEK_API_KEY);
  const hasSecret = Boolean(process.env.LLM_SHARED_SECRET);

  let kvOk = false;
  let kvError: string | undefined;
  try {
    const url =
      process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
    const token =
      process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) throw new Error("kv_env_missing");
    const r = new Redis({ url, token });
    await r.ping();
    kvOk = true;
  } catch (e) {
    kvError = e instanceof Error ? e.message : String(e);
  }

  const ready = hasDeepseekKey && hasSecret && kvOk;
  return NextResponse.json(
    {
      ready,
      hasDeepseekKey,
      hasSharedSecret: hasSecret,
      kv: { ok: kvOk, error: kvError },
      personas: listPersonas().map((p) => ({
        id: p.id,
        model: p.model,
        dailyTokenBudget: p.dailyTokenBudget,
      })),
    },
    { status: ready ? 200 : 503 },
  );
}
