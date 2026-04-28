export type MarkdownBlock =
  | {
      type: "paragraph";
      text: string;
    }
  | {
      type: "list";
      items: string[];
    }
  | {
      type: "heading";
      depth: 3 | 4;
      text: string;
      slug: string;
    }
  | {
      type: "table";
      headers: string[];
      rows: string[][];
    };

export type RuleEntry = {
  id: string;
  title: string;
  slug: string;
  blocks: MarkdownBlock[];
  text: string;
};

export type RuleSection = {
  title: string;
  slug: string;
  blocks: MarkdownBlock[];
  text: string;
};

export type RuleCategory = {
  id: string;
  title: string;
  order: number;
  updated: string;
  summary: string;
  mechanics: string[];
  related: string[];
  fileName: string;
  breath: string;
  rules: RuleEntry[];
  sections: RuleSection[];
  searchText: string;
};

export type RulebookIntro = {
  title: string;
  updated: string;
  summary: string;
  contract: string[];
  sections: RuleSection[];
};

export type RulebookData = {
  intro: RulebookIntro;
  categories: RuleCategory[];
  mechanics: string[];
  totalRules: number;
  updated: string;
};
