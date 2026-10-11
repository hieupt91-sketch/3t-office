import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const port = Number(process.env.VNO_WRITER_EDITING_PORT || 8795);
const playwrightRoot = process.env.VNO_PLAYWRIGHT_ROOT || "C:/Users/3T Computer/AppData/Local/Temp/vno-playwright-tools";
const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));

const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(req.url.split("?")[0]);
  const requestPath = pathname === "/" ? "/index.html" : pathname;
  const file = path.join(root, path.normalize(requestPath).replace(/^[/\\]+/, ""));
  if (!file.startsWith(root) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return res.writeHead(404).end();
  const ext = path.extname(file);
  const contentType = ext === ".css" ? "text/css" : ext === ".js" || ext === ".mjs" ? "text/javascript" : "text/html";
  res.writeHead(200, { "Content-Type": `${contentType}; charset=UTF-8` });
  fs.createReadStream(file).pipe(res);
});
await new Promise(resolve => server.listen(port, "127.0.0.1", resolve));

const failures = [];
const assert = (condition, label, detail = "") => {
  console.log(`${condition ? "PASS" : "FAIL"}\t${label}${detail ? ` — ${detail}` : ""}`);
  if (!condition) failures.push(`${label}: ${detail}`);
};

let browser;
try {
  browser = await chromium.launch({
    executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1366, height: 850 }, locale: "vi-VN" });
  const pageErrors = [];
  page.on("pageerror", error => pageErrors.push(error.message));

  await page.goto(`http://127.0.0.1:${port}/?app=writer`, { waitUntil: "networkidle" });
  await page.locator('.vno-shell[data-app="writer"] .vno-ribbon-content').waitFor();

  const editingGroup = page.locator('.vno-ribbon-group[data-group-id="editing"]');
  const findButton = editingGroup.locator('[data-command-id="common.edit.find"]');
  const replaceButton = editingGroup.locator('[data-command-id="common.edit.replace"]');
  const selectButton = editingGroup.locator('[data-dropdown-id="writer.edit.select"]');

  assert(await editingGroup.isVisible(), "Nhóm Chỉnh sửa hiển thị trên Writer Home");
  assert((await editingGroup.locator(".vno-ribbon-group-label").textContent())?.trim() === "Chỉnh sửa", "Nhãn nhóm đúng");
  assert(await findButton.isVisible(), "Nút Tìm kiếm hiển thị");
  assert(await replaceButton.isVisible(), "Nút Thay thế hiển thị");
  assert(await selectButton.isVisible(), "Nút Chọn hiển thị");

  const isLastGroup = await editingGroup.evaluate(group => group === group.parentElement?.lastElementChild);
  assert(isLastGroup, "Nhóm Chỉnh sửa nằm cuối tab Home");

  const directResults = await page.evaluate(async () => {
    const { globalCommandBus } = await import("/platform/commands/command-bus.js");
    const results = {};
    results.find = await globalCommandBus.execute("common.edit.find");
    results.findDialog = Boolean(document.querySelector("#vno-fr-find-input"));
    document.querySelector(".vno-fr-close")?.click();
    results.replace = await globalCommandBus.execute("common.edit.replace");
    results.replaceDialog = getComputedStyle(document.querySelector("#vno-fr-replace-group")).display !== "none";
    document.querySelector(".vno-fr-close")?.click();
    results.selectAll = await globalCommandBus.execute("common.edit.selectAll");
    results.history = globalCommandBus.getHistory().slice(-3).map(entry => entry.commandId);
    return results;
  });
  assert(directResults.find === true && directResults.findDialog, "Command Find cũ vẫn chạy qua globalCommandBus.execute", JSON.stringify(directResults));
  assert(directResults.replace === true && directResults.replaceDialog, "Command Replace cũ vẫn chạy qua globalCommandBus.execute", JSON.stringify(directResults));
  assert(directResults.selectAll === true, "Command Select All cũ vẫn chạy qua globalCommandBus.execute", JSON.stringify(directResults));
  assert(JSON.stringify(directResults.history) === JSON.stringify(["common.edit.find", "common.edit.replace", "common.edit.selectAll"]), "Ba command giữ nguyên ID và thứ tự", JSON.stringify(directResults.history));

  const clickAndLastCommand = async locator => {
    await locator.click();
    await page.waitForTimeout(50);
    return page.evaluate(async () => {
      const { globalCommandBus } = await import("/platform/commands/command-bus.js");
      return globalCommandBus.getHistory().at(-1)?.commandId;
    });
  };

  assert(await clickAndLastCommand(findButton) === "common.edit.find", "Click Find gọi đúng command");
  await page.locator(".vno-fr-close").click();
  assert(await clickAndLastCommand(replaceButton) === "common.edit.replace", "Click Replace gọi đúng command");
  await page.locator(".vno-fr-close").click();

  await selectButton.click();
  const selectAllItem = page.locator('.vno-ribbon-dropdown-item[data-command-id="common.edit.selectAll"]');
  assert(await selectAllItem.isVisible(), "Dropdown Chọn chứa Chọn tất cả");
  assert(await page.locator(".vno-ribbon-dropdown-item").count() === 1, "Không dựng command Chọn đối tượng chưa tồn tại");
  assert(await clickAndLastCommand(selectAllItem) === "common.edit.selectAll", "Click Chọn tất cả gọi đúng command");

  for (const width of [1366, 1600]) {
    await page.setViewportSize({ width, height: 850 });
    await page.waitForTimeout(100);
    const metrics = await page.locator(".vno-ribbon-content").evaluate(element => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth
    }));
    assert(metrics.scrollWidth <= metrics.clientWidth, `Writer Home không tràn ngang mới ở ${width}px`, JSON.stringify(metrics));
  }

  assert(pageErrors.length === 0, "Không có pageerror", pageErrors.join(" | "));
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}

if (failures.length) {
  console.error(`Writer Editing Group: ${failures.length} lỗi`);
  process.exitCode = 1;
} else {
  console.log("Writer Editing Group live Playwright: 100% PASS");
}
