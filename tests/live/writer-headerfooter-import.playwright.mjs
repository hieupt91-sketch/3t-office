/**
 * Live Writer Header/Footer import: real .docx (FODT → soffice, never VN serialize)
 * opened through adapter.open() / File → Mở. Playwright cannot drive the native
 * file dialog (SendKeys forbidden). Same soffice HTML convert as main.py.
 *
 * StarWriter already emits <div title="header|footer">; the adapter splits those
 * into .vno-writer-header / .vno-writer-footer and unwraps <sdfield> PAGE.
 */
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { convertWithSoffice } from "../helpers/soffice-convert.mjs";
import { readZipEntry } from "../helpers/zip-package.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const fixture = path.join(root, "tests", "fixtures", "real-office-samples", "sample-writer-headerfooter.docx");
const port = Number(process.env.VNO_WRITER_HF_IMPORT_PORT || 8798);
const playwrightRoot = process.env.VNO_PLAYWRIGHT_ROOT || "C:/Users/3T Computer/AppData/Local/Temp/vno-playwright-tools";
const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "vno-writer-hf-import-live-"));
const profileDir = path.join(tmp, "lo-profile");
const htmlPath = convertWithSoffice(fixture, "html", path.join(tmp, "writer"), { profileDir });
const writerHtml = fs.readFileSync(htmlPath, "utf8");
const headerXml = readZipEntry(fixture, "word/header1.xml").toString("utf8");
const footerXml = readZipEntry(fixture, "word/footer1.xml").toString("utf8");

if (!/title=["']header["']/i.test(writerHtml) || !/title=["']footer["']/i.test(writerHtml)) {
  throw new Error("StarWriter HTML lost title=header/footer — probe assumption changed");
}
if (!writerHtml.includes("Công ty TNHH Sao Việt") || !writerHtml.includes("05/09/2026")) {
  throw new Error("StarWriter HTML lost header/footer text");
}
if (!headerXml.includes("Công ty TNHH Sao Việt") || !footerXml.includes("NUMPAGES")) {
  throw new Error("Fixture DOCX lost native header1.xml / footer1.xml");
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
  }, { content: writerHtml, fileName: "sample-writer-headerfooter.docx" });

  await page.locator(".vno-ribbon-tab-file").click();
  await page.locator('[data-backstage-cmd="common.file.open"]').click();
  await page.waitForTimeout(400);

  const snapshot = await page.evaluate(() => {
    const header = document.querySelector(".vno-writer-header");
    const body = document.querySelector(".vno-writer-body");
    const footer = document.querySelector(".vno-writer-footer");
    const heading = body?.querySelector("h1");
    return {
      headerText: (header?.innerText || "").replace(/\s+/g, " ").trim(),
      footerText: (footer?.innerText || "").replace(/\s+/g, " ").trim(),
      bodyText: (body?.innerText || "").replace(/\s+/g, " ").trim(),
      heading: (heading?.innerText || "").replace(/\s+/g, " ").trim(),
      headerHasSdfield: Boolean(header?.querySelector("sdfield")),
      footerHasSdfield: Boolean(footer?.querySelector("sdfield")),
      bodyHasCompany: (body?.innerText || "").includes("Công ty TNHH Sao Việt"),
      pageErrors: []
    };
  });
  snapshot.pageErrors = errors;

  assert(
    snapshot.headerText.includes("Công ty TNHH Sao Việt") && snapshot.headerText.includes("Phòng Kế hoạch"),
    "Writer: header vùng đầu trang hiện tên công ty",
    snapshot.headerText
  );
  assert(
    snapshot.footerText.includes("05/09/2026") && /Trang\s+1\s*\/\s*1/.test(snapshot.footerText),
    "Writer: footer hiện Trang 1 / 1 và ngày",
    snapshot.footerText
  );
  assert(
    snapshot.footerHasSdfield === false && snapshot.headerHasSdfield === false,
    "Writer: đã gỡ sdfield PAGE khỏi DOM",
    JSON.stringify({ header: snapshot.headerHasSdfield, footer: snapshot.footerHasSdfield })
  );
  assert(
    snapshot.heading.toLocaleLowerCase("vi-VN").includes("công văn triển khai kế hoạch quý iv"),
    "Writer: Heading 1 còn trong body",
    snapshot.heading
  );
  assert(
    snapshot.bodyText.includes("128/KH-ĐT") && snapshot.bodyHasCompany === false,
    "Writer: thân trang còn, không lẫn header",
    snapshot.bodyText
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
console.log("All Writer Header/Footer import live checks passed.");
