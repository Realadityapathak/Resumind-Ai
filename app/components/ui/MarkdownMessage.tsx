import React, { type FC, type ReactNode } from "react";

export interface MarkdownMessageProps {
  content: string;
  className?: string;
}

/**
 * Parses inline markdown: bold-italic (***text***), bold (**text**), inline code (`code`), and italic (*text*).
 * Safely constructs React elements without dangerouslySetInnerHTML.
 */
export function parseInlineMarkdown(text: string): ReactNode[] {
  if (!text) return [];

  // Match `code`, ***bold-italic***, **bold**, or *italic*
  const tokenRegex = /(`[^`\n]+`|\*\*\*(?!\s)[^*\n]+?(?<!\s)\*\*\*|\*\*(?!\s)[^*\n]+?(?<!\s)\*\*|\*(?!\s|\*)[^*\n]+?(?<!\s|\*)\*)/g;
  const parts = text.split(tokenRegex);

  return parts.map((part, index) => {
    if (!part) return null;

    if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
      return (
        <code
          key={index}
          className="rounded-[2px] border border-rule bg-surface-2 px-1 py-0.5 font-mono text-[11px] text-cobalt"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    if (part.startsWith("***") && part.endsWith("***") && part.length >= 6) {
      return (
        <strong key={index} className="font-semibold text-ink">
          <em className="italic text-ink-2">
            {parseInlineMarkdown(part.slice(3, -3))}
          </em>
        </strong>
      );
    }

    if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
      return (
        <strong key={index} className="font-semibold text-ink">
          {parseInlineMarkdown(part.slice(2, -2))}
        </strong>
      );
    }

    if (part.startsWith("*") && part.endsWith("*") && part.length >= 2) {
      return (
        <em key={index} className="italic text-ink-2">
          {parseInlineMarkdown(part.slice(1, -1))}
        </em>
      );
    }

    return part;
  });
}

/**
 * Lightweight, zero-dependency Markdown renderer for Copilot messages.
 * Directly outputs React elements, guaranteeing zero XSS vulnerability.
 */
export const MarkdownMessage: FC<MarkdownMessageProps> = ({ content, className = "" }) => {
  if (!content || !content.trim()) return null;

  const lines = content.split("\n");
  const elements: ReactNode[] = [];

  let inCodeBlock = false;
  let codeBlockLines: string[] = [];
  let currentListItems: ReactNode[] = [];
  let currentListType: "bullet" | "number" | null = null;
  let currentParagraphLines: string[] = [];

  const flushParagraph = (key: string) => {
    if (currentParagraphLines.length > 0) {
      const paragraphText = currentParagraphLines.join(" ");
      elements.push(
        <p key={key} className="my-1.5 leading-relaxed text-inherit">
          {parseInlineMarkdown(paragraphText)}
        </p>
      );
      currentParagraphLines = [];
    }
  };

  const flushList = (key: string) => {
    if (currentListItems.length > 0 && currentListType) {
      if (currentListType === "bullet") {
        elements.push(
          <ul key={key} className="my-1.5 ml-4 list-disc space-y-1 text-inherit">
            {currentListItems}
          </ul>
        );
      } else {
        elements.push(
          <ol key={key} className="my-1.5 ml-4 list-decimal space-y-1 text-inherit">
            {currentListItems}
          </ol>
        );
      }
      currentListItems = [];
      currentListType = null;
    }
  };

  lines.forEach((rawLine, lineIndex) => {
    const trimmed = rawLine.trim();

    // 1. Code block fence
    if (trimmed.startsWith("```")) {
      flushParagraph(`p-before-code-${lineIndex}`);
      flushList(`l-before-code-${lineIndex}`);

      if (inCodeBlock) {
        // End of code block
        elements.push(
          <pre
            key={`code-block-${lineIndex}`}
            className="my-2 overflow-x-auto rounded-[2px] border border-rule bg-surface-2 p-2.5 font-mono text-[11px] text-ink-2 leading-relaxed"
          >
            <code>{codeBlockLines.join("\n")}</code>
          </pre>
        );
        codeBlockLines = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      return;
    }

    if (inCodeBlock) {
      codeBlockLines.push(rawLine);
      return;
    }

    // 2. Empty line
    if (!trimmed) {
      flushParagraph(`p-${lineIndex}`);
      flushList(`l-${lineIndex}`);
      return;
    }

    // 3. Horizontal rule: "---", "***", "___"
    if (trimmed === "---" || trimmed === "***" || trimmed === "___") {
      flushParagraph(`p-before-hr-${lineIndex}`);
      flushList(`l-before-hr-${lineIndex}`);
      elements.push(<hr key={`hr-${lineIndex}`} className="my-2.5 border-t border-rule" />);
      return;
    }

    // 4. Headings: #, ##, ###, ####, #####, ######
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      flushParagraph(`p-before-h-${lineIndex}`);
      flushList(`l-before-h-${lineIndex}`);

      const level = headingMatch[1].length;
      const headingText = headingMatch[2];

      if (level === 1) {
        elements.push(
          <h1 key={`h1-${lineIndex}`} className="mt-3 mb-1.5 text-[14px] font-bold text-ink tracking-tight">
            {parseInlineMarkdown(headingText)}
          </h1>
        );
      } else if (level === 2) {
        elements.push(
          <h2 key={`h2-${lineIndex}`} className="mt-2.5 mb-1 text-[13px] font-semibold text-ink tracking-tight">
            {parseInlineMarkdown(headingText)}
          </h2>
        );
      } else if (level === 3) {
        elements.push(
          <h3 key={`h3-${lineIndex}`} className="mt-2 mb-1 text-[12px] font-semibold text-ink">
            {parseInlineMarkdown(headingText)}
          </h3>
        );
      } else if (level === 4) {
        elements.push(
          <h4 key={`h4-${lineIndex}`} className="mt-1.5 mb-0.5 text-[11.5px] font-semibold text-ink">
            {parseInlineMarkdown(headingText)}
          </h4>
        );
      } else if (level === 5) {
        elements.push(
          <h5 key={`h5-${lineIndex}`} className="mt-1.5 mb-0.5 text-[11px] font-semibold text-ink-2">
            {parseInlineMarkdown(headingText)}
          </h5>
        );
      } else {
        elements.push(
          <h6 key={`h6-${lineIndex}`} className="mt-1 mb-0.5 text-[10.5px] font-semibold text-ink-3">
            {parseInlineMarkdown(headingText)}
          </h6>
        );
      }
      return;
    }

    // 5. Bullet list items: "- ", "* ", or "+ "
    const bulletMatch = trimmed.match(/^[-*+]\s+(.*)$/);
    if (bulletMatch) {
      flushParagraph(`p-before-b-${lineIndex}`);
      if (currentListType && currentListType !== "bullet") {
        flushList(`l-switch-${lineIndex}`);
      }
      currentListType = "bullet";
      currentListItems.push(
        <li key={`li-${lineIndex}`} className="text-[11.5px] leading-relaxed">
          {parseInlineMarkdown(bulletMatch[1])}
        </li>
      );
      return;
    }

    // 6. Numbered list items: "1. ", "2. "
    const numberMatch = trimmed.match(/^\d+\.\s+(.*)$/);
    if (numberMatch) {
      flushParagraph(`p-before-num-${lineIndex}`);
      if (currentListType && currentListType !== "number") {
        flushList(`l-switch-${lineIndex}`);
      }
      currentListType = "number";
      currentListItems.push(
        <li key={`li-num-${lineIndex}`} className="text-[11.5px] leading-relaxed">
          {parseInlineMarkdown(numberMatch[1])}
        </li>
      );
      return;
    }

    // 7. Blockquote: ">" or "> "
    if (trimmed.startsWith(">")) {
      flushParagraph(`p-before-quote-${lineIndex}`);
      flushList(`l-before-quote-${lineIndex}`);
      const quoteText = trimmed.startsWith("> ") ? trimmed.slice(2) : trimmed.slice(1);
      elements.push(
        <blockquote
          key={`quote-${lineIndex}`}
          className="my-1.5 border-l-2 border-cobalt pl-2.5 italic text-ink-3 text-[11.5px]"
        >
          {parseInlineMarkdown(quoteText)}
        </blockquote>
      );
      return;
    }

    // 8. Regular paragraph line
    flushList(`l-before-text-${lineIndex}`);
    currentParagraphLines.push(trimmed);
  });

  // Flush remaining blocks
  flushParagraph("p-final");
  flushList("l-final");
  if (inCodeBlock && codeBlockLines.length > 0) {
    elements.push(
      <pre
        key="code-block-final"
        className="my-2 overflow-x-auto rounded-[2px] border border-rule bg-surface-2 p-2.5 font-mono text-[11px] text-ink-2"
      >
        <code>{codeBlockLines.join("\n")}</code>
      </pre>
    );
  }

  return <div className={`markdown-content ${className}`}>{elements}</div>;
};

export default MarkdownMessage;
