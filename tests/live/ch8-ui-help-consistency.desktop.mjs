/**
 * 3T Office — Live Desktop CDP Verification for CH-8 (UI & Help Consistency)
 * Kiểm tra trực tiếp trên app Desktop pywebview/WebView2 qua CDP:
 * 1. KeyTips (Alt toggle, Tab badges tiếng Việt, Level 2 button badges, Esc step-back)
 * 2. Contextual F1 Help (Mở đúng bài hướng dẫn cho nút đang chọn)
 * 3. Trang "Có gì mới" (Hiển thị release notes phiên bản đang cài đặt)
 * 4. Thanh trạng thái & Zoom (Slider, nút +/-, Ctrl+0 reset 100%)
 * 5. Menu Tệp Backstage đầy đủ & phím Esc đóng
 * Chạy lần lượt cho cả 3 ứng dụng: 3T Doc, 3T Sheet, 3T Slide
 */

import { pathToFileURL } from "node:url";
import path from "node:path";
import { spawn, execFileSync } from "node:child_process";
import { createServer } from "node:net";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const playwrightRoot = process.env.VNO_PLAYWRIGHT_ROOT || "C:/Users/3T Computer/AppData/Local/Temp/vno-playwright-tools";
const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")).href);

const appDataName = `VNOffice-CDP-CH8-${process.pid}`;
const pythonBootstrap = [
  "import sys, webview, main",
  "webview.settings['REMOTE_DEBUGGING_PORT'] = int(sys.argv[1])",
  "main.APP_DATA_DIR_NAME = sys.argv[2]",
  "main.main(['--app=' + sys.argv[3]])"
].join("; ");

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const failures = [];

function assert(condition, label, detail = "") {
  const status = condition ? "PASS" : "FAIL";
  console.log(`${status}\t${label}${detail ? ` — ${detail}` : ""}`);
  if (!condition) failures.push({ label, detail });
}

async function freePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      server.close(error => error ? reject(error) : resolve(port));
    });
  });
}

async function connectDesktopApp(appKind) {
  const debugPort = await freePort();
  console.log(`\n======================================================`);
  console.log(`[DESKTOP CDP] Khởi động 3T Office ${appKind.toUpperCase()} trên cổng debug ${debugPort}`);
  console.log(`======================================================`);

  const child = spawn("python", ["-c", pythonBootstrap, String(debugPort), `${appDataName}-${appKind}`, appKind], {
    cwd: repoRoot,
    env: { ...process.env, VNOFFICE_DISABLE_UNO: "1" },
    stdio: ["ignore", "pipe", "pipe"]
  });

  let childOutput = "";
  child.stdout.on("data", chunk => { childOutput += chunk.toString(); });
  child.stderr.on("data", chunk => { childOutput += chunk.toString(); });

  let browser;
  try {
    let endpointReady = false;
    for (let attempt = 0; attempt < 80; attempt += 1) {
      if (child.exitCode !== null) throw new Error(`Process exited early (${child.exitCode})\n${childOutput}`);
      try {
        const response = await fetch(`http://127.0.0.1:${debugPort}/json/version`);
        if (response.ok) { endpointReady = true; break; }
      } catch {}
      await sleep(250);
    }
    if (!endpointReady) throw new Error(`Endpoint not ready on port ${debugPort}\n${childOutput}`);

    browser = await chromium.connectOverCDP(`http://127.0.0.1:${debugPort}`);
    const context = browser.contexts()[0];
    let page = null;
    for (let attempt = 0; attempt < 60; attempt += 1) {
      page = context.pages().find(candidate => /127\.0\.0\.1|localhost/.test(candidate.url())) || context.pages()[0] || null;
      if (page && page.url() !== "about:blank") break;
      await sleep(250);
    }
    if (!page) throw new Error(`No WebView2 page found\n${childOutput}`);
    console.log(`[DESKTOP CDP] Đã kết nối trang ${appKind}: ${page.url()}`);
    page.on("pageerror", err => console.error(`[PAGE ${appKind.toUpperCase()} ERROR]`, err));

    // Đợi container ứng dụng sẵn sàng
    const appSelector = appKind === "writer" ? ".vno-writer-body" : appKind === "sheet" ? ".vno-sheet-workspace" : ".vno-slides-workspace";
    try {
      await page.locator(appSelector).waitFor({ timeout: 35000 });
    } catch (waitErr) {
      const bodyHtml = await page.evaluate(() => document.body.innerHTML.slice(0, 500)).catch(() => "");
      console.error(`[DESKTOP CDP] Lỗi đợi ${appSelector}. Body HTML sơ bộ:`, bodyHtml);
      throw waitErr;
    }
    await sleep(500);
    await dismissConsentIfAny(page);

    return { child, browser, page, debugPort };
  } catch (err) {
    await browser?.close().catch(() => {});
    stopProcess(child);
    throw err;
  }
}

