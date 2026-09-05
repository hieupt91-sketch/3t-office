import { t } from "../../platform/i18n/i18n.js";

export const CITATION_STYLES = Object.freeze(["apa", "mla"]);
export const SOURCE_TYPES = Object.freeze(["book", "article", "website", "other"]);
export const CITATION_METADATA_PREFIX = "VNO_CITATIONS_V1:";

const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (ch) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[ch]));

export function normalizeSource(source = {}) {
  return {
    id: String(source.id || `src-${Date.now()}-${Math.floor(Math.random() * 100000)}`),
    type: SOURCE_TYPES.includes(source.type) ? source.type : "other",
    author: String(source.author || "").trim(),
    title: String(source.title || "").trim(),
    year: String(source.year || "").trim(),
    publisher: String(source.publisher || "").trim(),
    url: String(source.url || "").trim()
  };
}

export function authorSortKey(source) {
  return (source.author || source.title || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("vi");
}

function authorShort(author) {
  const names = String(author || "").split(/\s*(?:;|\band\b|&)\s*/i).filter(Boolean);
  if (!names.length) return "Khuyết danh";
  // Tên tiếng Việt viết theo thứ tự Họ-Đệm-Tên (họ đứng đầu), khác thứ tự
  // phương Tây "First Last" — nên lấy TỪ ĐẦU TIÊN làm họ để trích dẫn, không
  // lấy từ cuối cùng (đó sẽ là tên riêng, ví dụ "Nguyễn Văn A" → "Nguyễn").
  const first = names[0].trim().split(/\s+/)[0];
  return names.length > 1 ? `${first} và cs.` : first;
}

export function formatInTextCitation(source, style = "apa") {
  const src = normalizeSource(source);
  const author = authorShort(src.author || src.title);
  if (style === "mla") return `(${author})`;
  return `(${author}${src.year ? `, ${src.year}` : ", k.n."})`;
}

export function formatBibliographyEntry(source, style = "apa") {
  const src = normalizeSource(source);
  const author = src.author || "Khuyết danh";
  const title = src.title || "Không có tiêu đề";
  if (style === "mla") {
    return `${author}. <i>${esc(title)}</i>.${src.publisher ? ` ${esc(src.publisher)},` : ""}${src.year ? ` ${esc(src.year)}.` : ""}${src.url ? ` ${esc(src.url)}.` : ""}`;
  }
  return `${esc(author)}. ${src.year ? `(${esc(src.year)}).` : "(k.n.)."} <i>${esc(title)}</i>.${src.publisher ? ` ${esc(src.publisher)}.` : ""}${src.url ? ` ${esc(src.url)}` : ""}`;
}

export function serializeCitationMetadata({ style = "apa", sources = [] } = {}) {
  const data = { version: 1, style: CITATION_STYLES.includes(style) ? style : "apa", sources: sources.map(normalizeSource) };
  return `${CITATION_METADATA_PREFIX}${encodeURIComponent(JSON.stringify(data))}`;
}

export function parseCitationMetadata(text = "") {
  const match = String(text).match(/VNO_CITATIONS_V1:([^\s<]+)/);
  if (!match) return null;
  try {
    const data = JSON.parse(decodeURIComponent(match[1]));
    return { style: CITATION_STYLES.includes(data.style) ? data.style : "apa", sources: Array.isArray(data.sources) ? data.sources.map(normalizeSource) : [] };
  } catch { return null; }
}

export function citationMetadataHtml(state) {
  return `<span class="vno-citation-metadata" data-vno-citation-metadata="true" contenteditable="false" aria-hidden="true" style="display:none">${serializeCitationMetadata(state)}</span>`;
}

function trapFocus(element, event) {
  if (event.key !== "Tab") return;
  const items = [...element.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')];
  if (!items.length) return;
  const first = items[0], last = items.at(-1);
  if ((event.shiftKey && document.activeElement === first) || (!event.shiftKey && document.activeElement === last)) {
    event.preventDefault();
    event.stopPropagation();
    (event.shiftKey ? last : first).focus();
  }
}

function dialogShell(title, body, footer, onCancel) {
  const previousFocused = (typeof document !== "undefined" && document.activeElement) || null;
  const overlay = document.createElement("div");
  overlay.className = "vno-dialog-overlay vno-citation-dialog-overlay";
  overlay.innerHTML = `<div class="vno-dialog-box vno-citation-dialog" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="vno-dialog-header"><strong>${esc(title)}</strong><button type="button" class="vno-btn vno-dialog-close-btn" aria-label="${esc(t("common.close"))}">×</button></div><div class="vno-dialog-body">${body}</div><div class="vno-dialog-footer">${footer}</div></div>`;
  document.body.appendChild(overlay);
  const box = overlay.querySelector(".vno-dialog-box");
  const onKey = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      if (typeof onCancel === "function") onCancel();
    } else {
      trapFocus(box, event);
    }
  };
  document.addEventListener("keydown", onKey);
  overlay._destroy = () => {
    document.removeEventListener("keydown", onKey);
    overlay.remove();
    previousFocused?.focus?.();
  };
  return overlay;
}

