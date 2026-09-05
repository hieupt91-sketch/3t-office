/**
 * Live Writer Comments import: real .docx (FODT → soffice, never VN serialize)
 * opened through adapter.open() / File → Mở. Playwright cannot drive the native
 * file dialog (SendKeys forbidden). Same soffice HTML convert as main.py, plus
 * word/document.xml + word/comments.xml forwarded the same way the desktop
 * bridge now does.
 */
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { convertWithSoffice } from "../helpers/soffice-convert.mjs";
import { readZipEntry } from "../helpers/zip-package.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const fixture = path.join(root, "tests", "fixtures", "real-office-samples", "sample-writer-comments.docx");
const port = Number(process.env.VNO_WRITER_COMMENTS_IMPORT_PORT || 8797);
const playwrightRoot = process.env.VNO_PLAYWRIGHT_ROOT || "C:/Users/3T Computer/AppData/Local/Temp/vno-playwright-tools";
const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "vno-writer-comments-import-live-"));
const profileDir = path.join(tmp, "lo-profile");
const htmlPath = convertWithSoffice(fixture, "html", path.join(tmp, "writer"), { profileDir });
const writerHtml = fs.readFileSync(htmlPath, "utf8");
const ooxmlDocumentXml = readZipEntry(fixture, "word/document.xml").toString("utf8");
const ooxmlCommentsXml = readZipEntry(fixture, "word/comments.xml").toString("utf8");

if (/<mark\b/i.test(writerHtml)) {
  throw new Error("StarWriter HTML unexpectedly kept mark — probe assumption changed");
}
if (writerHtml.includes("Tran Thi Hoa") || writerHtml.includes("Pham Minh Duc")) {
  throw new Error("StarWriter HTML unexpectedly kept comment authors");
}
if (!ooxmlCommentsXml.includes('w:author="Tran Thi Hoa"') || !ooxmlDocumentXml.includes("w:commentRangeStart")) {
  throw new Error("Fixture DOCX lost native comments");
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

  await page.evaluate(async ({ content, fileName, ooxmlDocumentXml: documentXml, ooxmlCommentsXml: commentsXml }) => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    globalUnoBridge.openRealFile = async () => ({
      status: "ok",
      content,
      fileName,
      ooxmlDocumentXml: documentXml,
      ooxmlCommentsXml: commentsXml
    });
  }, { content: writerHtml, fileName: "sample-writer-comments.docx", ooxmlDocumentXml, ooxmlCommentsXml });

  await page.locator(".vno-ribbon-tab-file").click();
  await page.locator('[data-backstage-cmd="common.file.open"]').click();
  await page.waitForTimeout(400);

  const snapshot = await page.evaluate(() => {
    const body = document.querySelector(".vno-writer-body");
    const panel = document.querySelector(".vno-writer-comments-panel");
    const marks = [...(body?.querySelectorAll("mark.vno-comment-anchor[data-comment-id]") || [])];
    const cards = [...(panel?.querySelectorAll(".vno-comment-card") || [])];
    const firstMark = marks.find((node) => /dự\s+toán\s+năm\s+2026/i.test(node.textContent || ""));
    const secondMark = marks.find((node) => /Lê\s+Văn\s+Cường/i.test(node.textContent || ""));
    const firstStyle = firstMark ? getComputedStyle(firstMark) : null;
    const heading = body?.querySelector("h1");
    return {
      heading: (heading?.innerText || "").replace(/\s+/g, " ").trim(),
      headingHasMark: Boolean(heading?.querySelector("mark")),
      bodyText: (body?.innerText || "").replace(/\s+/g, " ").trim(),
      markCount: marks.length,
      cardCount: cards.length,
      panelHidden: Boolean(panel?.hidden),
      panelText: (panel?.innerText || "").replace(/\s+/g, " ").trim(),
      firstMarkText: (firstMark?.textContent || "").replace(/\s+/g, " ").trim(),
      secondMarkText: (secondMark?.textContent || "").replace(/\s+/g, " ").trim(),
      firstAuthor: firstMark?.getAttribute("data-vno-comment-author") || "",
      secondAuthor: secondMark?.getAttribute("data-vno-comment-author") || "",
      firstBg: firstStyle?.backgroundColor || "",
      firstBorder: firstStyle?.borderBottomColor || firstStyle?.borderColor || "",
      pageErrors: []
    };
  });
  snapshot.pageErrors = errors;

  assert(
    snapshot.heading.toLocaleLowerCase("vi-VN").includes("công văn thẩm định dự toán năm 2026"),
    "Writer: Heading 1 còn sau import Comments",
    JSON.stringify(snapshot)
  );
  assert(
    snapshot.markCount === 2 && snapshot.cardCount === 2 && snapshot.panelHidden === false,
    "Writer: 2 mark neo + 2 card panel",
    JSON.stringify({ marks: snapshot.markCount, cards: snapshot.cardCount, hidden: snapshot.panelHidden })
  );
  assert(
    snapshot.firstMarkText.toLocaleLowerCase("vi-VN").includes("dự toán năm 2026"),
    "Writer: neo comment 1 đúng vị trí chữ",
    snapshot.firstMarkText
  );
  assert(
    snapshot.secondMarkText.toLocaleLowerCase("vi-VN").includes("lê văn cường"),
    "Writer: neo comment 2 đúng vị trí chữ",
    snapshot.secondMarkText
  );
  assert(
    snapshot.headingHasMark === false,
    "Writer: không bọc nhầm heading trùng chữ dự toán năm 2026",
    snapshot.heading
  );
  assert(
    snapshot.firstAuthor === "Tran Thi Hoa" && snapshot.secondAuthor === "Pham Minh Duc",
    "Writer: giữ tên người comment trên mark",
    JSON.stringify({ first: snapshot.firstAuthor, second: snapshot.secondAuthor })
  );
  assert(
    snapshot.panelText.includes("Cần đối chiếu số liệu quý II trước khi trình.")
      && snapshot.panelText.includes("Xác nhận chữ ký người soạn.")
      && snapshot.panelText.includes("Tran Thi Hoa")
      && snapshot.panelText.includes("Pham Minh Duc"),
    "Writer: panel hiện đúng nội dung + tên người comment",
    snapshot.panelText
  );
  assert(
    snapshot.firstBg === "rgb(255, 242, 168)",
    "Writer: neo comment hiện nền vàng như Comments phiên",
    snapshot.firstBg
  );
  assert(
    snapshot.bodyText.includes("Kính gửi Ban Giám đốc") && snapshot.bodyText.includes("Ngày soạn: 05/09/2026"),
    "Writer: đoạn không comment vẫn còn",
    snapshot.bodyText
  );

  await page.locator("mark.vno-comment-anchor", { hasText: "dự toán năm 2026" }).click();
  const afterClick = await page.evaluate(() => {
    const activeCard = document.querySelector(".vno-comment-card.is-active");
    const activeMark = document.querySelector("mark.vno-comment-anchor.is-active");
    return {
      cardText: (activeCard?.innerText || "").replace(/\s+/g, " ").trim(),
      markText: (activeMark?.textContent || "").replace(/\s+/g, " ").trim()
    };
  });
  assert(
    afterClick.cardText.includes("Cần đối chiếu số liệu quý II trước khi trình.")
      && afterClick.markText.toLocaleLowerCase("vi-VN").includes("dự toán năm 2026"),
    "Writer: click neo mở đúng card comment",
    JSON.stringify(afterClick)
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
console.log("All Writer Comments import live checks passed.");
