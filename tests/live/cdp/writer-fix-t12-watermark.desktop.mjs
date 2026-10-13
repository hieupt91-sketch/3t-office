import path from "node:path";
import { launchApp } from "./session.mjs";
import { click, press, typeText } from "./actions.mjs";

const profile = process.env.VNO_CDP_LOCALAPPDATA;
if (!profile) throw new Error("VNO_CDP_LOCALAPPDATA must point to the isolated FIX-T12 profile.");
const output = path.join(profile, "fix-t12-native-watermark.docx");
const session = await launchApp("writer", { localAppData: profile });
const { cdp } = session;

try {
  await click(cdp, "#vno-ribbon-tab-design");
  await click(cdp, '[data-command-id="writer.page.watermark"]');
  await cdp.waitFor("!!document.querySelector('.vno-watermark-dialog #vno-wm-text')", { timeoutMilliseconds: 10000 });
  await click(cdp, ".vno-watermark-dialog #vno-wm-text");
  await press(cdp, "a", { ctrl: true }, 0);
  await typeText(cdp, "FIX T12 NATIVE WATERMARK", 2);
  await click(cdp, ".vno-watermark-dialog .vno-dialog-ok-btn");
  const content = await cdp.evaluate("window.__vnoAppInstance.adapter._contentForExport()");
  const result = await cdp.evaluate(
    `globalThis.globalUnoBridge.saveRealFileInPlace("writer", ${JSON.stringify(content)}, ${JSON.stringify(output)}, null)`,
    { timeoutMilliseconds: 1200000 },
  );
  console.log(JSON.stringify({ output, nativeMarker: String(content).includes("vno-native-watermark-fodt:"), result }));
  if (result?.status !== "ok") throw new Error(`Save failed: ${JSON.stringify(result)}`);
} finally {
  console.log(`PROFILE ${session.localAppData}`);
  await session.close();
}
