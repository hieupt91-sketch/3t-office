import { t } from "../../platform/i18n/i18n.js";
import { globalCommandBus } from "../../platform/commands/command-bus.js";

const NAVIGATION_COMMAND = "writer.view.navigationPane";
const STORAGE_KEY = "vno-writer-navigation-pane-open";
const HEADING_SELECTOR = "h1, h2, h3, h4, h5, h6, [data-vno-outline], [data-vno-auto-page-gap=\"true\"]";

export function normalizeNavigationText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLocaleLowerCase("vi")
    .replace(/\s+/g, " ")
    .trim();
}

export function getNavigationHeadingLevel(element) {
  const outline = Number(element?.dataset?.vnoOutline);
  if (Number.isFinite(outline) && outline >= 1 && outline <= 9) return Math.round(outline);
  const match = String(element?.tagName || "").match(/^H([1-6])$/i);
  return match ? Number(match[1]) : 0;
}

/**
 * Quét theo đúng thứ tự tài liệu. Dải phân trang đã có là dữ liệu suy ra của Writer,
 * nên chỉ cần đếm dải đứng trước tiêu đề và không phải đo/reflow lại trang.
 */
export function collectNavigationHeadings(root) {
  if (!root?.querySelectorAll) return [];
  let page = 1;
  const headings = [];
  let orderedNodes = [];
  try { orderedNodes = Array.from(root.querySelectorAll(HEADING_SELECTOR)); } catch { return []; }

  for (const element of orderedNodes) {
    if (element?.getAttribute?.("data-vno-auto-page-gap") === "true" || element?.classList?.contains?.("vno-page-auto-gap")) {
      page += 1;
      continue;
    }
    const level = getNavigationHeadingLevel(element);
    const text = String(element?.innerText ?? element?.textContent ?? "").replace(/\s+/g, " ").trim();
    if (!level || !text) continue;
    headings.push({ element, level, text, page });
  }

  return headings.map((item, index) => ({
    ...item,
    hasChildren: index + 1 < headings.length && headings[index + 1].level > item.level
  }));
}

export function getVisibleNavigationItems(items, collapsedIds = new Set(), query = "") {
  const list = Array.isArray(items) ? items : [];
  const normalizedQuery = normalizeNavigationText(query);
  if (normalizedQuery) {
    const included = new Set();
    list.forEach((item, index) => {
      if (!normalizeNavigationText(item.text).includes(normalizedQuery)) return;
      included.add(index);
      let wantedLevel = item.level;
      for (let parentIndex = index - 1; parentIndex >= 0 && wantedLevel > 1; parentIndex -= 1) {
        if (list[parentIndex].level < wantedLevel) {
          included.add(parentIndex);
          wantedLevel = list[parentIndex].level;
        }
      }
    });
    return list.filter((_, index) => included.has(index));
  }

  const visible = [];
  const collapsedLevels = [];
  for (const item of list) {
    while (collapsedLevels.length && item.level <= collapsedLevels.at(-1)) collapsedLevels.pop();
    if (!collapsedLevels.length) visible.push(item);
    if (collapsedIds.has(item.id)) collapsedLevels.push(item.level);
  }
  return visible;
}

export class WriterNavigationPane {
  constructor({ workspace, viewport, page, body, commandBus = globalCommandBus }) {
    this.workspace = workspace;
    this.viewport = viewport;
    this.page = page;
    this.body = body;
    this.commandBus = commandBus;
    this.element = null;
    this.searchInput = null;
    this.tree = null;
    this.status = null;
    this.items = [];
    this.visibleItems = [];
    this.collapsedIds = new Set();
    this.activeId = null;
    this.focusedId = null;
    this._elementIds = new WeakMap();
    this._nextId = 1;
    this._refreshTimer = null;
    this._selectionFrame = null;
    this._scanToken = 0;
    this._observer = null;
    this._isOpen = false;
    this._onInput = () => this.scheduleRefresh();
    this._onPagination = () => this.scheduleRefresh(0);
    this._onSelectionChange = () => this._scheduleActiveHeadingSync();
  }

