/**
 * Script chụp ảnh màn hình các trang quản trị 3T Office bằng DevTools Protocol (CDP)
 * Lưu ảnh vào docs/screens-admin/*.png
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
const outDir = path.resolve(repoRoot, "docs/screens-admin");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon"
};

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
          "Sec-WebSocket-Key": key,
          "Sec-WebSocket-Version": "13"
        }
      });

      req.on("error", (err) => reject(err));

      req.on("upgrade", (res, socket, head) => {
        this.socket = socket;
        this.buffer = head;

        socket.on("data", (chunk) => {
          this.buffer = Buffer.concat([this.buffer, chunk]);
          this._parseFrames();
        });

        socket.on("close", () => {
          this.emit("close");
          for (const pending of this.pending.values()) {
            clearTimeout(pending.timer);
            pending.reject(new Error("CDP closed"));
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
      const secondByte = this.buffer[1];
      const isMasked = Boolean(secondByte & 0x80);
      let payloadLen = secondByte & 0x7f;
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

      let maskKey = null;
      if (isMasked) {
        if (this.buffer.length < offset + 4) return;
        maskKey = this.buffer.slice(offset, offset + 4);
        offset += 4;
      }

      if (this.buffer.length < offset + payloadLen) return;

      const payload = this.buffer.slice(offset, offset + payloadLen);
      this.buffer = this.buffer.slice(offset + payloadLen);

      if (isMasked && maskKey) {
        for (let i = 0; i < payload.length; i++) {
          payload[i] ^= maskKey[i % 4];
        }
      }

      try {
        const text = payload.toString("utf-8");
        const msg = JSON.parse(text);
        if (msg.id !== undefined && this.pending.has(msg.id)) {
          const { resolve, timer } = this.pending.get(msg.id);
          clearTimeout(timer);
          this.pending.delete(msg.id);
          resolve(msg);
        }
        this.emit("message", msg);
      } catch (err) {}
    }
  }

  async send(method, params = {}) {
    const id = ++this.nextId;
    const msg = JSON.stringify({ id, method, params });
    const payload = Buffer.from(msg, "utf-8");

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`Timeout CDP ${method}`));
        }
      }, 10000);

      this.pending.set(id, { resolve, reject, timer });

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
      returnByValue: true
    });
    return res.result?.result?.value;
  }

  close() {
    if (this.socket) {
      try { this.socket.end(); } catch {}
    }
  }
}

function createStaticServer(root) {
  return http.createServer((req, res) => {
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
        res.end("Not Found");
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || "application/octet-stream";
      res.writeHead(200, { "Content-Type": contentType });
      res.end(data);
    });
  });
}

function findBrowserExecutable() {
  const candidates = [
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  throw new Error("Không tìm thấy trình duyệt Edge hoặc Chrome.");
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
    "about:blank"
  ];

  const proc = spawn(browserExe, args, { stdio: "ignore" });
  const startTime = Date.now();
  while (Date.now() - startTime < 15000) {
    try {
      const resp = await fetch(`http://127.0.0.1:${debugPort}/json/version`);
      if (resp.ok) return proc;
    } catch {}
    await sleep(150);
  }
  proc.kill();
  throw new Error("Không thể khởi động trình duyệt CDP.");
}

async function captureScreen(cdp, fileName, label) {
  const res = await cdp.send("Page.captureScreenshot", { format: "png" });
  if (res.result && res.result.data) {
    const filePath = path.join(outDir, fileName);
    fs.writeFileSync(filePath, Buffer.from(res.result.data, "base64"));
    console.log(`[CDP Screenshot] Đã chụp ${label} -> ${fileName}`);
  }
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });

  const server = createStaticServer(webDir);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const serverPort = server.address().port;

  const browserExe = findBrowserExecutable();
  const debugPort = await findFreePort();
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "vno-screen-"));
  let browserProc = null;
  let cdp = null;

  try {
    browserProc = await startBrowser(browserExe, debugPort, tempDir);
    const targetsRes = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
    const targets = await targetsRes.json();
    const pageTarget = targets.find((t) => t.type === "page") || targets[0];

    cdp = new SimpleWebSocketClient(pageTarget.webSocketDebuggerUrl);
    await cdp.open();
    await cdp.send("Page.enable");
    await cdp.send("DOM.enable");
    await cdp.send("Runtime.enable");

    // Đặt viewport chuẩn Desktop 1280x800
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 1280,
      height: 800,
      deviceScaleFactor: 1,
      mobile: false
    });

    const adminUrl = `http://127.0.0.1:${serverPort}/admin/index.html`;

    // 1. Màn hình Đăng nhập
    await cdp.send("Page.navigate", { url: adminUrl });
    await sleep(600);
    await captureScreen(cdp, "01-admin-login.png", "Màn hình Đăng nhập");

    // Kích hoạt giao diện Dashboard với dữ liệu mẫu trực quan
    await cdp.evaluate(`
      (function() {
        document.getElementById('view-login').style.display = 'none';
        document.getElementById('view-dashboard').style.display = 'block';
        document.getElementById('admin-user-name').textContent = 'admin';
        document.getElementById('logout-btn').style.display = 'inline-flex';

        // Điền dữ liệu mẫu Tổng quan
        document.getElementById('kpi-total-keys').textContent = '128';
        document.getElementById('kpi-active-keys').textContent = '120';
        document.getElementById('kpi-revoked-keys').textContent = '8';
        document.getElementById('kpi-devices').textContent = '215';
        document.getElementById('kpi-7d').textContent = '42';
        document.getElementById('kpi-errors-24h').textContent = '0';
        document.getElementById('overview-channels-tbody').innerHTML = '<tr><td><strong>stable</strong></td><td>0.9.7</td><td>2026-10-03</td></tr>';

        // Điền dữ liệu mẫu danh sách Key
        document.getElementById('keys-tbody').innerHTML = \`
          <tr>
            <td><span class="code-text">…7W4M</span></td>
            <td>Công ty CP Công Nghệ Mặt Trời</td>
            <td>lienhe@sun.vn</td>
            <td>2 / 2</td>
            <td><span class="badge badge-active">Hoạt động</span></td>
            <td>03/10/2026 14:20:00</td>
            <td><button class="btn btn-secondary btn-sm">Chi tiết</button></td>
          </tr>
          <tr>
            <td><span class="code-text">…9HPK</span></td>
            <td>Trường THPT Chu Văn An</td>
            <td>admin@cva.edu.vn</td>
            <td>45 / 50</td>
            <td><span class="badge badge-active">Hoạt động</span></td>
            <td>02/10/2026 09:15:00</td>
            <td><button class="btn btn-secondary btn-sm">Chi tiết</button></td>
          </tr>
          <tr>
            <td><span class="code-text">…X2B1</span></td>
            <td>Key dùng thử đối tác</td>
            <td>test@partner.com</td>
            <td>1 / 2</td>
            <td><span class="badge badge-revoked">Đã thu hồi</span></td>
            <td>28/09/2026 16:00:00</td>
            <td><button class="btn btn-secondary btn-sm">Chi tiết</button></td>
          </tr>
        \`;

        // Điền dữ liệu Báo cáo lỗi
        document.getElementById('reports-tbody').innerHTML = \`
          <tr>
            <td><span class="badge badge-active">writer</span></td>
            <td>0.9.7</td>
            <td><span class="code-text">RenderTimeoutError</span></td>
            <td>2</td>
            <td>2</td>
            <td>03/10/2026 11:05:12</td>
            <td><button class="btn btn-secondary btn-sm">Xem mẫu</button></td>
          </tr>
        \`;

        // Điền dữ liệu Phát hành
        document.getElementById('releases-channels-tbody').innerHTML = \`
          <tr>
            <td><strong>stable</strong></td>
            <td>0.9.7</td>
            <td>2026-10-03</td>
            <td><span class="code-text">8f3b6a8e0c0ed032…</span></td>
          </tr>
        \`;
        document.getElementById('releases-downloads-tbody').innerHTML = \`
          <tr>
            <td><strong>3t-office-setup-0.9.7.exe</strong></td>
            <td>502.2 MB</td>
            <td><span class="code-text">8f3b6a8e0c0ed0324b62c53d0efe56994653a33e660c44446c6065a353c07b15</span></td>
            <td><button class="btn btn-secondary btn-sm">Kiểm tra tải</button></td>
          </tr>
        \`;

        // Điền dữ liệu Nhật ký
        document.getElementById('audit-tbody').innerHTML = \`
          <tr>
            <td>03/10/2026 16:20:00</td>
            <td><strong>admin</strong></td>
            <td><span class="badge badge-active">login</span></td>
            <td><span class="code-text">admin</span></td>
          </tr>
          <tr>
            <td>03/10/2026 15:45:10</td>
            <td><strong>admin</strong></td>
            <td><span class="badge badge-active">create_keys</span></td>
            <td><span class="code-text">count=5,seats=2</span></td>
          </tr>
        \`;
      })();
    `);
    await sleep(200);

    // 2. Màn hình Tổng quan
    await cdp.evaluate(`
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === 'overview'));
      document.querySelectorAll('.tab-panel').forEach(p => p.style.display = p.id === 'panel-overview' ? 'block' : 'none');
    `);
    await sleep(300);
    await captureScreen(cdp, "02-admin-overview.png", "Màn hình Tổng quan");

    // 3. Màn hình Quản lý Key
    await cdp.evaluate(`
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === 'keys'));
      document.querySelectorAll('.tab-panel').forEach(p => p.style.display = p.id === 'panel-keys' ? 'block' : 'none');
    `);
    await sleep(300);
    await captureScreen(cdp, "03-admin-keys.png", "Màn hình Quản lý Key");

    // 4. Màn hình Kích hoạt ngoại tuyến
    await cdp.evaluate(`
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === 'offline'));
      document.querySelectorAll('.tab-panel').forEach(p => p.style.display = p.id === 'panel-offline' ? 'block' : 'none');
      document.getElementById('offline-key').value = '3TO-4EWTB-HB9JT-51XX5-PM64S';
      document.getElementById('offline-device-code').value = 'DEV-OFFLINE-PC-A-87654321';
      document.getElementById('offline-result-box').style.display = 'block';
      document.getElementById('offline-code-output').textContent = 'eyJ2IjoxLCJsaWQiOiJsaWQtMSIsImVkaXRpb24iOiJwZXJwZXR1YWwiLCJmcCI6ImRldi1m...';
    `);
    await sleep(300);
    await captureScreen(cdp, "04-admin-offline.png", "Màn hình Kích hoạt ngoại tuyến");

    // 5. Màn hình Báo cáo lỗi
    await cdp.evaluate(`
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === 'reports'));
      document.querySelectorAll('.tab-panel').forEach(p => p.style.display = p.id === 'panel-reports' ? 'block' : 'none');
    `);
    await sleep(300);
    await captureScreen(cdp, "05-admin-reports.png", "Màn hình Báo cáo lỗi");

    // 6. Màn hình Phát hành
    await cdp.evaluate(`
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === 'releases'));
      document.querySelectorAll('.tab-panel').forEach(p => p.style.display = p.id === 'panel-releases' ? 'block' : 'none');
    `);
    await sleep(300);
    await captureScreen(cdp, "06-admin-releases.png", "Màn hình Phát hành");

    // 7. Màn hình Nhật ký quản trị
    await cdp.evaluate(`
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === 'audit'));
      document.querySelectorAll('.tab-panel').forEach(p => p.style.display = p.id === 'panel-audit' ? 'block' : 'none');
    `);
    await sleep(300);
    await captureScreen(cdp, "07-admin-audit.png", "Màn hình Nhật ký quản trị");

    console.log("\nHoàn tất chụp 7 màn hình quản trị vào docs/screens-admin/");
  } finally {
    if (cdp) cdp.close();
    if (browserProc) {
      try { browserProc.kill(); } catch {}
    }
    server.close();
    try { await rm(tempDir, { recursive: true, force: true }); } catch {}
  }
}

main().catch((err) => {
  console.error("Lỗi:", err);
  process.exit(1);
});
