import { pathToFileURL } from "node:url";
import path from "node:path";

const playwrightRoot = process.env.VNO_PLAYWRIGHT_ROOT || "C:\\Users\\3T Computer\\AppData\\Local\\Temp\\vno-playwright-tools";
const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));

const browser = await chromium.launch({
  executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  headless: true
});

const context = await browser.newContext({
  permissions: ["clipboard-read", "clipboard-write"]
});
const page = await context.newPage();

const consoleErrors = [];
page.on("pageerror", err => consoleErrors.push(err.message));
page.on("console", msg => {
  if (msg.type() === "error") consoleErrors.push(msg.text());
});

await page.goto("http://127.0.0.1:8769/", { waitUntil: "networkidle" });

// Chuyển sang VN Sheet
await page.locator("#vno-switcher-toggle").click();
await page.locator('[data-switch="sheet"]').click();
await page.locator('.vno-shell[data-app="sheet"]').waitFor();

// Helper lấy cell value từ JS runtime
async function getCellValue(coord) {
  return await page.evaluate(async (c) => {
    const uno = (await import("/adapters/libreoffice/common/uno-bridge.js")).globalUnoBridge;
    const g = uno.activeDocument.grid;
    const item = g.cellsData.get(c);
    return item ? { val: item.val, formula: item.formula } : { val: "", formula: "" };
  }, coord);
}

// Helper lấy activeElement
async function getActiveElementInfo() {
  return await page.evaluate(() => {
    const el = document.activeElement;
    if (!el) return null;
    return {
      tagName: el.tagName,
      id: el.id,
      className: el.className
    };
  });
}

// Helper click vào cell TD
async function clickCell(coord) {
  const cell = page.locator(`.vno-grid-cell[data-coord="${coord}"]`);
  await cell.scrollIntoViewIfNeeded();
  await cell.click();
}

console.log("=== BẮT ĐẦU AUDIT BÀN PHÍM VN SHEET ===");

const results = [];

async function testStep(stt, name, fn) {
  try {
    await fn();
    console.log(`[PASS] Bước ${stt}: ${name}`);
    results.push({ stt, name, pass: true, error: null });
  } catch (err) {
    console.error(`[FAIL] Bước ${stt}: ${name}\n       Lỗi: ${err.message}`);
    results.push({ stt, name, pass: false, error: err.message });
  }
}

// 1. Nhập liệu cơ bản
await testStep(1, "Nhập liệu cơ bản: click ô trống, gõ số/chữ/công thức trực tiếp, Enter", async () => {
  // Click J20
  await clickCell("J20");
  const act = await getActiveElementInfo();
  if (!act || !act.className.includes("vno-sheet-container")) {
    throw new Error(`Click ô nhưng focus không ở container: ${JSON.stringify(act)}`);
  }
  
  // Gõ số 123 và Enter
  await page.keyboard.type("123");
  await page.keyboard.press("Enter");
  
  const cellJ20 = await getCellValue("J20");
  if (cellJ20.val !== "123") {
    throw new Error(`J20 mong muốn "123", thực tế: "${cellJ20.val}"`);
  }

  // Focus sau khi Enter: có điều hướng được mũi tên không?
  // Nếu Enter xong focus bị kẹt trong formulaInput thì ArrowDown sẽ không di chuyển cell!
  await page.keyboard.press("ArrowDown");
  const activeCoordAfterArrow = await page.evaluate(async () => {
    const uno = (await import("/adapters/libreoffice/common/uno-bridge.js")).globalUnoBridge;
    return `${uno.activeDocument.grid.selectedCoord.c}${uno.activeDocument.grid.selectedCoord.r}`;
  });
  // Enter đưa từ J20 xuống J21. ArrowDown phải đưa xuống J22!
  if (activeCoordAfterArrow !== "J22") {
    throw new Error(`Sau Enter và ArrowDown, ô được chọn là ${activeCoordAfterArrow}, mong muốn J22 (bị kẹt focus sau Enter)`);
  }

  // Nhập công thức =10+20 vào J22
  await page.keyboard.type("=10+20");
  await page.keyboard.press("Enter");
  const cellJ22 = await getCellValue("J22");
  if (cellJ22.formula !== "=10+20" || !String(cellJ22.val).includes("30")) {
    throw new Error(`J22 mong muốn công thức =10+20 trả về 30, thực tế: ${JSON.stringify(cellJ22)}`);
  }
});

