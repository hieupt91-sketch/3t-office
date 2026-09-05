/**
 * VN Writer — Captions & Table of Figures
 * Nhãn + số tự động theo từng loại (Hình / Bảng / Phương trình) và danh mục tự động.
 * Dialog headless-safe: unit test không treo chờ click.
 */

import { t, getLocale } from "../../platform/i18n/i18n.js";

export const CAPTION_KINDS = Object.freeze(["figure", "table", "equation"]);
export const TOF_KINDS = Object.freeze(["figure", "table", "equation", "all"]);
export const CAPTION_MARKER_PREFIX = "VNO_CAPTION_V1:";
export const TOF_MARKER_PREFIX = "VNO_TOF_V1:";
export const CAPTIONS_METADATA_PREFIX = "VNO_CAPTIONS_META_V1:";

const KIND_LABELS = {
  vi: { figure: "Hình", table: "Bảng", equation: "Phương trình" },
  en: { figure: "Figure", table: "Table", equation: "Equation" }
};

const KIND_MENU = {
  vi: { figure: "Hình ảnh", table: "Bảng", equation: "Phương trình" },
  en: { figure: "Figure", table: "Table", equation: "Equation" }
};

const TOF_TITLES = {
  vi: {
    figure: "DANH MỤC HÌNH",
    table: "DANH MỤC BẢNG",
    equation: "DANH MỤC PHƯƠNG TRÌNH",
    all: "DANH MỤC HÌNH ẢNH VÀ BẢNG"
  },
  en: {
    figure: "TABLE OF FIGURES",
    table: "TABLE OF TABLES",
    equation: "TABLE OF EQUATIONS",
    all: "TABLE OF FIGURES AND TABLES"
  }
};

const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (ch) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[ch]));

export function normalizeCaptionKind(kind) {
  return CAPTION_KINDS.includes(kind) ? kind : "figure";
}

export function normalizeTofKind(kind) {
  return TOF_KINDS.includes(kind) ? kind : "figure";
}

export function captionKindLabel(kind, locale = getLocale()) {
  const pack = KIND_LABELS[locale] || KIND_LABELS.vi;
  return pack[normalizeCaptionKind(kind)] || pack.figure;
}

export function captionKindMenuLabel(kind, locale = getLocale()) {
  const pack = KIND_MENU[locale] || KIND_MENU.vi;
  return pack[normalizeCaptionKind(kind)] || pack.figure;
}

export function tableOfFiguresTitle(kind, locale = getLocale()) {
  const pack = TOF_TITLES[locale] || TOF_TITLES.vi;
  return pack[normalizeTofKind(kind)] || pack.figure;
}

export function defaultCaptionPosition(kind) {
  return normalizeCaptionKind(kind) === "table" ? "above" : "below";
}

export function formatCaptionVisibleText(kind, number, text, locale = getLocale()) {
  const label = captionKindLabel(kind, locale);
  const body = String(text || "").trim();
  return body ? `${label} ${number}: ${body}` : `${label} ${number}`;
}

export function parseCaptionVisibleText(raw, locale = getLocale()) {
  const value = String(raw || "").replace(/\s+/g, " ").trim();
  if (!value) return null;
  const labels = locale === "en"
    ? [["figure", "Figure"], ["table", "Table"], ["equation", "Equation"], ["figure", "Hình"], ["table", "Bảng"], ["equation", "Phương trình"]]
    : [["figure", "Hình"], ["table", "Bảng"], ["equation", "Phương trình"], ["figure", "Figure"], ["table", "Table"], ["equation", "Equation"]];
  for (const [kind, label] of labels) {
    const match = value.match(new RegExp(`^${label}\\s+(\\d+)\\s*:\\s*(.*)$`, "i"));
    if (match) {
      return { kind, number: Number(match[1]), text: String(match[2] || "").trim() };
    }
    const bare = value.match(new RegExp(`^${label}\\s+(\\d+)\\s*$`, "i"));
    if (bare) {
      return { kind, number: Number(bare[1]), text: "" };
    }
  }
  return null;
}

