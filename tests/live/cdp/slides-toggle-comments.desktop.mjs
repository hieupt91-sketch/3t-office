// Slides: Đánh giá > Nhận xét > Hiện nhận xét bật/tắt ngăn nhận xét, hiện nhận xét đã thêm, Esc ẩn.
import { launchApp } from "./session.mjs";
import { click, press, sleep } from "./actions.mjs";

const checks = [];
const check = (name, pass, detail = "") => { checks.push(Boolean(pass)); console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`); };
const session = await launchApp("slides", {});
const { cdp } = session;
const ev = (expression) => cdp.evaluate(expression, { awaitPromise: true, timeoutMilliseconds: 60000 });
const canvas = "window.__vnoAppInstance.adapter.canvas";
try {
  await sleep(2500);
  await ev(`${canvas}.addComment("Nhan xet thu nghiem", "An")`);
  await click(cdp, "#vno-ribbon-tab-review");
  await sleep(400);
  const panelHidden = () => ev(`${canvas}.commentPanelEl ? ${canvas}.commentPanelEl.hidden : null`);
  check("Ban đầu ngăn nhận xét ẩn", (await panelHidden()) === true);
  await click(cdp, '[data-command-id="slides.review.toggleComments"]');
  await sleep(400);
  check("Bấm Hiện nhận xét: ngăn hiện", (await panelHidden()) === false);
  const text = await ev(`${canvas}.commentPanelEl.textContent`);
  check("Ngăn hiện nhận xét đã thêm", /Nhan xet thu nghiem/.test(text), text.replace(/\s+/g, " ").slice(0, 100));
  await click(cdp, '[data-command-id="slides.review.toggleComments"]');
  await sleep(400);
  check("Bấm lần hai: ngăn ẩn", (await panelHidden()) === true);
  await click(cdp, '[data-command-id="slides.review.toggleComments"]');
  await sleep(300);
  await press(cdp, "Escape");
  await sleep(300);
  check("Esc cũng ẩn ngăn", (await panelHidden()) === true);
} catch (error) {
  check("Không phát sinh ngoại lệ", false, error.stack || error.message);
} finally { await session.close().catch(() => {}); }
if (checks.some((c) => !c)) process.exit(1);
