export const WRAP_STYLES = Object.freeze({
  inline: { label: "Cùng dòng với văn bản", css: { display: "inline", float: "none", position: "static", zIndex: "auto" } },
  square: { label: "Vuông", css: { display: "block", float: "left", position: "relative", zIndex: "auto" } },
  tight: { label: "Khít", css: { display: "block", float: "right", position: "relative", zIndex: "auto" } },
  behind: { label: "Phía sau văn bản", css: { display: "block", float: "none", position: "absolute", zIndex: "-1" } },
  front: { label: "Phía trước văn bản", css: { display: "block", float: "none", position: "absolute", zIndex: "10" } },
  topBottom: { label: "Trên và dưới", css: { display: "block", float: "none", position: "relative", zIndex: "auto" } }
});

export const POSITION_PRESETS = Object.freeze({
  topLeft: ["0%", "0%", "translate(0, 0)"],
  topCenter: ["50%", "0%", "translate(-50%, 0)"],
  topRight: ["100%", "0%", "translate(-100%, 0)"],
  middleLeft: ["0%", "50%", "translate(0, -50%)"],
  center: ["50%", "50%", "translate(-50%, -50%)"],
  middleRight: ["100%", "50%", "translate(-100%, -50%)"],
  bottomLeft: ["0%", "100%", "translate(0, -100%)"],
  bottomCenter: ["50%", "100%", "translate(-50%, -100%)"],
  bottomRight: ["100%", "100%", "translate(-100%, -100%)"]
});

const POSITION_LABELS = {
  topLeft: "Trên trái", topCenter: "Trên giữa", topRight: "Trên phải",
  middleLeft: "Giữa trái", center: "Chính giữa", middleRight: "Giữa phải",
  bottomLeft: "Dưới trái", bottomCenter: "Dưới giữa", bottomRight: "Dưới phải"
};

function optionList(items, selected = "") {
  return Object.entries(items).map(([value, item]) => {
    const label = item.label || item;
    return `<option value="${value}"${value === selected ? " selected" : ""}>${label}</option>`;
  }).join("");
}

export class WriterArrangeController {
  constructor({ body, adapter, ribbonHost, mountElement } = {}) {
    this.body = body;
    this.adapter = adapter;
    this.ribbonHost = ribbonHost;
    this.mountElement = mountElement;
    this.selectedImage = null;
  }

  attach() {
    if (!this.body?.addEventListener) return this;
    this.body.style.position ||= "relative";
    this._clickHandler = (event) => {
      const image = event.target?.closest?.("img");
      if (image && this.body.contains(image)) this.selectImage(image);
      else if (!event.target?.closest?.(".vno-writer-arrange-group")) this.clearSelection();
    };
    this._keyHandler = (event) => {
      if (!this.selectedImage || (event.key !== "Delete" && event.key !== "Backspace")) return;
      if (event.target?.matches?.("input,select,textarea")) return;
      event.preventDefault();
      this.adapter?.flushTyping?.();
      this.selectedImage.remove();
      this.clearSelection();
      this._commit("writer.image.delete");
    };
    this.body.addEventListener("click", this._clickHandler);
    this.body.addEventListener("keydown", this._keyHandler);
    this._ribbonObserver = typeof MutationObserver !== "undefined" ? new MutationObserver(() => this._renderRibbonGroup()) : null;
    this._ribbonObserver?.observe?.(this.mountElement, { childList: true, subtree: true });
    this._syncContextualTab(false);
    return this;
  }

  destroy() {
    this.body?.removeEventListener?.("click", this._clickHandler);
    this.body?.removeEventListener?.("keydown", this._keyHandler);
    this._ribbonObserver?.disconnect?.();
    this.clearSelection();
  }

  selectImage(image) {
    if (!image || !this.body?.contains?.(image)) return false;
    this.selectedImage?.classList?.remove("is-vno-image-selected");
    this.selectedImage = image;
    image.classList?.add("is-vno-image-selected");
    image.setAttribute?.("tabindex", "0");
    this._syncContextualTab(true);
    this.ribbonHost?.selectTab?.("pictureFormat");
    this._renderRibbonGroup();
    return true;
  }

  clearSelection() {
    this.selectedImage?.classList?.remove("is-vno-image-selected");
    this.selectedImage = null;
    this._syncContextualTab(false);
  }

  applyWrap(mode) {
    const image = this._currentImage();
    const preset = WRAP_STYLES[mode];
    if (!image || !preset) return false;
    this.adapter?.flushTyping?.();
    Object.assign(image.style, preset.css);
    image.style.margin = mode === "square" || mode === "tight" ? "6pt 10pt 6pt 0" : "10pt 0";
    image.dataset.vnoWrap = mode;
    if (mode === "inline") this._clearCoordinates(image);
    if ((mode === "behind" || mode === "front") && !image.style.left) this.applyPosition("topLeft", false);
    this._commit(`writer.image.wrap.${mode}`);
    this._renderRibbonGroup();
    return true;
  }

