import { SpellcheckDomController, isSpellcheckEnabled, setSpellcheckEnabled } from "../../platform/text/spellcheck-dom-controller.js";
import { VietnameseSpellChecker } from "../../platform/text/vi-spellchecker.js";
import { VIETNAMESE_DICTIONARY_WORDS } from "../../platform/text/dictionaries/vi-dictionary.js";

/**
 * Controller kiểm tra chính tả tiếng Việt gạch đỏ sống (inline) cho VN Sheet
 * Tái sử dụng SpellcheckDomController dùng chung của Platform.
 * Quản lý overlay gạch đỏ cho thanh công thức (#vno-formula-val) và ô đang sửa.
 * Không gạch trong công thức (bắt đầu bằng dấu =).
 */
export class SheetInlineSpellcheck {
  constructor(grid) {
    this.grid = grid;
    this.checker = grid.spellChecker || new VietnameseSpellChecker(VIETNAMESE_DICTIONARY_WORDS);
    if (!grid.spellChecker) grid.spellChecker = this.checker;

    this.overlay = null;
    this.overlayContent = null;
    this.domController = null;
    this._listeners = [];

    this._setupOverlay();
  }

  _setupOverlay() {
    const fi = this.grid.formulaInput;
    if (!fi) return;

    const wrap = fi.parentElement;
    if (!wrap) return;

    const doc = fi.ownerDocument || (typeof document !== "undefined" ? document : null);
    if (!doc) {
      this.overlay = { className: "vno-formula-spell-overlay", style: {}, remove() {} };
      this.overlayContent = {
        className: "vno-formula-spell-overlay-content",
        textContent: "",
        querySelectorAll: () => [],
        addEventListener() {},
        removeEventListener() {}
      };
      this.domController = new SpellcheckDomController({
        roots: [this.overlayContent],
        checker: this.checker,
        debounceMs: 50,
        onReplace: (payload) => this._handleReplace(payload)
      });
      return;
    }

    // Tạo overlay hiển thị gạch đỏ lượn sóng
    this.overlay = doc.createElement("div");
    this.overlay.className = "vno-formula-spell-overlay";
    this.overlay.setAttribute("aria-hidden", "true");

    this.overlayContent = doc.createElement("span");
    this.overlayContent.className = "vno-formula-spell-overlay-content";
    this.overlay.appendChild(this.overlayContent);

    // Gắn vào wrap của formulaInput
    wrap.appendChild(this.overlay);

    // Liên kết normalizer của textarea với overlay để applySuggestion ghi snapshot undo
    if (fi._vnoNormalizer) {
      this.overlayContent._vnoNormalizer = fi._vnoNormalizer;
    }

    // Khởi tạo SpellcheckDomController dùng chung của Platform
    this.domController = new SpellcheckDomController({
      roots: [this.overlayContent],
      checker: this.checker,
      debounceMs: 150,
      onReplace: (payload) => this._handleReplace(payload)
    }).attach();

    const onInput = () => this._syncFromInput();
    const onScroll = () => {
      if (this.overlay) {
        this.overlay.scrollLeft = fi.scrollLeft;
        this.overlay.scrollTop = fi.scrollTop;
      }
    };
    const onContextMenu = (e) => this._handleContextMenu(e);

    fi.addEventListener("input", onInput);
    fi.addEventListener("scroll", onScroll);
    fi.addEventListener("contextmenu", onContextMenu);

    // Lưới đổi giá trị thanh công thức bằng mã (đổi ô chọn) chứ không phát sự kiện "input", nên lớp gạch chân giữ chữ của ô
    // trước và vẽ chồng lên dòng gợi ý ("560000" đè lên "Nhập giá trị hoặc công thức..."). Đồng bộ lại mỗi lần gán value.
    const nativeValue = typeof HTMLTextAreaElement !== "undefined" ? Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value") : null;
    if (nativeValue?.get && nativeValue?.set && !Object.prototype.hasOwnProperty.call(fi, "value")) {
      Object.defineProperty(fi, "value", {
        configurable: true,
        get() { return nativeValue.get.call(this); },
        set: (next) => { nativeValue.set.call(fi, next); queueMicrotask(() => this._syncFromInput()); }
      });
      this._listeners.push(() => { delete fi.value; });
    }

    this._listeners.push(
      () => fi.removeEventListener("input", onInput),
      () => fi.removeEventListener("scroll", onScroll),
      () => fi.removeEventListener("contextmenu", onContextMenu)
    );

    // Đồng bộ nội dung ban đầu
    this._syncFromInput();
  }

