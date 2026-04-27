import { describe, expect, it } from "vitest";
import {
  buildYouTubePlayerVars,
  isUnexpectedVideo,
  mapYouTubeError,
} from "@/lib/youtube";

describe("youtube helpers", () => {
  it("builds kiosk-safe player vars", () => {
    const vars = buildYouTubePlayerVars(
      {
        ok: true,
        videoId: "dQw4w9WgXcQ",
        start: 15,
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
});
