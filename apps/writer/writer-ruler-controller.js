import { globalCommandBus } from "../../platform/commands/command-bus.js";

export const MM_PER_INCH = 25.4;
export const CSS_PX_PER_INCH = 96;

export function mmToScreenPx(mm, pageScreenWidth, pageWidthMm) {
  return Number(mm) * Number(pageScreenWidth) / Number(pageWidthMm);
}

export function screenPxToMm(px, pageScreenWidth, pageWidthMm) {
  return Number(px) * Number(pageWidthMm) / Number(pageScreenWidth);
}

export function markerPositions(state) {
  const pageWidth = state.pageWidthMm;
  const leftEdge = state.margins.left;
  const rightEdge = pageWidth - state.margins.right;
  const leftIndent = leftEdge + state.paragraph.leftMm;
  return {
    marginLeft: leftEdge,
    firstLine: leftIndent + state.paragraph.firstLineMm,
    hanging: leftIndent,
    leftIndent,
    rightIndent: rightEdge - state.paragraph.rightMm,
    marginRight: rightEdge
  };
}

const roundMm = (value, fine = false) => Math.round(value * (fine ? 10 : 1)) / (fine ? 10 : 1);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function stateForMarkerPosition(input, kind, rawPageMm, { fine = false } = {}) {
  const state = JSON.parse(JSON.stringify(input));
  const width = state.pageWidthMm;
  const minText = 10;
  const pageLeft = state.margins.left;
  const pageRight = width - state.margins.right;
  const value = roundMm(rawPageMm, fine);
  const firstAbsolute = pageLeft + state.paragraph.leftMm + state.paragraph.firstLineMm;

  if (kind === "marginLeft") {
    state.margins.left = clamp(value, 0, width - state.margins.right - minText);
  } else if (kind === "marginRight") {
    state.margins.right = clamp(width - value, 0, width - state.margins.left - minText);
  } else if (kind === "firstLine") {
    const base = pageLeft + state.paragraph.leftMm;
    state.paragraph.firstLineMm = clamp(value - base, -state.paragraph.leftMm, pageRight - base - state.paragraph.rightMm);
  } else if (kind === "hanging") {
    const nextLeft = clamp(value - pageLeft, 0, pageRight - pageLeft - state.paragraph.rightMm - minText);
    state.paragraph.leftMm = nextLeft;
    state.paragraph.firstLineMm = firstAbsolute - pageLeft - nextLeft;
  } else if (kind === "leftIndent") {
    state.paragraph.leftMm = clamp(value - pageLeft, 0, pageRight - pageLeft - state.paragraph.rightMm - minText);
  } else if (kind === "rightIndent") {
    state.paragraph.rightMm = clamp(pageRight - value, 0, pageRight - pageLeft - state.paragraph.leftMm - minText);
  }
  return state;
}

const LABELS = {
  marginLeft: "Lề trái",
  marginRight: "Lề phải",
  firstLine: "Thụt dòng đầu",
  hanging: "Thụt lề treo",
  leftIndent: "Thụt lề trái",
  rightIndent: "Thụt lề phải"
};

export class WriterRulerController {
  constructor({ ruler, page, body, viewport, shell }) {
    this.ruler = ruler;
    this.page = page;
    this.body = body;
    this.viewport = viewport;
    this.shell = shell;
    this.track = ruler?.querySelector?.(".vno-ruler-track");
    this.state = null;
    this.drag = null;
    this._syncTimer = 0;
    this._onSelection = () => this.scheduleSync();
    this._onGeometry = () => this.scheduleSync();
    this._onMove = event => this._move(event);
    this._onUp = event => this._end(event);
    this._zoomUnsubscribe = null;
    this._resizeObserver = null;
  }

  attach() {
    this.markers = {};
    for (const marker of this.track?.querySelectorAll?.("[data-ruler-kind]") || []) {
      const kind = marker.dataset.rulerKind;
      this.markers[kind] = marker;
      marker.addEventListener("mousedown", event => this._start(event, kind));
      marker.addEventListener("keydown", event => this._key(event, kind));
    }
    document.addEventListener("selectionchange", this._onSelection);
    this.body?.addEventListener?.("click", this._onSelection);
    this.body?.addEventListener?.("keyup", this._onSelection);
    this.viewport?.addEventListener?.("scroll", this._onGeometry, { passive: true });
    window.addEventListener("resize", this._onGeometry);
    this._zoomUnsubscribe = this.shell?.subscribeZoom?.(this._onGeometry) || null;
    if (typeof ResizeObserver !== "undefined") {
      this._resizeObserver = new ResizeObserver(this._onGeometry);
      this._resizeObserver.observe(this.page);
    }
    this.scheduleSync();
    return this;
  }

  destroy() {
    document.removeEventListener("selectionchange", this._onSelection);
    this.body?.removeEventListener?.("click", this._onSelection);
    this.body?.removeEventListener?.("keyup", this._onSelection);
    this.viewport?.removeEventListener?.("scroll", this._onGeometry);
    window.removeEventListener("resize", this._onGeometry);
    document.removeEventListener("mousemove", this._onMove);
    document.removeEventListener("mouseup", this._onUp);
    this._zoomUnsubscribe?.();
    this._resizeObserver?.disconnect?.();
    this._guide?.remove?.();
  }

  scheduleSync() {
    clearTimeout(this._syncTimer);
    this._syncTimer = setTimeout(() => this.sync(), 0);
  }

  async sync() {
    if (this.drag || !this.track) return;
    const state = await globalCommandBus.execute("writer.ruler.getState");
    if (!state?.pageWidthMm || !state?.margins || !state?.paragraph) return;
    this.state = state;
    this._render(state);
  }

