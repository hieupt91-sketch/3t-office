// Doc: ribbon toggle buttons (Bold, Italic, Underline, alignment) must follow the formatting under the caret, and
// bold applied to a spell-check-flagged word must survive marker refreshes. Real desktop app over CDP, no OS input.
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
const ribbonState = () => cdp.evaluate(`(() => {
  const pressed = id => document.querySelector('[data-command-id="' + id + '"]')?.getAttribute('aria-pressed') === 'true';
  return {
    bold: pressed('writer.text.bold'), italic: pressed('writer.text.italic'), underline: pressed('writer.text.underline'),
    left: pressed('writer.para.alignLeft'), center: pressed('writer.para.alignCenter'), right: pressed('writer.para.alignRight'),
    domBold: document.queryCommandState('bold'), domItalic: document.queryCommandState('italic'),
    html: document.querySelector('.vno-writer-body')?.innerHTML || ''
  };
})()`);
const settle = (ms = 250) => sleep(ms);

try {
  await sleep(2500);
  await typeText(cdp, "tôi yêu việt nam", 20);
  await settle();
  await press(cdp, "Home", {}, 150);
  for (let i = 0; i < 3; i += 1) await press(cdp, "ArrowRight", { shift: true }, 60);
  await press(cdp, "b", { ctrl: true }, 300);
  let s = await ribbonState();
  check("Ctrl+B trên từ được chọn: nút Đậm sáng", s.bold && s.domBold);

  await press(cdp, "Home", {}, 200);
  await press(cdp, "ArrowRight", {}, 250);
  s = await ribbonState();
  check("Đặt con trỏ trong từ đậm: nút Đậm vẫn sáng", s.bold === true && s.domBold === true);

  await press(cdp, "End", {}, 250);
  s = await ribbonState();
  check("Con trỏ ở cuối (chữ thường): nút Đậm TẮT", s.bold === false && s.domBold === false, JSON.stringify({ bold: s.bold, dom: s.domBold }));

  await press(cdp, "ArrowLeft", {}, 200);
  await press(cdp, "ArrowLeft", {}, 200);
  s = await ribbonState();
  check("Di chuyển trong chữ thường: nút Đậm vẫn tắt", s.bold === false);

  await press(cdp, "Home", {}, 200);
  await press(cdp, "ArrowRight", {}, 200);
  s = await ribbonState();
  check("Quay lại từ đậm: nút Đậm sáng lại", s.bold === true);

  // Tắt Đậm cho cả từ: chọn lại từ rồi Ctrl+B (với con trỏ trơn Ctrl+B chỉ đổi kiểu cho chữ gõ tiếp theo).
  await press(cdp, "Home", {}, 200);
  for (let i = 0; i < 3; i += 1) await press(cdp, "ArrowRight", { shift: true }, 60);
  await press(cdp, "b", { ctrl: true }, 300);
  await press(cdp, "ArrowRight", {}, 200);
  s = await ribbonState();
  check("Tắt Đậm bằng Ctrl+B trên từ được chọn: nút Đậm tắt", s.bold === false && s.domBold === false);

  await press(cdp, "i", { ctrl: true }, 300);
  s = await ribbonState();
  check("Ctrl+I bật Nghiêng, nút Nghiêng sáng, Đậm vẫn tắt", s.italic === true && s.bold === false);
  await press(cdp, "i", { ctrl: true }, 300);
  s = await ribbonState();
  check("Ctrl+I lần nữa: nút Nghiêng tắt", s.italic === false);

  // Căn lề: nút theo đoạn đang đứng.
  await press(cdp, "e", { ctrl: true }, 300);
  s = await ribbonState();
  check("Ctrl+E: nút Căn giữa sáng, Căn trái tắt", s.center === true && s.left === false, JSON.stringify({ c: s.center, l: s.left }));
  await press(cdp, "l", { ctrl: true }, 300);
  s = await ribbonState();
  check("Ctrl+L: nút Căn trái sáng, Căn giữa tắt", s.left === true && s.center === false, JSON.stringify({ c: s.center, l: s.left }));

  // In đậm một từ bị đánh dấu "chưa chắc chắn" của chính tả: đậm phải còn sau khi làm mới dấu.
  await press(cdp, "End", {}, 200);
  await typeText(cdp, " xyzq", 20);
  await sleep(1500);
  for (let i = 0; i < 4; i += 1) await press(cdp, "ArrowLeft", { shift: true }, 60);
  await press(cdp, "b", { ctrl: true }, 300);
  await sleep(1800); // chờ chính tả làm mới dấu
  await press(cdp, "Home", {}, 200);
  await press(cdp, "End", {}, 600);
  await press(cdp, "ArrowLeft", {}, 250);
  s = await ribbonState();
  const stillBold = /<b>(?:<span[^>]*>)?xyzq(?:<\/span>)?<\/b>|<b><span[^>]*>xyzq<\/span><\/b>|<span[^>]*><b>xyzq<\/b><\/span>/.test(s.html);
  check("Từ bị đánh dấu chính tả vẫn đậm sau khi làm mới dấu", stillBold, s.html.slice(-160));
  check("Con trỏ trong từ đậm đó: nút Đậm sáng", s.bold === true);
} finally {
  await session.close();
}

const failed = results.filter(r => !r.ok).length;
console.log(`KẾT QUẢ TRẠNG THÁI NÚT ĐỊNH DẠNG DOC: ${results.length - failed}/${results.length} PASS | ${failed} FAIL`);
process.exitCode = failed ? 1 : 0;
