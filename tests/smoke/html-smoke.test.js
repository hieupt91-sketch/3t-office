/**
 * Test Suite: index.html & Application Runtime Smoke Tests
 * Tuân thủ quy định 06-testing/TESTING-STANDARD.md & AGENTS.md
 * 
 * Kiểm tra toàn diện chu trình khởi động của VN Office:
 * 1. Cấu trúc tệp index.html và tính toàn vẹn của các liên kết CSS/JS.
 * 2. Cú pháp của inline module script trong index.html.
 * 3. Dynamic import các entrypoint ứng dụng (WriterApp, SheetApp, SlidesApp, bootstrapPlatform) trong môi trường Node.js.
 * 4. Smoke test nạp index.html và mount DOM thật thông qua trình duyệt headless (Microsoft Edge / Google Chrome).
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";
import { checkFileSyntax } from "../../scripts/check-syntax.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "../..");
const INDEX_HTML_PATH = path.join(ROOT_DIR, "index.html");

/**
 * Tìm kiếm trình duyệt headless có sẵn trên hệ điều hành (Windows, Linux, macOS).
 * @returns {string | null}
 */
function findHeadlessBrowser() {
  const isWin = process.platform === "win32";
  const isMac = process.platform === "darwin";

  const candidates = [];

  if (isWin) {
    candidates.push(
      "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
      "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      path.join(process.env.LOCALAPPDATA || "", "Microsoft\\Edge\\Application\\msedge.exe"),
      path.join(process.env.LOCALAPPDATA || "", "Google\\Chrome\\Application\\chrome.exe")
    );
  } else if (isMac) {
    candidates.push(
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Chromium.app/Contents/MacOS/Chromium"
    );
  } else {
    // Linux
    candidates.push(
      "/usr/bin/google-chrome",
      "/usr/bin/google-chrome-stable",
      "/usr/bin/chromium",
      "/usr/bin/chromium-browser",
      "/usr/bin/microsoft-edge",
      "/snap/bin/chromium"
    );
  }

  for (const p of candidates) {
    if (p && fs.existsSync(p)) {
      return p;
    }
  }

  // Thử tìm qua PATH
  const binaryNames = isWin ? ["msedge.exe", "chrome.exe"] : ["google-chrome", "chromium", "microsoft-edge"];
  for (const bin of binaryNames) {
    try {
      const checkCmd = isWin ? "where" : "which";
      const res = spawnSync(checkCmd, [bin], { encoding: "utf8", windowsHide: true });
      if (res.status === 0 && res.stdout) {
        const foundPath = res.stdout.split("\r\n")[0].split("\n")[0].trim();
        if (foundPath && fs.existsSync(foundPath)) return foundPath;
      }
    } catch (_) {}
  }

  return null;
}

