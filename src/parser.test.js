import { describe, it, expect } from "vitest";
import { parseMd, extractHeadings } from "./parser.js";

describe("parseMd", () => {
  describe("line ending normalization", () => {
    it("normalizes \\r\\n to \\n", () => {
      const result = parseMd("# Hello\r\n\r\nWorld");
      expect(result).toContain("<h1");
      expect(result).toContain("Hello");
      expect(result).not.toContain("\r");
    });

    it("normalizes standalone \\r to \\n", () => {
      const result = parseMd("# Hello\r\rWorld");
      expect(result).toContain("<h1");
    });
  });

  describe("headings", () => {
    it("renders H1", () => {
      expect(parseMd("# Title")).toContain("<h1");
      expect(parseMd("# Title")).toContain("Title</h1>");
    });

    it("renders H2", () => {
      expect(parseMd("## Subtitle")).toContain("<h2");
    });

    it("renders H3 through H6", () => {
      expect(parseMd("### H3")).toContain("<h3");
      expect(parseMd("#### H4")).toContain("<h4");
      expect(parseMd("##### H5")).toContain("<h5");
      expect(parseMd("###### H6")).toContain("<h6");
    });

    it("generates clean IDs from heading text", () => {
      const result = parseMd("## Hello World");
      expect(result).toContain('id="Hello World"');
    });

    it("strips HTML from heading IDs", () => {
      const result = parseMd("## `code` in heading");
      // ID should contain only clean text, no HTML tags or entities
      const idMatch = result.match(/id="([^"]*)"/);
      expect(idMatch).toBeTruthy();
      expect(idMatch[1]).not.toContain("<");
      expect(idMatch[1]).not.toContain("&");
      expect(idMatch[1]).toBe("code in heading");
    });
  });

  describe("inline formatting", () => {
    it("renders bold", () => {
      expect(parseMd("**bold**")).toContain("<strong>bold</strong>");
    });

    it("renders italic", () => {
      expect(parseMd("*italic*")).toContain("<em>italic</em>");
    });

    it("renders bold italic", () => {
      const result = parseMd("***both***");
      expect(result).toContain("<strong><em>both</em></strong>");
    });

    it("renders strikethrough", () => {
      expect(parseMd("~~strike~~")).toContain("<del>strike</del>");
    });
  });

  describe("links and images", () => {
    it("renders links with target and rel", () => {
      const result = parseMd("[Click](https://example.com)");
      expect(result).toContain('href="https://example.com"');
      expect(result).toContain('target="_blank"');
      expect(result).toContain('rel="noopener"');
      expect(result).toContain("Click</a>");
    });

    it("renders images", () => {
      const result = parseMd("![alt text](image.png)");
      expect(result).toContain('src="image.png"');
      expect(result).toContain('alt="alt text"');
      expect(result).toContain("<img");
    });
  });

  describe("code blocks", () => {
    it("renders fenced code blocks with language", () => {
      const result = parseMd("```javascript\nconst x = 1;\n```");
      expect(result).toContain('data-lang="javascript"');
      expect(result).toContain("code-block");
      expect(result).toContain("hljs");
    });

    it("renders fenced code blocks without language", () => {
      const result = parseMd("```\nplain text\n```");
      expect(result).toContain("code-block");
      expect(result).toContain("plain text");
    });

    it("escapes HTML in code blocks without language", () => {
      const result = parseMd("```\n<div>test</div>\n```");
      expect(result).toContain("&lt;div&gt;");
    });

    it("renders mermaid blocks as mermaid-block divs", () => {
      const result = parseMd("```mermaid\ngraph LR\n  A --> B\n```");
      expect(result).toContain('class="mermaid-block"');
      expect(result).toContain("data-chart");
    });
  });

  describe("inline code", () => {
    it("renders inline code", () => {
      expect(parseMd("`code`")).toContain('class="inline-code"');
      expect(parseMd("`code`")).toContain("code</code>");
    });

    it("escapes HTML inside inline code", () => {
      const result = parseMd("`<div>`");
      expect(result).toContain("&lt;div&gt;");
    });
  });

  describe("HTML escaping", () => {
    it("escapes raw XML tags like <summary>", () => {
      const result = parseMd("Use <summary> tag");
      expect(result).toContain("&lt;summary&gt;");
    });

    it("does not escape known HTML tags", () => {
      const result = parseMd("<strong>bold</strong>");
      expect(result).not.toContain("&lt;strong&gt;");
    });
  });

  describe("lists", () => {
    it("renders unordered lists", () => {
      const result = parseMd("- item 1\n- item 2");
      expect(result).toContain('class="md-ul"');
      expect(result).toContain('class="md-li"');
    });

    it("renders ordered lists", () => {
      const result = parseMd("1. first\n2. second");
      expect(result).toContain('class="md-ol"');
      expect(result).toContain('class="md-oli"');
    });

    it("renders task lists - checked", () => {
      const result = parseMd("- [x] done");
      expect(result).toContain('class="task done"');
    });

    it("renders task lists - unchecked", () => {
      const result = parseMd("- [ ] todo");
      expect(result).toContain('class="task"');
      expect(result).not.toContain('class="task done"');
    });
  });

  describe("blockquotes", () => {
    it("renders blockquotes", () => {
      const result = parseMd("> quoted text");
      expect(result).toContain('class="md-quote"');
      expect(result).toContain("quoted text");
    });
  });

  describe("horizontal rules", () => {
    it("renders --- as hr", () => {
      expect(parseMd("---")).toContain('class="md-hr"');
    });

    it("renders *** as hr", () => {
      expect(parseMd("***")).toContain('class="md-hr"');
    });

    it("renders ___ as hr", () => {
      expect(parseMd("___")).toContain('class="md-hr"');
    });
  });

  describe("tables", () => {
    it("renders tables with thead and tbody", () => {
      const result = parseMd("| A | B |\n| --- | --- |\n| 1 | 2 |");
      expect(result).toContain('class="md-table"');
      expect(result).toContain("<thead>");
      expect(result).toContain("<tbody>");
      expect(result).toContain("<th>A</th>");
      expect(result).toContain("<td>1</td>");
    });
  });

  describe("GFM alerts", () => {
    it("renders NOTE alert", () => {
      const result = parseMd("> [!NOTE]\n> This is a note.");
      expect(result).toContain('class="md-alert md-alert-note"');
      expect(result).toContain("NOTE");
    });

    it("renders TIP alert", () => {
      const result = parseMd("> [!TIP]\n> This is a tip.");
      expect(result).toContain("md-alert-tip");
    });

    it("renders WARNING alert", () => {
      const result = parseMd("> [!WARNING]\n> Be careful.");
      expect(result).toContain("md-alert-warning");
    });

    it("renders IMPORTANT alert", () => {
      const result = parseMd("> [!IMPORTANT]\n> Read this.");
      expect(result).toContain("md-alert-important");
    });

    it("renders CAUTION alert", () => {
      const result = parseMd("> [!CAUTION]\n> Danger zone.");
      expect(result).toContain("md-alert-caution");
    });
  });

  describe("footnotes", () => {
    it("renders footnote references as superscript links", () => {
      const result = parseMd("Text[^1]\n\n[^1]: Footnote content");
      expect(result).toContain('class="md-fnref"');
      expect(result).toContain('href="#fn-1"');
    });

    it("renders footnote definitions at the bottom", () => {
      const result = parseMd("Text[^1]\n\n[^1]: Footnote content");
      expect(result).toContain('class="md-footnotes"');
      expect(result).toContain("Footnote content");
    });

    it("renders back-links in footnotes", () => {
      const result = parseMd("Text[^1]\n\n[^1]: Footnote content");
      expect(result).toContain('href="#fnref-1"');
    });
  });

  describe("frontmatter", () => {
    it("renders YAML frontmatter as a table", () => {
      const result = parseMd("---\ntitle: Hello\nauthor: Test\n---\n\n# Content");
      expect(result).toContain('class="md-frontmatter"');
      expect(result).toContain("title");
      expect(result).toContain("Hello");
      expect(result).toContain("author");
      expect(result).toContain("Test");
    });

    it("removes frontmatter from body", () => {
      const result = parseMd("---\ntitle: Hello\n---\n\n# Content");
      expect(result).not.toMatch(/<p>---<\/p>/);
    });

    it("handles frontmatter with Windows line endings", () => {
      const result = parseMd("---\r\ntitle: Hello\r\n---\r\n\r\n# Content");
      expect(result).toContain('class="md-frontmatter"');
      expect(result).toContain("Hello");
    });
  });

  describe("LaTeX math", () => {
    it("renders inline math with $", () => {
      const result = parseMd("Equation: $E = mc^2$");
      expect(result).toContain('class="md-math-inline"');
    });

    it("renders block math with $$", () => {
      const result = parseMd("$$\nx^2 + y^2 = z^2\n$$");
      expect(result).toContain('class="md-math-block"');
    });

    it("does not match single $ in non-math contexts", () => {
      const result = parseMd("Price is $50");
      expect(result).not.toContain("md-math");
    });
  });

  describe("paragraphs", () => {
    it("wraps plain text in <p> tags", () => {
      expect(parseMd("Hello world")).toContain("<p>Hello world</p>");
    });

    it("does not wrap block elements in <p> tags", () => {
      const result = parseMd("# Heading");
      expect(result).not.toContain("<p><h1");
    });

    it("handles empty lines", () => {
      const result = parseMd("Line 1\n\nLine 2");
      expect(result).toContain("<p>Line 1</p>");
      expect(result).toContain("<p>Line 2</p>");
    });
  });

  describe("edge cases", () => {
    it("handles empty string", () => {
      expect(parseMd("")).toBe("");
    });

    it("handles whitespace only", () => {
      const result = parseMd("   \n  \n   ");
      expect(result).not.toContain("undefined");
    });

    it("handles mixed content", () => {
      const md = "# Title\n\nSome **bold** and *italic* text.\n\n- list item\n\n```js\ncode()\n```";
      const result = parseMd(md);
      expect(result).toContain("<h1");
      expect(result).toContain("<strong>bold</strong>");
      expect(result).toContain("<em>italic</em>");
      expect(result).toContain('class="md-li"');
      expect(result).toContain('data-lang="js"');
    });
  });
});

