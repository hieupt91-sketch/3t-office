/**
 * Script Kịch bản Đầu - Cuối (End-to-End) CDP trên trang web thật
 * Chụp ảnh màn hình thật cho toàn bộ trang Quản trị, Cổng khách hàng và Trang bản quyền.
 * Sử dụng DevTools Protocol (CDP) kết nối tới trình duyệt Headless.
 * Tuyệt đối không sử dụng SendKeys hay thao tác bàn phím mô phỏng bên ngoài.
 */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import os from "node:os";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:net";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const webDir = path.resolve(repoRoot, "server/3t-web");
const apiDir = path.resolve(repoRoot, "server/3t-api");
const screensDir = path.resolve(repoRoot, "docs/screens-admin");

if (!fs.existsSync(screensDir)) {
  fs.mkdirSync(screensDir, { recursive: true });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function findFreePort() {
  const s = createServer();
  await new Promise((res, rej) => {
    s.once("error", rej);
    s.listen(0, "127.0.0.1", res);
  });
  const port = s.address().port;
  await new Promise((res) => s.close(res));
  return port;
}

class SimpleWebSocketClient {
  constructor(url) {
    this.url = new URL(url);
    this.socket = null;
    this.handlers = { open: [], message: [], error: [], close: [] };
    this.buffer = Buffer.alloc(0);
    this.nextId = 0;
    this.pending = new Map();
  }

  on(event, fn) {
    if (this.handlers[event]) this.handlers[event].push(fn);
  }

  emit(event, ...args) {
    if (this.handlers[event]) {
      for (const fn of this.handlers[event]) fn(...args);
    }
  }

  async open() {
    return new Promise((resolve, reject) => {
      const key = crypto.randomBytes(16).toString("base64");
      const req = http.request({
        hostname: this.url.hostname,
        port: this.url.port,
        path: this.url.pathname + this.url.search,
        headers: {
          Connection: "Upgrade",
          Upgrade: "websocket",
          "Sec-WebSocket-Version": "13",
          "Sec-WebSocket-Key": key,
        },
      });

      req.on("error", reject);
      req.on("upgrade", (res, socket) => {
        this.socket = socket;
        socket.on("data", (chunk) => {
          this.buffer = Buffer.concat([this.buffer, chunk]);
          this._parseFrames();
        });

        socket.on("close", () => {
          this.emit("close");
          for (const pending of this.pending.values()) {
            clearTimeout(pending.timer);
            pending.reject(new Error("CDP connection closed."));
          }
          this.pending.clear();
        });

        socket.on("error", (err) => this.emit("error", err));
        this.emit("open");
        resolve(this);
      });

      req.end();
    });
  }

  _parseFrames() {
    while (this.buffer.length >= 2) {
      const b0 = this.buffer[0];
      const b1 = this.buffer[1];
      const opcode = b0 & 0x0f;
      const masked = Boolean(b1 & 0x80);
      let payloadLen = b1 & 0x7f;
      let offset = 2;

      if (payloadLen === 126) {
        if (this.buffer.length < 4) return;
        payloadLen = this.buffer.readUInt16BE(2);
        offset = 4;
      } else if (payloadLen === 127) {
        if (this.buffer.length < 10) return;
        payloadLen = Number(this.buffer.readBigUInt64BE(2));
        offset = 10;
      }

      if (masked) offset += 4;
      if (this.buffer.length < offset + payloadLen) return;

      const payload = this.buffer.subarray(offset, offset + payloadLen);
      this.buffer = this.buffer.subarray(offset + payloadLen);

      if (opcode === 1) {
        const text = payload.toString("utf8");
        let msg;
        try { msg = JSON.parse(text); } catch { continue; }
        if (msg.id && this.pending.has(msg.id)) {
          const p = this.pending.get(msg.id);
          this.pending.delete(msg.id);
          clearTimeout(p.timer);
          p.resolve(msg);
        }
        this.emit("message", msg);
      } else if (opcode === 8) {
        this.socket.end();
      }
    }
  }

  async send(method, params = {}, timeoutMs = 15000) {
    const id = ++this.nextId;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error("CDP call timed out: " + method));
      }, timeoutMs);

      this.pending.set(id, { resolve, reject, timer });

      const payload = Buffer.from(JSON.stringify({ id, method, params }), "utf8");
      const len = payload.length;
      const mask = crypto.randomBytes(4);

      let header;
      if (len <= 125) {
        header = Buffer.alloc(6);
        header[0] = 0x81;
        header[1] = 0x80 | len;
        mask.copy(header, 2);
      } else if (len <= 65535) {
        header = Buffer.alloc(8);
        header[0] = 0x81;
        header[1] = 0x80 | 126;
        header.writeUInt16BE(len, 2);
        mask.copy(header, 4);
      } else {
        header = Buffer.alloc(14);
        header[0] = 0x81;
        header[1] = 0x80 | 127;
        header.writeBigUInt64BE(BigInt(len), 2);
        mask.copy(header, 10);
      }

      const masked = Buffer.alloc(len);
      for (let i = 0; i < len; i++) {
        masked[i] = payload[i] ^ mask[i % 4];
      }

      this.socket.write(Buffer.concat([header, masked]));
    });
  }

  async evaluate(expression) {
    const res = await this.send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (res.error) throw new Error(res.error.message || "Runtime.evaluate failed");
    return res.result?.result?.value;
  }

  async captureScreenshot(outputPath) {
    const res = await this.send("Page.captureScreenshot", { format: "png" });
    if (res.result && res.result.data) {
      fs.writeFileSync(outputPath, Buffer.from(res.result.data, "base64"));
    }
  }

  close() {
    if (this.socket) {
      try { this.socket.end(); } catch {}
    }
  }
}

