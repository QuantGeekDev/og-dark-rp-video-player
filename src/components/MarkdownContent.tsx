import type { MarkdownBlock } from "@/lib/markdown-types";

type MarkdownBlocksProps = {
  blocks: MarkdownBlock[];
  paragraphClassName?: string;
  listTextClassName?: string;
  listMarkerClassName?: string;
  headingClassName?: string;
};

export function MarkdownBlocks({
  blocks,
  paragraphClassName = "text-base font-medium leading-8 text-white/68",
  listTextClassName = "text-base font-medium leading-7 text-white/68",
  listMarkerClassName = "mt-2.5 h-2 w-2 shrink-0 bg-[#72f1b8]",
  headingClassName = "pt-2 text-lg font-black uppercase tracking-[0.04em] text-[#ffd166]",
}: MarkdownBlocksProps) {
  return (
    <>
      {blocks.map((block, index) => {
        if (block.type === "paragraph") {
          return (
            <p key={index} className={paragraphClassName}>
              <InlineText text={block.text} />
            </p>
          );
        }

        if (block.type === "list") {
          return (
            <ul key={index} className="grid gap-2">
              {block.items.map((item) => (
                <li key={item} className={`flex gap-3 ${listTextClassName}`}>
                  <span className={listMarkerClassName} />
                  <span>
                    <InlineText text={item} />
                  </span>
                </li>
              ))}
            </ul>
          );
        }

        if (block.type === "heading") {
          return (
            <h4 key={index} className={headingClassName}>
              {block.text}
            </h4>
          );
        }

        return (
          <div key={index} className="overflow-x-auto border border-white/10">
            <table className="w-full min-w-[44rem] border-collapse text-left">
              <thead className="bg-white/[0.06] text-xs font-black uppercase tracking-[0.14em] text-white/58">
                <tr>
                  {block.headers.map((header) => (
                    <th
                      key={header}
                      className="border-b border-white/10 px-3 py-3"
                    >
                      <InlineText text={header} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, rowIndex) => (
                  <tr
                    key={rowIndex}
                    className="border-b border-white/8 last:border-0"
                  >
                    {row.map((cell, cellIndex) => (
                      <td
                        key={`${rowIndex}-${cellIndex}`}
                        className="px-3 py-3 text-sm font-medium leading-6 text-white/68"
                      >
                        <InlineText text={cell} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </>
  );
}

function InlineText({ text }: { text: string }) {
  const parts = parseInline(text);

  return (
    <>
      {parts.map((part, index) => {
        if (part.type === "code") {
          return (
            <code
              key={index}
              className="border border-white/10 bg-black/35 px-1.5 py-0.5 text-[0.92em] font-bold text-[#ffd166]"
            >
              {part.text}
            </code>
          );
        }

        if (part.type === "link") {
          return (
            <a
              key={index}
              href={part.href}
              target={part.href.startsWith("http") ? "_blank" : undefined}
              rel={part.href.startsWith("http") ? "noreferrer" : undefined}
              className="font-bold text-[#9bbcff] underline decoration-[#9bbcff]/35 underline-offset-4 transition hover:text-white"
            >
              {part.text}
            </a>
          );
        }

        if (part.type === "strong") {
          return (
            <strong key={index} className="font-black text-white">
              {part.text}
            </strong>
          );
        }

        return <span key={index}>{part.text}</span>;
      })}
    </>
  );
}

function parseInline(text: string) {
  const parts: Array<
    | { type: "text"; text: string }
    | { type: "code"; text: string }
    | { type: "link"; text: string; href: string }
    | { type: "strong"; text: string }
  > = [];
  const pattern = /(`[^`]+`|\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text))) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", text: text.slice(lastIndex, match.index) });
    }

    const token = match[0];
    const link = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      parts.push({ type: "link", text: link[1], href: link[2] });
    } else if (token.startsWith("**")) {
      parts.push({ type: "strong", text: token.slice(2, -2) });
    } else {
      parts.push({ type: "code", text: token.slice(1, -1) });
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: "text", text: text.slice(lastIndex) });
  }

  return parts;
}

