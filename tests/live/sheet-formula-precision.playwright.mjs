/** Live proof for a real, severe bug fixed this session: formula results were
 * silently rounded to 2 decimals at the CALCULATION layer and auto-formatted
 * as VNĐ currency text, corrupting any chained formula that referenced them
 * (=1/3 stored as 0.33, then =A1*3 came out as 0.99 or worse). Real Excel
 * keeps full double precision internally and only cleans up floating-point
 * display noise cosmetically. Never SendKeys - real browser + real command bus. */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const port = Number(process.env.VNO_FORMULA_PRECISION_PORT || 8932);
const playwrightRoot = process.env.VNO_PLAYWRIGHT_ROOT || "C:/Users/3T Computer/AppData/Local/Temp/vno-playwright-tools";
const edgePath = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";

const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));
const mime = { ".html": "text/html; charset=UTF-8", ".js": "text/javascript; charset=UTF-8", ".css": "text/css; charset=UTF-8", ".json": "application/json; charset=UTF-8" };
const server = http.createServer((req, res) => {
  const requestPath = req.url.split("?")[0] === "/" ? "/index.html" : decodeURIComponent(req.url.split("?")[0]);
  const file = path.join(root, path.normalize(requestPath).replace(/^[/\\]+/, ""));
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404).end(); return; }
  res.writeHead(200, { "Content-Type": mime[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});

function assert(condition, message) { if (!condition) throw new Error(message); }

await new Promise(resolve => server.listen(port, "127.0.0.1", resolve));
let browser;
try {
  browser = await chromium.launch({ executablePath: edgePath, headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const pageErrors = [];
  page.on("pageerror", error => pageErrors.push(error.message));

  await page.goto(`http://127.0.0.1:${port}/?app=sheet`, { waitUntil: "networkidle" });
  await page.waitForSelector(".vno-grid-cell", { timeout: 15000 });

  const result = await page.evaluate(async () => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    const grid = globalUnoBridge.activeDocument.grid;
    grid.setCellValue("A", 1, "=1/3");
    grid.setCellValue("A", 2, "=A1*3");
    grid.setCellValue("A", 3, "=0.1+0.2");
    grid.setCellValue("A", 4, "=123.456789");
    return {
      a1: grid.cellsData.get("A1").val,
      a2: grid.cellsData.get("A2").val,
      a3: grid.cellsData.get("A3").val,
      a4: grid.cellsData.get("A4").val
    };
  });

  assert(typeof result.a1 === "number" && Math.abs(result.a1 - 1 / 3) < 1e-12,
    `A1 =1/3 phải lưu số thô đầy đủ độ chính xác, không bị làm tròn/format tiền tệ: ${JSON.stringify(result.a1)}`);
  assert(result.a2 === 1,
    `A2 =A1*3 phải ra đúng 1 (chuỗi tham chiếu không được khuếch đại sai số): ${JSON.stringify(result.a2)}`);
  assert(typeof result.a4 === "number" && result.a4 === 123.456789,
    `A4 =123.456789 phải giữ nguyên, không bị cắt về 2 chữ số thập phân: ${JSON.stringify(result.a4)}`);

  const texts = {};
  for (const coord of ["A1", "A2", "A3", "A4"]) {
    texts[coord] = await page.locator(`.vno-grid-cell[data-coord="${coord}"]`).textContent();
  }
  assert(texts.A1 === "0.333333333333", `A1 hiển thị phải sạch, giống Excel General format: "${texts.A1}"`);
  assert(texts.A2 === "1", `A2 hiển thị phải là "1" sau khi khử sai số dây chuyền: "${texts.A2}"`);
  assert(texts.A3 === "0.3", `A3 =0.1+0.2 phải hiện "0.3" sạch, không lộ sai số dấu phẩy động nhị phân: "${texts.A3}"`);
  assert(texts.A4 === "123.456789", `A4 hiển thị phải giữ nguyên độ chính xác: "${texts.A4}"`);

  assert(pageErrors.length === 0, `Browser errors: ${pageErrors.join(" | ")}`);
  console.log("PASS: formula results keep full precision when chained, and General display matches real Excel (no floating-point noise, no destructive 2-decimal rounding, no currency auto-formatting)");
} finally {
  if (browser) await browser.close();
  server.close();
}
