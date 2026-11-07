import fs from "node:fs/promises";
import path from "node:path";
import { launchApp } from "./session.mjs";
import { sleep } from "./client.mjs";

const corpus = process.env.VNO_Q70_CORPUS || "E:\\VN OFice\\file test\\lan-legacy";
const profileRoot = process.env.VNO_CDP_LOCALAPPDATA;
const outputDir = process.env.VNO_Q70_OUT;
const artifactDir = process.env.VNO_Q70_ARTIFACTS;
if (!profileRoot || !outputDir || !artifactDir) throw new Error("Set unique VNO_CDP_LOCALAPPDATA, VNO_Q70_OUT and VNO_Q70_ARTIFACTS.");
const expected = new Map([["legacy10.doc", 2], ["legacy14.doc", 15], ["legacy15.doc", 2]]);
const selected = (process.env.VNO_Q70_FILES || "legacy10.doc,legacy14.doc,legacy15.doc").split(",").filter(Boolean);
await fs.mkdir(outputDir, { recursive: true });
await fs.mkdir(artifactDir, { recursive: true });
const results = [];
for (const file of selected) {
  const sourcePath = path.resolve(corpus, file);
  const outputPath = path.resolve(outputDir, file.replace(/\.doc$/i, ".docx"));
  const session = await launchApp("writer", { filePath: sourcePath, localAppData: path.join(profileRoot, file.replaceAll(".", "-") + "-profile"), startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
  try {
    await session.cdp.send("Emulation.setDeviceMetricsOverride", { width: 1366, height: 768, deviceScaleFactor: 1, mobile: false });
    await session.cdp.waitFor(`String(window.__vnoAppInstance?.adapter?._sourcePath || window.__vnoAppInstance?.adapter?.sourceFilePath || '').toLowerCase().endsWith(${JSON.stringify(file.toLowerCase())})`, { timeoutMilliseconds: 240000, intervalMilliseconds: 250 });
    await sleep(1200);
    const state = await session.cdp.evaluate(`(() => { const a=window.__vnoAppInstance.adapter; const b=a.bodyDom||document.querySelector('.vno-writer-body'); const p=[...(b?.querySelectorAll('p,h1,h2,h3,h4,h5,h6')||[])]; const status=document.querySelector('.vno-statusbar')?.innerText||''; return {paragraphs:p.length,emptyParagraphs:p.filter(x=>!x.textContent.trim()).length,pages:Number(status.match(/\\/\\s*(\\d+)/)?.[1]||a._livePageCount||0),bodyRect:b?.getBoundingClientRect().toJSON()||null}; })()`);
    const exportHtml = await session.cdp.evaluate("window.__vnoAppInstance.adapter._contentForExport()");
    const exportMetrics = { paragraphs: (exportHtml.match(/<(?:p|h[1-6])\b/gi)||[]).length, empty: (exportHtml.match(/<p\b[^>]*>\s*(?:<br\s*\/?\s*>)?\s*<\/p>/gi)||[]).length };
    await fs.writeFile(path.join(artifactDir, `${file.replace(".doc", "")}-export.html`), exportHtml, "utf8");
    const light = await session.cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    await fs.writeFile(path.join(artifactDir, `${file.replace(".doc", "")}-light-1366x768.png`), Buffer.from((light.result||light).data,"base64"));
    const savedRaw = await session.cdp.evaluate(`(async()=>{const a=window.__vnoAppInstance.adapter;return JSON.stringify(await window.pywebview.api.save_document_in_place(a._contentForExport(),'writer',${JSON.stringify(outputPath)},${JSON.stringify(sourcePath)}))})()`, { awaitPromise: true, timeoutMilliseconds: 300000 });
    const saved = JSON.parse(savedRaw || "{}");
    await session.cdp.evaluate("document.querySelector('#vno-toggle-theme-btn')?.click()");
    await session.cdp.waitFor("document.documentElement.dataset.theme === 'dark'", { timeoutMilliseconds: 10000, intervalMilliseconds: 100 });
    await sleep(500);
    const dark = await session.cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    await fs.writeFile(path.join(artifactDir, `${file.replace(".doc", "")}-dark-1366x768.png`), Buffer.from((dark.result||dark).data,"base64"));
    const pass = saved.status === "ok" && state.pages === expected.get(file);
    results.push(pass);
    console.log(`${pass?"PASS":"FAIL"} | ${file} | canvas=${state.pages}/${expected.get(file)} | DOM=${state.paragraphs},empty=${state.emptyParagraphs} | exportHTML=${exportMetrics.paragraphs},empty=${exportMetrics.empty} | save=${saved.status||"missing"} | ${outputPath}`);
  } finally { await session.close(); }
}
console.log(`SUMMARY | ${results.filter(Boolean).length}/${results.length} | artifacts=${artifactDir}`);
if (results.some(x=>!x)) process.exitCode=1;
