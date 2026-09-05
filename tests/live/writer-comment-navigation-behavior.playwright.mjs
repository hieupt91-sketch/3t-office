/** Live Writer Comment Navigation proof: real typing, real selection, real ribbon clicks, real dialogs. Never SendKeys. */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const port = Number(process.env.VNO_WRITER_COMMENT_NAV_PORT || 8819);
const playwrightRoot = process.env.VNO_PLAYWRIGHT_ROOT || "C:/Users/3T Computer/AppData/Local/Temp/vno-playwright-tools";
const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));
const mime = { ".html": "text/html; charset=UTF-8", ".js": "text/javascript; charset=UTF-8", ".css": "text/css; charset=UTF-8" };
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(req.url.split("?")[0]);
  const requestPath = pathname === "/" ? "/index.html" : pathname;
  const file = path.join(root, path.normalize(requestPath).replace(/^[/\\]+/, ""));
  if (!file.startsWith(root) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return res.writeHead(404).end();
  res.writeHead(200, { "Content-Type": mime[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});
await new Promise(resolve => server.listen(port, "127.0.0.1", resolve));

const failures = [];
const check = (condition, label, detail = "") => {
  console.log(`${condition ? "PASS" : "FAIL"}\t${label}${detail ? ` — ${detail}` : ""}`);
  if (!condition) failures.push(label);
};

// Selects a word inside .vno-writer-body via a real DOM Range/Selection (not SendKeys).
async function selectWord(page, word) {
  await page.evaluate((w) => {
    const body = document.querySelector(".vno-writer-body");
    const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const idx = node.textContent.indexOf(w);
      if (idx >= 0) {
        const range = document.createRange();
        range.setStart(node, idx);
        range.setEnd(node, idx + w.length);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        return;
      }
    }
    throw new Error(`word not found: ${w}`);
  }, word);
}

async function addComment(page, word, text) {
  await selectWord(page, word);
  await page.locator("#vno-ribbon-tab-review").click();
  await page.locator('[data-command-id="writer.comment.insert"]').first().click();
  const dialog = page.locator(".vno-dialog-overlay");
  await dialog.waitFor({ state: "visible", timeout: 5000 });
  await dialog.locator(".vno-dialog-input").fill(text);
  await dialog.locator(".vno-dialog-ok-btn").click();
  await dialog.waitFor({ state: "detached", timeout: 5000 });
}

let browser;
try {
  browser = await chromium.launch({ executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const pageErrors = [];
  page.on("pageerror", e => pageErrors.push(e.message));
  await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: "networkidle" });
  await page.locator("#vno-switcher-toggle").click();
  await page.locator('.vno-switcher-item[data-switch="writer"]').click();
  await page.locator('.vno-shell[data-app="writer"]').waitFor();
  await page.locator(".vno-ribbon-tab-file").click();
  await page.locator('[data-backstage-cmd="common.file.new"]').click();

  const body = page.locator(".vno-writer-body");
  await body.click();
  await page.keyboard.type("Alpha đoạn một. Beta đoạn hai. Gamma đoạn ba.");

  await addComment(page, "Alpha", "Nhan xet mot");
  await addComment(page, "Beta", "Nhan xet hai");

  const activeAfterInsert = await page.evaluate(() => document.querySelector(".vno-comment-anchor.is-active")?.textContent);
  check(activeAfterInsert === "Beta", "Sau khi thêm 2 ghi chú, ghi chú vừa thêm (Beta) đang active", activeAfterInsert);

  await page.locator('[data-command-id="writer.review.commentPrevious"]').click();
  await page.waitForTimeout(150);
  let active = await page.evaluate(() => document.querySelector(".vno-comment-anchor.is-active")?.textContent);
  check(active === "Alpha", "Nút Previous (thật, click ribbon) chuyển anchor active sang Alpha", active);

  await page.locator('[data-command-id="writer.review.commentNext"]').click();
  await page.waitForTimeout(150);
  active = await page.evaluate(() => document.querySelector(".vno-comment-anchor.is-active")?.textContent);
  check(active === "Beta", "Nút Next (thật, click ribbon) quay lại Beta", active);

  await page.locator('[data-command-id="writer.review.commentNext"]').click();
  await page.waitForTimeout(150);
  active = await page.evaluate(() => document.querySelector(".vno-comment-anchor.is-active")?.textContent);
  check(active === "Alpha", "Nút Next quay vòng (wrap-around) về Alpha khi hết danh sách", active);

  await page.locator('[data-command-id="writer.review.commentResolve"]').click();
  await page.waitForTimeout(150);
  const anchorCountAfterResolve = await page.evaluate(() => document.querySelectorAll(".vno-comment-anchor").length);
  check(anchorCountAfterResolve === 2, "Resolve KHÔNG xóa anchor ghi chú trong văn bản (vẫn còn 2)", String(anchorCountAfterResolve));
  const resolvedCardExists = await page.evaluate(() => !!document.querySelector('.vno-comment-card.is-resolved'));
  check(resolvedCardExists === true, "Resolve đánh dấu is-resolved thật trên panel ghi chú", String(resolvedCardExists));

  const beforeDeleteCount = anchorCountAfterResolve;
  await page.locator('[data-command-id="writer.review.commentDelete"]').click();
  await page.waitForTimeout(150);
  const afterDeleteCount = await page.evaluate(() => document.querySelectorAll(".vno-comment-anchor").length);
  check(afterDeleteCount === beforeDeleteCount - 1, "Nút Delete (thật, click ribbon) xóa thật 1 anchor khỏi văn bản", `${beforeDeleteCount} -> ${afterDeleteCount}`);
  const bodyTextAfterDelete = await page.evaluate(() => document.querySelector(".vno-writer-body").textContent);
  check(bodyTextAfterDelete.includes("Alpha") && bodyTextAfterDelete.includes("đoạn một"), "Xóa ghi chú không xóa mất nội dung văn bản gốc (chỉ bỏ anchor)", bodyTextAfterDelete);

  await page.keyboard.press("Control+z");
  await page.waitForTimeout(200);
  const afterUndoCount = await page.evaluate(() => document.querySelectorAll(".vno-comment-anchor").length);
  check(afterUndoCount === beforeDeleteCount, "Ctrl+Z hoàn tác Delete qua ribbon (khôi phục lại anchor)", String(afterUndoCount));

  check(pageErrors.length === 0, "Không có lỗi JavaScript nào trong suốt kịch bản", pageErrors.join(" | "));
} finally {
  await browser?.close();
  server.close();
}

if (failures.length) {
  console.error(`\n${failures.length} FAILURES:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log("\nAll real ribbon-click Writer Comment Navigation checks passed.");
