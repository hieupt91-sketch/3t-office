/**
 * 3T Sheet Application Entrypoint — Refined Enterprise Edition
 */

import { AppShell } from "../../platform/shell/app-shell.js";
import { SHEET_RIBBON_TABS } from "./sheet-ribbon.js";
import { SheetGridController } from "./sheet-grid.js";
import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";
import { bootstrapPlatform } from "../../platform/bootstrap.js";
import { applyLocaleToTabs } from "../../platform/i18n/i18n.js";
import { globalShortcutManager } from "../../platform/commands/shortcut-manager.js";
import { globalCommandBus } from "../../platform/commands/command-bus.js";
import { t } from "../../platform/i18n/i18n.js";
import { withLazyFeatureProgress } from "../../platform/startup/lazy-feature.js";
import { globalUnoBridge } from "../../adapters/libreoffice/common/uno-bridge.js";
import { SheetQuickView } from "./sheet-quick-view.js";

export class SheetApp {
  constructor(mountElement) {
    this.mountElement = mountElement;
    this.shell = null;
    this.grid = null;
    this.adapter = null;
    this.helpPanel = null;
    this.autoRecoverManager = null;
    this.workspace = null;
    this._helpPanelPromise = null;
    this._lifecycleObserver = null;
    this._previousSheetOpenProgress = null;
    this._sheetOpenProgressHandler = null;
    this._focusRestoreClickHandler = null;
    this._focusRestoreObserver = null;
    this.quickView = null;
  }

