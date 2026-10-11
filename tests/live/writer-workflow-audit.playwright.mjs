import { pathToFileURL } from "node:url";
import path from "node:path";
import { spawn } from "node:child_process";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const port = Number(process.env.VNO_WRITER_AUDIT_PORT || 8771);
const playwrightRoot = "C:/Users/3T Computer/AppData/Local/Temp/vno-ui-audit-playwright";
const edgePath = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));

const server = spawn("python", ["-m", "http.server", String(port), "--bind", "127.0.0.1"], {
  cwd: repoRoot,
  stdio: "ignore"
});

const evidence = [];
const failures = [];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const assert = (condition, message, detail = "") => {
  const row = { status: condition ? "PASS" : "FAIL", message, detail };
  evidence.push(row);
  console.log(`${row.status}\t${message}${detail ? ` — ${detail}` : ""}`);
  if (!condition) failures.push(row);
};

await sleep(900);
let browser;
try {
  browser = await chromium.launch({ executablePath: edgePath, headless: true });
  const context = await browser.newContext({ locale: "vi-VN", viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const browserErrors = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));

  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "networkidle" });
  const body = page.locator(".vno-writer-body");
  await body.waitFor();

  const focusEvidence = async (step) => {
    const state = await page.evaluate((stepLabel) => {
      const active = document.activeElement;
      const editor = document.querySelector(".vno-writer-body");
      return {
        step: stepLabel,
        tag: active?.tagName || null,
        className: active?.className || "",
        inEditor: active === editor || Boolean(editor?.contains(active)),
        selectionInEditor: Boolean(window.getSelection()?.anchorNode && editor?.contains(window.getSelection().anchorNode))
      };
    }, step);
    evidence.push({ status: state.inEditor ? "PASS" : "FOCUS", message: `Focus ${step}`, detail: JSON.stringify(state) });
    console.log(`FOCUS\t${step}\t${JSON.stringify(state)}`);
    return state;
  };

  const clickTab = async (label) => {
    await page.locator(".vno-ribbon-tab", { hasText: label }).click();
  };

  // File > Mới, bằng click chuột thật.
  await page.locator(".vno-ribbon-tab-file").click();
  await page.locator('[data-backstage-cmd="common.file.new"]').click();
  await body.click();
  await focusEvidence("sau File > Mới");
  assert((await body.innerText()).trim() === "", "0. File > Mới tạo trang trắng");

  // 1. Gõ liên tục tiêu đề + đoạn mở đầu.
  await page.keyboard.type("QUYẾT ĐỊNH");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Căn cứ đề nghị của Văn phòng Ủy ban nhân dân.");
  await focusEvidence("sau nhập tiêu đề và đoạn mở đầu");
  assert((await body.innerText()).includes("QUYẾT ĐỊNH") && (await body.innerText()).includes("Căn cứ đề nghị"), "1. Nhập tiêu đề và đoạn mở đầu bằng bàn phím thật");

  // 2. Chọn đoạn hiện tại, áp Ctrl+B, thoát vùng chọn sang phải rồi gõ tiếp.
  await page.keyboard.press("Home");
  await page.keyboard.down("Shift");
  await page.keyboard.press("End");
  await page.keyboard.up("Shift");
  await page.keyboard.press("Control+B");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.type(" Nội dung nối tiếp bình thường.");
  const boldState = await page.evaluate(() => {
    const editor = document.querySelector(".vno-writer-body");
    const find = (text) => {
      const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) if (walker.currentNode.data.includes(text)) return walker.currentNode.parentElement;
      return null;
    };
    const selected = find("Căn cứ đề nghị");
    const suffix = find("Nội dung nối tiếp bình thường");
    const bold = (el) => el && (el.closest("b,strong") || getComputedStyle(el).fontWeight >= 600);
    return { selectedBold: Boolean(bold(selected)), suffixBold: Boolean(bold(suffix)), html: editor.innerHTML };
  });
  assert(boldState.selectedBold, "2a. Vùng được chọn nhận Bold", boldState.html);
  assert(!boldState.suffixBold, "2b. Chữ gõ tiếp sau vùng chọn không bị dính Bold", boldState.html);
  await focusEvidence("sau Bold và gõ nối tiếp");

  // 3. Tạo một dòng, áp Heading 1 bằng click Quick Style thật, Enter và gõ dòng sau.
  await page.keyboard.press("Enter");
  await page.keyboard.type("PHẠM VI ÁP DỤNG");
  await page.keyboard.press("Home");
  await page.keyboard.down("Shift");
  await page.keyboard.press("End");
  await page.keyboard.up("Shift");
  await page.locator('.vno-style-strip-item[data-style-id="h1"]').click();
  await body.press("End");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Dòng nội dung sau tiêu đề.");
  const styleState = await page.evaluate(() => {
    const blocks = [...document.querySelector(".vno-writer-body").children];
    const heading = blocks.find((el) => el.textContent.includes("PHẠM VI ÁP DỤNG"));
    const after = blocks.find((el) => el.textContent.includes("Dòng nội dung sau tiêu đề"));
    return { headingTag: heading?.tagName, afterTag: after?.tagName, html: document.querySelector(".vno-writer-body").innerHTML };
  });
  assert(styleState.headingTag === "H1", "3a. Áp Tiêu đề 1 đúng dòng", JSON.stringify(styleState));
  assert(styleState.afterTag === "P", "3b. Enter sau Heading tự về Normal", JSON.stringify(styleState));
  await focusEvidence("sau Heading và đoạn Normal mới");

  // 4. Chèn bảng bằng nút ribbon rồi nhập nhiều ô bằng Tab/Enter thật.
  await clickTab("Chèn");
  await page.locator('button[data-command-id="writer.table.insert"]').first().click();
  const cells = body.locator("table td");
  await cells.first().click();
  await page.keyboard.press("Home");
  await page.keyboard.down("Shift");
  await page.keyboard.press("End");
  await page.keyboard.up("Shift");
  await page.keyboard.type("STT");
  await page.keyboard.press("Tab");
  await page.keyboard.type("Nội dung");
  await page.keyboard.press("Tab");
  await page.keyboard.type("Đơn vị");
  await page.keyboard.press("Tab");
  await page.keyboard.type("Ghi chú");
  await page.keyboard.press("Tab");
  await page.keyboard.type("1");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Chi tiết trong ô");
  const tableState = await page.evaluate(() => ({
    cells: [...document.querySelectorAll(".vno-writer-body table td")].map((cell) => cell.innerText),
    activeCellIndex: [...document.querySelectorAll(".vno-writer-body table td")].findIndex((cell) => cell.contains(window.getSelection()?.anchorNode)),
    tableCount: document.querySelectorAll(".vno-writer-body table").length
  }));
  assert(tableState.tableCount === 1 && tableState.cells.slice(0, 5).some((text) => text.includes("STT")), "4a. Chèn bảng và nhập qua Tab", JSON.stringify(tableState));
  assert(tableState.activeCellIndex === 4 && tableState.cells[4].includes("Chi tiết trong ô"), "4b. Enter xuống dòng trong ô, không thoát bảng", JSON.stringify(tableState));
  await focusEvidence("sau nhập bảng bằng Tab và Enter");

  // Đưa caret về đoạn sau bảng để tiếp tục phiên.
  await body.locator("p").last().click();
  await page.keyboard.press("End");

  // 5. Track Changes bật/gõ/xóa/tắt/gõ tiếp.
  await page.keyboard.type("Cũ");
  await page.keyboard.press("Control+Shift+E");
  await page.keyboard.press("Backspace");
  await page.keyboard.type("Nội dung đang theo dõi");
  const trackedWhileOn = await page.evaluate(() => ({
    ins: document.querySelectorAll('.vno-writer-body ins[data-vno-change="insert"]').length,
    del: document.querySelectorAll('.vno-writer-body del[data-vno-change="delete"]').length
  }));
  await page.keyboard.press("Control+Shift+E");
  const markerCountBeforePlain = await body.locator("[data-vno-change]").count();
  await page.keyboard.type(" Không theo dõi.");
  const markerCountAfterPlain = await body.locator("[data-vno-change]").count();
  assert(trackedWhileOn.ins > 0, "5a. Track Changes đánh dấu phần chèn", JSON.stringify(trackedWhileOn));
  assert(trackedWhileOn.del > 0, "5b. Track Changes đánh dấu phần xóa", JSON.stringify(trackedWhileOn));
  assert(markerCountAfterPlain === markerCountBeforePlain, "5c. Tắt Track Changes rồi gõ không tạo đánh dấu mới", `${markerCountBeforePlain} -> ${markerCountAfterPlain}`);
  await focusEvidence("sau bật/tắt Track Changes");

  // 6. Chọn đoạn vừa gõ, mở comment bằng shortcut, nhập và lưu bằng bàn phím.
  await page.keyboard.down("Control");
  await page.keyboard.down("Shift");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.up("Shift");
  await page.keyboard.up("Control");
  await page.keyboard.press("Control+Alt+M");
  const commentInput = page.locator(".vno-dialog-input");
  await commentInput.waitFor();
  await commentInput.type("Ý kiến rà soát nghiệp vụ");
  await page.keyboard.press("Enter");
  await page.waitForSelector(".vno-comment-card");
  assert(await body.locator(".vno-comment-anchor").count() === 1, "6a. Tạo anchor Comment từ vùng chọn thật");
  assert((await page.locator(".vno-comment-content").innerText()) === "Ý kiến rà soát nghiệp vụ", "6b. Nội dung Comment gõ và lưu đúng");
  await body.click();
  await focusEvidence("sau lưu Comment và trả về editor");

  // 7. Undo liên tục đến trang trắng; lưu từng trạng thái để phát hiện nhảy cóc/lặp.
  const finalHtml = await body.innerHTML();
  const undoStates = [];
  for (let i = 0; i < 40; i++) {
    const before = await body.innerHTML();
    await page.keyboard.press("Control+Z");
    await sleep(30);
    const after = await body.innerHTML();
    if (after === before) break;
    undoStates.push(after);
    if ((await body.innerText()).trim() === "") break;
  }
  assert((await body.innerText()).trim() === "", "7a. Ctrl+Z liên tục quay về trang trắng", `undoSteps=${undoStates.length}`);
  assert(new Set(undoStates).size === undoStates.length, "7b. Mỗi Undo lùi đúng một trạng thái, không lặp/nhảy vô hiệu", `unique=${new Set(undoStates).size}/${undoStates.length}`);
  await focusEvidence("sau Undo toàn bộ");

  // 8. Redo đúng số bước Undo và so sánh byte-for-byte DOM trạng thái cuối.
  for (let i = 0; i < undoStates.length; i++) {
    await page.keyboard.press("Control+Y");
    await sleep(30);
  }
  const redoneHtml = await body.innerHTML();
  assert(redoneHtml === finalHtml, "8. Ctrl+Y khôi phục y hệt trạng thái trước Undo", `redoSteps=${undoStates.length}`);
  await focusEvidence("sau Redo toàn bộ");

  // 9. Tổng hợp focus và lỗi runtime.
  const focusRows = evidence.filter((row) => row.message?.startsWith("Focus "));
  assert(focusRows.every((row) => JSON.parse(row.detail).inEditor), "9. Focus ở đúng vùng soạn thảo tại mọi mốc", JSON.stringify(focusRows.map((row) => JSON.parse(row.detail))));
  assert(browserErrors.length === 0, "9b. Không có pageerror trong toàn phiên", JSON.stringify(browserErrors));

  console.log(`EVIDENCE_JSON=${JSON.stringify(evidence)}`);
} finally {
  await browser?.close();
  server.kill();
}

if (failures.length) process.exitCode = 1;
