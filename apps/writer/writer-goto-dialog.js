/**
 * 3T Doc — Hộp thoại Đi đến (Go To, Ctrl+G) chuẩn văn phòng.
 * Cho phép chuyển nhanh con trỏ tới Trang, Dòng, Đề mục, Dấu trang, Chú thích cuối trang, Bảng.
 * Hỗ trợ các nút Đi đến, Tiếp (Next) và Trước (Previous).
 */

export const GOTO_TYPES = [
  { id: "page", label: "Trang", inputLabel: "Nhập số trang:", hint: "Nhập số trang, hoặc dùng + và - để di chuyển tương đối." },
  { id: "line", label: "Dòng", inputLabel: "Nhập số dòng:", hint: "Nhập số dòng, hoặc dùng + và - để di chuyển tương đối." },
  { id: "heading", label: "Đề mục", inputLabel: "Chọn hoặc nhập tên đề mục:", hint: "Chọn đề mục từ danh sách bên dưới hoặc nhập số thứ tự." },
  { id: "bookmark", label: "Dấu trang", inputLabel: "Chọn hoặc nhập tên dấu trang:", hint: "Chọn dấu trang từ danh sách bên dưới." },
  { id: "footnote", label: "Chú thích cuối trang", inputLabel: "Nhập số chú thích:", hint: "Nhập số chú thích, hoặc dùng + và - để di chuyển." },
  { id: "table", label: "Bảng", inputLabel: "Nhập số thứ tự bảng:", hint: "Nhập số thứ tự bảng, hoặc dùng + và - để di chuyển." }
];

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
}

function trapFocus(box, event) {
  if (event.key !== "Tab") return;
  const items = Array.from(box.querySelectorAll("button:not([disabled]), input:not([disabled]), select:not([disabled])"));
  if (!items.length) return;
  const first = items[0];
  const last = items[items.length - 1];
  if (event.shiftKey && (document.activeElement === first || !box.contains(document.activeElement))) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (document.activeElement === last || !box.contains(document.activeElement))) {
    event.preventDefault();
    first.focus();
  }
}

/**
 * Hiển thị hộp thoại Đi đến (Ctrl+G).
 * @param {Object} options
 * @param {Function} options.onNavigate Callback điều hướng: ({ type, target, direction }) => boolean | void
 * @param {Object} options.data Dữ liệu danh sách có sẵn: { headings: string[], bookmarks: string[], totalPages: number, totalTables: number, totalFootnotes: number }
 */
