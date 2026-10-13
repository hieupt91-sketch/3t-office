export const DEFAULT_AUTO_CORRECT_SETTINGS = Object.freeze({
  enabled: true,
  replaceText: true,
  capitalizeSentences: true,
  smartQuotes: true,
  smartDashes: true,
  fractions: true
});

export const DEFAULT_AUTO_CORRECT_REPLACEMENTS = Object.freeze([
  Object.freeze({ from: "(c)", to: "©" }),
  Object.freeze({ from: ":)", to: "☺" }),
  Object.freeze({ from: "teh", to: "the" })
]);

const AUTO_CORRECT_STORAGE_KEY = "vno-writer-autocorrect-v1";

const WORD_BOUNDARY = /[\s.,;:!?)]/u;
const SENTENCE_END = /[.!?]/u;
const OPEN_QUOTE_CONTEXT = /[\s([{\u2013\u2014-]/u;

export function normalizeAutoCorrectSettings(settings = {}) {
  const normalized = {};
  for (const key of Object.keys(DEFAULT_AUTO_CORRECT_SETTINGS)) {
    normalized[key] = settings[key] === undefined
      ? DEFAULT_AUTO_CORRECT_SETTINGS[key]
      : Boolean(settings[key]);
  }
  return normalized;
}

export function normalizeAutoCorrectReplacements(replacements = DEFAULT_AUTO_CORRECT_REPLACEMENTS) {
  const seen = new Set();
  const normalized = [];
  for (const entry of Array.isArray(replacements) ? replacements : []) {
    const from = String(entry?.from || "").trim();
    const to = String(entry?.to || "");
    if (!from || !to || from.length > 64 || to.length > 128) continue;
    const key = from.toLocaleLowerCase("vi");
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push({ from, to });
    if (normalized.length >= 100) break;
  }
  return normalized;
}

export class WriterAutoCorrectPreferences {
  constructor(storage = (typeof localStorage !== "undefined" ? localStorage : null)) {
    this.storage = storage;
    this.settings = normalizeAutoCorrectSettings();
    this.replacements = normalizeAutoCorrectReplacements();
    this.lastLoadError = "";
    this._load();
  }

  _load() {
    if (!this.storage?.getItem) return;
    try {
      const raw = this.storage.getItem(AUTO_CORRECT_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      this.settings = normalizeAutoCorrectSettings(parsed?.settings);
      this.replacements = normalizeAutoCorrectReplacements(parsed?.replacements);
    } catch (error) {
      this.lastLoadError = String(error?.message || error);
      this.settings = normalizeAutoCorrectSettings();
      this.replacements = normalizeAutoCorrectReplacements();
    }
  }

  getSettings() {
    return { ...this.settings };
  }

  getReplacements() {
    return this.replacements.map(entry => ({ ...entry }));
  }

  save(settings, replacements) {
    const nextSettings = normalizeAutoCorrectSettings(settings);
    const nextReplacements = normalizeAutoCorrectReplacements(replacements);
    if (nextSettings.replaceText && nextReplacements.length === 0) {
      return { ok: false, message: "replacementRequired" };
    }
    try {
      this.storage?.setItem?.(AUTO_CORRECT_STORAGE_KEY, JSON.stringify({
        settings: nextSettings,
        replacements: nextReplacements
      }));
    } catch (error) {
      return { ok: false, message: "storageFailed", detail: String(error?.message || error) };
    }
    this.settings = nextSettings;
    this.replacements = nextReplacements;
    return { ok: true };
  }

  reset() {
    this.settings = normalizeAutoCorrectSettings();
    this.replacements = normalizeAutoCorrectReplacements();
  }
}

function replaceRange(text, start, end, replacement, caretOffset) {
  return {
    text: text.slice(0, start) + replacement + text.slice(end),
    caretOffset: caretOffset + replacement.length - (end - start)
  };
}

function caseMatchedReplacement(source, replacement) {
  if (!source || !replacement) return replacement;
  if (source === source.toLocaleUpperCase("vi") && source !== source.toLocaleLowerCase("vi")) {
    return replacement.toLocaleUpperCase("vi");
  }
  const chars = Array.from(source);
  if (chars[0] === chars[0]?.toLocaleUpperCase("vi") && chars.slice(1).join("") === chars.slice(1).join("").toLocaleLowerCase("vi")) {
    const output = Array.from(replacement);
    return (output.shift()?.toLocaleUpperCase("vi") || "") + output.join("");
  }
  return replacement;
}

/**
 * Pure correction step used by the DOM controller and unit tests.
 * It only sees the text node containing the caret, so formatting outside that
 * node is never flattened or rewritten.
 */
export function computeAutoCorrection(text, caretOffset, options = {}) {
  const settings = normalizeAutoCorrectSettings(options.settings);
  if (!settings.enabled || typeof text !== "string") return null;
  let caret = Math.max(0, Math.min(text.length, Number(caretOffset) || 0));
  let output = text;
  const inputData = String(options.inputData ?? "");
  const reasons = [];

  const apply = (start, end, replacement, reason) => {
    const next = replaceRange(output, start, end, replacement, caret);
    output = next.text;
    caret = next.caretOffset;
    reasons.push(reason);
  };

  if (settings.smartQuotes && (inputData === '"' || inputData === "'") && caret > 0) {
    const quoteIndex = caret - 1;
    const previous = output[quoteIndex - 1] || "";
    const opening = quoteIndex === 0 || OPEN_QUOTE_CONTEXT.test(previous);
    const quote = inputData === '"' ? (opening ? "“" : "”") : (opening ? "‘" : "’");
    apply(quoteIndex, caret, quote, "smartQuote");
  }

  const beforeCaret = () => output.slice(0, caret);
  if (settings.smartDashes && beforeCaret().endsWith("--")) {
    apply(caret - 2, caret, "–", "enDash");
  }
  if (settings.fractions && beforeCaret().endsWith("1/2")) {
    apply(caret - 3, caret, "½", "fraction");
  }

  const boundary = inputData.length === 1 && WORD_BOUNDARY.test(inputData);
  if (settings.replaceText) {
    const replacements = normalizeAutoCorrectReplacements(options.replacements);
    const boundaryLength = boundary ? inputData.length : 0;
    const tokenEnd = caret - boundaryLength;
    const prefix = output.slice(0, tokenEnd);
    const ordered = [...replacements].sort((a, b) => b.from.length - a.from.length);
    for (const entry of ordered) {
      const fullPrefix = output.slice(0, caret);
      const includesTypedBoundary = fullPrefix.slice(-entry.from.length).toLocaleLowerCase("vi")
        === entry.from.toLocaleLowerCase("vi");
      const candidate = includesTypedBoundary
        ? fullPrefix.slice(-entry.from.length)
        : prefix.slice(-entry.from.length);
      if (candidate.toLocaleLowerCase("vi") !== entry.from.toLocaleLowerCase("vi")) continue;
      const end = includesTypedBoundary ? caret : tokenEnd;
      const start = end - entry.from.length;
      const previous = output[start - 1] || "";
      if (/^[\p{L}\p{N}_]/u.test(entry.from) && previous && /[\p{L}\p{N}_]/u.test(previous)) continue;
      apply(start, end, caseMatchedReplacement(candidate, entry.to), "replacement");
      break;
    }
  }

  if (settings.capitalizeSentences && boundary) {
    const delimiterLength = inputData.length;
    const contentEnd = caret - delimiterLength;
    const content = output.slice(0, contentEnd);
    const wordMatch = content.match(/([\p{L}][\p{L}\p{M}'’\-]*)$/u);
    if (wordMatch) {
      const word = wordMatch[1];
      const wordStart = contentEnd - word.length;
      const earlier = output.slice(0, wordStart).trimEnd();
      const beginsSentence = !earlier || SENTENCE_END.test(earlier.slice(-1));
      if (beginsSentence) {
        const chars = Array.from(word);
        const first = chars.shift();
        const capitalized = (first?.toLocaleUpperCase("vi") || "") + chars.join("");
        if (capitalized !== word) apply(wordStart, contentEnd, capitalized, "capitalizeSentence");
      }
    }
  }

  return reasons.length ? { text: output, caretOffset: caret, reasons } : null;
}

export class WriterAutoCorrectController {
  constructor(options = {}) {
    this.getSettings = options.getSettings || (() => DEFAULT_AUTO_CORRECT_SETTINGS);
    this.getReplacements = options.getReplacements || (() => DEFAULT_AUTO_CORRECT_REPLACEMENTS);
    this.onCorrect = options.onCorrect || null;
    this._roots = [];
    this._listeners = [];
    this._composing = new WeakSet();
  }

  attach(roots) {
    this.destroy();
    this._roots = (Array.isArray(roots) ? roots : [roots]).filter(Boolean);
    for (const root of this._roots) {
      const onCompositionStart = () => this._composing.add(root);
      const onCompositionEnd = () => this._composing.delete(root);
      const onInput = event => this._handleInput(root, event);
      root.addEventListener?.("compositionstart", onCompositionStart);
      root.addEventListener?.("compositionend", onCompositionEnd);
      root.addEventListener?.("input", onInput);
      this._listeners.push(() => {
        root.removeEventListener?.("compositionstart", onCompositionStart);
        root.removeEventListener?.("compositionend", onCompositionEnd);
        root.removeEventListener?.("input", onInput);
      });
    }
    return this;
  }

  destroy() {
    for (const remove of this._listeners) remove();
    this._listeners = [];
    this._roots = [];
  }

  _handleInput(root, event) {
    if (event?.isComposing || this._composing.has(root)) return false;
    if ((event?.inputType || "insertText") !== "insertText") return false;
    const inputData = event?.data;
    if (typeof inputData !== "string" || inputData.length !== 1) return false;
    const selection = typeof window !== "undefined" ? window.getSelection?.() : null;
    const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
    const node = range?.startContainer;
    if (!range?.collapsed || !node || node.nodeType !== Node.TEXT_NODE || !root.contains?.(node)) return false;
    const correction = computeAutoCorrection(node.data, range.startOffset, {
      inputData,
      settings: this.getSettings(),
      replacements: this.getReplacements()
    });
    if (!correction) return false;
    node.data = correction.text;
    range.setStart(node, Math.min(correction.caretOffset, node.data.length));
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    this.onCorrect?.(correction);
    return true;
  }
}
