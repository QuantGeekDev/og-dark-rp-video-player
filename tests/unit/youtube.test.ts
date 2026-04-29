import { describe, expect, it } from "vitest";
import {
  applyYouTubeVolume,
  buildKioskStatusTitle,
  buildYouTubePlayerVars,
  computeSynchronizedPlaybackTime,
  isUnexpectedVideo,
  mapYouTubeError,
  resolveLocalKioskVolume,
  shouldCorrectPlaybackDrift,
} from "@/lib/youtube";

describe("youtube helpers", () => {
  it("builds kiosk-safe player vars", () => {
    const vars = buildYouTubePlayerVars(
      {
        ok: true,
        videoId: "dQw4w9WgXcQ",
        start: 15,
        startedAt: 0,
        volume: 65,
        revision: 2,
      },
      "https://tv.example.test",
    );

    expect(vars).toMatchObject({
      autoplay: 1,
      controls: 0,
      disablekb: 1,
      enablejsapi: 1,
      playsinline: 1,
      rel: 0,
      start: 15,
      origin: "https://tv.example.test",
      widget_referrer: "https://tv.example.test",
    });
    expect(vars).not.toHaveProperty("list");
    expect(vars).not.toHaveProperty("playlist");
  });

  it("maps known YouTube errors", () => {
    expect(mapYouTubeError(153)).toContain("identity");
    expect(mapYouTubeError(101)).toContain("embedded");
    expect(mapYouTubeError(150)).toContain("embedded");
    expect(mapYouTubeError(100)).toContain("unavailable");
  });

  it("detects video drift", () => {
    expect(isUnexpectedVideo("dQw4w9WgXcQ", "dQw4w9WgXcQ")).toBe(false);
    expect(isUnexpectedVideo("dQw4w9WgXcQ", undefined)).toBe(false);
    expect(isUnexpectedVideo("dQw4w9WgXcQ", "M7lc1UVf-VE")).toBe(true);
  });

  it("computes synchronized playback time from the shared clock", () => {
    const request = {
      ok: true as const,
      videoId: "dQw4w9WgXcQ",
      start: 10,
      startedAt: 1_000,
      volume: 65,
      revision: 2,
    };

    expect(computeSynchronizedPlaybackTime(request, 6_500)).toBe(15.5);
    expect(computeSynchronizedPlaybackTime({ ...request, startedAt: 0 }, 6_500)).toBe(10);
  });

  it("uses a threshold before correcting playback drift", () => {
    expect(shouldCorrectPlaybackDrift(13.1, 15)).toBe(false);
    expect(shouldCorrectPlaybackDrift(12.9, 15)).toBe(true);
    expect(shouldCorrectPlaybackDrift(Number.NaN, 15)).toBe(false);
  });

  it("formats status titles for the S&box web surface bridge", () => {
    expect(buildKioskStatusTitle("playing", 12.2, -0.25, "Playing now")).toBe(
      "drp-tv:playing:t=12:d=-0.2:m=Playing_now",
    );
  });

  it("keeps zero volume muted even during activation", () => {
    const calls: string[] = [];
    const volume = applyYouTubeVolume(
      {
        setVolume: (value) => calls.push(`set:${value}`),
        mute: () => calls.push("mute"),
        unMute: () => calls.push("unmute"),
      },
      0,
      { allowUnmute: true },
    );

    expect(volume).toBe(0);
    expect(calls).toEqual(["set:0", "mute"]);
  });

  it("sets and unmutes positive activation volume", () => {
    const calls: string[] = [];
    const volume = applyYouTubeVolume(
      {
        setVolume: (value) => calls.push(`set:${value}`),
        mute: () => calls.push("mute"),
        unMute: () => calls.push("unmute"),
      },
      10,
      { allowUnmute: true },
    );

    expect(volume).toBe(10);
    expect(calls).toEqual(["set:10", "unmute"]);
  });

  it("sets but keeps ready playback muted before activation", () => {
    const calls: string[] = [];
    const volume = applyYouTubeVolume(
      {
        setVolume: (value) => calls.push(`set:${value}`),
        mute: () => calls.push("mute"),
        unMute: () => calls.push("unmute"),
      },
      65,
      { allowUnmute: false },
    );

    expect(volume).toBe(65);
    expect(calls).toEqual(["set:65", "mute"]);
  });

  it("reads local S&box volume overrides from the URL fragment", () => {
    expect(resolveLocalKioskVolume("#localVolume=37", 65)).toBe(37);
    expect(resolveLocalKioskVolume("#foo=1&localVolume=0", 65)).toBe(0);
    expect(resolveLocalKioskVolume("#localVolume=999", 65)).toBe(100);
    expect(resolveLocalKioskVolume("#localVolume=nope", 65)).toBe(65);
  });
});
