// Slides: Chế độ xem > Dàn bài — mở, sửa tiêu đề/nội dung, Ctrl+Enter thêm trang, hoàn tác, Esc đóng, lưu PPTX.
import { launchApp } from "./session.mjs";
import { click, press, typeText, sleep } from "./actions.mjs";

const OUT = process.env.VNO_OUTLINE_OUT || "E:\\VNOffice-profiles\\claude-slidetrans\\outline.pptx";
const checks = [];
const check = (name, pass, detail = "") => {
  checks.push({ name, pass: Boolean(pass) });
  console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`);
};
const session = await launchApp("slides", {});
const { cdp } = session;
const ev = (expression) => cdp.evaluate(expression, { awaitPromise: true, timeoutMilliseconds: 60000 });
const canvas = "window.__vnoAppInstance.canvas";
const focusField = (field, index) => ev(`(() => { const el = document.querySelector('[data-outline-field="${field}"][data-slide-index="${index}"]'); el.focus(); el.select?.(); return !!el; })()`);

try {
  await sleep(1500);
  await click(cdp, "#vno-ribbon-tab-view");
  await sleep(300);
  await click(cdp, '[data-command-id="slides.view.outline"]');
  await sleep(400);
  check("Mở dạng dàn bài", (await ev(`document.querySelectorAll('.vno-outline-row').length`)) >= 1);

  await focusField("title", 0);
  await typeText(cdp, "Kế hoạch năm 2027");
  await press(cdp, "Enter");
  await sleep(200);
  check("Enter ở tiêu đề chuyển xuống nội dung", (await ev(`document.activeElement?.dataset?.outlineField`)) === "body");
  await typeText(cdp, "Mục tiêu doanh thu");
  await ev(`document.activeElement.blur()`);
  await sleep(300);
  const s = JSON.parse(await ev(`JSON.stringify({ t: ${canvas}.slides[0].title, b: ${canvas}.slides[0].body })`));
  check("Sửa tiêu đề và nội dung ghi vào trang 1", s.t === "Kế hoạch năm 2027" && s.b === "Mục tiêu doanh thu", JSON.stringify(s));

  await focusField("title", 0);
  await press(cdp, "Enter", { ctrl: true });
  await sleep(400);
  check("Ctrl+Enter thêm trang mới sau trang đang sửa", (await ev(`${canvas}.slides.length`)) === 2);

  await press(cdp, "Escape");
  await sleep(300);
  check("Esc đóng dàn bài", (await ev(`document.querySelectorAll('.vno-outline-overlay').length`)) === 0);

  const saved = await ev(`(async () => { const a = window.__vnoAppInstance.adapter || window.__vnoAppInstance; return JSON.stringify(await window.pywebview.api.save_document_in_place(a.serializeToFodp(), 'slides', ${JSON.stringify(OUT)}, null)).slice(0, 80); })()`);
  check("Lưu PPTX", /"status":\s*"ok"/.test(saved), saved);

  await ev(`document.body.focus()`);
  await press(cdp, "z", { ctrl: true });
  await press(cdp, "z", { ctrl: true });
  await press(cdp, "z", { ctrl: true });
  await sleep(400);
  const after = JSON.parse(await ev(`JSON.stringify({ n: ${canvas}.slides.length, t: ${canvas}.slides[0].title })`));
  check("Ctrl+Z hoàn tác từng bước (trang mới, nội dung, tiêu đề)", after.t !== "Kế hoạch năm 2027", JSON.stringify(after));
} catch (error) {
  check("Không phát sinh ngoại lệ", false, error.stack || error.message);
} finally {
  await session.close();
}
if (checks.some((c) => !c.pass)) process.exit(1);
console.log(`Slides outline view: ${checks.length}/${checks.length} PASS`);
