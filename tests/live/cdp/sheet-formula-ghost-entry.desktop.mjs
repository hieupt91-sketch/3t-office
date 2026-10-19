// Sheet: gõ công thức, Enter, chọn lại ô rồi mở rộng vùng chọn bằng Shift+Mũi tên và bấm ô khác — công thức KHÔNG được bị nối thêm tham chiếu ô.
// Lỗi gốc (phát hiện khi soạn thử như người dùng thật): thanh công thức mất tiêu điểm tự bắt đầu phiên sửa "ma", cú bấm kế tiếp thành "chọn tham chiếu" (=C2*D2A7).
import { launchApp } from "./session.mjs";
import { sleep, click, typeText, press } from "./actions.mjs";
const checks = [];
const check = (name, pass, detail = "") => { checks.push(Boolean(pass)); console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`); };
const session = await launchApp("sheet", {});
try {
  const { cdp } = session;
  const ev = (e) => cdp.evaluate(e, { awaitPromise: true, timeoutMilliseconds: 60000 });
  await sleep(2500);
  const cellPoint = (coord) => ev(`(() => { const el = document.querySelector('[data-coord="${coord}"]'); if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
  const clickCell = async (coord) => { const p = await cellPoint(coord); if (!p) throw new Error("không thấy ô " + coord); await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x: p.x, y: p.y, button: "left", clickCount: 1 }); await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: p.x, y: p.y, button: "left", clickCount: 1 }); await sleep(250); };
  const formula = (coord) => ev(`(() => { const g = window.__vnoAppInstance.grid; const item = g.sheetsData[g.activeSheet].get(${JSON.stringify(coord)}); return item ? (item.formula || String(item.val)) : ''; })()`);
  await clickCell("C2"); await typeText(cdp, "12", 5); await press(cdp, "Tab"); await typeText(cdp, "850000", 5); await press(cdp, "Enter");
  await clickCell("E2"); await typeText(cdp, "=C2*D2", 5); await press(cdp, "Enter");
  await clickCell("E2"); await press(cdp, "ArrowDown", { shift: true }); await press(cdp, "ArrowDown", { shift: true });
  await clickCell("A7");
  const f = await formula("E2");
  check("Công thức E2 giữ nguyên sau khi chọn vùng bằng Shift+Mũi tên rồi bấm ô khác", f === "=C2*D2", f);
  const sel = await ev(`(document.querySelector('.vno-name-box, #vno-name-box, [class*=name-box] input'))?.value`);
  check("Bấm A7 chuyển ô chọn sang A7", sel === "A7", String(sel));
  const edit = await ev(`!!window.__vnoAppInstance.grid.formulaEntry`);
  check("Không còn phiên sửa công thức treo", edit === false, String(edit));
  await typeText(cdp, "Tổng", 5); await press(cdp, "Enter");
  check("Gõ vào A7 vào đúng ô A7", (await formula("A7")) === "Tổng", await formula("A7"));
  check("E2 vẫn nguyên sau khi gõ vào A7", (await formula("E2")) === "=C2*D2", await formula("E2"));
} catch (error) {
  check("Không phát sinh ngoại lệ", false, error.stack || error.message);
} finally { await session.close().catch(() => {}); }
if (checks.some((c) => !c)) process.exit(1);