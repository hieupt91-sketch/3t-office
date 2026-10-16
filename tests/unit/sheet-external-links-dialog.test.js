/**
 * Test Suite 267: VN Sheet External Links & Edit Links Dialog (AGY-LINKS)
 * - getLinkSources: trích xuất nguồn từ externalLink (ODF) và công thức tham chiếu ngoài
 * - breakLink: chuyển công thức thành giá trị hiển thị, xóa liên kết ngoài, hỗ trợ Undo/Redo
 * - changeLink: thay đổi đường dẫn nguồn trong công thức và ODF, hỗ trợ Undo/Redo
 * - updateLinkValues: cập nhật giá trị cache từ nguồn ngoài
 * - checkLinkStatus: kiểm tra trạng thái khả dụng của nguồn
 * - EditLinksDialog: giao diện modal danh sách nguồn, các nút thao tác, phím tắt Esc
 * - Commands & Ribbon: sheet.data.editLinks, sheet.data.refreshAll, Help tiếng Việt và i18n
 */

import { SheetGridController } from "../../apps/sheet/sheet-grid.js";
import { EditLinksDialog } from "../../apps/sheet/edit-links-dialog.js";
import { SHEET_HELP_ENTRIES } from "../../platform/help/entries-sheet.js";
import { viStrings } from "../../platform/i18n/strings-vi.js";
import { enStrings } from "../../platform/i18n/strings-en.js";
import { SHEET_COMMANDS } from "../../platform/commands/command-definitions.js";
import { SHEET_RIBBON_TABS } from "../../apps/sheet/sheet-ribbon.js";

