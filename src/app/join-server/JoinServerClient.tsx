"use client";

import { useEffect, useState } from "react";

type JoinServerClientProps = {
  joinUrl: string;
  packageUrl: string;
};

export default function JoinServerClient({
  joinUrl,
  packageUrl,
}: JoinServerClientProps) {
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setAttempted(true);
      window.location.assign(joinUrl);
    }, 450);

    return () => window.clearTimeout(id);
  }, [joinUrl]);

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <a
        href={joinUrl}
        onClick={() => setAttempted(true)}
        className="inline-flex h-12 items-center justify-center bg-[#ff4d4d] px-6 text-sm font-black uppercase tracking-[0.16em] text-white transition hover:bg-[#d83232]"
      >
        Open Steam
      </a>
      <a
        href={packageUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex h-12 items-center justify-center bg-[#050506] px-6 text-sm font-black uppercase tracking-[0.16em] text-white transition hover:bg-[#2b2421]"
      >
        View On S&box
      </a>
      <p className="sm:col-span-2 text-sm font-bold leading-6 text-black/55">
        {attempted
          ? "If Steam did not open, use the Open Steam button."
          : "Opening Steam..."}
      </p>
    </div>
  );
}
