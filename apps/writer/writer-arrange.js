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
  constructor({ body, page, adapter, ribbonHost, mountElement } = {}) {
    this.body = body;
    this.page = page || body?.parentElement || body;
    this.adapter = adapter;
    this.ribbonHost = ribbonHost;
    this.mountElement = mountElement;

    this.selectedImage = null;
    this.overlay = null;
    this.wrapMenu = null;
    this._isResizing = false;
    this._lockAspectRatio = true;

    this._onScrollOrResize = () => this._positionOverlay();
  }

  attach() {
    if (!this.body?.addEventListener) return this;
    this.body.style.position ||= "relative";

    this._clickHandler = (event) => {
      const image = event.target?.closest?.("img");
      if (image && this.body.contains(image)) {
        this.selectImage(image);
      } else if (!event.target?.closest?.(".vno-writer-arrange-group") &&
                 !event.target?.closest?.(".vno-image-resize-overlay") &&
                 !event.target?.closest?.(".vno-image-wrap-menu")) {
        this.clearSelection();
      }
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

    if (typeof window !== "undefined") {
      window.addEventListener("resize", this._onScrollOrResize);
      this.body.parentElement?.addEventListener("scroll", this._onScrollOrResize);
    }

    this._ribbonObserver = typeof MutationObserver !== "undefined" ? new MutationObserver(() => this._renderRibbonGroup()) : null;
    this._ribbonObserver?.observe?.(this.mountElement, { childList: true, subtree: true });
    this._syncContextualTab(false);
    return this;
  }

  destroy() {
    this.body?.removeEventListener?.("click", this._clickHandler);
    this.body?.removeEventListener?.("keydown", this._keyHandler);
    if (typeof window !== "undefined") {
      window.removeEventListener("resize", this._onScrollOrResize);
      this.body.parentElement?.removeEventListener("scroll", this._onScrollOrResize);
    }
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
    this._createOrUpdateOverlay();
    return true;
  }

  clearSelection() {
    this.selectedImage?.classList?.remove("is-vno-image-selected");
    this.selectedImage = null;
    this._syncContextualTab(false);
    this._hideOverlay();
    this._closeWrapMenu();
  }

  _createOrUpdateOverlay() {
    if (!this.selectedImage || typeof document === "undefined") return;
    if (!this.overlay) {
      this.overlay = document.createElement("div");
      this.overlay.className = "vno-image-resize-overlay";
      this.overlay.id = "vno-image-resize-overlay";
      this.overlay.style.position = "absolute";
      this.overlay.style.boxSizing = "border-box";
      this.overlay.style.border = "1.5px dashed #2563eb";
      this.overlay.style.pointerEvents = "none";
      this.overlay.style.zIndex = "1001";

      // 8 handles (4 corners + 4 edges)
      const handleDefs = [
        { handle: "nw", cursor: "nwse-resize", style: "top:-5px; left:-5px;" },
        { handle: "n",  cursor: "ns-resize",   style: "top:-5px; left:50%; margin-left:-4px;" },
        { handle: "ne", cursor: "nesw-resize", style: "top:-5px; right:-5px;" },
        { handle: "e",  cursor: "ew-resize",   style: "top:50%; right:-5px; margin-top:-4px;" },
        { handle: "se", cursor: "nwse-resize", style: "bottom:-5px; right:-5px;" },
        { handle: "s",  cursor: "ns-resize",   style: "bottom:-5px; left:50%; margin-left:-4px;" },
        { handle: "sw", cursor: "nesw-resize", style: "bottom:-5px; left:-5px;" },
        { handle: "w",  cursor: "ew-resize",   style: "top:50%; left:-5px; margin-top:-4px;" }
      ];

      for (const def of handleDefs) {
        const h = document.createElement("div");
        h.className = "vno-image-resize-handle";
        h.dataset.handle = def.handle;
        h.style.cssText = `position:absolute; width:9px; height:9px; background:#ffffff; border:1.5px solid #2563eb; border-radius:2px; box-sizing:border-box; pointer-events:auto; cursor:${def.cursor}; ${def.style}`;
        h.addEventListener("mousedown", (e) => this._startResize(e, def.handle));
        this.overlay.appendChild(h);
      }

      // Quick wrap text button at top-right
      const wrapBtn = document.createElement("button");
      wrapBtn.type = "button";
      wrapBtn.className = "vno-image-quick-wrap-btn";
      wrapBtn.title = "Tùy chọn cách ngắt dòng văn bản (Wrap Text)";
      wrapBtn.setAttribute("aria-label", "Tùy chọn cách ngắt dòng văn bản");
      wrapBtn.style.cssText = `position:absolute; top:-24px; right:0; width:22px; height:22px; background:#f8fafc; border:1px solid #94a3b8; border-radius:3px; display:flex; align-items:center; justify-content:center; cursor:pointer; pointer-events:auto; box-shadow:0 1px 3px rgba(0,0,0,0.15); z-index:1002;`;
      wrapBtn.innerHTML = `<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="#2563eb" stroke-width="1.8" stroke-linecap="round"><path d="M2 3h12M2 6h4m4 0h4M2 9h4m4 0h4M2 12h12"/><rect x="6" y="5" width="4" height="5" rx="1" fill="#bfdbfe" stroke="#2563eb"/></svg>`;
      wrapBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this._toggleWrapMenu(wrapBtn);
      });
      this.overlay.appendChild(wrapBtn);

      const parent = this.page || this.body.parentElement || this.body;
      parent.style.position ||= "relative";
      parent.appendChild(this.overlay);
    }
    this._positionOverlay();
  }

  _positionOverlay() {
    if (!this.overlay || !this.selectedImage) return;
    const parent = this.overlay.parentElement;
    if (!parent) return;

    const parentRect = parent.getBoundingClientRect ? parent.getBoundingClientRect() : { left: 0, top: 0, width: 800, height: 1000 };
    const imgRect = this.selectedImage.getBoundingClientRect ? this.selectedImage.getBoundingClientRect() : { left: 50, top: 50, width: 200, height: 150 };

    const left = imgRect.left - parentRect.left;
    const top = imgRect.top - parentRect.top;

    this.overlay.style.left = `${left}px`;
    this.overlay.style.top = `${top}px`;
    this.overlay.style.width = `${imgRect.width || this.selectedImage.offsetWidth || 200}px`;
    this.overlay.style.height = `${imgRect.height || this.selectedImage.offsetHeight || 150}px`;
    this.overlay.style.display = "block";
  }

  _hideOverlay() {
    if (this.overlay) {
      this.overlay.style.display = "none";
      this.overlay.remove?.();
      this.overlay = null;
    }
  }

  _startResize(event, handle) {
    if (!this.selectedImage) return;
    event.preventDefault();
    event.stopPropagation();

    this._isResizing = true;
    this._resizeHandle = handle;
    this._resizeStartX = event.clientX;
    this._resizeStartY = event.clientY;
    this._resizeStartWidth = this.selectedImage.offsetWidth || parseFloat(this.selectedImage.style.width) || 100;
    this._resizeStartHeight = this.selectedImage.offsetHeight || parseFloat(this.selectedImage.style.height) || 100;
    this._aspectRatio = this._resizeStartWidth / Math.max(1, this._resizeStartHeight);

    const isCorner = ["nw", "ne", "se", "sw"].includes(handle);

    const onMove = (moveEv) => {
      if (!this._isResizing || !this.selectedImage) return;
      const dx = moveEv.clientX - this._resizeStartX;
      const dy = moveEv.clientY - this._resizeStartY;

      let newWidth = this._resizeStartWidth;
      let newHeight = this._resizeStartHeight;

      if (isCorner) {
        // CORNER RESIZE: STRICTLY PRESERVE ASPECT RATIO
        let delta = 0;
        if (handle === "se") delta = Math.max(dx, dy * this._aspectRatio);
        else if (handle === "ne") delta = Math.max(dx, -dy * this._aspectRatio);
        else if (handle === "sw") delta = Math.max(-dx, dy * this._aspectRatio);
        else if (handle === "nw") delta = Math.max(-dx, -dy * this._aspectRatio);

        newWidth = Math.max(20, Math.round(this._resizeStartWidth + delta));
        newHeight = Math.max(20, Math.round(newWidth / this._aspectRatio));
      } else {
        // EDGE RESIZE: independent width or height
        if (handle === "e") newWidth = Math.max(20, Math.round(this._resizeStartWidth + dx));
        else if (handle === "w") newWidth = Math.max(20, Math.round(this._resizeStartWidth - dx));
        else if (handle === "s") newHeight = Math.max(20, Math.round(this._resizeStartHeight + dy));
        else if (handle === "n") newHeight = Math.max(20, Math.round(this._resizeStartHeight - dy));
      }

      this.selectedImage.style.width = `${newWidth}px`;
      this.selectedImage.style.height = `${newHeight}px`;
      this.selectedImage.style.maxWidth = "none";
      this._positionOverlay();
      this._updateRibbonSizeInputs(newWidth, newHeight);
    };

    const onUp = () => {
      this._isResizing = false;
      if (typeof document !== "undefined") {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      }
      this._commit("writer.image.resize");
    };

    if (typeof document !== "undefined") {
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    }
  }

  _toggleWrapMenu(anchorBtn) {
    if (this.wrapMenu) {
      this._closeWrapMenu();
      return;
    }
    const menu = document.createElement("div");
    menu.className = "vno-image-wrap-menu";
    menu.style.cssText = `position:absolute; top:26px; right:0; background:#ffffff; border:1px solid #cbd5e1; border-radius:6px; box-shadow:0 4px 14px rgba(0,0,0,0.15); z-index:1003; min-width:210px; padding:4px 0; font-size:12px; pointer-events:auto;`;

    const title = document.createElement("div");
    title.style.cssText = `padding:6px 12px; font-weight:600; color:#334155; border-bottom:1px solid #e2e8f0; font-size:11px; text-transform:uppercase; letter-spacing:0.5px;`;
    title.textContent = "Kiểu ngắt dòng (Wrap Text)";
    menu.appendChild(title);

    const currentWrap = this.selectedImage?.dataset?.vnoWrap || "inline";
    for (const [key, item] of Object.entries(WRAP_STYLES)) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "vno-image-wrap-option" + (key === currentWrap ? " is-selected" : "");
      btn.dataset.wrapMode = key;
      const isSelected = key === currentWrap;
      btn.style.cssText = `display:flex; align-items:center; width:100%; padding:6px 12px; border:none; background:${isSelected ? "#eff6ff" : "none"}; color:${isSelected ? "#1d4ed8" : "#1e293b"}; font-weight:${isSelected ? "600" : "400"}; cursor:pointer; text-align:left; font-size:12px; gap:8px;`;
      btn.innerHTML = `<span style="width:14px; text-align:center;">${isSelected ? "✓" : ""}</span><span>${item.label}</span>`;
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.applyWrap(key);
        this._closeWrapMenu();
      });
      menu.appendChild(btn);
    }

    anchorBtn.parentElement.appendChild(menu);
    this.wrapMenu = menu;
  }

  _closeWrapMenu() {
    this.wrapMenu?.remove();
    this.wrapMenu = null;
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
    this._positionOverlay();
    this._renderRibbonGroup();
    return true;
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
    this._positionOverlay();
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
    this._positionOverlay();
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
    this._positionOverlay();
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
    this._positionOverlay();
    this._renderRibbonGroup();
    return true;
  }

  setImageSize(width, height) {
    const image = this._currentImage();
    if (!image) return false;
    if (width > 0) image.style.width = `${Math.round(width)}px`;
    if (height > 0) image.style.height = `${Math.round(height)}px`;
    image.style.maxWidth = "none";
    this._positionOverlay();
    this._commit("writer.image.resize");
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

  _updateRibbonSizeInputs(width, height) {
    const panel = this.mountElement?.querySelector?.("#vno-ribbon-tabpanel-pictureFormat");
    if (!panel) return;
    const wInput = panel.querySelector("[data-arrange='width']");
    const hInput = panel.querySelector("[data-arrange='height']");
    if (wInput) wInput.value = Math.round(width);
    if (hInput) hInput.value = Math.round(height);
  }

  _renderRibbonGroup() {
    this._syncContextualTab(Boolean(this.selectedImage));
    if (!this.selectedImage || this.ribbonHost?.activeTabId !== "pictureFormat") return;
    const panel = this.mountElement?.querySelector?.("#vno-ribbon-tabpanel-pictureFormat");
    if (!panel || panel.querySelector(".vno-writer-arrange-group")) return;

    const curWidth = this.selectedImage.offsetWidth || parseInt(this.selectedImage.style.width, 10) || 200;
    const curHeight = this.selectedImage.offsetHeight || parseInt(this.selectedImage.style.height, 10) || 150;

    const group = document.createElement("section");
    group.className = "vno-ribbon-group vno-writer-arrange-group";
    group.dataset.groupId = "writerArrange";
    group.innerHTML = `<div class="vno-ribbon-group-items">
      <label>Ngắt dòng văn bản<select data-arrange="wrap" class="vno-image-wrap-menu" aria-label="Kiểu ngắt dòng văn bản">${optionList(WRAP_STYLES, this.selectedImage.dataset.vnoWrap || "inline")}</select></label>
      <label>Vị trí<select data-arrange="position" aria-label="Vị trí ảnh trên trang"><option value="">Chọn vị trí…</option>${optionList(POSITION_LABELS, this.selectedImage.dataset.vnoPosition || "")}</select></label>
      <div class="vno-writer-arrange-buttons"><button type="button" data-arrange="forward">Đưa lên</button><button type="button" data-arrange="backward">Đưa xuống</button></div>
      <label>Căn chỉnh<select data-arrange="align" aria-label="Căn ảnh theo trang"><option value="">Chọn căn…</option><option value="left">Trái</option><option value="center">Giữa ngang</option><option value="right">Phải</option><option value="top">Trên</option><option value="middle">Giữa dọc</option><option value="bottom">Dưới</option></select></label>
      <div style="display:flex; gap:6px; align-items:flex-end;">
        <label>Cao (px)<input type="number" data-arrange="height" value="${Math.round(curHeight)}" style="width:58px; min-height:26px; border:1px solid #94a3b8; border-radius:3px; padding:2px 4px; font-size:11px;" /></label>
        <label>Rộng (px)<input type="number" data-arrange="width" value="${Math.round(curWidth)}" style="width:58px; min-height:26px; border:1px solid #94a3b8; border-radius:3px; padding:2px 4px; font-size:11px;" /></label>
      </div>
    </div><div class="vno-ribbon-group-label">Sắp xếp & Kích thước</div>`;

    group.addEventListener("change", (event) => {
      const action = event.target.dataset.arrange;
      if (action === "wrap") this.applyWrap(event.target.value);
      if (action === "position" && event.target.value) this.applyPosition(event.target.value);
      if (action === "align" && event.target.value) this.align(event.target.value);
      if (action === "width" || action === "height") {
        const wVal = parseFloat(group.querySelector("[data-arrange='width']")?.value) || 0;
        const hVal = parseFloat(group.querySelector("[data-arrange='height']")?.value) || 0;
        this.setImageSize(wVal, hVal);
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
