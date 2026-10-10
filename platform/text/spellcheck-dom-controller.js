import { globalImeTracker } from "../keyboard/input-normalizer.js";

const MARKER_SELECTOR = "[data-vno-spelling-uncertain]";
const EDITABLE_BLOCK_SELECTOR = "p,li,td,th,h1,h2,h3,h4,h5,h6,blockquote,pre";

function pointBlock(root, node) {
  const element = node?.nodeType === 1 ? node : node?.parentElement;
  const block = element?.closest?.(EDITABLE_BLOCK_SELECTOR);
  return block && root.contains(block) ? block : root;
}

function childPath(root, element) {
  const path = [];
  let current = element;
  while (current && current !== root) {
    const parent = current.parentNode;
    if (!parent) return null;
    const index = Array.prototype.indexOf.call(parent.childNodes, current);
    if (index < 0) return null;
    path.unshift(index);
    current = parent;
  }
  return current === root ? path : null;
}

function resolvePath(root, path) {
  let current = root;
  for (const index of path || []) {
    current = current?.childNodes?.[index] || null;
    if (!current) return null;
  }
  return current;
}

function textLength(node) {
  if (node.nodeType === 3) return node.data.length;
  if (node.nodeType === 1 && node.tagName === "BR") return 1;
  let length = 0;
  for (const child of node.childNodes || []) length += textLength(child);
  return length;
}

function offsetBeforePoint(block, target, targetOffset) {
  let found = false;
  const measure = node => {
    if (node === target) {
      found = true;
      if (node.nodeType === 3) return Math.max(0, Math.min(node.data.length, targetOffset));
      let length = 0;
      const children = node.childNodes || [];
      for (let index = 0; index < Math.min(targetOffset, children.length); index++) {
        length += textLength(children[index]);
      }
      return length;
    }
    if (node.nodeType === 3) return node.data.length;
    if (node.nodeType === 1 && node.tagName === "BR") return 1;
    let length = 0;
    for (const child of node.childNodes || []) {
      const part = measure(child);
      length += part;
      if (found) break;
    }
    return length;
  };
  const offset = measure(block);
  return found ? offset : null;
}

function capturePoint(root, node, offset) {
  if (!node || !root.contains(node)) return null;
  const block = pointBlock(root, node);
  const path = childPath(root, block);
  const textOffset = offsetBeforePoint(block, node, offset);
  return path && textOffset !== null ? { path, offset: textOffset } : null;
}

function restorePoint(root, point) {
  if (!point) return null;
  const block = resolvePath(root, point.path);
  if (!block) return null;
  let remaining = Math.max(0, point.offset);
  let result = null;
  const visit = node => {
    if (result) return;
    if (node.nodeType === 3) {
      if (remaining <= node.data.length) result = { node, offset: remaining };
      else remaining -= node.data.length;
      return;
    }
    if (node.nodeType === 1 && node.tagName === "BR") {
      const parent = node.parentNode;
      const index = Array.prototype.indexOf.call(parent.childNodes, node);
      if (remaining === 0) result = { node: parent, offset: index };
      else {
        remaining -= 1;
        if (remaining === 0) result = { node: parent, offset: index + 1 };
      }
      return;
    }
    for (const child of node.childNodes || []) {
      visit(child);
      if (result) return;
    }
  };
  visit(block);
  return result || { node: block, offset: (block.childNodes || []).length };
}

export function captureSelectionBookmark(root) {
  if (typeof document !== "undefined" && document.activeElement !== root && !root.contains(document.activeElement)) {
    return null;
  }
  const selection = globalThis.getSelection?.();
  if (!selection?.rangeCount || !root.contains(selection.anchorNode) || !root.contains(selection.focusNode)) return null;
  const anchor = capturePoint(root, selection.anchorNode, selection.anchorOffset);
  const focus = capturePoint(root, selection.focusNode, selection.focusOffset);
  return anchor && focus ? { anchor, focus, collapsed: selection.isCollapsed } : null;
}

export function restoreSelectionBookmark(root, bookmark) {
  if (!bookmark) return;
  if (typeof document !== "undefined" && document.activeElement !== root && !root.contains(document.activeElement)) {
    return;
  }
  const anchor = restorePoint(root, bookmark.anchor);
  const focus = restorePoint(root, bookmark.focus);
  if (!anchor || !focus) return;
  const selection = globalThis.getSelection?.();
  if (!selection) return;
  if (typeof selection.setBaseAndExtent === "function") {
    selection.setBaseAndExtent(anchor.node, anchor.offset, focus.node, focus.offset);
    return;
  }
  const range = document.createRange();
  range.setStart(anchor.node, anchor.offset);
  range.setEnd(focus.node, focus.offset);
  selection.removeAllRanges();
  selection.addRange(range);
}

