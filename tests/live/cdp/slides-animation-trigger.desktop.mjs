// Slides: Hoạt hình > Kích hoạt (hiệu ứng chạy khi bấm hình khác): hộp thoại, Ngăn hoạt hình, hoàn tác, lưu PPTX.
// Đọc lại bằng scripts/audit-0610/ppt_trigger_readback.ps1 (PowerPoint thật).
import { launchApp } from "./session.mjs";
import { click, mouseClick, press, sleep } from "./actions.mjs";
import { platformOutputPath } from "./output-path.mjs";

const OUT = process.env.VNO_TRIGGER_OUT || platformOutputPath("E:\\VNOffice-profiles\\claude-multianim\\trigger_ui.pptx");
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
const list = async () => JSON.parse(await ev(`JSON.stringify(${canvas}.collectSlideAnimations().map(x => x.slotId + ':' + x.type + ':' + (x.trigger || '-')))`));

try {
  await sleep(1500);
  await click(cdp, "#vno-ribbon-tab-home");
  await openDropdown("slides.shape.gallery");
  await menuItem("Hình thoi");
  await openDropdown("slides.shape.gallery");
  await menuItem("Sao 5 cánh");
  const ids = JSON.parse(await ev(`JSON.stringify(${canvas}.slides[0].shapes.map(s => s.id))`));
  check("Có 2 hình", ids.length === 2, ids.join(","));

  await ev(`${canvas}.setSelectedTarget(${JSON.stringify(ids[0])})`);
  await click(cdp, "#vno-ribbon-tab-animations");
  await sleep(300);
  await openDropdown("slides.animation.gallery");
  await menuItem("Mờ dần (vào)");
  check("Hình 1 có hiệu ứng, chưa có kích hoạt", (await list())[0].endsWith(":-"), (await list()).join(","));

  await click(cdp, '[data-command-id="slides.animation.trigger"]');
  await cdp.waitFor("!!document.querySelector('#vno-trigger-select')", { timeoutMilliseconds: 10000 });
  const optionCount = await ev(`document.querySelectorAll('#vno-trigger-select option').length`);
  check("Hộp thoại liệt kê: mặc định + 1 hình khác", optionCount === 2, String(optionCount));
  await ev(`(() => { const s = document.querySelector('#vno-trigger-select'); s.value = ${JSON.stringify(String(ids[1]))}; s.dispatchEvent(new Event('change', { bubbles: true })); })()`);
  await click(cdp, "#vno-trigger-apply");
  await sleep(300);
  const withTrigger = await list();
  check("Kích hoạt gắn vào hình 2", withTrigger[0].endsWith(`:${ids[1]}`), withTrigger.join(","));

  const timeline = JSON.parse(await ev(`JSON.stringify(${canvas}.getAnimationTimeline(${canvas}.slides[0]).length)`));
  check("Hiệu ứng kích hoạt không nằm trong chuỗi tự chạy", timeline === 0, String(timeline));
  const html = await ev(`${canvas}._shapePresentationHtml(${canvas}.slides[0].shapes[0], { timeline: ${canvas}._timelineByTarget(${canvas}.slides[0]), triggered: ${canvas}._triggeredAnimationsByTarget(${canvas}.slides[0]) })`);
  check("Trình chiếu: hình ẩn sẵn và mang dữ liệu kích hoạt", /opacity:0/.test(html) && /data-vno-anim-triggers/.test(html));

  await ev(`document.body.focus()`);
  await press(cdp, "z", { ctrl: true });
  await sleep(300);
  check("Ctrl+Z bỏ kích hoạt", (await list())[0].endsWith(":-"), (await list()).join(","));
  await press(cdp, "y", { ctrl: true });
  await sleep(300);
  check("Ctrl+Y làm lại kích hoạt", (await list())[0].endsWith(`:${ids[1]}`), (await list()).join(","));

  const saved = await ev(`(async () => { const x = window.__vnoAppInstance.adapter || window.__vnoAppInstance; return JSON.stringify(await window.pywebview.api.save_document_in_place(x.serializeToFodp(), 'slides', ${JSON.stringify(OUT)}, null)).slice(0, 80); })()`);
  check("Lưu PPTX", /"status":\s*"ok"/.test(saved), saved);
  console.log("OUT " + OUT);
} catch (error) {
  check("Không phát sinh ngoại lệ", false, error.stack || error.message);
} finally {
  await session.close();
}
if (checks.some((c) => !c)) process.exit(1);
console.log(`Slides animation trigger: ${checks.length}/${checks.length} PASS`);
