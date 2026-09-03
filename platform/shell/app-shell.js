/**
 * VN Office Platform — Enterprise Application Shell
 */

import { ICONS } from "../ui-kit/icons.js";
import { globalCommandBus } from "../commands/command-bus.js";
import { globalShortcutManager } from "../commands/shortcut-manager.js";
import { RibbonHost } from "../ribbon/ribbon-host.js";
import { OFFICE_TEMPLATES } from "../templates/template-registry.js";
import { RecentFilesManager } from "../recent/recent-manager.js";
import { createEmptyState } from "../ui-kit/components.js";
import { LocalAiService } from "../ai/ai-service.js";
import { showAlertDialog } from "../ui-kit/dialogs.js";
import { t } from "../i18n/i18n.js";

export class AppShell {
  /**
   * @param {Object} options
   * @param {"writer"|"sheet"|"slides"} options.appName
   * @param {string} options.appTitle
   * @param {string} [options.documentName="Tài liệu chưa đặt tên"]
   * @param {Function} [options.onSwitchApp]
   */
  constructor(options) {
    this.appName = options.appName;
    this.appTitle = options.appTitle;
    this.documentName = options.documentName || "Tài liệu 1";
    this.onSwitchApp = options.onSwitchApp || null;
    this.zoomLevel = 100;
    this.isAiOpen = false;

    this.rootEl = null;
    this.ribbonHost = null;
    this.editorContainer = null;
  }

  mount(targetElement) {
    this.rootEl = targetElement;
    this.rootEl.innerHTML = "";
    this.rootEl.className = "vno-shell";
    this.rootEl.setAttribute("data-app", this.appName);

    RecentFilesManager.recordFile({ name: this.documentName, app: this.appName });

    this._renderTopBar();
    this._renderRibbon();
    this._renderWorkspace();
    this._renderStatusBar();
    this._setupGlobalShortcuts();
  }

