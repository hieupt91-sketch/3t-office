/**
 * 3T Office — About Dialog Controller (Hộp Giới thiệu 3T Office)
 * Hiển thị thông tin phiên bản, bản quyền 3T, và danh sách phần mềm nguồn mở bên thứ ba.
 * Keyboard accessible (Esc, Tab/Shift-Tab focus trap, Enter).
 */

const FALLBACK_ABOUT_INFO = {
  app_version: "0.9.0-pilot1",
  product_name: "3T Office",
  developer: "3T Technology",
  copyright: "© 2024–2026 3T Technology. All rights reserved.",
  suite_components: [
    { name: "Doc", role: "Soạn thảo văn bản và xử lý tài liệu hành chính" },
    { name: "Sheet", role: "Bảng tính điện tử và phân tích số liệu" },
    { name: "Slide", role: "Trình chiếu và thuyết trình đa phương tiện" }
  ],
  components: [
    { name: "Python", version: "3.12", license: "PSF License", purpose: "Ngôn ngữ nền tảng & logic ứng dụng" },
    { name: "LibreOffice Core", version: "7.6+", license: "MPL-2.0", purpose: "Xử lý tài liệu" },
    { name: "pywebview", version: "5.x", license: "BSD-3-Clause", purpose: "Khung hiển thị cửa sổ desktop native độc lập" },
    { name: "pythonnet & clr_loader", version: "3.x", license: "MIT", purpose: "Cầu nối Windows .NET / WebView2" },
    { name: "cffi & pycparser", version: "1.x", license: "MIT / BSD-3-Clause", purpose: "Giao tiếp nhị phân C native" },
    { name: "bottle & proxy_tools", version: "0.12+", license: "MIT", purpose: "Máy chủ HTTP tĩnh cục bộ nội bộ offline" },
    { name: "typing_extensions", version: "4.x", license: "PSF License", purpose: "Hỗ trợ kiểm tra kiểu dữ liệu mở rộng" },
    { name: "Phông chữ Be Vietnam Pro", version: "1.002", license: "SIL OFL 1.1", purpose: "Bộ phông chữ tiếng Việt chuẩn quốc gia" }
  ]
};

let _activeAboutDialog = null;