export function serializeCaptionMarker({ kind = "figure", id = "", index = 1 } = {}) {
  const data = { version: 1, kind: normalizeCaptionKind(kind), id: String(id || ""), index: Number(index) || 1 };
  return `${CAPTION_MARKER_PREFIX}${encodeURIComponent(JSON.stringify(data))}`;
}

export function parseCaptionMarker(text = "") {
  const match = String(text).match(/VNO_CAPTION_V1:([^\s<]+)/);
  if (!match) return null;
  try {
    const data = JSON.parse(decodeURIComponent(match[1]));
    return {
      kind: normalizeCaptionKind(data.kind),
      id: String(data.id || ""),
      index: Number(data.index) || 1
    };
  } catch {
    return null;
  }
}

export function serializeTofMarker({ kind = "figure" } = {}) {
  const data = { version: 1, kind: normalizeTofKind(kind) };
  return `${TOF_MARKER_PREFIX}${encodeURIComponent(JSON.stringify(data))}`;
}

export function parseTofMarker(text = "") {
  const match = String(text).match(/VNO_TOF_V1:([^\s<]+)/);
  if (!match) return null;
  try {
    const data = JSON.parse(decodeURIComponent(match[1]));
    return { kind: normalizeTofKind(data.kind) };
  } catch {
    return null;
  }
}

export function captionMarkerHtml(state) {
  return `<span class="vno-caption-marker" data-vno-caption-marker="true" contenteditable="false" aria-hidden="true" style="display:none">${serializeCaptionMarker(state)}</span>`;
}

export function tofMarkerHtml(state) {
  return `<span class="vno-tof-marker" data-vno-tof-marker="true" contenteditable="false" aria-hidden="true" style="display:none">${serializeTofMarker(state)}</span>`;
}

export function serializeCaptionsMetadata({ captions = [], tof = [] } = {}) {
  const data = {
    version: 1,
    captions: captions.map((item) => ({
      id: String(item.id || ""),
      kind: normalizeCaptionKind(item.kind),
      index: Number(item.number || item.index) || 1,
      text: String(item.text || "")
    })),
    tof: tof.map((item) => ({ kind: normalizeTofKind(item.kind) }))
  };
  return `${CAPTIONS_METADATA_PREFIX}${encodeURIComponent(JSON.stringify(data))}`;
}

export function parseCaptionsMetadata(text = "") {
  const match = String(text).match(/VNO_CAPTIONS_META_V1:([^\s<]+)/);
  if (!match) return null;
  try {
    const data = JSON.parse(decodeURIComponent(match[1]));
    return {
      captions: Array.isArray(data.captions) ? data.captions : [],
      tof: Array.isArray(data.tof) ? data.tof : []
    };
  } catch {
    return null;
  }
}

export function captionsMetadataHtml(state) {
  return `<span class="vno-caption-metadata" data-vno-caption-metadata="true" contenteditable="false" aria-hidden="true" style="display:none">${serializeCaptionsMetadata(state)}</span>`;
}

export function buildCaptionHtml({
  kind = "figure",
  id,
  number = 1,
  text = "",
  locale = getLocale()
} = {}) {
  const safeKind = normalizeCaptionKind(kind);
  const safeId = String(id || `vno-cap-${safeKind}-${number}`);
  const label = captionKindLabel(safeKind, locale);
  const body = String(text || "");
  const deleteTitle = t("writerDialogs.caption.deleteTooltip") === "writerDialogs.caption.deleteTooltip"
    ? (locale === "en" ? "Delete caption" : "Xóa chú thích ảnh")
    : t("writerDialogs.caption.deleteTooltip");
  return `<p class="vno-caption" data-vno-caption="true" data-vno-caption-kind="${esc(safeKind)}" data-vno-caption-id="${esc(safeId)}" data-vno-caption-index="${Number(number) || 1}" id="${esc(safeId)}" tabindex="-1" contenteditable="false"><span class="vno-caption-label">${esc(label)}</span> <span class="vno-caption-number">${Number(number) || 1}</span><span class="vno-caption-separator">: </span><span class="vno-caption-text" contenteditable="true">${esc(body)}</span>${captionMarkerHtml({ kind: safeKind, id: safeId, index: number })}<button type="button" class="vno-caption-delete-btn" title="${esc(deleteTitle)}" aria-label="${esc(deleteTitle)}">&times;</button></p>`;
}

