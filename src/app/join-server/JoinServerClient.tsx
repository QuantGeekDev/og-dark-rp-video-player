"use client";

import { useEffect, useState } from "react";

type JoinServerClientProps = {
  joinUrl: string;
  packageUrl: string;
  consoleCommand: string;
};

export default function JoinServerClient({
  joinUrl,
  packageUrl,
  consoleCommand,
}: JoinServerClientProps) {
  const [attempted, setAttempted] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setAttempted(true);
      window.location.assign(joinUrl);
    }, 450);

    return () => window.clearTimeout(id);
  }, [joinUrl]);

  async function copyConsoleCommand() {
    setCopied(false);

    try {
      await window.navigator.clipboard.writeText(consoleCommand);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="grid gap-3">
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
      </div>
      <div className="grid gap-2 border border-black/10 bg-white/45 p-3">
        <div className="text-xs font-black uppercase tracking-[0.18em] text-black/45">
          Console fallback
        </div>
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <code className="min-w-0 overflow-x-auto border border-black/10 bg-black/5 px-3 py-2 text-sm font-black text-black/72">
            {consoleCommand}
          </code>
          <button
            type="button"
            onClick={copyConsoleCommand}
            className="inline-flex h-10 items-center justify-center bg-[#050506] px-5 text-xs font-black uppercase tracking-[0.16em] text-white transition hover:bg-[#2b2421]"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
      <p className="text-sm font-bold leading-6 text-black/55">
        {attempted
          ? "If Steam opened without joining, paste the console command in s&box."
          : "Opening Steam..."}
      </p>
    </div>
  );
}