const PENDING_STYLE_CHECKS = [
  ["bold", (cs) => (parseInt(cs.fontWeight, 10) || 400) >= 600 || cs.fontWeight === "bold"],
  ["italic", (cs) => cs.fontStyle === "italic" || cs.fontStyle === "oblique"],
  ["underline", (cs) => String(cs.textDecorationLine || cs.textDecoration || "").includes("underline")],
  ["strikeThrough", (cs) => String(cs.textDecorationLine || cs.textDecoration || "").includes("line-through")]
];

/**
 * Người dùng bấm Ctrl+B/I/U khi con trỏ chưa chọn chữ: trình duyệt chỉ nhớ kiểu "sắp gõ" (chưa có thẻ nào trong DOM).
 * Đặt lại vùng chọn sau khi bọc/gỡ thẻ gạch đỏ chính tả sẽ xóa kiểu này, nên chữ gõ tiếp không còn đậm/nghiêng/gạch chân.
 * Trả true khi trạng thái lệnh (queryCommandState) khác kiểu thực tế tại con trỏ — lúc đó phải hoãn quét chính tả.
 */
export function hasPendingTypingStyle(root, doc = typeof document !== "undefined" ? document : null, getSel = globalThis.getSelection) {
  try {
    const selection = getSel?.call(globalThis);
    if (!doc || typeof doc.queryCommandState !== "function" || !selection?.rangeCount || !selection.isCollapsed) return false;
    const anchor = selection.anchorNode;
    if (!anchor || !root?.contains?.(anchor)) return false;
    const element = anchor.nodeType === 1 ? anchor : anchor.parentElement;
    if (!element || typeof globalThis.getComputedStyle !== "function") return false;
    const style = globalThis.getComputedStyle(element);
    for (const [command, actual] of PENDING_STYLE_CHECKS) {
      if (Boolean(doc.queryCommandState(command)) !== Boolean(actual(style))) return true;
    }
  } catch (_) {
    return false;
  }
  return false;
}

function unwrapMarkers(root) {
  if (!root || typeof root.querySelectorAll !== "function") return;
  const doc = root.ownerDocument || (typeof document !== "undefined" ? document : null);
  for (const marker of root.querySelectorAll(MARKER_SELECTOR)) {
    // A marker can hold formatting the user applied to the word (<b>, <i>, styled <span>): move the children out
    // instead of flattening to text, otherwise bolding an "uncertain" word lost its bold on the next refresh.
    const hasFormatting = Boolean(marker.firstElementChild);
    if (hasFormatting && marker.parentNode && typeof marker.parentNode.insertBefore === "function") {
      while (marker.firstChild) marker.parentNode.insertBefore(marker.firstChild, marker);
      marker.parentNode.removeChild(marker);
      continue;
    }
    const textNode = doc?.createTextNode ? doc.createTextNode(marker.textContent) : marker.textContent;
    marker.replaceWith(textNode);
  }
  if (typeof root.normalize === "function") root.normalize();
}

function isEligibleTextNode(node, root) {
  const parent = node.parentElement;
  return Boolean(node.data.trim()) && parent && root.contains(parent) &&
    !parent.closest("script, style, [contenteditable='false'], [data-vno-spelling-uncertain]");
}

export const SPELLCHECK_ENABLED_KEY = "vno-spellcheck-enabled";

export function isSpellcheckEnabled() {
  if (typeof localStorage === "undefined") return true;
  const val = localStorage.getItem(SPELLCHECK_ENABLED_KEY);
  return val === null ? true : val !== "false";
}

export function setSpellcheckEnabled(enabled) {
  const bool = Boolean(enabled);
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(SPELLCHECK_ENABLED_KEY, String(bool));
    } catch (_) {}
  }
  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(new CustomEvent("vno:spellcheck-toggle", { detail: { enabled: bool } }));
    } catch (_) {}
  }
}

