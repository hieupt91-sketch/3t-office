/**
 * Live Writer Track Changes import: real .docx (FODT → soffice, never VN serialize)
 * opened through adapter.open() / File → Mở. Playwright cannot drive the native
 * file dialog (SendKeys forbidden). Same soffice HTML convert as main.py, plus
 * word/document.xml forwarded the same way the desktop bridge now does.
 */
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { convertWithSoffice } from "../helpers/soffice-convert.mjs";
import { readZipEntry } from "../helpers/zip-package.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const fixture = path.join(root, "tests", "fixtures", "real-office-samples", "sample-writer-trackchanges.docx");
const port = Number(process.env.VNO_WRITER_TC_IMPORT_PORT || 8796);
const playwrightRoot = process.env.VNO_PLAYWRIGHT_ROOT || "C:/Users/3T Computer/AppData/Local/Temp/vno-playwright-tools";
const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "vno-writer-tc-import-live-"));
const profileDir = path.join(tmp, "lo-profile");
const htmlPath = convertWithSoffice(fixture, "html", path.join(tmp, "writer"), { profileDir });
const writerHtml = fs.readFileSync(htmlPath, "utf8");
const ooxmlDocumentXml = readZipEntry(fixture, "word/document.xml").toString("utf8");

if (/<(ins|del)\b/i.test(writerHtml)) {
  throw new Error("StarWriter HTML unexpectedly kept ins/del — probe assumption changed");
}
if (!ooxmlDocumentXml.includes("<w:ins") || !ooxmlDocumentXml.includes("<w:del")) {
  throw new Error("Fixture DOCX lost w:ins/w:del");
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

  await page.evaluate(async ({ content, fileName, ooxmlDocumentXml: xml }) => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    globalUnoBridge.openRealFile = async () => ({
      status: "ok",
      content,
      fileName,
      ooxmlDocumentXml: xml
    });
  }, { content: writerHtml, fileName: "sample-writer-trackchanges.docx", ooxmlDocumentXml });

  await page.locator(".vno-ribbon-tab-file").click();
  await page.locator('[data-backstage-cmd="common.file.open"]').click();
  await page.waitForTimeout(400);

  const snapshot = await page.evaluate(() => {
    const body = document.querySelector(".vno-writer-body");
    const ins = body?.querySelector('ins[data-vno-change="insert"]');
    const del = body?.querySelector('del[data-vno-change="delete"]');
    const insStyle = ins ? getComputedStyle(ins) : null;
    const delStyle = del ? getComputedStyle(del) : null;
    return {
      heading: (body?.querySelector("h1")?.innerText || "").replace(/\s+/g, " ").trim(),
      bodyText: (body?.innerText || "").replace(/\s+/g, " ").trim(),
      insText: (ins?.textContent || "").replace(/\s+/g, " ").trim(),
      delText: (del?.textContent || "").replace(/\s+/g, " ").trim(),
      insAuthor: ins?.getAttribute("data-vno-author") || "",
      delAuthor: del?.getAttribute("data-vno-author") || "",
      insTitle: ins?.getAttribute("title") || "",
      delTitle: del?.getAttribute("title") || "",
      insColor: insStyle?.color || "",
      delColor: delStyle?.color || "",
      insDecoration: insStyle?.textDecorationLine || insStyle?.textDecoration || "",
      delDecoration: delStyle?.textDecorationLine || delStyle?.textDecoration || "",
      pageErrors: []
    };
  });
  snapshot.pageErrors = errors;

  assert(
    snapshot.heading.toLocaleLowerCase("vi-VN").includes("biên bản rà soát ngân sách quý iii"),
    "Writer: Heading 1 còn sau import Track Changes",
    JSON.stringify(snapshot)
  );
  assert(
    snapshot.insText.toLocaleLowerCase("vi-VN").includes("theo yêu cầu khẩn"),
    "Writer: insertion còn đúng chữ và thẻ ins",
    JSON.stringify(snapshot)
  );
  assert(
    snapshot.delText.toLocaleLowerCase("vi-VN").includes("bản nháp nội bộ"),
    "Writer: deletion còn hiển thị (không bị mất khỏi nội dung)",
    JSON.stringify(snapshot)
  );
  assert(
    snapshot.insAuthor === "Nguyen Van An" && snapshot.delAuthor === "Nguyen Van An",
    "Writer: giữ tên người sửa trên data-vno-author",
    JSON.stringify({ ins: snapshot.insAuthor, del: snapshot.delAuthor, title: snapshot.insTitle })
  );
  assert(
    snapshot.insTitle.includes("Nguyen Van An") && snapshot.delTitle.includes("Nguyen Van An"),
    "Writer: tooltip title còn tên người sửa",
    JSON.stringify({ insTitle: snapshot.insTitle, delTitle: snapshot.delTitle })
  );
  assert(
    snapshot.insColor === "rgb(22, 101, 52)" && String(snapshot.insDecoration).includes("underline"),
    "Writer: insertion hiện xanh / gạch chân như Track Changes phiên",
    JSON.stringify({ color: snapshot.insColor, decoration: snapshot.insDecoration })
  );
  assert(
    snapshot.delColor === "rgb(185, 28, 28)" && String(snapshot.delDecoration).includes("line-through"),
    "Writer: deletion hiện đỏ / gạch ngang như Track Changes phiên",
    JSON.stringify({ color: snapshot.delColor, decoration: snapshot.delDecoration })
  );
  assert(
    snapshot.bodyText.includes("Người lập: Nguyễn Thị Bình"),
    "Writer: đoạn không sửa vẫn còn",
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
console.log("All Writer Track Changes import live checks passed.");
