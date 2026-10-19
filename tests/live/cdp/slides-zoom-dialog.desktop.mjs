// Slides: hộp thoại Thu phóng (nút ribbon + bấm số % thanh trạng thái), nhập 75 → canvas 0.75, giá trị sai báo lỗi, Esc không đổi.
import { launchApp } from "./session.mjs";
import { sleep } from "./actions.mjs";

const checks = [];
const check = (name, pass, detail = "") => { checks.push(Boolean(pass)); console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`); };
const canvas = "window.__vnoAppInstance.adapter.canvas";
const session = await launchApp("slides", {});
try {
  const ev = (e) => session.cdp.evaluate(e, { awaitPromise: true, timeoutMilliseconds: 60000 });
  await sleep(2500);
  const dialog = "!!document.querySelector('#vno-slides-zoom-value')";
  const setInput = (v) => ev(`(() => { const i = document.querySelector('#vno-slides-zoom-value'); i.value = ${JSON.stringify(String(v))}; return true; })()`);
  const click = (sel) => ev(`document.querySelector(${JSON.stringify(sel)}).click()`);

  // 1. Mở bằng lệnh/nút ribbon
  void ev(`window.globalCommandBus.execute("slides.view.zoomDialog")`);
  await session.cdp.waitFor(dialog, { timeoutMilliseconds: 8000 });
  check("Lệnh slides.view.zoomDialog mở hộp thoại", true);
  const initial = await ev(`document.querySelector('#vno-slides-zoom-value').value`);
  check("Ô nhập hiện tỉ lệ hiện tại 100", initial === "100", initial);
  await setInput(75); await click("#vno-slides-zoom-apply"); await sleep(400);
  let z = await ev(`${canvas}.zoomLevel`);
  check("Nhập 75 → zoomLevel 0.75 (không bị làm tròn thành 0.8)", z === 0.75, String(z));
  const shown = await ev(`(document.querySelector('#vno-zoom-text')?.textContent || '').trim()`);
  check("Thanh trạng thái hiện 75%", /75/.test(shown), shown);

  // 2. Mở bằng cách bấm số % ở thanh trạng thái
  await ev(`document.querySelector('#vno-zoom-text').click()`);
  await session.cdp.waitFor(dialog, { timeoutMilliseconds: 8000 });
  check("Bấm số % ở thanh trạng thái mở hộp thoại", true);
  const reopened = await ev(`document.querySelector('#vno-slides-zoom-value').value`);
  check("Hộp mở với giá trị hiện tại 75", reopened === "75", reopened);

  // 3. Giá trị ngoài khoảng / không phải số nguyên → báo lỗi, không đổi, hộp vẫn mở
  for (const bad of ["300", "10", "12.5", ""]) {
    await setInput(bad); await click("#vno-slides-zoom-apply"); await sleep(150);
    const err = await ev(`document.querySelector('#vno-slides-zoom-error').textContent`);
    const still = await ev(dialog);
    z = await ev(`${canvas}.zoomLevel`);
    check(`Giá trị "${bad}" bị từ chối`, still === true && /50/.test(err) && z === 0.75, `${err} | zoom=${z}`);
  }
  // 4. Nút nhanh 200 và Enter
  await click('[data-zoom="200"]');
  await ev(`document.querySelector('#vno-slides-zoom-value').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))`);
  await sleep(300);
  z = await ev(`${canvas}.zoomLevel`);
  check("Nút 200% + Enter → zoom 2.0 và hộp đóng", z === 2 && (await ev(dialog)) === false, String(z));

  // 5. Esc không đổi
  void ev(`window.globalCommandBus.execute("slides.view.zoomDialog")`);
  await session.cdp.waitFor(dialog, { timeoutMilliseconds: 8000 });
  await setInput(50);
  await ev(`document.querySelector('.vno-dialog-box').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`);
  await sleep(300);
  z = await ev(`${canvas}.zoomLevel`);
  check("Esc đóng hộp, không đổi zoom (vẫn 2.0)", z === 2 && (await ev(dialog)) === false, String(z));

  // 6. Vừa cửa sổ
  void ev(`window.globalCommandBus.execute("slides.view.zoomDialog")`);
  await session.cdp.waitFor(dialog, { timeoutMilliseconds: 8000 });
  await click('[data-fit="window"]'); await sleep(400);
  z = await ev(`${canvas}.zoomLevel`);
  check("Nút Vừa cửa sổ: zoom trong khoảng hợp lệ và hộp đóng", z >= 0.3 && z <= 2 && (await ev(dialog)) === false, String(z));

  // 7. Phím tắt/nút cũ vẫn chạy: Phóng to +0.1 từ 0.5
  await ev(`${canvas}.setZoom(0.5)`);
  await ev(`window.globalCommandBus.execute("slides.view.zoomIn")`); await sleep(200);
  z = await ev(`${canvas}.zoomLevel`);
  check("Phóng to từ 50% → 60%", Math.abs(z - 0.6) < 1e-9, String(z));
  await click("#vno-ribbon-tab-view"); await sleep(400);
  check("Nút Thu phóng… có trên ribbon (tab Chế độ xem)", await ev(`!!document.querySelector('[data-command-id="slides.view.zoomDialog"]')`) === true);
  await click('[data-command-id="slides.view.zoomDialog"]');
  await session.cdp.waitFor(dialog, { timeoutMilliseconds: 8000 });
  check("Bấm nút ribbon mở hộp thoại", true);
  await ev(`document.querySelector('.vno-dialog-close-footer-btn').click()`); await sleep(200);
} catch (error) {
  check("Không phát sinh ngoại lệ", false, error.stack || error.message);
} finally { await session.close().catch(() => {}); }
if (checks.some((c) => !c)) process.exit(1);