  attach() {
    if (!this.workspace || !this.body || typeof document === "undefined") return this;
    this._buildUi();
    this.workspace.insertBefore(this.element, this.workspace.firstChild || null);
    this.commandBus.bindHandler(NAVIGATION_COMMAND, () => this.toggle());
    this.body.addEventListener?.("input", this._onInput);
    this.body.addEventListener?.("vno-pagination-updated", this._onPagination);
    document.addEventListener?.("selectionchange", this._onSelectionChange);
    if (typeof MutationObserver !== "undefined") {
      this._observer = new MutationObserver(() => this.scheduleRefresh());
      this._observer.observe(this.body, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ["data-vno-outline"]
      });
    }
    this.refresh();
    this.setOpen(this._readPersistedOpen(), { persist: false, focus: false });
    return this;
  }

  destroy() {
    this._scanToken += 1;
    if (this._refreshTimer) clearTimeout(this._refreshTimer);
    if (this._selectionFrame && typeof cancelAnimationFrame === "function") cancelAnimationFrame(this._selectionFrame);
    this._observer?.disconnect?.();
    this.body?.removeEventListener?.("input", this._onInput);
    this.body?.removeEventListener?.("vno-pagination-updated", this._onPagination);
    if (typeof document !== "undefined") document.removeEventListener?.("selectionchange", this._onSelectionChange);
    this.element?.remove?.();
    this.element = null;
  }

  isOpen() { return this._isOpen; }

  toggle(force) {
    return this.setOpen(typeof force === "boolean" ? force : !this._isOpen);
  }

  setOpen(open, { persist = true, focus = true } = {}) {
    this._isOpen = Boolean(open);
    if (this.element) {
      this.element.hidden = !this._isOpen;
      this.element.setAttribute("aria-hidden", String(!this._isOpen));
    }
    this.commandBus.updateState(NAVIGATION_COMMAND, { checked: this._isOpen });
    if (persist) this._persistOpen(this._isOpen);
    if (this._isOpen) {
      this.scheduleRefresh(0);
      if (focus) {
        const focusSearch = () => this.searchInput?.focus?.({ preventScroll: true });
        if (typeof requestAnimationFrame === "function") requestAnimationFrame(focusSearch);
        else setTimeout(focusSearch, 0);
      }
    } else if (focus) {
      this._focusDocument();
    }
    return this._isOpen;
  }

  scheduleRefresh(delay = null) {
    if (this._refreshTimer) clearTimeout(this._refreshTimer);
    const blockCount = Number(this.body?.children?.length) || 0;
    const debounce = delay == null ? Math.max(300, Math.min(1200, 300 + blockCount * 0.5)) : Math.max(0, delay);
    this._refreshTimer = setTimeout(() => {
      this._refreshTimer = null;
      this.refresh();
    }, debounce);
  }

  refresh() {
    const token = ++this._scanToken;
    let orderedNodes = [];
    try { orderedNodes = Array.from(this.body?.querySelectorAll?.(HEADING_SELECTOR) || []); } catch { orderedNodes = []; }
    const rawItems = [];
    let index = 0;
    let page = 1;
    const runChunk = deadline => {
      let processed = 0;
      while (index < orderedNodes.length && processed < 160 && (!deadline || deadline.timeRemaining() > 1 || deadline.didTimeout)) {
        if (token !== this._scanToken) return;
        const element = orderedNodes[index++];
        processed += 1;
        if (element?.getAttribute?.("data-vno-auto-page-gap") === "true" || element?.classList?.contains?.("vno-page-auto-gap")) {
          page += 1;
          continue;
        }
        const level = getNavigationHeadingLevel(element);
        const text = String(element?.innerText ?? element?.textContent ?? "").replace(/\s+/g, " ").trim();
        if (!level || !text) continue;
        let id = this._elementIds.get(element);
        if (!id) {
          id = `vno-writer-nav-heading-${this._nextId++}`;
          this._elementIds.set(element, id);
        }
        rawItems.push({ id, element, level, text, page });
      }
      if (index < orderedNodes.length) {
        this._requestScanChunk(runChunk);
        return;
      }
      if (token !== this._scanToken) return;
      this.items = rawItems.map((item, itemIndex) => ({
        ...item,
        hasChildren: itemIndex + 1 < rawItems.length && rawItems[itemIndex + 1].level > item.level
      }));
      const liveIds = new Set(this.items.map(item => item.id));
      this.collapsedIds = new Set([...this.collapsedIds].filter(id => liveIds.has(id)));
      this._syncActiveHeading();
      this._render();
    };
    this._requestScanChunk(runChunk);
  }

  _requestScanChunk(callback) {
    if (typeof requestIdleCallback === "function") requestIdleCallback(callback, { timeout: 80 });
    else setTimeout(() => callback(null), 0);
  }

  _buildUi() {
    const pane = document.createElement("aside");
    pane.className = "vno-writer-navigation-pane";
    pane.hidden = true;
    pane.setAttribute("role", "complementary");
    pane.setAttribute("aria-label", t("writerNavigation.title"));
    pane.innerHTML = `
      <div class="vno-writer-navigation-header">
        <strong>${t("writerNavigation.title")}</strong>
        <button type="button" class="vno-writer-navigation-close" aria-label="${t("writerNavigation.close")}" title="${t("writerNavigation.close")}">×</button>
      </div>
      <div class="vno-writer-navigation-search-wrap">
        <label class="vno-visually-hidden" for="vno-writer-navigation-search">${t("writerNavigation.searchLabel")}</label>
        <input id="vno-writer-navigation-search" class="vno-writer-navigation-search" type="search" autocomplete="off" placeholder="${t("writerNavigation.searchPlaceholder")}" />
      </div>
      <div class="vno-writer-navigation-actions" role="toolbar" aria-label="${t("writerNavigation.branchActions")}">
        <button type="button" data-nav-action="collapse">${t("writerNavigation.collapseAll")}</button>
        <button type="button" data-nav-action="expand">${t("writerNavigation.expandAll")}</button>
      </div>
      <div class="vno-writer-navigation-tree" role="tree" aria-label="${t("writerNavigation.treeLabel")}"></div>
      <p class="vno-writer-navigation-status" role="status" aria-live="polite"></p>
    `;
    this.element = pane;
    this.searchInput = pane.querySelector(".vno-writer-navigation-search");
    this.tree = pane.querySelector(".vno-writer-navigation-tree");
    this.status = pane.querySelector(".vno-writer-navigation-status");
    pane.querySelector(".vno-writer-navigation-close")?.addEventListener("click", () => this.setOpen(false));
    this.searchInput?.addEventListener("input", () => this._render());
    this.searchInput?.addEventListener("keydown", event => this._handleSearchKeydown(event));
    pane.querySelector('[data-nav-action="collapse"]')?.addEventListener("click", () => this.collapseAll());
    pane.querySelector('[data-nav-action="expand"]')?.addEventListener("click", () => this.expandAll());
    this.tree?.addEventListener("click", event => this._handleTreeClick(event));
    this.tree?.addEventListener("keydown", event => this._handleTreeKeydown(event));
  }

  collapseAll() {
    this.collapsedIds = new Set(this.items.filter(item => item.hasChildren).map(item => item.id));
    this._render();
  }

  expandAll() {
    this.collapsedIds.clear();
    this._render();
  }

  _render() {
    if (!this.tree || !this.status) return;
    const query = this.searchInput?.value || "";
    this.visibleItems = getVisibleNavigationItems(this.items, this.collapsedIds, query);
    this.tree.replaceChildren();
    const fragment = document.createDocumentFragment();
    for (const item of this.visibleItems) {
      const row = document.createElement("div");
      row.className = "vno-writer-navigation-item";
      row.dataset.navId = item.id;
      row.setAttribute("role", "treeitem");
      row.setAttribute("aria-level", String(item.level));
      row.setAttribute("aria-selected", String(item.id === this.activeId));
      if (item.hasChildren) row.setAttribute("aria-expanded", String(!this.collapsedIds.has(item.id)));
      row.tabIndex = item.id === (this.focusedId || this.activeId || this.visibleItems[0]?.id) ? 0 : -1;
      row.style.setProperty("--vno-nav-level", String(Math.min(item.level, 9)));

      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "vno-writer-navigation-branch";
      toggle.dataset.navToggle = item.id;
      toggle.tabIndex = -1;
      toggle.setAttribute("aria-hidden", "true");
      toggle.textContent = item.hasChildren ? (this.collapsedIds.has(item.id) ? "›" : "⌄") : "";

      const title = document.createElement("span");
      title.className = "vno-writer-navigation-item-title";
      title.textContent = item.text;
      title.title = item.text;

      const page = document.createElement("span");
      page.className = "vno-writer-navigation-page";
      page.textContent = String(item.page);
      page.title = t("writerNavigation.page", { page: item.page });
      row.append(toggle, title, page);
      fragment.appendChild(row);
    }
    this.tree.appendChild(fragment);

    const hasQuery = Boolean(normalizeNavigationText(query));
    if (!this.items.length) this.status.textContent = t("writerNavigation.empty");
    else if (hasQuery && !this.visibleItems.length) this.status.textContent = t("writerNavigation.noResults");
    else this.status.textContent = "";
  }

  _handleSearchKeydown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      this._focusDocument();
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp" && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    const target = event.key === "End" || event.key === "ArrowUp" ? this.visibleItems.at(-1) : this.visibleItems[0];
    if (target) this._focusTreeItem(target.id);
  }

  _handleTreeClick(event) {
    const toggle = event.target?.closest?.("[data-nav-toggle]");
    if (toggle) {
      this._toggleBranch(toggle.dataset.navToggle);
      return;
    }
    const row = event.target?.closest?.("[data-nav-id]");
    const item = this.items.find(candidate => candidate.id === row?.dataset?.navId);
    if (item) this._navigateTo(item);
  }

  _handleTreeKeydown(event) {
    const row = event.target?.closest?.("[data-nav-id]");
    const currentId = row?.dataset?.navId;
    const index = this.visibleItems.findIndex(item => item.id === currentId);
    if (event.key === "Escape") {
      event.preventDefault();
      this._focusDocument();
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const item = this.visibleItems[index];
      if (item) this._navigateTo(item);
      return;
    }
    if (event.key === "ArrowRight") {
      const item = this.visibleItems[index];
      if (item?.hasChildren && this.collapsedIds.has(item.id)) {
        event.preventDefault();
        this._toggleBranch(item.id);
      }
      return;
    }
    if (event.key === "ArrowLeft") {
      const item = this.visibleItems[index];
      if (item?.hasChildren && !this.collapsedIds.has(item.id)) {
        event.preventDefault();
        this._toggleBranch(item.id);
      }
      return;
    }
    let nextIndex = index;
    if (event.key === "ArrowDown") nextIndex = Math.min(this.visibleItems.length - 1, index + 1);
    else if (event.key === "ArrowUp") nextIndex = Math.max(0, index - 1);
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = this.visibleItems.length - 1;
    else return;
    event.preventDefault();
    const next = this.visibleItems[nextIndex];
    if (next) this._focusTreeItem(next.id);
  }

  _toggleBranch(id) {
    if (this.collapsedIds.has(id)) this.collapsedIds.delete(id);
    else this.collapsedIds.add(id);
    this.focusedId = id;
    this._render();
    this._focusTreeItem(id);
  }

  _focusTreeItem(id) {
    this.focusedId = id;
    for (const row of this.tree?.querySelectorAll?.('[role="treeitem"]') || []) row.tabIndex = row.dataset.navId === id ? 0 : -1;
    this.tree?.querySelector?.(`[data-nav-id="${id}"]`)?.focus?.({ preventScroll: true });
  }

  _navigateTo(item) {
    if (!item?.element?.isConnected) {
      this.scheduleRefresh(0);
      return;
    }
    item.element.scrollIntoView?.({ block: "center", inline: "nearest", behavior: "smooth" });
    const selection = window.getSelection?.();
    const range = document.createRange?.();
    if (selection && range) {
      range.selectNodeContents(item.element);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    this.body?.focus?.({ preventScroll: true });
    item.element.animate?.(
      [{ backgroundColor: "rgba(245, 184, 0, 0.38)" }, { backgroundColor: "transparent" }],
      { duration: 1100, easing: "ease-out" }
    );
    this.activeId = item.id;
    this._render();
  }

  _scheduleActiveHeadingSync() {
    if (!this._isOpen || this._selectionFrame) return;
    const sync = () => {
      this._selectionFrame = null;
      this._syncActiveHeading();
      this._render();
    };
    if (typeof requestAnimationFrame === "function") this._selectionFrame = requestAnimationFrame(sync);
    else this._selectionFrame = setTimeout(sync, 16);
  }

  _syncActiveHeading() {
    if (typeof window === "undefined") return;
    const anchor = window.getSelection?.()?.anchorNode;
    if (!anchor || !this.body?.contains?.(anchor)) {
      this.activeId = null;
      return;
    }
    const anchorElement = anchor.nodeType === 1 ? anchor : anchor.parentElement;
    let active = null;
    for (const item of this.items) {
      if (item.element === anchorElement || item.element.contains?.(anchor)) {
        active = item;
        break;
      }
      try {
        if (item.element.compareDocumentPosition(anchor) & 4) active = item;
      } catch {}
    }
    this.activeId = active?.id || null;
  }

  _focusDocument() {
    this.body?.focus?.({ preventScroll: true });
  }

  _readPersistedOpen() {
    try { return localStorage.getItem(STORAGE_KEY) === "1"; } catch { return false; }
  }

  _persistOpen(open) {
    try { localStorage.setItem(STORAGE_KEY, open ? "1" : "0"); } catch {}
  }
}
