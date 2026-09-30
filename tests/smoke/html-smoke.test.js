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
      const hasHeader = renderedDom.includes('vno-writer-header');
      const hasFooter = renderedDom.includes('vno-writer-footer');
      const hasBody = renderedDom.includes('vno-writer-body');
      const hasStyles = renderedDom.includes('writer.style.gallery');

      if (proc.status === 0 && hasRoot && hasShell && hasWriterApp && hasRibbon && hasTopbar && hasPage && hasHeader && hasFooter && hasBody && hasStyles) {
        results.push({
          name: `Browser Headless (${browserName}): Nạp index.html, mount đầy đủ DOM VN Writer kèm Header/Footer/Styles thành công`,
          pass: true
        });
      } else {
        const details = [
          !hasShell && "thiếu .vno-shell",
          !hasWriterApp && "thiếu data-app='writer'",
          !hasRibbon && "thiếu .vno-ribbon",
          !hasTopbar && "thiếu .vno-topbar",
          !hasPage && "thiếu .vno-writer-page",
          !hasHeader && "thiếu .vno-writer-header",
          !hasFooter && "thiếu .vno-writer-footer",
          !hasBody && "thiếu .vno-writer-body",
          !hasStyles && "thiếu nút writer.style.gallery"
        ].filter(Boolean).join(", ");

        results.push({
          name: `Browser Headless (${browserName}): Lỗi mount DOM khi nạp index.html (${details || "exit code " + proc.status})`,
          pass: false
        });
      }

      const webSwitcherVisible = renderedDom.includes('id="vno-switcher-toggle"') && renderedDom.includes('data-switch="sheet"');
      results.push({
        name: `Browser Headless (${browserName}): Web suite mode vẫn render app switcher đầy đủ`,
        pass: webSwitcherVisible,
        ...(!webSwitcherVisible ? { error: "Không tìm thấy switcher trong web mode mặc định" } : {})
      });

      const sheetProc = spawnSync(browserBinary, [
        "--headless=new",
        "--allow-file-access-from-files",
        "--virtual-time-budget=3000",
        "--dump-dom",
        `${fileUrl}?app=sheet&singleApp=1`
      ], { encoding: "utf8", timeout: 15000, windowsHide: true });
      const sheetDom = sheetProc.stdout || "";
      const sheetSingleAppPassed = sheetProc.status === 0 &&
        sheetDom.includes('data-app="sheet"') &&
        !sheetDom.includes('id="vno-switcher-toggle"') &&
        !sheetDom.includes('class="vno-app-switcher-btn"');
      results.push({
        name: `Browser Headless (${browserName}): ?app=sheet mount Sheet và loại switcher khỏi DOM trong single-app mode`,
        pass: sheetSingleAppPassed,
        ...(!sheetSingleAppPassed ? { error: "Sheet không mount hoặc switcher vẫn còn trong DOM" } : {})
      });

      const tempTrackChangesPath = path.join(ROOT_DIR, "tests", "smoke", "temp-writer-track-changes.html");
      const trackChangesHtml = `<!DOCTYPE html><html><body>
        <div id="page"><div class="vno-writer-body" contenteditable="true">abc</div></div>
        <output id="result"></output>
        <script type="module">
          import { bootstrapPlatform } from "../../platform/bootstrap.js";
          import { globalCommandBus } from "../../platform/commands/command-bus.js";
          import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";
          await bootstrapPlatform();
          const page = document.getElementById("page");
          const body = page.querySelector(".vno-writer-body");
          const adapter = new WriterAdapter(page);
          adapter.attach();
          await globalCommandBus.execute("writer.trackChanges.toggle");
          const select = (start, end) => {
            const range = document.createRange();
            range.setStart(body.firstChild, start);
            range.setEnd(body.firstChild, end);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
          };
          select(3, 3);
          body.dispatchEvent(new InputEvent("beforeinput", { inputType: "insertText", data: "X", bubbles: true, cancelable: true }));
          const insertionMarked = body.querySelector('ins[data-vno-change="insert"]')?.textContent === "X";
          select(1, 2);
          body.dispatchEvent(new InputEvent("beforeinput", { inputType: "deleteContentBackward", bubbles: true, cancelable: true }));
          const deletionMarked = body.querySelector('del[data-vno-change="delete"]')?.textContent === "b";
          const exportClean = adapter._contentForExport();
          const clean = exportClean.includes("acX") && !exportClean.includes("data-vno-change") && !exportClean.includes("<del");
          await globalCommandBus.execute("writer.trackChanges.acceptAll");
          const accepted = body.textContent === "acX" && !body.querySelector("[data-vno-change]");
          body.textContent = "abc";
          select(3, 3);
          body.dispatchEvent(new InputEvent("beforeinput", { inputType: "insertText", data: "X", bubbles: true, cancelable: true }));
          select(1, 2);
          body.dispatchEvent(new InputEvent("beforeinput", { inputType: "deleteContentBackward", bubbles: true, cancelable: true }));
          await globalCommandBus.execute("writer.trackChanges.rejectAll");
          const rejected = body.textContent === "abc" && !body.querySelector("[data-vno-change]");
          document.getElementById("result").dataset.pass = String(insertionMarked && deletionMarked && clean && accepted && rejected);
        </script></body></html>`;
      try {
        fs.writeFileSync(tempTrackChangesPath, trackChangesHtml, "utf8");
        const trackChangesProc = spawnSync(browserBinary, [
          "--headless=new", "--allow-file-access-from-files", "--virtual-time-budget=3000", "--dump-dom",
          "file:///" + tempTrackChangesPath.replace(/\\/g, "/")
        ], { encoding: "utf8", timeout: 15000, windowsHide: true });
        const passed = trackChangesProc.status === 0 && (trackChangesProc.stdout || "").includes('data-pass="true"');
        results.push({
          name: `Browser Headless (${browserName}): Track Changes gõ/xóa + Accept All/Reject All + export sạch`,
          pass: passed,
          ...(!passed ? { error: "Không đạt luồng DOM contenteditable thật" } : {})
        });
      } finally {
        if (fs.existsSync(tempTrackChangesPath)) {
          try { fs.unlinkSync(tempTrackChangesPath); } catch (_) {}
        }
      }

      // ==========================================
      // 4b. Smoke test render VN Slides thật qua Browser Headless
      // ==========================================
      const tempSlidesHtmlPath = path.join(ROOT_DIR, "tests", "smoke", "temp-slides-browser.html");
      const slidesHtmlContent = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <link rel="stylesheet" href="../../platform/theme/tokens.css">
  <link rel="stylesheet" href="../../platform/ui-kit/ui-kit.css">
  <link rel="stylesheet" href="../../platform/ribbon/ribbon.css">
  <link rel="stylesheet" href="../../platform/shell/shell.css">
  <link rel="stylesheet" href="../../apps/slides/slides.css">
