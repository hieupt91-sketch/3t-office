// Sheet: ribbon toggle buttons (Bold, Italic, Underline, Wrap, alignment) must follow the ACTIVE CELL's real style.
// Real desktop app over CDP, no OS input.
import { launchApp } from "./session.mjs";
import { click, press, typeText } from "./actions.mjs";
import { sleep } from "./client.mjs";

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok: Boolean(ok) });
  console.log(`${ok ? "PASS" : "FAIL"} | ${name}${detail ? " | " + detail : ""}`);
};

const session = await launchApp("sheet", {});
const { cdp } = session;
const state = () => cdp.evaluate(`(() => {
  const pressed = id => document.querySelector('[data-command-id="' + id + '"]')?.getAttribute('aria-pressed') === 'true';
  return {
    name: document.getElementById('vno-cell-name')?.value,
    bold: pressed('sheet.cell.bold'), italic: pressed('sheet.cell.italic'), underline: pressed('sheet.cell.underline'),
    wrap: pressed('sheet.cell.wrapText'), center: pressed('sheet.cell.alignCenter'), left: pressed('sheet.cell.alignLeft')
  };
})()`);

try {
  await sleep(2500);
  await click(cdp, '[data-coord="A1"]');
  await typeText(cdp, "x", 30);
  await press(cdp, "Enter");
  await click(cdp, '[data-coord="A1"]');
  await press(cdp, "b", { ctrl: true }, 300);
  let s = await state();
  check("Ctrl+B: nút Đậm sáng ở ô A1", s.name === "A1" && s.bold === true);

  await click(cdp, '[data-coord="B1"]');
  await sleep(250);
  s = await state();
  check("Chuyển sang ô thường B1: nút Đậm TẮT", s.name === "B1" && s.bold === false, JSON.stringify(s));

  await click(cdp, '[data-coord="A1"]');
  await sleep(250);
  s = await state();
  check("Quay lại ô đậm A1: nút Đậm sáng", s.bold === true);

  await press(cdp, "ArrowDown", {}, 250);
  s = await state();
  check("Mũi tên xuống ô A2 thường: nút Đậm tắt", s.name === "A2" && s.bold === false);

  await press(cdp, "ArrowUp", {}, 250);
  await press(cdp, "b", { ctrl: true }, 300);
  s = await state();
  check("Tắt Đậm bằng Ctrl+B ở A1: nút Đậm TẮT (trước đây vẫn sáng)", s.name === "A1" && s.bold === false, JSON.stringify(s));

  await press(cdp, "i", { ctrl: true }, 300);
  s = await state();
  check("Ctrl+I: nút Nghiêng sáng, Đậm vẫn tắt", s.italic === true && s.bold === false);
  await click(cdp, '[data-coord="C3"]');
  await sleep(250);
  s = await state();
  check("Ô C3 thường: nút Nghiêng tắt", s.italic === false);
  await click(cdp, '[data-coord="A1"]');
  await sleep(250);
  s = await state();
  check("Về A1: nút Nghiêng sáng lại", s.italic === true);

  await click(cdp, '[data-command-id="sheet.cell.alignCenter"]');
  await sleep(250);
  s = await state();
  check("Bấm Căn giữa: nút Căn giữa sáng", s.center === true);
  await click(cdp, '[data-coord="B2"]');
  await sleep(250);
  s = await state();
  check("Sang B2 chưa căn: nút Căn giữa tắt", s.center === false);
} finally {
  await session.close();
}

const failed = results.filter(r => !r.ok).length;
console.log(`KẾT QUẢ TRẠNG THÁI NÚT ĐỊNH DẠNG SHEET: ${results.length - failed}/${results.length} PASS | ${failed} FAIL`);
process.exitCode = failed ? 1 : 0;
