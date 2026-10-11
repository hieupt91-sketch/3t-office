/**
 * 3T Office — 3T Doc Illustrations Module
 * Cung cấp chức năng Hình khối (Shapes), Sơ đồ (SmartArt-like Diagrams) và Biểu đồ (Charts)
 */

import { t, getLocale } from "../../platform/i18n/i18n.js";

// =============================================================================
// PHẦN 1: HÌNH KHỐI CƠ BẢN (SHAPES)
// =============================================================================

export const SHAPE_TYPES = [
  { id: "rectangle", nameVi: "Hình chữ nhật", nameEn: "Rectangle", defaultW: 140, defaultH: 80 },
  { id: "round-rect", nameVi: "Chữ nhật bo tròn", nameEn: "Rounded Rectangle", defaultW: 140, defaultH: 80 },
  { id: "circle", nameVi: "Hình tròn / Elip", nameEn: "Circle / Oval", defaultW: 110, defaultH: 110 },
  { id: "triangle", nameVi: "Hình tam giác", nameEn: "Triangle", defaultW: 120, defaultH: 100 },
  { id: "diamond", nameVi: "Hình thoi", nameEn: "Diamond", defaultW: 120, defaultH: 100 },
  { id: "arrow", nameVi: "Mũi tên sang phải", nameEn: "Right Arrow", defaultW: 140, defaultH: 70 },
  { id: "line", nameVi: "Đường thẳng ngang", nameEn: "Horizontal Line", defaultW: 160, defaultH: 30 }
];

/**
 * Sinh mã SVG cho hình khối
 * @param {Object} shape
 * @returns {string}
 */
export function renderShapeSvg(shape) {
  const type = shape?.type || shape?.shapeType || "rectangle";
  const fill = shape?.fill || (type === "line" ? "none" : type === "circle" ? "#0ea5e9" : type === "arrow" ? "#f59e0b" : type === "triangle" ? "#16a34a" : type === "diamond" ? "#9333ea" : "#2563eb");
  const stroke = shape?.stroke || (type === "line" ? "#0f172a" : type === "circle" ? "#0284c7" : type === "arrow" ? "#d97706" : type === "triangle" ? "#15803d" : type === "diamond" ? "#7e22ce" : "#1d4ed8");
  const strokeWidth = shape?.strokeWidth || (type === "line" ? 3 : 2);

  if (type === "round-rect" || type === "roundRect") {
    return `<svg viewBox="0 0 100 100" width="100%" height="100%" preserveAspectRatio="none">
      <rect x="4" y="4" width="92" height="92" rx="8" ry="8" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>
    </svg>`;
  }

  if (type === "circle") {
    return `<svg viewBox="0 0 100 100" width="100%" height="100%" preserveAspectRatio="none">
      <ellipse cx="50" cy="50" rx="46" ry="46" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>
    </svg>`;
  }

  if (type === "triangle") {
    return `<svg viewBox="0 0 100 100" width="100%" height="100%" preserveAspectRatio="none">
      <polygon points="50,4 96,92 4,92" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linejoin="round"/>
    </svg>`;
  }

  if (type === "diamond") {
    return `<svg viewBox="0 0 100 100" width="100%" height="100%" preserveAspectRatio="none">
      <polygon points="50,4 96,50 50,96 4,50" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linejoin="round"/>
    </svg>`;
  }

  if (type === "arrow") {
    return `<svg viewBox="0 0 100 60" width="100%" height="100%" preserveAspectRatio="none">
      <polygon points="6,22 60,22 60,8 94,30 60,52 60,38 6,38" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linejoin="round"/>
    </svg>`;
  }

  if (type === "line") {
    if (shape?.imported) {
      const x1 = shape.flipH ? 96 : 4;
      const x2 = shape.flipH ? 4 : 96;
      const y1 = shape.flipV ? 96 : 4;
      const y2 = shape.flipV ? 4 : 96;
      return `<svg viewBox="0 0 100 100" width="100%" height="100%" preserveAspectRatio="none">
      <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round"/>
    </svg>`;
    }
    return `<svg viewBox="0 0 100 20" width="100%" height="100%" preserveAspectRatio="none">
      <line x1="4" y1="10" x2="96" y2="10" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round"/>
    </svg>`;
  }

  // Mặc định: rectangle
  return `<svg viewBox="0 0 100 100" width="100%" height="100%" preserveAspectRatio="none">
    <rect x="4" y="4" width="92" height="92" rx="4" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>
  </svg>`;
}