  async init(options = {}) {
    await bootstrapPlatform();
    globalShortcutManager.setActiveScope("sheet");

    const templateId = options.templateId || "blank";
    const isBlank = templateId !== "budget_estimate";
    const launchParams = new URLSearchParams(globalThis.location?.search || "");
    const browserNumberParts = new Intl.NumberFormat().formatToParts(1234.5);
    const numberLocale = {
      decimalSeparator: launchParams.has("numberDecimal") ? launchParams.get("numberDecimal") : browserNumberParts.find(part => part.type === "decimal")?.value || ".",
      thousandsSeparator: launchParams.has("numberThousands") ? launchParams.get("numberThousands") : browserNumberParts.find(part => part.type === "group")?.value || ","
    };
    this.shell = new AppShell({
      appName: "sheet",
      appTitle: "Sheet",
      documentName: options.documentName || (isBlank ? "Bảng tính 1.xlsx" : "Dự toán kinh phí 3T Office 2026.xlsx")
    });
    this.shell.mount(this.mountElement);
    this._watchLifecycle();
    this.shell.ribbonHost.setStructure(applyLocaleToTabs(SHEET_RIBBON_TABS), "home");

    const workspace = document.createElement("div");
    workspace.className = "vno-sheet-workspace";
    workspace.setAttribute("role", "application");
    workspace.setAttribute("aria-label", "Bảng tính");

    const gridWrap = document.createElement("div");
    gridWrap.style.flex = "1 1 auto";
    gridWrap.style.minWidth = "0";
    gridWrap.style.minHeight = "0";
    gridWrap.style.height = "100%";
    workspace.appendChild(gridWrap);

    this.grid = new SheetGridController(gridWrap, {
      onDocumentChange: () => { if (this.adapter) this.adapter.isDirty = true; },
      onSelect: (coord, data, stats) => {
        if (this.grid?.formulaEntry) {
          this.shell.setStatus(t(`sheetFormulaEntry.status.${this.grid.formulaEntry.mode === "point" ? "point" : this.grid.formulaEntry.mode === "enter" ? "enter" : "edit"}`));
          return;
        }
        this.shell.setStatus(`SẴN SÀNG  |  Ô: ${coord}  |  ĐẾM: ${stats.count}  |  TRUNG BÌNH: ${stats.avg}  |  TỔNG CỘNG: ${stats.sum}`);
      },
      onFormulaEntryMode: (label) => this.shell?.setStatus?.(label),
      onZoomChange: (level) => this.shell?.setZoomDisplay?.(Math.round(level * 100)),
      isBlank,
      templateId,
      numberLocale
    });
    this.shell.onZoomChange = (percent) => {
      this.grid.setZoom(percent / 100);
    };
    this.grid.mount();
    this._bindGridFocusRestoration();

    this.workspace = workspace;
    globalCommandBus.bindHandler("sheet.help.open", (args) => {
      return withLazyFeatureProgress("sheet", "Trợ giúp", () => this._ensureHelpPanel()).then((panel) => {
        if (args?.entryId || args?.query != null) return panel.open(args);
        return panel.toggle();
      });
    });

    // Sheet AI: Giải thích công thức
    globalCommandBus.bindHandler("sheet.ai.explainFormula", () => {
      this._handleExplainFormula();
      return true;
    });

    // Sheet AI: Tạo công thức từ mô tả
    globalCommandBus.bindHandler("sheet.ai.formulaFromDescription", () => {
      this._handleFormulaFromDescription();
      return true;
    });

    globalCommandBus.bindHandler("sheet.review.toggleSpellCheck", () => {
      return this.grid?.toggleSpellcheck?.();
    });

    this.shell.setEditorCanvas(workspace);

    this.adapter = new SheetAdapter(this.grid);
    this.adapter.setShell(this.shell);
    this.adapter.attach();
    if (launchParams.get("viewFirst") === "1") {
      this.quickView = new SheetQuickView({
        grid: this.grid,
        shell: this.shell,
        bridge: globalUnoBridge,
        getSourceFilePath: () => this.quickView?.sourcePath || this.adapter?.sourceFilePath,
        reopenFile: filePath => globalUnoBridge.openFileInNewWindow(filePath, "sheet")
      });
      this.quickView.install();
    }
    if (typeof window !== "undefined") {
      this._previousSheetOpenProgress = window.__vnoSheetOpenProgress;
      this._sheetOpenProgressHandler = (message, startTiming = false) => {
        if (startTiming) {
          window.__vnoSheetOpenStartedAt = performance.now();
          window.__vnoSheetOpenElapsedMs = null;
          window.__vnoSheetOpenFirstGridPending = false;
        }
        const text = String(message || "Đang mở bảng tính…");
        const progress = /chuẩn bị/i.test(text) ? 12
          : /chuyển workbook/i.test(text) ? 28
            : /tối ưu/i.test(text) ? 52
              : /đóng gói/i.test(text) ? 70
                : /dựng mô hình|hiển thị lưới|dữ liệu bảng tính/i.test(text) ? 86 : null;
        if (!this.quickView?.updateProgress(text.replace(/^Đang .+?…?$/i, "Chỉ đọc · đang nạp đầy đủ…"), progress)) {
          this.shell?.setStatus?.(text);
        }
      };
      window.__vnoSheetOpenProgress = this._sheetOpenProgressHandler;
    }

    this.grid.updateStatus();
    this._autoRecoverOptions = options;
    // The grid mounts before AppShell attaches the workspace to the DOM, so
    // restore focus after the editor canvas is connected and startup UI settles.
    this._restoreGridFocusIfIdle();
    if (typeof queueMicrotask === "function") {
      queueMicrotask(() => this._restoreGridFocusIfIdle());
    }
    console.log("[SheetApp] Đã khởi tạo 3T Sheet chuẩn hóa cao cấp.");
  }

  async initializeBackgroundServices() {
    const [helpPanel] = await Promise.all([
      this._ensureHelpPanel(),
      this.grid.initializeSpellcheck()
    ]);
    const { autoRecoverManager } = await import("../../platform/autorecover/auto-recover.js");
    this.autoRecoverManager = autoRecoverManager;
    await autoRecoverManager.register({
      appKind: "sheet",
      adapter: this.adapter,
      shell: this.shell,
      helpPanel,
      serialize: () => this.adapter.serializeToFods(),
      restore: (content, manifest) => {
        const restored = this.adapter.restoreFromAutoRecover(content, manifest);
        if (restored) this.grid.updateStatus();
        return restored;
      },
      options: this._autoRecoverOptions
    });
  }

  async showStartupRecovery() {
    const { autoRecoverManager } = await import("../../platform/autorecover/auto-recover.js");
    await autoRecoverManager.showStartupRecovery();
  }

