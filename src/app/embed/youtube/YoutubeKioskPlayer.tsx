"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { KioskPlaybackRequest } from "@/lib/kiosk-query";
import {
  applyYouTubePlaybackRate,
  applyYouTubeVolume,
  buildKioskStatusTitle,
  buildYouTubePlayerVars,
  computeSynchronizedPlaybackTime,
  isAboveKioskQualityCap,
  isUnexpectedVideo,
  KIOSK_DEFAULT_QUALITY,
  mapYouTubeError,
  resolveKioskVolumeMessage,
  resolveLocalKioskPauseFlag,
  resolveLocalKioskVolume,
  selectPlaybackRateForDrift,
  shouldCorrectPlaybackDrift,
  STALL_DETECTION_MIN_DELTA_SECONDS,
  STALL_DETECTION_MIN_OBSERVATIONS,
  type KioskPlayerState,
} from "@/lib/youtube";

type YoutubeKioskPlayerProps = {
  request: KioskPlaybackRequest;
};

let apiPromise: Promise<void> | undefined;
const YouTubeApiTimeoutMs = 12_000;
const SyncIntervalMs = 5_000;

export default function YoutubeKioskPlayer({
  request,
}: YoutubeKioskPlayerProps) {
  const requestKey = `${request.videoId}:${request.start}:${request.startedAt}:${request.volume}:${request.revision}`;

  return <YoutubeKioskPlayerSession key={requestKey} request={request} />;
}

