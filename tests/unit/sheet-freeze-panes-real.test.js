/**
 * VN Office — Unit Tests: Sheet Freeze Panes thật (cố định hàng trên/cột trái
 * của Ô đang chọn, đúng hành vi Excel/Calc thật — trước đây hardcode cứng
 * luôn hàng 1/cột A bất kể Ô đang chọn, và biến mất khỏi màn hình khi cuộn xa
 * do lỗi ảo hóa hàng không tính đến hàng cố định).
 * Tuân thủ chuẩn 06-testing/TESTING-STANDARD.md & AGENTS.md
 */
import { SheetGridController } from "../../apps/sheet/sheet-grid.js";
import { createSheetGridWithSheets } from "./sheet-test-fixtures.js";
import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";
import { mapVnCommandToUno } from "../../adapters/libreoffice/common/command-dispatch-mapper.js";
import { SHEET_COMMANDS } from "../../platform/commands/command-definitions.js";
import {
  applyFreezePaneToSheetXml,
  applyFreezePanesToFods,
  applySplitPaneToSheetXml,
  applySplitPanesToFods,
  columnLabelFromIndex,
  parseFreezePaneFromSheetXml,
  parseFreezePanesFromFods,
  parseSplitPaneFromSheetXml,
  parseSplitPanesFromFods
} from "../../adapters/libreoffice/sheet/xlsx-freeze-panes.js";

const assert = (value, message) => { if (!value) throw new Error(message); };

function container() {
  return {
    style: {}, className: "", classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    appendChild() {}, querySelector: () => null, querySelectorAll: () => [], addEventListener() {}
  };
}

