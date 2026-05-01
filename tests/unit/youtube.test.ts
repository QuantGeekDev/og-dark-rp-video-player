import { describe, expect, it } from "vitest";
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
  resolveLocalKioskVolume,
  selectPlaybackRateForDrift,
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

  it("caps player vars to the kiosk default quality tier", () => {
    const vars = buildYouTubePlayerVars(
      {
        ok: true,
        videoId: "dQw4w9WgXcQ",
        start: 0,
        startedAt: 0,
        volume: 50,
        revision: 1,
      },
      "https://tv.example.test",
    );

    expect(vars.vq).toBe(KIOSK_DEFAULT_QUALITY);
    expect(vars.vq).toBe("large");
  });

  it("identifies playback quality above the kiosk cap", () => {
    expect(isAboveKioskQualityCap("hd1080", "large")).toBe(true);
    expect(isAboveKioskQualityCap("hd720", "large")).toBe(true);
    expect(isAboveKioskQualityCap("large", "large")).toBe(false);
    expect(isAboveKioskQualityCap("medium", "large")).toBe(false);
    expect(isAboveKioskQualityCap("small", "large")).toBe(false);
    expect(isAboveKioskQualityCap("tiny", "large")).toBe(false);
    expect(isAboveKioskQualityCap(undefined, "large")).toBe(false);
    expect(isAboveKioskQualityCap("", "large")).toBe(false);
    expect(isAboveKioskQualityCap("garbage", "large")).toBe(false);

    // Verify the rank table works for an asymmetric cap too.
    expect(isAboveKioskQualityCap("hd720", "small")).toBe(true);
    expect(isAboveKioskQualityCap("medium", "small")).toBe(true);
    expect(isAboveKioskQualityCap("small", "small")).toBe(false);
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

  it("reserves seek correction for large playback drift", () => {
    expect(shouldCorrectPlaybackDrift(11, 15)).toBe(false);
    expect(shouldCorrectPlaybackDrift(9.9, 15)).toBe(true);
    expect(shouldCorrectPlaybackDrift(Number.NaN, 15)).toBe(false);
  });

  it("uses playback rate nudges for small playback drift", () => {
    expect(selectPlaybackRateForDrift(14.5, 15)).toBe(1.05);
    expect(selectPlaybackRateForDrift(15.5, 15)).toBe(0.95);
    expect(selectPlaybackRateForDrift(14.9, 15)).toBe(1);
    expect(selectPlaybackRateForDrift(8, 15)).toBe(1);
  });

  it("applies clamped playback rates", () => {
    const calls: number[] = [];
    const rate = applyYouTubePlaybackRate(
      {
        setPlaybackRate: (value) => calls.push(value),
      },
      1.8,
    );

    expect(rate).toBe(1.25);
    expect(calls).toEqual([1.25]);
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

  it("reads local S&box volume overrides from postMessage payloads", () => {
    expect(resolveKioskVolumeMessage({ type: "drp:set-volume", volume: 37 })).toBe(37);
    expect(resolveKioskVolumeMessage({ type: "drp:set-volume", volume: "0" })).toBe(0);
    expect(resolveKioskVolumeMessage({ type: "drp:set-volume", volume: 999 })).toBe(100);
    expect(resolveKioskVolumeMessage({ type: "drp:set-volume", volume: "nope" })).toBeUndefined();
    expect(resolveKioskVolumeMessage({ type: "other", volume: 50 })).toBeUndefined();
  });
});