function YoutubeKioskPlayerSession({ request }: YoutubeKioskPlayerProps) {
  const [state, setState] = useState<KioskPlayerState>("loading");
  const [detail, setDetail] = useState("Loading YouTube");
  const [activated, setActivated] = useState(false);
  const [localVolume, setLocalVolume] = useState(() =>
    getWindowLocalVolume(request.volume),
  );
  const [localPause, setLocalPause] = useState(() =>
    getWindowLocalPause(),
  );
  const playerRef = useRef<YouTubePlayer | null>(null);
  const activatedRef = useRef(false);
  const localVolumeRef = useRef(localVolume);
  const localPauseRef = useRef(localPause);
  const pauseSentByHostRef = useRef(false);
  const playbackFinishedRef = useRef(false);
  const stateRef = useRef<KioskPlayerState>("loading");
  const detailRef = useRef("Loading YouTube");
  const latestPlaybackTimeRef = useRef(Number.NaN);
  const latestDriftRef = useRef(Number.NaN);
  // Stall detection state. When the YT player reports PLAYING but
  // `getCurrentTime()` doesn't move across consecutive sync ticks, an
  // invisible YouTube overlay is blocking playback (ad, age-gate, "Are
  // you still watching?"). Republish state="stalled" so the s&box side
  // can react.
  const stallObservationsRef = useRef(0);
  const lastStallSampleTimeRef = useRef(Number.NaN);
  const allowedVideoId = request.videoId;

  const publishStatus = useCallback(
    (
      nextState: KioskPlayerState,
      nextDetail: string,
      player = playerRef.current,
    ) => {
      if (typeof document === "undefined") {
        return;
      }

      const targetTime = computeSynchronizedPlaybackTime(request);
      let playbackTime = latestPlaybackTimeRef.current;
      let drift = latestDriftRef.current;
      const currentTime = player?.getCurrentTime();

      if (typeof currentTime === "number" && Number.isFinite(currentTime)) {
        playbackTime = currentTime;
        drift = currentTime - targetTime;
        latestPlaybackTimeRef.current = playbackTime;
        latestDriftRef.current = drift;
      } else if (!Number.isFinite(playbackTime)) {
        playbackTime = targetTime;
        drift = 0;
      }

      document.title = buildKioskStatusTitle(
        nextState,
        playbackTime,
        drift,
        nextDetail,
      );
    },
    [request],
  );

  const setStatus = useCallback(
    (
      nextState: KioskPlayerState,
      nextDetail: string,
      player = playerRef.current,
    ) => {
      stateRef.current = nextState;
      detailRef.current = nextDetail;
      setState(nextState);
      setDetail(nextDetail);
      publishStatus(nextState, nextDetail, player);
    },
    [publishStatus],
  );

  const stopWithError = useCallback(
    (message: string) => {
      playbackFinishedRef.current = true;
      playerRef.current?.stopVideo();
      setStatus("error", message);
    },
    [setStatus],
  );

  const assertQueuedVideo = useCallback(() => {
    const currentVideoId = playerRef.current?.getVideoData()?.video_id;
    if (isUnexpectedVideo(allowedVideoId, currentVideoId)) {
      stopWithError("Blocked an unexpected video.");
      return false;
    }

    return true;
  }, [allowedVideoId, stopWithError]);

  const syncPlayerToClock = useCallback(
    (force = false, player = playerRef.current) => {
      if (!player || !assertQueuedVideo()) {
        return false;
      }

      const targetTime = computeSynchronizedPlaybackTime(request);
      const currentTime = player.getCurrentTime();
      if (!Number.isFinite(currentTime)) {
        publishStatus(stateRef.current, detailRef.current, player);
        return false;
      }

      const drift = currentTime - targetTime;
      latestPlaybackTimeRef.current = currentTime;
      latestDriftRef.current = drift;

      // Stall detection — only meaningful after activation while we believe
      // we're playing. If the playhead doesn't advance across consecutive
      // syncs, an invisible YT overlay is blocking us. We don't run this for
      // host-initiated pauses (localPauseRef) or pre-activation states.
      if (
        activatedRef.current &&
        !localPauseRef.current &&
        stateRef.current === "playing"
      ) {
        const previous = lastStallSampleTimeRef.current;
        if (Number.isFinite(previous)) {
          const advanced =
            currentTime - previous >= STALL_DETECTION_MIN_DELTA_SECONDS;
          if (advanced) {
            stallObservationsRef.current = 0;
          } else {
            stallObservationsRef.current += 1;
            if (
              stallObservationsRef.current >= STALL_DETECTION_MIN_OBSERVATIONS
            ) {
              setStatus(
                "stalled",
                "Playback stalled — likely YouTube overlay",
                player,
              );
              console.warn(
                "[kiosk] stall detected — playhead did not advance for",
                stallObservationsRef.current,
                "consecutive sync ticks at",
                currentTime,
                "s",
              );
            }
          }
        }
        lastStallSampleTimeRef.current = currentTime;
      } else {
        // Reset stall tracking outside the active-playing window.
        lastStallSampleTimeRef.current = Number.NaN;
        stallObservationsRef.current = 0;
      }

      if (force || shouldCorrectPlaybackDrift(currentTime, targetTime)) {
        applyYouTubePlaybackRate(player, 1);
        player.seekTo(targetTime, true);
        latestPlaybackTimeRef.current = targetTime;
        latestDriftRef.current = 0;
        publishStatus(stateRef.current, detailRef.current, player);
        return true;
      }

      applyYouTubePlaybackRate(
        player,
        selectPlaybackRateForDrift(currentTime, targetTime),
      );
      publishStatus(stateRef.current, detailRef.current, player);
      return false;
    },
    [assertQueuedVideo, publishStatus, request, setStatus],
  );

  const markActivated = useCallback(() => {
    activatedRef.current = true;
    setActivated(true);
  }, []);

  const activatePlayback = useCallback(() => {
    const player = playerRef.current;
    if (!player || !assertQueuedVideo()) {
      return;
    }

    syncPlayerToClock(true, player);
    applyYouTubeVolume(player, localVolumeRef.current, { allowUnmute: true });
    markActivated();
    player.playVideo();
    setStatus("playing", "Playing queued video", player);
  }, [
    assertQueuedVideo,
    markActivated,
    setStatus,
    syncPlayerToClock,
  ]);

  useEffect(() => {
    const updateLocalHashState = () => {
      setLocalVolume(getWindowLocalVolume(request.volume));
      setLocalPause(getWindowLocalPause());
    };
    const handleVolumeMessage = (event: MessageEvent) => {
      const volume = resolveKioskVolumeMessage(event.data);
      if (volume !== undefined) {
        setLocalVolume(volume);
      }
    };

    updateLocalHashState();
    window.addEventListener("hashchange", updateLocalHashState);
    window.addEventListener("message", handleVolumeMessage);

    return () => {
      window.removeEventListener("hashchange", updateLocalHashState);
      window.removeEventListener("message", handleVolumeMessage);
    };
  }, [request.volume]);

  useEffect(() => {
    localVolumeRef.current = localVolume;

    const player = playerRef.current;
    if (!player) {
      return;
    }

    applyYouTubeVolume(player, localVolume, {
      allowUnmute: activatedRef.current,
    });
  }, [localVolume]);

  useEffect(() => {
    localPauseRef.current = localPause;

    const player = playerRef.current;
    if (!player) {
      return;
    }

    if (localPause) {
      // The s&box side asked us to pause (AudioOnly + out-of-audible-range).
      // Stop CEF from decoding frames into a hidden surface. Track that WE
      // paused so we can safely auto-resume when the flag clears — without
      // overriding a user-initiated pause from a popup or remote.
      try {
        player.pauseVideo();
        pauseSentByHostRef.current = true;
      } catch (error) {
        console.warn("[kiosk] pauseVideo failed", error);
      }
    } else if (pauseSentByHostRef.current) {
      // Resume only if WE were the ones who paused. If the user paused via
      // some other path, leave it alone.
      try {
        player.playVideo();
        pauseSentByHostRef.current = false;
      } catch (error) {
        console.warn("[kiosk] playVideo (resume from host pause) failed", error);
      }
    }
  }, [localPause]);

  useEffect(() => {
    let disposed = false;
    playbackFinishedRef.current = false;
    stateRef.current = "loading";
    detailRef.current = "Loading YouTube";
    publishStatus("loading", "Loading YouTube");

    loadYouTubeApi()
      .then(() => {
        if (disposed) {
          return;
        }

        const playerVars = buildYouTubePlayerVars(
          request,
          window.location.origin,
        );
        playerRef.current?.destroy();
        playerRef.current = new window.YT!.Player("youtube-player", {
          width: "100%",
          height: "100%",
          videoId: allowedVideoId,
          playerVars,
          events: {
            onReady: (event) => {
              if (disposed) {
                return;
              }

              // Publish "blocked" with a stable detail string IMMEDIATELY
              // so the s&box side's event-driven activation gate sees the
              // page is ready before we attempt buffering. This is what
              // tells the C# panel that the React shield is mounted and
              // playerRef is non-null — it stops blindly waiting on a
              // 2.5 s timer and starts retrying clicks.
              setStatus("blocked", "Player ready — awaiting activation", event.target);

              applyYouTubeVolume(event.target, localVolumeRef.current, {
                allowUnmute: false,
              });
              // Hard-clamp to the kiosk quality cap on cold start. The vq
              // playerVar is just a hint; setPlaybackQuality is the
              // authoritative call. Reduces CEF decode + GPU paint cost
              // dramatically for in-world TV textures.
              applyKioskQualityCap(event.target);
              syncPlayerToClock(true, event.target);
              event.target.playVideo();
              // If the s&box side already pushed `#pause=1` before onReady
              // (AudioOnly radio mounted while local viewer is out of
              // audible range), honor it now.
              if (localPauseRef.current) {
                try {
                  event.target.pauseVideo();
                  pauseSentByHostRef.current = true;
                } catch (error) {
                  console.warn("[kiosk] initial pauseVideo failed", error);
                }
              }
              setStatus("blocked", "Buffering muted video", event.target);
            },
            onStateChange: (event) => {
              if (disposed || !assertQueuedVideo()) {
                return;
              }

              if (event.data === window.YT?.PlayerState.ENDED) {
                playbackFinishedRef.current = true;
                event.target.stopVideo();
                setStatus("ended", "Playback ended", event.target);
                return;
              }

              syncPlayerToClock(false, event.target);

              if (event.data === window.YT?.PlayerState.PLAYING) {
                if (activatedRef.current) {
                  setStatus("playing", "Playing queued video", event.target);
                } else {
                  setStatus("blocked", "Ready to unmute", event.target);
                }
              }

              if (event.data === window.YT?.PlayerState.BUFFERING) {
                setStatus(
                  activatedRef.current ? "loading" : "blocked",
                  activatedRef.current
                    ? "Buffering queued video"
                    : "Buffering muted video",
                  event.target,
                );
              }
            },
            onAutoplayBlocked: (event) => {
              if (disposed) {
                return;
              }

              console.warn("[kiosk] autoplay blocked by browser policy");
              setStatus(
                "autoplay-blocked",
                "Autoplay blocked; waiting for interaction",
                event.target,
              );
            },
            onError: (event) => {
              if (disposed) {
                return;
              }

              const code = Number(event.data ?? 0);
              const message = mapYouTubeError(code);
              console.error(
                "[kiosk] YouTube reported error code",
                code,
                "→",
                message,
              );
              stopWithError(message);
            },
            onPlaybackQualityChange: (event) => {
              if (disposed) {
                return;
              }

              // YouTube can switch quality based on bandwidth heuristics;
              // re-clamp whenever it tries to climb above our cap. This
              // guarantees the cap holds even if the suggestedQuality hint
              // and onReady call are ignored mid-stream.
              applyKioskQualityCap(event.target);
            },
          },
        });
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : "Player failed";
        stopWithError(message);
      });

    const guardInterval = window.setInterval(() => {
      if (playbackFinishedRef.current || !assertQueuedVideo()) {
        return;
      }

      syncPlayerToClock(false);
    }, SyncIntervalMs);

    return () => {
      disposed = true;
      playbackFinishedRef.current = true;
      window.clearInterval(guardInterval);
      const player = playerRef.current;
      if (player) {
        player.stopVideo();
        applyYouTubePlaybackRate(player, 1);
        player.destroy();
      }
      playerRef.current = null;
      activatedRef.current = false;
    };
  }, [
    allowedVideoId,
    assertQueuedVideo,
    request,
    publishStatus,
    setStatus,
    stopWithError,
    syncPlayerToClock,
  ]);

  // The interaction-shield is shown:
  // (a) before activation — to let the synthetic click (and any real player
  //     click) drive `activatePlayback()`, AND
  // (b) AFTER activation if the YT player has regressed back to a blocked
  //     state (autoplay-blocked, blocked, stalled). Once activated, YouTube
  //     can still drop into "Are you still watching?" or ad-pre-roll states
  //     where audio dies but YT keeps reporting PLAYING; the stall detector
  //     and onAutoplayBlocked handler republish a non-playing state, and
  //     re-showing the shield here lets any nearby player (not just the TV
  //     owner) click to re-engage. Hidden in terminal states (ended/error)
  //     since clicking won't help.
  const isBlockedLikeState =
    state === "blocked" ||
    state === "autoplay-blocked" ||
    state === "stalled";
  const showInteractionShield =
    state !== "ended" && state !== "error" && (!activated || isBlockedLikeState);
  const showOverlay = state !== "playing" || !activated;

  return (
    <main className="kiosk">
      <div id="youtube-player" className="player" />
      {showInteractionShield ? (
        <button
          aria-label="Activate queued playback"
          className="interaction-shield"
          type="button"
          onPointerDown={activatePlayback}
          onClick={activatePlayback}
        />
      ) : null}
      {showOverlay ? (
        <section className={`status status-${state}`} aria-live="polite">
          <div className="status-title">{statusTitle(state)}</div>
          <div className="status-detail">{detail}</div>
        </section>
      ) : null}
    </main>
  );
}

