/**
 * Regression Report: Hard-coded English UI Text Scan
 * Tuân thủ docs/BASELINE-CHECKLIST.md mục A12 (UI 100% tiếng Việt mặc định).
 *
 * Quét mọi file .js trong apps/ và platform/ (bỏ qua catalog i18n strings-en.js,
 * strings-vi.js, tests, node_modules) tìm chuỗi ký tự là text UI hiển thị còn hard-coded tiếng Anh:
 *   - gán vào textContent / innerText / innerHTML
 *   - gán vào .title / .label / .placeholder / .alt
 *   - setAttribute("title"|"aria-label"|"placeholder"|"alt", ...)
 *   - setStatus(...) / alert(...) / confirm(...) / prompt(...)
 *   - thuộc tính HTML title= / aria-label= / placeholder= / alt=
 *   - template literal sinh text hiển thị
 * Bỏ qua: identifier, CSS class, command id, console message, comment, URL.
 *
 * Đây là bài test BÁO CÁO — luôn PASS, chỉ in ra số lượng và danh sách finding
 * (owner sẽ quyết định khi nào nâng thành test strict). Allowlist dưới đây ghi rõ
 * các false positive đã biết kèm lý do.
 */

import { readFileSync, readdirSync } from "fs";
import { join, extname, relative } from "path";

const ROOT = process.cwd();
const SCAN_DIRS = ["apps", "platform"];
const SKIP_FILES = new Set([
  "platform/i18n/strings-en.js", // catalog tiếng Anh — nguồn dịch chuẩn, không phải UI hard-coded
  "platform/i18n/strings-vi.js", // catalog tiếng Việt
]);

// Các từ tiếng Anh phổ biến trong UI Office (theo BASELINE-CHECKLIST A12)
const EN_UI_WORDS = [
  "word", "words", "page", "pages", "sheet", "sheets", "slide", "slides",
  "loading", "cancel", "close", "save", "open", "print", "error", "ready",
  "select", "insert", "delete", "format", "font", "paragraph", "zoom",
  "find", "replace", "ok", "yes", "no", "sparkline"
];
const EN_WORD_RE = new RegExp(`\\b(${EN_UI_WORDS.join("|")})\\b`, "i");
const EN_WORD_RE_GI = new RegExp(`\\b(${EN_UI_WORDS.join("|")})\\b`, "gi");

// Allowlist false positive — mỗi entry có pattern (test trên text của finding) + lý do.
// Chỉ giữ các entry thực sự chặn false positive của scanner; khi nâng test sang strict
// mà xuất hiện false positive mới, bổ sung entry tại đây.
const ALLOWLIST = [
  {
    pattern: /\bVN (Office|Writer|Sheet|Slides)\b/,
    reason: "Tên thương hiệu sản phẩm (proper noun) — không dịch, giữ nguyên trong mọi ngôn ngữ (vd: đoạn văn bản pháp lý mẫu trong writer-app.js).",
  },
];

// ── Máy trạng thái ────────────────────────────────────────────────────────────
// Xóa comment (giữ nguyên xuống dòng) và xóa nội dung biểu thức ${...} trong
// template literal (kể cả string lồng nhau) — chỉ giữ lại phần text literal.
// Chuỗi ký tự ' và " thường giữ nguyên vì chính là nơi chứa text UI cần quét.
// Ký tự đứng trước "/" báo hiệu đó là regex (vị trí operator)
const REGEX_OP_CHARS = "(,=:[!&|?{};+-*%^~<>";
// Từ khóa đứng trước "/" báo hiệu đó là regex (vị trí value nhưng là keyword)
const REGEX_OP_WORDS = new Set([
  "return", "typeof", "case", "in", "of", "new", "delete", "void",
  "instanceof", "do", "else", "yield", "await",
]);

function isRegexContext(prevChar, prevWord) {
  if (!prevChar) return true;
  if (REGEX_OP_CHARS.includes(prevChar)) return true;
  if (prevWord && REGEX_OP_WORDS.has(prevWord)) return true;
  return false;
}