function trapFocus(dialogBox, event) {
  if (event.key !== "Tab") return;
  const focusables = Array.from(dialogBox.querySelectorAll(
    'button:not([disabled]):not([style*="display: none"]):not([style*="display:none"]), ' +
    'input:not([disabled]):not([type="hidden"]):not([style*="display: none"]):not([style*="display:none"]), ' +
    'select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )).filter(el => el.offsetParent !== null || el.offsetWidth > 0 || el.offsetHeight > 0);

  if (focusables.length === 0) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];

  if (event.shiftKey) {
    if (document.activeElement === first || !dialogBox.contains(document.activeElement)) {
      event.preventDefault();
      last.focus();
    }
  } else {
    if (document.activeElement === last || !dialogBox.contains(document.activeElement)) {
      event.preventDefault();
      first.focus();
    }
  }
}

/**
 * Hiển thị Hộp thoại chọn Hình khối
 * @param {Object} [currentOptions]
 * @returns {Promise<{type:string, w:number, h:number}|null>}
 */
function canHostIllustrationDialog() {
  if (typeof document === "undefined" || !document.body || typeof document.createElement !== "function") {
    return false;
  }
  const probe = document.createElement("div");
  return typeof probe.querySelector === "function" && typeof probe.querySelectorAll === "function";
}

export async function showShapeDialog(currentOptions = null) {
  if (!canHostIllustrationDialog()) return null;

  return new Promise((resolve) => {
    const previousFocused = document.activeElement;
    const isEn = getLocale() === "en";
    const overlay = document.createElement("div");
    overlay.className = "vno-dialog-overlay";

    let selectedType = currentOptions?.type || "rectangle";

    overlay.innerHTML = `
      <div class="vno-dialog-box" style="width: 480px; max-width: calc(100vw - 32px);" role="dialog" aria-modal="true" aria-labelledby="vno-shape-dialog-title">
        <div class="vno-dialog-header">
          <span id="vno-shape-dialog-title">${isEn ? "Insert Shape" : "Chèn hình khối"}</span>
          <button type="button" class="vno-btn vno-btn-icon-only vno-dialog-close-btn" title="${t("common.close")}" aria-label="${t("common.close")}">&times;</button>
        </div>
        <div class="vno-dialog-body" style="display:flex; flex-direction:column; gap:14px;">
          <p style="margin:0; font-size:13px; color:var(--vno-text-secondary);">
            ${isEn ? "Select a basic geometric shape to insert onto the page layer:" : "Chọn hình khối cơ bản cần chèn vào trang văn bản:"}
          </p>
          <div class="vno-shape-grid" role="radiogroup" aria-labelledby="vno-shape-dialog-title" style="display:grid; grid-template-columns:repeat(2, 1fr); gap:12px;">
            ${SHAPE_TYPES.map((s, idx) => {
              const isSel = s.id === selectedType;
              const name = isEn ? s.nameEn : s.nameVi;
              const isLastOdd = SHAPE_TYPES.length % 2 === 1 && idx === SHAPE_TYPES.length - 1;
              const gridColStyle = isLastOdd ? "grid-column: 1 / -1; flex-direction: row; justify-content: center; gap: 16px;" : "flex-direction: column; align-items: center; gap: 8px;";
              const previewStroke = s.id === "line" ? "var(--vno-text-primary, #0f172a)" : undefined;
              return `
              <button type="button" role="radio" aria-checked="${isSel}" aria-label="${name}" class="vno-shape-card ${isSel ? "is-selected" : ""}" data-shape-type="${s.id}"
                style="display:flex; ${gridColStyle} padding:12px; border:2px solid ${isSel ? "var(--vno-border-focus, #2563eb)" : "var(--vno-border-default, #cbd5e1)"}; border-radius:8px; background:${isSel ? "var(--vno-writer-light, var(--vno-bg-selected, #eff6ff))" : "var(--vno-bg-surface, #fff)"}; cursor:pointer; outline:none;">
                <div style="width:60px; height:40px; display:flex; align-items:center; justify-content:center;" aria-hidden="true">
                  ${renderShapeSvg({ type: s.id, strokeWidth: 2, stroke: previewStroke })}
                </div>
                <strong style="font-size:12px; color:var(--vno-text-primary, #1e293b);">${name}</strong>
              </button>
            `}).join("")}
          </div>
        </div>
        <div class="vno-dialog-footer" style="display:flex; justify-content:flex-end; gap:8px;">
          <button type="button" class="vno-btn vno-dialog-cancel-btn">${t("common.cancel")}</button>
          <button type="button" class="vno-btn vno-btn-primary vno-dialog-ok-btn">${isEn ? "Insert" : "Chèn"}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    const dialogBox = overlay.querySelector(".vno-dialog-box");

    const cards = overlay.querySelectorAll(".vno-shape-card");
    cards.forEach(card => {
      card.addEventListener("click", () => {
        cards.forEach(c => {
          c.classList.remove("is-selected");
          c.setAttribute("aria-checked", "false");
          c.style.borderColor = "var(--vno-border-default, #cbd5e1)";
          c.style.background = "var(--vno-bg-surface, #fff)";
        });
        card.classList.add("is-selected");
        card.setAttribute("aria-checked", "true");
        card.style.borderColor = "var(--vno-border-focus, #2563eb)";
        card.style.background = "var(--vno-writer-light, var(--vno-bg-selected, #eff6ff))";
        selectedType = card.getAttribute("data-shape-type");
      });
    });

    overlay.querySelector(".vno-shape-card.is-selected")?.focus();

    const cleanup = (result) => {
      document.removeEventListener("keydown", onKeyDown);
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (previousFocused && typeof previousFocused.focus === "function") {
        previousFocused.focus();
      }
      resolve(result);
    };

    overlay.querySelector(".vno-dialog-ok-btn")?.addEventListener("click", () => {
      const shapeDef = SHAPE_TYPES.find(s => s.id === selectedType) || SHAPE_TYPES[0];
      const defaultColors = selectedType === "triangle" ? { fill: "#16a34a", stroke: "#15803d" } :
                            selectedType === "diamond"  ? { fill: "#9333ea", stroke: "#7e22ce" } : {};
      cleanup({ type: selectedType, w: shapeDef.defaultW, h: shapeDef.defaultH, ...defaultColors });
    });

    overlay.querySelector(".vno-dialog-cancel-btn")?.addEventListener("click", () => cleanup(null));
    overlay.querySelector(".vno-dialog-close-btn")?.addEventListener("click", () => cleanup(null));
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) cleanup(null);
    });

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        cleanup(null);
      } else if (e.key === "Enter") {
        e.preventDefault();
        const shapeDef = SHAPE_TYPES.find(s => s.id === selectedType) || SHAPE_TYPES[0];
        const defaultColors = selectedType === "triangle" ? { fill: "#16a34a", stroke: "#15803d" } :
                              selectedType === "diamond"  ? { fill: "#9333ea", stroke: "#7e22ce" } : {};
        cleanup({ type: selectedType, w: shapeDef.defaultW, h: shapeDef.defaultH, ...defaultColors });
      } else if (e.key === "Tab") {
        trapFocus(dialogBox, e);
      }
    };
    document.addEventListener("keydown", onKeyDown);
  });
}

// =============================================================================
// PHẦN 2: SƠ ĐỒ SMARTART (DIAGRAMS)
// =============================================================================

export const DIAGRAM_TYPES = [
  { id: "process", nameVi: "Quy trình (Process)", nameEn: "Process", preview: "1 ➔ 2 ➔ 3" },
  { id: "cycle", nameVi: "Chu trình (Cycle)", nameEn: "Cycle", preview: "1 ➔ 2 ➔ ↻" },
  { id: "hierarchy", nameVi: "Phân cấp (Hierarchy)", nameEn: "Hierarchy", preview: "Gốc<br>└ Nhánh" },
  { id: "list", nameVi: "Danh sách (List)", nameEn: "List", preview: "01 Mục 1<br>02 Mục 2" }
];

/**
 * Sinh mã HTML cho sơ đồ tĩnh trong văn bản Writer
 * @param {Object} options
 * @param {string} [options.type]
 * @param {number} [options.count]
 * @returns {string}
 */
export function generateDiagramHtml(options = {}) {
  options = options || {};
  const isEn = getLocale() === "en";
  const type = options.diagramType || options.type || "process";
  const colors = ["#2563eb", "#0f6d38", "#d97706", "#dc2626", "#7c3aed", "#0891b2"];

  const count = Math.min(6, Math.max(3, Number(options.count) || 4));
  const defaultNodes = Array.from({ length: count }, (_, index) => (
    isEn ? `Step ${index + 1}` : `Bước ${index + 1}`
  ));
  const rawNodes = options.nodes || options.items;
  const nodes = Array.isArray(rawNodes) && rawNodes.length > 0
    ? rawNodes
    : defaultNodes;
  const num = nodes.length;

  let inner = "";
  let title = options.title || (
    type === "cycle" ? (isEn ? "Cycle Diagram" : "Sơ đồ chu trình (Cycle)") :
    type === "hierarchy" ? (isEn ? "Hierarchy Diagram" : "Sơ đồ phân cấp (Hierarchy)") :
    type === "list" ? (isEn ? "List Diagram" : "Sơ đồ danh sách (List)") :
    (isEn ? "Process Diagram" : "Sơ đồ quy trình (Process)")
  );

  if (type === "cycle") {
    let nodesHtml = "";
    for (let i = 0; i < num; i++) {
      const stepLabel = escHtml(nodes[i]);
      const color = colors[i % colors.length];
      nodesHtml += `
        <div class="vno-diagram-node" style="flex:1; min-width:85px; background:${color}; color:#fff; border-radius:6px; padding:10px 8px; text-align:center; box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <div contenteditable="true" class="vno-diagram-node-text" style="outline:none; font-weight:600; font-size:13px;">${stepLabel}</div>
        </div>
      `;
      if (i < num - 1) {
        nodesHtml += `<div style="color:#64748b; font-size:18px; font-weight:bold;">→</div>`;
      }
    }
    nodesHtml += `<div style="color:#0f6d38; font-size:22px; font-weight:bold; margin-left:4px;" title="Chu trình">↻</div>`;

    inner = `<div style="display:flex; align-items:center; justify-content:center; gap:8px; flex-wrap:wrap;">${nodesHtml}</div>`;
  } else if (type === "hierarchy") {
    const rootLabel = escHtml(nodes[0] || (isEn ? "Root Level" : "Cấp gốc (Tiêu đề)"));
    const children = nodes.slice(1);
    let childHtml = "";
    for (let i = 0; i < children.length; i++) {
      const childLabel = escHtml(children[i]);
      const color = colors[(i + 1) % colors.length];
      childHtml += `
        <div class="vno-diagram-node" style="flex:1; min-width:90px; background:${color}; color:#fff; border-radius:6px; padding:8px 6px; text-align:center; box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <div contenteditable="true" class="vno-diagram-node-text" style="outline:none; font-weight:600; font-size:12px;">${childLabel}</div>
        </div>
      `;
    }

    inner = `
      <div style="display:flex; flex-direction:column; align-items:center; gap:4px;">
        <div class="vno-diagram-node" style="min-width:140px; background:#0f4c81; color:#fff; border-radius:6px; padding:10px 16px; text-align:center; box-shadow:0 1px 3px rgba(0,0,0,0.15);">
          <div contenteditable="true" class="vno-diagram-node-text" style="outline:none; font-weight:bold; font-size:13px;">${rootLabel}</div>
        </div>
        <div style="color:#94a3b8; font-size:16px; line-height:1;">│</div>
        <div style="width:70%; height:1px; background:#cbd5e1; margin-bottom:4px;"></div>
        <div style="display:flex; gap:10px; width:100%; justify-content:center; flex-wrap:wrap;">${childHtml}</div>
      </div>
    `;
  } else if (type === "list") {
    let listItems = "";
    for (let i = 0; i < num; i++) {
      const itemLabel = escHtml(nodes[i]);
      const color = colors[i % colors.length];
      const indexStr = String(i + 1).padStart(2, "0");
      listItems += `
        <div class="vno-diagram-node" style="display:flex; align-items:center; gap:12px; background:#fff; border:1px solid #cbd5e1; border-left:5px solid ${color}; border-radius:4px; padding:8px 12px; box-shadow:0 1px 2px rgba(0,0,0,0.05);">
          <span style="font-weight:bold; color:${color}; font-size:14px; min-width:24px;">${indexStr}</span>
          <div contenteditable="true" class="vno-diagram-node-text" style="outline:none; flex:1; font-size:13px; color:#1e293b;">${itemLabel}</div>
        </div>
      `;
    }
    inner = `<div style="display:flex; flex-direction:column; gap:8px;">${listItems}</div>`;
  } else {
    // process
    let nodesHtml = "";
    for (let i = 0; i < num; i++) {
      const stepLabel = escHtml(nodes[i]);
      const color = colors[i % colors.length];
      nodesHtml += `
        <div class="vno-diagram-node" style="flex:1; min-width:85px; background:${color}; color:#fff; border-radius:6px; padding:10px 8px; text-align:center; box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <div contenteditable="true" class="vno-diagram-node-text" style="outline:none; font-weight:600; font-size:13px;">${stepLabel}</div>
        </div>
      `;
      if (i < num - 1) {
        nodesHtml += `<div style="color:#64748b; font-size:18px; font-weight:bold;">→</div>`;
      }
    }
    inner = `<div style="display:flex; align-items:center; justify-content:center; gap:8px; flex-wrap:wrap;">${nodesHtml}</div>`;
  }

  const deleteBtnText = isEn ? "Delete" : "Xóa";

  return `
    <div class="vno-writer-diagram" data-vno-diagram="true" data-diagram-type="${type}" contenteditable="false"
      style="margin:16pt 0; padding:12px 14px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; position:relative; box-sizing:border-box; user-select:none;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
        <span style="font-size:11px; font-weight:bold; color:#64748b; text-transform:uppercase; letter-spacing:0.5px;">${escHtml(title)}</span>
        <button type="button" class="vno-diagram-delete-btn" style="border:none; background:#fee2e2; color:#dc2626; border-radius:4px; padding:2px 8px; font-size:11px; font-weight:600; cursor:pointer;" title="${isEn ? "Delete diagram" : "Xóa sơ đồ"}">&times; ${deleteBtnText}</button>
      </div>
      ${inner}
    </div>
    <p><br></p>
  `;
}

/**
 * Hiển thị Hộp thoại chọn Sơ đồ SmartArt
 * @param {Object} [currentOptions]
 * @returns {Promise<{type:string, count:number}|null>}
 */
export async function showDiagramDialog(currentOptions = null) {
  if (!canHostIllustrationDialog()) return null;

  return new Promise((resolve) => {
    const previousFocused = document.activeElement;
    const isEn = getLocale() === "en";
    const overlay = document.createElement("div");
    overlay.className = "vno-dialog-overlay";

    let selectedType = currentOptions?.type || "process";

    overlay.innerHTML = `
      <div class="vno-dialog-box" style="width: 520px; max-width: calc(100vw - 32px);" role="dialog" aria-modal="true" aria-labelledby="vno-diagram-dialog-title">
        <div class="vno-dialog-header">
          <span id="vno-diagram-dialog-title">${isEn ? "Insert SmartArt Diagram" : "Chèn sơ đồ SmartArt"}</span>
          <button type="button" class="vno-btn vno-btn-icon-only vno-dialog-close-btn" title="${t("common.close")}" aria-label="${t("common.close")}">&times;</button>
        </div>
        <div class="vno-dialog-body" style="display:flex; flex-direction:column; gap:14px;">
          <p style="margin:0; font-size:13px; color:var(--vno-text-secondary);">
            ${isEn ? "Choose a visual diagram structure to insert into document:" : "Chọn kiểu bố cục sơ đồ minh họa cần chèn vào văn bản:"}
          </p>
          <div class="vno-diagram-grid" role="radiogroup" aria-labelledby="vno-diagram-dialog-title" style="display:grid; grid-template-columns:repeat(2, 1fr); gap:12px;">
            ${DIAGRAM_TYPES.map(d => {
              const isSel = d.id === selectedType;
              const name = isEn ? d.nameEn : d.nameVi;
              return `
              <button type="button" role="radio" aria-checked="${isSel}" aria-label="${name}" class="vno-diagram-card ${isSel ? "is-selected" : ""}" data-diagram-type="${d.id}"
                style="display:flex; flex-direction:column; align-items:center; gap:8px; padding:12px; border:2px solid ${isSel ? "var(--vno-border-focus, #2563eb)" : "var(--vno-border-default, #cbd5e1)"}; border-radius:8px; background:${isSel ? "var(--vno-sheet-light, #eff6ff)" : "var(--vno-bg-surface, #fff)"}; cursor:pointer; outline:none;">
                <span style="font-size:16px; color:var(--vno-app-current-fg, #2563eb); font-weight:bold; min-height:36px; display:flex; align-items:center; justify-content:center; text-align:center;" aria-hidden="true">${d.preview}</span>
                <strong style="font-size:12px; color:var(--vno-text-primary, #1e293b);">${name}</strong>
              </button>
            `}).join("")}
          </div>
          <div style="display:flex; align-items:center; justify-content:space-between; margin-top:4px;">
            <label for="vno-diagram-count-input" style="font-size:13px; font-weight:600; color:var(--vno-text-primary);">
              ${isEn ? "Number of steps / elements (3 - 6):" : "Số lượng bước / phần tử (3 - 6):"}
            </label>
            <input id="vno-diagram-count-input" type="number" min="3" max="6" value="4" class="vno-input" style="width:70px; text-align:center; padding:4px 8px; border:1px solid var(--vno-border-default, #cbd5e1); border-radius:4px; font-size:13px; background:var(--vno-bg-surface); color:var(--vno-text-primary);" />
          </div>
          <div class="vno-dialog-error" role="alert" aria-live="polite" hidden style="color:var(--vno-danger, #b91c1c); font-size:12px;"></div>
        </div>
        <div class="vno-dialog-footer" style="display:flex; justify-content:flex-end; gap:8px;">
          <button type="button" class="vno-btn vno-dialog-cancel-btn">${t("common.cancel")}</button>
          <button type="button" class="vno-btn vno-btn-primary vno-dialog-ok-btn">${isEn ? "Insert Diagram" : "Chèn sơ đồ"}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    const dialogBox = overlay.querySelector(".vno-dialog-box");

    const cards = overlay.querySelectorAll(".vno-diagram-card");
    cards.forEach(card => {
      card.addEventListener("click", () => {
        cards.forEach(c => {
          c.classList.remove("is-selected");
          c.setAttribute("aria-checked", "false");
          c.style.borderColor = "var(--vno-border-default, #cbd5e1)";
          c.style.background = "var(--vno-bg-surface, #fff)";
        });
        card.classList.add("is-selected");
        card.setAttribute("aria-checked", "true");
        card.style.borderColor = "var(--vno-border-focus, #2563eb)";
        card.style.background = "var(--vno-sheet-light, #eff6ff)";
        selectedType = card.getAttribute("data-diagram-type");
      });
    });

    const countInput = overlay.querySelector("#vno-diagram-count-input");
    const errorMessage = overlay.querySelector(".vno-dialog-error");
    const readCount = () => {
      const rawValue = countInput?.value.trim() || "";
      const count = Number(rawValue);
      if (rawValue === "" || !Number.isInteger(count) || count < 3 || count > 6) {
        if (errorMessage) {
          errorMessage.hidden = false;
          errorMessage.textContent = t("writerDialogs.diagram.countError", "Vui lòng nhập số nguyên từ 3 đến 6.");
        }
        countInput?.setAttribute("aria-invalid", "true");
        countInput?.focus();
        return null;
      }
      errorMessage?.setAttribute("hidden", "");
      countInput?.removeAttribute("aria-invalid");
      return count;
    };
    countInput?.addEventListener("input", () => {
      errorMessage?.setAttribute("hidden", "");
      countInput.removeAttribute("aria-invalid");
    });
    overlay.querySelector(".vno-diagram-card.is-selected")?.focus();

    const cleanup = (result) => {
      document.removeEventListener("keydown", onKeyDown);
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (previousFocused && typeof previousFocused.focus === "function") {
        previousFocused.focus();
      }
      resolve(result);
    };

    overlay.querySelector(".vno-dialog-ok-btn")?.addEventListener("click", () => {
      const count = readCount();
      if (count === null) return;
      cleanup({ type: selectedType, count });
    });

    overlay.querySelector(".vno-dialog-cancel-btn")?.addEventListener("click", () => cleanup(null));
    overlay.querySelector(".vno-dialog-close-btn")?.addEventListener("click", () => cleanup(null));
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) cleanup(null);
    });

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        cleanup(null);
      } else if (e.key === "Enter") {
        e.preventDefault();
        overlay.querySelector(".vno-dialog-ok-btn")?.click();
      } else if (e.key === "Tab") {
        trapFocus(dialogBox, e);
      }
    };
    document.addEventListener("keydown", onKeyDown);
  });
}

