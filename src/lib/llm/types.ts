/**
 * Wire types between the S&Box host and the BFF.
 *
 * Invariants enforced at the route boundary, not in this file:
 *   - The client (game host) never supplies a `system` role message; the
 *     server-side persona registry is the only source of system prompts.
 *   - `personaId` must resolve via `getPersona`; unknown ids → 400.
 *   - History is trimmed to the persona's `maxHistoryTurns` before forwarding
 *     to the model.
 */

export type LlmChatRole = "user" | "assistant";

export interface LlmChatTurnDto {
  role: LlmChatRole;
  content: string;
}

export interface LlmChatRequestDto {
  /** Steam64 as a decimal string. Validated by the route handler. */
  steamId: string;
  /** Multi-shard isolation, like discord-link. May be empty for single-shard. */
  serverSaveId: string;
  /** Server-controlled persona id; must resolve in `personas.ts`. */
  personaId: string;
  /** Caller-generated request id for log correlation. Opaque, [A-Za-z0-9_-]{1,64}. */
  requestId: string;
  /** User/assistant turns only. Latest user turn last. */
  messages: LlmChatTurnDto[];
}

export interface LlmChatUsageDto {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface LlmChatResponseDto {
  text: string;
  usage: LlmChatUsageDto;
  /** Pass-through from the AI SDK. `length` means truncated mid-thought. */
  finishReason: string;
  /** Snapshot of the persona's daily token budget after this call. */
  remainingDailyTokens?: number;
}

export type LlmChatErrorCode =
  | "unauthorized"
  | "invalid_json"
  | "invalid_body"
  | "invalid_steam_id"
  | "invalid_server_save_id"
  | "invalid_request_id"
  | "invalid_persona"
  | "unknown_persona"
  | "invalid_messages"
  | "message_too_long"
  | "history_too_long"
  | "rate_limited"
  | "quota_exceeded"
  | "filtered"
  | "kv_unavailable"
  | "server_misconfigured"
  | "upstream_error"
  | "upstream_timeout";

export interface LlmChatErrorDto {
  error: LlmChatErrorCode;
  /** Optional human hint for logs / dashboards. Never shown verbatim in-game. */
  detail?: string;
  /** Set on `rate_limited` and `quota_exceeded`; seconds until next attempt. */
  retryAfterSeconds?: number;
}

/** Hard ceilings enforced at the route boundary. Personas may set tighter. */
export const HARD_LIMITS = {
  maxUserTurnChars: 1500,
  maxAssistantTurnChars: 4000,
  maxHistoryTurns: 16,
  defaultRequestTimeoutMs: 25_000,
} as const;
