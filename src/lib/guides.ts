import fs from "node:fs";
import path from "node:path";
import {
  arrayValue,
  blockText,
  normalizedLines,
  parseTopLevelSections,
  slugify,
  splitFrontmatter,
  stringValue,
  titleFromFileName,
} from "@/lib/markdown-content";
import type {
  GuideCategory,
  GuideEntry,
  GuideSection,
  GuidebookData,
} from "@/lib/guides-types";

const guidesDirectory = path.join(process.cwd(), "content", "guides");

export function getGuidebookData(): GuidebookData {
  const files = fs
    .readdirSync(guidesDirectory)
    .filter((fileName) => fileName.endsWith(".md"));

  const guides = files
    .filter((fileName) => fileName !== "README.md")
    .map((fileName) => parseGuide(fileName, readGuideFile(fileName)))
    .sort((a, b) => a.order - b.order);

  return {
    title: "Player Guides",
    summary:
      "Short, player-facing guides for OG Dark RP systems, jobs, tools, criminal loops, government play, economy, transport, and support.",
    sourceNote:
      "Generated from the game repo guides folder and committed into this website for deployment.",
    guides,
    categories: groupGuideCategories(guides),
    updated: newestDate(guides.map((guide) => guide.updated)),
    totalGuides: guides.length,
  };
}

export function getGuideBySlug(slug: string) {
  return getGuidebookData().guides.find((guide) => guide.slug === slug) ?? null;
}

export function getGuideStaticParams() {
  return getGuidebookData().guides.map((guide) => ({ slug: guide.slug }));
}

function readGuideFile(fileName: string) {
  return fs.readFileSync(path.join(guidesDirectory, fileName), "utf8");
}

function parseGuide(fileName: string, raw: string): GuideEntry {
  const { frontmatter, body } = splitFrontmatter(raw);
  const lines = normalizedLines(body).filter((line) => !line.startsWith("# "));
  const title = stringValue(frontmatter.title, titleFromFileName(fileName));
  const id = stringValue(frontmatter.id, slugify(title));
  const category = stringValue(frontmatter.category, "General");
  const sections = parseTopLevelSections(lines) as GuideSection[];
  const quickStart = findSection(sections, "Quick Start");
  const details = findSection(sections, "Details");
  const gotchas = findSection(sections, "Gotchas");
  const aliases = arrayValue(frontmatter.aliases);
  const related = arrayValue(frontmatter.related);
  const summary = stringValue(frontmatter.summary, "");

  return {
    id,
    slug: id,
    title,
    category,
    categoryId: slugify(category),
    order: Number(stringValue(frontmatter.order, "0")),
    audience: stringValue(frontmatter.audience, "all"),
    updated: stringValue(frontmatter.updated, ""),
    summary,
    aliases,
    related,
    fileName,
    sections,
    quickStart,
    details,
    gotchas,
    searchText: [
      title,
      category,
      summary,
      ...aliases,
      ...related,
      ...sections.map((section) => `${section.title} ${section.text}`),
    ]
      .join(" ")
      .toLowerCase(),
  };
}

function groupGuideCategories(guides: GuideEntry[]): GuideCategory[] {
  const categories = new Map<string, GuideCategory>();

  for (const guide of guides) {
    const existing = categories.get(guide.categoryId);
    if (existing) {
      existing.guides.push(guide);
      existing.order = Math.min(existing.order, guide.order);
      existing.searchText = `${existing.searchText} ${guide.searchText}`;
      continue;
    }

    categories.set(guide.categoryId, {
      id: guide.categoryId,
      title: guide.category,
      order: guide.order,
      guides: [guide],
      searchText: guide.searchText,
    });
  }

  return Array.from(categories.values())
    .map((category) => ({
      ...category,
      guides: category.guides.sort((a, b) => a.order - b.order),
    }))
    .sort((a, b) => a.order - b.order);
}

function findSection(sections: GuideSection[], title: string) {
  return (
    sections.find(
      (section) => section.title.toLowerCase() === title.toLowerCase(),
    ) ?? null
  );
}

function newestDate(dates: string[]) {
  return dates.filter(Boolean).sort().at(-1) ?? "";
}

export function guidePreviewText(guide: GuideEntry) {
  if (guide.quickStart) {
    return blockText(guide.quickStart.blocks);
  }

  return guide.summary;
}
