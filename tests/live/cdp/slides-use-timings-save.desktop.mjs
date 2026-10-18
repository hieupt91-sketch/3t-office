// Slides: tắt "Dùng thời gian đã đặt" -> lưu PPTX (p:showPr useTimings="0") -> mở lại vẫn tắt. PowerPoint COM: scripts/audit-0610/ppt_show_timings_readback.ps1
import { launchApp } from "./session.mjs";
import { sleep } from "./actions.mjs";

const OUT = process.env.VNO_USETIMINGS_OUT || "E:\\VNOffice-profiles\\claude-slidetrans\\use_timings.pptx";
const checks = [];
const check = (name, pass, detail = "") => { checks.push(Boolean(pass)); console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`); };
const canvas = "window.__vnoAppInstance.adapter.canvas";
let session = await launchApp("slides", {});
try {
  const ev = (e) => session.cdp.evaluate(e, { awaitPromise: true, timeoutMilliseconds: 120000 });
  await sleep(2500);
  await ev(`${canvas}.applySlideShowSettings({ ...${canvas}.getSlideShowSettings(), useTimings: false, showWithoutNarration: true })`);
  const saved = await ev(`(async () => { const x = window.__vnoAppInstance.adapter; return JSON.stringify(await window.pywebview.api.save_document_in_place(x.serializeToFodp(), 'slides', ${JSON.stringify(OUT)}, null)).slice(0, 80); })()`);
  check("Lưu PPTX", /"status":\s*"ok"/.test(saved), saved);
  console.log("OUT " + OUT);
} catch (error) {
  check("Không phát sinh ngoại lệ", false, error.stack || error.message);
} finally { await session.close().catch(() => {}); }
session = await launchApp("slides", { filePath: OUT, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
try {
  const ev = (e) => session.cdp.evaluate(e, { awaitPromise: true, timeoutMilliseconds: 120000 });
  await session.cdp.waitFor(`${canvas}.imported === true`, { timeoutMilliseconds: 120000 });
  await sleep(1500);
  const reopened = await ev(`${canvas}.getSlideShowSettings().useTimings`);
  check("Mở lại: vẫn tắt dùng thời gian đã đặt", reopened === false, String(reopened));
  const narr = await ev(`${canvas}.getSlideShowSettings().showWithoutNarration`);
  check("Mở lại: vẫn bật Trình chiếu không có thuyết minh", narr === true, String(narr));
} catch (error) {
  check("Mở lại không phát sinh ngoại lệ", false, error.stack || error.message);
} finally { await session.close().catch(() => {}); }
if (checks.some((c) => !c)) process.exit(1);
