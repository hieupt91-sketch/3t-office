/**
 * 3T Office — 3T Doc Style Gallery (Thư viện Kiểu dáng trực quan)
 * Chuẩn hóa Quick Styles Microsoft Word 365 / LibreOffice Writer
 */

import { t } from "../../platform/i18n/i18n.js";

export const STYLE_PRESETS = [
  {
    id: "title",
    tag: "p",
    className: "vno-style-title",
    label: "Tiêu đề",
    sublabel: "Title",
    previewSample: "Tiêu đề tài liệu",
    previewCss: "font-family:Calibri, sans-serif; font-size:28px; font-weight:400; color:var(--vno-style-preview-title, #404040);",
    description: "Kiểu Title dựng sẵn: phông chủ đề tiêu đề, cỡ 28pt"
  },
  {
    id: "subtitle",
    tag: "p",
    className: "vno-style-subtitle",
    label: "Phụ đề",
    sublabel: "Subtitle",
    previewSample: "Phụ đề tài liệu",
    previewCss: "font-family:Calibri, sans-serif; font-size:15px; color:var(--vno-style-preview-muted, #5a5a5a);",
    description: "Kiểu Subtitle dựng sẵn, dùng dưới tiêu đề tài liệu"
  },
  {
    id: "normal",
    tag: "p",
    label: "Normal",
    sublabel: "Văn bản thường",
    previewSample: "AaBbCc",
    previewCss: "font-family:'Times New Roman', serif; font-size:14px; font-weight:normal; color:var(--vno-style-preview-normal, #1e293b);",
    description: "Văn bản thường, phông chữ chuẩn 14pt căn đều hai bên (Nghị định 30/2020/NĐ-CP)"
  },
  {
    id: "h1",
    tag: "h1",
    label: "Tiêu đề 1",
    sublabel: "Heading 1",
    previewSample: "TIÊU ĐỀ 1",
    previewCss: "font-family:'Times New Roman', serif; font-size:15px; font-weight:700; color:var(--vno-style-preview-heading, #0f4c81); text-transform:uppercase;",
    description: "Tiêu đề cấp 1: Chữ hoa, in đậm, căn giữa, cỡ 16pt (QUYẾT ĐỊNH, CHỈ THỊ...)"
  },
  {
    id: "h2",
    tag: "h2",
    label: "Tiêu đề 2",
    sublabel: "Heading 2",
    previewSample: "Tiêu đề 2",
    previewCss: "font-family:'Times New Roman', serif; font-size:14px; font-weight:700; color:var(--vno-style-preview-heading, #0f4c81);",
    description: "Tiêu đề cấp 2: Chữ thường in đậm, cỡ 14pt (Điều 1, Mục I...)"
  },
  {
    id: "h3",
    tag: "h3",
    label: "Tiêu đề 3",
    sublabel: "Heading 3",
    previewSample: "Tiêu đề 3",
    previewCss: "font-family:'Times New Roman', serif; font-size:13px; font-weight:700; font-style:italic; color:var(--vno-style-preview-muted, #334155);",
    description: "Tiêu đề cấp 3: In đậm nghiêng, cỡ 13pt (Khoản 1, Điểm a...)"
  },
  {
    id: "quote",
    tag: "blockquote",
    className: "vno-style-quote",
    label: "Trích dẫn",
    sublabel: "Quote",
    previewSample: "“Trích dẫn…”",
    previewCss: "font-family:Calibri, sans-serif; font-size:15px; font-style:italic; color:var(--vno-style-preview-muted, #404040); text-align:center;",
    description: "Kiểu Quote dựng sẵn: chữ nghiêng, căn giữa và thụt lề"
  },
  {
    id: "listparagraph",
    tag: "p",
    className: "vno-style-list-paragraph",
    label: "Đoạn danh sách",
    sublabel: "List Paragraph",
    previewSample: "•  Mục danh sách",
    previewCss: "font-family:Calibri, sans-serif; font-size:15px; color:var(--vno-style-preview-normal, #1e293b); padding-left:12px;",
    description: "Kiểu List Paragraph dựng sẵn, thụt lề 0,5 inch"
  },
  {
    id: "emphasis",
    tag: "p",
    className: "vno-style-emphasis",
    label: "Nhấn mạnh",
    sublabel: "Emphasis",
    previewSample: "Nhấn mạnh",
    previewCss: "font-family:'Times New Roman', serif; font-size:13px; font-weight:700; font-style:italic; color:var(--vno-style-preview-emphasis, #b45309);",
    description: "Đoạn nhấn mạnh: In đậm, in nghiêng, màu sắc nổi bật"
  }
];

