/**
 * Platform Shared Input Normalizer for Vietnamese Typing (Unikey, EVKey, Windows IME)
 *
 * Responsibilities:
 * 1. Coalesces rapid Backspace-then-insert bursts from Vietnamese IMEs into atomic edits.
 * 2. Defers spellcheck, autocorrect, and formula autocomplete while an IME burst is in progress.
 * 3. Enforces Unicode NFC normalization on commit (space, Enter, Tab, blur, settling).
 * 4. Preserves exact caret position across NFC normalization.
 * 5. Provides consistent 1-step word-boundary Undo (Ctrl+Z removes only the last word/chunk).
 * 6. Shared across Doc, Sheet, and Slide without copy-pasting.
 */

// Window in ms within which Backspace + replacement events are considered part of an IME burst
export const IME_BURST_WINDOW_MS = 60;

// Set of characters that delimit words in Vietnamese text
const WORD_DELIMITERS = new Set([" ", "\t", "\n", "\r", ".", ",", ";", ":", "!", "?", "-", "(", ")", "[", "]", "{", "}", "\"", "'", "/", "\\"]);

/**
 * Checks if a string contains decomposed (NFD) combining characters
 */
export function hasDecomposedDiacritics(str) {
  if (!str) return false;
  // Unicode combining mark category
  return /\p{M}/u.test(str);
}

/**
 * Normalizes a string to Unicode NFC
 */
export function toNfc(str) {
  return typeof str === "string" ? str.normalize("NFC") : str;
}

/**
 * Global tracker for IME burst state across the application
 */
class GlobalImeTracker {
  constructor() {
    this._burstActive = false;
    this._burstTimer = null;
    this._listeners = new Set();
  }

  isBurstActive() {
    return this._burstActive;
  }

  notifyBurstStart() {
    const wasActive = this._burstActive;
    this._burstActive = true;
    if (this._burstTimer) {
      clearTimeout(this._burstTimer);
      this._burstTimer = null;
    }
    if (!wasActive) {
      for (const fn of this._listeners) {
        try { fn(true); } catch {}
      }
    }
  }

  scheduleBurstEnd(delayMs = IME_BURST_WINDOW_MS) {
    if (this._burstTimer) clearTimeout(this._burstTimer);
    this._burstTimer = setTimeout(() => {
      this._burstActive = false;
      this._burstTimer = null;
      for (const fn of this._listeners) {
        try { fn(false); } catch {}
      }
    }, delayMs);
  }

  onBurstStateChange(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }
}

export const globalImeTracker = new GlobalImeTracker();

/**
 * Normalizes text in an <input> or <textarea> element to NFC while accurately preserving caret position.
 */
export function normalizeInputNfc(inputEl) {
  if (!inputEl || typeof inputEl.value !== "string") return false;
  const original = inputEl.value;
  const normalized = original.normalize("NFC");
  if (original === normalized) return false;

  const start = inputEl.selectionStart ?? original.length;
  const end = inputEl.selectionEnd ?? original.length;
  const normStart = original.slice(0, start).normalize("NFC").length;
  const normEnd = original.slice(0, end).normalize("NFC").length;

  inputEl.value = normalized;
  if (typeof inputEl.setSelectionRange === "function") {
    inputEl.setSelectionRange(normStart, normEnd);
  }
  return true;
}

/**
 * Normalizes text in a ContentEditable element to NFC while accurately preserving caret position.
 */
export function normalizeContentEditableNfc(root) {
  if (!root || typeof window === "undefined") return false;
  const sel = window.getSelection?.();
  if (!sel || !sel.rangeCount) return false;

  const range = sel.getRangeAt(0);
  const node = range.startContainer;
  if (!node) return false;

  if (node.nodeType === Node.TEXT_NODE) {
    const origText = node.data;
    const normText = origText.normalize("NFC");
    if (origText !== normText) {
      const origOffset = range.startOffset;
      const normOffset = origText.slice(0, origOffset).normalize("NFC").length;
      node.data = normText;
      range.setStart(node, Math.min(normOffset, normText.length));
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
      return true;
    }
  } else if (node.nodeType === Node.ELEMENT_NODE) {
    // Check all descendant text nodes
    let modified = false;
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    let current;
    while ((current = walker.nextNode())) {
      const orig = current.data;
      const norm = orig.normalize("NFC");
      if (orig !== norm) {
        current.data = norm;
        modified = true;
      }
    }
    return modified;
  }
  return false;
}

/**
 * Finds the word range before caret in a plain string.
 * Returns { start, end, word } of the word immediately preceding the caret.
 */
export function findLastWordBeforeCaret(text, caretPos) {
  if (!text || caretPos <= 0) return null;
  const before = text.slice(0, caretPos);
  let end = before.length;
  // Skip trailing spaces
  while (end > 0 && WORD_DELIMITERS.has(before[end - 1])) {
    end--;
  }
  if (end === 0) return null;
  let start = end;
  while (start > 0 && !WORD_DELIMITERS.has(before[start - 1])) {
    start--;
  }
  return {
    start,
    end,
    word: before.slice(start, end)
  };
}

/**
 * InputNormalizer Controller: attaches to an editable element (contenteditable, input, or textarea).
 * Manages burst coalescing, NFC normalization, and consistent 1-step undo.
 */
