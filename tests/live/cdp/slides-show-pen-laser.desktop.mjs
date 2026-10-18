// Slides: trình chiếu - Bút vẽ (Ctrl+P) để lại nét nhìn thấy được, Con trỏ laser (Ctrl+L) chấm theo chuột, Tẩy, lưu nét thành hình.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { launchApp } from "./session.mjs";
import { press } from "./actions.mjs";

const profile = process.env.VNO_CDP_LOCALAPPDATA || path.join(os.tmpdir(), `vno-pen-${Date.now()}`);
fs.mkdirSync(profile, { recursive: true });
const session = await launchApp("slides", { localAppData: profile });
const results = [];
const check = (name, pass, detail = "") => { results.push(Boolean(pass)); console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`); };
try {
  const { cdp } = session;
  await new Promise(r => setTimeout(r, 3000));
  const ev = (expr) => cdp.evaluate(expr, { awaitPromise: true, timeoutMilliseconds: 120000 });
  const mouse = (type, x, y, extra = {}) => cdp.send("Input.dispatchMouseEvent", { type, x, y, button: "left", buttons: type === "mouseReleased" ? 0 : 1, clickCount: 1, ...extra });
  const started = await ev(`Boolean(window.__show = window.__vnoAppInstance.adapter.canvas.startSlideShow(0))`);
  check("Bắt đầu trình chiếu", started);
  await new Promise(r => setTimeout(r, 800));
  const box = JSON.parse(await ev(`JSON.stringify((() => { const r = document.querySelector('.vno-slideshow-overlay').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; })())`));
  const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
  // Laser
  await press(cdp, "l", { ctrl: true });
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: cx + 40, y: cy + 30 });
  await new Promise(r => setTimeout(r, 200));
  const dot = JSON.parse(await ev(`JSON.stringify((() => { const d = document.querySelector('.vno-slideshow-laser-dot'); if (!d) return null; const r = d.getBoundingClientRect(); return { display: getComputedStyle(d).display, x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width }; })())`));
  check("Laser: chấm sáng hiện và nằm tại vị trí chuột", dot && dot.display !== "none" && Math.abs(dot.x - (cx + 40)) < 4 && Math.abs(dot.y - (cy + 30)) < 4 && dot.w > 5, JSON.stringify(dot));
  // Bút
  await press(cdp, "p", { ctrl: true });
  await mouse("mouseMoved", cx - 100, cy - 60, { buttons: 0 });
  await mouse("mousePressed", cx - 100, cy - 60);
  for (let i = 1; i <= 8; i++) await mouse("mouseMoved", cx - 100 + i * 25, cy - 60 + i * 10);
  await mouse("mouseReleased", cx + 100, cy + 20);
  await new Promise(r => setTimeout(r, 200));
  const ink = JSON.parse(await ev(`JSON.stringify((() => { const svg = document.querySelector('.vno-slideshow-ink-overlay'); const p = svg && svg.querySelector('path'); if (!p) return { svg: !!svg, path: false }; const r = p.getBoundingClientRect(); return { svg: true, path: true, ns: p.namespaceURI, svgNs: svg.namespaceURI, w: Math.round(r.width), h: Math.round(r.height) }; })())`));
  check("Bút: nét vẽ nằm trong SVG thật (đúng namespace)", ink.path && ink.ns === "http://www.w3.org/2000/svg" && ink.svgNs === "http://www.w3.org/2000/svg", JSON.stringify(ink));
  check("Bút: nét vẽ có kích thước nhìn thấy được", ink.path && ink.w > 50 && ink.h > 20, JSON.stringify(ink));
  check("Ctrl+P khi trình chiếu không mở Xem trước khi in", await ev(`document.querySelector(".vno-print-preview") === null`));
  check("Một lần kéo chuột chỉ tạo một nét", (await ev(`window.__show.getStrokes().length`)) === 1 && (await ev(`document.querySelectorAll(".vno-slideshow-ink-overlay path").length`)) === 1);
  // Tẩy (xóa nét trang hiện tại)
  const erased = await ev(`(() => { const s = window.__show; if (typeof s.eraseInk === 'function') { s.eraseInk(); return 'api'; } return 'none'; })()`);
  check("Tẩy: xóa hết nét trên trang hiện tại", erased === "api" && (await ev(`window.__show.getStrokes().length`)) === 0 && (await ev(`document.querySelectorAll(".vno-slideshow-ink-overlay path").length`)) === 0);
  await press(cdp, "Escape");
  await press(cdp, "Escape");
  await ev(`window.__show?.close?.(false)`);
} catch (error) {
  check("Không phát sinh ngoại lệ", false, error.stack || error.message);
} finally { await session.close().catch(() => {}); }
if (results.some(r => !r)) process.exit(1);
