/**
 * Test Suite: Sheet — links to other workbooks (external references)
 *
 * LibreOffice converts Excel's `=[B.xlsx]Sheet1!A1` into
 * `of:=['file:///…/B.xlsx'#$Sheet1.A1]` (measured on an Excel-made sample,
 * 28/9/2026). Excel shows the cached value and the `[B.xlsx]` spelling while
 * the source workbook is closed, never recalculates it, and keeps the link on
 * save.
 */

import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";

const LINK_A1 = "of:=['file:///E:/Data/B.xlsx'#$Sheet1.A1]";
const LINK_SUM = "of:=SUM(['file:///E:/Data/B.xlsx'#$Sheet1.A1:.A3])";
const LINK_SPACE = "of:=['file:///E:/Data/Bao%20cao.xlsx'#$'So lieu'.B2]";

function fods(rows) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
 xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"
 xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
 xmlns:calcext="urn:org:documentfoundation:names:experimental:calc:xmlns:calcext:1.0"
 office:version="1.3"><office:body><office:spreadsheet>
<table:table table:name="Sheet1">${rows}</table:table>
</office:spreadsheet></office:body></office:document>`;
}

function cell(formula, value) {
  return `<table:table-cell table:formula="${formula.replace(/'/g, "&apos;")}" office:value-type="float" office:value="${value}" calcext:value-type="float"><text:p>${value}</text:p></table:table-cell>`;
}

export async function runSheetExternalLinksTests() {
  const results = [];
  const adapter = new SheetAdapter(null);
  const workbook = adapter.parseFods(fods(
    `<table:table-row>${cell(LINK_A1, 10)}${cell(LINK_SUM, 60)}${cell(LINK_SPACE, 7)}` +
    `<table:table-cell table:formula="of:=[.A1]*2" office:value-type="float" office:value="20" calcext:value-type="float"><text:p>20</text:p></table:table-cell></table:table-row>`
  ));
  const data = workbook.sheetsData[workbook.sheets[0]];
  const get = key => (data?.get ? data.get(key) : data?.[key]) || {};

  results.push({
    name: "Liên kết ngoài: thanh công thức hiện dạng Excel =[B.xlsx]Sheet1!A1",
    pass: get("A1").formula === "=[B.xlsx]Sheet1!A1",
    error: get("A1").formula
  });
  results.push({
    name: "Liên kết ngoài: vùng trong hàm =SUM([B.xlsx]Sheet1!A1:A3)",
    pass: get("B1").formula === "=SUM([B.xlsx]Sheet1!A1:A3)",
    error: get("B1").formula
  });
  results.push({
    name: "Liên kết ngoài: tên tệp/trang có khoảng trắng được đặt trong nháy như Excel",
    pass: get("C1").formula === "='[Bao cao.xlsx]So lieu'!B2",
    error: get("C1").formula
  });
  results.push({
    name: "Liên kết ngoài: giữ giá trị lưu lần cuối (10, 60) và đánh dấu externalLink",
    pass: Number(get("A1").val) === 10 && Number(get("B1").val) === 60
      && get("A1").externalLink?.odf === LINK_A1 && !get("D1").externalLink,
    error: JSON.stringify({ a1: get("A1"), d1: get("D1") })
  });

  // Serialize back: an untouched link must be written exactly as LibreOffice read it,
  // otherwise the saved XLSX loses the link (the ODF path is not recoverable from "[B.xlsx]").
  const writer = new SheetAdapter(null);
  const sheetsData = { Sheet1: new Map([["A1", { ...get("A1") }], ["B1", { ...get("B1") }], ["D1", { ...get("D1") }]]) };
  writer.grid = {
    sheets: ["Sheet1"], activeSheet: "Sheet1", sheetsData,
    cellsData: sheetsData.Sheet1, mergedRanges: [], rowHeights: new Map(), colWidths: new Map()
  };
  let xml = "";
  try { xml = writer.serializeToFods(); } catch (error) { xml = "THROW " + error.message; }
  results.push({
    name: "Liên kết ngoài: lưu ghi lại nguyên công thức ODF của LibreOffice",
    pass: xml.includes(`table:formula="of:=[&apos;file:///E:/Data/B.xlsx&apos;#$Sheet1.A1]"`)
      || xml.includes(`table:formula="of:=['file:///E:/Data/B.xlsx'#$Sheet1.A1]"`),
    error: xml.slice(0, 300)
  });
  results.push({
    name: "Liên kết ngoài: công thức đã sửa không còn dùng ODF cũ",
    pass: (() => {
      const edited = { ...get("A1"), formula: "=5+5" };
      return edited.externalLink.formula !== edited.formula;
    })()
  });

  // Kiểm thử NotificationBar khi nạp tệp có liên kết ngoài
  let shownNotification = null;
  let clearedNotification = false;
  const mockShell = {
    setStatus: () => {},
    showNotification: (options) => { shownNotification = options; return {}; },
    clearNotification: () => { clearedNotification = true; }
  };
  const mockGrid = {
    activeSheet: "Sheet1",
    sheets: ["Sheet1"],
    sheetsData: workbook.sheetsData,
    cellsData: workbook.sheetsData[workbook.sheets[0]],
    mergedRanges: [],
    rowHeights: new Map(),
    colWidths: new Map(),
    resetToBlank() {
      this.sheetsData = { Sheet1: new Map() };
      this.cellsData = this.sheetsData.Sheet1;
    },
    _refreshVisibleRuleVisuals() {},
    _refreshRowColLayoutView() {},
    refreshCharts() {},
    renderCharts() {},
    renderImages() {},
    _applyProtectionUi() {},
    updateStatus() {}
  };

  const notifyAdapter = new SheetAdapter(mockGrid);
  notifyAdapter.setShell(mockShell);
  notifyAdapter.loadFromFods(fods(
    `<table:table-row>${cell(LINK_A1, 10)}${cell(LINK_SUM, 60)}</table:table-row>`
  ));

  results.push({
    name: "Liên kết ngoài: loadFromFods gọi showNotification với đúng số ô và loại warning",
    pass: Boolean(shownNotification
      && notifyAdapter.externalLinkCells === 2
      && shownNotification.type === "warning"
      && shownNotification.message.includes("Tệp có 2 ô liên kết tới sổ làm việc khác")
      && shownNotification.action?.label === "Tìm hiểu thêm"),
    error: JSON.stringify(shownNotification)
  });

  // Tệp mới / đóng tệp: clearNotification được gọi và externalLinkCells = 0
  clearedNotification = false;
  await notifyAdapter.newDocument();
  results.push({
    name: "Liên kết ngoài: newDocument() đặt externalLinkCells về 0 và xóa notification",
    pass: notifyAdapter.externalLinkCells === 0 && clearedNotification === true,
    error: `cells=${notifyAdapter.externalLinkCells}, cleared=${clearedNotification}`
  });

  // Load tệp không có liên kết ngoài: clearNotification được gọi
  clearedNotification = false;
  notifyAdapter.loadFromFods(fods(
    `<table:table-row><table:table-cell office:value-type="float" office:value="100"><text:p>100</text:p></table:table-cell></table:table-row>`
  ));
  results.push({
    name: "Liên kết ngoài: loadFromFods tệp không có liên kết ngoài tự ẩn notification",
    pass: notifyAdapter.externalLinkCells === 0 && clearedNotification === true,
    error: `cells=${notifyAdapter.externalLinkCells}, cleared=${clearedNotification}`
  });

  return results;
}
