import type { MarkdownBlock } from "@/lib/markdown-types";

export type FrontmatterValue = string | string[];

export type MarkdownSection = {
  title: string;
  slug: string;
  blocks: MarkdownBlock[];
  text: string;
};

export function splitFrontmatter(raw: string) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) {
    return {
      frontmatter: {} as Record<string, FrontmatterValue>,
      body: raw,
    };
  }

  return {
    frontmatter: parseFrontmatter(match[1]),
    body: raw.slice(match[0].length),
  };
}

export function parseFrontmatter(raw: string) {
  const metadata: Record<string, FrontmatterValue> = {};
  let activeListKey: string | null = null;

  for (const line of normalizedLines(raw)) {
    const listMatch = line.match(/^\s+-\s+(.+)$/);
    if (listMatch && activeListKey) {
      const list = metadata[activeListKey];
      metadata[activeListKey] = [
        ...(Array.isArray(list) ? list : []),
        listMatch[1].trim(),
      ];
      continue;
    }

    const keyMatch = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!keyMatch) {
      continue;
    }

    const [, key, value] = keyMatch;
    activeListKey = value ? null : key;
    metadata[key] = value ? value.trim().replace(/^"|"$/g, "") : [];
  }

  return metadata;
}

export function parseMarkdownBlocks(lines: string[]): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (!line.trim()) {
      index++;
      continue;
    }

    const heading = line.match(/^(#{3,4})\s+(.+)$/);
    if (heading) {
      const depth = heading[1].length as 3 | 4;
      const text = heading[2].trim();
      blocks.push({ type: "heading", depth, text, slug: slugify(text) });
      index++;
      continue;
    }

    if (isTableStart(lines, index)) {
      const tableLines = [line, lines[index + 1]];
      index += 2;

      while (index < lines.length && lines[index].trim().startsWith("|")) {
        tableLines.push(lines[index]);
        index++;
      }

      blocks.push({
        type: "table",
        headers: splitTableRow(tableLines[0]),
        rows: tableLines.slice(2).map(splitTableRow),
      });
      continue;
    }

    if (isListLine(line)) {
      const items: string[] = [];
      while (index < lines.length && isListLine(lines[index])) {
        items.push(lines[index].replace(/^(\s*[-*]|\s*\d+\.)\s+/, "").trim());
        index++;
      }

      blocks.push({ type: "list", items });
      continue;
    }

    const paragraph: string[] = [];
    while (
      index < lines.length &&
      lines[index].trim() &&
      !lines[index].match(/^(#{2,4})\s+/) &&
      !isListLine(lines[index]) &&
      !isTableStart(lines, index)
    ) {
      paragraph.push(lines[index].trim());
      index++;
    }

    blocks.push({ type: "paragraph", text: paragraph.join(" ") });
  }

  return blocks;
}

export function parseTopLevelSections(
  lines: string[],
  excludedTitles: string[] = [],
): MarkdownSection[] {
  const sections: MarkdownSection[] = [];
  let currentTitle = "";
  let currentLines: string[] = [];
  const excluded = new Set(excludedTitles.map((title) => title.toLowerCase()));

  const flushSection = () => {
    if (!currentTitle || excluded.has(currentTitle.toLowerCase())) {
      return;
    }

    const blocks = parseMarkdownBlocks(currentLines);
    sections.push({
      title: currentTitle,
      slug: slugify(currentTitle),
      blocks,
      text: blockText(blocks),
    });
  };

  for (const line of lines) {
    const heading = line.match(/^##\s+(.+)$/);
    if (heading) {
      flushSection();
      currentTitle = heading[1].trim();
      currentLines = [];
      continue;
    }

    currentLines.push(line);
  }

  flushSection();
  return sections;
}

export function getSectionLines(lines: string[], title: string) {
  const sectionStart = lines.findIndex(
    (line) => line.trim().toLowerCase() === `## ${title.toLowerCase()}`,
  );

  if (sectionStart === -1) {
    return [];
  }

  const sectionLines: string[] = [];
  for (const line of lines.slice(sectionStart + 1)) {
    if (line.startsWith("## ")) {
      break;
    }

    sectionLines.push(line);
  }

  return sectionLines;
}

export function blockText(blocks: MarkdownBlock[]) {
  return blocks
    .map((block) => {
      if (block.type === "paragraph") return stripMarkdown(block.text);
      if (block.type === "list") return block.items.map(stripMarkdown).join(" ");
      if (block.type === "heading") return block.text;
      return [
        ...block.headers.map(stripMarkdown),
        ...block.rows.flat().map(stripMarkdown),
      ].join(" ");
    })
    .join(" ");
}

export function stripMarkdown(text: string) {
  return text
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1");
}

export function normalizedLines(raw: string) {
  return raw.replace(/\r\n/g, "\n").split("\n");
}

export function stringValue(
  value: FrontmatterValue | undefined,
  fallback: string,
) {
  if (typeof value === "string") {
    return value;
  }

  return fallback;
}

export function arrayValue(value: FrontmatterValue | undefined) {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string" && value) {
    return [value];
  }

  return [];
}

export function titleFromFileName(fileName: string) {
  return fileName
    .replace(/^\d+-/, "")
    .replace(/\.md$/, "")
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isListLine(line: string) {
  return /^(\s*[-*]|\s*\d+\.)\s+/.test(line);
}

function isTableStart(lines: string[], index: number) {
  return (
    lines[index]?.trim().startsWith("|") &&
    /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(
      lines[index + 1]?.trim() ?? "",
    )
  );
}

function splitTableRow(line: string) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

