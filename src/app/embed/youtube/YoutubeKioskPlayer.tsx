"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { KioskPlaybackRequest } from "@/lib/kiosk-query";
import {
  buildYouTubePlayerVars,
  isUnexpectedVideo,
  mapYouTubeError,
  type KioskPlayerState,
} from "@/lib/youtube";

type YoutubeKioskPlayerProps = {
  request: KioskPlaybackRequest;
};

let apiPromise: Promise<void> | undefined;
const YouTubeApiTimeoutMs = 12_000;

export default function YoutubeKioskPlayer({
  request,
}: YoutubeKioskPlayerProps) {
  const requestKey = `${request.videoId}:${request.start}:${request.volume}:${request.revision}`;

  return <YoutubeKioskPlayerSession key={requestKey} request={request} />;
}

function YoutubeKioskPlayerSession({ request }: YoutubeKioskPlayerProps) {
  const [state, setState] = useState<KioskPlayerState>("loading");
  const [detail, setDetail] = useState("Loading YouTube");
  const [activated, setActivated] = useState(false);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const activatedRef = useRef(false);
  const allowedVideoId = request.videoId;

  const stopWithError = useCallback((message: string) => {
    playerRef.current?.stopVideo();
    setState("error");
    setDetail(message);
  }, []);

  const assertQueuedVideo = useCallback(() => {
    const currentVideoId = playerRef.current?.getVideoData()?.video_id;
    if (isUnexpectedVideo(allowedVideoId, currentVideoId)) {
      stopWithError("Blocked an unexpected video.");
      return false;
    }

    return true;
  }, [allowedVideoId, stopWithError]);

  const markActivated = useCallback(() => {
    activatedRef.current = true;
    setActivated(true);
  }, []);

  const activatePlayback = useCallback(() => {
    const player = playerRef.current;
    if (!player || !assertQueuedVideo()) {
      return;
    }

    player.setVolume(request.volume);
    player.unMute();
    markActivated();
    player.playVideo();
    setState("playing");
    setDetail("Playing queued video");
  }, [assertQueuedVideo, markActivated, request.volume]);

  useEffect(() => {
    let disposed = false;

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
              event.target.playVideo();
              setState("blocked");
              setDetail("Buffering muted video");
            },
            onStateChange: (event) => {
              if (disposed || !assertQueuedVideo()) {
                return;
              }

              if (event.data === window.YT?.PlayerState.PLAYING) {
                if (activatedRef.current) {
                  setState("playing");
                  setDetail("Playing queued video");
                } else {
                  setState("blocked");
                  setDetail("Ready to unmute");
                }
              }

              if (event.data === window.YT?.PlayerState.BUFFERING) {
                setState(activatedRef.current ? "loading" : "blocked");
                setDetail(
                  activatedRef.current
                    ? "Buffering queued video"
                    : "Buffering muted video",
                );
              }

              if (event.data === window.YT?.PlayerState.ENDED) {
                event.target.stopVideo();
                setState("ended");
                setDetail("Playback ended");
              }
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

    const guardInterval = window.setInterval(assertQueuedVideo, 1000);

    return () => {
      disposed = true;
      window.clearInterval(guardInterval);
      playerRef.current?.stopVideo();
      playerRef.current?.destroy();
      playerRef.current = null;
      activatedRef.current = false;
    };
  }, [
    allowedVideoId,
    assertQueuedVideo,
    markActivated,
    request,
    request.volume,
    stopWithError,
  ]);

  const showInteractionShield = !activated && state !== "ended" && state !== "error";
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
