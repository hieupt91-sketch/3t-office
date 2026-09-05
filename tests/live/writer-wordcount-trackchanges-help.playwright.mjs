import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const port = Number(process.env.VNO_WRITER_WORDCOUNT_HELP_PORT || 8842);
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
await new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));

const failures = [];
const check = (condition, label, detail = "") => {
  console.log(`${condition ? "PASS" : "FAIL"}\t${label}${detail ? ` — ${detail}` : ""}`);
  if (!condition) failures.push(label);
};

let browser;
try {
  browser = await chromium.launch({ executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: "vi-VN" });
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto(`http://127.0.0.1:${port}/?app=writer`, { waitUntil: "domcontentloaded" });
  const body = page.locator(".vno-writer-body");
  await body.waitFor({ state: "visible", timeout: 20000 });

  await page.evaluate(() => {
    const editor = document.querySelector(".vno-writer-body");
    editor.innerHTML = `<p>Xin chào các bạn</p><p>Đây là đoạn hai</p>`;
    editor.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await page.waitForTimeout(200);

  const statusText = (await page.locator("#vno-status-wordcount").textContent()) || "";
  check(statusText.includes("8 từ") || statusText.includes("8"), "Thanh trạng thái hiện số từ trực tiếp", statusText.trim());

  await page.locator("#vno-ribbon-tab-review").click();
  await page.locator('[data-command-id="writer.review.wordCount"]').waitFor({ state: "visible", timeout: 5000 });
  check(await page.locator('[data-command-id="writer.review.wordCount"]').isVisible(), "Nút Đếm từ hiện trên tab Đánh giá");
  await page.locator('[data-command-id="writer.review.wordCount"]').click();
  const dialog = page.locator("#vno-wordcount-overlay .vno-wordcount-dialog");
  await dialog.waitFor({ timeout: 5000 });
  const dialogStats = await page.evaluate(() => {
    const read = (name) => document.querySelector(`#vno-wordcount-overlay [data-stat="${name}"]`)?.textContent?.replace(/\./g, "") || "";
    return {
      words: read("words"),
      noSpaces: read("charactersNoSpaces"),
      withSpaces: read("charactersWithSpaces"),
      paragraphs: read("paragraphs")
    };
  });
  check(dialogStats.words.includes("8"), "Dialog Đếm từ hiện 8 từ", JSON.stringify(dialogStats));
  check(dialogStats.paragraphs.includes("2"), "Dialog Đếm từ hiện 2 đoạn văn", JSON.stringify(dialogStats));
  await dialog.locator(".vno-dialog-ok-btn").click();
  await dialog.waitFor({ state: "detached", timeout: 5000 });

  await page.evaluate(() => {
    const editor = document.querySelector(".vno-writer-body");
    editor.innerHTML = `<p>Gốc <ins data-vno-change="insert">mới</ins> rồi <del data-vno-change="delete">cũ</del> và <ins data-vno-change="insert">thêm</ins></p>`;
    editor.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await page.locator("#vno-ribbon-tab-review").click();
  await page.locator('[data-command-id="writer.trackChanges.next"]').waitFor({ state: "visible", timeout: 5000 });
  check(await page.locator('[data-command-id="writer.trackChanges.next"]').isVisible(), "Nút Thay đổi sau hiện trên nhóm Theo dõi thay đổi");
  check(await page.locator('[data-command-id="writer.trackChanges.acceptOne"]').isVisible(), "Nút Chấp nhận một hiện trên ribbon");
  await page.locator('[data-command-id="writer.trackChanges.next"]').click();
  const firstActive = await page.evaluate(() => document.querySelector(".vno-writer-body .is-vno-change-active")?.textContent || "");
  check(firstActive === "mới", "Next chọn thay đổi chèn đầu tiên", firstActive);
  await page.locator('[data-command-id="writer.trackChanges.next"]').click();
  const secondActive = await page.evaluate(() => document.querySelector(".vno-writer-body .is-vno-change-active")?.textContent || "");
  check(secondActive === "cũ", "Next nhảy tới thay đổi xóa kế tiếp", secondActive);
  await page.locator('[data-command-id="writer.trackChanges.previous"]').click();
  const backActive = await page.evaluate(() => document.querySelector(".vno-writer-body .is-vno-change-active")?.textContent || "");
  check(backActive === "mới", "Previous quay lại thay đổi trước", backActive);
  await page.locator('[data-command-id="writer.trackChanges.acceptOne"]').click();
  const afterAccept = await page.evaluate(() => ({
    text: document.querySelector(".vno-writer-body")?.textContent.replace(/\s+/g, " ").trim(),
    inserts: [...document.querySelectorAll('.vno-writer-body ins[data-vno-change="insert"]')].map((el) => el.textContent),
    active: document.querySelector(".vno-writer-body .is-vno-change-active")?.textContent || ""
  }));
  check(afterAccept.text.includes("Gốc mới") && !afterAccept.inserts.includes("mới"), "Accept One giữ chữ chèn đang chọn", JSON.stringify(afterAccept));
  await page.locator('[data-command-id="writer.trackChanges.rejectOne"]').click();
  const afterReject = await page.evaluate(() => ({
    text: document.querySelector(".vno-writer-body")?.textContent.replace(/\s+/g, " ").trim() || "",
    deletions: document.querySelectorAll('.vno-writer-body del[data-vno-change="delete"]').length,
    inserts: [...document.querySelectorAll('.vno-writer-body ins[data-vno-change="insert"]')].map((el) => el.textContent)
  }));
  check(afterReject.deletions === 0 && afterReject.text.includes("cũ") && afterReject.inserts.includes("thêm"), "Reject One khôi phục chữ xóa đang chọn, giữ thay đổi còn lại", JSON.stringify(afterReject));

  await page.locator("#vno-ribbon-tab-help").click();
  await page.locator('[data-command-id="writer.help.open"]').waitFor({ state: "visible", timeout: 5000 });
  check(await page.locator('[data-command-id="writer.help.open"]').isVisible(), "Nút Trợ giúp hiện trên tab Trợ giúp");
  await page.locator('[data-command-id="writer.help.open"]').click();
  const helpPanel = page.locator("#vno-help-panel");
  await helpPanel.waitFor({ state: "visible", timeout: 5000 });
  check(await helpPanel.isVisible(), "Panel Trợ giúp mở được từ ribbon");

  await page.locator("#vno-help-search").fill("đếm từ");
  await page.waitForTimeout(100);
  const wordCountArticle = await page.evaluate(() => document.querySelector("#vno-help-panel .vno-help-article")?.innerText || "");
  check(wordCountArticle.includes("Đếm từ") && wordCountArticle.includes("Đánh giá"), "Tìm 'đếm từ' ra đúng bài và vị trí ribbon", wordCountArticle.slice(0, 180));
  check(wordCountArticle.includes("Chính tả & Ngữ pháp"), "Bài Đếm từ ghi đúng nhóm ribbon", wordCountArticle.slice(0, 220));

  await page.locator("#vno-help-search").fill("trích dẫn");
  await page.waitForTimeout(100);
  await page.locator('#vno-help-panel [data-help-id="writer.reference.citations"]').click();
  const citationArticle = await page.evaluate(() => document.querySelector("#vno-help-panel .vno-help-article")?.innerText || "");
  check(citationArticle.includes("Trích dẫn") && citationArticle.includes("Tham chiếu"), "Tìm 'trích dẫn' ra đúng bài Citations", citationArticle.slice(0, 180));

  await page.locator("#vno-help-search").fill("theo dõi");
  await page.waitForTimeout(100);
  const trackArticle = await page.evaluate(() => document.querySelector("#vno-help-panel .vno-help-article")?.innerText || "");
  check(trackArticle.includes("Theo dõi thay đổi") && trackArticle.includes("Chấp nhận một"), "Bài Track Changes mô tả cả nhóm, gồm duyệt từng cái", trackArticle.slice(0, 220));

  check(pageErrors.length === 0, "Không có lỗi runtime trang", pageErrors.join(" | "));
} catch (error) {
  check(false, "Live Playwright chạy được", error.message);
} finally {
  await browser?.close();
  server.close();
}

if (failures.length) {
  console.error(`FAILED ${failures.length}: ${failures.join("; ")}`);
  process.exit(1);
}
console.log("LIVE PASS writer-wordcount-trackchanges-help");