function findBrowserExecutable() {
  const candidates = [
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  throw new Error("Không tìm thấy trình duyệt Edge hoặc Chrome trên Windows.");
}

async function startBrowser(browserExe, debugPort, tempDir) {
  const args = [
    "--headless",
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${tempDir}`,
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--mute-audio",
    "--hide-scrollbars",
    "about:blank",
  ];

  const proc = spawn(browserExe, args, { stdio: "ignore" });
  proc.once("error", (err) => console.error("Lỗi trình duyệt:", err));

  const startTime = Date.now();
  while (Date.now() - startTime < 15000) {
    try {
      const resp = await fetch(`http://127.0.0.1:${debugPort}/json/version`);
      if (resp.ok) return proc;
    } catch {}
    await sleep(150);
  }
  proc.kill();
  throw new Error(`Trình duyệt không mở cổng CDP ${debugPort}`);
}

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
};

function createProxyAndStaticServer(root, apiPort) {
  const server = http.createServer((req, res) => {
    if (req.url.startsWith("/api/v1/")) {
      // Chuyển tiếp tới backend FastAPI
      const options = {
        hostname: "127.0.0.1",
        port: apiPort,
        path: req.url,
        method: req.method,
        headers: { ...req.headers, host: `127.0.0.1:${apiPort}` },
      };

      const proxyReq = http.request(options, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res, { end: true });
      });

      proxyReq.on("error", (err) => {
        res.writeHead(502, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "bad_gateway", detail: err.message }));
      });

      req.pipe(proxyReq, { end: true });
      return;
    }

    // Phục vụ tệp tĩnh
    let reqUrl = (req.url || "/").split("?")[0].split("#")[0];
    if (reqUrl === "/") reqUrl = "/index.html";

    const filePath = path.normalize(path.join(root, reqUrl));
    if (!filePath.startsWith(root)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("404 Not Found");
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || "application/octet-stream";
      res.writeHead(200, { "Content-Type": contentType });
      res.end(data);
    });
  });

  return server;
}

