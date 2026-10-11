/**
 * Test Web Layout: Kiểm thử đáp ứng màn hình (Responsive) của website tĩnh server/3t-web
 * Sử dụng DevTools Protocol (CDP) kết nối tới Microsoft Edge / Chrome headless.
 * Kiểm tra các độ rộng: 360px, 390px, 768px, 1280px.
 * Tiêu chí:
 *   1. document.documentElement.scrollWidth <= window.innerWidth
 *   2. getBoundingClientRect().right <= innerWidth + 1 cho mọi phần tử hiển thị
 *      (ngoại trừ các phần tử nằm trong vùng chứa có overflow-x: auto / scroll).
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

const HTML_PAGES = [
  "index.html",
  "tinh-nang.html",
  "tai-ve.html",
  "co-gi-moi.html",
  "huong-dan.html",
  "ban-quyen.html",
  "lien-he.html",
  "trang-thai.html",
  "404.html",
  "admin/index.html",
  "tai-khoan/index.html"
];


const VIEWPORTS = [
  { width: 360, height: 844, mobile: true },
  { width: 390, height: 844, mobile: true },
  { width: 768, height: 1024, mobile: false },
  { width: 1280, height: 900, mobile: false }
];

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
      } else if (opcode === 8) { // Close
        this.socket.end();
      } else if (opcode === 9) { // Ping
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

  async evaluate(expression) {
    const res = await this.send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true
    });
    if (res.error) throw new Error(res.error.message || "Runtime.evaluate failed");
    return res.result?.result?.value;
  }

  close() {
    if (this.socket) {
      try { this.socket.end(); } catch {}
    }
  }
}

function createStaticServer(root) {
  const server = http.createServer((req, res) => {
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
  throw new Error("Không tìm thấy trình duyệt Edge hoặc Chrome trên hệ thống Windows.");
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
  proc.once("error", (err) => {
    console.error("Lỗi khởi chạy trình duyệt:", err);
  });

  // Chờ endpoint /json/version sẵn sàng
  const startTime = Date.now();
  while (Date.now() - startTime < 15000) {
    try {
      const resp = await fetch(`http://127.0.0.1:${debugPort}/json/version`);
      if (resp.ok) return proc;
    } catch {}
    await sleep(150);
  }
  proc.kill();
  throw new Error(`Trình duyệt không mở cổng CDP ${debugPort} sau 15 giây.`);
}

export async function runWebLayoutTests() {
  const results = [];
  const matrix = {}; // page -> { [width]: { pass, scrollWidth, innerWidth, overflowCount, details } }

  const server = createStaticServer(webDir);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const serverPort = server.address().port;

  const browserExe = findBrowserExecutable();
  const debugPort = await findFreePort();
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "vno-layout-test-"));
  let browserProc = null;
  let cdp = null;

  try {
    browserProc = await startBrowser(browserExe, debugPort, tempDir);

    // Lấy WebSocket URL của trang
    const targetsRes = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
    const targets = await targetsRes.json();
    const pageTarget = targets.find((t) => t.type === "page") || targets[0];
    if (!pageTarget || !pageTarget.webSocketDebuggerUrl) {
      throw new Error("Không tìm thấy target trang trong danh sách CDP: " + JSON.stringify(targets));
    }

    cdp = new SimpleWebSocketClient(pageTarget.webSocketDebuggerUrl);
    await cdp.open();
    await cdp.send("Page.enable");
    await cdp.send("DOM.enable");
    await cdp.send("Runtime.enable");

    for (const page of HTML_PAGES) {
      matrix[page] = {};

      for (const vp of VIEWPORTS) {
        // Áp dụng độ phân giải viewport mô phỏng
        await cdp.send("Emulation.setDeviceMetricsOverride", {
          width: vp.width,
          height: vp.height,
          deviceScaleFactor: 1,
          mobile: vp.mobile,
          screenWidth: vp.width,
          screenHeight: vp.height
        });

        // Điều hướng tới trang
        const pageUrl = `http://127.0.0.1:${serverPort}/${page}`;
        await cdp.send("Page.navigate", { url: pageUrl });

        // Chờ trang tải và tính toán layout xong
        await sleep(350);

        // Kiểm tra kích thước và phần tử tràn ngang so với targetWidth (vp.width)
        const targetWidth = vp.width;
        const evalResult = await cdp.evaluate(`
          (() => {
            const targetWidth = ${targetWidth};
            const innerWidth = window.innerWidth;
            const scrollWidth = document.documentElement.scrollWidth;
            const isScrollOk = scrollWidth <= targetWidth + 1 && innerWidth <= targetWidth + 1;

            function isInsideOverflowAuto(el) {
              let p = el.parentElement;
              while (p && p !== document.documentElement && p !== document.body) {
                const style = window.getComputedStyle(p);
                const ox = style.overflowX;
                const o = style.overflow;
                if (ox === "auto" || ox === "scroll" || o === "auto" || o === "scroll") {
                  return true;
                }
                p = p.parentElement;
              }
              return false;
            }

            const overflowingElements = [];
            const all = document.querySelectorAll('*');
            for (const el of all) {
              const style = window.getComputedStyle(el);
              if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue;
              if (isInsideOverflowAuto(el)) continue;

              const rect = el.getBoundingClientRect();
              if (rect.width === 0 && rect.height === 0) continue;

              // Kiểm tra xem cạnh phải có vượt quá targetWidth + 1px không
              if (rect.right > targetWidth + 1) {
                overflowingElements.push({
                  tag: el.tagName.toLowerCase(),
                  id: el.id || undefined,
                  className: (typeof el.className === 'string' && el.className.trim()) ? el.className.trim() : undefined,
                  right: Math.round(rect.right * 10) / 10,
                  width: Math.round(rect.width * 10) / 10,
                  text: (el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 45)
                });
              }
            }

            return {
              targetWidth,
              innerWidth,
              scrollWidth,
              isScrollOk,
              overflowCount: overflowingElements.length,
              overflowingElements: overflowingElements.slice(0, 8)
            };
          })()
        `);

        const isPass = Boolean(evalResult && evalResult.isScrollOk && evalResult.overflowCount === 0);
        const details = isPass
          ? `scrollWidth=${evalResult?.scrollWidth}px, innerWidth=${evalResult?.innerWidth}px <= target=${targetWidth}px`
          : `scrollWidth=${evalResult?.scrollWidth}px, innerWidth=${evalResult?.innerWidth}px vs target=${targetWidth}px (${evalResult?.overflowCount} phần tử tràn: ` +
            JSON.stringify(evalResult?.overflowingElements || []) + ")";

        matrix[page][vp.width] = {
          pass: isPass,
          scrollWidth: evalResult?.scrollWidth,
          innerWidth: evalResult?.innerWidth,
          overflowCount: evalResult?.overflowCount,
          details
        };

        results.push({
          name: `[Web Layout] ${page} @ ${vp.width}px`,
          pass: isPass,
          error: isPass ? undefined : details
        });
      }
    }
  } catch (err) {
    console.error("LỖI NGOẠI LỆ TẠI CDP/TEST:", err);
    results.push({
      name: "[Web Layout] Khởi chạy kiểm thử bố cục giao diện",
      pass: false,
      error: String(err?.stack || err)
    });
  } finally {
    if (cdp) {
      try { cdp.close(); } catch {}
    }
    if (browserProc) {
      try { browserProc.kill(); } catch {}
    }
    server.close();
    try {
      await rm(tempDir, { recursive: true, force: true });
    } catch {}
  }

  // In bảng tổng hợp kết quả bố cục theo ma trận Trang x Chiều rộng
  printLayoutTable(matrix);

  return results;
}

function printLayoutTable(matrix) {
  console.log("\n==========================================================================");
  console.log("            BẢNG TỔNG HỢP KIỂM TRA ĐÁP ỨNG BỐ CỤC (LAYOUT MATRIX)        ");
  console.log("==========================================================================");
  console.log("Trang HTML           | 360 px    | 390 px    | 768 px    | 1280 px   | Kết quả");
  console.log("--------------------+-----------+-----------+-----------+-----------+--------");

  for (const page of HTML_PAGES) {
    const row = matrix[page] || {};
    const c360 = `${row[360]?.pass ? "PASS" : "FAIL"} (${row[360]?.scrollWidth}/${row[360]?.innerWidth})`;
    const c390 = `${row[390]?.pass ? "PASS" : "FAIL"} (${row[390]?.scrollWidth}/${row[390]?.innerWidth})`;
    const c768 = `${row[768]?.pass ? "PASS" : "FAIL"} (${row[768]?.scrollWidth}/${row[768]?.innerWidth})`;
    const c1280 = `${row[1280]?.pass ? "PASS" : "FAIL"} (${row[1280]?.scrollWidth}/${row[1280]?.innerWidth})`;
    const allPass = row[360]?.pass && row[390]?.pass && row[768]?.pass && row[1280]?.pass;
    const summary = allPass ? "PASS" : "FAIL";

    const paddedPage = page.padEnd(16, " ");
    console.log(`${paddedPage} | ${c360.padEnd(16)} | ${c390.padEnd(16)} | ${c768.padEnd(16)} | ${c1280.padEnd(16)} | ${summary}`);
  }
  console.log("==========================================================================");

  // In chi tiết lỗi nếu có trang FAIL
  for (const page of HTML_PAGES) {
    const row = matrix[page] || {};
    for (const vp of VIEWPORTS) {
      const item = row[vp.width];
      if (item && !item.pass) {
        console.log(`  [!] ${page} @ ${vp.width}px: ${item.details}`);
      }
    }
  }
  console.log("");
}

// Chạy trực tiếp nếu tệp được gọi qua CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const results = await runWebLayoutTests();
  const failed = results.filter((r) => !r.pass);
  if (failed.length > 0) {
    console.error(`Thất bại: Có ${failed.length}/${results.length} phép kiểm thử bố cục không đạt.`);
    process.exit(1);
  } else {
    console.log(`Thành công: Toàn bộ ${results.length} phép kiểm thử bố cục đều đạt.`);
    process.exit(0);
  }
}
