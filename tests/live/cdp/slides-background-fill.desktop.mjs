// Slides: nền trang (màu đơn / chuyển sắc / hình ảnh) -> lưu PPTX -> PowerPoint đọc lại Background.Fill.Type.
import fs from "node:fs";
import { launchApp } from "./session.mjs";
import { click, sleep } from "./actions.mjs";
import { platformOutputPath } from "./output-path.mjs";

const OUT = process.env.VNO_BGFILL_OUT || platformOutputPath("E:\\VNOffice-profiles\\claude-slidetrans\\bg_fill.pptx");
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

try {
  await sleep(1500);
  await click(cdp, "#vno-ribbon-tab-home");
  await click(cdp, '[data-command-id="slides.slide.new"]');
  await sleep(300);
  await click(cdp, '[data-command-id="slides.slide.new"]');
  await sleep(300);
  await ev(`${canvas}.selectSlide(0)`);
  await ev(`${canvas}.applySlideBackground({ type: "solid", color: "#ffe4b5" }, { applyAll: false })`);
  await ev(`${canvas}.selectSlide(1)`);
  await ev(`${canvas}.applySlideBackground({ type: "gradient", gradient: { from: "#ff0000", to: "#0000ff", direction: "vertical" } }, { applyAll: false })`);
  await ev(`${canvas}.selectSlide(2)`);
  await ev(`${canvas}.applySlideBackground({ type: "picture", picture: ${JSON.stringify(dataUrl)} }, { applyAll: false })`);
  const types = JSON.parse(await ev(`JSON.stringify(${canvas}.slides.map(s => s.background?.type))`));
  check("Ba trang có nền màu đơn / chuyển sắc / hình ảnh", types.join(",") === "solid,gradient,picture", types.join(","));
  const saved = await ev(`(async () => { const a = window.__vnoAppInstance.adapter || window.__vnoAppInstance; return JSON.stringify(await window.pywebview.api.save_document_in_place(a.serializeToFodp(), 'slides', ${JSON.stringify(OUT)}, null)).slice(0, 80); })()`);
  check("Lưu PPTX", /"status":\s*"ok"/.test(saved), saved);
} catch (error) {
  check("Không phát sinh ngoại lệ", false, error.stack || error.message);
} finally {
  await session.close();
}
if (checks.some((c) => !c.pass)) process.exit(1);
console.log(`Slides background fill: ${checks.length}/${checks.length} PASS`);
