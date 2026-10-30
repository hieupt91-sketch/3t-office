// SLIDES-2-3110 — app desktop thật qua CDP (macOS: PYWEBVIEW_GUI=qt; Windows: WebView2).
// Soạn: chủ đề Xanh Lá + Mũi tên phải/Chữ nhật/Elip có chữ → c: ngăn trái, Sắp xếp trang, trình chiếu vẽ mũi tên bằng
// SVG (đo điểm ảnh: góc trên-trái của khung mũi tên KHÔNG tô); lưu PPTX → d: chữ nhật/elip anchor="ctr";
// mở lại → a: thanh nhấn chủ đề hiện, đúng màu; b: khung trang nằm gọn vùng nhìn; c, d lặp lại trên tệp mở lại.
// Chạy: VNO_PYTHON=<python> VNOFFICE_SOFFICE_PATH=<soffice> [VNO_SLIDES23110_OUT=<thư mục>] node tests/live/cdp/slides-2-3110.desktop.mjs
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, statSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { launchApp, repoRoot } from "./session.mjs";
import { canonicalPath, samePath } from "./output-path.mjs";
import { insertText, press, mouseClick, sleep } from "./actions.mjs";
import { readZipEntry } from "../../helpers/zip-package.mjs";

const outDir = process.env.VNO_SLIDES23110_OUT || mkdtempSync(path.join(os.tmpdir(), "vno-slides23110-"));
mkdirSync(outDir, { recursive: true });
const pptx = path.join(outDir, "slides2-3110-roundtrip.pptx");
const EMERALD = { accent: "rgb(5, 150, 105)", title: "rgb(6, 78, 59)" };
const results = [];
const check = (name, ok, detail = "") => {
  results.push(Boolean(ok));
  console.log(`${ok ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${String(detail).slice(0, 300)}` : ""}`);
};
const ev = (session, expression) => session.cdp.evaluate(expression, { awaitPromise: true });
const C = "window.__vnoAppInstance.adapter.canvas";

/** Giải mã PNG 8-bit RGB/RGBA không xen kẽ (ảnh chụp Chromium). */
function decodePng(buffer) {
  let offset = 8; let width = 0; let height = 0; let colorType = 6; const idat = [];
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

async function screenshot(session, name) {
  const shot = await session.cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  const buffer = Buffer.from((shot.result || shot).data, "base64");
  writeFileSync(path.join(outDir, name), buffer);
  return buffer;
}

/**
 * Mũi tên phải (preset: thân y 30–70 %, đầu từ x 60 %): góc trên-trái của khung (x 3–45 %, y 3–22 %) là nền, thân
 * (x 5–55 %, y 40–60 %) tô màu của hình (rect.fill, «#rrggbb» lấy từ SVG/nền phần tử). Vẽ thành chữ nhật → góc cũng tô.
 */
async function arrowShapeOk(session, rect, shotName) {
  const hex = String(rect.fill || "#3b82f6").replace("#", "");
  const target = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const dpr = await ev(session, "window.devicePixelRatio || 1");
  const png = decodePng(await screenshot(session, shotName));
  const blueShare = (fx0, fx1, fy0, fy1) => {
    let blue = 0; let total = 0;
    const x0 = Math.floor((rect.left + rect.width * fx0) * dpr); const x1 = Math.ceil((rect.left + rect.width * fx1) * dpr);
    const y0 = Math.floor((rect.top + rect.height * fy0) * dpr); const y1 = Math.ceil((rect.top + rect.height * fy1) * dpr);
    for (let y = Math.max(0, y0); y < Math.min(png.height, y1); y++) for (let x = Math.max(0, x0); x < Math.min(png.width, x1); x++) {
      const i = (y * png.width + x) * png.channels;
      const [r, g, b] = [png.data[i], png.data[i + 1], png.data[i + 2]];
      total++;
      if (Math.abs(r - target[0]) + Math.abs(g - target[1]) + Math.abs(b - target[2]) < 60) blue++;
    }
    return total ? blue / total : 0;
  };
  const corner = blueShare(0.03, 0.45, 0.03, 0.22);
  const body = blueShare(0.05, 0.55, 0.4, 0.6);
  return { ok: corner < 0.1 && body > 0.5, fill: rect.fill, corner: Number(corner.toFixed(3)), body: Number(body.toFixed(3)) };
}

async function insertShapeWithText(session, presetId, firstKey, rest) {
  await ev(session, `(async () => { const { globalCommandBus } = await import('/platform/commands/command-bus.js'); await globalCommandBus.execute('slides.shape.insertPreset', ${JSON.stringify(presetId)}); return 1; })()`);
  await sleep(400);
  await press(session.cdp, firstKey);
  await insertText(session.cdp, rest);
  await press(session.cdp, "Escape");
  await sleep(300);
}

async function clickCanvasBlank(session) {
  const p = JSON.parse(await ev(session, `(() => { const r = ${C}.canvasEl.getBoundingClientRect(); return JSON.stringify({ x: r.left + 12, y: r.bottom - 12 }); })()`));
  await mouseClick(session.cdp, p.x, p.y);
  await sleep(300);
}

async function typeInto(session, selectorExpr, text) {
  const p = JSON.parse(await ev(session, `(() => { const el = ${selectorExpr}; el.scrollIntoView({ block: 'nearest' }); const r = el.getBoundingClientRect(); return JSON.stringify({ x: r.left + 30, y: r.top + r.height / 2 }); })()`));
  await mouseClick(session.cdp, p.x, p.y);
  await sleep(250);
  await insertText(session.cdp, text);
}

async function verifyServedCode(session, label) {
  const files = ["apps/slides/slides.css", "apps/slides/slides-canvas.js", "adapters/libreoffice/slides/slides-adapter.js"];
  const served = JSON.parse(await ev(session, `(async () => { const out = {}; for (const f of ${JSON.stringify(files)}) { const r = await fetch('/' + f, { cache: 'force-cache' }); out[f] = await r.text(); } return JSON.stringify(out); })()`));
  const stale = files.filter((f) => served[f] !== readFileSync(path.join(repoRoot, f), "utf8"));
  check(`${label}: mã đang chạy khớp worktree`, stale.length === 0, stale.join(", ") || "khớp");
}

/** c: hình thu nhỏ ngăn trái, Sắp xếp trang, trình chiếu đều vẽ mũi tên bằng SVG preset (đo điểm ảnh ở 2 nơi lớn). */
async function verifyPresetEverywhere(session, label, shotPrefix) {
  await ev(session, `${C}.selectSlide(0)`);
  await sleep(500);
  const thumb = JSON.parse(await ev(session, `(() => { const card = ${C}.slideListContainer.querySelector('.vno-slide-thumb-item .vno-slide-thumb-card'); const svg = card?.querySelector('.vno-sorter-preset svg.vno-shape-geometry path'); return JSON.stringify({ svg: !!svg, d: svg?.getAttribute('d') || '', nodes: card?.querySelectorAll('.vno-sorter-shape-node').length || 0 }); })()`));
  check(`${label}: hình thu nhỏ ngăn trái vẽ mũi tên bằng SVG preset (và các hình khác)`, thumb.svg && /^M0 30 L60 30/.test(thumb.d) && thumb.nodes >= 3, JSON.stringify(thumb));

  await ev(session, `${C}.openSlideSorter()`);
  await sleep(800);
  const sorterRect = JSON.parse(await ev(session, `(() => { const node = document.querySelector('.vno-slide-sorter-overlay .vno-sorter-preset'); const r = node?.getBoundingClientRect(); return JSON.stringify(r ? { left: r.left, top: r.top, width: r.width, height: r.height, svg: !!node.querySelector('svg.vno-shape-geometry'), fill: node.querySelector('svg.vno-shape-geometry path')?.getAttribute('fill') } : null); })()`));
  if (sorterRect) {
    const px = await arrowShapeOk(session, sorterRect, `${shotPrefix}-sorter.png`);
    check(`${label}: Sắp xếp trang vẽ hình mũi tên (SVG, góc khung không tô)`, sorterRect.svg && px.ok, JSON.stringify({ ...sorterRect, ...px }));
  } else {
    await screenshot(session, `${shotPrefix}-sorter.png`);
    check(`${label}: Sắp xếp trang vẽ hình mũi tên (SVG, góc khung không tô)`, false, "không thấy hình preset trong Sắp xếp trang");
  }
  await ev(session, `${C}.closeSlideSorter?.()`);
  await sleep(500);

  await ev(session, `${C}.startSlideShow(0)`);
  await sleep(1500);
  const showRect = JSON.parse(await ev(session, `(() => { const svg = document.querySelector('.vno-slideshow-overlay svg.vno-shape-geometry'); const node = svg?.parentElement; const r = node?.getBoundingClientRect(); return JSON.stringify(r ? { left: r.left, top: r.top, width: r.width, height: r.height, text: node.innerText, fill: svg.querySelector('path')?.getAttribute('fill') } : null); })()`));
  if (showRect) {
    const px = await arrowShapeOk(session, showRect, `${shotPrefix}-show.png`);
    check(`${label}: trình chiếu vẽ hình mũi tên (SVG, góc khung không tô), chữ vẫn hiện`, px.ok && /Mục tiêu/.test(showRect.text), JSON.stringify({ ...showRect, ...px }));
  } else {
    await screenshot(session, `${shotPrefix}-show.png`);
    check(`${label}: trình chiếu vẽ hình mũi tên (SVG, góc khung không tô), chữ vẫn hiện`, false, "không thấy SVG hình preset trong trình chiếu");
  }
  await press(session.cdp, "Escape");
  await sleep(800);
}

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
  // ---------------------------------------------------------------- Soạn
  session = await launchApp("slides", { startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
  await session.cdp.waitFor("window.__vnoAppInstance?.adapter?.canvas?.slides?.length > 0", { timeoutMilliseconds: 120000, intervalMilliseconds: 300 });
  await sleep(1500);
  await verifyServedCode(session, "Phiên soạn");
  await ev(session, `${C}.applySlideMaster('emerald-green', true)`);
  await typeInto(session, `${C}.titleEl`, "Kế hoạch năm");
  await clickCanvasBlank(session);
  await insertShapeWithText(session, "rightArrow", "M", "ục tiêu");
  await insertShapeWithText(session, "rect", "C", "hữ nhật");
  await insertShapeWithText(session, "ellipse", "E", "lip");
  await clickCanvasBlank(session);
  await ev(session, `(async () => { const { globalCommandBus } = await import('/platform/commands/command-bus.js'); await globalCommandBus.execute('slides.slide.new'); return 1; })()`);
  await sleep(600);
  await typeInto(session, `${C}.titleEl`, "Trang hai");
  await clickCanvasBlank(session);
  const model = JSON.parse(await ev(session, `JSON.stringify(${C}.slides[0].shapes.map((s) => ({ type: s.type, geom: s.geomType, text: s.text })))`));
  check("Soạn: trang 1 có Mũi tên phải, Chữ nhật, Elip kèm chữ", model.length === 3 && model.every((s) => s.text), JSON.stringify(model));
  await verifyPresetEverywhere(session, "Soạn", "edit");

  const saved = await ev(session, `(async () => { const a = window.__vnoAppInstance.adapter; a.sourceFilePath = ${JSON.stringify(pptx)}; a.isDirty = true; await a.save(); return JSON.stringify({ dirty: a.isDirty }); })()`);
  await sleep(1000);
  check("Lưu PPTX thành công", existsSync(pptx) && statSync(pptx).size > 0 && JSON.parse(saved).dirty === false, saved);
  const slideXml = readZipEntry(readFileSync(pptx), "ppt/slides/slide1.xml")?.toString("utf8") || "";
  const anchorOf = (text) => {
    const sp = [...slideXml.matchAll(/<p:sp>[\s\S]*?<\/p:sp>/g)].map((m) => m[0]).find((block) => block.includes(text)) || "";
    return { anchor: sp.match(/anchor="([a-z]+)"/)?.[1] || "(none)", prst: sp.match(/prst="([A-Za-z]+)"/)?.[1] || "" };
  };
  const anchors = { rect: anchorOf("Chữ nhật"), ellipse: anchorOf("Elip"), arrow: anchorOf("Mục tiêu") };
  check("Lưu PPTX: chữ nhật/elip có chữ căn giữa dọc (anchor=\"ctr\") như trình soạn", anchors.rect.anchor === "ctr" && anchors.ellipse.anchor === "ctr" && anchors.arrow.anchor === "ctr", JSON.stringify(anchors));
  await session.close(); session = null;

  // ---------------------------------------------------------------- Mở lại
  session = await launchApp("slides", { filePath: pptx, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
  await waitForReopened(session, pptx);
  await sleep(2500);
  await verifyServedCode(session, "Phiên mở lại");
  await ev(session, `${C}.selectSlide(0)`);
  await sleep(700);
  await screenshot(session, "reopen-main.png");
  const accent = JSON.parse(await ev(session, `(() => { const c = ${C}; const el = c.masterAccentEl; const cs = el ? getComputedStyle(el) : null; const r = el?.getBoundingClientRect();
    const thumbAccent = !!c.slideListContainer.querySelector('.vno-slide-thumb-card > div[style*="height:2px"]');
    return JSON.stringify({ imported: c.imported, display: cs?.display, h: r?.height || 0, bg: cs?.backgroundColor, theme: c.masterTheme?.themeId, title: getComputedStyle(c.titleEl).color, thumbAccent }); })()`));
  check("Mở lại (a): thanh nhấn chủ đề hiện trên trang, đúng màu Xanh Lá", accent.display !== "none" && accent.h > 0 && accent.bg === EMERALD.accent, JSON.stringify(accent));
  check("Mở lại (a): chủ đề Xanh Lá khôi phục (màu tiêu đề), hình thu nhỏ có dải nhấn", accent.theme === "emerald-green" && accent.title === EMERALD.title && accent.thumbAccent, JSON.stringify(accent));
  const fit = JSON.parse(await ev(session, `(() => { const c = ${C}; const s = c.stageEl.getBoundingClientRect(); const r = c.canvasEl.getBoundingClientRect(); const bar = document.querySelector('.vno-statusbar, .vno-status-bar, footer'); const b = bar?.getBoundingClientRect();
    return JSON.stringify({ zoom: c.zoomLevel, size: c.slideSize, canvas: { l: Math.round(r.left), t: Math.round(r.top), r: Math.round(r.right), b: Math.round(r.bottom) }, stage: { l: Math.round(s.left), t: Math.round(s.top), r: Math.round(s.right), b: Math.round(s.bottom) }, statusTop: b ? Math.round(b.top) : null, viewportH: innerHeight }); })()`));
  const limitBottom = Math.min(fit.stage.b, fit.statusTop ?? fit.viewportH, fit.viewportH);
  check("Mở lại (b): khung trang nằm gọn vùng nhìn (không bị thanh trạng thái che)", fit.canvas.l >= fit.stage.l && fit.canvas.r <= fit.stage.r && fit.canvas.t >= fit.stage.t && fit.canvas.b <= limitBottom, JSON.stringify(fit));
  const rectText = JSON.parse(await ev(session, `(() => { const c = ${C}; const s = c.slides[0].shapes.find((x) => /Chữ nhật/.test(x.text || '')); const el = c.shapesLayer.querySelector('[data-shape-id="' + s.id + '"]'); const t = el.querySelector('.vno-shape-text'); const r = el.getBoundingClientRect(); const tr = t.getBoundingClientRect();
    return JSON.stringify({ textVAlign: s.textVAlign || null, offset: Math.round(((tr.top + tr.height / 2) - (r.top + r.height / 2)) / r.height * 100) }); })()`));
  check("Mở lại (d): chữ trong chữ nhật vẫn căn giữa dọc (lệch tâm ≤ 10 % chiều cao)", Math.abs(rectText.offset) <= 10 && (!rectText.textVAlign || rectText.textVAlign === "middle"), JSON.stringify(rectText));
  await verifyPresetEverywhere(session, "Mở lại", "reopen");
} catch (error) {
  check("Phiên CDP không phát sinh ngoại lệ", false, error.stack || error.message);
  if (session) console.error(session.output.slice(-3000));
} finally {
  if (session) await session.close().catch(() => {});
}
console.log(`ảnh/tệp: ${outDir}`);
console.log(`SLIDES-2-3110 CDP: ${results.filter(Boolean).length}/${results.length} PASS`);
if (results.some((value) => !value)) process.exit(1);
