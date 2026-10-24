import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { launchApp } from "./session.mjs";
import { press, sleep } from "./actions.mjs";

const profileRoot = process.env.VNO_CDP_LOCALAPPDATA;
if (!profileRoot) throw new Error("Set VNO_CDP_LOCALAPPDATA to a unique profile path before running.");
const outputDir = path.resolve("docs/assets/q61-ui");
mkdirSync(outputDir, { recursive: true });
const cases = [
  { name: "empty", value: "", valid: false },
  { name: "negative", value: "-1", valid: false },
  { name: "over-1e9", value: "1000000001", valid: false },
  { name: "letters", value: "abc", valid: false },
  { name: "long-5000", value: "9".repeat(5000), valid: false },
  { name: "special", value: "<>&\"", valid: false },
];
const targets = [
  { app: "writer", id: "writer-zoom", open: `void globalCommandBus.execute("writer.view.zoomDialog")`, input: "#vno-writer-zoom-value", button: "#vno-writer-zoom-apply", cases },
  { app: "writer", id: "writer-page-setup", open: `void globalCommandBus.execute("writer.page.setupDialog")`, input: "#vno-pagesetup-margin-top", button: ".vno-dialog-ok-btn", cases },
  { app: "sheet", id: "sheet-row-height", open: `void globalCommandBus.execute("sheet.row.height")`, input: ".vno-dialog-input", button: ".vno-dialog-ok-btn", cases },
  { app: "sheet", id: "sheet-conditional-format", open: `window.__vnoAppInstance.grid.showConditionalFormattingDialog()`, input: "#vno-cf-value", button: ".vno-rule-apply", cases: cases.map(item => item.name === "negative" ? { ...item, valid: true } : item) },
  { app: "slides", id: "slides-zoom", open: `void globalCommandBus.execute("slides.view.zoomDialog")`, input: "#vno-slides-zoom-value", button: "#vno-slides-zoom-apply", cases },
];

let assertions = 0;
let screenshots = 0;
for (const app of ["writer", "sheet", "slides"]) {
  const session = await launchApp(app, { localAppData: path.join(profileRoot, app) });
  try {
    for (const target of targets.filter(item => item.app === app)) {
      for (const [width, height] of [[1366, 768], [1024, 600]]) {
        for (const theme of ["light", "dark"]) {
          const windowInfo = await session.cdp.send("Browser.getWindowForTarget", {});
          await session.cdp.send("Browser.setWindowBounds", {
            windowId: (windowInfo.result || windowInfo).windowId,
            bounds: { windowState: "normal", width, height },
          });
          await session.cdp.evaluate(`document.documentElement.dataset.theme=${JSON.stringify(theme)}`);
          await session.cdp.evaluate(target.open);
          await session.cdp.waitFor(`!!document.querySelector(${JSON.stringify(target.input)})`, { timeoutMilliseconds: 8000 });
          const root = await session.cdp.evaluate(`document.querySelector(${JSON.stringify(target.input)})?.closest('[role="dialog"]')`);
          assert.ok(root, `${target.id} opens a dialog at ${width}x${height} ${theme}`);

          for (const item of target.cases) {
            const result = await session.cdp.evaluate(`(() => {
              const input=document.querySelector(${JSON.stringify(target.input)});
              const button=document.querySelector(${JSON.stringify(target.button)});
              const setter=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input),"value")?.set;
              setter?.call(input,${JSON.stringify(item.value)});
              input.dispatchEvent(new Event("input",{bubbles:true}));
              input.dispatchEvent(new Event("change",{bubbles:true}));
              const dialog=input.closest('[role="dialog"]');
              return {disabled:button.disabled,alerts:[...dialog.querySelectorAll('[role="alert"]')].map(e=>e.textContent.trim()).filter(Boolean),value:input.value,rect:dialog.getBoundingClientRect().toJSON()};
            })()`);
            const valid = item.valid;
            assert.equal(result.disabled, !valid, `${target.id} ${item.name}: ${JSON.stringify(result)}`);
            if (!valid) assert.ok(result.alerts.length > 0, `${target.id} ${item.name} shows an error`);
            assertions++;
            if (item.name === "letters") {
              const shot = await session.cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
              const filename = `${target.id}-${width}x${height}-${theme}.png`;
              writeFileSync(path.join(outputDir, filename), Buffer.from((shot.result || shot).data, "base64"));
              screenshots++;
            }
          }
          await press(session.cdp, "Escape", {}, 100);
          await session.cdp.waitFor(`!document.querySelector(${JSON.stringify(target.input)})`, { timeoutMilliseconds: 5000 });
        }
      }
    }
  } finally {
    await session.close();
  }
}
console.log(`PASS ${assertions} invalid/valid value assertions; captured ${screenshots} dialog screenshots at 1366x768 and 1024x600 in light/dark themes.`);
