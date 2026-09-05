/**
 * Live Writer Tables import: real .docx (FODT → soffice, never VN serialize)
 * opened through adapter.open() / File → Mở. Playwright cannot drive the native
 * file dialog (SendKeys forbidden). Same soffice HTML convert as main.py.
 *
 * StarWriter already emits <table> with rowspan/colspan and inline
 * border/background. This checks the canvas computed styles after adapter.open().
 */
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { convertWithSoffice } from "../helpers/soffice-convert.mjs";
import { readZipEntry } from "../helpers/zip-package.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const fixture = path.join(root, "tests", "fixtures", "real-office-samples", "sample-writer-tables.docx");
const port = Number(process.env.VNO_WRITER_TABLES_IMPORT_PORT || 8804);
const playwrightRoot = process.env.VNO_PLAYWRIGHT_ROOT || "C:/Users/3T Computer/AppData/Local/Temp/vno-playwright-tools";
const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "vno-writer-tables-import-live-"));
const profileDir = path.join(tmp, "lo-profile");
const htmlPath = convertWithSoffice(fixture, "html", path.join(tmp, "writer"), { profileDir });
const writerHtml = fs.readFileSync(htmlPath, "utf8");
const documentXml = readZipEntry(fixture, "word/document.xml").toString("utf8");

if (!/<table\b/i.test(writerHtml) || !/rowspan="2"/i.test(writerHtml) || !/colspan="2"/i.test(writerHtml)) {
  throw new Error("StarWriter HTML lost table merge — probe assumption changed");
}
if (!writerHtml.includes("#fef3c7") || !writerHtml.includes("#1d4ed8") || !writerHtml.includes("#6d28d9")) {
  throw new Error("StarWriter HTML lost shading/border colors — probe assumption changed");
}
if (!documentXml.includes("<w:gridSpan") || !documentXml.includes("<w:vMerge") || !documentXml.includes("w:fill=\"FEF3C7\"")) {
  throw new Error("Fixture DOCX lost native table merge/shading");
}

