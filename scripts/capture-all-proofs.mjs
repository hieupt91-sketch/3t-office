/**
 * 3T Office — Trình tạo ảnh kiểm chứng giao diện tự động qua Chrome DevTools Protocol (CDP)
 * Chụp ảnh tại các kích thước: 360px, 390px, 768px, 1280px, 1920px trên cả 2 giao diện Sáng & Tối.
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
const proofDir = path.resolve(repoRoot, "docs/web-proof");

if (!fs.existsSync(proofDir)) {
  fs.mkdirSync(proofDir, { recursive: true });
}

const HTML_PAGES = [
  "index.html",
  "tinh-nang.html",
  "tai-ve.html",
  "co-gi-moi.html",
  "huong-dan.html",
  "ban-quyen.html",
  "lien-he.html",
  "trang-thai.html",
  "404.html"
];

const VIEWPORTS = [
  { name: "360", width: 360, height: 740, mobile: true },
  { name: "390", width: 390, height: 844, mobile: true },
  { name: "768", width: 768, height: 1024, mobile: false },
  { name: "1280", width: 1280, height: 900, mobile: false },
  { name: "1920", width: 1920, height: 1080, mobile: false }
];

const THEMES = ["light", "dark"];

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8"
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

      req.on("error", (err) => {
        this.emit("error", err);
        reject(err);
      });

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
            pending.reject(new Error("CDP connection closed before response."));
          }
          this.pending.clear();
        });

        socket.on("error", (err) => {
          this.emit("error", err);
        });

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

      if (opcode === 1) { // Text
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
      } else if (opcode === 9) {
        this.socket.write(Buffer.from([0x8a, 0x00]));
      }
    }
  }

  send(method, params = {}, timeoutMs = 15000) {
    if (!this.socket || this.socket.destroyed) {
      return Promise.reject(new Error("Socket not connected"));
    }
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
        res.end("404 Not Found");
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
  throw new Error(`Trình duyệt không phản hồi CDP tại cổng ${debugPort}.`);
}

async function main() {
  console.log("=== Bắt đầu tiến trình chụp ảnh kiểm chứng đa kích thước (CDP) ===");

  const server = createStaticServer(webDir);
  await new Promise((res) => server.listen(0, "127.0.0.1", res));
  const port = server.address().port;

  const browserExe = findBrowserExecutable();
  const debugPort = await findFreePort();
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "vno-proof-"));
  let proc = null;
  let cdp = null;

  try {
    proc = await startBrowser(browserExe, debugPort, tempDir);
    const targetsRes = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
    const targets = await targetsRes.json();
    const pageTarget = targets.find((t) => t.type === "page") || targets[0];

    cdp = new SimpleWebSocketClient(pageTarget.webSocketDebuggerUrl);
    await cdp.open();
    await cdp.send("Page.enable");
    await cdp.send("DOM.enable");
    await cdp.send("Runtime.enable");

    // Chỉ chụp các kích thước đại diện chính cho toàn bộ 9 trang để kiểm chứng
    for (const page of HTML_PAGES) {
      const baseName = page.replace(".html", "");

      for (const vp of VIEWPORTS) {
        await cdp.send("Emulation.setDeviceMetricsOverride", {
          width: vp.width,
          height: vp.height,
          deviceScaleFactor: 1,
          mobile: vp.mobile,
          screenWidth: vp.width,
          screenHeight: vp.height
        });

        await cdp.send("Page.navigate", { url: `http://127.0.0.1:${port}/${page}` });
        await sleep(350);

        // Chụp giao diện Light mặc định (lưu đè các tệp proof 390 và 1280 chuẩn)
        const lightRes = await cdp.send("Page.captureScreenshot", {
          format: "png",
          clip: { x: 0, y: 0, width: vp.width, height: vp.height, scale: 1 }
        });
        const lightData = lightRes.result?.data;
        if (lightData) {
          const lightPath = path.join(proofDir, `${baseName}-${vp.name}.png`);
          fs.writeFileSync(lightPath, Buffer.from(lightData, "base64"));
          console.log(`  -> Đã lưu ảnh: ${path.basename(lightPath)}`);
        }

        // Chụp giao diện Tối (Dark) cho index và tai-ve để làm mẫu so sánh
        if (page === "index.html" || page === "tai-ve.html") {
          await cdp.send("Runtime.evaluate", {
            expression: `document.documentElement.setAttribute('data-theme', 'dark');`
          });
          await sleep(200);

          const darkRes = await cdp.send("Page.captureScreenshot", {
            format: "png",
            clip: { x: 0, y: 0, width: vp.width, height: vp.height, scale: 1 }
          });
          const darkData = darkRes.result?.data;
          if (darkData) {
            const darkPath = path.join(proofDir, `${baseName}-${vp.name}-dark.png`);
            fs.writeFileSync(darkPath, Buffer.from(darkData, "base64"));
            console.log(`  -> Đã lưu ảnh (Dark): ${path.basename(darkPath)}`);
          }
        }
      }
    }

    console.log("=== Đã chụp thành công toàn bộ ảnh kiểm chứng giao diện ===");
  } finally {
    if (cdp) cdp.close();
    if (proc) proc.kill();
    server.close();
    try {
      await rm(tempDir, { recursive: true, force: true });
    } catch {}
  }
}

main().catch((err) => {
  console.error("Lỗi:", err);
  process.exit(1);
});
