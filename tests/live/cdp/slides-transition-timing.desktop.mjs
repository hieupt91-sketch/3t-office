// Chuyển tiếp trang chiếu: mở tệp PowerPoint có sẵn nhiều kiểu chuyển tiếp, đổi cách chuyển trang bằng hộp thoại (chuột thật),
// hoàn tác, lưu bằng đường lưu thật; PowerPoint 2016 đọc lại ở scripts/audit-0610/ppt_transition_readback.ps1.
import { launchApp } from "./session.mjs";
import { click, sleep } from "./actions.mjs";

const SRC = process.env.VNO_TRANS_SRC || "E:\\VNOffice-profiles\\claude-slidetrans\\trans_src.pptx";
const OUT = process.env.VNO_TRANS_OUT || "E:\\VNOffice-profiles\\claude-slidetrans\\trans_ui_saved.pptx";
const checks = [];
const check = (name, pass, detail = "") => {
  checks.push({ name, pass: Boolean(pass), detail });
  console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`);
};

const session = await launchApp("slides", { filePath: SRC, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
const { cdp } = session;
const ev = (expression) => cdp.evaluate(expression, { awaitPromise: true, timeoutMilliseconds: 240000 });
const canvas = "window.__vnoAppInstance.canvas";

try {
  await cdp.waitFor(`(() => { const c = ${canvas}; return c && c.slides && c.slides.length >= 6 && c.imported; })()`, { timeoutMilliseconds: 240000, intervalMilliseconds: 500 });
  await sleep(1500);

  const loaded = await ev(`${canvas}.slides.map(s => s.transition ? { type: s.transition.type, click: s.transition.advanceOnClick, after: s.transition.advanceAfter, src: !!s.transition.sourceXml } : null)`);
  check("Mở tệp: mỗi slide mang chuyển tiếp gốc và cách chuyển trang", loaded.length === 6 && loaded.every(item => item && item.src) && loaded[2].click === false && loaded[2].after === 5000 && loaded[1].after === 3000 && loaded[5].click === false, JSON.stringify(loaded));

  // Chọn slide 3 (Wipe, không nhấp chuột, tự chuyển sau 5 giây) bằng chuột thật trên ngăn hình thu nhỏ
  await ev(`${canvas}.selectSlide ? ${canvas}.selectSlide(2) : (${canvas}.currentSlideIndex = 2)`);
  await sleep(400);
  await click(cdp, '#vno-ribbon-tab-transitions');
  await click(cdp, '[data-command-id="slides.transition.apply"]');
  await sleep(500);
  const dialog = await ev(`(() => { const o = document.querySelector('.vno-dialog-overlay'); if (!o) return null; return { type: o.querySelector('#vno-trans-type-select').value, click: o.querySelector('#vno-trans-advance-click').checked, afterOn: o.querySelector('#vno-trans-advance-after-on').checked, after: o.querySelector('#vno-trans-advance-after').value, hasCustom: !!o.querySelector('#vno-trans-type-select option[value="custom"]') }; })()`);
  check("Hộp Chuyển tiếp đọc đúng cài đặt của slide 3", dialog && dialog.type === "custom" && dialog.hasCustom && dialog.click === false && dialog.afterOn === true && dialog.after === "5", JSON.stringify(dialog));

  // Bật 'Khi nhấp chuột' bằng chuột, đổi thời gian tự chuyển 5 -> 2 giây, giữ hiệu ứng gốc
  await click(cdp, '.vno-dialog-overlay #vno-trans-advance-click');
  await ev(`(() => { const i = document.querySelector('.vno-dialog-overlay #vno-trans-advance-after'); i.value = '2'; i.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await click(cdp, '.vno-dialog-overlay #vno-trans-apply-current');
  await sleep(500);
  const afterApply = await ev(`(() => { const s = ${canvas}.slides[2].transition; return { type: s.type, click: s.advanceOnClick, after: s.advanceAfter, src: !!s.sourceXml }; })()`);
  check("Áp dụng cho trang này: giữ hiệu ứng gốc, đổi cách chuyển trang", afterApply.type === "custom" && afterApply.src && afterApply.click !== false && afterApply.after === 2000, JSON.stringify(afterApply));
  const untouched = await ev(`${canvas}.slides.map((s, i) => i === 2 ? null : s.transition.after ?? s.transition.advanceAfter)`);
  check("Các slide khác không bị đổi", untouched[1] === 3000 && untouched[3] === 2000, JSON.stringify(untouched));

  // Hoàn tác / làm lại
  await ev(`${canvas}.undo()`);
  const undone = await ev(`${canvas}.slides[2].transition.advanceAfter`);
  check("Ctrl+Z khôi phục thời gian tự chuyển cũ (5 giây)", undone === 5000, String(undone));
  await ev(`${canvas}.redo()`);
  check("Làm lại áp dụng lại 2 giây", (await ev(`${canvas}.slides[2].transition.advanceAfter`)) === 2000);

  // Đổi sang hiệu ứng của VN (Mờ dần) kèm tự chuyển 4 giây trên slide 6
  await ev(`${canvas}.selectSlide ? ${canvas}.selectSlide(5) : (${canvas}.currentSlideIndex = 5)`);
  await sleep(300);
  await click(cdp, '[data-command-id="slides.transition.apply"]');
  await sleep(400);
  await ev(`(() => { const o = document.querySelector('.vno-dialog-overlay'); const t = o.querySelector('#vno-trans-type-select'); t.value = 'fade'; t.dispatchEvent(new Event('change', { bubbles: true })); })()`);
  await click(cdp, '.vno-dialog-overlay #vno-trans-advance-after-on');
  await ev(`(() => { const i = document.querySelector('.vno-dialog-overlay #vno-trans-advance-after'); i.value = '4'; })()`);
  await click(cdp, '.vno-dialog-overlay #vno-trans-apply-current');
  await sleep(500);
  const sixth = await ev(`(() => { const s = ${canvas}.slides[5].transition; return { type: s.type, src: !!s.sourceXml, click: s.advanceOnClick, after: s.advanceAfter }; })()`);
  check("Đổi sang Mờ dần: bỏ khối gốc, giữ không-nhấp-chuột, tự chuyển 4 giây", sixth.type === "fade" && !sixth.src && sixth.click === false && sixth.after === 4000, JSON.stringify(sixth));

  // Lưu thật
  const saved = await ev(`(async () => { const a = window.__vnoAppInstance.adapter || window.__vnoAppInstance; const content = await a.serializeToFodp(); return JSON.stringify(await window.pywebview.api.save_document_in_place(content, 'slides', ${JSON.stringify(OUT)}, ${JSON.stringify(SRC)})); })()`);
  check("Lưu PPTX thành công", /"status":\s*"ok"/.test(saved), saved.slice(0, 80));
} catch (error) {
  check("Transition desktop không phát sinh ngoại lệ", false, error.stack || error.message);
} finally {
  await session.close();
}

const failed = checks.filter(item => !item.pass);
if (failed.length) process.exit(1);
console.log(`Slides transition timing desktop: ${checks.length}/${checks.length} PASS`);
