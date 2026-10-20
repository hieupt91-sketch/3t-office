/**
 * VN Writer — Arrange & Selection Pane Controller
 * Quản lý Ngăn lựa chọn đối tượng (Selection Pane), thứ tự lớp Z-Order,
 * ẩn/hiện, đổi tên và Nhóm / Bỏ nhóm đối tượng (Group / Ungroup) chuẩn Word 2016.
 */

import { t } from "../../platform/i18n/i18n.js";
import { globalCommandBus } from "../../platform/commands/command-bus.js";

export class WriterArrangeController {
  constructor(adapter) {
    this.adapter = adapter;
    this.isSelectionPaneOpen = false;
    this.selectedObjectIds = new Set();
    this.groups = [];
    this._lastUngroupedChildren = null;
    this.initCommands();
  }

  initCommands() {
    globalCommandBus.bindHandler("writer.view.selectionPane", () => this.toggleSelectionPane());
    globalCommandBus.bindHandler("writer.arrange.group", () => this.groupSelectedObjects());
    globalCommandBus.bindHandler("writer.arrange.ungroup", () => this.ungroupSelectedObjects());
  }

  get container() {
    return this.adapter?.container || document.querySelector(".vno-writer-app") || document.body;
  }

  get shapes() {
    return this.adapter?.shapes || [];
  }

  toggleSelectionPane(forceState = null) {
    this.isSelectionPaneOpen = forceState !== null ? !!forceState : !this.isSelectionPaneOpen;
    let pane = this.container?.querySelector?.("#vno-writer-selection-pane");
    if (!this.isSelectionPaneOpen) {
      if (pane) pane.style.display = "none";
      globalCommandBus.updateState("writer.view.selectionPane", { checked: false });
      return false;
    }
    if (!pane && this.container && typeof document !== "undefined") {
      pane = document.createElement("aside");
      pane.id = "vno-writer-selection-pane";
      pane.className = "vno-writer-selection-pane";
      pane.setAttribute("role", "region");
      pane.setAttribute("aria-label", t("writerRibbon.selectionPane", "Ngăn chọn"));
      this.container.appendChild(pane);
    }
    if (pane) pane.style.display = "flex";
    globalCommandBus.updateState("writer.view.selectionPane", { checked: true });
    this.renderSelectionPane();
    return true;
  }