export function showSourceEditorDialog(source = {}, options = {}) {
  if (typeof document === "undefined" || !document.body) return Promise.resolve(options.headlessResult ? normalizeSource(options.headlessResult) : null);
  const src = normalizeSource(source);
  return new Promise((resolve) => {
    const fields = [["type", "Loại", "select"], ["author", "Tác giả"], ["title", "Tiêu đề"], ["year", "Năm"], ["publisher", "Nhà xuất bản"], ["url", "URL"]];
    const body = `<div class="vno-citation-form">${fields.map(([name, label, kind]) => `<label>${label}${kind === "select" ? `<select name="type">${SOURCE_TYPES.map(v => `<option value="${v}" ${src.type === v ? "selected" : ""}>${({book:"Sách",article:"Bài báo",website:"Website",other:"Khác"})[v]}</option>`).join("")}</select>` : `<input name="${name}" value="${esc(src[name])}">`}</label>`).join("")}<div class="vno-citation-error" role="alert" hidden>Nhập ít nhất tác giả hoặc tiêu đề.</div></div>`;
    let closed = false;
    let overlay;
    const finish = (value) => { if (closed) return; closed = true; overlay?._destroy?.(); resolve(value); };
    overlay = dialogShell(source.id ? "Sửa nguồn" : "Thêm nguồn mới", body, `<button type="button" class="vno-btn vno-cancel">Hủy</button><button type="button" class="vno-btn vno-btn-primary vno-save-source">Lưu</button>`, () => finish(null));
    overlay.querySelectorAll(".vno-cancel,.vno-dialog-close-btn").forEach(b => b.addEventListener("click", () => finish(null)));
    const commit = () => {
      const value = normalizeSource(Object.fromEntries(fields.map(([name]) => [name, overlay.querySelector(`[name="${name}"]`).value])));
      value.id = src.id;
      if (!value.author && !value.title) { overlay.querySelector(".vno-citation-error").hidden = false; return; }
      finish(value);
    };
    overlay.querySelector(".vno-save-source").addEventListener("click", commit);
    overlay.querySelector(".vno-dialog-box").addEventListener("keydown", (e) => {
      if (e.key === "Enter" && e.target.tagName === "INPUT") { e.preventDefault(); e.stopPropagation(); commit(); }
    });
    overlay.querySelector('[name="author"]').focus();
  });
}