  _geometry() {
    const pageRect = this.page.getBoundingClientRect();
    const rulerRect = this.ruler.getBoundingClientRect();
    return { pageRect, rulerRect, width: pageRect.width, left: pageRect.left - rulerRect.left };
  }

  _render(state) {
    const geometry = this._geometry();
    this.track.style.width = `${geometry.width}px`;
    this.track.style.left = `${geometry.left}px`;
    const px = mm => mmToScreenPx(mm, geometry.width, state.pageWidthMm);
    const textWidth = state.pageWidthMm - state.margins.left - state.margins.right;
    const scale = this.track.querySelector(".vno-ruler-scale");
    const leftShade = this.track.querySelector(".vno-ruler-margin-left");
    const rightShade = this.track.querySelector(".vno-ruler-margin-right");
    if (leftShade) leftShade.style.width = `${px(state.margins.left)}px`;
    if (rightShade) rightShade.style.width = `${px(state.margins.right)}px`;
    if (scale) {
      scale.style.left = `${px(state.margins.left)}px`;
      scale.style.width = `${px(textWidth)}px`;
      scale.style.setProperty("--vno-ruler-cm", `${px(10)}px`);
      const count = Math.max(0, Math.floor(textWidth / 10));
      scale.innerHTML = Array.from({ length: count }, (_, index) =>
        `<span class="vno-ruler-number" style="left:${px((index + 1) * 10)}px">${index + 1}</span>`
      ).join("");
    }
    const positions = markerPositions(state);
    Object.entries(this.markers || {}).forEach(([kind, marker]) => {
      marker.style.left = `${px(positions[kind])}px`;
      const value = this._valueFor(kind, state);
      const title = `${LABELS[kind]}: ${this._format(value)}`;
      marker.title = title;
      marker.setAttribute("aria-label", LABELS[kind]);
      marker.setAttribute("aria-valuemin", "0");
      marker.setAttribute("aria-valuemax", String(Math.round(state.pageWidthMm / 10) / 10));
      marker.setAttribute("aria-valuenow", String(Math.round(value * 10) / 10));
      marker.setAttribute("aria-valuetext", title);
    });
  }

  _valueFor(kind, state) {
    if (kind === "marginLeft") return state.margins.left;
    if (kind === "marginRight") return state.margins.right;
    if (kind === "rightIndent") return state.paragraph.rightMm;
    if (kind === "firstLine") return state.paragraph.leftMm + state.paragraph.firstLineMm;
    return state.paragraph.leftMm;
  }

  _format(value) {
    return `${(Math.round(value * 10) / 10).toLocaleString("vi-VN")} mm (${(Math.round(value) / 10).toLocaleString("vi-VN")} cm)`;
  }

  _start(event, kind) {
    if (event.button !== 0 || !this.state) return;
    event.preventDefault();
    const geometry = this._geometry();
    const nominalX = geometry.pageRect.left + mmToScreenPx(markerPositions(this.state)[kind], geometry.width, this.state.pageWidthMm);
    this.drag = { kind, original: JSON.parse(JSON.stringify(this.state)), geometry, pointerOffset: event.clientX - nominalX };
    event.currentTarget.classList.add("is-dragging");
    document.addEventListener("mousemove", this._onMove);
    document.addEventListener("mouseup", this._onUp);
    this._showGuide(event.clientX);
  }

  _move(event) {
    if (!this.drag) return;
    const nominalX = event.clientX - this.drag.pointerOffset;
    const pageMm = screenPxToMm(nominalX - this.drag.geometry.pageRect.left, this.drag.geometry.width, this.drag.original.pageWidthMm);
    this.state = stateForMarkerPosition(this.drag.original, this.drag.kind, pageMm, { fine: event.altKey });
    this._render(this.state);
    this._showGuide(this.drag.geometry.pageRect.left + mmToScreenPx(markerPositions(this.state)[this.drag.kind], this.drag.geometry.width, this.state.pageWidthMm));
  }

  async _end(event) {
    if (!this.drag) return;
    this._move(event);
    const { kind } = this.drag;
    this.markers[kind]?.classList.remove("is-dragging");
    document.removeEventListener("mousemove", this._onMove);
    document.removeEventListener("mouseup", this._onUp);
    this.drag = null;
    this._guide?.remove?.();
    this._guide = null;
    await this._apply(kind);
    this.scheduleSync();
  }

  async _apply(kind) {
    if (kind === "marginLeft" || kind === "marginRight") {
      return globalCommandBus.execute("writer.ruler.setPageMargins", { margins: this.state.margins });
    }
    return globalCommandBus.execute("writer.ruler.setParagraphIndents", this.state.paragraph);
  }

  async _key(event, kind) {
    if (!this.state || (event.key !== "ArrowLeft" && event.key !== "ArrowRight")) return;
    event.preventDefault();
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const delta = direction * (event.shiftKey ? 5 : 1);
    const current = markerPositions(this.state)[kind];
    this.state = stateForMarkerPosition(this.state, kind, current + delta, { fine: true });
    this._render(this.state);
    await this._apply(kind);
    this.scheduleSync();
  }

  _showGuide(clientX) {
    if (!this._guide) {
      this._guide = document.createElement("div");
      this._guide.className = "vno-ruler-guide";
      document.body.appendChild(this._guide);
    }
    const rect = this.page.getBoundingClientRect();
    this._guide.style.left = `${clientX}px`;
    this._guide.style.top = `${rect.top}px`;
    this._guide.style.height = `${rect.height}px`;
  }
}
