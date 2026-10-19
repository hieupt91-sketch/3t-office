// Slides: ở cửa sổ thấp (1366x768) ngăn ghi chú thuyết trình phải đủ cao để gõ, và ghi chú được lưu vào trang chiếu.
// Lỗi gốc (phát hiện khi soạn thử): ngăn ghi chú co về 2 px nên "đã mở ngăn ghi chú" nhưng không có chỗ gõ.
import { launchApp } from "./session.mjs";
import { sleep, click, typeText } from "./actions.mjs";
const checks = [];
const check = (name, pass, detail = "") => { checks.push(Boolean(pass)); console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`); };
const session = await launchApp("slides", {});
try {
  const { cdp } = session;
  const ev = (e) => cdp.evaluate(e, { awaitPromise: true, timeoutMilliseconds: 60000 });
  await sleep(2500);
  const win = await cdp.send("Browser.getWindowForTarget", {}, 15000);
  await cdp.send("Browser.setWindowBounds", { windowId: (win.result || win).windowId, bounds: { windowState: "normal", width: 1366, height: 768 } }, 15000);
  await sleep(1200);
  await ev(`window.globalCommandBus.execute("slides.notes.toggle")`); await sleep(800);
  const h = await ev(`(() => { const c = document.querySelector('.vno-slide-notes-content'); return c ? Math.round(c.getBoundingClientRect().height) : -1; })()`);
  check("Ngăn ghi chú mở có chỗ gõ cao ít nhất 80 px ở cửa sổ 1366x768", h >= 80, String(h));
  const inputVisible = await ev(`(() => { const i = document.querySelector('.vno-slide-notes-input'); if (!i) return 'khong co o nhap'; i.scrollIntoView({ block: 'nearest' }); const r = i.getBoundingClientRect(); return r.height >= 60 && r.width > 100 ? 'ok' : 'qua be ' + Math.round(r.height); })()`);
  check("Ô nhập ghi chú nhìn thấy được và đủ lớn", inputVisible === "ok", inputVisible);
  await click(cdp, ".vno-slide-notes-input");
  await typeText(cdp, "Nhấn mạnh doanh thu tăng 12,4%.", 5);
  await sleep(600);
  const note = await ev(`window.__vnoAppInstance.adapter.canvas.slides[0].notes || ''`);
  check("Ghi chú gõ vào được lưu vào trang chiếu", note.includes("Nhấn mạnh doanh thu"), note);
} catch (error) {
  check("Không phát sinh ngoại lệ", false, error.stack || error.message);
} finally { await session.close().catch(() => {}); }
if (checks.some((c) => !c)) process.exit(1);