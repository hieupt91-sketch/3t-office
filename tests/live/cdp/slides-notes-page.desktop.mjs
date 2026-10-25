// Slides: Chế độ xem > Trang ghi chú — mở, sửa ghi chú, chuyển trang, hoàn tác, Esc đóng, lưu PPTX.
import { launchApp } from "./session.mjs";
import { click, press, typeText, sleep } from "./actions.mjs";
import { platformOutputPath } from "./output-path.mjs";

const OUT = process.env.VNO_NOTESPAGE_OUT || platformOutputPath("E:\\VNOffice-profiles\\claude-slidetrans\\notes_page.pptx");
const checks = [];
const check = (name, pass, detail = "") => {
  checks.push({ name, pass: Boolean(pass) });
  console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`);
};
const session = await launchApp("slides", {});
const { cdp } = session;
const ev = (expression) => cdp.evaluate(expression, { awaitPromise: true, timeoutMilliseconds: 60000 });
const canvas = "window.__vnoAppInstance.canvas";

try {
  await sleep(1500);
  await click(cdp, "#vno-ribbon-tab-home");
  await click(cdp, '[data-command-id="slides.slide.new"]');
  await sleep(400);
  await ev(`${canvas}.selectSlide(0)`);
  await click(cdp, "#vno-ribbon-tab-view");
  await sleep(300);
  await click(cdp, '[data-command-id="slides.view.notesPage"]');
  await sleep(400);
  check("Mở trang ghi chú: hiện 1 / 2", (await ev(`document.querySelector('.vno-notespage-counter')?.textContent`)) === "1 / 2");

  await ev(`document.querySelector('.vno-notespage-text').focus()`);
  await typeText(cdp, "Nhắc: mở đầu bằng số liệu quý 3");
  await ev(`document.activeElement.blur()`);
  await sleep(300);
  check("Ghi chú trang 1 được lưu vào dữ liệu", (await ev(`${canvas}.slides[0].notes`)) === "Nhắc: mở đầu bằng số liệu quý 3");

  await click(cdp, '[data-notes-nav="next"]');
  await sleep(300);
  check("Nút ▶ sang trang 2, ô ghi chú trống", (await ev(`document.querySelector('.vno-notespage-counter')?.textContent`)) === "2 / 2" && (await ev(`document.querySelector('.vno-notespage-text').value`)) === "");
  await click(cdp, '[data-notes-nav="prev"]');
  await sleep(300);
  check("Quay lại trang 1 vẫn thấy ghi chú", (await ev(`document.querySelector('.vno-notespage-text').value`)).startsWith("Nhắc:"));

  await press(cdp, "Escape");
  await sleep(300);
  check("Esc đóng trang ghi chú", (await ev(`document.querySelectorAll('.vno-notespage-overlay').length`)) === 0);

  const saved = await ev(`(async () => { const a = window.__vnoAppInstance.adapter || window.__vnoAppInstance; return JSON.stringify(await window.pywebview.api.save_document_in_place(a.serializeToFodp(), 'slides', ${JSON.stringify(OUT)}, null)).slice(0, 80); })()`);
  check("Lưu PPTX", /"status":\s*"ok"/.test(saved), saved);

  await ev(`document.body.focus()`);
  await press(cdp, "z", { ctrl: true });
  await sleep(300);
  check("Ctrl+Z hoàn tác ghi chú", (await ev(`${canvas}.slides[0].notes || ""`)) === "");
} catch (error) {
  check("Không phát sinh ngoại lệ", false, error.stack || error.message);
} finally {
  await session.close();
}
if (checks.some((c) => !c.pass)) process.exit(1);
console.log(`Slides notes page: ${checks.length}/${checks.length} PASS`);
