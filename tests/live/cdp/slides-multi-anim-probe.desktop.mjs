// Bước 0 kế hoạch nhiều hiệu ứng: mở PPTX có 2 hiệu ứng trên một hình, in mô hình, lưu lại (đường lưu thật).
// Dùng: node --experimental-websocket slides-multi-anim-probe.desktop.mjs <vào.pptx> <ra.pptx>
import { launchApp } from "./session.mjs";
import { sleep } from "./actions.mjs";

const [src, out] = [process.argv[2], process.argv[3]];
const session = await launchApp("slides", { filePath: src, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
const ev = (e) => session.cdp.evaluate(e, { awaitPromise: true, timeoutMilliseconds: 120000 });
try {
  for (let i = 0; i < 400; i++) { if (await ev("Boolean(window.__vnoAppInstance?.canvas?.imported && window.__vnoAppInstance.canvas.slides.length)")) break; await sleep(500); }
  await sleep(1500);
  console.log(await ev(`JSON.stringify(window.__vnoAppInstance.canvas.slides[0].shapes.map(s => ({ id: s.id, name: s.name, animation: s.animation, extra: s.extraAnimations })))`));
  console.log(await ev(`JSON.stringify(window.__vnoAppInstance.canvas.collectSlideAnimations(window.__vnoAppInstance.canvas.slides[0]).map(x => x.target + ':' + x.type))`));
  if (out) {
    const saved = await ev(`(async () => { const x = window.__vnoAppInstance.adapter || window.__vnoAppInstance; return JSON.stringify(await window.pywebview.api.save_document_in_place(x.serializeToFodp(), 'slides', ${JSON.stringify(out)}, ${JSON.stringify(src)})).slice(0, 100); })()`);
    console.log("save:", saved);
  }
} finally { await session.close(); }
