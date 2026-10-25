// Lenh dieu khien cho phien app desktop luon mo (scripts/audit-0610/app_session_server.mjs).
// Tach khoi server de unit test duoc bang CDP gia (session-commands.test.mjs). Chi ha tang test.
import { writeFileSync } from "node:fs";
import path from "node:path";
import { press, typeText, mouseClick, mouseDoubleClick, mouseMove, mouseDrag, sleep } from "./actions.mjs";
import { resizeViewport } from "./viewport.mjs";

/**
 * @param {{cdp: {send: Function, evaluate: Function}, shotDir: string, onClose?: Function}} context
 * @returns {(cmd: string, body?: object) => Promise<unknown>}
 */
export function createCommandHandler({ cdp, shotDir, onClose = async () => {} }) {
  return async function handle(cmd, body = {}) {
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
          await mouseClick(cdp, pos.x, pos.y, body.mods || {}); return pos;
        }
        await mouseClick(cdp, body.x, body.y, body.mods || {}); return true;
      case "dblclick": await mouseDoubleClick(cdp, body.x, body.y, body.mods || {}); return true;
      case "move": await mouseMove(cdp, body.x, body.y, body.mods || {}); return true;
      case "drag":
        await mouseDrag(cdp, body.x1, body.y1, body.x2, body.y2, { modifiers: body.mods || {}, steps: body.steps || 10 });
        return true;
      case "size": return await resizeViewport(cdp, body.width ?? 1366, body.height ?? 768);
      case "wait": await sleep(body.ms || 500); return true;
      case "close": setTimeout(() => { onClose(); }, 100); return "dang dong";
      default: return { error: "lenh la: " + cmd };
    }
  };
}
