/**
 * Regression Guard: Offline Resources Check
 * Ensures no external runtime resources (fonts, scripts, styles, images) are loaded from CDNs.
 * The desktop app must work fully OFFLINE (AGENTS.md §2, priority 1).
 * Allowed: XML namespaces, URLs in comments, user-clickable help links (a href), AI cloud provider endpoints (opt-in).
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { join, extname, relative } from "path";

const ROOT = process.cwd();
const SCAN_DIRS = ["apps", "platform", "adapters"];
const SCAN_EXTS = [".html", ".css", ".js"];
const INDEX_HTML = "index.html";

// Allowed URL patterns with explanations
const ALLOWLIST = [
  // XML namespaces (not runtime resources)
  { pattern: /^http:\/\/www\.w3\.org\//, reason: "XML namespace (W3C)" },
  { pattern: /^urn:/, reason: "URN namespace" },
  { pattern: /^http:\/\/schemas\.openxmlformats\.org\//, reason: "OpenXML namespace" },
  { pattern: /^http:\/\/purl\.org\//, reason: "PURL namespace" },
  { pattern: /^http:\/\/schemas\.microsoft\.com\//, reason: "Microsoft Office namespace" },
  { pattern: /^urn:oasis:/, reason: "OASIS namespace" },

  // AI Cloud Providers — opt-in network features by design (AGENTS.md §2)
  { pattern: /^https:\/\/generativelanguage\.googleapis\.com\//, reason: "Google Gemini API (opt-in AI)" },
  { pattern: /^https:\/\/api\.openai\.com\//, reason: "OpenAI API (opt-in AI)" },
  { pattern: /^https:\/\/api\.anthropic\.com\//, reason: "Anthropic Claude API (opt-in AI)" },

  // Localhost for dev server (not a CDN)
  { pattern: /^http:\/\/localhost:/, reason: "Local dev server" },
  { pattern: /^http:\/\/127\.0\.0\.1:/, reason: "Local dev server" },
];

// Patterns that indicate a runtime resource load (to be flagged if not allowlisted)
const RESOURCE_PATTERNS = [
  // HTML: <link href="...">, <script src="...">, <img src="...">, <iframe src="...">
  /<(?:link|script|img|iframe|source|track|embed|object|video|audio)\b[^>]*\b(?:href|src)\s*=\s*["'](https?:\/\/[^"'>\s]+)["']/gi,
  // HTML: <a href="..."> in help content — allowed, but we track for context
  /<a\b[^>]*\bhref\s*=\s*["'](https?:\/\/[^"'>\s]+)["']/gi,
  // CSS: @import url("http...") or @import "http..."
  /@import\s+(?:url\(\s*)?["']?(https?:\/\/[^"')\s]+)["']?\s*\)?/gi,
  // CSS: url("http...") in any property (background, font-face src, etc.)
  /url\(\s*["']?(https?:\/\/[^"')\s]+)["']?\s*\)/gi,
  // CSS: @font-face src with http
  /@font-face\b[^}]*src\s*:\s*[^;}]*?(https?:\/\/[^"')\s;}]+)/gi,
  // JS: import "http..." or import('http...') or fetch("http...") or axios.get("http...")
  /\b(?:import\s*\(?\s*["']|fetch\s*\(\s*["']|axios\.(?:get|post|put|delete|patch)\s*\(\s*["'])(https?:\/\/[^"')\s]+)["']/gi,
  // JS: new URL("http...", import.meta.url) or similar
  /new\s+URL\(\s*["'](https?:\/\/[^"')\s]+)["']/gi,
];

function isAllowlisted(url) {
  return ALLOWLIST.some(({ pattern }) => pattern.test(url));
}

function getLineNumber(content, index) {
  return content.substring(0, index).split("\n").length;
}

function extractContext(content, index, radius = 80) {
  const start = Math.max(0, index - radius);
  const end = Math.min(content.length, index + radius);
  return content.substring(start, end).replace(/\n/g, "\\n");
}

function scanFile(filePath, relPath) {
  const content = readFileSync(filePath, "utf-8");
  const violations = [];
  const isHtml = relPath.endsWith(".html");
  const isCss = relPath.endsWith(".css");
  const isJs = relPath.endsWith(".js");

  // Remove comments to avoid false positives
  // For HTML: <!-- ... -->
  // For CSS: /* ... */
  // For JS: /* ... */ and // ...
  let contentNoComments = content;
  if (isHtml) {
    contentNoComments = contentNoComments.replace(/<!--[\s\S]*?-->/g, (match) => " ".repeat(match.length));
  } else if (isCss) {
    contentNoComments = contentNoComments.replace(/\/\*[\s\S]*?\*\//g, (match) => " ".repeat(match.length));
  } else if (isJs) {
    contentNoComments = contentNoComments
      .replace(/\/\*[\s\S]*?\*\//g, (match) => " ".repeat(match.length))
      // Line comments only: the `//` of "https://" must survive, otherwise every URL in JS
      // code was erased before scanning and a CDN fetch() could never be caught.
      .replace(/(^|[^:"'`\\])\/\/.*$/gm, (match, before) => before + " ".repeat(match.length - before.length));
  }

  // Also track a href in original content for context (allowed in help text)
  const aHrefMatches = [];
  let match;
  const aHrefRegex = /<a\b[^>]*\bhref\s*=\s*["'](https?:\/\/[^"'>\s]+)["']/gi;
  while ((match = aHrefRegex.exec(content)) !== null) {
    aHrefMatches.push({ url: match[1], index: match.index });
  }

  for (const pattern of RESOURCE_PATTERNS) {
    pattern.lastIndex = 0; // reset global regex
    while ((match = pattern.exec(contentNoComments)) !== null) {
      const url = match[1];
      const line = getLineNumber(contentNoComments, match.index);
      const context = extractContext(contentNoComments, match.index);

      // Skip if allowlisted
      if (isAllowlisted(url)) continue;

      // Special handling: <a href> in help text is allowed (user-clickable)
      const isAnchorHref = aHrefMatches.some(m => m.url === url && Math.abs(m.index - match.index) < 50);
      if (isAnchorHref) {
        // Check if it looks like help/documentation link
        const beforeContext = contentNoComments.substring(Math.max(0, match.index - 200), match.index);
        if (/help|documentation|guide|tutorial|learn|hướng.dẫn|trợ.giúp/i.test(beforeContext)) {
          continue; // allowed
        }
      }

      violations.push({ file: relPath, line, url, context });
    }
  }

  return violations;
}

function collectFiles(dir, baseDir = ROOT) {
  const files = [];
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    const relPath = relative(baseDir, fullPath);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules" && entry.name !== ".git" && entry.name !== "tests") {
        files.push(...collectFiles(fullPath, baseDir));
      }
    } else if (SCAN_EXTS.includes(extname(entry.name).toLowerCase())) {
      files.push({ fullPath, relPath });
    }
  }
  return files;
}

export async function runOfflineResourcesTests() {
  const results = [];
  const allFiles = [{ fullPath: join(ROOT, INDEX_HTML), relPath: INDEX_HTML }, ...collectFiles(join(ROOT, "apps")), ...collectFiles(join(ROOT, "platform")), ...collectFiles(join(ROOT, "adapters"))];

  let totalViolations = 0;

  for (const { fullPath, relPath } of allFiles) {
    try {
      const violations = scanFile(fullPath, relPath);
      if (violations.length > 0) {
        totalViolations += violations.length;
        for (const v of violations) {
          results.push({
            name: `No external runtime resource in ${v.file}:${v.line}`,
            pass: false,
            error: `Found external URL: ${v.url}\n  Context: ${v.context}`
          });
        }
      } else {
        results.push({
          name: `No external runtime resource in ${relPath}`,
          pass: true
        });
      }
    } catch (err) {
      results.push({
        name: `Scan ${relPath}`,
        pass: false,
        error: err.message
      });
    }
  }

  // Summary result
  results.push({
    name: `Offline Resources Guard — Total violations: ${totalViolations}`,
    pass: totalViolations === 0,
    error: totalViolations > 0 ? `${totalViolations} external runtime resource(s) detected. The app must work offline.` : undefined
  });

  return results;
}