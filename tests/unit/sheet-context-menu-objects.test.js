import { SheetGridController } from "../../apps/sheet/sheet-grid.js";
import { createSheetGridWithSheets } from "./sheet-test-fixtures.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.children = [];
    this.dataset = {};
    this.style = {};
    this.attributes = {};
    this._classes = new Set();
    this.classList = {
      add: (...cls) => cls.forEach(c => this._classes.add(c)),
      remove: (...cls) => cls.forEach(c => this._classes.delete(c)),
      contains: c => this._classes.has(c),
      toggle: (c, force) => {
        const next = force !== undefined ? !!force : !this._classes.has(c);
        if (next) this._classes.add(c); else this._classes.delete(c);
        return next;
      }
    };
  }
  get className() { return Array.from(this._classes).join(" "); }
  set className(val) {
    this._classes = new Set(String(val || "").split(/\s+/).filter(Boolean));
  }
  set innerHTML(_value) { this.children = []; }
  append(...children) { this.children.push(...children); }
  appendChild(child) { this.children.push(child); return child; }
  setAttribute(name, value) { this.attributes[name] = value; }
  addEventListener(_name, handler) { this.handler = handler; }
  querySelector(sel) {
    const match = sel.match(/data-shape-id="([^"]+)"/) || sel.match(/data-image-id="([^"]+)"/) || sel.match(/data-textbox-id="([^"]+)"/);
    if (match) {
      return this.children.find(c => c.dataset?.shapeId === match[1] || c.dataset?.imageId === match[1] || c.dataset?.textboxId === match[1]) || null;
    }
    return null;
  }
  querySelectorAll() { return this.children; }
  getBoundingClientRect() { return { left: 120, top: 80, width: 200, height: 100 }; }
}

function createContainer() {
  const listeners = {};
  return {
    listeners,
    addEventListener(evt, handler) {
      listeners[evt] = listeners[evt] || [];
      listeners[evt].push(handler);
    },
    dispatchEvent(event) {
      const handlers = listeners[event?.type || "keydown"] || [];
      for (const h of handlers) h(event);
    },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    classList: { add() {}, remove() {}, toggle() {} },
    contains() { return false; },
    getBoundingClientRect() { return { left: 0, top: 0, width: 1000, height: 600 }; }
  };
}

function createLayer() {
  return {
    children: [],
    set innerHTML(_value) { this.children = []; },
    appendChild(child) { this.children.push(child); return child; },
    querySelector(sel) {
      const match = sel.match(/data-shape-id="([^"]+)"/) || sel.match(/data-image-id="([^"]+)"/) || sel.match(/data-textbox-id="([^"]+)"/);
      if (match) {
        return this.children.find(c => c.dataset?.shapeId === match[1] || c.dataset?.imageId === match[1] || c.dataset?.textboxId === match[1]) || null;
      }
      return null;
    },
    querySelectorAll() { return this.children; }
  };
}

