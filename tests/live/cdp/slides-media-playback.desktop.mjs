// Slides: tab Phát lại (Tự động phát, Lặp lại cho đến khi dừng) cho âm thanh/video, hoàn tác, lưu PPTX.
// PowerPoint COM đọc bằng scripts/audit-0610/ppt_media_readback.ps1.
import { launchApp } from "./session.mjs";
import { click, press, sleep } from "./actions.mjs";
import { createTinyMp3 } from "../../helpers/tiny-media.mjs";
import { platformOutputPath } from "./output-path.mjs";

const OUT = process.env.VNO_MEDIA_OUT || platformOutputPath("E:\\VNOffice-profiles\\claude-media\\playback.pptx");
const checks = [];
const check = (name, pass, detail = "") => {
  checks.push(Boolean(pass));
  console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`);
};
const dataUrl = "data:audio/mpeg;base64," + Buffer.from(createTinyMp3()).toString("base64");
const session = await launchApp("slides", {});
const { cdp } = session;
const ev = (expression) => cdp.evaluate(expression, { awaitPromise: true, timeoutMilliseconds: 60000 });
const canvas = "window.__vnoAppInstance.canvas";
const flags = async () => JSON.parse(await ev(`JSON.stringify((({ mediaLoop, mediaAutoplay, type }) => ({ mediaLoop, mediaAutoplay, type }))(${canvas}.slides[0].shapes[0]))`));
try {
  await sleep(1500);
  check("Chưa chọn phương tiện: tab Phát lại ẩn", (await ev(`document.querySelector('#vno-ribbon-tab-mediaPlayback')?.hidden`)) === true);
  await ev(`${canvas}.insertMedia("audio", ${JSON.stringify(dataUrl)}, 1000)`);
  await sleep(600);
  await ev(`(() => { const c = ${canvas}; c.setSelectedTarget(c.slides[0].shapes[0].id); c._renderShapesLayer(); c._syncShapeFormatContext(); })()`);
  await sleep(400);
  check("Chọn âm thanh: tab Phát lại hiện", (await ev(`document.querySelector('#vno-ribbon-tab-mediaPlayback')?.hidden`)) === false);
  await click(cdp, "#vno-ribbon-tab-mediaPlayback");
  await sleep(300);
  await click(cdp, '[data-command-id="slides.media.autoplay"]');
  await sleep(300);
  await click(cdp, '[data-command-id="slides.media.loop"]');
  await sleep(300);
  let f = await flags();
  check("Bật Tự động phát và Lặp lại: cờ lưu trong đối tượng", f.mediaAutoplay === true && f.mediaLoop === true, JSON.stringify(f));
  const html = await ev(`${canvas}._shapePresentationHtml(${canvas}.slides[0].shapes[0], {})`);
  check("Trình chiếu: thẻ audio có autoplay và loop", /<audio\b[^>]*\bloop\b/.test(html) && /<audio\b[^>]*\bautoplay\b/.test(html), html.slice(0, 160));
  await ev(`document.body.focus()`);
  await press(cdp, "z", { ctrl: true });
  await sleep(300);
  f = await flags();
  check("Ctrl+Z hoàn tác Lặp lại, giữ Tự động phát", !f.mediaLoop && f.mediaAutoplay === true, JSON.stringify(f));
  await press(cdp, "y", { ctrl: true });
  await sleep(300);
  const saved = await ev(`(async () => { const x = window.__vnoAppInstance.adapter || window.__vnoAppInstance; return JSON.stringify(await window.pywebview.api.save_document_in_place(x.serializeToFodp(), 'slides', ${JSON.stringify(OUT)}, null)).slice(0, 80); })()`);
  check("Lưu PPTX", /"status":\s*"ok"/.test(saved), saved);
  console.log("OUT " + OUT);
} catch (error) {
  check("Không phát sinh ngoại lệ", false, error.stack || error.message);
} finally {
  await session.close();
}
if (checks.some((c) => !c)) process.exit(1);
console.log(`Slides media playback: ${checks.length}/${checks.length} PASS`);