  _renderTopBar() {
    const bar = document.createElement("header");
    bar.className = "vno-topbar";

    bar.innerHTML = `
      <div class="vno-topbar-left">
        <!-- Brand & App Switcher Dropdown -->
        <div style="position:relative;">
          <button class="vno-app-switcher-btn" id="vno-switcher-toggle" title="Chuyển đổi ứng dụng trong bộ VN Office">
            ${ICONS.brandLogo}
            <span>${this.appTitle}</span>
            <span style="display:flex;margin-left:2px;">${ICONS.chevronDown}</span>
          </button>
          
          <div id="vno-switcher-menu" style="display:none; position:absolute; top:36px; left:0; background:#ffffff; border:1px solid var(--vno-border-default); border-radius:var(--vno-radius-md); box-shadow:var(--vno-shadow-lg); width:230px; z-index:200; padding:6px 0;">
            <div style="padding:6px 14px; font-size:11px; font-weight:bold; color:var(--vno-text-muted); text-transform:uppercase;">Bộ ứng dụng VN Office</div>
            <div class="vno-switcher-item" data-switch="writer" style="display:flex; align-items:center; gap:10px; padding:8px 14px; cursor:pointer; font-size:13px; font-weight:500;">
              ${ICONS.appWriter} <span>VN Writer (Soạn thảo)</span>
            </div>
            <div class="vno-switcher-item" data-switch="sheet" style="display:flex; align-items:center; gap:10px; padding:8px 14px; cursor:pointer; font-size:13px; font-weight:500;">
              ${ICONS.appSheet} <span>VN Sheet (Bảng tính)</span>
            </div>
            <div class="vno-switcher-item" data-switch="slides" style="display:flex; align-items:center; gap:10px; padding:8px 14px; cursor:pointer; font-size:13px; font-weight:500;">
              ${ICONS.appSlides} <span>VN Slides (Trình chiếu)</span>
            </div>
          </div>
        </div>

        <!-- Quick Access Toolbar -->
        <div class="vno-quick-tools">
          <button class="vno-quick-btn" data-cmd="common.file.save" title="Lưu tài liệu (Ctrl+S)">${ICONS.fileSave}</button>
          <button class="vno-quick-btn" data-cmd="common.edit.undo" title="Hoàn tác (Ctrl+Z)">${ICONS.undo}</button>
          <button class="vno-quick-btn" data-cmd="common.edit.redo" title="Làm lại (Ctrl+Y)">${ICONS.redo}</button>
          <button class="vno-quick-btn" data-cmd="common.file.print" title="In tài liệu (Ctrl+P)">${ICONS.filePrint}</button>
        </div>

        <!-- Document Tabs Bar (MDI / Multi-Document) -->
        <div class="vno-doc-tabs">
          <div class="vno-doc-tab is-active">
            <span>${this.documentName}</span>
            <span class="vno-tab-close" title="Đóng">&times;</span>
          </div>
        </div>
      </div>

      <!-- Universal Command Search -->
      <div class="vno-topbar-center">
        <div class="vno-search-input-wrap">
          <span style="color:var(--vno-text-muted);display:flex;">${ICONS.search}</span>
          <input type="text" placeholder="Tìm kiếm tính năng, phím tắt hoặc văn bản... (Alt+Q)" id="vno-universal-search" />
        </div>
      </div>

      <!-- Right Actions: AI Assistant & Controls -->
      <div class="vno-topbar-right">
        <button class="vno-ai-trigger-btn" id="vno-toggle-ai-btn" title="Trợ lý VN AI (Alt+J)">
          <span style="color:#d97706;display:flex;">${ICONS.aiSparkle}</span>
          <span>Trợ lý VN AI</span>
        </button>
      </div>
    `;

    // Logic dropdown app switcher
    const switcherToggle = bar.querySelector("#vno-switcher-toggle");
    const switcherMenu = bar.querySelector("#vno-switcher-menu");

    switcherToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      switcherMenu.style.display = switcherMenu.style.display === "none" ? "block" : "none";
    });

    document.addEventListener("click", () => {
      switcherMenu.style.display = "none";
    });

    bar.querySelectorAll(".vno-switcher-item").forEach(item => {
      item.addEventListener("mouseenter", () => item.style.backgroundColor = "var(--vno-bg-hover)");
      item.addEventListener("mouseleave", () => item.style.backgroundColor = "transparent");
      item.addEventListener("click", () => {
        const appType = item.getAttribute("data-switch");
        switcherMenu.style.display = "none";
        if (this.onSwitchApp) this.onSwitchApp(appType);
      });
    });

    // Quick tools execution
    bar.querySelectorAll("[data-cmd]").forEach(btn => {
      btn.addEventListener("click", () => {
        globalCommandBus.execute(btn.getAttribute("data-cmd"));
      });
    });

    bar.querySelector("#vno-toggle-ai-btn").addEventListener("click", () => this.toggleAiSidebar());

    this.rootEl.appendChild(bar);
  }

  _renderRibbon() {
    const ribbonContainer = document.createElement("div");
    this.rootEl.appendChild(ribbonContainer);

    this.ribbonHost = new RibbonHost(ribbonContainer, {
      onFileMenuClick: () => this.showBackstageMenu()
    });
  }

  _renderWorkspace() {
    const ws = document.createElement("main");
    ws.className = "vno-workspace";

    this.editorContainer = document.createElement("div");
    this.editorContainer.className = "vno-editor-container";

    // AI Sidebar Panel
    this.aiSidebar = document.createElement("aside");
    this.aiSidebar.className = "vno-ai-sidebar is-hidden";
    this.aiSidebar.innerHTML = `
      <div class="vno-ai-header">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="color:#d97706;display:flex;">${ICONS.aiSparkle}</span>
          <span>Trợ lý VN AI</span>
        </div>
        <button class="vno-btn" id="vno-ai-close" style="font-size:16px;">&times;</button>
      </div>
      <div class="vno-ai-messages" id="vno-ai-messages">
        <div style="background:var(--vno-bg-subtle);border:1px solid var(--vno-border-default);padding:14px;border-radius:var(--vno-radius-md);font-size:12px;line-height:1.5;">
          <strong>Xin chào!</strong> Tôi là Trợ lý VN AI tích hợp trong VN Office.<br>
          • Bảo mật trên thiết bị (Privacy-first)<br>
          • Trau chuốt văn phong tiếng Việt<br>
          • Tóm tắt & soát lỗi văn bản hành chính
        </div>
      </div>
      <div class="vno-ai-input-box">
        <input type="text" placeholder="Nhập yêu cầu trau chuốt, tóm tắt..." id="vno-ai-input" />
        <button class="vno-btn vno-btn-primary" id="vno-ai-send">Gửi</button>
      </div>
    `;

    this.aiSidebar.querySelector("#vno-ai-close").addEventListener("click", () => this.toggleAiSidebar(false));

    // Xử lý gửi yêu cầu tới Trợ lý VN AI
    const sendBtn = this.aiSidebar.querySelector("#vno-ai-send");
    const inputEl = this.aiSidebar.querySelector("#vno-ai-input");
    const messagesEl = this.aiSidebar.querySelector("#vno-ai-messages");

    const handleAiSend = async () => {
      const query = inputEl.value.trim();
      if (!query) return;
      inputEl.value = "";

      // 1. Thêm tin nhắn người dùng
      const userMsg = document.createElement("div");
      userMsg.style.cssText = "background:var(--vno-bg-hover);border:1px solid var(--vno-border-default);padding:8px 12px;border-radius:var(--vno-radius-md);font-size:12px;margin-top:10px;line-height:1.5;";
      userMsg.innerHTML = `<strong>Bạn:</strong> ${query.replace(/</g, "&lt;").replace(/>/g, "&gt;")}`;
      messagesEl.appendChild(userMsg);
      messagesEl.scrollTop = messagesEl.scrollHeight;

      // 2. Lấy nội dung tài liệu hiện thời phục vụ phân tích cục bộ
      const docText = this.editorContainer.innerText || "";

      // 3. Trạng thái phản hồi
      const botMsg = document.createElement("div");
      botMsg.style.cssText = "background:#f0fdf4;border:1px solid #bbf7d0;padding:10px 12px;border-radius:var(--vno-radius-md);font-size:12px;line-height:1.5;margin-top:8px;";
      botMsg.innerHTML = `<span style="color:#16a34a;">Đang phân tích cục bộ...</span>`;
      messagesEl.appendChild(botMsg);
      messagesEl.scrollTop = messagesEl.scrollHeight;

      const res = await LocalAiService.query(query, { documentText: docText, appName: this.appName });
      botMsg.innerHTML = `
        <div style="font-weight:bold;color:#16a34a;margin-bottom:6px;display:flex;align-items:center;gap:6px;">
          <span>✨</span> <span>Trợ lý VN AI</span>
        </div>
        <div style="white-space:pre-line;color:var(--vno-text-primary);">${res.reply.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")}</div>
      `;

      if (res.suggestion) {
        const applyBtn = document.createElement("button");
        applyBtn.className = "vno-btn vno-btn-primary";
        applyBtn.style.cssText = "font-size:11px;padding:4px 10px;margin-top:8px;display:inline-block;";
        applyBtn.textContent = "Áp dụng vào tài liệu";
        applyBtn.addEventListener("click", () => {
          document.execCommand("insertText", false, res.suggestion);
          applyBtn.textContent = "✓ Đã áp dụng";
          applyBtn.disabled = true;
        });
        botMsg.appendChild(applyBtn);
      }
      messagesEl.scrollTop = messagesEl.scrollHeight;
    };

    sendBtn.addEventListener("click", handleAiSend);
    inputEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleAiSend();
      }
    });

    ws.appendChild(this.editorContainer);
    ws.appendChild(this.aiSidebar);
    this.rootEl.appendChild(ws);
  }

  _renderStatusBar() {
    const sb = document.createElement("footer");
    sb.className = "vno-statusbar";

    sb.innerHTML = `
      <div class="vno-statusbar-left">
        <span id="vno-status-docinfo">Sẵn sàng</span>
        <span>|</span>
        <span>Tiếng Việt (Việt Nam)</span>
        <span>|</span>
        <span>Bảng mã: Unicode dựng sẵn (NFC)</span>
      </div>

      <div class="vno-statusbar-right">
        <div class="vno-zoom-slider">
          <button id="vno-zoom-out" title="Thu nhỏ">-</button>
          <input type="range" id="vno-zoom-range" min="50" max="200" value="100" />
          <button id="vno-zoom-in" title="Phóng to">+</button>
          <span id="vno-zoom-text" style="min-width:38px;text-align:right;">100%</span>
        </div>
      </div>
    `;

    const zoomRange = sb.querySelector("#vno-zoom-range");
    const zoomText = sb.querySelector("#vno-zoom-text");

    const updateZoom = (val) => {
      this.zoomLevel = Math.max(50, Math.min(200, val));
      zoomRange.value = this.zoomLevel;
      zoomText.textContent = `${this.zoomLevel}%`;
      const canvas = this.editorContainer.querySelector(".vno-writer-page, .vno-slide-canvas");
      if (canvas) {
        canvas.style.transform = `scale(${this.zoomLevel / 100})`;
        canvas.style.transformOrigin = "top center";
      }
    };

    zoomRange.addEventListener("input", (e) => updateZoom(Number(e.target.value)));
    sb.querySelector("#vno-zoom-out").addEventListener("click", () => updateZoom(this.zoomLevel - 10));
    sb.querySelector("#vno-zoom-in").addEventListener("click", () => updateZoom(this.zoomLevel + 10));

    this.rootEl.appendChild(sb);
  }

  toggleAiSidebar(forceState) {
    this.isAiOpen = forceState !== undefined ? forceState : !this.isAiOpen;
    if (this.isAiOpen) {
      this.aiSidebar.classList.remove("is-hidden");
    } else {
      this.aiSidebar.classList.add("is-hidden");
    }
  }

  showBackstageMenu() {
    const modal = document.createElement("div");
    modal.className = "vno-backstage-overlay";

    // 1. Render Template Cards dynamically
    const templateCardsHtml = OFFICE_TEMPLATES.map(t => {
      const badgeHtml = t.badge ? `<span style="font-size:10px;background:var(--vno-bg-subtle);color:var(--vno-text-secondary);padding:2px 6px;border-radius:4px;border:1px solid var(--vno-border-default);font-weight:600;">${t.badge}</span>` : "";
      return `
        <div class="vno-template-card" data-template-id="${t.id}" data-template-app="${t.app}">
          <div class="vno-template-thumb" style="border-top:3px solid ${t.borderColor};display:flex;align-items:center;justify-content:center;">
            <span style="font-size:26px;">${t.icon}</span>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-top:6px;">
            <strong style="font-size:13px;color:var(--vno-text-primary);">${t.title}</strong>
            ${badgeHtml}
          </div>
          <span style="font-size:11px;color:var(--vno-text-muted);margin-top:2px;">${t.desc}</span>
        </div>
      `;
    }).join("");

    // 2. Render Real Recent Files or Empty State
    const recentFiles = RecentFilesManager.getRecentFiles();
    let recentSectionHtml = "";

    if (recentFiles.length === 0) {
      recentSectionHtml = `<div id="vno-recent-empty-container"></div>`;
    } else {
      const rowsHtml = recentFiles.map(file => {
        const timeStr = new Date(file.lastModified).toLocaleDateString("vi-VN", {
          day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
        });
        return `
          <div class="vno-recent-row" data-recent-app="${file.app}" data-recent-name="${file.name}" style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid var(--vno-border-default);cursor:pointer;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='transparent'">
            <div>
              <strong style="font-size:13px;color:var(--vno-text-primary);">${file.name}</strong>
              <div style="font-size:11px;color:var(--vno-text-muted);margin-top:2px;">Sửa đổi: ${timeStr}</div>
            </div>
            <span style="font-size:12px;color:var(--vno-text-secondary);">${file.format}</span>
          </div>
        `;
      }).join("");

      recentSectionHtml = `
        <div style="border:1px solid var(--vno-border-default);border-radius:var(--vno-radius-md);overflow:hidden;background:#ffffff;">
          <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid var(--vno-border-default);background:#fafafa;font-size:12px;font-weight:bold;color:var(--vno-text-muted);">
            <span>${t("backstage.recentColName")}</span>
            <div style="display:flex;align-items:center;gap:12px;">
              <span>${t("backstage.recentColFormat")}</span>
              <button class="vno-btn" id="vno-clear-recent" style="font-size:11px;padding:2px 8px;">${t("backstage.clearRecent")}</button>
            </div>
          </div>
          ${rowsHtml}
        </div>
      `;
    }

    modal.innerHTML = `
      <div class="vno-backstage-sidebar">
        <button class="vno-backstage-back-btn" id="vno-backstage-back">
          <span>←</span> <span>Quay lại</span>
        </button>
        <button class="vno-backstage-nav-btn is-active">${t("backstage.home")}</button>
        <button class="vno-backstage-nav-btn" data-backstage-cmd="common.file.new">${t("backstage.new")}</button>
        <button class="vno-backstage-nav-btn" data-backstage-cmd="common.file.open">${t("backstage.open")}</button>
        <button class="vno-backstage-nav-btn" data-backstage-cmd="common.file.save">${t("backstage.save")}</button>
        <button class="vno-backstage-nav-btn" data-backstage-cmd="common.file.saveAs">${t("backstage.saveAs")}</button>
        <button class="vno-backstage-nav-btn" data-backstage-cmd="common.file.print">${t("backstage.print")}</button>
        <button class="vno-backstage-nav-btn" data-backstage-cmd="common.file.exportPdf">${t("backstage.exportPdf")}</button>
        <div style="flex:1;"></div>
        <button class="vno-backstage-nav-btn" id="vno-backstage-about">${t("backstage.about")}</button>
      </div>

      <div class="vno-backstage-content">
        <h1 style="font-size:24px;font-weight:700;margin-bottom:8px;color:var(--vno-text-primary);">${t("backstage.templateTitle")}</h1>
        <p style="color:var(--vno-text-muted);font-size:13px;margin-bottom:24px;">${t("backstage.templateSubtitle")}</p>

        <div class="vno-template-grid">
          ${templateCardsHtml}
        </div>

        <h2 style="font-size:18px;font-weight:700;margin-top:36px;margin-bottom:16px;color:var(--vno-text-primary);">${t("backstage.recentTitle")}</h2>
        ${recentSectionHtml}
      </div>
    `;

    document.body.appendChild(modal);

    const closeModal = () => {
      if (modal.parentNode) modal.parentNode.removeChild(modal);
    };

    // Nếu không có tài liệu gần đây, mount EmptyState component
    const emptyContainer = modal.querySelector("#vno-recent-empty-container");
    if (emptyContainer) {
      const emptyStateEl = createEmptyState({
        icon: "📁",
        title: t("backstage.emptyRecentTitle"),
        description: t("backstage.emptyRecentDesc"),
        actionText: t("backstage.new"),
        onAction: () => {
          closeModal();
          globalCommandBus.execute("common.file.new");
        }
      });
      emptyContainer.appendChild(emptyStateEl);
    }

    // Xử lý nút Xóa lịch sử gần đây
    const clearBtn = modal.querySelector("#vno-clear-recent");
    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        RecentFilesManager.clearAll();
        closeModal();
        this.showBackstageMenu();
      });
    }

    // Xử lý nhấp chọn tài liệu gần đây
    modal.querySelectorAll(".vno-recent-row").forEach(row => {
      row.addEventListener("click", () => {
        const app = row.getAttribute("data-recent-app");
        closeModal();
        if (app !== this.appName && this.onSwitchApp) {
          this.onSwitchApp(app);
        }
      });
    });

    // Xử lý chọn mẫu tài liệu (Template)
    modal.querySelectorAll(".vno-template-card").forEach(card => {
      card.addEventListener("click", () => {
        const tmplId = card.getAttribute("data-template-id");
        const tmplApp = card.getAttribute("data-template-app");
        closeModal();

        if (tmplApp === "current" || tmplApp === this.appName) {
          this.applyTemplate(tmplId);
        } else {
          if (this.onSwitchApp) {
            this.onSwitchApp(tmplApp, { templateId: tmplId });
          } else {
            showAlertDialog({
              title: "Mẫu tài liệu",
              message: `Mẫu này dành cho ứng dụng VN ${tmplApp.toUpperCase()}. Vui lòng chuyển sang ứng dụng đó để sử dụng.`
            });
          }
        }
      });
    });

    modal.querySelector("#vno-backstage-back").addEventListener("click", closeModal);

    modal.querySelector("#vno-backstage-about").addEventListener("click", () => {
      showAlertDialog({
        title: "Về Bộ Ứng Dụng VN Office",
        message: "VN Office — Bộ ứng dụng văn phòng Việt Nam độc lập và chuẩn mực.\n\n• Phiên bản: 2.0 Enterprise Commercial Candidate\n• Kiến trúc: Shared Platform + LibreOffice Core Adapter Layer\n• Tiêu chuẩn: Nghị định 30/2020/NĐ-CP & ISO/IEC 29500 OOXML\n• Bảo mật: Quyền riêng tư tuyệt đối (Privacy-first on-device AI)"
      });
    });

    modal.querySelectorAll("[data-backstage-cmd]").forEach(btn => {
      btn.addEventListener("click", () => {
        const cmd = btn.getAttribute("data-backstage-cmd");
        closeModal();
        globalCommandBus.execute(cmd);
      });
    });
  }

  applyTemplate(templateId) {
    if (templateId === "blank") {
      globalCommandBus.execute("common.file.new");
      return;
    }

    if (this.appName === "writer" && templateId === "admin_doc") {
      this.documentName = "Quyết định ban hành tiêu chuẩn 01.docx";
      const tabEl = this.rootEl.querySelector(".vno-doc-tab span");
      if (tabEl) tabEl.textContent = this.documentName;
      RecentFilesManager.recordFile({ name: this.documentName, app: "writer" });
    } else if (this.appName === "sheet" && templateId === "budget_estimate") {
      this.documentName = "Dự toán kinh phí VN Office 2026.xlsx";
      const tabEl = this.rootEl.querySelector(".vno-doc-tab span");
      if (tabEl) tabEl.textContent = this.documentName;
      RecentFilesManager.recordFile({ name: this.documentName, app: "sheet" });
    } else if (this.appName === "slides" && templateId === "presentation_outline") {
      this.documentName = "Báo cáo đề án phát triển VN Office 2026.pptx";
      const tabEl = this.rootEl.querySelector(".vno-doc-tab span");
      if (tabEl) tabEl.textContent = this.documentName;
      RecentFilesManager.recordFile({ name: this.documentName, app: "slides" });
    }
  }

  _setupGlobalShortcuts() {
    globalShortcutManager.attach(window);

    // Thu gọn / mở rộng Ribbon (Ctrl+F1)
    globalCommandBus.register({
      id: "common.view.ribbonToggle",
      handler: () => {
        if (this.ribbonHost) {
          this.ribbonHost.isCollapsed = !this.ribbonHost.isCollapsed;
          this.ribbonHost.render();
        }
      }
    });

    // Lắng nghe lệnh AI
    globalCommandBus.register({
      id: "ai.assistant.toggle",
      handler: () => {
        this.toggleAiSidebar();
      }
    });
  }

  setEditorCanvas(element) {
    this.editorContainer.innerHTML = "";
    this.editorContainer.appendChild(element);
  }

  setStatus(text) {
    const el = document.getElementById("vno-status-docinfo");
    if (el) el.textContent = text;
  }
}