export class InputNormalizer {
  constructor(options = {}) {
    this.target = options.target || null;
    this.onWordCommit = options.onWordCommit || null;
    this.onUndo = options.onUndo || null;
    this.customUndoStack = [];
    this.maxUndoSteps = options.maxUndoSteps || 50;

    this._lastBackspaceTime = 0;
    this._burstSettleTimer = null;
    this._listeners = [];
  }

  attach(element) {
    if (!element) return this;
    this.target = element;
    element._vnoNormalizer = this;

    // 1. Keydown listener: detect Backspace bursts and handle word-level Ctrl+Z
    const onKeyDown = (e) => {
      if (e.key === "Backspace") {
        const now = Date.now();
        const delta = now - this._lastBackspaceTime;
        this._lastBackspaceTime = now;
        // Start or continue burst
        globalImeTracker.notifyBurstStart();
        globalImeTracker.scheduleBurstEnd(IME_BURST_WINDOW_MS);
      } else if (e.key === "z" && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        // Handle 1-step word undo if registered
        if (this._handleCtrlZ(e)) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
      } else if (WORD_DELIMITERS.has(e.key) || e.key === "Enter") {
        // Word boundary reached: normalize NFC
        this._scheduleNormalizeAndSnapshot();
      }
    };

    // 2. Input listener: detect burst insertions and normalize
    const onInput = (e) => {
      const now = Date.now();
      if (now - this._lastBackspaceTime < IME_BURST_WINDOW_MS || globalImeTracker.isBurstActive()) {
        globalImeTracker.notifyBurstStart();
        globalImeTracker.scheduleBurstEnd(IME_BURST_WINDOW_MS);
      }

      if (this._burstSettleTimer) clearTimeout(this._burstSettleTimer);
      this._burstSettleTimer = setTimeout(() => {
        this.normalizeNow();
        this._recordWordSnapshot();
      }, IME_BURST_WINDOW_MS);
    };

    // 3. Composition events (TSF / Windows built-in IME)
    const onCompositionStart = () => globalImeTracker.notifyBurstStart();
    const onCompositionEnd = () => {
      globalImeTracker.scheduleBurstEnd(20);
      this.normalizeNow();
      this._recordWordSnapshot();
    };

    // 4. Blur: finalize normalization and snapshot
    const onBlur = () => {
      this.normalizeNow();
      this._recordWordSnapshot();
    };

    element.addEventListener("keydown", onKeyDown, true);
    element.addEventListener("input", onInput);
    element.addEventListener("compositionstart", onCompositionStart);
    element.addEventListener("compositionend", onCompositionEnd);
    element.addEventListener("blur", onBlur);

    this._listeners.push(
      () => element.removeEventListener("keydown", onKeyDown, true),
      () => element.removeEventListener("input", onInput),
      () => element.removeEventListener("compositionstart", onCompositionStart),
      () => element.removeEventListener("compositionend", onCompositionEnd),
      () => element.removeEventListener("blur", onBlur)
    );

    // Initial snapshot
    this._recordWordSnapshot();
    return this;
  }

  destroy() {
    if (this._burstSettleTimer) clearTimeout(this._burstSettleTimer);
    if (this.target && this.target._vnoNormalizer === this) delete this.target._vnoNormalizer;
    for (const remove of this._listeners) remove();
    this._listeners = [];
  }

  normalizeNow() {
    if (!this.target) return;
    if (this.target.isContentEditable || this.target.getAttribute?.("contenteditable") === "true") {
      normalizeContentEditableNfc(this.target);
    } else if (this.target.tagName === "INPUT" || this.target.tagName === "TEXTAREA") {
      normalizeInputNfc(this.target);
    }
  }

  _scheduleNormalizeAndSnapshot() {
    setTimeout(() => {
      this.normalizeNow();
      this._recordWordSnapshot();
    }, 10);
  }

  _getContents() {
    if (!this.target) return "";
    if (this.target.tagName === "INPUT" || this.target.tagName === "TEXTAREA") {
      return this.target.value;
    }
    return this.target.innerText || this.target.textContent || "";
  }

  _setContents(value) {
    if (!this.target) return;
    if (this.target.tagName === "INPUT" || this.target.tagName === "TEXTAREA") {
      this.target.value = value;
      this.target.setSelectionRange(value.length, value.length);
    } else {
      let p = this.target.querySelector?.("p") || this.target;
      p.textContent = value;
      if (typeof window !== "undefined" && typeof document !== "undefined") {
        const sel = window.getSelection?.();
        const range = document.createRange?.();
        if (sel && range) {
          range.selectNodeContents(p);
          range.collapse(false);
          sel.removeAllRanges();
          sel.addRange(range);
        }
      }
    }
  }

  _recordWordSnapshot() {
    const text = this._getContents().normalize("NFC");
    if (!text && this.customUndoStack.length === 0) return;
    const last = this.customUndoStack[this.customUndoStack.length - 1];
    if (last === text) return;

    this.customUndoStack.push(text);
    if (this.customUndoStack.length > this.maxUndoSteps) {
      this.customUndoStack.shift();
    }
    if (this.onWordCommit) {
      this.onWordCommit(text);
    }
  }

  _handleCtrlZ(e) {
    if (this.onUndo) {
      const handled = this.onUndo();
      if (handled) return true;
    }

    if (this.customUndoStack.length <= 1) return false;

    // Pop current state
    this.customUndoStack.pop();
    const prev = this.customUndoStack[this.customUndoStack.length - 1] ?? "";
    this._setContents(prev);
    this.normalizeNow();
    if (this.onWordCommit) {
      try { this.onWordCommit(prev); } catch {}
    }
    return true;
  }
}
