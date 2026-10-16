/**
 * Installed-app ribbon smoke runner.
 * Usage: node installed-ribbon-sequential.mjs <app> <cdp-port> <output-json>
 * It clicks every visible ribbon command in tab order on a fresh document.
 * Destructive/system/network commands are recorded as SKIP by policy.
 */
import fs from "node:fs/promises";
import { CdpClient, sleep } from "./client.mjs";
import { click, press } from "./actions.mjs";

const [app, portText, outputPath] = process.argv.slice(2);
const port = Number(portText);
const target = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json().then(items => items.find(item => item.type === "page"));
if (!target) throw new Error(`Không có CDP page ở port ${port}`);
const cdp = new CdpClient(target);
await cdp.open();
const skipped = /(?:delete|protect|print|macro|newWindow|startFrom|presenter|rehearse|finish|recordToggle|manager|ai\.|media\.|voice|open|save|insert\.image|insertVideo|insertAudio|file\.)/i;
const results = [];
const errors = [];
await cdp.send("Runtime.enable");
cdp.on?.("Runtime.exceptionThrown", event => errors.push(event?.params?.exceptionDetails?.text || "runtime exception"));
try {
  const tabs = await cdp.evaluate("[...document.querySelectorAll('.vno-ribbon-tab')].map((tab, index) => ({ index, label: tab.textContent.trim(), visible: tab.getBoundingClientRect().width > 1 && tab.getBoundingClientRect().height > 1 && !tab.hidden })).filter(tab => tab.visible)");
  for (const tab of tabs) {
    await click(cdp, ".vno-ribbon-tab", tab.index);
    await sleep(80);
    const controls = await cdp.evaluate(`(()=>[...document.querySelectorAll('.vno-ribbon-content [data-command-id]')].filter(node=>{const r=node.getBoundingClientRect();return r.width>1&&r.height>1}).map(node=>({commandId:node.dataset.commandId,label:node.getAttribute('aria-label')||node.title||node.textContent.trim()})))()`);
    for (const control of controls) {
      const status = skipped.test(control.commandId) ? "SKIP_POLICY" : "PENDING";
      if (status === "SKIP_POLICY") {
        results.push({ app, tab: tab.label, ...control, status });
        continue;
      }
      try {
        await click(cdp, `[data-command-id=${JSON.stringify(control.commandId)}]`);
        await press(cdp, "Escape", {}, 80);
        const alive = await cdp.evaluate("Boolean(document.querySelector('.vno-ribbon'))");
        results.push({ app, tab: tab.label, ...control, status: alive ? "PASS" : "FAIL_APP_DOM_MISSING" });
      } catch (error) {
        results.push({ app, tab: tab.label, ...control, status: "FAIL", error: String(error.message || error) });
      }
    }
  }
} finally {
  await fs.writeFile(outputPath, JSON.stringify({ app, port, results, runtimeErrors: errors }, null, 2));
  await cdp.evaluate("window.pywebview?.api?.close_current_window?.()").catch(() => {});
  await cdp.close().catch(() => {});
}
console.log(JSON.stringify({ app, total: results.length, pass: results.filter(x => x.status === "PASS").length, skipped: results.filter(x => x.status === "SKIP_POLICY").length, fail: results.filter(x => x.status.startsWith("FAIL")).length, runtimeErrors: errors.length, outputPath }));
