/**
 * 3T Office Platform — Enterprise Application Shell
 */

import { ICONS } from "../ui-kit/icons.js";
import { globalCommandBus } from "../commands/command-bus.js";
import { globalShortcutManager } from "../commands/shortcut-manager.js";
import { globalMacroManager } from "../commands/macro-manager.js";
import { RibbonHost } from "../ribbon/ribbon-host.js";
import { OFFICE_TEMPLATES } from "../templates/template-registry.js";
import { RecentFilesManager } from "../recent/recent-manager.js";
import { createEmptyState } from "../ui-kit/components.js";
import { withLazyFeatureProgress } from "../startup/lazy-feature.js";
import { isVoiceInputSupported, startVoiceInput, stopVoiceInput, isVoiceInputActive } from "../ai/voice-input.js";
import { createLazyDialogs } from "../ui-kit/lazy-dialogs.js";
import { t, getLocale, setLocale, getSupportedLocales } from "../i18n/i18n.js";
import { getPlatformLaunchContext } from "../bootstrap.js";
import { themeManager } from "../theme/theme-manager.js";
import { globalUnoBridge } from "../../adapters/libreoffice/common/uno-bridge.js";
import { NotificationBar } from "../ui-kit/notification-bar.js";

const { showAlertDialog, showConfirmDialog, showPromptDialog, showMacroManagerDialog, showUnsavedChangesDialog } = createLazyDialogs("common");

export class AppShell {
  /**
   * @param {Object} options
   * @param {"writer"|"sheet"|"slides"} options.appName
   * @param {string} options.appTitle
   * @param {string} [options.documentName="Tài liệu chưa đặt tên"]
   * @param {Function} [options.onSwitchApp]
   * @param {boolean} [options.singleAppMode=false]
   */
  constructor(options) {
    this.appName = options.appName;
    this.appTitle = options.appTitle;
    this.documentName = options.documentName || "Tài liệu 1";
    this.singleAppMode = options.singleAppMode ?? getPlatformLaunchContext().singleAppMode;
    this._onSwitchApp = options.onSwitchApp || null;
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
    if (Number.isFinite(level)) this._setZoomControl?.(level);
  }

  requestAppSwitch(appType, options) {
    if (this.singleAppMode && appType !== this.appName) return false;
    if (!this._onSwitchApp) return false;
    return this._onSwitchApp(appType, options);
  }

