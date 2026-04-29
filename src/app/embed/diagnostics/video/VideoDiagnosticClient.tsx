"use client";

import { useEffect, useState } from "react";

const Html5TestVideoUrl =
  "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";

export default function VideoDiagnosticClient() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const startedAt = Date.now();
    const interval = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      setSeconds(elapsed);
      document.title = `drp-tv:diagnostic:t=${elapsed}:d=0:m=Diagnostic_surface_alive`;
    }, 500);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <main className="kiosk diagnostic-kiosk">
      <div className="diagnostic-bars" />
      <div className="diagnostic-motion" aria-hidden="true" />
      <video
        aria-label="HTML5 video paint diagnostic"
        className="diagnostic-video"
        autoPlay
        loop
        muted
        playsInline
        src={Html5TestVideoUrl}
      />
      <section className="status diagnostic-status" aria-live="polite">
        <div className="status-title">TV Diagnostic</div>
        <div className="status-detail">
          DOM, animation, and muted HTML5 video paint test running for {seconds}s.
        </div>
      </section>
    </main>
  );
}
