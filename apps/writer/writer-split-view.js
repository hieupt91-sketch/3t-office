/**
 * VN Writer — Split View Controller
 * Chia cửa sổ soạn thảo thành hai phần độc lập (Split Window) chuẩn Word 2016.
 * Cho phép cuộn độc lập giữa hai phân vùng để đối chiếu các phần khác nhau của tài liệu.
 */

import { t } from "../../platform/i18n/i18n.js";
import { globalCommandBus } from "../../platform/commands/command-bus.js";

export class WriterSplitView {
  constructor(adapter) {
    this.adapter = adapter;
    this.isSplitActive = false;
    this.splitRatio = 50; // Percentage for top pane
    this.topPane = null;
    this.bottomPane = null;
    this.splitBar = null;
    this._isDragging = false;
    this.initCommands();
  }

  initCommands() {
    globalCommandBus.bindHandler("writer.view.split", () => this.toggleSplit());
  }

  get container() {
    return this.adapter?.container || document.querySelector(".vno-writer-app") || document.body;
  }

  get workspace() {
    return this.container?.querySelector?.(".vno-writer-workspace") || this.adapter?.editorDom?.parentElement || this.container;
  }

  toggleSplit(forceState = null) {
    const nextState = forceState !== null ? !!forceState : !this.isSplitActive;
    if (nextState === this.isSplitActive) return this.isSplitActive;

    this.isSplitActive = nextState;

    if (this.isSplitActive) {
      this._activateSplit();
    } else {
      this._deactivateSplit();
    }

    globalCommandBus.updateState("writer.view.split", { checked: this.isSplitActive });
    return this.isSplitActive;
  }

  _activateSplit() {
    if (typeof document === "undefined" || !this.workspace) return;

    this.workspace.classList.add("vno-writer-split-active");

    // Existing content becomes top pane
    let mainScroll = this.workspace.querySelector(".vno-writer-scroll-container") || this.adapter?.editorDom;
    if (mainScroll) {
      this.topPane = mainScroll;
      this.topPane.classList.add("vno-writer-split-top-pane");
      this.topPane.style.height = `${this.splitRatio}%`;
    }

    // Create split bar
    if (!this.splitBar) {
      this.splitBar = document.createElement("div");
      this.splitBar.className = "vno-writer-split-bar";
      this.splitBar.setAttribute("role", "separator");
      this.splitBar.setAttribute("aria-orientation", "horizontal");
      this.splitBar.setAttribute("aria-label", t("writerDialogs.splitHorizontalSeparator", "Vạch chia ngang cửa sổ"));
      this.splitBar.title = "Kéo để thay đổi kích cỡ chia; Nhấp đúp để bỏ chia";

      // Mouse drag handlers
      this.splitBar.addEventListener("mousedown", (e) => this._startDrag(e));
      this.splitBar.addEventListener("dblclick", () => this.toggleSplit(false));
    }

    // Create bottom pane
    if (!this.bottomPane) {
      this.bottomPane = document.createElement("div");
      this.bottomPane.className = "vno-writer-split-bottom-pane";
      this.bottomPane.style.height = `${100 - this.splitRatio}%`;

      // Clone or mirror document content into bottom pane for independent viewing
      const bottomContent = document.createElement("div");
      bottomContent.className = "vno-writer-split-bottom-content";
      if (this.adapter?.editorDom) {
        bottomContent.innerHTML = this.adapter.editorDom.innerHTML;
      }
      this.bottomPane.appendChild(bottomContent);
    }

    if (this.topPane && this.topPane.parentNode) {
      this.topPane.parentNode.insertBefore(this.splitBar, this.topPane.nextSibling);
      this.topPane.parentNode.insertBefore(this.bottomPane, this.splitBar.nextSibling);
    }
  }

  _deactivateSplit() {
    if (typeof document === "undefined" || !this.workspace) return;

    this.workspace.classList.remove("vno-writer-split-active");

    if (this.topPane) {
      this.topPane.classList.remove("vno-writer-split-top-pane");
      this.topPane.style.height = "";
    }

    if (this.splitBar?.parentNode) {
      this.splitBar.parentNode.removeChild(this.splitBar);
    }
    this.splitBar = null;

    if (this.bottomPane?.parentNode) {
      this.bottomPane.parentNode.removeChild(this.bottomPane);
    }
    this.bottomPane = null;
  }

  setSplitRatio(percent) {
    const clamped = Math.max(15, Math.min(85, Number(percent) || 50));
    this.splitRatio = clamped;
    if (this.topPane) this.topPane.style.height = `${this.splitRatio}%`;
    if (this.bottomPane) this.bottomPane.style.height = `${100 - this.splitRatio}%`;
  }

  _startDrag(e) {
    e.preventDefault();
    this._isDragging = true;
    const startY = e.clientY;
    const initialTopHeight = this.topPane?.offsetHeight || 1;
    const totalHeight = this.workspace?.offsetHeight || (initialTopHeight * 2);

    const onMouseMove = (moveEvent) => {
      if (!this._isDragging) return;
      const deltaY = moveEvent.clientY - startY;
      const newHeight = initialTopHeight + deltaY;
      const newPercent = (newHeight / totalHeight) * 100;
      this.setSplitRatio(newPercent);
    };

    const onMouseUp = () => {
      this._isDragging = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }

  destroy() {
    this._deactivateSplit();
  }
}