describe("extractHeadings", () => {
  it("extracts H1 and H2", () => {
    const headings = extractHeadings("# Title\n\n## Section");
    expect(headings).toEqual([
      { level: 1, text: "Title" },
      { level: 2, text: "Section" },
    ]);
  });

  it("extracts all 6 levels", () => {
    const md = "# H1\n## H2\n### H3\n#### H4\n##### H5\n###### H6";
    const headings = extractHeadings(md);
    expect(headings).toHaveLength(6);
    expect(headings[0].level).toBe(1);
    expect(headings[5].level).toBe(6);
  });

  it("ignores headings inside code blocks", () => {
    const md = "# Real\n```\n# Not a heading\n```\n## Also Real";
    const headings = extractHeadings(md);
    expect(headings).toHaveLength(2);
    expect(headings[0].text).toBe("Real");
    expect(headings[1].text).toBe("Also Real");
  });

  it("handles Windows line endings", () => {
    const headings = extractHeadings("# Title\r\n## Section\r\n");
    expect(headings).toHaveLength(2);
  });

  it("returns empty array for no headings", () => {
    expect(extractHeadings("Just some text")).toEqual([]);
  });

  it("extracts headings from mixed content", () => {
    const md = "Some text\n## Heading\n- list\n### Sub\nMore text";
    const headings = extractHeadings(md);
    expect(headings).toEqual([
      { level: 2, text: "Heading" },
      { level: 3, text: "Sub" },
    ]);
  });
});