// =============================================================================
// PHẦN 3: BIỂU ĐỒ (CHARTS) — TÁI DÙNG SHEET SVG ENGINE
// =============================================================================

const CHART_TYPES = ["bar", "line", "pie", "area"];
const CHART_COLORS = ["#2563eb", "#0f6d38", "#d97706", "#dc2626", "#7c3aed", "#0891b2"];

function escHtml(str) {
  return String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Sinh mã SVG cho Biểu đồ
 * @param {Object} options
 * @returns {string}
 */
export function generateChartSvg(options = {}) {
  options = options || {};
  const isEn = getLocale() === "en";
  const rawType = options.chartType || options.type || "bar";
  const chartType = CHART_TYPES.includes(rawType) ? rawType : "bar";
  const title = options.title || (isEn ? "Data Chart" : "Biểu đồ dữ liệu");
  const rawLabels = options.categories || options.labels || [];
  const rawData = options.values || options.data || [];
  const values = rawData.map(v => Number(v) || 0);
  const names = values.map((_, idx) => escHtml(rawLabels[idx] || `Mục ${idx + 1}`));
  const width = 640, height = 320;
  const p = { top: 46, right: 30, bottom: 55, left: 60 };
  const chartW = width - p.left - p.right, chartH = height - p.top - p.bottom;

  const heading = `<text data-chart-title x="${width / 2}" y="26" text-anchor="middle" font-size="15" font-weight="bold" fill="#0f172a">${escHtml(title)}</text>`;
  const wrap = body => `<svg data-chart-type="${chartType}" viewBox="0 0 ${width} ${height}" width="100%" height="100%" style="background:#fff; border-radius:6px;">${heading}${body}</svg>`;

  if (!values.length) {
    return wrap(`<text x="${width / 2}" y="${height / 2}" text-anchor="middle" fill="#64748b">Không có dữ liệu</text>`);
  }

  if (chartType === "pie") {
    const positive = values.map(v => Math.max(0, v));
    const total = positive.reduce((a, b) => a + b, 0) || 1;
    let angle = -Math.PI / 2;
    let body = "";
    positive.forEach((val, idx) => {
      const next = angle + (val / total) * Math.PI * 2;
      const cx = 220, cy = 170, radius = 95;
      const x1 = cx + radius * Math.cos(angle), y1 = cy + radius * Math.sin(angle);
      const x2 = cx + radius * Math.cos(next), y2 = cy + radius * Math.sin(next);
      const color = CHART_COLORS[idx % CHART_COLORS.length];
      const shape = val === total
        ? `<circle cx="${cx}" cy="${cy}" r="${radius}"`
        : `<path d="M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${next - angle > Math.PI ? 1 : 0} 1 ${x2} ${y2} Z"`;
      body += `${shape} fill="${color}" stroke="#fff" stroke-width="2"><title>${names[idx]}: ${val}</title>${val === total ? "</circle>" : "</path>"}`;
      body += `<g transform="translate(380, ${60 + idx * 26})"><rect width="12" height="12" rx="3" fill="${color}"/><text x="20" y="11" font-size="12" fill="#334155">${names[idx]} (${Math.round(val / total * 100)}%)</text></g>`;
      angle = next;
    });
    return wrap(body);
  }

  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const span = max - min || 1;
  const x = index => p.left + (values.length === 1 ? chartW / 2 : (index * chartW) / (values.length - 1));
  const y = val => p.top + ((max - val) / span) * chartH;
  const baseline = y(0);

  let body = "";
  for (let step = 0; step <= 4; step++) {
    const val = min + (span * step) / 4;
    const gridY = y(val);
    body += `<line x1="${p.left}" y1="${gridY}" x2="${width - p.right}" y2="${gridY}" stroke="#e2e8f0"/><text x="${p.left - 8}" y="${gridY + 4}" text-anchor="end" font-size="10" fill="#64748b">${Math.round(val)}</text>`;
  }

  if (chartType === "bar") {
    const slot = chartW / values.length;
    const barW = Math.min(50, slot * 0.6);
    values.forEach((val, idx) => {
      const top = Math.min(y(val), baseline);
      const barH = Math.max(2, Math.abs(y(val) - baseline));
      const color = CHART_COLORS[idx % CHART_COLORS.length];
      body += `<rect x="${p.left + idx * slot + (slot - barW) / 2}" y="${top}" width="${barW}" height="${barH}" rx="3" fill="${color}"><title>${names[idx]}: ${val}</title></rect>`;
    });
  } else {
    const points = values.map((val, idx) => `${x(idx)},${y(val)}`).join(" ");
    if (chartType === "area") {
      body += `<polygon points="${p.left},${baseline} ${points} ${x(values.length - 1)},${baseline}" fill="#2563eb" fill-opacity="0.2"/>`;
    }
    body += `<polyline points="${points}" fill="none" stroke="#2563eb" stroke-width="3" stroke-linejoin="round"/>`;
    values.forEach((val, idx) => {
      body += `<circle cx="${x(idx)}" cy="${y(val)}" r="4" fill="#fff" stroke="#2563eb" stroke-width="2"><title>${names[idx]}: ${val}</title></circle>`;
    });
  }

  body += `<line x1="${p.left}" y1="${baseline}" x2="${width - p.right}" y2="${baseline}" stroke="#94a3b8"/>`;
  names.forEach((name, idx) => {
    body += `<text x="${x(idx)}" y="${height - 22}" text-anchor="middle" font-size="11" fill="#475569">${name.slice(0, 12)}</text>`;
  });

  return wrap(body);
}

/**
 * Sinh mã HTML hoàn chỉnh cho khối biểu đồ trong Writer
 * @param {Object} options
 * @returns {string}
 */
export function generateChartHtml(options) {
  const isEn = getLocale() === "en";
  const svg = generateChartSvg(options);
  const deleteBtnText = isEn ? "Delete" : "Xóa";
  return `
    <div class="vno-writer-chart" data-vno-chart="true" contenteditable="false"
      style="margin:16pt auto; max-width:640px; position:relative; border:1px solid #e2e8f0; border-radius:8px; padding:8px 10px; background:#fff; box-shadow:0 1px 4px rgba(0,0,0,0.06); box-sizing:border-box; user-select:none;">
      <div style="display:flex; justify-content:flex-end; margin-bottom:4px;">
        <button type="button" class="vno-chart-delete-btn" style="border:none; background:#fee2e2; color:#dc2626; border-radius:4px; padding:2px 8px; font-size:11px; font-weight:600; cursor:pointer;" title="${isEn ? "Delete chart" : "Xóa biểu đồ"}">&times; ${deleteBtnText}</button>
      </div>
      <div class="vno-chart-svg-container" style="width:100%; height:auto;">
        ${svg}
      </div>
    </div>
    <p><br></p>
  `;
}

/**
 * Hiển thị Hộp thoại Cấu hình Biểu đồ với Xem trước Trực quan
 * @param {Object} [currentOptions]
 * @returns {Promise<{type:string, title:string, labels:string[], data:number[]}|null>}
 */
export async function showChartDialog(currentOptions = null) {
  if (!canHostIllustrationDialog()) return null;

  return new Promise((resolve) => {
    const previousFocused = document.activeElement;
    const isEn = getLocale() === "en";
    const overlay = document.createElement("div");
    overlay.className = "vno-dialog-overlay";

    let currentType = currentOptions?.type || "bar";
    let currentTitle = currentOptions?.title || (isEn ? "Data Chart" : "Biểu đồ dữ liệu");
    let currentLabels = currentOptions?.labels?.length ? [...currentOptions.labels] : (isEn ? ["Q1", "Q2", "Q3", "Q4"] : ["Quý 1", "Quý 2", "Quý 3", "Quý 4"]);
    let currentData = currentOptions?.data?.length ? [...currentOptions.data] : [120, 190, 300, 250];

    const typeOptions = [
      { id: "bar", nameVi: "Cột (Column/Bar)", nameEn: "Column / Bar" },
      { id: "line", nameVi: "Đường (Line)", nameEn: "Line" },
      { id: "pie", nameVi: "Tròn (Pie)", nameEn: "Pie" },
      { id: "area", nameVi: "Miền (Area)", nameEn: "Area" }
    ];

    overlay.innerHTML = `
      <div class="vno-dialog-box" style="width: 660px; max-width: calc(100vw - 32px);" role="dialog" aria-modal="true" aria-labelledby="vno-chart-dialog-title">
        <div class="vno-dialog-header">
          <span id="vno-chart-dialog-title">${isEn ? "Insert Chart" : "Chèn biểu đồ minh họa"}</span>
          <button type="button" class="vno-btn vno-btn-icon-only vno-dialog-close-btn" title="${t("common.close")}" aria-label="${t("common.close")}">&times;</button>
        </div>
        <div class="vno-dialog-body" style="display:flex; flex-direction:column; gap:14px;">
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
            <div>
              <label for="vno-chart-title-input" style="font-size:12px; font-weight:600; color:var(--vno-text-primary); display:block; margin-bottom:4px;">
                ${isEn ? "Chart Title:" : "Tiêu đề biểu đồ:"}
              </label>
              <input id="vno-chart-title-input" type="text" class="vno-input" value="${escHtml(currentTitle)}" style="width:100%; box-sizing:border-box; padding:6px 10px; border:1px solid var(--vno-border-default, #cbd5e1); border-radius:4px; font-size:13px; background:var(--vno-bg-surface); color:var(--vno-text-primary);" />
            </div>
            <div>
              <label for="vno-chart-type-select" style="font-size:12px; font-weight:600; color:var(--vno-text-primary); display:block; margin-bottom:4px;">
                ${isEn ? "Chart Type:" : "Kiểu biểu đồ:"}
              </label>
              <select id="vno-chart-type-select" class="vno-select" style="width:100%; box-sizing:border-box; padding:6px 10px; border:1px solid var(--vno-border-default, #cbd5e1); border-radius:4px; font-size:13px; background:var(--vno-bg-surface); color:var(--vno-text-primary);">
                ${typeOptions.map(t => `<option value="${t.id}" ${t.id === currentType ? "selected" : ""}>${isEn ? t.nameEn : t.nameVi}</option>`).join("")}
              </select>
            </div>
          </div>

          <div>
            <label style="font-size:12px; font-weight:600; color:var(--vno-text-primary); display:block; margin-bottom:6px;">
              ${isEn ? "Data items (Labels & Values):" : "Dữ liệu mẫu (Nhãn & Giá trị):"}
            </label>
            <div id="vno-chart-data-rows" style="display:flex; flex-direction:column; gap:6px; max-height:110px; overflow-y:auto; padding-right:4px;">
              ${currentLabels.map((lbl, i) => `
                <div class="vno-chart-row" style="display:flex; gap:8px; align-items:center;">
                  <input type="text" class="vno-chart-lbl" value="${escHtml(lbl)}" placeholder="${isEn ? "Label" : "Nhãn"}" aria-label="${isEn ? `Label ${i + 1}` : `Nhãn ${i + 1}`}" style="flex:1; padding:4px 8px; border:1px solid var(--vno-border-default, #cbd5e1); border-radius:4px; font-size:12px; background:var(--vno-bg-surface); color:var(--vno-text-primary);" />
                  <input type="number" class="vno-chart-val" value="${currentData[i] ?? 0}" placeholder="${isEn ? "Value" : "Giá trị"}" aria-label="${isEn ? `Value ${i + 1}` : `Giá trị ${i + 1}`}" style="width:100px; padding:4px 8px; border:1px solid var(--vno-border-default, #cbd5e1); border-radius:4px; font-size:12px; background:var(--vno-bg-surface); color:var(--vno-text-primary);" />
                </div>
              `).join("")}
            </div>
          </div>
          <div class="vno-dialog-error" role="alert" aria-live="polite" hidden style="color:var(--vno-danger, #b91c1c); font-size:12px;"></div>

          <!-- Khung xem trước trực quan (Live SVG Preview) -->
          <div>
            <span style="font-size:11px; font-weight:600; color:var(--vno-text-secondary); text-transform:uppercase; letter-spacing:0.5px; display:block; margin-bottom:4px;">
              ${isEn ? "Live Preview" : "Xem trước trực quan"}
            </span>
            <div id="vno-chart-preview-box" aria-hidden="true" style="height:170px; border:1px solid var(--vno-border-default, #e2e8f0); border-radius:6px; background:var(--vno-bg-surface); overflow:hidden; display:flex; align-items:center; justify-content:center; box-shadow:inset 0 1px 3px rgba(0,0,0,0.04);">
              <!-- Render live SVG here -->
            </div>
          </div>
        </div>

        <div class="vno-dialog-footer" style="display:flex; justify-content:flex-end; gap:8px;">
          <button type="button" class="vno-btn vno-dialog-cancel-btn">${t("common.cancel")}</button>
          <button type="button" class="vno-btn vno-btn-primary vno-dialog-ok-btn">${isEn ? "Insert Chart" : "Chèn biểu đồ"}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    const dialogBox = overlay.querySelector(".vno-dialog-box");

    const titleInput = overlay.querySelector("#vno-chart-title-input");
    const typeSelect = overlay.querySelector("#vno-chart-type-select");
    const previewBox = overlay.querySelector("#vno-chart-preview-box");
    const errorMessage = overlay.querySelector(".vno-dialog-error");

    const getFormValues = () => {
      const lblInputs = overlay.querySelectorAll(".vno-chart-lbl");
      const valInputs = overlay.querySelectorAll(".vno-chart-val");
      const labels = [];
      const data = [];
      lblInputs.forEach((inp, idx) => {
        labels.push(inp.value.trim() || `Mục ${idx + 1}`);
        data.push(Number(valInputs[idx]?.value) || 0);
      });
      return {
        type: typeSelect?.value || "bar",
        title: titleInput?.value.trim() || (isEn ? "Data Chart" : "Biểu đồ dữ liệu"),
        labels,
        data
      };
    };

    const getValidatedFormValues = () => {
      const values = getFormValues();
      const valInputs = Array.from(overlay.querySelectorAll(".vno-chart-val"));
      const invalidIndex = valInputs.findIndex(input => input.value.trim() === "" || !Number.isFinite(Number(input.value)));
      if (invalidIndex >= 0) {
        if (errorMessage) {
          errorMessage.hidden = false;
          errorMessage.textContent = t("writerDialogs.chart.itemValueError", { index: invalidIndex + 1 });
        }
        valInputs[invalidIndex].setAttribute("aria-invalid", "true");
        valInputs[invalidIndex].focus();
        return null;
      }
      errorMessage?.setAttribute("hidden", "");
      valInputs.forEach(input => input.removeAttribute("aria-invalid"));
      return values;
    };

    const updatePreview = () => {
      if (!previewBox) return;
      const vals = getFormValues();
      previewBox.innerHTML = generateChartSvg(vals);
    };

    titleInput?.addEventListener("input", updatePreview);
    typeSelect?.addEventListener("change", updatePreview);
    overlay.querySelectorAll(".vno-chart-lbl, .vno-chart-val").forEach(el => {
      el.addEventListener("input", () => {
        errorMessage?.setAttribute("hidden", "");
        el.removeAttribute("aria-invalid");
        updatePreview();
      });
    });
    updatePreview();
    titleInput?.focus();
    titleInput?.select();

    const cleanup = (result) => {
      document.removeEventListener("keydown", onKeyDown);
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (previousFocused && typeof previousFocused.focus === "function") {
        previousFocused.focus();
      }
      resolve(result);
    };

    overlay.querySelector(".vno-dialog-ok-btn")?.addEventListener("click", () => {
      const values = getValidatedFormValues();
      if (values) cleanup(values);
    });

    overlay.querySelector(".vno-dialog-cancel-btn")?.addEventListener("click", () => cleanup(null));
    overlay.querySelector(".vno-dialog-close-btn")?.addEventListener("click", () => cleanup(null));
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) cleanup(null);
    });

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        cleanup(null);
      } else if (e.key === "Enter") {
        e.preventDefault();
        overlay.querySelector(".vno-dialog-ok-btn")?.click();
      } else if (e.key === "Tab") {
        trapFocus(dialogBox, e);
      }
    };
    document.addEventListener("keydown", onKeyDown);
  });
}
