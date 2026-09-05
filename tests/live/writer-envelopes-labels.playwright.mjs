import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const port = Number(process.env.VNO_WRITER_ENVELOPES_PORT || 8861);
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
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${port}/?app=writer`, { waitUntil: "domcontentloaded" });
  await page.locator(".vno-writer-body").waitFor({ state: "visible", timeout: 20000 });

  await page.locator("#vno-ribbon-tab-mailings").click();
  const envelopeBtn = page.locator('[data-command-id="writer.mailings.envelopes"]');
  await envelopeBtn.waitFor({ state: "visible", timeout: 5000 });
  check(await envelopeBtn.isVisible(), "Nút Phong bì hiện trên tab Trộn thư nhóm Tạo");
  check(await page.locator('[data-command-id="writer.mailings.labels"]').isVisible(), "Nút Nhãn hiện trên tab Trộn thư nhóm Tạo");

  await envelopeBtn.click();
  const envDialog = page.locator(".vno-envelope-dialog");
  await envDialog.waitFor({ timeout: 5000 });
  await page.locator("#vno-envelope-delivery").fill("Nguyễn Văn An\nSố 18, ngõ 12 Phố Huế\nHoàn Kiếm, Hà Nội");
  await page.locator("#vno-envelope-return").fill("Sở Thông tin và Truyền thông\n25 Láng Hạ\nĐống Đa, Hà Nội");
  await envDialog.locator('input[name="vno-envelope-size"][value="dl"]').click();
  await envDialog.locator('input[name="vno-envelope-position"][value="end"]').click();
  await envDialog.locator('[data-action="add"]').click();
  await envDialog.waitFor({ state: "detached", timeout: 5000 });

  const envelopeState = await page.evaluate(() => {
    const pageEl = document.querySelector(".vno-writer-page");
    const env = document.querySelector(".vno-writer-body .vno-envelope-page");
    const delivery = document.querySelector('[data-vno-envelope-role="delivery"]');
    const ret = document.querySelector('[data-vno-envelope-role="return"]');
    return {
      size: env?.getAttribute("data-vno-envelope-size") || "",
      width: env?.style.width || "",
      height: env?.style.height || "",
      canvasWidth: pageEl?.style.width || "",
      delivery: delivery?.textContent || "",
      deliveryTop: delivery?.style.top || "",
      deliveryLeft: delivery?.style.left || "",
      ret: ret?.textContent || "",
      retTop: ret?.style.top || "",
      retLeft: ret?.style.left || ""
    };
  });
  check(envelopeState.size === "dl", "Trang phong bì khổ DL", JSON.stringify(envelopeState));
  check(envelopeState.width === "220mm" && envelopeState.height === "110mm", "Kích thước phong bì 220×110 mm", `${envelopeState.width}×${envelopeState.height}`);
  check(envelopeState.delivery.includes("Nguyễn Văn An") && envelopeState.deliveryTop === "52%" && envelopeState.deliveryLeft === "42%", "Người nhận giữa-dưới", JSON.stringify(envelopeState));
  check(envelopeState.ret.includes("Sở Thông tin") && envelopeState.retTop === "10mm" && envelopeState.retLeft === "12mm", "Người gửi trên-trái", JSON.stringify(envelopeState));
  const canvasPx = parseFloat(envelopeState.canvasWidth);
  check(Math.abs(canvasPx - 831.5) < 2, "Canvas đổi width theo khổ phong bì", envelopeState.canvasWidth);

  await page.locator('[data-command-id="writer.mailMerge.open"]').click();
  const dsDialog = page.locator(".vno-dialog-box");
  await dsDialog.waitFor({ timeout: 5000 });
  await page.locator(".vno-merge-sample-btn").click();
  await dsDialog.locator(".vno-dialog-save-btn").click();
  await page.waitForTimeout(200);

  await page.locator('[data-command-id="writer.mailings.labels"]').click();
  const labelDialog = page.locator(".vno-labels-dialog");
  await labelDialog.waitFor({ timeout: 5000 });
  const mergeBox = page.locator("#vno-labels-use-merge");
  check(await mergeBox.count() === 1, "Hộp thoại Nhãn hiện tuỳ chọn nguồn Trộn thư khi đã có CSV");
  await mergeBox.click();
  await page.locator("#vno-labels-layout").selectOption("avery-l7160");
  await labelDialog.locator('[data-action="create"]').click();
  await labelDialog.waitFor({ state: "detached", timeout: 5000 });

  const labelState = await page.evaluate(() => {
    const sheet = document.querySelector(".vno-writer-body .vno-label-sheet");
    const cells = [...document.querySelectorAll(".vno-writer-body .vno-label-cell")].map((cell) => ({
      index: cell.getAttribute("data-vno-label-index"),
      text: (cell.textContent || "").trim(),
      w: cell.style.width,
      h: cell.style.height
    }));
    return {
      layout: sheet?.getAttribute("data-vno-label-layout") || "",
      count: cells.length,
      first: cells[0] || null,
      second: cells[1] || null,
      third: cells[2] || null
    };
  });
  check(labelState.layout === "avery-l7160" && labelState.count === 21, "Tờ Avery L7160 có 21 ô", JSON.stringify({ layout: labelState.layout, count: labelState.count }));
  check(labelState.first?.w === "63.5mm" && labelState.first?.h === "38.1mm", "Ô nhãn 63.5×38.1 mm", JSON.stringify(labelState.first));
  check(labelState.first?.text.includes("Nguyễn Văn A") && !labelState.first?.text.includes("Trần Thị B"), "Ô 0 đúng bản ghi 1", labelState.first?.text);
  check(labelState.second?.text.includes("Trần Thị B") && !labelState.second?.text.includes("Nguyễn Văn A"), "Ô 1 đúng bản ghi 2, khác ô 0", labelState.second?.text);
  check(Boolean(labelState.third?.text.includes("Lê Văn C")), "Ô 2 đúng bản ghi 3 từ CSV mẫu", labelState.third?.text);
  check(labelState.first?.text !== labelState.second?.text && labelState.second?.text !== labelState.third?.text, "Các ô Mail Merge không bị copy giống nhau");
  check(errors.length === 0, "Không có pageerror", errors.join(" | "));
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
if (failures.length) {
  console.error(`FAILURES: ${failures.join(", ")}`);
  process.exit(1);
}
