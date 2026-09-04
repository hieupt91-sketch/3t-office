/**
 * VN Office — VN Writer Style Gallery (Thư viện Kiểu dáng trực quan)
 * Chuẩn hóa Quick Styles Microsoft Word 365 / LibreOffice Writer
 */

export const STYLE_PRESETS = [
  {
    id: "normal",
    tag: "p",
    label: "Normal",
    sublabel: "Văn bản thường",
    previewSample: "AaBbCc",
    previewCss: "font-family:'Times New Roman', serif; font-size:14px; font-weight:normal; color:#1e293b;",
    description: "Văn bản thường, phông chữ chuẩn 14pt căn đều hai bên (Nghị định 30/2020/NĐ-CP)"
  },
  {
    id: "h1",
    tag: "h1",
    label: "Tiêu đề 1",
    sublabel: "Heading 1",
    previewSample: "TIÊU ĐỀ 1",
    previewCss: "font-family:'Times New Roman', serif; font-size:15px; font-weight:700; color:#0f4c81; text-transform:uppercase;",
    description: "Tiêu đề cấp 1: Chữ hoa, in đậm, căn giữa, cỡ 16pt (QUYẾT ĐỊNH, CHỈ THỊ...)"
  },
  {
    id: "h2",
    tag: "h2",
    label: "Tiêu đề 2",
    sublabel: "Heading 2",
    previewSample: "Tiêu đề 2",
    previewCss: "font-family:'Times New Roman', serif; font-size:14px; font-weight:700; color:#0f4c81;",
    description: "Tiêu đề cấp 2: Chữ thường in đậm, cỡ 14pt (Điều 1, Mục I...)"
  },
  {
    id: "h3",
    tag: "h3",
    label: "Tiêu đề 3",
    sublabel: "Heading 3",
    previewSample: "Tiêu đề 3",
    previewCss: "font-family:'Times New Roman', serif; font-size:13px; font-weight:700; font-style:italic; color:#334155;",
    description: "Tiêu đề cấp 3: In đậm nghiêng, cỡ 13pt (Khoản 1, Điểm a...)"
  },
  {
    id: "quote",
    tag: "blockquote",
    className: "vno-style-quote",
    label: "Trích dẫn",
    sublabel: "Quote",
    previewSample: "“Trích dẫn…”",
    previewCss: "font-family:'Times New Roman', serif; font-size:12px; font-style:italic; color:#475569; border-left:3px solid #0f4c81; padding-left:6px;",
    description: "Khối trích dẫn: In nghiêng, thụt lề 24pt, viền xanh bên trái"
  },
  {
    id: "emphasis",
    tag: "p",
    className: "vno-style-emphasis",
    label: "Nhấn mạnh",
    sublabel: "Emphasis",
    previewSample: "Nhấn mạnh",
    previewCss: "font-family:'Times New Roman', serif; font-size:13px; font-weight:700; font-style:italic; color:#b45309;",
    description: "Đoạn nhấn mạnh: In đậm, in nghiêng, màu sắc nổi bật"
  }
];

let activeDropdownInstance = null;

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
  const onClose = options.onClose || (() => {});

  const dropdown = document.createElement("div");
  dropdown.className = "vno-style-gallery-dropdown";
  dropdown.setAttribute("role", "dialog");
  dropdown.setAttribute("aria-label", "Thư viện kiểu dáng văn bản");

  dropdown.innerHTML = `
    <div class="vno-style-gallery-header">
      <span class="vno-style-gallery-title">Thư viện Kiểu dáng (Styles Gallery)</span>
      <span class="vno-style-gallery-hint">Nhấp để áp dụng ngay</span>
    </div>
    <div class="vno-style-gallery-grid">
      ${STYLE_PRESETS.map((preset) => {
        const isActive = (preset.id === activeStyle) || (preset.id === "normal" && activeStyle === "p");
        return `
          <button type="button" class="vno-style-card ${isActive ? "is-active" : ""}" data-style-id="${preset.id}" title="${preset.description}">
            <div class="vno-style-card-preview">
              <span style="${preset.previewCss}">${preset.previewSample}</span>
            </div>
            <div class="vno-style-card-meta">
              <span class="vno-style-card-name">${preset.label}</span>
              <span class="vno-style-card-tag">${preset.sublabel}</span>
            </div>
            ${isActive ? `<span class="vno-style-card-check" title="Đang áp dụng">✓</span>` : ""}
          </button>
        `;
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
  const cards = dropdown.querySelectorAll(".vno-style-card");
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
    if (e.key === "Escape") {
      e.preventDefault();
      closeStyleGalleryDropdown();
      onClose();
    }
  };

  setTimeout(() => {
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

  const strip = document.createElement("div");
  strip.className = "vno-style-gallery-strip";
  strip.setAttribute("role", "toolbar");
  strip.setAttribute("aria-label", "Dải chọn kiểu nhanh");

  STYLE_PRESETS.forEach((preset) => {
    const isActive = (preset.id === activeStyle) || (preset.id === "normal" && activeStyle === "p");
    const item = document.createElement("button");
    item.type = "button";
    item.className = `vno-style-strip-item ${isActive ? "is-active" : ""}`;
    item.setAttribute("data-style-id", preset.id);
    item.title = `${preset.label}: ${preset.description}`;
    item.innerHTML = `
      <div class="vno-style-strip-preview" style="${preset.previewCss}">${preset.previewSample}</div>
      <div class="vno-style-strip-label">${preset.label}</div>
    `;
    item.addEventListener("click", () => {
      onSelectStyle(preset.id);
    });
    strip.appendChild(item);
  });

  return strip;
}