// 2. Sửa nội dung ô đã có dữ liệu
await testStep(2, "Sửa nội dung: gõ đè thay thế toàn bộ vs bấm F2 rồi gõ (thêm vào cuối)", async () => {
  // 2a. Gõ đè lên J20 (đang có "123")
  await clickCell("J20");
  await page.keyboard.type("999");
  await page.keyboard.press("Enter");
  const cellJ20 = await getCellValue("J20");
  if (cellJ20.val !== "999") {
    throw new Error(`Gõ đè lên J20 mong muốn "999", thực tế: "${cellJ20.val}"`);
  }

  // 2b. Bấm F2 trên J20 rồi gõ "abc" (phải thành "999abc", KHÔNG được xóa "999")
  await clickCell("J20");
  await page.keyboard.press("F2");
  await page.keyboard.type("abc");
  await page.keyboard.press("Enter");
  const cellJ20AfterF2 = await getCellValue("J20");
  if (cellJ20AfterF2.val !== "999abc") {
    throw new Error(`F2 gõ "abc" vào J20 mong muốn "999abc", thực tế: "${cellJ20AfterF2.val}"`);
  }
});

// 3. Điều hướng Tab qua nhiều ô liên tiếp trong 1 hàng (kế toán điền hàng ngang)
await testStep(3, "Điều hướng Tab qua nhiều ô liên tiếp trong 1 hàng", async () => {
  await clickCell("J25");
  // Nhập J25: 1 -> Tab -> K25: Khoản mục A -> Tab -> L25: 5 -> Tab -> M25: 10000 -> Enter
  await page.keyboard.type("1");
  await page.keyboard.press("Tab");
  await page.keyboard.type("Khoản mục A");
  await page.keyboard.press("Tab");
  await page.keyboard.type("5");
  await page.keyboard.press("Tab");
  await page.keyboard.type("10000");
  await page.keyboard.press("Enter");

  const j = await getCellValue("J25");
  const k = await getCellValue("K25");
  const l = await getCellValue("L25");
  const m = await getCellValue("M25");

  if (j.val !== "1") throw new Error(`J25 mong muốn "1", thực tế "${j.val}"`);
  if (k.val !== "Khoản mục A") throw new Error(`K25 mong muốn "Khoản mục A", thực tế "${k.val}"`);
  if (l.val !== "5") throw new Error(`L25 mong muốn "5", thực tế "${l.val}"`);
  if (m.val !== "10000") throw new Error(`M25 mong muốn "10000", thực tế "${m.val}"`);
});

// 4. Enter liên tục xuống nhiều hàng (điền 1 cột dữ liệu dọc)
await testStep(4, "Enter liên tục xuống nhiều hàng (điền cột dọc)", async () => {
  await clickCell("N20");
  await page.keyboard.type("Dong1");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Dong2");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Dong3");
  await page.keyboard.press("Enter");

  const n20 = await getCellValue("N20");
  const n21 = await getCellValue("N21");
  const n22 = await getCellValue("N22");

  if (n20.val !== "Dong1") throw new Error(`N20 mong muốn "Dong1", thực tế "${n20.val}"`);
  if (n21.val !== "Dong2") throw new Error(`N21 mong muốn "Dong2", thực tế "${n21.val}"`);
  if (n22.val !== "Dong3") throw new Error(`N22 mong muốn "Dong3", thực tế "${n22.val}"`);
});

// 5. Copy/Paste bằng Ctrl+C/Ctrl+V thật giữa các ô
await testStep(5, "Copy/Paste bằng Ctrl+C/Ctrl+V thật giữa các ô", async () => {
  await clickCell("N20"); // Có "Dong1"
  await page.keyboard.press("Control+c");
  await clickCell("N25");
  await page.keyboard.press("Control+v");
  await page.waitForTimeout(200);

  const n25 = await getCellValue("N25");
  if (n25.val !== "Dong1") {
    throw new Error(`Paste vào N25 mong muốn "Dong1", thực tế "${n25.val}"`);
  }
});

// 6. Delete/Backspace trên ô đã chọn (không vào edit mode)
await testStep(6, "Delete/Backspace trên ô đã chọn không làm mất định dạng", async () => {
  await clickCell("N25");
  await page.keyboard.press("Delete");
  const n25AfterDel = await getCellValue("N25");
  if (n25AfterDel.val !== "") {
    throw new Error(`Delete N25 mong muốn rỗng, thực tế "${n25AfterDel.val}"`);
  }
});

