import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const port = Number(process.env.VNO_WRITER_ARRANGE_PORT || 8812);
const playwrightRoot = process.env.VNO_PLAYWRIGHT_ROOT || "C:/Users/3T Computer/AppData/Local/Temp/vno-playwright-tools";
const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));
const mime = { ".html": "text/html; charset=UTF-8", ".js": "text/javascript; charset=UTF-8", ".css": "text/css; charset=UTF-8", ".png": "image/png" };
const pixel = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");

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

let browser;
try {
  browser = await chromium.launch({ executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: "vi-VN" });
  const pageErrors = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  await page.goto(`http://127.0.0.1:${port}/?app=writer`, { waitUntil: "networkidle" });

  const body = page.locator(".vno-writer-body");
  const pictureTab = page.locator("#vno-ribbon-tab-pictureFormat");
  check(await pictureTab.isHidden(), "Tab hình ảnh ẩn khi chưa chọn ảnh");

  const insertImage = async name => {
    await body.click();
    await page.locator("#vno-ribbon-tab-insert").click();
    const chooserPromise = page.waitForEvent("filechooser");
    await page.locator('[data-command-id="writer.image.insert"]').click();
    const chooser = await chooserPromise;
    await chooser.setFiles({ name, mimeType: "image/png", buffer: pixel });
    await body.locator("img").last().waitFor();
  };

  await insertImage("logo.png");
  await body.locator("img").first().evaluate(img => { img.id = "arrange-image-a"; });
  await body.locator("img").first().click();
  check(await pictureTab.isVisible(), "Chọn ảnh hiện tab Định dạng Hình ảnh");
  check(await page.locator(".vno-writer-arrange-group").isVisible(), "Nhóm Sắp xếp hiện theo ngữ cảnh");

  await page.locator('select[data-arrange="wrap"]').selectOption("square");
  let state = await body.locator("img").first().evaluate(img => ({ float: img.style.float, wrap: img.dataset.vnoWrap }));
  check(state.float === "left" && state.wrap === "square", "Square áp dụng CSS float:left thật", JSON.stringify(state));

  await page.locator('select[data-arrange="position"]').selectOption("bottomRight");
  state = await body.locator("img").first().evaluate(img => ({ left: img.style.left, top: img.style.top, transform: img.style.transform }));
  check(state.left === "100%" && state.top === "100%" && state.transform.includes("-100%"), "Position dưới-phải dùng tọa độ trang", JSON.stringify(state));

  await page.locator('select[data-arrange="align"]').selectOption("center");
  state = await body.locator("img").first().evaluate(img => ({ left: img.style.left, top: img.style.top }));
  check(state.left === "50%" && state.top === "100%", "Align giữa ngang giữ tọa độ dọc", JSON.stringify(state));

  await insertImage("stamp.png");
  const images = body.locator("img");
  await body.locator("img:not(#arrange-image-a)").evaluate(img => { img.id = "arrange-image-b"; });
  const earlierId = await body.evaluate(root => {
    const directIndex = img => { let node = img; while (node.parentElement !== root) node = node.parentElement; return [...root.children].indexOf(node); };
    const a = root.querySelector("#arrange-image-a");
    const b = root.querySelector("#arrange-image-b");
    return directIndex(a) < directIndex(b) ? a.id : b.id;
  });
  await body.locator(`#${earlierId}`).click();
  const selected = body.locator("img.is-vno-image-selected");
  const before = await selected.evaluate(img => { let node = img; const body = img.closest(".vno-writer-body"); while (node.parentElement !== body) node = node.parentElement; const other = [...body.querySelectorAll("img")].find(candidate => candidate !== img); let otherNode = other; while (otherNode.parentElement !== body) otherNode = otherNode.parentElement; return { z: img.style.zIndex, index: [...body.children].indexOf(node), otherIndex: [...body.children].indexOf(otherNode) }; });
  await page.locator('button[data-arrange="forward"]').click();
  const afterForward = await selected.evaluate(img => { let node = img; const body = img.closest(".vno-writer-body"); while (node.parentElement !== body) node = node.parentElement; const other = [...body.querySelectorAll("img")].find(candidate => candidate !== img); let otherNode = other; while (otherNode.parentElement !== body) otherNode = otherNode.parentElement; return { z: img.style.zIndex, index: [...body.children].indexOf(node), otherIndex: [...body.children].indexOf(otherNode) }; });
  check(Number(afterForward.z) === 1 && afterForward.index > afterForward.otherIndex, "Bring Forward đổi z-index và thứ tự DOM", JSON.stringify({ before, afterForward }));
  await page.locator('button[data-arrange="backward"]').click();
  const afterBackward = await selected.evaluate(img => { let node = img; const body = img.closest(".vno-writer-body"); while (node.parentElement !== body) node = node.parentElement; const other = [...body.querySelectorAll("img")].find(candidate => candidate !== img); let otherNode = other; while (otherNode.parentElement !== body) otherNode = otherNode.parentElement; return { z: img.style.zIndex, index: [...body.children].indexOf(node), otherIndex: [...body.children].indexOf(otherNode) }; });
  check(Number(afterBackward.z) === 0 && afterBackward.index < afterBackward.otherIndex, "Send Backward phục hồi z-index và thứ tự DOM", JSON.stringify(afterBackward));

  await body.locator("p").last().click();
  check(await pictureTab.isHidden(), "Bỏ chọn ảnh ẩn tab ngữ cảnh");
  check(pageErrors.length === 0, "Canvas không phát sinh pageerror", pageErrors.join(" | "));
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}

if (failures.length) {
  console.error(`Writer Arrange live: ${failures.length} lỗi`);
  process.exitCode = 1;
} else {
  console.log("Writer Arrange live Playwright: 100% PASS");
}
