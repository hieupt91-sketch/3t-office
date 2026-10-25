// Phien dieu khien app desktop LUON MO de kiem thu truc quan lien tuc nhu nguoi dung that (khong mo roi tat).
// Khoi dong: node --experimental-websocket scripts/audit-0610/app_session_server.mjs <writer|sheet|slides> [duong-dan-tep] [--port=47001]
// Lenh (HTTP POST JSON toi http://127.0.0.1:PORT/<lenh>): eval {expr}, shot {name}, press {key, mods, times}, type {text, delay},
//   click {selector|x,y}, dblclick {x,y}, move {x,y}, size {width,height}, wait {ms}, close {}.
import http from "node:http";
import { mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { launchApp } from "../../tests/live/cdp/session.mjs";
import { press, typeText, mouseClick, mouseDoubleClick, mouseMove } from "../../tests/live/cdp/actions.mjs";

const args = process.argv.slice(2);
const app = args.find((a) => !a.startsWith("--")) || "writer";
const filePath = args.filter((a) => !a.startsWith("--"))[1] || undefined;
const port = Number((args.find((a) => a.startsWith("--port=")) || "--port=47001").slice(7));
const sessionRoot = process.env.VNO_LIVE_SESSION_ROOT
  || (process.platform === "win32" ? "E:\\VNOffice-profiles" : path.join(os.tmpdir(), "vno-live-sessions"));
const shotDir = path.join(sessionRoot, "ui-shots", `live-${app}`);
const localAppData = path.join(sessionRoot, `live-${app}`);
mkdirSync(shotDir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const session = await launchApp(app, {
  filePath,
  startTimeoutMilliseconds: 180000,
  readyTimeoutMilliseconds: 180000,
  localAppData: process.env.VNO_CDP_LOCALAPPDATA || `${localAppData}-${Date.now()}`,
});
console.log("APP MO, cong dieu khien", port);

async function handle(cmd, body) {
  const cdp = session.cdp;
  switch (cmd) {
    case "eval": return await cdp.evaluate(body.expr, { awaitPromise: true, timeoutMilliseconds: body.timeout || 60000 });
    case "shot": {
      const r = await cdp.send("Page.captureScreenshot", { format: "png" }, 30000);
      const file = path.join(shotDir, (body.name || "shot") + ".png");
      writeFileSync(file, Buffer.from((r.result || r).data, "base64"));
      return { file };
    }
    case "press": { for (let i = 0; i < (body.times || 1); i += 1) await press(cdp, body.key, body.mods || {}, body.settle ?? 120); return true; }
    case "type": await typeText(cdp, body.text, body.delay ?? 8); return true;
    case "click":
      if (body.selector) {
        const pos = await cdp.evaluate(`(() => { const e = document.querySelector(${JSON.stringify(body.selector)}); if (!e) return null; e.scrollIntoView({ block: 'nearest' }); const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
        if (!pos) return { error: "khong thay " + body.selector };
        await mouseClick(cdp, pos.x, pos.y); return pos;
      }
      await mouseClick(cdp, body.x, body.y); return true;
    case "dblclick": await mouseDoubleClick(cdp, body.x, body.y); return true;
    case "move": await mouseMove(cdp, body.x, body.y); return true;
    case "size": {
      const win = await cdp.send("Browser.getWindowForTarget", {}, 15000);
      const windowId = (win.result || win).windowId;
      await cdp.send("Browser.setWindowBounds", { windowId, bounds: { windowState: "normal", width: body.width || 1366, height: body.height || 768 } }, 15000);
      await sleep(800);
      return await cdp.evaluate("window.innerWidth + 'x' + window.innerHeight");
    }
    case "wait": await sleep(body.ms || 500); return true;
    case "close": setTimeout(async () => { await session.close(); process.exit(0); }, 100); return "dang dong";
    default: return { error: "lenh la: " + cmd };
  }
}

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