</head>
<body>
  <div id="vno-app-root"></div>
  <script type="module">
    import { SlidesApp } from "../../apps/slides/slides-app.js";
    import { themeManager } from "../../platform/theme/theme-manager.js";
    import { bootstrapPlatform } from "../../platform/bootstrap.js";

    await bootstrapPlatform();
    themeManager.setApp("slides");
    const app = new SlidesApp(document.getElementById("vno-app-root"));
    await app.init();
  </script>
</body>
</html>`;

      try {
        fs.writeFileSync(tempSlidesHtmlPath, slidesHtmlContent.replace(
          "await app.init();",
          "await app.init(); app.shell.ribbonHost.selectTab('view'); await app.adapter.handleDispatch('.uno:DiaMode', null, 'slides.view.slideSorter'); app.shell.ribbonHost.selectTab('slideshow');"
        ), "utf8");
        const slidesFileUrl = "file:///" + tempSlidesHtmlPath.replace(/\\/g, "/");

        const slidesProc = spawnSync(browserBinary, [
          "--headless=new",
          "--allow-file-access-from-files",
          "--virtual-time-budget=3000",
          "--dump-dom",
          slidesFileUrl
        ], {
          encoding: "utf8",
          timeout: 15000,
          windowsHide: true
        });

        const slidesDom = slidesProc.stdout || "";
        const hasStudio = slidesDom.includes("vno-slides-studio");
        const hasNav = slidesDom.includes("vno-slide-navigator");
        const hasCanvas = slidesDom.includes("vno-slide-canvas");
        const hasNotes = slidesDom.includes("vno-slide-notes-panel");
        const hasNotesBar = slidesDom.includes("vno-slide-notes-bar");
        const hasAnimTab = slidesDom.includes("Hoạt hình") || slidesDom.includes("Animations");
        const hasShowTab = slidesDom.includes("Trình chiếu");
        const hasPresenterBtn = slidesDom.includes("slides.show.presenterMode");
        const hasNotesToggleBtn = slidesDom.includes("slides.notes.toggle");
        const hasViewTab = slidesDom.includes("Chế độ xem") || slidesDom.includes("View");
        const hasSorter = slidesDom.includes("vno-slide-sorter-overlay");
        const sorterThumbCount = (slidesDom.match(/class="vno-slide-sorter-item/g) || []).length;

        const hasEmptyPlaceholders = slidesDom.includes('data-placeholder="Bấm để thêm tiêu đề"') && slidesDom.includes('data-placeholder="Bấm để thêm văn bản"');
        const hasNoSampleSlideText = !slidesDom.includes("VN OFFICE — BỘ ỨNG DỤNG VĂN PHÒNG VIỆT")
          && !slidesDom.includes("KIẾN TRÚC HỆ THỐNG PHÂN TẦNG")
          && !slidesDom.includes("KẾ HOẠCH TRIỂN KHAI & TIÊU CHUẨN KỸ THUẬT");

        if (slidesProc.status === 0 && hasStudio && hasNav && hasCanvas && hasNotes && hasNotesBar && hasAnimTab && hasShowTab && hasPresenterBtn && hasNotesToggleBtn && hasViewTab && hasSorter && sorterThumbCount === 1 && hasEmptyPlaceholders && hasNoSampleSlideText) {
          results.push({
            name: `Browser Headless (${browserName}): VN Slides mở bằng một slide trống và Slide Sorter chỉ có một thumbnail`,
            pass: true
          });
        } else {
          const missing = [
            !hasStudio && "thiếu .vno-slides-studio",
            !hasNav && "thiếu .vno-slide-navigator",
            !hasCanvas && "thiếu .vno-slide-canvas",
            !hasNotes && "thiếu .vno-slide-notes-panel",
            !hasNotesBar && "thiếu .vno-slide-notes-bar",
            !hasAnimTab && "thiếu tab Hoạt hình",
            !hasShowTab && "thiếu tab Trình chiếu",
            !hasPresenterBtn && "thiếu command slides.show.presenterMode",
            !hasNotesToggleBtn && "thiếu command slides.notes.toggle",
            !hasViewTab && "thiếu tab Chế độ xem",
            !hasSorter && "thiếu .vno-slide-sorter-overlay",
            sorterThumbCount !== 1 && `Slide Sorter có ${sorterThumbCount}/1 thumbnail`,
            !hasEmptyPlaceholders && "thiếu gợi ý nhập tiêu đề/văn bản cho slide trống",
            !hasNoSampleSlideText && "slide mới còn nội dung mẫu thật"
          ].filter(Boolean).join(", ");

          results.push({
            name: `Browser Headless (${browserName}): Lỗi render DOM VN Slides (${missing || "exit code " + slidesProc.status})`,
            pass: false
          });
        }
      } finally {
        if (fs.existsSync(tempSlidesHtmlPath)) {
          try { fs.unlinkSync(tempSlidesHtmlPath); } catch (_) {}
        }
      }

      // ==========================================
      // 4c. Smoke test mở Print Preview VN Writer thật qua Browser Headless
      // ==========================================
      const tempPreviewHtmlPath = path.join(ROOT_DIR, "tests", "smoke", "temp-writer-preview-browser.html");
      const previewHtmlContent = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <link rel="stylesheet" href="../../platform/theme/tokens.css">
  <link rel="stylesheet" href="../../platform/ui-kit/ui-kit.css">
  <link rel="stylesheet" href="../../platform/ribbon/ribbon.css">
  <link rel="stylesheet" href="../../platform/shell/shell.css">
  <link rel="stylesheet" href="../../apps/writer/writer.css">
</head>
<body>
  <div id="vno-app-root"></div>
  <script type="module">
    import { WriterApp } from "../../apps/writer/writer-app.js";
    import { themeManager } from "../../platform/theme/theme-manager.js";
    import { bootstrapPlatform } from "../../platform/bootstrap.js";

    await bootstrapPlatform();
    themeManager.setApp("writer");
    const app = new WriterApp(document.getElementById("vno-app-root"));
    await app.init();

    // Chuyển sang Letter Landscape và mở Print Preview
    app.adapter.pageSetup = {
      size: "letter",
      orientation: "landscape",
      margins: { top: 15, bottom: 15, left: 20, right: 20 }
    };
    app.adapter.openPrintPreview();
  </script>
</body>
</html>`;

      try {
        fs.writeFileSync(tempPreviewHtmlPath, previewHtmlContent, "utf8");
        const previewUrl = "file:///" + tempPreviewHtmlPath.replace(/\\/g, "/");

        const previewProc = spawnSync(browserBinary, [
          "--headless=new",
          "--allow-file-access-from-files",
          "--virtual-time-budget=3000",
          "--dump-dom",
          previewUrl
        ], {
          encoding: "utf8",
          timeout: 15000,
          windowsHide: true
        });

        const previewDom = previewProc.stdout || "";
        const hasOverlay = previewDom.includes("vno-print-preview-overlay");
        const hasLetter = previewDom.includes('data-paper-size="letter"');
        const hasLandscape = previewDom.includes('data-paper-orientation="landscape"');
        const hasToolbar = previewDom.includes("vno-print-preview-toolbar");
        const hasSheet = previewDom.includes("vno-print-preview-sheet");
        const hasPrintBtn = previewDom.includes("vno-print-preview-btn-print");
        const hasPageInput = previewDom.includes("vno-print-preview-page-input");

        if (previewProc.status === 0 && hasOverlay && hasLetter && hasLandscape && hasToolbar && hasSheet && hasPrintBtn && hasPageInput) {
          results.push({
            name: `Browser Headless (${browserName}): Mở Print Preview VN Writer, render chính xác khổ Letter Landscape thật thành công`,
            pass: true
          });
        } else {
          const missing = [
            !hasOverlay && "thiếu .vno-print-preview-overlay",
            !hasLetter && "thiếu data-paper-size='letter'",
            !hasLandscape && "thiếu data-paper-orientation='landscape'",
            !hasToolbar && "thiếu .vno-print-preview-toolbar",
            !hasSheet && "thiếu .vno-print-preview-sheet",
            !hasPrintBtn && "thiếu nút in .vno-print-preview-btn-print",
            !hasPageInput && "thiếu input số trang .vno-print-preview-page-input"
          ].filter(Boolean).join(", ");

          results.push({
            name: `Browser Headless (${browserName}): Lỗi render Print Preview VN Writer (${missing || "exit code " + previewProc.status})`,
            pass: false
          });
        }
      } finally {
        if (fs.existsSync(tempPreviewHtmlPath)) {
          try { fs.unlinkSync(tempPreviewHtmlPath); } catch (_) {}
        }
      }

      // ==========================================
      // 4d. Smoke test VN Slides Layout switching & DOM mutation qua Browser Headless
      // ==========================================
      const tempLayoutHtmlPath = path.join(ROOT_DIR, "tests", "smoke", "temp-slides-layout-browser.html");
      const layoutHtmlContent = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <link rel="stylesheet" href="../../platform/theme/tokens.css">
  <link rel="stylesheet" href="../../platform/ui-kit/ui-kit.css">
  <link rel="stylesheet" href="../../platform/ribbon/ribbon.css">
  <link rel="stylesheet" href="../../platform/shell/shell.css">
  <link rel="stylesheet" href="../../apps/slides/slides.css">
