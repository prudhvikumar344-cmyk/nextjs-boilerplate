// Tiny, dependency-free blog engine.
//
// Posts live as plain .md files in /content/blog, one file per post, each
// starting with a small "front matter" header (key: value lines between
// --- markers) followed by the post body in a very small Markdown subset.
//
// This is hand-rolled on purpose: the site is edited directly through
// GitHub's web file editor (no local `npm install`, no lockfile), so
// pulling in gray-matter/remark/marked would mean hoping their exact
// versions resolve correctly on Vercel's next build with zero way to test
// it first. A ~150-line parser we fully control is a safer trade for that
// workflow, and easily covers what a travel blog post actually needs:
// headings, paragraphs, bold/italic, links, images, lists, quotes, and
// horizontal rules.
//
// TO ADD A NEW POST: create a new file in /content/blog/, e.g.
// content/blog/best-time-to-visit-bali.md — see any existing post in that
// folder for the exact front-matter fields to copy. The slug used in the
// URL (/blog/<slug>) is just the filename without ".md". No other file
// needs to change; the blog index and sitemap pick it up automatically on
// the next deploy.

import fs from "fs";
import path from "path";

const POSTS_DIR = path.join(process.cwd(), "content", "blog");

function readPostFiles() {
  if (!fs.existsSync(POSTS_DIR)) return [];
  return fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith(".md"));
}

// Parses the "---\nkey: value\n---\n<body>" front-matter block. Deliberately
// simple: one "key: value" pair per line, values are plain strings (wrap in
// quotes in the file if a value contains a colon).
function parseFrontMatter(raw) {
  const match = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/.exec(raw);
  if (!match) {
    return { data: {}, content: raw };
  }
  const [, frontMatterBlock, content] = match;
  const data = {};
  frontMatterBlock.split("\n").forEach((line) => {
    const lineMatch = /^([A-Za-z0-9_]+):\s*(.*)$/.exec(line);
    if (!lineMatch) return;
    const [, key, rawValue] = lineMatch;
    let value = rawValue.trim();
    // Strip surrounding quotes if present.
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    data[key] = value;
  });
  return { data, content: content.trim() };
}

// Escapes raw HTML special characters before we inject our own tags, so a
// post can't accidentally (or a stray character can't) break the page.
function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Inline formatting: **bold**, *italic*, `code`, [text](url), bare images
// are handled at the block level instead since they're their own line.
function renderInline(text) {
  let out = escapeHtml(text);
  out = out.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    '<img src="$2" alt="$1" loading="lazy" />'
  );
  out = out.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
  );
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, "$1<em>$2</em>");
  out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
  return out;
}

