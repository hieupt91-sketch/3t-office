import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { launchApp } from "./session.mjs";
import { sleep } from "./actions.mjs";

const profileRoot = process.env.VNO_CDP_LOCALAPPDATA;
if (!profileRoot) throw new Error("Set VNO_CDP_LOCALAPPDATA to a unique profile path before running.");
const outputDir = path.resolve("docs/assets/q50-ui");
mkdirSync(outputDir, { recursive: true });
let checks = 0;
let failures = 0;

for (const app of ["writer", "sheet", "slides"]) {
  const session = await launchApp(app, { localAppData: path.join(profileRoot, app) });
  try {
    const win = await session.cdp.send("Browser.getWindowForTarget", {});
    await session.cdp.send("Browser.setWindowBounds", {
      windowId: (win.result || win).windowId,
      bounds: { windowState: "normal", width: 1366, height: 768 },
    });
    const tabs = await session.cdp.evaluate(`([...document.querySelectorAll('.vno-ribbon-tab')]).map(t=>({id:t.dataset.tabId,text:(t.innerText||'').trim()}))`);
    for (const tab of tabs) {
      await session.cdp.evaluate(`document.getElementById(${JSON.stringify(`vno-ribbon-tab-${tab.id}`)})?.click()`);
      await sleep(120);
      const buttons = await session.cdp.evaluate(`([...document.querySelectorAll('.vno-ribbon-content [data-command-id]')]).filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0}).slice(0,3).map(e=>{const r=e.getBoundingClientRect();const d=window.globalCommandBus?.getDefinition(e.dataset.commandId);return {id:e.dataset.commandId,title:e.title,ariaLabel:e.getAttribute('aria-label'),shortcut:d?.shortcut||'',rect:r.toJSON(),point:{x:r.x+r.width/2,y:r.y+r.height/2}}})`);
      if (!buttons.length) continue;
      for (let index=0;index<buttons.length;index++) {
        const button=buttons[index];
        const hover={x:Math.max(1,Math.min(1364,button.point.x)),y:Math.max(1,Math.min(766,button.point.y))};
        await session.cdp.send("Input.dispatchMouseEvent",{type:"mouseMoved",x:hover.x,y:hover.y});
        await sleep(850);
        const hasTooltip=typeof button.title==="string"&&button.title.trim().length>0;
        const shortcutOk=!button.shortcut||(button.title.includes(button.shortcut)&&button.ariaLabel?.includes(button.shortcut));
        const onScreen=button.rect.right>0&&button.rect.left<1366&&button.rect.bottom>0&&button.rect.top<768;
        const pass=hasTooltip&&shortcutOk&&onScreen;
        checks++;
        if(!pass) failures++;
        console.log(`${pass?"PASS":"FAIL"} | tooltip ${app}/${tab.text} #${index+1} | ${JSON.stringify({id:button.id,title:button.title,shortcut:button.shortcut,ariaLabel:button.ariaLabel,rect:button.rect,onScreen})}`);
        if(index===0){
          const shot=await session.cdp.send("Page.captureScreenshot",{format:"png",captureBeyondViewport:false});
          const safeTab=tab.id.replace(/[^a-z0-9_-]/gi,"-");
          writeFileSync(path.join(outputDir,`tooltip-${app}-${safeTab}-1366x768.png`),Buffer.from((shot.result||shot).data,"base64"));
        }
      }
    }
  } finally {
    await session.close();
  }
}
console.log(`SUMMARY ${checks-failures}/${checks} ribbon tooltip checks passed; failures=${failures}`);
if(failures) process.exitCode=1;