  currentSizeMm(image = this._currentImage()) {
    if (!image) return { width: 0, height: 0 };
    const px = (property, dimension, natural) => {
      const raw = Number.parseFloat(image.style?.[property] || "");
      if (Number.isFinite(raw) && raw > 0) return raw;
      const rectValue = Number(image.getBoundingClientRect?.()[dimension]) || 0;
      return rectValue || (Number(image[natural]) ? Number(image[natural]) * 96 / 25.4 : 0);
    };
    return {
      width: px("width", "width", "naturalWidth") / 96 * 25.4,
      height: px("height", "height", "naturalHeight") / 96 * 25.4
    };
  }

  applySize({ widthMm, heightMm, lockAspect = true } = {}) {
    const image = this._currentImage();
    if (!image) return false;
    const current = this.currentSizeMm(image);
    let width = Number(widthMm);
    let height = Number(heightMm);
    const aspect = current.width > 0 && current.height > 0 ? current.width / current.height :
      (Number(image.naturalWidth) > 0 && Number(image.naturalHeight) > 0 ? image.naturalWidth / image.naturalHeight : 1);
    if (Number.isFinite(width) && width > 0) {
      width = Math.min(500, Math.max(1, width));
      if (lockAspect) height = width / aspect;
    } else if (Number.isFinite(height) && height > 0) {
      height = Math.min(500, Math.max(1, height));
      if (lockAspect) width = height * aspect;
    }
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return false;
    width = Math.min(500, Math.max(1, width));
    height = Math.min(500, Math.max(1, height));
    image.style.width = `${(width * 96 / 25.4).toFixed(3)}px`;
    image.style.height = `${(height * 96 / 25.4).toFixed(3)}px`;
    image.dataset.vnoWidthMm = width.toFixed(2);
    image.dataset.vnoHeightMm = height.toFixed(2);
    image.dataset.vnoLockAspect = String(Boolean(lockAspect));
    this._commit("writer.image.resize");
    return { widthMm: width, heightMm: height };
  }

  applyPosition(presetName, commit = true) {
    const image = this._currentImage();
    const preset = POSITION_PRESETS[presetName];
    if (!image || !preset) return false;
    if (commit) this.adapter?.flushTyping?.();
    image.style.position = "absolute";
    image.style.float = "none";
    image.style.display = "block";
    image.style.left = preset[0];
    image.style.top = preset[1];
    image.style.transform = preset[2];
    image.dataset.vnoPosition = presetName;
    image.dataset.vnoWrap ||= "front";
    if (!image.style.zIndex || image.style.zIndex === "auto") image.style.zIndex = "10";
    if (commit) this._commit(`writer.image.position.${presetName}`);
    this._renderRibbonGroup();
    return true;
  }

  bringForward() {
    const image = this._currentImage();
    if (!image) return false;
    this.adapter?.flushTyping?.();
    image.style.position = image.style.position === "absolute" ? "absolute" : "relative";
    image.style.zIndex = String(this._zIndex(image) + 1);
    const sibling = this._adjacentImage(image, 1);
    if (sibling) this._stackingNode(sibling).after(this._stackingNode(image));
    this._commit("writer.image.bringForward");
    return true;
  }

  sendBackward() {
    const image = this._currentImage();
    if (!image) return false;
    this.adapter?.flushTyping?.();
    image.style.position = image.style.position === "absolute" ? "absolute" : "relative";
    image.style.zIndex = String(this._zIndex(image) - 1);
    const sibling = this._adjacentImage(image, -1);
    if (sibling) this._stackingNode(sibling).before(this._stackingNode(image));
    this._commit("writer.image.sendBackward");
    return true;
  }

  align(direction) {
    const image = this._currentImage();
    if (!image || !["left", "center", "right", "top", "middle", "bottom"].includes(direction)) return false;
    this.adapter?.flushTyping?.();
    image.style.position = "absolute";
    image.style.float = "none";
    const x = direction === "left" ? "0%" : direction === "center" ? "50%" : direction === "right" ? "100%" : (image.style.left || "0%");
    const y = direction === "top" ? "0%" : direction === "middle" ? "50%" : direction === "bottom" ? "100%" : (image.style.top || "0%");
    image.style.left = x;
    image.style.top = y;
    image.style.transform = `translate(${x === "50%" ? "-50%" : x === "100%" ? "-100%" : "0"}, ${y === "50%" ? "-50%" : y === "100%" ? "-100%" : "0"})`;
    image.dataset.vnoAlign = direction;
    this._commit(`writer.image.align.${direction}`);
    this._renderRibbonGroup();
    return true;
  }

  _currentImage() {
    if (this.selectedImage && this.body?.contains?.(this.selectedImage)) return this.selectedImage;
    this.clearSelection();
    return null;
  }

  _commit(description) {
    this.adapter && (this.adapter.isDirty = true);
    this.adapter?.recordSnapshot?.(description);
    this.adapter?._recomputeLivePagination?.();
  }

