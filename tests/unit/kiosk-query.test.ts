import { describe, expect, it } from "vitest";
import {
  DEFAULT_VOLUME,
  MAX_START_SECONDS,
  parseKioskQuery,
} from "@/lib/kiosk-query";

describe("parseKioskQuery", () => {
  it("accepts a valid queued video", () => {
    const result = parseKioskQuery(
      new URLSearchParams("videoId=dQw4w9WgXcQ&start=42&volume=77&revision=9"),
    );

    expect(result).toEqual({
      ok: true,
      videoId: "dQw4w9WgXcQ",
      start: 42,
      startedAt: 0,
      volume: 77,
      revision: 9,
    });
  });

  it("clamps start and volume", () => {
    const result = parseKioskQuery(
      new URLSearchParams("videoId=dQw4w9WgXcQ&start=999999&volume=200"),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.start).toBe(MAX_START_SECONDS);
      expect(result.volume).toBe(100);
    }
  });

  it("clamps negative volume to silence", () => {
    const result = parseKioskQuery(
      new URLSearchParams("videoId=dQw4w9WgXcQ&volume=-20"),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.volume).toBe(0);
    }
  });

  it("accepts a shared server playback clock", () => {
    const result = parseKioskQuery(
      new URLSearchParams(
        "videoId=dQw4w9WgXcQ&start=42&startedAt=1777392000000",
      ),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.startedAt).toBe(1777392000000);
    }
  });

  it("uses defaults for malformed numeric fields", () => {
    const result = parseKioskQuery(
      new URLSearchParams("videoId=dQw4w9WgXcQ&start=nope&volume=loud"),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.start).toBe(0);
      expect(result.startedAt).toBe(0);
      expect(result.volume).toBe(DEFAULT_VOLUME);
    }
  });

  it("rejects playlist parameters", () => {
    const result = parseKioskQuery(
      new URLSearchParams(
        "videoId=dQw4w9WgXcQ&list=PLFgquLnL59alCl_2TQvOiD5Vgm1hCaGSI",
      ),
    );

    expect(result.ok).toBe(false);
  });

  it("rejects raw URL parameters", () => {
    const result = parseKioskQuery(
      new URLSearchParams("videoId=dQw4w9WgXcQ&url=https%3A%2F%2Fyoutube.com"),
    );

    expect(result.ok).toBe(false);
  });

  it("rejects malformed video IDs", () => {
    expect(parseKioskQuery(new URLSearchParams("videoId=too-short")).ok).toBe(
      false,
    );
    expect(
      parseKioskQuery(new URLSearchParams("videoId=dQw4w9WgXcQ%0A")).ok,
    ).toBe(false);
  });
});
