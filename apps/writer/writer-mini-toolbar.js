/**
 * Thanh công cụ nổi (Mini Toolbar) của Writer: hiện cạnh vùng chữ vừa bôi đen bằng chuột và khi nhấp chuột phải,
 * mờ dần khi con trỏ rời xa, biến mất khi gõ phím, nhấp ra ngoài hoặc cuộn. Các nút dùng lại đúng lệnh của ribbon
 * (cùng phím tắt, cùng trạng thái bật/tắt) nên không có logic định dạng riêng ở đây.
 */
import { createCommandButton } from "../../platform/ui-kit/components.js";
import { globalCommandBus } from "../../platform/commands/command-bus.js";

const BUTTON_ROWS = [
  ["writer.font.grow", "writer.font.shrink", "writer.text.clearFormat"],
  ["writer.text.bold", "writer.text.italic", "writer.text.underline", "writer.para.alignCenter", "writer.color.highlight", "writer.color.text"],
  ["writer.list.bullet", "writer.list.numbered", "writer.para.indentDec", "writer.para.indentInc"]
];
const FADED_OPACITY = 0.35;
const NEAR_DISTANCE = 90;
const HIDE_DISTANCE = 220;

function distanceToRect(x, y, rect) {
  const dx = Math.max(rect.left - x, 0, x - rect.right);
  const dy = Math.max(rect.top - y, 0, y - rect.bottom);
  return Math.hypot(dx, dy);
}

export class WriterMiniToolbar {
  constructor({ body, scrollRoots = [] } = {}) {
    this.body = body;
    this.scrollRoots = scrollRoots;
    this.element = null;
    this.mode = null; // "selection" | "contextmenu"
    this._handlers = [];
    this._frame = 0;
  }

  attach() {
    if (!this.body || typeof document === "undefined") return this;
    this._on(this.body, "mouseup", (event) => this._onMouseUp(event));
    this._on(this.body, "contextmenu", (event) => this._onContextMenu(event));
    this._on(document, "mousedown", (event) => this._onMouseDown(event), true);
    this._on(document, "keydown", (event) => this._onKeyDown(event), true);
    this._on(document, "pointermove", (event) => this._onPointerMove(event));
    this._on(document, "selectionchange", () => this._onSelectionChange());
    this._on(window, "blur", () => this.hide());
    for (const root of this.scrollRoots) this._on(root, "scroll", () => this.hide(), true);
    return this;
  }

  destroy() {
    this.hide();
    for (const [target, type, handler, capture] of this._handlers) target.removeEventListener?.(type, handler, capture);
    this._handlers = [];
  }

  isVisible() {
    return Boolean(this.element?.isConnected);
  }

  _on(target, type, handler, capture = false) {
    target.addEventListener(type, handler, capture);
    this._handlers.push([target, type, handler, capture]);
  }

  _selectionInBody() {
    const selection = window.getSelection?.();
    if (!selection || !selection.rangeCount) return null;
    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer?.nodeType === 1 ? range.commonAncestorContainer : range.commonAncestorContainer?.parentElement;
    if (!container || !this.body.contains(container)) return null;
    return { selection, range };
  }

  _onMouseUp(event) {
    if (event.button !== 0 || this.element?.contains(event.target)) return;
    setTimeout(() => {
      const current = this._selectionInBody();
      if (!current || current.selection.isCollapsed || !current.selection.toString().trim()) {
        if (this.mode === "selection") this.hide();
        return;
      }
      this.show({ mode: "selection", range: current.range, pointer: { x: event.clientX, y: event.clientY } });
    }, 0);
  }

  _onContextMenu(event) {
    this.show({ mode: "contextmenu", pointer: { x: event.clientX, y: event.clientY } });
  }

  _onMouseDown(event) {
    if (!this.isVisible() || this.element.contains(event.target)) return;
    // Bắt đầu bôi đen mới hoặc nhấp ra ngoài: bỏ thanh cũ (bôi xong sẽ hiện lại ở mouseup).
    if (event.button === 2 && this.mode === "contextmenu" && this.body.contains(event.target)) return;
    this.hide();
  }

  _onKeyDown(event) {
    if (!this.isVisible()) return;
    if (event.key === "Escape") { this.hide(); return; }
    if (this.element.contains(event.target)) return;
    if (["Shift", "Control", "Alt", "Meta", "CapsLock"].includes(event.key)) return;
    this.hide();
  }

  _onSelectionChange() {
    if (this.mode !== "selection" || !this.isVisible()) return;
    const current = this._selectionInBody();
    if (!current || current.selection.isCollapsed) this.hide();
  }

  _onPointerMove(event) {
    if (!this.isVisible() || this.mode !== "selection") return;
    if (this._frame) return;
    this._frame = requestAnimationFrame(() => {
      this._frame = 0;
      if (!this.isVisible()) return;
      const rect = this.element.getBoundingClientRect();
      const distance = distanceToRect(event.clientX, event.clientY, rect);
      if (distance > HIDE_DISTANCE) { this.hide(); return; }
      const keepOpaque = this.element.contains(document.activeElement) && document.activeElement?.tagName === "SELECT";
      const ratio = distance <= 0 || keepOpaque ? 1 : Math.max(0, 1 - distance / NEAR_DISTANCE);
      this.element.style.opacity = String(Math.max(FADED_OPACITY, FADED_OPACITY + (1 - FADED_OPACITY) * ratio));
    });
  }