  _clearCoordinates(image) {
    image.style.left = "";
    image.style.top = "";
    image.style.transform = "";
    delete image.dataset.vnoPosition;
    delete image.dataset.vnoAlign;
  }

  _zIndex(image) {
    const value = Number.parseInt(image.style.zIndex, 10);
    return Number.isFinite(value) ? value : 0;
  }

  _nextImageSibling(image) {
    let node = image.nextElementSibling;
    while (node && node.tagName !== "IMG") node = node.nextElementSibling;
    return node;
  }

  _previousImageSibling(image) {
    let node = image.previousElementSibling;
    while (node && node.tagName !== "IMG") node = node.previousElementSibling;
    return node;
  }

  _adjacentImage(image, step) {
    const all = this.body?.querySelectorAll ? [...this.body.querySelectorAll("img")] : [];
    const index = all.indexOf(image);
    if (index >= 0 && all[index + step]) return all[index + step];
    return step > 0 ? this._nextImageSibling(image) : this._previousImageSibling(image);
  }

  _stackingNode(image) {
    let node = image;
    while (node.parentElement && node.parentElement !== this.body) node = node.parentElement;
    return node;
  }

  _syncContextualTab(visible) {
    this.mountElement?.classList?.toggle("vno-writer-image-context", visible);
    const tab = this.mountElement?.querySelector?.("#vno-ribbon-tab-pictureFormat");
    if (tab) {
      tab.hidden = !visible;
      tab.setAttribute("aria-hidden", visible ? "false" : "true");
    }
  }

  _renderRibbonGroup() {
    this._syncContextualTab(Boolean(this.selectedImage));
    if (!this.selectedImage || this.ribbonHost?.activeTabId !== "pictureFormat") return;
    const panel = this.mountElement?.querySelector?.("#vno-ribbon-tabpanel-pictureFormat");
    if (!panel || panel.querySelector(".vno-writer-arrange-group")) return;
    const size = this.currentSizeMm(this.selectedImage);
    const locked = this.selectedImage.dataset.vnoLockAspect !== "false";
    const group = document.createElement("section");
    group.className = "vno-ribbon-group vno-writer-arrange-group";
    group.dataset.groupId = "writerArrange";
    group.innerHTML = `<div class="vno-ribbon-group-items">
      <label>Rộng (mm)<input type="number" min="1" max="500" step="0.1" data-arrange="width" aria-label="Chiều rộng ảnh (mm)" value="${size.width.toFixed(1)}"></label>
      <label>Cao (mm)<input type="number" min="1" max="500" step="0.1" data-arrange="height" aria-label="Chiều cao ảnh (mm)" value="${size.height.toFixed(1)}"></label>
      <label><input type="checkbox" data-arrange="lockAspect" aria-label="Giữ nguyên tỉ lệ ảnh" ${locked ? "checked" : ""}>Giữ tỉ lệ</label>
      <label>Chạy chữ<select data-arrange="wrap" aria-label="Kiểu chạy chữ">${optionList(WRAP_STYLES, this.selectedImage.dataset.vnoWrap || "inline")}</select></label>
      <label>Vị trí<select data-arrange="position" aria-label="Vị trí ảnh trên trang"><option value="">Chọn vị trí…</option>${optionList(POSITION_LABELS, this.selectedImage.dataset.vnoPosition || "")}</select></label>
      <div class="vno-writer-arrange-buttons"><button type="button" data-arrange="forward">Đưa lên</button><button type="button" data-arrange="backward">Đưa xuống</button></div>
      <label>Căn chỉnh<select data-arrange="align" aria-label="Căn ảnh theo trang"><option value="">Chọn căn…</option><option value="left">Trái</option><option value="center">Giữa ngang</option><option value="right">Phải</option><option value="top">Trên</option><option value="middle">Giữa dọc</option><option value="bottom">Dưới</option></select></label>
    </div><div class="vno-ribbon-group-label">Sắp xếp</div>`;
    group.addEventListener("change", (event) => {
      const action = event.target.dataset.arrange;
      if (action === "wrap") this.applyWrap(event.target.value);
      if (action === "position" && event.target.value) this.applyPosition(event.target.value);
      if (action === "align" && event.target.value) this.align(event.target.value);
      if (action === "lockAspect") this.selectedImage.dataset.vnoLockAspect = String(event.target.checked);
      if (action === "width" || action === "height") {
        const lockAspect = group.querySelector('[data-arrange="lockAspect"]')?.checked !== false;
        const measured = this.applySize({ [action === "width" ? "widthMm" : "heightMm"]: Number(event.target.value), lockAspect });
        if (measured) {
          group.querySelector('[data-arrange="width"]').value = measured.widthMm.toFixed(1);
          group.querySelector('[data-arrange="height"]').value = measured.heightMm.toFixed(1);
        }
      }
    });
    group.addEventListener("click", (event) => {
      const action = event.target.closest?.("button")?.dataset.arrange;
      if (action === "forward") this.bringForward();
      if (action === "backward") this.sendBackward();
    });
    panel.appendChild(group);
  }
}