  mount(targetElement) {
    this.rootEl = targetElement;
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
        <div class="vno-quick-tools" role="toolbar" aria-label="Thanh công cụ truy cập nhanh">
          <button class="vno-quick-btn" data-cmd="common.file.save" aria-label="Lưu tài liệu (Ctrl+S)" title="Lưu tài liệu (Ctrl+S)">${ICONS.fileSave}</button>
          <button class="vno-quick-btn" data-cmd="common.edit.undo" aria-label="Hoàn tác (Ctrl+Z)" title="Hoàn tác (Ctrl+Z)">${ICONS.undo}</button>
          <button class="vno-quick-btn" data-cmd="common.edit.redo" aria-label="Làm lại (Ctrl+Y)" title="Làm lại (Ctrl+Y)">${ICONS.redo}</button>
          <button class="vno-quick-btn" data-cmd="common.file.print" aria-label="In tài liệu (Ctrl+P)" title="In tài liệu (Ctrl+P)">${ICONS.filePrint}</button>
        </div>

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

    // Quick tools execution
    bar.querySelectorAll("[data-cmd]").forEach(btn => {
      btn.addEventListener("click", () => {
        globalCommandBus.execute(btn.getAttribute("data-cmd"));
      });
    });

    bar.querySelector(".vno-tab-close")?.addEventListener("click", () => {
      globalCommandBus.execute("common.file.close");
    });

    bar.querySelector("#vno-toggle-ai-btn").addEventListener("click", () => this.toggleAiSidebar());

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

    this.aiSidebar.querySelector("#vno-ai-close").addEventListener("click", () => this.toggleAiSidebar(false));

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
        const res = await LocalAiService.query(query, { documentText: docText, appName: this.appName, signal: this._aiRequestController.signal });
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

    ws.addEventListener("wheel", (e) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 10 : -10;
        this.setZoom(this.zoomLevel + delta);
      }
    }, { capture: true, passive: false });

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
        <div class="vno-zoom-slider" role="group" aria-label="Điều chỉnh thu phóng">
          <button type="button" id="vno-zoom-out" aria-label="Thu nhỏ" title="Thu nhỏ">-</button>
          <input type="range" id="vno-zoom-range" min="50" max="200" value="${this.zoomLevel}"
                 aria-label="Tỷ lệ thu phóng" aria-valuemin="50" aria-valuemax="200" aria-valuenow="${this.zoomLevel}" />
          <button type="button" id="vno-zoom-in" aria-label="Phóng to" title="Phóng to">+</button>
          <span id="vno-zoom-text" style="min-width:38px;text-align:right;" aria-live="polite">${this.zoomLevel}%</span>
        </div>
      </div>
    `;

    const zoomRange = sb.querySelector("#vno-zoom-range");
    this._setZoomControl = (val) => this.setZoom(val);
    zoomRange.addEventListener("input", (e) => this.setZoom(Number(e.target.value)));
    sb.querySelector("#vno-zoom-out").addEventListener("click", () => this.setZoom(this.zoomLevel - 10));
    sb.querySelector("#vno-zoom-in").addEventListener("click", () => this.setZoom(this.zoomLevel + 10));

    this.rootEl.appendChild(sb);
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
    this.isAiOpen = forceState !== undefined ? forceState : !this.isAiOpen;
    if (this.isAiOpen) {
      this.aiSidebar.classList.remove("is-hidden");
      void this._loadAiServices()
        .then(({ LocalAiService }) => {
          if (!this.isAiOpen) return;
          const providerSelect = this.aiSidebar.querySelector("#vno-ai-provider");
          if (providerSelect) providerSelect.value = LocalAiService.getSelectedProviderId();
          return this._refreshAiProviderUi?.();
        })
        .catch((error) => {
          const status = this.aiSidebar.querySelector("#vno-ai-provider-status");
          if (status) status.textContent = `Không tải được Trợ lý 3T AI: ${error.message}`;
        });
    } else {
      this.aiSidebar.classList.add("is-hidden");
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

  showBackstageMenu() {
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
        return `
          <div class="vno-recent-row" role="button" tabindex="0" aria-label="${file.name}, sửa đổi: ${timeStr}, định dạng: ${file.format}"
               data-recent-app="${file.app}" data-recent-name="${file.name}" data-recent-path="${encodeURIComponent(file.path)}">
            <div style="min-width:0;flex:1;">
              <strong style="font-size:13px;color:var(--vno-text-primary);display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${file.name}</strong>
              <div style="font-size:11px;color:var(--vno-text-muted);margin-top:2px;">Sửa đổi: ${timeStr}</div>
            </div>
            <div style="display:flex;align-items:center;gap:12px;flex-shrink:0;">
              <span style="font-size:12px;color:var(--vno-text-secondary);">${file.format}</span>
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
        <button type="button" class="vno-backstage-nav-btn" data-backstage-cmd="common.file.new">${t("backstage.new")}</button>
        <button type="button" class="vno-backstage-nav-btn" data-backstage-cmd="common.file.open">${t("backstage.open")}</button>
        <button type="button" class="vno-backstage-nav-btn" data-backstage-cmd="common.file.save">${t("backstage.save")}</button>
        <button type="button" class="vno-backstage-nav-btn" data-backstage-cmd="common.file.saveAs">${t("backstage.saveAs")}</button>
        <button type="button" class="vno-backstage-nav-btn" data-backstage-tab="print" id="vno-backstage-nav-print">${t("backstage.print")}</button>
        <button type="button" class="vno-backstage-nav-btn" data-backstage-cmd="common.file.exportPdf">${t("backstage.exportPdf")}</button>
        <button type="button" class="vno-backstage-nav-btn" data-backstage-action="closeDocument" id="vno-backstage-close">${t("backstage.close", "Đóng")}</button>
        <div style="flex:1;"></div>
        <button type="button" class="vno-backstage-nav-btn" id="vno-backstage-about">${t("backstage.about")}</button>
        <button type="button" class="vno-backstage-nav-btn" id="vno-backstage-options">${t("backstage.options", "Tùy chọn")}</button>
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

        <div class="vno-backstage-tab-content" id="vno-backstage-print-view" style="display:none;"></div>
      </div>
    `;

    document.body.appendChild(modal);

    let printPanelCleanup = null;

    const closeModal = () => {
      if (typeof printPanelCleanup === "function") {
        printPanelCleanup();
        printPanelCleanup = null;
      }
      document.removeEventListener("keydown", onBackstageKeyDown);
      if (modal.parentNode) modal.parentNode.removeChild(modal);
      if (previousFocused && typeof previousFocused.focus === "function") {
        previousFocused.focus();
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
    const emptyContainer = modal.querySelector("#vno-recent-empty-container");
    if (emptyContainer) {
      renderEmptyRecent(emptyContainer);
    }

    // Xử lý nút Xóa lịch sử gần đây
    const clearBtn = modal.querySelector("#vno-clear-recent");
    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        RecentFilesManager.clearAll();
        const wrapper = modal.querySelector("#vno-recent-section-wrapper");
        if (wrapper) {
          renderEmptyRecent(wrapper);
        }
      });
    }

    // Gắn handler cho nút gỡ từng tài liệu gần đây
    const attachRemoveHandlers = () => {
      modal.querySelectorAll(".vno-recent-remove-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const name = btn.getAttribute("data-remove-name");
          const app = btn.getAttribute("data-remove-app");
          RecentFilesManager.removeFile({ name, app });
          const row = btn.closest(".vno-recent-row");
          row?.remove();
          const remaining = modal.querySelectorAll(".vno-recent-row");
          if (remaining.length === 0) {
            const wrapper = modal.querySelector("#vno-recent-section-wrapper");
            if (wrapper) {
              renderEmptyRecent(wrapper);
            }
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

    modal.querySelector("#vno-backstage-about")?.addEventListener("click", () => {
      closeModal();
      this._showAboutDialog();
    });

    modal.querySelector("#vno-backstage-options")?.addEventListener("click", () => {
      closeModal();
      this.showOptionsDialog();
    });

    const homeNavBtn = modal.querySelector("#vno-backstage-nav-home");
    const printNavBtn = modal.querySelector("#vno-backstage-nav-print");
    const homeView = modal.querySelector("#vno-backstage-home-view");
    const printView = modal.querySelector("#vno-backstage-print-view");

    const showTab = (tabName) => {
      if (tabName === "print") {
        homeNavBtn?.classList.remove("is-active");
        printNavBtn?.classList.add("is-active");
        if (homeView) homeView.style.display = "none";
        if (printView) {
          printView.style.display = "block";
          if (typeof printPanelCleanup === "function") {
            printPanelCleanup();
            printPanelCleanup = null;
          }
          printPanelCleanup = this._renderBackstagePrintPanel(printView, closeModal);
        }
      } else {
        printNavBtn?.classList.remove("is-active");
        homeNavBtn?.classList.add("is-active");
        if (printView) {
          printView.style.display = "none";
          if (typeof printPanelCleanup === "function") {
            printPanelCleanup();
            printPanelCleanup = null;
          }
          printView.innerHTML = "";
        }
        if (homeView) homeView.style.display = "block";
      }
    };

    homeNavBtn?.addEventListener("click", () => showTab("home"));
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

    // Tự động focus nút Quay lại khi mở
    modal.querySelector("#vno-backstage-back")?.focus();
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

    overlay.innerHTML = `
      <div class="vno-dialog-box" style="width: 480px; max-width: calc(100vw - 32px);" role="dialog" aria-modal="true" aria-labelledby="vno-options-dialog-title">
        <div class="vno-dialog-header">
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-weight:700;font-size:15px;" id="vno-options-dialog-title">Tùy chọn 3T Office</span>
          </div>
          <button class="vno-btn vno-btn-icon-only vno-options-close-btn" title="Đóng" aria-label="Đóng">&times;</button>
        </div>
        <div class="vno-dialog-body" style="display:flex;flex-direction:column;gap:16px;">
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

    const closeDialog = () => {
      document.removeEventListener("keydown", onKeyDown);
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (previousFocused && typeof previousFocused.focus === "function") {
        previousFocused.focus();
      }
    };

    const applyOptions = () => {
      const selectedTheme = overlay.querySelector('input[name="vno-opt-theme"]:checked')?.value || "light";
      const selectedFontSize = overlay.querySelector('input[name="vno-opt-fontsize"]:checked')?.value || "normal";
      themeManager.setTheme(selectedTheme);
      themeManager.setFontSize(selectedFontSize);
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

  applyTemplate(templateId) {
    if (templateId === "blank") {
      globalCommandBus.execute("common.file.new");
      return;
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
