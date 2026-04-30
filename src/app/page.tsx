import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { joinServerPath, sboxPackageUrl } from "@/lib/server-join";

const siteTitle = "OG Dark RP | DarkRP Reborn in Source 2";
const siteDescription =
  "Classic GMod DarkRP reborn in S&box: mayor laws, police raids, criminal crews, player shops, casinos, vehicles, bank robberies, and in-game TVs in a Source 2 city.";
const previewImage = "/og-dark-rp-splash.png";

export const metadata: Metadata = {
  metadataBase: new URL("https://og-dark-rp-video-player.vercel.app"),
  title: siteTitle,
  description: siteDescription,
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    type: "website",
    images: [
      {
        url: previewImage,
        width: 1200,
        height: 630,
        alt: "OG Dark RP city roleplay scene",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: [previewImage],
  },
};

const liveStats = [
  { label: "role lanes", value: "28", tone: "text-[#ff4d4d]" },
  { label: "economy loops", value: "16", tone: "text-[#ffd166]" },
  { label: "law systems", value: "9", tone: "text-[#72f1b8]" },
  { label: "Source 2 roleplay", value: "OG", tone: "text-[#9bbcff]" },
];

const discordInviteUrl = "https://discord.gg/b2ursP823g";

const featureSignals = [
  "Mayor laws, taxes, treasury and public broadcasts",
  "Police console with warrants, wanted requests, custody and BOLOs",
  "Organizations, shared doors, pockets, persistence and co-owned bases",
  "Printers, bitcoin miners, generators, upgrades and radiant sockets",
  "Bank vault holdouts with gold drops and police counterplay",
  "Casino owner loops: slots, coinflip tables and poker systems",
  "Vehicle dealer, fueled pickup trucks, keys, locks and theft tools",
  "Cinema owner TVs powered by the hosted YouTube kiosk wrapper",
];

const districts = [
  {
    name: "City Hall",
    code: "MAYOR",
    copy: "Write laws, set taxes, approve warrants and turn the treasury into leverage.",
  },
  {
    name: "Precinct",
    code: "CP/SWAT",
    copy: "Run coordinated raids with radio, tasers, custody boards and warrant tools.",
  },
  {
    name: "Back Rooms",
    code: "CREWS",
    copy: "Organize thieves, mob bosses, hitmen and dealers around persistent shared assets.",
  },
  {
    name: "Industrial",
    code: "MAKERS",
    copy: "Mine, refine, craft, cook, print, repair and build your little empire.",
  },
];

const roleTracks = [
  "Citizen",
  "Hobo",
  "Cook",
  "Medic",
  "Gun Dealer",
  "Black Market Dealer",
  "Drug Dealer",
  "Miner",
  "Gas Station Owner",
  "Casino Owner",
  "Cinema Owner",
  "Civil Protection",
  "Police Chief",
  "SWAT",
  "Mayor",
  "Mayor Bodyguard",
  "Thief",
  "Pro Thief",
  "Gangster",
  "Mob Boss",
  "Hitman",
  "Mercenary",
];

const economyLoops = [
  {
    title: "Contraband Economy",
    body: "Lockpicks, keypad crackers, weapon checks, black market inventory and robbery rewards keep the city tense.",
  },
  {
    title: "Legit Businesses",
    body: "Gas, food, medicine, mining, vehicle sales and cinema spaces give lawful players a reason to own corners.",
  },
  {
    title: "High Risk Machines",
    body: "Printers, bitcoin miners, upgrades, heat, generators and sell windows make basing a constant calculation.",
  },
  {
    title: "Civic Pressure",
    body: "Taxes, treasury balance, licenses, warrants and law requests make politics part of the economy.",
  },
];

const launchBeats = [
  "S&box native, C# and Source 2 from the ground up",
  "Classic DarkRP rhythm with host-authoritative systems",
  "Built around downtown chaos, player businesses and police response",
  "TV, shop, job, pocket, door and vehicle systems already connected",
];

function DiscordIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5 shrink-0"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M20.32 4.37A19.8 19.8 0 0 0 15.37 2.8a13.8 13.8 0 0 0-.63 1.3 18.4 18.4 0 0 0-5.48 0 12.5 12.5 0 0 0-.64-1.3 19.7 19.7 0 0 0-4.95 1.57C.54 9.03-.31 13.58.1 18.07a19.9 19.9 0 0 0 6.08 3.08c.49-.67.93-1.38 1.3-2.13-.71-.27-1.38-.6-2.02-.97l.48-.38a14.2 14.2 0 0 0 12.12 0l.48.38c-.64.38-1.32.7-2.03.97.38.75.82 1.46 1.31 2.13a19.8 19.8 0 0 0 6.08-3.08c.48-5.2-.8-9.7-3.58-13.7ZM8.02 15.31c-1.18 0-2.15-1.09-2.15-2.43 0-1.34.95-2.43 2.15-2.43 1.2 0 2.17 1.1 2.15 2.43 0 1.34-.95 2.43-2.15 2.43Zm7.96 0c-1.18 0-2.15-1.09-2.15-2.43 0-1.34.95-2.43 2.15-2.43 1.2 0 2.17 1.1 2.15 2.43 0 1.34-.95 2.43-2.15 2.43Z" />
    </svg>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#050506] text-[#f6f1e8] selection:bg-[#ff4d4d] selection:text-white">
      <section className="relative min-h-screen border-b border-white/10">
        <Image
          src="/og-dark-rp-splash.png"
          alt="OG Dark RP city scene"
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-[0.46]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,5,6,0.96),rgba(5,5,6,0.65)_45%,rgba(5,5,6,0.2)),linear-gradient(180deg,rgba(5,5,6,0.25),rgba(5,5,6,0.95)_88%)]" />
        <div className="site-noise" />
        <div className="scanlines" />

        <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
          <a href="#top" className="flex items-center gap-3">
            <Image
              src="/og-dark-rp-logo-no-bg.png"
              alt="OG Dark RP"
              width={156}
              height={54}
              priority
              className="h-9 w-auto invert"
            />
            <span className="hidden border-l border-white/20 pl-3 text-xs font-bold uppercase tracking-[0.24em] text-white/70 sm:inline">
              April 2026
            </span>
          </a>
          <div className="hidden items-center gap-6 text-xs font-bold uppercase tracking-[0.2em] text-white/70 md:flex">
            <a className="transition hover:text-white" href="#systems">
              Systems
            </a>
            <a className="transition hover:text-white" href="#roles">
              Roles
            </a>
            <Link className="transition hover:text-white" href="/rules">
              Rules
            </Link>
            <Link className="transition hover:text-white" href="/guides">
              Guides
            </Link>
            <a className="transition hover:text-white" href="#join">
              Launch
            </a>
          </div>
        </nav>

        <div
          id="top"
          className="relative z-10 mx-auto grid min-h-[calc(100vh-5rem)] max-w-7xl grid-cols-1 content-end gap-10 px-5 pb-10 pt-12 sm:px-8 lg:grid-cols-[1.05fr_0.7fr] lg:content-center lg:pb-16"
        >
          <div className="min-w-0 max-w-[calc(100vw-2.5rem)] sm:max-w-4xl">
            <div className="mb-5 inline-flex border border-[#ff4d4d]/40 bg-[#ff4d4d]/10 px-3 py-2 text-xs font-black uppercase tracking-[0.22em] text-[#ffb0a8]">
              Dark RP in Source 2
            </div>
            <h1 className="max-w-5xl text-6xl font-black uppercase leading-[0.9] text-white sm:text-7xl md:text-8xl lg:text-9xl">
              OG
              <span className="block text-[#ff4d4d]">Dark RP</span>
            </h1>
            <p className="mt-6 max-w-[20.25rem] text-base font-medium leading-7 text-white/78 sm:max-w-2xl sm:text-lg sm:leading-8 md:text-xl">
              A S&box successor to classic GMod DarkRP: mayor drama, police
              raids, fragile economies, player businesses, dirty money and TVs
              glowing in apartments above the street.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <a
                href="#join"
                className="inline-flex h-12 items-center justify-center border border-[#ff4d4d] bg-[#ff4d4d] px-6 text-sm font-black uppercase tracking-[0.16em] text-white transition hover:bg-[#d83232]"
              >
                Enter Downtown
              </a>
              <a
                href={discordInviteUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-12 items-center justify-center gap-2 border border-[#7a85ff] bg-[#5865f2] px-6 text-sm font-black uppercase tracking-[0.16em] text-white transition hover:bg-[#4752c4]"
              >
                <DiscordIcon />
                Join Our Discord
              </a>
              <a
                href="#systems"
                className="inline-flex h-12 items-center justify-center border border-white/25 bg-black/35 px-6 text-sm font-black uppercase tracking-[0.16em] text-white transition hover:border-white/60"
              >
                Read The Docket
              </a>
            </div>
          </div>

          <aside className="border border-white/14 bg-black/55 p-4 backdrop-blur-md md:p-5">
            <div className="mb-4 flex items-center justify-between border-b border-white/12 pb-3">
              <span className="text-xs font-black uppercase tracking-[0.22em] text-white/55">
                City feed
              </span>
              <span className="text-xs font-black uppercase tracking-[0.18em] text-[#72f1b8]">
                live
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {liveStats.map((stat) => (
                <div key={stat.label} className="border border-white/10 bg-white/[0.04] p-3">
                  <div className={`text-3xl font-black ${stat.tone}`}>
                    {stat.value}
                  </div>
                  <div className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-white/48">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
            <div className="city-map mt-4" aria-hidden="true">
              <span className="city-node city-node-a" />
              <span className="city-node city-node-b" />
              <span className="city-node city-node-c" />
              <span className="city-node city-node-d" />
            </div>
          </aside>
        </div>
      </section>

      <div className="border-y border-white/10 bg-[#f6f1e8] py-3 text-[#050506]">
        <div className="marquee text-sm font-black uppercase tracking-[0.18em]">
          <span>
            Jobs / Warrants / Printers / Bitcoin / Bank Robbery / Casinos / Vehicles / TV Screens / Organizations / Taxes /
          </span>
          <span>
            Jobs / Warrants / Printers / Bitcoin / Bank Robbery / Casinos / Vehicles / TV Screens / Organizations / Taxes /
          </span>
        </div>
      </div>

      <section id="systems" className="bg-[#10100f] px-5 py-20 sm:px-8 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#ffd166]">
                Feature docket
              </p>
              <h2 className="mt-4 text-4xl font-black uppercase leading-none text-white md:text-6xl">
                The city is a machine with bad intentions.
              </h2>
            </div>
            <p className="max-w-2xl text-base leading-8 text-white/66 md:text-lg">
              OG Dark RP is not a lobby with jobs. It is a set of overlapping
              pressures: law reacts to crime, businesses feed the economy,
              organizations share territory, and every unlocked door creates a
              story someone else can interrupt.
            </p>
          </div>

          <div className="mt-12 grid gap-3 md:grid-cols-2">
            {featureSignals.map((feature, index) => (
              <div
                key={feature}
                className="group grid min-h-24 grid-cols-[4.5rem_1fr] border border-white/10 bg-[#050506] transition hover:border-[#ff4d4d]/55"
              >
                <div className="grid place-items-center border-r border-white/10 text-xl font-black text-white/30 group-hover:text-[#ff4d4d]">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <div className="flex items-center p-4 text-base font-bold leading-7 text-white/82">
                  {feature}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#f6f1e8] px-5 py-20 text-[#050506] sm:px-8 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-5 md:grid-cols-4">
            {districts.map((district) => (
              <article key={district.name} className="min-h-72 border border-black/15 bg-white p-5">
                <div className="mb-10 flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-[0.18em] text-black/48">
                    {district.code}
                  </span>
                  <span className="h-3 w-3 bg-[#ff4d4d]" />
                </div>
                <h3 className="text-3xl font-black uppercase leading-none">
                  {district.name}
                </h3>
                <p className="mt-5 text-base font-medium leading-7 text-black/64">
                  {district.copy}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="roles" className="relative overflow-hidden bg-[#050506] px-5 py-20 sm:px-8 lg:py-28">
        <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,77,77,0.18),transparent_34%),linear-gradient(260deg,rgba(114,241,184,0.14),transparent_36%)]" />
        <div className="site-noise" />
        <div className="relative mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.75fr_1.25fr]">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#72f1b8]">
              Pick a lane
            </p>
            <h2 className="mt-4 text-4xl font-black uppercase leading-none text-white md:text-6xl">
              Every job pushes the server in a different direction.
            </h2>
            <p className="mt-6 text-base leading-8 text-white/62">
              The job roster keeps the old DarkRP readability, then layers in
              S&box-era systems for radios, vehicles, media screens, markets and
              persistence.
            </p>
          </div>

          <div className="grid auto-rows-[3.25rem] grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {roleTracks.map((role) => (
              <div
                key={role}
                className="flex items-center border border-white/10 bg-white/[0.045] px-3 text-sm font-black uppercase tracking-[0.08em] text-white/76"
              >
                {role}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#16120f] px-5 py-20 sm:px-8 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[1fr_1fr]">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#ff4d4d]">
                Money moves
              </p>
              <h2 className="mt-4 text-4xl font-black uppercase leading-none text-white md:text-6xl">
                Get paid, get raided, start again louder.
              </h2>
            </div>
            <div className="grid gap-3">
              {economyLoops.map((loop) => (
                <article key={loop.title} className="border border-white/10 bg-black/35 p-5">
                  <h3 className="text-xl font-black uppercase text-white">
                    {loop.title}
                  </h3>
                  <p className="mt-3 text-base leading-7 text-white/62">
                    {loop.body}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="join" className="relative bg-[#f6f1e8] px-5 py-20 text-[#050506] sm:px-8 lg:py-28">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <Image
              src="/og-dark-rp-logo-no-bg.png"
              alt="OG Dark RP logo"
              width={720}
              height={250}
              className="h-auto w-full max-w-2xl"
            />
            <h2 className="mt-8 max-w-4xl text-4xl font-black uppercase leading-none md:text-6xl">
              Built for the stories players invent when systems collide.
            </h2>
          </div>

          <div className="border border-black/15 bg-white p-5">
            <div className="mb-6 border-b border-black/12 pb-4 text-xs font-black uppercase tracking-[0.22em] text-black/48">
              Launch notes
            </div>
            <div className="grid gap-3">
              {launchBeats.map((beat) => (
                <div key={beat} className="flex gap-3 border border-black/10 p-3">
                  <span className="mt-2 h-2.5 w-2.5 shrink-0 bg-[#ff4d4d]" />
                  <p className="text-base font-bold leading-7 text-black/70">
                    {beat}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <a
                href={joinServerPath}
                aria-label="Join OG DarkRP in s&box"
                className="inline-flex h-12 items-center justify-center bg-[#ff4d4d] px-6 text-sm font-black uppercase tracking-[0.16em] text-white transition hover:bg-[#d83232]"
              >
                Join OG DarkRP
              </a>
              <a
                href={sboxPackageUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-12 items-center justify-center bg-[#050506] px-6 text-sm font-black uppercase tracking-[0.16em] text-white transition hover:bg-[#2b2421]"
              >
                View On S&box
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
