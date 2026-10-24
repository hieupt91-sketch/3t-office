import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { launchApp } from "./session.mjs";
import { press, sleep } from "./actions.mjs";

const profileRoot=process.env.VNO_CDP_LOCALAPPDATA;
if(!profileRoot) throw new Error("Set VNO_CDP_LOCALAPPDATA to a unique profile path before running.");
const outputDir=path.resolve("docs/assets/q50-ui");
mkdirSync(outputDir,{recursive:true});
const targets=[
  {app:"writer",command:"writer.reference.captionInsert"},
  {app:"sheet",command:"sheet.data.validation"},
  {app:"slides",command:"slides.insert.dateTime"},
];
let failures=0;
for(const target of targets){
  const session=await launchApp(target.app,{localAppData:path.join(profileRoot,target.app)});
  try{
    const win=await session.cdp.send("Browser.getWindowForTarget",{});
    await session.cdp.send("Browser.setWindowBounds",{windowId:(win.result||win).windowId,bounds:{windowState:"normal",width:1366,height:768}});
    const button=await session.cdp.evaluate(`(async()=>{for(const tab of document.querySelectorAll('.vno-ribbon-tab')){tab.click();await new Promise(r=>setTimeout(r,160));const b=[...document.querySelectorAll('.vno-ribbon-content [data-command-id]')].find(e=>e.dataset.commandId===${JSON.stringify(target.command)});if(b)return {id:b.dataset.commandId,tabId:tab.dataset.tabId,rect:b.getBoundingClientRect().toJSON()}}return null})()`);
    if(!button) throw new Error("Command button not found in ribbon tabs: "+target.command);
    await sleep(250);
    let focused=null;
    for(let attempt=0;attempt<80&&focused!==target.command;attempt++){
      await press(session.cdp,"Tab",{},20);
      focused=await session.cdp.evaluate("document.activeElement?.dataset?.commandId||null");
    }
    const preActivation=await session.cdp.evaluate("({id:document.activeElement?.dataset?.commandId||null,tag:document.activeElement?.tagName||null})");
    await press(session.cdp,"Enter",{},350);
    const probe=await session.cdp.evaluate("({active:document.activeElement?.dataset?.commandId||document.activeElement?.tagName||null})");
    const dialog=await session.cdp.evaluate(`(()=>{const e=[...document.querySelectorAll('[role="dialog"],[role="alertdialog"],.vno-dialog-box,.vno-dialog-overlay')].find(n=>n.getClientRects().length&&getComputedStyle(n).display!=='none');return {open:!!e,focusInside:!!e&&e.contains(document.activeElement),rect:e?.getBoundingClientRect().toJSON()}})()`);
    const before=await session.cdp.send("Page.captureScreenshot",{format:"png",captureBeyondViewport:false});
    writeFileSync(path.join(outputDir,`focus-${target.app}-dialog-1366x768.png`),Buffer.from((before.result||before).data,"base64"));
    await press(session.cdp,"Escape",{},0);
    const immediate=await session.cdp.evaluate("({command:document.activeElement?.dataset?.commandId||null,tag:document.activeElement?.tagName||null})");
    await sleep(250);
    const restored=await session.cdp.evaluate(`({command:document.activeElement?.dataset?.commandId||null,tag:document.activeElement?.tagName||null})`);
    const after=await session.cdp.send("Page.captureScreenshot",{format:"png",captureBeyondViewport:false});
    writeFileSync(path.join(outputDir,`focus-${target.app}-return-1366x768.png`),Buffer.from((after.result||after).data,"base64"));
    const pass=focused===target.command&&dialog.open&&dialog.focusInside&&restored.command===target.command;
    if(!pass) failures++;
    console.log(`${pass?"PASS":"FAIL"} | tab-focused ribbon activation / Escape focus ${target.app} | ${JSON.stringify({target,focused,preActivation,probe,dialog,immediate,restored})}`);
  }finally{await session.close()}
}
console.log(`SUMMARY ${targets.length-failures}/${targets.length} ribbon focus returns passed; failures=${failures}`);
if(failures) process.exitCode=1;
