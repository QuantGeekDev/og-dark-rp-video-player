import type { MarkdownBlock } from "@/lib/markdown-types";

export type GuideSection = {
  title: string;
  slug: string;
  blocks: MarkdownBlock[];
  text: string;
};

export type GuideEntry = {
  id: string;
  slug: string;
  title: string;
  category: string;
  categoryId: string;
  order: number;
  audience: string;
  updated: string;
  summary: string;
  aliases: string[];
  related: string[];
  fileName: string;
  sections: GuideSection[];
  quickStart: GuideSection | null;
  details: GuideSection | null;
  gotchas: GuideSection | null;
  searchText: string;
};

export type GuideCategory = {
  id: string;
  title: string;
  order: number;
  guides: GuideEntry[];
  searchText: string;
};

export type GuidebookData = {
  title: string;
  summary: string;
  sourceNote: string;
  guides: GuideEntry[];
  categories: GuideCategory[];
  updated: string;
  totalGuides: number;
};