export async function runHtmlSmokeTests() {
  const results = [];

  // ==========================================
  // 1. Kiểm tra cấu trúc tĩnh của index.html
  // ==========================================
  if (!fs.existsSync(INDEX_HTML_PATH)) {
    results.push({ name: "HTML Smoke: Tệp index.html tồn tại tại gốc dự án", pass: false });
    return results;
  }
  results.push({ name: "HTML Smoke: Tệp index.html tồn tại tại gốc dự án", pass: true });

  const htmlContent = fs.readFileSync(INDEX_HTML_PATH, "utf8");

  // Kiểm tra mount element
  if (htmlContent.includes('id="vno-app-root"')) {
    results.push({ name: "HTML Smoke: Phần tử gốc mount '#vno-app-root' hiện diện trong DOM", pass: true });
  } else {
    results.push({ name: "HTML Smoke: Không tìm thấy phần tử '#vno-app-root' trong index.html", pass: false });
  }

  // Kiểm tra các tệp CSS được link trong index.html
  const cssLinkRegex = /<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["']/gi;
  let cssMatch;
  const linkedCssFiles = [];
  while ((cssMatch = cssLinkRegex.exec(htmlContent)) !== null) {
    linkedCssFiles.push(cssMatch[1]);
  }

  let missingCss = 0;
  for (const cssRel of linkedCssFiles) {
    // Bỏ qua external url nếu có (như google fonts)
    if (cssRel.startsWith("http://") || cssRel.startsWith("https://")) continue;
    const absCssPath = path.resolve(ROOT_DIR, cssRel);
    if (fs.existsSync(absCssPath)) {
      results.push({ name: `HTML Smoke: Stylesheet tham chiếu hợp lệ: ${cssRel}`, pass: true });
    } else {
      missingCss++;
      results.push({ name: `HTML Smoke: Thiếu stylesheet: ${cssRel}`, pass: false });
    }
  }

  // ==========================================
  // 2. Kiểm tra cú pháp inline script trong index.html
  // ==========================================
  const scriptModuleRegex = /<script\s+type=["']module["']>([\s\S]*?)<\/script>/gi;
  const scriptMatch = scriptModuleRegex.exec(htmlContent);

  if (scriptMatch && scriptMatch[1]) {
    const inlineScript = scriptMatch[1];
    const tempDir = path.join(ROOT_DIR, "tests", ".temp");
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    const tempScriptPath = path.join(tempDir, `inline_script_test_${Date.now()}.js`);

    try {
      fs.writeFileSync(tempScriptPath, inlineScript, "utf8");
      const syntaxRes = checkFileSyntax(tempScriptPath);
      if (syntaxRes.pass) {
        results.push({ name: "HTML Smoke: Cú pháp inline module script trong index.html hoàn toàn hợp lệ", pass: true });
      } else {
        results.push({ name: `HTML Smoke: Cú pháp inline script lỗi: ${syntaxRes.error}`, pass: false });
      }
    } finally {
      if (fs.existsSync(tempScriptPath)) {
        try { fs.unlinkSync(tempScriptPath); } catch (_) {}
      }
      if (fs.existsSync(tempDir)) {
        try { fs.rmdirSync(tempDir); } catch (_) {}
      }
    }
  } else {
    results.push({ name: "HTML Smoke: Không tìm thấy khối <script type='module'> trong index.html", pass: false });
  }

  // ==========================================
  // 3. Dynamic Import Node.js Evaluation
  // ==========================================
  try {
    const { WriterApp } = await import("../../apps/writer/writer-app.js");
    if (typeof WriterApp === "function") {
      results.push({ name: "Module Import: apps/writer/writer-app.js nạp và biên dịch thành công (WriterApp class)", pass: true });
    } else {
      results.push({ name: "Module Import: WriterApp không phải là một constructor/class", pass: false });
    }
  } catch (err) {
    results.push({ name: `Module Import: Lỗi nạp apps/writer/writer-app.js: ${err.message}`, pass: false });
  }

  try {
    const { SheetApp } = await import("../../apps/sheet/sheet-app.js");
    if (typeof SheetApp === "function") {
      results.push({ name: "Module Import: apps/sheet/sheet-app.js nạp và biên dịch thành công (SheetApp class)", pass: true });
    } else {
      results.push({ name: "Module Import: SheetApp không phải là một constructor/class", pass: false });
    }
  } catch (err) {
    results.push({ name: `Module Import: Lỗi nạp apps/sheet/sheet-app.js: ${err.message}`, pass: false });
  }

  try {
    const { SlidesApp } = await import("../../apps/slides/slides-app.js");
    if (typeof SlidesApp === "function") {
      results.push({ name: "Module Import: apps/slides/slides-app.js nạp và biên dịch thành công (SlidesApp class)", pass: true });
    } else {
      results.push({ name: "Module Import: SlidesApp không phải là một constructor/class", pass: false });
    }
  } catch (err) {
    results.push({ name: `Module Import: Lỗi nạp apps/slides/slides-app.js: ${err.message}`, pass: false });
  }

  try {
    const { bootstrapPlatform } = await import("../../platform/bootstrap.js");
    if (typeof bootstrapPlatform === "function") {
      results.push({ name: "Module Import: platform/bootstrap.js nạp và biên dịch thành công (bootstrapPlatform function)", pass: true });
    } else {
      results.push({ name: "Module Import: bootstrapPlatform không phải là function", pass: false });
    }
  } catch (err) {
    results.push({ name: `Module Import: Lỗi nạp platform/bootstrap.js: ${err.message}`, pass: false });
  }

  // ==========================================
  // 4. Headless Browser Smoke Test
  // ==========================================
  const browserBinary = findHeadlessBrowser();
  if (browserBinary) {
    const browserName = path.basename(browserBinary);
    const fileUrl = "file:///" + INDEX_HTML_PATH.replace(/\\/g, "/");

    try {
      const proc = spawnSync(browserBinary, [
        "--headless=new",
        "--allow-file-access-from-files",
        "--virtual-time-budget=3000",
        "--dump-dom",
        fileUrl
      ], {
        encoding: "utf8",
        timeout: 15000,
        windowsHide: true
      });

      const renderedDom = proc.stdout || "";
      const hasRoot = renderedDom.includes('id="vno-app-root"');
      const hasShell = renderedDom.includes('vno-shell');
      const hasWriterApp = renderedDom.includes('data-app="writer"');
      const hasRibbon = renderedDom.includes('vno-ribbon');
      const hasTopbar = renderedDom.includes('vno-topbar');
      const hasPage = renderedDom.includes('vno-writer-page');

      if (proc.status === 0 && hasRoot && hasShell && hasWriterApp && hasRibbon && hasTopbar && hasPage) {
        results.push({
          name: `Browser Headless (${browserName}): Nạp index.html, chạy ES modules và mount đầy đủ DOM VN Writer thành công`,
          pass: true
        });
      } else {
        const details = [
          !hasShell && "thiếu .vno-shell",
          !hasWriterApp && "thiếu data-app='writer'",
          !hasRibbon && "thiếu .vno-ribbon",
          !hasTopbar && "thiếu .vno-topbar",
          !hasPage && "thiếu .vno-writer-page"
        ].filter(Boolean).join(", ");

        results.push({
          name: `Browser Headless (${browserName}): Lỗi mount DOM khi nạp index.html (${details || "exit code " + proc.status})`,
          pass: false
        });
      }
    } catch (browserErr) {
      results.push({
        name: `Browser Headless (${browserName}): Ngoại lệ khi thực thi: ${browserErr.message}`,
        pass: false
      });
    }
  } else {
    results.push({
      name: "Browser Headless: Không phát hiện Chrome/Edge trên môi trường máy chủ (bỏ qua bước render DOM thật)",
      pass: true
    });
  }

  return results;
}
