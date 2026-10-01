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
import { HelpPanel } from "../../platform/help/index.js";
import { LocalAiService } from "../../platform/ai/ai-service.js";
import { showAlertDialog, showPromptDialog } from "../../platform/ui-kit/dialogs.js";
import { t } from "../../platform/i18n/i18n.js";
import { FUNCTION_CATALOG } from "./formula-engine.js";
import { autoRecoverManager } from "../../platform/autorecover/auto-recover.js";
import "../../platform/help/entries-sheet.js";

export class SheetApp {
  constructor(mountElement) {
    this.mountElement = mountElement;
    this.shell = null;
    this.grid = null;
    this.adapter = null;
    this.helpPanel = null;
    this._lifecycleObserver = null;
    this._previousSheetOpenProgress = null;
    this._sheetOpenProgressHandler = null;
  }

  async init(options = {}) {
    await bootstrapPlatform();
    globalShortcutManager.setActiveScope("sheet");

    const templateId = options.templateId || "blank";
    const isBlank = templateId !== "budget_estimate";
    this.shell = new AppShell({
      appName: "sheet",
      appTitle: "3T Sheet",
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
      isBlank,
      templateId
    });
    this.grid.mount();

    this.helpPanel = new HelpPanel({ app: "sheet" });
    this.helpPanel.mount(workspace);
    globalCommandBus.bindHandler("sheet.help.open", (args) => {
      if (args?.entryId || args?.query != null) return this.helpPanel.open(args);
      return this.helpPanel.toggle();
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

    this.shell.setEditorCanvas(workspace);

    this.adapter = new SheetAdapter(this.grid);
    this.adapter.setShell(this.shell);
    this.adapter.attach();
    if (typeof window !== "undefined") {
      this._previousSheetOpenProgress = window.__vnoSheetOpenProgress;
      this._sheetOpenProgressHandler = (message, startTiming = false) => {
        if (startTiming) {
          window.__vnoSheetOpenStartedAt = performance.now();
          window.__vnoSheetOpenElapsedMs = null;
          window.__vnoSheetOpenFirstGridPending = false;
        }
        this.shell?.setStatus?.(String(message || "Đang mở bảng tính…"));
      };
      window.__vnoSheetOpenProgress = this._sheetOpenProgressHandler;
    }

    await autoRecoverManager.register({
      appKind: "sheet",
      adapter: this.adapter,
      shell: this.shell,
      helpPanel: this.helpPanel,
      serialize: () => this.adapter.serializeToFods(),
      restore: (content, manifest) => {
        const restored = this.adapter.restoreFromAutoRecover(content, manifest);
        if (restored) this.grid.updateStatus();
        return restored;
      },
      options
    });

    this.grid.updateStatus();
    console.log("[SheetApp] Đã khởi tạo 3T Sheet chuẩn hóa cao cấp.");
  }

  _watchLifecycle() {
    this._lifecycleObserver?.disconnect();
    if (typeof MutationObserver === "undefined") return;
    this._lifecycleObserver = new MutationObserver(() => {
      if (this.mountElement.getAttribute("data-app") !== "sheet") this.destroy();
    });
    this._lifecycleObserver.observe(this.mountElement, { attributes: true, attributeFilter: ["data-app"] });
  }

  destroy() {
    autoRecoverManager.detach(this.adapter);
    if (typeof window !== "undefined" && window.__vnoSheetOpenProgress === this._sheetOpenProgressHandler) {
      if (this._previousSheetOpenProgress) window.__vnoSheetOpenProgress = this._previousSheetOpenProgress;
      else delete window.__vnoSheetOpenProgress;
      this._sheetOpenProgressHandler = null;
    }
    this._lifecycleObserver?.disconnect();
    this._lifecycleObserver = null;
    this.helpPanel?.destroy();
    this.helpPanel = null;
    this.grid?.destroy?.();
    this.grid = null;
  }

  /** Giải thích công thức — lấy công thức từ ô đang chọn, gọi AI giải thích */
  async _handleExplainFormula() {
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
        botMsg.innerHTML = `<div style="font-weight:bold;color:#dc2626;margin-bottom:6px;">⚠️ ${t("aiAssistant.formulaFromDescUnsupported", "Công thức chứa hàm 3T Sheet chưa hỗ trợ:")}</div>`;
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