export async function runSheetContextMenuObjectsTests() {
  const results = [];
  const test = (name, callback) => {
    try {
      callback();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: error.message });
    }
  };

  const originalDocument = globalThis.document;
  globalThis.document = {
    createElement: tagName => new FakeElement(tagName),
    body: new FakeElement("body"),
    activeElement: null
  };

  try {
    test("Sheet Context Menu — Shape (Hình dạng): đầy đủ các mục chuẩn Excel 2016 parity", () => {
      const grid = createSheetGridWithSheets(createContainer(), ["Trang 1"]);
      grid.shapeLayer = createLayer();
      grid.imageLayer = createLayer();
      grid.textBoxLayer = createLayer();

      const shp = grid.insertShape({ shapeType: "rectangle", text: "Hình chữ nhật 1" }, { c: "B", r: 3 });
      assert(shp && shp.id, "Không tạo được hình dạng mẫu");

      let capturedItems = null;
      grid._showCustomContextMenu = (e, items) => {
        capturedItems = items;
      };

      grid._showObjectContextMenu({ clientX: 150, clientY: 120, preventDefault() {} }, "shape", shp.id);
      assert(capturedItems && capturedItems.length > 0, "Không hiển thị context menu cho shape");

      const labels = capturedItems.map(it => it.label || "");

      // 1. Nhóm Clipboard
      assert(labels.some(l => l.includes("Cắt")), "Thiếu mục Cắt trong menu hình");
      assert(labels.some(l => l.includes("Sao chép")), "Thiếu mục Sao chép trong menu hình");
      assert(labels.some(l => l.includes("Dán")), "Thiếu mục Dán trong menu hình");

      // 2. Chỉnh sửa văn bản
      assert(labels.some(l => l.includes("Chỉnh sửa văn bản")), "Thiếu mục Chỉnh sửa văn bản trong menu hình");

      // 3. Nhóm, Thứ tự, Căn chỉnh, Xoay
      const groupingItem = capturedItems.find(it => it.label && it.label.includes("Nhóm") && Array.isArray(it.items));
      assert(groupingItem && groupingItem.items.length >= 3, "Thiếu submenu Nhóm (Group, Regroup, Ungroup)");

      const bringToFrontItem = capturedItems.find(it => it.label && it.label.includes("Đưa lên trên") && Array.isArray(it.items));
      assert(bringToFrontItem && bringToFrontItem.items.length === 2, "Thiếu submenu Đưa lên trên");

      const sendToBackItem = capturedItems.find(it => it.label && it.label.includes("Đưa xuống dưới") && Array.isArray(it.items));
      assert(sendToBackItem && sendToBackItem.items.length === 2, "Thiếu submenu Đưa xuống dưới");

      const alignItem = capturedItems.find(it => it.label && it.label.includes("Căn chỉnh") && Array.isArray(it.items));
      assert(alignItem && alignItem.items.length >= 6, "Thiếu submenu Căn chỉnh");

      const rotateItem = capturedItems.find(it => it.label && it.label.includes("Xoay") && Array.isArray(it.items));
      assert(rotateItem && rotateItem.items.length >= 4, "Thiếu submenu Xoay & Lật");

      // 4. Ngăn chọn, Chọn tất cả, Chữ thay thế, Liên kết
      assert(labels.some(l => l.includes("Ngăn chọn")), "Thiếu mục Ngăn chọn trong menu hình");
      assert(labels.some(l => l.includes("Chọn tất cả đối tượng")), "Thiếu mục Chọn tất cả đối tượng trong menu hình");
      assert(labels.some(l => l.includes("Chữ thay thế")), "Thiếu mục Chữ thay thế trong menu hình");
      assert(labels.some(l => l.includes("Liên kết")), "Thiếu mục Liên kết trong menu hình");

      // 5. Excel Parity: Gán macro & Đặt làm mặc định
      assert(labels.some(l => l.includes("Gán macro")), "Thiếu mục Gán macro trong menu hình");
      assert(labels.some(l => l.includes("Đặt làm hình dạng mặc định")), "Thiếu mục Đặt làm hình dạng mặc định trong menu hình");

      // 6. Xóa & Định dạng
      assert(labels.some(l => l.includes("Xóa")), "Thiếu mục Xóa trong menu hình");
      assert(labels.some(l => l.includes("Định dạng hình dạng")), "Thiếu mục Định dạng hình dạng trong menu hình");
    });

    test("Sheet Context Menu — Picture (Hình ảnh): đầy đủ các mục chuẩn Excel 2016 parity", () => {
      const grid = createSheetGridWithSheets(createContainer(), ["Trang 1"]);
      grid.shapeLayer = createLayer();
      grid.imageLayer = createLayer();
      grid.textBoxLayer = createLayer();

      const img = grid.insertImage("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", { c: "C", r: 4 });
      assert(img && img.id, "Không tạo được ảnh mẫu");

      let capturedItems = null;
      grid._showCustomContextMenu = (e, items) => {
        capturedItems = items;
      };

      grid._showObjectContextMenu({ clientX: 200, clientY: 150, preventDefault() {} }, "image", img.id);
      assert(capturedItems && capturedItems.length > 0, "Không hiển thị context menu cho ảnh");

      const labels = capturedItems.map(it => it.label || "");

      // 1. Nhóm Clipboard
      assert(labels.some(l => l.includes("Cắt")), "Thiếu mục Cắt trong menu ảnh");
      assert(labels.some(l => l.includes("Sao chép")), "Thiếu mục Sao chép trong menu ảnh");
      assert(labels.some(l => l.includes("Dán")), "Thiếu mục Dán trong menu ảnh");

      // 2. Thay đổi hình ảnh (Change Picture)
      assert(labels.some(l => l.includes("Thay đổi hình ảnh")), "Thiếu mục Thay đổi hình ảnh trong menu ảnh");

      // 3. Thứ tự và Nhóm
      assert(labels.some(l => l.includes("Nhóm")), "Thiếu mục Nhóm trong menu ảnh");
      assert(labels.some(l => l.includes("Đưa lên trên")), "Thiếu mục Đưa lên trên trong menu ảnh");
      assert(labels.some(l => l.includes("Đưa xuống dưới")), "Thiếu mục Đưa xuống dưới trong menu ảnh");

      // 4. Trợ năng và Macro
      assert(labels.some(l => l.includes("Chữ thay thế")), "Thiếu mục Chữ thay thế trong menu ảnh");
      assert(labels.some(l => l.includes("Gán macro")), "Thiếu mục Gán macro trong menu ảnh");

      // 5. Định dạng đối tượng (Format Object/Picture) & Xóa
      assert(labels.some(l => l.includes("Định dạng đối tượng")), "Thiếu mục Định dạng đối tượng trong menu ảnh");
      assert(labels.some(l => l.includes("Xóa")), "Thiếu mục Xóa trong menu ảnh");
    });

    test("Sheet Context Menu — TextBox (Hộp văn bản): đầy đủ các mục chuẩn Excel 2016 parity", () => {
      const grid = createSheetGridWithSheets(createContainer(), ["Trang 1"]);
      grid.shapeLayer = createLayer();
      grid.imageLayer = createLayer();
      grid.textBoxLayer = createLayer();

      const tb = grid.insertTextBox({ text: "Ghi chú nhanh", anchor: { c: "D", r: 6 } });
      assert(tb && tb.id, "Không tạo được hộp văn bản");

      let capturedItems = null;
      grid._showCustomContextMenu = (e, items) => {
        capturedItems = items;
      };

      grid._showObjectContextMenu({ clientX: 250, clientY: 180, preventDefault() {} }, "textbox", tb.id);
      assert(capturedItems && capturedItems.length > 0, "Không hiển thị context menu cho textbox");

      const labels = capturedItems.map(it => it.label || "");

      // 1. Nhóm Clipboard
      assert(labels.some(l => l.includes("Cắt")), "Thiếu mục Cắt trong menu textbox");
      assert(labels.some(l => l.includes("Sao chép")), "Thiếu mục Sao chép trong menu textbox");
      assert(labels.some(l => l.includes("Dán")), "Thiếu mục Dán trong menu textbox");

      // 2. Chỉnh sửa văn bản
      assert(labels.some(l => l.includes("Chỉnh sửa văn bản")), "Thiếu mục Chỉnh sửa văn bản trong menu textbox");

      // 3. Đặt làm hộp văn bản mặc định & Gán Macro
      assert(labels.some(l => l.includes("Đặt làm hộp văn bản mặc định")), "Thiếu mục Đặt làm hộp văn bản mặc định");
      assert(labels.some(l => l.includes("Gán macro")), "Thiếu mục Gán macro");

      // 4. Định dạng hộp văn bản & Xóa
      assert(labels.some(l => l.includes("Định dạng hộp văn bản")), "Thiếu mục Định dạng hộp văn bản");
      assert(labels.some(l => l.includes("Xóa")), "Thiếu mục Xóa");
    });

    test("Sheet Context Menu — Trạng thái bảo vệ trang tính (Protection): khóa các tác vụ sửa đổi, Copy vẫn bật", () => {
      const grid = createSheetGridWithSheets(createContainer(), ["Trang 1"]);
      grid.shapeLayer = createLayer();
      grid.imageLayer = createLayer();
      grid.textBoxLayer = createLayer();

      const shp = grid.insertShape({ shapeType: "ellipse", text: "Elip" }, { c: "B", r: 2 });

      // Khóa bảo vệ trang tính
      grid.protectSheet("Trang 1", "matkhau");
      assert(grid.isSheetProtected() === true, "Trang tính chưa ở trạng thái bảo vệ");

      let capturedItems = null;
      grid._showCustomContextMenu = (e, items) => {
        capturedItems = items;
      };

      grid._showObjectContextMenu({ clientX: 100, clientY: 100, preventDefault() {} }, "shape", shp.id);
      assert(capturedItems && capturedItems.length > 0, "Không lấy được menu");

      const cutItem = capturedItems.find(it => it.label && it.label.includes("Cắt"));
      const copyItem = capturedItems.find(it => it.label && it.label.includes("Sao chép"));
      const pasteItem = capturedItems.find(it => it.label && it.label.includes("Dán"));
      const deleteItem = capturedItems.find(it => it.label && it.label.includes("Xóa"));
      const formatItem = capturedItems.find(it => it.label && it.label.includes("Định dạng"));
      const macroItem = capturedItems.find(it => it.label && it.label.includes("Gán macro"));

      assert(cutItem.disabled === true, "Mục Cắt phải bị disabled khi sheet bị khóa");
      assert(pasteItem.disabled === true, "Mục Dán phải bị disabled khi sheet bị khóa");
      assert(deleteItem.disabled === true, "Mục Xóa phải bị disabled khi sheet bị khóa");
      assert(formatItem.disabled === true, "Mục Định dạng phải bị disabled khi sheet bị khóa");
      assert(macroItem.disabled === true, "Mục Gán macro phải bị disabled khi sheet bị khóa");

      // EXCEL 2016 PARITY: Copy vẫn ENABLED khi sheet bị bảo vệ
      assert(copyItem.disabled === false, "Mục Sao chép (Copy) phải giữ ENABLED ngay cả khi sheet được bảo vệ (khớp Excel 2016)");
    });

    test("Sheet Context Menu — Kích hoạt bằng bàn phím (Shift+F10 / Menu key) và đóng bằng Escape", () => {
      const grid = createSheetGridWithSheets(createContainer(), ["Trang 1"]);
      grid.shapeLayer = createLayer();
      grid.imageLayer = createLayer();
      grid.textBoxLayer = createLayer();

      const shp = grid.insertShape({ shapeType: "rectangle" }, { c: "B", r: 2 });
      grid.selectObject(shp.id);
      assert(grid.selectedShapeId === shp.id, "Shape chưa được chọn");

      let menuOpened = false;
      let lastItems = null;
      grid._showCustomContextMenu = (e, items) => {
        menuOpened = true;
        lastItems = items;
      };

      // Giả lập phím ContextMenu trên grid
      const eventContextMenu = {
        key: "ContextMenu",
        shiftKey: false,
        ctrlKey: false,
        altKey: false,
        metaKey: false,
        preventDefault() {}
      };
      grid._onKeyDown(eventContextMenu);
      assert(menuOpened === true, "Phím ContextMenu không mở context menu của đối tượng đang chọn");
      assert(lastItems && lastItems.length > 0, "Không có mục nào trong menu");

      // Thử tiếp phím Shift+F10
      menuOpened = false;
      const eventShiftF10 = {
        key: "F10",
        shiftKey: true,
        ctrlKey: false,
        altKey: false,
        metaKey: false,
        preventDefault() {}
      };
      grid._onKeyDown(eventShiftF10);
      assert(menuOpened === true, "Phím Shift+F10 không mở context menu của đối tượng đang chọn");
    });

    test("Sheet Object Actions — Chọn tất cả (selectAllObjects), Đổi ảnh (changeImage), Chữ thay thế (setObjectAltText)", () => {
      const grid = createSheetGridWithSheets(createContainer(), ["Trang 1"]);
      grid.shapeLayer = createLayer();
      grid.imageLayer = createLayer();
      grid.textBoxLayer = createLayer();

      const s1 = grid.insertShape({ shapeType: "rectangle" }, { c: "A", r: 1 });
      const i1 = grid.insertImage("data:image/png;base64,FIRST==", { c: "C", r: 1 });
      const t1 = grid.insertTextBox({ text: "Ghi chú" }, { c: "E", r: 1 });

      // 1. selectAllObjects
      const selected = grid.selectAllObjects();
      assert(selected.length === 3, "selectAllObjects phải chọn cả 3 đối tượng");
      assert(grid.selectedObjectIds.has(s1.id), "Thiếu s1 trong selectedObjectIds");
      assert(grid.selectedObjectIds.has(i1.id), "Thiếu i1 trong selectedObjectIds");
      assert(grid.selectedObjectIds.has(t1.id), "Thiếu t1 trong selectedObjectIds");

      // 2. changeImage
      const updated = grid.changeImage(i1.id, "data:image/png;base64,NEWIMAGE==");
      assert(updated === true, "changeImage phải thành công");
      const foundImg = grid._findObjectById("image", i1.id);
      assert(foundImg.src === "data:image/png;base64,NEWIMAGE==", "Nội dung src ảnh chưa được cập nhật");

      // 3. setObjectAltText
      const altUpdated = grid.setObjectAltText("shape", s1.id, "Mô tả hình chữ nhật cho người khiếm thị");
      assert(altUpdated === true, "setObjectAltText phải thành công");
      const foundShp = grid._findObjectById("shape", s1.id);
      assert(foundShp.altText === "Mô tả hình chữ nhật cho người khiếm thị", "altText chưa được lưu");
    });

    test("Sheet Object Lifecycle — insertShape, deleteShape và Undo/Redo đối xứng", () => {
      const grid = createSheetGridWithSheets(createContainer(), ["Trang 1"]);
      grid.shapeLayer = createLayer();
      grid.imageLayer = createLayer();
      grid.textBoxLayer = createLayer();
      const sheet = grid.activeSheet;

      const shp = grid.insertShape({ shapeType: "ellipse", text: "Vòng tròn", widthPx: 100, heightPx: 100 }, { c: "B", r: 4 });
      assert(grid.shapesBySheet[sheet].length === 1, "Chưa chèn được shape");

      // Xóa shape
      const deleted = grid.deleteShape(shp.id);
      assert(deleted === true, "deleteShape phải thành công");
      assert(grid.shapesBySheet[sheet].length === 0, "Shape chưa bị xóa khỏi shapesBySheet");

      // Undo xóa
      assert(grid.undo(), "Undo deleteShape thất bại");
      assert(grid.shapesBySheet[sheet].length === 1 && grid.shapesBySheet[sheet][0].id === shp.id, "Undo không khôi phục shape");

      // Redo xóa
      assert(grid.redo(), "Redo deleteShape thất bại");
      assert(grid.shapesBySheet[sheet].length === 0, "Redo không xóa lại shape");
    });

    test("Sheet Context Menu — Chuột phải ô thường vẫn hiển thị menu ô chuẩn", () => {
      const grid = createSheetGridWithSheets(createContainer(), ["Trang 1"]);
      grid.shapeLayer = createLayer();
      grid.imageLayer = createLayer();
      grid.textBoxLayer = createLayer();

      // Bỏ chọn mọi object
      grid.selectedObjectIds.clear();
      grid.selectedShapeId = null;
      grid.selectedImageId = null;
      grid.selectedTextBoxId = null;
      grid.selectCell("B", 5);

      let cellMenuOpened = false;
      let cellMenuItems = null;
      grid._showCustomContextMenu = (e, items) => {
        cellMenuOpened = true;
        cellMenuItems = items;
      };

      // Mở menu trên ô B5
      grid.showContextMenu({ clientX: 100, clientY: 100, preventDefault() {} }, "cell", "B5");
      assert(cellMenuOpened === true, "Không mở được context menu cho ô");
      assert(cellMenuItems && cellMenuItems.length > 0, "Menu ô rỗng");
      const labels = cellMenuItems.map(it => it.label || "");
      assert(labels.some(l => l.includes("Cắt")), "Thiếu Cắt trong menu ô");
      assert(labels.some(l => l.includes("Sao chép")), "Thiếu Sao chép trong menu ô");
      assert(labels.some(l => l.includes("Chèn")), "Thiếu Chèn trong menu ô");
      assert(labels.some(l => l.includes("Xóa")), "Thiếu Xóa trong menu ô");
    });

  } finally {
    globalThis.document = originalDocument;
  }

  return results;
}