function getWindowLocalVolume(fallbackVolume: number): number {
  if (typeof window === "undefined") {
    return fallbackVolume;
  }

  return resolveLocalKioskVolume(window.location.hash, fallbackVolume);
}

function getWindowLocalPause(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return resolveLocalKioskPauseFlag(window.location.hash);
}

function applyKioskQualityCap(player: YouTubePlayer): void {
  try {
    const current = player.getPlaybackQuality?.();
    if (isAboveKioskQualityCap(current, KIOSK_DEFAULT_QUALITY)) {
      player.setPlaybackQuality?.(KIOSK_DEFAULT_QUALITY);
      return;
    }

    // Even if not currently above the cap, suggest the cap on cold start so
    // the player adapts downward instead of upward.
    player.setPlaybackQuality?.(KIOSK_DEFAULT_QUALITY);
  } catch {
    // Older YT API surfaces may not expose setPlaybackQuality; in that case
    // the vq playerVar hint is the only mechanism and we accept the limit.
  }
}

function loadYouTubeApi(): Promise<void> {
  if (window.YT?.Player) {
    return Promise.resolve();
  }

  apiPromise ??= new Promise<void>((resolve, reject) => {
    let settled = false;
    let pollId: number | undefined;

    const complete = () => {
      if (settled) {
        return;
      }

      settled = true;
      window.clearTimeout(timeoutId);
      if (pollId !== undefined) {
        window.clearTimeout(pollId);
      }
      resolve();
    };

    const fail = (message: string) => {
      if (settled) {
        return;
      }

      settled = true;
      window.clearTimeout(timeoutId);
      if (pollId !== undefined) {
        window.clearTimeout(pollId);
      }
      apiPromise = undefined;
      reject(new Error(message));
    };

    const pollForPlayer = () => {
      if (window.YT?.Player) {
        complete();
        return;
      }

      pollId = window.setTimeout(pollForPlayer, 100);
    };

    const timeoutId = window.setTimeout(
      () => fail("YouTube API script timed out."),
      YouTubeApiTimeoutMs,
    );

    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://www.youtube.com/iframe_api"]',
    );

    const previousReadyHandler = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousReadyHandler?.();
      pollForPlayer();
    };

    if (existing) {
      existing.addEventListener("error", () => fail("YouTube API script failed"));
      pollForPlayer();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onload = pollForPlayer;
    script.onerror = () => fail("YouTube API script failed");
    document.head.appendChild(script);
  });

  return apiPromise;
}

function statusTitle(state: KioskPlayerState): string {
  switch (state) {
    case "autoplay-blocked":
    case "blocked":
      return "Ready";
    case "ended":
      return "Ended";
    case "error":
      return "Unavailable";
    case "loading":
      return "Loading";
    case "playing":
      return "Playing";
    case "stalled":
      return "Click to resume";
    default:
      return "Starting";
  }
}
