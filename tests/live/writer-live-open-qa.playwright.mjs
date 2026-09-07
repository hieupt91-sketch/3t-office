/**
 * VN Writer — Live Open Path Visual QA & Automated Fidelity Assessment
 * Tests the REAL production open path on 4 real-world user DOCX documents.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "../..");
const PORT = 8895;

const MIME_TYPES = {
  ".html": "text/html; charset=UTF-8",
  ".js": "text/javascript; charset=UTF-8",
  ".css": "text/css; charset=UTF-8",
  ".json": "application/json; charset=UTF-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2"
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split("?")[0];
  if (reqPath === "/favicon.ico") {
    res.writeHead(204);
    res.end();
    return;
  }
  if (reqPath === "/") reqPath = "/index.html";
  const safePath = path.normalize(decodeURIComponent(reqPath)).replace(/^(\.\.[\/\\])+/, "");
  const filePath = path.join(ROOT_DIR, safePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=UTF-8" });
      res.end("404 Not Found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
    fs.createReadStream(filePath).pipe(res);
  });
});

await new Promise((resolve, reject) => {
  server.listen(PORT, "127.0.0.1", resolve);
  server.on("error", reject);
});
console.log(`Test server running at http://127.0.0.1:${PORT}`);

const playwrightRoot = process.env.VNO_PLAYWRIGHT_ROOT || "C:/Users/3T Computer/AppData/Local/Temp/vno-playwright-tools";
const edgePath = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));

const SCREENSHOTS_DIR = path.join(ROOT_DIR, "docs", "screenshots", "writer-live-open");
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

const PAYLOAD_DIR = path.join(ROOT_DIR, "tests", "fixtures", "live-open-payloads");

const TEST_FILES = [
  {
    id: 1,
    name: "HĐ VÀ NGHIỆM THU, THANH LÝ.docx (gói 04-2026)",
    payloadFile: "file1_payload.json",
    slug: "file1-hd-nghiem-thu-thanh-ly"
  },
  {
    id: 2,
    name: "hợp đồng sửa chữa 3T- UBXQT.docx (Hồ sơ sữa chữa)",
    payloadFile: "file2_payload.json",
    slug: "file2-hop-dong-sua-chua-3t"
  },
  {
    id: 3,
    name: "8. Biên bản hoàn thiện hợp đồng.docx (MÁY BẢO MẬT)",
    payloadFile: "file3_payload.json",
    slug: "file3-bien-ban-hoan-thien-hd"
  },
  {
    id: 4,
    name: "to_trinh.docx (MÁY BẢO MẬT file mới)",
    payloadFile: "file4_payload.json",
    slug: "file4-to-trinh"
  },
  {
    id: 5,
    name: "Biên bản hoàn thiện hợp đồng.docx (gói 04-2026)",
    payloadFile: "file5_payload.json",
    slug: "file5-bien-ban-hoan-thien-hd-t4"
  },
  {
    id: 6,
    name: "12. HĐ VÀ NGHIỆM THU, THANH LÝ.docx (MÁY BẢO MẬT)",
    payloadFile: "file6_payload.json",
    slug: "file6-hd-nghiem-thu-thanh-ly-mbm"
  },
  {
    id: 7,
    name: "1. QĐ thành lập TỔ MUA SẮM.docx (MÁY BẢO MẬT)",
    payloadFile: "file7_payload.json",
    slug: "file7-qd-to-mua-sam-mbm"
  },
  {
    id: 8,
    name: "2. Tờ trìn khlcnt.docx (MÁY BẢO MẬT)",
    payloadFile: "file8_payload.json",
    slug: "file8-to-trinh-khlcnt-mbm"
  },
  {
    id: 9,
    name: "HĐ VÀ NGHIỆM THU, THANH LÝ.docx (gói 8 -2026)",
    payloadFile: "file9_payload.json",
    slug: "file9-hd-nghiem-thu-thanh-ly-t8"
  },
  {
    id: 10,
    name: "hợp đồng sửa chữa 3T- UBXQT.docx (gói 8 -2026)",
    payloadFile: "file10_payload.json",
    slug: "file10-hop-dong-sua-chua-3t-t8"
  },
  {
    id: 11,
    name: "Biên bản hoàn thiện hợp đồngg.docx (gói 8 -2026)",
    payloadFile: "file11_payload.json",
    slug: "file11-bien-ban-hoan-thien-hdg-t8"
  },
  {
    id: 12,
    name: "1. QĐ thành lập TỔ MUA SẮM.docx (MÁY PHOTO)",
    payloadFile: "file12_payload.json",
    slug: "file12-qd-to-mua-sam-photo"
  },
  {
    id: 13,
    name: "2. Tờ trìn khlcnt.docx (MÁY PHOTO)",
    payloadFile: "file13_payload.json",
    slug: "file13-to-trinh-khlcnt-photo"
  },
  {
    id: 14,
    name: "8. Biên bản hoàn thiện hợp đồng.docx (MÁY PHOTO)",
    payloadFile: "file14_payload.json",
    slug: "file14-bien-ban-hoan-thien-hd-photo"
  },
  {
    id: 15,
    name: "12. HĐ VÀ NGHIỆM THU, THANH LÝ (Autosaved).docx (MÁY PHOTO)",
    payloadFile: "file15_payload.json",
    slug: "file15-hd-nghiem-thu-thanh-ly-autosaved-photo"
  }
];

let browser;
const results = [];

try {
  browser = await chromium.launch({
    executablePath: edgePath,
    headless: true
  });

  for (const item of TEST_FILES) {
    console.log(`\n======================================================`);
    console.log(`[FILE ${item.id}/${TEST_FILES.length}] Đang mở tài liệu: ${item.name}`);
    console.log(`======================================================`);

    const payloadPath = path.join(PAYLOAD_DIR, item.payloadFile);
    const payload = JSON.parse(fs.readFileSync(payloadPath, "utf8"));

    const page = await browser.newPage({
      viewport: { width: 1600, height: 1050 },
      locale: "vi-VN"
    });

    const pageErrors = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: "networkidle" });
    await page.locator(".vno-writer-body").waitFor({ state: "visible" });

    // Cài đặt stub cho globalUnoBridge.openRealFile để trả về kết quả chuyển đổi từ LibreOffice thật
    await page.evaluate((mockPayload) => {
      window.__vno_live_payload = mockPayload;
      if (window.vnoUnoBridge) {
        window.vnoUnoBridge.openRealFile = async () => window.__vno_live_payload;
      }
      import("/adapters/libreoffice/common/uno-bridge.js").then(({ globalUnoBridge }) => {
        globalUnoBridge.openRealFile = async () => window.__vno_live_payload;
      });
    }, payload);

    // Bấm menu Tệp -> Mở tệp (gọi đúng luồng UI -> globalCommandBus.execute("common.file.open") -> adapter.open())
    await page.locator(".vno-ribbon-tab-file").click();
    await page.locator('[data-backstage-cmd="common.file.open"]').click();

    // Chờ tài liệu tải xong và DOM render
    await page.waitForTimeout(1000);

    // Chờ body có nội dung của tệp mới
    await page.waitForFunction(
      () => {
        const body = document.querySelector(".vno-writer-body");
        return body && body.innerHTML.length > 500;
      },
      { timeout: 10000 }
    );

    await page.waitForTimeout(1200);

    // Đánh giá chuyên sâu DOM và hiển thị thị giác
    const auditData = await page.evaluate((fileItem) => {
      const pageEl = document.querySelector(".vno-writer-page");
      const bodyEl = document.querySelector(".vno-writer-body");
      const headerEl = document.querySelector(".vno-writer-header");
      const footerEl = document.querySelector(".vno-writer-footer");
      const tabEl = document.querySelector(".vno-doc-tab span, .vno-doc-tab");
      const docTitle = document.querySelector(".vno-topbar-title, .vno-document-title")?.textContent?.trim() || "";

      const pageWidth = pageEl ? pageEl.offsetWidth : 0;
      const pageClientWidth = pageEl ? pageEl.clientWidth : 0;
      const pageComputed = pageEl ? window.getComputedStyle(pageEl) : null;

      // Tables
      const tables = Array.from(bodyEl ? bodyEl.querySelectorAll("table") : []);
      const tableDetails = tables.map((tbl, idx) => {
        const rows = tbl.querySelectorAll("tr").length;
        const cells = Array.from(tbl.querySelectorAll("td, th"));
        const tblWidth = tbl.offsetWidth;
        const tblScrollWidth = tbl.scrollWidth;
        const overflows = tblWidth > pageClientWidth + 10;
        const sampleCell = cells[0];
        const cellComputed = sampleCell ? window.getComputedStyle(sampleCell) : null;
        const borderTop = cellComputed ? `${cellComputed.borderTopWidth} ${cellComputed.borderTopStyle} ${cellComputed.borderTopColor}` : "";
        const inlineStyle = tbl.getAttribute("style") || "";
        const inlineWidth = tbl.getAttribute("width") || "";
        return {
          index: idx + 1,
          rows,
          cellCount: cells.length,
          tblWidth,
          tblScrollWidth,
          overflows,
          borderTop,
          inlineStyle,
          inlineWidth
        };
      });

      // Images
      const imgs = Array.from(bodyEl ? bodyEl.querySelectorAll("img") : []);
      const imgDetails = imgs.map((img, idx) => {
        const src = img.getAttribute("src") || "";
        const isDataUri = src.startsWith("data:");
        const naturalWidth = img.naturalWidth;
        const naturalHeight = img.naturalHeight;
        const clientWidth = img.clientWidth;
        const clientHeight = img.clientHeight;
        const isBroken = naturalWidth === 0 && naturalHeight === 0;
        return {
          index: idx + 1,
          srcPrefix: src.substring(0, 45) + (src.length > 45 ? "..." : ""),
          srcTotalLen: src.length,
          isDataUri,
          naturalWidth,
          naturalHeight,
          clientWidth,
          clientHeight,
          isBroken,
          name: img.getAttribute("name") || "",
          alt: img.getAttribute("alt") || ""
        };
      });

      // Typography & Vietnamese text
      const bodyText = bodyEl ? bodyEl.innerText : "";
      const sampleText = bodyText.substring(0, 500);
      const viChars = ["à", "á", "ả", "ã", "ạ", "ă", "ắ", "ằ", "ẳ", "ẵ", "ặ", "â", "ấ", "ầ", "ẩ", "ẫ", "ậ",
                       "đ", "è", "é", "ẻ", "ẽ", "ẹ", "ê", "ế", "ề", "ể", "ễ", "ệ", "ì", "í", "ỉ", "ĩ", "ị",
                       "ò", "ó", "ỏ", "õ", "ọ", "ô", "ố", "ồ", "ổ", "ỗ", "ộ", "ơ", "ớ", "ờ", "ở", "ỡ", "ợ",
                       "ù", "ú", "ủ", "ũ", "ụ", "ư", "ứ", "ừ", "ử", "ữ", "ự", "ỳ", "ý", "ỷ", "ỹ", "ỵ"];
      const foundViChars = viChars.filter((c) => bodyText.includes(c));
      const hasCorruptedGlyphs = bodyText.includes("\uFFFD") || /&#\d+;/.test(bodyText);

      // Font styles
      const firstP = bodyEl ? bodyEl.querySelector("p") : null;
      const pComputed = firstP ? window.getComputedStyle(firstP) : null;
      const fontFamily = pComputed ? pComputed.fontFamily : "";
      const fontSize = pComputed ? pComputed.fontSize : "";
      const lineHeight = pComputed ? pComputed.lineHeight : "";

      // Alignment audit: verify <p align="..."> and <td/th align="..."> computed styles
      const alignedP = Array.from(bodyEl ? bodyEl.querySelectorAll("p[align]") : []);
      const pAlignAudit = alignedP.map((p) => {
        const attr = (p.getAttribute("align") || "").toLowerCase();
        const computed = window.getComputedStyle(p).textAlign.toLowerCase();
        return { attr, computed, match: attr === computed };
      });
      const pAlignMismatches = pAlignAudit.filter((a) => !a.match);

      const alignedCells = Array.from(bodyEl ? bodyEl.querySelectorAll("td[align], th[align]") : []);
      const cellAlignAudit = alignedCells.map((c) => {
        const attr = (c.getAttribute("align") || "").toLowerCase();
        const computed = window.getComputedStyle(c).textAlign.toLowerCase();
        return { attr, computed, match: attr === computed };
      });
      const cellAlignMismatches = cellAlignAudit.filter((a) => !a.match);

      // Header / Footer
      const headerText = headerEl ? headerEl.innerText.trim() : "";
      const headerHtml = headerEl ? headerEl.innerHTML.trim() : "";
      const footerText = footerEl ? footerEl.innerText.trim() : "";
      const footerHtml = footerEl ? footerEl.innerHTML.trim() : "";

      return {
        fileName: fileItem.name,
        docTitle,
        tabTitle: tabEl ? tabEl.textContent.trim() : "",
        page: {
          width: pageWidth,
          clientWidth: pageClientWidth,
          paddingLeft: pageComputed?.paddingLeft,
          paddingRight: pageComputed?.paddingRight,
          paddingTop: pageComputed?.paddingTop,
          paddingBottom: pageComputed?.paddingBottom
        },
        bodySummary: {
          totalChars: bodyText.length,
          paragraphCount: bodyEl ? bodyEl.querySelectorAll("p").length : 0,
          headingCount: bodyEl ? bodyEl.querySelectorAll("h1, h2, h3, h4, h5, h6").length : 0
        },
        tables: {
          count: tables.length,
          anyOverflow: tableDetails.some((t) => t.overflows),
          details: tableDetails
        },
        images: {
          count: imgs.length,
          brokenCount: imgDetails.filter((img) => img.isBroken).length,
          details: imgDetails
        },
        alignment: {
          pAlignedCount: alignedP.length,
          pAlignMismatches: pAlignMismatches.length,
          cellAlignedCount: alignedCells.length,
          cellAlignMismatches: cellAlignMismatches.length
        },
        typography: {
          fontFamily,
          fontSize,
          lineHeight,
          hasVietnamese: foundViChars.length > 5,
          hasCorruptedGlyphs,
          sampleSnippet: sampleText.replace(/\s+/g, " ").substring(0, 150)
        },
        headerFooter: {
          hasHeader: Boolean(headerHtml && headerText),
          headerText,
          headerHtml: headerHtml.substring(0, 200),
          hasFooter: Boolean(footerHtml && footerText),
          footerText,
          footerHtml: footerHtml.substring(0, 200)
        }
      };
    }, item);

    // Chụp ảnh màn hình toàn cửa sổ (overview có ribbon, ruler, toolbar, document)
    const windowScreenshotPath = path.join(SCREENSHOTS_DIR, `${item.slug}-window-overview.png`);
    await page.screenshot({ path: windowScreenshotPath, fullPage: false });
    console.log(`  [Ảnh] Đã chụp tổng quan cửa sổ: ${windowScreenshotPath}`);

    // Chụp ảnh cuộn trang tài liệu (document viewport)
    const viewportEl = page.locator(".vno-writer-viewport");
    const viewportScreenshotPath = path.join(SCREENSHOTS_DIR, `${item.slug}-viewport-top.png`);
    await viewportEl.screenshot({ path: viewportScreenshotPath });
    console.log(`  [Ảnh] Đã chụp vùng văn bản (đầu trang): ${viewportScreenshotPath}`);

    // Cuộn xuống xem trang tiếp theo/giữa trang nếu tài liệu dài
    await page.evaluate(() => {
      const vp = document.querySelector(".vno-writer-viewport");
      if (vp) vp.scrollTop = 900;
    });
    await page.waitForTimeout(300);
    const middleScreenshotPath = path.join(SCREENSHOTS_DIR, `${item.slug}-viewport-middle.png`);
    await viewportEl.screenshot({ path: middleScreenshotPath });
    console.log(`  [Ảnh] Đã chụp vùng văn bản (giữa trang): ${middleScreenshotPath}`);

    // Nếu có bảng biểu, chụp ảnh bảng đầu tiên
    const tableLocator = page.locator(".vno-writer-body table").first();
    let tableScreenshotPath = null;
    if (await tableLocator.count() > 0) {
      tableScreenshotPath = path.join(SCREENSHOTS_DIR, `${item.slug}-first-table.png`);
      try {
        await tableLocator.screenshot({ path: tableScreenshotPath });
        console.log(`  [Ảnh] Đã chụp chi tiết bảng đầu tiên: ${tableScreenshotPath}`);
      } catch (err) {
        console.log(`  [Ảnh] Không chụp được bảng: ${err.message}`);
      }
    }

    auditData.screenshots = {
      windowOverview: windowScreenshotPath,
      viewportTop: viewportScreenshotPath,
      viewportMiddle: middleScreenshotPath,
      firstTable: tableScreenshotPath
    };
    auditData.pageErrors = pageErrors;

    results.push(auditData);

    console.log(`  -> Số bảng: ${auditData.tables.count}, Bảng tràn: ${auditData.tables.anyOverflow}`);
    console.log(`  -> Số ảnh: ${auditData.images.count}, Ảnh lỗi (broken): ${auditData.images.brokenCount}`);
    console.log(`  -> Căn lề align=: ${auditData.alignment.pAlignedCount} p (${auditData.alignment.pAlignMismatches} lỗi), ${auditData.alignment.cellAlignedCount} ô bảng (${auditData.alignment.cellAlignMismatches} lỗi)`);
    console.log(`  -> Tiếng Việt: ${auditData.typography.hasVietnamese ? "OK" : "KHÔNG THẤY"}, Lỗi ký tự ô vuông: ${auditData.typography.hasCorruptedGlyphs ? "CÓ LỖI" : "KHÔNG"}`);
    console.log(`  -> Header: ${auditData.headerFooter.hasHeader ? auditData.headerFooter.headerText : "(trống)"}, Footer: ${auditData.headerFooter.hasFooter ? auditData.headerFooter.footerText : "(trống)"}`);
    console.log(`  -> Lỗi JS Console: ${pageErrors.length}`);

    await page.close();
  }

  // Ghi báo cáo audit JSON
  const auditJsonPath = path.join(PAYLOAD_DIR, "qa-audit-results.json");
  fs.writeFileSync(auditJsonPath, JSON.stringify(results, null, 2), "utf8");
  console.log(`\nĐã ghi toàn bộ kết quả QA chi tiết vào: ${auditJsonPath}`);

} finally {
  if (browser) await browser.close();
  server.close();
}