export class SpellcheckDomController {
  constructor({ roots, checker, debounceMs = 400, onReplace = null, enabled = undefined }) {
    this.roots = [...roots];
    this.checker = checker;
    this.debounceMs = debounceMs;
    this.onReplace = onReplace;
    this.enabled = enabled !== undefined ? Boolean(enabled) : isSpellcheckEnabled();
    this.timer = null;
    this.menu = null;
    this._focusBeforeMenu = null;
    this._dirtyBlocks = new Set();
    this._needFull = true;
    this._onInput = () => { this._markDirtyFromSelection(); this.schedule(); };
    this._onContextMenu = event => this._handleContextMenu(event);
    this._onDocumentPointer = event => {
      if (this.menu && !this.menu.contains(event.target)) this.closeMenu();
    };
    this._onToggleEvent = (e) => {
      if (typeof e.detail?.enabled === "boolean") {
        this.setEnabled(e.detail.enabled);
      }
    };
  }

  setEnabled(enabled) {
    const next = Boolean(enabled);
    if (this.enabled === next) return;
    this.enabled = next;
    if (!this.enabled) {
      clearTimeout(this.timer);
      this.closeMenu();
      for (const root of this.roots) {
        unwrapMarkers(root);
      }
    } else {
      this.refresh();
    }
  }

  addRoot(root) {
    if (!root || this.roots.includes(root)) return;
    this.roots.push(root);
    root.addEventListener?.("input", this._onInput);
    root.addEventListener?.("contextmenu", this._onContextMenu);
    if (this._onShiftF10) root.addEventListener?.("keydown", this._onShiftF10);
    if (this.enabled) this._refreshRoot(root);
  }

  removeRoot(root) {
    const idx = this.roots.indexOf(root);
    if (idx < 0) return;
    this.roots.splice(idx, 1);
    root.removeEventListener?.("input", this._onInput);
    root.removeEventListener?.("contextmenu", this._onContextMenu);
    if (this._onShiftF10) root.removeEventListener?.("keydown", this._onShiftF10);
    unwrapMarkers(root);
  }

  attach() {
    this._onShiftF10 = (event) => {
      if (event.key === "F10" && event.shiftKey) {
        // Tìm marker tại vị trí con trỏ hiện tại (nếu có)
        const selection = globalThis.getSelection?.();
        if (!selection?.rangeCount) return;
        const node = selection.anchorNode;
        const marker = node?.parentElement?.closest?.(MARKER_SELECTOR);
        if (!marker) return;
        event.preventDefault();
        this._focusBeforeMenu = document.activeElement;
        const rect = marker.getBoundingClientRect();
        this.openMenu(marker, rect.left, rect.bottom + 2);
      }
    };
    for (const root of this.roots) {
      root.addEventListener?.("input", this._onInput);
      root.addEventListener?.("contextmenu", this._onContextMenu);
      root.addEventListener?.("keydown", this._onShiftF10);
    }
    this._burstUnsubscribe = globalImeTracker.onBurstStateChange(active => {
      if (!active) this.schedule(this.debounceMs);
    });
    if (typeof document !== "undefined") document.addEventListener?.("pointerdown", this._onDocumentPointer);
    if (typeof window !== "undefined") window.addEventListener?.("vno:spellcheck-toggle", this._onToggleEvent);
    if (this.enabled) {
      this.schedule(0);
    } else {
      for (const root of this.roots) unwrapMarkers(root);
    }
    return this;
  }

  destroy() {
    clearTimeout(this.timer);
    this._burstUnsubscribe?.();
    for (const root of this.roots) {
      root.removeEventListener?.("input", this._onInput);
      root.removeEventListener?.("contextmenu", this._onContextMenu);
      root.removeEventListener?.("keydown", this._onShiftF10);
    }
    if (typeof document !== "undefined") document.removeEventListener?.("pointerdown", this._onDocumentPointer);
    if (typeof window !== "undefined") window.removeEventListener?.("vno:spellcheck-toggle", this._onToggleEvent);
    this.closeMenu();
  }

  schedule(delay = this.debounceMs) {
    clearTimeout(this.timer);
    if (!this.enabled) return;
    if (globalImeTracker.isBurstActive()) {
      // Defer until burst ends
      return;
    }
    this.timer = setTimeout(() => this._refreshPending(), delay);
  }

  /** Khối (đoạn, mục, ô…) chứa con trỏ: chỉ khối này cần kiểm tra lại sau khi gõ. */
  _markDirtyFromSelection() {
    const selection = globalThis.getSelection?.();
    let node = selection?.anchorNode;
    if (!node) { this._needFull = true; return; }
    if (node.nodeType === 3) node = node.parentElement;
    const root = this.roots.find((candidate) => candidate.contains?.(node));
    const block = node?.closest?.("p,li,td,th,h1,h2,h3,h4,h5,h6,blockquote,div");
    if (!root || !block || block === root || !root.contains(block)) { this._needFull = true; return; }
    this._dirtyBlocks.add(block);
  }

