// Slides: tiêu đề/nội dung slide kiểu cũ chứa ký tự < > & phải hiện nguyên văn khi trình chiếu và ở chế độ người trình bày.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { launchApp } from "./session.mjs";

const profile = process.env.VNO_CDP_LOCALAPPDATA || path.join(os.tmpdir(), `vno-sste-${Date.now()}`);
fs.mkdirSync(profile, { recursive: true });
const session = await launchApp("slides", { localAppData: profile });
const results = [];
const check = (name, pass, detail = "") => { results.push(Boolean(pass)); console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`); };
try {
  const { cdp } = session;
  await new Promise(r => setTimeout(r, 3000));
  const ev = (expr) => cdp.evaluate(expr, { awaitPromise: true, timeoutMilliseconds: 120000 });
  await ev(`(() => {
    const c = window.__vnoAppInstance.adapter.canvas;
    c.slides[0].layoutType = "title-content";
    c.slides[0].title = "A <i id='tt'>nghieng</i> & B";
    c.slides[0].body = "dong <u id='bb'>gach</u>";
    if (!c.slides[1]) c.slides.push({ ...structuredClone(c.slides[0]), id: "s2", title: "Trang <b id='nn'>hai</b>" });
    else c.slides[1].title = "Trang <b id='nn'>hai</b>";
  })()`);
  const started = await ev(`Boolean(window.__show = window.__vnoAppInstance.adapter.canvas.startSlideShow(0))`);
  check("Bắt đầu trình chiếu", started);
  await new Promise(r => setTimeout(r, 600));
  const info = JSON.parse(await ev(`JSON.stringify({ injected: !!document.querySelector('#tt, #bb'), h1: (document.querySelector('.vno-slideshow-overlay h1, .vno-slideshow-overlay h2') || {}).textContent || '' , text: document.querySelector('.vno-slideshow-overlay')?.textContent || '' })`));
  check("Trình chiếu: thẻ trong tiêu đề/nội dung không chạy", info.injected === false, JSON.stringify(info).slice(0, 160));
  check("Trình chiếu: tiêu đề hiện nguyên văn", info.text.includes("<i id='tt'>nghieng</i> & B") && info.text.includes("<u id='bb'>gach</u>"));
  await ev(`window.__show.close(false)`);
  const presenter = await ev(`(() => { try { const p = window.__vnoAppInstance.adapter.canvas.startPresenterMode(0); return !!p; } catch (e) { return String(e); } })()`);
  await new Promise(r => setTimeout(r, 600));
  const pinfo = JSON.parse(await ev(`JSON.stringify({ injected: !!document.querySelector('#tt, #bb, #nn'), where: [...document.querySelectorAll('#tt, #bb, #nn')].map(e => e.id + '<' + e.parentElement.className + '<' + (e.closest('[class]')?.className||'') + '<' + (e.closest('.vno-slideshow-overlay, .vno-presenter-overlay, .vno-slides-sidebar, .vno-slides-canvas') ? 'zone' : 'other')).join(';'), text: document.body.innerText.includes("Trang <b id='nn'>hai</b>") })`));
  check("Người trình bày: không chạy thẻ, hiện nguyên văn trang kế", presenter === true && pinfo.injected === false && pinfo.text, JSON.stringify({ presenter, ...pinfo }));
} catch (error) {
  check("Không phát sinh ngoại lệ", false, error.stack || error.message);
} finally { await session.close().catch(() => {}); }
if (results.some(r => !r)) process.exit(1);
