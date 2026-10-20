/**
 * Panel Trợ giúp dùng chung Writer / Sheet / Slides.
 * Dữ liệu lấy từ catalog; UI không hardcode bài hướng dẫn.
 */

import { ICONS } from "../ui-kit/icons.js";
import { t } from "../i18n/i18n.js";
import { getHelpEntryById, groupHelpEntriesByTab, searchHelpEntries } from "./help-service.js";
import { showAboutDialog } from "../about/about-dialog.js";
import { restoreEditorFocus } from "../shell/focus-manager.js";

function localize(key, fallback) {
  const value = t(key);
  return value && value !== key ? value : fallback;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[ch]));
}

function ensureHelpStyles() {
  if (typeof document === "undefined" || !document.head) return;
  if (document.getElementById("vno-help-stylesheet")) return;
  const link = document.createElement("link");
  link.id = "vno-help-stylesheet";
  link.rel = "stylesheet";
  try {
    link.href = new URL("./help.css", import.meta.url).href;
  } catch {
    return;
  }
  document.head.appendChild(link);
}

export function resetHelpPanelScroll(root) {
  if (!root?.querySelector) return;
  for (const element of [
    root,
    root.querySelector(".vno-help-body"),
    root.querySelector(".vno-help-list"),
    root.querySelector(".vno-help-article")
  ]) {
    if (element) element.scrollTop = 0;
  }
}

export class HelpPanel {
  /**
   * @param {{ app?: "writer"|"sheet"|"slides", host?: HTMLElement }} [options]
   */
  constructor(options = {}) {
    this.app = options.app || "writer";
    this.root = null;
    this._host = null;
    this._open = false;
    this._query = "";
    this._activeId = null;
    this._onKeyDown = (event) => this._handleKeyDown(event);
    this._onOutsidePointer = (event) => this._handleOutsidePointer(event);
  }

  mount(host) {
    if (!host || typeof document === "undefined" || typeof document.createElement !== "function") return this;
    ensureHelpStyles();
    this.destroy();
    this._host = host;
    const targetHost = host?.closest?.(".vno-workspace") || host;
    this.root = document.createElement("aside");
    this.root.className = "vno-help-panel";
    this.root.id = "vno-help-panel";
    this.root.hidden = true;
    this.root.setAttribute("role", "complementary");
    this.root.setAttribute("aria-label", localize("help.panelTitle", "Trợ giúp"));
    this.root.innerHTML = `
      <div class="vno-help-header">
        <h2 class="vno-help-title" style="display:flex;align-items:center;gap:8px;">
          <span aria-hidden="true" style="display:flex;">${ICONS.help || ""}</span>
          ${escapeHtml(localize("help.panelTitle", "Trợ giúp"))}
        </h2>
        <button type="button" class="vno-btn vno-btn-icon-only vno-help-close" aria-label="${escapeHtml(localize("common.close", "Đóng"))}" title="${escapeHtml(localize("common.close", "Đóng"))}">&times;</button>
      </div>
      <div class="vno-help-search-wrap">
        <input type="search" class="vno-help-search" id="vno-help-search"
               placeholder="${escapeHtml(localize("help.searchPlaceholder", "Tìm tính năng, ví dụ: Đếm từ"))}"
               aria-label="${escapeHtml(localize("help.searchPlaceholder", "Tìm tính năng"))}" />
      </div>
      <div class="vno-help-body">
        <div class="vno-help-list" role="listbox" aria-label="${escapeHtml(localize("help.topicList", "Danh sách chủ đề"))}"></div>
        <article class="vno-help-article" aria-live="polite">
          <div class="vno-help-article-content"></div>
          <section class="vno-help-reporting-actions" aria-label="Báo lỗi và quyền riêng tư">
            <div class="vno-help-reporting-buttons">
              <button type="button" class="vno-btn vno-btn-primary" data-vno-report-open>Báo lỗi / Góp ý</button>
              <button type="button" class="vno-btn" data-vno-whats-new-open id="vno-help-whats-new-btn">Có gì mới</button>
              <button type="button" class="vno-btn" data-vno-about-open>Giới thiệu 3T Office</button>
            </div>
            <label class="vno-report-consent-label"><input type="checkbox" data-vno-report-consent>
              <span>Cho phép gửi báo cáo lỗi kỹ thuật tự động</span></label>
            <p class="vno-reporting-status" data-vno-reporting-status role="status" aria-live="polite">Đang đọc trạng thái…</p>
          </section>
        </article>
      </div>
    `;
    targetHost.appendChild(this.root);
    this.root.querySelector(".vno-help-close").addEventListener("click", () => {
      this.close();
      restoreEditorFocus({ force: true });
    });
    this.root.querySelector("[data-vno-about-open]")?.addEventListener("click", () => showAboutDialog());
    this.root.querySelector("[data-vno-whats-new-open]")?.addEventListener("click", () => this.open({ entryId: "common.help.whatsNew" }));
    this.root.querySelector(".vno-help-search").addEventListener("input", (event) => {
      this._query = event.target.value || "";
      const visible = this.getVisibleEntries();
      if (this._activeId && !visible.some((entry) => entry.id === this._activeId)) {
        this._activeId = visible[0]?.id || null;
      }
      this._render();
    });
    this.root.querySelector(".vno-help-list").addEventListener("click", (event) => {
      const button = event.target.closest?.("[data-help-id]");
      if (!button) return;
      this._activeId = button.getAttribute("data-help-id");
      this._render();
    });
    this._render();
    return this;
  }

