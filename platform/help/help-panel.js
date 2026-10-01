/**
 * Panel Trợ giúp dùng chung Writer / Sheet / Slides.
 * Dữ liệu lấy từ catalog; UI không hardcode bài hướng dẫn.
 */

import { ICONS } from "../ui-kit/icons.js";
import { t } from "../i18n/i18n.js";
import { getHelpEntryById, groupHelpEntriesByTab, searchHelpEntries } from "./help-service.js";
import { showAboutDialog } from "../about/about-dialog.js";
import { globalUnoBridge } from "../../adapters/libreoffice/common/uno-bridge.js";

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
  }

  mount(host) {
    if (!host || typeof document === "undefined" || typeof document.createElement !== "function") return this;
    ensureHelpStyles();
    this.destroy();
    this._host = host;
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
      <section class="vno-help-reporting-actions" aria-label="Báo lỗi và quyền riêng tư">
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:6px;">
          <button type="button" class="vno-btn vno-btn-primary" data-vno-report-open>Báo lỗi / Góp ý</button>
          <button type="button" class="vno-btn" data-vno-about-open id="vno-help-about-btn">Giới thiệu 3T Office</button>
        </div>
        <label class="vno-report-consent-label"><input type="checkbox" data-vno-report-consent>
          <span>Cho phép gửi báo cáo lỗi kỹ thuật tự động</span></label>
        <p class="vno-reporting-status" data-vno-reporting-status role="status" aria-live="polite">Đang đọc trạng thái…</p>
      </section>
      <section class="vno-quickstart-settings" aria-labelledby="vno-quickstart-title">
        <h3 id="vno-quickstart-title">Khởi động nhanh</h3>
        <label><input type="checkbox" data-vno-quickstart-enabled>
          <span>Tự chạy cùng Windows và giữ bộ máy LibreOffice sẵn sàng</span></label>
        <p data-vno-quickstart-status role="status" aria-live="polite">Đang đọc trạng thái…</p>
      </section>
      <div class="vno-help-body">
        <div class="vno-help-list" role="listbox" aria-label="${escapeHtml(localize("help.topicList", "Danh sách chủ đề"))}"></div>
        <article class="vno-help-article" aria-live="polite"></article>
      </div>
    `;
    host.appendChild(this.root);
    this.root.querySelector(".vno-help-close").addEventListener("click", () => this.close());
    this.root.querySelector("[data-vno-about-open]")?.addEventListener("click", () => showAboutDialog());
    const quickStartEnabled = this.root.querySelector("[data-vno-quickstart-enabled]");
    quickStartEnabled?.addEventListener("change", async () => {
      quickStartEnabled.disabled = true;
      const status = this.root?.querySelector("[data-vno-quickstart-status]");
      if (status) status.textContent = "Đang cập nhật cài đặt…";
      try {
        const result = await globalUnoBridge.setQuickStartEnabled(quickStartEnabled.checked);
        if (result?.status !== "ok") {
          quickStartEnabled.checked = !quickStartEnabled.checked;
          if (status) status.textContent = result?.message || "Không thể cập nhật cài đặt Khởi động nhanh.";
        } else {
          this._renderQuickStartStatus(result);
        }
      } catch (error) {
        quickStartEnabled.checked = !quickStartEnabled.checked;
        if (status) status.textContent = `Không thể cập nhật cài đặt: ${error?.message || error}`;
      } finally {
        quickStartEnabled.disabled = false;
      }
    });
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
    void this._loadQuickStartStatus();
    return this;
  }

  async _loadQuickStartStatus() {
    const enabled = this.root?.querySelector("[data-vno-quickstart-enabled]");
    if (!enabled) return;
    try {
      this._renderQuickStartStatus(await globalUnoBridge.getQuickStartStatus());
    } catch (error) {
      this._renderQuickStartStatus({ supported: false, error: error?.message || String(error) });
    }
  }

  _renderQuickStartStatus(value = {}) {
    const checkbox = this.root?.querySelector("[data-vno-quickstart-enabled]");
    const status = this.root?.querySelector("[data-vno-quickstart-status]");
    if (checkbox) {
      checkbox.checked = Boolean(value.enabled);
      checkbox.disabled = !value.supported;
    }
    if (!status) return;
    if (!value.supported) {
      status.textContent = value.error || "Cài đặt này chỉ dùng trong 3T Office Desktop trên Windows.";
    } else if (!value.enabled) {
      status.textContent = "Đang tắt. Bật tùy chọn để khởi chạy cùng Windows.";
    } else {
      const memory = value.residentSetMB != null && Number.isFinite(Number(value.residentSetMB))
        ? ` Khoảng ${Number(value.residentSetMB).toFixed(0)} MB RAM.`
        : " Chưa đo được mức dùng bộ nhớ.";
      status.textContent = value.running
        ? `${value.workerReady ? "Đang chạy và đã sẵn sàng." : "Đang khởi động."}${memory}`
        : `Đã bật khởi chạy cùng Windows; dịch vụ chưa phản hồi.${memory}`;
    }
  }

  getVisibleEntries() {
    return searchHelpEntries(this._query, { app: this.app });
  }

  isOpen() {
    return this._open;
  }

  open(options = {}) {
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
        search.focus();
      }
    }
    if (typeof document !== "undefined") {
      document.removeEventListener("keydown", this._onKeyDown);
      document.addEventListener("keydown", this._onKeyDown);
    }
    this._render();
    return true;
  }

  close() {
    this._open = false;
    if (this.root) this.root.hidden = true;
    if (typeof document !== "undefined") document.removeEventListener("keydown", this._onKeyDown);
    return false;
  }

  toggle(options = {}) {
    if (this._open && !options.entryId && options.query == null) return this.close();
    return this.open(options);
  }

  destroy() {
    this.close();
    if (this.root?.parentNode) this.root.parentNode.removeChild(this.root);
    this.root = null;
    this._host = null;
  }

  _handleKeyDown(event) {
    if (!this._open) return;
    if (event.key === "Escape") {
      event.preventDefault();
      this.close();
    }
  }

  _render() {
    if (!this.root) return;
    const list = this.root.querySelector(".vno-help-list");
    const article = this.root.querySelector(".vno-help-article");
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
}

export function createHelpPanel(options) {
  return new HelpPanel(options);
}
