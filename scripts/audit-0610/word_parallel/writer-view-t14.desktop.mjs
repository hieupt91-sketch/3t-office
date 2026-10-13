import fs from "node:fs/promises";
import path from "node:path";
import { launchApp } from "../../../tests/live/cdp/session.mjs";
import { click, typeText } from "../../../tests/live/cdp/actions.mjs";
import { CdpClient, readTargets } from "../../../tests/live/cdp/client.mjs";

const root = process.env.VNO_APP_ROOT;
const profile = process.env.VNO_CDP_LOCALAPPDATA;
if (!root || !profile) throw new Error("Set VNO_APP_ROOT and VNO_CDP_LOCALAPPDATA.");

const session = await launchApp("writer", {
  root,
  localAppData: path.join(profile, "writer-view-t14", "app-profile"),
  startTimeoutMilliseconds: 180000,
  readyTimeoutMilliseconds: 180000,
});
const output = { zoom: {}, printPreview: {}, newWindow: {} };
try {
  const cdp = session.cdp;
  await cdp.waitFor("!!window.__vnoAppInstance?.viewController && !!document.querySelector('.vno-writer-page')", { timeoutMilliseconds: 180000 });
  await click(cdp, "#vno-ribbon-tab-view");
  output.zoom.initial = await cdp.evaluate("({level:window.__vnoAppInstance.viewController.zoomLevel, width:document.querySelector('.vno-writer-page').getBoundingClientRect().width, viewport:document.querySelector('.vno-writer-viewport')?.clientWidth})");
  await click(cdp, '[data-command-id="writer.view.zoomIn"]');
  output.zoom.afterIn = await cdp.evaluate("({level:window.__vnoAppInstance.viewController.zoomLevel, data:document.querySelector('.vno-writer-page').dataset.zoom})");
  await click(cdp, '[data-command-id="writer.view.pageWidth"]');
  output.zoom.pageWidth = await cdp.evaluate("({level:window.__vnoAppInstance.viewController.zoomLevel, pageWidthMode:window.__vnoAppInstance.viewController.container?.classList.contains('vno-writer-page-width'), containerClass:window.__vnoAppInstance.viewController.container?.className, page:document.querySelector('.vno-writer-page').getBoundingClientRect().width, viewport:window.__vnoAppInstance.viewController.viewport?.clientWidth})");
  await click(cdp, '[data-command-id="writer.view.zoomReset"]');
  output.zoom.afterReset = await cdp.evaluate("({level:window.__vnoAppInstance.viewController.zoomLevel, data:document.querySelector('.vno-writer-page').dataset.zoom})");

  await click(cdp, "#vno-ribbon-tab-layout");
  await click(cdp, '[data-command-id="writer.file.printPreview"]');
  await cdp.waitFor("!!document.querySelector('.vno-print-dialog-overlay .vno-print-preview-image')", { timeoutMilliseconds: 120000, intervalMilliseconds: 500 });
  output.printPreview = await cdp.evaluate("(() => {const o=document.querySelector('.vno-print-dialog-overlay');const image=o.querySelector('.vno-print-preview-image');return {visible:!!o, pageCount:Number(o.querySelector('.vno-print-total')?.textContent||0), image:{width:image?.naturalWidth,height:image?.naturalHeight}, pageSetup:window.__vnoAppInstance.adapter.getPageDimensions()}})()");
  await click(cdp, ".vno-print-dialog-overlay .vno-print-close");
  await cdp.waitFor("!document.querySelector('.vno-print-dialog-overlay')", { timeoutMilliseconds: 10000 });

  await click(cdp, "#vno-ribbon-tab-view");
  await click(cdp, ".vno-writer-page p");
  await typeText(cdp, "FIX T14 window sync probe");
  output.newWindow.sourceText = await cdp.evaluate("document.querySelector('.vno-writer-body').innerText");
  const targetsBefore = await readTargets(session.debugPort);
  output.newWindow.beforeTargets = targetsBefore.filter(target => target.type === "page").length;
  await click(cdp, '[data-command-id="writer.view.newWindow"]');
  await new Promise(resolve => setTimeout(resolve, 1800));
  const targetsAfter = await readTargets(session.debugPort);
  output.newWindow.afterTargets = targetsAfter.filter(target => target.type === "page").length;
  output.newWindow.pages = [];
  for (const target of targetsAfter.filter(target => target.type === "page")) {
    const client = target.id === cdp.target.id ? cdp : await new CdpClient(target).open();
    output.newWindow.pages.push({ id: target.id, title: target.title, url: target.url, bodyText: await client.evaluate("document.querySelector('.vno-writer-body')?.innerText||''") });
    if (client !== cdp) await client.close();
  }
  output.newWindow.desktopResult = session.output.slice(-4000);
  console.log(JSON.stringify(output, null, 2));
  await fs.writeFile(path.join(profile, "writer-view-t14.desktop.json"), JSON.stringify(output, null, 2) + "\n", "utf8");
} finally {
  await session.close();
}
