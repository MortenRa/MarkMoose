import hljs from "highlight.js";
import katex from "katex";

/* ── GFM alert icons ─────────────────────────────────────────────── */
const alertIcons = {
  NOTE: "&#8505;&#65039;",
  TIP: "&#128161;",
  IMPORTANT: "&#10071;",
  WARNING: "&#9888;&#65039;",
  CAUTION: "&#128680;",
};

/* ── markdown parser with GFM support ────────────────────────────── */
export function parseMd(md, baseDir = null) {
  // normalize line endings (Windows \r\n → \n)
  let html = md.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // frontmatter — extract YAML between --- at the very start
  let frontmatter = null;
  html = html.replace(/^---\n([\s\S]*?)\n---\n?/, (_, yaml) => {
    const entries = [];
    yaml.split("\n").forEach(line => {
      const m = line.match(/^(\w[\w\s-]*):\s*(.+)/);
      if (m) entries.push([m[1].trim(), m[2].trim()]);
    });
    if (entries.length > 0) frontmatter = entries;
    return "";
  });

  const footnotes = {};
  html = html.replace(/^\[\^(\w+)\]:\s+(.+)$/gm, (_, id, content) => {
    footnotes[id] = content;
    return "";
  });

  // LaTeX block math $$...$$ (before code blocks)
  html = html.replace(/\$\$([\s\S]*?)\$\$/g, (_, tex) => {
    try {
      return `<div class="md-math-block">${katex.renderToString(tex.trim(), { displayMode: true, throwOnError: false })}</div>`;
    } catch { return `<div class="md-math-block md-math-error">${tex}</div>`; }
  });

  // LaTeX inline math $...$ (not preceded by \ or $, not greedy across lines)
  html = html.replace(/(?<![\\$])\$([^\n$]+?)\$/g, (_, tex) => {
    try {
      return `<span class="md-math-inline">${katex.renderToString(tex.trim(), { displayMode: false, throwOnError: false })}</span>`;
    } catch { return `<span class="md-math-inline md-math-error">${tex}</span>`; }
  });

  html = html.replace(/```mermaid\n([\s\S]*?)```/g, (_, code) => {
    const encoded = encodeURIComponent(code.trim());
    return `<div class="mermaid-block" data-chart="${encoded}"></div>`;
  });

  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const trimmed = code.trimEnd();
    let highlighted;
    if (lang && hljs.getLanguage(lang)) {
      highlighted = hljs.highlight(trimmed, { language: lang }).value;
    } else if (lang) {
      try { highlighted = hljs.highlightAuto(trimmed).value; }
      catch { highlighted = trimmed.replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
    } else {
      highlighted = trimmed.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
    return `<pre class="code-block" data-lang="${lang}"><code class="hljs">${highlighted}</code></pre>`;
  });

  // inline code — escape HTML inside backticks
  html = html.replace(/`([^`]+)`/g, (_, code) => {
    const escaped = code.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return `<code class="inline-code">${escaped}</code>`;
  });

  // escape raw <tag> in text that aren't inside code blocks
  html = html.replace(/<(?!\/?(?:code|pre|div|span|a|img|ul|ol|li|table|thead|tbody|tr|th|td|hr|h[1-6]|blockquote|section|sup|em|strong|del|br|p|b|i|s)\b)([^>]+)>/g, "&lt;$1&gt;");

  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, src) => {
    let resolvedSrc = src;
    if (baseDir && !/^(https?:|file:|data:)/.test(src) && !src.startsWith("/") && !/^[A-Za-z]:/.test(src)) {
      const base = baseDir.startsWith("/") ? `file://${baseDir}` : `file:///${baseDir}`;
      resolvedSrc = `${base}/${src}`;
    }
    return `<img alt="${alt}" src="${resolvedSrc}" style="max-width:100%;border-radius:6px;margin:12px 0" />`;
  });
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="md-link">$1</a>');

  const makeHeading = (tag, text) => {
    const cleanId = text.replace(/<[^>]+>/g, "").replace(/&[^;]+;/g, "").replace(/[^\w\s-]/g, "").trim();
    return `<${tag} id="${cleanId}">${text}</${tag}>`;
  };
  html = html.replace(/^######\s+(.+)$/gm, (_, t) => makeHeading("h6", t));
  html = html.replace(/^#####\s+(.+)$/gm, (_, t) => makeHeading("h5", t));
  html = html.replace(/^####\s+(.+)$/gm, (_, t) => makeHeading("h4", t));
  html = html.replace(/^###\s+(.+)$/gm, (_, t) => makeHeading("h3", t));
  html = html.replace(/^##\s+(.+)$/gm, (_, t) => makeHeading("h2", t));
  html = html.replace(/^#\s+(.+)$/gm, (_, t) => makeHeading("h1", t));

  html = html.replace(/^(-{3,}|\*{3,}|_{3,})$/gm, '<hr class="md-hr" />');

  html = html.replace(/^>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*\n((?:>.*\n?)*)/gm, (_, type, body) => {
    const content = body.replace(/^>\s?/gm, "").trim();
    const icon = alertIcons[type] || "";
    return `<div class="md-alert md-alert-${type.toLowerCase()}"><span class="md-alert-title">${icon} ${type}</span><p class="md-alert-body">${content}</p></div>`;
  });

  html = html.replace(/^>\s+(.+)$/gm, '<blockquote class="md-quote">$1</blockquote>');

  html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.replace(/~~(.+?)~~/g, "<del>$1</del>");

  html = html.replace(/^(\s*)- \[x\]\s+(.+)$/gm, '$1<div class="task done">&#9745; $2</div>');
  html = html.replace(/^(\s*)- \[ \]\s+(.+)$/gm, '$1<div class="task">&#9744; $2</div>');

  html = html.replace(/^\s*[-*+]\s+(.+)$/gm, '<li class="md-li">$1</li>');
  html = html.replace(/((?:<li class="md-li">.*<\/li>\n?)+)/g, '<ul class="md-ul">$1</ul>');

  html = html.replace(/^\s*\d+\.\s+(.+)$/gm, '<li class="md-oli">$1</li>');
  html = html.replace(/((?:<li class="md-oli">.*<\/li>\n?)+)/g, '<ol class="md-ol">$1</ol>');

  html = html.replace(/^(\|.+\|)\n\|[-| :]+\|\n((?:\|.+\|\n?)*)/gm, (_, header, body) => {
    const thCells = header.split("|").filter(c => c.trim()).map(c => `<th>${c.trim()}</th>`).join("");
    const rows = body.trim().split("\n").map(row => {
      const cells = row.split("|").filter(c => c.trim()).map(c => `<td>${c.trim()}</td>`).join("");
      return `<tr>${cells}</tr>`;
    }).join("");
    return `<table class="md-table"><thead><tr>${thCells}</tr></thead><tbody>${rows}</tbody></table>`;
  });

  html = html.replace(/\[\^(\w+)\]/g, (_, id) => {
    if (footnotes[id]) return `<sup class="md-fnref"><a href="#fn-${id}" id="fnref-${id}">[${id}]</a></sup>`;
    return `[^${id}]`;
  });

  html = html.split("\n").map(line => {
    const trimmed = line.trim();
    if (!trimmed) return "";
    if (/^<(h[1-6]|ul|ol|li|pre|blockquote|hr|div|table|thead|tbody|tr|th|td|img|section|sup)/.test(trimmed)) return line;
    return `<p>${trimmed}</p>`;
  }).join("\n");

  const fnIds = Object.keys(footnotes);
  if (fnIds.length > 0) {
    html += '\n<hr class="md-hr" />\n<section class="md-footnotes"><ol class="md-ol">';
    fnIds.forEach(id => {
      html += `<li id="fn-${id}" class="md-oli">${footnotes[id]} <a href="#fnref-${id}" class="md-link">&#8617;</a></li>`;
    });
    html += "</ol></section>";
  }

  if (frontmatter) {
    const rows = frontmatter.map(([k, v]) => `<tr><td><strong>${k}</strong></td><td>${v}</td></tr>`).join("");
    html = `<div class="md-frontmatter"><table class="md-table"><tbody>${rows}</tbody></table></div>` + html;
  }

  return html;
}

/* ── extract headings for TOC ─────────────────────────────────────── */
export function extractHeadings(md) {
  const headings = [];
  const lines = md.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  let inCode = false;
  for (const line of lines) {
    if (line.trim().startsWith("```")) { inCode = !inCode; continue; }
    if (inCode) continue;
    const m = line.match(/^(#{1,6})\s+(.+)$/);
    if (m) headings.push({ level: m[1].length, text: m[2] });
  }
  return headings;
}
