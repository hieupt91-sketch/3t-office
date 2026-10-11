import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const serverPort = 8855;
const cdpPort = 9225;
const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

const outDir = path.join(root, "docs", "screenshots", "ui-p1");
fs.mkdirSync(outDir, { recursive: true });

const mime = {
  ".html": "text/html; charset=UTF-8",
  ".js": "text/javascript; charset=UTF-8",
  ".css": "text/css; charset=UTF-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".json": "application/json"
};

// 1. Static HTTP Server
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(req.url.split("?")[0]);
  const requestPath = pathname === "/" ? "/index.html" : pathname;
  const file = path.join(root, path.normalize(requestPath).replace(/^[/\\]+/, ""));
  if (!file.startsWith(root) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    return res.writeHead(404).end("Not Found");
  }
  res.writeHead(200, { "Content-Type": mime[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});

await new Promise((resolve) => server.listen(serverPort, "127.0.0.1", resolve));

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class CdpSession {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.msgId = 0;
    this.callbacks = new Map();
    this.ready = new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });
    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.callbacks.has(msg.id)) {
        const { resolve, reject } = this.callbacks.get(msg.id);
        this.callbacks.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message || JSON.stringify(msg.error)));
        else resolve(msg.result);
      }
    };
  }

  async send(method, params = {}) {
    await this.ready;
    const id = ++this.msgId;
    return new Promise((resolve, reject) => {
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expr) {
    const res = await this.send("Runtime.evaluate", {
      expression: expr,
      returnByValue: true,
      awaitPromise: true
    });
    if (res.exceptionDetails) {
      throw new Error("Evaluation error: " + JSON.stringify(res.exceptionDetails));
    }
    return res.result?.value;
  }

  async screenshot(filePath) {
    const res = await this.send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(filePath, Buffer.from(res.data, "base64"));
  }

  async setViewport(width, height) {
    await this.send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: false
    });
    await this.send("Emulation.setVisibleSize", { width, height });
  }

  close() {
    this.ws.close();
  }
}