  /** Gõ phím: chỉ kiểm tra lại vài khối đã đổi (tài liệu 160 trang: toàn bộ mất ~1 s và làm bố cục lại cả tài liệu). */
  _refreshPending() {
    if (!this.enabled) return;
    if (globalImeTracker.isBurstActive()) return;
    const blocks = [...this._dirtyBlocks].filter((block) => block.isConnected !== false);
    const full = this._needFull || !blocks.length || blocks.length > 6;
    this._dirtyBlocks.clear();
    this._needFull = false;
    if (full) { for (const root of this.roots) this._refreshRoot(root); return; }
    for (const block of blocks) {
      const root = this.roots.find((candidate) => candidate.contains?.(block));
      if (root) this._refreshScope(root, block);
    }
  }

  refresh() {
    if (!this.enabled) return;
    if (globalImeTracker.isBurstActive()) {
      return;
    }
    this._dirtyBlocks.clear();
    this._needFull = false;
    for (const root of this.roots) this._refreshRoot(root);
  }

  _refreshRoot(root) {
    this._refreshScope(root, root);
  }

  _refreshScope(root, scope) {
    const doc = root?.ownerDocument || (typeof document !== "undefined" ? document : null);
    if (!doc || typeof doc.createTreeWalker !== "function") return;
    const NodeFilterObj = globalThis.NodeFilter || { SHOW_TEXT: 4 };
    // Đang có kiểu "sắp gõ" (vừa bấm Ctrl+B/I/U chưa gõ chữ): đổi DOM + đặt lại vùng chọn sẽ làm mất nó. Lần gõ kế tiếp sẽ quét lại.
    if (hasPendingTypingStyle(root, doc)) return;
    const selection = captureSelectionBookmark(root);
    unwrapMarkers(scope);
    const walker = doc.createTreeWalker(scope, NodeFilterObj.SHOW_TEXT);
    const nodes = [];
    let node;
    while ((node = walker.nextNode())) if (isEligibleTextNode(node, root)) nodes.push(node);
    for (const textNode of nodes) {
      const issues = this.checker.checkText(textNode.data);
      if (!issues.length) continue;
      const fragment = doc.createDocumentFragment ? doc.createDocumentFragment() : [];
      let cursor = 0;
      for (const issue of issues) {
        fragment.append?.(textNode.data.slice(cursor, issue.start));
        const marker = doc.createElement ? doc.createElement("span") : {};
        marker.className = "vno-spelling-uncertain";
        if (marker.dataset) {
          marker.dataset.vnoSpellingUncertain = issue.normalized;
        }
        marker.setAttribute?.("data-vno-spelling-uncertain", issue.normalized);
        marker.setAttribute?.("aria-label", `${issue.word}: từ chưa chắc chắn`);
        marker.textContent = textNode.data.slice(issue.start, issue.end);
        fragment.append?.(marker);
        cursor = issue.end;
      }
      fragment.append?.(textNode.data.slice(cursor));
      textNode.replaceWith?.(fragment);
    }
    restoreSelectionBookmark(root, selection);
  }

  _handleContextMenu(event) {
    const marker = event.target.closest?.(MARKER_SELECTOR);
    if (!marker) return;
    event.preventDefault();
    this._focusBeforeMenu = document.activeElement;
    this.openMenu(marker, event.clientX, event.clientY);
  }

