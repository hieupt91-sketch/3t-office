// Slides: Thiết lập trình chiếu > "Dùng thời gian đã đặt để tự chuyển trang": bật thì tự chuyển sau N giây, tắt thì đứng yên.
import { launchApp } from "./session.mjs";
import { sleep } from "./actions.mjs";

const checks = [];
const check = (name, pass, detail = "") => { checks.push(Boolean(pass)); console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`); };
const session = await launchApp("slides", {});
const { cdp } = session;
const ev = (expression) => cdp.evaluate(expression, { awaitPromise: true, timeoutMilliseconds: 60000 });
const canvas = "window.__vnoAppInstance.adapter.canvas";
try {
  await sleep(2500);
  await ev(`(() => { const c = ${canvas}; while (c.slides.length < 3) c.slides.push({ ...structuredClone(c.slides[0]), id: "s" + c.slides.length, transition: undefined }); c.slides[0].transition = { type: "fade", duration: 200, advanceOnClick: true, advanceAfter: 1500 }; })()`);
  // Mặc định bật
  const def = await ev(`${canvas}.getSlideShowSettings().useTimings`);
  check("Mặc định dùng thời gian đã đặt", def === true, String(def));
  await ev(`window.__show = ${canvas}.startSlideShow(0)`);
  await sleep(500);
  check("Đang ở trang 1", (await ev(`window.__show.getIndex()`)) === 0);
  await sleep(2600);
  const advanced = await ev(`window.__show.getIndex()`);
  check("Bật: sau 1,5 giây tự sang trang 2", advanced >= 1, String(advanced));
  await ev(`window.__show.close(false)`);
  await sleep(400);
  // Tắt
  await ev(`${canvas}.applySlideShowSettings({ ...${canvas}.getSlideShowSettings(), useTimings: false })`);
  await ev(`window.__show = ${canvas}.startSlideShow(0)`);
  await sleep(3200);
  const stay = await ev(`window.__show.getIndex()`);
  check("Tắt: đứng yên ở trang 1 dù hết thời gian", stay === 0, String(stay));
  await ev(`window.__show.close(false)`);
  // Hộp thoại có ô tích
  ev(`window.globalCommandBus.execute("slides.show.setupShow")`).catch(() => {});
  await cdp.waitFor("document.querySelector('#vno-setup-use-timings')", { timeoutMilliseconds: 10000 });
  const boxState = await ev(`document.querySelector('#vno-setup-use-timings').checked`);
  check("Hộp Thiết lập trình chiếu có ô tích và phản ánh trạng thái tắt", boxState === false, String(boxState));
  await ev(`document.querySelector('#vno-setup-use-timings').click(); document.querySelector('#vno-setup-ok').click()`);
  await sleep(300);
  check("Tích lại và Áp dụng: bật lại", (await ev(`${canvas}.getSlideShowSettings().useTimings`)) === true);
} catch (error) {
  check("Không phát sinh ngoại lệ", false, error.stack || error.message);
} finally { await session.close().catch(() => {}); }
if (checks.some((c) => !c)) process.exit(1);
