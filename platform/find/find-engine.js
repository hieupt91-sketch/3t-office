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

export function createMatcher(findText, options = {}) {
  const {
    matchCase = false,
    wholeWord = false,
    matchCell = false,
    ignoreDiacritics = false,
    useRegex = false
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

  let pattern = normalizedFind;
  if (!useRegex) {
    pattern = escapeRegExp(pattern);
  }

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
    const strippedPattern = useRegex ? strippedFind : escapeRegExp(strippedFind);
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
      const newText = normH.slice(0, m.index) + normRep + normH.slice(m.index + m.length);
      return { text: newText, count: 1 };
    }

    let newText = normH;
    for (let i = allMatches.length - 1; i >= 0; i--) {
      const m = allMatches[i];
      newText = newText.slice(0, m.index) + normRep + newText.slice(m.index + m.length);
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