export async function runSheetFreezePanesRealTests() {
  const results = [];
  const test = (name, fn) => { try { fn(); results.push({ name, pass: true }); } catch (error) { results.push({ name, pass: false, error: error.message }); } };

  test("Split: chia tại ô C4, không bật Freeze Panes và bấm lại để bỏ chia", () => {
    const grid = createSheetGridWithSheets(container(), ["Sheet1"]);
    grid.selectedCoord = { c: "C", r: 4 };
    assert(grid.toggleSplitPanes() === true, "phải bật Split");
    assert(grid.splitRow === 3 && grid.splitCol === 2, JSON.stringify({ row: grid.splitRow, col: grid.splitCol }));
    assert(grid.splitX > 0 && grid.splitY > 0, "phải có vị trí split OOXML theo cả hai trục");
    assert(grid.isFrozenPanes === false && grid.frozenRows === 0 && grid.frozenCols === 0, "Split không được biến thành Freeze Panes");
    assert(grid.toggleSplitPanes() === false && grid.splitX === 0 && grid.splitY === 0, "bấm lại phải bỏ Split");
  });

  test("Split OOXML/FODS: state=split round-trip riêng, không bị parser Freeze nhận nhầm", () => {
    const base = '<worksheet><sheetViews><sheetView workbookViewId="0"/></sheetViews></worksheet>';
    const patched = applySplitPaneToSheetXml(base, { row: 3, col: 2, x: 1920, y: 900 });
    assert(patched.includes('state="split"') && patched.includes('topLeftCell="C4"'), patched);
    assert(parseFreezePaneFromSheetXml(patched) === null, "Split không phải Freeze");
    const split = parseSplitPaneFromSheetXml(patched);
    assert(split?.row === 3 && split?.col === 2 && split?.x === 1920 && split?.y === 900, JSON.stringify(split));
    const fods = applySplitPanesToFods('<table:table table:name="Sheet1"></table:table>', { Sheet1: split });
    assert(!fods.includes("vno:frozen"), fods);
    assert(parseSplitPanesFromFods(fods).Sheet1?.row === 3, fods);
  });

  test("Khai báo đủ 3 lệnh Freeze Panes, có mapping UNO thật", () => {
    ["freezePanes", "freezeTopRow", "freezeFirstColumn"].forEach(id => {
      const full = `sheet.view.${id}`;
      assert(SHEET_COMMANDS.find(c => c.id === full), `Thiếu lệnh ${full}`);
    });
    assert(mapVnCommandToUno("sheet.view.freezePanes") === ".uno:FreezePanes", "Thiếu mapping UNO freezePanes");
    assert(mapVnCommandToUno("sheet.view.freezeTopRow") === ".uno:FreezePanesRow", "Thiếu mapping UNO freezeTopRow");
    assert(mapVnCommandToUno("sheet.view.freezeFirstColumn") === ".uno:FreezePanesColumn", "Thiếu mapping UNO freezeFirstColumn");
  });

  test("toggleFreezePanes(): cố định ĐÚNG hàng trên/cột trái của Ô đang chọn (không hardcode hàng 1/cột A)", () => {
    const grid = createSheetGridWithSheets(container(), ["Dự toán chi phí", "Kế hoạch Q3", "Nhân sự"]);
    grid.selectedCoord = { c: "D", r: 5 };
    const result = grid.toggleFreezePanes();
    assert(result === true, "Phải trả về true khi bật freeze");
    assert(grid.frozenRows === 4, `frozenRows phải là 4 (hàng 1-4 phía trên hàng 5), thực tế: ${grid.frozenRows}`);
    assert(grid.frozenCols === 3, `frozenCols phải là 3 (cột A-C bên trái cột D), thực tế: ${grid.frozenCols}`);
    assert(grid.isFrozenPanes === true);
  });

  test("toggleFreezePanes(): bấm lại khi đã cố định đúng vị trí sẽ bỏ cố định", () => {
    const grid = createSheetGridWithSheets(container(), ["Dự toán chi phí", "Kế hoạch Q3", "Nhân sự"]);
    grid.selectedCoord = { c: "D", r: 5 };
    grid.toggleFreezePanes();
    const result2 = grid.toggleFreezePanes();
    assert(result2 === false, "Bấm lại phải bỏ cố định");
    assert(grid.frozenRows === 0 && grid.frozenCols === 0);
  });

  test("toggleFreezePanes() tại A1: không có gì để cố định (0 hàng, 0 cột) — đúng hành vi Excel thật", () => {
    const grid = createSheetGridWithSheets(container(), ["Dự toán chi phí", "Kế hoạch Q3", "Nhân sự"]);
    grid.selectedCoord = { c: "A", r: 1 };
    const result = grid.toggleFreezePanes();
    assert(result === false, "Freeze tại A1 không tạo ra freeze thật nào");
    assert(grid.frozenRows === 0 && grid.frozenCols === 0);
  });

  test("freezeTopRow(): chỉ cố định hàng 1, không đụng cột; bấm lại bỏ cố định", () => {
    const grid = createSheetGridWithSheets(container(), ["Dự toán chi phí", "Kế hoạch Q3", "Nhân sự"]);
    grid.freezeTopRow();
    assert(grid.frozenRows === 1 && grid.frozenCols === 0, `Sai: rows=${grid.frozenRows} cols=${grid.frozenCols}`);
    grid.freezeTopRow();
    assert(grid.frozenRows === 0 && grid.frozenCols === 0, "Bấm lại freezeTopRow phải bỏ cố định");
  });

  test("freezeFirstColumn(): chỉ cố định cột A, không đụng hàng; bấm lại bỏ cố định", () => {
    const grid = createSheetGridWithSheets(container(), ["Dự toán chi phí", "Kế hoạch Q3", "Nhân sự"]);
    grid.freezeFirstColumn();
    assert(grid.frozenCols === 1 && grid.frozenRows === 0, `Sai: rows=${grid.frozenRows} cols=${grid.frozenCols}`);
    grid.freezeFirstColumn();
    assert(grid.frozenRows === 0 && grid.frozenCols === 0, "Bấm lại freezeFirstColumn phải bỏ cố định");
  });

  test("Undo/Redo: khôi phục đúng frozenRows/frozenCols (không chỉ boolean isFrozenPanes)", () => {
    const grid = createSheetGridWithSheets(container(), ["Dự toán chi phí", "Kế hoạch Q3", "Nhân sự"]);
    // Dùng _setFreezePanes() trực tiếp để kiểm tra đúng cơ chế undo/redo của
    // engine, tách biệt khỏi ngữ nghĩa "bấm lại thì bỏ cố định" của
    // toggleFreezePanes()/freezeTopRow() (đúng hành vi nút đơn của Excel thật:
    // khi ĐANG có freeze, các nút này luôn BỎ cố định chứ không tự chuyển
    // sang vị trí mới).
    grid._setFreezePanes(1, 0, true);
    grid._setFreezePanes(2, 2, true);
    assert(grid.frozenRows === 2 && grid.frozenCols === 2, `Trạng thái sau 2 lần freeze: rows=${grid.frozenRows} cols=${grid.frozenCols}`);
    grid.undo();
    assert(grid.frozenRows === 1 && grid.frozenCols === 0, `Undo phải về đúng freeze trước đó: rows=${grid.frozenRows} cols=${grid.frozenCols}`);
    grid.redo();
    assert(grid.frozenRows === 2 && grid.frozenCols === 2, `Redo phải áp lại đúng: rows=${grid.frozenRows} cols=${grid.frozenCols}`);
  });

  test("Freeze panes theo TỪNG SHEET riêng biệt, không rò rỉ khi chuyển sheet", () => {
    const grid = createSheetGridWithSheets(container(), ["Dự toán chi phí", "Kế hoạch Q3", "Nhân sự"]);
    const first = grid.activeSheet;
    grid.selectedCoord = { c: "C", r: 3 };
    grid.toggleFreezePanes();
    grid.switchSheet("Kế hoạch Q3");
    assert(grid.frozenRows === 0 && grid.frozenCols === 0, "Sheet khác không được kế thừa freeze");
    grid.switchSheet(first);
    assert(grid.frozenRows === 2 && grid.frozenCols === 2, "Quay lại sheet gốc phải còn đúng freeze");
  });

  test("_renderVirtualRows(): hàng cố định LUÔN được dựng trong DOM dù cuộn xa (sửa lỗi ảo hóa thật)", () => {
    const grid = createSheetGridWithSheets(container(), ["Dự toán chi phí", "Kế hoạch Q3", "Nhân sự"]);
    grid.rowCount = 200;
    grid.frozenRows = 2;
    grid.frozenCols = 0;
    const rendered = new Set();

    function fakeEl(tag) {
      return {
        tagName: tag, style: {}, dataset: {}, children: [],
        classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
        appendChild(child) { this.children.push(child); if (child?.dataset?.row) rendered.add(Number(child.dataset.row)); },
        addEventListener() {}, setAttribute() {}, querySelector: () => null, querySelectorAll: () => [],
        hidden: false, innerHTML: "", value: "", colSpan: 1, rowSpan: 1
      };
    }
    function fakeFragment() {
      const children = [];
      return { children, appendChild(child) { children.push(child); if (child?.dataset?.row) rendered.add(Number(child.dataset.row)); } };
    }
    const realDoc = globalThis.document;
    globalThis.document = {
      createElement: fakeEl,
      createDocumentFragment: fakeFragment
    };

    try {
      grid.tbody = { insertBefore() {}, removeChild() {}, nextSibling: null, querySelectorAll: () => [] };
      grid.topSpacer = { nextSibling: null, querySelector: () => ({ style: {} }) };
      grid.bottomSpacer = { querySelector: () => ({ style: {} }) };
      grid._applyFreezeVisuals = () => {};
      grid.renderAuditArrows = () => {};
      // Giả lập cuộn RẤT XA (hàng 150-170) - vượt xa buffer ảo hóa mặc định (8 hàng).
      grid._renderVirtualRows(150, 170);
      assert(rendered.has(1) && rendered.has(2), `Hàng cố định 1,2 phải LUÔN có trong DOM dù cuộn xa (rendered=${[...rendered].join(",")})`);
      assert(rendered.has(150), "Hàng trong cửa sổ ảo hóa vẫn phải được dựng");
    } finally {
      globalThis.document = realDoc;
    }
  });

  test("Serialize FODS → Parse lại: frozenRows/frozenCols round-trip đúng qua vno:frozen-rows/cols, không ghi thừa khi không freeze", () => {
    const source = {
      sheets: ["A", "B", "C"],
      sheetsData: { A: new Map(), B: new Map(), C: new Map() },
      activeSheet: "A",
      frozenRows: 3,
      frozenCols: 2,
      sheetStates: { B: { frozenRows: 1, frozenCols: 0 }, C: { frozenRows: 0, frozenCols: 0 } }
    };
    const adapter = new SheetAdapter(source);
    const xml = adapter.serializeToFods();
    assert(xml.includes('vno:frozen-rows="3" vno:frozen-cols="2"'), "Sheet A (active) phải ghi đúng frozenRows/Cols");
    assert(xml.includes('vno:frozen-rows="1" vno:frozen-cols="0"'), "Sheet B (rows=1>0) PHẢI ghi thuộc tính, dù cols=0");
    const tableC = xml.match(/<table:table table:name="C"[^>]*>/)?.[0] || "";
    assert(!tableC.includes("vno:frozen"), `Sheet C không freeze (rows=0,cols=0) không được ghi thuộc tính thừa: ${tableC}`);

    const target = { sheets: [], sheetsData: {}, sheetStates: {} };
    const targetAdapter = new SheetAdapter(target);
    assert(targetAdapter.loadFromFods(xml), "Phải nạp được FODS vừa tạo");
    assert(target.frozenRows === 3 && target.frozenCols === 2, `Sheet active phải khôi phục đúng: rows=${target.frozenRows} cols=${target.frozenCols}`);
    assert(target.sheetStates.B.frozenRows === 1 && target.sheetStates.B.frozenCols === 0, "Sheet B (không active) phải khôi phục đúng qua sheetStates");
    assert(!target.sheetStates.C.isFrozenPanes, "Sheet C phải khôi phục đúng trạng thái không freeze");
  });

  test("xlsx-freeze-panes.js: columnLabelFromIndex đúng cho các mốc quan trọng", () => {
    assert(columnLabelFromIndex(1) === "A");
    assert(columnLabelFromIndex(26) === "Z");
    assert(columnLabelFromIndex(27) === "AA");
    assert(columnLabelFromIndex(3) === "C");
  });

  test("xlsx-freeze-panes.js: applyFreezePaneToSheetXml ghi đúng <pane> chuẩn OOXML (xSplit/ySplit là SỐ, không phải pixel)", () => {
    const sheetXml = '<worksheet><sheetViews><sheetView tabSelected="1" workbookViewId="0"/></sheetViews></worksheet>';
    const patched = applyFreezePaneToSheetXml(sheetXml, 2, 2);
    assert(patched.includes('xSplit="2"'), patched);
    assert(patched.includes('ySplit="2"'), patched);
    assert(patched.includes('topLeftCell="C3"'), `topLeftCell phải là C3 (cột 3, hàng 3): ${patched}`);
    assert(patched.includes('activePane="bottomRight"'), patched);
    assert(patched.includes('state="frozen"'), patched);
  });

  test("xlsx-freeze-panes.js: applyFreezePaneToSheetXml chỉ freeze hàng (cols=0) dùng topLeftCell đúng cột A", () => {
    const sheetXml = "<worksheet><sheetViews><sheetView workbookViewId=\"0\"/></sheetViews></worksheet>";
    const patched = applyFreezePaneToSheetXml(sheetXml, 1, 0);
    assert(patched.includes('topLeftCell="A2"'), `Chỉ freeze hàng 1: topLeftCell phải là A2: ${patched}`);
    assert(patched.includes('activePane="bottomLeft"'), patched);
    assert(!patched.includes("xSplit"), "Không được có xSplit khi cols=0");
  });

  test("xlsx-freeze-panes.js: parseFreezePaneFromSheetXml đọc đúng <pane> thật, bỏ qua khi không frozen", () => {
    const frozen = '<sheetView><pane xSplit="2" ySplit="3" topLeftCell="C4" activePane="bottomRight" state="frozen"/></sheetView>';
    const parsed = parseFreezePaneFromSheetXml(frozen);
    assert(parsed && parsed.rows === 3 && parsed.cols === 2, JSON.stringify(parsed));
    const split = '<sheetView><pane xSplit="200" ySplit="0" state="split"/></sheetView>';
    assert(parseFreezePaneFromSheetXml(split) === null, "state=split (kéo chia đôi) không phải Freeze Panes, phải bỏ qua");
    assert(parseFreezePaneFromSheetXml("<sheetView/>") === null);
  });

  test("xlsx-freeze-panes.js: parseFreezePanesFromFods / applyFreezePanesToFods round-trip nhiều sheet", () => {
    const fods = `<table:table table:name="Sheet1" vno:frozen-rows="2" vno:frozen-cols="1"></table:table><table:table table:name="Sheet2"></table:table>`;
    const parsed = parseFreezePanesFromFods(fods);
    assert(parsed.Sheet1 && parsed.Sheet1.rows === 2 && parsed.Sheet1.cols === 1, JSON.stringify(parsed));
    assert(!parsed.Sheet2, "Sheet2 không có freeze thì không được xuất hiện trong kết quả");

    const applied = applyFreezePanesToFods('<table:table table:name="Sheet1"></table:table>', { Sheet1: { rows: 4, cols: 0 } });
    assert(applied.includes('vno:frozen-rows="4" vno:frozen-cols="0"'), applied);
  });

  test("S28b: _renderVirtualRows() don dep hang co dinh cu truoc topSpacer khi doi sheet", () => {
    const grid = createSheetGridWithSheets(container(), ["Dự toán chi phí", "Kế hoạch Q3", "Nhân sự"]);
    grid.rowCount = 50;

    const children = [];
    const topSpacer = {
      tagName: "TR",
      className: "vno-grid-spacer-top",
      style: {},
      querySelector: () => ({ style: {} }),
      get previousSibling() {
        const idx = children.indexOf(this);
        return idx > 0 ? children[idx - 1] : null;
      },
      get nextSibling() {
        const idx = children.indexOf(this);
        return idx >= 0 && idx < children.length - 1 ? children[idx + 1] : null;
      }
    };
    const bottomSpacer = {
      tagName: "TR",
      className: "vno-grid-spacer-bottom",
      style: {},
      querySelector: () => ({ style: {} }),
      get previousSibling() {
        const idx = children.indexOf(this);
        return idx > 0 ? children[idx - 1] : null;
      },
      get nextSibling() {
        const idx = children.indexOf(this);
        return idx >= 0 && idx < children.length - 1 ? children[idx + 1] : null;
      }
    };

    children.push(topSpacer, bottomSpacer);

    const tbody = {
      insertBefore(node, ref) {
        if (ref) {
          const idx = children.indexOf(ref);
          if (idx >= 0) {
            if (node.children) {
              children.splice(idx, 0, ...node.children);
            } else {
              children.splice(idx, 0, node);
            }
          }
        }
      },
      removeChild(node) {
        const idx = children.indexOf(node);
        if (idx >= 0) {
          children.splice(idx, 1);
        }
      },
      querySelectorAll: () => []
    };

    grid.tbody = tbody;
    grid.topSpacer = topSpacer;
    grid.bottomSpacer = bottomSpacer;
    grid._applyFreezeVisuals = () => {};
    grid.renderAuditArrows = () => {};

    const realDoc = globalThis.document;
    globalThis.document = {
      createElement: (tag) => ({ tagName: tag, style: {}, dataset: {}, classList: { add() {} } }),
      createDocumentFragment: () => ({ children: [], appendChild(c) { this.children.push(c); } })
    };
    grid._buildRowTr = (r) => ({ tagName: "TR", dataset: { row: r }, classList: { add() {} } });

    try {
      // 1. Sheet 2 có 2 hàng cố định
      grid.frozenRows = 2;
      grid._renderVirtualRows(3, 10);
      const frozenBefore = children.slice(0, children.indexOf(topSpacer));
      assert(frozenBefore.length === 2, `Phai co 2 hang co dinh truoc topSpacer, thuc te: ${frozenBefore.length}`);

      // 2. Chuyen sang Sheet 1 khong co hang co dinh (frozenRows = 0)
      grid.frozenRows = 0;
      grid._renderVirtualRows(1, 10);
      const frozenAfter = children.slice(0, children.indexOf(topSpacer));
      assert(frozenAfter.length === 0, `Sau khi doi sang sheet khong co dinh, truoc topSpacer phai co 0 hang, thuc te: ${frozenAfter.length}`);
    } finally {
      globalThis.document = realDoc;
    }
  });

  return results;
}
