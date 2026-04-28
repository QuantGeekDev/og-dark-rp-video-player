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