let activeDropdownInstance = null;

function getPresetStrings(preset) {
  const labelKey = `writerDialogs.styleGallery.${preset.id}.label`;
  const sublabelKey = `writerDialogs.styleGallery.${preset.id}.sublabel`;
  const descKey = `writerDialogs.styleGallery.${preset.id}.desc`;

  const label = (typeof t === "function" && t(labelKey) !== labelKey) ? t(labelKey) : preset.label;
  const sublabel = (typeof t === "function" && t(sublabelKey) !== sublabelKey) ? t(sublabelKey) : preset.sublabel;
  const desc = (typeof t === "function" && t(descKey) !== descKey) ? t(descKey) : preset.description;

  return { label, sublabel, desc };
}

function escapeStyleText(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

/**
 * Hiển thị dropdown panel danh mục Thư viện Kiểu dáng
 * @param {Object} [options]
 * @param {HTMLElement} [options.targetEl]
 * @param {string} [options.activeStyle]
 * @param {Function} [options.onSelectStyle]
 * @param {Function} [options.onClose]
 */
export function showStyleGalleryDropdown(options = {}) {
  options = options || {};
  if (typeof document === "undefined" || !document.body) return null;

  closeStyleGalleryDropdown();

  const targetEl = options.targetEl;
  const activeStyle = (options.activeStyle || "normal").toLowerCase();
  const onSelectStyle = options.onSelectStyle || (() => {});
  const customStyles = Array.isArray(options.customStyles) ? options.customStyles : [];
  const onClose = options.onClose || (() => {});

  const ariaLabel = (typeof t === "function" && t("writerDialogs.styleGallery.title") !== "writerDialogs.styleGallery.title")
    ? t("writerDialogs.styleGallery.title")
    : "Thư viện kiểu dáng văn bản";
  const titleText = (typeof t === "function" && t("writerDialogs.styleGallery.title") !== "writerDialogs.styleGallery.title")
    ? t("writerDialogs.styleGallery.title")
    : "Thư viện Kiểu dáng (Styles Gallery)";
  const hintText = (typeof t === "function" && t("writerDialogs.styleGallery.hint") !== "writerDialogs.styleGallery.hint")
    ? t("writerDialogs.styleGallery.hint")
    : "Nhấp để áp dụng ngay";
  const activeTooltip = (typeof t === "function" && t("writerRibbon.group.styles") !== "writerRibbon.group.styles")
    ? t("writerRibbon.group.styles")
    : "Đang áp dụng";

  const dropdown = document.createElement("div");
  dropdown.className = "vno-style-gallery-dropdown";
  dropdown.setAttribute("role", "dialog");
  dropdown.setAttribute("aria-label", ariaLabel);

  dropdown.innerHTML = `
    <div class="vno-style-gallery-header">
      <span class="vno-style-gallery-title">${titleText}</span>
      <span class="vno-style-gallery-hint">${hintText}</span>
    </div>
    <div class="vno-style-gallery-grid">
      ${STYLE_PRESETS.map((preset) => {
        const { label, sublabel, desc } = getPresetStrings(preset);
        const isActive = (preset.id === activeStyle) || (preset.id === "normal" && activeStyle === "p");
        return `
          <button type="button" class="vno-style-card ${isActive ? "is-active" : ""}" data-style-id="${preset.id}" title="${desc}" aria-label="${label}: ${desc}" aria-pressed="${String(isActive)}">
            <div class="vno-style-card-preview">
              <span style="${preset.previewCss}">${preset.previewSample}</span>
            </div>
            <div class="vno-style-card-meta">
              <span class="vno-style-card-name">${label}</span>
              <span class="vno-style-card-tag">${sublabel}</span>
            </div>
            ${isActive ? `<span class="vno-style-card-check" title="${activeTooltip}">✓</span>` : ""}
          </button>
        `;
      }).join("")}
      ${customStyles.map((style) => {
        const isActive = style.id === activeStyle;
        const color = /^#[0-9a-f]{6}$/i.test(style.color || "") ? style.color : "#334155";
        const size = Math.max(8, Math.min(48, Number(style.size) || 13));
        const font = String(style.font || "Arial").replace(/[^A-Za-z0-9 _,-]/g, "").slice(0, 80) || "Arial";
        const css = `font-family:${JSON.stringify(font)};font-size:${size}pt;font-weight:${style.bold ? 700 : 400};font-style:${style.italic ? "italic" : "normal"};color:${color};text-align:${["left", "center", "right", "justify"].includes(style.alignment) ? style.alignment : "left"};`;
        const label = escapeStyleText(style.name);
        return `<button type="button" class="vno-style-card ${isActive ? "is-active" : ""}" data-style-id="${escapeStyleText(style.id)}" title="${label}" aria-label="${label}" aria-pressed="${String(isActive)}"><div class="vno-style-card-preview"><span style="${escapeStyleText(css)}">AaBbCc</span></div><div class="vno-style-card-meta"><span class="vno-style-card-name">${label}</span><span class="vno-style-card-tag">${escapeStyleText(style.basedOn || "Kiểu riêng")}</span></div>${isActive ? `<span class="vno-style-card-check">✓</span>` : ""}</button>`;
      }).join("")}
    </div>
  `;

  document.body.appendChild(dropdown);
  activeDropdownInstance = dropdown;

  // Định vị dropdown ngay dưới nút Ribbon (hoặc target element)
  if (targetEl && typeof targetEl.getBoundingClientRect === "function") {
    const rect = targetEl.getBoundingClientRect();
    const dropdownWidth = 340;
    let left = rect.left;
    if (left + dropdownWidth > window.innerWidth - 12) {
      left = Math.max(10, window.innerWidth - dropdownWidth - 12);
    }
    dropdown.style.position = "fixed";
    dropdown.style.top = `${rect.bottom + 4}px`;
    dropdown.style.left = `${left}px`;
    dropdown.style.zIndex = "1000";
  } else {
    dropdown.style.position = "fixed";
    dropdown.style.top = "110px";
    dropdown.style.left = "280px";
    dropdown.style.zIndex = "1000";
  }

  // Gắn sự kiện click chọn preset
  const cards = [...dropdown.querySelectorAll(".vno-style-card")];
  cards.forEach((card) => {
    card.addEventListener("click", (e) => {
      e.stopPropagation();
      const styleId = card.getAttribute("data-style-id");
      closeStyleGalleryDropdown();
      if (styleId) {
        onSelectStyle(styleId);
      }
    });
  });

  // Đóng khi click ngoài hoặc Escape
  const onDocClick = (e) => {
    if (!dropdown.contains(e.target) && (!targetEl || !targetEl.contains(e.target))) {
      closeStyleGalleryDropdown();
      onClose();
    }
  };

  const onKeyDown = (e) => {
    const focused = document.activeElement;
    const idx = cards.indexOf(focused);
    if (e.key === "Escape") {
      e.preventDefault();
      closeStyleGalleryDropdown();
      if (targetEl && typeof targetEl.focus === "function") targetEl.focus();
      onClose();
    } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      const next = cards[(idx + 1) % cards.length];
      if (next) next.focus();
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      const prev = cards[(idx - 1 + cards.length) % cards.length];
      if (prev) prev.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      if (cards[0]) cards[0].focus();
    } else if (e.key === "End") {
      e.preventDefault();
      if (cards.length) cards[cards.length - 1].focus();
    } else if (e.key === "Tab") {
      if (e.shiftKey && (idx <= 0 || !dropdown.contains(focused))) {
        e.preventDefault();
        cards[cards.length - 1]?.focus();
      } else if (!e.shiftKey && (idx === cards.length - 1 || !dropdown.contains(focused))) {
        e.preventDefault();
        cards[0]?.focus();
      }
    }
  };

  // Focus vào card đang active khi mở dropdown
  setTimeout(() => {
    const activeCard = dropdown.querySelector(".vno-style-card.is-active") || cards[0];
    if (activeCard && typeof activeCard.focus === "function") activeCard.focus();

    if (typeof document !== "undefined" && typeof document.addEventListener === "function") {
      document.addEventListener("click", onDocClick);
      document.addEventListener("keydown", onKeyDown);
      dropdown._cleanupListeners = () => {
        if (typeof document !== "undefined" && typeof document.removeEventListener === "function") {
          document.removeEventListener("click", onDocClick);
          document.removeEventListener("keydown", onKeyDown);
        }
      };
    }
  }, 10);

  return dropdown;
}