</head>
<body>
  <div id="vno-app-root"></div>
  <output id="layout-result"></output>
  <script type="module">
    import { SlidesApp } from "../../apps/slides/slides-app.js";
    import { themeManager } from "../../platform/theme/theme-manager.js";
    import { bootstrapPlatform } from "../../platform/bootstrap.js";

    await bootstrapPlatform();
    themeManager.setApp("slides");
    const app = new SlidesApp(document.getElementById("vno-app-root"));
    await app.init();

    const canvas = app.canvasController;
    const resEl = document.getElementById("layout-result");

    try {
      // 1. Verify default layout
      const defaultLayout = canvas.getSlideLayout();

      // 2. Switch to two-content & type into body2
      canvas.applySlideLayout("two-content");
      const twoColPassed = canvas.getSlideLayout() === "two-content" &&
        canvas.canvasEl.getAttribute("data-layout") === "two-content" &&
        Boolean(canvas.body2El && canvas.body2El.style.display !== "none");

      if (twoColPassed) {
        canvas.body2El.textContent = "Nội dung cột 2 headless test";
        canvas.body2El.dispatchEvent(new Event("input", { bubbles: true }));
      }

      // 3. Add slide 2 and set to title-only
      canvas.addNewSlide();
      canvas.applySlideLayout("title-only");
      const titleOnlyPassed = canvas.getSlideLayout() === "title-only" &&
        canvas.titleEl.classList.contains("is-title-only") &&
        canvas.bodyRowEl.style.display === "none";

      // 4. Add slide 3 and set to blank
      canvas.addNewSlide();
      canvas.applySlideLayout("blank");
      const blankPassed = canvas.getSlideLayout() === "blank" &&
        canvas.titleEl.style.display === "none" &&
        canvas.bodyRowEl.style.display === "none";

      // 5. Switch back to slide 1 and verify data isolation
      canvas.selectSlide(0);
      const isolationPassed = canvas.getSlideLayout() === "two-content" &&
        canvas.body2El.textContent.includes("Nội dung cột 2 headless test") &&
        canvas.titleEl.style.display !== "none" &&
        canvas.bodyRowEl.style.display !== "none";

      const allPassed = defaultLayout === "title-content" && twoColPassed && titleOnlyPassed && blankPassed && isolationPassed;
      resEl.dataset.pass = String(allPassed);
      resEl.dataset.details = JSON.stringify({ defaultLayout, twoColPassed, titleOnlyPassed, blankPassed, isolationPassed });
    } catch (err) {
      resEl.dataset.pass = "false";
      resEl.dataset.error = err.message;
    }
  </script>