  _syncFromInput() {
    const fi = this.grid.formulaInput;
    if (!fi || !this.overlay || !this.overlayContent) return;

    const val = fi.value || "";

    // Không gạch trong công thức (bắt đầu bằng =) hoặc khi chính tả đang tắt
    if (val.startsWith("=") || !this.domController?.enabled) {
      this.overlay.style.display = "none";
      this.overlayContent.textContent = "";
      fi.classList.remove("has-spellcheck-overlay");
      return;
    }

    this.overlay.style.display = "";
    this.overlayContent.textContent = val;
    this.overlay.scrollLeft = fi.scrollLeft;
    this.overlay.scrollTop = fi.scrollTop;

    // Lên lịch quét bằng SpellcheckDomController
    this.domController.schedule(100);

    // Đợi quét xong để cập nhật class has-spellcheck-overlay
    setTimeout(() => {
      if (!this.overlayContent) return;
      const markers = this.overlayContent.querySelectorAll(".vno-spelling-uncertain");
      if (markers.length > 0 && !fi.value.startsWith("=") && this.domController?.enabled) {
        fi.classList.add("has-spellcheck-overlay");
      } else {
        fi.classList.remove("has-spellcheck-overlay");
      }
    }, 120);
  }

  _handleContextMenu(e) {
    const fi = this.grid.formulaInput;
    if (!fi || !this.domController?.enabled) return;

    const markers = [...(this.overlayContent?.querySelectorAll(".vno-spelling-uncertain") || [])];
    if (markers.length === 0) return;

    // Tìm marker gần vị trí caret hoặc con trỏ chuột
    const caret = fi.selectionStart ?? 0;
    const val = fi.value || "";
    let matchedMarker = null;

    // Tìm theo caret trong text
    for (const m of markers) {
      const w = m.textContent;
      const idx = val.indexOf(w);
      if (idx >= 0 && caret >= idx && caret <= idx + w.length) {
        matchedMarker = m;
        break;
      }
    }

    if (!matchedMarker && markers.length > 0) {
      matchedMarker = markers[0];
    }

    if (matchedMarker) {
      e.preventDefault();
      this.domController.openMenu(matchedMarker, e.clientX, e.clientY);
    }
  }

  _handleReplace({ word, suggestion, textBefore, textAfter }) {
    const fi = this.grid.formulaInput;
    if (!fi) return;

    const normalizer = fi._vnoNormalizer;
    if (normalizer && typeof normalizer._recordWordSnapshot === "function") {
      normalizer._recordWordSnapshot();
    }

    const newText = textAfter || fi.value.replace(word, suggestion);
    fi.value = newText;

    if (normalizer && typeof normalizer._recordWordSnapshot === "function") {
      normalizer._recordWordSnapshot();
    }

    // Đồng bộ vào phiên sửa công thức / ô đang chọn
    if (this.grid.formulaEntry) {
      this.grid._setFormulaEntryValue(newText, newText.length, { source: "spellcheck" });
    } else if (this.grid.selectedCoord) {
      this.grid.setCellValue(this.grid.selectedCoord.c, this.grid.selectedCoord.r, newText);
    }

    this.overlayContent.textContent = newText;
    this.domController.schedule(50);

    // Phát sự kiện input trên formulaInput
    fi.dispatchEvent(new Event("input", { bubbles: true }));
  }

  setEnabled(enabled) {
    this.domController?.setEnabled(enabled);
    if (!enabled && this.overlayContent) {
      this.overlayContent.textContent = "";
    }
    this._syncFromInput();
    if (this.grid?.formulaEntry?.coord) {
      const coord = this.grid.formulaEntry.coord;
      const td = this.grid.container?.querySelector?.(`.vno-grid-cell[data-coord="${coord.c}${coord.r}"]`);
      if (td) this.grid._renderCellVisual(td, this.grid.cellsData.get(`${coord.c}${coord.r}`), coord.c, coord.r);
    }
  }

  toggle() {
    const next = !isSpellcheckEnabled();
    setSpellcheckEnabled(next);
    this.setEnabled(next);
    return next;
  }

  destroy() {
    for (const remove of this._listeners) remove();
    this._listeners = [];
    this.domController?.destroy();
    this.domController = null;
    this.overlay?.remove();
    this.overlay = null;
    this.overlayContent = null;
  }
}