  show({ mode, range = null, pointer = null }) {
    this.hide();
    // Dựng một lần rồi dùng lại: createCommandButton đăng ký lắng nghe trạng thái lệnh nên không dựng lại mỗi lần hiện.
    const element = this._root || (this._root = this._build());
    element.setAttribute("data-mode", mode);
    this.mode = mode;
    document.body.appendChild(element);
    this.element = element;
    this._syncSelects();
    this._position({ mode, range, pointer });
    element.style.opacity = mode === "selection" ? String(FADED_OPACITY) : "1";
    return element;
  }

  hide() {
    if (this._frame) { cancelAnimationFrame(this._frame); this._frame = 0; }
    this.element?.remove();
    this.element = null;
    this.mode = null;
  }

  _position({ mode, range, pointer }) {
    const element = this.element;
    const box = element.getBoundingClientRect();
    let anchorX = pointer?.x ?? 0;
    let top;
    if (mode === "selection" && range) {
      const rects = Array.from(range.getClientRects?.() || []).filter(r => r.width > 0 || r.height > 0);
      const last = rects[rects.length - 1] || range.getBoundingClientRect();
      const first = rects[0] || last;
      // Giống Word: ngay phía trên vùng bôi, gần chỗ nhả chuột; nếu sát mép trên thì đặt bên dưới.
      anchorX = Math.min(Math.max(pointer?.x ?? last.right, first.left), Math.max(last.right, first.left));
      top = first.top - box.height - 10;
      if (top < 4) top = last.bottom + 10;
    } else {
      top = (pointer?.y ?? 0) - box.height - 8;
      if (top < 4) top = (pointer?.y ?? 0) + 8;
    }
    const left = Math.min(Math.max(4, anchorX - box.width / 2), Math.max(4, window.innerWidth - box.width - 4));
    element.style.left = `${Math.round(left)}px`;
    element.style.top = `${Math.round(Math.min(Math.max(4, top), Math.max(4, window.innerHeight - box.height - 4)))}px`;
  }

  _build() {
    const element = document.createElement("div");
    element.className = "vno-mini-toolbar";
    element.setAttribute("role", "toolbar");
    element.setAttribute("aria-label", "Thanh công cụ định dạng nhanh");
    // Giữ vùng chọn trong tài liệu: nhấn chuột lên thanh không được làm mất vùng bôi đen.
    element.addEventListener("mousedown", (event) => {
      if (event.target.closest("select, input")) return;
      event.preventDefault();
    });

    const topRow = document.createElement("div");
    topRow.className = "vno-mini-row";
    topRow.appendChild(this._cloneRibbonSelect("writer.font.family", "Phông chữ"));
    topRow.appendChild(this._cloneRibbonSelect("writer.font.size", "Cỡ chữ"));
    for (const id of BUTTON_ROWS[0]) topRow.appendChild(this._button(id));
    element.appendChild(topRow);

    for (const ids of BUTTON_ROWS.slice(1)) {
      const row = document.createElement("div");
      row.className = "vno-mini-row";
      for (const id of ids) row.appendChild(this._button(id));
      element.appendChild(row);
    }
    return element;
  }

  _button(commandId) {
    return createCommandButton({ commandId, iconOnly: true });
  }

  /** Dùng đúng danh sách phông/cỡ chữ của ribbon để hai nơi luôn giống nhau. */
  _cloneRibbonSelect(commandId, ariaLabel) {
    const source = document.querySelector(`select[data-command-id="${commandId}"]`);
    const select = document.createElement("select");
    select.className = "vno-select vno-mini-select";
    select.setAttribute("data-mini-command", commandId);
    select.setAttribute("aria-label", ariaLabel);
    for (const option of Array.from(source?.options || [])) {
      const copy = document.createElement("option");
      copy.value = option.value;
      copy.textContent = option.textContent;
      select.appendChild(copy);
    }
    select.addEventListener("change", () => {
      this._restoreSavedSelection();
      globalCommandBus.execute(commandId, select.value);
    });
    return select;
  }

  _syncSelects() {
    for (const select of this.element?.querySelectorAll?.("select[data-mini-command]") || []) {
      const source = document.querySelector(`select[data-command-id="${select.getAttribute("data-mini-command")}"]`);
      if (source && source.value) select.value = source.value;
    }
    const current = this._selectionInBody();
    this._savedRange = current ? current.range.cloneRange() : null;
  }

  _restoreSavedSelection() {
    if (!this._savedRange || this._selectionInBody()) return;
    const selection = window.getSelection?.();
    if (!selection) return;
    selection.removeAllRanges();
    selection.addRange(this._savedRange);
  }
}
