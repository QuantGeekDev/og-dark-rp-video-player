"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { KioskPlaybackRequest } from "@/lib/kiosk-query";
import {
  buildKioskStatusTitle,
  buildYouTubePlayerVars,
  computeSynchronizedPlaybackTime,
  isUnexpectedVideo,
  mapYouTubeError,
  shouldCorrectPlaybackDrift,
  type KioskPlayerState,
} from "@/lib/youtube";

type YoutubeKioskPlayerProps = {
  request: KioskPlaybackRequest;
};

let apiPromise: Promise<void> | undefined;
const YouTubeApiTimeoutMs = 12_000;
const SyncIntervalMs = 1_000;

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
  const playerRef = useRef<YouTubePlayer | null>(null);
  const activatedRef = useRef(false);
  const playbackFinishedRef = useRef(false);
  const stateRef = useRef<KioskPlayerState>("loading");
  const detailRef = useRef("Loading YouTube");
  const latestPlaybackTimeRef = useRef(Number.NaN);
  const latestDriftRef = useRef(Number.NaN);
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

      if (force || shouldCorrectPlaybackDrift(currentTime, targetTime)) {
        player.seekTo(targetTime, true);
        latestPlaybackTimeRef.current = targetTime;
        latestDriftRef.current = 0;
        publishStatus(stateRef.current, detailRef.current, player);
        return true;
      }

      publishStatus(stateRef.current, detailRef.current, player);
      return false;
    },
    [assertQueuedVideo, publishStatus, request],
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
    player.setVolume(request.volume);
    player.unMute();
    markActivated();
    player.playVideo();
    setStatus("playing", "Playing queued video", player);
  }, [
    assertQueuedVideo,
    markActivated,
    request.volume,
    setStatus,
    syncPlayerToClock,
  ]);

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

              event.target.setVolume(request.volume);
              event.target.mute();
              syncPlayerToClock(true, event.target);
              event.target.playVideo();
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

              stopWithError(mapYouTubeError(Number(event.data ?? 0)));
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
      playerRef.current?.stopVideo();
      playerRef.current?.destroy();
      playerRef.current = null;
      activatedRef.current = false;
    };
  }, [
    allowedVideoId,
    assertQueuedVideo,
    request,
    request.volume,
    publishStatus,
    setStatus,
    stopWithError,
    syncPlayerToClock,
  ]);

  const showInteractionShield =
    !activated && state !== "ended" && state !== "error";
  const showOverlay = state !== "playing" || !activated;

  return (
    <main className="kiosk">
      <div id="youtube-player" className="player" />
      {showInteractionShield ? (
        <button
          aria-label="Activate queued playback"
          className="interaction-shield"
          type="button"
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
    default:
      return "Starting";
  }
}
