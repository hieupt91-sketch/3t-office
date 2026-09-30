/**
 * 3T Sheet — Formula Autocomplete & Parameter IntelliSense Controller
 * Trải nghiệm gợi ý hàm & tooltip cú pháp tham số chuẩn Microsoft Excel
 */

import { parseFormulaContext, formatSyntaxHtml } from "./formula-engine.js";
import { createAutocompletePopup, createSyntaxTooltip } from "../../platform/ui-kit/components.js";

export class FormulaAutocompleteController {
  /**
   * @param {import("./sheet-grid.js").SheetGridController} gridController
   */
  constructor(gridController) {
    this.grid = gridController;
    this.popup = createAutocompletePopup({
      onSelect: (item) => this.acceptSuggestion(item)
    });
    this.tooltip = createSyntaxTooltip();
    this.lastContext = null;
    this._onDocClick = null;
  }

  mount() {
    if (typeof document !== "undefined") {
      this._onDocClick = (e) => {
        if (this.popup.element && this.popup.element.contains(e.target)) return;
        if (this.tooltip.element && this.tooltip.element.contains(e.target)) return;
        if (this.grid.formulaInput && this.grid.formulaInput.contains(e.target)) return;
        this.closeAll();
      };
      document.addEventListener("mousedown", this._onDocClick);
    }
  }

  /**
   * Lấy phần tử DOM của ô đang được chọn để định vị popup/tooltip ngay dưới ô
   * @returns {HTMLElement}
   */
  getTargetCellElement() {
    if (!this.grid || !this.grid.container) return null;
    const coordKey = `${this.grid.selectedCoord.c}${this.grid.selectedCoord.r}`;
    const cellEl = this.grid.container.querySelector(`.vno-grid-cell[data-coord="${coordKey}"]`);
    if (cellEl) {
      const rect = cellEl.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        return cellEl;
      }
    }
    return this.grid.formulaInput;
  }

  /**
   * Xử lý khi giá trị hoặc vị trí con trỏ trong ô / formula bar thay đổi
   * @param {string} formulaStr
   * @param {number} cursorPos
   */
  handleInput(formulaStr, cursorPos) {
    if (!formulaStr || !formulaStr.startsWith("=")) {
      this.closeAll();
      return;
    }

    const pos = (cursorPos !== undefined && cursorPos !== null) ? cursorPos : formulaStr.length;
    const ctx = parseFormulaContext(formulaStr, pos);
    this.lastContext = ctx;

    const targetEl = this.getTargetCellElement();

    if (ctx.mode === "autocomplete") {
      this.tooltip.hide();
      this.popup.show({
        items: ctx.suggestions,
        targetEl,
        activeIndex: 0
      });
    } else if (ctx.mode === "syntax_tooltip") {
      this.popup.hide();
      const html = formatSyntaxHtml(ctx.funcDef.syntax, ctx.activeParamIndex);
      this.tooltip.show({
        html,
        desc: ctx.funcDef.desc,
        targetEl
      });
    } else {
      this.closeAll();
    }
  }

  /**
   * Xử lý phím điều hướng khi popup đang hiển thị
   * @param {KeyboardEvent} e
   * @returns {boolean} true nếu sự kiện đã được xử lý
   */
  handleKeyDown(e) {
    if (this.popup.isVisible()) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        e.stopPropagation();
        this.popup.setActiveIndex(this.popup.getActiveIndex() + 1);
        return true;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        e.stopPropagation();
        this.popup.setActiveIndex(this.popup.getActiveIndex() - 1);
        return true;
      }
      if (e.key === "Tab" || e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        const activeItem = this.popup.getActiveItem();
        if (activeItem) {
          this.acceptSuggestion(activeItem);
        }
        return true;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        this.popup.hide();
        return true;
      }
    } else if (this.tooltip.isVisible()) {
      if (e.key === "Escape") {
        this.tooltip.hide();
      }
    }
    return false;
  }

  /**
   * Chấp nhận hàm được chọn từ danh sách gợi ý và tự động mở ngoặc (
   * @param {Object} item
   */
  acceptSuggestion(item) {
    if (!this.lastContext || this.lastContext.tokenStartIndex === undefined) {
      return;
    }

    const currentFormula = this.grid.formulaInput.value;
    const before = currentFormula.slice(0, this.lastContext.tokenStartIndex);
    const after = currentFormula.slice(this.lastContext.tokenEndIndex);
    const inserted = `${item.name}(`;
    const newFormula = before + inserted + after;
    const newCursorPos = this.lastContext.tokenStartIndex + inserted.length;

    this.grid.formulaInput.value = newFormula;
    this.grid.formulaInput.focus();
    if (typeof this.grid.formulaInput.setSelectionRange === "function") {
      this.grid.formulaInput.setSelectionRange(newCursorPos, newCursorPos);
    }

    this.grid.setCellValue(this.grid.selectedCoord.c, this.grid.selectedCoord.r, newFormula);

    this.popup.hide();
    // Chuyển sang hiển thị tooltip cú pháp tham số cho hàm vừa chèn
    this.handleInput(newFormula, newCursorPos);
  }

  /**
   * Cập nhật lại vị trí khi cuộn trang hoặc thay đổi kích thước
   */
  updatePosition() {
    const targetEl = this.getTargetCellElement();
    if (this.popup.isVisible()) {
      this.popup.reposition(targetEl);
    }
    if (this.tooltip.isVisible()) {
      this.tooltip.reposition(targetEl);
    }
  }

  closeAll() {
    this.popup.hide();
    this.tooltip.hide();
    this.lastContext = null;
  }

  destroy() {
    if (this._onDocClick && typeof document !== "undefined") {
      document.removeEventListener("mousedown", this._onDocClick);
    }
    this._onDocClick = null;
    this.popup.destroy();
    this.tooltip.destroy();
  }
}
