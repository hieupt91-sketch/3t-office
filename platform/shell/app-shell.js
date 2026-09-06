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
import { LocalAiService, ApiKeyManager } from "../ai/ai-service.js";
import { showAlertDialog } from "../ui-kit/dialogs.js";
import { t, getLocale, setLocale, getSupportedLocales } from "../i18n/i18n.js";
import { getPlatformLaunchContext } from "../bootstrap.js";
import { themeManager } from "../theme/theme-manager.js";
import { globalUnoBridge } from "../../adapters/libreoffice/common/uno-bridge.js";

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
    this.isAiOpen = false;
    this._aiRequestController = null;
    this.adapter = options.adapter || null;
    this.grid = options.grid || null;
    this.canvas = options.canvas || null;

    this.rootEl = null;
    this.ribbonHost = null;
    this.editorContainer = null;
  }

  set onSwitchApp(callback) {
    this._onSwitchApp = typeof callback === "function" ? callback : null;
  }

  get onSwitchApp() {
    return (appType, options) => this.requestAppSwitch(appType, options);
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

    const appIdentity = this.singleAppMode ? `
        <div class="vno-app-brand" aria-label="${this.appTitle}" style="display:flex;align-items:center;gap:8px;padding:0 8px;">
          ${ICONS.brandLogo}<span>${this.appTitle}</span>
        </div>` : `
        <div style="position:relative;">
          <button class="vno-app-switcher-btn" id="vno-switcher-toggle"
                  aria-haspopup="true" aria-expanded="false" aria-controls="vno-switcher-menu"
                  aria-label="Chuyển đổi ứng dụng trong bộ VN Office: ${this.appTitle}"
                  title="Chuyển đổi ứng dụng trong bộ VN Office">
            ${ICONS.brandLogo}
            <span>${this.appTitle}</span>
            <span style="display:flex;margin-left:2px;" aria-hidden="true">${ICONS.chevronDown}</span>
          </button>
          <div id="vno-switcher-menu" role="menu" aria-label="Bộ ứng dụng VN Office"
               style="display:none; position:absolute; top:36px; left:0; background:var(--vno-bg-window); color:var(--vno-text-primary); border:1px solid var(--vno-border-default); border-radius:var(--vno-radius-md); box-shadow:var(--vno-shadow-lg); width:230px; z-index:200; padding:6px 0;">
            <div style="padding:6px 14px; font-size:11px; font-weight:bold; color:var(--vno-text-muted); text-transform:uppercase;" role="presentation">Bộ ứng dụng VN Office</div>
            <div class="vno-switcher-item" data-switch="writer" role="menuitem" tabindex="0" style="display:flex; align-items:center; gap:10px; padding:8px 14px; cursor:pointer; font-size:13px; font-weight:500;">${ICONS.appWriter} <span>VN Writer (Soạn thảo)</span></div>
            <div class="vno-switcher-item" data-switch="sheet" role="menuitem" tabindex="0" style="display:flex; align-items:center; gap:10px; padding:8px 14px; cursor:pointer; font-size:13px; font-weight:500;">${ICONS.appSheet} <span>VN Sheet (Bảng tính)</span></div>
            <div class="vno-switcher-item" data-switch="slides" role="menuitem" tabindex="0" style="display:flex; align-items:center; gap:10px; padding:8px 14px; cursor:pointer; font-size:13px; font-weight:500;">${ICONS.appSlides} <span>VN Slides (Trình chiếu)</span></div>
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
        <button class="vno-ai-trigger-btn" id="vno-toggle-ai-btn" aria-label="Trợ lý VN AI (Alt+J)" title="Trợ lý VN AI (Alt+J)">
          <span style="color:#d97706;display:flex;" aria-hidden="true">${ICONS.aiSparkle}</span>
          <span>Trợ lý VN AI</span>
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

  _renderWorkspace() {
    const ws = document.createElement("main");
    ws.className = "vno-workspace";

    this.editorContainer = document.createElement("div");
    this.editorContainer.className = "vno-editor-container";

    // AI Sidebar Panel
    this.aiSidebar = document.createElement("aside");
    this.aiSidebar.className = "vno-ai-sidebar is-hidden";
    this.aiSidebar.setAttribute("role", "complementary");
    this.aiSidebar.setAttribute("aria-label", "Trợ lý VN AI");
    this.aiSidebar.innerHTML = `
      <div class="vno-ai-header">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="color:#d97706;display:flex;" aria-hidden="true">${ICONS.aiSparkle}</span>
          <span>Trợ lý VN AI</span>
        </div>
        <button type="button" class="vno-btn" id="vno-ai-close" aria-label="Đóng bảng Trợ lý VN AI" title="Đóng" style="font-size:16px;">&times;</button>
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
          <strong>Xin chào!</strong> Tôi là Trợ lý VN AI tích hợp trong VN Office.<br>
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

    // Xử lý gửi yêu cầu tới Trợ lý VN AI
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

    providerSelect.value = LocalAiService.getSelectedProviderId();
    providerSelect.addEventListener("change", async () => {
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
        ApiKeyManager.setApiKey(providerSelect.value, keyInput.value);
        keyFeedback.textContent = t("aiAssistant.keySaved");
        await refreshProviderUi();
      } catch (error) { keyFeedback.textContent = error.message; }
    });
    keyRemove.addEventListener("click", async () => {
      ApiKeyManager.removeApiKey(providerSelect.value);
      keyFeedback.textContent = t("aiAssistant.keyRemoved");
      await refreshProviderUi();
    });
    refreshProviderUi();

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

    ws.appendChild(this.editorContainer);
    ws.appendChild(this.aiSidebar);
    this.rootEl.appendChild(ws);
  }

  _renderStatusBar() {
    const sb = document.createElement("footer");
    sb.className = "vno-statusbar";

    sb.innerHTML = `
      <div class="vno-statusbar-left">
        <span id="vno-status-docinfo" aria-live="polite">Sẵn sàng</span>
        <span aria-hidden="true">|</span>
        <span>Tiếng Việt (Việt Nam)</span>
        <span aria-hidden="true">|</span>
        <span>Bảng mã: Unicode dựng sẵn (NFC)</span>
      </div>

      <div class="vno-statusbar-right">
        <div class="vno-zoom-slider" role="group" aria-label="Điều chỉnh thu phóng">
          <button type="button" id="vno-zoom-out" aria-label="Thu nhỏ" title="Thu nhỏ">-</button>
          <input type="range" id="vno-zoom-range" min="50" max="200" value="100"
                 aria-label="Tỷ lệ thu phóng" aria-valuemin="50" aria-valuemax="200" aria-valuenow="100" />
          <button type="button" id="vno-zoom-in" aria-label="Phóng to" title="Phóng to">+</button>
          <span id="vno-zoom-text" style="min-width:38px;text-align:right;" aria-live="polite">100%</span>
        </div>
      </div>
    `;

    const zoomRange = sb.querySelector("#vno-zoom-range");
    const zoomText = sb.querySelector("#vno-zoom-text");

    const updateZoom = (val) => {
      this.zoomLevel = Math.max(50, Math.min(200, val));
      zoomRange.value = this.zoomLevel;
      zoomRange.setAttribute("aria-valuenow", String(this.zoomLevel));
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
    } else {
      this.aiSidebar.classList.add("is-hidden");
    }
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

    if (recentFiles.length === 0) {
      recentSectionHtml = `<div id="vno-recent-empty-container"></div>`;
    } else {
      const rowsHtml = recentFiles.map(file => {
        const timeStr = new Date(file.lastModified).toLocaleDateString("vi-VN", {
          day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
        });
        return `
          <div class="vno-recent-row" role="button" tabindex="0" aria-label="${file.name}, sửa đổi: ${timeStr}, định dạng: ${file.format}"
               data-recent-app="${file.app}" data-recent-name="${file.name}">
            <div>
              <strong style="font-size:13px;color:var(--vno-text-primary);">${file.name}</strong>
              <div style="font-size:11px;color:var(--vno-text-muted);margin-top:2px;">Sửa đổi: ${timeStr}</div>
            </div>
            <span style="font-size:12px;color:var(--vno-text-secondary);">${file.format}</span>
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
          <span aria-hidden="true">←</span> <span>Quay lại</span>
        </button>
        <button type="button" class="vno-backstage-nav-btn is-active" data-backstage-tab="home" id="vno-backstage-nav-home">${t("backstage.home")}</button>
        <button type="button" class="vno-backstage-nav-btn" data-backstage-cmd="common.file.new">${t("backstage.new")}</button>
        <button type="button" class="vno-backstage-nav-btn" data-backstage-cmd="common.file.open">${t("backstage.open")}</button>
        <button type="button" class="vno-backstage-nav-btn" data-backstage-cmd="common.file.save">${t("backstage.save")}</button>
        <button type="button" class="vno-backstage-nav-btn" data-backstage-cmd="common.file.saveAs">${t("backstage.saveAs")}</button>
        <button type="button" class="vno-backstage-nav-btn" data-backstage-tab="print" id="vno-backstage-nav-print">${t("backstage.print")}</button>
        <button type="button" class="vno-backstage-nav-btn" data-backstage-cmd="common.file.exportPdf">${t("backstage.exportPdf")}</button>
        <div style="flex:1;"></div>
        <button type="button" class="vno-backstage-nav-btn" id="vno-backstage-about">${t("backstage.about")}</button>
      </div>

      <div class="vno-backstage-content" role="main" aria-label="Nội dung menu tệp">
        <div class="vno-backstage-tab-content" id="vno-backstage-home-view">
          <h1 style="font-size:24px;font-weight:700;margin-bottom:8px;color:var(--vno-text-primary);">${t("backstage.templateTitle")}</h1>
          <p style="color:var(--vno-text-muted);font-size:13px;margin-bottom:24px;">${t("backstage.templateSubtitle")}</p>

          <div class="vno-template-grid" role="region" aria-label="Danh sách mẫu tài liệu">
            ${templateCardsHtml}
          </div>

          <h2 style="font-size:18px;font-weight:700;margin-top:36px;margin-bottom:16px;color:var(--vno-text-primary);">${t("backstage.recentTitle")}</h2>
          ${recentSectionHtml}
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
      }
    };
    document.addEventListener("keydown", onBackstageKeyDown);

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
      const activateRecent = () => {
        const app = row.getAttribute("data-recent-app");
        closeModal();
        if (app !== this.appName) {
          this.requestAppSwitch(app);
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
            showAlertDialog({
              title: "Mẫu tài liệu",
              message: `Mẫu này dành cho ứng dụng VN ${tmplApp.toUpperCase()}. Vui lòng chuyển sang ứng dụng đó để sử dụng.`
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

    modal.querySelector("#vno-backstage-about").addEventListener("click", () => {
      showAlertDialog({
        title: "Về Bộ Ứng Dụng VN Office",
        message: "VN Office — Bộ ứng dụng văn phòng Việt Nam độc lập và chuẩn mực.\n\n• Phiên bản: 2.0 Enterprise Commercial Candidate\n• Kiến trúc: Shared Platform + LibreOffice Core Adapter Layer\n• Tiêu chuẩn: Nghị định 30/2020/NĐ-CP & ISO/IEC 29500 OOXML\n• Bảo mật: Quyền riêng tư tuyệt đối (Privacy-first on-device AI)"
      });
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
    printNavBtn?.addEventListener("click", () => showTab("print"));

    modal.querySelectorAll("[data-backstage-cmd]").forEach(btn => {
      btn.addEventListener("click", () => {
        const cmd = btn.getAttribute("data-backstage-cmd");
        closeModal();
        globalCommandBus.execute(cmd);
      });
    });

    // Tự động focus nút Quay lại khi mở
    modal.querySelector("#vno-backstage-back")?.focus();
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

  /**
   * Đưa khung chrome (tên tài liệu trên tab, tab ribbon đang chọn) về trạng thái tài
   * liệu mới trắng — dùng khi File > Mới/Đóng thật sự xóa nội dung nhưng KHÔNG được để
   * ribbon kẹt ở tab người dùng đang đứng trước đó hay giữ nguyên tên tệp mẫu cũ, khác
   * với hành vi thật của Word/LibreOffice (lỗi thật, người dùng phát hiện 04/09/2026).
   * @param {string} newDocumentName
   * @param {string} [homeTabId="home"]
   */
  resetDocumentChrome(newDocumentName, homeTabId = "home") {
    this.documentName = newDocumentName;
    const tabEl = this.rootEl?.querySelector(".vno-doc-tab span");
    if (tabEl) tabEl.textContent = this.documentName;
    this.ribbonHost?.selectTab(homeTabId);
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
