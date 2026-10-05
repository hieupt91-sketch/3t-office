/**
 * 3T Doc — Văn bản thành bảng: chuyển các đoạn đang chọn thành bảng theo dấu phân cách (Tab, dấu phẩy, dấu chấm phẩy, khoảng trắng hoặc ký tự khác).
 */

export const TABLE_DELIMITERS = [
  { id: "tab", label: "Tab" },
  { id: "comma", label: "Dấu phẩy ( , )" },
  { id: "semicolon", label: "Dấu chấm phẩy ( ; )" },
  { id: "space", label: "Khoảng trắng" },
  { id: "custom", label: "Ký tự khác" }
];

/** Tách các dòng thành lưới ô; các hàng ngắn được bù ô trống. Trả về { rows, cols } hoặc { error } tiếng Việt. */
export function splitTextToRows(lines, delimiterId = "tab", customChar = "") {
  const source = Array.isArray(lines) ? lines.map(line => String(line ?? "")) : [];
  while (source.length && !source[source.length - 1].trim()) source.pop();
  while (source.length && !source[0].trim()) source.shift();
  if (!source.length) return { error: "Hãy chọn ít nhất một đoạn có chữ để chuyển thành bảng." };
  if (delimiterId === "custom" && !String(customChar).length) return { error: "Hãy nhập ký tự phân cách." };
  const splitter = {
    tab: line => line.split("\t"),
    comma: line => line.split(","),
    semicolon: line => line.split(";"),
    space: line => line.trim().split(/\s+/),
    custom: line => line.split(String(customChar))
  }[delimiterId] || (line => line.split("\t"));
  const rows = source.map(line => splitter(line).map(cell => cell.trim()));
  const cols = Math.max(...rows.map(row => row.length));
  if (cols > 63) return { error: "Bảng có quá nhiều cột (tối đa 63). Hãy chọn dấu phân cách khác." };
  rows.forEach(row => { while (row.length < cols) row.push(""); });
  return { rows, cols };
}

export function buildTableHtml(rows) {
  const escape = value => String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const body = rows.map(row => `<tr>${row.map(cell => `<td style="border:1px solid #94a3b8; padding:6pt 10pt;">${escape(cell)}</td>`).join("")}</tr>`).join("");
  return `<table style="width:100%; border-collapse:collapse; margin:14pt 0;"><tbody>${body}</tbody></table>`;
}

function trapFocus(box, event) {
  if (event.key !== "Tab") return;
  const items = Array.from(box.querySelectorAll("button:not([disabled]), input:not([disabled]), select:not([disabled])"));
  if (!items.length) return;
  const first = items[0];
  const last = items[items.length - 1];
  if (event.shiftKey && (document.activeElement === first || !box.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && (document.activeElement === last || !box.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
}

/** @returns {Promise<{delimiter:string, custom:string}|null>} */
export async function showTextToTableDialog(lines = []) {
  if (typeof document === "undefined" || !document.body) return null;
  const guess = lines.some(line => String(line).includes("\t")) ? "tab"
    : lines.some(line => String(line).includes(";")) ? "semicolon"
    : lines.some(line => String(line).includes(",")) ? "comma" : "tab";
  return new Promise(resolve => {
    const previous = document.activeElement;
    const overlay = document.createElement("div");
    overlay.className = "vno-dialog-overlay";
    const options = TABLE_DELIMITERS.map(item => `<option value="${item.id}"${item.id === guess ? " selected" : ""}>${item.label}</option>`).join("");
    overlay.innerHTML = `
      <div class="vno-dialog-box vno-text-to-table-dialog" style="width: 460px;" role="dialog" aria-modal="true" aria-labelledby="vno-t2t-title">
        <div class="vno-dialog-header">
          <span id="vno-t2t-title">Chuyển văn bản thành bảng</span>
          <button type="button" class="vno-btn vno-btn-icon-only vno-dialog-close-btn" title="Đóng" aria-label="Đóng">&times;</button>
        </div>
        <div class="vno-dialog-body" style="display:flex; flex-direction:column; gap:12px;">
          <div>
            <label for="vno-t2t-delim" style="font-size:12px; font-weight:600; display:block; margin-bottom:4px;">Tách văn bản tại</label>
            <select id="vno-t2t-delim" class="vno-dialog-input" style="width:100%; box-sizing:border-box; font-size:13px; padding:5px 8px;">${options}</select>
          </div>
          <div id="vno-t2t-custom-row" style="display:none;">
            <label for="vno-t2t-custom" style="font-size:12px; font-weight:600; display:block; margin-bottom:4px;">Ký tự phân cách</label>
            <input id="vno-t2t-custom" class="vno-dialog-input" maxlength="3" style="width:100%; box-sizing:border-box; font-size:13px; padding:5px 8px;" />
          </div>
          <div id="vno-t2t-summary" aria-live="polite" style="font-size:13px; color:#334155;"></div>
          <div id="vno-t2t-error" role="alert" style="color:#b91c1c; font-size:12px; min-height:16px;"></div>
        </div>
        <div class="vno-dialog-footer" style="display:flex; justify-content:flex-end; gap:8px;">
          <button type="button" class="vno-btn vno-dialog-cancel-btn">Hủy</button>
          <button type="button" class="vno-btn vno-btn-primary vno-dialog-ok-btn">Tạo bảng</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const box = overlay.querySelector(".vno-dialog-box");
    const el = id => overlay.querySelector(id);
    const read = () => ({ delimiter: el("#vno-t2t-delim").value, custom: el("#vno-t2t-custom").value });
    const refresh = () => {
      const { delimiter, custom } = read();
      el("#vno-t2t-custom-row").style.display = delimiter === "custom" ? "block" : "none";
      const result = splitTextToRows(lines, delimiter, custom);
      el("#vno-t2t-error").textContent = result.error || "";
      el("#vno-t2t-summary").textContent = result.error ? "" : `Sẽ tạo bảng ${result.rows.length} hàng × ${result.cols} cột.`;
      return result;
    };
    overlay.addEventListener("input", refresh);
    overlay.addEventListener("change", refresh);
    refresh();
    el("#vno-t2t-delim").focus();
    const onKeyDown = event => {
      if (event.key === "Escape") { event.preventDefault(); cleanup(null); }
      else if (event.key === "Enter" && event.target?.tagName === "INPUT") { event.preventDefault(); apply(); }
      else if (event.key === "Tab") trapFocus(box, event);
    };
    function cleanup(result) {
      document.removeEventListener("keydown", onKeyDown);
      overlay.parentNode?.removeChild(overlay);
      previous?.focus?.();
      resolve(result);
    }
    function apply() {
      const result = refresh();
      if (result.error) return;
      cleanup(read());
    }
    el(".vno-dialog-ok-btn").addEventListener("click", apply);
    el(".vno-dialog-cancel-btn").addEventListener("click", () => cleanup(null));
    el(".vno-dialog-close-btn").addEventListener("click", () => cleanup(null));
    overlay.addEventListener("click", event => { if (event.target === overlay) cleanup(null); });
    document.addEventListener("keydown", onKeyDown);
  });
}
