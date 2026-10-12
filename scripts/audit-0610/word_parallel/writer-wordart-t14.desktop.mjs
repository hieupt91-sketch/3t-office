import fs from "node:fs/promises";
import path from "node:path";
import { launchApp } from "../../../tests/live/cdp/session.mjs";
import { click, press, typeText } from "../../../tests/live/cdp/actions.mjs";

const root = process.env.VNO_APP_ROOT;
const profile = process.env.VNO_CDP_LOCALAPPDATA;
if (!root || !profile) throw new Error("Set VNO_APP_ROOT and VNO_CDP_LOCALAPPDATA.");
const outputPath = path.join(profile, "fix-t14-wordart.docx");
const session = await launchApp("writer", {
  root,
  localAppData: path.join(profile, "writer-wordart-t14", "app-profile"),
  startTimeoutMilliseconds: 180000,
  readyTimeoutMilliseconds: 180000,
});
try {
  const cdp = session.cdp;
  await cdp.waitFor("!!document.querySelector('.vno-writer-body')", { timeoutMilliseconds: 180000 });
  await click(cdp, "#vno-ribbon-tab-insert");
  await click(cdp, '[data-command-id="writer.insert.wordart"]');
  await cdp.waitFor("!!document.querySelector('[data-vno-dialog=wordart] #vno-wordart-text')", { timeoutMilliseconds: 30000 });
  await click(cdp, "#vno-wordart-text");
  await press(cdp, "a", { ctrl: true }, 80);
  await typeText(cdp, "T14 Editable Art", 15);
  await click(cdp, '[data-vno-dialog="wordart"] [data-wordart-preset="navy-outline"]');
  await click(cdp, '[data-vno-dialog="wordart"] .vno-dialog-ok-btn');
  await cdp.waitFor("!!document.querySelector('.vno-writer-wordart[data-vno-wordart=true]')", { timeoutMilliseconds: 15000 });
  const inserted = await cdp.evaluate("(() => {const el=document.querySelector('.vno-writer-wordart[data-vno-wordart=true]');return {text:el?.dataset.vnoWordartText,preset:el?.dataset.vnoWordartPreset,html:el?.outerHTML}})()");
  const exportProbe = await cdp.evaluate("(() => {const html=window.__vnoAppInstance.adapter._contentForExport();const match=html.match(/<!--vno-native-wordart-fodt:([A-Za-z0-9+/=]+)-->/);const fodt=match?decodeURIComponent(escape(atob(match[1]))):'';return {wordArtHtmlCount:(html.match(/data-vno-wordart=\"true\"/g)||[]).length,anchorCount:(html.match(/VNO_NATIVE_WORDART_[^\" ]+/g)||[]).length,fodtCustomShapes:(fodt.match(/<draw:custom-shape/g)||[]).length,fodtWordArtCount:(fodt.match(/draw:name=\"WordArt-/g)||[]).length}})()");
  const saved = await cdp.evaluate(`(async () => {
    const [{globalUnoBridge}, {globalCommandBus}] = await Promise.all([
      import('/adapters/libreoffice/common/uno-bridge.js'),
      import('/platform/commands/command-bus.js')
    ]);
    const original = globalUnoBridge.saveRealFile;
    globalUnoBridge.saveRealFile = async (kind, content, format, name, source) =>
      globalUnoBridge.saveRealFileInPlace(kind, content, ${JSON.stringify(outputPath)}, source || ${JSON.stringify(outputPath)});
    try { return await globalCommandBus.execute('common.file.saveAs'); }
    finally { globalUnoBridge.saveRealFile = original; }
  })()`, { awaitPromise: true, timeoutMilliseconds: 240000 });
  if (saved === false) throw new Error("Writer Save As returned false.");
  const result = { outputPath, inserted, exportProbe, saved };
  console.log(JSON.stringify(result));
  await fs.writeFile(path.join(profile, "fix-t14-wordart.desktop.json"), JSON.stringify(result, null, 2) + "\n", "utf8");
} finally {
  await session.close();
}
