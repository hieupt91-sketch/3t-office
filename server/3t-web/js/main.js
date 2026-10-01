/**
 * 3T Office — Kịch bản JavaScript thuần (Vanilla JS)
 * Không phụ thuộc thư viện ngoài, hoạt động ngoại tuyến và từ file://
 */

document.addEventListener("DOMContentLoaded", () => {
  initMobileNav();
  initGalleryTabs();
  initArticleSearch();
  initHealthChecker();
  initReleaseData();
});

/**
 * 1. Điều khiển thanh điều hướng trên thiết bị di động
 */
function initMobileNav() {
  const toggleBtn = document.querySelector(".nav-toggle");
  const mainNav = document.querySelector(".main-nav");
  if (!toggleBtn || !mainNav) return;

  toggleBtn.addEventListener("click", () => {
    const isExpanded = toggleBtn.getAttribute("aria-expanded") === "true";
    toggleBtn.setAttribute("aria-expanded", String(!isExpanded));
    mainNav.classList.toggle("open");
  });

  // Đóng khi nhấn phím Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && mainNav.classList.contains("open")) {
      mainNav.classList.remove("open");
      toggleBtn.setAttribute("aria-expanded", "false");
      toggleBtn.focus();
    }
  });
}

/**
 * 2. Chuyển đổi tab bộ sưu tập ảnh màn hình thật
 */
function initGalleryTabs() {
  const tabs = document.querySelectorAll(".tab-btn");
  if (!tabs.length) return;

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const targetId = tab.getAttribute("data-target");
      if (!targetId) return;

      // Cập nhật nút tab
      tabs.forEach((t) => {
        t.classList.remove("active");
        t.setAttribute("aria-selected", "false");
      });
      tab.classList.add("active");
      tab.setAttribute("aria-selected", "true");

      // Cập nhật pa-nen ảnh
      const panels = document.querySelectorAll(".gallery-panel");
      panels.forEach((p) => {
        if (p.id === targetId) {
          p.classList.add("active");
        } else {
          p.classList.remove("active");
        }
      });
    });
  });
}

/**
 * 3. Tìm kiếm bài viết hướng dẫn không dấu và có dấu (Client-side Search)
 */
function initArticleSearch() {
  const searchInput = document.getElementById("guide-search");
  const articleCards = document.querySelectorAll(".article-card");
  const noResultNotice = document.getElementById("no-search-results");
  if (!searchInput || !articleCards.length) return;

  // Chuẩn hóa chuỗi tiếng Việt để so sánh tìm kiếm
  const normalizeVi = (str) => {
    if (!str) return "";
    return str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .toLowerCase()
      .trim();
  };

  searchInput.addEventListener("input", (e) => {
    const query = normalizeVi(e.target.value);
    let matchedCount = 0;

    articleCards.forEach((card) => {
      const title = normalizeVi(card.querySelector(".article-title")?.textContent || "");
      const summary = normalizeVi(card.querySelector(".article-summary")?.textContent || "");
      const steps = normalizeVi(card.querySelector(".article-steps")?.textContent || "");
      const keywords = normalizeVi(card.getAttribute("data-keywords") || "");

      const isMatch = !query || 
        title.includes(query) || 
        summary.includes(query) || 
        steps.includes(query) || 
        keywords.includes(query);

      if (isMatch) {
        card.style.display = "flex";
        matchedCount++;
      } else {
        card.style.display = "none";
      }
    });

    if (noResultNotice) {
      noResultNotice.style.display = matchedCount === 0 ? "block" : "none";
    }
  });
}

/**
 * 4. Kiểm tra trạng thái máy chủ (/health)
 */
