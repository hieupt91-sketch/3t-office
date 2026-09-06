const MARKER_SELECTOR = "[data-vno-spelling-uncertain]";

function selectionOffset(root) {
  if (typeof document !== "undefined" && document.activeElement !== root && !root.contains(document.activeElement)) {
    return null;
  }
  const selection = globalThis.getSelection?.();
  if (!selection?.rangeCount || !root.contains(selection.anchorNode)) return null;
  const range = document.createRange();
  range.selectNodeContents(root);
  range.setEnd(selection.anchorNode, selection.anchorOffset);
  return range.toString().length;
}

function restoreSelection(root, offset) {
  if (offset === null) return;
  if (typeof document !== "undefined" && document.activeElement !== root && !root.contains(document.activeElement)) {
    return;
  }
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let remaining = offset;
  let node;
  while ((node = walker.nextNode())) {
    if (remaining <= node.data.length) {
      const range = document.createRange();
      range.setStart(node, remaining);
      range.collapse(true);
      const selection = getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      return;
    }
    remaining -= node.data.length;
  }
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
    document.addEventListener("pointerdown", this._onDocumentPointer);
    this.schedule(0);
    return this;
  }

  destroy() {
    clearTimeout(this.timer);
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
    this.timer = setTimeout(() => this.refresh(), delay);
  }

  refresh() {
    for (const root of this.roots) this._refreshRoot(root);
  }

  _refreshRoot(root) {
    const caret = selectionOffset(root);
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
    restoreSelection(root, caret);
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
