import { SheetGridController } from "../../apps/sheet/sheet-grid.js";
import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";
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
  insertBefore(newChild, refChild) {
    const idx = this.children.indexOf(refChild);
    if (idx >= 0) this.children.splice(idx, 0, newChild);
    else this.children.push(newChild);
    return newChild;
  }
  setAttribute(name, value) { this.attributes[name] = value; }
  addEventListener(_name, handler) { this.handler = handler; }
  querySelector(sel) {
    if (sel === "#vno-sheet-tabs-list") {
      return this.children.find(c => c.id === "vno-sheet-tabs-list") || null;
    }
    return null;
  }
  querySelectorAll() { return []; }
}

function createContainer() {
  return {
    querySelector() { return null; },
    querySelectorAll() { return []; },
    classList: { add() {}, remove() {}, toggle() {} },
    addEventListener() {},
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
      const match = sel.match(/data-image-id="([^"]+)"/) || sel.match(/data-textbox-id="([^"]+)"/);
      if (match) {
        return this.children.find(c => c.dataset?.imageId === match[1] || c.dataset?.textboxId === match[1]) || null;
      }
      return null;
    },
    querySelectorAll() { return this.children; }
  };
}

export async function runSheetObjectMenuTests() {
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
    body: new FakeElement("body")
  };

  try {
    test("Sheet Object: Tìm kiếm đối tượng bằng _findObjectById", () => {
      const grid = createSheetGridWithSheets(createContainer(), ["Trang 1"]);
      grid.imageLayer = createLayer();
      grid.textBoxLayer = createLayer();

      const img = grid.insertImage("data:image/png;base64,AA==", { c: "B", r: 2 });
      const tb = grid.insertTextBox({ text: "Chào bạn", anchor: { c: "C", r: 3 } });

      const foundImg = grid._findObjectById(img.id);
      assert(foundImg && foundImg.type === "image" && foundImg.item.id === img.id, "Không tìm thấy image qua _findObjectById");

      const foundTb = grid._findObjectById(tb.id);
      assert(foundTb && foundTb.type === "textbox" && foundTb.item.id === tb.id, "Không tìm thấy textbox qua _findObjectById");

      assert(grid._findObjectById("non-existent") === null, "ID không tồn tại phải trả về null");
    });

    test("Sheet Object: Thay đổi thứ tự lớp z-order (Front / Back / Forward / Backward)", () => {
      const grid = createSheetGridWithSheets(createContainer(), ["Trang 1"]);
      grid.imageLayer = createLayer();
      grid.textBoxLayer = createLayer();

      const img1 = grid.insertImage("data:image/png;base64,11==", { c: "A", r: 1 });
      const img2 = grid.insertImage("data:image/png;base64,22==", { c: "B", r: 2 });
      const img3 = grid.insertImage("data:image/png;base64,33==", { c: "C", r: 3 });

      // Ban đầu mảng thứ tự: [img1, img2, img3]
      const sheet = grid.activeSheet;
      assert(grid.imagesBySheet[sheet][0].id === img1.id && grid.imagesBySheet[sheet][2].id === img3.id, "Thứ tự ban đầu sai");

      // Đưa img1 lên trên cùng (bringObjectToFront)
      grid.bringObjectToFront(img1.id);
      assert(grid.imagesBySheet[sheet][2].id === img1.id, "img1 phải ở cuối mảng (trên cùng)");

      // Đưa img1 xuống dưới cùng (sendObjectToBack)
      grid.sendObjectToBack(img1.id);
      assert(grid.imagesBySheet[sheet][0].id === img1.id, "img1 phải ở đầu mảng (dưới cùng)");

      // Đưa img1 tiến lên 1 mức (bringObjectForward)
      grid.bringObjectForward(img1.id);
      assert(grid.imagesBySheet[sheet][1].id === img1.id, "img1 phải ở vị trí thứ 2 (chỉ số 1)");

      // Đưa img1 lùi lại 1 mức (sendObjectBackward)
      grid.sendObjectBackward(img1.id);
      assert(grid.imagesBySheet[sheet][0].id === img1.id, "img1 phải lùi về chỉ số 0");

      // Undo / Redo cho thay đổi thứ tự
      assert(grid.undo(), "Undo reorder thất bại");
      assert(grid.imagesBySheet[sheet][1].id === img1.id, "Undo phải đưa img1 về chỉ số 1");
      assert(grid.redo(), "Redo reorder thất bại");
      assert(grid.imagesBySheet[sheet][0].id === img1.id, "Redo phải đưa img1 về chỉ số 0");
    });

    test("Sheet Object: Xóa TextBox và Undo/Redo đối xứng", () => {
      const grid = createSheetGridWithSheets(createContainer(), ["Trang 1"]);
      grid.textBoxLayer = createLayer();
      const sheet = grid.activeSheet;

      const tb = grid.insertTextBox({ text: "Ghi chú nhanh", anchor: { c: "D", r: 4 } });
      assert(grid.textBoxesBySheet[sheet].length === 1, "Textbox chưa được thêm");

      grid.deleteTextBox(tb.id);
      assert(grid.textBoxesBySheet[sheet].length === 0, "deleteTextBox không xóa textbox");

      assert(grid.undo(), "Undo deleteTextBox thất bại");
      assert(grid.textBoxesBySheet[sheet].length === 1 && grid.textBoxesBySheet[sheet][0].id === tb.id, "Undo không khôi phục textbox");

      assert(grid.redo(), "Redo deleteTextBox thất bại");
      assert(grid.textBoxesBySheet[sheet].length === 0, "Redo không xóa lại textbox");
    });

    test("Sheet Object: Cắt, Sao chép, Dán (cutObject, copyObject, pasteObject)", () => {
      const grid = createSheetGridWithSheets(createContainer(), ["Trang 1"]);
      grid.imageLayer = createLayer();
      grid.textBoxLayer = createLayer();
      const sheet = grid.activeSheet;

      const tb = grid.insertTextBox({ text: "Văn bản mẫu", anchor: { c: "B", r: 5 } });

      // Copy textbox
      const copied = grid.copyObject(tb.id);
      assert(copied === true, "copyObject phải thành công");
      assert(grid._objectClipboard?.type === "textbox" && grid._objectClipboard.data.text === "Văn bản mẫu", "Dữ liệu clipboard sai");

      // Dán textbox tại ô neo mới
      grid.selectedCoord = { c: "E", r: 8 };
      const pasted = grid.pasteObject();
      assert(pasted && pasted.type === "textbox", "pasteObject phải trả về textbox mới");
      assert(grid.textBoxesBySheet[sheet].length === 2, "Số lượng textbox sau dán phải là 2");
      assert(pasted.item.anchor.c === "E" && pasted.item.anchor.r === 8, "Vị trí dán phải bám theo selectedCoord E8");
      assert(pasted.item.id !== tb.id, "ID của đối tượng dán phải mới hoàn toàn");

      // Cut ảnh
      const img = grid.insertImage("data:image/png;base64,CUT==", { c: "A", r: 1 });
      assert(grid.imagesBySheet[sheet].length === 1, "Chưa chèn ảnh");

      const cut = grid.cutObject(img.id);
      assert(cut === true, "cutObject phải thành công");
      assert(grid.imagesBySheet[sheet].length === 0, "Ảnh phải bị xóa sau cutObject");
      assert(grid._objectClipboard?.type === "image", "Clipboard phải chứa ảnh vừa cut");

      // Dán lại ảnh đã cut
      grid.selectedCoord = { c: "C", r: 3 };
      const pastedImg = grid.pasteObject();
      assert(pastedImg && pastedImg.type === "image", "Dán lại ảnh thành công");
      assert(grid.imagesBySheet[sheet].length === 1, "Số ảnh sau dán phải là 1");
      assert(pastedImg.item.anchor.c === "C" && pastedImg.item.anchor.r === 3, "Ảnh dán phải bám C3");
    });

    test("Sheet Object: Menu chuột phải _showObjectContextMenu tạo các mục menu chuẩn", () => {
      const grid = createSheetGridWithSheets(createContainer(), ["Trang 1"]);
      grid.imageLayer = createLayer();
      grid.textBoxLayer = createLayer();

      const img = grid.insertImage("data:image/png;base64,AA==", { c: "B", r: 2 });
      let capturedItems = [];

      grid._showCustomContextMenu = (e, items) => {
        capturedItems = items;
      };

      // Mở menu cho image
      grid._showObjectContextMenu({ clientX: 100, clientY: 200, preventDefault() {} }, img.id);

      assert(capturedItems.length > 0, "Menu phải có các mục");
      const labels = capturedItems.map(it => it.label || it.type);

      // Kiểm tra có đầy đủ các mục yêu cầu
      assert(labels.some(l => l && l.includes("Cắt")), "Thiếu mục Cắt");
      assert(labels.some(l => l && l.includes("Sao chép")), "Thiếu mục Sao chép");
      assert(labels.some(l => l && l.includes("Dán")), "Thiếu mục Dán");
      assert(labels.some(l => l && l.includes("Đưa lên trên")), "Thiếu mục Đưa lên trên");
      assert(labels.some(l => l && l.includes("Đưa xuống dưới")), "Thiếu mục Đưa xuống dưới");
      assert(labels.some(l => l && l.includes("Xóa")), "Thiếu mục Xóa");
      assert(labels.some(l => l && l.includes("Định dạng đối tượng")), "Thiếu mục Định dạng đối tượng");

      // Kiểm tra submenu Đưa lên trên và Đưa xuống dưới
      const bringUp = capturedItems.find(it => it.label && it.label.includes("Đưa lên trên"));
      assert(bringUp && Array.isArray(bringUp.items) && bringUp.items.length === 2, "Đưa lên trên phải có submenu 2 mục");

      const sendDown = capturedItems.find(it => it.label && it.label.includes("Đưa xuống dưới"));
      assert(sendDown && Array.isArray(sendDown.items) && sendDown.items.length === 2, "Đưa xuống dưới phải có submenu 2 mục");
    });

    test("Page Setup Dialog: printOptions chứa đủ 5 thuộc tính chuẩn và cập nhật đúng", () => {
      const grid = createSheetGridWithSheets(createContainer(), ["Trang 1"]);
      const sheet = grid.activeSheet;

      const defaultSetup = grid.getPageSetup(sheet);
      assert(defaultSetup.printOptions, "Thiếu printOptions trong getPageSetup");
      assert(defaultSetup.printOptions.gridlines === false, "gridlines mặc định phải là false");
      assert(defaultSetup.printOptions.headings === false, "headings mặc định phải là false");
      assert(defaultSetup.printOptions.comments === "none", "comments mặc định phải là 'none'");
      assert(defaultSetup.printOptions.cellErrors === "displayed", "cellErrors mặc định phải là 'displayed'");
      assert(defaultSetup.printOptions.pageOrder === "downThenOver", "pageOrder mặc định phải là 'downThenOver'");

      // Cập nhật giá trị tùy chỉnh qua setPageSetup
      grid.setPageSetup(sheet, {
        printOptions: {
          gridlines: true,
          headings: true,
          comments: "atEnd",
          cellErrors: "blank",
          pageOrder: "overThenDown"
        }
      });

      const updated = grid.getPageSetup(sheet);
      assert(updated.printOptions.gridlines === true, "gridlines chưa cập nhật true");
      assert(updated.printOptions.headings === true, "headings chưa cập nhật true");
      assert(updated.printOptions.comments === "sheetEnd", "comments chưa cập nhật sheetEnd (alias atEnd)");
      assert(updated.printOptions.cellErrors === "blank", "cellErrors chưa cập nhật blank");
      assert(updated.printOptions.pageOrder === "overThenDown", "pageOrder chưa cập nhật overThenDown");
    });

    test("Sheet Adapter: printOptions serialized trong FODS bảo toàn 5 trường", () => {
      const adapter = new SheetAdapter();
      const payload = {
        sheets: ["Trang in"],
        cellsBySheet: { "Trang in": {} },
        pageSetupBySheet: {
          "Trang in": {
            size: "a4",
            orientation: "landscape",
            margins: { top: 2, bottom: 2, left: 2, right: 2 },
            scale: { mode: "percent", percent: 90, pagesWide: 1, pagesTall: 1 },
            headerFooter: { header: { left: "", center: "", right: "" }, footer: { left: "", center: "", right: "" } },
            centerOnPage: { horizontal: true, vertical: false },
            printOptions: {
              gridlines: true,
              headings: true,
              comments: "asDisplayed",
              cellErrors: "dash",
              pageOrder: "overThenDown"
            },
            printTitles: { rows: "$1:$2", cols: "$A:$B" }
          }
        }
      };

      adapter.grid = payload;
      const fods = adapter.serializeToFods();
      assert(fods.includes("vno:page-print-options="), "FODS phải có thuộc tính vno:page-print-options");

      // Phân tích ngược FODS qua adapter
      const parsed = adapter.parseFods(fods);
      const parsedSetup = parsed.pageSetupBySheet?.["Trang in"];
      assert(parsedSetup, "Thiếu pageSetupBySheet sau khi parse FODS");
      assert(parsedSetup.printOptions?.gridlines === true, "Parse gridlines sai");
      assert(parsedSetup.printOptions?.headings === true, "Parse headings sai");
      assert(parsedSetup.printOptions?.comments === "asDisplayed", "Parse comments sai");
      assert(parsedSetup.printOptions?.cellErrors === "dash", "Parse cellErrors sai");
      assert(parsedSetup.printOptions?.pageOrder === "overThenDown", "Parse pageOrder sai");
    });

  } finally {
    globalThis.document = originalDocument;
  }

  return results;
}