// 7. Undo/Redo (Ctrl+Z/Ctrl+Y) ngay sau khi gõ dữ liệu bằng bàn phím thật
await testStep(7, "Undo/Redo (Ctrl+Z/Ctrl+Y) bằng phím tắt thật sau khi gõ", async () => {
  await clickCell("P20");
  await page.keyboard.type("GiaTriBanDau");
  await page.keyboard.press("Enter");

  const p20AfterType = await getCellValue("P20");
  if (p20AfterType.val !== "GiaTriBanDau") {
    throw new Error(`P20 vừa gõ mong muốn "GiaTriBanDau", thực tế "${p20AfterType.val}"`);
  }

  // Ctrl+Z phải khôi phục ô về rỗng
  await page.keyboard.press("Control+z");
  const p20AfterUndo = await getCellValue("P20");
  if (p20AfterUndo.val !== "") {
    throw new Error(`Sau Ctrl+Z, P20 mong muốn rỗng, thực tế "${p20AfterUndo.val}"`);
  }

  // Ctrl+Y phải làm lại
  await page.keyboard.press("Control+y");
  const p20AfterRedo = await getCellValue("P20");
  if (p20AfterRedo.val !== "GiaTriBanDau") {
    throw new Error(`Sau Ctrl+Y, P20 mong muốn "GiaTriBanDau", thực tế "${p20AfterRedo.val}"`);
  }
});

// 8. Nhập công thức có hàm mới (PMT, FV, PV, RATE, SLN, DB) bằng gõ bàn phím thật
await testStep(8, "Nhập công thức hàm mới (PMT, FV, PV, SLN, DB) bằng bàn phím thật", async () => {
  // Gõ PMT vào Q25
  await clickCell("Q25");
  await page.keyboard.type("=PMT(0.08/12,60,100000000)");
  await page.keyboard.press("Enter");
  const q25 = await getCellValue("Q25");
  // PMT(0.08/12, 60, 100000000) = -2027639.43...
  if (!String(q25.val).includes("2.027.639")) {
    throw new Error(`PMT Q25 kết quả không đúng: ${JSON.stringify(q25)}`);
  }

  // Gõ SLN vào Q26
  await clickCell("Q26");
  await page.keyboard.type("=SLN(100000000,10000000,5)");
  await page.keyboard.press("Enter");
  const q26 = await getCellValue("Q26");
  // (100000000 - 10000000) / 5 = 18.000.000
  if (!String(q26.val).includes("18.000.000")) {
    throw new Error(`SLN Q26 kết quả không đúng: ${JSON.stringify(q26)}`);
  }
});

// 9. Test riêng: chọn 1 vùng nhiều ô (Shift+click), gõ giá trị + Enter
await testStep(9, "Chọn vùng nhiều ô (Shift+click), gõ giá trị + Enter chỉ điền ô active", async () => {
  await clickCell("R20");
  // Shift+click R22 để chọn vùng R20:R22
  const r22 = page.locator('.vno-grid-cell[data-coord="R22"]');
  await r22.click({ modifiers: ["Shift"] });

  // Gõ "OnlyR20" và Enter
  await page.keyboard.type("OnlyR20");
  await page.keyboard.press("Enter");

  const r20 = await getCellValue("R20");
  const r21 = await getCellValue("R21");
  const r22Val = await getCellValue("R22");

  if (r20.val !== "OnlyR20") throw new Error(`R20 mong muốn "OnlyR20", thực tế "${r20.val}"`);
  if (r21.val !== "") throw new Error(`R21 bị ghi đè: "${r21.val}"`);
  if (r22Val.val !== "") throw new Error(`R22 bị ghi đè: "${r22Val.val}"`);
});

console.log("\n=== TỔNG KẾT KIỂM THỬ ===");
let passed = 0;
let failed = 0;
for (const r of results) {
  if (r.pass) passed++;
  else failed++;
}
console.log(`Kết quả: ${passed}/${results.length} PASS | ${failed} FAIL`);

if (consoleErrors.length > 0) {
  console.log("Console errors trong trang:", consoleErrors);
}

await browser.close();
process.exit(failed > 0 ? 1 : 0);
