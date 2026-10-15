import type { ReactNode } from "react";

type Block =
  | { kind: "code"; text: string }
  | { kind: "list"; ordered: boolean; items: string[] }
  | { kind: "paragraph"; lines: string[] };

const BULLET = /^\s*[-*]\s+/;
const NUMBERED = /^\s*\d+[.)]\s+/;

/**
 * Splits a task prompt into fenced code blocks, lists and paragraphs: the small
 * Markdown subset the pipeline writes. Unclosed fences run to the end.
 */
function parsePrompt(text: string): Block[] {
  const blocks: Block[] = [];
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith("```")) {
      const code: string[] = [];
      for (i++; i < lines.length && !lines[i].trim().startsWith("```"); i++) code.push(lines[i]);
      blocks.push({ kind: "code", text: code.join("\n") });
    } else if (BULLET.test(line) || NUMBERED.test(line)) {
      const ordered = NUMBERED.test(line);
      const marker = ordered ? NUMBERED : BULLET;
      const items: string[] = [];
      for (; i < lines.length && marker.test(lines[i]); i++) items.push(lines[i].replace(marker, ""));
      i--;
      blocks.push({ kind: "list", ordered, items });
    } else if (line.trim() === "") {
      continue;
    } else {
      const last = blocks.at(-1);
      // Consecutive text lines form one paragraph, keeping their line breaks.
      if (last?.kind === "paragraph" && lines[i - 1]?.trim() !== "") last.lines.push(line);
      else blocks.push({ kind: "paragraph", lines: [line] });
    }
  }
  return blocks;
}

/** `code` and **bold** inside a line. */
function inline(text: string): ReactNode[] {
  return text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).map((part, i) => {
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) return <code key={i}>{part.slice(1, -1)}</code>;
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) return <strong key={i}>{part.slice(2, -2)}</strong>;
    return part;
  });
}

/** Renders a coding task prompt (plain text with light Markdown) as React elements, never as HTML. */
export default function PromptText({ text, className = "coding-prompt" }: { text: string; className?: string }) {
  return (
    <div className={className}>
      {parsePrompt(text).map((block, i) => {
        if (block.kind === "code") {
          return (
            <pre key={i}>
              <code>{block.text}</code>
            </pre>
          );
        }
        if (block.kind === "list") {
          const List = block.ordered ? "ol" : "ul";
          return (
            <List key={i}>
              {block.items.map((item, j) => (
                <li key={j}>{inline(item)}</li>
              ))}
            </List>
          );
        }
        return (
          <p key={i}>
            {block.lines.map((line, j) => (
              <span key={j}>
                {j > 0 && <br />}
                {inline(line)}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}