const mockContainer = () => {
  const el = {
    setAttribute() {},
    getAttribute() { return null; },
    style: {},
    innerHTML: "",
    className: "",
    appendChild(child) { return child; },
    insertBefore(child) { return child; },
    removeChild(child) { return child; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    focus() {}
  };
  return el;
};

export async function runSheetExternalLinksDialogTests() {
  const results = [];
  const test = (name, fn) => {
    try {
      fn();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: error?.stack || String(error) });
    }
  };

  test("1. getLinkSources trích xuất chính xác nguồn từ externalLink ODF và công thức", () => {
    const grid = new SheetGridController(mockContainer());
    grid.sheets = ["Sheet1"];
    grid.activeSheet = "Sheet1";
    const map = new Map();
    grid.sheetsData["Sheet1"] = map;

    // Ô A1 có externalLink từ LibreOffice FODS
    map.set("A1", {
      val: 100,
      formula: "=[Nguon.xlsx]Sheet1!A1",
      externalLink: {
        odf: "of:=['file:///C:/vno_test_links/Nguon.xlsx'#$Sheet1.A1]",
        formula: "=[Nguon.xlsx]Sheet1!A1"
      }
    });

    // Ô A2 có công thức tham chiếu ngoài dạng đường dẫn đầy đủ
    map.set("A2", {
      val: 200,
      formula: "='C:\\data\\[BaoCao.xlsx]TongHop'!B5"
    });

    // Ô A3 công thức nội bộ bình thường
    map.set("A3", {
      val: 300,
      formula: "=A1+A2"
    });

    const sources = grid.getLinkSources();
    if (sources.length !== 2) {
      throw new Error(`Kỳ vọng 2 nguồn liên kết ngoài, thực tế có ${sources.length}`);
    }

    const n1 = sources.find(s => s.fileName.toLowerCase() === "nguon.xlsx");
    if (!n1) throw new Error("Không tìm thấy nguồn Nguon.xlsx");
    if (!n1.source.includes("Nguon.xlsx")) throw new Error(`Đường dẫn nguồn không đúng: ${n1.source}`);
    if (n1.cells.length !== 1 || n1.cells[0].coord !== "A1") {
      throw new Error("Tọa độ ô tham chiếu Nguon.xlsx không đúng");
    }

    const n2 = sources.find(s => s.fileName.toLowerCase() === "baocao.xlsx");
    if (!n2) throw new Error("Không tìm thấy nguồn BaoCao.xlsx");
    if (n2.cells.length !== 1 || n2.cells[0].coord !== "A2") {
      throw new Error("Tọa độ ô tham chiếu BaoCao.xlsx không đúng");
    }
  });

  test("2. breakLink chuyển công thức thành giá trị hiển thị và xóa liên kết ngoài", () => {
    const grid = new SheetGridController(mockContainer());
    grid.sheets = ["Sheet1"];
    grid.activeSheet = "Sheet1";
    const map = new Map();
    grid.sheetsData["Sheet1"] = map;

    map.set("A1", {
      val: 100,
      formula: "=[Nguon.xlsx]Sheet1!A1",
      externalLink: {
        odf: "of:=['file:///C:/vno_test_links/Nguon.xlsx'#$Sheet1.A1]",
        formula: "=[Nguon.xlsx]Sheet1!A1"
      }
    });

    map.set("B1", {
      val: 200,
      formula: "=A1*2"
    });

    const broken = grid.breakLink("Nguon.xlsx");
    if (!broken) throw new Error("breakLink trả về false");

    const a1 = map.get("A1");
    if (a1.formula !== "") throw new Error(`Công thức A1 phải bị xóa thành rỗng, thực tế: ${a1.formula}`);
    if (a1.val !== 100) throw new Error(`Giá trị A1 phải giữ nguyên 100, thực tế: ${a1.val}`);
    if (a1.externalLink) throw new Error("externalLink phải bị xóa khỏi A1");

    const b1 = map.get("B1");
    if (b1.formula !== "=A1*2") throw new Error("Công thức B1 nội bộ không được bị xóa");

    // Kiểm tra danh sách nguồn sau khi ngắt
    const remaining = grid.getLinkSources();
    if (remaining.length !== 0) throw new Error("Danh sách nguồn phải rỗng sau khi ngắt liên kết");
  });

  test("3. breakLink hỗ trợ hoàn tác Undo và làm lại Redo", () => {
    const grid = new SheetGridController(mockContainer());
    grid.sheets = ["Sheet1"];
    grid.activeSheet = "Sheet1";
    const map = new Map();
    grid.sheetsData["Sheet1"] = map;

    map.set("A1", {
      val: 100,
      formula: "=[Nguon.xlsx]Sheet1!A1",
      externalLink: {
        odf: "of:=['file:///C:/vno_test_links/Nguon.xlsx'#$Sheet1.A1]",
        formula: "=[Nguon.xlsx]Sheet1!A1"
      }
    });

    grid.breakLink("Nguon.xlsx");
    if (map.get("A1").formula !== "") throw new Error("Ngắt liên kết thất bại trước khi Undo");

    // Undo
    const undoApplied = grid.undo();
    if (!undoApplied) throw new Error("Undo trả về false");
    const a1AfterUndo = map.get("A1");
    if (a1AfterUndo.formula !== "=[Nguon.xlsx]Sheet1!A1") {
      throw new Error(`Undo không khôi phục đúng công thức: ${a1AfterUndo.formula}`);
    }
    if (!a1AfterUndo.externalLink) throw new Error("Undo không khôi phục externalLink");

    // Redo
    const redoApplied = grid.redo();
    if (!redoApplied) throw new Error("Redo trả về false");
    const a1AfterRedo = map.get("A1");
    if (a1AfterRedo.formula !== "") throw new Error("Redo không ngắt lại liên kết");
    if (a1AfterRedo.val !== 100) throw new Error("Redo không giữ đúng giá trị 100");
  });

  test("4. changeLink đổi nguồn sang tệp mới và cập nhật công thức", () => {
    const grid = new SheetGridController(mockContainer());
    grid.sheets = ["Sheet1"];
    grid.activeSheet = "Sheet1";
    const map = new Map();
    grid.sheetsData["Sheet1"] = map;

    map.set("A1", {
      val: 100,
      formula: "='C:\\dir\\[Nguon.xlsx]Sheet1'!A1",
      externalLink: {
        odf: "of:=['file:///C:/dir/Nguon.xlsx'#$Sheet1.A1]",
        formula: "=[Nguon.xlsx]Sheet1!A1"
      }
    });

    const changed = grid.changeLink("C:\\dir\\Nguon.xlsx", "C:\\dir\\Nguon2.xlsx", { A1: 250 });
    if (!changed) throw new Error("changeLink trả về false");

    const a1 = map.get("A1");
    if (!a1.formula.includes("Nguon2.xlsx")) {
      throw new Error(`Công thức sau khi đổi nguồn phải chứa Nguon2.xlsx, thực tế: ${a1.formula}`);
    }
    if (a1.val !== 250) {
      throw new Error(`Giá trị sau khi đổi nguồn phải cập nhật thành 250, thực tế: ${a1.val}`);
    }
    if (a1.externalLink && !a1.externalLink.odf.includes("Nguon2.xlsx")) {
      throw new Error("ODF link chưa được cập nhật sang Nguon2.xlsx");
    }

    // Kiểm tra Undo đổi nguồn
    grid.undo();
    const a1Undo = map.get("A1");
    if (!a1Undo.formula.includes("Nguon.xlsx")) {
      throw new Error("Undo đổi nguồn không khôi phục công thức cũ");
    }
    if (a1Undo.val !== 100) {
      throw new Error("Undo đổi nguồn không khôi phục giá trị cũ");
    }
  });

  test("5. updateLinkValues cập nhật giá trị cache và trạng thái link", () => {
    const grid = new SheetGridController(mockContainer());
    grid.sheets = ["Sheet1"];
    grid.activeSheet = "Sheet1";
    const map = new Map();
    grid.sheetsData["Sheet1"] = map;

    map.set("A1", {
      val: 100,
      formula: "=[Nguon.xlsx]Sheet1!A1"
    });

    const updated = grid.updateLinkValues("Nguon.xlsx", { A1: 300 });
    if (updated !== 1) throw new Error(`Kỳ vọng cập nhật 1 ô, thực tế: ${updated}`);
    if (map.get("A1").val !== 300) throw new Error(`Giá trị A1 chưa cập nhật thành 300: ${map.get("A1").val}`);

    const status = grid.checkLinkStatus("Nguon.xlsx");
    if (!status) throw new Error("checkLinkStatus không trả về trạng thái");
  });

  test("6. EditLinksDialog khởi tạo giao diện và các nút thao tác đúng chuẩn", () => {
    const origDoc = globalThis.document;
    const origWindow = globalThis.window;

    // Giả lập DOM đơn giản
    const bodyChildren = [];
    const createdElements = [];

    const fakeDoc = {
      body: {
        appendChild(node) { bodyChildren.push(node); return node; }
      },
      querySelectorAll() { return []; },
      createElement(tag) {
        const node = {
          tagName: tag,
          className: "",
          style: {},
          dataset: {},
          children: [],
          attributes: {},
          innerHTML: "",
          setAttribute(k, v) { this.attributes[k] = v; },
          getAttribute(k) { return this.attributes[k] || null; },
          appendChild(child) { this.children.push(child); return child; },
          remove() {
            const idx = bodyChildren.indexOf(this);
            if (idx >= 0) bodyChildren.splice(idx, 1);
          },
          querySelector(sel) {
            if (sel === "#vno-links-list") return this._listEl || (this._listEl = fakeDoc.createElement("div"));
            if (sel === "#vno-link-location") return this._locEl || (this._locEl = fakeDoc.createElement("span"));
            if (sel.startsWith("#vno-link-btn-")) return fakeDoc.createElement("button");
            return null;
          },
          querySelectorAll() { return []; },
          addEventListener() {}
        };
        createdElements.push(node);
        return node;
      }
    };

    globalThis.document = fakeDoc;
    globalThis.window = {
      addEventListener() {},
      removeEventListener() {},
      confirm() { return true; },
      prompt() { return "Nguon2.xlsx"; },
      alert() {}
    };

    try {
      const grid = new SheetGridController(mockContainer());
      grid.sheets = ["Sheet1"];
      grid.activeSheet = "Sheet1";
      const map = new Map();
      grid.sheetsData["Sheet1"] = map;
      map.set("A1", { val: 100, formula: "=[Nguon.xlsx]Sheet1!A1" });

      const shown = EditLinksDialog.show(grid);
      if (!shown) throw new Error("EditLinksDialog.show trả về false");
      if (bodyChildren.length === 0) throw new Error("Overlay chưa được thêm vào document.body");
    } finally {
      globalThis.document = origDoc;
      globalThis.window = origWindow;
    }
  });

  test("7. Commands và Ribbon đăng ký đầy đủ sheet.data.refreshAll và sheet.data.editLinks", () => {
    const refreshCmd = SHEET_COMMANDS.find(c => c.id === "sheet.data.refreshAll");
    if (!refreshCmd) throw new Error("Không tìm thấy lệnh sheet.data.refreshAll trong SHEET_COMMANDS");
    if (refreshCmd.category !== "data") throw new Error("Lệnh sheet.data.refreshAll phải thuộc category 'data'");
    if (refreshCmd.shortcut !== "Ctrl+Alt+F5") throw new Error("Phím tắt của sheet.data.refreshAll phải là Ctrl+Alt+F5");

    const editLinksCmd = SHEET_COMMANDS.find(c => c.id === "sheet.data.editLinks");
    if (!editLinksCmd) throw new Error("Không tìm thấy lệnh sheet.data.editLinks trong SHEET_COMMANDS");
    if (editLinksCmd.category !== "data") throw new Error("Lệnh sheet.data.editLinks phải thuộc category 'data'");

    const dataTab = SHEET_RIBBON_TABS.find(t => t.id === "data");
    if (!dataTab) throw new Error("Không tìm thấy tab 'data' trong SHEET_RIBBON_TABS");

    const connGroup = dataTab.groups.find(g => g.id === "connections");
    if (!connGroup) throw new Error("Không tìm thấy nhóm 'connections' trong tab 'data'");

    const itemIds = connGroup.items.map(i => i.commandId);
    if (!itemIds.includes("sheet.data.refreshAll") || !itemIds.includes("sheet.data.editLinks")) {
      throw new Error(`Nhóm connections thiếu nút lệnh: ${itemIds.join(", ")}`);
    }
  });

  test("8. Help tiếng Việt và chuỗi i18n đầy đủ, không chứa tên thương hiệu cấm", () => {
    const banned = /\b(Word|Excel|PowerPoint)\b/i;

    // Kiểm tra 2 bài Help
    const helpRefresh = SHEET_HELP_ENTRIES.find(h => h.id === "sheet.data.refreshAllHelp");
    if (!helpRefresh) throw new Error("Thiếu bài Help sheet.data.refreshAllHelp");
    const helpEdit = SHEET_HELP_ENTRIES.find(h => h.id === "sheet.data.editLinksHelp");
    if (!helpEdit) throw new Error("Thiếu bài Help sheet.data.editLinksHelp");

    for (const entry of [helpRefresh, helpEdit]) {
      const text = [entry.title, entry.summary, ...(entry.steps || [])].join(" ");
      if (banned.test(text)) {
        throw new Error(`Bài Help ${entry.id} chứa tên thương hiệu bị cấm!`);
      }
      if (entry.steps.length < 3) {
        throw new Error(`Bài Help ${entry.id} phải có ít nhất 3 bước`);
      }
      if (text.length <= 200) {
        throw new Error(`Bài Help ${entry.id} quá ngắn (${text.length} ký tự)`);
      }
    }

    // Kiểm tra i18n VI
    if (!viStrings.sheetRibbon?.group?.connections) throw new Error("Thiếu viStrings.sheetRibbon.group.connections");
    if (!viStrings.sheetDialogs?.editLinks?.title) throw new Error("Thiếu viStrings.sheetDialogs.editLinks.title");
    if (!viStrings.sheetDialogs?.editLinks?.breakConfirm) throw new Error("Thiếu viStrings.sheetDialogs.editLinks.breakConfirm");

    // Kiểm tra i18n EN
    if (!enStrings.sheetRibbon?.group?.connections) throw new Error("Thiếu enStrings.sheetRibbon.group.connections");
    if (!enStrings.sheetDialogs?.editLinks?.title) throw new Error("Thiếu enStrings.sheetDialogs.editLinks.title");
    if (!enStrings.sheetDialogs?.editLinks?.breakConfirm) throw new Error("Thiếu enStrings.sheetDialogs.editLinks.breakConfirm");

    // Kiểm tra không chứa tên cấm trong chuỗi dialog editLinks
    const viText = JSON.stringify(viStrings.sheetDialogs.editLinks);
    if (banned.test(viText)) throw new Error("viStrings.sheetDialogs.editLinks chứa tên bị cấm");
    const enText = JSON.stringify(enStrings.sheetDialogs.editLinks);
    if (banned.test(enText)) throw new Error("enStrings.sheetDialogs.editLinks chứa tên bị cấm");
  });

  test("9. Phân biệt chính xác liên kết ngoài ([1]Sheet!A1, [Book.xlsx]Sheet!A1) và tham chiếu cấu trúc Bảng ([Cột], [@Cột])", () => {
    const grid = new SheetGridController(mockContainer());
    grid.sheets = ["Sheet1"];
    grid.activeSheet = "Sheet1";
    const map = new Map();
    grid.sheetsData["Sheet1"] = map;

    // 1. Kiểm tra _isExternalLink
    const extCell1 = { formula: "=[1]Sheet1!A1", val: 50 };
    const extCell2 = { formula: "=[Book.xlsx]Sheet1!A1", val: 100 };
    const extCell3 = { formula: "='C:\\data\\[Book.xlsx]Sheet1'!A1", val: 150 };
    const extCell4 = { formula: "=[Book.xlsx]!Tong", val: 200 };
    const extCell5 = { formula: "=[Nguon.xlsx]Sheet1!A1", val: 250, externalLink: { formula: "=[Nguon.xlsx]Sheet1!A1" } };

    const tableCell1 = { formula: "=SUBTOTAL(109,[Salary])", val: "" };
    const tableCell2 = { formula: "=[@Qty]*[@Price]", val: "" };
    const tableCell3 = { formula: "=Table1[Salary]", val: "" };
    const tableCell4 = { formula: "=[#Totals]", val: "" };
    const normalCell = { formula: "=A1+B1", val: "" };

    for (const c of [extCell1, extCell2, extCell3, extCell4, extCell5]) {
      if (!grid._isExternalLink(c)) {
        throw new Error(`Ô liên kết ngoài ${c.formula} không được nhận diện đúng bởi _isExternalLink`);
      }
    }

    for (const c of [tableCell1, tableCell2, tableCell3, tableCell4, normalCell]) {
      if (grid._isExternalLink(c)) {
        throw new Error(`Ô tham chiếu bảng hoặc nội bộ ${c.formula} bị nhận nhầm là liên kết ngoài!`);
      }
    }

    // 2. getLinkSources không được trích xuất nhầm cột bảng
    map.set("A1", extCell2);
    map.set("B4", tableCell1);
    map.set("C4", tableCell2);

    const sources = grid.getLinkSources();
    if (sources.length !== 1) {
      throw new Error(`getLinkSources phải chỉ có 1 nguồn Book.xlsx, thực tế có ${sources.length}: ${sources.map(s => s.source).join(", ")}`);
    }
    if (sources[0].fileName.toLowerCase() !== "book.xlsx") {
      throw new Error(`Nguồn phải là Book.xlsx, thực tế: ${sources[0].fileName}`);
    }

    // 3. Khởi tạo bảng mẫu và kiểm tra _recalculateAllFormulas tính toán đúng tham chiếu cấu trúc
    map.set("A1", { val: "Dept", formula: "", style: {} });
    map.set("B1", { val: "Salary", formula: "", style: {} });
    map.set("A2", { val: "IT", formula: "", style: {} });
    map.set("B2", { val: 1000, formula: "", style: {} });
    map.set("A3", { val: "HR", formula: "", style: {} });
    map.set("B3", { val: 1500, formula: "", style: {} });
    map.set("A4", { val: "Total", formula: "", style: {} });
    map.set("B4", { val: "", formula: "=SUBTOTAL(109,[Salary])", style: {} });

    grid.tablesBySheet = {
      Sheet1: [
        {
          name: "TblTest",
          ref: "A1:B4",
          hasHeaders: true,
          showTotals: true
        }
      ]
    };

    grid._recalculateAllFormulas();

    const totalCell = map.get("B4");
    if (totalCell.val !== 2500) {
      throw new Error(`Công thức bảng B4 =SUBTOTAL(109,[Salary]) phải tính ra 2500, thực tế: ${totalCell.val}`);
    }

    // Ô liên kết ngoài phải giữ nguyên giá trị cache
    map.set("D1", { val: 999, formula: "=[Book.xlsx]Sheet1!A1", style: {} });
    grid._recalculateAllFormulas();
    const d1Cell = map.get("D1");
    if (d1Cell.val !== 999) {
      throw new Error(`Ô liên kết ngoài D1 phải giữ nguyên giá trị cache 999, thực tế: ${d1Cell.val}`);
    }
  });

  return results;
}

if (typeof process !== "undefined" && process.argv[1]?.endsWith("sheet-external-links-dialog.test.js")) {
  runSheetExternalLinksDialogTests().then(res => {
    let fail = 0;
    for (const r of res) {
      if (r.pass) console.log(`[PASS] ${r.name}`);
      else { console.error(`[FAIL] ${r.name}: ${r.error}`); fail++; }
    }
    process.exit(fail ? 1 : 0);
  });
}
