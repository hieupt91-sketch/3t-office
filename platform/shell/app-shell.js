/**
 * 3T Office Platform — Enterprise Application Shell
 */

import { ICONS } from "../ui-kit/icons.js";
import { globalCommandBus } from "../commands/command-bus.js";
import { globalShortcutManager } from "../commands/shortcut-manager.js";
import { globalMacroManager } from "../commands/macro-manager.js";
import { RibbonHost } from "../ribbon/ribbon-host.js";
import { OFFICE_TEMPLATES } from "../templates/template-registry.js";
import { RecentFilesManager, formatShortPath } from "../recent/recent-manager.js";
import { createEmptyState } from "../ui-kit/components.js";
import { withLazyFeatureProgress } from "../startup/lazy-feature.js";
import { isVoiceInputSupported, startVoiceInput, stopVoiceInput, isVoiceInputActive } from "../ai/voice-input.js";
import { createLazyDialogs } from "../ui-kit/lazy-dialogs.js";
import { t, getLocale, setLocale, getSupportedLocales } from "../i18n/i18n.js";
import { getPlatformLaunchContext } from "../bootstrap.js";
import { themeManager } from "../theme/theme-manager.js";
import { headerTheme, loadHeaderImage, HEADER_PRESET_COLORS } from "../theme/header-theme.js";
import { globalUnoBridge } from "../../adapters/libreoffice/common/uno-bridge.js";
import { NotificationBar } from "../ui-kit/notification-bar.js";
import { installQuickAccess } from "./quick-access.js";
import { installGlobalFocusGuard, captureEditorFocus, restoreEditorFocus, isEditorElement } from "./focus-manager.js";

const { showAlertDialog, showConfirmDialog, showPromptDialog, showMacroManagerDialog, showUnsavedChangesDialog } = createLazyDialogs("common");

