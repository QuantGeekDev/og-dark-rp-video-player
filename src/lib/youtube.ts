import {
  MAX_START_SECONDS,
  type KioskPlaybackRequest,
} from "@/lib/kiosk-query";

export type YouTubePlayerVars = {
  autoplay: 1;
  controls: 0;
  disablekb: 1;
  enablejsapi: 1;
  fs: 0;
  iv_load_policy: 3;
  playsinline: 1;
  rel: 0;
  start: number;
  origin: string;
  widget_referrer: string;
};

export type KioskPlayerState =
  | "booting"
  | "loading"
  | "playing"
  | "blocked"
  | "autoplay-blocked"
  | "ended"
  | "error";

export const SYNC_DRIFT_THRESHOLD_SECONDS = 2;

export type YouTubeVolumeController = Pick<
  YouTubePlayer,
  "mute" | "setVolume" | "unMute"
>;

export function buildYouTubePlayerVars(
  request: KioskPlaybackRequest,
  origin: string,
): YouTubePlayerVars {
  return {
    autoplay: 1,
    controls: 0,
    disablekb: 1,
    enablejsapi: 1,
    fs: 0,
    iv_load_policy: 3,
    playsinline: 1,
    rel: 0,
    start: request.start,
    origin,
    widget_referrer: origin,
  };
}

export function mapYouTubeError(code: number): string {
  switch (code) {
    case 2:
      return "Invalid YouTube video ID.";
    case 5:
      return "This video cannot play in the embedded player.";
    case 100:
      return "This video is unavailable.";
    case 101:
    case 150:
      return "The owner does not allow this video to be embedded.";
    case 153:
      return "YouTube rejected this embed because the player identity/referrer was missing.";
    default:
      return `YouTube playback failed (${code}).`;
  }
}

export function isUnexpectedVideo(
  expectedVideoId: string,
  currentVideoId: string | undefined,
): boolean {
  return Boolean(currentVideoId) && currentVideoId !== expectedVideoId;
}

export function computeSynchronizedPlaybackTime(
  request: KioskPlaybackRequest,
  nowUnixMilliseconds = Date.now(),
): number {
  const start = clampFiniteNumber(request.start, 0, MAX_START_SECONDS);
  if (request.startedAt <= 0) {
    return start;
  }

  const elapsedSeconds = Math.max(
    0,
    (nowUnixMilliseconds - request.startedAt) / 1000,
  );

  return clampFiniteNumber(start + elapsedSeconds, 0, MAX_START_SECONDS);
}

export function shouldCorrectPlaybackDrift(
  currentTime: number,
  targetTime: number,
  thresholdSeconds = SYNC_DRIFT_THRESHOLD_SECONDS,
): boolean {
  if (!Number.isFinite(currentTime) || !Number.isFinite(targetTime)) {
    return false;
  }

  return Math.abs(currentTime - targetTime) > thresholdSeconds;
}

export function applyYouTubeVolume(
  player: YouTubeVolumeController,
  volume: number,
  options: { allowUnmute?: boolean } = {},
): number {
  const clampedVolume = clampFiniteNumber(Math.round(volume), 0, 100);
  player.setVolume(clampedVolume);

  if (clampedVolume <= 0 || options.allowUnmute === false) {
    player.mute();
  } else {
    player.unMute();
  }

  return clampedVolume;
}

export function resolveLocalKioskVolume(
  hash: string,
  fallbackVolume: number,
): number {
  const fallback = clampFiniteNumber(Math.round(fallbackVolume), 0, 100);
  const fragment = hash.trim().replace(/^#/, "");
  if (!fragment) {
    return fallback;
  }

  const params = new URLSearchParams(fragment);
  const raw = params.get("localVolume");
  if (raw === null || !/^-?\d+$/.test(raw.trim())) {
    return fallback;
  }

  return clampFiniteNumber(Number.parseInt(raw, 10), 0, 100);
}

export function buildKioskStatusTitle(
  state: KioskPlayerState,
  playbackTime: number,
  driftSeconds: number,
  detail = "",
): string {
  const parts = [`drp-tv:${state}`];

  if (Number.isFinite(playbackTime)) {
    parts.push(`t=${Math.max(0, Math.round(playbackTime))}`);
  }

  if (Number.isFinite(driftSeconds)) {
    parts.push(`d=${roundOneDecimal(driftSeconds)}`);
  }

  if (detail) {
    parts.push(`m=${encodeStatusToken(detail)}`);
  }

  return parts.join(":").slice(0, 180);
}

function clampFiniteNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, value));
}

function roundOneDecimal(value: number): string {
  return (Math.round(value * 10) / 10).toFixed(1);
}

function encodeStatusToken(value: string): string {
  return value
    .replace(/[^A-Za-z0-9 _.,;-]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 80);
}
