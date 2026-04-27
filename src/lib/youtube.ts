import type { KioskPlaybackRequest } from "@/lib/kiosk-query";

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
  | "ended"
  | "error";

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
