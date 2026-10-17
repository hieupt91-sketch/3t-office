// Slides: tab Định dạng ảnh > Cắt (theo tỉ lệ / theo số đo / đặt lại), hoàn tác, lưu PPTX (PowerPoint đọc lại CropLeft...).
import fs from "node:fs";
import { launchApp } from "./session.mjs";
import { click, mouseClick, press, sleep } from "./actions.mjs";

const OUT = process.env.VNO_CROP_OUT || "E:\\VNOffice-profiles\\claude-slidetrans\\crop.pptx";
const PIC = "E:\\VNOffice-profiles\\claude-slidetrans\\pic.png";
const checks = [];
const check = (name, pass, detail = "") => {
  checks.push({ name, pass: Boolean(pass) });
  console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`);
};
const dataUrl = "data:image/png;base64," + fs.readFileSync(PIC).toString("base64");
const session = await launchApp("slides", {});
const { cdp } = session;
const ev = (expression) => cdp.evaluate(expression, { awaitPromise: true, timeoutMilliseconds: 60000 });
const canvas = "window.__vnoAppInstance.canvas";
const img = () => ev(`JSON.stringify((({x,y,w,h,cropPct,crop}) => ({x:Math.round(x),y:Math.round(y),w:Math.round(w),h:Math.round(h),cropPct,crop}))(${canvas}.slides[0].shapes[0]))`);
const menuItem = async (label) => {
  const box = await ev(`(() => { const el = [...document.querySelectorAll('.vno-ribbon-dropdown-item')].filter(e => e.getClientRects().length > 0).find(e => (e.getAttribute("title") || e.textContent.trim()) === ${JSON.stringify(label)}); if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; })()`);
  if (!box) throw new Error("Không thấy mục menu: " + label);
  await mouseClick(cdp, box.x, box.y);
  await sleep(300);
};
const openCrop = async () => {
  const box = await ev(`(() => { const el = document.querySelector('[data-dropdown-id="slides.picture.crop"]'); if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; })()`);
  if (!box) throw new Error("Không thấy nút Cắt");
  await mouseClick(cdp, box.x, box.y);
  await sleep(250);
};

try {
  await sleep(1500);
  check("Chưa chọn ảnh: tab Định dạng ảnh ẩn", (await ev(`document.querySelector('#vno-ribbon-tab-pictureFormat')?.hidden`)) === true);
  await ev(`(() => { const c = ${canvas}; c.slides[0].shapes.push({ id: "pic1", type: "image", x: 100, y: 100, w: 400, h: 240, src: ${JSON.stringify(dataUrl)} }); c._renderShapesLayer(); c.setSelectedTarget("pic1"); c._renderShapesLayer(); c._updateSelectionUi(); })()`);
  await sleep(500);
  check("Chọn ảnh: tab Định dạng ảnh hiện, tab Định dạng hình ẩn", (await ev(`document.querySelector('#vno-ribbon-tab-pictureFormat')?.hidden`)) === false && (await ev(`document.querySelector('#vno-ribbon-tab-shapeFormat')?.hidden`)) === true);
  await click(cdp, "#vno-ribbon-tab-pictureFormat");
  await sleep(300);

  await openCrop();
  await menuItem("Vuông 1:1");
  let s = JSON.parse(await img());
  check("Cắt về 1:1: khung vuông 240×240, giữ tâm", s.w === 240 && s.h === 240 && s.x === 180 && s.y === 100, JSON.stringify(s));
  check("Ghi cropPct và crop (cm)", s.cropPct && s.crop && s.cropPct.l > 0 && s.cropPct.r > 0 && s.cropPct.t === 0);

  await openCrop();
  await menuItem("Đặt lại cắt xén");
  s = JSON.parse(await img());
  check("Đặt lại cắt xén: về 400×240, hết crop", s.w === 400 && s.h === 240 && !s.cropPct && !s.crop, JSON.stringify(s));

  await openCrop();
  await menuItem("Cắt xén…");
  await sleep(300);
  await ev(`(() => { const set = (id, v) => { const el = document.querySelector('#vno-crop-' + id); el.value = v; }; set('left', 10); set('right', 20); set('top', 5); set('bottom', 0); })()`);
  await click(cdp, "#vno-crop-apply");
  await sleep(400);
  s = JSON.parse(await img());
  check("Hộp thoại cắt xén: trái 10 phải 20 trên 5", s.cropPct?.l === 10 && s.cropPct?.r === 20 && s.cropPct?.t === 5, JSON.stringify(s.cropPct));
  check("Khung co theo phần cắt (70% × 95%)", s.w === 280 && s.h === 228, `${s.w}x${s.h}`);

  const saved = await ev(`(async () => { const a = window.__vnoAppInstance.adapter || window.__vnoAppInstance; return JSON.stringify(await window.pywebview.api.save_document_in_place(a.serializeToFodp(), 'slides', ${JSON.stringify(OUT)}, null)).slice(0, 80); })()`);
  check("Lưu PPTX", /"status":\s*"ok"/.test(saved), saved);

  await ev(`document.body.focus()`);
  await press(cdp, "z", { ctrl: true });
  await sleep(300);
  s = JSON.parse(await img());
  check("Ctrl+Z hoàn tác một bước cắt xén", !s.cropPct && s.w === 400, JSON.stringify(s));
} catch (error) {
  check("Không phát sinh ngoại lệ", false, error.stack || error.message);
} finally {
  await session.close();
}
if (checks.some((c) => !c.pass)) process.exit(1);
console.log(`Slides picture crop: ${checks.length}/${checks.length} PASS`);
