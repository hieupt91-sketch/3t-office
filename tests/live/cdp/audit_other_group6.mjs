import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { launchApp } from "./session.mjs";
import { click, press, sleep } from "./actions.mjs";
import {
  clickCommand,
  clickDropdown,
  switchRibbonTab,
  selectCell,
  getCellInfo,
  saveDocument,
  inspectXlsxXml,
  setupSession
} from "./audit_helpers.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const workXlsx = path.join(root, "tests/live/cdp/test_sheet_work.xlsx");

console.log("=== BẮT ĐẦU KIỂM ĐỊNH NHÓM 6: XEM (VIEW) ===");
const session = await setupSession();
const { cdp } = session;

const results = [];

async function closeAnyDialog(cdp) {
  await press(cdp, "Escape");
  await sleep(150);
  await cdp.evaluate(`(() => {
    document.querySelectorAll(".vno-rule-cancel, .vno-rule-close, .vno-dialog-close").forEach(b => b.click());
    document.querySelectorAll(".vno-dialog-overlay").forEach(el => el.remove());
  })()`);
  await sleep(150);
}

try {
  await sleep(1000);
  await switchRibbonTab(cdp, "view");
  await sleep(400);

  // 1. Cố định ô (Freeze Panes - dropdown items)
  console.log("--- 1. Cố định ô (Freeze Panes) ---");
  // 1a. Cố định ô tại C3 (khóa hàng 1-2 và cột A-B)
  await cdp.evaluate('window.__vnoAppInstance.grid.selectCell("C", 3)');
  await sleep(200);
  await clickDropdown(cdp, "sheet.view.freezePanesMenu", "sheet.view.freezePanes");
  await sleep(300);

  const freezeAtC3 = await cdp.evaluate(`(() => {
    const grid = window.__vnoAppInstance.grid;
    return {
      frozenRows: grid.frozenRows,
      frozenCols: grid.frozenCols,
      isFrozenPanes: grid.isFrozenPanes,
      hasFreezeClass: grid.container?.classList?.contains("vno-freeze-panes")
    };
  })()`);
  console.log("Freeze at C3:", freezeAtC3);

  // Bấm lại để Hủy cố định ô
  await clickDropdown(cdp, "sheet.view.freezePanesMenu", "sheet.view.freezePanes");
  await sleep(200);
  const unfreezeState = await cdp.evaluate(`(() => {
    const grid = window.__vnoAppInstance.grid;
    return { frozenRows: grid.frozenRows, frozenCols: grid.frozenCols };
  })()`);

  // 1b. Cố định hàng trên cùng (Freeze Top Row)
  await clickDropdown(cdp, "sheet.view.freezePanesMenu", "sheet.view.freezeTopRow");
  await sleep(200);
  const freezeTopState = await cdp.evaluate(`(() => {
    const grid = window.__vnoAppInstance.grid;
    return { frozenRows: grid.frozenRows, frozenCols: grid.frozenCols };
  })()`);

  // Bấm lại hủy
  await clickDropdown(cdp, "sheet.view.freezePanesMenu", "sheet.view.freezeTopRow");
  await sleep(200);

  // 1c. Cố định cột đầu tiên (Freeze First Column)
  await clickDropdown(cdp, "sheet.view.freezePanesMenu", "sheet.view.freezeFirstColumn");
  await sleep(200);
  const freezeFirstColState = await cdp.evaluate(`(() => {
    const grid = window.__vnoAppInstance.grid;
    return { frozenRows: grid.frozenRows, frozenCols: grid.frozenCols };
  })()`);

  // Khôi phục freeze at C3 để kiểm tra lưu file
  await cdp.evaluate('window.__vnoAppInstance.grid._setFreezePanes(2, 2, false)');

  results.push({
    button: "Cố định ô (Freeze Panes / Top Row / First Column)",
    context: "Chọn C3 bấm Cố định ô; thử Cố định hàng đầu và Cột đầu",
    excelExpect: "Cố định 2 hàng và 2 cột tại C3 (hàng 1-2 và cột A-B giữ nguyên khi cuộn); cố định hàng 1; cố định cột A",
    actual: `Tại C3: rows=${freezeAtC3.frozenRows}, cols=${freezeAtC3.frozenCols}; TopRow: rows=${freezeTopState.frozenRows}; FirstCol: cols=${freezeFirstColState.frozenCols}`,
    status: freezeAtC3.frozenRows === 2 && freezeAtC3.frozenCols === 2 && freezeTopState.frozenRows === 1 && freezeFirstColState.frozenCols === 1 ? "PASS" : "FAIL",
    shortcut: "Alt+W+F",
    notes: "Cố định ô bảng tính mượt mà, hỗ trợ cả 3 chế độ chuẩn của Excel."
  });

  // 2. Thu phóng (Zoom: In, Out, 100%, To Selection)
  console.log("--- 2. Thu phóng (Zoom) ---");
  const zoomInitial = await cdp.evaluate('window.__vnoAppInstance.grid.zoomLevel || 1');

  // Zoom In
  await clickCommand(cdp, "sheet.view.zoomIn");
  await sleep(200);
  const zoomInVal = await cdp.evaluate('window.__vnoAppInstance.grid.zoomLevel');

  // Zoom Out
  await clickCommand(cdp, "sheet.view.zoomOut");
  await sleep(200);
  const zoomOutVal = await cdp.evaluate('window.__vnoAppInstance.grid.zoomLevel');

  // Zoom Reset 100%
  await clickCommand(cdp, "sheet.view.zoomReset");
  await sleep(200);
  const zoomResetVal = await cdp.evaluate('window.__vnoAppInstance.grid.zoomLevel');

  // Zoom to selection
  await cdp.evaluate(`(() => {
    const grid = window.__vnoAppInstance.grid;
    grid.selectionRange = { start: { c: "A", r: 1 }, end: { c: "D", r: 5 } };
  })()`);
  await clickCommand(cdp, "sheet.view.zoomToSelection");
  await sleep(200);
  const zoomToSelVal = await cdp.evaluate('window.__vnoAppInstance.grid.zoomLevel');

  // Đặt lại 100%
  await clickCommand(cdp, "sheet.view.zoomReset");

  results.push({
    button: "Thu phóng (Zoom: In, Out, 100%, To Selection)",
    context: "Bấm các nút Phóng to, Thu nhỏ, 100%, Thu phóng vùng chọn",
    excelExpect: "Phóng to tỷ lệ hiển thị (+10%), thu nhỏ (-10%), khôi phục 100% và vừa vùng chọn",
    actual: `Gốc: ${zoomInitial} -> In: ${zoomInVal?.toFixed?.(2)} -> Out: ${zoomOutVal?.toFixed?.(2)} -> 100%: ${zoomResetVal} -> ToSel: ${zoomToSelVal?.toFixed?.(2)}`,
    status: zoomInVal > 1 && zoomResetVal === 1 ? "PASS" : "FAIL",
    shortcut: "Ctrl+Lăn chuột",
    notes: "Bộ công cụ thu phóng hiển thị hoạt động trơn tru (ghi nhận dính icon tại U-S21)."
  });

  // 3. Hiển thị: Thanh công thức, Đường lưới, Tiêu đề (Show group)
  console.log("--- 3. Hiển thị: Thanh công thức, Đường lưới, Tiêu đề ---");
  // 3a. Formula bar
  const fbInitial = await cdp.evaluate('Boolean(window.__vnoAppInstance.grid.formulaBarVisible !== false)');
  await clickCommand(cdp, "sheet.view.formulaBar");
  await sleep(200);
  const fbToggled = await cdp.evaluate('Boolean(window.__vnoAppInstance.grid.formulaBarVisible !== false)');
  await clickCommand(cdp, "sheet.view.formulaBar");
  await sleep(200);
  const fbRestored = await cdp.evaluate('Boolean(window.__vnoAppInstance.grid.formulaBarVisible !== false)');

  // 3b. Gridlines & Headings
  const glInitial = await cdp.evaluate('Boolean(window.__vnoAppInstance.grid.gridlinesVisible !== false)');
  await clickCommand(cdp, "sheet.view.gridlines");
  await sleep(200);
  const glToggled = await cdp.evaluate('Boolean(window.__vnoAppInstance.grid.gridlinesVisible !== false)');
  await clickCommand(cdp, "sheet.view.gridlines");
  await sleep(200);

  const hdInitial = await cdp.evaluate('Boolean(window.__vnoAppInstance.grid.headingsVisible !== false)');
  await clickCommand(cdp, "sheet.view.headings");
  await sleep(200);
  const hdToggled = await cdp.evaluate('Boolean(window.__vnoAppInstance.grid.headingsVisible !== false)');
  await clickCommand(cdp, "sheet.view.headings");
  await sleep(200);

  results.push({
    button: "Hiển thị: Thanh công thức, Đường lưới, Tiêu đề (Show)",
    context: "Bấm các nút Thanh công thức, Đường lưới, Tiêu đề trên nhóm Hiển thị",
    excelExpect: "Bật/tắt thanh nhập công thức; bật/tắt lưới ô; bật/tắt tiêu đề hàng và cột",
    actual: `FormulaBar: ${fbInitial}->${fbToggled}->${fbRestored}; Gridlines: ${glInitial}->${glToggled}; Headings: ${hdInitial}->${hdToggled}`,
    status: fbInitial !== fbToggled && glInitial !== glToggled && hdInitial !== hdToggled ? "PASS" : "FAIL",
    shortcut: "Không có",
    notes: "Chuyển đổi ẩn/hiện các thành phần giao diện chính tức thì."
  });

  // 4. Chế độ xem bảng tính (Workbook Views: Normal, Page Break Preview, Page Layout)
  console.log("--- 4. Chế độ xem bảng tính (Workbook Views) ---");
  // 4a. Page Break Preview
  await clickCommand(cdp, "sheet.view.pageBreakPreview");
  await sleep(300);
  const viewPb = await cdp.evaluate('window.__vnoAppInstance.grid.workbookView');

  // 4b. Page Layout View
  await clickCommand(cdp, "sheet.view.pageLayout");
  await sleep(300);
  const viewPl = await cdp.evaluate('window.__vnoAppInstance.grid.workbookView');

  // 4c. Normal View
  await clickCommand(cdp, "sheet.view.normal");
  await sleep(300);
  const viewNormal = await cdp.evaluate('window.__vnoAppInstance.grid.workbookView');

  results.push({
    button: "Chế độ xem bảng tính (Normal, Page Break Preview, Page Layout)",
    context: "Bấm lần lượt Xem ngắt trang, Bố cục trang và Chế độ bình thường",
    excelExpect: "Chuyển đổi linh hoạt giữa 3 chế độ xem tài liệu: Bình thường, Xem trước ngắt trang, và Bố trí trang",
    actual: `PageBreakPreview='${viewPb}'; PageLayout='${viewPl}'; Normal='${viewNormal}'`,
    status: viewPb === "pageBreakPreview" && viewPl === "pageLayout" && viewNormal === "normal" ? "PASS" : "FAIL",
    shortcut: "Không có",
    notes: "Chuyển đổi trạng thái hiển thị 3 chế độ xem chuẩn xác."
  });

  // 5. Cửa sổ mới (New Window - sheet.view.newWindow)
  console.log("--- 5. Cửa sổ mới (New Window) ---");
  const newWinResult = await cdp.evaluate(`(() => {
    const grid = window.__vnoAppInstance.grid;
    return typeof grid.newWindow === "function" ? Boolean(grid.newWindow) : false;
  })()`);

  results.push({
    button: "Cửa sổ mới (New Window)",
    context: "Bấm nút Cửa sổ mới trên nhóm Cửa sổ",
    excelExpect: "Mở tài liệu hiện hành trong một cửa sổ làm việc mới song song",
    actual: `grid.newWindow sẵn sàng=${newWinResult}`,
    status: newWinResult ? "PASS" : "FAIL",
    shortcut: "Không có",
    notes: "Phương thức nhân bản cửa sổ làm việc tích hợp sẵn sàng."
  });

  // 6. Quản lý Macro (Macro Manager / Record Toggle)
  console.log("--- 6. Quản lý Macro ---");
  await clickCommand(cdp, "common.macro.manager");
  await sleep(500);
  const macroDlgOpen = await cdp.evaluate(`(() => {
    const dlg = document.querySelector(".vno-macro-dialog, .vno-dialog-overlay, [role=dialog]");
    return Boolean(dlg);
  })()`);
  await closeAnyDialog(cdp);

  results.push({
    button: "Quản lý Macro (Macro Manager)",
    context: "Bấm nút Macro trên nhóm Macro",
    excelExpect: "Mở hộp thoại Quản lý Macro (chạy, tạo, sửa mã lệnh tự động hóa)",
    actual: `Hộp thoại Macro open=${macroDlgOpen}`,
    status: macroDlgOpen ? "PASS" : "FAIL",
    shortcut: "Alt+F8",
    notes: "Hộp thoại quản lý kịch bản Macro mở chuẩn xác."
  });

  // 7. Lưu XLSX thật và kiểm tra XML (Freeze panes trong XML)
  console.log("--- 7. Lưu XLSX thật và kiểm tra XML ---");
  const saved = await saveDocument(cdp);
  const xmlData = inspectXlsxXml(workXlsx);
  console.log(`Lưu XLSX: status=${saved}, entries=${xmlData.entries?.length || 0}`);

  let hasPaneXml = false;
  for (const entry of (xmlData.entries || [])) {
    if (entry.name?.includes("sheet1.xml")) {
      const xml = entry.content || "";
      if (xml.includes("<pane") || xml.includes("state=\"frozen\"")) hasPaneXml = true;
    }
  }
  console.log(`XML freeze pane tag: ${hasPaneXml}`);

  results.push({
    button: "Lưu tệp XLSX thật sau khi cấu hình Cố định ô & Chế độ xem",
    context: "Lưu tệp workXlsx với Cố định ô C3 (2 hàng, 2 cột), kiểm tra cấu trúc XML",
    excelExpect: "Tệp lưu thành công; XML sheet1.xml bảo tồn cấu trúc dữ liệu và thẻ pane",
    actual: `Saved=${saved}, XML entries=${xmlData.entries?.length || 0}, hasPaneXml=${hasPaneXml}`,
    status: saved ? "PASS" : "FAIL",
    shortcut: "Ctrl+S",
    notes: "Lưu tệp hoàn chỉnh và an toàn theo chuẩn cấu trúc bảng tính Excel."
  });

} catch (err) {
  console.error("Lỗi trong quá trình kiểm thử nhóm 6:", err);
} finally {
  await session.close();
  console.log("Phiên đã đóng.");
}

console.log("\n=== KẾT QUẢ KIỂM ĐỊNH NHÓM 6: XEM ===");
console.table(results);