</body>
</html>`;

      try {
        fs.writeFileSync(tempLayoutHtmlPath, layoutHtmlContent, "utf8");
        const layoutFileUrl = "file:///" + tempLayoutHtmlPath.replace(/\\/g, "/");

        const layoutProc = spawnSync(browserBinary, [
          "--headless=new",
          "--allow-file-access-from-files",
          "--virtual-time-budget=3000",
          "--dump-dom",
          layoutFileUrl
        ], {
          encoding: "utf8",
          timeout: 15000,
          windowsHide: true
        });

        const layoutDom = layoutProc.stdout || "";
        const hasPassedAttr = layoutDom.includes('data-pass="true"');
        const hasLayoutBtn = layoutDom.includes("slides.layout.apply");
        const hasTwoColDom = layoutDom.includes("vno-slide-body-col2") || layoutDom.includes("vno-slide-body-col-2");
        const hasLayoutAttr = layoutDom.includes('data-layout="two-content"');

        if (layoutProc.status === 0 && hasPassedAttr && hasLayoutBtn && hasTwoColDom && hasLayoutAttr) {
          results.push({
            name: `Browser Headless (${browserName}): Chuyển đổi 4 Slide Layouts, cột đôi body2 & cô lập dữ liệu DOM thật thành công`,
            pass: true
          });
        } else {
          const missing = [
            !hasPassedAttr && "kiểm tra logic nội bộ DOM data-pass=false",
            !hasLayoutBtn && "thiếu command slides.layout.apply trên Ribbon",
            !hasTwoColDom && "thiếu DOM element .vno-slide-body-col-2",
            !hasLayoutAttr && "thiếu data-layout='two-content'"
          ].filter(Boolean).join(", ");

          results.push({
            name: `Browser Headless (${browserName}): Lỗi kiểm thử Slide Layouts (${missing || "exit code " + layoutProc.status})`,
            pass: false
          });
        }
      } finally {
        if (fs.existsSync(tempLayoutHtmlPath)) {
          try { fs.unlinkSync(tempLayoutHtmlPath); } catch (_) {}
        }
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
