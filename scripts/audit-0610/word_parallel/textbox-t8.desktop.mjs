import { launchApp } from "../../../tests/live/cdp/session.mjs";
import { click, typeText } from "../../../tests/live/cdp/actions.mjs";
import { mkdirSync, writeFileSync } from "node:fs";

const dir = process.env.VNO_CDP_LOCALAPPDATA;
if (!dir || !process.env.VNO_APP_ROOT) throw new Error("Set VNO_CDP_LOCALAPPDATA and VNO_APP_ROOT.");
mkdirSync(dir, { recursive: true });
const output = `${dir}\\app_textbox_t8_new.docx`;
const session = await launchApp("writer", {
  localAppData: dir,
  root: process.env.VNO_APP_ROOT,
  startTimeoutMilliseconds: 180000,
  readyTimeoutMilliseconds: 180000,
});
try {
  const cdp = session.cdp;
  await cdp.waitFor("!!document.querySelector('.vno-writer-body')", { timeoutMilliseconds: 180000, intervalMilliseconds: 500 });
  const insertTab = await cdp.evaluate("[...document.querySelectorAll('.vno-ribbon-tab')].findIndex(x=>/Chèn|Insert/i.test(x.textContent))");
  await click(cdp, ".vno-ribbon-tab", insertTab);
  await click(cdp, '.vno-writer-body p', 0);
  await click(cdp, '[data-command-id="writer.insert.textbox"]');
  await typeText(cdp, "Audit textbox", 30);
  const snapshot = await cdp.evaluate(`(() => {
    const a=window.__vnoAppInstance.adapter;
    const shape=a.shapes?.findLast?.(s=>s.type==='textbox')||a.shapes?.filter(s=>s.type==='textbox').at(-1);
    const el=[...document.querySelectorAll('.vno-writer-shape-item')].find(x=>x.dataset.shapeId===shape?.id);
    const body=el?.querySelector('.vno-writer-textbox-body');
    return {devicePixelRatio:window.devicePixelRatio,shape:shape&&{id:shape.id,w:shape.w,h:shape.h,x:shape.x,y:shape.y,text:shape.text},rect:el&&{width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height},bodyText:body?.textContent,html:a._contentForExport()};
  })()`);
  const shot = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  writeFileSync(`${dir}\\textbox-t8-before.png`, Buffer.from(shot.result.data, "base64"));
  const saved = await cdp.evaluate(`(() => { const a=window.__vnoAppInstance.adapter; return globalThis.globalUnoBridge.saveRealFileInPlace("writer",a._contentForExport(),${JSON.stringify(output)},${JSON.stringify(output)}); })()`, { awaitPromise: true, timeoutMilliseconds: 240000 });
  writeFileSync(`${dir}\\textbox-t8-export.html`, snapshot.html);
  console.log(JSON.stringify({ snapshot: { ...snapshot, html: undefined }, save: saved, output, screenshot: `${dir}\\textbox-t8-before.png` }));
} finally {
  await session.close();
}
