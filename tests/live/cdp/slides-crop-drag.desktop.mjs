// Slides: Cắt ảnh bằng cách kéo cạnh (chế độ cắt): kéo tay cầm phải vào trong, cạnh trái đứng yên; Esc thoát; hoàn tác; lưu PPTX.
// PowerPoint COM đọc lại CropRight bằng scripts/audit-0610/ppt_crop_readback.ps1.
import fs from "node:fs";
import { launchApp } from "./session.mjs";
import { click, mouseClick, mouseDrag, press, sleep } from "./actions.mjs";

const OUT = process.env.VNO_CROPDRAG_OUT || "E:\\VNOffice-profiles\\claude-slidetrans\\crop_drag.pptx";
const PIC = "E:\\VNOffice-profiles\\claude-slidetrans\\pic.png";
const checks = [];
const check = (name, pass, detail = "") => {
  checks.push(Boolean(pass));
  console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`);
};
const dataUrl = "data:image/png;base64," + fs.readFileSync(PIC).toString("base64");
const session = await launchApp("slides", {});
const { cdp } = session;
const ev = (expression) => cdp.evaluate(expression, { awaitPromise: true, timeoutMilliseconds: 60000 });
const canvas = "window.__vnoAppInstance.canvas";
const img = () => ev(`JSON.stringify((({x,y,w,h,cropPct}) => ({x:Math.round(x),y:Math.round(y),w:Math.round(w),h:Math.round(h),cropPct}))(${canvas}.slides[0].shapes[0]))`);
const boxOf = (selector) => ev(`(() => { const el = ${selector}; if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), w: r.width }; })()`);
const menuItem = async (label) => {
  const box = await boxOf(`[...document.querySelectorAll('.vno-ribbon-dropdown-item')].filter(e => e.getClientRects().length > 0).find(e => (e.getAttribute("title") || e.textContent.trim()) === ${JSON.stringify(label)})`);
  if (!box) throw new Error("Không thấy mục menu: " + label);
  await mouseClick(cdp, box.x, box.y);
  await sleep(300);
};
try {
  await sleep(1500);
  await ev(`(() => { const c = ${canvas}; c.slides[0].shapes.push({ id: "pic1", type: "image", x: 100, y: 100, w: 400, h: 240, src: ${JSON.stringify(dataUrl)} }); c._renderShapesLayer(); c.setSelectedTarget("pic1"); c._renderShapesLayer(); c._updateSelectionUi(); })()`);
  await sleep(500);
  await click(cdp, "#vno-ribbon-tab-pictureFormat");
  await sleep(300);
  const cropBtn = await boxOf(`document.querySelector('[data-dropdown-id="slides.picture.crop"]')`);
  await mouseClick(cdp, cropBtn.x, cropBtn.y);
  await sleep(250);
  await menuItem("Cắt bằng cách kéo cạnh");
  check("Bật chế độ cắt: ảnh có lớp is-cropping", (await ev(`!!document.querySelector('[data-shape-id="pic1"].is-cropping')`)) === true);

  const handle = await boxOf(`document.querySelector('[data-shape-id="pic1"] .vno-handle-e')`);
  handle.x -= 2; // khung ảnh cắt phần thừa nên chỉ nửa trong của tay cầm bấm được
  const scale = await ev(`${canvas}._pointerScale()`);
  await mouseDrag(cdp, handle.x, handle.y, handle.x - Math.round(100 * scale), handle.y);
  await sleep(300);
  let s = JSON.parse(await img());
  check("Kéo tay cầm phải vào 100px: cắt 25% bên phải, cạnh trái đứng yên", s.x === 100 && s.w === 300 && Math.abs((s.cropPct?.r || 0) - 25) < 1.5 && !s.cropPct?.l, JSON.stringify(s));

  const topHandle = await boxOf(`document.querySelector('[data-shape-id="pic1"] .vno-handle-n')`);
  topHandle.y += 2;
  await mouseDrag(cdp, topHandle.x, topHandle.y, topHandle.x, topHandle.y + Math.round(60 * scale));
  await sleep(300);
  s = JSON.parse(await img());
  check("Kéo tay cầm trên xuống 60px: cắt trên, cạnh dưới đứng yên", s.y === 160 && s.h === 180 && s.cropPct?.t > 20, JSON.stringify(s));

  await press(cdp, "Escape");
  await sleep(300);
  check("Esc thoát chế độ cắt", (await ev(`!document.querySelector('.is-cropping')`)) === true);

  const saved = await ev(`(async () => { const a = window.__vnoAppInstance.adapter || window.__vnoAppInstance; return JSON.stringify(await window.pywebview.api.save_document_in_place(a.serializeToFodp(), 'slides', ${JSON.stringify(OUT)}, null)).slice(0, 80); })()`);
  check("Lưu PPTX", /"status":\s*"ok"/.test(saved), saved);

  await ev(`document.body.focus()`);
  await press(cdp, "z", { ctrl: true });
  await sleep(300);
  s = JSON.parse(await img());
  check("Ctrl+Z hoàn tác một lần kéo (còn lần cắt phải)", s.y === 100 && s.h === 240 && s.w === 300, JSON.stringify(s));
} catch (error) {
  check("Không phát sinh ngoại lệ", false, error.stack || error.message);
} finally {
  await session.close();
}
if (checks.some((c) => !c)) process.exit(1);
console.log(`Slides crop drag: ${checks.length}/${checks.length} PASS`);
