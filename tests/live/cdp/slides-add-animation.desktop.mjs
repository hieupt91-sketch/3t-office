// Slides: Hoạt hình > Thêm hoạt ảnh (nhiều hiệu ứng trên một hình), Ngăn hoạt hình, hoàn tác, lưu PPTX.
// Đọc lại bằng scripts/audit-0610/ppt_effects_exit_readback.ps1 (PowerPoint thật).
import { launchApp } from "./session.mjs";
import { click, mouseClick, press, sleep } from "./actions.mjs";
import { platformOutputPath } from "./output-path.mjs";

const OUT = process.env.VNO_ADDANIM_OUT || platformOutputPath("E:\\VNOffice-profiles\\claude-multianim\\add_animation.pptx");
const checks = [];
const check = (name, pass, detail = "") => {
  checks.push(Boolean(pass));
  console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`);
};
const session = await launchApp("slides", {});
const { cdp } = session;
const ev = (expression) => cdp.evaluate(expression, { awaitPromise: true, timeoutMilliseconds: 60000 });
const canvas = "window.__vnoAppInstance.canvas";
const boxOf = (selector) => ev(`(() => { const el = ${selector}; if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; })()`);
const openDropdown = async (id) => {
  const box = await boxOf(`document.querySelector('[data-dropdown-id="${id}"]')`);
  if (!box) throw new Error("Không thấy nút: " + id);
  await mouseClick(cdp, box.x, box.y);
  await sleep(250);
};
const menuItem = async (label) => {
  const box = await boxOf(`[...document.querySelectorAll('.vno-ribbon-dropdown-item')].filter(e => e.getClientRects().length > 0).find(e => (e.getAttribute("title") || e.textContent.trim()) === ${JSON.stringify(label)})`);
  if (!box) throw new Error("Không thấy mục menu: " + label);
  await mouseClick(cdp, box.x, box.y);
  await sleep(300);
};
const list = async () => JSON.parse(await ev(`JSON.stringify(${canvas}.collectSlideAnimations().map(x => x.slotId + ':' + x.type))`));

try {
  await sleep(1500);
  await click(cdp, "#vno-ribbon-tab-home");
  await openDropdown("slides.shape.gallery");
  await menuItem("Hình thoi");
  await click(cdp, "#vno-ribbon-tab-animations");
  await sleep(300);
  await openDropdown("slides.animation.gallery");
  await menuItem("Bay vào");
  check("Gán hiệu ứng đầu: Bay vào", (await list()).length === 1, (await list()).join(","));

  await openDropdown("slides.animation.add");
  await menuItem("Mờ dần ra (thoát)");
  const afterAdd = await list();
  check("Thêm hoạt ảnh: hình có 2 hiệu ứng (vào, thoát)", afterAdd.length === 2 && afterAdd[1].endsWith(":fadeOut") && afterAdd[1].includes("#1"), afterAdd.join(","));

  await ev(`${canvas}.showAnimationPane?.() ?? ${canvas}.toggleAnimationPane?.(true)`);
  await sleep(300);
  const rows = await ev(`document.querySelectorAll('.vno-anim-pane-item').length`);
  check("Ngăn hoạt hình hiện 2 dòng", rows === 2, String(rows));

  await ev(`document.body.focus()`);
  await press(cdp, "z", { ctrl: true });
  await sleep(300);
  check("Ctrl+Z hoàn tác việc thêm hoạt ảnh", (await list()).length === 1, (await list()).join(","));
  await press(cdp, "y", { ctrl: true });
  await sleep(300);
  check("Ctrl+Y làm lại", (await list()).length === 2, (await list()).join(","));

  const saved = await ev(`(async () => { const x = window.__vnoAppInstance.adapter || window.__vnoAppInstance; return JSON.stringify(await window.pywebview.api.save_document_in_place(x.serializeToFodp(), 'slides', ${JSON.stringify(OUT)}, null)).slice(0, 80); })()`);
  check("Lưu PPTX", /"status":\s*"ok"/.test(saved), saved);
  console.log("OUT " + OUT);
} catch (error) {
  check("Không phát sinh ngoại lệ", false, error.stack || error.message);
} finally {
  await session.close();
}
if (checks.some((c) => !c)) process.exit(1);
console.log(`Slides add animation: ${checks.length}/${checks.length} PASS`);
