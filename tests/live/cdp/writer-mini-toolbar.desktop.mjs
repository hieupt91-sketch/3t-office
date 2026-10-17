// Mini Toolbar của Writer: hiện khi bôi đen chữ bằng chuột / nhấp chuột phải, mờ dần theo khoảng cách con trỏ,
// nút Đậm/Cỡ chữ áp dụng đúng lên vùng chọn mà không làm mất vùng chọn, biến mất khi gõ phím hoặc nhấp ra ngoài.
import { launchApp } from "./session.mjs";
import { mouseDoubleClick, mouseMove, mouseClick, mouseRightClick, press, sleep } from "./actions.mjs";

const checks = [];
const check = (name, pass, detail = "") => {
  checks.push({ name, pass: Boolean(pass), detail });
  console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`);
};

const session = await launchApp("writer", {});
const { cdp } = session;
const ev = (expression) => cdp.evaluate(expression, { awaitPromise: true });

try {
  await sleep(1200);
  await ev(`(() => { const body = document.querySelector('.vno-writer-body'); body.innerHTML = '<p>Mot hai ba bon nam sau bay</p><p>Doan hai khong dinh dang</p>'; body.dispatchEvent(new Event('input', { bubbles: true })); body.focus(); })()`);
  await sleep(600);
  // Toạ độ giữa chữ "ba"
  const point = await ev(`(() => { const p = document.querySelector('.vno-writer-body p'); const t = p.firstChild; const i = t.nodeValue.indexOf('ba'); const r = document.createRange(); r.setStart(t, i); r.setEnd(t, i + 2); const b = r.getBoundingClientRect(); return { x: Math.round(b.left + b.width / 2), y: Math.round(b.top + b.height / 2) }; })()`);

  const toolbarState = () => ev(`(() => { const e = document.querySelector('.vno-mini-toolbar'); if (!e) return null; const r = e.getBoundingClientRect(); return { opacity: Number(e.style.opacity), left: Math.round(r.left), top: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height), mode: e.getAttribute('data-mode'), buttons: e.querySelectorAll('button').length, selects: e.querySelectorAll('select').length }; })()`);

  await mouseDoubleClick(cdp, point.x, point.y);
  await sleep(500);
  const shown = await toolbarState();
  check("Bôi đen chữ bằng chuột (nhấp đúp): Mini Toolbar hiện, còn mờ", shown && shown.mode === "selection" && shown.opacity < 0.5 && shown.buttons >= 10 && shown.selects === 2, JSON.stringify(shown));
  check("Mini Toolbar nằm gọn trong cửa sổ và phía trên chữ chọn", shown && shown.left >= 0 && shown.top >= 0 && shown.top + shown.height <= point.y + 40, JSON.stringify({ shown, point }));

  // Đưa chuột vào thanh: hết mờ
  await mouseMove(cdp, shown.left + 20, shown.top + 10);
  await sleep(250);
  const near = await toolbarState();
  check("Con trỏ chạm thanh: thanh hiện rõ (opacity 1)", near && near.opacity === 1, JSON.stringify(near));

  // Nút Đậm bằng chuột thật; vùng chọn phải còn nguyên
  const boldBox = await ev(`(() => { const b = document.querySelector('.vno-mini-toolbar [data-command-id="writer.text.bold"]'); const r = b.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; })()`);
  await mouseClick(cdp, boldBox.x, boldBox.y);
  await sleep(500);
  const afterBold = await ev(`(() => { const s = getSelection(); const el = [...document.querySelectorAll('.vno-writer-body p *')].find(e => e.textContent.trim() === 'ba'); return { selected: s.toString().trim(), bold: !!el && Number.parseInt(getComputedStyle(el).fontWeight, 10) >= 600, html: document.querySelector('.vno-writer-body p').innerHTML.slice(0, 120), toolbar: !!document.querySelector('.vno-mini-toolbar') }; })()`);
  check("Nút Đậm trên Mini Toolbar in đậm đúng chữ đã chọn, giữ vùng chọn, thanh vẫn hiện", afterBold.selected === "ba" && afterBold.bold && afterBold.toolbar, JSON.stringify(afterBold));
  const pressed = await ev(`document.querySelector('.vno-mini-toolbar [data-command-id="writer.text.bold"]').getAttribute('aria-pressed')`);
  check("Nút Đậm sáng lên (đang bật) sau khi áp dụng", pressed === "true", pressed);

  // Cỡ chữ qua hộp chọn trên thanh
  await ev(`(() => { const s = document.querySelector('.vno-mini-toolbar select[data-mini-command="writer.font.size"]'); s.value = '20'; s.dispatchEvent(new Event('change', { bubbles: true })); })()`);
  await sleep(500);
  const size = await ev(`(() => { const s = getSelection(); const els = [...document.querySelectorAll('.vno-writer-body p *')].filter(e => e.textContent.trim() === 'ba'); const el = els[els.length - 1]; return { selected: s.toString().trim(), size: el ? getComputedStyle(el).fontSize : null }; })()`);
  check("Hộp Cỡ chữ trên thanh đặt 20 pt cho chữ đã chọn", size.selected === "ba" && size.size === "26.6667px", JSON.stringify(size));

  // Gõ phím: thanh biến mất
  await press(cdp, "End");
  await sleep(300);
  check("Gõ/di chuyển phím: Mini Toolbar biến mất", (await toolbarState()) === null);

  // Nhấp ra ngoài sau khi chọn lại: biến mất
  await mouseDoubleClick(cdp, point.x, point.y);
  await sleep(400);
  const again = await toolbarState();
  await mouseClick(cdp, point.x + 220, point.y + 60);
  await sleep(300);
  check("Chọn lại rồi nhấp ra ngoài: thanh hiện rồi biến mất", again && (await toolbarState()) === null, JSON.stringify(again));

  // Chuột phải: thanh hiện cùng menu
  await mouseRightClick(cdp, point.x, point.y + 30);
  await sleep(500);
  const ctx = await toolbarState();
  const menuOpen = await ev(`!!document.querySelector('.vno-context-menu, [role="menu"]')`);
  check("Nhấp chuột phải: Mini Toolbar hiện rõ cạnh menu ngữ cảnh", ctx && ctx.mode === "contextmenu" && ctx.opacity === 1 && menuOpen, JSON.stringify({ ctx, menuOpen }));
  await press(cdp, "Escape");
  await sleep(300);
  check("Esc đóng Mini Toolbar", (await toolbarState()) === null);
} catch (error) {
  check("Mini Toolbar desktop không phát sinh ngoại lệ", false, error.stack || error.message);
} finally {
  await session.close();
}

const failed = checks.filter(item => !item.pass);
if (failed.length) process.exit(1);
console.log(`Mini Toolbar desktop: ${checks.length}/${checks.length} PASS`);
