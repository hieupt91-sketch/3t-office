// Phien dieu khien app desktop LUON MO de kiem thu truc quan lien tuc nhu nguoi dung that (khong mo roi tat).
// Khoi dong: node --experimental-websocket scripts/audit-0610/app_session_server.mjs <writer|sheet|slides> [duong-dan-tep] [--port=47001] [--ttl=600]
// Lenh (HTTP POST JSON toi http://127.0.0.1:PORT/<lenh>): eval {expr}, shot {name}, press {key, mods, times}, type {text, delay},
//   click {selector|x,y, mods}, dblclick {x,y, mods}, move {x,y}, drag {x1,y1,x2,y2, mods, steps}, size {width,height}, wait {ms}, close {}.
// size: WebView2 doi kich thuoc cua so that; QtWebEngine (macOS) khong ho tro nen gia lap vung nhin (ket qua co mode).
// --ttl=<giay>: tu dong dong app + thoat sau ngan ay giay (mac dinh 600) de khong bao gio giu heavy.lock qua lau.
import http from "node:http";
import { mkdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { launchApp } from "../../tests/live/cdp/session.mjs";
import { createCommandHandler } from "../../tests/live/cdp/session-commands.mjs";

const args = process.argv.slice(2);
const app = args.find((a) => !a.startsWith("--")) || "writer";
const filePath = args.filter((a) => !a.startsWith("--"))[1] || undefined;
const port = Number((args.find((a) => a.startsWith("--port=")) || "--port=47001").slice(7));
const ttlSeconds = Number((args.find((a) => a.startsWith("--ttl=")) || "--ttl=600").slice(6));
const sessionRoot = process.env.VNO_LIVE_SESSION_ROOT
  || (process.platform === "win32" ? "E:\\VNOffice-profiles" : path.join(os.tmpdir(), "vno-live-sessions"));
const shotDir = path.join(sessionRoot, "ui-shots", `live-${app}`);
const localAppData = path.join(sessionRoot, `live-${app}`);
mkdirSync(shotDir, { recursive: true });
const session = await launchApp(app, {
  filePath,
  startTimeoutMilliseconds: 180000,
  readyTimeoutMilliseconds: 180000,
  localAppData: process.env.VNO_CDP_LOCALAPPDATA || `${localAppData}-${Date.now()}`,
});
let closing = false;
async function shutdown(reason) {
  if (closing) return;
  closing = true;
  console.log("DONG APP:", reason);
  await session.close().catch(() => {});
  process.exit(0);
}
if (ttlSeconds > 0) setTimeout(() => shutdown("het ttl " + ttlSeconds + "s"), ttlSeconds * 1000).unref();
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
console.log("APP MO, cong dieu khien", port, "ttl", ttlSeconds + "s", "pid main.py", session.child.pid);

const handle = createCommandHandler({ cdp: session.cdp, shotDir, onClose: () => shutdown("lenh close") });

http.createServer((req, res) => {
  let data = "";
  req.on("data", (c) => { data += c; });
  req.on("end", async () => {
    try {
      const body = data ? JSON.parse(data) : {};
      const out = await handle(req.url.replace(/^\//, ""), body);
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ ok: true, result: out }));
    } catch (error) {
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ ok: false, error: String(error && error.message || error).slice(0, 600) }));
    }
  });
}).listen(port, "127.0.0.1");
