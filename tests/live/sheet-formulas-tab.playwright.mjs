import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const port = Number(process.env.VNO_SHEET_FORMULAS_TAB_PORT || 8798);
const playwrightRoot = "C:/Users/3T Computer/AppData/Local/Temp/vno-playwright-tools";
const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));

const server = http.createServer((req, res) => {
  const requestPath = req.url === "/" ? "/index.html" : decodeURIComponent(req.url.split("?")[0]);
  const file = path.join(root, path.normalize(requestPath).replace(/^[/\\]+/, ""));
  if (!file.startsWith(root) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404).end();
    return;
  }
  const ext = path.extname(file);
  const contentType = ext === ".css" ? "text/css" : ext === ".js" || ext === ".mjs" ? "text/javascript" : ext === ".svg" ? "image/svg+xml" : "text/html";
  res.writeHead(200, { "Content-Type": contentType });
  fs.createReadStream(file).pipe(res);
});

await new Promise(resolve => server.listen(port, "127.0.0.1", resolve));

const failures = [];
const assert = (condition, label, detail = "") => {
  console.log((condition ? "PASS" : "FAIL") + "\t" + label + (detail ? " — " + detail : ""));
  if (!condition) failures.push(label + ": " + detail);
};

let browser;
try {
  browser = await chromium.launch({
    executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 950 }, locale: "vi-VN" });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));

  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".vno-writer-page");

  // ==========================================
  // 1. CHUYỂN SANG VN SHEET VÀ TAB CÔNG THỨC
  // ==========================================
  console.log("\n--- KIỂM TRA LIVE: VN SHEET FORMULAS TAB ---");
  await page.locator("#vno-switcher-toggle").click();
  await page.locator('[data-switch="sheet"]').click();
  await page.locator('.vno-shell[data-app="sheet"]').waitFor({ state: "visible", timeout: 10000 });

  // Chuyển sang ribbon tab Công thức (Formulas)
  await page.locator(".vno-ribbon-tab").filter({ hasText: /^Công thức$/ }).click();

  // Kiểm tra 4 nhóm ribbon hiển thị
  const ribbonGroups = await page.locator('.vno-shell[data-app="sheet"] .vno-ribbon-group-label').allTextContents();
  assert(ribbonGroups.some(t => t.includes("Hàm tính toán")), "Ribbon có nhóm 'Hàm tính toán' (Function Library)");
  assert(ribbonGroups.some(t => t.includes("Tên đã xác định")), "Ribbon có nhóm 'Tên đã xác định' (Defined Names)");
  assert(ribbonGroups.some(t => t.includes("Kiểm tra công thức")), "Ribbon có nhóm 'Kiểm tra công thức' (Formula Auditing)");
  assert(ribbonGroups.some(t => t.includes("Tính toán")), "Ribbon có nhóm 'Tính toán' (Calculation)");

  // ==========================================
  // 2. HỘP THOẠI CHÈN HÀM (FX) & TÌM KIẾM
  // ==========================================
  console.log("\n--- KIỂM TRA: INSERT FUNCTION DIALOG (FX) ---");
  // Bấm nút Insert Function trên ribbon
  await page.locator('[data-command-id="sheet.formula.insertFunction"]').first().click();
  await page.waitForSelector(".vno-func-dialog", { state: "visible", timeout: 5000 });

  const dialogVisible = await page.locator(".vno-func-dialog").isVisible();
  assert(dialogVisible, "Hộp thoại Chèn hàm (fx) mở lên thành công");

  // Tìm kiếm hàm VLOOKUP
  const searchInput = page.locator("#vno-func-search");
  await searchInput.fill("VLOOKUP");
  await page.waitForTimeout(200);

  const foundItemText = await page.locator(".vno-func-item").first().textContent();
  assert(foundItemText.includes("VLOOKUP"), "Tìm kiếm 'VLOOKUP' lọc đúng hàm trong danh sách", foundItemText);

  const syntaxText = await page.locator("#vno-func-syntax").textContent();
  assert(syntaxText.includes("VLOOKUP(lookup_value"), "Hiển thị đúng cú pháp hàm VLOOKUP", syntaxText);

  // Nhấn 'Chèn hàm vào ô'
  await page.locator("#vno-fx-insert-btn").click();
  await page.waitForTimeout(300);

  const formulaInputVal = await page.locator("#vno-formula-val").inputValue();
  assert(formulaInputVal.includes("=VLOOKUP("), "Hàm VLOOKUP được chèn vào thanh công thức", formulaInputVal);

  // ==========================================
  // 3. SHOW FORMULAS (HIỆN CÔNG THỨC)
  // ==========================================
  console.log("\n--- KIỂM TRA: SHOW FORMULAS TOGGLE ---");
  await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const grid = globalUnoBridge.activeDocument.grid;
    grid.setCellValue("A", 1, 100);
    grid.setCellValue("A", 2, 200);
    grid.setCellValue("A", 3, "=SUM(A1:A2)");
  });
  await page.waitForTimeout(200);

  // Kích hoạt Show Formulas qua lệnh
  await page.evaluate(async () => {
    const { globalCommandBus } = await import("/platform/commands/command-bus.js");
    await globalCommandBus.execute("sheet.formula.showFormulas");
  });
  await page.waitForTimeout(200);

  const cellA3TextFormula = await page.locator('.vno-grid-cell[data-coord="A3"]').textContent();
  assert(cellA3TextFormula === "=SUM(A1:A2)", "Show Formulas hiển thị chuỗi công thức '=SUM(A1:A2)' thay vì kết quả", cellA3TextFormula);

  // Tắt Show Formulas -> Trở lại hiển thị kết quả tính
  await page.evaluate(async () => {
    const { globalCommandBus } = await import("/platform/commands/command-bus.js");
    await globalCommandBus.execute("sheet.formula.showFormulas");
  });
  await page.waitForTimeout(200);

  const cellA3TextVal = await page.locator('.vno-grid-cell[data-coord="A3"]').textContent();
  assert(cellA3TextVal.includes("300"), "Tắt Show Formulas trở lại hiển thị kết quả 300", cellA3TextVal);

  // ==========================================
  // 4. FORMULA AUDITING: TRACE PRECEDENTS & DEPENDENTS
  // ==========================================
  console.log("\n--- KIỂM TRA: TRACE PRECEDENTS & DEPENDENTS ---");
  // Chọn ô A3 và gọi Trace Precedents
  await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const grid = globalUnoBridge.activeDocument.grid;
    grid.selectCell("A", 3);
  });
  await page.locator('[data-command-id="sheet.formula.tracePrecedents"]').first().click();
  await page.waitForTimeout(200);

  const precClassA1 = await page.locator('.vno-grid-cell[data-coord="A1"]').getAttribute("class");
  const precClassA2 = await page.locator('.vno-grid-cell[data-coord="A2"]').getAttribute("class");
  assert(precClassA1.includes("vno-cell-precedent"), "Ô A1 được gán class .vno-cell-precedent khi trace A3");
  assert(precClassA2.includes("vno-cell-precedent"), "Ô A2 được gán class .vno-cell-precedent khi trace A3");

  const svgCount = await page.locator(".vno-audit-svg line, .vno-audit-svg circle").count();
  assert(svgCount >= 2, "SVG Audit layer vẽ các đường liên kết và điểm nút mũi tên", `Số phần tử: ${svgCount}`);

  // Xóa mũi tên (Remove Arrows)
  await page.locator('[data-command-id="sheet.formula.removeArrows"]').first().click();
  await page.waitForTimeout(200);

  const svgRemaining = await page.locator(".vno-audit-svg line").count();
  assert(svgRemaining === 0, "Remove Arrows xóa sạch toàn bộ đường vẽ SVG");

  // ==========================================
  // 5. CHẾ ĐỘ TÍNH TOÁN MANUAL VS AUTOMATIC
  // ==========================================
  console.log("\n--- KIỂM TRA: CALCULATION MODE (MANUAL & CALCULATE NOW) ---");
  // Chuyển sang chế độ Tính thủ công (Manual)
  await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const grid = globalUnoBridge.activeDocument.grid;
    grid.setCalculationMode("manual");
    grid.setCellValue("A", 1, 500);
  });
  await page.waitForTimeout(200);

  // A3 chưa được tính lại trong chế độ Manual!
  const a3ManualVal = await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    return globalUnoBridge.activeDocument.grid.cellsData.get("A3")?.val;
  });
  assert(String(a3ManualVal).includes("300"), "Trong chế độ Manual, thay đổi A1 không làm A3 tự động tính lại", String(a3ManualVal));

  // Nhấn Calculate Now (F9)
  await page.locator('[data-command-id="sheet.formula.recalculate"]').first().click();
  await page.waitForTimeout(200);

  const a3Recalculated = await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    return globalUnoBridge.activeDocument.grid.cellsData.get("A3")?.val;
  });
  assert(String(a3Recalculated).includes("700"), "Sau Calculate Now (F9), A3 được tính chính xác thành 700", String(a3Recalculated));

  // ==========================================
  // 6. KIỂM TRA LỖI (ERROR CHECKING) & WATCH WINDOW
  // ==========================================
  console.log("\n--- KIỂM TRA: ERROR CHECKING & WATCH WINDOW ---");
  await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const grid = globalUnoBridge.activeDocument.grid;
    grid.setCellValue("E", 1, "#DIV/0!");
  });

  await page.locator('[data-command-id="sheet.formula.errorChecking"]').first().click();
  await page.waitForSelector(".vno-dialog-table", { state: "visible", timeout: 5000 });

  const errorDialogRows = await page.locator(".vno-error-row").count();
  assert(errorDialogRows >= 1, "Error Checking phát hiện ô có lỗi công thức trong bảng tính", `Số hàng lỗi: ${errorDialogRows}`);
  await page.locator(".vno-rule-cancel").click();
  await page.waitForTimeout(200);

  // Watch Window
  await page.locator('[data-command-id="sheet.formula.watchWindow"]').first().click();
  await page.waitForSelector("#vno-watch-window", { state: "visible", timeout: 5000 });

  const watchWindowVisible = await page.locator("#vno-watch-window").isVisible();
  assert(watchWindowVisible, "Cửa sổ theo dõi (Watch Window) hiển thị thành công");
  await page.locator("#vno-watch-close").click();

  // Đảm bảo không có console errors/pageerrors nào
  assert(errors.length === 0, "Không phát sinh bất kỳ pageerror nào trong suốt phiên tương tác", errors.join(" | "));

  console.log("\n==================================================");
  console.log(`KẾT QUẢ LIVE PLAYWRIGHT: ${failures.length === 0 ? "TẤT CẢ ĐẠT CHUẨN (PASS)" : failures.length + " LỖI"}`);
  console.log("==================================================");
} catch (err) {
  console.error("LỖI NGOẠI LỆ TRONG PLAYWRIGHT RUNNER:", err);
  failures.push(err.message);
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}

if (failures.length > 0) {
  process.exit(1);
} else {
  process.exit(0);
}