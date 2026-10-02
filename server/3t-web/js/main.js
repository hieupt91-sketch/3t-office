/**
 * 3T Office — Kịch bản JavaScript thuần (Vanilla JS)
 * Không phụ thuộc thư viện ngoài, tối ưu hiệu năng, tuân thủ WCAG AA.
 * Hỗ trợ chế độ ngoại tuyến 100% và giao thức file://.
 */

document.addEventListener("DOMContentLoaded", () => {
  initThemeToggle();
  initMobileNav();
  initHeroAppSwitcher();
  initHeroParallax();
  initScrollReveal();
  initCopyChecksum();
  initCounterAnimation();
  initFeatureFilter();
  initGuideSearchAndFilter();
  initHealthChecker();
  initReleaseData();
});

/**
 * 1. Quản lý chuyển đổi giao diện Sáng / Tối (Theme Toggle)
 */
function initThemeToggle() {
  const toggleButtons = document.querySelectorAll(".theme-toggle-btn");
  if (!toggleButtons.length) return;

  // Lấy chủ đề hiện tại
  let currentTheme = document.documentElement.getAttribute("data-theme");
  if (!currentTheme) {
    try {
      currentTheme = localStorage.getItem("3t_theme");
    } catch (_) {}
    if (!currentTheme) {
      currentTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    document.documentElement.setAttribute("data-theme", currentTheme);
  }

  // Cập nhật biểu tượng và nhãn trợ năng cho toàn bộ nút chuyển đổi
  const updateToggleUI = (theme) => {
    toggleButtons.forEach((btn) => {
      btn.setAttribute("aria-label", theme === "dark" ? "Chuyển sang giao diện Sáng" : "Chuyển sang giao diện Tối");
      btn.setAttribute("title", theme === "dark" ? "Chuyển sang giao diện Sáng" : "Chuyển sang giao diện Tối");
      
      // Biểu tượng Mặt trời (cho Dark mode muốn chuyển sang Light) hoặc Mặt trăng (cho Light mode)
      if (theme === "dark") {
        btn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="5"></circle>
            <line x1="12" y1="1" x2="12" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="23"></line>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
            <line x1="1" y1="12" x2="3" y2="12"></line>
            <line x1="21" y1="12" x2="23" y2="12"></line>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
          </svg>
        `;
      } else {
        btn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
          </svg>
        `;
      }
    });
  };

  updateToggleUI(currentTheme);

  toggleButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const activeTheme = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", activeTheme);
      try {
        localStorage.setItem("3t_theme", activeTheme);
      } catch (_) {}
      updateToggleUI(activeTheme);
    });
  });
}

/**
 * 2. Điều khiển trình đơn di động (Mobile Navigation)
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

  // Đóng khi bấm ra ngoài
  document.addEventListener("click", (e) => {
    if (mainNav.classList.contains("open") && !mainNav.contains(e.target) && !toggleBtn.contains(e.target)) {
      mainNav.classList.remove("open");
      toggleBtn.setAttribute("aria-expanded", "false");
    }
  });
}

/**
 * 3. Bộ chuyển đổi 3 ứng dụng tương tác tại Hero (Interactive App Switcher)
 */
