/**
 * 3T Office — Shared Find/Replace Engine
 * Cung cấp logic tìm kiếm và thay thế dùng chung cho 3T Doc, 3T Sheet và 3T Slide.
 * Hỗ trợ: Unicode NFC, bỏ dấu tiếng Việt (kể cả đ/Đ), khớp chữ hoa/thường,
 * toàn bộ từ Unicode, regex-safe (thoát ký tự đặc biệt) và thay thế nhiều lần
 * giữ nguyên dấu tiếng Việt của các phần còn lại.
 */

export function normalizeNFC(text) {
  if (typeof text !== "string") return "";
  return text.normalize("NFC");
}

export function stripDiacritics(text) {
  if (typeof text !== "string") return "";
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

export function escapeRegExp(text) {
  if (typeof text !== "string") return "";
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function buildFindPattern(findText, { useWildcards = false, useRegex = false } = {}) {
  if (useRegex) return findText;
  if (typeof findText !== "string") return "";

  const tokenRegex = /(\^(?:p|t|\?|w|\^))/g;
  const parts = findText.split(tokenRegex);

  return parts.map(part => {
    if (part === "^p") return "\\n";
    if (part === "^t") return "\\t";
    if (part === "^?") return "[^\\r\\n]";
    if (part === "^w") return "\\s+";
    if (part === "^^") return "\\^";

    if (useWildcards) {
      return part
        .replace(/[.+^$\\(){}|[\]]/g, "\\$&")
        .replace(/\*/g, ".*?")
        .replace(/\?/g, ".");
    }

    return escapeRegExp(part);
  }).join("");
}

export function expandReplacement(template, matchedText = "") {
  if (typeof template !== "string") return "";
  return template
    .replace(/\^\^/g, "\uE000")
    .replace(/\^&/g, matchedText)
    .replace(/\^p/g, "\n")
    .replace(/\^t/g, "\t")
    .replace(/\uE000/g, "^");
}

export function normalizeColor(c) {
  if (!c) return "";
  const str = String(c).trim().toLowerCase();
  if (str.startsWith("#")) {
    if (str.length === 4) {
      return `#${str[1]}${str[1]}${str[2]}${str[2]}${str[3]}${str[3]}`;
    }
    return str;
  }
  const match = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (match) {
    const r = parseInt(match[1], 10).toString(16).padStart(2, "0");
    const g = parseInt(match[2], 10).toString(16).padStart(2, "0");
    const b = parseInt(match[3], 10).toString(16).padStart(2, "0");
    return `#${r}${g}${b}`;
  }
  return str;
}

export function nodeMatchesFormat(node, format = {}) {
  if (!format || typeof format !== "object") return true;
  const { bold, italic, fontFamily, color } = format;
  if (bold === undefined && italic === undefined && !fontFamily && !color) return true;

  if (node && !node.nodeType) {
    if (bold !== undefined && bold !== null) {
      const isBold = Boolean(node.bold || node.wrapper === "strong" || node.wrapper === "b");
      if (isBold !== Boolean(bold)) return false;
    }
    if (italic !== undefined && italic !== null) {
      const isItalic = Boolean(node.italic || node.wrapper === "em" || node.wrapper === "i");
      if (isItalic !== Boolean(italic)) return false;
    }
    if (fontFamily) {
      const f = (node.fontFamily || node.font || "").toLowerCase();
      if (!f || !f.includes(fontFamily.toLowerCase())) return false;
    }
    if (color) {
      const c = normalizeColor(node.color);
      if (!c || c !== normalizeColor(color)) return false;
    }
    return true;
  }

  const el = node?.nodeType === 3 ? node.parentElement : node;
  if (!el) return false;

  const computed = typeof getComputedStyle === "function" ? getComputedStyle(el) : null;

  if (bold !== undefined && bold !== null) {
    const isBold = Boolean(
      el.closest?.("b, strong") ||
      (computed && (computed.fontWeight === "bold" || parseInt(computed.fontWeight, 10) >= 600)) ||
      el.style?.fontWeight === "bold" ||
      parseInt(el.style?.fontWeight, 10) >= 600
    );
    if (isBold !== Boolean(bold)) return false;
  }

  if (italic !== undefined && italic !== null) {
    const isItalic = Boolean(
      el.closest?.("i, em") ||
      (computed && computed.fontStyle === "italic") ||
      el.style?.fontStyle === "italic"
    );
    if (isItalic !== Boolean(italic)) return false;
  }

  if (fontFamily) {
    const expected = fontFamily.toLowerCase().trim();
    const current = (computed?.fontFamily || el.style?.fontFamily || "")
      .toLowerCase()
      .split(",")[0]
      .replace(/["']/g, "")
      .trim();
    if (!current || (!current.includes(expected) && !expected.includes(current))) return false;
  }

  if (color) {
    const expected = normalizeColor(color);
    const current = normalizeColor(computed?.color || el.style?.color || "");
    if (!current || expected !== current) return false;
  }

  return true;
}

export function createMatcher(findText, options = {}) {
  const {
    matchCase = false,
    wholeWord = false,
    matchCell = false,
    ignoreDiacritics = false,
    useRegex = false,
    useWildcards = false,
    format = null
  } = options;

  const rawFind = typeof findText === "string" ? findText : "";
  const normalizedFind = normalizeNFC(rawFind);

  if (!normalizedFind) {
    return {
      matches: () => false,
      findAll: () => [],
      replace: (h) => ({ text: typeof h === "string" ? h : "", count: 0 })
    };
  }

  let pattern = buildFindPattern(normalizedFind, { useWildcards, useRegex });

  // Unicode whole-word boundary
  const prefix = wholeWord ? "(?<![\\p{L}\\p{N}])" : "";
  const suffix = wholeWord ? "(?![\\p{L}\\p{N}])" : "";
  const fullPrefix = matchCell ? "^(?:" : prefix;
  const fullSuffix = matchCell ? ")$" : suffix;
  const flags = (matchCase ? "" : "i") + "u";

  let normalRegex = null;
  try {
    normalRegex = new RegExp(`${fullPrefix}${pattern}${fullSuffix}`, flags + "g");
  } catch (_) {
    const escapedPattern = escapeRegExp(normalizedFind);
    normalRegex = new RegExp(`${matchCell ? "^(?:" : ""}${escapedPattern}${matchCell ? ")$" : ""}`, "gu");
  }

  let strippedRegex = null;
  if (ignoreDiacritics) {
    const strippedFind = stripDiacritics(normalizedFind);
    const strippedPattern = buildFindPattern(strippedFind, { useWildcards, useRegex });
    try {
      strippedRegex = new RegExp(`${fullPrefix}${strippedPattern}${fullSuffix}`, flags + "g");
    } catch (_) {
      const escapedPattern = escapeRegExp(strippedFind);
      strippedRegex = new RegExp(`${matchCell ? "^(?:" : ""}${escapedPattern}${matchCell ? ")$" : ""}`, "gu");
    }
  }

  function matches(haystack) {
    if (typeof haystack !== "string") return false;
    const normH = normalizeNFC(haystack);
    if (ignoreDiacritics) {
      const strippedH = stripDiacritics(normH);
      const re = new RegExp(strippedRegex.source, strippedRegex.flags);
      return re.test(strippedH);
    }
    const re = new RegExp(normalRegex.source, normalRegex.flags);
    return re.test(normH);
  }

  function findAll(haystack) {
    if (typeof haystack !== "string") return [];
    const normH = normalizeNFC(haystack);
    const results = [];

    if (matchCell) {
      const target = ignoreDiacritics ? stripDiacritics(normH) : normH;
      const regex = ignoreDiacritics ? strippedRegex : normalRegex;
      if (new RegExp(regex.source, regex.flags.replace("g", "")).test(target)) {
        return [{ index: 0, match: normH, length: normH.length }];
      }
      return results;
    }

    if (ignoreDiacritics) {
      const strippedH = stripDiacritics(normH);
      const re = new RegExp(strippedRegex.source, strippedRegex.flags);
      let match;
      while ((match = re.exec(strippedH)) !== null) {
        const originalMatch = normH.slice(match.index, match.index + match[0].length);
        results.push({
          index: match.index,
          match: originalMatch,
          length: match[0].length
        });
        if (re.lastIndex === match.index) {
          re.lastIndex++;
        }
      }
    } else {
      const re = new RegExp(normalRegex.source, normalRegex.flags);
      let match;
      while ((match = re.exec(normH)) !== null) {
        results.push({
          index: match.index,
          match: match[0],
          length: match[0].length
        });
        if (re.lastIndex === match.index) {
          re.lastIndex++;
        }
      }
    }
    return results;
  }

  function replace(haystack, replacement, replaceAll = false) {
    if (typeof haystack !== "string") return { text: "", count: 0 };
    const normH = normalizeNFC(haystack);
    const normRep = normalizeNFC(typeof replacement === "string" ? replacement : "");

    const allMatches = findAll(normH);
    if (allMatches.length === 0) {
      return { text: normH, count: 0 };
    }

    if (!replaceAll) {
      const m = allMatches[0];
      const actualRep = expandReplacement(normRep, m.match);
      const newText = normH.slice(0, m.index) + actualRep + normH.slice(m.index + m.length);
      return { text: newText, count: 1 };
    }

    let newText = normH;
    for (let i = allMatches.length - 1; i >= 0; i--) {
      const m = allMatches[i];
      const actualRep = expandReplacement(normRep, m.match);
      newText = newText.slice(0, m.index) + actualRep + newText.slice(m.index + m.length);
    }
    return { text: newText, count: allMatches.length };
  }

  return { matches, findAll, replace };
}

export class FindReplaceEngine {
  constructor(defaultOptions = {}) {
    this.options = {
      matchCase: false,
      wholeWord: false,
      matchCell: false,
      ignoreDiacritics: false,
      useRegex: false,
      searchScope: "sheet",
      searchDirection: "forward",
      ...defaultOptions
    };
    this.lastFindText = "";
    this.lastReplaceText = "";
    this.lastMatchIndex = -1;
    this.lastMatches = [];
    this.lastHaystack = "";
  }

  setOptions(options) {
    this.options = { ...this.options, ...options };
  }

  getOptions() {
    return { ...this.options };
  }

  find(haystack, findText, options = {}) {
    const opts = { ...this.options, ...options };
    this.lastFindText = findText;
    this.lastHaystack = haystack;

    const matcher = createMatcher(findText, opts);
    const results = matcher.findAll(haystack);
    this.lastMatches = results;

    if (results.length === 0) {
      this.lastMatchIndex = -1;
      return null;
    }

    if (opts.searchDirection === "backward") {
      this.lastMatchIndex = results.length - 1;
      return results[this.lastMatchIndex];
    } else {
      this.lastMatchIndex = 0;
      return results[this.lastMatchIndex];
    }
  }

  findNext(haystack, findText = this.lastFindText, options = {}) {
    if (!findText || !haystack) return null;

    const opts = { ...this.options, ...options };
    const matcher = createMatcher(findText, opts);
    const results = matcher.findAll(haystack);

    if (results.length === 0) {
      this.lastMatchIndex = -1;
      this.lastMatches = [];
      return null;
    }

    if (opts.searchDirection === "backward") {
      if (this.lastMatchIndex <= 0) {
        this.lastMatchIndex = results.length - 1;
      } else {
        this.lastMatchIndex = (this.lastMatchIndex - 1) % results.length;
      }
    } else {
      if (this.lastMatchIndex < 0 || this.lastMatchIndex >= results.length - 1) {
        this.lastMatchIndex = 0;
      } else {
        this.lastMatchIndex = (this.lastMatchIndex + 1) % results.length;
      }
    }

    this.lastMatches = results;
    return results[this.lastMatchIndex];
  }

  findPrevious(haystack, findText = this.lastFindText, options = {}) {
    return this.findNext(haystack, findText, { ...options, searchDirection: "backward" });
  }

  replace(haystack, findText, replaceText, options = {}) {
    const opts = { ...this.options, ...options };
    this.lastFindText = findText;
    this.lastReplaceText = replaceText;
    this.lastHaystack = haystack;

    const matcher = createMatcher(findText, opts);
    const result = matcher.replace(haystack, replaceText, false);

    if (result.count > 0) {
      this.lastMatches = matcher.findAll(result.text);
    }

    return result;
  }

  replaceAll(haystack, findText, replaceText, options = {}) {
    const opts = { ...this.options, ...options };
    this.lastFindText = findText;
    this.lastReplaceText = replaceText;
    this.lastHaystack = haystack;

    const matcher = createMatcher(findText, opts);
    const result = matcher.replace(haystack, replaceText, true);

    if (result.count > 0) {
      this.lastMatches = matcher.findAll(result.text);
    }

    return result;
  }

  getLastMatch() {
    if (this.lastMatchIndex >= 0 && this.lastMatchIndex < this.lastMatches.length) {
      return this.lastMatches[this.lastMatchIndex];
    }
    return null;
  }

  getMatches() {
    return [...this.lastMatches];
  }

  reset() {
    this.lastFindText = "";
    this.lastReplaceText = "";
    this.lastMatchIndex = -1;
    this.lastMatches = [];
    this.lastHaystack = "";
  }
}