export async function showAboutDialog() {
  if (_activeAboutDialog) return;

  const previousActiveElement = document.activeElement;

  // Lấy dữ liệu phiên bản từ Python bridge nếu có
  let aboutData = { ...FALLBACK_ABOUT_INFO };
  try {
    if (window.pywebview?.api?.get_about_info) {
      const bridgeData = await window.pywebview.api.get_about_info();
      if (bridgeData && typeof bridgeData === "object") {
        aboutData = { ...aboutData, ...bridgeData };
      }
    } else if (window.pywebview?.api?.get_app_version) {
      const v = await window.pywebview.api.get_app_version();
      if (v) aboutData.app_version = v;
    }
  } catch (err) {
    console.warn("[AboutDialog] Không thể truy vấn Python bridge, dùng dữ liệu mặc định:", err);
  }

  // Tạo backdrop modal
  const backdrop = document.createElement("div");
  backdrop.className = "vno-about-backdrop";
  backdrop.setAttribute("role", "presentation");

  const dialog = document.createElement("div");
  dialog.className = "vno-about-dialog";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-labelledby", "vno-about-dialog-title");
  dialog.setAttribute("tabindex", "-1");

  const compRowsHtml = aboutData.components.map(c => `
    <div class="vno-about-comp-item">
      <span class="vno-about-comp-name">${escapeHtml(c.name)} <small style="color:#8899bb;">(${escapeHtml(c.version || "")})</small></span>
      <span class="vno-about-comp-license">${escapeHtml(c.license)}</span>
    </div>
  `).join("");

  dialog.innerHTML = `
    <header class="vno-about-header">
      <img src="branding/3t/3t-mark.png" alt="3T Logo" class="vno-about-logo" width="72" height="72">
      <div class="vno-about-header-text">
        <h1 class="vno-about-title" id="vno-about-dialog-title">
          <span class="vno-about-title-orange">3T</span> OFFICE
        </h1>
        <p class="vno-about-subtitle">Bộ ứng dụng văn phòng: Doc · Sheet · Slide</p>
      </div>
    </header>

    <div class="vno-about-body">
      <div class="vno-about-meta-grid">
        <div class="vno-about-row">
          <span class="vno-about-label">Phiên bản:</span>
          <span class="vno-about-value">
            <span class="vno-about-badge-version">${escapeHtml(aboutData.app_version)}</span>
          </span>
        </div>
        <div class="vno-about-row">
          <span class="vno-about-label">Nền tảng:</span>
          <span class="vno-about-value">Windows · macOS · Linux — chạy ngoại tuyến</span>
        </div>
        <div class="vno-about-row">
          <span class="vno-about-label">Bộ ứng dụng:</span>
          <span class="vno-about-value">Doc (Văn bản) · Sheet (Bảng tính) · Slide (Trình chiếu)</span>
        </div>
        <div class="vno-about-row">
          <span class="vno-about-label">Công nghệ:</span>
          <span class="vno-about-value">Ứng dụng chạy ngoại tuyến trên máy tính</span>
        </div>
        <div class="vno-about-row">
          <span class="vno-about-label">Nhà phát triển:</span>
          <span class="vno-about-value">${escapeHtml(aboutData.developer)}</span>
        </div>
      </div>

      <hr class="vno-about-sep">

      <div class="vno-about-notices-section">
        <div class="vno-about-notices-header">
          <h2 class="vno-about-notices-title">Phần mềm nguồn mở & Giấy phép</h2>
          <button type="button" class="vno-about-notices-btn" id="vno-about-toggle-notices" aria-expanded="false">
            Xem toàn văn giấy phép
          </button>
        </div>
        <div class="vno-about-components-list" id="vno-about-comp-list">
          ${compRowsHtml}
        </div>
        <div class="vno-about-full-notices" id="vno-about-full-notices" style="display:none;" aria-hidden="true">
          ${escapeHtml(aboutData.third_party_notices || "Đang tải thông báo giấy phép…")}
        </div>
      </div>

      <div class="vno-about-copyright">
        ${escapeHtml(aboutData.copyright)}
      </div>
    </div>

    <footer class="vno-about-footer">
      <button type="button" class="vno-about-btn-close" id="vno-about-close-btn" autofocus>
        Đóng
      </button>
    </footer>
  `;

  backdrop.appendChild(dialog);
  document.body.appendChild(backdrop);
  _activeAboutDialog = backdrop;

  const closeBtn = dialog.querySelector("#vno-about-close-btn");
  const toggleBtn = dialog.querySelector("#vno-about-toggle-notices");
  const fullNoticesEl = dialog.querySelector("#vno-about-full-notices");
  const compListEl = dialog.querySelector("#vno-about-comp-list");

  // Toggle xem toàn văn THIRD-PARTY-NOTICES
  toggleBtn?.addEventListener("click", () => {
    const isShown = fullNoticesEl.style.display !== "none";
    if (isShown) {
      fullNoticesEl.style.display = "none";
      fullNoticesEl.setAttribute("aria-hidden", "true");
      compListEl.style.display = "flex";
      toggleBtn.textContent = "Xem toàn văn giấy phép";
      toggleBtn.setAttribute("aria-expanded", "false");
    } else {
      fullNoticesEl.style.display = "block";
      fullNoticesEl.setAttribute("aria-hidden", "false");
      compListEl.style.display = "none";
      toggleBtn.textContent = "Thu gọn danh sách";
      toggleBtn.setAttribute("aria-expanded", "true");
    }
  });

  const closeDialog = () => {
    document.removeEventListener("keydown", handleKeyDown);
    backdrop.remove();
    _activeAboutDialog = null;
    if (previousActiveElement && typeof previousActiveElement.focus === "function") {
      previousActiveElement.focus();
    }
  };

  closeBtn?.addEventListener("click", closeDialog);

  // Click vào backdrop nền tối bên ngoài hộp thì đóng
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) {
      closeDialog();
    }
  });

  // Xử lý bàn phím: Esc đóng, Tab/Shift-Tab bẫy tiêu điểm
  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      closeDialog();
      return;
    }

    if (e.key === "Tab") {
      const focusables = Array.from(dialog.querySelectorAll(
        'button:not([disabled]), [tabindex]:not([tabindex="-1"]), textarea:not([disabled])'
      )).filter(el => el.offsetParent !== null);

      if (focusables.length === 0) return;

      const firstEl = focusables[0];
      const lastEl = focusables[focusables.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstEl || !dialog.contains(document.activeElement)) {
          e.preventDefault();
          lastEl.focus();
        }
      } else {
        if (document.activeElement === lastEl || !dialog.contains(document.activeElement)) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    }
  };

  document.addEventListener("keydown", handleKeyDown);
  closeBtn?.focus();
}

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[m]));
}