// Converts the small Markdown subset described above into an HTML string.
export function markdownToHtml(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const htmlParts = [];
  let listBuffer = [];
  let listType = null; // "ul" | "ol"
  let quoteBuffer = [];
  let paragraphBuffer = [];
  let inCodeFence = false;
  let codeBuffer = [];

  function flushParagraph() {
    if (paragraphBuffer.length) {
      htmlParts.push(`<p>${renderInline(paragraphBuffer.join(" "))}</p>`);
      paragraphBuffer = [];
    }
  }

  function flushList() {
    if (listBuffer.length) {
      const items = listBuffer
        .map((item) => `<li>${renderInline(item)}</li>`)
        .join("");
      htmlParts.push(`<${listType}>${items}</${listType}>`);
      listBuffer = [];
      listType = null;
    }
  }

  function flushQuote() {
    if (quoteBuffer.length) {
      htmlParts.push(
        `<blockquote><p>${renderInline(quoteBuffer.join(" "))}</p></blockquote>`
      );
      quoteBuffer = [];
    }
  }

  function flushAll() {
    flushParagraph();
    flushList();
    flushQuote();
  }

  for (const rawLine of lines) {
    // Fenced code blocks (```...```) preserve their own indentation and
    // skip inline formatting entirely, so they're handled before the
    // normal trimmed-line logic below.
    if (inCodeFence) {
      if (rawLine.trim() === "```") {
        htmlParts.push(`<pre><code>${escapeHtml(codeBuffer.join("\n"))}</code></pre>`);
        codeBuffer = [];
        inCodeFence = false;
      } else {
        codeBuffer.push(rawLine);
      }
      continue;
    }
    const line = rawLine.trim();
    if (line.startsWith("```")) {
      flushAll();
      inCodeFence = true;
      codeBuffer = [];
      continue;
    }

    if (line === "") {
      flushAll();
      continue;
    }

    const headingMatch = /^(#{1,4})\s+(.*)$/.exec(line);
    if (headingMatch) {
      flushAll();
      const level = headingMatch[1].length;
      htmlParts.push(`<h${level}>${renderInline(headingMatch[2])}</h${level}>`);
      continue;
    }

    if (/^(-{3,}|\*{3,})$/.test(line)) {
      flushAll();
      htmlParts.push("<hr />");
      continue;
    }

    const imageOnlyMatch = /^!\[([^\]]*)\]\(([^)]+)\)$/.exec(line);
    if (imageOnlyMatch) {
      flushAll();
      htmlParts.push(
        `<img class="post-image" src="${imageOnlyMatch[2]}" alt="${imageOnlyMatch[1]}" loading="lazy" />`
      );
      continue;
    }

    const quoteMatch = /^>\s?(.*)$/.exec(line);
    if (quoteMatch) {
      flushParagraph();
      flushList();
      quoteBuffer.push(quoteMatch[1]);
      continue;
    }

    const ulMatch = /^[-*]\s+(.*)$/.exec(line);
    const olMatch = /^\d+[.)]\s+(.*)$/.exec(line);
    if (ulMatch || olMatch) {
      flushParagraph();
      flushQuote();
      const nextType = ulMatch ? "ul" : "ol";
      if (listType && listType !== nextType) flushList();
      listType = nextType;
      listBuffer.push((ulMatch || olMatch)[1]);
      continue;
    }

    flushList();
    flushQuote();
    paragraphBuffer.push(line);
  }

  // An unterminated fence (a post ending mid-code-block) still renders
  // whatever was captured rather than silently dropping it.
  if (inCodeFence && codeBuffer.length) {
    htmlParts.push(`<pre><code>${escapeHtml(codeBuffer.join("\n"))}</code></pre>`);
  }

  flushAll();
  return htmlParts.join("\n");
}

// A short, dependency-free estimate so posts can show "N min read".
function estimateReadingMinutes(markdown) {
  const words = markdown.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

// Returns every post's metadata (no HTML body), newest first — this is all
// the /blog listing page needs.
export function getAllPosts() {
  return readPostFiles()
    .map((filename) => {
      const slug = filename.replace(/\.md$/, "");
      const raw = fs.readFileSync(path.join(POSTS_DIR, filename), "utf8");
      const { data, content } = parseFrontMatter(raw);
      return {
        slug,
        title: data.title || slug,
        date: data.date || "",
        excerpt: data.excerpt || "",
        coverImage: data.coverImage || "",
        readingMinutes: estimateReadingMinutes(content),
      };
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getAllPostSlugs() {
  return readPostFiles().map((filename) => filename.replace(/\.md$/, ""));
}

// Returns one post's full metadata plus its body pre-rendered to HTML, for
// the /blog/[slug] page.
export function getPostBySlug(slug) {
  const filePath = path.join(POSTS_DIR, `${slug}.md`);
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = parseFrontMatter(raw);
  return {
    slug,
    title: data.title || slug,
    date: data.date || "",
    excerpt: data.excerpt || "",
    coverImage: data.coverImage || "",
    readingMinutes: estimateReadingMinutes(content),
    contentHtml: markdownToHtml(content),
  };
}
