import fs from "node:fs/promises";
import { launchApp } from "./session.mjs";
import { BANNED_DISPLAY_TEXT } from "../../unit/user-visible-source-scanner.js";

// Desktop input is exclusively WebView2 CDP. No OS input helpers.
const scanExpression = `(() => {
  const banned = new RegExp(${JSON.stringify(BANNED_DISPLAY_TEXT.source)});
  const visible = element => {
    if (!element || element.closest('script,style,[hidden],[aria-hidden="true"]')) return false;
    const style = getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden' && element.getClientRects().length > 0;
  };
  const matches = [];
  let textNodes = 0, attributes = 0;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (visible(node.parentElement) && node.textContent.trim()) {
      textNodes++;
      if (banned.test(node.textContent)) matches.push({kind:'text', text:node.textContent.trim()});
    }
  }
  for (const element of document.querySelectorAll('[title],[aria-label],[placeholder]')) {
    if (!visible(element)) continue;
    for (const name of ['title','aria-label','placeholder']) {
      const value = element.getAttribute(name);
      if (!value) continue;
      attributes++;
      if (banned.test(value)) matches.push({kind:name,text:value});
    }
  }
  if (banned.test(document.title)) matches.push({kind:'document.title',text:document.title});
  return {title:document.title,textNodes,attributes,matchCount:matches.length,matches};
})()`;

const outputs = [];
for (const app of ["writer", "sheet", "slides"]) {
  const session = await launchApp(app, { root: process.cwd() });
  try {
    const cdp = session.cdp;
    const record = {app, port:session.debugPort, command:`python -s main.py --app=${app}`, browserArguments:`--remote-debugging-port=${session.debugPort}`, stages:[]};
    record.stages.push({stage:"initial", ...await cdp.evaluate(scanExpression)});
    for (const type of ["keyDown", "keyUp"]) await cdp.send("Input.dispatchKeyEvent", {type,key:"F1",code:"F1",windowsVirtualKeyCode:112});
    await cdp.waitFor("!!document.querySelector('#vno-help-panel') && !document.querySelector('#vno-help-panel').hidden");
    record.stages.push({stage:"F1 help", ...await cdp.evaluate(scanExpression)});
    await cdp.evaluate("document.querySelector('.vno-help-close').click()");
    for (const type of ["keyDown", "keyUp"]) await cdp.send("Input.dispatchKeyEvent", {type,key:"p",code:"KeyP",windowsVirtualKeyCode:80,modifiers:2});
    await cdp.waitFor("!!document.querySelector('.vno-print-dialog')");
    await cdp.waitFor("!!document.querySelector('.vno-print-preview-image, .vno-print-preview-error')", {timeoutMilliseconds:120000});
    record.stages.push({stage:"print", ...await cdp.evaluate(scanExpression)});
    record.printStatus = await cdp.evaluate("document.querySelector('.vno-print-dialog-status')?.textContent");
    record.printPreviewImages = await cdp.evaluate("document.querySelectorAll('.vno-print-preview-image').length");
    await cdp.evaluate("document.querySelector('.vno-print-close').click()");
    outputs.push(record);
    console.log(JSON.stringify(record));
  } finally {
    await session.close();
  }
}
await fs.writeFile("docs/user-facing-names-cdp.json", JSON.stringify(outputs, null, 2) + "\n");
if (outputs.some(record => record.stages.some(stage => stage.matchCount !== 0))) process.exitCode = 1;
