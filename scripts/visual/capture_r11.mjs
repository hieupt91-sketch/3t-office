import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = path.resolve(".");
const port = 8998;
const playwrightRoot = "C:/Users/3T Computer/AppData/Local/Temp/vno-playwright-tools";
const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));

const MIME_TYPES = {
  ".html": "text/html; charset=UTF-8",
  ".htm": "text/html; charset=UTF-8",
  ".js": "text/javascript; charset=UTF-8",
  ".mjs": "text/javascript; charset=UTF-8",
  ".css": "text/css; charset=UTF-8",
  ".json": "application/json; charset=UTF-8",
  ".svg": "image/svg+xml",
  ".png": "image/png"
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split("?")[0];
  if (reqPath === "/favicon.ico") { res.writeHead(204); res.end(); return; }
  if (reqPath === "/") reqPath = "/index.html";
  const filePath = path.resolve(root, path.normalize(decodeURIComponent(reqPath)).replace(/^[/\\]+/, ""));
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) { res.writeHead(404); res.end("404"); return; }
    res.writeHead(200, { "Content-Type": MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream" });
    fs.createReadStream(filePath).pipe(res);
  });
});

await new Promise(resolve => server.listen(port, "127.0.0.1", resolve));
console.log(`Static server listening on port ${port}`);

const outDir = path.resolve(root, "docs/screenshots/r11");
const payloadDir = path.join(outDir, "payloads");
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const sheetTasks = [
  // L1-L5, L9 verification files:
  {
    name: "lan02",
    sheets: [
      { name: "UNC", index: 1 },
      { name: "DANH SÁCH CHI LƯƠNG", index: 2 }
    ]
  },
  {
    name: "lan03",
    sheets: [
      { name: "Thông báo Sản phẩm mới", index: 1 },
      { name: "Các mã điều chỉnh giá", index: 2 }
    ]
  },
  {
    name: "lan12",
    sheets: [
      { name: "HikDashcam", index: 1 },
      { name: "Chuông Hình HIK", index: 2 }
    ]
  },
  {
    name: "lan26",
    sheets: [
      { name: "KHÓA BIỆT THỰ", index: 1 },
      { name: "KHÓA THÔNG MINH", index: 2 }
    ]
  },
  {
    name: "lan28",
    sheets: [
      { name: "Tổng Hợp Bán Hàng", index: 1 },
      { name: "KPI Toàn", index: 2 }
    ]
  },
  // 6 new workbooks:
  {
    name: "lan04",
    sheets: [
      { name: "Phụ kiện", index: 1 },
      { name: "Sheet1", index: 2 }
    ]
  },
  {
    name: "lan07",
    sheets: [
      { name: "D1", index: 1 },
      { name: "D2", index: 2 },
      { name: "D3", index: 3 },
      { name: "D1,2,3", index: 4 }
    ]
  },
  {
    name: "lan08",
    sheets: [
      { name: "BANG GIA MANHINH ", index: 1 },
      { name: "BANG GIA PC  ", index: 2 },
      { name: "BANG GIÁ SACH TAY HP ", index: 3 },
      { name: "LENOVO PC  ", index: 4 }
    ]
  },
  {
    name: "lan10",
    sheets: [
      { name: "Thông báo", index: 1 },
      { name: "Khóa điện tử Korea", index: 2 },
      { name: "Khóa vân tay", index: 3 },
      { name: "Khóa mã số BLUETOOTH", index: 4 }
    ]
  },
  {
    name: "lan13",
    sheets: [
      { name: "D1", index: 1 },
      { name: "D2", index: 2 },
      { name: "D3", index: 3 },
      { name: "D4", index: 4 }
    ]
  },
  {
    name: "lan16",
    sheets: [
      { name: "Thông báo Sản phẩm mới", index: 1 },
      { name: "Các mã sản phẩm dừng phân phối", index: 2 },
      { name: "Các mã điều chỉnh giá", index: 3 },
      { name: "Camera IP", index: 4 }
    ]
  }
];

const writerTasks = [
  // L6, L8 verification:
  { name: "d09" },
  { name: "d13" },
  // 4 new docx:
  { name: "d02" },
  { name: "d11" },
  { name: "d16" },
  { name: "d20" }
];

let browser;