  async _ensureHelpPanel() {
    if (this.helpPanel) return this.helpPanel;
    if (!this._helpPanelPromise) {
      this.shell?.setStatus?.("Đang tải Trợ giúp Sheet…");
      this._helpPanelPromise = Promise.all([
        import("../../platform/help/index.js"),
        import("../../platform/help/entries-sheet.js")
      ]).then(([{ HelpPanel }]) => {
        if (!this.helpPanel && this.workspace) {
          this.helpPanel = new HelpPanel({ app: "sheet" });
          this.helpPanel.mount(this.workspace);
          this.shell?.setStatus?.("Sẵn sàng");
        }
        return this.helpPanel;
      }).catch((error) => {
        this._helpPanelPromise = null;
        this.shell?.setStatus?.("Không tải được Trợ giúp Sheet.");
        throw error;
      });
    }
    return this._helpPanelPromise;
  }

  _watchLifecycle() {
    this._lifecycleObserver?.disconnect();
    if (typeof MutationObserver === "undefined") return;
    this._lifecycleObserver = new MutationObserver(() => {
      if (this.mountElement.getAttribute("data-app") !== "sheet") this.destroy();
    });
    this._lifecycleObserver.observe(this.mountElement, { attributes: true, attributeFilter: ["data-app"] });
  }

  _bindGridFocusRestoration() {
    this._focusRestoreClickHandler = event => {
      if (!event.target?.closest?.(".vno-ribbon-tab,.vno-ribbon-tab-file,[data-command-id]")) return;
      setTimeout(() => this._restoreGridFocusIfIdle(), 0);
    };
    document.addEventListener("click", this._focusRestoreClickHandler, true);

    if (typeof MutationObserver !== "undefined" && document.body) {
      this._focusRestoreObserver = new MutationObserver(records => {
        const removedDialog = records.some(record => [...record.removedNodes].some(node =>
          node.nodeType === 1 && (node.matches?.(".vno-dialog-overlay") || node.querySelector?.(".vno-dialog-overlay"))
        ));
        if (removedDialog) setTimeout(() => this._restoreGridFocusIfIdle(), 0);
      });
      this._focusRestoreObserver.observe(document.body, { childList: true, subtree: true });
    }
  }

  _restoreGridFocusIfIdle() {
    if (!this.grid || this.mountElement?.getAttribute("data-app") !== "sheet") return false;
    if (document.querySelector(".vno-dialog-overlay")) return false;
    const active = document.activeElement;
    if (active?.isContentEditable || active?.matches?.("input,textarea,select")) return false;
    const container = this.grid.container;
    if (!container || !document.body.contains(container)) return false;
    return this.grid.focusGrid();
  }

  destroy() {
    this.autoRecoverManager?.detach(this.adapter);
    if (typeof window !== "undefined" && window.__vnoSheetOpenProgress === this._sheetOpenProgressHandler) {
      if (this._previousSheetOpenProgress) window.__vnoSheetOpenProgress = this._previousSheetOpenProgress;
      else delete window.__vnoSheetOpenProgress;
      this._sheetOpenProgressHandler = null;
    }
    this._lifecycleObserver?.disconnect();
    this._lifecycleObserver = null;
    if (this._focusRestoreClickHandler) {
      document.removeEventListener("click", this._focusRestoreClickHandler, true);
      this._focusRestoreClickHandler = null;
    }
    this._focusRestoreObserver?.disconnect();
    this._focusRestoreObserver = null;
    this.helpPanel?.destroy();
    this.helpPanel = null;
    this.quickView?.destroy?.();
    this.quickView = null;
    this.grid?.destroy?.();
    this.grid = null;
  }

