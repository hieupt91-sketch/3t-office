/**
 * 3T Doc — Văn bản thành bảng, Bảng thành văn bản và Bảng dựng sẵn (Quick Tables).
 */

export const TABLE_DELIMITERS = [
  { id: "tab", label: "Tab" },
  { id: "comma", label: "Dấu phẩy ( , )" },
  { id: "semicolon", label: "Dấu chấm phẩy ( ; )" },
  { id: "space", label: "Khoảng trắng" },
  { id: "custom", label: "Ký tự khác" }
];

export const QUICK_TABLES = [
  {
    id: "calendar",
    name: "Lịch tháng",
    description: "Bảng lịch một tháng gồm tiêu đề tháng, 7 ngày trong tuần (T2–CN) và lưới ngày số 1–31.",
    buildHtml: () => {
      let html = '<table style="width:100%; border-collapse:collapse; margin:14pt 0; font-size:11pt; border:1px solid #94a3b8;">';
      html += '<thead>';
      html += '<tr><th colspan="7" style="background:#f1f5f9; color:#1e293b; padding:8pt; text-align:center; font-weight:bold; border:1px solid #cbd5e1; font-size:13pt;">Tháng 10 / 2026</th></tr>';
      html += '<tr>';
      const days = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
      for (const d of days) {
        html += `<th style="background:#e2e8f0; color:#334155; padding:6pt; text-align:center; font-weight:600; border:1px solid #cbd5e1; width:14.28%;">${d}</th>`;
      }
      html += '</tr></thead><tbody>';
      let day = 1;
      for (let w = 0; w < 5; w++) {
        html += '<tr>';
        for (let d = 0; d < 7; d++) {
          if ((w === 0 && d < 3) || day > 31) {
            html += '<td style="border:1px solid #cbd5e1; padding:8pt; text-align:center; color:#94a3b8;"><br></td>';
          } else {
            html += `<td style="border:1px solid #cbd5e1; padding:8pt; text-align:center; font-weight:500;">${day++}</td>`;
          }
        }
        html += '</tr>';
      }
      html += '</tbody></table><p><br></p>';
      return html;
    }
  },
  {
    id: "list",
    name: "Danh sách công việc",
    description: "Bảng theo dõi tiến độ công việc chuẩn với các cột STT, Hạng mục, Người phụ trách, Hạn chót, Trạng thái.",
    buildHtml: () => {
      let html = '<table style="width:100%; border-collapse:collapse; margin:14pt 0; font-size:11pt; border:1px solid #94a3b8;">';
      html += '<thead><tr style="background:#0284c7; color:#ffffff;">';
      html += '<th style="border:1px solid #0369a1; padding:7pt 10pt; text-align:center; width:60px;">STT</th>';
      html += '<th style="border:1px solid #0369a1; padding:7pt 10pt; text-align:left;">Hạng mục công việc</th>';
      html += '<th style="border:1px solid #0369a1; padding:7pt 10pt; text-align:left; width:160px;">Người phụ trách</th>';
      html += '<th style="border:1px solid #0369a1; padding:7pt 10pt; text-align:center; width:120px;">Hạn chót</th>';
      html += '<th style="border:1px solid #0369a1; padding:7pt 10pt; text-align:center; width:130px;">Trạng thái</th>';
      html += '</tr></thead><tbody>';
      const tasks = [
        ["1", "Khảo sát và lập đề cương kế hoạch", "Nguyễn Văn A", "20/10/2026", "Hoàn thành"],
        ["2", "Thiết kế và triển khai mẫu thử", "Trần Thị B", "25/10/2026", "Đang thực hiện"],
        ["3", "Kiểm thử nghiệm thu và báo cáo", "Lê Văn C", "30/10/2026", "Chờ duyệt"]
      ];
      for (const [stt, task, pic, deadline, status] of tasks) {
        html += '<tr>';
        html += `<td style="border:1px solid #cbd5e1; padding:6pt 10pt; text-align:center;">${stt}</td>`;
        html += `<td style="border:1px solid #cbd5e1; padding:6pt 10pt;">${task}</td>`;
        html += `<td style="border:1px solid #cbd5e1; padding:6pt 10pt;">${pic}</td>`;
        html += `<td style="border:1px solid #cbd5e1; padding:6pt 10pt; text-align:center;">${deadline}</td>`;
        html += `<td style="border:1px solid #cbd5e1; padding:6pt 10pt; text-align:center; color:#0284c7; font-weight:500;">${status}</td>`;
        html += '</tr>';
      }
      html += '</tbody></table><p><br></p>';
      return html;
    }
  },
  {
    id: "matrix",
    name: "Ma trận phân tích (SWOT)",
    description: "Ma trận đánh giá 2 × 2 gồm 4 góc phần tư: Điểm mạnh, Điểm yếu, Cơ hội, Thách thức.",
    buildHtml: () => {
      let html = '<table style="width:100%; border-collapse:collapse; margin:14pt 0; font-size:11pt; border:2px solid #64748b;">';
      html += '<tbody>';
      html += '<tr>';
      html += '<td style="border:1px solid #cbd5e1; padding:12pt; width:50%; vertical-align:top; background:#f0fdf4;">';
      html += '<div style="font-weight:bold; color:#15803d; font-size:12pt; margin-bottom:6pt;">ĐIỂM MẠNH (STRENGTHS)</div>';
      html += '<ul style="margin:0; padding-left:18px; color:#166534;"><li>Năng lực đội ngũ vững vàng</li><li>Quy trình chuẩn hóa</li></ul></td>';
      html += '<td style="border:1px solid #cbd5e1; padding:12pt; width:50%; vertical-align:top; background:#fef2f2;">';
      html += '<div style="font-weight:bold; color:#b91c1c; font-size:12pt; margin-bottom:6pt;">ĐIỂM YẾU (WEAKNESSES)</div>';
      html += '<ul style="margin:0; padding-left:18px; color:#991b1b;"><li>Thời gian bàn giao còn gấp</li><li>Nguồn lực phụ trách phân tán</li></ul></td>';
      html += '</tr><tr>';
      html += '<td style="border:1px solid #cbd5e1; padding:12pt; width:50%; vertical-align:top; background:#eff6ff;">';
      html += '<div style="font-weight:bold; color:#1d4ed8; font-size:12pt; margin-bottom:6pt;">CƠ HỘI (OPPORTUNITIES)</div>';
      html += '<ul style="margin:0; padding-left:18px; color:#1e40af;"><li>Mở rộng thị trường mục tiêu</li><li>Áp dụng giải pháp tự động hóa</li></ul></td>';
      html += '<td style="border:1px solid #cbd5e1; padding:12pt; width:50%; vertical-align:top; background:#fffbeb;">';
      html += '<div style="font-weight:bold; color:#b45309; font-size:12pt; margin-bottom:6pt;">THÁCH THỨC (THREATS)</div>';
      html += '<ul style="margin:0; padding-left:18px; color:#92400e;"><li>Biến động yêu cầu tiến độ</li><li>Cạnh tranh về chi phí</li></ul></td>';
      html += '</tr></tbody></table><p><br></p>';
      return html;
    }
  }
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

/** Chuyển bảng thành mảng các đoạn văn bản theo dấu phân cách. */
export function convertTableToParagraphs(table, delimiterId = "tab", customChar = "") {
  if (!table) return [];
  const rows = Array.from(table.querySelectorAll("tr"));
  const sep = {
    tab: "\t",
    comma: ", ",
    semicolon: "; ",
    paragraph: "\n",
    space: " ",
    custom: String(customChar || "")
  }[delimiterId] ?? "\t";

  const paragraphs = [];
  for (const tr of rows) {
    const cells = Array.from(tr.querySelectorAll("th, td"));
    if (!cells.length) continue;
    const cellTexts = cells.map(cell => {
      return (cell.innerText ?? cell.textContent ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
    });
    if (delimiterId === "paragraph") {
      for (const t of cellTexts) {
        if (t.length) paragraphs.push(t);
      }
    } else {
      paragraphs.push(cellTexts.join(sep));
    }
  }
  return paragraphs;
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
          <div style="border:1px solid #e2e8f0; border-radius:4px; padding:10px; background:#f8fafc;">
            <div style="font-weight:600; font-size:12px; margin-bottom:8px; color:#334155;">Kích thước bảng</div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
              <div>
                <label for="vno-t2t-cols" style="font-size:12px; display:block; margin-bottom:2px; color:#475569;">Số cột (tự động):</label>
                <input id="vno-t2t-cols" class="vno-dialog-input" type="number" readonly style="width:100%; box-sizing:border-box; background:#ffffff; font-size:13px; padding:4px 6px;" />
              </div>
              <div>
                <label for="vno-t2t-rows" style="font-size:12px; display:block; margin-bottom:2px; color:#475569;">Số hàng:</label>
                <input id="vno-t2t-rows" class="vno-dialog-input" type="number" readonly style="width:100%; box-sizing:border-box; background:#ffffff; font-size:13px; padding:4px 6px;" />
              </div>
            </div>
          </div>
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
      if (result.error) {
        el("#vno-t2t-summary").textContent = "";
        el("#vno-t2t-cols").value = "";
        el("#vno-t2t-rows").value = "";
      } else {
        el("#vno-t2t-cols").value = result.cols;
        el("#vno-t2t-rows").value = result.rows.length;
        el("#vno-t2t-summary").textContent = `Sẽ tạo bảng ${result.rows.length} hàng × ${result.cols} cột (tự động theo dấu phân cách).`;
      }
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

/** @returns {Promise<{delimiter:string, custom:string}|null>} */
export async function showTableToTextDialog(table = null) {
  if (typeof document === "undefined" || !document.body) return null;
  return new Promise(resolve => {
    const previous = document.activeElement;
    const overlay = document.createElement("div");
    overlay.className = "vno-dialog-overlay";
    const options = [
      { id: "tab", label: "Dấu Tab", checked: true },
      { id: "comma", label: "Dấu phẩy ( , )" },
      { id: "semicolon", label: "Dấu chấm phẩy ( ; )" },
      { id: "paragraph", label: "Dấu đoạn văn" },
      { id: "custom", label: "Ký tự khác" }
    ];
    const radios = options.map(opt => `
      <label style="display:flex; align-items:center; gap:8px; font-size:13px; cursor:pointer;">
        <input type="radio" name="vno-t2text-delim" value="${opt.id}"${opt.checked ? " checked" : ""} />
        <span>${opt.label}</span>
      </label>
    `).join("");

    const rowCount = table ? table.querySelectorAll("tr").length : 0;
    const colCount = table ? (table.querySelector("tr")?.querySelectorAll("th, td")?.length || 0) : 0;

    overlay.innerHTML = `
      <div class="vno-dialog-box vno-table-to-text-dialog" style="width: 420px;" role="dialog" aria-modal="true" aria-labelledby="vno-t2text-title">
        <div class="vno-dialog-header">
          <span id="vno-t2text-title">Chuyển bảng thành văn bản</span>
          <button type="button" class="vno-btn vno-btn-icon-only vno-dialog-close-btn" title="Đóng" aria-label="Đóng">&times;</button>
        </div>
        <div class="vno-dialog-body" style="display:flex; flex-direction:column; gap:12px;">
          <div style="font-size:13px; color:#475569;">
            Bảng hiện tại có <strong>${rowCount} hàng × ${colCount} cột</strong> sẽ được chuyển thành các đoạn văn bản thường.
          </div>
          <fieldset style="border:1px solid #cbd5e1; border-radius:4px; padding:10px 14px; margin:0;">
            <legend style="font-size:12px; font-weight:600; color:#334155; padding:0 4px;">Tách văn bản bằng</legend>
            <div style="display:flex; flex-direction:column; gap:8px; margin-top:4px;">
              ${radios}
            </div>
            <div id="vno-t2text-custom-row" style="display:none; margin-top:8px;">
              <input id="vno-t2text-custom" class="vno-dialog-input" maxlength="5" placeholder="Nhập ký tự phân cách" style="width:100%; box-sizing:border-box; font-size:13px; padding:5px 8px;" />
            </div>
          </fieldset>
          <div id="vno-t2text-error" role="alert" style="color:#b91c1c; font-size:12px; min-height:16px;"></div>
        </div>
        <div class="vno-dialog-footer" style="display:flex; justify-content:flex-end; gap:8px;">
          <button type="button" class="vno-btn vno-dialog-cancel-btn">Hủy</button>
          <button type="button" class="vno-btn vno-btn-primary vno-dialog-ok-btn">Chuyển đổi</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const box = overlay.querySelector(".vno-dialog-box");
    const el = id => overlay.querySelector(id);
    const getDelim = () => overlay.querySelector('input[name="vno-t2text-delim"]:checked')?.value || "tab";
    const refresh = () => {
      const delim = getDelim();
      el("#vno-t2text-custom-row").style.display = delim === "custom" ? "block" : "none";
      if (delim === "custom" && !el("#vno-t2text-custom").value.length) {
        el("#vno-t2text-error").textContent = "Hãy nhập ký tự phân cách.";
        return false;
      }
      el("#vno-t2text-error").textContent = "";
      return true;
    };
    overlay.addEventListener("change", refresh);
    overlay.addEventListener("input", refresh);
    refresh();

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
      if (!refresh()) return;
      cleanup({ delimiter: getDelim(), custom: el("#vno-t2text-custom").value });
    }
    el(".vno-dialog-ok-btn").addEventListener("click", apply);
    el(".vno-dialog-cancel-btn").addEventListener("click", () => cleanup(null));
    el(".vno-dialog-close-btn").addEventListener("click", () => cleanup(null));
    overlay.addEventListener("click", event => { if (event.target === overlay) cleanup(null); });
    document.addEventListener("keydown", onKeyDown);
  });
}

/** @returns {Promise<string|null>} templateId */
export async function showQuickTablesDialog() {
  if (typeof document === "undefined" || !document.body) return null;
  return new Promise(resolve => {
    const previous = document.activeElement;
    const overlay = document.createElement("div");
    overlay.className = "vno-dialog-overlay";
    let selectedId = "calendar";

    const cards = QUICK_TABLES.map(t => `
      <div class="vno-quick-table-card${t.id === selectedId ? " is-selected" : ""}" data-id="${t.id}" tabindex="0" role="button" style="border:2px solid ${t.id === selectedId ? "#0284c7" : "#e2e8f0"}; border-radius:6px; padding:12px; cursor:pointer; background:${t.id === selectedId ? "#f0f9ff" : "#ffffff"}; transition:all 0.15s ease;">
        <div style="font-weight:600; font-size:14px; color:#0f172a; margin-bottom:4px;">${t.name}</div>
        <div style="font-size:12px; color:#64748b; line-height:1.4;">${t.description}</div>
      </div>
    `).join("");

    overlay.innerHTML = `
      <div class="vno-dialog-box vno-quick-tables-dialog" style="width: 520px;" role="dialog" aria-modal="true" aria-labelledby="vno-qt-title">
        <div class="vno-dialog-header">
          <span id="vno-qt-title">Bảng dựng sẵn (Quick Tables)</span>
          <button type="button" class="vno-btn vno-btn-icon-only vno-dialog-close-btn" title="Đóng" aria-label="Đóng">&times;</button>
        </div>
        <div class="vno-dialog-body" style="display:flex; flex-direction:column; gap:10px;">
          <div style="font-size:13px; color:#475569;">Chọn một mẫu bảng dựng sẵn để chèn nhanh vào văn bản:</div>
          <div class="vno-quick-tables-list" style="display:flex; flex-direction:column; gap:8px;">
            ${cards}
          </div>
        </div>
        <div class="vno-dialog-footer" style="display:flex; justify-content:flex-end; gap:8px;">
          <button type="button" class="vno-btn vno-dialog-cancel-btn">Hủy</button>
          <button type="button" class="vno-btn vno-btn-primary vno-dialog-ok-btn">Chèn bảng</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const box = overlay.querySelector(".vno-dialog-box");
    const cardEls = overlay.querySelectorAll(".vno-quick-table-card");

    const selectCard = id => {
      selectedId = id;
      cardEls.forEach(c => {
        const active = c.dataset.id === id;
        c.classList.toggle("is-selected", active);
        c.style.borderColor = active ? "#0284c7" : "#e2e8f0";
        c.style.background = active ? "#f0f9ff" : "#ffffff";
      });
    };

    cardEls.forEach(c => {
      c.addEventListener("click", () => selectCard(c.dataset.id));
      c.addEventListener("dblclick", () => {
        selectCard(c.dataset.id);
        cleanup(selectedId);
      });
      c.addEventListener("keydown", e => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          selectCard(c.dataset.id);
        }
      });
    });

    const onKeyDown = event => {
      if (event.key === "Escape") { event.preventDefault(); cleanup(null); }
      else if (event.key === "Tab") trapFocus(box, event);
    };
    function cleanup(result) {
      document.removeEventListener("keydown", onKeyDown);
      overlay.parentNode?.removeChild(overlay);
      previous?.focus?.();
      resolve(result);
    }

    overlay.querySelector(".vno-dialog-ok-btn").addEventListener("click", () => cleanup(selectedId));
    overlay.querySelector(".vno-dialog-cancel-btn").addEventListener("click", () => cleanup(null));
    overlay.querySelector(".vno-dialog-close-btn").addEventListener("click", () => cleanup(null));
    overlay.addEventListener("click", event => { if (event.target === overlay) cleanup(null); });
    document.addEventListener("keydown", onKeyDown);
  });
}