function dialogShell(title, body, footer, extraClass = "") {
  const overlay = document.createElement("div");
  overlay.className = `vno-dialog-overlay vno-caption-dialog-overlay ${extraClass}`.trim();
  overlay.innerHTML = `<div class="vno-dialog-box vno-caption-dialog" role="dialog" aria-modal="true" aria-labelledby="vno-caption-dialog-title"><div class="vno-dialog-header"><strong id="vno-caption-dialog-title">${esc(title)}</strong><button type="button" class="vno-btn vno-dialog-close-btn" aria-label="${esc(t("common.close"))}">×</button></div><div class="vno-dialog-body">${body}</div><div class="vno-dialog-footer">${footer}</div></div>`;
  document.body.appendChild(overlay);
  return overlay;
}

export function showInsertCaptionDialog(options = {}) {
  if (typeof document === "undefined" || !document.body || typeof document.createElement !== "function") {
    if (options.headlessResult) return Promise.resolve(options.headlessResult);
    if (options.text !== undefined || options.kind) {
      return Promise.resolve({
        kind: normalizeCaptionKind(options.kind),
        text: String(options.text || ""),
        position: options.position || defaultCaptionPosition(options.kind)
      });
    }
    return Promise.resolve(null);
  }

  const locale = getLocale();
  const initialKind = normalizeCaptionKind(options.kind);
  const initialPosition = options.position || defaultCaptionPosition(initialKind);
  const nextNumber = Number(options.nextNumber) || 1;
  const title = t("writerDialogs.caption.title") === "writerDialogs.caption.title"
    ? (locale === "en" ? "Insert Caption" : "Chèn chú thích ảnh")
    : t("writerDialogs.caption.title");

  return new Promise((resolve) => {
    const kindOptions = CAPTION_KINDS.map((kind) => (
      `<option value="${kind}" ${kind === initialKind ? "selected" : ""}>${esc(captionKindMenuLabel(kind, locale))}</option>`
    )).join("");
    const body = `
      <div class="vno-caption-form">
        <label>${esc(locale === "en" ? "Label" : "Nhãn")}
          <select name="kind" class="vno-caption-kind">${kindOptions}</select>
        </label>
        <label>${esc(locale === "en" ? "Position" : "Vị trí")}
          <select name="position" class="vno-caption-position">
            <option value="below" ${initialPosition === "below" ? "selected" : ""}>${esc(locale === "en" ? "Below selected item" : "Dưới đối tượng đã chọn")}</option>
            <option value="above" ${initialPosition === "above" ? "selected" : ""}>${esc(locale === "en" ? "Above selected item" : "Trên đối tượng đã chọn")}</option>
          </select>
        </label>
        <label>${esc(locale === "en" ? "Caption" : "Nội dung chú thích")}
          <input name="text" class="vno-caption-text-input" type="text" value="${esc(options.text || "")}" placeholder="${esc(locale === "en" ? "Revenue chart" : "Biểu đồ doanh thu")}">
        </label>
        <p class="vno-caption-preview" aria-live="polite">${esc(formatCaptionVisibleText(initialKind, nextNumber, options.text || "", locale))}</p>
        ${options.hasTarget ? "" : `<p class="vno-caption-hint">${esc(locale === "en" ? "No picture or table is selected. The caption will be inserted at the cursor." : "Chưa chọn ảnh hoặc bảng. Chú thích sẽ được chèn tại vị trí con trỏ.")}</p>`}
      </div>
    `;
    const overlay = dialogShell(
      title,
      body,
      `<button type="button" class="vno-btn vno-cancel">${esc(t("common.cancel"))}</button><button type="button" class="vno-btn vno-btn-primary vno-insert-caption">${esc(locale === "en" ? "Insert" : "Chèn")}</button>`
    );
    const kindSelect = overlay.querySelector(".vno-caption-kind");
    const positionSelect = overlay.querySelector(".vno-caption-position");
    const textInput = overlay.querySelector(".vno-caption-text-input");
    const preview = overlay.querySelector(".vno-caption-preview");
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      document.removeEventListener("keydown", onKeyDown, true);
      overlay.remove();
      resolve(value);
    };
    const readValue = () => ({
      kind: normalizeCaptionKind(kindSelect.value),
      position: positionSelect.value === "above" ? "above" : "below",
      text: String(textInput.value || "").trim()
    });
    const refreshPreview = () => {
      preview.textContent = formatCaptionVisibleText(kindSelect.value, nextNumber, textInput.value, locale);
    };
    kindSelect.addEventListener("change", () => {
      if (!options.position) positionSelect.value = defaultCaptionPosition(kindSelect.value);
      refreshPreview();
    });
    textInput.addEventListener("input", refreshPreview);
    overlay.querySelectorAll(".vno-cancel, .vno-dialog-close-btn").forEach((btn) => {
      btn.addEventListener("click", () => finish(null));
    });
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) finish(null);
    });
    overlay.querySelector(".vno-insert-caption").addEventListener("click", () => finish(readValue()));
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        finish(null);
      } else if (event.key === "Enter" && event.target?.tagName !== "TEXTAREA") {
        event.preventDefault();
        finish(readValue());
      }
    };
    document.addEventListener("keydown", onKeyDown, true);
    textInput.focus();
    textInput.select?.();
  });
}

