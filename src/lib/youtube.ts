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
  // Suggest the lowest available quality tier to YouTube. This is a hint,
  // not a hard cap — the player can override it. We re-clamp via
  // setPlaybackQuality() after onReady and onPlaybackQualityChange.
  vq: KioskQualityTier;
};

// YouTube IFrame API quality tiers (low to high):
// "tiny" | "small" (240p) | "medium" (360p) | "large" (480p) | "hd720" | "hd1080" | "highres"
// In-world TV textures composite at low res, so capping at "small" is enough
// for visual fidelity and dramatically reduces CEF decode + GPU paint cost.
export const KIOSK_DEFAULT_QUALITY: KioskQualityTier = "small";
export type KioskQualityTier =
  | "tiny"
  | "small"
  | "medium"
  | "large"
  | "hd720"
  | "hd1080"
  | "highres";

const KIOSK_QUALITY_TIER_RANK: Record<KioskQualityTier, number> = {
  tiny: 0,
  small: 1,
  medium: 2,
  large: 3,
  hd720: 4,
  hd1080: 5,
  highres: 6,
};

export function isAboveKioskQualityCap(
  current: string | undefined,
  cap: KioskQualityTier,
): boolean {
  if (!current) {
    return false;
  }

  const currentRank = KIOSK_QUALITY_TIER_RANK[current as KioskQualityTier];
  const capRank = KIOSK_QUALITY_TIER_RANK[cap];
  return (
    typeof currentRank === "number" &&
    typeof capRank === "number" &&
    currentRank > capRank
  );
}

export type KioskPlayerState =
  | "booting"
  | "loading"
  | "playing"
  | "blocked"
  | "autoplay-blocked"
  | "ended"
  | "error";

export const SYNC_DRIFT_DEAD_ZONE_SECONDS = 0.15;
export const SYNC_DRIFT_RATE_THRESHOLD_SECONDS = 0.4;
export const SYNC_DRIFT_SEEK_THRESHOLD_SECONDS = 5;
export const SYNC_CATCH_UP_RATE = 1.05;
export const SYNC_SLOW_DOWN_RATE = 0.95;
export const KIOSK_VOLUME_MESSAGE_TYPE = "drp:set-volume";

export type YouTubeVolumeController = Pick<
  YouTubePlayer,
  "mute" | "setVolume" | "unMute"
>;

export type YouTubePlaybackRateController = Pick<
  YouTubePlayer,
  "setPlaybackRate"
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
    vq: KIOSK_DEFAULT_QUALITY,
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
  thresholdSeconds = SYNC_DRIFT_SEEK_THRESHOLD_SECONDS,
): boolean {
  if (!Number.isFinite(currentTime) || !Number.isFinite(targetTime)) {
    return false;
  }

  return Math.abs(currentTime - targetTime) > thresholdSeconds;
}

export function selectPlaybackRateForDrift(
  currentTime: number,
  targetTime: number,
): number {
  if (!Number.isFinite(currentTime) || !Number.isFinite(targetTime)) {
    return 1;
  }

  const drift = currentTime - targetTime;
  const absoluteDrift = Math.abs(drift);
  if (
    absoluteDrift <= SYNC_DRIFT_DEAD_ZONE_SECONDS ||
    absoluteDrift > SYNC_DRIFT_SEEK_THRESHOLD_SECONDS ||
    absoluteDrift < SYNC_DRIFT_RATE_THRESHOLD_SECONDS
  ) {
    return 1;
  }

  return drift < 0 ? SYNC_CATCH_UP_RATE : SYNC_SLOW_DOWN_RATE;
}

export function applyYouTubePlaybackRate(
  player: YouTubePlaybackRateController,
  rate: number,
): number {
  const clampedRate = clampFiniteNumber(rate, 0.75, 1.25);
  player.setPlaybackRate(clampedRate);
  return clampedRate;
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

export function resolveKioskVolumeMessage(data: unknown): number | undefined {
  if (!data || typeof data !== "object") {
    return undefined;
  }

  const message = data as { type?: unknown; volume?: unknown };
  if (message.type !== KIOSK_VOLUME_MESSAGE_TYPE) {
    return undefined;
  }

  const rawVolume = message.volume;
  const volume =
    typeof rawVolume === "number"
      ? rawVolume
      : typeof rawVolume === "string" && /^-?\d+$/.test(rawVolume.trim())
        ? Number.parseInt(rawVolume, 10)
        : Number.NaN;

  if (!Number.isFinite(volume)) {
    return undefined;
  }

  return clampFiniteNumber(Math.round(volume), 0, 100);
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