  renderSelectionPane() {
    if (!this.isSelectionPaneOpen || typeof document === "undefined" || !this.container) return;
    let pane = this.container.querySelector("#vno-writer-selection-pane");
    if (!pane) {
      this.toggleSelectionPane(true);
      pane = this.container.querySelector("#vno-writer-selection-pane");
      if (!pane) return;
    }

    pane.innerHTML = "";

    const header = document.createElement("div");
    header.className = "vno-selection-pane-header";
    const title = document.createElement("h3");
    title.textContent = t("writerDialogs.selectionPane.title", "Lựa chọn");
    header.appendChild(title);

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "vno-selection-pane-close";
    closeBtn.textContent = "×";
    closeBtn.setAttribute("aria-label", "Đóng ngăn chọn");
    closeBtn.addEventListener("click", () => this.toggleSelectionPane(false));
    header.appendChild(closeBtn);
    pane.appendChild(header);

    const toolbar = document.createElement("div");
    toolbar.className = "vno-selection-pane-toolbar";

    const showAllBtn = document.createElement("button");
    showAllBtn.type = "button";
    showAllBtn.textContent = t("writerDialogs.selectionPane.showAll", "Hiện tất cả");
    showAllBtn.addEventListener("click", () => this.showAllObjects());
    toolbar.appendChild(showAllBtn);

    const hideAllBtn = document.createElement("button");
    hideAllBtn.type = "button";
    hideAllBtn.textContent = t("writerDialogs.selectionPane.hideAll", "Ẩn tất cả");
    hideAllBtn.addEventListener("click", () => this.hideAllObjects());
    toolbar.appendChild(hideAllBtn);

    const upBtn = document.createElement("button");
    upBtn.type = "button";
    upBtn.innerHTML = "▲";
    upBtn.title = t("writerDialogs.selectionPane.bringForward", "Đưa lên một lớp");
    upBtn.addEventListener("click", () => this.bringObjectForward());
    toolbar.appendChild(upBtn);

    const downBtn = document.createElement("button");
    downBtn.type = "button";
    downBtn.innerHTML = "▼";
    downBtn.title = t("writerDialogs.selectionPane.sendBackward", "Đưa về một lớp");
    downBtn.addEventListener("click", () => this.sendObjectBackward());
    toolbar.appendChild(downBtn);

    const groupBtn = document.createElement("button");
    groupBtn.type = "button";
    groupBtn.textContent = t("writerDialogs.selectionPane.group", "Nhóm");
    groupBtn.title = "Nhóm các đối tượng đã chọn (Ctrl+G)";
    groupBtn.addEventListener("click", () => this.groupSelectedObjects());
    toolbar.appendChild(groupBtn);

    const ungroupBtn = document.createElement("button");
    ungroupBtn.type = "button";
    ungroupBtn.textContent = t("writerDialogs.selectionPane.ungroup", "Bỏ nhóm");
    ungroupBtn.title = "Tách nhóm đối tượng đã chọn (Ctrl+Shift+G)";
    ungroupBtn.addEventListener("click", () => this.ungroupSelectedObjects());
    toolbar.appendChild(ungroupBtn);

    pane.appendChild(toolbar);

    const list = document.createElement("ul");
    list.className = "vno-selection-pane-list";

    // Objects list in reverse drawing order (topmost first)
    const objects = [...this.getAllObjects()].reverse();

    if (objects.length === 0) {
      const empty = document.createElement("li");
      empty.className = "vno-writer-selection-pane-empty";
      empty.textContent = t("writerDialogs.selectionPane.empty", "Chưa có đối tượng nào.");
      list.appendChild(empty);
    }

    for (const obj of objects) {
      const id = obj.id;
      const isSelected = this.selectedObjectIds.has(id) || this.adapter?.selectedShapeId === id;
      const isVisible = obj.visible !== false;
      const name = this.getObjectName(obj);

      const li = document.createElement("li");
      li.className = isSelected ? "vno-selection-pane-item is-selected" : "vno-selection-pane-item";
      li.dataset.objectId = id;

      const eyeBtn = document.createElement("button");
      eyeBtn.type = "button";
      eyeBtn.className = "vno-selection-pane-eye";
      eyeBtn.textContent = isVisible ? "👁" : "🚫";
      eyeBtn.title = isVisible ? "Ẩn đối tượng" : "Hiện đối tượng";
      eyeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.toggleObjectVisibility(id);
      });
      li.appendChild(eyeBtn);

      const nameSpan = document.createElement("span");
      nameSpan.className = "vno-selection-pane-name";
      nameSpan.textContent = name;
      nameSpan.title = "Nhấp đúp để đổi tên";
      nameSpan.addEventListener("dblclick", (e) => {
        e.stopPropagation();
        const input = document.createElement("input");
        input.type = "text";
        input.value = obj.name || name;
        input.className = "vno-selection-pane-edit";
        const commit = () => {
          this.renameObject(id, input.value);
        };
        input.addEventListener("blur", commit);
        input.addEventListener("keydown", (ke) => {
          if (ke.key === "Enter") { input.blur(); }
          else if (ke.key === "Escape") { this.renderSelectionPane(); }
        });
        nameSpan.replaceWith(input);
        input.focus();
        input.select();
      });
      li.appendChild(nameSpan);

      li.addEventListener("click", (e) => {
        const addToSelection = e.ctrlKey || e.metaKey || e.shiftKey;
        this.selectObject(id, addToSelection);
      });

