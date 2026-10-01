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

function unwrapMarkers(root) {
  for (const marker of root.querySelectorAll(MARKER_SELECTOR)) marker.replaceWith(document.createTextNode(marker.textContent));
  root.normalize();
}

function isEligibleTextNode(node, root) {
  const parent = node.parentElement;
  return Boolean(node.data.trim()) && parent && root.contains(parent) &&
    !parent.closest("script, style, [contenteditable='false'], [data-vno-spelling-uncertain]");
}

export class SpellcheckDomController {
  constructor({ roots, checker, debounceMs = 400 }) {
    this.roots = [...roots];
    this.checker = checker;
    this.debounceMs = debounceMs;
    this.timer = null;
    this.menu = null;
    this._focusBeforeMenu = null;
    this._onInput = () => this.schedule();
    this._onContextMenu = event => this._handleContextMenu(event);
    this._onDocumentPointer = event => {
      if (this.menu && !this.menu.contains(event.target)) this.closeMenu();
    };
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
      root.addEventListener("input", this._onInput);
      root.addEventListener("contextmenu", this._onContextMenu);
      root.addEventListener("keydown", this._onShiftF10);
    }
    this._burstUnsubscribe = globalImeTracker.onBurstStateChange(active => {
      if (!active) this.schedule(this.debounceMs);
    });
    document.addEventListener("pointerdown", this._onDocumentPointer);
    this.schedule(0);
    return this;
  }

  destroy() {
    clearTimeout(this.timer);
    this._burstUnsubscribe?.();
    for (const root of this.roots) {
      root.removeEventListener("input", this._onInput);
      root.removeEventListener("contextmenu", this._onContextMenu);
      root.removeEventListener("keydown", this._onShiftF10);
    }
    document.removeEventListener("pointerdown", this._onDocumentPointer);
    this.closeMenu();
  }

  schedule(delay = this.debounceMs) {
    clearTimeout(this.timer);
    if (globalImeTracker.isBurstActive()) {
      // Defer until burst ends
      return;
    }
    this.timer = setTimeout(() => this.refresh(), delay);
  }

  refresh() {
    if (globalImeTracker.isBurstActive()) {
      return;
    }
    for (const root of this.roots) this._refreshRoot(root);
  }

  _refreshRoot(root) {
    const selection = captureSelectionBookmark(root);
    unwrapMarkers(root);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    let node;
    while ((node = walker.nextNode())) if (isEligibleTextNode(node, root)) nodes.push(node);
    for (const textNode of nodes) {
      const issues = this.checker.checkText(textNode.data);
      if (!issues.length) continue;
      const fragment = document.createDocumentFragment();
      let cursor = 0;
      for (const issue of issues) {
        fragment.append(textNode.data.slice(cursor, issue.start));
        const marker = document.createElement("span");
        marker.className = "vno-spelling-uncertain";
        marker.dataset.vnoSpellingUncertain = issue.normalized;
        marker.setAttribute("aria-label", `${issue.word}: từ chưa chắc chắn`);
        marker.textContent = textNode.data.slice(issue.start, issue.end);
        fragment.append(marker);
        cursor = issue.end;
      }
      fragment.append(textNode.data.slice(cursor));
      textNode.replaceWith(fragment);
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
    const menu = document.createElement("div");
    menu.className = "vno-spellcheck-menu";
    menu.setAttribute("role", "menu");
    menu.setAttribute("aria-label", `Gợi ý chính tả cho ${word}`);
    const suggestions = this.checker.suggest(word);
    for (const suggestion of suggestions) {
      this._appendAction(menu, suggestion, () => {
        marker.replaceWith(document.createTextNode(suggestion));
        this.closeMenu();
        this.schedule(0);
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