async function main() {
  console.log("=== Bắt đầu Kịch bản CDP E2E & Chụp ảnh màn hình thật ===");

  const apiPort = await findFreePort();
  const webPort = await findFreePort();
  const debugPort = await findFreePort();

  const tempDir = await mkdtemp(path.join(os.tmpdir(), "3t-cdp-screens-"));
  const dataDir = path.join(tempDir, "data");
  fs.mkdirSync(dataDir, { recursive: true });

  let apiProc = null;
  let browserProc = null;
  let server = null;
  let cdp = null;

  try {
    // 1. Khởi động backend FastAPI bằng uvicorn
    console.log(`[1/5] Khởi động máy chủ API tại cổng ${apiPort}...`);
    apiProc = spawn(
      "python",
      ["-m", "uvicorn", "app:app", "--port", String(apiPort), "--host", "127.0.0.1"],
      {
        cwd: apiDir,
        env: {
          ...process.env,
          DATA_DIR: dataDir,
          ADMIN_USERNAME: "admin",
          ADMIN_PASSWORD: "secretpassword123",
          INSTALL_TOKEN_SECRET: "install-token-secret-cdp-test-32bytes-secret",
          REPORT_SIGNING_SECRET: "report-signing-secret-cdp-test-32bytes-secret",
          COMMERCE_SECRET_KEY: "secret-key-3t-office-commerce-cdp-test-32bytes",
        },
        stdio: "pipe",
        shell: true,
      }
    );

    apiProc.stderr.on("data", (d) => console.log("[API ERR]", d.toString().trim()));

    // Chờ API sẵn sàng
    let apiReady = false;
    for (let i = 0; i < 50; i++) {
      try {
        const h = await fetch(`http://127.0.0.1:${apiPort}/health`);
        if (h.ok) {
          apiReady = true;
          break;
        }
      } catch (_) {}
      await sleep(200);
    }
    if (!apiReady) throw new Error("Máy chủ API không phản hồi sau 10 giây.");

    // 2. Khởi động Web Server (tích hợp Proxy API)
    console.log(`[2/5] Khởi động máy chủ Web Proxy tại cổng ${webPort}...`);
    server = createProxyAndStaticServer(webDir, apiPort);
    await new Promise((res) => server.listen(webPort, "127.0.0.1", res));

    // 3. Khởi động Browser CDP
    console.log(`[3/5] Khởi động trình duyệt Headless qua cổng CDP ${debugPort}...`);
    const browserExe = findBrowserExecutable();
    browserProc = await startBrowser(browserExe, debugPort, tempDir);

    const targetsRes = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
    const targets = await targetsRes.json();
    const pageTarget = targets.find((t) => t.type === "page") || targets[0];
    cdp = new SimpleWebSocketClient(pageTarget.webSocketDebuggerUrl);
    await cdp.open();
    await cdp.send("Page.enable");
    await cdp.send("DOM.enable");
    await cdp.send("Runtime.enable");

    // Đặt viewport 1280x900 chuẩn màn hình Desktop văn phòng
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 1280,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });

    console.log("[4/5] Thực hiện các kịch bản tương tác và chụp ảnh màn hình...");

    // --- KỊCH BẢN A: Trang Bản quyền & Đặt hàng 0 VNĐ ---
    console.log("  -> Điều hướng tới /ban-quyen.html");
    await cdp.send("Page.navigate", { url: `http://127.0.0.1:${webPort}/ban-quyen.html` });
    await sleep(600);
    await cdp.captureScreenshot(path.join(screensDir, "13-ban-quyen-pricing.png"));
    console.log("     [+] Đã chụp 13-ban-quyen-pricing.png");

    // Mở modal đặt mua
    await cdp.evaluate(`document.getElementById("btn-buy-perpetual").click();`);
    await sleep(300);

    // Điền thông tin đặt hàng
    await cdp.evaluate(`
      document.getElementById("checkout-name").value = "Lê Văn An";
      document.getElementById("checkout-email").value = "khach_cdp@example.com";
      document.getElementById("checkout-phone").value = "0987654321";
      document.getElementById("checkout-org").value = "Công ty TNHH Đầu tư 3T";
      document.getElementById("checkout-tax").value = "3101126773";
      document.getElementById("checkout-quantity").value = "2";
    `);
    await sleep(200);
    await cdp.captureScreenshot(path.join(screensDir, "14-ban-quyen-checkout-modal.png"));
    console.log("     [+] Đã chụp 14-ban-quyen-checkout-modal.png");

    // Submit đặt hàng 0 VNĐ -> Cấp key tự động tức thì
    await cdp.evaluate(`document.getElementById("form-checkout").dispatchEvent(new Event("submit"));`);
    await sleep(1000);

    // --- KỊCH BẢN B: Cổng khách hàng (Customer Portal) ---
    console.log("  -> Điều hướng tới /tai-khoan/index.html");
    await cdp.send("Page.navigate", { url: `http://127.0.0.1:${webPort}/tai-khoan/index.html` });
    await sleep(400);
    await cdp.captureScreenshot(path.join(screensDir, "11-portal-login.png"));
    console.log("     [+] Đã chụp 11-portal-login.png");

    // Yêu cầu mã đăng nhập
    await cdp.evaluate(`
      document.getElementById("input-email").value = "khach_cdp@example.com";
      document.getElementById("form-request-code").dispatchEvent(new Event("submit"));
    `);
    await sleep(600);

    // Lấy mã 6 số từ CSDL sqlite3
    const dbPath = path.join(dataDir, "3t-office-cloud.sqlite3");
    const getCodeScript = `
import sqlite3, json
conn = sqlite3.connect(r"${dbPath}")
row = conn.execute("SELECT payload_json FROM email_outbox WHERE to_email = 'khach_cdp@example.com' AND template = 'portal_login_code' ORDER BY rowid DESC").fetchone()
if row:
    print(json.loads(row[0])["code"])
else:
    print("")
`;
    const code6 = await new Promise((resolve) => {
      const p = spawn("python", ["-c", getCodeScript]);
      let out = "";
      p.stdout.on("data", (d) => (out += d.toString()));
      p.on("close", () => resolve(out.trim()));
    });

    if (code6) {
      await cdp.evaluate(`
        document.getElementById("input-code").value = "${code6}";
        document.getElementById("form-verify-code").dispatchEvent(new Event("submit"));
      `);
      await sleep(800);
      await cdp.captureScreenshot(path.join(screensDir, "12-portal-dashboard.png"));
      console.log("     [+] Đã chụp 12-portal-dashboard.png");
    }

    // --- KỊCH BẢN C: Trang Quản trị (Admin) ---
    console.log("  -> Điều hướng tới /admin/index.html");
    await cdp.send("Page.navigate", { url: `http://127.0.0.1:${webPort}/admin/index.html` });
    await sleep(400);
    await cdp.captureScreenshot(path.join(screensDir, "01-admin-login.png"));
    console.log("     [+] Đã chụp 01-admin-login.png");

    // Đăng nhập tài khoản Admin Owner
    await cdp.evaluate(`
      document.getElementById("login-username").value = "admin";
      document.getElementById("login-password").value = "secretpassword123";
      document.getElementById("login-form").dispatchEvent(new Event("submit"));
    `);
    await sleep(800);

    // 02: Overview
    await cdp.captureScreenshot(path.join(screensDir, "02-admin-overview.png"));
    console.log("     [+] Đã chụp 02-admin-overview.png");

    // 03: Orders
    await cdp.evaluate(`document.querySelector("button[data-tab='orders']").click();`);
    await sleep(500);
    await cdp.captureScreenshot(path.join(screensDir, "03-admin-orders.png"));
    console.log("     [+] Đã chụp 03-admin-orders.png");

    // 04: Reconciliation
    await cdp.evaluate(`document.querySelector("button[data-tab='reconciliation']").click();`);
    await sleep(500);
    await cdp.captureScreenshot(path.join(screensDir, "04-admin-reconciliation.png"));
    console.log("     [+] Đã chụp 04-admin-reconciliation.png");

    // 05: Customers
    await cdp.evaluate(`document.querySelector("button[data-tab='customers']").click();`);
    await sleep(500);
    await cdp.captureScreenshot(path.join(screensDir, "05-admin-customers.png"));
    console.log("     [+] Đã chụp 05-admin-customers.png");

    // 06: Invoices
    await cdp.evaluate(`document.querySelector("button[data-tab='invoices']").click();`);
    await sleep(500);
    await cdp.captureScreenshot(path.join(screensDir, "06-admin-invoices.png"));
    console.log("     [+] Đã chụp 06-admin-invoices.png");

    // 07: Keys
    await cdp.evaluate(`document.querySelector("button[data-tab='keys']").click();`);
    await sleep(500);
    await cdp.captureScreenshot(path.join(screensDir, "07-admin-keys.png"));
    console.log("     [+] Đã chụp 07-admin-keys.png");

    // 08: Offline
    await cdp.evaluate(`document.querySelector("button[data-tab='offline']").click();`);
    await sleep(400);
    await cdp.captureScreenshot(path.join(screensDir, "08-admin-offline.png"));
    console.log("     [+] Đã chụp 08-admin-offline.png");

    // 09: Outbox
    await cdp.evaluate(`document.querySelector("button[data-tab='outbox']").click();`);
    await sleep(500);
    await cdp.captureScreenshot(path.join(screensDir, "09-admin-outbox.png"));
    console.log("     [+] Đã chụp 09-admin-outbox.png");

    // 10: Settings
    await cdp.evaluate(`document.querySelector("button[data-tab='settings']").click();`);
    await sleep(500);
    await cdp.captureScreenshot(path.join(screensDir, "10-admin-settings.png"));
    console.log("     [+] Đã chụp 10-admin-settings.png");

    console.log("[5/5] Hoàn tất toàn bộ 14 ảnh chụp màn hình.");
  } finally {
    // Dọn dẹp an toàn tuyệt đối
    if (cdp) {
      try {
        await cdp.send("Browser.close");
      } catch (_) {}
      cdp.close();
    }
    if (browserProc) {
      try { browserProc.kill(); } catch (_) {}
    }
    if (server) {
      try { server.close(); } catch (_) {}
    }
    if (apiProc) {
      try { apiProc.kill(); } catch (_) {}
    }
    try {
      await rm(tempDir, { recursive: true, force: true });
    } catch (_) {}
  }
}

main().catch((err) => {
  console.error("Lỗi thực thi kịch bản CDP:", err);
  process.exit(1);
});
