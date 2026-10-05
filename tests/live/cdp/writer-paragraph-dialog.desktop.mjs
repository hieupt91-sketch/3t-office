// Doc: hộp thoại Đoạn văn (chuột phải ▸ Đoạn văn… và nút góc nhóm) áp dụng đúng căn lề/thụt lề/khoảng cách/giãn dòng
// bằng MỘT bước hoàn tác. Ứng dụng desktop thật qua CDP, không dùng thao tác hệ điều hành.
import { launchApp } from "./session.mjs";
import { press, typeText } from "./actions.mjs";
import { sleep } from "./client.mjs";

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok: Boolean(ok), detail });
  console.log(`${ok ? "PASS" : "FAIL"} | ${name}${detail ? " | " + detail : ""}`);
};

const session = await launchApp("writer", {});
const { cdp } = session;
const blockStyle = () => cdp.evaluate(`(() => {
  const b = document.querySelector('.vno-writer-body p, .vno-writer-body div');
  const s = b?.style || {};
  return { align: s.textAlign, left: s.marginLeft, right: s.marginRight, indent: s.textIndent, top: s.marginTop, bottom: s.marginBottom, line: s.lineHeight };
})()`);
const setField = (id, value) => cdp.evaluate(`(() => { const el = document.querySelector(${JSON.stringify(id)}); if (!el) return false; el.value = ${JSON.stringify(String(value))}; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
const dialogOpen = () => cdp.evaluate(`!!document.querySelector('.vno-paragraph-dialog')`);

try {
  await sleep(2500);
  await typeText(cdp, "Đoạn văn thử nghiệm hộp thoại", 15);
  await sleep(300);

  await cdp.evaluate(`import('/platform/commands/command-bus.js').then(m => { window.__vnoParaOpen = m.globalCommandBus.execute('writer.format.paragraphDialog'); return 1; })`);
  await sleep(600);
  check("Lệnh writer.format.paragraphDialog mở hộp thoại Đoạn văn", await dialogOpen());

  // Giá trị không hợp lệ: thụt treo lớn hơn thụt trái -> báo lỗi đỏ, hộp thoại vẫn mở, chưa đổi gì.
  await setField("#vno-para-left", "0.5");
  await setField("#vno-para-special", "hanging");
  await setField("#vno-para-special-by", "2");
  await cdp.evaluate(`document.querySelector('.vno-dialog-ok-btn').click()`);
  await sleep(200);
  const err = await cdp.evaluate(`document.querySelector('#vno-para-error')?.textContent || ''`);
  check("Thụt treo lớn hơn thụt trái: báo lỗi tiếng Việt, hộp thoại vẫn mở", (await dialogOpen()) && /treo/i.test(err), err);

  // Giá trị hợp lệ.
  await setField("#vno-para-align", "justify");
  await setField("#vno-para-left", "2");
  await setField("#vno-para-right", "1");
  await setField("#vno-para-special", "firstLine");
  await setField("#vno-para-special-by", "1.27");
  await setField("#vno-para-before", "6");
  await setField("#vno-para-after", "12");
  await setField("#vno-para-line", "multiple");
  await setField("#vno-para-line-by", "1.3");
  await cdp.evaluate(`document.querySelector('.vno-dialog-ok-btn').click()`);
  await sleep(500);
  check("Bấm Áp dụng đóng hộp thoại", !(await dialogOpen()));
  const applied = await blockStyle();
  check("Căn đều hai bên", applied.align === "justify", JSON.stringify(applied));
  check("Thụt lề trái 2cm, phải 1cm, dòng đầu 1,27cm", applied.left === "20mm" && applied.right === "10mm" && applied.indent === "12.7mm", JSON.stringify(applied));
  check("Cách đoạn trước 6pt, sau 12pt, giãn dòng nhiều dòng 1,3", applied.top === "6pt" && applied.bottom === "12pt" && applied.line === "1.3", JSON.stringify(applied));

  // Mở lại: hộp thoại phải hiện đúng giá trị hiện tại.
  await cdp.evaluate(`import('/platform/commands/command-bus.js').then(m => { m.globalCommandBus.execute('writer.format.paragraphDialog'); return 1; })`);
  await sleep(500);
  const shown = await cdp.evaluate(`({ align: document.querySelector('#vno-para-align')?.value, left: document.querySelector('#vno-para-left')?.value, special: document.querySelector('#vno-para-special')?.value, mode: document.querySelector('#vno-para-line')?.value })`);
  check("Mở lại hộp thoại: hiện đúng giá trị đã áp dụng", shown.align === "justify" && Number(shown.left) === 2 && shown.special === "firstLine" && shown.mode === "multiple", JSON.stringify(shown));
  await press(cdp, "Escape", {}, 300);
  check("Esc đóng hộp thoại, không đổi gì", !(await dialogOpen()) && (await blockStyle()).left === "20mm");

  // Hoàn tác bằng một lần Ctrl+Z.
  await cdp.evaluate(`document.querySelector('.vno-writer-body')?.focus()`);
  await press(cdp, "z", { ctrl: true }, 500);
  const undone = await blockStyle();
  check("Ctrl+Z một lần hoàn tác toàn bộ thay đổi của hộp thoại", !undone.left && !undone.indent && !undone.top && undone.align !== "justify", JSON.stringify(undone));

  // Menu chuột phải có mục Đoạn văn… bật, và nút góc nhóm có mặt.
  const launchers = await cdp.evaluate(`document.querySelectorAll('button.vno-ribbon-dialog-launcher[data-command="writer.format.paragraphDialog"]').length`);
  check("Nút góc nhóm Đoạn văn có trên ribbon", launchers >= 1, String(launchers));
  await cdp.evaluate(`document.querySelector('.vno-writer-body')?.focus()`);
  await cdp.evaluate(`(() => { const b = [...document.querySelectorAll('button.vno-ribbon-dialog-launcher[data-command="writer.format.paragraphDialog"]')].find(el => el.offsetParent !== null); b?.click(); return !!b; })()`);
  await sleep(600);
  check("Bấm nút góc nhóm mở hộp thoại Đoạn văn", await dialogOpen());
  await press(cdp, "Escape", {}, 300);
} catch (error) {
  check("Không có lỗi ngoại lệ trong kịch bản", false, String(error?.stack || error).slice(0, 400));
} finally {
  await session.close();
}

const failed = results.filter(item => !item.ok).length;
console.log(`KẾT QUẢ ĐOẠN VĂN: ${results.length - failed}/${results.length} PASS | ${failed} FAIL`);
process.exit(failed ? 1 : 0);