/**
 * Đóng dropdown Thư viện Kiểu nếu đang mở
 */
export function closeStyleGalleryDropdown() {
  if (activeDropdownInstance) {
    if (typeof activeDropdownInstance._cleanupListeners === "function") {
      activeDropdownInstance._cleanupListeners();
    }
    if (activeDropdownInstance.parentNode) {
      activeDropdownInstance.parentNode.removeChild(activeDropdownInstance);
    }
    activeDropdownInstance = null;
  }
}

/**
 * Tạo dải thanh ngang Quick Styles để hiển thị trên Ribbon
 * @param {Object} [options]
 * @param {string} [options.activeStyle]
 * @param {Function} [options.onSelectStyle]
 * @returns {HTMLElement}
 */
export function createStyleGalleryStrip(options = {}) {
  options = options || {};
  if (typeof document === "undefined" || !document.createElement) return null;

  const activeStyle = (options.activeStyle || "normal").toLowerCase();
  const onSelectStyle = options.onSelectStyle || (() => {});

  const stripAriaLabel = (typeof t === "function" && t("writerRibbon.group.styles") !== "writerRibbon.group.styles")
    ? t("writerRibbon.group.styles")
    : "Dải chọn kiểu nhanh";

  const strip = document.createElement("div");
  strip.className = "vno-style-gallery-strip";
  strip.setAttribute("role", "toolbar");
  strip.setAttribute("aria-label", stripAriaLabel);

  const items = [];

  STYLE_PRESETS.filter(preset => ["normal", "h1", "h2", "h3"].includes(preset.id)).forEach((preset, idx) => {
    const { label, desc } = getPresetStrings(preset);
    const isActive = (preset.id === activeStyle) || (preset.id === "normal" && activeStyle === "p");
    const item = document.createElement("button");
    item.type = "button";
    item.className = `vno-style-strip-item ${isActive ? "is-active" : ""}`;
    item.setAttribute("data-style-id", preset.id);
    item.title = `${label}: ${desc}`;
    item.setAttribute("aria-label", `${label}: ${desc}`);
    item.setAttribute("aria-pressed", String(isActive));
    // Roving tabindex: chỉ 1 button nhận Tab focus, còn lại tabIndex=-1
    item.tabIndex = (isActive || idx === 0) ? 0 : -1;
    item.innerHTML = `
      <div class="vno-style-strip-preview" style="${preset.previewCss}">${preset.previewSample}</div>
      <div class="vno-style-strip-label">${label}</div>
    `;
    item.addEventListener("click", () => {
      onSelectStyle(preset.id);
    });
    strip.appendChild(item);
    items.push(item);
  });

  // ArrowLeft/Right để điều hướng giữa các style item (WAI-ARIA toolbar pattern)
  // Chỉ điều hướng qua các kiểu đang hiện (hàng đầu); kiểu bị ẩn do hết chỗ không nhận tiêu điểm.
  const visibleItems = () => items.filter((it) => it.offsetTop <= items[0].offsetTop + 2);
  strip.addEventListener("keydown", (e) => {
    const focused = document.activeElement;
    const nav = visibleItems();
    const idx = nav.indexOf(focused);
    if (idx === -1) return;
    let targetIdx = -1;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      targetIdx = (idx + 1) % nav.length;
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      targetIdx = (idx - 1 + nav.length) % nav.length;
    } else if (e.key === "Home") {
      e.preventDefault();
      targetIdx = 0;
    } else if (e.key === "End") {
      e.preventDefault();
      targetIdx = nav.length - 1;
    }
    if (targetIdx !== -1) {
      items.forEach((it) => { it.tabIndex = it === nav[targetIdx] ? 0 : -1; });
      nav[targetIdx].focus();
    }
  });

  return strip;
}
