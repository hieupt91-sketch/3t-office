// Sheet: đổi ô chọn từ ô có chữ sang ô trống thì thanh công thức không còn chữ cũ vẽ chồng lên dòng gợi ý.
import { launchApp } from "./session.mjs";
import { sleep, click, typeText, press } from "./actions.mjs";
const checks = [];
const check = (name, pass, detail = "") => { checks.push(Boolean(pass)); console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`); };
const session = await launchApp("sheet", {});
try {
  const { cdp } = session;
  const ev = (e) => cdp.evaluate(e, { awaitPromise: true, timeoutMilliseconds: 60000 });
  await sleep(3000);
  const clickCell = async (coord) => { const p = await ev(`(() => { const el = document.querySelector('[data-coord="${coord}"]'); const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`); await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x: p.x, y: p.y, button: "left", clickCount: 1 }); await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: p.x, y: p.y, button: "left", clickCount: 1 }); await sleep(250); };
  const overlayText = () => ev(`(document.querySelector('.vno-formula-spell-overlay')?.textContent || '')`);
  await clickCell("A1"); await typeText(cdp, "Ghi chú dài", 5); await press(cdp, "Enter");
  await clickCell("A1"); await sleep(400);
  check("Chọn ô có chữ: thanh công thức hiện chữ", (await ev(`document.querySelector('.vno-formula-input').value`)) === "Ghi chú dài");
  await clickCell("A5"); await sleep(400);
  check("Chọn ô trống: ô nhập rỗng", (await ev(`document.querySelector('.vno-formula-input').value`)) === "");
  const t = await overlayText();
  check("Chọn ô trống: lớp gạch chân chính tả không còn chữ cũ", t === "", JSON.stringify(t));
  await clickCell("A1"); await sleep(400);
  check("Chọn lại ô có chữ: lớp gạch chân đồng bộ lại", (await overlayText()) === "Ghi chú dài", await overlayText());
} catch (error) {
  check("Không phát sinh ngoại lệ", false, error.stack || error.message);
} finally { await session.close().catch(() => {}); }
if (checks.some((c) => !c)) process.exit(1);