function blankCommentsAndExpressions(src) {
  const n = src.length;
  const out = src.split("");
  const templateSpans = []; // span của template literal cấp cao nhất (mở → sau đóng)
  const blank = (i) => { if (out[i] !== "\n") out[i] = " "; };
  const isIdentChar = (c) => /[A-Za-z0-9_$]/.test(c);

  // Chuỗi ' hoặc " — xóa nội dung, trả về vị trí sau đóng
  const skipString = (start) => {
    const q = src[start];
    blank(start);
    let j = start + 1;
    while (j < n && src[j] !== q) {
      if (src[j] === "\\") { blank(j); j++; if (j < n) blank(j); j++; continue; }
      blank(j);
      j++;
    }
    if (j < n) blank(j);
    return j + 1;
  };

  // Regex literal — xóa nội dung (kể cả trong [...]), trả về vị trí sau đóng
  const skipRegex = (start) => {
    blank(start);
    let j = start + 1;
    let inClass = false;
    while (j < n) {
      const c = src[j];
      if (c === "\\") { blank(j); j++; if (j < n) blank(j); j++; continue; }
      if (c === "[") { inClass = true; blank(j); j++; continue; }
      if (c === "]") { inClass = false; blank(j); j++; continue; }
      if (c === "/" && !inClass) { blank(j); return j + 1; }
      if (c === "\n") return j; // an toàn: regex không xuống dòng
      blank(j);
      j++;
    }
    return j;
  };

  // Biểu thức ${...} — xóa toàn bộ nội dung, trả về vị trí sau dấu } đóng
  const processExpression = (start) => {
    let depth = 1;
    let j = start;
    let prev = "";
    let prevWord = "";
    while (j < n && depth > 0) {
      const c = src[j];
      if (c === "{") { depth++; blank(j); j++; prev = "{"; prevWord = ""; continue; }
      if (c === "}") { depth--; blank(j); j++; if (depth === 0) return j; prev = "}"; prevWord = ""; continue; }
      if (c === "`") { j = processNestedTemplate(j); prev = "`"; prevWord = ""; continue; }
      if (c === "'" || c === '"') { const q = c; j = skipString(j); prev = q; prevWord = ""; continue; }
      if (c === "/") {
        if (isRegexContext(prev, prevWord)) { j = skipRegex(j); prev = "/"; prevWord = ""; continue; }
        blank(j); j++; prev = "/"; prevWord = ""; continue;
      }
      if (isIdentChar(c)) {
        let k = j;
        while (k < n && isIdentChar(src[k])) k++;
        prevWord = src.substring(j, k);
        for (let x = j; x < k; x++) if (out[x] !== "\n") out[x] = " ";
        prev = src[k - 1];
        j = k;
        continue;
      }
      if (!/\s/.test(c)) { prev = c; prevWord = ""; }
      blank(j);
      j++;
    }
    return j;
  };

  // Template literal lồng trong biểu thức — xóa toàn bộ (kể cả text literal,
  // vì thường là CSS/đoạn mã, không phải text UI hiển thị).
  // Lưu ý: "/" trong text literal (vd </label>) chỉ là ký tự thường — KHÔNG
  // được coi là regex (regex chỉ xuất hiện trong ${...}, do processExpression xử lý).
  const processNestedTemplate = (start) => {
    let j = start + 1;
    while (j < n) {
      const c = src[j];
      if (c === "\\") { blank(j); j++; if (j < n) blank(j); j++; continue; }
      if (c === "`") { blank(j); return j + 1; }
      if (c === "$" && j + 1 < n && src[j + 1] === "{") {
        blank(j); blank(j + 1);
        j = processExpression(j + 2);
        continue;
      }
      if (c === "'" || c === '"') { j = skipString(j); continue; }
      blank(j);
      j++;
    }
    return j;
  };

  // Template literal cấp cao — giữ phần text literal và cả hai dấu backtick
  // (scanner cần chúng để xác định span), chỉ xóa nội dung ${...}
  const processTemplate = (start) => {
    let j = start + 1;
    while (j < n) {
      const c = src[j];
      if (c === "\\") { j += 2; continue; }
      if (c === "`") { return j + 1; }
      if (c === "$" && j + 1 < n && src[j + 1] === "{") {
        blank(j); blank(j + 1);
        j = processExpression(j + 2);
        continue;
      }
      j++;
    }
    return j;
  };

  let i = 0;
  let state = "normal"; // normal | sq | dq | line | block | regex
  let prevSignificant = "";
  let prevWord = "";

  while (i < n) {
    const c = src[i];
    const next = i + 1 < n ? src[i + 1] : "";

    if (state === "normal") {
      if (c === "/" && next === "/") {
        state = "line";
        out[i] = " "; out[i + 1] = " ";
        i += 2;
        continue;
      }
      if (c === "/" && next === "*") {
        state = "block";
        out[i] = " "; out[i + 1] = " ";
        i += 2;
        continue;
      }
      if (c === "'") { state = "sq"; i++; continue; }
      if (c === '"') { state = "dq"; i++; continue; }
      if (c === "`") {
        const end = processTemplate(i);
        templateSpans.push({ start: i, end });
        i = end;
        continue;
      }
      if (c === "/") {
        if (isRegexContext(prevSignificant, prevWord)) { state = "regex"; i++; continue; }
        i++; continue;
      }
      if (isIdentChar(c)) {
        let j = i;
        while (j < n && isIdentChar(src[j])) j++;
        prevWord = src.substring(i, j);
        prevSignificant = src[j - 1];
        i = j;
        continue;
      }
      if (!/\s/.test(c)) {
        prevSignificant = c;
        prevWord = "";
      }
      i++;
      continue;
    }

    if (state === "sq") {
      if (c === "\\") { i += 2; continue; }
      if (c === "'") { state = "normal"; prevSignificant = "'"; prevWord = ""; }
      i++; continue;
    }
    if (state === "dq") {
      if (c === "\\") { i += 2; continue; }
      if (c === '"') { state = "normal"; prevSignificant = '"'; prevWord = ""; }
      i++; continue;
    }
    if (state === "line") {
      if (c === "\n") state = "normal";
      else out[i] = " ";
      i++; continue;
    }
    if (state === "block") {
      if (c === "*" && next === "/") {
        out[i] = " "; out[i + 1] = " ";
        state = "normal";
        i += 2;
        continue;
      }
      if (c !== "\n") out[i] = " ";
      i++; continue;
    }
    if (state === "regex") {
      if (c === "\\") { i += 2; continue; }
      if (c === "[") {
        i++;
        while (i < n && src[i] !== "]") { if (src[i] === "\\") i++; i++; }
        i++; continue;
      }
      if (c === "/") { state = "normal"; prevSignificant = "/"; prevWord = ""; i++; continue; }
      if (c === "\n") { state = "normal"; prevSignificant = "/"; prevWord = ""; i++; continue; }
      i++; continue;
    }
  }
  return { clean: out.join(""), templateSpans };
}

