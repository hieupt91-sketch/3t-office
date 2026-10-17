// Slides: Ngăn chọn (Alt+F10 / Trang đầu > Chọn > Ngăn chọn): liệt kê, chọn, đổi thứ tự lớp, đóng bằng Esc.
import { launchApp } from "./session.mjs";
import { click, mouseClick, press, sleep } from "./actions.mjs";

const checks = [];
const check = (name, pass, detail = "") => {
  checks.push({ name, pass: Boolean(pass) });
  console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`);
};
const session = await launchApp("slides", {});
const { cdp } = session;
const ev = (expression) => cdp.evaluate(expression, { awaitPromise: true, timeoutMilliseconds: 60000 });
const canvas = "window.__vnoAppInstance.canvas";
const rows = () => ev(`[...document.querySelectorAll('.vno-selection-pane:not([hidden]) .vno-selection-pane-item')].map(r => r.querySelector('.vno-selection-pane-label').textContent + (r.classList.contains('is-selected') ? '*' : ''))`);
const order = () => ev(`${canvas}.slides[${canvas}.currentSlideIndex].shapes.map(s => s.type)`);
const clickEl = async (selector) => {
  const box = await ev(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; })()`);
  if (!box) throw new Error("Không thấy " + selector);
  await mouseClick(cdp, box.x, box.y);
  await sleep(250);
};

try {
  await sleep(1500);
  await ev(`${canvas}.insertShape("rect")`);
  await ev(`${canvas}.insertShape("ellipse")`);
  await sleep(400);
  await ev(`${canvas}.setSelectedTarget(null)`);
  await click(cdp, "#vno-ribbon-tab-home");
  await sleep(300);
  await clickEl('[data-dropdown-id="slides.edit.select"]');
  await clickEl('.vno-ribbon-dropdown-item[data-command-id="slides.edit.selectionPane"], .vno-ribbon-dropdown-item[title="Ngăn chọn"]');
  const list = await rows();
  check("Mở ngăn chọn từ menu Chọn: 2 đối tượng, trên cùng trước", list.length === 2 && /elip/.test(list[0]) && /chữ nhật/.test(list[1]), JSON.stringify(list));

  await clickEl('.vno-selection-pane-item:nth-child(2) .vno-selection-pane-label');
  const afterClick = await rows(); const selOk = await ev(`String(${canvas}.selectedTarget) === String(${canvas}.slides[0].shapes[0].id)`);
  check("Nhấp dòng: chọn đối tượng đó trên trang", /chữ nhật \d+\*$/.test(afterClick[1] || "") && selOk, JSON.stringify({ afterClick, selOk }));

  await clickEl('.vno-selection-pane-item:nth-child(2) [data-sel-move="forward"]');
  const types = await order();
  check("Nút ▲ đưa hình chữ nhật lên một lớp", types[1] === "rect" && types[0] === "ellipse", JSON.stringify(types));
  check("Danh sách cập nhật theo thứ tự mới", /chữ nhật/.test((await rows())[0] || ""), JSON.stringify(await rows()));

  await press(cdp, "Escape");
  await sleep(250);
  check("Esc đóng ngăn chọn", (await rows()).length === 0);
  await ev(`document.body.focus()`);
  await press(cdp, "F10", { alt: true });
  await sleep(300);
  check("Alt+F10 mở lại ngăn chọn", (await rows()).length === 2);
} catch (error) {
  check("Không phát sinh ngoại lệ", false, error.stack || error.message);
} finally {
  await session.close();
}
if (checks.some((c) => !c.pass)) process.exit(1);
console.log(`Slides selection pane: ${checks.length}/${checks.length} PASS`);