function initHeroAppSwitcher() {
  const tabs = document.querySelectorAll(".switcher-tab-btn");
  const previewImg = document.getElementById("hero-preview-img");
  const previewSource = document.getElementById("hero-preview-source");
  const windowTitle = document.getElementById("hero-window-title");
  const bulletsContainer = document.getElementById("hero-switcher-bullets");
  if (!tabs.length || !previewImg) return;

  const appData = {
    doc: {
      title: "Doc — Soạn thảo văn bản (.docx)",
      icon: "assets/icons/writer.svg",
      webp: "assets/screenshots/doc-preview.webp",
      png: "assets/screenshots/doc-preview.png",
      alt: "Giao diện làm việc của Doc — Soạn thảo văn bản hành chính",
      bullets: [
        "Soạn thảo và định dạng văn bản chuẩn hành chính Việt Nam (Nghị định 30/2020/NĐ-CP).",
        "Mở, chỉnh sửa và lưu trực tiếp định dạng .docx, .odt, .doc; xuất tệp PDF chính xác từng trang.",
        "Theo dõi thay đổi (Track Changes), chèn chú thích nội tuyến và lập mục lục tự động."
      ]
    },
    sheet: {
      title: "Sheet — Bảng tính & Công thức (.xlsx)",
      icon: "assets/icons/sheet.svg",
      webp: "assets/screenshots/sheet-preview.webp",
      png: "assets/screenshots/sheet-preview.png",
      alt: "Giao diện làm việc của Sheet — Bảng tính điện tử và công thức",
      bullets: [
        "Tính toán công thức toán học, thống kê, tài chính và tra cứu (VLOOKUP, XLOOKUP, SUMIFS).",
        "Tích hợp Pivot Table (DataPilot), định dạng có điều kiện và lọc dữ liệu đa tiêu chí chuẩn .xlsx.",
        "Vẽ biểu đồ trực quan, hỗ trợ vùng đặt tên (Defined Names) và What-If Analysis mạnh mẽ."
      ]
    },
    slide: {
      title: "Slide — Trình chiếu thuyết trình (.pptx)",
      icon: "assets/icons/slides.svg",
      webp: "assets/screenshots/slide-preview.webp",
      png: "assets/screenshots/slide-preview.png",
      alt: "Giao diện làm việc của Slide — Thiết kế bài thuyết trình",
      bullets: [
        "Thiết kế bài thuyết trình đa phương tiện trực quan, tương thích tuyệt đối chuẩn .pptx và .odp.",
        "Hiệu ứng chuyển trang (Transitions), hoạt hình và quản lý Slide Master chuyên nghiệp.",
        "Chế độ người thuyết trình 2 màn hình (Presenter View) kèm đồng hồ đếm giờ và bút laser ảo."
      ]
    }
  };

  const activateTab = (tab) => {
    const appKey = tab.getAttribute("data-app");
    const data = appData[appKey];
    if (!data) return;

    // Cập nhật trạng thái nút bấm
    tabs.forEach((t) => {
      t.classList.remove("active");
      t.setAttribute("aria-selected", "false");
    });
    tab.classList.add("active");
    tab.setAttribute("aria-selected", "true");

    // Hiệu ứng chuyển ảnh mượt (crossfade)
    previewImg.style.opacity = "0.2";
    setTimeout(() => {
      if (previewSource) previewSource.srcset = data.webp;
      previewImg.src = data.png;
      previewImg.alt = data.alt;
      previewImg.style.opacity = "1";
    }, 120);

    // Cập nhật tiêu đề cửa sổ
    if (windowTitle) {
      windowTitle.innerHTML = `<img src="${data.icon}" alt="" width="16" height="16"> ${data.title}`;
    }

    // Cập nhật danh sách tính năng nổi bật
    if (bulletsContainer) {
      const listItems = data.bullets.map((b) => `
        <li class="switcher-bullet-item">
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          <span>${b}</span>
        </li>
      `).join("");
      bulletsContainer.innerHTML = `<ul class="switcher-bullet-list">${listItems}</ul>`;
    }
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => activateTab(tab));

    // Điều hướng bằng bàn phím (Phím mũi tên Trái / Phải)
    tab.addEventListener("keydown", (e) => {
      let targetIndex = null;
      if (e.key === "ArrowRight") {
        targetIndex = (index + 1) % tabs.length;
      } else if (e.key === "ArrowLeft") {
        targetIndex = (index - 1 + tabs.length) % tabs.length;
      }
      if (targetIndex !== null) {
        e.preventDefault();
        tabs[targetIndex].focus();
        activateTab(tabs[targetIndex]);
      }
    });
  });
}

/**
 * 4. Hiệu ứng nghiêng 3D con trỏ chuột cho cửa sổ Hero (Pointer Parallax)
 */
function initHeroParallax() {
  const visual = document.querySelector(".hero-visual");
  const windowFrame = document.querySelector(".window-frame");
  if (!visual || !windowFrame) return;

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  visual.addEventListener("mousemove", (e) => {
    const rect = visual.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;

    const tiltX = -(y / (rect.height / 2)) * 6; // tối đa 6 độ
    const tiltY = (x / (rect.width / 2)) * 6;

    windowFrame.style.transform = `perspective(1000px) rotateX(${tiltX.toFixed(2)}deg) rotateY(${tiltY.toFixed(2)}deg) translateY(-4px)`;
  });

  visual.addEventListener("mouseleave", () => {
    windowFrame.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)";
  });
}

/**
 * 5. Hiệu ứng cuộn hiển thị từng bước (Scroll Reveal qua IntersectionObserver)
 */
function initScrollReveal() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.querySelectorAll(".reveal-on-scroll").forEach((el) => el.classList.add("revealed"));
    return;
  }

  if (!("IntersectionObserver" in window)) {
    document.querySelectorAll(".reveal-on-scroll").forEach((el) => el.classList.add("revealed"));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("revealed");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll(".reveal-on-scroll").forEach((el) => observer.observe(el));
}

/**
 * 6. Nút sao chép mã băm SHA256 (Copy Checksum with instant feedback)
 */
