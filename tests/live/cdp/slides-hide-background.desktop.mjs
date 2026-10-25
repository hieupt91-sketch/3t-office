// Slides: Thiết kế > Ẩn đồ họa nền (bật/tắt, hoàn tác) và lưu PPTX (đọc lại bằng PowerPoint: DisplayMasterShapes).
import { launchApp } from "./session.mjs";
import { click, press, sleep } from "./actions.mjs";
import { platformOutputPath } from "./output-path.mjs";

const OUT = process.env.VNO_HIDEBG_OUT || platformOutputPath("E:\\VNOffice-profiles\\claude-slidetrans\\hide_bg.pptx");
const checks = [];
const check = (name, pass, detail = "") => {
  checks.push({ name, pass: Boolean(pass) });
  console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`);
};
const session = await launchApp("slides", {});
const { cdp } = session;
const ev = (expression) => cdp.evaluate(expression, { awaitPromise: true, timeoutMilliseconds: 60000 });
const canvas = "window.__vnoAppInstance.canvas";
const hidden = (i) => ev(`!!${canvas}.slides[${i}]?.hideBackgroundGraphics`);
const accentDisplay = () => ev(`${canvas}.masterAccentEl.style.display`);

try {
  await sleep(1500);
  await click(cdp, "#vno-ribbon-tab-home");
  await click(cdp, '[data-command-id="slides.slide.new"]');
  await sleep(400);
  await ev(`${canvas}.selectSlide(0)`);
  await click(cdp, "#vno-ribbon-tab-design");
  await sleep(300);
  check("Trước khi bật: đồ họa nền hiện", (await accentDisplay()) !== "none");
  await click(cdp, '[data-command-id="slides.design.hideBackground"]');
  await sleep(300);
  check("Bật Ẩn đồ họa nền: chỉ trang 1", (await hidden(0)) === true && (await hidden(1)) === false);
  check("Đồ họa nền biến mất trên khung", (await accentDisplay()) === "none");
  const saved = await ev(`(async () => { const a = window.__vnoAppInstance.adapter || window.__vnoAppInstance; return JSON.stringify(await window.pywebview.api.save_document_in_place(a.serializeToFodp(), 'slides', ${JSON.stringify(OUT)}, null)).slice(0, 80); })()`);
  check("Lưu PPTX", /"status":\s*"ok"/.test(saved), saved);
  await ev(`document.body.focus()`);
  await press(cdp, "z", { ctrl: true });
  await sleep(300);
  check("Ctrl+Z hoàn tác", (await hidden(0)) === false && (await accentDisplay()) !== "none");
} catch (error) {
  check("Không phát sinh ngoại lệ", false, error.stack || error.message);
} finally {
  await session.close();
}
if (checks.some((c) => !c.pass)) process.exit(1);
console.log(`Slides hide background: ${checks.length}/${checks.length} PASS`);