  /** Giải thích công thức — lấy công thức từ ô đang chọn, gọi AI giải thích */
  async _handleExplainFormula() {
    const [{ LocalAiService }, { showAlertDialog }] = await withLazyFeatureProgress("sheet", "Trợ lý AI", () => Promise.all([
      import("../../platform/ai/ai-service.js"),
      import("../../platform/ui-kit/dialogs.js")
    ]));
    const grid = this.grid;
    if (!grid) return;

    const coord = `${grid.selectedCoord.c}${grid.selectedCoord.r}`;
    const cell = grid.cellsData.get(coord);

    if (!cell?.formula) {
      await showAlertDialog({
        title: t("aiAssistant.explainFormulaTitle", "Giải thích công thức"),
        message: t("aiAssistant.explainFormulaNoFormula", "Ô đang chọn không chứa công thức."),
        type: "warning"
      });
      return;
    }

    const formula = cell.formula;
    this.shell.setStatus?.("Đang giải thích công thức...");
    this.shell.toggleAiSidebar(true);

    const userMsg = document.createElement("div");
    userMsg.style.cssText = "background:var(--vno-bg-hover);border:1px solid var(--vno-border-default);padding:8px 12px;border-radius:var(--vno-radius-md);font-size:12px;margin-top:10px;line-height:1.5;";
    userMsg.innerHTML = `<strong>Bạn:</strong> Giải thích công thức: ${formula.replace(/</g, "&lt;")}`;
    const messagesEl = this.shell.aiSidebar?.querySelector("#vno-ai-messages");
    if (messagesEl) messagesEl.appendChild(userMsg);

    const botMsg = document.createElement("div");
    botMsg.style.cssText = "background:#f0fdf4;border:1px solid #bbf7d0;padding:10px 12px;border-radius:var(--vno-radius-md);font-size:12px;line-height:1.5;margin-top:8px;";
    botMsg.innerHTML = `<span style="color:#16a34a;">Đang phân tích công thức...</span>`;
    if (messagesEl) {
      messagesEl.appendChild(botMsg);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    try {
      const prompt = `Giải thích công thức Excel sau bằng tiếng Việt dễ hiểu. YÊU CẦU:\n- Công thức đang làm gì (mô tả chức năng)\n- Tham chiếu tới đâu (ô/vùng nào)\n- Kết quả mang ý nghĩa gì\n- Giải thích từng phần nếu công thức phức tạp\n\nCông thức: ${formula}`;
      const res = await LocalAiService.query(prompt, { documentText: formula, appName: "sheet" });

      botMsg.innerHTML = `<div style="font-weight:bold;color:#16a34a;margin-bottom:6px;">✨ ${t("aiAssistant.explainFormulaTitle", "Giải thích công thức")}</div>`;
      const replyEl = document.createElement("div");
      replyEl.style.cssText = "white-space:pre-line;color:var(--vno-text-primary);";
      replyEl.textContent = res.reply;
      botMsg.appendChild(replyEl);

      this.shell.setStatus?.("Đã giải thích xong.");
    } catch (error) {
      botMsg.textContent = `⚠️ Lỗi giải thích: ${error.message}`;
      this.shell.setStatus?.("Lỗi giải thích công thức.");
    }
    if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  /** Tạo công thức từ mô tả — mở hộp thoại, gọi AI, validate, cho áp dụng */
  async _handleFormulaFromDescription() {
    const [{ LocalAiService }, { showPromptDialog }, { FUNCTION_CATALOG }] = await withLazyFeatureProgress("sheet", "Trợ lý AI", () => Promise.all([
      import("../../platform/ai/ai-service.js"),
      import("../../platform/ui-kit/dialogs.js"),
      import("./formula-engine.js")
    ]));
    const grid = this.grid;
    if (!grid) return;

    const description = await showPromptDialog({
      title: t("aiAssistant.formulaFromDescTitle", "Tạo công thức từ mô tả"),
      message: t("aiAssistant.formulaFromDescMessage", "Mô tả công thức bạn muốn tạo bằng ngôn ngữ tự nhiên."),
      placeholder: t("aiAssistant.formulaFromDescPlaceholder", "Mô tả công thức cần tạo..."),
      defaultValue: "",
      confirmText: "Tạo công thức",
      cancelText: "Hủy"
    });

    if (!description || !description.trim()) return;

    this.shell.setStatus?.("Đang tạo công thức...");
    this.shell.toggleAiSidebar(true);

    const supportedFunctions = FUNCTION_CATALOG.map(f => f.name).join(", ");
    const userMsg = document.createElement("div");
    userMsg.style.cssText = "background:var(--vno-bg-hover);border:1px solid var(--vno-border-default);padding:8px 12px;border-radius:var(--vno-radius-md);font-size:12px;margin-top:10px;line-height:1.5;";
    userMsg.innerHTML = `<strong>Bạn:</strong> ${description.replace(/</g, "&lt;").replace(/>/g, "&gt;")}`;
    const messagesEl = this.shell.aiSidebar?.querySelector("#vno-ai-messages");
    if (messagesEl) messagesEl.appendChild(userMsg);

    const botMsg = document.createElement("div");
    botMsg.style.cssText = "background:#eff6ff;border:1px solid #bfdbfe;padding:10px 12px;border-radius:var(--vno-radius-md);font-size:12px;line-height:1.5;margin-top:8px;";
    botMsg.innerHTML = `<span style="color:#2563eb;">Đang tạo công thức...</span>`;
    if (messagesEl) {
      messagesEl.appendChild(botMsg);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    try {
      const prompt = `Tạo công thức Excel từ mô tả sau. YÊU CẦU BẮT BUỘC:\n- CHỈ dùng các hàm trong danh sách: ${supportedFunctions}\n- Trả về ĐÚNG MỘT công thức duy nhất bắt đầu bằng dấu =\n- Không giải thích, không văn bản thừa — chỉ công thức\n- Đảm bảo cú pháp chính xác, tương thích 3T Sheet\n\nMô tả: ${description.trim()}`;
      const res = await LocalAiService.query(prompt, { documentText: "", appName: "sheet" });

      let formula = (res.reply || "").trim();
      const lines = formula.split("\n").map(l => l.trim()).filter(l => l.startsWith("="));
      formula = lines[0] || formula;

      if (formula.startsWith("```")) {
        formula = formula.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/, "").trim();
        const fLines = formula.split("\n").map(l => l.trim()).filter(l => l.startsWith("="));
        formula = fLines[0] || formula;
      }

      const supportedNames = new Set(FUNCTION_CATALOG.map(f => f.name));
      const funcMatches = formula.match(/[A-Z]+(?:\.[A-Z]+)?(?=\()/gi) || [];
      const unsupported = funcMatches.filter(fn => !supportedNames.has(fn.toUpperCase()));

      if (unsupported.length > 0) {
        botMsg.innerHTML = `<div style="font-weight:bold;color:#dc2626;margin-bottom:6px;">⚠️ ${t("aiAssistant.formulaFromDescUnsupported", "Công thức chứa hàm Sheet chưa hỗ trợ:")}</div>`;
        const replyEl = document.createElement("div");
        replyEl.style.cssText = "color:var(--vno-text-primary);font-size:12px;";
        replyEl.textContent = unsupported.join(", ");
        botMsg.appendChild(replyEl);
        this.shell.setStatus?.("Công thức chứa hàm chưa hỗ trợ.");
        if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight;
        return;
      }

      const resultEl = document.createElement("div");
      resultEl.style.cssText = "margin-top:8px;padding:8px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:var(--vno-radius-sm);font-family:monospace;font-size:13px;color:var(--vno-text-primary);word-break:break-all;";
      resultEl.textContent = formula;
      botMsg.appendChild(resultEl);

      botMsg.innerHTML = `<div style="font-weight:bold;color:#2563eb;margin-bottom:6px;">✨ ${t("aiAssistant.formulaFromDescPreview", "Xem trước công thức")}</div>`;
      botMsg.appendChild(resultEl);

      const applyBtn = document.createElement("button");
      applyBtn.className = "vno-btn vno-btn-primary";
      applyBtn.style.cssText = "font-size:11px;padding:4px 10px;margin-top:8px;display:inline-block;";
      applyBtn.textContent = t("aiAssistant.formulaFromDescApply", "Áp dụng vào ô đang chọn");
      applyBtn.addEventListener("click", () => {
        const coord = `${grid.selectedCoord.c}${grid.selectedCoord.r}`;
        // Dùng đúng setCellValue() thay vì ghi thẳng vào cellsData — đảm bảo
        // đi qua guard bảo vệ sheet (_guardProtectedMutation), ghi Undo/Redo
        // đúng chuẩn, và để formula engine tự tính lại đúng luồng như khi
        // người dùng gõ tay (khớp cách formula bar gọi setCellValue).
        const applied = grid.setCellValue(grid.selectedCoord.c, grid.selectedCoord.r, formula, true);
        if (applied === false) {
          this.shell.setStatus?.("Không thể áp dụng — sheet đang được bảo vệ.");
          return;
        }
        applyBtn.textContent = "✓ Đã áp dụng";
        applyBtn.disabled = true;
        this.shell.setStatus?.(`Đã áp dụng công thức ${formula} vào ô ${coord}.`);
      });
      botMsg.appendChild(applyBtn);

      this.shell.setStatus?.("Đã tạo công thức xong.");
    } catch (error) {
      botMsg.textContent = `⚠️ Lỗi tạo công thức: ${error.message}`;
      this.shell.setStatus?.("Lỗi tạo công thức.");
    }
    if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight;
  }
}
