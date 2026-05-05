import { NextResponse } from "next/server";
import { generateText } from "ai";
import type { ModelMessage } from "ai";
import { deepseek } from "@ai-sdk/deepseek";
import {
  readSharedSecretHeader,
  verifySharedSecretHeader,
} from "@/lib/llm/secret";
import { getPersona, type Persona } from "@/lib/llm/personas";
import {
  consumeTokens,
  tryConsumeRpm,
} from "@/lib/llm/quota";
import {
  recordFilterRejection,
} from "@/lib/llm/ledger";
import { screenInbound, screenOutbound } from "@/lib/llm/filter";
import {
  HARD_LIMITS,
  type LlmChatErrorCode,
  type LlmChatErrorDto,
  type LlmChatResponseDto,
  type LlmChatTurnDto,
} from "@/lib/llm/types";

export const dynamic = "force-dynamic";

const STEAM_ID_PATTERN = /^[0-9]{1,20}$/;
const SERVER_SAVE_ID_PATTERN = /^[A-Za-z0-9_.-]{0,64}$/;
const REQUEST_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const PERSONA_ID_PATTERN = /^[a-z0-9_-]{1,32}$/;

/** Test seam — lets unit tests inject a mock instead of calling DeepSeek. */
type GenerateFn = typeof generateText;
let generateImpl: GenerateFn = generateText;
export function _setGenerateForTests(fn: GenerateFn | null): void {
  generateImpl = fn ?? generateText;
}

function err(
  code: LlmChatErrorCode,
  status: number,
  detail?: string,
  retryAfterSeconds?: number,
): NextResponse<LlmChatErrorDto> {
  const headers: Record<string, string> = {};
  if (retryAfterSeconds && retryAfterSeconds > 0) {
    headers["retry-after"] = String(retryAfterSeconds);
  }
  return NextResponse.json<LlmChatErrorDto>(
    { error: code, detail, retryAfterSeconds },
    { status, headers },
  );
}

export async function POST(req: Request): Promise<NextResponse> {
  if (!verifySharedSecretHeader(readSharedSecretHeader(req))) {
    return err("unauthorized", 401);
  }
  if (!process.env.DEEPSEEK_API_KEY) {
    return err("server_misconfigured", 500, "DEEPSEEK_API_KEY missing");
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return err("invalid_json", 400);
  }
  if (!body || typeof body !== "object") return err("invalid_body", 400);

  const {
    steamId,
    serverSaveId,
    personaId,
    requestId,
    messages,
  } = body as Record<string, unknown>;

  if (typeof steamId !== "string" || !STEAM_ID_PATTERN.test(steamId)) {
    return err("invalid_steam_id", 400);
  }
  const normalizedServerSaveId =
    typeof serverSaveId === "string" ? serverSaveId : "";
  if (!SERVER_SAVE_ID_PATTERN.test(normalizedServerSaveId)) {
    return err("invalid_server_save_id", 400);
  }
  if (typeof requestId !== "string" || !REQUEST_ID_PATTERN.test(requestId)) {
    return err("invalid_request_id", 400);
  }
  if (typeof personaId !== "string" || !PERSONA_ID_PATTERN.test(personaId)) {
    return err("invalid_persona", 400);
  }
  const persona = getPersona(personaId);
  if (!persona) return err("unknown_persona", 400);

  if (!Array.isArray(messages) || messages.length === 0) {
    return err("invalid_messages", 400);
  }
  if (messages.length > HARD_LIMITS.maxHistoryTurns) {
    return err(
      "history_too_long",
      400,
      `> ${HARD_LIMITS.maxHistoryTurns} turns`,
    );
  }

  const trimmed: LlmChatTurnDto[] = [];
  for (const raw of messages) {
    if (!raw || typeof raw !== "object") return err("invalid_messages", 400);
    const r = raw as Record<string, unknown>;
    // INVARIANT: discard any system message from the request. The persona
    // registry is the only source of `system`. Players must not be able to
    // smuggle a system prompt by faking a chat history.
    if (r.role === "system") continue;
    if (r.role !== "user" && r.role !== "assistant") {
      return err("invalid_messages", 400);
    }
    if (typeof r.content !== "string" || r.content.length === 0) {
      return err("invalid_messages", 400);
    }
    const cap =
      r.role === "user"
        ? HARD_LIMITS.maxUserTurnChars
        : HARD_LIMITS.maxAssistantTurnChars;
    if (r.content.length > cap) {
      return err("message_too_long", 400, `${r.role} > ${cap} chars`);
    }
    trimmed.push({ role: r.role, content: r.content });
  }
  if (trimmed.length === 0) return err("invalid_messages", 400);

  // Persona-level history cap (stricter than HARD_LIMITS).
  const sliced = trimmed.slice(-persona.maxHistoryTurns);
  const lastUser = [...sliced].reverse().find((m) => m.role === "user");
  if (!lastUser) return err("invalid_messages", 400);

  const inbound = screenInbound(lastUser.content);
  if (!inbound.ok) {
    await recordFilterRejection(normalizedServerSaveId);
    return err("filtered", 422, inbound.reason);
  }

  const rpm = await tryConsumeRpm(
    normalizedServerSaveId,
    steamId,
    persona.id,
    60,
    persona.requestsPerMinute,
  );
  if (!rpm.ok) {
    if (rpm.reason === "kv_unavailable") return err("kv_unavailable", 503);
    return err("rate_limited", 429, undefined, rpm.retryAfterSeconds);
  }

  const modelMessages: ModelMessage[] = sliced.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  let result;
  try {
    result = await generateImpl({
      model: deepseek(persona.model),
      system: persona.systemPrompt,
      messages: modelMessages,
      maxOutputTokens: persona.maxOutputTokens,
      temperature: persona.temperature,
      abortSignal: AbortSignal.timeout(persona.timeoutMs),
      ...buildProviderOptions(persona),
    });
  } catch (e) {
    if (
      e instanceof Error &&
      (e.name === "AbortError" || /aborted|timeout/i.test(e.message))
    ) {
      return err("upstream_timeout", 504, e.message);
    }
    const message = e instanceof Error ? e.message : String(e);
    return err("upstream_error", 502, message);
  }

  const outbound = screenOutbound(result.text);
  if (!outbound.ok) {
    await recordFilterRejection(normalizedServerSaveId);
    return err("filtered", 422, outbound.reason);
  }

  const usage = {
    promptTokens: numberOr(result.usage?.inputTokens, 0),
    completionTokens: numberOr(result.usage?.outputTokens, 0),
    totalTokens: numberOr(result.usage?.totalTokens, 0),
  };
  const totalTokens =
    usage.totalTokens || usage.promptTokens + usage.completionTokens;

  const tokenResult = await consumeTokens(
    normalizedServerSaveId,
    steamId,
    persona.id,
    totalTokens,
    persona.dailyTokenBudget,
  );
  let remainingDailyTokens: number | undefined;
  if (tokenResult.ok) {
    remainingDailyTokens = tokenResult.remainingToday;
  } else if (tokenResult.reason === "quota_exceeded") {
    // Honor the reply that already cost tokens (they're billed regardless),
    // but mark the budget so the next call 429s up front.
    remainingDailyTokens = 0;
  }

  return NextResponse.json<LlmChatResponseDto>({
    text: result.text,
    usage,
    finishReason: String(result.finishReason ?? "stop"),
    remainingDailyTokens,
  });
}

function numberOr(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function buildProviderOptions(persona: Persona) {
  if (!persona.thinking) return {};
  return {
    providerOptions: {
      deepseek: { thinking: { type: "enabled" } },
    },
  } as const;
}