  openMenu(marker, x, y) {
    this.closeMenu();
    const word = marker.textContent;

    let contextPrev = "";
    const parentBlock = marker.closest?.("p,li,td,th,h1,h2,h3,h4,h5,h6,blockquote,div");
    if (parentBlock) {
      const fullText = parentBlock.textContent || "";
      const markerIndex = fullText.indexOf(word);
      if (markerIndex > 0) {
        const textBefore = fullText.slice(0, markerIndex).trim();
        const match = textBefore.match(/[\p{L}\p{M}]+$/u);
        if (match) contextPrev = match[0];
      }
    }

    const menu = document.createElement("div");
    menu.className = "vno-spellcheck-menu";
    menu.setAttribute("role", "menu");
    menu.setAttribute("aria-label", `Gợi ý chính tả cho ${word}`);
    const suggestions = this.checker.suggest(word, { contextPrev });
    for (const suggestion of suggestions) {
      this._appendAction(menu, suggestion, () => {
        this.applySuggestion(marker, suggestion);
      }, "vno-spellcheck-suggestion");
    }
    if (suggestions.length) menu.append(document.createElement("hr"));
    this._appendAction(menu, "Bỏ qua", () => {
      this.checker.ignore(word);
      this.closeMenu();
      this.refresh();
    });
    this._appendAction(menu, "Thêm vào từ điển", () => {
      this.checker.addToPersonalDictionary(word);
      this.closeMenu();
      this.refresh();
    }, "vno-spellcheck-add");
    const clampedX = Math.max(4, Math.min(x, (typeof window !== "undefined" ? window.innerWidth : 1200) - 220));
    const clampedY = Math.max(4, Math.min(y, (typeof window !== "undefined" ? window.innerHeight : 800) - 180));
    menu.style.left = `${clampedX}px`;
    menu.style.top = `${clampedY}px`;
    menu.addEventListener("keydown", (e) => {
      const items = [...menu.querySelectorAll("button[role='menuitem']")];
      const focused = document.activeElement;
      const idx = items.indexOf(focused);
      if (e.key === "Escape") {
        e.preventDefault();
        this.closeMenu();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = items[(idx + 1) % items.length];
        if (next) next.focus();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const prev = items[(idx - 1 + items.length) % items.length];
        if (prev) prev.focus();
      } else if (e.key === "Home") {
        e.preventDefault();
        if (items[0]) items[0].focus();
      } else if (e.key === "End") {
        e.preventDefault();
        if (items.length) items[items.length - 1].focus();
      }
    });
    document.body.append(menu);
    this.menu = menu;
    menu.querySelector("button")?.focus();
  }

  _appendAction(menu, label, action, className = "") {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.setAttribute("role", "menuitem");
    button.textContent = label;
    button.addEventListener("click", action);
    menu.append(button);
  }

  applySuggestion(marker, suggestion) {
    if (!marker || !marker.isConnected) return;
    const word = marker.textContent;
    const parent = marker.parentElement;
    const root = this.roots.find(r => r.contains(marker)) || parent?.closest?.("[contenteditable]") || parent;

    const textBefore = root?.innerText || root?.textContent || "";
    const htmlBefore = root?.innerHTML || "";

    // 1. Snapshot trước khi sửa cho normalizer nếu có
    const normalizer = root?._vnoNormalizer;
    if (normalizer && typeof normalizer._recordWordSnapshot === "function") {
      if (normalizer._burstSettleTimer) {
        clearTimeout(normalizer._burstSettleTimer);
        normalizer._burstSettleTimer = null;
      }
      normalizer._recordWordSnapshot();
    }

    // 2. Thực hiện thay thế: ưu tiên execCommand('insertText') để có native undo nếu được
    let replacedWithExec = false;
    const selection = globalThis.getSelection?.();
    if (selection && typeof document !== "undefined") {
      try {
        const range = document.createRange();
        range.selectNode(marker);
        selection.removeAllRanges();
        selection.addRange(range);
        replacedWithExec = document.execCommand?.("insertText", false, suggestion);
      } catch (_) {
        replacedWithExec = false;
      }
    }

    if (!replacedWithExec) {
      const doc = marker.ownerDocument || (typeof document !== "undefined" ? document : null);
      const textNode = doc?.createTextNode ? doc.createTextNode(suggestion) : suggestion;
      marker.replaceWith(textNode);
      if (parent && typeof Event !== "undefined") {
        parent.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }

    const textAfter = root?.innerText || root?.textContent || "";
    const htmlAfter = root?.innerHTML || "";

    // 3. Snapshot sau khi sửa cho normalizer ngay lập tức (không chờ timer 60ms)
    if (normalizer && typeof normalizer._recordWordSnapshot === "function") {
      normalizer.normalizeNow?.();
      normalizer._recordWordSnapshot();
    }

    // 4. Gọi hook onReplace cho app
    if (typeof this.onReplace === "function") {
      try {
        this.onReplace({
          marker, suggestion, word, root,
          textBefore, textAfter, htmlBefore, htmlAfter
        });
      } catch (err) {
        console.warn("[SpellcheckDomController] onReplace callback error:", err);
      }
    }

    this.closeMenu();
    this.schedule(0);
  }

  closeMenu() {
    this.menu?.remove();
    this.menu = null;
    // Trả focus về vùng soạn thảo trước khi mở menu để phím mũi tên hoạt động lại
    if (this._focusBeforeMenu && typeof this._focusBeforeMenu.focus === "function") {
      try { this._focusBeforeMenu.focus(); } catch (_) { /* ignore */ }
    }
    this._focusBeforeMenu = null;
  }
}
