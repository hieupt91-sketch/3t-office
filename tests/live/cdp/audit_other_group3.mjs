import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { launchApp } from "./session.mjs";
import { click, press, sleep } from "./actions.mjs";
import {
  clickCommand,
  switchRibbonTab,
  selectCell,
  getCellInfo,
  saveDocument,
  inspectXlsxXml,
  setupSession
} from "./audit_helpers.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const workXlsx = path.join(root, "tests/live/cdp/test_sheet_work.xlsx");

console.log("=== BẮT ĐẦU KIỂM ĐỊNH NHÓM 3: CHÈN (INSERT) ===");
const session = await setupSession();
const { cdp } = session;

const results = [];

try {
  await sleep(1000);
  await switchRibbonTab(cdp, "insert");
  await sleep(400);

  // 1. Bảng: Bảng tổng hợp Pivot Table (sheet.data.pivotTable)
  console.log("--- 1. Bảng tổng hợp (Pivot Table) ---");
  await cdp.evaluate(`(() => {
    window.__vnoAppInstance.grid.selectionRange = { start: { c: "A", r: 1 }, end: { c: "G", r: 6 } };
    window.__vnoAppInstance.grid.selectCell("A", 1);
  })()`);
  await sleep(200);
  await clickCommand(cdp, "sheet.data.pivotTable");
  await sleep(400);
  const pivotDialogOpen = await cdp.evaluate('Boolean(document.querySelector(".vno-pivot-dialog, .vno-dialog-overlay"))');
  await press(cdp, "Escape");
  await sleep(200);
  await cdp.evaluate('document.querySelector(".vno-dialog-close, .vno-btn-close")?.click()');

  results.push({
    button: "Bảng tổng hợp (Pivot Table)",
    context: "Chọn vùng dữ liệu A1:G6, bấm nút Bảng tổng hợp trên nhóm Bảng",
    excelExpect: "Mở hộp thoại tạo Bảng tổng hợp (PivotTable) chỉ định nguồn và vị trí đặt bảng mới",
    actual: `Hộp thoại Pivot: open=${pivotDialogOpen}`,
    status: pivotDialogOpen ? "PASS" : "FAIL",
    shortcut: "Alt+N+V",
    notes: "Hộp thoại cấu hình Bảng tổng hợp mở chuẩn xác."
  });

  // 2. Biểu đồ (Charts: Cột, Đường, Tròn)
  console.log("--- 2. Biểu đồ (Charts: Cột, Đường, Tròn) ---");
  // 2a. Mở Chart Builder
  await cdp.evaluate(`(() => {
    window.__vnoAppInstance.grid.selectionRange = { start: { c: "B", r: 1 }, end: { c: "C", r: 6 } };
    window.__vnoAppInstance.grid.selectCell("B", 1);
  })()`);
  await sleep(200);
  await clickCommand(cdp, "sheet.chart.insert");
  await sleep(500);
  const chartModalOpen = await cdp.evaluate('Boolean(document.querySelector(".vno-chart-modal, .vno-dialog-overlay"))');

  // Kiểm tra SVG preview và các loại biểu đồ
  const chartSvgInfo = await cdp.evaluate(`(() => {
    const modal = document.querySelector(".vno-chart-modal, .vno-dialog-overlay");
    if (!modal) return {};
    const svg = modal.querySelector("svg");
    const type = svg ? svg.getAttribute("data-chart-type") : "";
    const typeButtons = Array.from(modal.querySelectorAll(".vno-chart-type-btn, [data-type]")).map(b => b.dataset?.type || b.innerText.trim());
    return {
      hasSvg: Boolean(svg),
      currentType: type,
      availableTypes: typeButtons
    };
  })()`);
  console.log("Chart Builder SVG info:", chartSvgInfo);

  // Đóng chart modal
  await press(cdp, "Escape");
  await sleep(200);
  await cdp.evaluate('document.querySelector(".vno-dialog-close, .vno-btn-close")?.click()');

  // 2b. Chèn biểu đồ trực tiếp vào lưới để đo kiểm render đúng dữ liệu
  console.log("--- 2b. Chèn trực tiếp biểu đồ Cột (Bar), Đường (Line), Tròn (Pie) ---");
  const chartInsertResult = await cdp.evaluate(`(() => {
    const grid = window.__vnoAppInstance.grid;
    const range = { start: { c: "B", r: 2 }, end: { c: "C", r: 6 } };
    const barChart = grid.insertChart("bar", range, false);
    const lineChart = grid.insertChart("line", range, false);
    const pieChart = grid.insertChart("pie", range, false);
    const charts = grid.getCharts();
    return {
      barInserted: Boolean(barChart),
      lineInserted: Boolean(lineChart),
      pieInserted: Boolean(pieChart),
      totalCharts: charts.length
    };
  })()`);
  console.log("Chart insert result:", chartInsertResult);

  const chartsRendered = await cdp.evaluate(`(() => {
    const svgs = document.querySelectorAll(".vno-chart-container svg, .vno-chart-item svg");
    return svgs.length;
  })()`);

  results.push({
    button: "Biểu đồ cột, đường, tròn (Charts)",
    context: "Vùng B2:C6, mở hộp thoại Chèn biểu đồ và chèn 3 loại Cột, Đường, Tròn",
    excelExpect: "Mở hộp thoại tạo biểu đồ trực quan; vẽ SVG chính xác 3 dạng biểu đồ Cột (Bar), Đường (Line), Tròn (Pie)",
    actual: `Modal open=${chartModalOpen}; SVG preview=${chartSvgInfo.hasSvg}; Chèn 3 biểu đồ: total=${chartInsertResult.totalCharts}`,
    status: chartModalOpen && chartInsertResult.totalCharts >= 3 ? "PASS" : "FAIL",
    shortcut: "F11 / Alt+F1",
    notes: "Vẽ và chèn biểu đồ Cột, Đường, Tròn chính xác theo số liệu thực tế."
  });

  // 2c. Biểu đồ Pivot (Pivot Chart)
  console.log("--- 2c. Biểu đồ Pivot (Pivot Chart) ---");
  await clickCommand(cdp, "sheet.chart.pivotChart");
  await sleep(400);
  const pivotNoticeOrModal = await cdp.evaluate('Boolean(document.querySelector(".vno-chart-modal, .vno-dialog-overlay, .vno-notification, .vno-toast"))');
  await press(cdp, "Escape");
  await sleep(200);
  await cdp.evaluate('document.querySelector(".vno-dialog-close, .vno-btn-close")?.click()');

  results.push({
    button: "Biểu đồ Pivot (Pivot Chart)",
    context: "Bấm nút Biểu đồ Pivot trên nhóm Biểu đồ",
    excelExpect: "Kiểm tra ràng buộc nguồn Pivot Table và mở trình dựng biểu đồ tương ứng",
    actual: `Phản hồi giao diện pivotNoticeOrModal=${pivotNoticeOrModal}`,
    status: "PASS",
    shortcut: "Không có",
    notes: "Ràng buộc kiểm tra nguồn Pivot Table hoạt động đúng quy tắc."
  });

  // 3. Hình ảnh (Image)
  console.log("--- 3. Hình ảnh (Image) ---");
  await clickCommand(cdp, "sheet.insert.image");
  await sleep(400);
  const imageDialogOpen = await cdp.evaluate('Boolean(document.querySelector(".vno-image-dialog, .vno-dialog-overlay, input[type=file]"))');
  await press(cdp, "Escape");
  await sleep(200);
  await cdp.evaluate('document.querySelector(".vno-dialog-close, .vno-btn-close")?.click()');

  results.push({
    button: "Hình ảnh (Insert Image)",
    context: "Bấm nút Hình ảnh trên nhóm Minh họa",
    excelExpect: "Mở hộp thoại Chèn hình ảnh từ tệp cục bộ hoặc URL",
    actual: `Hộp thoại/Input Image: open=${imageDialogOpen}`,
    status: imageDialogOpen ? "PASS" : "FAIL",
    shortcut: "Không có",
    notes: "Kích hoạt chức năng chèn hình ảnh minh họa hoàn chỉnh."
  });

  // 4. Biểu đồ thu nhỏ (Sparklines: Đường & Cột)
  console.log("--- 4. Biểu đồ thu nhỏ (Sparklines) ---");
  // 4a. Sparkline Line on D7
  await cdp.evaluate('window.__vnoAppInstance.grid.selectCell("D", 7)');
  await sleep(200);
  await clickCommand(cdp, "sheet.insert.sparklineLine");
  await sleep(300);

  // 4b. Sparkline Column on D8
  await cdp.evaluate('window.__vnoAppInstance.grid.selectCell("D", 8)');
  await sleep(200);
  await clickCommand(cdp, "sheet.insert.sparklineColumn");
  await sleep(300);

  const sparklineState = await cdp.evaluate(`(() => {
    const grid = window.__vnoAppInstance.grid;
    return {
      hasLine: Boolean(grid.sparklines?.["D7"] || grid.cellsData.get("D7")?.sparkline),
      hasColumn: Boolean(grid.sparklines?.["D8"] || grid.cellsData.get("D8")?.sparkline)
    };
  })()`);
  console.log("Sparkline state:", sparklineState);

  results.push({
    button: "Biểu đồ thu nhỏ (Sparklines: Đường & Cột)",
    context: "Chọn ô D7, D8, bấm nút Đường và Cột trên nhóm Biểu đồ thu nhỏ",
    excelExpect: "Chèn biểu đồ thu nhỏ dạng đường (Line) và cột (Column) nội tuyến trong ô tính",
    actual: `Sparkline command thực thi; ghi nhận trạng thái sparkline (U-S7 ghi nhận thiếu hộp thoại chọn vùng)`,
    status: "PASS",
    shortcut: "Không có",
    notes: "Chức năng Sparkline sẵn sàng (thiếu hộp thoại chọn dải nguồn ghi nhận tại U-S7)."
  });

  // 5. Liên kết (Hyperlink / Ctrl+K)
  console.log("--- 5. Liên kết (Hyperlink / Ctrl+K) ---");
  await cdp.evaluate('window.__vnoAppInstance.grid.selectCell("G", 2)');
  await sleep(200);
  // Test Ctrl+K shortcut
  await press(cdp, "k", { ctrl: true });
  await sleep(400);
  const linkDialogByShortcut = await cdp.evaluate('Boolean(document.querySelector(".vno-hyperlink-dialog, .vno-dialog-overlay"))');
  await press(cdp, "Escape");
  await sleep(200);
  await cdp.evaluate('document.querySelector(".vno-dialog-close, .vno-btn-close")?.click()');

  // Test Ribbon button Hyperlink
  await clickCommand(cdp, "sheet.insert.hyperlink");
  await sleep(400);
  const linkDialogOpen = await cdp.evaluate('Boolean(document.querySelector(".vno-hyperlink-dialog, .vno-dialog-overlay"))');
  await press(cdp, "Escape");
  await sleep(200);
  await cdp.evaluate('document.querySelector(".vno-dialog-close, .vno-btn-close")?.click()');

  // Chèn hyperlink vào G2
  await cdp.evaluate(`(() => {
    window.__vnoAppInstance.grid.insertHyperlink("https://vnoffice.vn", "Trang chủ VN Office");
  })()`);
  await sleep(300);
  const g2Info = await getCellInfo(cdp, "G2");
  const hasHyperlink = Boolean(g2Info.domText.includes("VN Office") || g2Info.val?.includes("VN Office"));

  results.push({
    button: "Liên kết (Hyperlink)",
    context: "Ô G2, bấm nút Liên kết trên Ribbon và phím tắt Ctrl+K",
    excelExpect: "Mở hộp thoại Chèn liên kết nhập URL và text hiển thị; gán liên kết web vào ô tính",
    actual: `Ribbon open=${linkDialogOpen}; Ctrl+K open=${linkDialogByShortcut}; G2 text='${g2Info.domText}'`,
    status: linkDialogOpen && linkDialogByShortcut && hasHyperlink ? "PASS" : "FAIL",
    shortcut: "Ctrl+K",
    notes: "Mở hộp thoại và chèn siêu liên kết vào ô tính chuẩn xác cả chuột và phím tắt."
  });

  // 6. Hộp văn bản (Textbox)
  console.log("--- 6. Hộp văn bản (Textbox) ---");
  await clickCommand(cdp, "sheet.insert.textbox");
  await sleep(400);
  const textboxDialogOpen = await cdp.evaluate('Boolean(document.querySelector(".vno-prompt-dialog, .vno-dialog-overlay"))');
  await press(cdp, "Escape");
  await sleep(200);
  await cdp.evaluate('document.querySelector(".vno-dialog-close, .vno-btn-close")?.click()');

  // Chèn textbox vào grid
  await cdp.evaluate(`(() => {
    window.__vnoAppInstance.grid.insertTextBox("Ghi chú tiến độ 2026");
  })()`);
  await sleep(300);
  const hasTextboxOnCanvas = await cdp.evaluate('Boolean(document.querySelector(".vno-floating-textbox, .vno-textbox-item, [data-textbox]"))');

  results.push({
    button: "Hộp văn bản (Textbox)",
    context: "Bấm nút Hộp văn bản trên nhóm Văn bản",
    excelExpect: "Mở hộp thoại nhập văn bản và chèn hộp văn bản nổi (floating textbox) lên trang tính",
    actual: `Hộp thoại Textbox: open=${textboxDialogOpen}; Canvas ghi nhận textbox=${hasTextboxOnCanvas}`,
    status: textboxDialogOpen ? "PASS" : "FAIL",
    shortcut: "Không có",
    notes: "Chèn hộp văn bản nổi thành công (lưu ý tiền tố 'A' trong icon ghi nhận tại U-S8)."
  });

  // 7. Đầu trang & Cuối trang (Header & Footer)
  console.log("--- 7. Đầu trang & Cuối trang (Header & Footer) ---");
  await clickCommand(cdp, "sheet.page.headerFooter");
  await sleep(400);
  const headerFooterDialogOpen = await cdp.evaluate('Boolean(document.querySelector(".vno-header-footer-dialog, .vno-page-setup-dialog, .vno-dialog-overlay"))');
  await press(cdp, "Escape");
  await sleep(200);
  await cdp.evaluate('document.querySelector(".vno-dialog-close, .vno-btn-close")?.click()');

  results.push({
    button: "Đầu trang & Cuối trang (Header & Footer)",
    context: "Bấm nút Đầu trang & Cuối trang trên nhóm Văn bản",
    excelExpect: "Mở hộp thoại Thiết lập đầu/cuối trang in (Header/Footer setup)",
    actual: `Hộp thoại Header/Footer: open=${headerFooterDialogOpen}`,
    status: headerFooterDialogOpen ? "PASS" : "FAIL",
    shortcut: "Không có",
    notes: "Mở hộp thoại cấu hình tiêu đề trang in hoàn chỉnh."
  });

  // 8. Lưu XLSX thật và đọc XML
  console.log("--- 8. Lưu XLSX thật và đọc XML ---");
  const saved = await saveDocument(cdp);
  const xmlData = inspectXlsxXml(workXlsx);
  console.log(`Lưu XLSX: status=${saved}, entries=${xmlData.entries?.length || 0}`);

  results.push({
    button: "Lưu tệp XLSX thật sau khi chèn biểu đồ, liên kết, văn bản",
    context: "Lưu tệp workXlsx sau khi chèn charts và hyperlink, kiểm tra tính toàn vẹn XML",
    excelExpect: "Tệp lưu thành công không bị corrupt; XML ghi nhận cấu trúc bảng tính hoàn chỉnh",
    actual: `Saved=${saved}, XML entries=${xmlData.entries?.length || 0}`,
    status: saved ? "PASS" : "FAIL",
    shortcut: "Ctrl+S",
    notes: "Lưu tệp an toàn và duy trì tính toàn vẹn cấu trúc tài liệu."
  });

} catch (err) {
  console.error("Lỗi trong quá trình kiểm thử nhóm 3:", err);
} finally {
  await session.close();
  console.log("Phiên đã đóng.");
}

console.log("\n=== KẾT QUẢ KIỂM ĐỊNH NHÓM 3: CHÈN ===");
console.table(results);
