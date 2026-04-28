import fs from "node:fs";
import path from "node:path";
import type {
  MarkdownBlock,
  RuleCategory,
  RuleEntry,
  RuleSection,
  RulebookData,
  RulebookIntro,
} from "@/lib/server-rules-types";

type FrontmatterValue = string | string[];

const rulesDirectory = path.join(process.cwd(), "content", "server-rules");

export function getRulebookData(): RulebookData {
  const files = fs
    .readdirSync(rulesDirectory)
    .filter((fileName) => fileName.endsWith(".md"));

  const intro = parseIntro(readRuleFile("README.md"));
  const categories = files
    .filter((fileName) => fileName !== "README.md")
    .map((fileName) => parseCategory(fileName, readRuleFile(fileName)))
    .sort((a, b) => a.order - b.order);

  const mechanics = Array.from(
    new Set(categories.flatMap((category) => category.mechanics)),
  ).sort((a, b) => a.localeCompare(b));

  return {
    intro,
    categories,
    mechanics,
    totalRules: categories.reduce(
      (count, category) => count + category.rules.length,
      0,
    ),
    updated: categories.at(-1)?.updated ?? intro.updated,
  };
}

function readRuleFile(fileName: string) {
  return fs.readFileSync(path.join(rulesDirectory, fileName), "utf8");
}

function parseIntro(raw: string): RulebookIntro {
  const { frontmatter, body } = splitFrontmatter(raw);
  const lines = normalizedLines(body).filter((line) => !line.startsWith("# "));
  const contract = getSectionLines(lines, "Rulebook Contract")
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2).trim());

  return {
    title: stringValue(frontmatter.title, "Server Rules"),
    updated: stringValue(frontmatter.updated, ""),
    summary: stringValue(frontmatter.summary, ""),
    contract,
    sections: parseTopLevelSections(lines, ["Categories"]),
  };
}

function parseCategory(fileName: string, raw: string): RuleCategory {
  const { frontmatter, body } = splitFrontmatter(raw);
  const lines = normalizedLines(body).filter((line) => !line.startsWith("# "));
  const breathBlocks = parseMarkdownBlocks(getSectionLines(lines, "In One Breath"));
  const breath = blockText(breathBlocks).trim();
  const rules = parseRules(lines);
  const sections = parseTopLevelSections(lines, ["In One Breath", "Rules"]);
  const title = stringValue(frontmatter.title, titleFromFileName(fileName));
  const summary = stringValue(frontmatter.summary, "");

  return {
    id: stringValue(frontmatter.id, slugify(title)),
    title,
    order: Number(stringValue(frontmatter.order, "0")),
    updated: stringValue(frontmatter.updated, ""),
    summary,
    mechanics: arrayValue(frontmatter.mechanics),
    related: arrayValue(frontmatter.related),
    fileName,
    breath,
    rules,
    sections,
    searchText: [
      title,
      summary,
      breath,
      ...arrayValue(frontmatter.mechanics),
      ...rules.map((rule) => `${rule.id} ${rule.title} ${rule.text}`),
      ...sections.map((section) => `${section.title} ${section.text}`),
    ]
      .join(" ")
      .toLowerCase(),
  };
}

function splitFrontmatter(raw: string) {
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

function parseFrontmatter(raw: string) {
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

function parseRules(lines: string[]): RuleEntry[] {
  const rulesLines = getSectionLines(lines, "Rules");
  const rules: RuleEntry[] = [];
  let currentTitle = "";
  let currentId = "";
  let currentLines: string[] = [];

  const flushRule = () => {
    if (!currentId) {
      return;
    }

    const blocks = parseMarkdownBlocks(currentLines);
    rules.push({
      id: currentId,
      title: currentTitle,
      slug: slugify(currentId),
      blocks,
      text: blockText(blocks),
    });
  };

  for (const line of rulesLines) {
    const heading = line.match(/^###\s+([A-Z0-9]+-\d+)\s+-\s+(.+)$/);
    if (heading) {
      flushRule();
      currentId = heading[1];
      currentTitle = heading[2];
      currentLines = [];
      continue;
    }

    currentLines.push(line);
  }

  flushRule();
  return rules;
}

function parseTopLevelSections(
  lines: string[],
  excludedTitles: string[] = [],
): RuleSection[] {
  const sections: RuleSection[] = [];
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

function getSectionLines(lines: string[], title: string) {
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

function parseMarkdownBlocks(lines: string[]): MarkdownBlock[] {
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

function blockText(blocks: MarkdownBlock[]) {
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

function stripMarkdown(text: string) {
  return text
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1");
}

function normalizedLines(raw: string) {
  return raw.replace(/\r\n/g, "\n").split("\n");
}

function stringValue(value: FrontmatterValue | undefined, fallback: string) {
  if (typeof value === "string") {
    return value;
  }

  return fallback;
}

function arrayValue(value: FrontmatterValue | undefined) {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string" && value) {
    return [value];
  }

  return [];
}

function titleFromFileName(fileName: string) {
  return fileName
    .replace(/^\d+-/, "")
    .replace(/\.md$/, "")
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
