import { launchApp } from "../../tests/live/cdp/session.mjs";
import path from "node:path";
const inst = process.argv[2], lad = process.argv[3], src = process.argv[4], app = process.argv[5] || "writer";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const session = await launchApp(app, { root: path.join(inst, "app"), python: path.join(inst, "python", "python.exe"), localAppData: lad, filePath: src, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
try {
  for (let i = 0; i < 6; i++) {
    await sleep(8000);
    const s = await session.cdp.evaluate(`JSON.stringify((() => { const a = window.__vnoAppInstance?.adapter; return { has: !!window.__vnoAppInstance, src: a?._sourcePath || a?.sourceFilePath || null, title: document.title, bodyLen: (document.querySelector('.vno-writer-body')||{textContent:''}).textContent.length, loading: !!document.querySelector('.vno-loading, [role=progressbar]'), url: location.href.slice(0,80) }; })())`);
    console.log(i, s);
  }
} finally { await session.close(); }
