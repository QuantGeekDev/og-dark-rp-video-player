"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import type {
  GuideCategory,
  GuideEntry,
  GuidebookData,
} from "@/lib/guides-types";

const allCategoriesId = "all";

export function GuidesExplorer({ guidebook }: { guidebook: GuidebookData }) {
  const [activeCategoryId, setActiveCategoryId] = useState(allCategoriesId);
  const [query, setQuery] = useState("");
  const normalizedQuery = normalizeSearch(query);

  const visibleGuides = useMemo(() => {
    return guidebook.guides.filter((guide) => {
      const categoryMatches =
        activeCategoryId === allCategoriesId ||
        guide.categoryId === activeCategoryId;
      const queryMatches = normalizedQuery
        ? guide.searchText.includes(normalizedQuery)
        : true;

      return categoryMatches && queryMatches;
    });
  }, [activeCategoryId, guidebook.guides, normalizedQuery]);

  return (
    <main className="min-h-screen bg-[#050506] text-[#f6f1e8] selection:bg-[#ff4d4d] selection:text-white">
      <header className="border-b border-white/10 bg-[#050506]/95">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/og-dark-rp-logo-no-bg.png"
              alt="OG Dark RP"
              width={156}
              height={54}
              priority
              className="h-9 w-auto invert"
            />
            <span className="hidden border-l border-white/20 pl-3 text-xs font-bold uppercase tracking-[0.24em] text-white/70 sm:inline">
              Guides
            </span>
          </Link>
          <div className="flex items-center gap-5 text-xs font-bold uppercase tracking-[0.2em] text-white/70">
            <Link className="transition hover:text-white" href="/">
              Home
            </Link>
            <Link className="transition hover:text-white" href="/rules">
              Rules
            </Link>
            <Link className="transition hover:text-white" href="/#join">
              Launch
            </Link>
          </div>
        </nav>
      </header>

      <section className="relative overflow-hidden border-b border-white/10 bg-[#11100f] px-5 py-12 sm:px-8 lg:py-16">
        <Image
          src="/og-dark-rp-splash.png"
          alt=""
          fill
          sizes="100vw"
          className="object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,5,6,0.98),rgba(5,5,6,0.72)_55%,rgba(5,5,6,0.95))]" />
        <div className="site-noise" />
        <div className="relative mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_24rem] lg:items-end">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#72f1b8]">
              OG Dark RP Manual
            </p>
            <h1 className="mt-4 text-5xl font-black uppercase leading-none text-white md:text-7xl">
              Player Guides
            </h1>
            <p className="mt-5 max-w-2xl text-base font-medium leading-8 text-white/70 md:text-lg">
              {guidebook.summary}
            </p>
          </div>
          <div className="grid gap-2 border border-white/10 bg-black/35 p-4">
            <div className="text-xs font-black uppercase tracking-[0.22em] text-white/45">
              Most Useful First
            </div>
            <div className="grid gap-2">
              {guidebook.guides.slice(0, 4).map((guide) => (
                <Link
                  key={guide.id}
                  href={`/guides/${guide.slug}`}
                  className="grid grid-cols-[auto_1fr] items-center gap-3 border border-white/10 bg-white/[0.04] px-3 py-3 transition hover:border-[#72f1b8]/60"
                >
                  <span className="text-xs font-black text-[#ffd166]">
                    {String(guide.order).padStart(2, "0")}
                  </span>
                  <span className="text-sm font-black uppercase leading-5 text-white">
                    {guide.title}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 bg-[#f6f1e8] px-5 py-5 text-[#050506] sm:px-8">
        <div className="mx-auto grid max-w-7xl gap-3 lg:grid-cols-[18rem_1fr]">
          <label className="flex h-12 items-center border border-black/15 bg-white px-4 text-xs font-black uppercase tracking-[0.18em] text-black/48">
            Search Guides
          </label>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="police, bank, doors, money, vehicles, tv..."
            className="h-12 w-full border border-black/15 bg-white px-4 text-base font-bold text-[#050506] outline-none transition placeholder:text-black/35 focus:border-[#ff4d4d]"
          />
        </div>
      </section>

      <section className="bg-[#050506] px-5 py-8 sm:px-8 lg:py-12">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[18rem_1fr]">
          <aside className="lg:sticky lg:top-5 lg:self-start">
            <CategoryRail
              activeCategoryId={activeCategoryId}
              categories={guidebook.categories}
              onSelect={setActiveCategoryId}
              totalGuides={guidebook.totalGuides}
            />
          </aside>

          <div className="min-w-0">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.22em] text-white/42">
                  {normalizedQuery ? "Filtered Results" : "All Guides"}
                </div>
                <h2 className="mt-2 text-3xl font-black uppercase leading-none text-white">
                  {visibleGuides.length} guide
                  {visibleGuides.length === 1 ? "" : "s"}
                </h2>
              </div>
              {guidebook.updated && (
                <div className="border border-white/10 px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-white/45">
                  Updated {guidebook.updated}
                </div>
              )}
            </div>

            {visibleGuides.length > 0 ? (
              <section className="grid gap-3 md:grid-cols-2">
                {visibleGuides.map((guide) => (
                  <GuideCard key={guide.id} guide={guide} />
                ))}
              </section>
            ) : (
              <div className="border border-white/10 bg-[#10100f] p-8">
                <div className="text-xs font-black uppercase tracking-[0.22em] text-[#ff4d4d]">
                  No Matches
                </div>
                <p className="mt-4 text-lg font-bold leading-8 text-white/70">
                  No guides matched &quot;{query}&quot;.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function CategoryRail({
  activeCategoryId,
  categories,
  onSelect,
  totalGuides,
}: {
  activeCategoryId: string;
  categories: GuideCategory[];
  onSelect: (categoryId: string) => void;
  totalGuides: number;
}) {
  return (
    <div className="border border-white/10 bg-[#10100f] p-3">
      <button
        type="button"
        onClick={() => onSelect(allCategoriesId)}
        className={`mb-3 flex w-full items-center justify-between border px-3 py-3 text-left transition ${
          activeCategoryId === allCategoriesId
            ? "border-[#ff4d4d] bg-[#ff4d4d] text-white"
            : "border-white/10 bg-black/20 text-white/72 hover:border-white/30"
        }`}
      >
        <span className="text-sm font-black uppercase tracking-[0.12em]">
          All Guides
        </span>
        <span className="text-xs font-black">{totalGuides}</span>
      </button>

      <div className="grid gap-2">
        {categories.map((category) => (
          <button
            type="button"
            key={category.id}
            onClick={() => onSelect(category.id)}
            className={`grid w-full grid-cols-[1fr_auto] items-center gap-3 border px-3 py-3 text-left transition ${
              activeCategoryId === category.id
                ? "border-[#72f1b8] bg-[#72f1b8] text-[#050506]"
                : "border-white/10 bg-black/20 text-white/72 hover:border-white/30 hover:text-white"
            }`}
          >
            <span className="text-xs font-black uppercase leading-5 tracking-[0.1em]">
              {category.title}
            </span>
            <span className="text-xs font-black">
              {category.guides.length}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function GuideCard({ guide }: { guide: GuideEntry }) {
  const quickItems =
    guide.quickStart?.blocks.find((block) => block.type === "list")?.items ??
    [];

  return (
    <Link
      href={`/guides/${guide.slug}`}
      className="group flex min-h-[23rem] flex-col border border-white/10 bg-[#10100f] p-5 transition hover:border-[#72f1b8]/60"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="border border-[#72f1b8]/35 bg-[#72f1b8]/10 px-2.5 py-1 text-xs font-black uppercase tracking-[0.14em] text-[#a8ffd5]">
          {guide.category}
        </span>
        <span className="text-xs font-black uppercase tracking-[0.16em] text-white/42">
          {String(guide.order).padStart(2, "0")}
        </span>
      </div>
      <h3 className="mt-5 text-2xl font-black uppercase leading-tight text-white transition group-hover:text-[#72f1b8] md:text-3xl">
        {guide.title}
      </h3>
      <p className="mt-4 text-sm font-medium leading-7 text-white/62">
        {guide.summary}
      </p>
      {quickItems.length > 0 && (
        <ul className="mt-5 grid gap-2">
          {quickItems.slice(0, 3).map((item) => (
            <li
              key={item}
              className="flex gap-3 text-sm font-semibold leading-6 text-white/64"
            >
              <span className="mt-2 h-1.5 w-1.5 shrink-0 bg-[#ffd166]" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-6">
        {guide.aliases.slice(0, 3).map((alias) => (
          <span
            key={alias}
            className="border border-white/10 px-2 py-1 text-[0.68rem] font-black uppercase tracking-[0.12em] text-white/45"
          >
            {alias}
          </span>
        ))}
      </div>
    </Link>
  );
}

function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}