export class AppShell {
  /**
   * @param {Object} options
   * @param {"writer"|"sheet"|"slides"} options.appName
   * @param {string} options.appTitle
   * @param {string} [options.documentName="Tài liệu chưa đặt tên"]
   * @param {Function} [options.onSwitchApp]
   * @param {Function} [options.onApplyTemplate]
   * @param {{renderHtml?:Function,mount?:Function,apply?:Function}} [options.optionsProvider]
   * @param {boolean} [options.singleAppMode=false]
   */
  constructor(options) {
    this.appName = options.appName;
    this.appTitle = options.appTitle;
    this.documentName = options.documentName || "Tài liệu 1";
    this.singleAppMode = options.singleAppMode ?? getPlatformLaunchContext().singleAppMode;
    this._onSwitchApp = options.onSwitchApp || null;
    this._onApplyTemplate = typeof options.onApplyTemplate === "function" ? options.onApplyTemplate : null;
    this._optionsProvider = options.optionsProvider || null;
    this.zoomLevel = 100;
    this._zoomListeners = new Set();
    this._setZoomControl = null;
    this.isAiOpen = false;
    this._aiRequestController = null;
    this._aiServices = null;
    this._aiServicesPromise = null;
    this._refreshAiProviderUi = null;
    this.adapter = options.adapter || null;
    this.grid = options.grid || null;
    this.canvas = options.canvas || null;

    this.rootEl = null;
    this.ribbonHost = null;
    this.editorContainer = null;
    this.notificationHost = null;
    this.activeNotificationBar = null;
    this.helpPanel = options.helpPanel || null;

    this._onAiOutsidePointer = (event) => {
      if (!this.isAiOpen) return;
      const target = event.target;
      if (!target) return;
      if (this.aiSidebar && this.aiSidebar.contains(target)) return;
      if (target.closest?.("#vno-toggle-ai-btn, [data-command-id='ai.assistant.toggle'], [data-cmd='ai.assistant.toggle'], .vno-ai-trigger-btn")) return;
      if (target.closest?.(".vno-dialog-overlay, .vno-about-backdrop, .vno-about-dialog, .vno-error-reporting-overlay, .vno-modal, [role='dialog'], [role='alertdialog']")) return;
      this.toggleAiSidebar(false);
    };

    this._onAiKeyDown = (event) => {
      if (!this.isAiOpen) return;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        this.toggleAiSidebar(false);
        restoreEditorFocus({ force: true });
      }
    };
  }

  set onSwitchApp(callback) {
    this._onSwitchApp = typeof callback === "function" ? callback : null;
  }

  get onSwitchApp() {
    return (appType, options) => this.requestAppSwitch(appType, options);
  }

  subscribeZoom(listener) {
    if (typeof listener !== "function") return () => {};
    this._zoomListeners.add(listener);
    return () => this._zoomListeners.delete(listener);
  }

  setZoomLevel(value) {
    const level = Number(value);
    if (Number.isFinite(level)) {
      this._setZoomControl?.(level);
      setTimeout(() => {
        restoreEditorFocus();
      }, 0);
    }
  }

  requestAppSwitch(appType, options) {
    if (this.singleAppMode && appType !== this.appName) return false;
    if (!this._onSwitchApp) return false;
    return this._onSwitchApp(appType, options);
  }

  mount(targetElement) {
    installGlobalFocusGuard();
    this.rootEl = targetElement;
    if (this.rootEl) this.rootEl.__vnoShell = this;
    if (typeof window !== "undefined") {
      window.__vnoShell = this;
    }
    this.rootEl.innerHTML = "";
    this.rootEl.className = "vno-shell";
    this.rootEl.setAttribute("data-app", this.appName);

    this._renderTopBar();
    this._renderRibbon();
    this._renderNotificationHost();
    this._renderWorkspace();
    this._renderStatusBar();
    this._setupGlobalShortcuts();
    this._updateDocumentTitle();
    if (typeof window !== "undefined") {
      window.__vnoHandleNativeClose = () => this.requestCloseDocument();
    }
  }

  _renderTopBar() {
    const bar = document.createElement("header");
    bar.className = "vno-topbar";

    const appIdentity = this.singleAppMode ? `
        <div class="vno-app-brand" aria-label="${this.appTitle}" style="display:flex;align-items:center;gap:8px;padding:0 8px;">
          ${ICONS.brandLogo}<span>${this.appTitle}</span>
        </div>` : `
        <div style="position:relative;">
          <button class="vno-app-switcher-btn" id="vno-switcher-toggle"
                  aria-haspopup="true" aria-expanded="false" aria-controls="vno-switcher-menu"
                  aria-label="Chuyển đổi ứng dụng trong bộ 3T Office: ${this.appTitle}"
                  title="Chuyển đổi ứng dụng trong bộ 3T Office">
            ${ICONS.brandLogo}
            <span>${this.appTitle}</span>
            <span style="display:flex;margin-left:2px;" aria-hidden="true">${ICONS.chevronDown}</span>
          </button>
          <div id="vno-switcher-menu" role="menu" aria-label="Bộ ứng dụng 3T Office"
               style="display:none; position:absolute; top:36px; left:0; background:var(--vno-bg-window); color:var(--vno-text-primary); border:1px solid var(--vno-border-default); border-radius:var(--vno-radius-md); box-shadow:var(--vno-shadow-lg); width:230px; z-index:200; padding:6px 0;">
            <div style="padding:6px 14px; font-size:11px; font-weight:bold; color:var(--vno-text-muted); text-transform:uppercase;" role="presentation">Bộ ứng dụng 3T Office</div>
            <div class="vno-switcher-item" data-switch="writer" role="menuitem" tabindex="0" style="display:flex; align-items:center; gap:10px; padding:8px 14px; cursor:pointer; font-size:13px; font-weight:500;">${ICONS.appWriter} <span>Doc (Soạn thảo)</span></div>
            <div class="vno-switcher-item" data-switch="sheet" role="menuitem" tabindex="0" style="display:flex; align-items:center; gap:10px; padding:8px 14px; cursor:pointer; font-size:13px; font-weight:500;">${ICONS.appSheet} <span>Sheet (Bảng tính)</span></div>
            <div class="vno-switcher-item" data-switch="slides" role="menuitem" tabindex="0" style="display:flex; align-items:center; gap:10px; padding:8px 14px; cursor:pointer; font-size:13px; font-weight:500;">${ICONS.appSlides} <span>Slide (Trình chiếu)</span></div>
          </div>
        </div>`;

    bar.innerHTML = `
      <div class="vno-topbar-left">
        <!-- Brand & App Switcher Dropdown -->
        ${appIdentity}

        <!-- Quick Access Toolbar -->
        <div class="vno-quick-tools" role="toolbar" aria-label="Thanh công cụ truy cập nhanh"></div>

        <!-- Document Tabs Bar (MDI / Multi-Document) -->
        <div class="vno-doc-tabs" role="tablist" aria-label="Danh sách tài liệu đang mở">
          <div class="vno-doc-tab is-active" role="tab" aria-selected="true" tabindex="0">
            <span>${this.documentName}</span>
            <button type="button" class="vno-tab-close" aria-label="Đóng tài liệu" title="Đóng" style="background:none;border:none;padding:0;margin-left:4px;cursor:pointer;color:inherit;font-size:14px;line-height:1;">&times;</button>
          </div>
        </div>
      </div>

      <!-- Universal Command Search -->
      <div class="vno-topbar-center">
        <div class="vno-search-input-wrap">
          <span style="color:var(--vno-text-muted);display:flex;" aria-hidden="true">${ICONS.search}</span>
          <input type="text" aria-label="Tìm kiếm tính năng, phím tắt hoặc văn bản" placeholder="Tìm kiếm tính năng, phím tắt hoặc văn bản... (Alt+Q)" id="vno-universal-search" />
        </div>
      </div>

      <!-- Right Actions: Language Switcher, AI Assistant & Controls -->
      <div class="vno-topbar-right">
        <button class="vno-btn vno-license-chip" id="vno-license-chip" type="button" aria-label="Bản quyền: nhập khóa kích hoạt" title="Bản quyền: nhập khóa kích hoạt hoặc xem trạng thái">
          <span class="vno-license-chip-dot" aria-hidden="true"></span><span class="vno-license-chip-label">Nhập khóa</span>
        </button>
        <div class="vno-lang-switch-wrap" style="position:relative;">
          <button class="vno-btn vno-lang-switch-btn" id="vno-toggle-lang-btn"
                  aria-haspopup="true" aria-expanded="false" aria-controls="vno-lang-menu"
                  aria-label="${t("common.switchLanguage")}" title="${t("common.switchLanguage")}">
            ${getLocale() === "vi" ? "🇻🇳 VI" : "🇬🇧 EN"}
          </button>
          <div id="vno-lang-menu" class="vno-lang-menu" role="dialog" aria-label="${t("common.switchLanguage")}" style="display:none;">
            ${getSupportedLocales().map(loc => `
              <label class="vno-lang-menu-item">
                <input type="radio" name="vno-lang-pick" value="${loc}" ${loc === getLocale() ? "checked" : ""}>
                <span>${loc === "vi" ? "🇻🇳 Tiếng Việt" : "🇬🇧 English"}</span>
              </label>
            `).join("")}
            <button class="vno-btn vno-btn-primary" id="vno-lang-apply-btn" style="width:100%;margin-top:8px;" disabled>${t("common.ok")}</button>
          </div>
        </div>
        <button class="vno-btn vno-theme-toggle-btn" id="vno-toggle-theme-btn"
                aria-label="${t("common.toggleTheme")}"
                title="${t("common.toggleTheme")} (Dark Mode)"
                aria-pressed="${themeManager.getTheme() === 'dark'}">
          <span class="vno-theme-icon" aria-hidden="true" style="display:flex;">${themeManager.getTheme() === "dark" ? ICONS.themeSun : ICONS.themeMoon}</span>
          <span class="vno-theme-label">${themeManager.getTheme() === "dark" ? (getLocale() === "vi" ? "Sáng" : "Light") : (getLocale() === "vi" ? "Tối" : "Dark")}</span>
        </button>
        <button class="vno-ai-trigger-btn" id="vno-toggle-ai-btn" aria-label="Trợ lý 3T AI (Alt+J)" title="Trợ lý 3T AI (Alt+J)">
          <span style="color:#d97706;display:flex;" aria-hidden="true">${ICONS.aiSparkle}</span>
          <span>Trợ lý 3T AI</span>
        </button>
      </div>
    `;

    // Logic dropdown app switcher
    const switcherToggle = bar.querySelector("#vno-switcher-toggle");
    const switcherMenu = bar.querySelector("#vno-switcher-menu");
    const switcherItems = Array.from(bar.querySelectorAll(".vno-switcher-item"));

    const openSwitcher = () => {
      if (!switcherMenu || !switcherToggle) return;
      switcherMenu.style.display = "block";
      switcherToggle.setAttribute("aria-expanded", "true");
      if (switcherItems[0]) switcherItems[0].focus();
    };

    const closeSwitcher = () => {
      if (!switcherMenu || !switcherToggle) return;
      switcherMenu.style.display = "none";
      switcherToggle.setAttribute("aria-expanded", "false");
    };

    switcherToggle?.addEventListener("click", (e) => {
      e.stopPropagation();
      if (switcherMenu.style.display === "none" || !switcherMenu.style.display) {
        openSwitcher();
      } else {
        closeSwitcher();
      }
    });

    document.addEventListener("click", () => {
      closeSwitcher();
    });

    switcherItems.forEach((item, idx) => {
      item.addEventListener("mouseenter", () => item.style.backgroundColor = "var(--vno-bg-hover)");
      item.addEventListener("mouseleave", () => item.style.backgroundColor = "transparent");
      item.addEventListener("click", () => {
        const appType = item.getAttribute("data-switch");
        closeSwitcher();
        this.requestAppSwitch(appType);
      });
      item.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          item.click();
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          const next = switcherItems[(idx + 1) % switcherItems.length];
          if (next) next.focus();
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          const prev = switcherItems[(idx - 1 + switcherItems.length) % switcherItems.length];
          if (prev) prev.focus();
        } else if (e.key === "Escape") {
          e.preventDefault();
          closeSwitcher();
          switcherToggle?.focus();
        }
      });
    });

    // Thanh truy nhanh tùy biến (nút lệnh, menu chuột phải trên ribbon, mũi tên tùy biến)
    this.quickAccess?.destroy?.();
    this.quickAccess = installQuickAccess({
      appName: this.appName,
      host: bar.querySelector(".vno-quick-tools"),
      rootEl: this.rootEl || document
    });

    bar.querySelector(".vno-tab-close")?.addEventListener("click", () => {
      globalCommandBus.execute("common.file.close");
    });

    bar.querySelector("#vno-toggle-ai-btn").addEventListener("click", () => this.toggleAiSidebar());

    // Nút Bản quyền luôn thấy trên thanh tiêu đề: bấm để nhập khóa; nhãn đổi theo trạng thái thật (dùng thử / đã kích hoạt).
    const licenseChip = bar.querySelector("#vno-license-chip");
    licenseChip?.addEventListener("click", () => this._showLicenseDialog());
    this._refreshLicenseChip(licenseChip);

    // Dropdown chọn ngôn ngữ + nút Áp dụng riêng biệt
    const langToggleBtn = bar.querySelector("#vno-toggle-lang-btn");
    const langMenu = bar.querySelector("#vno-lang-menu");
    const langApplyBtn = bar.querySelector("#vno-lang-apply-btn");

    langToggleBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const willOpen = langMenu.style.display === "none" || !langMenu.style.display;
      langMenu.style.display = willOpen ? "block" : "none";
      langToggleBtn.setAttribute("aria-expanded", String(willOpen));
    });
    langMenu.addEventListener("click", (e) => e.stopPropagation());
    document.addEventListener("click", () => {
      langMenu.style.display = "none";
      langToggleBtn.setAttribute("aria-expanded", "false");
    });
    langMenu.querySelectorAll('input[name="vno-lang-pick"]').forEach((radio) => {
      radio.addEventListener("change", () => {
        langApplyBtn.disabled = radio.value === getLocale();
      });
    });
    langApplyBtn.addEventListener("click", () => {
      const picked = langMenu.querySelector('input[name="vno-lang-pick"]:checked')?.value;
      if (!picked || picked === getLocale()) return;
      setLocale(picked);
      if (typeof location !== "undefined" && location.reload) location.reload();
    });

    // Dark / Light Mode Toggle Button
    const themeToggleBtn = bar.querySelector("#vno-toggle-theme-btn");
    const updateThemeBtnUI = (theme) => {
      if (!themeToggleBtn) return;
      const isDark = theme === "dark";
      themeToggleBtn.setAttribute("aria-pressed", String(isDark));
      const iconEl = themeToggleBtn.querySelector(".vno-theme-icon");
      const labelEl = themeToggleBtn.querySelector(".vno-theme-label");
      if (iconEl) iconEl.innerHTML = isDark ? ICONS.themeSun : ICONS.themeMoon;
      if (labelEl) labelEl.textContent = isDark ? (getLocale() === "vi" ? "Sáng" : "Light") : (getLocale() === "vi" ? "Tối" : "Dark");
    };

    themeToggleBtn?.addEventListener("click", () => {
      const next = themeManager.toggleTheme();
      updateThemeBtnUI(next);
    });

    themeManager.onThemeChange((theme) => {
      updateThemeBtnUI(theme);
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

  _renderNotificationHost() {
    this.notificationHost = document.createElement("div");
    this.notificationHost.className = "vno-notification-host";
    this.notificationHost.id = "vno-notification-host";
    this.rootEl.appendChild(this.notificationHost);
  }

  /**
   * Hiển thị thanh thông báo dưới ribbon (InfoBar / Security Warning Bar)
   * @param {Object} options
   * @param {string} options.message
   * @param {"warning"|"info"|"success"|"error"} [options.type="warning"]
   * @param {string} [options.icon]
   * @param {{ label: string, onClick: Function, ariaLabel?: string }} [options.action]
   * @param {boolean} [options.dismissible=true]
   * @param {Function} [options.onDismiss]
   * @returns {NotificationBar|null}
   */
  showNotification(options) {
    this.clearNotification();
    if (!this.notificationHost) return null;
    this.activeNotificationBar = new NotificationBar({
      ...options,
      onDismiss: () => {
        if (typeof options?.onDismiss === "function") options.onDismiss();
        this.activeNotificationBar = null;
      }
    });
    this.activeNotificationBar.mount(this.notificationHost);
    return this.activeNotificationBar;
  }

  /**
   * Ẩn và đóng thanh thông báo hiện tại (nếu có)
   */
  clearNotification() {
    if (this.activeNotificationBar) {
      this.activeNotificationBar.dismiss();
      this.activeNotificationBar = null;
    }
  }

  _renderWorkspace() {
    const ws = document.createElement("main");
    ws.className = "vno-workspace";

    this.editorContainer = document.createElement("div");
    this.editorContainer.className = "vno-editor-container";

    // AI Sidebar Panel
    this.aiSidebar = document.createElement("aside");
    this.aiSidebar.className = "vno-ai-sidebar is-hidden";
    this.aiSidebar.setAttribute("role", "complementary");
    this.aiSidebar.setAttribute("aria-label", "Trợ lý 3T AI");
    this.aiSidebar.innerHTML = `
      <div class="vno-ai-header">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="color:#d97706;display:flex;" aria-hidden="true">${ICONS.aiSparkle}</span>
          <span>Trợ lý 3T AI</span>
        </div>
        <button type="button" class="vno-btn" id="vno-ai-close" aria-label="Đóng bảng Trợ lý 3T AI" title="Đóng" style="font-size:16px;">&times;</button>
      </div>
      <div style="padding:10px 12px;border-bottom:1px solid var(--vno-border-default);font-size:12px;display:grid;gap:8px;">
        <label for="vno-ai-provider" style="font-weight:600;">${t("aiAssistant.provider")}</label>
        <select id="vno-ai-provider" class="vno-input" style="width:100%;padding:7px;">
          <option value="local">${t("aiAssistant.local")}</option>
          <option value="openai">OpenAI (ChatGPT)</option>
          <option value="gemini">Google Gemini</option>
          <option value="claude">Anthropic Claude</option>
        </select>
        <div id="vno-ai-provider-status" role="status" aria-live="polite"></div>
        <div id="vno-ai-key-panel" style="display:none;background:var(--vno-bg-subtle);padding:10px;border-radius:var(--vno-radius-md);">
          <div id="vno-ai-disclosure" style="line-height:1.45;margin-bottom:8px;"></div>
          <div id="vno-ai-key-form" style="display:grid;gap:7px;">
            <label for="vno-ai-api-key" style="font-weight:600;">${t("aiAssistant.apiKey")}</label>
            <div style="display:flex;gap:6px;">
              <input id="vno-ai-api-key" type="password" autocomplete="off" spellcheck="false" style="min-width:0;flex:1;padding:7px;" />
              <button type="button" class="vno-btn" id="vno-ai-key-toggle">${t("aiAssistant.showKey")}</button>
            </div>
            <button type="button" class="vno-btn vno-btn-primary" id="vno-ai-key-save">${t("aiAssistant.saveConsent")}</button>
          </div>
          <button type="button" class="vno-btn" id="vno-ai-key-remove" style="display:none;color:#b91c1c;">${t("aiAssistant.removeKey")}</button>
          <div id="vno-ai-key-feedback" role="status" aria-live="polite" style="margin-top:6px;"></div>
        </div>
      </div>
      <div class="vno-ai-messages" id="vno-ai-messages" role="log" aria-live="polite">
        <div style="background:var(--vno-bg-subtle);border:1px solid var(--vno-border-default);padding:14px;border-radius:var(--vno-radius-md);font-size:12px;line-height:1.5;">
          <strong>Xin chào!</strong> Tôi là Trợ lý 3T AI tích hợp trong 3T Office.<br>
          • Bảo mật trên thiết bị (Privacy-first)<br>
          • Trau chuốt văn phong tiếng Việt<br>
          • Tóm tắt & soát lỗi văn bản hành chính
        </div>
      </div>
      <div class="vno-ai-input-box">
        <input type="text" aria-label="Nội dung yêu cầu Trợ lý AI" placeholder="Nhập yêu cầu trau chuốt, tóm tắt..." id="vno-ai-input" />
        <button type="button" class="vno-btn vno-btn-primary" id="vno-ai-send" aria-label="${t("aiAssistant.send")}">${t("aiAssistant.send")}</button>
        <button type="button" class="vno-btn" id="vno-ai-stop" style="display:none;" aria-label="${t("aiAssistant.stop")}">${t("aiAssistant.stop")}</button>
      </div>
    `;

    this.aiSidebar.querySelector("#vno-ai-close").addEventListener("click", () => {
      this.toggleAiSidebar(false);
      restoreEditorFocus({ force: true });
    });

    // Xử lý gửi yêu cầu tới Trợ lý 3T AI
    const sendBtn = this.aiSidebar.querySelector("#vno-ai-send");
    const inputEl = this.aiSidebar.querySelector("#vno-ai-input");
    const messagesEl = this.aiSidebar.querySelector("#vno-ai-messages");
    const stopBtn = this.aiSidebar.querySelector("#vno-ai-stop");
    const providerSelect = this.aiSidebar.querySelector("#vno-ai-provider");
    const providerStatus = this.aiSidebar.querySelector("#vno-ai-provider-status");
    const keyPanel = this.aiSidebar.querySelector("#vno-ai-key-panel");
    const keyForm = this.aiSidebar.querySelector("#vno-ai-key-form");
    const keyInput = this.aiSidebar.querySelector("#vno-ai-api-key");
    const keyToggle = this.aiSidebar.querySelector("#vno-ai-key-toggle");
    const keyRemove = this.aiSidebar.querySelector("#vno-ai-key-remove");
    const keyFeedback = this.aiSidebar.querySelector("#vno-ai-key-feedback");
    const disclosureKeys = { openai: "aiAssistant.disclosureOpenai", gemini: "aiAssistant.disclosureGemini", claude: "aiAssistant.disclosureClaude" };
    const providerLabels = { openai: "OpenAI (ChatGPT)", gemini: "Google Gemini", claude: "Anthropic Claude", ollama: "Ollama", "rule-based": "Quy tắc cục bộ" };

    const refreshProviderUi = async () => {
      const { LocalAiService, ApiKeyManager } = await this._loadAiServices();
      const selected = providerSelect.value;
      const isCloud = Boolean(disclosureKeys[selected]);
      keyPanel.style.display = isCloud ? "block" : "none";
      if (isCloud) {
        const configured = ApiKeyManager.hasApiKey(selected);
        this.aiSidebar.querySelector("#vno-ai-disclosure").textContent = t(disclosureKeys[selected]);
        keyForm.style.display = configured ? "none" : "grid";
        keyRemove.style.display = configured ? "inline-block" : "none";
        keyInput.value = "";
        keyInput.type = "password";
        keyToggle.textContent = t("aiAssistant.showKey");
      }
      const active = await LocalAiService.getActiveProviderInfo();
      providerStatus.textContent = `${t("aiAssistant.activeProvider")}: ${active.label}`;
    };

    this._refreshAiProviderUi = refreshProviderUi;
    providerSelect.addEventListener("change", async () => {
      const { LocalAiService } = await this._loadAiServices();
      LocalAiService.setSelectedProviderId(providerSelect.value);
      keyFeedback.textContent = "";
      await refreshProviderUi();
    });
    keyToggle.addEventListener("click", () => {
      const showing = keyInput.type === "text";
      keyInput.type = showing ? "password" : "text";
      keyToggle.textContent = t(showing ? "aiAssistant.showKey" : "aiAssistant.hideKey");
    });
    this.aiSidebar.querySelector("#vno-ai-key-save").addEventListener("click", async () => {
      try {
        const { ApiKeyManager } = await this._loadAiServices();
        ApiKeyManager.setApiKey(providerSelect.value, keyInput.value);
        keyFeedback.textContent = t("aiAssistant.keySaved");
        await refreshProviderUi();
      } catch (error) { keyFeedback.textContent = error.message; }
    });
    keyRemove.addEventListener("click", async () => {
      const { ApiKeyManager } = await this._loadAiServices();
      ApiKeyManager.removeApiKey(providerSelect.value);
      keyFeedback.textContent = t("aiAssistant.keyRemoved");
      await refreshProviderUi();
    });

    const handleAiSend = async () => {
      const query = inputEl.value.trim();
      if (!query || this._aiRequestController) return;
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
      botMsg.innerHTML = `<span style="color:#16a34a;">${t("aiAssistant.analyzing")}</span>`;
      messagesEl.appendChild(botMsg);
      messagesEl.scrollTop = messagesEl.scrollHeight;

      this._aiRequestController = new AbortController();
      sendBtn.disabled = true;
      stopBtn.style.display = "inline-block";
      try {
        const { LocalAiService } = await this._loadAiServices();
        const documentWordCount = this.getDocumentWordCount?.();
        const res = await LocalAiService.query(query, {
          documentText: docText,
          documentWordCount: Number.isFinite(documentWordCount) ? documentWordCount : undefined,
          appName: this.appName,
          signal: this._aiRequestController.signal
        });
        botMsg.innerHTML = `<div style="font-weight:bold;color:#16a34a;margin-bottom:6px;">✨ ${t("aiAssistant.title")}</div>`;
        const replyEl = document.createElement("div");
        replyEl.style.cssText = "white-space:pre-line;color:var(--vno-text-primary);";
        replyEl.textContent = res.reply;
        botMsg.appendChild(replyEl);

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
        providerStatus.textContent = `${t("aiAssistant.activeProvider")}: ${providerLabels[res.providerId] || res.providerId}`;
      } catch (error) {
        botMsg.textContent = this._aiRequestController.signal.aborted ? t("aiAssistant.stopped") : `⚠️ ${error.message}`;
      } finally {
        this._aiRequestController = null;
        sendBtn.disabled = false;
        stopBtn.style.display = "none";
      }
      messagesEl.scrollTop = messagesEl.scrollHeight;
    };

    stopBtn.addEventListener("click", () => this._aiRequestController?.abort());

    this._handleAiSend = handleAiSend;
    this._aiInputEl = inputEl;

    sendBtn.addEventListener("click", handleAiSend);
    inputEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleAiSend();
      }
    });

    this.rootEl.addEventListener("wheel", (e) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 10 : -10;
        this.setZoom(this.zoomLevel + delta);
      }
    }, { passive: false });

    ws.appendChild(this.editorContainer);
    ws.appendChild(this.aiSidebar);
    this.rootEl.appendChild(ws);
  }

  _renderStatusBar() {
    const sb = document.createElement("footer");
    sb.className = "vno-statusbar";

    sb.innerHTML = `
      <div class="vno-statusbar-left">
        <span id="vno-macro-status-indicator" class="vno-macro-status-indicator" style="display:none;" role="status" aria-live="polite">
          <span class="vno-macro-recording-dot" aria-hidden="true"></span>
          <span class="vno-macro-recording-text">${t("macro.statusRecording", "Đang ghi Macro...")}</span>
        </span>
        <span id="vno-status-docinfo" aria-live="polite">Sẵn sàng</span>
        <span aria-hidden="true">|</span>
        <span>Tiếng Việt (Việt Nam)</span>
        <span aria-hidden="true">|</span>
        <span>Bảng mã: Unicode dựng sẵn (NFC)</span>
      </div>

      <div class="vno-statusbar-right">
        ${this._renderViewModesHtml()}
        <div class="vno-zoom-slider" role="group" aria-label="Điều chỉnh thu phóng">
          <button type="button" id="vno-zoom-out" aria-label="Thu nhỏ" title="Thu nhỏ">-</button>
          <input type="range" id="vno-zoom-range" min="50" max="200" value="${this.zoomLevel}"
                 aria-label="Tỷ lệ thu phóng" aria-valuemin="50" aria-valuemax="200" aria-valuenow="${this.zoomLevel}" />
          <button type="button" id="vno-zoom-in" aria-label="Phóng to" title="Phóng to">+</button>
          <button type="button" id="vno-zoom-text" class="vno-zoom-percent-btn" aria-label="Tỷ lệ thu phóng ${this.zoomLevel}% (Bấm để đặt lại 100%)" title="Tỷ lệ thu phóng (Bấm để đặt lại 100%)" aria-live="polite">${this.zoomLevel}%</button>
        </div>
      </div>
    `;

    const zoomRange = sb.querySelector("#vno-zoom-range");
    this._setZoomControl = (val) => this.setZoom(val);
    zoomRange.addEventListener("input", (e) => this.setZoom(Number(e.target.value)));
    sb.querySelector("#vno-zoom-out").addEventListener("click", () => this.setZoom(this.zoomLevel - 10));
    sb.querySelector("#vno-zoom-in").addEventListener("click", () => this.setZoom(this.zoomLevel + 10));
    sb.querySelector("#vno-zoom-text")?.addEventListener("click", () => this.setZoom(100));

    sb.querySelectorAll(".vno-statusbar-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const cmd = btn.getAttribute("data-cmd");
        if (cmd) globalCommandBus.execute(cmd);
        sb.querySelectorAll(".vno-statusbar-btn").forEach(b => b.classList.remove("is-active"));
        btn.classList.add("is-active");
      });
    });

    this.rootEl.appendChild(sb);
  }

  _renderViewModesHtml() {
    if (this.appName === "writer") {
      return `
        <div class="vno-statusbar-view-modes" role="toolbar" aria-label="Chế độ xem">
          <button type="button" class="vno-statusbar-btn is-active" data-view-mode="printLayout" data-cmd="writer.view.printLayout" title="Bố cục in" aria-label="Bố cục in">${ICONS.writerPrintLayout}</button>
          <button type="button" class="vno-statusbar-btn" data-view-mode="readMode" data-cmd="writer.view.readMode" title="Chế độ đọc" aria-label="Chế độ đọc">${ICONS.writerReadMode}</button>
          <button type="button" class="vno-statusbar-btn" data-view-mode="webLayout" data-cmd="writer.view.webLayout" title="Bố cục web" aria-label="Bố cục web">${ICONS.writerWebLayout}</button>
        </div>`;
    }
    if (this.appName === "sheet") {
      return `
        <div class="vno-statusbar-view-modes" role="toolbar" aria-label="Chế độ xem">
          <button type="button" class="vno-statusbar-btn is-active" data-view-mode="normal" data-cmd="sheet.view.normal" title="Bình thường" aria-label="Bình thường">${ICONS.sheetNormalView}</button>
          <button type="button" class="vno-statusbar-btn" data-view-mode="pageLayout" data-cmd="sheet.view.pageLayout" title="Bố cục trang" aria-label="Bố cục trang">${ICONS.sheetPageLayout}</button>
          <button type="button" class="vno-statusbar-btn" data-view-mode="pageBreakPreview" data-cmd="sheet.view.pageBreakPreview" title="Xem trước ngắt trang" aria-label="Xem trước ngắt trang">${ICONS.sheetPageBreakPreview}</button>
        </div>`;
    }
    if (this.appName === "slides") {
      return `
        <div class="vno-statusbar-view-modes" role="toolbar" aria-label="Chế độ xem">
          <button type="button" class="vno-statusbar-btn is-active" data-view-mode="normal" data-cmd="slides.view.normal" title="Thông thường" aria-label="Thông thường">${ICONS.slidesNormalView}</button>
          <button type="button" class="vno-statusbar-btn" data-view-mode="slideSorter" data-cmd="slides.view.slideSorter" title="Bộ sắp xếp trang chiếu" aria-label="Bộ sắp xếp trang chiếu">${ICONS.slideSorter}</button>
          <button type="button" class="vno-statusbar-btn" data-view-mode="reading" data-cmd="slides.view.reading" title="Chế độ xem đọc" aria-label="Chế độ xem đọc">${ICONS.slidesReadingView}</button>
          <button type="button" class="vno-statusbar-btn" data-view-mode="slideshow" data-cmd="slides.slideshow.fromBeginning" title="Trình chiếu" aria-label="Trình chiếu">${ICONS.slidePlay}</button>
        </div>`;
    }
    return "";
  }

  setZoom(val) {
    this.zoomLevel = Math.max(50, Math.min(200, Math.round(Number(val) || 100)));
    const zoomRange = this.rootEl?.querySelector("#vno-zoom-range");
    const zoomText = this.rootEl?.querySelector("#vno-zoom-text");
    if (zoomRange) {
      zoomRange.value = this.zoomLevel;
      zoomRange.setAttribute("aria-valuenow", String(this.zoomLevel));
    }
    if (zoomText) {
      zoomText.textContent = `${this.zoomLevel}%`;
      zoomText.setAttribute("aria-label", `Tỷ lệ thu phóng ${this.zoomLevel}% (Bấm để đặt lại 100%)`);
    }
    if (typeof this.onZoomChange === "function") {
      try {
        this.onZoomChange(this.zoomLevel);
      } catch (err) {
        console.error("[AppShell] onZoomChange error:", err);
      }
    }
    const canvas = this.editorContainer?.querySelector(".vno-writer-page, .vno-slide-canvas");
    if (canvas) {
      canvas.style.transform = `scale(${this.zoomLevel / 100})`;
      canvas.style.transformOrigin = "top center";
    }
    for (const listener of [...this._zoomListeners]) listener(this.zoomLevel);
    return this.zoomLevel;
  }

  setZoomDisplay(val) {
    this.zoomLevel = Math.max(50, Math.min(200, Math.round(Number(val) || 100)));
    const zoomRange = this.rootEl?.querySelector("#vno-zoom-range");
    const zoomText = this.rootEl?.querySelector("#vno-zoom-text");
    if (zoomRange) {
      zoomRange.value = this.zoomLevel;
      zoomRange.setAttribute("aria-valuenow", String(this.zoomLevel));
    }
    if (zoomText) {
      zoomText.textContent = `${this.zoomLevel}%`;
      zoomText.setAttribute("aria-label", `Tỷ lệ thu phóng ${this.zoomLevel}% (Bấm để đặt lại 100%)`);
    }
    for (const listener of [...this._zoomListeners]) listener(this.zoomLevel);
  }

  /**
   * Kích hoạt Trợ lý AI với một yêu cầu định sẵn (dùng cho nút "Tóm tắt nhanh",
   * "Viết lại trau chuốt", "Soát lỗi chính tả" trên ribbon) — mở sidebar thật và
   * gửi yêu cầu thật qua LocalAiService, không chỉ hiện nút suông.
   * @param {string} presetQuery
   */
  triggerAiQuickAction(presetQuery) {
    this.toggleAiSidebar(true);
    if (this._aiInputEl) this._aiInputEl.value = presetQuery;
    if (this._handleAiSend) this._handleAiSend();
  }

  toggleAiSidebar(forceState) {
    const nextState = forceState !== undefined ? forceState : !this.isAiOpen;
    const wasOpen = this.isAiOpen;
    this.isAiOpen = nextState;

    if (this.isAiOpen) {
      this.closeHelpPanel();
      if (this.aiSidebar) this.aiSidebar.classList.remove("is-hidden");
      if (typeof document !== "undefined") {
        document.removeEventListener("pointerdown", this._onAiOutsidePointer);
        document.addEventListener("pointerdown", this._onAiOutsidePointer);
        document.removeEventListener("keydown", this._onAiKeyDown);
        document.addEventListener("keydown", this._onAiKeyDown);
      }
      void this._loadAiServices()
        .then(({ LocalAiService }) => {
          if (!this.isAiOpen) return;
          const providerSelect = this.aiSidebar?.querySelector?.("#vno-ai-provider");
          if (providerSelect) providerSelect.value = LocalAiService.getSelectedProviderId();
          return this._refreshAiProviderUi?.();
        })
        .catch((error) => {
          const status = this.aiSidebar?.querySelector?.("#vno-ai-provider-status");
          if (status) status.textContent = `Không tải được Trợ lý 3T AI: ${error.message}`;
        });
    } else {
      if (this.aiSidebar) this.aiSidebar.classList.add("is-hidden");
      if (typeof document !== "undefined") {
        document.removeEventListener("pointerdown", this._onAiOutsidePointer);
        document.removeEventListener("keydown", this._onAiKeyDown);
      }
      if (wasOpen && forceState === undefined) {
        restoreEditorFocus({ force: true });
      }
    }
  }

  closeHelpPanel() {
    const appHelp = (typeof window !== "undefined" ? window.__vnoAppInstance?.helpPanel : null) || this.helpPanel;
    if (appHelp && typeof appHelp.isOpen === "function" && appHelp.isOpen()) {
      appHelp.close();
    }
    const domHelp = typeof document !== "undefined" && typeof document.getElementById === "function" ? document.getElementById("vno-help-panel") : null;
    if (domHelp && !domHelp.hidden) {
      domHelp.hidden = true;
    }
  }

  _loadAiServices() {
    if (this._aiServices) return Promise.resolve(this._aiServices);
    if (!this._aiServicesPromise) {
      this._aiServicesPromise = withLazyFeatureProgress(this.appName, "Trợ lý AI", () => import("../ai/ai-service.js"))
        .then((services) => {
          this._aiServices = services;
          return services;
        })
        .catch((error) => {
          this._aiServicesPromise = null;
          throw error;
        });
    }
    return this._aiServicesPromise;
  }

  async _showAboutDialog() {
    const { showAboutDialog } = await withLazyFeatureProgress(
      this.appName,
      "Giới thiệu 3T Office",
      () => import("../about/about-dialog.js")
    );
    return showAboutDialog();
  }

  async _refreshLicenseChip(chip) {
    if (!chip) return;
    try {
      const api = globalUnoBridge.desktopApi || (typeof window !== "undefined" ? window.pywebview?.api : null);
      if (typeof api?.license_status !== "function") return;
      const status = await api.license_status();
      const label = chip.querySelector(".vno-license-chip-label");
      if (status?.ok && status.licensed) {
        chip.classList.add("is-active");
        chip.classList.remove("is-trial");
        if (label) label.textContent = "Đã kích hoạt";
      } else {
        chip.classList.add("is-trial");
        chip.classList.remove("is-active");
        if (label) label.textContent = status?.state === "trial" ? "Dùng thử · Nhập khóa" : "Nhập khóa";
      }
    } catch (_) { /* không chặn giao diện nếu đọc trạng thái lỗi */ }
  }

  async _showLicenseDialog() {
    const { showLicenseDialog } = await withLazyFeatureProgress(
      this.appName,
      "Tài khoản và bản quyền",
      () => import("../license/license-dialog.js")
    );
    return showLicenseDialog();
  }

  showBackstageMenu(initialTab = "home") {
    captureEditorFocus();
    const previousFocused = document.activeElement;
    const modal = document.createElement("div");
    modal.className = "vno-backstage-overlay";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-label", t("backstage.home"));

    // 1. Render Template Cards dynamically
    const visibleTemplates = this.singleAppMode
      ? OFFICE_TEMPLATES.filter(template => template.app === "current" || template.app === this.appName)
      : OFFICE_TEMPLATES;
    const templateCardsHtml = visibleTemplates.map(t => {
      const badgeHtml = t.badge ? `<span style="font-size:10px;background:var(--vno-bg-subtle);color:var(--vno-text-secondary);padding:2px 6px;border-radius:4px;border:1px solid var(--vno-border-default);font-weight:600;">${t.badge}</span>` : "";
      return `
        <div class="vno-template-card" role="button" tabindex="0" aria-label="${t.title}: ${t.desc}" data-template-id="${t.id}" data-template-app="${t.app}">
          <div class="vno-template-thumb" style="border-top:3px solid ${t.borderColor};display:flex;align-items:center;justify-content:center;">
            <span style="font-size:26px;" aria-hidden="true">${t.icon}</span>
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
    const recentFiles = RecentFilesManager.getRecentFiles().filter(
      file => !this.singleAppMode || file.app === this.appName
    );
    let recentSectionHtml = "";

    const renderEmptyRecent = (container) => {
      container.innerHTML = "";
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
      container.appendChild(emptyStateEl);
    };

    if (recentFiles.length === 0) {
      recentSectionHtml = `<div id="vno-recent-empty-container"></div>`;
    } else {
      const rowsHtml = recentFiles.map(file => {
        const timeStr = new Date(file.lastModified).toLocaleDateString("vi-VN", {
          day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
        });
        const shortPath = formatShortPath(file.path);
        return `
          <div class="vno-recent-row" role="button" tabindex="0" aria-label="${file.name}, sửa đổi: ${timeStr}, định dạng: ${file.format}"
               data-recent-app="${file.app}" data-recent-name="${file.name}" data-recent-path="${encodeURIComponent(file.path)}">
            <div style="min-width:0;flex:1;">
              <strong class="vno-recent-name" style="font-size:13px;color:var(--vno-text-primary);display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${file.name}</strong>
              <div class="vno-recent-path" title="${file.path}" style="font-size:11px;color:var(--vno-text-muted);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                <span class="vno-recent-short-path">${shortPath}</span>
                <span aria-hidden="true"> • </span>
                <span class="vno-recent-mod-time">Sửa đổi: ${timeStr}</span>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:12px;flex-shrink:0;">
              <span class="vno-recent-format" style="font-size:12px;color:var(--vno-text-secondary);">${file.format}</span>
              <button type="button" class="vno-recent-remove-btn"
                      data-remove-name="${file.name}" data-remove-app="${file.app}"
                      title="${t("backstage.removeRecentTooltip", "Gỡ tệp này khỏi danh sách gần đây")}"
                      aria-label="${t("backstage.removeRecentTooltip", "Gỡ tệp này khỏi danh sách gần đây")}">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
          </div>
        `;
      }).join("");

      recentSectionHtml = `
        <div class="vno-recent-table" style="border:1px solid var(--vno-border-default);border-radius:var(--vno-radius-md);overflow:hidden;background:var(--vno-bg-window);">
          <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid var(--vno-border-default);background:var(--vno-bg-subtle);font-size:12px;font-weight:bold;color:var(--vno-text-muted);">
            <span>${t("backstage.recentColName")}</span>
            <div style="display:flex;align-items:center;gap:12px;">
              <span>${t("backstage.recentColFormat")}</span>
              <button type="button" class="vno-btn" id="vno-clear-recent" aria-label="${t("backstage.clearRecent")}" style="font-size:11px;padding:2px 8px;">${t("backstage.clearRecent")}</button>
            </div>
          </div>
          ${rowsHtml}
        </div>
      `;
    }

    modal.innerHTML = `
      <div class="vno-backstage-sidebar" role="navigation" aria-label="Điều hướng menu tệp">
        <button type="button" class="vno-backstage-back-btn" id="vno-backstage-back" aria-label="Quay lại tài liệu">
          <span class="vno-backstage-back-icon" aria-hidden="true" style="display:inline-flex;align-items:center;justify-content:center;">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 8 8 12 12 16"/><line x1="16" y1="12" x2="8" y2="12"/></svg>
          </span>
          <span>Quay lại</span>
        </button>
        <button type="button" class="vno-backstage-nav-btn is-active" data-backstage-tab="home" id="vno-backstage-nav-home">${t("backstage.home")}</button>
        <button type="button" class="vno-backstage-nav-btn" data-backstage-cmd="common.file.new" id="vno-backstage-nav-new">${t("backstage.new")}</button>
        <button type="button" class="vno-backstage-nav-btn" data-backstage-cmd="common.file.open" id="vno-backstage-nav-open">${t("backstage.open")}</button>
        <button type="button" class="vno-backstage-nav-btn" data-backstage-cmd="common.file.save" id="vno-backstage-nav-save">${t("backstage.save")}</button>
        <button type="button" class="vno-backstage-nav-btn" data-backstage-cmd="common.file.saveAs" id="vno-backstage-nav-saveas">${t("backstage.saveAs")}</button>
        <button type="button" class="vno-backstage-nav-btn" data-backstage-tab="print" id="vno-backstage-nav-print">${t("backstage.print")}</button>
        <button type="button" class="vno-backstage-nav-btn" data-backstage-tab="export" id="vno-backstage-nav-export">${t("backstage.exportConvert")}</button>
        <button type="button" class="vno-backstage-nav-btn" data-backstage-cmd="common.file.exportPdf" id="vno-backstage-nav-exportpdf">${t("backstage.exportPdf")}</button>
        <button type="button" class="vno-backstage-nav-btn" data-backstage-tab="recent" id="vno-backstage-nav-recent">${t("backstage.recent")}</button>
        ${this.appName === "writer" ? `<button type="button" class="vno-backstage-nav-btn" data-backstage-tab="info" id="vno-backstage-writer-info">${t("writerDocumentProperties.backstage")}</button>` : ""}
        <button type="button" class="vno-backstage-nav-btn" data-backstage-action="closeDocument" id="vno-backstage-close">${t("backstage.close")}</button>
        <div style="flex:1;"></div>
        <button type="button" class="vno-backstage-nav-btn" id="vno-backstage-account">${t("backstage.account")}</button>
        <button type="button" class="vno-backstage-nav-btn" id="vno-backstage-about">${t("backstage.about")}</button>
        <button type="button" class="vno-backstage-nav-btn" id="vno-backstage-options">${t("backstage.options")}</button>
      </div>

      <div class="vno-backstage-content" role="main" aria-label="Nội dung menu tệp">
        <div class="vno-backstage-tab-content" id="vno-backstage-home-view">
          <h1 style="font-size:24px;font-weight:700;margin-bottom:8px;color:var(--vno-text-primary);">${t("backstage.templateTitle")}</h1>
          <p style="color:var(--vno-text-muted);font-size:13px;margin-bottom:24px;">${t("backstage.templateSubtitle")}</p>

          <div class="vno-template-grid" role="region" aria-label="Danh sách mẫu tài liệu">
            ${templateCardsHtml}
          </div>

          <h2 style="font-size:18px;font-weight:700;margin-top:36px;margin-bottom:16px;color:var(--vno-text-primary);">${t("backstage.recentTitle")}</h2>
          <div id="vno-recent-section-wrapper">${recentSectionHtml}</div>
        </div>

        <div class="vno-backstage-tab-content" id="vno-backstage-recent-view" style="display:none;">
          <h1 style="font-size:24px;font-weight:700;margin-bottom:8px;color:var(--vno-text-primary);">${t("backstage.recentTitle")}</h1>
          <p style="color:var(--vno-text-muted);font-size:13px;margin-bottom:24px;">Danh sách các tài liệu bạn đã mở và làm việc gần đây trên thiết bị này.</p>
          <div id="vno-recent-tab-section-wrapper">${recentSectionHtml}</div>
        </div>

        <div class="vno-backstage-tab-content" id="vno-backstage-print-view" style="display:none;"></div>
        <div class="vno-backstage-tab-content" id="vno-backstage-export-view" style="display:none;"></div>
        <div class="vno-backstage-tab-content" id="vno-backstage-info-view" style="display:none;"></div>
      </div>
    `;

    document.body.appendChild(modal);

    let printPanelCleanup = null;
    let exportPanelCleanup = null;
    let infoPanelCleanup = null;

    const closeModal = () => {
      if (typeof infoPanelCleanup === "function") {
        infoPanelCleanup();
        infoPanelCleanup = null;
      }
      if (typeof printPanelCleanup === "function") {
        printPanelCleanup();
        printPanelCleanup = null;
      }
      if (typeof exportPanelCleanup === "function") {
        exportPanelCleanup();
        exportPanelCleanup = null;
      }
      document.removeEventListener("keydown", onBackstageKeyDown);
      if (modal.parentNode) modal.parentNode.removeChild(modal);
      if (previousFocused && isEditorElement(previousFocused)) {
        try { previousFocused.focus(); } catch (_) {}
      } else {
        restoreEditorFocus();
      }
    };

    const onBackstageKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeModal();
      } else if (e.key === "Tab") {
        const focusables = Array.from(modal.querySelectorAll(
          'button:not([disabled]):not([style*="display: none"]):not([style*="display:none"]), ' +
          'input:not([disabled]):not([type="hidden"]):not([style*="display: none"]):not([style*="display:none"]), ' +
          'select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )).filter(el => el.offsetParent !== null || el.offsetWidth > 0 || el.offsetHeight > 0);

        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first || !modal.contains(document.activeElement)) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last || !modal.contains(document.activeElement)) {
            e.preventDefault();
            first.focus();
          }
        }
      } else if ((e.key === "ArrowDown" || e.key === "ArrowUp") && modal.querySelector(".vno-backstage-sidebar")?.contains(document.activeElement)) {
        const sidebarButtons = Array.from(modal.querySelectorAll(".vno-backstage-sidebar button:not([disabled])"))
          .filter(el => el.offsetParent !== null || el.offsetWidth > 0 || el.offsetHeight > 0);
        const curIdx = sidebarButtons.indexOf(document.activeElement);
        if (curIdx !== -1) {
          e.preventDefault();
          const nextIdx = e.key === "ArrowDown"
            ? (curIdx + 1) % sidebarButtons.length
            : (curIdx - 1 + sidebarButtons.length) % sidebarButtons.length;
          sidebarButtons[nextIdx]?.focus();
        }
      } else if (e.key === "ArrowRight" && modal.querySelector(".vno-backstage-sidebar")?.contains(document.activeElement)) {
        const printViewEl = modal.querySelector("#vno-backstage-print-view");
        if (printViewEl && printViewEl.style.display !== "none") {
          const printBtn = printViewEl.querySelector("#vno-backstage-btn-print-now");
          if (printBtn) {
            e.preventDefault();
            printBtn.focus();
            return;
          }
        }
        const contentFocusables = Array.from(modal.querySelectorAll(
          '.vno-backstage-content button:not([disabled]), .vno-backstage-content [tabindex="0"], .vno-backstage-content input:not([disabled]), .vno-backstage-content select:not([disabled])'
        )).filter(el => el.offsetParent !== null || el.offsetWidth > 0 || el.offsetHeight > 0);
        if (contentFocusables.length > 0) {
          e.preventDefault();
          contentFocusables[0].focus();
        }
      } else if (modal.querySelector("#vno-backstage-print-view")?.contains(document.activeElement)) {
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          const printNav = modal.querySelector("#vno-backstage-nav-print") || modal.querySelector("#vno-backstage-back");
          printNav?.focus();
        }
      } else if (modal.querySelector("#vno-backstage-export-view")?.contains(document.activeElement)) {
        if (e.key === "ArrowLeft" && (document.activeElement?.id === "vno-export-item-pdf" || document.activeElement?.id === "vno-export-compat-checkbox")) {
          e.preventDefault();
          modal.querySelector("#vno-backstage-nav-export")?.focus();
        }
      } else if (document.activeElement?.classList?.contains("vno-export-card")) {
        const cards = Array.from(modal.querySelectorAll(".vno-export-card"))
          .filter(el => el.offsetParent !== null || el.offsetWidth > 0 || el.offsetHeight > 0);
        const curIdx = cards.indexOf(document.activeElement);
        if (curIdx !== -1) {
          if (e.key === "ArrowRight" || e.key === "ArrowDown") {
            e.preventDefault();
            cards[(curIdx + 1) % cards.length]?.focus();
          } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
            e.preventDefault();
            if (curIdx === 0 && e.key === "ArrowLeft") {
              modal.querySelector("#vno-backstage-nav-export")?.focus();
            } else {
              cards[(curIdx - 1 + cards.length) % cards.length]?.focus();
            }
          }
        }
      } else if (document.activeElement?.classList?.contains("vno-template-card")) {
        const cards = Array.from(modal.querySelectorAll(".vno-template-card"))
          .filter(el => el.offsetParent !== null || el.offsetWidth > 0 || el.offsetHeight > 0);
        const curIdx = cards.indexOf(document.activeElement);
        if (curIdx !== -1) {
          if (e.key === "ArrowRight") {
            e.preventDefault();
            cards[(curIdx + 1) % cards.length]?.focus();
          } else if (e.key === "ArrowLeft") {
            e.preventDefault();
            if (curIdx === 0) {
              const activeNavBtn = modal.querySelector(".vno-backstage-nav-btn.is-active") || modal.querySelector("#vno-backstage-back");
              activeNavBtn?.focus();
            } else {
              cards[(curIdx - 1 + cards.length) % cards.length]?.focus();
            }
          } else if (e.key === "ArrowDown") {
            e.preventDefault();
            const firstRow = modal.querySelector(".vno-recent-row");
            if (firstRow) {
              firstRow.focus();
            } else {
              cards[(curIdx + 1) % cards.length]?.focus();
            }
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            if (curIdx === 0) {
              const activeNavBtn = modal.querySelector(".vno-backstage-nav-btn.is-active") || modal.querySelector("#vno-backstage-back");
              activeNavBtn?.focus();
            } else {
              cards[(curIdx - 1 + cards.length) % cards.length]?.focus();
            }
          }
        }
      } else if (document.activeElement?.classList?.contains("vno-recent-row")) {
        const rows = Array.from(modal.querySelectorAll(".vno-recent-row"))
          .filter(el => el.offsetParent !== null || el.offsetWidth > 0 || el.offsetHeight > 0);
        const curIdx = rows.indexOf(document.activeElement);
        if (curIdx !== -1) {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            rows[(curIdx + 1) % rows.length]?.focus();
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            if (curIdx === 0) {
              const cards = Array.from(modal.querySelectorAll(".vno-template-card"))
                .filter(el => el.offsetParent !== null || el.offsetWidth > 0 || el.offsetHeight > 0);
              if (cards.length > 0) {
                cards[cards.length - 1].focus();
              } else {
                const activeNavBtn = modal.querySelector(".vno-backstage-nav-btn.is-active") || modal.querySelector("#vno-backstage-back");
                activeNavBtn?.focus();
              }
            } else {
              rows[(curIdx - 1 + rows.length) % rows.length]?.focus();
            }
          } else if (e.key === "ArrowLeft") {
            e.preventDefault();
            const activeNavBtn = modal.querySelector(".vno-backstage-nav-btn.is-active") || modal.querySelector("#vno-backstage-back");
            activeNavBtn?.focus();
          }
        }
      }
    };
    document.addEventListener("keydown", onBackstageKeyDown);

    // Nếu không có tài liệu gần đây, mount EmptyState component
    modal.querySelectorAll("#vno-recent-empty-container").forEach(c => renderEmptyRecent(c));

    // Xử lý nút Xóa lịch sử gần đây
    modal.querySelectorAll("#vno-clear-recent").forEach(btn => {
      btn.addEventListener("click", () => {
        RecentFilesManager.clearAll();
        modal.querySelectorAll("#vno-recent-section-wrapper, #vno-recent-tab-section-wrapper").forEach(wrapper => {
          renderEmptyRecent(wrapper);
        });
      });
    });

    // Gắn handler cho nút gỡ từng tài liệu gần đây
    const attachRemoveHandlers = () => {
      modal.querySelectorAll(".vno-recent-remove-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const name = btn.getAttribute("data-remove-name");
          const app = btn.getAttribute("data-remove-app");
          RecentFilesManager.removeFile({ name, app });
          modal.querySelectorAll(`.vno-recent-row[data-recent-name="${name}"][data-recent-app="${app}"]`).forEach(r => r.remove());
          if (modal.querySelectorAll(".vno-recent-row").length === 0) {
            modal.querySelectorAll("#vno-recent-section-wrapper, #vno-recent-tab-section-wrapper").forEach(wrapper => {
              renderEmptyRecent(wrapper);
            });
          }
        });
      });
    };
    attachRemoveHandlers();

    // Xử lý nhấp chọn tài liệu gần đây
    modal.querySelectorAll(".vno-recent-row").forEach(row => {
      const activateRecent = async () => {
        const app = row.getAttribute("data-recent-app");
        const fileName = row.getAttribute("data-recent-name");
        const filePath = decodeURIComponent(row.getAttribute("data-recent-path") || "");
        closeModal();
        const result = await globalUnoBridge.openFileInNewWindow(filePath, app);
        if (result?.status !== "ok") {
          await showAlertDialog({
            title: t("backstage.fileNotFoundTitle", "Không thể mở tệp gần đây"),
            message: result?.message || `Không mở được “${fileName}”.`,
            type: "error"
          });
        }
      };
      row.addEventListener("click", activateRecent);
      row.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          activateRecent();
        }
      });
    });

    // Xử lý chọn mẫu tài liệu (Template)
    modal.querySelectorAll(".vno-template-card").forEach(card => {
      const activateTemplate = () => {
        const tmplId = card.getAttribute("data-template-id");
        const tmplApp = card.getAttribute("data-template-app");
        closeModal();

        if (tmplApp === "current" || tmplApp === this.appName) {
          this.applyTemplate(tmplId);
        } else {
          if (!this.requestAppSwitch(tmplApp, { templateId: tmplId })) {
            const appDisplayName = tmplApp === "writer" ? "Doc" : tmplApp === "sheet" ? "Sheet" : "Slide";
            showAlertDialog({
              title: "Mẫu tài liệu",
              message: `Mẫu này dành cho ứng dụng ${appDisplayName}. Vui lòng chuyển sang ứng dụng đó để sử dụng.`
            });
          }
        }
      };
      card.addEventListener("click", activateTemplate);
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          activateTemplate();
        }
      });
    });

    modal.querySelector("#vno-backstage-back").addEventListener("click", closeModal);

    modal.querySelector("#vno-backstage-account")?.addEventListener("click", () => {
      closeModal();
      this._showLicenseDialog();
    });

    modal.querySelector("#vno-backstage-about")?.addEventListener("click", () => {
      closeModal();
      this._showAboutDialog();
    });

    modal.querySelector("#vno-backstage-options")?.addEventListener("click", () => {
      closeModal();
      this.showOptionsDialog();
    });

    const homeNavBtn = modal.querySelector("#vno-backstage-nav-home");
    const recentNavBtn = modal.querySelector("#vno-backstage-nav-recent");
    const printNavBtn = modal.querySelector("#vno-backstage-nav-print");
    const exportNavBtn = modal.querySelector("#vno-backstage-nav-export");
    const infoNavBtn = modal.querySelector("#vno-backstage-writer-info");
    const homeView = modal.querySelector("#vno-backstage-home-view");
    const recentView = modal.querySelector("#vno-backstage-recent-view");
    const printView = modal.querySelector("#vno-backstage-print-view");
    const exportView = modal.querySelector("#vno-backstage-export-view");
    const infoView = modal.querySelector("#vno-backstage-info-view");

    const showTab = (tabName) => {
      if (tabName === "info") {
        homeNavBtn?.classList.remove("is-active");
        recentNavBtn?.classList.remove("is-active");
        exportNavBtn?.classList.remove("is-active");
        printNavBtn?.classList.remove("is-active");
        infoNavBtn?.classList.add("is-active");
        if (homeView) homeView.style.display = "none";
        if (recentView) recentView.style.display = "none";
        if (printView) {
          printView.style.display = "none";
          if (typeof printPanelCleanup === "function") {
            printPanelCleanup();
            printPanelCleanup = null;
          }
          printView.innerHTML = "";
        }
        if (exportView) {
          exportView.style.display = "none";
          if (typeof exportPanelCleanup === "function") {
            exportPanelCleanup();
            exportPanelCleanup = null;
          }
          exportView.innerHTML = "";
        }
        if (infoView) {
          infoView.style.display = "block";
          if (typeof infoPanelCleanup === "function") {
            infoPanelCleanup();
            infoPanelCleanup = null;
          }
          infoPanelCleanup = this._renderBackstageInfoPanel(infoView, closeModal);
        }
      } else if (tabName === "export") {
        homeNavBtn?.classList.remove("is-active");
        recentNavBtn?.classList.remove("is-active");
        printNavBtn?.classList.remove("is-active");
        infoNavBtn?.classList.remove("is-active");
        exportNavBtn?.classList.add("is-active");
        if (homeView) homeView.style.display = "none";
        if (recentView) recentView.style.display = "none";
        if (infoView) {
          infoView.style.display = "none";
          if (typeof infoPanelCleanup === "function") {
            infoPanelCleanup();
            infoPanelCleanup = null;
          }
          infoView.innerHTML = "";
        }
        if (printView) {
          printView.style.display = "none";
          if (typeof printPanelCleanup === "function") {
            printPanelCleanup();
            printPanelCleanup = null;
          }
          printView.innerHTML = "";
        }
        if (exportView) {
          exportView.style.display = "block";
          if (typeof exportPanelCleanup === "function") {
            exportPanelCleanup();
            exportPanelCleanup = null;
          }
          exportPanelCleanup = this._renderBackstageExportPanel(exportView, closeModal);
        }
      } else if (tabName === "print") {
        homeNavBtn?.classList.remove("is-active");
        recentNavBtn?.classList.remove("is-active");
        exportNavBtn?.classList.remove("is-active");
        infoNavBtn?.classList.remove("is-active");
        printNavBtn?.classList.add("is-active");
        if (homeView) homeView.style.display = "none";
        if (recentView) recentView.style.display = "none";
        if (infoView) {
          infoView.style.display = "none";
          if (typeof infoPanelCleanup === "function") {
            infoPanelCleanup();
            infoPanelCleanup = null;
          }
          infoView.innerHTML = "";
        }
        if (exportView) {
          exportView.style.display = "none";
          if (typeof exportPanelCleanup === "function") {
            exportPanelCleanup();
            exportPanelCleanup = null;
          }
          exportView.innerHTML = "";
        }
        if (printView) {
          printView.style.display = "block";
          if (typeof printPanelCleanup === "function") {
            printPanelCleanup();
            printPanelCleanup = null;
          }
          printPanelCleanup = this._renderBackstagePrintPanel(printView, closeModal);
        }
      } else if (tabName === "recent") {
        homeNavBtn?.classList.remove("is-active");
        printNavBtn?.classList.remove("is-active");
        exportNavBtn?.classList.remove("is-active");
        infoNavBtn?.classList.remove("is-active");
        recentNavBtn?.classList.add("is-active");
        if (homeView) homeView.style.display = "none";
        if (infoView) {
          infoView.style.display = "none";
          if (typeof infoPanelCleanup === "function") {
            infoPanelCleanup();
            infoPanelCleanup = null;
          }
          infoView.innerHTML = "";
        }
        if (printView) {
          printView.style.display = "none";
          if (typeof printPanelCleanup === "function") {
            printPanelCleanup();
            printPanelCleanup = null;
          }
          printView.innerHTML = "";
        }
        if (exportView) {
          exportView.style.display = "none";
          if (typeof exportPanelCleanup === "function") {
            exportPanelCleanup();
            exportPanelCleanup = null;
          }
          exportView.innerHTML = "";
        }
        if (recentView) recentView.style.display = "block";
      } else {
        printNavBtn?.classList.remove("is-active");
        recentNavBtn?.classList.remove("is-active");
        exportNavBtn?.classList.remove("is-active");
        infoNavBtn?.classList.remove("is-active");
        homeNavBtn?.classList.add("is-active");
        if (recentView) recentView.style.display = "none";
        if (infoView) {
          infoView.style.display = "none";
          if (typeof infoPanelCleanup === "function") {
            infoPanelCleanup();
            infoPanelCleanup = null;
          }
          infoView.innerHTML = "";
        }
        if (printView) {
          printView.style.display = "none";
          if (typeof printPanelCleanup === "function") {
            printPanelCleanup();
            printPanelCleanup = null;
          }
          printView.innerHTML = "";
        }
        if (exportView) {
          exportView.style.display = "none";
          if (typeof exportPanelCleanup === "function") {
            exportPanelCleanup();
            exportPanelCleanup = null;
          }
          exportView.innerHTML = "";
        }
        if (homeView) homeView.style.display = "block";
      }
    };

    homeNavBtn?.addEventListener("click", () => showTab("home"));
    recentNavBtn?.addEventListener("click", () => showTab("recent"));
    exportNavBtn?.addEventListener("click", () => showTab("export"));
    infoNavBtn?.addEventListener("click", () => showTab("info"));
    printNavBtn?.addEventListener("click", () => {
      closeModal();
      globalCommandBus.execute("common.file.print");
    });

    modal.querySelectorAll("[data-backstage-cmd]").forEach(btn => {
      btn.addEventListener("click", () => {
        const cmd = btn.getAttribute("data-backstage-cmd");
        closeModal();
        globalCommandBus.execute(cmd);
      });
    });

    modal.querySelectorAll("[data-backstage-action]").forEach(btn => {
      btn.addEventListener("click", () => {
        const act = btn.getAttribute("data-backstage-action");
        if (act === "closeDocument") {
          closeModal();
          this.requestCloseDocument();
        }
      });
    });

    if (initialTab && initialTab !== "home") {
      showTab(initialTab);
    } else {
      // Tự động focus nút Quay lại khi mở
      modal.querySelector("#vno-backstage-back")?.focus();
    }
  }

  /**
   * Hộp thoại Tùy chọn 3T Office (Theme, Cỡ chữ giao diện)
   * Tuân thủ CH-8.1 & CH-8.5: Enter default, Esc cancel, focus trap
   */
  showOptionsDialog() {
    if (typeof document === "undefined" || !document.body) return;
    const previousFocused = document.activeElement;
    const overlay = document.createElement("div");
    overlay.className = "vno-dialog-overlay";
    const currentTheme = themeManager.getTheme();
    const currentFontSize = themeManager.getFontSize();
    const appOptionsHtml = this._optionsProvider?.renderHtml?.() || "";

    overlay.innerHTML = `
      <div class="vno-dialog-box" style="width:${this._optionsProvider ? "720px" : "480px"};max-width:calc(100vw - 32px);" role="dialog" aria-modal="true" aria-labelledby="vno-options-dialog-title">
        <div class="vno-dialog-header">
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-weight:700;font-size:15px;" id="vno-options-dialog-title">Tùy chọn 3T Office</span>
          </div>
          <button class="vno-btn vno-btn-icon-only vno-options-close-btn" title="Đóng" aria-label="Đóng">&times;</button>
        </div>
        <div class="vno-dialog-body" style="display:flex;flex-direction:column;gap:16px;max-height:calc(100vh - 170px);overflow-y:auto;">
          <!-- Section Giao diện -->
          <fieldset style="border:1px solid var(--vno-border-default);border-radius:var(--vno-radius-md);padding:12px 16px;margin:0;">
            <legend style="font-size:13px;font-weight:600;color:var(--vno-text-primary);padding:0 6px;">Giao diện (Theme)</legend>
            <div style="display:flex;gap:24px;margin-top:6px;">
              <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;">
                <input type="radio" name="vno-opt-theme" value="light" ${currentTheme === "light" ? "checked" : ""} />
                <span>Giao diện Sáng (Mặc định)</span>
              </label>
              <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;">
                <input type="radio" name="vno-opt-theme" value="dark" ${currentTheme === "dark" ? "checked" : ""} />
                <span>Giao diện Tối</span>
              </label>
            </div>
          </fieldset>

          <!-- Section Khu vực tiêu đề: màu hoặc hình ảnh -->
          <fieldset id="vno-opt-header" style="border:1px solid var(--vno-border-default);border-radius:var(--vno-radius-md);padding:12px 16px;margin:0;">
            <legend style="font-size:13px;font-weight:600;color:var(--vno-text-primary);padding:0 6px;">Khu vực tiêu đề (thanh tiêu đề và thẻ ribbon)</legend>
            <div style="display:flex;gap:18px;flex-wrap:wrap;margin-top:6px;">
              <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;"><input type="radio" name="vno-opt-header" value="default" /><span>Mặc định (theo Sáng/Tối)</span></label>
              <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;"><input type="radio" name="vno-opt-header" value="color" /><span>Một màu</span></label>
              <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;"><input type="radio" name="vno-opt-header" value="image" /><span>Hình ảnh</span></label>
            </div>
            <div id="vno-opt-header-color-row" style="display:none;margin-top:10px;gap:6px;flex-wrap:wrap;align-items:center;">
              ${HEADER_PRESET_COLORS.map((item) => `<button type="button" class="vno-btn vno-opt-header-swatch" data-color="${item.value}" title="${item.label}" aria-label="${item.label}" style="width:26px;height:26px;padding:0;border-radius:50%;background:${item.value};border:2px solid var(--vno-border-strong);"></button>`).join("")}
              <label style="display:flex;align-items:center;gap:6px;font-size:12px;margin-left:6px;">Màu khác <input type="color" id="vno-opt-header-color" value="#0f4c81" aria-label="Chọn màu tùy ý cho khu vực tiêu đề" style="width:34px;height:26px;padding:0;border:none;background:none;" /></label>
            </div>
            <div id="vno-opt-header-image-row" style="display:none;margin-top:10px;flex-direction:column;gap:8px;">
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                <button type="button" class="vno-btn" id="vno-opt-header-pick">Chọn hình…</button>
                <input type="file" id="vno-opt-header-file" accept="image/*" style="display:none;" />
                <span id="vno-opt-header-file-name" style="font-size:12px;color:var(--vno-text-muted);">Chưa chọn hình</span>
              </div>
              <label style="display:flex;align-items:center;gap:8px;font-size:12px;">Vị trí cắt (trên ⇄ dưới)
                <input type="range" id="vno-opt-header-pos" min="0" max="100" step="1" value="50" style="flex:1;" aria-label="Vị trí cắt hình theo chiều dọc" />
              </label>
              <label style="display:flex;align-items:center;gap:8px;font-size:12px;">Độ phủ tối (giúp chữ dễ đọc)
                <input type="range" id="vno-opt-header-dim" min="0" max="70" step="5" value="25" style="flex:1;" aria-label="Độ phủ tối lên hình, từ 0 đến 70 phần trăm" />
              </label>
            </div>
            <div id="vno-opt-header-error" role="alert" style="display:none;margin-top:8px;font-size:12px;color:var(--vno-danger, #b91c1c);"></div>
            <div style="margin-top:10px;"><button type="button" class="vno-btn" id="vno-opt-header-reset">Đặt lại mặc định</button></div>
          </fieldset>

          <!-- Section Cỡ chữ -->
          <fieldset style="border:1px solid var(--vno-border-default);border-radius:var(--vno-radius-md);padding:12px 16px;margin:0;">
            <legend style="font-size:13px;font-weight:600;color:var(--vno-text-primary);padding:0 6px;">Cỡ chữ giao diện</legend>
            <div style="display:flex;gap:20px;margin-top:6px;">
              <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;">
                <input type="radio" name="vno-opt-fontsize" value="normal" ${currentFontSize === "normal" ? "checked" : ""} />
                <span>Tiêu chuẩn (100%)</span>
              </label>
              <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;">
                <input type="radio" name="vno-opt-fontsize" value="large" ${currentFontSize === "large" ? "checked" : ""} />
                <span>Lớn (115%)</span>
              </label>
              <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;">
                <input type="radio" name="vno-opt-fontsize" value="xlarge" ${currentFontSize === "xlarge" ? "checked" : ""} />
                <span>Rất lớn (130%)</span>
              </label>
            </div>
          </fieldset>
          ${appOptionsHtml}
        </div>
        <div class="vno-dialog-footer" style="display:flex;justify-content:flex-end;gap:8px;">
          <button type="button" class="vno-btn vno-options-cancel-btn">Hủy bỏ</button>
          <button type="button" class="vno-btn vno-btn-primary vno-options-ok-btn">Đồng ý</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    const dialogBox = overlay.querySelector(".vno-dialog-box");
    const okBtn = overlay.querySelector(".vno-options-ok-btn");
    const cancelBtn = overlay.querySelector(".vno-options-cancel-btn");
    const closeBtn = overlay.querySelector(".vno-options-close-btn");
    this._optionsProvider?.mount?.(overlay);

    // --- Khu vực tiêu đề: xem trước trực tiếp, chỉ lưu khi bấm Đồng ý ---
    let headerCommitted = false;
    let headerDraft = headerTheme.get();
    let headerImageSource = null;
    let headerImageLuminance = 0.35;
    const headerEl = (selector) => overlay.querySelector(selector);
    const headerError = (message) => {
      const box = headerEl("#vno-opt-header-error");
      box.textContent = message || "";
      box.style.display = message ? "block" : "none";
    };
    const previewHeader = () => headerTheme.preview(headerDraft, headerImageLuminance);
    const syncHeaderRows = () => {
      headerEl("#vno-opt-header-color-row").style.display = headerDraft.mode === "color" ? "flex" : "none";
      headerEl("#vno-opt-header-image-row").style.display = headerDraft.mode === "image" ? "flex" : "none";
      const radio = overlay.querySelector(`input[name="vno-opt-header"][value="${headerDraft.mode}"]`);
      if (radio) radio.checked = true;
      headerEl("#vno-opt-header-color").value = headerDraft.color;
      headerEl("#vno-opt-header-pos").value = String(headerDraft.position);
      headerEl("#vno-opt-header-dim").value = String(Math.round(headerDraft.dim * 100));
      headerEl("#vno-opt-header-file-name").textContent = headerDraft.image ? (headerImageSource ? "Đã chọn hình mới" : "Đang dùng hình đã lưu") : "Chưa chọn hình";
    };
    const rebuildHeaderStrip = () => {
      if (!headerImageSource) return;
      const strip = headerImageSource.strip(headerDraft.position);
      headerDraft = { ...headerDraft, image: strip.dataUrl, imageColor: strip.color };
      headerImageLuminance = strip.luminance;
    };
    overlay.querySelectorAll('input[name="vno-opt-header"]').forEach((radio) => radio.addEventListener("change", () => {
      headerError("");
      const mode = radio.value;
      if (mode === "image" && !headerDraft.image) {
        headerDraft = { ...headerDraft, mode: "image" };
        syncHeaderRows();
        headerEl("#vno-opt-header-pick").focus();
        return; // chưa có hình: chờ người dùng chọn rồi mới xem trước
      }
      headerDraft = { ...headerDraft, mode };
      syncHeaderRows();
      previewHeader();
    }));
    overlay.querySelectorAll(".vno-opt-header-swatch").forEach((button) => button.addEventListener("click", () => {
      headerDraft = { ...headerDraft, mode: "color", color: button.dataset.color };
      syncHeaderRows();
      previewHeader();
    }));
    headerEl("#vno-opt-header-color").addEventListener("input", (event) => {
      headerDraft = { ...headerDraft, mode: "color", color: event.target.value };
      previewHeader();
    });
    headerEl("#vno-opt-header-pick").addEventListener("click", () => headerEl("#vno-opt-header-file").click());
    headerEl("#vno-opt-header-file").addEventListener("change", async (event) => {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      headerError("");
      try {
        const bar = document.querySelector(".vno-topbar");
        const tabs = document.querySelector(".vno-ribbon-tabs");
        headerImageSource = await loadHeaderImage(file, {
          headerHeightPx: (bar?.offsetHeight || 44) + (tabs?.offsetHeight || 34),
          viewportWidthPx: window.innerWidth || 1366
        });
        headerDraft = { ...headerDraft, mode: "image" };
        rebuildHeaderStrip();
        syncHeaderRows();
        headerEl("#vno-opt-header-file-name").textContent = file.name;
        previewHeader();
      } catch (error) {
        headerError(error && error.message ? error.message : "Không dùng được hình này.");
      }
    });
    headerEl("#vno-opt-header-pos").addEventListener("input", (event) => {
      headerDraft = { ...headerDraft, position: Number(event.target.value) };
      rebuildHeaderStrip();
      previewHeader();
    });
    headerEl("#vno-opt-header-dim").addEventListener("input", (event) => {
      headerDraft = { ...headerDraft, dim: Number(event.target.value) / 100 };
      previewHeader();
    });
    headerEl("#vno-opt-header-reset").addEventListener("click", () => {
      headerError("");
      headerImageSource = null;
      headerDraft = { mode: "default", color: "#0f4c81", image: "", imageColor: "#1f2937", dim: 0.25, position: 50 };
      syncHeaderRows();
      previewHeader();
    });
    syncHeaderRows();

    const closeDialog = () => {
      document.removeEventListener("keydown", onKeyDown);
      if (!headerCommitted) headerTheme.restore();
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (previousFocused && typeof previousFocused.focus === "function") {
        previousFocused.focus();
      }
    };

    const applyOptions = () => {
      if (this._optionsProvider?.apply?.(overlay) === false) return;
      const selectedTheme = overlay.querySelector('input[name="vno-opt-theme"]:checked')?.value || "light";
      const selectedFontSize = overlay.querySelector('input[name="vno-opt-fontsize"]:checked')?.value || "normal";
      themeManager.setTheme(selectedTheme);
      themeManager.setFontSize(selectedFontSize);
      headerTheme.save(headerDraft, headerImageLuminance);
      headerCommitted = true;
      closeDialog();
    };

    okBtn.addEventListener("click", applyOptions);
    cancelBtn.addEventListener("click", closeDialog);
    closeBtn.addEventListener("click", closeDialog);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeDialog();
    });

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeDialog();
      } else if (e.key === "Enter") {
        if (document.activeElement?.matches?.(".vno-autocorrect-add,.vno-autocorrect-remove,.vno-autocorrect-reset")) {
          e.preventDefault();
          document.activeElement.click();
          return;
        }
        e.preventDefault();
        if (document.activeElement === cancelBtn || document.activeElement === closeBtn) {
          closeDialog();
        } else {
          applyOptions();
        }
      } else if (e.key === "Tab") {
        const focusables = Array.from(dialogBox.querySelectorAll(
          'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )).filter(el => el.offsetParent !== null || el.offsetWidth > 0 || el.offsetHeight > 0);
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && (document.activeElement === first || !dialogBox.contains(document.activeElement))) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && (document.activeElement === last || !dialogBox.contains(document.activeElement))) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", onKeyDown);
    okBtn.focus();
  }

  _getPrintPreviewProvider() {
    if (this.appName === "sheet") {
      const grid = this.grid || this.adapter?.grid || globalUnoBridge?.activeDocument?.grid;
      if (!grid || typeof grid.computePrintPages !== "function") return null;
      return {
        type: "sheet",
        computePages: () => grid.computePrintPages(),
        renderPage: (printResult, pageIndex) => {
          const page = printResult.pages[pageIndex] || printResult.pages[0];
          const pageDiv = document.createElement("div");
          pageDiv.className = "vno-sheet-print-preview-page vno-backstage-sheet-page";
          pageDiv.style.width = `${printResult.pageWidthPx}px`;
          pageDiv.style.minHeight = `${printResult.pageHeightPx}px`;
          pageDiv.style.padding =
            `${Math.round(printResult.margins.top * (960 / 25.4))}px ${Math.round(printResult.margins.right * (960 / 25.4))}px ` +
            `${Math.round(printResult.margins.bottom * (960 / 25.4))}px ${Math.round(printResult.margins.left * (960 / 25.4))}px`;

          const headerText = grid._formatSheetHeaderFooterText?.(printResult.headerFooter?.header?.center, pageIndex + 1, printResult.totalPages);
          if (headerText) {
            const headerEl = document.createElement("div");
            headerEl.className = "vno-sheet-print-header";
            headerEl.textContent = headerText;
            pageDiv.appendChild(headerEl);
          }

          if (page && typeof grid._renderPrintPageTable === "function") {
            const table = grid._renderPrintPageTable(page);
            pageDiv.appendChild(table);
          }

          const footerText = grid._formatSheetHeaderFooterText?.(printResult.headerFooter?.footer?.center, pageIndex + 1, printResult.totalPages);
          if (footerText) {
            const footerEl = document.createElement("div");
            footerEl.className = "vno-sheet-print-footer";
            footerEl.textContent = footerText;
            pageDiv.appendChild(footerEl);
          }

          return pageDiv;
        },
        getInfo: (printResult) => [
          { label: "Khổ giấy", val: printResult.sizeLabel || "A4" },
          { label: "Hướng in", val: printResult.orientation === "landscape" ? "Ngang" : "Dọc" },
          { label: "Tỷ lệ in", val: `${Math.round((printResult.scale || 1) * 100)}%` },
          { label: "Tổng số trang", val: String(printResult.totalPages || 1) }
        ]
      };
    }
    if (this.appName === "slides") {
      const canvas = this.canvas || this.adapter?.canvas || globalUnoBridge?.activeDocument?.canvas;
      if (!canvas || typeof canvas.computePrintPages !== "function") return null;
      return {
        type: "slides",
        computePages: () => canvas.computePrintPages(),
        renderPage: (printResult, pageIndex) => {
          const entry = printResult.pages[pageIndex] || printResult.pages[0];
          const pageDiv = document.createElement("div");
          pageDiv.className = "vno-slides-print-preview-page vno-backstage-slides-page";
          if (entry && typeof canvas._renderSlidePrintPage === "function") {
            const surface = canvas._renderSlidePrintPage(entry.slide, entry.index);
            pageDiv.appendChild(surface);
          }
          return pageDiv;
        },
        getInfo: (printResult) => [
          { label: t("slidesDialogs.slideSizeTitle", "Kích thước trang chiếu"), val: `${canvas.slideSize?.width || 960}x${canvas.slideSize?.height || 540}` },
          { label: "Tỷ lệ khung hình", val: "16:9 HD" },
          { label: t("slidesDialogs.totalPrintSlides", "Tổng số trang chiếu in"), val: String(printResult.totalPages || 1) }
        ]
      };
    }
    if (this.appName === "writer") {
      const adapter = this.adapter || globalUnoBridge?.activeDocument;
      if (!adapter || typeof adapter.paginateContent !== "function" || typeof adapter.getPageDimensions !== "function") return null;
      return {
        type: "writer",
        computePages: () => {
          adapter._initZones?.();
          const dim = adapter.getPageDimensions();
          let headerHtml = "";
          if (adapter.headerDom && adapter.headerDom.innerText?.trim()) headerHtml = adapter.headerDom.innerHTML;
          let footerHtml = "";
          if (adapter.footerDom && adapter.footerDom.innerText?.trim()) footerHtml = adapter.footerDom.innerHTML;
          let rawBody = "";
          if (adapter.bodyDom) rawBody = adapter._stripCommentMarkup ? adapter._stripCommentMarkup(adapter.bodyDom.innerHTML) : adapter.bodyDom.innerHTML;
          else if (adapter.editorDom) rawBody = adapter._stripCommentMarkup ? adapter._stripCommentMarkup(adapter.editorDom.innerHTML) : adapter.editorDom.innerHTML;
          const availableBodyHeightPx = adapter._getUsablePageHeight ? adapter._getUsablePageHeight(dim) : (dim.heightPx - dim.topPx - dim.bottomPx);
          const notesData = adapter._extractNotesForPreview ? adapter._extractNotesForPreview(rawBody) : { cleanHtml: rawBody, footnotes: new Map(), endnotes: new Map() };
          const bodyForPagination = adapter._stripAutoPageGaps ? adapter._stripAutoPageGaps(notesData.cleanHtml) : notesData.cleanHtml;
          const pageBodies = adapter.paginateContent(bodyForPagination, availableBodyHeightPx, dim.printableWidthPx, adapter.columns);

          // Gắn Footnote vào chân trang của đúng trang chứa số mũ tương ứng
          if (typeof adapter._renderPageFootnotesForPreview === "function" && notesData.footnotes) {
            for (let i = 0; i < pageBodies.length; i++) {
              const pageFootnotesHtml = adapter._renderPageFootnotesForPreview(pageBodies[i], notesData.footnotes);
              if (pageFootnotesHtml) {
                pageBodies[i] = `${pageBodies[i]}\n${pageFootnotesHtml}`;
              }
            }
          }

          // Gắn Endnote vào cuối trang cuối cùng của tài liệu
          if (typeof adapter._renderEndnotesForPreview === "function" && pageBodies.length > 0 && notesData.endnotes && notesData.endnotes.size > 0) {
            const endnotesHtml = adapter._renderEndnotesForPreview(notesData.endnotes);
            if (endnotesHtml) {
              pageBodies[pageBodies.length - 1] = `${pageBodies[pageBodies.length - 1]}\n${endnotesHtml}`;
            }
          }

          const totalPages = Math.max(1, pageBodies.length);
          return { dim, headerHtml, footerHtml, pageBodies, totalPages };
        },
        renderPage: (printResult, pageIndex) => {
          const { dim, headerHtml, footerHtml, pageBodies, totalPages } = printResult;
          const pageNum = pageIndex + 1;
          const sheet = document.createElement("div");
          sheet.className = "vno-print-preview-sheet is-active";
          sheet.style.width = `${dim.widthPx}px`;
          sheet.style.minHeight = `${dim.heightPx}px`;
          sheet.style.padding = `${dim.topPx}px ${dim.rightPx}px ${dim.bottomPx}px ${dim.leftPx}px`;
          if (adapter.pageColor && adapter.pageColor !== "transparent") sheet.style.backgroundColor = adapter.pageColor;
          let pageFooterHtml = footerHtml;
          if (footerHtml) {
            pageFooterHtml = footerHtml.replace(/Trang\s+\d+(\s*\/\s*\d+)?/gi, `Trang ${pageNum} / ${totalPages}`);
          }
          const hasColumns = Boolean(adapter.columns && adapter.columns.count > 1);
          const colCount = hasColumns ? adapter.columns.count : 1;
          const colGap = hasColumns ? (typeof adapter.columns.gap === "number" ? `${adapter.columns.gap}mm` : (adapter.columns.gap || "10mm")) : "";
          const colRule = hasColumns && adapter.columns.rule ? (typeof adapter.columns.rule === "string" ? adapter.columns.rule : "1px solid #94a3b8") : "";
          const colStyleAttr = hasColumns ? `column-count:${colCount}; -webkit-column-count:${colCount}; column-gap:${colGap}; -webkit-column-gap:${colGap}; ${colRule ? `column-rule:${colRule}; -webkit-column-rule:${colRule};` : ''}` : "";
          sheet.innerHTML = `
            ${headerHtml ? `<div class="vno-print-preview-header">${headerHtml}</div>` : ""}
            <div class="vno-print-preview-body${hasColumns ? ` vno-columns-active vno-columns-${colCount}` : ""}" style="${colStyleAttr}">${pageBodies[pageIndex] || "<p><br></p>"}</div>
            ${pageFooterHtml ? `<div class="vno-print-preview-footer">${pageFooterHtml}</div>` : ""}
          `;
          return sheet;
        },
        getInfo: (printResult) => [
          { label: "Khổ giấy", val: printResult.dim?.sizeKey?.toUpperCase() || "A4" },
          { label: "Hướng in", val: printResult.dim?.orientation === "landscape" ? "Ngang" : "Dọc" },
          { label: "Tổng số trang", val: String(printResult.totalPages || 1) }
        ]
      };
    }
    return null;
  }

  _renderBackstagePrintPanel(container, closeModal) {
    container.innerHTML = "";

    const provider = this._getPrintPreviewProvider();
    if (!provider) {
      container.innerHTML = `
        <div class="vno-backstage-print-panel">
          <div class="vno-backstage-print-controls">
            <button type="button" class="vno-btn vno-btn-primary vno-backstage-print-now-btn" id="vno-backstage-btn-print-now" aria-label="${t("backstage.printNow", "In ngay")}">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true" style="margin-right:8px;"><rect x="6" y="2" width="12" height="6" rx="1" fill="#E2E8F0" stroke="#475569" stroke-width="1.2"/><rect x="3" y="7" width="18" height="10" rx="2" fill="#0F4C81"/><rect x="6" y="13" width="12" height="8" rx="1" fill="#FFFFFF" stroke="#475569" stroke-width="1.2"/><line x1="8" y1="16" x2="16" y2="16" stroke="#94A3B8" stroke-width="1.2"/><line x1="8" y1="18" x2="14" y2="18" stroke="#94A3B8" stroke-width="1.2"/><circle cx="18" cy="10" r="1" fill="#10B981"/></svg>
              <span>${t("backstage.printNow", "In ngay")}</span>
            </button>
          </div>
          <div class="vno-backstage-print-preview-viewport">
            <p style="color:var(--vno-text-muted);font-size:14px;padding:24px;">Không thể tải bản xem trước trang in cho ứng dụng này.</p>
          </div>
        </div>
      `;
      const btn = container.querySelector("#vno-backstage-btn-print-now");
      btn?.addEventListener("click", () => {
        closeModal();
        globalCommandBus.execute("common.file.print");
      });
      return () => { container.innerHTML = ""; };
    }

    const printResult = provider.computePages();
    const totalPages = (printResult?.pages?.length) || printResult?.totalPages || 1;
    let currentPreviewIndex = 0;

    const infoList = provider.getInfo ? provider.getInfo(printResult) : [];
    const infoRowsHtml = infoList.map(item => `
      <div class="vno-backstage-print-info-row">
        <span class="vno-backstage-print-info-label">${item.label}</span>
        <span class="vno-backstage-print-info-val">${item.val}</span>
      </div>
    `).join("");

    container.innerHTML = `
      <div class="vno-backstage-print-panel" role="region" aria-label="Bản xem trước khi in và điều khiển">
        <div class="vno-backstage-print-controls">
          <button type="button" class="vno-btn vno-btn-primary vno-backstage-print-now-btn" id="vno-backstage-btn-print-now" aria-label="${t("backstage.printNow", "In ngay")}">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true" style="margin-right:8px;"><rect x="6" y="2" width="12" height="6" rx="1" fill="#E2E8F0" stroke="#475569" stroke-width="1.2"/><rect x="3" y="7" width="18" height="10" rx="2" fill="#0F4C81"/><rect x="6" y="13" width="12" height="8" rx="1" fill="#FFFFFF" stroke="#475569" stroke-width="1.2"/><line x1="8" y1="16" x2="16" y2="16" stroke="#94A3B8" stroke-width="1.2"/><line x1="8" y1="18" x2="14" y2="18" stroke="#94A3B8" stroke-width="1.2"/><circle cx="18" cy="10" r="1" fill="#10B981"/></svg>
            <span>${t("backstage.printNow", "In ngay")}</span>
          </button>

          <div class="vno-backstage-print-nav" id="vno-backstage-print-nav-controls" style="${totalPages <= 1 ? 'display: none;' : 'display: flex;'}">
            <button type="button" class="vno-backstage-print-prev-btn" id="vno-backstage-print-prev" title="${t("sheetDialogs.printPreview.prevPage", "Trang trước")}" aria-label="${t("sheetDialogs.printPreview.prevPage", "Trang trước")}" disabled>
              ◀ ${t("sheetDialogs.printPreview.prevPage", "Trang trước")}
            </button>
            <div class="vno-backstage-print-page-indicator" aria-live="polite">
              Trang <span id="vno-backstage-print-current-page">1</span> / <span id="vno-backstage-print-total-pages">${totalPages}</span>
            </div>
            <button type="button" class="vno-backstage-print-next-btn" id="vno-backstage-print-next" title="${t("sheetDialogs.printPreview.nextPage", "Trang sau")}" aria-label="${t("sheetDialogs.printPreview.nextPage", "Trang sau")}" ${totalPages <= 1 ? 'disabled' : ''}>
              ${t("sheetDialogs.printPreview.nextPage", "Trang sau")} ▶
            </button>
          </div>

          <div class="vno-backstage-print-info">
            <div class="vno-backstage-print-info-title">Thiết lập bản in</div>
            <div class="vno-backstage-print-info-row">
              <span class="vno-backstage-print-info-label">Tài liệu</span>
              <span class="vno-backstage-print-info-val">${this.documentName}</span>
            </div>
            ${infoRowsHtml}
          </div>
        </div>

        <div class="vno-backstage-print-preview-viewport" id="vno-backstage-print-viewport" role="region" aria-label="Khung xem trước trang in">
          <div class="vno-backstage-print-stage" id="vno-backstage-print-stage"></div>
        </div>
      </div>
    `;

    const printNowBtn = container.querySelector("#vno-backstage-btn-print-now");
    const prevBtn = container.querySelector("#vno-backstage-print-prev");
    const nextBtn = container.querySelector("#vno-backstage-print-next");
    const curPageEl = container.querySelector("#vno-backstage-print-current-page");
    const stage = container.querySelector("#vno-backstage-print-stage");

    const renderPage = (index) => {
      currentPreviewIndex = Math.max(0, Math.min(totalPages - 1, index));
      if (curPageEl) curPageEl.textContent = String(currentPreviewIndex + 1);
      if (prevBtn) prevBtn.disabled = currentPreviewIndex <= 0;
      if (nextBtn) nextBtn.disabled = currentPreviewIndex >= totalPages - 1;

      if (stage) {
        stage.innerHTML = "";
        const pageEl = provider.renderPage(printResult, currentPreviewIndex);
        if (pageEl) stage.appendChild(pageEl);
      }
    };

    const onPrintNowClick = () => {
      closeModal();
      globalCommandBus.execute("common.file.print");
    };

    const onPrevClick = () => {
      if (currentPreviewIndex > 0) {
        renderPage(currentPreviewIndex - 1);
      }
    };

    const onNextClick = () => {
      if (currentPreviewIndex < totalPages - 1) {
        renderPage(currentPreviewIndex + 1);
      }
    };

    printNowBtn?.addEventListener("click", onPrintNowClick);
    prevBtn?.addEventListener("click", onPrevClick);
    nextBtn?.addEventListener("click", onNextClick);

    renderPage(0);

    return () => {
      printNowBtn?.removeEventListener("click", onPrintNowClick);
      prevBtn?.removeEventListener("click", onPrevClick);
      nextBtn?.removeEventListener("click", onNextClick);
      if (stage) stage.innerHTML = "";
      container.innerHTML = "";
    };
  }

  _renderBackstageExportPanel(container, closeModal) {
    container.innerHTML = "";

    let formats = [];
    if (this.appName === "sheet") {
      formats = [
        { id: "xlsx", label: t("backstage.format.xlsx", "Sổ làm việc (*.xlsx)"), badge: "XLSX", desc: t("backstage.format.xlsxDesc", "Định dạng bảng tính tiêu chuẩn mới nhất, giữ đầy đủ công thức, định dạng có điều kiện và biểu đồ.") },
        { id: "xls", label: t("backstage.format.xls", "Sổ làm việc 97-2003 (*.xls)"), badge: "XLS", desc: t("backstage.format.xlsDesc", "Tương thích các phiên bản cũ, giữ cấu trúc ô và dữ liệu cơ bản.") },
        { id: "ods", label: t("backstage.format.ods", "Bảng tính OpenDocument (*.ods)"), badge: "ODS", desc: t("backstage.format.odsDesc", "Định dạng mã nguồn mở quốc tế, hiển thị chuẩn xác trên các bộ ứng dụng văn phòng.") },
        { id: "csv", label: t("backstage.format.csv", "Bảng dữ liệu CSV UTF-8 (*.csv)"), badge: "CSV", desc: t("backstage.format.csvDesc", "Chỉ lưu trang tính hiện hành dưới dạng văn bản phân tách bằng dấu phẩy, dùng để trao đổi dữ liệu.") }
      ];
    } else if (this.appName === "slides") {
      formats = [
        { id: "pptx", label: t("backstage.format.pptx", "Bản trình chiếu (*.pptx)"), badge: "PPTX", desc: t("backstage.format.pptxDesc", "Định dạng trình chiếu hiện đại, bảo toàn bố cục trang chiếu, hiệu ứng và hình dạng vẽ.") },
        { id: "ppt", label: t("backstage.format.ppt", "Bản trình chiếu 97-2003 (*.ppt)"), badge: "PPT", desc: t("backstage.format.pptDesc", "Tương thích các phiên bản cũ, bảo toàn văn bản và hình ảnh chính.") },
        { id: "odp", label: t("backstage.format.odp", "Bản trình chiếu OpenDocument (*.odp)"), badge: "ODP", desc: t("backstage.format.odpDesc", "Định dạng trình chiếu chuẩn mở quốc tế.") }
      ];
    } else {
      formats = [
        { id: "docx", label: t("backstage.format.docx", "Tài liệu (*.docx)"), badge: "DOCX", desc: t("backstage.format.docxDesc", "Định dạng văn bản chuẩn hiện đại, bảo toàn toàn bộ bố cục trang, bảng biểu và phông chữ.") },
        { id: "doc", label: t("backstage.format.doc", "Tài liệu 97-2003 (*.doc)"), badge: "DOC", desc: t("backstage.format.docDesc", "Tương thích các hệ thống cũ, giữ nội dung văn bản và định dạng cơ bản.") },
        { id: "odt", label: t("backstage.format.odt", "Văn bản OpenDocument (*.odt)"), badge: "ODT", desc: t("backstage.format.odtDesc", "Định dạng văn bản chuẩn mở quốc tế ISO/IEC.") },
        { id: "rtf", label: t("backstage.format.rtf", "Văn bản RTF có định dạng (*.rtf)"), badge: "RTF", desc: t("backstage.format.rtfDesc", "Định dạng văn bản phong phú có thể mở trên nhiều hệ thống khác nhau.") },
        { id: "txt", label: t("backstage.format.txt", "Văn bản thuần túy (*.txt)"), badge: "TXT", desc: t("backstage.format.txtDesc", "Chỉ lưu nội dung chữ không kèm định dạng phông hay màu sắc.") },
        { id: "html", label: t("backstage.format.html", "Trang web (*.html)"), badge: "HTML", desc: t("backstage.format.htmlDesc", "Định dạng trang web tiêu chuẩn mở, dễ dàng xem trực tiếp trên mọi trình duyệt web.") }
      ];
    }

    const formatsHtml = formats.map(f => `
      <div class="vno-export-card" role="button" tabindex="0" data-export-format="${f.id}" id="vno-export-card-${f.id}" aria-label="${f.label}">
        <div class="vno-export-card-header">
          <span class="vno-export-card-badge vno-badge-${f.id}">${f.badge}</span>
          <h3 class="vno-export-card-title">${f.label}</h3>
        </div>
        <p class="vno-export-card-desc">${f.desc}</p>
      </div>
    `).join("");

    container.innerHTML = `
      <div class="vno-export-panel">
        <div class="vno-export-header">
          <h2 class="vno-export-title">${t("backstage.exportConvert", "Xuất & Chuyển đổi")}</h2>
          <p class="vno-export-desc">${t("backstage.exportConvertDesc", "Xuất tài liệu sang PDF hoặc chuyển đổi sang các định dạng Office/tiêu chuẩn mở khác mà bố cục và định dạng được giữ nguyên.")}</p>
        </div>

        <div class="vno-export-options-box">
          <div class="vno-export-options-title">${t("backstage.optionsGroup", "Tùy chọn chuyển đổi")}</div>
          <label class="vno-export-checkbox-label">
            <input type="checkbox" id="vno-export-compat-checkbox" checked>
            <span>${t("backstage.officeCompatOption", "Tương thích Office (khuyên dùng)")}</span>
          </label>
          <div class="vno-export-option-hint">${t("backstage.officeCompatHint", "Tối ưu hóa các bảng thuộc tính, kiểu dáng và phông chữ để tài liệu mở bằng Office hiển thị chuẩn xác nhất.")}</div>
        </div>

        <div class="vno-export-loading" id="vno-export-loading" style="display:none;" aria-live="polite">
          <div class="vno-export-spinner" aria-hidden="true"></div>
          <span class="vno-export-loading-text">${t("backstage.exportingStatus", "Đang xuất tệp...")}</span>
        </div>

        <div class="vno-export-success-banner" id="vno-export-success-banner" style="display:none;" role="region" aria-label="${t("backstage.exportSuccess", "Xuất tệp thành công!")}">
          <div class="vno-export-success-title">
            <svg class="vno-export-success-icon" viewBox="0 0 20 20" fill="currentColor" width="20" height="20" aria-hidden="true"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
            <span>${t("backstage.exportSuccess", "Xuất tệp thành công!")}</span>
          </div>
          <div class="vno-export-success-path">
            <span>${t("backstage.exportSuccessPath", "Đã lưu tại:")}</span>
            <code id="vno-export-result-path"></code>
          </div>
          <div class="vno-export-success-actions">
            <button type="button" class="vno-btn vno-btn-primary" id="vno-export-open-folder-btn">
              <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true" style="margin-right:6px;"><path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/></svg>
              <span>${t("backstage.openFolder", "Mở thư mục chứa tệp")}</span>
            </button>
          </div>
        </div>

        <div class="vno-export-section">
          <div class="vno-export-section-title">${t("backstage.exportPdfGroup", "Xuất tệp PDF tiêu chuẩn")}</div>
          <p class="vno-export-section-desc">${t("backstage.exportPdfDesc", "Tạo bản sao PDF giữ nguyên 100% bố cục trang, font chữ và hình ảnh, thích hợp để chia sẻ và in ấn.")}</p>
          <div class="vno-export-grid">
            <div class="vno-export-card" role="button" tabindex="0" data-export-format="pdf" id="vno-export-card-pdf" aria-label="${t("backstage.format.pdf", "Tài liệu PDF (*.pdf)")}">
              <div class="vno-export-card-header">
                <span class="vno-export-card-badge vno-badge-pdf">PDF</span>
                <h3 class="vno-export-card-title">${t("backstage.format.pdf", "Tài liệu PDF (*.pdf)")}</h3>
              </div>
              <p class="vno-export-card-desc">${t("backstage.format.pdfDesc", "Giữ nguyên 100% bố cục trang, phông chữ và hình ảnh để in ấn và gửi đối tác.")}</p>
            </div>
          </div>
        </div>

        <div class="vno-export-section">
          <div class="vno-export-section-title">${t("backstage.convertGroup", "Chuyển đổi định dạng tệp")}</div>
          <div class="vno-export-grid">
            ${formatsHtml}
          </div>
        </div>
      </div>
    `;

    const loadingEl = container.querySelector("#vno-export-loading");
    const successBannerEl = container.querySelector("#vno-export-success-banner");
    const resultPathEl = container.querySelector("#vno-export-result-path");
    const openFolderBtn = container.querySelector("#vno-export-open-folder-btn");
    const compatCheckbox = container.querySelector("#vno-export-compat-checkbox");
    const cards = container.querySelectorAll(".vno-export-card");

    let isBusy = false;
    let lastExportedPath = "";

    const onOpenFolderClick = () => {
      if (lastExportedPath) {
        this.openContainingFolder(lastExportedPath);
      }
    };
    openFolderBtn?.addEventListener("click", onOpenFolderClick);

    const runExport = async (format) => {
      if (isBusy) return;
      isBusy = true;
      if (loadingEl) loadingEl.style.display = "flex";
      if (successBannerEl) successBannerEl.style.display = "none";
      cards.forEach(c => c.classList.add("vno-export-card-disabled"));

      try {
        const officeCompatibility = Boolean(compatCheckbox?.checked);
        const result = await this.exportDocument(format, { officeCompatibility });

        if (result && result.status === "ok") {
          lastExportedPath = result.path || result.fileName || "";
          if (resultPathEl) resultPathEl.textContent = lastExportedPath;
          if (successBannerEl) {
            successBannerEl.style.display = "block";
            successBannerEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
          }
          this.setStatus?.(`${t("backstage.exportSuccess", "Xuất tệp thành công!")}: ${lastExportedPath.split(/[/\\]/).pop() || lastExportedPath}`);
        } else if (result && result.status === "cancelled") {
          // Người dùng hủy chọn tệp trong hộp thoại lưu, không báo lỗi
        } else {
          const errMsg = (result && result.message) ? result.message : t("backstage.exportFailed", "Không thể xuất tệp");
          await showAlertDialog({
            title: t("backstage.exportFailed", "Không thể xuất tệp"),
            message: errMsg,
            type: "error"
          });
        }
      } catch (err) {
        await showAlertDialog({
          title: t("backstage.exportFailed", "Không thể xuất tệp"),
          message: err?.message || String(err),
          type: "error"
        });
      } finally {
        isBusy = false;
        if (loadingEl) loadingEl.style.display = "none";
        cards.forEach(c => c.classList.remove("vno-export-card-disabled"));
      }
    };

    const cardHandlers = [];
    cards.forEach(card => {
      const format = card.getAttribute("data-export-format");
      const onClick = () => runExport(format);
      const onKeyDown = (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          runExport(format);
        }
      };
      card.addEventListener("click", onClick);
      card.addEventListener("keydown", onKeyDown);
      cardHandlers.push({ card, onClick, onKeyDown });
    });

    return () => {
      openFolderBtn?.removeEventListener("click", onOpenFolderClick);
      cardHandlers.forEach(({ card, onClick, onKeyDown }) => {
        card.removeEventListener("click", onClick);
        card.removeEventListener("keydown", onKeyDown);
      });
      container.innerHTML = "";
    };
  }

  _renderBackstageInfoPanel(container, closeModal) {
    const adapter = this.adapter || globalUnoBridge?.activeDocument;
    const isSheet = this.appName === "sheet";
    const props = adapter?.documentProperties || {};
    const wordStats = adapter?.getWordCountStats ? adapter.getWordCountStats() : (adapter?.getWordCount ? adapter.getWordCount() : { words: 0, characters: 0 });
    const pageCount = adapter?.getPageCount ? adapter.getPageCount() : (isSheet ? (adapter?.grid?.sheets?.length || 1) : 1);
    const isFinal = Boolean(adapter?.isFinal || (props?.contentStatus && String(props.contentStatus).toLowerCase() === "final"));

    const fileName = this.documentName || adapter?.sourceFileName || (isSheet ? "Bảng tính" : "Tài liệu");
    const author = props.creator || props.author || "Chưa đặt";
    const title = props.title || (isSheet ? (props.title || "Chưa đặt") : (fileName || "Chưa đặt"));
    const subject = props.subject || "Chưa đặt";
    const manager = props.manager || "Chưa đặt";
    const company = props.company || "Chưa đặt";
    const keywords = props.keywords || "Chưa đặt";
    const comments = props.description || props.comments || "Chưa đặt";
    const modifiedDate = props.modified ? new Date(props.modified).toLocaleString("vi-VN") : "Hôm nay";
    const createdDate = props.created ? new Date(props.created).toLocaleString("vi-VN") : "Hôm nay";
    const words = wordStats.words || 0;

    let fileSizeStr = "Chưa lưu";
    if (adapter?._sourcePath || adapter?.sourceFilePath) {
      fileSizeStr = "Đã lưu trên máy";
    }

    container.innerHTML = `
      <div class="vno-backstage-info-panel" role="region" aria-label="Thông tin tài liệu">
        <h1 style="font-size:24px;font-weight:700;margin-bottom:8px;color:var(--vno-text-primary);">${isSheet ? t("sheetDocumentProperties.backstage", "Thông tin") : t("writerDocumentProperties.backstage", "Thông tin tài liệu")}</h1>
        <p style="color:var(--vno-text-muted);font-size:13px;margin-bottom:24px;">${isSheet ? "Xem thuộc tính, số trang tính và thiết lập trạng thái bảo vệ cho sổ làm việc đang mở." : "Xem thuộc tính, thống kê và thiết lập trạng thái bảo vệ cho tài liệu đang mở."}</p>

        <div class="vno-backstage-info-grid" style="display:grid;grid-template-columns:1fr 320px;gap:32px;">
          <!-- Cột trái: Quản lý & Bảo vệ -->
          <div class="vno-backstage-info-main" style="display:flex;flex-direction:column;gap:20px;">
            <div class="vno-info-card" style="border:1px solid var(--vno-border-default);border-radius:var(--vno-radius-md, 8px);padding:20px;background:var(--vno-bg-window);">
              <div style="display:flex;align-items:flex-start;gap:16px;">
                <div style="width:48px;height:48px;border-radius:8px;background:rgba(234,179,8,0.15);color:#ca8a04;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                  <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                </div>
                <div style="flex:1;">
                  <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px;">
                    <h2 style="font-size:16px;font-weight:700;margin:0;color:var(--vno-text-primary);">${isSheet ? t("sheetDocumentProperties.protectWorkbook", "Bảo vệ sổ làm việc") : t("writerDocumentProperties.protectDocument", "Bảo vệ tài liệu")}</h2>
                    <span id="vno-info-final-status" class="vno-info-status-badge" style="font-size:11px;padding:2px 8px;border-radius:12px;font-weight:600;${isFinal ? "background:#fef3c7;color:#92400e;border:1px solid #fde68a;" : "background:var(--vno-bg-subtle);color:var(--vno-text-muted);border:1px solid var(--vno-border-default);"}">
                      ${isFinal ? (isSheet ? t("sheetDocumentProperties.statusFinal", "ĐÃ ĐÁNH DẤU LÀ CUỐI CÙNG") : t("writerDocumentProperties.statusFinal", "ĐÃ ĐÁNH DẤU LÀ CUỐI CÙNG")) : (isSheet ? t("sheetDocumentProperties.statusEditable", "Cho phép chỉnh sửa") : t("writerDocumentProperties.statusEditable", "Cho phép chỉnh sửa"))}
                    </span>
                  </div>
                  <p style="font-size:12px;color:var(--vno-text-muted);margin:0 0 16px 0;line-height:1.5;">
                    ${isFinal 
                      ? (isSheet ? t("sheetDocumentProperties.finalDescActive", "Tác giả đã đánh dấu sổ làm việc này là bản hoàn chỉnh để ngăn chặn việc chỉnh sửa vô ý. Bảng tính đang ở chế độ chỉ đọc mềm.") : t("writerDocumentProperties.finalDescActive", "Tác giả đã đánh dấu tài liệu này là bản hoàn chỉnh để ngăn chặn việc chỉnh sửa vô ý. Tài liệu đang ở chế độ chỉ đọc mềm."))
                      : (isSheet ? t("sheetDocumentProperties.finalDescInactive", "Cho người đọc biết sổ làm việc đã hoàn tất và đặt chế độ chỉ đọc để ngăn chặn chỉnh sửa vô ý trước khi chia sẻ.") : t("writerDocumentProperties.finalDescInactive", "Cho người đọc biết tài liệu đã hoàn tất và đặt chế độ chỉ đọc để ngăn chặn chỉnh sửa vô ý trước khi chia sẻ."))}
                  </p>
                  <button type="button" class="vno-btn ${isFinal ? "vno-btn-secondary" : "vno-btn-primary"}" id="vno-info-mark-as-final" style="padding:7px 16px;font-weight:600;">
                    ${isFinal ? (isSheet ? t("sheetDocumentProperties.unmarkFinal", "Gỡ đánh dấu cuối cùng") : t("writerDocumentProperties.unmarkFinal", "Gỡ đánh dấu cuối cùng")) : (isSheet ? t("sheetDocumentProperties.markAsFinal", "Đánh dấu là cuối cùng") : t("writerDocumentProperties.markAsFinal", "Đánh dấu là cuối cùng"))}
                  </button>
                </div>
              </div>
            </div>

            <div class="vno-info-card" style="border:1px solid var(--vno-border-default);border-radius:var(--vno-radius-md, 8px);padding:20px;background:var(--vno-bg-window);">
              <div style="display:flex;align-items:flex-start;gap:16px;">
                <div style="width:48px;height:48px;border-radius:8px;background:rgba(59,130,246,0.12);color:#2563eb;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                  <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                </div>
                <div style="flex:1;">
                  <h2 style="font-size:16px;font-weight:700;margin:0 0 4px 0;color:var(--vno-text-primary);">${t("writerDocumentProperties.inspectTitle", "Kiểm tra tài liệu")}</h2>
                  <p style="font-size:12px;color:var(--vno-text-muted);margin:0 0 16px 0;line-height:1.5;">
                    Kiểm tra các thuộc tính ẩn, thông tin cá nhân và đánh dấu sửa đổi trước khi xuất bản hoặc gửi tài liệu.
                  </p>
                  <button type="button" class="vno-btn" id="vno-info-inspect-document" style="padding:7px 16px;">
                    ${t("writerDocumentProperties.inspectBtn", "Kiểm tra tài liệu…")}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Cột phải: Bảng thuộc tính (Properties) -->
          <div class="vno-backstage-info-sidebar" style="border:1px solid var(--vno-border-default);border-radius:var(--vno-radius-md, 8px);padding:20px;background:var(--vno-bg-window);">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;padding-bottom:10px;border-bottom:1px solid var(--vno-border-default);">
              <h2 style="font-size:15px;font-weight:700;margin:0;color:var(--vno-text-primary);">${isSheet ? t("sheetDocumentProperties.propertiesTitle", "Thuộc tính") : t("writerDocumentProperties.propertiesTitle", "Thuộc tính")}</h2>
              <button type="button" class="vno-btn" id="vno-info-edit-properties" style="font-size:11px;padding:3px 8px;">
                ${isSheet ? t("sheetDocumentProperties.editPropertiesBtn", "Chỉnh sửa…") : t("writerDocumentProperties.editPropertiesBtn", "Chỉnh sửa…")}
              </button>
            </div>

            <div class="vno-info-prop-row" style="display:flex;justify-content:space-between;padding:6px 0;font-size:12px;border-bottom:1px solid var(--vno-border-subtle, #f1f5f9);">
              <span style="color:var(--vno-text-muted);">${t("writerDocumentProperties.size", "Kích thước")}:</span>
              <span id="vno-info-prop-size" style="font-weight:600;color:var(--vno-text-primary);">${fileSizeStr}</span>
            </div>
            <div class="vno-info-prop-row" style="display:flex;justify-content:space-between;padding:6px 0;font-size:12px;border-bottom:1px solid var(--vno-border-subtle, #f1f5f9);">
              <span style="color:var(--vno-text-muted);">${isSheet ? t("sheetDocumentProperties.sheets", "Số trang tính") : t("writerDocumentProperties.pages", "Số trang")}:</span>
              <span id="vno-info-prop-pages" style="font-weight:600;color:var(--vno-text-primary);">${pageCount}</span>
            </div>
            ${!isSheet ? `
            <div class="vno-info-prop-row" style="display:flex;justify-content:space-between;padding:6px 0;font-size:12px;border-bottom:1px solid var(--vno-border-subtle, #f1f5f9);">
              <span style="color:var(--vno-text-muted);">${t("writerDocumentProperties.words", "Số từ")}:</span>
              <span id="vno-info-prop-words" style="font-weight:600;color:var(--vno-text-primary);">${words}</span>
            </div>` : ""}
            <div class="vno-info-prop-row" style="display:flex;justify-content:space-between;padding:6px 0;font-size:12px;border-bottom:1px solid var(--vno-border-subtle, #f1f5f9);">
              <span style="color:var(--vno-text-muted);">${isSheet ? t("sheetDocumentProperties.title", "Tiêu đề") : t("writerDocumentProperties.title", "Tiêu đề")}:</span>
              <span id="vno-info-prop-title" style="font-weight:600;color:var(--vno-text-primary);text-align:right;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${title}">${title}</span>
            </div>
            <div class="vno-info-prop-row" style="display:flex;justify-content:space-between;padding:6px 0;font-size:12px;border-bottom:1px solid var(--vno-border-subtle, #f1f5f9);">
              <span style="color:var(--vno-text-muted);">${isSheet ? t("sheetDocumentProperties.subject", "Chủ đề") : t("writerDocumentProperties.subject", "Chủ đề")}:</span>
              <span id="vno-info-prop-subject" style="font-weight:600;color:var(--vno-text-primary);text-align:right;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${subject}">${subject}</span>
            </div>
            <div class="vno-info-prop-row" style="display:flex;justify-content:space-between;padding:6px 0;font-size:12px;border-bottom:1px solid var(--vno-border-subtle, #f1f5f9);">
              <span style="color:var(--vno-text-muted);">${isSheet ? t("sheetDocumentProperties.author", "Tác giả") : t("writerDocumentProperties.author", "Tác giả")}:</span>
              <span id="vno-info-prop-author" style="font-weight:600;color:var(--vno-text-primary);text-align:right;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${author}">${author}</span>
            </div>
            <div class="vno-info-prop-row" style="display:flex;justify-content:space-between;padding:6px 0;font-size:12px;border-bottom:1px solid var(--vno-border-subtle, #f1f5f9);">
              <span style="color:var(--vno-text-muted);">${isSheet ? t("sheetDocumentProperties.manager", "Quản lý") : "Quản lý"}:</span>
              <span id="vno-info-prop-manager" style="font-weight:600;color:var(--vno-text-primary);text-align:right;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${manager}">${manager}</span>
            </div>
            <div class="vno-info-prop-row" style="display:flex;justify-content:space-between;padding:6px 0;font-size:12px;border-bottom:1px solid var(--vno-border-subtle, #f1f5f9);">
              <span style="color:var(--vno-text-muted);">${isSheet ? t("sheetDocumentProperties.company", "Công ty") : "Công ty"}:</span>
              <span id="vno-info-prop-company" style="font-weight:600;color:var(--vno-text-primary);text-align:right;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${company}">${company}</span>
            </div>
            <div class="vno-info-prop-row" style="display:flex;justify-content:space-between;padding:6px 0;font-size:12px;border-bottom:1px solid var(--vno-border-subtle, #f1f5f9);">
              <span style="color:var(--vno-text-muted);">${isSheet ? t("sheetDocumentProperties.keywords", "Thẻ") : t("writerDocumentProperties.keywords", "Từ khóa")}:</span>
              <span id="vno-info-prop-keywords" style="font-weight:600;color:var(--vno-text-primary);text-align:right;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${keywords}">${keywords}</span>
            </div>
            <div class="vno-info-prop-row" style="display:flex;justify-content:space-between;padding:6px 0;font-size:12px;border-bottom:1px solid var(--vno-border-subtle, #f1f5f9);">
              <span style="color:var(--vno-text-muted);">${isSheet ? t("sheetDocumentProperties.comments", "Ghi chú") : t("writerDocumentProperties.description", "Ghi chú")}:</span>
              <span id="vno-info-prop-comments" style="font-weight:600;color:var(--vno-text-primary);text-align:right;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${comments}">${comments}</span>
            </div>
            <div class="vno-info-prop-row" style="display:flex;justify-content:space-between;padding:6px 0;font-size:12px;border-bottom:1px solid var(--vno-border-subtle, #f1f5f9);">
              <span style="color:var(--vno-text-muted);">${t("writerDocumentProperties.modified", "Ngày sửa đổi")}:</span>
              <span id="vno-info-prop-modified" style="font-weight:600;color:var(--vno-text-primary);">${modifiedDate}</span>
            </div>
            <div class="vno-info-prop-row" style="display:flex;justify-content:space-between;padding:6px 0;font-size:12px;">
              <span style="color:var(--vno-text-muted);">${t("writerDocumentProperties.created", "Ngày tạo")}:</span>
              <span id="vno-info-prop-created" style="font-weight:600;color:var(--vno-text-primary);">${createdDate}</span>
            </div>
          </div>
        </div>
      </div>
    `;

    const markBtn = container.querySelector("#vno-info-mark-as-final");
    const editPropsBtn = container.querySelector("#vno-info-edit-properties");
    const inspectBtn = container.querySelector("#vno-info-inspect-document");

    const onMarkClick = () => {
      const currentFinal = Boolean(adapter?.isFinal || (adapter?.documentProperties?.contentStatus && String(adapter.documentProperties.contentStatus).toLowerCase() === "final"));
      if (adapter?.markAsFinal) {
        adapter.markAsFinal(!currentFinal);
      }
      closeModal();
    };

    const onEditPropsClick = async () => {
      closeModal();
      if (adapter?.openDocumentPropertiesDialog) {
        await adapter.openDocumentPropertiesDialog();
      } else if (this.appName === "sheet") {
        globalCommandBus.execute("sheet.file.properties");
      } else {
        globalCommandBus.execute("writer.file.properties");
      }
    };

    const onInspectClick = async () => {
      closeModal();
      if (adapter?.openDocumentInspectorDialog) {
        await adapter.openDocumentInspectorDialog();
      } else {
        globalCommandBus.execute("writer.file.inspectDocument");
      }
    };

    markBtn?.addEventListener("click", onMarkClick);
    editPropsBtn?.addEventListener("click", onEditPropsClick);
    inspectBtn?.addEventListener("click", onInspectClick);

    return () => {
      markBtn?.removeEventListener("click", onMarkClick);
      editPropsBtn?.removeEventListener("click", onEditPropsClick);
      inspectBtn?.removeEventListener("click", onInspectClick);
      container.innerHTML = "";
    };
  }

  async exportDocument(targetFormat, options = {}) {
    const format = String(targetFormat || "").toLowerCase();
    const appKind = this.appName || "writer";

    if (format === "pdf") {
      let content = "";
      if (appKind === "sheet") {
        content = this.adapter?.serializeToFods ? this.adapter.serializeToFods() : (this.grid?.serializeToFods ? this.grid.serializeToFods() : "");
      } else if (appKind === "slides") {
        content = this.adapter?.serializeToFodp ? this.adapter.serializeToFodp() : (this.canvas?.serializeToFodp ? this.canvas.serializeToFodp() : "");
      } else {
        content = this.adapter?._contentForExport ? this.adapter._contentForExport({ acceptedView: true }) : (this.adapter?.editorDom?.innerHTML || "");
      }

      const currentName = this.adapter?.sourceFileName || this.sourceFileName || (this.documentName ? this.documentName.replace(/\.[^/.]+$/, "") : (appKind === "sheet" ? "BangTinh" : appKind === "slides" ? "BanTrinhChieu" : "TaiLieu"));
      const sourcePath = this.adapter?._sourcePath || this.adapter?.sourceFilePath || null;

      return await globalUnoBridge.exportRealPdf(appKind, content, currentName, sourcePath);
    }

    const validFormatsByApp = {
      writer: ["docx", "doc", "odt", "rtf", "txt", "html"],
      sheet: ["xlsx", "xls", "ods", "csv"],
      slides: ["pptx", "ppt", "odp"]
    };

    const allowed = validFormatsByApp[appKind] || validFormatsByApp.writer;
    if (!allowed.includes(format)) {
      return {
        status: "error",
        message: `${t("backstage.unsupportedFormat", "Định dạng không được hỗ trợ")}: .${format}`
      };
    }

    let content = "";
    if (appKind === "sheet") {
      if (this.adapter?._guardQuickViewReadOnly?.()) return { status: "cancelled" };
      content = this.adapter?.serializeToFods ? this.adapter.serializeToFods() : "";
    } else if (appKind === "slides") {
      content = this.adapter?.serializeToFodp ? this.adapter.serializeToFodp() : "";
    } else {
      content = this.adapter?._contentForExport ? this.adapter._contentForExport() : (this.adapter?.editorDom?.innerHTML || "");
    }

    const currentName = this.adapter?.sourceFileName || this.sourceFileName || (this.documentName ? this.documentName.replace(/\.[^/.]+$/, "") : (appKind === "sheet" ? "BangTinh" : appKind === "slides" ? "BanTrinhChieu" : "TaiLieu"));
    const sourcePath = this.adapter?._sourcePath || this.adapter?.sourceFilePath || null;
    const suggestedName = `${currentName}.${format}`;

    return await globalUnoBridge.saveRealFile(appKind, content, format, suggestedName, sourcePath);
  }

  async openContainingFolder(filePath) {
    if (!filePath) return;
    const api = globalUnoBridge.desktopApi || (typeof window !== "undefined" ? window.pywebview?.api : null);
    if (typeof api?.open_containing_folder === "function") {
      try {
        const res = await api.open_containing_folder(filePath);
        if (res && res.status === "ok") return res;
      } catch (err) {
        console.warn("[AppShell] Không thể mở thư mục qua bridge:", err);
      }
    }

    await showAlertDialog({
      title: t("backstage.openFolder", "Mở thư mục chứa tệp"),
      message: `${t("backstage.exportSuccessPath", "Đã lưu tại:")}\n${filePath}\n\n(Chức năng mở trực tiếp thư mục chưa được backend hỗ trợ; bạn có thể mở đường dẫn trên từ trình quản lý tệp).`,
      type: "info"
    });
  }

  async applyTemplate(templateId) {
    if (templateId === "blank") {
      return await globalCommandBus.execute("common.file.new");
    }

    // Nội dung mẫu thuộc app tương ứng; Shared Platform chỉ điều phối callback,
    // không biết hay gọi trực tiếp implementation riêng của Writer/Sheet/Slides.
    if (this._onApplyTemplate) {
      const handled = await this._onApplyTemplate(templateId);
      if (handled !== false) return handled;
    }

    if (this.appName === "writer" && templateId === "admin_doc") {
      this.documentName = "Quyết định ban hành tiêu chuẩn 01.docx";
      const tabEl = this.rootEl.querySelector(".vno-doc-tab span");
      if (tabEl) tabEl.textContent = this.documentName;
      this._updateDocumentTitle();
    } else if (this.appName === "sheet" && templateId === "budget_estimate") {
      this.documentName = "Dự toán kinh phí 3T Office 2026.xlsx";
      const tabEl = this.rootEl.querySelector(".vno-doc-tab span");
      if (tabEl) tabEl.textContent = this.documentName;
      this._updateDocumentTitle();
    } else if (this.appName === "slides" && templateId === "presentation_outline") {
      this.documentName = "Báo cáo đề án phát triển 3T Office 2026.pptx";
      const tabEl = this.rootEl.querySelector(".vno-doc-tab span");
      if (tabEl) tabEl.textContent = this.documentName;
      this._updateDocumentTitle();
    }
    return true;
  }

  /**
   * Đưa khung chrome (tên tài liệu trên tab, tab ribbon đang chọn) về trạng thái tài
   * liệu mới trắng — dùng khi File > Mới/Đóng thật sự xóa nội dung nhưng KHÔNG được để
   * ribbon kẹt ở tab người dùng đang đứng trước đó hay giữ nguyên tên tệp mẫu cũ, khác
   * với hành vi thật của Word/LibreOffice (lỗi thật, người dùng phát hiện 04/09/2026).
   * @param {string} newDocumentName
   * @param {string} [homeTabId="home"]
   * @param {boolean} [recordRecent=true] - false cho tài liệu MỚI trắng (chưa
   *   từng lưu ra đĩa) — không phải "tệp gần đây" thật, không được ghi vào
   *   Recent Files (lỗi thật: File > Mới trước đó sẽ đẩy "Tài liệu 1.docx"
   *   giả lên đầu danh sách, đè lên tệp thật đã mở/lưu trước đó).
   */
  resetDocumentChrome(newDocumentName, homeTabId = "home", recordRecent = true, filePath = "") {
    this.clearNotification();
    this.documentName = newDocumentName;
    const tabEl = this.rootEl?.querySelector(".vno-doc-tab span");
    if (tabEl) tabEl.textContent = this.documentName;
    this._updateDocumentTitle();
    if (homeTabId) {
      this.ribbonHost?.selectTab(homeTabId);
    }
    if (this.appName && recordRecent && filePath) {
      RecentFilesManager.recordFile({ name: this.documentName, app: this.appName, path: filePath });
    }
  }

  _updateDocumentTitle() {
    const title = this.documentName ? `${this.documentName} — ${this.appTitle}` : this.appTitle;
    if (typeof document !== "undefined") document.title = title;
    globalUnoBridge.setWindowTitle(title).catch(() => false);
  }

  async confirmUnsavedChangesBeforeReplace() {
    if (!this.adapter?.isDirty) return true;
    const choice = await showUnsavedChangesDialog({
      title: "Lưu thay đổi?",
      message: "Tài liệu hiện tại có thay đổi chưa lưu. Bạn muốn lưu trước khi mở tệp khác không?"
    });
    if (choice === "discard") return true;
    if (choice !== "save") return false;
    return (await this.adapter.save()) === true;
  }

  async requestNewDocumentWindow() {
    const result = await globalUnoBridge.createNewDocumentWindow(this.appName);
    if (result?.status === "ok") return true;
    await showAlertDialog({
      title: "Không thể tạo tài liệu mới",
      message: result?.message || "3T Office không mở được cửa sổ tài liệu mới.",
      type: "error"
    });
    return false;
  }

  async requestCloseDocument() {
    if (this.adapter?.isDirty) {
      const choice = await showUnsavedChangesDialog({
        title: "Lưu thay đổi?",
        message: "Tài liệu hiện tại có thay đổi chưa lưu. Bạn muốn lưu trước khi đóng không?"
      });
      if (choice !== "save" && choice !== "discard") return false;
      if (choice === "save" && (await this.adapter.save()) !== true) return false;
    }
    const result = await globalUnoBridge.closeCurrentWindow();
    return result?.status === "ok";
  }

  _setupGlobalShortcuts() {
    globalShortcutManager.attach(window);

    // Thu gọn / mở rộng Ribbon (Ctrl+F1)
    // Lưu ý: dùng bindHandler() chứ không phải register() — các lệnh này đã được
    // đăng ký đầy đủ định nghĩa (label/icon/tooltip) qua registerAllStandardCommands()
    // trong platform/commands/command-definitions.js. Gọi lại register() ở đây sẽ
    // ghi đè state đã có bằng một def cụt (chỉ {id, handler}), khiến label thành
    // undefined trên mọi nút ribbon dùng lệnh này.
    globalCommandBus.bindHandler("common.view.ribbonToggle", () => {
      if (this.ribbonHost) {
        this.ribbonHost.isCollapsed = !this.ribbonHost.isCollapsed;
        this.ribbonHost.render();
      }
    });

    // Mở menu Tệp (Backstage) bằng phím tắt Alt+F
    globalCommandBus.bindHandler("common.file.backstage", () => {
      this.showBackstageMenu();
      return true;
    });

    // Mở trực tiếp mục Xuất và chuyển đổi trong Backstage
    globalCommandBus.bindHandler("common.file.exportConvert", () => {
      this.showBackstageMenu("export");
      return true;
    });

    // Thu phóng (Ctrl+0 đặt lại 100%, Ctrl+= / Ctrl++ phóng to, Ctrl+- thu nhỏ)
    globalCommandBus.bindHandler("common.view.zoomReset", () => {
      this.setZoom(100);
      return true;
    });
    globalCommandBus.bindHandler("common.view.zoomIn", () => {
      this.setZoom(this.zoomLevel + 10);
      return true;
    });
    globalCommandBus.bindHandler("common.view.zoomOut", () => {
      this.setZoom(this.zoomLevel - 10);
      return true;
    });

    // Mở hộp thoại Giới thiệu 3T Office
    globalCommandBus.bindHandler("common.help.about", () => {
      this._showAboutDialog();
      return true;
    });

    // Lắng nghe lệnh AI
    globalCommandBus.bindHandler("ai.assistant.toggle", () => {
      this.toggleAiSidebar();
    });
    globalCommandBus.bindHandler("ai.assistant.summarize", () => {
      this.triggerAiQuickAction("tóm tắt nội dung tài liệu hiện tại");
      return true;
    });
    globalCommandBus.bindHandler("ai.assistant.rewrite", () => {
      this.triggerAiQuickAction("trau chuốt văn phong đoạn văn hiện tại");
      return true;
    });
    globalCommandBus.bindHandler("ai.assistant.grammarCheck", () => {
      this.triggerAiQuickAction("soát lỗi chính tả tài liệu hiện tại");
      return true;
    });

    // Voice Input — Nhập liệu bằng giọng nói
    globalCommandBus.bindHandler("ai.voice.input", () => {
      this._handleVoiceInput();
      return true;
    });

    // Meeting Summary — Tóm tắt cuộc họp
    globalCommandBus.bindHandler("ai.assistant.summarizeMeeting", () => {
      this._handleMeetingSummary();
      return true;
    });

    // Smart Search — Tìm kiếm thông minh
    globalCommandBus.bindHandler("ai.assistant.smartSearch", () => {
      this._handleSmartSearch();
      return true;
    });

    // Translate — Dịch thuật
    globalCommandBus.bindHandler("ai.assistant.translate", () => {
      this._handleTranslate();
      return true;
    });

    // Draft Document — Viết nháp
    globalCommandBus.bindHandler("ai.assistant.draftDocument", () => {
      this._handleDraftDocument();
      return true;
    });

    // Macro: ghi/dừng ghi, quản lý, chạy (Ctrl+Shift+R bật/tắt ghi).
    globalCommandBus.bindHandler("common.macro.recordToggle", async () => {
      if (!globalMacroManager.isRecording()) {
        globalMacroManager.startRecording(this.appName);
        this.setStatus?.(t("macro.statusHint", "Đang ghi Macro... Bấm Ctrl+Shift+R để dừng."));
        globalCommandBus.updateState("common.macro.recordToggle", {
          checked: true,
          label: t("macro.stop", "Dừng ghi"),
          icon: "macroRecordStop"
        });
        this._setMacroRecordingState(true);
        return true;
      }
      const { app, steps } = globalMacroManager.stopRecording();
      globalCommandBus.updateState("common.macro.recordToggle", {
        checked: false,
        label: t("macro.record", "Ghi Macro"),
        icon: "macroRecordStart"
      });
      this._setMacroRecordingState(false);
      if (!steps.length) {
        await showAlertDialog({ title: t("macro.saveTitle", "Ghi Macro"), message: t("macro.noActionsNotice", "Không có thao tác nào được ghi lại — Macro không được lưu."), type: "warning" });
        return false;
      }
      const name = await showPromptDialog({ title: t("macro.saveTitle", "Lưu Macro"), message: t("macro.savePrompt", "Đặt tên cho Macro vừa ghi:"), defaultValue: `Macro ${new Date().toLocaleString("vi-VN")}` });
      if (name) {
        globalMacroManager.saveMacro(app, name, steps);
        this.setStatus?.(`${t("macro.savedNotice", "Đã lưu Macro")} "${name}" (${steps.length} thao tác).`);
      } else {
        this.setStatus?.(t("macro.emptyCancelled", "Đã hủy — Macro không được lưu."));
      }
      return false;
    });

    globalCommandBus.bindHandler("common.macro.manager", async () => {
      await showMacroManagerDialog({
        macros: globalMacroManager.getMacros(this.appName),
        onRun: async (id) => {
          try {
            const { executed, total } = await globalMacroManager.runMacro(id);
            this.setStatus?.(`Đã chạy Macro: ${executed}/${total} thao tác.`);
          } catch (err) {
            await showAlertDialog({ title: "Lỗi chạy Macro", message: `Macro dừng do lỗi: ${err?.message || err}`, type: "error" });
          }
        },
        onRename: (id, newName) => globalMacroManager.renameMacro(id, newName),
        onDelete: (id) => globalMacroManager.deleteMacro(id)
      });
    });
  }

  /** Nhập liệu bằng giọng nói — toggle bắt đầu/dừng */
  _handleVoiceInput() {
    if (!isVoiceInputSupported()) {
      showAlertDialog({
        title: "Nhập liệu bằng giọng nói",
        message: "Trình duyệt hiện tại không hỗ trợ nhận dạng giọng nói.\n\nVui lòng dùng trình duyệt có hỗ trợ nhận dạng giọng nói trên Windows để sử dụng tính năng này.",
        type: "warning"
      });
      return;
    }

    if (isVoiceInputActive()) {
      stopVoiceInput();
      this.setStatus?.("Đã dừng nhập liệu bằng giọng nói.");
      return;
    }

    startVoiceInput({
      lang: "vi-VN",
      onStatus: (msg) => this.setStatus?.(msg),
      onResult: (text) => {
        document.execCommand("insertText", false, text);
      },
      onEnd: () => {
        this.setStatus?.("Đã dừng nhập liệu bằng giọng nói.");
      },
      onError: (msg) => {
        showAlertDialog({
          title: "Lỗi nhập liệu giọng nói",
          message: msg,
          type: "error"
        });
      }
    });
  }

  /** Tóm tắt cuộc họp — mở hộp thoại nhập transcript, gọi AI, chèn kết quả */
  async _handleMeetingSummary() {
    const transcript = await showPromptDialog({
      title: "Tóm tắt cuộc họp",
      message: "Dán hoặc nhập nội dung ghi chép/transcript cuộc họp vào bên dưới. AI sẽ tóm tắt thành: Điểm chính, Quyết định, Việc cần làm.",
      placeholder: "Dán nội dung ghi chép cuộc họp tại đây...",
      defaultValue: "",
      confirmText: "Tóm tắt",
      cancelText: "Hủy"
    });

    if (!transcript || !transcript.trim()) return;

    this.setStatus?.("Đang tóm tắt cuộc họp...");
    this.toggleAiSidebar(true);

    const userMsg = document.createElement("div");
    userMsg.style.cssText = "background:var(--vno-bg-hover);border:1px solid var(--vno-border-default);padding:8px 12px;border-radius:var(--vno-radius-md);font-size:12px;margin-top:10px;line-height:1.5;";
    userMsg.innerHTML = `<strong>Bạn:</strong> Tóm tắt cuộc họp`;
    const messagesEl = this.aiSidebar.querySelector("#vno-ai-messages");
    if (messagesEl) messagesEl.appendChild(userMsg);

    const botMsg = document.createElement("div");
    botMsg.style.cssText = "background:#f0fdf4;border:1px solid #bbf7d0;padding:10px 12px;border-radius:var(--vno-radius-md);font-size:12px;line-height:1.5;margin-top:8px;";
    botMsg.innerHTML = `<span style="color:#16a34a;">Đang phân tích nội dung cuộc họp...</span>`;
    if (messagesEl) {
      messagesEl.appendChild(botMsg);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    try {
      const prompt = `Tóm tắt cuộc họp sau thành cấu trúc rõ ràng. YÊU CẦU BẮT BUỘC:\n1. **ĐIỂM CHÍNH**: Liệt kê các vấn đề chính được bàn luận\n2. **QUYẾT ĐỊNH**: Các quyết định đã được đưa ra\n3. **VIỆC CẦN LÀM**: Các action items, ghi rõ người phụ trách nếu có\n\nNội dung ghi chép cuộc họp:\n${transcript.trim()}`;
      const { LocalAiService } = await this._loadAiServices();
      const res = await LocalAiService.query(prompt, { documentText: transcript.trim(), appName: this.appName });

      botMsg.innerHTML = `<div style="font-weight:bold;color:#16a34a;margin-bottom:6px;">✨ Tóm tắt cuộc họp</div>`;
      const replyEl = document.createElement("div");
      replyEl.style.cssText = "white-space:pre-line;color:var(--vno-text-primary);";
      replyEl.textContent = res.reply;
      botMsg.appendChild(replyEl);

      const applyBtn = document.createElement("button");
      applyBtn.className = "vno-btn vno-btn-primary";
      applyBtn.style.cssText = "font-size:11px;padding:4px 10px;margin-top:8px;display:inline-block;";
      applyBtn.textContent = "Chèn vào tài liệu";
      applyBtn.addEventListener("click", () => {
        document.execCommand("insertText", false, "\n\n" + res.reply + "\n\n");
        applyBtn.textContent = "✓ Đã chèn";
        applyBtn.disabled = true;
      });
      botMsg.appendChild(applyBtn);

      this.setStatus?.("Đã tóm tắt cuộc họp.");
    } catch (error) {
      botMsg.textContent = `⚠️ Lỗi tóm tắt: ${error.message}`;
      this.setStatus?.("Lỗi tóm tắt cuộc họp.");
    }
    if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  /** Tìm kiếm thông minh — mở hộp thoại nhập câu hỏi, gọi AI, hiển thị kết quả */
  async _handleSmartSearch() {
    const question = await showPromptDialog({
      title: "Tìm kiếm thông minh",
      message: "Nhập câu hỏi tìm kiếm bằng ngôn ngữ tự nhiên. AI sẽ tìm trong nội dung tài liệu và hiển thị các đoạn liên quan.",
      placeholder: "Ví dụ: tìm đoạn nói về ngân sách quý 2...",
      defaultValue: "",
      confirmText: "Tìm kiếm",
      cancelText: "Hủy"
    });

    if (!question || !question.trim()) return;

    const docText = this.editorContainer.innerText || "";
    if (!docText.trim()) {
      await showAlertDialog({
        title: "Tìm kiếm thông minh",
        message: "Tài liệu hiện đang trống. Vui lòng mở hoặc soạn thảo nội dung trước khi tìm kiếm.",
        type: "warning"
      });
      return;
    }

    this.setStatus?.("Đang tìm kiếm thông minh...");
    this.toggleAiSidebar(true);

    const userMsg = document.createElement("div");
    userMsg.style.cssText = "background:var(--vno-bg-hover);border:1px solid var(--vno-border-default);padding:8px 12px;border-radius:var(--vno-radius-md);font-size:12px;margin-top:10px;line-height:1.5;";
    userMsg.innerHTML = `<strong>Bạn:</strong> ${question.replace(/</g, "&lt;").replace(/>/g, "&gt;")}`;
    const messagesEl = this.aiSidebar.querySelector("#vno-ai-messages");
    if (messagesEl) messagesEl.appendChild(userMsg);

    const botMsg = document.createElement("div");
    botMsg.style.cssText = "background:#eff6ff;border:1px solid #bfdbfe;padding:10px 12px;border-radius:var(--vno-radius-md);font-size:12px;line-height:1.5;margin-top:8px;";
    botMsg.innerHTML = `<span style="color:#2563eb;">Đang tìm kiếm trong tài liệu...</span>`;
    if (messagesEl) {
      messagesEl.appendChild(botMsg);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    try {
      const prompt = `Tìm kiếm trong nội dung tài liệu bên dưới và trả lời câu hỏi của người dùng. YÊU CẦU:\n- Trích xuất các đoạn văn bản liên quan nhất tìm thấy trong tài liệu\n- Chỉ rõ vị trí (đoạn nào, nội dung gì)\n- Nếu không tìm thấy, nói rõ\n\nCâu hỏi: ${question.trim()}\n\nNội dung tài liệu:\n${docText.trim().substring(0, 8000)}`;
      const { LocalAiService } = await this._loadAiServices();
      const res = await LocalAiService.query(prompt, { documentText: docText, appName: this.appName });

      botMsg.innerHTML = `<div style="font-weight:bold;color:#2563eb;margin-bottom:6px;">🔍 Kết quả tìm kiếm: "${question.trim()}"</div>`;
      const replyEl = document.createElement("div");
      replyEl.style.cssText = "white-space:pre-line;color:var(--vno-text-primary);";
      replyEl.textContent = res.reply;
      botMsg.appendChild(replyEl);

      this.setStatus?.("Đã tìm xong.");
    } catch (error) {
      botMsg.textContent = `⚠️ Lỗi tìm kiếm: ${error.message}`;
      this.setStatus?.("Lỗi tìm kiếm thông minh.");
    }
    if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  /** Dịch thuật — mở hộp thoại chọn ngôn ngữ, gọi AI dịch, hiển thị kết quả */
  async _handleTranslate() {
    const selection = window.getSelection?.();
    const selectedText = selection?.toString?.() || "";
    const docText = this.editorContainer.innerText || "";

    if (!selectedText.trim() && !docText.trim()) {
      await showAlertDialog({
        title: t("aiAssistant.translateTitle", "Dịch thuật"),
        message: "Tài liệu hiện đang trống. Vui lòng soạn thảo nội dung trước khi dịch.",
        type: "warning"
      });
      return;
    }

    const langChoice = await this._showTranslateLangDialog();
    if (!langChoice) return;

    const textToTranslate = selectedText.trim() || docText.trim();
    const langLabel = { en: "Tiếng Anh", vi: "Tiếng Việt", zh: "Tiếng Trung", ja: "Tiếng Nhật", ko: "Tiếng Hàn", fr: "Tiếng Pháp" }[langChoice] || langChoice;

    this.setStatus?.(`Đang dịch sang ${langLabel}...`);
    this.toggleAiSidebar(true);

    const userMsg = document.createElement("div");
    userMsg.style.cssText = "background:var(--vno-bg-hover);border:1px solid var(--vno-border-default);padding:8px 12px;border-radius:var(--vno-radius-md);font-size:12px;margin-top:10px;line-height:1.5;";
    userMsg.innerHTML = `<strong>Bạn:</strong> Dịch sang ${langLabel}`;
    const messagesEl = this.aiSidebar.querySelector("#vno-ai-messages");
    if (messagesEl) messagesEl.appendChild(userMsg);

    const botMsg = document.createElement("div");
    botMsg.style.cssText = "background:#f0fdf4;border:1px solid #bbf7d0;padding:10px 12px;border-radius:var(--vno-radius-md);font-size:12px;line-height:1.5;margin-top:8px;";
    botMsg.innerHTML = `<span style="color:#16a34a;">Đang dịch sang ${langLabel}...</span>`;
    if (messagesEl) {
      messagesEl.appendChild(botMsg);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    try {
      const prompt = `Dịch đoạn văn bản sau sang ${langLabel}. YÊU CẦU:\n- Giữ nguyên định dạng và ý nghĩa gốc\n- Không diễn giải thêm, không bớt nội dung\n- Dịch chính xác, tự nhiên\n\nVăn bản cần dịch:\n${textToTranslate.substring(0, 8000)}`;
      const { LocalAiService } = await this._loadAiServices();
      const res = await LocalAiService.query(prompt, { documentText: textToTranslate, appName: this.appName });

      botMsg.innerHTML = `<div style="font-weight:bold;color:#16a34a;margin-bottom:6px;">✨ ${t("aiAssistant.translateResult", "Kết quả dịch thuật")}</div>`;
      const replyEl = document.createElement("div");
      replyEl.style.cssText = "white-space:pre-line;color:var(--vno-text-primary);";
      replyEl.textContent = res.reply;
      botMsg.appendChild(replyEl);

      if (selectedText.trim()) {
        const replaceBtn = document.createElement("button");
        replaceBtn.className = "vno-btn vno-btn-primary";
        replaceBtn.style.cssText = "font-size:11px;padding:4px 10px;margin-top:8px;margin-right:6px;display:inline-block;";
        replaceBtn.textContent = t("aiAssistant.translateReplace", "Thay thế vùng chọn");
        replaceBtn.addEventListener("click", () => {
          document.execCommand("insertText", false, res.reply);
          replaceBtn.textContent = "✓ Đã thay thế";
          replaceBtn.disabled = true;
        });
        botMsg.appendChild(replaceBtn);
      }

      const insertBtn = document.createElement("button");
      insertBtn.className = "vno-btn vno-btn-primary";
      insertBtn.style.cssText = "font-size:11px;padding:4px 10px;margin-top:8px;display:inline-block;";
      insertBtn.textContent = t("aiAssistant.translateInsertBelow", "Chèn bên dưới");
      insertBtn.addEventListener("click", () => {
        document.execCommand("insertText", false, "\n\n" + res.reply + "\n\n");
        insertBtn.textContent = "✓ Đã chèn";
        insertBtn.disabled = true;
      });
      botMsg.appendChild(insertBtn);

      this.setStatus?.("Đã dịch xong.");
    } catch (error) {
      botMsg.textContent = `⚠️ Lỗi dịch thuật: ${error.message}`;
      this.setStatus?.("Lỗi dịch thuật.");
    }
    if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  /** Hiển thị hộp thoại chọn ngôn ngữ dịch */
  _showTranslateLangDialog() {
    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.className = "vno-dialog-overlay";
      const box = document.createElement("div");
      box.className = "vno-dialog-box";
      box.style.width = "380px";
      box.setAttribute("role", "dialog");
      box.setAttribute("aria-modal", "true");

      const titleId = "vno-translate-title";
      box.innerHTML = `
        <div class="vno-dialog-header">
          <span id="${titleId}">${t("aiAssistant.translateTitle", "Dịch thuật")}</span>
          <button class="vno-btn vno-btn-icon-only vno-dialog-close-btn">&times;</button>
        </div>
        <div class="vno-dialog-body">
          <p style="margin:0 0 12px;font-size:13px;color:var(--vno-text-primary);">${t("aiAssistant.translateMessage", "Chọn ngôn ngữ đích để dịch đoạn văn bản được chọn.")}</p>
          <div style="display:flex;flex-direction:column;gap:6px;">
            <label style="display:flex;align-items:center;gap:8px;padding:6px 8px;border:1px solid var(--vno-border-default);border-radius:var(--vno-radius-sm);cursor:pointer;font-size:13px;">
              <input type="radio" name="vno-translate-lang" value="en" checked> Tiếng Anh (English)
            </label>
            <label style="display:flex;align-items:center;gap:8px;padding:6px 8px;border:1px solid var(--vno-border-default);border-radius:var(--vno-radius-sm);cursor:pointer;font-size:13px;">
              <input type="radio" name="vno-translate-lang" value="vi"> Tiếng Việt
            </label>
            <label style="display:flex;align-items:center;gap:8px;padding:6px 8px;border:1px solid var(--vno-border-default);border-radius:var(--vno-radius-sm);cursor:pointer;font-size:13px;">
              <input type="radio" name="vno-translate-lang" value="zh"> Tiếng Trung (中文)
            </label>
            <label style="display:flex;align-items:center;gap:8px;padding:6px 8px;border:1px solid var(--vno-border-default);border-radius:var(--vno-radius-sm);cursor:pointer;font-size:13px;">
              <input type="radio" name="vno-translate-lang" value="ja"> Tiếng Nhật (日本語)
            </label>
            <label style="display:flex;align-items:center;gap:8px;padding:6px 8px;border:1px solid var(--vno-border-default);border-radius:var(--vno-radius-sm);cursor:pointer;font-size:13px;">
              <input type="radio" name="vno-translate-lang" value="ko"> Tiếng Hàn (한국어)
            </label>
            <label style="display:flex;align-items:center;gap:8px;padding:6px 8px;border:1px solid var(--vno-border-default);border-radius:var(--vno-radius-sm);cursor:pointer;font-size:13px;">
              <input type="radio" name="vno-translate-lang" value="fr"> Tiếng Français
            </label>
          </div>
        </div>
        <div class="vno-dialog-footer">
          <button class="vno-btn vno-dialog-cancel-btn">Hủy bỏ</button>
          <button class="vno-btn vno-btn-primary vno-dialog-ok-btn">Dịch</button>
        </div>
      `;
      overlay.appendChild(box);
      document.body.appendChild(overlay);

      const close = (val) => { overlay.remove(); resolve(val); };
      box.querySelector(".vno-dialog-close-btn").onclick = () => close(null);
      box.querySelector(".vno-dialog-cancel-btn").onclick = () => close(null);
      box.querySelector(".vno-dialog-ok-btn").onclick = () => {
        const checked = box.querySelector("input[name='vno-translate-lang']:checked");
        close(checked?.value || "en");
      };
      overlay.onclick = (e) => { if (e.target === overlay) close(null); };
      box.querySelector("input[name='vno-translate-lang']:checked")?.focus();
    });
  }

  /** AI Viết nháp — mở hộp thoại nhập mô tả, gọi AI, chèn kết quả */
  async _handleDraftDocument() {
    const description = await showPromptDialog({
      title: t("aiAssistant.draftTitle", "AI Viết nháp"),
      message: t("aiAssistant.draftMessage", "Mô tả nội dung bạn muốn AI soạn thảo."),
      placeholder: t("aiAssistant.draftPlaceholder", "Mô tả yêu cầu viết nháp..."),
      defaultValue: "",
      confirmText: "Tạo nháp",
      cancelText: "Hủy"
    });

    if (!description || !description.trim()) return;

    const docText = this.editorContainer.innerText || "";
    this.setStatus?.("Đang tạo bản nháp...");
    this.toggleAiSidebar(true);

    const userMsg = document.createElement("div");
    userMsg.style.cssText = "background:var(--vno-bg-hover);border:1px solid var(--vno-border-default);padding:8px 12px;border-radius:var(--vno-radius-md);font-size:12px;margin-top:10px;line-height:1.5;";
    userMsg.innerHTML = `<strong>Bạn:</strong> ${description.replace(/</g, "&lt;").replace(/>/g, "&gt;")}`;
    const messagesEl = this.aiSidebar.querySelector("#vno-ai-messages");
    if (messagesEl) messagesEl.appendChild(userMsg);

    const botMsg = document.createElement("div");
    botMsg.style.cssText = "background:#f0fdf4;border:1px solid #bbf7d0;padding:10px 12px;border-radius:var(--vno-radius-md);font-size:12px;line-height:1.5;margin-top:8px;";
    botMsg.innerHTML = `<span style="color:#16a34a;">Đang soạn thảo bản nháp...</span>`;
    if (messagesEl) {
      messagesEl.appendChild(botMsg);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    try {
      const prompt = `Tạo bản nháp văn bản hành chính tiếng Việt theo yêu cầu sau. YÊU CẦU:\n- Cấu trúc phù hợp loại văn bản (tiêu đề, kính gửi, nội dung, ký tên nếu là thư/công văn)\n- Ngôn ngữ hành chính trang trọng tiếng Việt\n- Đầy đủ ý, rõ ràng\n\nYêu cầu: ${description.trim()}\n\n${docText.trim() ? `Nội dung tài liệu hiện tại:\n${docText.trim().substring(0, 4000)}` : "(Tài liệu trống — tạo mới)"}`;
      const { LocalAiService } = await this._loadAiServices();
      const res = await LocalAiService.query(prompt, { documentText: docText, appName: this.appName });

      botMsg.innerHTML = `<div style="font-weight:bold;color:#16a34a;margin-bottom:6px;">✨ ${t("aiAssistant.draftTitle", "AI Viết nháp")}</div>`;
      const warningEl = document.createElement("div");
      warningEl.style.cssText = "background:#fef3c7;border:1px solid #fcd34d;border-radius:var(--vno-radius-sm);padding:6px 8px;font-size:11px;margin-bottom:8px;color:#92400e;";
      warningEl.textContent = `⚠ ${t("aiAssistant.draftWarning", "Đây là bản nháp do AI tạo — vui lòng tự kiểm tra lại nội dung trước khi sử dụng.")}`;
      botMsg.appendChild(warningEl);

      const replyEl = document.createElement("div");
      replyEl.style.cssText = "white-space:pre-line;color:var(--vno-text-primary);";
      replyEl.textContent = res.reply;
      botMsg.appendChild(replyEl);

      const insertBtn = document.createElement("button");
      insertBtn.className = "vno-btn vno-btn-primary";
      insertBtn.style.cssText = "font-size:11px;padding:4px 10px;margin-top:8px;display:inline-block;";
      insertBtn.textContent = docText.trim() ? "Chèn tại vị trí con trỏ" : "Chèn vào tài liệu";
      insertBtn.addEventListener("click", () => {
        document.execCommand("insertText", false, "\n\n" + res.reply + "\n\n");
        insertBtn.textContent = "✓ Đã chèn";
        insertBtn.disabled = true;
      });
      botMsg.appendChild(insertBtn);

      this.setStatus?.("Đã tạo bản nháp xong.");
    } catch (error) {
      botMsg.textContent = `⚠️ Lỗi tạo nháp: ${error.message}`;
      this.setStatus?.("Lỗi tạo bản nháp.");
    }
    if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  setEditorCanvas(element) {
    this.editorContainer.innerHTML = "";
    this.editorContainer.appendChild(element);
  }

  setStatus(text) {
    const el = document.getElementById("vno-status-docinfo");
    if (el) el.textContent = text;
  }

  _setMacroRecordingState(isRecording) {
    const indicator = document.getElementById("vno-macro-status-indicator");
    if (indicator) indicator.style.display = isRecording ? "inline-flex" : "none";
    if (typeof document !== "undefined" && document.body) {
      document.body.classList.toggle("vno-macro-is-recording", isRecording);
    }
  }
}

export { showPendingFeatureNotice } from "../ui-kit/lazy-dialogs.js";
