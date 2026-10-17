// Kiem tra CDP desktop: Hoat hinh Slides 3 nhom (Vao / Nhan manh / Thoat) qua hop thoai Hieu ung doi tuong.
import { launchApp } from "./session.mjs";
import { mouseClick } from "./actions.mjs";
import fs from "node:fs";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const savePath = process.argv[2] || "";
const session = await launchApp("slides", { localAppData: process.env.VNO_CDP_LOCALAPPDATA || "E:\\VNOffice-profiles\\claude-slides-animclasses" });
const cdp = session.cdp; const ev = e => cdp.evaluate(e, { awaitPromise: true, timeoutMilliseconds: 120000 });
let pass = 0, fail = 0;
const check = (name, ok, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"} | ${name}${ok ? "" : " | " + detail}`); ok ? pass++ : fail++; };
const canvas = "window.__vnoAppInstance.canvas";
const shapeAnim = id => ev(`JSON.stringify(${canvas}.slides[${canvas}.currentSlideIndex].shapes.find(s => String(s.id) === ${JSON.stringify(id)})?.animation || null)`).then(JSON.parse);
const centerOf = async selector => JSON.parse(await ev(`JSON.stringify((() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })())`));
async function applyViaDialog(shapeId, type) {
  // Mo hop thoai bang nut tren ribbon (tab Hoat hinh), khong cho ket qua (hop thoai giu den khi dong).
  await ev(`(() => { const tab = document.querySelector('#vno-ribbon-tab-animations'); if (tab) tab.click(); return true; })()`); await sleep(400);
  const btn = await centerOf('[data-command-id="slides.animation.apply"], [data-cmd="slides.animation.apply"], button[aria-label*="Hiệu ứng đối tượng"]');
  if (!btn) { check(`Co nut Hieu ung doi tuong (${type})`, false, "khong thay nut"); return false; }
  await mouseClick(cdp, btn.x, btn.y); await sleep(600);
  const groups = await ev(`JSON.stringify([...document.querySelectorAll('#vno-anim-type-select optgroup')].map(g => g.label))`);
  if (type === "fadeIn") check("Danh sach Kieu chia 3 nhom Vao / Nhan manh / Thoat", groups === JSON.stringify(["Vào", "Nhấn mạnh", "Thoát"]), groups);
  await ev(`(() => { const t = document.querySelector('#vno-anim-target-select'); t.value = ${JSON.stringify(String(shapeId))}; t.dispatchEvent(new Event('change', { bubbles: true })); const y = document.querySelector('#vno-anim-type-select'); y.value = ${JSON.stringify(type)}; y.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`); await sleep(300);
  const prev = await centerOf('#vno-anim-preview-btn'); if (prev) { await mouseClick(cdp, prev.x, prev.y); await sleep(300); }
  const previewCss = await ev(`document.querySelector('#vno-anim-preview-box')?.style.animationName || ''`);
  check(`Xem thu ${type}: dung keyframe`, previewCss.length > 0, previewCss);
  const ok = await centerOf('#vno-anim-apply'); await mouseClick(cdp, ok.x, ok.y); await sleep(500);
  return true;
}
try {
  for (let i = 0; i < 40; i++) { if (await ev(`Boolean(window.__vnoAppInstance && window.__vnoAppInstance.canvas && window.__vnoAppInstance.canvas.slides)`)) break; await sleep(500); }
  await ev(`(() => { const c = ${canvas}; const slide = c.slides[c.currentSlideIndex]; slide.shapes = (slide.shapes || []).concat(["a1", "a2", "a3", "a4"].map((id, i) => ({ id, type: 'rect', x: 40 + i * 200, y: 200, w: 160, h: 90, color: '#2563eb', text: id }))); c._renderShapesLayer(); })()`); await sleep(500);
  for (const [id, type] of [["a1", "fadeIn"], ["a2", "spin"], ["a3", "fadeOut"], ["a4", "disappear"]]) {
    await applyViaDialog(id, type);
    const anim = await shapeAnim(id);
    check(`Ap dung ${type} cho ${id}`, anim && anim.type === type, JSON.stringify(anim));
  }
  const style = Object.fromEntries(await Promise.all(["a1", "a2", "a3"].map(async id => [id, await ev(`${canvas}._animationInlineStyle(${canvas}.slides[${canvas}.currentSlideIndex].shapes.find(s => s.id === ${JSON.stringify(id)}).animation, 0)`)])));
  check("Vao an san (opacity:0); Nhan manh va Thoat hien san", /opacity:0/.test(style.a1) && !/opacity:0/.test(style.a2) && !/opacity:0/.test(style.a3), JSON.stringify(style));
  const pane = await ev(`(() => { ${canvas}.showAnimationPane?.(); return ${canvas}.collectSlideAnimations().map(i => i.typeLabel); })()`);
  check("Ngan hoat hinh liet ke ca 4 hieu ung kem nhom", Array.isArray(pane) && pane.length === 4 && pane.some(l => /thoát/i.test(l)) && pane.some(l => /nhấn mạnh/i.test(l)), JSON.stringify(pane));
  await ev(`${canvas}.undo()`); await sleep(300);
  check("Hoan tac: a4 het hieu ung", (await shapeAnim("a4")) === null || (await shapeAnim("a4")).type === "none", JSON.stringify(await shapeAnim("a4")));
  await ev(`${canvas}.redo()`); await sleep(300);
  check("Lam lai: a4 la disappear", (await shapeAnim("a4"))?.type === "disappear");
  const fodp = await ev(`(async () => { const a = window.__vnoAppInstance.adapter || window.__vnoAppInstance; return a.serializeToFodp(); })()`);
  check("FODP ghi du 3 nhom preset-class", /preset-class="entrance"/.test(fodp) && /preset-class="emphasis"/.test(fodp) && /preset-class="exit"/.test(fodp));
  if (process.argv[3]) fs.writeFileSync(process.argv[3], fodp, "utf8");
  if (savePath) {
    const res = await ev(`window.pywebview.api.save_document_in_place(${JSON.stringify(fodp)}, 'slides', ${JSON.stringify(savePath)}, null)`);
    check("Luu PPTX thanh cong", res && res.status === "ok", JSON.stringify(res).slice(0, 160));
  }
} catch (err) { console.error("LOI NGOAI LE TRONG PHIEN TEST CDP:", err); fail++; }
finally { console.log(`KET QUA TEST CDP DESKTOP [slides hoat anh 3 nhom]: ${pass}/${pass + fail} PASS | ${fail} FAIL`); try { await session.close(); } catch {} }
process.exitCode = fail ? 1 : 0;