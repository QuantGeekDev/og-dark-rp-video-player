export const YOUTUBE_VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
export const MAX_START_SECONDS = 12 * 60 * 60;
export const DEFAULT_VOLUME = 65;
export const MAX_QUERY_LENGTH = 512;

const BLOCKED_PARAMETERS = new Set([
  "autoplayurl",
  "html",
  "iframe",
  "list",
  "playlist",
  "src",
  "url",
  "next",
]);

export type KioskPlaybackRequest = {
  ok: true;
  videoId: string;
  start: number;
  startedAt: number;
  volume: number;
  revision: number;
};

export type KioskPlaybackError = {
  ok: false;
  reason: string;
};

export type KioskPlaybackParseResult =
  | KioskPlaybackRequest
  | KioskPlaybackError;

export type QueryInput =
  | URLSearchParams
  | Record<string, string | string[] | undefined>;

export function parseKioskQuery(input: QueryInput): KioskPlaybackParseResult {
  const params = toSearchParams(input);

  if (params.toString().length > MAX_QUERY_LENGTH) {
    return fail("Query string is too long.");
  }

  for (const key of params.keys()) {
    if (BLOCKED_PARAMETERS.has(key.toLowerCase())) {
      return fail("Only a single queued video is allowed.");
    }
  }

  const videoId = params.get("videoId") ?? "";
  if (!YOUTUBE_VIDEO_ID_PATTERN.test(videoId)) {
    return fail("Invalid YouTube video ID.");
  }

  return {
    ok: true,
    videoId,
    start: clampInteger(params.get("start"), 0, MAX_START_SECONDS, 0),
    startedAt: clampInteger(
      params.get("startedAt"),
      0,
      Number.MAX_SAFE_INTEGER,
      0,
    ),
    volume: clampInteger(params.get("volume"), 0, 100, DEFAULT_VOLUME),
    revision: clampInteger(params.get("revision"), 0, Number.MAX_SAFE_INTEGER, 0),
  };
}

function toSearchParams(input: QueryInput): URLSearchParams {
  if (input instanceof URLSearchParams) {
    return input;
  }

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item !== undefined) {
          params.append(key, item);
        }
      }
      continue;
    }

    if (value !== undefined) {
      params.set(key, value);
    }
  }

  return params;
}

function clampInteger(
  raw: string | null,
  min: number,
  max: number,
  fallback: number,
): number {
  if (raw === null || raw.trim() === "") {
    return fallback;
  }

  if (!/^-?\d+$/.test(raw.trim())) {
    return fallback;
  }

  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, value));
}

function fail(reason: string): KioskPlaybackError {
  return { ok: false, reason };
}
