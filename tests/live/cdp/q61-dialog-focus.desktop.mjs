import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { launchApp } from "./session.mjs";
import { press, sleep } from "./actions.mjs";

const profileRoot = process.env.VNO_CDP_LOCALAPPDATA;
if (!profileRoot) throw new Error("Set VNO_CDP_LOCALAPPDATA to a unique profile path before running.");
const outputDir = path.resolve("docs/assets/q61-ui");
mkdirSync(outputDir, { recursive: true });
const session = await launchApp("writer", { localAppData: path.join(profileRoot, "writer") });
try {
  const target = await session.cdp.evaluate(`(async () => {
    const layoutTab = document.querySelectorAll(".vno-ribbon-tab")[3];
    layoutTab?.click();
    await new Promise(resolve => setTimeout(resolve, 180));
    const launcher = document.querySelector('[data-command="writer.page.setupDialog"]');
    launcher?.focus();
    return launcher ? { connected: launcher.isConnected, focused: document.activeElement === launcher } : null;
  })()`);
  assert.ok(target?.connected && target.focused, "Page Setup launcher can receive keyboard focus");
  await press(session.cdp, "Enter", {}, 300);
  await session.cdp.waitFor(`!!document.querySelector("#vno-pagesetup-margin-top")`, { timeoutMilliseconds: 8000 });
  const dialog = await session.cdp.evaluate(`({open:!!document.querySelector("#vno-pagesetup-margin-top"),focusTag:document.activeElement?.tagName})`);
  assert.ok(dialog.open, "Enter opens Page Setup from the focused launcher");
  const before = await session.cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  writeFileSync(path.join(outputDir, "writer-page-focus-open.png"), Buffer.from((before.result || before).data, "base64"));

  await press(session.cdp, "Escape", {}, 100);
  await sleep(250);
  const restored = await session.cdp.evaluate(`({same:document.activeElement===document.querySelector('[data-command="writer.page.setupDialog"]'),command:document.activeElement?.getAttribute("data-command")||null,tag:document.activeElement?.tagName})`);
  assert.equal(restored.same, true, `Escape restores focus to the launcher: ${JSON.stringify(restored)}`);
  const after = await session.cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  writeFileSync(path.join(outputDir, "writer-page-focus-return.png"), Buffer.from((after.result || after).data, "base64"));
  console.log(`PASS focused keyboard activation / Escape focus return: ${JSON.stringify({ dialog, restored })}`);
} finally {
  await session.close();
}