export function showInsertTableOfFiguresDialog(options = {}) {
  if (typeof document === "undefined" || !document.body || typeof document.createElement !== "function") {
    if (options.headlessResult) return Promise.resolve(options.headlessResult);
    return Promise.resolve({ kind: normalizeTofKind(options.kind || "figure") });
  }

  const locale = getLocale();
  const initialKind = normalizeTofKind(options.kind || "figure");
  const title = t("writerDialogs.tof.title") === "writerDialogs.tof.title"
    ? (locale === "en" ? "Insert Table of Figures" : "Chèn danh mục hình ảnh")
    : t("writerDialogs.tof.title");

  return new Promise((resolve) => {
    const kindOptions = [
      ["figure", locale === "en" ? "Figures" : "Hình ảnh"],
      ["table", locale === "en" ? "Tables" : "Bảng"],
      ["equation", locale === "en" ? "Equations" : "Phương trình"],
      ["all", locale === "en" ? "All captions" : "Tất cả chú thích"]
    ].map(([value, label]) => (
      `<option value="${value}" ${value === initialKind ? "selected" : ""}>${esc(label)}</option>`
    )).join("");
    const overlay = dialogShell(
      title,
      `<div class="vno-caption-form"><label>${esc(locale === "en" ? "Caption label" : "Nhãn chú thích")}<select class="vno-tof-kind">${kindOptions}</select></label><p class="vno-caption-hint">${esc(locale === "en" ? "The list is built from captions already in the document, in document order." : "Danh mục được tạo từ các chú thích đã chèn, theo đúng thứ tự xuất hiện trong tài liệu.")}</p></div>`,
      `<button type="button" class="vno-btn vno-cancel">${esc(t("common.cancel"))}</button><button type="button" class="vno-btn vno-btn-primary vno-insert-tof">${esc(locale === "en" ? "Insert" : "Chèn")}</button>`
    );
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      document.removeEventListener("keydown", onKeyDown, true);
      overlay.remove();
      resolve(value);
    };
    overlay.querySelectorAll(".vno-cancel, .vno-dialog-close-btn").forEach((btn) => {
      btn.addEventListener("click", () => finish(null));
    });
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) finish(null);
    });
    overlay.querySelector(".vno-insert-tof").addEventListener("click", () => {
      finish({ kind: normalizeTofKind(overlay.querySelector(".vno-tof-kind").value) });
    });
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        finish(null);
      } else if (event.key === "Enter") {
        event.preventDefault();
        finish({ kind: normalizeTofKind(overlay.querySelector(".vno-tof-kind").value) });
      }
    };
    document.addEventListener("keydown", onKeyDown, true);
    overlay.querySelector(".vno-tof-kind").focus();
  });
}
