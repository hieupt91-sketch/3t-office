import path from "node:path";
import { launchApp } from "./session.mjs";
import { click, typeText } from "./actions.mjs";

const profile = process.env.VNO_CDP_LOCALAPPDATA;
if (!profile) throw new Error("VNO_CDP_LOCALAPPDATA must point to the isolated FIX-T12 profile.");
const output = path.join(profile, "fix-t12-native-diagram.docx");
const session = await launchApp("writer", { localAppData: profile });
const { cdp } = session;

try {
  await click(cdp, "#vno-ribbon-tab-insert");
  await click(cdp, '[data-command-id="writer.diagram.insert"]');
  await cdp.waitFor("!!document.querySelector('#vno-diagram-count-input')", { timeoutMilliseconds: 10000 });
  await click(cdp, ".vno-dialog-overlay .vno-dialog-ok-btn");
  await cdp.waitFor("!!document.querySelector('.vno-writer-diagram[data-vno-diagram=\"true\"] .vno-diagram-node-text')", { timeoutMilliseconds: 10000 });
  const labels = await cdp.evaluate("[...document.querySelectorAll('.vno-writer-diagram .vno-diagram-node-text')].map(x=>x.textContent.trim())");
  const content = await cdp.evaluate("window.__vnoAppInstance.adapter._contentForExport()");
  const result = await cdp.evaluate(
    `globalThis.globalUnoBridge.saveRealFileInPlace("writer", ${JSON.stringify(content)}, ${JSON.stringify(output)}, null)`,
    { timeoutMilliseconds: 1200000 },
  );
  console.log(JSON.stringify({ output, labels, marker: String(content).includes("vno-native-diagrams-fodt:"), result }));
  if (result?.status !== "ok") throw new Error(`Save failed: ${JSON.stringify(result)}`);
} finally {
  console.log(`PROFILE ${session.localAppData}`);
  await session.close();
}
