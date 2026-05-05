import { timingSafeEqual } from "node:crypto";

const SHARED_SECRET_HEADER = "x-llm-secret";

/**
 * Returns the configured `LLM_SHARED_SECRET`. Distinct from `LINK_SHARED_SECRET`
 * by design: a leaked LLM secret must not also compromise the discord-link
 * surface. Throws when missing or implausibly short so the caller (route
 * handler) can return 503 without leaking which env var is wrong.
 */
export function getSharedSecret(): string {
  const value = process.env.LLM_SHARED_SECRET;
  if (!value || value.length < 8) {
    throw new Error("LLM_SHARED_SECRET missing or too short (need >=8 chars)");
  }
  return value;
}

export function verifySharedSecretHeader(
  headerValue: string | null | undefined,
): boolean {
  if (!headerValue) return false;
  let expected: string;
  try {
    expected = getSharedSecret();
  } catch {
    return false;
  }

  const a = Buffer.from(headerValue, "utf8");
  const b = Buffer.from(expected, "utf8");

  // timingSafeEqual requires equal-length buffers; pad both to max length and
  // bias the result by the original lengths so we never short-circuit early.
  const max = Math.max(a.length, b.length);
  const aPad = Buffer.alloc(max);
  a.copy(aPad);
  const bPad = Buffer.alloc(max);
  b.copy(bPad);
  const equalContents = timingSafeEqual(aPad, bPad);
  return equalContents && a.length === b.length;
}

export function readSharedSecretHeader(req: Request): string | null {
  return req.headers.get(SHARED_SECRET_HEADER);
}

export const SHARED_SECRET_HEADER_NAME = SHARED_SECRET_HEADER;
