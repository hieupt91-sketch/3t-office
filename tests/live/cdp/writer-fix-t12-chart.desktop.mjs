import path from "node:path";
import fs from "node:fs/promises";
import { launchApp } from "./session.mjs";
import { click, press, typeText, sleep } from "./actions.mjs";

const profile = process.env.VNO_CDP_LOCALAPPDATA;
if (!profile) throw new Error("VNO_CDP_LOCALAPPDATA must point to the isolated FIX-T12 profile.");
const output = path.join(profile, "fix-t12-native-chart.docx");
const session = await launchApp("writer", { localAppData: profile });
const { cdp } = session;

try {
  await click(cdp, "#vno-ribbon-tab-insert");
  await click(cdp, '[data-command-id="writer.chart.insert"]');
  await cdp.waitFor("!!document.querySelector('#vno-chart-title-input')", { timeoutMilliseconds: 10000 });
  await typeText(cdp, "FIX_T12_NATIVE_CHART", 10);
  await click(cdp, ".vno-dialog-overlay .vno-dialog-ok-btn");
  await cdp.waitFor("!!document.querySelector('.vno-writer-chart[data-vno-chart=\"true\"] svg')", { timeoutMilliseconds: 10000 });
  await sleep(300);
  const content = await cdp.evaluate("window.__vnoAppInstance.adapter._contentForExport()");
  await fs.writeFile(output + ".html", content, "utf8");
  console.log(JSON.stringify({ anchors: String(content).match(/VNO_NATIVE_CHART_[^\" ]+/g), marker: String(content).includes("vno-native-charts-fodt:"), chart: String(content).includes("data-vno-chart") }));
  const result = await cdp.evaluate(
    `globalThis.globalUnoBridge.saveRealFileInPlace("writer", ${JSON.stringify(content)}, ${JSON.stringify(output)}, null)`,
    { timeoutMilliseconds: 1200000 },
  );
  console.log(JSON.stringify({ output, result }));
  if (result?.status !== "ok") throw new Error(`Save failed: ${JSON.stringify(result)}`);
} finally {
  console.log(`PROFILE ${session.localAppData}`);
  await session.close();
}
