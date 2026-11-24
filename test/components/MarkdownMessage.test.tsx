import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import MarkdownMessage, { parseInlineMarkdown } from "~/components/ui/MarkdownMessage";

describe("MarkdownMessage Component (app/components/ui/MarkdownMessage.tsx)", () => {
    it("renders headings at appropriate levels (h1, h2, h3, h4)", () => {
        const md = `# Title\n## Subtitle\n### Section\n#### Sub-section`;
        render(<MarkdownMessage content={md} />);

        expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Title");
        expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Subtitle");
        expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent("Section");
        expect(screen.getByRole("heading", { level: 4 })).toHaveTextContent("Sub-section");
    });

    it("formats bold text and inline code within paragraphs", () => {
        const md = `Focus on **quantifiable results** and know your \`TypeScript\` types.`;
        const { container } = render(<MarkdownMessage content={md} />);

        const strongEl = container.querySelector("strong");
        expect(strongEl).not.toBeNull();
        expect(strongEl?.textContent).toBe("quantifiable results");

        const codeEl = container.querySelector("code");
        expect(codeEl).not.toBeNull();
        expect(codeEl?.textContent).toBe("TypeScript");
    });

    it("renders bullet points for both '-' and '*' syntaxes", () => {
        const md = `- First item with **bold**\n- Second item\n* Third asterisk item`;
        const { container } = render(<MarkdownMessage content={md} />);

        const listItems = container.querySelectorAll("li");
        expect(listItems.length).toBe(3);
        expect(listItems[0].textContent).toContain("First item with bold");
        expect(listItems[0].querySelector("strong")).not.toBeNull();
        expect(listItems[1].textContent).toBe("Second item");
        expect(listItems[2].textContent).toBe("Third asterisk item");
    });

    it("renders ordered numbered lists", () => {
        const md = `1. Step one\n2. Step two\n3. Step three`;
        const { container } = render(<MarkdownMessage content={md} />);

        const ol = container.querySelector("ol");
        expect(ol).not.toBeNull();
        const items = ol?.querySelectorAll("li");
        expect(items?.length).toBe(3);
        expect(items?.[0].textContent).toBe("Step one");
    });

    it("renders fenced code blocks cleanly inside pre and code tags", () => {
        const md = "```\nconst x: number = 42;\nconsole.log(x);\n```";
        const { container } = render(<MarkdownMessage content={md} />);

        const pre = container.querySelector("pre");
        expect(pre).not.toBeNull();
        expect(pre?.textContent).toContain("const x: number = 42;");
    });

    it("renders blockquotes cleanly", () => {
        const md = `> This is an important resume coaching tip.`;
        const { container } = render(<MarkdownMessage content={md} />);

        const blockquote = container.querySelector("blockquote");
        expect(blockquote).not.toBeNull();
        expect(blockquote?.textContent).toContain("This is an important resume coaching tip.");
    });

    it("safely handles raw HTML script tags without executing or creating raw DOM nodes (XSS Prevention)", () => {
        const md = `<script>alert('xss')</script> and **safe text**`;
        const { container } = render(<MarkdownMessage content={md} />);

        // Should NOT have a script tag in the rendered DOM
        expect(container.querySelector("script")).toBeNull();
        // The text is rendered as plain text
        expect(container.textContent).toContain("<script>alert('xss')</script>");
        expect(container.querySelector("strong")?.textContent).toBe("safe text");
    });

    it("handles empty or whitespace-only content without error", () => {
        const { container: c1 } = render(<MarkdownMessage content="" />);
        expect(c1.innerHTML).toBe("");

        const { container: c2 } = render(<MarkdownMessage content={"   \n\n   "} />);
        expect(c2.innerHTML).toBe("");
    });

    describe("parseInlineMarkdown() edge cases", () => {
        it("returns empty array for empty string", () => {
            expect(parseInlineMarkdown("")).toEqual([]);
        });

        it("handles unmatched asterisks as plain text without throwing", () => {
            const result = parseInlineMarkdown("3 * 5 = 15");
            expect(result).toHaveLength(1);
            expect(result[0]).toBe("3 * 5 = 15");
        });

        it("does not italicize mathematical multiplication with spaced asterisks", () => {
            const { container } = render(
                <MarkdownMessage content="The result of 2 * 3 is 6 and 4 * 5 is 20." />
            );
            expect(container.querySelector("em")).toBeNull();
            expect(container.textContent).toContain("2 * 3 is 6 and 4 * 5 is 20");
        });

        it("formats bold italic (***text***) correctly", () => {
            const { container } = render(
                <MarkdownMessage content="This is ***critically important*** advice." />
            );
            const strong = container.querySelector("strong");
            expect(strong).not.toBeNull();
            const em = strong?.querySelector("em");
            expect(em).not.toBeNull();
            expect(em?.textContent).toBe("critically important");
        });

        it("formats nested inline code inside bold (**`code`**)", () => {
            const { container } = render(
                <MarkdownMessage content="Make sure to run **`npm test`** before committing." />
            );
            const strong = container.querySelector("strong");
            expect(strong).not.toBeNull();
            const code = strong?.querySelector("code");
            expect(code).not.toBeNull();
            expect(code?.textContent).toBe("npm test");
        });

        it("renders horizontal rules (--- and ***)", () => {
            const { container } = render(
                <MarkdownMessage content={"Section 1\n\n---\n\nSection 2"} />
            );
            expect(container.querySelector("hr")).not.toBeNull();
        });

        it("renders unordered lists using '+' bullets", () => {
            const { container } = render(
                <MarkdownMessage content={"+ Plus bullet one\n+ Plus bullet two"} />
            );
            const items = container.querySelectorAll("li");
            expect(items.length).toBe(2);
            expect(items[0].textContent).toBe("Plus bullet one");
        });

        it("renders h5 and h6 headings", () => {
            render(
                <MarkdownMessage content={"##### Small heading 5\n###### Tiny heading 6"} />
            );
            expect(screen.getByRole("heading", { level: 5 })).toHaveTextContent("Small heading 5");
            expect(screen.getByRole("heading", { level: 6 })).toHaveTextContent("Tiny heading 6");
        });

        it("handles multiple inline codes and bold phrases in sequence", () => {
            const { container } = render(
                <MarkdownMessage content="Use `git commit` then **push** with `git push`." />
            );
            const codes = container.querySelectorAll("code");
            expect(codes.length).toBe(2);
            expect(codes[0].textContent).toBe("git commit");
            expect(codes[1].textContent).toBe("git push");
            expect(container.querySelector("strong")?.textContent).toBe("push");
        });
    });
});