      list.appendChild(li);
    }

    pane.appendChild(list);
  }

  getAllObjects() {
    const list = [];
    if (Array.isArray(this.adapter?.shapes)) {
      for (const s of this.adapter.shapes) {
        list.push(s);
      }
    }
    return list;
  }

  findObjectById(id) {
    if (!id) return null;
    return this.shapes.find(s => s.id === id) || null;
  }

  getObjectName(obj) {
    if (obj.name) return obj.name;
    const type = obj.type || obj.shapeType || "shape";
    const typeMap = {
      rectangle: "Hình chữ nhật",
      roundrect: "Hình chữ nhật bo góc",
      circle: "Hình ô-van",
      triangle: "Hình tam giác",
      diamond: "Hình thoi",
      arrow: "Mũi tên",
      line: "Đường thẳng",
      textbox: "Hộp văn bản",
      group: "Nhóm hình"
    };
    const prefix = typeMap[type] || "Hình vẽ";
    return `${prefix} ${obj.id?.slice?.(-3) || "1"}`;
  }

  selectObject(id, addToSelection = false) {
    if (!addToSelection) {
      this.selectedObjectIds.clear();
    }
    if (this.selectedObjectIds.has(id)) {
      this.selectedObjectIds.delete(id);
    } else {
      this.selectedObjectIds.add(id);
    }
    if (this.adapter) {
      this.adapter.selectedShapeId = this.selectedObjectIds.size === 1 ? Array.from(this.selectedObjectIds)[0] : null;
      this.adapter._updateShapeSelectionClass?.(this.adapter.selectedShapeId);
    }
    this.syncSelectionDom();
    if (this.isSelectionPaneOpen) {
      this.renderSelectionPane();
    }
  }

  syncSelectionDom() {
    if (typeof document === "undefined") return;
    const items = document.querySelectorAll(".vno-writer-shape-item");
    items.forEach(el => {
      const id = el.dataset.shapeId;
      if (this.selectedObjectIds.has(id)) {
        el.classList.add("is-selected");
      } else {
        el.classList.remove("is-selected");
      }
    });
  }

  toggleObjectVisibility(id) {
    const obj = this.findObjectById(id);
    if (!obj) return;
    obj.visible = obj.visible === false ? true : false;
    this.applyVisibilityToDom(obj);
    if (this.adapter) this.adapter.isDirty = true;
    if (this.isSelectionPaneOpen) this.renderSelectionPane();
  }

  showAllObjects() {
    for (const obj of this.shapes) {
      obj.visible = true;
      this.applyVisibilityToDom(obj);
    }
    if (this.adapter) this.adapter.isDirty = true;
    if (this.isSelectionPaneOpen) this.renderSelectionPane();
  }

  hideAllObjects() {
    for (const obj of this.shapes) {
      obj.visible = false;
      this.applyVisibilityToDom(obj);
    }
    if (this.adapter) this.adapter.isDirty = true;
    if (this.isSelectionPaneOpen) this.renderSelectionPane();
  }

  applyVisibilityToDom(obj) {
    if (typeof document === "undefined") return;
    const el = document.querySelector(`.vno-writer-shape-item[data-shape-id="${obj.id}"]`);
    if (el) {
      el.style.display = obj.visible === false ? "none" : "";
    }
  }

  renameObject(id, newName) {
    const trimmed = String(newName || "").trim();
    if (!trimmed) return;
    const obj = this.findObjectById(id);
    if (!obj) return;
    obj.name = trimmed;
    if (this.adapter) this.adapter.isDirty = true;
    if (this.isSelectionPaneOpen) this.renderSelectionPane();
  }

  bringObjectForward(targetId = null) {
    const id = targetId || Array.from(this.selectedObjectIds).pop();
    if (!id || !this.shapes.length) return false;
    const idx = this.shapes.findIndex(s => s.id === id);
    if (idx < 0 || idx >= this.shapes.length - 1) return false;
    const temp = this.shapes[idx];
    this.shapes[idx] = this.shapes[idx + 1];
    this.shapes[idx + 1] = temp;
    this.updateZIndices();
    return true;
  }

  sendObjectBackward(targetId = null) {
    const id = targetId || Array.from(this.selectedObjectIds).pop();
    if (!id || !this.shapes.length) return false;
    const idx = this.shapes.findIndex(s => s.id === id);
    if (idx <= 0) return false;
    const temp = this.shapes[idx];
    this.shapes[idx] = this.shapes[idx - 1];
    this.shapes[idx - 1] = temp;
    this.updateZIndices();
    return true;
  }

  bringToFront(targetId = null) {
    const id = targetId || Array.from(this.selectedObjectIds).pop();
    if (!id || !this.shapes.length) return false;
    const idx = this.shapes.findIndex(s => s.id === id);
    if (idx < 0 || idx === this.shapes.length - 1) return false;
    const [item] = this.shapes.splice(idx, 1);
    this.shapes.push(item);
    this.updateZIndices();
    return true;
  }

  sendToBack(targetId = null) {
    const id = targetId || Array.from(this.selectedObjectIds).pop();
    if (!id || !this.shapes.length) return false;
    const idx = this.shapes.findIndex(s => s.id === id);
    if (idx <= 0) return false;
    const [item] = this.shapes.splice(idx, 1);
    this.shapes.unshift(item);
    this.updateZIndices();
    return true;
  }

  updateZIndices() {
    this.shapes.forEach((s, i) => {
      s.zIndex = 10 + i;
      if (typeof document !== "undefined") {
        const el = document.querySelector(`.vno-writer-shape-item[data-shape-id="${s.id}"]`);
        if (el) el.style.zIndex = s.zIndex;
      }
    });
    if (this.adapter) this.adapter.isDirty = true;
    if (this.isSelectionPaneOpen) this.renderSelectionPane();
  }

  // --- Group / Ungroup ---

  canGroup() {
    return this.selectedObjectIds.size >= 2;
  }

  canUngroup(objectId = null) {
    if (!objectId) {
      if (!this.selectedObjectIds.size) return false;
      return Array.from(this.selectedObjectIds).some(id => {
        const obj = this.findObjectById(id);
        return obj && (obj.type === "group" || obj.groupId);
      });
    }
    const obj = this.findObjectById(objectId);
    return obj && (obj.type === "group" || obj.groupId);
  }

  groupSelectedObjects() {
    if (!this.canGroup()) return null;
    return this.groupObjects(Array.from(this.selectedObjectIds));
  }

  groupObjects(targetIds) {
    if (!Array.isArray(targetIds) || targetIds.length < 2) return null;

    const childObjects = targetIds.map(id => this.findObjectById(id)).filter(Boolean);
    if (childObjects.length < 2) return null;

    // Calculate group bounding box
    const minX = Math.min(...childObjects.map(s => Number(s.x) || 0));
    const minY = Math.min(...childObjects.map(s => Number(s.y) || 0));
    const maxX = Math.max(...childObjects.map(s => (Number(s.x) || 0) + (Number(s.w) || 0)));
    const maxY = Math.max(...childObjects.map(s => (Number(s.y) || 0) + (Number(s.h) || 0)));

    const count = (this.groups?.length || 0) + 1;
    const groupId = `group-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const groupName = `Nhóm ${count}`;

    const groupObj = {
      id: groupId,
      type: "group",
      name: groupName,
      x: minX,
      y: minY,
      w: maxX - minX,
      h: maxY - minY,
      children: [...targetIds],
      visible: true
    };

    for (const child of childObjects) {
      child.groupId = groupId;
    }

    this.groups.push(groupObj);
    this.shapes.push(groupObj);

    this.selectedObjectIds.clear();
    this.selectedObjectIds.add(groupId);
    if (this.adapter) {
      this.adapter.selectedShapeId = groupId;
      this.adapter.isDirty = true;
      this.adapter._renderShapes?.();
    }
    if (this.isSelectionPaneOpen) this.renderSelectionPane();
    return groupObj;
  }

  ungroupSelectedObjects() {
    const id = Array.from(this.selectedObjectIds)[0];
    return this.ungroupObjects(id);
  }

  ungroupObjects(targetId = null) {
    let group = null;
    if (targetId) {
      group = this.groups.find(g => g.id === targetId) || this.shapes.find(s => s.id === targetId && s.type === "group");
      if (!group) {
        const child = this.findObjectById(targetId);
        if (child?.groupId) {
          group = this.groups.find(g => g.id === child.groupId) || this.shapes.find(s => s.id === child.groupId);
        }
      }
    } else {
      for (const selId of this.selectedObjectIds) {
        group = this.groups.find(g => g.id === selId) || this.shapes.find(s => s.id === selId && s.type === "group");
        if (group) break;
        const child = this.findObjectById(selId);
        if (child?.groupId) {
          group = this.groups.find(g => g.id === child.groupId) || this.shapes.find(s => s.id === child.groupId);
          if (group) break;
        }
      }
    }

    if (!group) return false;

    const children = [...(group.children || [])];
    this._lastUngroupedChildren = [...children];

    for (const childId of children) {
      const child = this.findObjectById(childId);
      if (child) delete child.groupId;
    }

    // Remove group from groups and shapes
    this.groups = this.groups.filter(g => g.id !== group.id);
    const shapeIdx = this.shapes.findIndex(s => s.id === group.id);
    if (shapeIdx >= 0) this.shapes.splice(shapeIdx, 1);

    this.selectedObjectIds.clear();
    for (const cId of children) {
      this.selectedObjectIds.add(cId);
    }

    if (this.adapter) {
      this.adapter.selectedShapeId = children[0] || null;
      this.adapter.isDirty = true;
      this.adapter._renderShapes?.();
    }
    if (this.isSelectionPaneOpen) this.renderSelectionPane();
    return true;
  }
}
