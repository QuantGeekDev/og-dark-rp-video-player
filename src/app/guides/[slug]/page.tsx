import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MarkdownBlocks } from "@/components/MarkdownContent";
import {
  getGuideBySlug,
  getGuideStaticParams,
  getGuidebookData,
} from "@/lib/guides";
import type { GuideEntry } from "@/lib/guides-types";

type GuidePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return getGuideStaticParams();
}

export async function generateMetadata({
  params,
}: GuidePageProps): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);

  if (!guide) {
    return {
      title: "Guide Not Found | OG Dark RP",
    };
  }

  return {
    title: `${guide.title} Guide | OG Dark RP`,
    description: guide.summary,
    openGraph: {
      title: `${guide.title} Guide | OG Dark RP`,
      description: guide.summary,
      type: "article",
    },
  };
}

export default async function GuidePage({ params }: GuidePageProps) {
  const { slug } = await params;
  const guidebook = getGuidebookData();
  const guide = guidebook.guides.find((candidate) => candidate.slug === slug);

  if (!guide) {
    notFound();
  }

  const relatedGuides = guide.related
    .map((relatedId) =>
      guidebook.guides.find((candidate) => candidate.id === relatedId),
    )
    .filter((candidate): candidate is GuideEntry => Boolean(candidate));

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
            <Link className="transition hover:text-white" href="/guides">
              All Guides
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
          className="object-cover opacity-[0.16]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,5,6,0.98),rgba(5,5,6,0.72)_55%,rgba(5,5,6,0.96))]" />
        <div className="site-noise" />
        <div className="relative mx-auto max-w-7xl">
          <Link
            href="/guides"
            className="inline-flex border border-white/10 bg-black/30 px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-white/58 transition hover:border-[#72f1b8] hover:text-[#72f1b8]"
          >
            Back to Guides
          </Link>
          <div className="mt-8 max-w-4xl">
            <div className="inline-flex border border-[#72f1b8]/35 bg-[#72f1b8]/10 px-3 py-2 text-xs font-black uppercase tracking-[0.2em] text-[#a8ffd5]">
              {guide.category}
            </div>
            <h1 className="mt-5 text-5xl font-black uppercase leading-none text-white md:text-7xl">
              {guide.title}
            </h1>
            <p className="mt-5 max-w-3xl text-base font-medium leading-8 text-white/70 md:text-lg">
              {guide.summary}
            </p>
            <div className="mt-5 flex flex-wrap gap-3 text-xs font-black uppercase tracking-[0.16em] text-white/46">
              <span>Guide {String(guide.order).padStart(2, "0")}</span>
              <span>{guide.audience}</span>
              {guide.updated && <span>Updated {guide.updated}</span>}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#050506] px-5 py-8 sm:px-8 lg:py-12">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[18rem_1fr]">
          <aside className="lg:sticky lg:top-5 lg:self-start">
            <div className="border border-white/10 bg-[#10100f] p-4">
              <div className="text-xs font-black uppercase tracking-[0.22em] text-white/42">
                Sections
              </div>
              <div className="mt-4 grid gap-2">
                {guide.sections.map((section) => (
                  <a
                    key={section.slug}
                    href={`#${section.slug}`}
                    className="border border-white/10 bg-black/20 px-3 py-3 text-xs font-black uppercase tracking-[0.12em] text-white/68 transition hover:border-[#72f1b8]/60 hover:text-[#72f1b8]"
                  >
                    {section.title}
                  </a>
                ))}
              </div>

              {relatedGuides.length > 0 && (
                <div className="mt-6 border-t border-white/10 pt-4">
                  <div className="text-xs font-black uppercase tracking-[0.22em] text-white/42">
                    Related
                  </div>
                  <div className="mt-4 grid gap-2">
                    {relatedGuides.map((relatedGuide) => (
                      <Link
                        key={relatedGuide.id}
                        href={`/guides/${relatedGuide.slug}`}
                        className="border border-white/10 bg-black/20 px-3 py-3 text-xs font-black uppercase leading-5 tracking-[0.1em] text-white/68 transition hover:border-[#ffd166]/60 hover:text-[#ffd166]"
                      >
                        {relatedGuide.title}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>

          <article className="grid gap-4">
            {guide.sections.map((section) => (
              <section
                key={section.slug}
                id={section.slug}
                className="border border-white/10 bg-[#10100f] p-5 md:p-6"
              >
                <h2 className="text-3xl font-black uppercase leading-none text-white md:text-4xl">
                  {section.title}
                </h2>
                <div className="mt-5 grid gap-4">
                  <MarkdownBlocks blocks={section.blocks} />
                </div>
              </section>
            ))}
          </article>
        </div>
      </section>
    </main>
  );
}
