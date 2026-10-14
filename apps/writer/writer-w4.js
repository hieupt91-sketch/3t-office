/**
 * WORD-W4 helpers: mail-merge rules, alphabetical index and reusable blocks.
 * The module stays UI-facing; document mutations are owned by WriterAdapter.
 */

import { t, getLocale } from "../../platform/i18n/i18n.js";

export const QUICK_PARTS_STORAGE_KEY = "vno.writer.buildingBlocks.v1";
export const MAIL_MERGE_RULE_TYPES = Object.freeze(["skipIf", "nextIf", "ifThenElse", "fillIn"]);

const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (ch) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[ch]));

export function sanitizeBuildingBlockHtml(html) {
  return String(html || "")
    .replace(/<(script|iframe|object|embed|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<(script|iframe|object|embed|style)\b[^>]*\/?>/gi, "")
    .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s+(href|src)\s*=\s*(["'])\s*javascript:[\s\S]*?\2/gi, "");
}

export class WriterBuildingBlockStore {
  constructor(storage = globalThis.localStorage, key = QUICK_PARTS_STORAGE_KEY) {
    this.storage = storage;
    this.key = key;
  }

  list() {
    try {
      const value = JSON.parse(this.storage?.getItem?.(this.key) || "[]");
      if (!Array.isArray(value)) return [];
      return value.filter((item) => item && item.id && item.name && item.html).map((item) => ({
        id: String(item.id),
        name: String(item.name),
        category: String(item.category || "Chung"),
        html: sanitizeBuildingBlockHtml(item.html),
        updatedAt: Number(item.updatedAt) || 0
      }));
    } catch {
      return [];
    }
  }

  save({ id = "", name, category = "Chung", html }) {
    const safeName = String(name || "").trim();
    const safeHtml = sanitizeBuildingBlockHtml(html).trim();
    if (!safeName || !safeHtml) return false;
    const items = this.list();
    const normalizedId = String(id || `block-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
    const next = { id: normalizedId, name: safeName, category: String(category || "Chung").trim() || "Chung", html: safeHtml, updatedAt: Date.now() };
    const at = items.findIndex((item) => item.id === normalizedId || item.name.toLocaleLowerCase() === safeName.toLocaleLowerCase());
    if (at >= 0) items[at] = next;
    else items.push(next);
    try {
      this.storage?.setItem?.(this.key, JSON.stringify(items));
      return next;
    } catch {
      return false;
    }
  }

  remove(id) {
    const items = this.list();
    const next = items.filter((item) => item.id !== String(id || ""));
    if (next.length === items.length) return false;
    try {
      this.storage?.setItem?.(this.key, JSON.stringify(next));
      return true;
    } catch {
      return false;
    }
  }
}

export function normalizeIndexTerm(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

export function buildAlphabeticalIndex(entries = [], locale = getLocale()) {
  const seen = new Map();
  entries.forEach((entry, position) => {
    const term = normalizeIndexTerm(entry?.term ?? entry);
    if (!term) return;
    const key = term.toLocaleLowerCase(locale === "en" ? "en" : "vi");
    const page = Math.max(1, Number(entry?.page) || 1);
    const current = seen.get(key) || { term, pages: [], targetId: String(entry?.targetId || ""), position };
    if (!current.pages.includes(page)) current.pages.push(page);
    seen.set(key, current);
  });
  return [...seen.values()].sort((a, b) => a.term.localeCompare(b.term, locale === "en" ? "en" : "vi", { sensitivity: "base" }));
}

export function buildIndexHtml(entries = [], locale = getLocale()) {
  const items = buildAlphabeticalIndex(entries, locale);
  const title = locale === "en" ? "INDEX" : "CHỈ MỤC";
  const empty = locale === "en" ? "No marked entries yet." : "Chưa có mục nào được đánh dấu.";
  const rows = items.length ? items.map((item) => {
    const pages = item.pages.join(", ");
    const term = item.targetId ? `<a href="#${esc(item.targetId)}" class="vno-index-link">${esc(item.term)}</a>` : esc(item.term);
    return `<div class="vno-index-item"><span class="vno-index-term">${term}</span><span class="vno-index-leader"></span><span class="vno-index-pages">${esc(pages)}</span></div>`;
  }).join("") : `<p class="vno-index-empty">${esc(empty)}</p>`;
  return `<div class="vno-index-block" data-index-block="true" contenteditable="false"><div class="vno-index-title">${esc(title)}</div><div class="vno-index-entries">${rows}</div></div>`;
}

function trapFocus(box, event) {
  if (event.key !== "Tab") return;
  const controls = [...box.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')];
  if (!controls.length) return;
  const first = controls[0], last = controls.at(-1);
  if ((event.shiftKey && document.activeElement === first) || (!event.shiftKey && document.activeElement === last)) {
    event.preventDefault();
    (event.shiftKey ? last : first).focus();
  }
}

function dialog(title, body, footer, resolve) {
  const previous = document.activeElement;
  const overlay = document.createElement("div");
  overlay.className = "vno-dialog-overlay vno-w4-dialog-overlay";
  overlay.innerHTML = `<div class="vno-dialog-box vno-w4-dialog" role="dialog" aria-modal="true" aria-labelledby="vno-w4-title"><div class="vno-dialog-header"><strong id="vno-w4-title">${esc(title)}</strong><button type="button" class="vno-btn vno-dialog-close-btn" aria-label="${esc(t("common.close"))}">×</button></div><div class="vno-dialog-body">${body}</div><div class="vno-dialog-footer">${footer}</div></div>`;
  document.body.appendChild(overlay);
  let settled = false;
  const finish = (value) => {
    if (settled) return;
    settled = true;
    document.removeEventListener("keydown", onKeyDown, true);
    overlay.remove();
    previous?.focus?.();
    resolve(value);
  };
  const onKeyDown = (event) => {
    if (event.key === "Escape") { event.preventDefault(); finish(null); }
    else if (event.key === "Tab") trapFocus(overlay.querySelector(".vno-dialog-box"), event);
  };
  overlay.querySelector(".vno-dialog-close-btn").addEventListener("click", () => finish(null));
  overlay.addEventListener("click", (event) => { if (event.target === overlay) finish(null); });
  document.addEventListener("keydown", onKeyDown, true);
  return { overlay, finish };
}

export function showMailMergeRuleDialog({ fields = [], type = "ifThenElse", headlessResult } = {}) {
  if (headlessResult) return Promise.resolve(headlessResult);
  if (typeof document === "undefined" || !document.body) return Promise.resolve(null);
  const locale = getLocale();
  return new Promise((resolve) => {
    const fieldOptions = fields.map((field) => `<option value="${esc(field)}">${esc(field)}</option>`).join("");
    const typeOptions = [
      ["skipIf", locale === "en" ? "Skip record if" : "Bỏ qua bản ghi nếu"],
      ["nextIf", locale === "en" ? "Next record if" : "Bản ghi kế nếu"],
      ["ifThenElse", locale === "en" ? "If…Then…Else" : "Nếu…Thì…Khác"],
      ["fillIn", locale === "en" ? "Fill in" : "Điền vào"]
    ].map(([value, label]) => `<option value="${value}" ${value === type ? "selected" : ""}>${esc(label)}</option>`).join("");
    const body = `<div class="vno-w4-form"><label>${esc(locale === "en" ? "Rule" : "Loại quy tắc")}<select data-rule-type>${typeOptions}</select></label><div data-condition-fields><label>${esc(locale === "en" ? "Data field" : "Trường dữ liệu")}<select data-field>${fieldOptions}</select></label><label>${esc(locale === "en" ? "Comparison" : "Điều kiện")}<select data-op><option value="equals">${esc(locale === "en" ? "equals" : "bằng")}</option><option value="notEquals">${esc(locale === "en" ? "does not equal" : "khác")}</option><option value="contains">${esc(locale === "en" ? "contains" : "chứa")}</option><option value="greaterThan">${esc(locale === "en" ? "greater than" : "lớn hơn")}</option><option value="lessThan">${esc(locale === "en" ? "less than" : "nhỏ hơn")}</option><option value="empty">${esc(locale === "en" ? "is empty" : "rỗng")}</option><option value="notEmpty">${esc(locale === "en" ? "is not empty" : "không rỗng")}</option></select></label><label>${esc(locale === "en" ? "Compare with" : "Giá trị so sánh")}<input data-value></label></div><div data-if-fields><label>${esc(locale === "en" ? "Then text" : "Nội dung khi đúng")}<input data-then></label><label>${esc(locale === "en" ? "Else text" : "Nội dung khi sai")}<input data-else></label></div><div data-fill-fields hidden><label>${esc(locale === "en" ? "Prompt" : "Lời nhắc nhập")}<input data-prompt></label><label>${esc(locale === "en" ? "Default text" : "Nội dung mặc định")}<input data-default></label></div><p class="vno-dialog-error" data-error role="alert" hidden>${esc(locale === "en" ? "Choose a data field or enter a prompt." : "Hãy chọn trường dữ liệu hoặc nhập lời nhắc.")}</p></div>`;
    const ui = dialog(locale === "en" ? "Mail merge rules" : "Quy tắc trộn thư", body, `<button type="button" class="vno-btn" data-cancel>${esc(t("common.cancel"))}</button><button type="button" class="vno-btn vno-btn-primary" data-insert>${esc(locale === "en" ? "Insert" : "Chèn")}</button>`, resolve);
    const q = (selector) => ui.overlay.querySelector(selector);
    const refresh = () => {
      const selected = q("[data-rule-type]").value;
      q("[data-condition-fields]").hidden = selected === "fillIn";
      q("[data-if-fields]").hidden = selected !== "ifThenElse";
      q("[data-fill-fields]").hidden = selected !== "fillIn";
    };
    q("[data-rule-type]").addEventListener("change", refresh);
    q("[data-cancel]").addEventListener("click", () => ui.finish(null));
    q("[data-insert]").addEventListener("click", () => {
      const ruleType = q("[data-rule-type]").value;
      const result = { type: ruleType, field: q("[data-field]").value, op: q("[data-op]").value, value: q("[data-value]").value, then: q("[data-then]").value, otherwise: q("[data-else]").value, prompt: q("[data-prompt]").value.trim(), defaultText: q("[data-default]").value };
      if ((ruleType === "fillIn" && !result.prompt) || (ruleType !== "fillIn" && !result.field)) {
        q("[data-error]").hidden = false;
        (ruleType === "fillIn" ? q("[data-prompt]") : q("[data-field]")).focus();
        return;
      }
      ui.finish(result);
    });
    refresh();
    q("[data-rule-type]").focus();
  });
}

export function showQuickPartsDialog({ blocks = [], selectionHtml = "", headlessResult } = {}) {
  if (headlessResult) return Promise.resolve(headlessResult);
  if (typeof document === "undefined" || !document.body) return Promise.resolve(null);
  const locale = getLocale();
  return new Promise((resolve) => {
    const options = blocks.map((item) => `<option value="${esc(item.id)}">${esc(item.category)} — ${esc(item.name)}</option>`).join("");
    const body = `<div class="vno-w4-form"><label>${esc(locale === "en" ? "Saved blocks" : "Khối đã lưu")}<select data-block size="6">${options}</select></label><label>${esc(locale === "en" ? "Name" : "Tên khối")}<input data-name maxlength="80"></label><label>${esc(locale === "en" ? "Category" : "Nhóm")}<input data-category maxlength="50" value="${esc(locale === "en" ? "General" : "Chung")}"></label><p class="vno-dialog-error" data-error role="alert" hidden></p></div>`;
    const ui = dialog(locale === "en" ? "Reusable blocks" : "Khối dựng sẵn", body, `<button type="button" class="vno-btn" data-delete ${blocks.length ? "" : "disabled"}>${esc(locale === "en" ? "Delete" : "Xóa")}</button><button type="button" class="vno-btn" data-save ${selectionHtml ? "" : "disabled"}>${esc(locale === "en" ? "Save selection" : "Lưu vùng chọn")}</button><button type="button" class="vno-btn vno-btn-primary" data-insert ${blocks.length ? "" : "disabled"}>${esc(locale === "en" ? "Insert" : "Chèn")}</button>`, resolve);
    const q = (selector) => ui.overlay.querySelector(selector);
    q("[data-insert]").addEventListener("click", () => ui.finish({ action: "insert", id: q("[data-block]").value }));
    q("[data-delete]").addEventListener("click", () => ui.finish({ action: "delete", id: q("[data-block]").value }));
    q("[data-save]").addEventListener("click", () => {
      const name = q("[data-name]").value.trim();
      if (!name) { q("[data-error]").textContent = locale === "en" ? "Enter a block name." : "Hãy nhập tên khối dựng sẵn."; q("[data-error]").hidden = false; q("[data-name]").focus(); return; }
      ui.finish({ action: "save", name, category: q("[data-category]").value, html: selectionHtml });
    });
    (blocks.length ? q("[data-block]") : q("[data-name]")).focus();
  });
}
