// Writer: mở lại DOCX có sao/tim/lục giác -> vẫn mở được và đủ 3 hình (hình nhập từ tệp là đối tượng nổi).
// Dùng: node --experimental-websocket writer-shape-presets-reopen.desktop.mjs <tệp.docx>   (cần VNO_CDP_LOCALAPPDATA)
import { launchApp } from "./session.mjs";
import { sleep } from "./actions.mjs";

const file = process.argv[2];
const profile = process.env.VNO_CDP_LOCALAPPDATA;
if (!file || !profile) throw new Error("Cần tệp .docx và VNO_CDP_LOCALAPPDATA.");
const session = await launchApp("writer", { localAppData: profile, filePath: file, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
let failed = false;
try {
  await sleep(8000);
  const info = JSON.parse(await session.cdp.evaluate(`JSON.stringify({ shapes: (window.__vnoAppInstance.adapter.shapes || []).map(s => s.type || s.shapeType), floats: document.querySelectorAll('[data-vno-float]').length })`));
  console.log(JSON.stringify(info));
  const count = Math.max(info.floats, info.shapes.length);
  const ok = count === 3;
  console.log(`${ok ? "PASS" : "FAIL"} | Mở lại DOCX: còn ${count}/3 hình`);
  failed = !ok;
} finally { await session.close(); }
if (failed) process.exit(1);
