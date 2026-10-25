// Slides: mở lại tệp PPTX có hình dựng sẵn -> trình soạn thảo nhận đúng hình và vẽ bằng SVG.
// Dùng: node --experimental-websocket slides-shape-gallery-reopen.desktop.mjs <tệp.pptx>
import { launchApp } from "./session.mjs";
import { sleep } from "./actions.mjs";
import { platformOutputPath } from "./output-path.mjs";

const file = process.argv[2] || platformOutputPath("E:\\VNOffice-profiles\\claude-slidetrans\\shape_gallery.pptx");
const session = await launchApp("slides", { filePath: file, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
const ev = (e) => session.cdp.evaluate(e, { awaitPromise: true, timeoutMilliseconds: 120000 });
let failed = false;
try {
  for (let i = 0; i < 400; i++) { if (await ev("Boolean(window.__vnoAppInstance?.canvas?.imported && window.__vnoAppInstance.canvas.slides.length)")) break; await sleep(500); }
  await sleep(1500);
  const geoms = JSON.parse(await ev(`JSON.stringify(window.__vnoAppInstance.canvas.slides[0].shapes.map(s => s.geomType || s.type))`));
  const svg = await ev(`document.querySelectorAll('.vno-slide-shape-item svg.vno-shape-geometry').length`);
  console.log("shapes:", geoms.join(","), "| svg:", svg);
  const ok = geoms.some((g) => /star5/.test(g)) && geoms.some((g) => /heart/.test(g)) && geoms.some((g) => /rightArrow/.test(g)) && svg >= 2; // mũi tên phải được nhận là hình "arrow" và vẽ bằng bộ vẽ mũi tên riêng
  console.log(`${ok ? "PASS" : "FAIL"} | Mở lại tệp: nhận đúng sao/tim/mũi tên và vẽ SVG`);
  failed = !ok;
} finally { await session.close(); }
if (failed) process.exit(1);
