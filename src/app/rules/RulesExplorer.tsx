"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { MarkdownBlocks } from "@/components/MarkdownContent";
import type {
  RuleCategory,
  RuleEntry,
  RulebookData,
} from "@/lib/server-rules-types";

type CategoryGroup = {
  title: string;
  categories: RuleCategory[];
};

type RuleSearchHit = {
  category: RuleCategory;
  rule: RuleEntry;
};

const allCategoriesId = "all";

export function RulesExplorer({ rulebook }: { rulebook: RulebookData }) {
  const [activeCategoryId, setActiveCategoryId] = useState(allCategoriesId);
  const [query, setQuery] = useState("");
  const normalizedQuery = normalizeSearch(query);
  const activeCategory =
    rulebook.categories.find((category) => category.id === activeCategoryId) ??
    null;

  const groups = useMemo(
    () => groupCategories(rulebook.categories),
    [rulebook.categories],
  );

  const matchingRules = useMemo(() => {
    const sourceCategories = activeCategory
      ? [activeCategory]
      : rulebook.categories;

    return sourceCategories.flatMap((category) =>
      category.rules
        .filter((rule) =>
          normalizedQuery
            ? normalizeSearch(`${rule.id} ${rule.title} ${rule.text}`).includes(
                normalizedQuery,
              )
            : true,
        )
        .map((rule) => ({ category, rule })),
    );
  }, [activeCategory, normalizedQuery, rulebook.categories]);

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
              Rules
            </span>
          </Link>
          <div className="flex items-center gap-5 text-xs font-bold uppercase tracking-[0.2em] text-white/70">
            <Link className="transition hover:text-white" href="/">
              Home
            </Link>
            <Link className="transition hover:text-white" href="/guides">
              Guides
            </Link>
            <Link className="transition hover:text-white" href="/#join">
              Launch
            </Link>
          </div>
        </nav>
      </header>

      <section className="relative overflow-hidden border-b border-white/10 bg-[#11100f] px-5 py-12 sm:px-8 lg:py-16">
        <div className="site-noise" />
        <div className="relative mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#ffd166]">
              Player Rulebook
            </p>
            <h1 className="mt-4 text-5xl font-black uppercase leading-none text-white md:text-7xl">
              Server Rules
            </h1>
            <p className="mt-5 max-w-2xl text-base font-medium leading-8 text-white/68 md:text-lg">
              {rulebook.intro.summary}
            </p>
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 bg-[#f6f1e8] px-5 py-5 text-[#050506] sm:px-8">
        <div className="mx-auto grid max-w-7xl gap-3 lg:grid-cols-[18rem_1fr]">
          <label className="flex h-12 items-center border border-black/15 bg-white px-4 text-xs font-black uppercase tracking-[0.18em] text-black/48">
            Search Rules
          </label>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="RDM, warrant, casino, NLR, mayor..."
            className="h-12 w-full border border-black/15 bg-white px-4 text-base font-bold text-[#050506] outline-none transition placeholder:text-black/35 focus:border-[#ff4d4d]"
          />
        </div>
      </section>

      <section className="bg-[#050506] px-5 py-8 sm:px-8 lg:py-12">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[18rem_1fr]">
          <aside className="lg:sticky lg:top-5 lg:self-start">
            <CategoryRail
              activeCategoryId={activeCategoryId}
              groups={groups}
              onSelect={setActiveCategoryId}
              totalRules={rulebook.totalRules}
            />
          </aside>

          <div className="min-w-0">
            {normalizedQuery ? (
              <SearchResults hits={matchingRules} query={query} />
            ) : activeCategory ? (
              <CategoryView
                category={activeCategory}
                categories={rulebook.categories}
                onSelectCategory={setActiveCategoryId}
              />
            ) : (
              <RulebookOverview
                rulebook={rulebook}
                onSelectCategory={setActiveCategoryId}
              />
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function CategoryRail({
  activeCategoryId,
  groups,
  onSelect,
  totalRules,
}: {
  activeCategoryId: string;
  groups: CategoryGroup[];
  onSelect: (categoryId: string) => void;
  totalRules: number;
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
          All Categories
        </span>
        <span className="text-xs font-black">{totalRules}</span>
      </button>

      <div className="grid gap-4">
        {groups.map((group) => (
          <div key={group.title}>
            <div className="mb-2 px-1 text-[0.68rem] font-black uppercase tracking-[0.2em] text-[#ffd166]">
              {group.title}
            </div>
            <div className="grid gap-2">
              {group.categories.map((category) => (
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
                    {category.rules.length}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RulebookOverview({
  rulebook,
  onSelectCategory,
}: {
  rulebook: RulebookData;
  onSelectCategory: (categoryId: string) => void;
}) {
  return (
    <div className="grid gap-6">
      <section className="border border-white/10 bg-[#10100f] p-5">
        <div className="text-xs font-black uppercase tracking-[0.22em] text-white/45">
          Rulebook Contract
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {rulebook.intro.contract.map((item) => (
            <div key={item} className="flex gap-3 border border-white/10 p-3">
              <span className="mt-2 h-2.5 w-2.5 shrink-0 bg-[#ff4d4d]" />
              <p className="text-sm font-bold leading-6 text-white/72">{item}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        {rulebook.categories.map((category) => (
          <button
            type="button"
            key={category.id}
            onClick={() => onSelectCategory(category.id)}
            className="group border border-white/10 bg-[#10100f] p-5 text-left transition hover:border-[#ff4d4d]/60"
          >
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs font-black uppercase tracking-[0.18em] text-[#ffd166]">
                {category.id}
              </span>
              <span className="text-xs font-black uppercase tracking-[0.14em] text-white/42">
                {category.rules.length} rules
              </span>
            </div>
            <h2 className="mt-5 text-2xl font-black uppercase leading-none text-white group-hover:text-[#ff4d4d]">
              {category.title}
            </h2>
            <p className="mt-4 text-sm font-medium leading-7 text-white/62">
              {category.summary}
            </p>
          </button>
        ))}
      </section>
    </div>
  );
}

function SearchResults({
  hits,
  query,
}: {
  hits: RuleSearchHit[];
  query: string;
}) {
  const groupedHits = groupHits(hits);

  if (hits.length === 0) {
    return (
      <div className="border border-white/10 bg-[#10100f] p-8">
        <div className="text-xs font-black uppercase tracking-[0.22em] text-[#ff4d4d]">
          No Matches
        </div>
        <p className="mt-4 text-lg font-bold leading-8 text-white/70">
          No rules matched &quot;{query}&quot;.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border border-white/10 bg-[#10100f] p-5">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.22em] text-[#72f1b8]">
            Search Results
          </div>
          <h2 className="mt-2 text-3xl font-black uppercase leading-none text-white">
            {hits.length} matching rules
          </h2>
        </div>
        <div className="border border-white/10 px-3 py-2 text-sm font-black text-white/70">
          {query}
        </div>
      </div>

      {groupedHits.map(({ category, rules }) => (
        <section key={category.id} className="grid gap-3">
          <div className="flex items-end justify-between gap-4">
            <h3 className="text-2xl font-black uppercase text-white">
              {category.title}
            </h3>
            <span className="text-xs font-black uppercase tracking-[0.16em] text-white/45">
              {rules.length} matches
            </span>
          </div>
          {rules.map((rule) => (
            <RuleCard key={rule.id} rule={rule} compact category={category} />
          ))}
        </section>
      ))}
    </div>
  );
}

function CategoryView({
  category,
  categories,
  onSelectCategory,
}: {
  category: RuleCategory;
  categories: RuleCategory[];
  onSelectCategory: (categoryId: string) => void;
}) {
  const relatedCategories = category.related
    .map((relatedId) =>
      categories.find((candidate) => candidate.id === relatedId),
    )
    .filter((related): related is RuleCategory => Boolean(related));

  return (
    <article className="grid gap-6">
      <section className="border border-white/10 bg-[#10100f] p-5 md:p-6">
        <div className="flex flex-wrap items-center gap-2">
          {category.mechanics.map((mechanic) => (
            <span
              key={mechanic}
              className="border border-[#9bbcff]/35 bg-[#9bbcff]/10 px-2.5 py-1 text-xs font-black uppercase tracking-[0.12em] text-[#c8d8ff]"
            >
              {mechanic}
            </span>
          ))}
        </div>
        <h2 className="mt-5 text-4xl font-black uppercase leading-none text-white md:text-5xl">
          {category.title}
        </h2>
        <p className="mt-5 max-w-4xl text-lg font-bold leading-8 text-white/72">
          {category.breath || category.summary}
        </p>
        <div className="mt-5 flex flex-wrap gap-3 text-xs font-black uppercase tracking-[0.16em] text-white/48">
          <span>{category.rules.length} rules</span>
          <span>{category.updated}</span>
        </div>
      </section>

      {category.rules.length > 0 && (
        <section className="grid gap-3">
          {category.rules.map((rule) => (
            <RuleCard key={rule.id} rule={rule} />
          ))}
        </section>
      )}

      {category.sections.length > 0 && (
        <section className="grid gap-3">
          {category.sections.map((section) => (
            <div key={section.slug} className="border border-white/10 bg-[#10100f] p-5">
              <h3 className="text-2xl font-black uppercase text-white">
                {section.title}
              </h3>
              <div className="mt-4 grid gap-4">
                <MarkdownBlocks blocks={section.blocks} />
              </div>
            </div>
          ))}
        </section>
      )}

      {relatedCategories.length > 0 && (
        <section className="border border-white/10 bg-[#10100f] p-5">
          <div className="text-xs font-black uppercase tracking-[0.22em] text-white/45">
            Related Categories
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {relatedCategories.map((relatedCategory) => (
              <button
                type="button"
                key={relatedCategory.id}
                onClick={() => onSelectCategory(relatedCategory.id)}
                className="border border-white/10 px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-white/72 transition hover:border-[#72f1b8] hover:text-[#72f1b8]"
              >
                {relatedCategory.title}
              </button>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}

function RuleCard({
  rule,
  compact,
  category,
}: {
  rule: RuleEntry;
  compact?: boolean;
  category?: RuleCategory;
}) {
  return (
    <article
      id={rule.slug}
      className="border border-white/10 bg-[#10100f] p-5 transition hover:border-white/24"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="border border-[#ff4d4d]/40 bg-[#ff4d4d]/10 px-2.5 py-1 text-xs font-black uppercase tracking-[0.14em] text-[#ffb0a8]">
          {rule.id}
        </span>
        {category && (
          <span className="text-xs font-black uppercase tracking-[0.16em] text-white/42">
            {category.title}
          </span>
        )}
      </div>
      <h3
        className={`mt-4 font-black uppercase leading-tight text-white ${
          compact ? "text-xl" : "text-2xl md:text-3xl"
        }`}
      >
        {rule.title}
      </h3>
      <div className="mt-4 grid gap-4">
        <MarkdownBlocks blocks={rule.blocks} />
      </div>
    </article>
  );
}

function groupCategories(categories: RuleCategory[]): CategoryGroup[] {
  const groups = [
    { title: "Foundations", categories: [] as RuleCategory[] },
    { title: "Conflict", categories: [] as RuleCategory[] },
    { title: "City Systems", categories: [] as RuleCategory[] },
    { title: "Support", categories: [] as RuleCategory[] },
  ];

  for (const category of categories) {
    if (category.order < 40) groups[0].categories.push(category);
    else if (category.order < 80) groups[1].categories.push(category);
    else if (category.order < 130) groups[2].categories.push(category);
    else groups[3].categories.push(category);
  }

  return groups.filter((group) => group.categories.length > 0);
}

function groupHits(hits: RuleSearchHit[]) {
  const groups: Array<{ category: RuleCategory; rules: RuleEntry[] }> = [];

  for (const hit of hits) {
    let group = groups.find((candidate) => candidate.category.id === hit.category.id);
    if (!group) {
      group = { category: hit.category, rules: [] };
      groups.push(group);
    }

    group.rules.push(hit.rule);
  }

  return groups;
}

function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}
