// Slides: hiệu ứng nhấn mạnh «Nhịp đập» (Pulse): gán từ ribbon, lưu PPTX; PowerPoint COM đọc EffectType 75 (presetID 26).
import { launchApp } from "./session.mjs";
import { click, mouseClick, sleep } from "./actions.mjs";
import { platformOutputPath } from "./output-path.mjs";

const OUT = process.env.VNO_PULSE_OUT || platformOutputPath("E:\\VNOffice-profiles\\claude-multianim\\pulse.pptx");
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
try {
  await sleep(1500);
  await click(cdp, "#vno-ribbon-tab-home");
  await openDropdown("slides.shape.gallery");
  await menuItem("Hình thoi");
  await click(cdp, "#vno-ribbon-tab-animations");
  await sleep(300);
  await openDropdown("slides.animation.gallery");
  await menuItem("Nhịp đập (nhấn mạnh)");
  const types = JSON.parse(await ev(`JSON.stringify(${canvas}.collectSlideAnimations().map(x => x.type))`));
  check("Gán Nhịp đập từ ribbon", types.join(",") === "pulse", types.join(","));
  const saved = await ev(`(async () => { const x = window.__vnoAppInstance.adapter || window.__vnoAppInstance; return JSON.stringify(await window.pywebview.api.save_document_in_place(x.serializeToFodp(), 'slides', ${JSON.stringify(OUT)}, null)).slice(0, 80); })()`);
  check("Lưu PPTX", /"status":\s*"ok"/.test(saved), saved);
  console.log("OUT " + OUT);
} catch (error) {
  check("Không phát sinh ngoại lệ", false, error.stack || error.message);
} finally {
  await session.close();
}
if (checks.some((c) => !c)) process.exit(1);
