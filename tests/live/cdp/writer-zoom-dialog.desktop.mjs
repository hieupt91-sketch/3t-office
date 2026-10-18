// Writer: Xem > Thu phóng tùy chỉnh / Vừa cả trang / Nhiều trang - đo mức thu phóng thật trên app desktop.
import { launchApp } from "./session.mjs";
import { click, sleep } from "./actions.mjs";
const results = [];
const check = (name, pass, detail = "") => { results.push(Boolean(pass)); console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`); };
const session = await launchApp("writer", { startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
const { cdp } = session;
const ev = (expression) => cdp.evaluate(expression, { awaitPromise: true, timeoutMilliseconds: 120000 });
const zoom = () => ev(`window.__vnoAppInstance.viewController.zoomLevel`);
try {
  await cdp.waitFor("window.__vnoAppInstance?.viewController?.page", { timeoutMilliseconds: 120000 });
  await sleep(1500);
  const geom = JSON.parse(await ev(`JSON.stringify({ vh: window.__vnoAppInstance.viewController.viewport.clientHeight, ph: window.__vnoAppInstance.viewController.page.offsetHeight, vw: window.__vnoAppInstance.viewController.viewport.clientWidth, pw: window.__vnoAppInstance.viewController.page.offsetWidth })`));
  // 1. Vừa cả trang
  await ev(`window.globalCommandBus.execute("writer.view.fitPage")`);
  const fit = await zoom();
  const expectFit = Math.round(((geom.vh - 32) / geom.ph) * 100) / 100;
  check("Vừa cả trang: cả chiều cao trang nằm trong khung nhìn", Math.abs(fit - expectFit) < 0.02 && geom.ph * fit <= geom.vh, `zoom=${fit} mong=${expectFit}`);
  // 2. Nhiều trang
  await ev(`window.globalCommandBus.execute("writer.view.multiplePages")`);
  const multi = await zoom();
  check("Nhiều trang: nhỏ hơn Vừa chiều rộng, có lớp xếp nhiều trang", multi < 0.8 && await ev(`document.querySelector('.vno-writer-multiple-pages') !== null`), `zoom=${multi}`);
  // 3. Hộp Thu phóng tùy chỉnh: nút 200% rồi Áp dụng
  void ev(`window.globalCommandBus.execute("writer.view.zoomDialog")`);
  await cdp.waitFor("document.querySelector('#vno-writer-zoom-value')", { timeoutMilliseconds: 10000 });
  await click(cdp, '[data-zoom="200"]');
  await click(cdp, "#vno-writer-zoom-apply");
  await sleep(400);
  check("Hộp Thu phóng: chọn 200% và Áp dụng", Math.abs((await zoom()) - 2) < 0.001, String(await zoom()));
  check("Thanh trạng thái hiện 200%", await ev(`/200\\s*%/.test(document.body.innerText)`));
  // 4. Giá trị sai bị từ chối
  void ev(`window.globalCommandBus.execute("writer.view.zoomDialog")`);
  await cdp.waitFor("document.querySelector('#vno-writer-zoom-value')", { timeoutMilliseconds: 10000 });
  await ev(`document.querySelector('#vno-writer-zoom-value').value = '9'`);
  await click(cdp, "#vno-writer-zoom-apply");
  const err = await ev(`document.querySelector('#vno-writer-zoom-error')?.textContent`);
  check("Giá trị ngoài 10–500 bị từ chối kèm thông báo", /10 đến 500/.test(err || "") && Math.abs((await zoom()) - 2) < 0.001, err);
  // 5. Vừa chiều rộng từ hộp
  await click(cdp, '[data-fit="width"]');
  await sleep(400);
  const wide = await zoom();
  check("Hộp Thu phóng: Vừa chiều rộng trang", Math.abs(wide - (geom.vw - 40) / geom.pw) < 0.03, `zoom=${wide}`);
} catch (error) {
  check("Không phát sinh ngoại lệ", false, error.stack || error.message);
} finally { await session.close(); }
if (results.some(r => !r)) process.exit(1);