function initHealthChecker() {
  const statusContainer = document.getElementById("health-status-container");
  if (!statusContainer) return;

  const indicator = document.getElementById("status-indicator");
  const title = document.getElementById("status-title");
  const desc = document.getElementById("status-desc");
  const meta = document.getElementById("status-meta");
  const retryBtn = document.getElementById("status-retry-btn");

  const checkHealth = async () => {
    if (indicator) indicator.className = "status-indicator status-loading";
    if (indicator) indicator.textContent = "⏳";
    if (title) title.textContent = "Đang kiểm tra trạng thái máy chủ…";
    if (desc) desc.textContent = "Đang gửi yêu cầu kiểm tra tới /health…";

    // Trường hợp mở trực tiếp từ file:// (ngoại tuyến)
    if (window.location.protocol === "file:") {
      setTimeout(() => {
        if (indicator) indicator.className = "status-indicator status-loading";
        if (indicator) indicator.textContent = "📁";
        if (title) title.textContent = "Đang xem trang ở chế độ tệp cục bộ (file://)";
        if (desc) desc.textContent = "Trang web đang chạy ngoại tuyến trực tiếp từ đĩa máy tính. Endpoint /health phản hồi khi trang được triển khai trên máy chủ https://office.3tcomputer.com.";
        if (meta) {
          meta.innerHTML = "Giao thức hiện tại: <strong>file://</strong><br>" +
                           "Địa chỉ kiểm tra trực tuyến: <strong>https://office.3tcomputer.com/health</strong><br>" +
                           "Thời gian kiểm tra: " + new Date().toLocaleString("vi-VN");
        }
      }, 400);
      return;
    }

    try {
      const response = await fetch("/health", { cache: "no-store" });
      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        if (indicator) indicator.className = "status-indicator status-ok";
        if (indicator) indicator.textContent = "✓";
        if (title) title.textContent = "Máy chủ 3T Cloud đang hoạt động tốt (OK)";
        if (desc) desc.textContent = "Hệ thống máy chủ dịch vụ và API phản hồi bình thường, sẵn sàng kết nối.";
        if (meta) {
          meta.innerHTML = "Phản hồi HTTP: <strong>" + response.status + " " + response.statusText + "</strong><br>" +
                           "Dữ liệu máy chủ: " + JSON.stringify(data) + "<br>" +
                           "Thời gian phản hồi: " + new Date().toLocaleString("vi-VN");
        }
      } else {
        throw new Error("HTTP " + response.status);
      }
    } catch (err) {
      if (indicator) indicator.className = "status-indicator status-err";
      if (indicator) indicator.textContent = "✕";
      if (title) title.textContent = "Chưa kết nối được máy chủ (/health)";
      if (desc) desc.textContent = "Không nhận được phản hồi từ cổng /health. Ứng dụng 3T Office trên máy người dùng vẫn hoạt động ngoại tuyến bình thường.";
      if (meta) {
        meta.innerHTML = "Lỗi ghi nhận: <strong>" + (err.message || String(err)) + "</strong><br>" +
                         "Thời gian thử: " + new Date().toLocaleString("vi-VN");
      }
    }
  };

  if (retryBtn) {
    retryBtn.addEventListener("click", checkHealth);
  }

  checkHealth();
}

/**
 * 5. Nạp dữ liệu bản phát hành từ data/releases.json (có dự phòng nội tuyến)
 */
async function initReleaseData() {
  const dynamicElems = document.querySelectorAll("[data-release-field]");
  if (!dynamicElems.length) return;

  let releaseData = null;

  // Thử tải qua fetch
  try {
    const res = await fetch("data/releases.json");
    if (res.ok) {
      releaseData = await res.json();
    }
  } catch (err) {
    // Nếu chạy qua file:// hoặc fetch bị chặn, dùng dữ liệu dự phòng đã nhúng
  }

  if (!releaseData && window.__FALLBACK_RELEASES__) {
    releaseData = window.__FALLBACK_RELEASES__;
  }

  if (!releaseData) return;

  // Cập nhật các trường dữ liệu
  const ver = releaseData.current_version;
  const dl = releaseData.download || {};

  document.querySelectorAll("[data-release-field='current_version']").forEach(el => el.textContent = ver);
  document.querySelectorAll("[data-release-field='file_name']").forEach(el => el.textContent = dl.file_name || "VNOffice-Setup-0.9.6.exe");
  document.querySelectorAll("[data-release-field='file_size_formatted']").forEach(el => el.textContent = dl.file_size_formatted || "502 MB");
  document.querySelectorAll("[data-release-field='sha256']").forEach(el => el.textContent = dl.sha256 || "");
}