function initCopyChecksum() {
  const copyBtns = document.querySelectorAll(".copy-btn");
  copyBtns.forEach((btn) => {
    btn.addEventListener("click", async () => {
      const targetSelector = btn.getAttribute("data-copy-target");
      const targetEl = targetSelector ? document.querySelector(targetSelector) : null;
      const textToCopy = targetEl ? targetEl.textContent.trim() : "";
      if (!textToCopy) return;

      let success = false;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
          await navigator.clipboard.writeText(textToCopy);
          success = true;
        } catch (_) {}
      }

      if (!success) {
        try {
          const textarea = document.createElement("textarea");
          textarea.value = textToCopy;
          textarea.style.position = "fixed";
          textarea.style.opacity = "0";
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand("copy");
          document.body.removeChild(textarea);
          success = true;
        } catch (_) {}
      }

      if (success) {
        const originalText = btn.innerHTML;
        btn.innerHTML = `✓ Đã sao chép!`;
        btn.style.color = "#10B981";
        btn.style.borderColor = "#10B981";
        setTimeout(() => {
          btn.innerHTML = originalText;
          btn.style.color = "";
          btn.style.borderColor = "";
        }, 2200);
      }
    });
  });
}

/**
 * 7. Hiệu ứng đếm số tăng dần (Chỉ áp dụng cho số liệu thật: 3 ứng dụng, 3 định dạng, 100% ngoại tuyến)
 */
function initCounterAnimation() {
  const counters = document.querySelectorAll(".count-up-val");
  if (!counters.length) return;

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const runCounter = (el) => {
    const target = parseInt(el.getAttribute("data-target"), 10) || 0;
    const duration = target <= 10 ? 120 : 800;
    const startTime = performance.now();

    const update = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const current = Math.floor(progress === 1 ? target : target * progress);
      el.textContent = current;

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        el.textContent = target;
      }
    };

    requestAnimationFrame(update);
  };

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          runCounter(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    counters.forEach((el) => observer.observe(el));
  } else {
    counters.forEach((el) => runCounter(el));
  }
}

/**
 * 8. Bộ lọc ma trận tính năng (Trang tinh-nang.html)
 */
function initFeatureFilter() {
  const appFilterBtns = document.querySelectorAll("[data-filter-app]");
  const statusFilterBtns = document.querySelectorAll("[data-filter-status]");
  const featureCards = document.querySelectorAll(".feature-item-card");
  if (!featureCards.length) return;

  let currentApp = "all";
  let currentStatus = "all";

  const applyFilters = () => {
    let visibleCount = 0;
    featureCards.forEach((card) => {
      const cardApp = card.getAttribute("data-app") || "";
      const cardStatus = card.getAttribute("data-status") || "";

      const matchApp = currentApp === "all" || cardApp === currentApp;
      const matchStatus = currentStatus === "all" || cardStatus === currentStatus;

      if (matchApp && matchStatus) {
        card.style.display = "";
        visibleCount++;
      } else {
        card.style.display = "none";
      }
    });

    const noResultNotice = document.getElementById("no-feature-results");
    if (noResultNotice) {
      noResultNotice.style.display = visibleCount === 0 ? "block" : "none";
    }
  };

  appFilterBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      appFilterBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentApp = btn.getAttribute("data-filter-app") || "all";
      applyFilters();
    });
  });

  statusFilterBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      statusFilterBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentStatus = btn.getAttribute("data-filter-status") || "all";
      applyFilters();
    });
  });
}

/**
 * 9. Tìm kiếm và lọc theo danh mục bài hướng dẫn (Trang huong-dan.html)
 */
function initGuideSearchAndFilter() {
  const searchInput = document.getElementById("guide-search");
  const categoryChips = document.querySelectorAll("[data-guide-category]");
  const articleCards = document.querySelectorAll(".article-card");
  const noResultNotice = document.getElementById("no-search-results");
  if (!articleCards.length) return;

  let currentCategory = "all";

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

  const filterArticles = () => {
    const query = searchInput ? normalizeVi(searchInput.value) : "";
    let matchedCount = 0;

    articleCards.forEach((card) => {
      const title = normalizeVi(card.querySelector(".article-title")?.textContent || "");
      const summary = normalizeVi(card.querySelector(".article-summary")?.textContent || "");
      const steps = normalizeVi(card.querySelector(".article-steps")?.textContent || "");
      const keywords = normalizeVi(card.getAttribute("data-keywords") || "");
      const category = card.getAttribute("data-category") || "";

      const matchCategory = currentCategory === "all" || category === currentCategory;
      const matchSearch = !query || title.includes(query) || summary.includes(query) || steps.includes(query) || keywords.includes(query);

      if (matchCategory && matchSearch) {
        card.style.display = "";
        matchedCount++;
      } else {
        card.style.display = "none";
      }
    });

    if (noResultNotice) {
      noResultNotice.style.display = matchedCount === 0 ? "block" : "none";
    }
  };

  if (searchInput) {
    searchInput.addEventListener("input", filterArticles);
  }

  categoryChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      categoryChips.forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      currentCategory = chip.getAttribute("data-guide-category") || "all";
      filterArticles();
    });
  });
}

