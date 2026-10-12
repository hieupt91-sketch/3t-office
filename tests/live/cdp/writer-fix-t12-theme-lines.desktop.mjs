import path from "node:path";
import { launchApp } from "./session.mjs";
import { click, press, typeText } from "./actions.mjs";

const profile = process.env.VNO_CDP_LOCALAPPDATA;
if (!profile) throw new Error("VNO_CDP_LOCALAPPDATA must point to the isolated FIX-T12 profile.");
const output = path.join(profile, "fix-t12-theme-lines.docx");
const session = await launchApp("writer", { localAppData: profile });
const { cdp } = session;

try {
  await click(cdp, "#vno-ribbon-tab-design");
  await click(cdp, '[data-command-id="writer.design.themeGallery"]');
  await cdp.waitFor("!!document.querySelector('.vno-theme-card[data-theme-id=modern]')", { timeoutMilliseconds: 10000 });
  await click(cdp, '.vno-theme-card[data-theme-id="modern"]');
  await click(cdp, ".vno-dialog-overlay .vno-dialog-ok-btn");
  await click(cdp, "#vno-ribbon-tab-layout");
  await click(cdp, 'select[data-command-id="writer.layout.lineNumbers"]');
  const selectBefore = await cdp.evaluate("(() => {const e=document.querySelector('select[data-command-id=\"writer.layout.lineNumbers\"]'); const r=e?.getBoundingClientRect(); return {activeTab:document.querySelector('.vno-ribbon-tab.is-active')?.id, value:e?.value, disabled:e?.disabled, visible:!!r?.width, active:document.activeElement===e, rect:r&&{x:r.x,y:r.y,w:r.width,h:r.height}}})()");
  await press(cdp, " ", {}, 0);
  await press(cdp, "ArrowDown", {}, 0);
  await press(cdp, "Enter", {}, 250);
  const lineState = await cdp.evaluate("({value:document.querySelector('select[data-command-id=\"writer.layout.lineNumbers\"]')?.value, model:window.__vnoAppInstance.adapter.lineNumbers})");
  await click(cdp, ".vno-writer-body");
  await typeText(cdp, "FIX T12 THEME AND LINE NUMBERS", 2);
  const content = await cdp.evaluate("window.__vnoAppInstance.adapter._contentForExport()");
  const result = await cdp.evaluate(
    `globalThis.globalUnoBridge.saveRealFileInPlace("writer", ${JSON.stringify(content)}, ${JSON.stringify(output)}, null)`,
    { timeoutMilliseconds: 1200000 },
  );
  console.log(JSON.stringify({ output, themeMarker: String(content).match(/vno-document-theme:[^ ]+/)?.[0], lineMarker: String(content).match(/vno-line-numbers:[^ ]+/)?.[0], selectBefore, lineState, result }));
  if (result?.status !== "ok") throw new Error(`Save failed: ${JSON.stringify(result)}`);
} finally {
  console.log(`PROFILE ${session.localAppData}`);
  await session.close();
}
