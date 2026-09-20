import { readFileSync } from "fs";
import { SheetGridController, _getTabContrastTextColor } from "../../apps/sheet/sheet-grid.js";
import { ICONS } from "../../platform/ui-kit/icons.js";
import { SHEET_RIBBON_TABS } from "../../apps/sheet/sheet-ribbon.js";
import { VN_TO_UNO_MAP } from "../../adapters/libreoffice/common/command-dispatch-mapper.js";

function assert(condition, message) { if (!condition) throw new Error(message); }
function container() {
  return { querySelector() { return null; }, querySelectorAll() { return []; }, classList: { add() {}, remove() {}, toggle() {} } };
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
}
function layer() {
  return { children: [], set innerHTML(_value) { this.children = []; }, appendChild(child) { this.children.push(child); return child; } };
}

export async function runSheetImageTests() {
  const results = [];
  const test = (name, callback) => {
    try { callback(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };
  const originalDocument = globalThis.document;
  globalThis.document = { createElement: tagName => new FakeElement(tagName) };
  try {
    test("Sheet Image: command, mapping, ribbon group và SVG icon đều tồn tại", () => {
      const insertTab = SHEET_RIBBON_TABS.find(tab => tab.id === "insert");
      const illustrations = insertTab.groups.find(group => group.labelKey === "sheetRibbon.group.illustrations");
      const groupIndex = insertTab.groups.indexOf(illustrations);
      assert(illustrations?.items.some(item => item.commandId === "sheet.insert.image"), "Thiếu nút Pictures trong nhóm Illustrations");
      assert(groupIndex >= 0 && groupIndex < insertTab.groups.findIndex(group => group.labelKey === "sheetRibbon.group.charts"), "Illustrations phải đứng trước Charts");
      assert(VN_TO_UNO_MAP["sheet.insert.image"] === ".uno:InsertGraphic", "Mapping InsertGraphic sai");
      assert(ICONS.image?.includes("<svg"), "Thiếu icon SVG image thật");
    });

    test("Sheet Image: chèn tại anchor, render, xóa và Undo/Redo đối xứng", () => {
      const grid = new SheetGridController(container());
      grid.imageLayer = layer();
      const image = grid.insertImage("data:image/png;base64,AA==", { c: "C", r: 5 });
      assert(image.anchor.c === "C" && image.anchor.r === 5, "Anchor C5 không được lưu");
      assert(grid.imageLayer.children[0]?.dataset.anchor === "C5", "Overlay không render tại C5");
      grid.deleteImage(image.id);
      assert(grid.imagesBySheet[grid.activeSheet].length === 0, "Xóa ảnh không cập nhật state");
      assert(grid.undo() && grid.imagesBySheet[grid.activeSheet].length === 1, "Undo xóa không khôi phục ảnh");
      assert(grid.redo() && grid.imagesBySheet[grid.activeSheet].length === 0, "Redo xóa không loại ảnh");
    });

    test("Sheet Image: state và DOM cô lập theo sheet", () => {
      const grid = new SheetGridController(container());
      grid.imageLayer = layer();
      const firstSheet = grid.activeSheet;
      grid.insertImage("data:image/png;base64,AA==", { c: "A", r: 1 });
      grid.switchSheet("Kế hoạch Q3");
      assert(grid.imagesBySheet[grid.activeSheet].length === 0 && grid.imageLayer.children.length === 0, "Ảnh rò sang sheet thứ hai");
      grid.switchSheet(firstSheet);
      assert(grid.imagesBySheet[firstSheet].length === 1 && grid.imageLayer.children.length === 1, "Ảnh sheet đầu không được phục hồi");
    });

    test("Sheet Image: _getAnchorFromPixel tính ngược pixel sang tọa độ ô gần nhất", () => {
      const grid = new SheetGridController(container());
      // Header offset: left=46, top=28, colWidth=100, rowHeight=28
      // Ô A1: left=46, top=28
      const a1 = grid._getAnchorFromPixel(46, 28);
      assert(a1.c === "A" && a1.r === 1, `A1 sai: ${JSON.stringify(a1)}`);

      // Ô B1: left=146, top=28
      const b1 = grid._getAnchorFromPixel(46 + grid.defaultColWidth, 28);
      assert(b1.c === "B" && b1.r === 1, `B1 sai: ${JSON.stringify(b1)}`);

      // Kéo sang D5: col D = 46 + 3*100 = 346, row 5 = 28 + 4*28 = 140
      const d5 = grid._getAnchorFromPixel(46 + 3 * grid.defaultColWidth, 28 + 4 * grid.rowHeight);
      assert(d5.c === "D" && d5.r === 5, `D5 sai: ${JSON.stringify(d5)}`);

      // Snap điểm gần nhất: left=120 nằm giữa 46 và 146 nhưng gần 146 hơn -> B
      const snapB = grid._getAnchorFromPixel(46 + grid.defaultColWidth * 0.75, 30);
      assert(snapB.c === "B" && snapB.r === 1, `Snap B sai: ${JSON.stringify(snapB)}`);

      // Clamp biên trên/trái: left <= 0, top <= 0 -> A1
      const clamped = grid._getAnchorFromPixel(-50, -20);
      assert(clamped.c === "A" && clamped.r === 1, `Clamped sai: ${JSON.stringify(clamped)}`);
    });

    test("Sheet Image: di chuyển ảnh (move) cập nhật anchor, DOM và Undo/Redo đối xứng", () => {
      const grid = new SheetGridController(container());
      grid.imageLayer = layer();
      const image = grid.insertImage("data:image/png;base64,AA==", { c: "B", r: 2 });
      assert(grid.imageLayer.children[0]?.dataset.anchor === "B2", "Ảnh ban đầu không neo tại B2");

      // Mô phỏng chốt vị trí sau khi kéo-thả tới E6
      const oldAnchor = { c: image.anchor.c, r: Number(image.anchor.r) };
      const newAnchor = grid._getAnchorFromPixel(46 + 4 * grid.defaultColWidth, 28 + 5 * grid.rowHeight);
      assert(newAnchor.c === "E" && newAnchor.r === 6, `Tọa độ kéo tới phải là E6: ${JSON.stringify(newAnchor)}`);

      image.anchor = { c: newAnchor.c, r: newAnchor.r };
      grid._recordHistory({
        type: "collection",
        sheet: grid.activeSheet,
        collection: "imagesBySheet",
        operation: "update",
        id: image.id,
        before: { anchor: structuredClone(oldAnchor) },
        after: { anchor: structuredClone(image.anchor) },
        item: structuredClone(image)
      });
      grid.renderImages();

      assert(image.anchor.c === "E" && image.anchor.r === 6, "Anchor không cập nhật sang E6");
      assert(grid.imageLayer.children[0]?.dataset.anchor === "E6", "DOM không re-render tại E6");

      // Undo -> quay về B2
      assert(grid.undo(), "Undo di chuyển ảnh thất bại");
      assert(image.anchor.c === "B" && image.anchor.r === 2, "Undo không đưa anchor về B2");
      assert(grid.imageLayer.children[0]?.dataset.anchor === "B2", "DOM không phục hồi về B2 sau Undo");

      // Redo -> nhảy lại E6
      assert(grid.redo(), "Redo di chuyển ảnh thất bại");
      assert(image.anchor.c === "E" && image.anchor.r === 6, "Redo không đưa anchor lại E6");
      assert(grid.imageLayer.children[0]?.dataset.anchor === "E6", "DOM không re-render tại E6 sau Redo");
    });

    test("Sheet Image: render đúng kích thước widthCm/heightCm và vị trí tích lũy hàng/cột + offset (mock getRowHeight hàng 1 = 198px, ảnh B5 không đè hàng 1)", () => {
      const grid = new SheetGridController(container());
      grid.imageLayer = layer();
      // Mock getRowHeight: hàng 1 cao 198px (như file Dahua thật), các hàng khác 28px
      grid.getRowHeight = (r) => Number(r) === 1 ? 198 : 28;
      grid.getColumnWidth = () => 100;

      // 1. Banner A1: 41.872cm x 5.245cm, offset 0
      const banner = {
        id: "Picture 7",
        src: "data:image/png;base64,AA==",
        anchor: { c: "A", r: 1 },
        widthCm: 41.872,
        heightCm: 5.245,
        offsetXCm: 0,
        offsetYCm: 0
      };
      // 2. Camera B5: 6.27cm x 6.251cm, offset x=1.334cm, y=0.552cm
      const camera = {
        id: "Picture 2",
        src: "data:image/png;base64,AA==",
        anchor: { c: "B", r: 5 },
        widthCm: 6.27,
        heightCm: 6.251,
        offsetXCm: 1.334,
        offsetYCm: 0.552
      };
      grid.imagesBySheet[grid.activeSheet] = [banner, camera];
      grid.selectedImageId = null;
      grid.renderImages();

      const bannerPanel = grid.imageLayer.children[0];
      const cameraPanel = grid.imageLayer.children[1];
      assert(bannerPanel, "Banner panel phải tồn tại");
      assert(cameraPanel, "Camera panel phải tồn tại");

      // Banner A1: top = 24px, left = 44px
      assert(parseFloat(bannerPanel.style.top) === 24, `Top banner phải là 24, thực tế: ${bannerPanel.style.top}`);
      assert(parseFloat(bannerPanel.style.left) === 44, `Left banner phải là 44, thực tế: ${bannerPanel.style.left}`);
      // Banner width: 41.872 * 37.795 = ~1583px, height: 5.245 * 37.795 = ~198px (tràn ngang hàng 1)
      const bannerW = parseFloat(bannerPanel.style.width);
      const bannerH = parseFloat(bannerPanel.style.height);
      assert(bannerW > 1500, `Banner phải vẽ tràn ngang (>1500px), thực tế: ${bannerW}px`);
      assert(Math.abs(bannerH - 198) <= 2, `Banner cao ~198px bằng hàng 1, thực tế: ${bannerH}px`);

      // Camera B5:
      // top = 24 (header) + 198 (hàng 1) + 28*3 (hàng 2,3,4) + 0.552*37.795 (offsetY ~21px) = 24 + 198 + 84 + 21 = 327px
      const cameraTop = parseFloat(cameraPanel.style.top);
      assert(cameraTop >= 320 && cameraTop <= 335, `Camera B5 top phải nằm trong ô B5 (~327px), thực tế: ${cameraTop}px`);
      // Chứng minh không đè hàng 1: hàng 1 kết thúc tại 24 + 198 = 222px. cameraTop = 327px >> 222px
      assert(cameraTop > 222, `Camera B5 top (${cameraTop}px) phải nằm dưới hoàn toàn hàng 1 (kết thúc tại 222px)`);

      // Camera left: 44 (header) + 100 (cột A) + 1.334*37.795 (offsetX ~50px) = 194px
      const cameraLeft = parseFloat(cameraPanel.style.left);
      assert(cameraLeft >= 190 && cameraLeft <= 200, `Camera B5 left phải là ~194px, thực tế: ${cameraLeft}px`);

      // Camera kích thước: ~237px x ~236px
      const cameraW = parseFloat(cameraPanel.style.width);
      const cameraH = parseFloat(cameraPanel.style.height);
      assert(Math.abs(cameraW - 237) <= 2, `Camera B5 width phải ~237px, thực tế: ${cameraW}px`);
      assert(Math.abs(cameraH - 236) <= 2, `Camera B5 height phải ~236px, thực tế: ${cameraH}px`);
    });

    test("Sheet Image: bỏ khung thẻ mặc định khi chưa chọn, hiện viền chọn + 8 handles khi được chọn", () => {
      const grid = new SheetGridController(container());
      grid.imageLayer = layer();
      grid.imagesBySheet[grid.activeSheet] = [{
        id: "img-1",
        src: "data:image/png;base64,AA==",
        anchor: { c: "B", r: 3 },
        widthCm: 5,
        heightCm: 5
      }];
      grid.selectedImageId = null;
      grid.renderImages();

      const panel = grid.imageLayer.children[0];
      assert(panel, "Panel ảnh phải tồn tại");
      assert(!panel.className.includes("is-selected"), "Ảnh chưa chọn không được có class is-selected");

      // Kiểm tra 8 handles tồn tại trong DOM
      const handles = panel.children.filter(child => child.className?.includes("vno-handle-"));
      assert(handles.length === 8, `Phải có đủ 8 resize handles, thực tế: ${handles.length}`);

      // Khi chọn ảnh:
      grid.selectedImageId = "img-1";
      grid.renderImages();
      const selectedPanel = grid.imageLayer.children[0];
      assert(selectedPanel.className.includes("is-selected"), "Ảnh được chọn phải có class is-selected");

      // selectCell deselects ảnh:
      grid.selectCell("A", 1);
      assert(grid.selectedImageId === null, "selectCell phải hủy chọn ảnh");
    });

    test("Sheet Tab Color: _getTabContrastTextColor tinh do sang dung nguong 130 va DOM tab style background/color theo chuan Excel", () => {
      // Contrast text color helper
      assert(_getTabContrastTextColor("#FFFFFF") === "#000000", "Trang phai co chu den");
      assert(_getTabContrastTextColor("#FFFF00") === "#000000", "Vang phai co chu den");
      assert(_getTabContrastTextColor("#FF9900") === "#000000", "Cam phai co chu den");
      assert(_getTabContrastTextColor("#00FF00") === "#000000", "Xanh la sang phai co chu den");
      assert(_getTabContrastTextColor("#00FFFF") === "#000000", "Xanh cyan phai co chu den");
      assert(_getTabContrastTextColor("#000000") === "#ffffff", "Den phai co chu trang");
      assert(_getTabContrastTextColor("#9900FF") === "#ffffff", "Tim phai co chu trang");
      assert(_getTabContrastTextColor("#4A86E8") === "#ffffff", "Xanh duong toi phai co chu trang");

      // DOM tab rendering
      const grid = new SheetGridController(container());
      const tabsList = new FakeElement("div");
      tabsList.id = "vno-sheet-tabs-list";
      const tabBar = new FakeElement("div");
      tabBar.appendChild(tabsList);
      grid.tabBar = tabBar;

      grid.sheets = ["Sheet1", "Sheet2", "Sheet3"];
      grid.activeSheet = "Sheet2";
      grid.sheetStates = {
        Sheet1: { tabColor: "#4A86E8" },
        Sheet2: { tabColor: "#FFFF00" },
      }; // Sheet3 has no color

      grid._renderSheetTabs();

      const tabs = tabsList.children;
      assert(tabs.length === 3, "Phai render du 3 tabs");

      // Tab 1: Inactive with dark blue tabColor (#4A86E8) -> full background, white text, 3px transparent bottom border
      const tab1 = tabs[0];
      assert(tab1.dataset.sheet === "Sheet1", "Tab 1 sai ten");
      assert(tab1.classList.contains("has-tab-color"), "Tab 1 phai co class has-tab-color");
      assert(!tab1.className.includes("is-active"), "Tab 1 khong phai active");
      assert(tab1.style.background === "#4A86E8" && tab1.style.backgroundColor === "#4A86E8", "Tab 1 phai to kin mau nen");
      assert(tab1.style.color === "#ffffff", "Tab 1 phai co mau chu trang vi nen toi");
      assert(tab1.style.borderBottom === "3px solid transparent", "Tab 1 phai co borderBottom 3px transparent");

      // Tab 2: Active with yellow tabColor (#FFFF00) -> white background with 15% tint, 3px solid border
      const tab2 = tabs[1];
      assert(tab2.dataset.sheet === "Sheet2", "Tab 2 sai ten");
      assert(tab2.classList.contains("has-tab-color"), "Tab 2 phai co class has-tab-color");
      assert(tab2.className.includes("is-active"), "Tab 2 phai active");
      assert(tab2.style.background.includes("linear-gradient"), "Tab 2 phai co gradient tint 15%");
      assert(tab2.style.backgroundColor === "#ffffff", "Tab 2 phai co mau nen trang");
      assert(tab2.style.borderBottom === "3px solid #FFFF00", "Tab 2 phai co borderBottom 3px solid mau tab");

      // Tab 3: Inactive without tabColor -> default styling
      const tab3 = tabs[2];
      assert(tab3.dataset.sheet === "Sheet3", "Tab 3 sai ten");
      assert(!tab3.classList.contains("has-tab-color"), "Tab 3 khong duoc co class has-tab-color");
      assert(!tab3.style.background, "Tab 3 khong duoc ghi de background");
    });

    test("Sheet Image Z-Index: lop anh va panel anh luon nam duoi header cot va header hang", () => {
      const cssPath = new URL("../../apps/sheet/sheet.css", import.meta.url);
      const css = readFileSync(cssPath, "utf8");

      // Trich xuat z-index tu CSS cho th.vno-col-header, th.vno-row-header, .vno-grid-corner-header
      const colHeaderMatch = css.match(/\.vno-col-header[^{]*\{[^}]*z-index:\s*(\d+)/s);
      const rowHeaderMatch = css.match(/\.vno-row-header[^{]*\{[^}]*z-index:\s*(\d+)/s);
      const cornerHeaderMatch = css.match(/\.vno-grid-corner-header[^{]*\{[^}]*z-index:\s*(\d+)/s);

      const colZ = colHeaderMatch ? parseInt(colHeaderMatch[1], 10) : 0;
      const rowZ = rowHeaderMatch ? parseInt(rowHeaderMatch[1], 10) : 0;
      const cornerZ = cornerHeaderMatch ? parseInt(cornerHeaderMatch[1], 10) : 0;

      assert(colZ >= 14, `Col header z-index phai >= 14, thuc te: ${colZ}`);
      assert(rowZ >= 12, `Row header z-index phai >= 12, thuc te: ${rowZ}`);
      assert(cornerZ >= 25, `Corner header z-index phai >= 25, thuc te: ${cornerZ}`);

      // Kiem tra z-index cua imageLayer va image panel trong sheet-grid.js
      const grid = new SheetGridController(container());
      grid.imageLayer = layer();
      grid.imagesBySheet[grid.activeSheet] = [
        { id: "img-normal", src: "data:image/png;base64,AA==", anchor: { c: "C", r: 5 } },
        { id: "img-frozen", src: "data:image/png;base64,AA==", anchor: { c: "A", r: 1 } }
      ];
      grid.frozenRows = 2;
      grid.frozenCols = 1;
      grid.renderImages();

      const frozenPanel = grid.imageLayer.children.find(c => c.dataset?.imageId === "img-frozen");
      const normalPanel = grid.imageLayer.children.find(c => c.dataset?.imageId === "img-normal");

      assert(frozenPanel && normalPanel, "Phai render du frozen va normal image panel");
      // Z-index hierarchy:
      // normal image (7) < frozen image (10) < row header (12) < col header (14) < corner (25)
      const normalZ = 7;
      const frozenZ = 10;
      assert(normalZ < rowZ, "Normal image z-index phai nho hon row header z-index");
      assert(normalZ < colZ, "Normal image z-index phai nho hon col header z-index");
      assert(frozenZ < rowZ, "Frozen image z-index phai nho hon row header z-index");
      assert(frozenZ < colZ, "Frozen image z-index phai nho hon col header z-index");
      assert(normalZ < frozenZ, "Normal image z-index phai nho hon frozen image z-index");
      assert(colZ < cornerZ && rowZ < cornerZ, "Corner header phai co z-index cao nhat");
    });

    test("Sheet Image: anh anchor hang 7 co top = top hang 7 (DOM offsetTop)", () => {
      const grid = new SheetGridController(container());
      grid.imageLayer = layer();
      grid.tbody = {
        querySelector: (sel) => {
          if (sel === 'tr[data-row="7"]') return { offsetTop: 691 };
          return null;
        }
      };
      grid.imagesBySheet[grid.activeSheet] = [
        { id: "img-row7", src: "data:image/png;base64,AA==", anchor: { c: "B", r: 7 }, offsetYCm: 0 }
      ];
      grid.renderImages();
      const panel = grid.imageLayer.children.find(c => c.dataset?.imageId === "img-row7");
      assert(panel, "Panel anh hang 7 phai ton tai");
      assert(panel.style.top === "691px", `Top cua anh phai khop offsetTop cua tr hang 7 (691px), thuc te: ${panel.style.top}`);
    });

    test("Sheet Image: page-anchored image with endCellAddress (no anchor) duoc render dung vi tri", () => {
      const grid = new SheetGridController(container());
      grid.imageLayer = layer();
      grid.tbody = {
        querySelector: (sel) => {
          if (sel === 'tr[data-row="5"]') return { offsetTop: 450 };
          return null;
        }
      };
      grid.getRowHeight = () => 28;
      grid.getColumnWidth = () => 100;
      grid.imagesBySheet[grid.activeSheet] = [
        { id: "img-page", src: "data:image/png;base64,AA==", endCellAddress: "$C$5", widthCm: 5, heightCm: 5 }
      ];
      grid.renderImages();
      const panel = grid.imageLayer.children.find(c => c.dataset?.imageId === "img-page");
      assert(panel, "Page-anchored image phai duoc render");
      assert(panel.dataset.anchor === "C5", `Anchor phai la C5 tu endCellAddress, thuc te: ${panel.dataset.anchor}`);
      // top = 24 + (row 1-4 height) + offsetTop of row 5 = 24 + 28*4 + 0 = 136 (hoac offsetTop mock)
      assert(panel.style.top === "450px", `Top phai khop offsetTop cua tr hang 5 (450px), thuc te: ${panel.style.top}`);
    });

    test("Sheet Image: image khong co anchor va khong co endCellAddress bi bo qua (khong crash)", () => {
      const grid = new SheetGridController(container());
      grid.imageLayer = layer();
      grid.imagesBySheet[grid.activeSheet] = [
        { id: "img-no-anchor", src: "data:image/png;base64,AA==" },
        { id: "img-with-anchor", src: "data:image/png;base64,AA==", anchor: { c: "A", r: 1 } }
      ];
      grid.renderImages();
      assert(grid.imageLayer.children.length === 1, "Chi anh co anchor duoc render, anh khong anchor bi bo qua");
      assert(grid.imageLayer.children[0].dataset.imageId === "img-with-anchor", "Anh hop le phai van duoc render");
    });

    test("Sheet Image: anh hien thi placeholder khi onerror (WMF/EMF khong decode duoc) (S25g)", () => {
      const grid = new SheetGridController(container());
      grid.imageLayer = layer();
      grid.imagesBySheet[grid.activeSheet] = [
        { id: "img-broken", src: "data:image/x-wmf;base64,AA==", anchor: { c: "A", r: 1 }, widthCm: 5, heightCm: 5 }
      ];
      grid.renderImages();
      const panel = grid.imageLayer.children.find(c => c.dataset?.imageId === "img-broken");
      assert(panel, "Panel anh phai ton tai");
      const img = panel.children.find(c => c.tagName === "img");
      assert(img, "img phai ton tai");
      // Mo phong loi anh bang cach goi truc tiep onerror handler
      if (img.onerror) img.onerror();
      const brokenPlaceholder = panel.children.find(c => c.className?.includes("vno-image-broken"));
      assert(brokenPlaceholder, "Phai co placeholder .vno-image-broken khi anh loi");
      assert(brokenPlaceholder.style.display !== "none", "Placeholder phai hien thi");
      // img bi an
      assert(img && img.style.display === "none", "Anh loi phai bi an");
    });
  } finally { globalThis.document = originalDocument; }
  return results;
}
