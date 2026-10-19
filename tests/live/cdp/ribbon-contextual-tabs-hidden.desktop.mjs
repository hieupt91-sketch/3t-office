// Ba ứng dụng: thẻ ngữ cảnh (hidden) KHÔNG được chiếm chỗ trên thanh thẻ khi chưa chọn đối tượng; hiện ra khi chọn.
// Lỗi gốc (phát hiện khi soạn thử Slides/Sheet): display:flex ghi đè thuộc tính hidden nên Thiết kế biểu đồ, Phát lại, Thiết kế bảng... luôn hiện.
import { launchApp } from "./session.mjs";
import { sleep, click, typeText, press } from "./actions.mjs";
const checks = [];
const check = (name, pass, detail = "") => { checks.push(Boolean(pass)); console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`); };
const visibleContextual = (ev) => ev(`[...document.querySelectorAll('.vno-ribbon-tab')].filter(e => e.hidden && e.getBoundingClientRect().width > 0 && getComputedStyle(e).display !== 'none').map(e => e.textContent.trim()).join(' | ')`);
for (const app of ["slides", "sheet", "writer"]) {
  const session = await launchApp(app, {});
  try {
    const ev = (e) => session.cdp.evaluate(e, { awaitPromise: true, timeoutMilliseconds: 60000 });
    await sleep(3000);
    const shown = await visibleContextual(ev);
    check(`${app}: chưa chọn đối tượng thì không thẻ ngữ cảnh nào chiếm chỗ`, shown === "", shown);
    const total = await ev(`[...document.querySelectorAll('.vno-ribbon-tab')].filter(e => e.getBoundingClientRect().width > 0).length`);
    check(`${app}: thanh thẻ chỉ gồm các thẻ chính (không tràn do thẻ ngữ cảnh)`, total <= 11, String(total));
    if (app === "slides") {
      await ev(`window.__vnoAppInstance.canvas?.insertShape ? window.__vnoAppInstance.canvas.insertShape("rect") : window.__vnoAppInstance.adapter.canvas.insertShape("rect")`);
      await sleep(600);
      const p = await ev(`(() => { const el = document.querySelector('.vno-slide-shape-item'); const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
      await session.cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x: p.x, y: p.y, button: "left", clickCount: 1 });
      await session.cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: p.x, y: p.y, button: "left", clickCount: 1 });
      await sleep(500);
      const tab = await ev(`(() => { const t = document.querySelector('#vno-ribbon-tab-shapeFormat'); return t && !t.hidden && t.getBoundingClientRect().width > 0; })()`);
      check("slides: chọn hình thì thẻ Định dạng hình hiện", tab === true, String(tab));
    }
    if (app === "writer") {
      await click(session.cdp, ".vno-writer-body p");
      await ev(`window.globalCommandBus.execute("writer.table.insert")`); await sleep(700);
      await click(session.cdp, ".vno-writer-body table td"); await sleep(500);
      const tab = await ev(`(() => { const t = document.querySelector('#vno-ribbon-tab-tableDesign'); return t && !t.hidden && t.getBoundingClientRect().width > 0; })()`);
      check("writer: chèn bảng thì thẻ Thiết kế Bảng hiện", tab === true, String(tab));
    }
  } catch (error) {
    check(`${app}: không phát sinh ngoại lệ`, false, error.stack || error.message);
  } finally { await session.close().catch(() => {}); }
}
if (checks.some((c) => !c)) process.exit(1);