async function connectCdp(port) {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json`);
      const list = await res.json();
      const page = list.find((item) => item.type === "page" && item.webSocketDebuggerUrl);
      if (page) {
        const session = new CdpSession(page.webSocketDebuggerUrl);
        await session.ready;
        await session.send("Page.enable");
        await session.send("Runtime.enable");
        await session.send("DOM.enable");
        return session;
      }
    } catch (_) {}
    await sleep(300);
  }
  throw new Error("Không thể kết nối CDP sau 30 lần thử");
}

const evidence = [];
function record(pass, name, details = "") {
  const status = pass ? "PASS" : "FAIL";
  console.log(`[${status}] ${name}${details ? ` — ${details}` : ""}`);
  evidence.push({ pass, name, details });
}

let edgeProcess = null;
const tmpUserDir = path.join(os.tmpdir(), "vno-cdp-" + Date.now());

try {
  console.log(`[CDP] Khởi chạy Edge với remote debugging port=${cdpPort}...`);
  edgeProcess = spawn(edgePath, [
    "--headless=new",
    `--remote-debugging-port=${cdpPort}`,
    "--window-size=1366,768",
    `--user-data-dir=${tmpUserDir}`,
    "--disable-background-networking",
    "--disable-default-apps",
    "--no-first-run",
    `http://127.0.0.1:${serverPort}/?app=writer`
  ], { stdio: "ignore" });

  console.log(`[CDP] Edge PID: ${edgeProcess.pid}`);
  const cdp = await connectCdp(cdpPort);
  await sleep(1000);

  async function openHelp(session, appKind) {
    await session.eval(`(async () => {
      const helpTab = document.querySelector("#vno-ribbon-tab-help");
      if (helpTab) {
        helpTab.click();
        await new Promise((r) => setTimeout(r, 150));
        const btn = document.querySelector('[data-command-id="${appKind}.help.open"]') ||
                    document.querySelector('[data-cmd="${appKind}.help.open"]');
        if (btn) { btn.click(); return; }
      }
      const panel = await window.__vnoAppInstance._ensureHelpPanel();
      panel.open();
    })()`);
    await sleep(600);
  }

  // Wait for document body to be ready
  for (let i = 0; i < 30; i++) {
    const ready = await cdp.eval(`Boolean(document.querySelector(".vno-writer-body"))`);
    if (ready) break;
    await sleep(200);
  }

  // ==========================================
  // CA 1: WRITER 1366x768 - GIAO DIỆN SÁNG
  // ==========================================
  console.log("\n==========================================");
  console.log("CA 1: WRITER 1366x768 — GIAO DIỆN SÁNG");
  console.log("==========================================");
  await cdp.setViewport(1366, 768);
  await sleep(400);

  // 1. Đo kích thước ban đầu (baseline)
  const base1366 = await cdp.eval(`(() => {
    const body = document.querySelector(".vno-writer-body").getBoundingClientRect();
    const ribbon = document.querySelector(".vno-ribbon").getBoundingClientRect();
    const viewport = document.querySelector(".vno-writer-viewport");
    const container = document.querySelector(".vno-editor-container");
    return {
      bodyW: Math.round(body.width * 10) / 10,
      bodyH: Math.round(body.height * 10) / 10,
      bodyX: Math.round(body.x * 10) / 10,
      bodyY: Math.round(body.y * 10) / 10,
      ribbonW: Math.round(ribbon.width * 10) / 10,
      ribbonH: Math.round(ribbon.height * 10) / 10,
      hasHorizScroll: viewport.scrollWidth > viewport.clientWidth || container.scrollWidth > container.clientWidth
    };
  })()`);
  console.log("Base 1366x768:", JSON.stringify(base1366));

  // 2. Mở panel Trợ lý 3T AI
  await cdp.eval(`document.querySelector("#vno-toggle-ai-btn").click()`);
  await sleep(400);

  const ai1366 = await cdp.eval(`(() => {
    const body = document.querySelector(".vno-writer-body").getBoundingClientRect();
    const ribbon = document.querySelector(".vno-ribbon").getBoundingClientRect();
    const viewport = document.querySelector(".vno-writer-viewport");
    const container = document.querySelector(".vno-editor-container");
    const ai = document.querySelector(".vno-ai-sidebar").getBoundingClientRect();
    const topbar = document.querySelector(".vno-topbar").getBoundingClientRect();
    const statusbar = document.querySelector(".vno-statusbar").getBoundingClientRect();
    const isAiHidden = document.querySelector(".vno-ai-sidebar").classList.contains("is-hidden");
    const help = document.getElementById("vno-help-panel");
    const isHelpHidden = help ? help.hidden : true;

    return {
      bodyW: Math.round(body.width * 10) / 10,
      bodyH: Math.round(body.height * 10) / 10,
      bodyX: Math.round(body.x * 10) / 10,
      bodyY: Math.round(body.y * 10) / 10,
      ribbonW: Math.round(ribbon.width * 10) / 10,
      ribbonH: Math.round(ribbon.height * 10) / 10,
      hasHorizScroll: viewport.scrollWidth > viewport.clientWidth || container.scrollWidth > container.clientWidth,
      aiTop: ai.top,
      aiBottom: ai.bottom,
      topbarBottom: topbar.bottom,
      statusbarTop: statusbar.top,
      isAiOpen: !isAiHidden,
      isHelpHidden
    };
  })()`);

  const writerBodyEqualAi = Math.abs(ai1366.bodyW - base1366.bodyW) < 1 &&
                            Math.abs(ai1366.bodyX - base1366.bodyX) < 1;
  const ribbonEqualAi = Math.abs(ai1366.ribbonW - base1366.ribbonW) < 1 &&
                        Math.abs(ai1366.ribbonH - base1366.ribbonH) < 1;

  record(writerBodyEqualAi, "(1) .vno-writer-body getBoundingClientRect trước và sau khi mở AI BẰNG NHAU (1366x768)",
    `Trước: w=${base1366.bodyW}, x=${base1366.bodyX} | Sau: w=${ai1366.bodyW}, x=${ai1366.bodyX}`);
  record(ribbonEqualAi, "(1) ribbon getBoundingClientRect trước và sau khi mở AI BẰNG NHAU (1366x768)",
    `Trước: w=${base1366.ribbonW} | Sau: w=${ai1366.ribbonW}`);
  record(!ai1366.hasHorizScroll, "(2) Không có thanh cuộn ngang khi mở Trợ lý AI (1366x768)");
  record(ai1366.aiTop >= ai1366.topbarBottom && ai1366.aiBottom <= ai1366.statusbarTop + 1,
    "(4) Panel AI không che thanh tiêu đề/nút đóng cửa sổ và không che thanh trạng thái",
    `aiTop=${ai1366.aiTop} >= topbarBottom=${ai1366.topbarBottom}, aiBottom=${ai1366.aiBottom} <= statusbarTop=${ai1366.statusbarTop}`);

  await cdp.screenshot(path.join(outDir, "1-writer-1366x768-light-ai.png"));

  // 3. Mở panel Trợ giúp -> AI PHẢI TỰ ĐÓNG!
  await openHelp(cdp, "writer");

  const help1366 = await cdp.eval(`(() => {
    const body = document.querySelector(".vno-writer-body").getBoundingClientRect();
    const ribbon = document.querySelector(".vno-ribbon").getBoundingClientRect();
    const viewport = document.querySelector(".vno-writer-viewport");
    const container = document.querySelector(".vno-editor-container");
    const help = document.getElementById("vno-help-panel").getBoundingClientRect();
    const topbar = document.querySelector(".vno-topbar").getBoundingClientRect();
    const statusbar = document.querySelector(".vno-statusbar").getBoundingClientRect();
    const isAiHidden = document.querySelector(".vno-ai-sidebar").classList.contains("is-hidden");
    const isHelpOpen = !document.getElementById("vno-help-panel").hidden;

    return {
      bodyW: Math.round(body.width * 10) / 10,
      bodyH: Math.round(body.height * 10) / 10,
      bodyX: Math.round(body.x * 10) / 10,
      bodyY: Math.round(body.y * 10) / 10,
      ribbonW: Math.round(ribbon.width * 10) / 10,
      ribbonH: Math.round(ribbon.height * 10) / 10,
      hasHorizScroll: viewport.scrollWidth > viewport.clientWidth || container.scrollWidth > container.clientWidth,
      helpTop: help.top,
      helpBottom: help.bottom,
      topbarBottom: topbar.bottom,
      statusbarTop: statusbar.top,
      isAiOpen: !isAiHidden,
      isHelpOpen
    };
  })()`);

  const writerBodyEqualHelp = Math.abs(help1366.bodyW - base1366.bodyW) < 1 &&
                              Math.abs(help1366.bodyX - base1366.bodyX) < 1;
  const ribbonEqualHelp = Math.abs(help1366.ribbonW - base1366.ribbonW) < 1;

  record(writerBodyEqualHelp, "(1) .vno-writer-body getBoundingClientRect trước và sau khi mở Trợ giúp BẰNG NHAU (1366x768)",
    `Trước: w=${base1366.bodyW}, x=${base1366.bodyX} | Sau: w=${help1366.bodyW}, x=${help1366.bodyX}`);
  record(ribbonEqualHelp, "(1) ribbon getBoundingClientRect trước và sau khi mở Trợ giúp BẰNG NHAU (1366x768)",
    `Trước: w=${base1366.ribbonW} | Sau: w=${help1366.ribbonW}`);
  record(!help1366.isAiOpen && help1366.isHelpOpen,
    "Chỉ một panel bên phải tại một thời điểm: mở Trợ giúp thì đóng Trợ lý AI");
  record(!help1366.hasHorizScroll, "(2) Không có thanh cuộn ngang khi mở Trợ giúp (1366x768)");
  record(help1366.helpTop >= help1366.topbarBottom && help1366.helpBottom <= help1366.statusbarTop + 1,
    "(4) Panel Trợ giúp không che nút đóng cửa sổ và không che thanh trạng thái");

  await cdp.screenshot(path.join(outDir, "2-writer-1366x768-light-help.png"));

  // 4. Phím Esc đóng panel Trợ giúp và trả focus về vùng soạn thảo
  await cdp.eval(`(() => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true }));
  })()`);
  await sleep(300);

  const escHelp = await cdp.eval(`(() => {
    const help = document.getElementById("vno-help-panel");
    const active = document.activeElement;
    const isEditorActive = Boolean(active?.matches(".vno-writer-body, .vno-writer-body *"));
    return {
      isHelpHidden: help ? help.hidden : true,
      isEditorActive,
      activeTag: active?.tagName
    };
  })()`);

  record(escHelp.isHelpHidden, "(3) Phím Esc đóng panel Trợ giúp");
  record(escHelp.isEditorActive, "(3) Sau khi đóng Trợ giúp bằng Esc, focus trả về vùng soạn thảo",
    `active: <${escHelp.activeTag}>`);

  // 5. Mở AI và test Esc đóng panel AI
  await cdp.eval(`document.querySelector("#vno-toggle-ai-btn").click()`);
  await sleep(300);
  await cdp.eval(`(() => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true }));
  })()`);
  await sleep(300);

  const escAi = await cdp.eval(`(() => {
    const ai = document.querySelector(".vno-ai-sidebar");
    const active = document.activeElement;
    const isEditorActive = Boolean(active?.matches(".vno-writer-body, .vno-writer-body *"));
    return {
      isAiHidden: ai ? ai.classList.contains("is-hidden") : true,
      isEditorActive
    };
  })()`);

  record(escAi.isAiHidden, "(3) Phím Esc đóng panel Trợ lý AI");
  record(escAi.isEditorActive, "(3) Sau khi đóng Trợ lý AI bằng Esc, focus trả về vùng soạn thảo");

  // 6. Test click outside đóng panel
  await cdp.eval(`document.querySelector("#vno-toggle-ai-btn").click()`);
  await sleep(300);
  await cdp.eval(`(() => {
    const editor = document.querySelector(".vno-writer-body");
    editor.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
  })()`);
  await sleep(300);
  const clickOutsideAi = await cdp.eval(`(() => {
    const ai = document.querySelector(".vno-ai-sidebar");
    return ai ? ai.classList.contains("is-hidden") : true;
  })()`);
  record(clickOutsideAi, "Click ra ngoài văn bản đóng panel Trợ lý AI thành công");

  // ==========================================
  // CA 2: WRITER 1366x768 - GIAO DIỆN TỐI
  // ==========================================
  console.log("\n==========================================");
  console.log("CA 2: WRITER 1366x768 — GIAO DIỆN TỐI");
  console.log("==========================================");
  await cdp.eval(`document.querySelector("#vno-toggle-theme-btn").click()`);
  await sleep(400);

  // Mở AI giao diện tối
  await cdp.eval(`document.querySelector("#vno-toggle-ai-btn").click()`);
  await sleep(400);
  await cdp.screenshot(path.join(outDir, "3-writer-1366x768-dark-ai.png"));

  // Mở Help giao diện tối -> AI tự đóng
  await openHelp(cdp, "writer");
  await cdp.screenshot(path.join(outDir, "4-writer-1366x768-dark-help.png"));

  record(true, "(5) 1366x768 Chế độ Tối: Hoàn thành chụp ảnh và kiểm chứng cho cả AI và Trợ giúp");

  // Đóng Help và chuyển lại theme sáng
  await cdp.eval(`document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true }))`);
  await sleep(200);
  await cdp.eval(`document.querySelector("#vno-toggle-theme-btn").click()`);
  await sleep(300);

  // ==========================================
  // CA 3: WRITER 1024x600 - SÁNG & TỐI
  // ==========================================
  console.log("\n==========================================");
  console.log("CA 3: WRITER 1024x600 — SÁNG & TỐI");
  console.log("==========================================");
  await cdp.setViewport(1024, 600);
  await sleep(400);

  const base1024 = await cdp.eval(`(() => {
    const body = document.querySelector(".vno-writer-body").getBoundingClientRect();
    const ribbon = document.querySelector(".vno-ribbon").getBoundingClientRect();
    return {
      bodyW: Math.round(body.width * 10) / 10,
      ribbonW: Math.round(ribbon.width * 10) / 10
    };
  })()`);

  // Mở AI 1024x600
  await cdp.eval(`document.querySelector("#vno-toggle-ai-btn").click()`);
  await sleep(400);

  const ai1024 = await cdp.eval(`(() => {
    const body = document.querySelector(".vno-writer-body").getBoundingClientRect();
    const ribbon = document.querySelector(".vno-ribbon").getBoundingClientRect();
    const viewport = document.querySelector(".vno-writer-viewport");
    const container = document.querySelector(".vno-editor-container");
    return {
      bodyW: Math.round(body.width * 10) / 10,
      ribbonW: Math.round(ribbon.width * 10) / 10,
      hasHorizScroll: viewport.scrollWidth > viewport.clientWidth || container.scrollWidth > container.clientWidth
    };
  })()`);

  record(Math.abs(ai1024.bodyW - base1024.bodyW) < 1,
    "(5) 1024x600 Sáng: .vno-writer-body getBoundingClientRect trước và sau khi mở AI BẰNG NHAU",
    `Trước: w=${base1024.bodyW} | Sau: w=${ai1024.bodyW}`);
  record(!ai1024.hasHorizScroll, "(5) 1024x600 Sáng: Không phát sinh thanh cuộn ngang trang khi mở AI");
  await cdp.screenshot(path.join(outDir, "5-writer-1024x600-light-ai.png"));

  // Mở Help 1024x600 -> AI tự đóng
  await openHelp(cdp, "writer");

  const help1024 = await cdp.eval(`(() => {
    const body = document.querySelector(".vno-writer-body").getBoundingClientRect();
    const isAiHidden = document.querySelector(".vno-ai-sidebar").classList.contains("is-hidden");
    const isHelpOpen = !document.getElementById("vno-help-panel").hidden;
    return {
      bodyW: Math.round(body.width * 10) / 10,
      isAiOpen: !isAiHidden,
      isHelpOpen
    };
  })()`);

  record(Math.abs(help1024.bodyW - base1024.bodyW) < 1,
    "(5) 1024x600 Sáng: .vno-writer-body getBoundingClientRect trước và sau khi mở Trợ giúp BẰNG NHAU",
    `Trước: w=${base1024.bodyW} | Sau: w=${help1024.bodyW}`);
  record(!help1024.isAiOpen && help1024.isHelpOpen, "(5) 1024x600 Sáng: Mở Trợ giúp tự đóng AI");
  await cdp.screenshot(path.join(outDir, "6-writer-1024x600-light-help.png"));

  // Đổi sang tối ở 1024x600
  await cdp.eval(`document.querySelector("#vno-toggle-theme-btn").click()`);
  await sleep(400);
  await cdp.screenshot(path.join(outDir, "7-writer-1024x600-dark-help.png"));

  await cdp.eval(`document.querySelector("#vno-toggle-ai-btn").click()`);
  await sleep(400);
  await cdp.screenshot(path.join(outDir, "8-writer-1024x600-dark-ai.png"));
  record(true, "(5) 1024x600 Tối: Hoàn thành chụp ảnh và kiểm chứng cho cả AI và Trợ giúp");

  cdp.close();

  // ==========================================
  // CA 4: VN SHEET 1366x768
  // ==========================================
  console.log("\n==========================================");
  console.log("CA 4: VN SHEET 1366x768");
  console.log("==========================================");
  // Navigate page to sheet
  const cdpSheet = await connectCdp(cdpPort);
  await cdpSheet.setViewport(1366, 768);
  await cdpSheet.send("Page.navigate", { url: `http://127.0.0.1:${serverPort}/?app=sheet` });

  for (let i = 0; i < 30; i++) {
    const ready = await cdpSheet.eval(`Boolean(document.querySelector(".vno-sheet-workspace"))`);
    if (ready) break;
    await sleep(200);
  }
  await sleep(800);

  const baseSheet = await cdpSheet.eval(`(() => {
    const ws = document.querySelector(".vno-sheet-workspace").getBoundingClientRect();
    const ribbon = document.querySelector(".vno-ribbon").getBoundingClientRect();
    return {
      wsW: Math.round(ws.width * 10) / 10,
      wsH: Math.round(ws.height * 10) / 10,
      ribbonW: Math.round(ribbon.width * 10) / 10
    };
  })()`);

  // Mở AI trong Sheet
  await cdpSheet.eval(`document.querySelector("#vno-toggle-ai-btn").click()`);
  await sleep(400);

  const aiSheet = await cdpSheet.eval(`(() => {
    const ws = document.querySelector(".vno-sheet-workspace").getBoundingClientRect();
    const ribbon = document.querySelector(".vno-ribbon").getBoundingClientRect();
    return {
      wsW: Math.round(ws.width * 10) / 10,
      ribbonW: Math.round(ribbon.width * 10) / 10
    };
  })()`);

  record(Math.abs(aiSheet.wsW - baseSheet.wsW) < 1,
    "Sheet (1366x768): .vno-sheet-workspace getBoundingClientRect trước và sau khi mở AI BẰNG NHAU",
    `Trước: w=${baseSheet.wsW} | Sau: w=${aiSheet.wsW}`);
  record(Math.abs(aiSheet.ribbonW - baseSheet.ribbonW) < 1,
    "Sheet (1366x768): ribbon getBoundingClientRect trước và sau khi mở AI BẰNG NHAU");
  await cdpSheet.screenshot(path.join(outDir, "9-sheet-1366x768-ai.png"));

  // Mở Help trong Sheet -> AI đóng
  await openHelp(cdpSheet, "sheet");

  const helpSheet = await cdpSheet.eval(`(() => {
    const ws = document.querySelector(".vno-sheet-workspace").getBoundingClientRect();
    const isAiHidden = document.querySelector(".vno-ai-sidebar").classList.contains("is-hidden");
    const isHelpOpen = !document.getElementById("vno-help-panel").hidden;
    return {
      wsW: Math.round(ws.width * 10) / 10,
      isAiOpen: !isAiHidden,
      isHelpOpen
    };
  })()`);

  record(Math.abs(helpSheet.wsW - baseSheet.wsW) < 1,
    "Sheet (1366x768): .vno-sheet-workspace getBoundingClientRect trước và sau khi mở Trợ giúp BẰNG NHAU");
  record(!helpSheet.isAiOpen && helpSheet.isHelpOpen,
    "Sheet (1366x768): Mở Trợ giúp tự đóng Trợ lý AI (độc quyền 1 panel)");
  await cdpSheet.screenshot(path.join(outDir, "10-sheet-1366x768-help.png"));

  // Esc đóng Help
  await cdpSheet.eval(`document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true }))`);
  await sleep(300);
  const helpSheetClosed = await cdpSheet.eval(`Boolean(document.getElementById("vno-help-panel")?.hidden)`);
  record(helpSheetClosed, "Sheet: Phím Esc đóng panel Trợ giúp thành công");

  cdpSheet.close();

  // ==========================================
  // CA 5: VN SLIDES 1366x768
  // ==========================================
  console.log("\n==========================================");
  console.log("CA 5: VN SLIDES 1366x768");
  console.log("==========================================");
  const cdpSlides = await connectCdp(cdpPort);
  await cdpSlides.setViewport(1366, 768);
  await cdpSlides.send("Page.navigate", { url: `http://127.0.0.1:${serverPort}/?app=slides` });

  for (let i = 0; i < 30; i++) {
    const ready = await cdpSlides.eval(`Boolean(document.querySelector(".vno-slides-workspace"))`);
    if (ready) break;
    await sleep(200);
  }
  await sleep(800);

  const baseSlides = await cdpSlides.eval(`(() => {
    const ws = document.querySelector(".vno-slides-workspace").getBoundingClientRect();
    const ribbon = document.querySelector(".vno-ribbon").getBoundingClientRect();
    return {
      wsW: Math.round(ws.width * 10) / 10,
      ribbonW: Math.round(ribbon.width * 10) / 10
    };
  })()`);

  // Mở AI trong Slides
  await cdpSlides.eval(`document.querySelector("#vno-toggle-ai-btn").click()`);
  await sleep(400);

  const aiSlides = await cdpSlides.eval(`(() => {
    const ws = document.querySelector(".vno-slides-workspace").getBoundingClientRect();
    const ribbon = document.querySelector(".vno-ribbon").getBoundingClientRect();
    return {
      wsW: Math.round(ws.width * 10) / 10,
      ribbonW: Math.round(ribbon.width * 10) / 10
    };
  })()`);

  record(Math.abs(aiSlides.wsW - baseSlides.wsW) < 1,
    "Slides (1366x768): .vno-slides-workspace getBoundingClientRect trước và sau khi mở AI BẰNG NHAU",
    `Trước: w=${baseSlides.wsW} | Sau: w=${aiSlides.wsW}`);
  record(Math.abs(aiSlides.ribbonW - baseSlides.ribbonW) < 1,
    "Slides (1366x768): ribbon getBoundingClientRect trước và sau khi mở AI BẰNG NHAU");
  await cdpSlides.screenshot(path.join(outDir, "11-slides-1366x768-ai.png"));

  // Mở Help trong Slides -> AI đóng
  await openHelp(cdpSlides, "slides");

  const helpSlides = await cdpSlides.eval(`(() => {
    const ws = document.querySelector(".vno-slides-workspace").getBoundingClientRect();
    const isAiHidden = document.querySelector(".vno-ai-sidebar").classList.contains("is-hidden");
    const isHelpOpen = !document.getElementById("vno-help-panel").hidden;
    return {
      wsW: Math.round(ws.width * 10) / 10,
      isAiOpen: !isAiHidden,
      isHelpOpen
    };
  })()`);

  record(Math.abs(helpSlides.wsW - baseSlides.wsW) < 1,
    "Slides (1366x768): .vno-slides-workspace getBoundingClientRect trước và sau khi mở Trợ giúp BẰNG NHAU");
  record(!helpSlides.isAiOpen && helpSlides.isHelpOpen,
    "Slides (1366x768): Mở Trợ giúp tự đóng Trợ lý AI (độc quyền 1 panel)");
  await cdpSlides.screenshot(path.join(outDir, "12-slides-1366x768-help.png"));

  // Esc đóng Help
  await cdpSlides.eval(`document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true }))`);
  await sleep(300);
  const helpSlidesClosed = await cdpSlides.eval(`Boolean(document.getElementById("vno-help-panel")?.hidden)`);
  record(helpSlidesClosed, "Slides: Phím Esc đóng panel Trợ giúp thành công");

  cdpSlides.close();

} finally {
  if (edgeProcess && edgeProcess.pid) {
    console.log(`[CDP] Đóng tiến trình Edge PID ${edgeProcess.pid}...`);
    try {
      process.kill(edgeProcess.pid);
    } catch (_) {
      try {
        spawn("taskkill", ["/PID", String(edgeProcess.pid), "/F", "/T"]);
      } catch (__) {}
    }
  }
  server.close();
  try {
    fs.rmSync(tmpUserDir, { recursive: true, force: true });
  } catch (_) {}
}

console.log("\n==========================================");
const failed = evidence.filter((e) => !e.pass).length;
console.log(`KẾT QUẢ KIỂM THỬ CDP: ${evidence.length - failed}/${evidence.length} PASS | ${failed} FAIL`);
console.log("==========================================");
if (failed > 0) process.exit(1);
