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
  await press(cdp, "ArrowDown", {}, 0);
  await press(cdp, "Enter", {}, 250);
  await click(cdp, ".vno-writer-body");
  await typeText(cdp, "FIX T12 THEME AND LINE NUMBERS", 2);
  const content = await cdp.evaluate("window.__vnoAppInstance.adapter._contentForExport()");
  const result = await cdp.evaluate(
    `globalThis.globalUnoBridge.saveRealFileInPlace("writer", ${JSON.stringify(content)}, ${JSON.stringify(output)}, null)`,
    { timeoutMilliseconds: 1200000 },
  );
  console.log(JSON.stringify({ output, themeMarker: String(content).match(/vno-document-theme:[^ ]+/)?.[0], lineMarker: String(content).match(/vno-line-numbers:[^ ]+/)?.[0], result }));
  if (result?.status !== "ok") throw new Error(`Save failed: ${JSON.stringify(result)}`);
} finally {
  console.log(`PROFILE ${session.localAppData}`);
  await session.close();
}