export async function showGoToDialog({ onNavigate, data = {} } = {}) {
  if (typeof document === "undefined" || !document.body) return null;

  return new Promise(resolve => {
    const previous = document.activeElement;
    let selectedType = "page";
    let currentIndex = 0;

    const overlay = document.createElement("div");
    overlay.className = "vno-dialog-overlay";

    const fieldStyle = "font-size:12px; font-weight:600; display:block; margin-bottom:4px; color:#334155;";
    const inputStyle = "width:100%; box-sizing:border-box; font-size:13px; padding:6px 10px; border:1px solid #cbd5e1; border-radius:4px;";

    overlay.innerHTML = `
      <div class="vno-dialog-box vno-goto-dialog" style="width: 520px;" role="dialog" aria-modal="true" aria-labelledby="vno-goto-title">
        <div class="vno-dialog-header">
          <span id="vno-goto-title">Tìm và Thay thế — Đi đến</span>
          <button type="button" class="vno-btn vno-btn-icon-only vno-dialog-close-btn" title="Đóng" aria-label="Đóng">&times;</button>
        </div>
        <div class="vno-dialog-body" style="display:grid; grid-template-columns: 180px 1fr; gap:16px;">
          <div>
            <label for="vno-goto-type-list" style="${fieldStyle}">Đi đến mục nào:</label>
            <select id="vno-goto-type-list" class="vno-dialog-input" size="6" style="${inputStyle}; height:140px;" aria-label="Danh sách mục cần đi đến">
              ${GOTO_TYPES.map((t, idx) => `<option value="${t.id}" ${idx === 0 ? "selected" : ""}>${t.label}</option>`).join("")}
            </select>
          </div>
          <div style="display:flex; flex-direction:column; justify-content:space-between;">
            <div>
              <label id="vno-goto-input-label" for="vno-goto-input" style="${fieldStyle}">Nhập số trang:</label>
              <input id="vno-goto-input" class="vno-dialog-input" type="text" style="${inputStyle}" placeholder="1" />
              <select id="vno-goto-items-select" class="vno-dialog-input" style="${inputStyle}; margin-top:6px; display:none;" aria-label="Danh sách đối tượng"></select>
              <div id="vno-goto-hint" style="font-size:11px; color:#64748b; margin-top:6px; line-height:1.4;">
                Nhập số trang, hoặc dùng + và - để di chuyển tương đối.
              </div>
            </div>
            <div id="vno-goto-feedback" role="alert" style="color:#2563eb; font-size:12px; min-height:16px; margin-top:8px;"></div>
          </div>
        </div>
        <div class="vno-dialog-footer" style="display:flex; justify-content:space-between; align-items:center;">
          <div style="display:flex; gap:8px;">
            <button type="button" class="vno-btn" id="vno-goto-prev-btn">Trước</button>
            <button type="button" class="vno-btn" id="vno-goto-next-btn">Tiếp</button>
          </div>
          <div style="display:flex; gap:8px;">
            <button type="button" class="vno-btn vno-btn-primary" id="vno-goto-action-btn">Đi đến</button>
            <button type="button" class="vno-btn vno-dialog-close-footer-btn">Đóng</button>
          </div>
        </div>
      </div>`;

    document.body.appendChild(overlay);
    const box = overlay.querySelector(".vno-dialog-box");
    const el = id => overlay.querySelector(id);

    const typeList = el("#vno-goto-type-list");
    const inputLabel = el("#vno-goto-input-label");
    const mainInput = el("#vno-goto-input");
    const itemsSelect = el("#vno-goto-items-select");
    const hintBox = el("#vno-goto-hint");
    const feedbackBox = el("#vno-goto-feedback");
    const actionBtn = el("#vno-goto-action-btn");
    const prevBtn = el("#vno-goto-prev-btn");
    const nextBtn = el("#vno-goto-next-btn");

    function updateUiForType(typeId) {
      selectedType = typeId;
      const typeInfo = GOTO_TYPES.find(t => t.id === typeId) || GOTO_TYPES[0];
      inputLabel.textContent = typeInfo.inputLabel;
      hintBox.textContent = typeInfo.hint;
      feedbackBox.textContent = "";

      if (typeId === "heading") {
        const headings = data.headings || [];
        if (headings.length > 0) {
          itemsSelect.innerHTML = headings.map((h, i) => `<option value="${i + 1}">${escapeHtml(h)}</option>`).join("");
          itemsSelect.style.display = "block";
          mainInput.style.display = "none";
        } else {
          itemsSelect.style.display = "none";
          mainInput.style.display = "block";
          mainInput.placeholder = "1";
        }
      } else if (typeId === "bookmark") {
        const bookmarks = data.bookmarks || [];
        if (bookmarks.length > 0) {
          itemsSelect.innerHTML = bookmarks.map(b => `<option value="${escapeHtml(b)}">${escapeHtml(b)}</option>`).join("");
          itemsSelect.style.display = "block";
          mainInput.style.display = "none";
        } else {
          itemsSelect.style.display = "none";
          mainInput.style.display = "block";
          mainInput.placeholder = "Tên dấu trang";
        }
      } else {
        itemsSelect.style.display = "none";
        mainInput.style.display = "block";
        mainInput.placeholder = typeId === "page" ? "1" : "1";
      }

      if (mainInput.style.display !== "none") {
        mainInput.value = "";
        mainInput.focus();
      } else {
        itemsSelect.focus();
      }
    }

    typeList.addEventListener("change", () => {
      updateUiForType(typeList.value);
    });

    function executeNavigation(direction = null) {
      let targetValue = "";
      if (direction !== null) {
        targetValue = "";
      } else if (itemsSelect.style.display !== "none") {
        targetValue = itemsSelect.value;
      } else {
        targetValue = mainInput.value.trim();
      }

      const res = onNavigate?.({
        type: selectedType,
        target: targetValue,
        direction // null = direct "Đi đến", 1 = "Tiếp", -1 = "Trước"
      });

      if (res && res.message) {
        feedbackBox.textContent = res.message;
      } else if (res === false) {
        feedbackBox.textContent = "Không tìm thấy vị trí yêu cầu.";
      } else {
        feedbackBox.textContent = `Đã chuyển đến ${GOTO_TYPES.find(t => t.id === selectedType)?.label.toLowerCase()}.`;
      }
    }

    actionBtn.addEventListener("click", () => executeNavigation(null));
    prevBtn.addEventListener("click", () => executeNavigation(-1));
    nextBtn.addEventListener("click", () => executeNavigation(1));

    const onKeyDown = event => {
      if (event.key === "Escape") {
        event.preventDefault();
        cleanup(null);
      } else if (event.key === "Enter" && (event.target === mainInput || event.target === itemsSelect)) {
        event.preventDefault();
        executeNavigation(null);
      } else if (event.key === "Tab") {
        trapFocus(box, event);
      }
    };

    function cleanup(result) {
      document.removeEventListener("keydown", onKeyDown);
      overlay.parentNode?.removeChild(overlay);
      previous?.focus?.();
      resolve(result);
    }

    el(".vno-dialog-close-btn").addEventListener("click", () => cleanup(null));
    el(".vno-dialog-close-footer-btn").addEventListener("click", () => cleanup(null));
    overlay.addEventListener("click", event => {
      if (event.target === overlay) cleanup(null);
    });
    document.addEventListener("keydown", onKeyDown);

    updateUiForType("page");
  });
}
