// FIX-SLIDES-2510 — app desktop thật qua CDP (macOS: PYWEBVIEW_GUI=qt; Windows: WebView2).
// D7: dấu đầu dòng khi soạn nằm trong khung; D8: chữ gõ vào Mũi tên phải hiện trên hình (đo điểm ảnh);
// lưu PPTX → mở lại: D1 tiêu đề/nội dung chỉ vẽ một lần, D8 mũi tên giữ tỉ lệ và vẽ bằng SVG.
// Chạy: VNO_PYTHON=<python> [VNO_FIX2510_OUT=<thư mục ảnh>] node tests/live/cdp/slides-fix-2510.desktop.mjs
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, statSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { launchApp, repoRoot } from "./session.mjs";
import { canonicalPath, samePath } from "./output-path.mjs";
import { click, insertText, press, mouseClick, sleep } from "./actions.mjs";

const outDir = process.env.VNO_FIX2510_OUT || mkdtempSync(path.join(os.tmpdir(), "vno-fix2510-"));
mkdirSync(outDir, { recursive: true });
const pptx = path.join(outDir, "fix2510-roundtrip.pptx");
const results = [];
const check = (name, ok, detail = "") => {
  results.push(Boolean(ok));
  console.log(`${ok ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${String(detail).slice(0, 300)}` : ""}`);
};

/** Giải mã PNG 8-bit RGB/RGBA không xen kẽ (ảnh chụp Chromium) → {width,height,channels,data}. */
function decodePng(buffer) {
  let offset = 8;
  let width = 0; let height = 0; let colorType = 6; const idat = [];
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const chunk = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") { width = chunk.readUInt32BE(0); height = chunk.readUInt32BE(4); colorType = chunk[9]; }
    else if (type === "IDAT") idat.push(chunk);
    else if (type === "IEND") break;
    offset += 12 + length;
  }
  const channels = colorType === 6 ? 4 : 3;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const data = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    for (let x = 0; x < stride; x++) {
      const value = raw[y * (stride + 1) + 1 + x];
      const left = x >= channels ? data[y * stride + x - channels] : 0;
      const up = y > 0 ? data[(y - 1) * stride + x] : 0;
      const upLeft = y > 0 && x >= channels ? data[(y - 1) * stride + x - channels] : 0;
      let predictor = 0;
      if (filter === 1) predictor = left;
      else if (filter === 2) predictor = up;
      else if (filter === 3) predictor = (left + up) >> 1;
      else if (filter === 4) {
        const p = left + up - upLeft; const pa = Math.abs(p - left); const pb = Math.abs(p - up); const pc = Math.abs(p - upLeft);
        predictor = pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
      }
      data[y * stride + x] = (value + predictor) & 0xff;
    }
  }
  return { width, height, channels, data };
}

async function screenshot(cdp, name) {
  const shot = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  const buffer = Buffer.from((shot.result || shot).data, "base64");
  writeFileSync(path.join(outDir, name), buffer);
  return buffer;
}

/** Số điểm ảnh gần trắng trong hình chữ nhật CSS (chữ trắng trên nền xanh của hình). */
async function whitePixelsIn(cdp, rect, shotName) {
  const dpr = await cdp.evaluate("window.devicePixelRatio || 1");
  const png = decodePng(await screenshot(cdp, shotName));
  let count = 0; let blue = 0;
  const x0 = Math.max(0, Math.floor(rect.left * dpr)); const x1 = Math.min(png.width, Math.ceil(rect.right * dpr));
  const y0 = Math.max(0, Math.floor(rect.top * dpr)); const y1 = Math.min(png.height, Math.ceil(rect.bottom * dpr));
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const i = (y * png.width + x) * png.channels;
    const [r, g, b] = [png.data[i], png.data[i + 1], png.data[i + 2]];
    if (r > 225 && g > 225 && b > 225) count++;
    if (b > 180 && r < 120) blue++;
  }
  return { white: count, blue, area: Math.max(0, (x1 - x0) * (y1 - y0)) };
}

const ev = (session, expression) => session.cdp.evaluate(expression, { awaitPromise: true });

/** Đo dấu đầu dòng của khung nội dung: ul có thụt lề và li nằm đủ xa mép trong khung để vẽ dấu. */
const BULLET_PROBE = `(() => {
  const body = window.__vnoAppInstance.adapter.canvas.bodyEl;
  const list = body?.querySelector('ul, ol');
  if (!list) return JSON.stringify({ list: false, html: (body?.innerHTML || '').slice(0, 200) });
  const li = list.querySelector('li');
  const bs = getComputedStyle(body); const ls = getComputedStyle(list);
  const bodyContentLeft = body.getBoundingClientRect().left + parseFloat(bs.borderLeftWidth) + parseFloat(bs.paddingLeft);
  return JSON.stringify({ list: true, items: list.querySelectorAll('li').length, listStyle: ls.listStyleType,
    padLeft: parseFloat(ls.paddingLeft), liInset: Math.round(li.getBoundingClientRect().left - bodyContentLeft) });
})()`;

async function verifyBullets(session, label) {
  const probe = JSON.parse(await ev(session, BULLET_PROBE));
  check(`${label}: khung nội dung có danh sách đầu dòng`, probe.list && probe.items >= 3, JSON.stringify(probe));
  // Dấu «•» (list-style outside) cần chỗ bên trái li; li phải lùi vào ≥ 12 px so với mép trong của khung.
  check(`${label}: dấu đầu dòng nằm trong khung (ul padding-left > 0, li lùi ≥ 12 px)`, probe.list && probe.padLeft > 0 && probe.liInset >= 12, JSON.stringify(probe));
}

const SHAPE_PROBE = `(() => {
  const c = window.__vnoAppInstance.adapter.canvas;
  const shape = (c.slides[c.currentSlideIndex].shapes || []).find((s) => String(s.text || '').includes('Mục tiêu'));
  if (!shape) return JSON.stringify({ found: false });
  const el = c.shapesLayer.querySelector('[data-shape-id="' + shape.id + '"]');
  const text = el?.querySelector('.vno-shape-text');
  const r = text?.getBoundingClientRect();
  const e = el?.getBoundingClientRect();
  // Chỉ đo phần thân mũi tên (preset rightArrow: x 0–60 %, y 30–70 %) giao với khối chữ — vùng này luôn tô xanh,
  // nên điểm ảnh trắng ở đây chỉ có thể là chữ.
  const rect = r && e ? { left: Math.max(r.left, e.left) + 2, right: Math.min(r.right, e.left + e.width * 0.6) - 2,
    top: Math.max(r.top, e.top + e.height * 0.3) + 1, bottom: Math.min(r.bottom, e.top + e.height * 0.7) - 1 } : null;
  return JSON.stringify({ found: true, type: shape.type, geomType: shape.geomType, w: shape.w, h: shape.h, text: shape.text,
    svg: !!el?.querySelector('svg.vno-shape-geometry'), domText: text?.textContent || '', rect });
})()`;

async function verifyShapeText(session, label, shotName) {
  const probe = JSON.parse(await ev(session, SHAPE_PROBE));
  check(`${label}: hình mũi tên có chữ «Mục tiêu 2026» trong mô hình`, probe.found && probe.text === "Mục tiêu 2026", JSON.stringify(probe));
  check(`${label}: hình vẽ bằng SVG mũi tên (không phải chữ nhật)`, probe.svg, `type=${probe.type} geom=${probe.geomType}`);
  if (!probe.rect) { check(`${label}: chữ hiện trên hình (điểm ảnh trắng)`, false, "không có khối chữ"); return probe; }
  const px = await whitePixelsIn(session.cdp, probe.rect, shotName);
  // Chữ trắng trên thân mũi tên xanh: hàng trăm điểm ảnh trắng; SVG che chữ → 0.
  check(`${label}: chữ hiện trên hình (điểm ảnh trắng trên thân mũi tên)`, px.white >= 40 && px.blue > px.area * 0.3, JSON.stringify(px));
  return probe;
}

/**
 * main.py phục vụ giao diện ở 127.0.0.1:8080 (chung cho mọi worktree) không kèm Cache-Control, và QtWebEngine trên
 * macOS dùng chung bộ nhớ đệm đĩa (~/Library/Caches/main.py/QtWebEngine) — phiên có thể chạy bản CSS/JS cũ hoặc của
 * worktree khác. Kiểm bản trong bộ nhớ đệm của trang khớp tệp trên đĩa của worktree này trước khi tin kết quả.
 */
async function verifyServedCode(session, label) {
  const files = ["apps/slides/slides.css", "apps/slides/slides-canvas.js", "adapters/libreoffice/slides/slides-adapter.js"];
  const served = JSON.parse(await ev(session, `(async () => { const out = {}; for (const f of ${JSON.stringify(files)}) { const r = await fetch('/' + f, { cache: 'force-cache' }); out[f] = await r.text(); } return JSON.stringify(out); })()`));
  const stale = files.filter((f) => served[f] !== readFileSync(path.join(repoRoot, f), "utf8"));
  check(`${label}: mã đang chạy khớp worktree (không dính bộ nhớ đệm HTTP cổng 8080 dùng chung)`, stale.length === 0, stale.join(", ") || "khớp");
}

async function clickCanvasBlank(session) {
  const p = JSON.parse(await ev(session, `(() => { const r = window.__vnoAppInstance.adapter.canvas.canvasEl.getBoundingClientRect(); return JSON.stringify({ x: r.left + 12, y: r.bottom - 12 }); })()`));
  await mouseClick(session.cdp, p.x, p.y);
  await sleep(300);
}

async function typeInto(session, selectorExpr, text) {
  const p = JSON.parse(await ev(session, `(() => { const el = ${selectorExpr}; el.scrollIntoView({ block: 'nearest' }); const r = el.getBoundingClientRect(); return JSON.stringify({ x: r.left + 30, y: r.top + r.height / 2 }); })()`));
  await mouseClick(session.cdp, p.x, p.y);
  await sleep(250);
  await insertText(session.cdp, text);
}

/**
 * Chờ phiên mở lại nạp xong ĐÚNG tệp. So đường dẫn ở phía Node bằng samePath() (realpath + chuẩn hóa): trên Windows
 * os.tmpdir() có thể là tên rút gọn 8.3 (3TCOMP~1) còn app trả tên dài — so chuỗi trong trang trước đây không bao giờ khớp.
 */
async function waitForReopened(session, expectedPath, timeoutMilliseconds = 240000) {
  const deadline = Date.now() + timeoutMilliseconds;
  let last = null;
  while (Date.now() < deadline) {
    last = JSON.parse(await ev(session, `(() => { const a = window.__vnoAppInstance?.adapter; return JSON.stringify({ path: String(a?._sourcePath || a?.sourceFilePath || ''), slides: a?.canvas?.slides?.length || 0 }); })()`).catch(() => "null"));
    if (last && last.slides >= 2 && samePath(last.path, expectedPath)) return last;
    await sleep(500);
  }
  throw new Error(`Hết thời gian chờ mở lại ${expectedPath}: ${JSON.stringify(last)} (chuẩn hóa: ${canonicalPath(last?.path)} ≠ ${canonicalPath(expectedPath)})`);
}

let session = null;
try {
  // ---------------------------------------------------------------- Soạn (bản mới)
  session = await launchApp("slides", { startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
  await session.cdp.waitFor("window.__vnoAppInstance?.adapter?.canvas?.slides?.length > 0", { timeoutMilliseconds: 120000, intervalMilliseconds: 300 });
  await sleep(1500);
  await verifyServedCode(session, "Phiên soạn");
  const C = "window.__vnoAppInstance.adapter.canvas";
  await typeInto(session, `${C}.titleEl`, "Báo cáo tổng hợp");
  await typeInto(session, `${C}.bodyEl`, "Nhóm Dự án mẫu");
  await clickCanvasBlank(session);
  await click(session.cdp, '[data-command-id="slides.slide.new"]');
  await sleep(800);
  await typeInto(session, `${C}.titleEl`, "Việc cần làm");
  await typeInto(session, `${C}.bodyEl`, "");
  await click(session.cdp, '[data-command-id="slides.list.bullet"]');
  await sleep(300);
  await insertText(session.cdp, "Mục một"); await press(session.cdp, "Enter");
  await insertText(session.cdp, "Mục hai"); await press(session.cdp, "Enter");
  await insertText(session.cdp, "Mục ba");
  await sleep(300);
  await verifyBullets(session, "Soạn");
  await screenshot(session.cdp, "edit-bullets.png");

  // D8: chèn Mũi tên phải qua lệnh thư viện hình, gõ phím (bắt đầu sửa chữ) rồi Esc.
  await ev(session, `(async () => { const { globalCommandBus } = await import('/platform/commands/command-bus.js'); await globalCommandBus.execute('slides.shape.insertPreset', 'rightArrow'); return 1; })()`);
  await sleep(500);
  await press(session.cdp, "M");
  await insertText(session.cdp, "ục tiêu 2026");
  await press(session.cdp, "Escape");
  await sleep(300);
  await clickCanvasBlank(session);
  await verifyShapeText(session, "Soạn", "edit-shape-text.png");

  // Lưu PPTX qua đường Lưu thật của adapter (soffice FODP → PPTX).
  const saved = await ev(session, `(async () => { const a = window.__vnoAppInstance.adapter; a.sourceFilePath = ${JSON.stringify(pptx)}; a.isDirty = true; await a.save(); return JSON.stringify({ dirty: a.isDirty, path: a.sourceFilePath }); })()`);
  await sleep(1000);
  check("Lưu PPTX thành công", existsSync(pptx) && statSync(pptx).size > 0 && JSON.parse(saved).dirty === false, saved);
  await session.close(); session = null;

  // ---------------------------------------------------------------- Mở lại
  session = await launchApp("slides", { filePath: pptx, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
  await waitForReopened(session, pptx);
  await sleep(2500);
  await verifyServedCode(session, "Phiên mở lại");
  for (const [index, title, bodyText] of [[0, "Báo cáo tổng hợp", "Nhóm Dự án mẫu"], [1, "Việc cần làm", "Mục một"]]) {
    await ev(session, `${C}.selectSlide(${index})`);
    await sleep(700);
    const probe = JSON.parse(await ev(session, `(() => {
      const c = ${C}; const s = c.slides[${index}];
      const visible = (el) => el && el.offsetParent !== null && getComputedStyle(el).display !== 'none';
      const nodes = [c.titleEl, c.bodyEl, ...c.shapesLayer.querySelectorAll('.vno-slide-shape-item')].filter(visible);
      const count = (needle) => nodes.filter((el) => (el.innerText || '').includes(needle)).length;
      return JSON.stringify({ layout: s.layoutType, title: s.title, textboxes: (s.shapes || []).filter((x) => x.type === 'textbox').map((x) => x.text),
        titleDraws: count(${JSON.stringify(title)}), bodyDraws: count(${JSON.stringify(bodyText)}) });
    })()`));
    check(`Mở lại trang ${index + 1}: tiêu đề vẽ đúng 1 lần`, probe.titleDraws === 1 && probe.title === title, JSON.stringify(probe));
    check(`Mở lại trang ${index + 1}: nội dung vẽ đúng 1 lần, không hộp chữ trùng`, probe.bodyDraws === 1 && probe.textboxes.length === 0, JSON.stringify(probe));
    await screenshot(session.cdp, `reopen-slide${index + 1}.png`);
  }
  await verifyBullets(session, "Mở lại trang 2");
  const reopened = await verifyShapeText(session, "Mở lại trang 2", "reopen-shape.png");
  // Lúc chèn 200×120 (tỉ lệ 0,6); LibreOffice co theo chữ làm còn ~0,14.
  const ratio = reopened.found ? reopened.h / reopened.w : 0;
  check("Mở lại: mũi tên giữ tỉ lệ cao/rộng ≈ 0,6 (không bị co theo chữ khi lưu)", Math.abs(ratio - 0.6) < 0.06, `w=${reopened.w} h=${reopened.h} ratio=${ratio.toFixed(3)}`);
} catch (error) {
  check("Phiên CDP không phát sinh ngoại lệ", false, error.stack || error.message);
  if (session) console.error(session.output.slice(-3000));
} finally {
  if (session) await session.close().catch(() => {});
}
console.log(`ảnh/tệp: ${outDir}`);
console.log(`FIX-SLIDES-2510 CDP: ${results.filter(Boolean).length}/${results.length} PASS`);
if (results.some((value) => !value)) process.exit(1);