const mime = { ".html": "text/html; charset=UTF-8", ".js": "text/javascript; charset=UTF-8", ".css": "text/css; charset=UTF-8" };
const server = http.createServer((req, res) => {
  const requestPath = req.url === "/" ? "/index.html" : decodeURIComponent(req.url.split("?")[0]);
  const file = path.join(root, path.normalize(requestPath).replace(/^[/\\]+/, ""));
  if (!file.startsWith(root) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, { "Content-Type": mime[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});
await new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));

let browser;
const failures = [];
const assert = (condition, label, detail = "") => {
  console.log(`${condition ? "PASS" : "FAIL"}\t${label}${detail ? ` — ${detail}` : ""}`);
  if (!condition) failures.push(`${label}: ${detail}`);
};

function rgbClose(actual, expected, label) {
  const parse = (value) => {
    const match = String(value || "").match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
  };
  const a = parse(actual);
  const b = parse(expected);
  if (!a || !b) return false;
  const ok = a.every((channel, index) => Math.abs(channel - b[index]) <= 2);
  assert(ok, label, `got ${actual}, expected ${expected}`);
  return ok;
}

try {
  browser = await chromium.launch({
    executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, locale: "vi-VN" });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "networkidle" });
  await page.locator(".vno-writer-body").waitFor();

  await page.evaluate(async ({ content, fileName }) => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    globalUnoBridge.openRealFile = async () => ({
      status: "ok",
      content,
      fileName
    });
  }, { content: writerHtml, fileName: "sample-writer-tables.docx" });

  await page.locator(".vno-ribbon-tab-file").click();
  await page.locator('[data-backstage-cmd="common.file.open"]').click();
  await page.waitForTimeout(400);

  const snapshot = await page.evaluate(() => {
    const body = document.querySelector(".vno-writer-body");
    const table = body?.querySelector("table");
    const cells = [...(body?.querySelectorAll("th, td") || [])];
    const byText = (needle) => cells.find((cell) => (cell.innerText || "").replace(/\s+/g, " ").includes(needle));
    const styleOf = (el) => {
      if (!el) return null;
      const cs = getComputedStyle(el);
      return {
        tag: el.tagName,
        rowSpan: el.rowSpan,
        colSpan: el.colSpan,
        text: (el.innerText || "").replace(/\s+/g, " ").trim(),
        backgroundColor: cs.backgroundColor,
        borderTopColor: cs.borderTopColor,
        borderRightColor: cs.borderRightColor,
        borderBottomColor: cs.borderBottomColor,
        borderLeftColor: cs.borderLeftColor,
        borderTopWidth: cs.borderTopWidth,
        borderLeftWidth: cs.borderLeftWidth,
        borderRightWidth: cs.borderRightWidth,
        borderBottomWidth: cs.borderBottomWidth,
        inlineStyle: el.getAttribute("style") || ""
      };
    };
    const heading = body?.querySelector("h1");
    return {
      tableCount: body?.querySelectorAll("table").length || 0,
      cellCount: cells.length,
      heading: (heading?.innerText || "").replace(/\s+/g, " ").trim(),
      bodyText: (body?.innerText || "").replace(/\s+/g, " ").trim(),
      dumpedHtmlDoc: /<!DOCTYPE|<html\b/i.test(body?.innerHTML || ""),
      rowSpanCell: styleOf(byText("Nhóm dự án thủy lợi")),
      colSpanCell: styleOf(byText("Phân bổ ngân sách năm 2026")),
      planHeader: styleOf(byText("Kế hoạch")),
      actualHeader: styleOf(byText("Thực hiện")),
      greenCell: styleOf(byText("1.250.000.000")),
      perEdgeCell: styleOf(byText("980.000.000")),
      pinkCell: styleOf(byText("850.000.000 TH")),
      defaultCssBorder: "rgb(148, 163, 184)"
    };
  });

  assert(snapshot.tableCount === 1, "Writer: đúng 1 bảng", String(snapshot.tableCount));
  assert(snapshot.cellCount >= 8, "Writer: đủ ô sau merge (không nhân covered cell)", String(snapshot.cellCount));
  assert(
    snapshot.heading.toLocaleLowerCase("vi-VN").includes("bảng phân bổ vốn đầu tư công 2026"),
    "Writer: heading còn (style gallery có thể in hoa)",
    snapshot.heading
  );
  assert(!snapshot.dumpedHtmlDoc, "Writer: không dump cả HTML document vào body");
  assert(snapshot.rowSpanCell?.rowSpan === 2, "Writer: rowspan=2 ô nhóm dự án", JSON.stringify(snapshot.rowSpanCell));
  assert(snapshot.colSpanCell?.colSpan === 2, "Writer: colspan=2 ô tiêu đề năm", JSON.stringify(snapshot.colSpanCell));

  rgbClose(snapshot.rowSpanCell?.backgroundColor, "rgb(254, 243, 199)", "Canvas: rowspan amber #fef3c7");
  rgbClose(snapshot.colSpanCell?.backgroundColor, "rgb(219, 234, 254)", "Canvas: colspan blue #dbeafe");
  rgbClose(snapshot.greenCell?.backgroundColor, "rgb(220, 252, 231)", "Canvas: kế hoạch DA-001 xanh #dcfce7");
  rgbClose(snapshot.pinkCell?.backgroundColor, "rgb(254, 202, 202)", "Canvas: thực hiện DA-002 hồng #fecaca");

  rgbClose(snapshot.rowSpanCell?.borderLeftColor, "rgb(180, 83, 9)", "Canvas: rowspan viền trái #b45309");
  rgbClose(snapshot.colSpanCell?.borderTopColor, "rgb(29, 78, 216)", "Canvas: colspan viền trên #1d4ed8");
  rgbClose(snapshot.planHeader?.borderLeftColor, "rgb(21, 128, 61)", "Canvas: Kế hoạch viền trái #15803d");
  rgbClose(snapshot.actualHeader?.borderRightColor, "rgb(185, 28, 28)", "Canvas: Thực hiện viền phải #b91c1c");

  rgbClose(snapshot.perEdgeCell?.borderTopColor, "rgb(29, 78, 216)", "Canvas: 980.000.000 viền trên xanh dương");
  rgbClose(snapshot.perEdgeCell?.borderLeftColor, "rgb(21, 128, 61)", "Canvas: 980.000.000 viền trái xanh lá");
  rgbClose(snapshot.perEdgeCell?.borderRightColor, "rgb(185, 28, 28)", "Canvas: 980.000.000 viền phải đỏ");
  rgbClose(snapshot.perEdgeCell?.borderBottomColor, "rgb(109, 40, 217)", "Canvas: 980.000.000 viền dưới tím");

  const slate = snapshot.defaultCssBorder;
  assert(
    snapshot.perEdgeCell?.borderTopColor !== slate
      && snapshot.perEdgeCell?.borderRightColor !== slate
      && snapshot.rowSpanCell?.borderLeftColor !== slate,
    "Canvas: không bị writer.css #94a3b8 đè hết viền màu",
    JSON.stringify({
      perEdge: snapshot.perEdgeCell,
      rowSpan: snapshot.rowSpanCell
    })
  );
  assert(errors.length === 0, "Không có pageerror", errors.join(" | "));
} finally {
  await browser?.close();
  server.close();
  fs.rmSync(tmp, { recursive: true, force: true });
}

if (failures.length) {
  console.error(`FAILED ${failures.length}:\n${failures.join("\n")}`);
  process.exit(1);
}
console.log("All Writer Tables import live checks passed.");
