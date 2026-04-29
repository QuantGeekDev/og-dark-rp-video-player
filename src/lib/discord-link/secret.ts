import { createHmac, timingSafeEqual } from "node:crypto";

const SHARED_SECRET_HEADER = "x-link-secret";

export function getSharedSecret(): string {
  const value = process.env.LINK_SHARED_SECRET;
  if (!value || value.length < 8) {
    throw new Error("LINK_SHARED_SECRET missing or too short (need >=8 chars)");
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

  // Always run timingSafeEqual on the same length buffers, then bias the
  // result by length comparison so we never short-circuit early.
  const padded = Buffer.alloc(Math.max(a.length, b.length));
  const aPad = Buffer.alloc(padded.length);
  a.copy(aPad);
  const bPad = Buffer.alloc(padded.length);
  b.copy(bPad);
  const equalContents = timingSafeEqual(aPad, bPad);
  return equalContents && a.length === b.length;
}

export function readSharedSecretHeader(req: Request): string | null {
  return req.headers.get(SHARED_SECRET_HEADER);
}

export function signState(payload: string): string {
  const mac = createHmac("sha256", getSharedSecret())
    .update(payload)
    .digest("hex");
  // Truncate to 32 hex chars (16 bytes) for compactness in URL.
  const tag = mac.slice(0, 32);
  return `${payload}.${tag}`;
}

export function verifyState(state: string | null): { ok: true; payload: string } | { ok: false } {
  if (!state) return { ok: false };
  const idx = state.lastIndexOf(".");
  if (idx <= 0) return { ok: false };
  const payload = state.slice(0, idx);
  const tag = state.slice(idx + 1);
  let expected: string;
  try {
    expected = createHmac("sha256", getSharedSecret())
      .update(payload)
      .digest("hex")
      .slice(0, 32);
  } catch {
    return { ok: false };
  }
  if (tag.length !== expected.length) return { ok: false };
  const a = Buffer.from(tag, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return { ok: false };
  if (!timingSafeEqual(a, b)) return { ok: false };
  return { ok: true, payload };
}

export const SHARED_SECRET_HEADER_NAME = SHARED_SECRET_HEADER;