// Trích text node hiển thị từ HTML (bỏ thẻ, <style>, comment HTML).
// Giá trị title/aria-label/placeholder/alt do ATTR_RE quét riêng nên không trích ở đây
// (tránh finding trùng).
function visibleTextFromHtml(html) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ");
}

function extractVisibleText(raw) {
  if (/[<>]/.test(raw) && /<\/?[a-z]/i.test(raw)) {
    return visibleTextFromHtml(raw);
  }
  return raw;
}

// Vị trí sink hiển thị: text trước chuỗi bắt đầu của literal
const SINK_BEFORE_RE = new RegExp(
  "(?:textContent|innerText|innerHTML|title|label|placeholder|alt)\\s*=\\s*$" +
  "|setAttribute\\(\\s*[\"'](?:title|aria-label|placeholder|alt)[\"']\\s*,\\s*$" +
  "|setStatus\\(\\s*$|alert\\(\\s*$|confirm\\(\\s*$|prompt\\(\\s*$"
);

const ATTR_RE = /(?<![-\w])(title|aria-label|placeholder|alt)(?![-\w])\s*=\s*(["'])((?:\\.|(?!\2).)*)\2/g;
const QUOTED_RE = /(['"])((?:\\.|(?!\1).)*)\1/g;

function lineOf(clean, index) {
  return clean.substring(0, index).split("\n").length;
}

// Vị trí idx nằm trong thẻ HTML (giữa < và >) không?
function isInTag(clean, idx) {
  for (let j = idx - 1; j >= 0; j--) {
    const c = clean[j];
    if (c === "<") return true;
    if (c === ">") return false;
  }
  return false;
}

// Tìm dòng xuất hiện đầu tiên của từ tiến Anh nằm ngoài thẻ HTML, từ vị trí start
function firstVisibleEnWordLine(clean, start, end) {
  EN_WORD_RE_GI.lastIndex = start;
  let m;
  while ((m = EN_WORD_RE_GI.exec(clean)) !== null) {
    if (m.index >= end) break;
    if (!isInTag(clean, m.index)) return lineOf(clean, m.index);
  }
  return lineOf(clean, start);
}

function scanSource(rel, src) {
  const { clean, templateSpans } = blankCommentsAndExpressions(src);
  const findings = [];
  let m;

  // 1. Thuộc tính HTML title=/aria-label=/placeholder=/alt= trong bất kỳ chuỗi nào
  ATTR_RE.lastIndex = 0;
  while ((m = ATTR_RE.exec(clean)) !== null) {
    const vis = extractVisibleText(m[3]);
    if (EN_WORD_RE.test(vis)) {
      findings.push({ file: rel, line: lineOf(clean, m.index), text: m[3].trim(), kind: `attr:${m[1]}` });
    }
  }

  // 2. Chuỗi ký tự (single/double quote) ở vị trí sink hiển thị
  QUOTED_RE.lastIndex = 0;
  while ((m = QUOTED_RE.exec(clean)) !== null) {
    const before = clean.substring(Math.max(0, m.index - 120), m.index);
    if (!SINK_BEFORE_RE.test(before)) continue;
    const vis = extractVisibleText(m[2]);
    if (EN_WORD_RE.test(vis)) {
      findings.push({ file: rel, line: firstVisibleEnWordLine(clean, m.index, m.index + m[0].length), text: m[2].trim(), kind: "assign" });
    }
  }

  // 3. Template literal ở vị trí sink hiển thị (nội dung ${...} đã bị xóa sẵn)
  for (const span of templateSpans) {
    const before = clean.substring(Math.max(0, span.start - 120), span.start);
    if (!SINK_BEFORE_RE.test(before)) continue;
    const raw = clean.substring(span.start + 1, span.end - 1);
    const vis = extractVisibleText(raw);
    if (EN_WORD_RE.test(vis)) {
      findings.push({ file: rel, line: firstVisibleEnWordLine(clean, span.start, span.end), text: raw.trim(), kind: "template" });
    }
  }

  return findings;
}

function collectFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "tests") continue;
      files.push(...collectFiles(full));
    } else if (extname(entry.name) === ".js") {
      const rel = relative(ROOT, full);
      if (SKIP_FILES.has(rel)) continue;
      files.push({ full, rel });
    }
  }
  return files;
}

