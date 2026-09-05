/**
 * Live Writer Footnotes/Endnotes import: real .docx (FODT → soffice, never VN
 * serialize) opened through adapter.open() / File → Mở. Playwright cannot
 * drive the native file dialog (SendKeys forbidden). Same soffice HTML
 * convert as main.py.
 *
 * StarWriter already emits a.sdfootnoteanc / a.sdendnoteanc + note bodies;
 * the adapter maps those onto data-vno-footnote-ref / data-vno-endnote-ref.
 */
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { convertWithSoffice } from "../helpers/soffice-convert.mjs";
import { readZipEntry } from "../helpers/zip-package.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const fixture = path.join(root, "tests", "fixtures", "real-office-samples", "sample-writer-footnotes.docx");
const port = Number(process.env.VNO_WRITER_FN_IMPORT_PORT || 8799);
const playwrightRoot = process.env.VNO_PLAYWRIGHT_ROOT || "C:/Users/3T Computer/AppData/Local/Temp/vno-playwright-tools";
const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));

const FN1_BODY = "thay thế một số điều của Nghị định 59/2015/NĐ-CP";
const FN2_BODY = "do Bộ Xây dựng ban hành ngày 25/8/2021";
const EN1_BODY = "bảng khối lượng đào đắp Đăk Bla";
const BODY_KENH = "phương án kênh chính";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "vno-writer-fn-import-live-"));
const profileDir = path.join(tmp, "lo-profile");
const htmlPath = convertWithSoffice(fixture, "html", path.join(tmp, "writer"), { profileDir });
const writerHtml = fs.readFileSync(htmlPath, "utf8");
const footnotesXml = readZipEntry(fixture, "word/footnotes.xml").toString("utf8");
const endnotesXml = readZipEntry(fixture, "word/endnotes.xml").toString("utf8");

if (!/class=["']sdfootnoteanc["']/i.test(writerHtml) || !/class=["']sdendnoteanc["']/i.test(writerHtml)) {
  throw new Error("StarWriter HTML lost sdfootnoteanc/sdendnoteanc — probe assumption changed");
}
if (!footnotesXml.includes(FN1_BODY) || !endnotesXml.includes(EN1_BODY)) {
  throw new Error("Fixture DOCX lost native footnotes.xml / endnotes.xml");
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
  }, { content: writerHtml, fileName: "sample-writer-footnotes.docx" });

  await page.locator(".vno-ribbon-tab-file").click();
  await page.locator('[data-backstage-cmd="common.file.open"]').click();
  await page.waitForTimeout(400);

  const snapshot = await page.evaluate(() => {
    const body = document.querySelector(".vno-writer-body");
    const fnRefs = Array.from(body?.querySelectorAll("sup[data-vno-footnote-ref]") || []);
    const enRefs = Array.from(body?.querySelectorAll("sup[data-vno-endnote-ref]") || []);
    const fnItems = Array.from(body?.querySelectorAll(".vno-footnote-item .vno-note-text") || []);
    const enItems = Array.from(body?.querySelectorAll(".vno-endnote-item .vno-note-text") || []);
    const heading = body?.querySelector("h1");
    return {
      bodyText: (body?.innerText || "").replace(/\s+/g, " ").trim(),
      heading: (heading?.innerText || "").replace(/\s+/g, " ").trim(),
      fnRefCount: fnRefs.length,
      enRefCount: enRefs.length,
      fnLabels: fnRefs.map((el) => (el.textContent || "").trim()),
      enLabels: enRefs.map((el) => (el.textContent || "").trim()),
      fnTexts: fnItems.map((el) => (el.innerText || "").replace(/\s+/g, " ").trim()),
      enTexts: enItems.map((el) => (el.innerText || "").replace(/\s+/g, " ").trim()),
      leftoverStarWriter: Boolean(body?.querySelector("a.sdfootnoteanc, a.sdendnoteanc, [id^='sdfootnote'], [id^='sdendnote']")),
      hasFnContainer: Boolean(body?.querySelector('[data-vno-footnotes="true"]')),
      hasEnContainer: Boolean(body?.querySelector('[data-vno-endnotes="true"]'))
    };
  });

  assert(
    snapshot.fnRefCount === 2 && snapshot.fnLabels.join(",") === "1,2",
    "Writer: 2 số mũ footnote VN (1, 2)",
    JSON.stringify({ count: snapshot.fnRefCount, labels: snapshot.fnLabels })
  );
  assert(
    snapshot.enRefCount === 1 && snapshot.enLabels[0] === "i",
    "Writer: 1 số mũ endnote VN (i)",
    JSON.stringify({ count: snapshot.enRefCount, labels: snapshot.enLabels })
  );
  assert(
    snapshot.fnTexts.some((text) => text.includes(FN1_BODY)) && snapshot.fnTexts.some((text) => text.includes(FN2_BODY)),
    "Writer: 2 nội dung footnote còn đủ",
    snapshot.fnTexts.join(" | ")
  );
  assert(
    snapshot.enTexts.some((text) => text.includes(EN1_BODY)),
    "Writer: nội dung endnote còn",
    snapshot.enTexts.join(" | ")
  );
  assert(
    snapshot.hasFnContainer && snapshot.hasEnContainer,
    "Writer: có container footnotes + endnotes",
    JSON.stringify({ fn: snapshot.hasFnContainer, en: snapshot.hasEnContainer })
  );
  assert(
    snapshot.leftoverStarWriter === false,
    "Writer: không còn markup StarWriter sdfootnote/sdendnote",
    String(snapshot.leftoverStarWriter)
  );
  assert(
    snapshot.bodyText.includes(BODY_KENH) && snapshot.heading.toLocaleLowerCase("vi-VN").includes("thủy lợi"),
    "Writer: thân trang và heading còn",
    `${snapshot.heading} | ${snapshot.bodyText.slice(0, 180)}`
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
console.log("All Writer Footnotes/Endnotes import live checks passed.");