export function showInsertCitationDialog(sources = [], options = {}) {
  if (typeof document === "undefined" || !document.body) return Promise.resolve(options.headlessSource || sources[0] || null);
  return new Promise((resolve) => {
    const choices = sources.map(s => `<option value="${esc(s.id)}">${esc(formatInTextCitation(s, options.style))} — ${esc(s.title)}</option>`).join("");
    let closed = false;
    let overlay;
    const finish = value => { if (closed) return; closed = true; overlay?._destroy?.(); resolve(value); };
    overlay = dialogShell("Chèn trích dẫn", choices ? `<label>Nguồn tài liệu<select class="vno-source-select">${choices}</select></label>` : `<p class="vno-empty-sources">Chưa có nguồn tài liệu.</p>`, `<button type="button" class="vno-btn vno-new-source">Thêm nguồn mới</button><button type="button" class="vno-btn vno-cancel">Hủy</button><button type="button" class="vno-btn vno-btn-primary vno-insert-citation" ${choices ? "" : "disabled"}>Chèn</button>`, () => finish(null));
    overlay.querySelectorAll(".vno-cancel,.vno-dialog-close-btn").forEach(b => b.addEventListener("click", () => finish(null)));
    const commit = () => finish(sources.find(s => s.id === overlay.querySelector(".vno-source-select")?.value) || null);
    overlay.querySelector(".vno-insert-citation").addEventListener("click", commit);
    overlay.querySelector(".vno-new-source").addEventListener("click", async () => { const added = await showSourceEditorDialog({}); if (added) finish({ ...added, isNew: true }); });
    overlay.querySelector(".vno-dialog-box").addEventListener("keydown", (e) => {
      if (e.key === "Enter" && choices) { e.preventDefault(); e.stopPropagation(); commit(); }
    });
    (overlay.querySelector(".vno-source-select") || overlay.querySelector(".vno-new-source"))?.focus();
  });
}

export function showSourceManagerDialog(sources = [], options = {}) {
  if (typeof document === "undefined" || !document.body) return Promise.resolve(options.headlessActions || []);
  return new Promise((resolve) => {
    const draft = sources.map(normalizeSource);
    let closed = false;
    let overlay;
    const finish = value => { if (closed) return; closed = true; overlay?._destroy?.(); resolve(value); };
    overlay = dialogShell("Quản lý nguồn", `<div class="vno-source-list"></div>`, `<button type="button" class="vno-btn vno-add-source">Thêm</button><button type="button" class="vno-btn vno-cancel">Hủy</button><button type="button" class="vno-btn vno-btn-primary vno-apply-sources">Áp dụng</button>`, () => finish(null));
    const render = () => { overlay.querySelector(".vno-source-list").innerHTML = draft.length ? draft.map(s => `<div class="vno-source-row" data-source-id="${esc(s.id)}"><span><b>${esc(s.author || "Khuyết danh")}</b><small>${esc(s.title)} · ${esc(s.year)}</small></span><button type="button" class="vno-btn vno-btn-sm vno-edit-source">Sửa</button><button type="button" class="vno-btn vno-btn-sm vno-delete-source">Xóa</button></div>`).join("") : `<p class="vno-empty-sources">Chưa có nguồn tài liệu.</p>`; };
    render();
    overlay.querySelector(".vno-source-list").addEventListener("click", async e => { const row = e.target.closest(".vno-source-row"); if (!row) return; const i = draft.findIndex(s => s.id === row.dataset.sourceId); if (e.target.closest(".vno-edit-source")) { const edited = await showSourceEditorDialog(draft[i]); if (edited) draft[i] = edited; } else if (e.target.closest(".vno-delete-source")) { if (!options.isSourceUsed?.(draft[i].id) || window.confirm("Nguồn đang được trích dẫn. Xóa nguồn và giữ trích dẫn hiện tại dưới dạng văn bản đóng băng?")) draft.splice(i, 1); } render(); });
    overlay.querySelector(".vno-add-source").addEventListener("click", async () => { const added = await showSourceEditorDialog({}); if (added) { draft.push(added); render(); } });
    overlay.querySelectorAll(".vno-cancel,.vno-dialog-close-btn").forEach(b => b.addEventListener("click", () => finish(null)));
    overlay.querySelector(".vno-apply-sources").addEventListener("click", () => finish(draft));
  });
}