function existsDir(p) {
  try {
    readdirSync(p);
    return true;
  } catch {
    return false;
  }
}

export async function runI18nHardcodedEnglishTests() {
  const results = [];
  const files = [];
  for (const dir of SCAN_DIRS) {
    const abs = join(ROOT, dir);
    if (existsDir(abs)) files.push(...collectFiles(abs));
  }

  const allFindings = [];
  for (const { full, rel } of files) {
    try {
      const src = readFileSync(full, "utf-8");
      allFindings.push(...scanSource(rel, src));
    } catch {
      // đọc file lỗi — bỏ qua, không làm hỏng suite
    }
  }

  const allowlisted = [];
  const findings = [];
  for (const f of allFindings) {
    const hit = ALLOWLIST.find((a) => a.pattern.test(f.text));
    if (hit) allowlisted.push({ ...f, reason: hit.reason });
    else findings.push(f);
  }

  // In báo cáo — bài test này luôn PASS (chế độ report, chưa strict)
  console.log("  ──────────────────────────────────────────────────────────");
  console.log(`  [BÁO CÁO i18n] Quét ${files.length} file JS trong apps/ + platform/`);
  console.log(`  [BÁO CÁO i18n] Tổng hit thô: ${allFindings.length} | allowlist: ${allowlisted.length} | finding thật: ${findings.length}`);
  if (allowlisted.length > 0) {
    console.log("  [BÁO CÁO i18n] Đã allowlist (false positive đã biết):");
    for (const a of allowlisted) {
      console.log(`    - ${a.file}:${a.line} [${a.kind}] "${a.text.length > 80 ? a.text.slice(0, 80) + "…" : a.text}" — ${a.reason}`);
    }
  }
  if (findings.length > 0) {
    console.log(`  [BÁO CÁO i18n] ${findings.length} finding (in tối đa 50 đầu):`);
    for (const f of findings.slice(0, 50)) {
      const oneLine = f.text.replace(/\s+/g, " ").trim();
      console.log(`    ${f.file}:${f.line}: ${oneLine.length > 120 ? oneLine.slice(0, 120) + "…" : oneLine}`);
    }
  } else {
    console.log("  [BÁO CÁO i18n] Không còn text UI hard-coded tiếng Anh. ✓");
  }
  console.log("  ──────────────────────────────────────────────────────────");

  results.push({
    name: `i18n: Báo cáo hard-coded English UI text — ${findings.length} finding (strict guard: 0 finding)`,
    pass: findings.length === 0,
  });

  return results;
}
