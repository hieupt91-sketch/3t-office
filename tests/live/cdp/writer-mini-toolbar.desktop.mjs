// Writer: Mini Toolbar nổi khi bôi đen chữ bằng chuột; nút Đậm áp dụng đúng lệnh; gõ phím thì ẩn.
import { launchApp } from "./session.mjs";
import { insertText, mouseDoubleClick, press, sleep } from "./actions.mjs";

const profile = process.env.VNO_CDP_LOCALAPPDATA;
if (!profile) throw new Error("VNO_CDP_LOCALAPPDATA must point to an isolated profile.");
const session = await launchApp("writer", { localAppData: profile });
const { cdp } = session;
const checks = [];
const check = (name, pass, detail = "") => {
  checks.push(Boolean(pass));
  console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`);
};
const boxOf = (selector) => cdp.evaluate(`(() => { const el = ${selector}; if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
try {
  await sleep(1500);
  await cdp.evaluate(`(() => { const b = document.querySelector('.vno-writer-body'); b.innerHTML = '<p>Xin chao the gioi</p>'; b.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await sleep(400);
  const word = await cdp.evaluate(`(() => { const t = document.querySelector('.vno-writer-body p').firstChild; const r = document.createRange(); r.setStart(t, 0); r.setEnd(t, 3); const b = r.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; })()`);
  await mouseDoubleClick(cdp, word.x, word.y);
  await sleep(500);
  const shown = await cdp.evaluate(`!!document.querySelector('.vno-mini-toolbar')`);
  check("Bôi đen chữ bằng chuột: Mini Toolbar hiện", shown === true);
  const bold = await boxOf(`document.querySelector('.vno-mini-toolbar [data-command-id="writer.text.bold"]')`);
  check("Có nút Đậm trên Mini Toolbar", !!bold);
  if (bold) {
    const sel = await cdp.evaluate(`window.getSelection().toString()`);
    await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x: bold.x, y: bold.y, button: "left", buttons: 1, clickCount: 1 });
    await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: bold.x, y: bold.y, button: "left", buttons: 0, clickCount: 1 });
    await sleep(500);
    const html = await cdp.evaluate(`document.querySelector('.vno-writer-body p').innerHTML`);
    check("Nút Đậm làm đậm đúng từ đã bôi đen", /<(b|strong)\b[^>]*>[^<]*<\/(b|strong)>/i.test(html) || /font-weight:\s*(bold|700)/i.test(html), `${sel} | ${html.slice(0, 160)}`);
  }
  await press(cdp, "End");
  await insertText(cdp, "!");
  await sleep(400);
  check("Gõ phím thì Mini Toolbar ẩn", (await cdp.evaluate(`!document.querySelector('.vno-mini-toolbar')`)) === true);
} catch (error) {
  check("Không phát sinh ngoại lệ", false, error.stack || error.message);
} finally {
  await session.close();
}
if (checks.some((c) => !c)) process.exit(1);