  getVisibleEntries() {
    return searchHelpEntries(this._query, { app: this.app });
  }

  isOpen() {
    return this._open;
  }

  _getShell() {
    if (this.shell) return this.shell;
    if (typeof window !== "undefined") {
      if (window.__vnoShell) return window.__vnoShell;
      if (window.__vnoAppInstance?.shell) return window.__vnoAppInstance.shell;
    }
    if (typeof document !== "undefined") {
      const shellEl = document.querySelector(".vno-shell");
      if (shellEl?.__vnoShell) return shellEl.__vnoShell;
    }
    return null;
  }

  _handleOutsidePointer(event) {
    if (!this._open) return;
    const target = event.target;
    if (!target) return;
    if (this.root && this.root.contains(target)) return;
    if (target.closest?.("[data-command-id$='.help.open'], [data-cmd$='.help.open'], #vno-help-btn, [data-vno-help-trigger]")) return;
    if (target.closest?.(".vno-dialog-overlay, .vno-about-backdrop, .vno-about-dialog, .vno-error-reporting-overlay, .vno-modal, [role='dialog'], [role='alertdialog']")) return;
    this.close();
  }

  open(options = {}) {
    // Chỉ một panel bên phải tại một thời điểm: đóng Trợ lý AI nếu đang mở
    const shell = this._getShell();
    if (shell && typeof shell.toggleAiSidebar === "function" && shell.isAiOpen) {
      shell.toggleAiSidebar(false);
    } else {
      const fallbackDoc = typeof document !== "undefined" ? document : null;
      const domAi = (this.root?.parentNode || fallbackDoc)?.querySelector?.(".vno-ai-sidebar");
      if (domAi && !domAi.classList.contains("is-hidden")) {
        domAi.classList.add("is-hidden");
      }
    }

    if (options.query != null) this._query = String(options.query);
    if (options.entryId) {
      const match = getHelpEntryById(options.entryId);
      if (match) this._activeId = match.id;
    }
    const visible = this.getVisibleEntries();
    if (!this._activeId || !visible.some((entry) => entry.id === this._activeId)) {
      this._activeId = visible[0]?.id || null;
    }
    this._open = true;
    if (this.root) {
      this.root.hidden = false;
      const search = this.root.querySelector(".vno-help-search");
      if (search) {
        search.value = this._query;
        search.focus({ preventScroll: true });
      }
    }
    if (typeof document !== "undefined") {
      document.removeEventListener("keydown", this._onKeyDown);
      document.addEventListener("keydown", this._onKeyDown);
      document.removeEventListener("pointerdown", this._onOutsidePointer);
      document.addEventListener("pointerdown", this._onOutsidePointer);
    }
    this._render();
    resetHelpPanelScroll(this.root);
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => resetHelpPanelScroll(this.root));
    }
    return true;
  }

  close() {
    this._open = false;
    if (this.root) this.root.hidden = true;
    if (typeof document !== "undefined") {
      document.removeEventListener("keydown", this._onKeyDown);
      document.removeEventListener("pointerdown", this._onOutsidePointer);
    }
    return false;
  }

  toggle(options = {}) {
    if (this._open && !options.entryId && options.query == null) {
      this.close();
      restoreEditorFocus({ force: true });
      return false;
    }
    return this.open(options);
  }

  destroy() {
    this.close();
    if (typeof document !== "undefined") {
      document.removeEventListener("pointerdown", this._onOutsidePointer);
    }
    if (this.root?.parentNode) this.root.parentNode.removeChild(this.root);
    this.root = null;
    this._host = null;
  }

  _handleKeyDown(event) {
    if (!this._open) return;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      this.close();
      restoreEditorFocus({ force: true });
    }
  }

  _render() {
    if (!this.root) return;
    const list = this.root.querySelector(".vno-help-list");
    const article = this.root.querySelector(".vno-help-article-content");
    const entries = this.getVisibleEntries();
    const groups = groupHelpEntriesByTab(entries);

    if (!entries.length) {
      list.innerHTML = `<p class="vno-help-empty">${escapeHtml(localize("help.noResults", "Không tìm thấy hướng dẫn phù hợp."))}</p>`;
    } else {
      list.innerHTML = groups.map((group) => `
        <div class="vno-help-group">
          <div class="vno-help-group-label">${escapeHtml(group.tab)}</div>
          ${group.entries.map((entry) => `
            <button type="button" class="vno-help-topic${entry.id === this._activeId ? " is-active" : ""}"
                    role="option" data-help-id="${escapeHtml(entry.id)}"
                    aria-selected="${entry.id === this._activeId ? "true" : "false"}">
              ${escapeHtml(entry.title)}
            </button>
          `).join("")}
        </div>
      `).join("");
    }

    const active = entries.find((entry) => entry.id === this._activeId) || null;
    if (!active) {
      article.innerHTML = `<p class="vno-help-placeholder">${escapeHtml(localize("help.pickTopic", "Chọn một tính năng ở danh sách trên để xem hướng dẫn."))}</p>`;
      return;
    }

    const location = [active.ribbon?.tab, active.ribbon?.group].filter(Boolean).join(" → ");

    if (active.id === "common.help.whatsNew") {
      article.innerHTML = `
        <h3>${escapeHtml(active.title)}</h3>
        <p class="vno-help-summary">${escapeHtml(active.summary)}</p>
        <div class="vno-whats-new-content" style="background:var(--vno-bg-subtle);padding:14px;border-radius:var(--vno-radius-md);margin-top:12px;font-size:12px;line-height:1.6;border:1px solid var(--vno-border-default);">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;border-bottom:1px solid var(--vno-border-default);padding-bottom:6px;">
            <strong style="color:var(--vno-text-primary);font-size:13px;">Ghi chú phát hành phiên bản đang cài đặt</strong>
            <span class="vno-release-version-badge" style="background:var(--vno-primary);color:#fff;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:bold;">Đang nạp…</span>
          </div>
          <div id="vno-whats-new-body" style="white-space:pre-wrap;color:var(--vno-text-primary);font-family:monospace;max-height:420px;overflow-y:auto;">Đang tải ghi chú phát hành…</div>
        </div>
      `;
      this._loadReleaseNotesInto(article.querySelector("#vno-whats-new-body"), article.querySelector(".vno-release-version-badge"));
      return;
    }

    article.innerHTML = `
      <h3>${escapeHtml(active.title)}</h3>
      ${location ? `<div class="vno-help-location">${escapeHtml(localize("help.location", "Vị trí"))}: ${escapeHtml(location)}</div>` : ""}
      <p class="vno-help-summary">${escapeHtml(active.summary)}</p>
      <p class="vno-help-steps-title">${escapeHtml(localize("help.stepsHeading", "Cách dùng"))}</p>
      <ol class="vno-help-steps">
        ${(active.steps || []).map((step) => `<li>${escapeHtml(step)}</li>`).join("")}
      </ol>
    `;
  }

  async _loadReleaseNotesInto(bodyEl, badgeEl) {
    if (!bodyEl) return;
    try {
      if (typeof window !== "undefined" && window.pywebview?.api?.get_release_notes) {
        const res = await window.pywebview.api.get_release_notes();
        if (res?.found && res?.content) {
          bodyEl.textContent = res.content;
          if (badgeEl && res.version) badgeEl.textContent = res.version;
          return;
        }
      }
    } catch (_) {}

    try {
      if (typeof fetch === "function") {
        const candidates = ["release-notes.txt", "RELEASE-NOTES.md", "notes-0.9.0-pilot1.txt"];
        for (const file of candidates) {
          try {
            const resp = await fetch(file);
            if (resp.ok) {
              const text = await resp.text();
              if (text && text.trim().length > 0 && !text.includes("<!DOCTYPE html>")) {
                bodyEl.textContent = text.trim();
                if (badgeEl) badgeEl.textContent = "0.9.0-pilot1";
                return;
              }
            }
          } catch (_) {}
        }
      }
    } catch (_) {}

    bodyEl.innerHTML = '<span style="color:#dc2626;font-family:sans-serif;">Chưa có thông tin ghi chú phát hành cho phiên bản này. Vui lòng kiểm tra lại sau hoặc xem trên trang cập nhật chính thức của 3T Office.</span>';
    if (badgeEl) badgeEl.textContent = "Không xác định";
  }
}

export function createHelpPanel(options) {
  return new HelpPanel(options);
}
