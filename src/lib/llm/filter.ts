/**
 * Inbound (player → model) and outbound (model → player) content filter.
 *
 * Intentionally small. A v1 denylist plus a few jailbreak heuristics catches
 * the obvious stuff; perfect classification is not the goal. False positives
 * are recoverable (player rephrases); false negatives are reputational.
 *
 * Add to the denylist as moderation incidents come in. Do not paste real
 * slurs into version control — load them from the runtime env var
 * `LLM_FILTER_DENYLIST_BASE64` (newline-delimited, base64-wrapped) on prod.
 */

export interface FilterResult {
  ok: boolean;
  reason?: FilterReason;
}

export type FilterReason =
  | "denylisted_term"
  | "system_prompt_attempt"
  | "url_in_user_turn"
  | "too_many_repeats"
  | "control_chars";

const SYSTEM_PROMPT_PROBES = [
  /\bsystem\s+prompt\b/i,
  /\bignore\s+(all\s+)?previous\s+instructions\b/i,
  /\bignore\s+(everything\s+)?above\b/i,
  /\bdisregard\s+(all\s+)?prior/i,
  /\breveal\s+(your\s+)?(system|initial)\s+(prompt|instructions?)/i,
  /\byou\s+are\s+now\b/i,
  /\bdeveloper\s+mode\b/i,
];

const URL_PATTERN = /\bhttps?:\/\/[^\s]+/i;
const CONTROL_CHAR_PATTERN = /[\x00-\x08\x0B\x0C\x0E-\x1F]/;

function loadDenylist(): readonly string[] {
  const b64 = process.env.LLM_FILTER_DENYLIST_BASE64;
  if (!b64) return [];
  try {
    return Buffer.from(b64, "base64")
      .toString("utf8")
      .split(/\r?\n/)
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.length > 0);
  } catch {
    return [];
  }
}

let denylistCache: { source: string | undefined; list: readonly string[] } = {
  source: undefined,
  list: [],
};

function denylist(): readonly string[] {
  const source = process.env.LLM_FILTER_DENYLIST_BASE64;
  if (denylistCache.source === source) return denylistCache.list;
  denylistCache = { source, list: loadDenylist() };
  return denylistCache.list;
}

/** Test seam — forces a fresh denylist read on the next call. */
export function _resetFilterCacheForTests(): void {
  denylistCache = { source: undefined, list: [] };
}

function containsDenylisted(text: string): boolean {
  const lower = text.toLowerCase();
  for (const term of denylist()) {
    if (lower.includes(term)) return true;
  }
  return false;
}

/**
 * Inbound: applied to the latest user turn. Outbound `screenOutbound` covers
 * the model reply — we don't trust the model never to repeat denylisted terms
 * back even when the user didn't include them.
 */
export function screenInbound(text: string): FilterResult {
  if (!text) return { ok: true };
  if (CONTROL_CHAR_PATTERN.test(text))
    return { ok: false, reason: "control_chars" };
  for (const probe of SYSTEM_PROMPT_PROBES) {
    if (probe.test(text)) return { ok: false, reason: "system_prompt_attempt" };
  }
  if (URL_PATTERN.test(text)) return { ok: false, reason: "url_in_user_turn" };
  if (containsDenylisted(text))
    return { ok: false, reason: "denylisted_term" };
  return { ok: true };
}

export function screenOutbound(text: string): FilterResult {
  if (!text) return { ok: true };
  if (containsDenylisted(text))
    return { ok: false, reason: "denylisted_term" };
  // Bail on absurd repeats — DeepSeek will occasionally loop on a token.
  const repeats = /(.{3,})\1{6,}/.exec(text);
  if (repeats) return { ok: false, reason: "too_many_repeats" };
  return { ok: true };
}