/**
 * 10. Giám sát trạng thái máy chủ (/health) trên trang trang-thai.html
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
    if (indicator) {
      indicator.className = "status-indicator status-loading";
      indicator.textContent = "⏳";
    }
    if (title) title.textContent = "Đang kiểm tra kết nối dịch vụ…";
    if (desc) desc.textContent = "Đang gửi tín hiệu kiểm tra tới điểm cuối /health…";

    if (window.location.protocol === "file:") {
      setTimeout(() => {
        if (indicator) {
          indicator.className = "status-indicator status-loading";
          indicator.textContent = "📁";
        }
        if (title) title.textContent = "Đang xem ở chế độ tệp cục bộ (file://)";
        if (desc) desc.textContent = "Trang web đang chạy ngoại tuyến trực tiếp từ đĩa máy tính. Endpoint /health hoạt động khi triển khai trên máy chủ https://office.3tcomputer.com.";
        if (meta) {
          meta.innerHTML = `Giao thức hiện tại: <strong>file://</strong><br>` +
                           `Máy chủ phân phối: <strong>https://office.3tcomputer.com/health</strong><br>` +
                           `Thời gian kiểm tra: ${new Date().toLocaleString("vi-VN")}`;
        }
      }, 350);
      return;
    }

    try {
      const response = await fetch("/health", { cache: "no-store" });
      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        if (indicator) {
          indicator.className = "status-indicator status-ok";
          indicator.textContent = "✓";
        }
        if (title) title.textContent = "Máy chủ 3T Cloud đang hoạt động tốt (OK)";
        if (desc) desc.textContent = "Hệ thống dịch vụ và kênh phát hành phản hồi bình thường, sẵn sàng kết nối.";
        if (meta) {
          meta.innerHTML = `Phản hồi HTTP: <strong>${response.status} ${response.statusText}</strong><br>` +
                           `Dữ liệu máy chủ: ${JSON.stringify(data)}<br>` +
                           `Thời gian phản hồi: ${new Date().toLocaleString("vi-VN")}`;
        }
      } else {
        throw new Error("HTTP " + response.status);
      }
    } catch (err) {
      if (indicator) {
        indicator.className = "status-indicator status-err";
        indicator.textContent = "✕";
      }
      if (title) title.textContent = "Chưa kết nối được máy chủ (/health)";
      if (desc) desc.textContent = "Không nhận được phản hồi từ cổng /health. Ứng dụng 3T Office trên máy người dùng vẫn hoạt động ngoại tuyến bình thường.";
      if (meta) {
        meta.innerHTML = `Lỗi ghi nhận: <strong>${err.message || String(err)}</strong><br>` +
                         `Thời gian thử: ${new Date().toLocaleString("vi-VN")}`;
      }
    }
  };

  if (retryBtn) {
    retryBtn.addEventListener("click", checkHealth);
  }

  checkHealth();
}

/**
 * 11. Nạp và đồng bộ dữ liệu phiên bản từ data/releases.json
 */
async function initReleaseData() {
  const dynamicElems = document.querySelectorAll("[data-release-field]");
  if (!dynamicElems.length) return;

  let releaseData = null;

  try {
    const res = await fetch("data/releases.json");
    if (res.ok) {
      releaseData = await res.json();
    }
  } catch (_) {}

  if (!releaseData && window.__FALLBACK_RELEASES__) {
    releaseData = window.__FALLBACK_RELEASES__;
  }

  if (!releaseData) return;

  const ver = releaseData.current_version;
  const dl = releaseData.download || {};

  document.querySelectorAll("[data-release-field='current_version']").forEach((el) => el.textContent = ver);
  document.querySelectorAll("[data-release-field='file_name']").forEach((el) => el.textContent = dl.file_name || "VNOffice-Setup-0.9.7.exe");
  document.querySelectorAll("[data-release-field='file_size_formatted']").forEach((el) => el.textContent = dl.file_size_formatted || "502 MB");
  document.querySelectorAll("[data-release-field='sha256']").forEach((el) => el.textContent = dl.sha256 || "");
}