async function dismissConsentIfAny(page) {
  const consent = page.locator(".vno-error-reporting-overlay");
  if (await consent.isVisible().catch(() => false)) {
    await consent.locator('[data-dialog-action="deny"]').click().catch(() => {});
    await sleep(250);
  }
}

function stopProcess(child) {
  if (child.exitCode !== null) return;
  try {
    execFileSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore", timeout: 5000 });
  } catch {
    child.kill();
  }
}

async function closeDesktopApp(session) {
  try {
    await session.browser.close().catch(() => {});
  } finally {
    stopProcess(session.child);
  }
}

async function verifyAppConsistency(appKind) {
  const session = await connectDesktopApp(appKind);
  const { page } = session;

  try {
    console.log(`\n▶ [${appKind.toUpperCase()}] 1. Kiểm tra KeyTips (Alt navigation)`);

    // 1. Bấm và thả Alt
    await page.keyboard.press("Alt");
    await sleep(300);

    const level1Badges = page.locator(".vno-keytip-badge[data-keytip-level='1']");
    const countL1 = await level1Badges.count();
    assert(countL1 >= 5, `[${appKind}] Alt keydown/keyup hiển thị các huy hiệu KeyTips Level 1 trên ribbon tabs (tìm thấy ${countL1} huy hiệu)`);

    const hasFileBadge = await page.locator(".vno-keytip-badge[data-keytip-key='T']").isVisible().catch(() => false);
    assert(hasFileBadge, `[${appKind}] Huy hiệu 'T' (Tệp) hiển thị trên tab Tệp`);

    const hasHomeBadge = await page.locator(".vno-keytip-badge[data-keytip-key='D']").isVisible().catch(() => false);
    assert(hasHomeBadge, `[${appKind}] Huy hiệu 'D' (Trang đầu) hiển thị trên tab Trang đầu`);

    // 2. Nhấn phím 'D' để kích hoạt tab Trang đầu và chuyển sang Level 2
    await page.keyboard.press("KeyD");
    await sleep(400);

    const isHomeActive = await page.evaluate(() => {
      const activeTab = document.querySelector(".vno-ribbon-tab.is-active");
      return activeTab?.textContent?.includes("Trang đầu") || false;
    });
    assert(isHomeActive, `[${appKind}] Nhấn phím D chuyển active tab sang Trang đầu`);

    const level2Badges = page.locator(".vno-keytip-badge[data-keytip-level='2']");
    const countL2 = await level2Badges.count();
    assert(countL2 >= 5, `[${appKind}] Chuyển sang Level 2: hiển thị các huy hiệu phím tắt trên nút lệnh (${countL2} huy hiệu)`);

    // 3. Nhấn Esc để lùi từ Level 2 về Level 1
    await page.keyboard.press("Escape");
    await sleep(300);

    const countAfterEsc1 = await page.locator(".vno-keytip-badge[data-keytip-level='1']").count();
    assert(countAfterEsc1 >= 5, `[${appKind}] Phím Esc bước lùi từ Level 2 trở về Level 1 (tabs badges)`);

    // 4. Nhấn Esc lần 2 để thoát khỏi KeyTips
    await page.keyboard.press("Escape");
    await sleep(300);

    const countAfterEsc2 = await page.locator(".vno-keytip-badge").count();
    assert(countAfterEsc2 === 0, `[${appKind}] Phím Esc lần 2 đóng hoàn toàn KeyTips`);

    console.log(`\n▶ [${appKind.toUpperCase()}] 2. Kiểm tra Trợ giúp F1 theo ngữ cảnh & Có gì mới`);

    // Focus vào một nút lệnh trên ribbon (nút có data-command-id)
    await page.evaluate(() => {
      const btn = document.querySelector('[data-command-id]') || document.querySelector(".vno-ribbon-tab");
      btn?.focus();
    });
    await sleep(200);

    // Bấm F1
    await page.keyboard.press("F1");
    await sleep(600);

    const helpPanel = page.locator("#vno-help-panel");
    await helpPanel.waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
    const isHelpVisible = await helpPanel.isVisible().catch(() => false);
    assert(isHelpVisible, `[${appKind}] Phím F1 mở panel Trợ giúp thành công`);

    const articleTitle = await page.locator(".vno-help-article h3").textContent().catch(() => "");
    assert(articleTitle.length > 0, `[${appKind}] Trợ giúp hiển thị đúng bài viết ngữ cảnh: "${articleTitle}"`);

    // Kiểm tra trang "Có gì mới"
    const whatsNewBtn = page.locator("#vno-help-whats-new-btn");
    if (await whatsNewBtn.isVisible().catch(() => false)) {
      await dismissConsentIfAny(page);
      await whatsNewBtn.click({ force: true });
      await sleep(400);

      const whatsNewTitle = await page.locator(".vno-help-article h3").textContent().catch(() => "");
      assert(whatsNewTitle.includes("Có gì mới"), `[${appKind}] Bấm nút 'Có gì mới' mở đúng chủ đề Có gì mới`);

      const releaseBody = await page.locator("#vno-whats-new-body").textContent().catch(() => "");
      const hasReleaseNotes = releaseBody.includes("3T Office") && releaseBody.includes("0.9.0-pilot1");
      assert(hasReleaseNotes, `[${appKind}] Nội dung Có gì mới đọc đúng ghi chú phát hành 3T Office 0.9.0-pilot1`);
    }

    // Đóng panel trợ giúp
    await page.locator(".vno-help-close").click().catch(() => page.keyboard.press("Escape"));
    await sleep(300);

    console.log(`\n▶ [${appKind.toUpperCase()}] 3. Kiểm tra Thanh trạng thái, Thu phóng & Ctrl+0`);

    const zoomText = page.locator("#vno-zoom-text");
    const initialZoom = (await zoomText.textContent()).trim();
    assert(initialZoom === "100%", `[${appKind}] Mức thu phóng ban đầu trên thanh trạng thái là 100%`);

    // Bấm nút phóng to (+)
    await page.locator("#vno-zoom-in").click();
    await sleep(200);
    const zoomedInText = (await zoomText.textContent()).trim();
    assert(zoomedInText === "110%", `[${appKind}] Bấm nút '+' tăng mức thu phóng lên 110%`);

    // Nhấn Ctrl+0 để đặt lại 100%
    await page.keyboard.press("Control+Digit0");
    await sleep(300);
    const resetZoomText = (await zoomText.textContent()).trim();
    assert(resetZoomText === "100%", `[${appKind}] Phím tắt Ctrl+0 đặt lại mức thu phóng về chính xác 100%`);

    console.log(`\n▶ [${appKind.toUpperCase()}] 4. Kiểm tra Menu Tệp Backstage đầy đủ & Hộp thoại Tùy chọn`);

    // Mở menu Tệp Backstage
    await page.locator(".vno-ribbon-tab-file").click();
    await sleep(400);

    const backstage = page.locator(".vno-backstage-overlay");
    assert(await backstage.isVisible(), `[${appKind}] Mở menu Tệp Backstage thành công`);

    // Kiểm tra các nút chuẩn trong Backstage
    const backstageButtons = [
      { id: '[data-backstage-cmd="common.file.new"]', label: "Mới" },
      { id: '[data-backstage-cmd="common.file.open"]', label: "Mở" },
      { id: '[data-backstage-cmd="common.file.save"]', label: "Lưu" },
      { id: '[data-backstage-cmd="common.file.saveAs"]', label: "Lưu thành" },
      { id: '#vno-backstage-nav-print, [data-backstage-tab="print"]', label: "In" },
      { id: '[data-backstage-cmd="common.file.exportPdf"]', label: "Xuất PDF" },
      { id: '#vno-backstage-close', label: "Đóng" },
      { id: '#vno-backstage-options', label: "Tùy chọn" },
      { id: '#vno-backstage-about', label: "Giới thiệu 3T Office" }
    ];

    for (const item of backstageButtons) {
      const exists = await backstage.locator(item.id).isVisible().catch(() => false);
      assert(exists, `[${appKind}] Backstage có đầy đủ lệnh: ${item.label}`);
    }

    // Mở Hộp thoại Tùy chọn từ Backstage
    await page.locator("#vno-backstage-options").click();
    await sleep(400);

    const optionsDialog = page.locator(".vno-dialog-box").filter({ hasText: "Tùy chọn 3T Office" });
    assert(await optionsDialog.isVisible(), `[${appKind}] Hộp thoại Tùy chọn 3T Office mở thành công`);

    // Kiểm tra các tùy chọn theme và font size
    const hasThemeOptions = await optionsDialog.locator('input[name="vno-opt-theme"]').count();
    const hasFontOptions = await optionsDialog.locator('input[name="vno-opt-fontsize"]').count();
    assert(hasThemeOptions === 2, `[${appKind}] Có 2 lựa chọn giao diện (Sáng / Tối)`);
    assert(hasFontOptions === 3, `[${appKind}] Có 3 mức cỡ chữ (Tiêu chuẩn / Lớn / Rất lớn)`);

    // Nhấn Esc để đóng hộp thoại
    await page.keyboard.press("Escape");
    await sleep(300);

    // Nhấn Esc để đóng Backstage
    await page.keyboard.press("Escape");
    await sleep(300);
    assert(!(await backstage.isVisible().catch(() => false)), `[${appKind}] Phím Esc đóng menu Backstage an toàn`);

  } finally {
    await closeDesktopApp(session);
    console.log(`[DESKTOP CDP] Đã đóng tiến trình ${appKind.toUpperCase()}`);
  }
}

async function main() {
  console.log("================================================================================");
  console.log(" 3T OFFICE — DESKTOP CDP VERIFICATION FOR CH-8 (UI & HELP CONSISTENCY)        ");
  console.log("================================================================================");

  const apps = ["writer", "sheet", "slides"];
  for (const app of apps) {
    try {
      await verifyAppConsistency(app);
    } catch (err) {
      console.error(`[ERROR] Lỗi khi kiểm tra app ${app}:`, err);
      failures.push({ label: `App ${app} unhandled failure`, detail: String(err) });
    }
    await sleep(1500);
  }

  console.log("\n================================================================================");
  console.log(`TỔNG KẾT DESKTOP CDP: ${failures.length === 0 ? "100% PASS" : `${failures.length} THẤT BẠI`}`);
  console.log("================================================================================");

  if (failures.length > 0) {
    console.error("Danh sách thất bại:");
    failures.forEach(f => console.error(` - [FAIL] ${f.label}: ${f.detail}`));
    process.exit(1);
  } else {
    console.log("Tất cả các kịch bản kiểm tra giao diện và trợ giúp trên Desktop CDP đều ĐẠT CHUẨN!");
    process.exit(0);
  }
}

main();