try {
  browser = await chromium.launch({
    executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    headless: true
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: "vi-VN" });

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`[PAGE CONSOLE ERROR] ${msg.text()}`);
    }
  });
  page.on('pageerror', err => {
    console.log(`[PAGE UNCAUGHT ERROR] ${err.message}`);
  });

  // 1. CAPTURE EXCEL HTML RENDERINGS
  console.log("\n=== 1. CAPTURING EXCEL HTML RENDERINGS ===");
  await page.addInitScript(() => {
    window.name = "frSheet";
  });

  for (const st of sheetTasks) {
    for (const sh of st.sheets) {
      const idxStr = String(sh.index).padStart(3, "0");
      // Orig
      const outOrigPng = path.join(outDir, `visual_excel_orig_${st.name}_s${sh.index}.png`);
      const origHtml = path.join(outDir, `orig_${st.name}_files`, `sheet${idxStr}.htm`);
      if (fs.existsSync(origHtml)) {
        const url = `file:///${origHtml.replace(/\\/g, "/")}`;
        await page.goto(url, { waitUntil: "load" });
        await page.waitForTimeout(300);
        await page.screenshot({ path: outOrigPng, fullPage: false });
        console.log(`Saved ${path.basename(outOrigPng)}`);
      }

      // RT
      const outRtPng = path.join(outDir, `visual_excel_rt_${st.name}_s${sh.index}.png`);
      const rtHtml = path.join(outDir, `rt_${st.name}_files`, `sheet${idxStr}.htm`);
      if (fs.existsSync(rtHtml)) {
        const url = `file:///${rtHtml.replace(/\\/g, "/")}`;
        await page.goto(url, { waitUntil: "load" });
        await page.waitForTimeout(300);
        await page.screenshot({ path: outRtPng, fullPage: false });
        console.log(`Saved ${path.basename(outRtPng)}`);
      }
    }
  }

  // 2. CAPTURE WORD PDF PAGES
  console.log("\n=== 2. CAPTURING WORD PDF PAGES ===");
  for (const wt of writerTasks) {
    for (let p = 1; p <= 3; p++) {
      const pdfPath = path.join(outDir, `word_${wt.name}_page${p}.pdf`);
      if (fs.existsSync(pdfPath)) {
        const url = `file:///${pdfPath.replace(/\\/g, "/")}`;
        await page.goto(url, { waitUntil: "networkidle" });
        await page.waitForTimeout(800);
        const outPng = path.join(outDir, `visual_word_${wt.name}_p${p}.png`);
        await page.screenshot({ path: outPng });
        console.log(`Saved ${path.basename(outPng)}`);
      }
    }
  }

  // 3. CAPTURE VN SHEET APP
  console.log("\n=== 3. CAPTURING VN SHEET APP ===");
  for (const st of sheetTasks) {
    const payloadFile = path.join(payloadDir, `sheet_${st.name}.xlsx.json`);
    const fallbackPayload = path.join(payloadDir, `sheet_${st.name}.json`);
    const targetPayload = fs.existsSync(payloadFile) ? payloadFile : fallbackPayload;

    if (!fs.existsSync(targetPayload)) {
      console.warn(`Payload missing for ${st.name}: ${targetPayload}`);
      continue;
    }

    console.log(`Opening VN Sheet for ${st.name}...`);
    await page.goto(`http://127.0.0.1:${port}/?app=sheet`, { waitUntil: "load" });
    await page.locator('.vno-shell[data-app="sheet"]').waitFor({ timeout: 15000 });
    await page.waitForTimeout(500);

    const payloadRaw = fs.readFileSync(targetPayload, "utf8");
    const payload = JSON.parse(payloadRaw);

    const loadRes = await page.evaluate(async (p) => {
      try {
        const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
        globalUnoBridge.openRealFile = async () => p;
        const adapter = globalUnoBridge.activeDocument;
        await adapter.open();
        return { ok: true, activeSheet: adapter.grid ? adapter.grid.activeSheet : null };
      } catch (e) {
        return { ok: false, error: String(e && e.stack || e) };
      }
    }, payload);

    console.log(`Loaded ${st.name} in VN Sheet:`, loadRes);
    await page.waitForTimeout(1000);

    for (const sh of st.sheets) {
      console.log(`Switching to sheet "${sh.name}" (index ${sh.index})...`);
      const switchResult = await page.evaluate(async (sheetTitle) => {
        try {
          const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
          const grid = globalUnoBridge.activeDocument.grid;
          if (grid && grid.switchSheet) {
            grid.switchSheet(sheetTitle);
          }
          return { ok: true, active: grid ? grid.activeSheet : null };
        } catch (e) {
          return { ok: false, error: String(e && e.stack || e) };
        }
      }, sh.name);

      if (!switchResult.ok) {
        console.warn(`Error switching to ${sh.name}:`, switchResult.error);
      }
      await page.waitForTimeout(1000);

      const outPng = path.join(outDir, `visual_vnsheet_${st.name}_s${sh.index}.png`);
      await page.screenshot({ path: outPng, fullPage: false });
      console.log(`Saved ${path.basename(outPng)}`);
    }
  }

  // 4. CAPTURE VN WRITER APP
  console.log("\n=== 4. CAPTURING VN WRITER APP ===");
  for (const wt of writerTasks) {
    const payloadFile = path.join(payloadDir, `writer_${wt.name}.docx.json`);
    const fallbackPayload = path.join(payloadDir, `writer_${wt.name}.json`);
    const targetPayload = fs.existsSync(payloadFile) ? payloadFile : fallbackPayload;

    if (!fs.existsSync(targetPayload)) {
      console.warn(`Writer payload missing: ${targetPayload}`);
      continue;
    }

    console.log(`Opening VN Writer for ${wt.name}...`);
    await page.goto(`http://127.0.0.1:${port}/?app=writer`, { waitUntil: "load" });
    await page.locator('.vno-shell[data-app="writer"]').waitFor({ timeout: 15000 });
    await page.waitForTimeout(500);

    const payloadRaw = fs.readFileSync(targetPayload, "utf8");
    const payload = JSON.parse(payloadRaw);

    const loadRes = await page.evaluate(async (p) => {
      try {
        const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
        globalUnoBridge.openRealFile = async () => p;
        const adapter = globalUnoBridge.activeDocument;
        await adapter.open();
        return { ok: true };
      } catch (e) {
        return { ok: false, error: String(e && e.stack || e) };
      }
    }, payload);

    console.log(`Loaded ${wt.name} in VN Writer:`, loadRes);
    // Wait for live pagination
    await page.waitForTimeout(2500);

    const pageMeta = await page.evaluate(() => {
      const pageEl = document.querySelector('.vno-writer-page');
      const gaps = Array.from(document.querySelectorAll('.vno-page-auto-gap'));
      const status = ((document.querySelector('.vno-statusbar-left')||{}).textContent||'').trim();
      const rect = pageEl ? pageEl.getBoundingClientRect() : null;
      const scrollY = window.scrollY || 0;
      return {
        status,
        pageTop: rect ? rect.top + scrollY : 0,
        pageLeft: rect ? rect.left : 0,
        pageWidth: rect ? rect.width : 816,
        gapTops: gaps.map(g => g.offsetTop)
      };
    });

    console.log(`${wt.name} Writer meta:`, pageMeta);

    for (let p = 1; p <= 3; p++) {
      let targetScrollY = 0;
      if (p === 1) {
        targetScrollY = 0;
      } else if (p === 2 && pageMeta.gapTops.length >= 1) {
        targetScrollY = pageMeta.gapTops[0];
      } else if (p === 3 && pageMeta.gapTops.length >= 2) {
        targetScrollY = pageMeta.gapTops[1];
      } else {
        targetScrollY = (p - 1) * 1123;
      }

      await page.evaluate((top) => {
        const vp = document.querySelector('.vno-writer-viewport');
        if (vp) vp.scrollTop = top;
      }, targetScrollY);
      await page.waitForTimeout(600);

      const outPng = path.join(outDir, `visual_vnwriter_${wt.name}_p${p}.png`);
      await page.screenshot({ path: outPng, fullPage: false });
      console.log(`Saved ${path.basename(outPng)}`);
    }
  }

  console.log("\n=== ALL R11 CAPTURES COMPLETED! ===");
} catch (err) {
  console.error("Capture runner error:", err);
} finally {
  if (browser) await browser.close();
  server.close();
}
