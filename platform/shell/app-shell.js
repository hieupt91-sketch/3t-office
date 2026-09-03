/**
 * VN Office Platform — Application Shell
 * Khung điều phối toàn bộ các thành phần của một ứng dụng trong VN Office
 */

import { ICONS } from "../ui-kit/icons.js";
import { globalCommandBus } from "../commands/command-bus.js";
import { RibbonHost } from "../ribbon/ribbon-host.js";

export class AppShell {
  /**
   * @param {Object} options
   * @param {"writer"|"sheet"|"slides"} options.appName
   * @param {string} options.appTitle
   * @param {string} [options.documentName="Tài liệu chưa đặt tên"]
   */
  constructor(options) {
    this.appName = options.appName;
    this.appTitle = options.appTitle;
    this.documentName = options.documentName || "Tài liệu chưa đặt tên";
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

    this._renderTitleBar();
    this._renderRibbon();
    this._renderWorkspace();
    this._renderStatusBar();
    this._setupGlobalShortcuts();
  }

  _renderTitleBar() {
    const bar = document.createElement("header");
    bar.className = "vno-titlebar";

    bar.innerHTML = `
      <div class="vno-titlebar-left">
        <span class="vno-app-badge vno-app-badge-${this.appName}">${this.appTitle}</span>
        <button class="vno-btn vno-ribbon-btn-small" data-cmd="common.file.save" title="Lưu (Ctrl+S)">${ICONS.fileSave}</button>
        <button class="vno-btn vno-ribbon-btn-small" data-cmd="common.edit.undo" title="Hoàn tác (Ctrl+Z)">${ICONS.undo}</button>
        <button class="vno-btn vno-ribbon-btn-small" data-cmd="common.edit.redo" title="Làm lại (Ctrl+Y)">${ICONS.redo}</button>
        <span class="vno-doc-title" contenteditable="true" spellcheck="false">${this.documentName}</span>
      </div>

      <div class="vno-titlebar-center">
        <div class="vno-search-box">
          <span style="display:flex;align-items:center;color:var(--vno-text-muted)">${ICONS.search}</span>
          <input type="text" placeholder="Tìm kiếm tính năng hoặc văn bản... (Ctrl+F)" id="vno-cmd-search" />
        </div>
      </div>

      <div class="vno-titlebar-right">
        <button class="vno-btn vno-ribbon-btn-small" data-cmd="ai.assistant.toggle" title="Trợ lý VN AI (Ctrl+J)">
          <span style="color:var(--vno-brand-vietnam-gold);display:flex;">${ICONS.aiSparkle}</span>
          <span>VN AI</span>
        </button>
      </div>
    `;

    // Gắn handlers cho quick buttons
    bar.querySelectorAll("[data-cmd]").forEach(btn => {
      btn.addEventListener("click", () => {
        const cmd = btn.getAttribute("data-cmd");
        if (cmd === "ai.assistant.toggle") {
          this.toggleAiSidebar();
        } else {
          globalCommandBus.execute(cmd);
        }
      });
    });

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
        <span>Trợ lý VN AI</span>
        <button class="vno-btn vno-dialog-close" id="vno-ai-close">&times;</button>
      </div>
      <div class="vno-ai-messages" id="vno-ai-messages">
        <div style="background:var(--vno-bg-subtle);padding:10px;border-radius:var(--vno-radius-sm);font-size:12px;line-height:1.4;">
          <strong>Xin chào!</strong> Tôi là trợ lý AI tích hợp trong VN Office. Dữ liệu tài liệu của bạn được bảo mật tuyệt đối trên thiết bị theo tiêu chuẩn bảo mật.
        </div>
      </div>
      <div class="vno-ai-input-box">
        <input type="text" placeholder="Yêu cầu viết lại, tóm tắt, soát lỗi..." id="vno-ai-input" />
        <button class="vno-btn vno-btn-primary" id="vno-ai-send">Gửi</button>
      </div>
    `;

    this.aiSidebar.querySelector("#vno-ai-close").addEventListener("click", () => this.toggleAiSidebar(false));

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
        <span>Bộ gõ: Unicode sẵn sàng</span>
      </div>

      <div class="vno-statusbar-right">
        <div class="vno-zoom-slider">
          <button class="vno-btn vno-ribbon-btn-small" id="vno-zoom-out">-</button>
          <input type="range" id="vno-zoom-range" min="50" max="200" value="100" />
          <button class="vno-btn vno-ribbon-btn-small" id="vno-zoom-in">+</button>
          <span id="vno-zoom-text" style="min-width:36px;text-align:right;">100%</span>
        </div>
      </div>
    `;

    const zoomRange = sb.querySelector("#vno-zoom-range");
    const zoomText = sb.querySelector("#vno-zoom-text");

    const updateZoom = (val) => {
      this.zoomLevel = Math.max(50, Math.min(200, val));
      zoomRange.value = this.zoomLevel;
      zoomText.textContent = `${this.zoomLevel}%`;
      const canvas = this.editorContainer.firstElementChild;
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
    modal.className = "vno-dialog-overlay";
    modal.style.zIndex = "2000";

    modal.innerHTML = `
      <div style="background:var(--vno-bg-surface);width:600px;max-width:95vw;border-radius:var(--vno-radius-md);box-shadow:var(--vno-shadow-lg);padding:24px;display:flex;flex-direction:column;gap:16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--vno-border-subtle);padding-bottom:12px;">
          <h2 style="margin:0;font-size:18px;font-weight:600;color:var(--vno-text-primary);">Menu Tệp — ${this.appTitle}</h2>
          <button class="vno-btn" id="vno-backstage-close">&times;</button>
        </div>
        <div style="display:grid;grid-template-columns:repeat(2, 1fr);gap:12px;">
          <button class="vno-btn vno-btn-primary" style="padding:14px;justify-content:flex-start;" data-file-cmd="common.file.new">
            ${ICONS.fileNew} <span style="font-weight:600;">Tạo tài liệu mới (Ctrl+N)</span>
          </button>
          <button class="vno-btn" style="padding:14px;justify-content:flex-start;background:var(--vno-bg-subtle);" data-file-cmd="common.file.open">
            ${ICONS.fileOpen} <span>Mở tệp có sẵn (Ctrl+O)</span>
          </button>
          <button class="vno-btn" style="padding:14px;justify-content:flex-start;background:var(--vno-bg-subtle);" data-file-cmd="common.file.save">
            ${ICONS.fileSave} <span>Lưu tài liệu (Ctrl+S)</span>
          </button>
          <button class="vno-btn" style="padding:14px;justify-content:flex-start;background:var(--vno-bg-subtle);" data-file-cmd="common.file.exportPdf">
            ${ICONS.filePdf} <span>Xuất tệp PDF tiêu chuẩn</span>
          </button>
        </div>
        <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--vno-border-subtle);font-size:12px;color:var(--vno-text-muted);display:flex;justify-content:space-between;">
          <span>VN Office v1.0.0 — Bản dựng kỹ thuật</span>
          <span>Bảo mật & Tôn trọng quyền riêng tư</span>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const closeModal = () => {
      if (modal.parentNode) modal.parentNode.removeChild(modal);
    };

    modal.querySelector("#vno-backstage-close").addEventListener("click", closeModal);
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });

    modal.querySelectorAll("[data-file-cmd]").forEach(b => {
      b.addEventListener("click", () => {
        const cmd = b.getAttribute("data-file-cmd");
        closeModal();
        globalCommandBus.execute(cmd);
      });
    });
  }

  _setupGlobalShortcuts() {
    window.addEventListener("keydown", (e) => {
      if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase();
        let cmd = null;

        if (key === "s") cmd = "common.file.save";
        else if (key === "o") cmd = "common.file.open";
        else if (key === "n") cmd = "common.file.new";
        else if (key === "z") cmd = e.shiftKey ? "common.edit.redo" : "common.edit.undo";
        else if (key === "y") cmd = "common.edit.redo";
        else if (key === "j" && e.altKey) cmd = "ai.assistant.toggle";

        if (cmd) {
          e.preventDefault();
          if (cmd === "ai.assistant.toggle") {
            this.toggleAiSidebar();
          } else {
            globalCommandBus.execute(cmd);
          }
        }
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
