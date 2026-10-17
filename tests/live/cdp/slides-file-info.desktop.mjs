import fs from "node:fs";
import path from "node:path";
import { launchApp } from "./session.mjs";
import { click, press, typeText, sleep } from "./actions.mjs";

const out = process.env.VNO_SLIDES_INFO_OUT || String.raw`E:\VNOffice-temp\slides-document-properties\properties.pptx`;
fs.mkdirSync(path.dirname(out), { recursive: true });
const checks = [];
const check = (name, pass, detail = "") => { checks.push(Boolean(pass)); console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`); };
const session = await launchApp("slides", {});
const { cdp } = session;
const ev = (expression) => cdp.evaluate(expression, { awaitPromise: true, timeoutMilliseconds: 60000 });
try {
  await sleep(1200);
  await click(cdp, ".vno-ribbon-tab-file");
  await cdp.waitFor("!!document.querySelector('#vno-backstage-writer-info')", { timeoutMilliseconds: 10000 });
  await click(cdp, "#vno-backstage-writer-info");
  await sleep(300);
  check("Backstage Info opens", !!(await ev("document.querySelector('#vno-info-edit-properties')")));

  await click(cdp, "#vno-info-edit-properties");
  await sleep(250);
  for (const [name, value] of Object.entries({
    title: "VN Slides metadata", subject: "K\u1ebf ho\u1ea1ch", creator: "Codex Author",
    keywords: "slides, metadata", description: "Ghi ch\u00fa ki\u1ec3m tra"
  })) {
    const selector = `.vno-document-properties-form [name="${name}"]`;
    await click(cdp, selector);
    await press(cdp, "a", { ctrl: true });
    await typeText(cdp, value);
  }
  await click(cdp, ".vno-document-properties-save");
  await sleep(250);
  const properties = JSON.parse(await ev(`(() => { const a=window.__vnoAppInstance.adapter || window.__vnoAppInstance; return JSON.stringify(a.documentProperties); })()`));
  check("Properties fields updated", properties.title === "VN Slides metadata" && properties.creator === "Codex Author" && properties.subject === "K\u1ebf ho\u1ea1ch" && properties.keywords === "slides, metadata" && properties.description === "Ghi ch\u00fa ki\u1ec3m tra", JSON.stringify(properties));

  await click(cdp, ".vno-ribbon-tab-file");
  await click(cdp, "#vno-backstage-writer-info");
  await sleep(200);
  await click(cdp, "#vno-info-mark-as-final");
  await sleep(200);
  check("Mark as Final writes contentStatus", (await ev(`(() => {const a=window.__vnoAppInstance.adapter || window.__vnoAppInstance;return a.isFinal && a.documentProperties.contentStatus === "Final"})()`)) === true);
  check("Mark as Final locks slide text and notes for accidental edits", (await ev(`(() => {const c=window.__vnoAppInstance.canvas;return !!c.container.dataset.vnoFinal && c.container.querySelectorAll('[contenteditable="true"],.vno-slide-notes-input:not([readonly])').length === 0})()`)) === true);

  await click(cdp, ".vno-ribbon-tab-file");
  await click(cdp, "#vno-backstage-writer-info");
  await sleep(200);
  await ev(`(() => { const a=window.__vnoAppInstance.adapter || window.__vnoAppInstance; const c=a.canvas; c.slides[0].notes="Ghi ch\u00fa ki\u1ec3m tra"; c.slides[0].hidden=true; c.slides[0].comments=[{text:"Nh\u1eadn x\u00e9t"}]; return true; })()`);
  await click(cdp, "#vno-info-inspect-document");
  await sleep(200);
  const inspector = await ev(`(() => [...document.querySelectorAll('[data-count]')].map(e=>e.textContent).join('|'))()`);
  check("Inspector shows five groups", inspector.split("|").length === 5 && inspector.split("|").slice(1, 4).every(value => value.startsWith("1 ")), inspector);
  await press(cdp, "Escape");

  const saved = await ev(`(async()=>{const a=window.__vnoAppInstance.adapter || window.__vnoAppInstance;const r=await window.globalUnoBridge.saveRealFileInPlace('slides',a.serializeToFodp(),${JSON.stringify(out)},null);return JSON.stringify(r)})()`);
  check("PPTX saved through desktop pipeline", /"status"\s*:\s*"ok"/.test(saved), saved);
} catch (error) {
  check("Desktop CDP flow completes", false, error.stack || error.message);
} finally {
  await session.close();
}
if (checks.some((result) => !result)) process.exitCode = 1;
