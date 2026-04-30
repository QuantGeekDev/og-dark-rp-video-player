import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import JoinServerClient from "./JoinServerClient";
import {
  getSteamJoinUrl,
  joinServerUrl,
  sboxPackageUrl,
  serverConsoleCommand,
} from "@/lib/server-join";

export const metadata: Metadata = {
  metadataBase: new URL("https://ogdarkrp.com"),
  title: "Join OG DarkRP | S&box",
  description: "Open the live OG DarkRP server in s&box.",
  alternates: {
    canonical: joinServerUrl,
  },
  openGraph: {
    title: "Join OG DarkRP",
    description: "Open the live OG DarkRP server in s&box.",
    url: joinServerUrl,
    type: "website",
    images: [
      {
        url: "/og-dark-rp-splash.png",
        width: 1200,
        height: 630,
        alt: "OG Dark RP city roleplay scene",
      },
    ],
  },
};

export default function JoinServerPage() {
  const steamJoinUrl = getSteamJoinUrl();

  return (
    <main className="relative grid min-h-screen overflow-hidden bg-[#050506] px-5 py-8 text-[#f6f1e8] sm:px-8">
      <Image
        src="/og-dark-rp-splash.png"
        alt="OG Dark RP city scene"
        fill
        priority
        sizes="100vw"
        className="object-cover opacity-[0.42]"
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,5,6,0.96),rgba(5,5,6,0.62)_50%,rgba(5,5,6,0.24)),linear-gradient(180deg,rgba(5,5,6,0.18),rgba(5,5,6,0.96)_88%)]" />
      <div className="site-noise" />
      <div className="scanlines" />

      <section className="relative z-10 mx-auto grid w-full max-w-6xl content-center gap-8 lg:grid-cols-[1.05fr_0.8fr] lg:items-center">
        <div className="min-w-0">
          <Link href="/" className="inline-flex items-center">
            <Image
              src="/og-dark-rp-logo-no-bg.png"
              alt="OG Dark RP"
              width={190}
              height={66}
              priority
              className="h-12 w-auto invert"
            />
          </Link>
          <p className="mt-8 text-xs font-black uppercase tracking-[0.24em] text-[#ffb0a8]">
            Server launch
          </p>
          <h1 className="mt-4 max-w-4xl text-5xl font-black uppercase leading-none text-white sm:text-7xl md:text-8xl">
            Join OG DarkRP
          </h1>
          <p className="mt-6 max-w-2xl text-base font-medium leading-7 text-white/76 sm:text-lg sm:leading-8">
            This page tries to open Steam and join automatically. Steam's
            browser handoff can be flaky, so keep the manual paths ready.
          </p>
        </div>

        <div className="border border-black/15 bg-[#f6f1e8] p-5 text-[#050506]">
          <div className="mb-6 border-b border-black/12 pb-4 text-xs font-black uppercase tracking-[0.22em] text-black/48">
            Connect
          </div>
          <div className="mb-6 grid gap-3">
            <div className="flex gap-3 border border-black/10 p-3">
              <span className="mt-2 h-2.5 w-2.5 shrink-0 bg-[#ff4d4d]" />
              <p className="text-base font-bold leading-7 text-black/70">
                Press Try Auto-Join to open Steam. It may only launch S&box,
                especially if S&box is already running.
              </p>
            </div>
            <div className="flex gap-3 border border-black/10 p-3">
              <span className="mt-2 h-2.5 w-2.5 shrink-0 bg-[#ff4d4d]" />
              <p className="text-base font-bold leading-7 text-black/70">
                Manual browser path: open the S&box server browser, type
                <span className="font-black text-black"> OG DarkRP</span>, then
                join the live server.
              </p>
            </div>
            <div className="flex gap-3 border border-black/10 p-3">
              <span className="mt-2 h-2.5 w-2.5 shrink-0 bg-[#ff4d4d]" />
              <p className="text-base font-bold leading-7 text-black/70">
                Manual console path: open the console in S&box and paste the
                command below.
              </p>
            </div>
          </div>
          <JoinServerClient
            joinUrl={steamJoinUrl}
            packageUrl={sboxPackageUrl}
            consoleCommand={serverConsoleCommand}
          />
        </div>
      </section>
    </main>
  );
}
