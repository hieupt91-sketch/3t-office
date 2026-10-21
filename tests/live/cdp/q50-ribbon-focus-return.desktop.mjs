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
    let focused=null;
    for(let attempt=0;attempt<80&&focused!==target.command;attempt++){
      await press(session.cdp,"Tab",{},20);
      focused=await session.cdp.evaluate("document.activeElement?.dataset?.commandId||null");
    }
    await session.cdp.evaluate(`(()=>{window.__q50FocusProbe={keys:[],clicks:0};const b=document.activeElement;b?.addEventListener('keydown',e=>window.__q50FocusProbe.keys.push({key:e.key,target:e.target.dataset?.commandId}),true);b?.addEventListener('click',()=>window.__q50FocusProbe.clicks++,true)})()`);
    await press(session.cdp,"Enter",{},1200);
    const probe=await session.cdp.evaluate("({probe:window.__q50FocusProbe,active:document.activeElement?.dataset?.commandId||document.activeElement?.tagName||null})");
    const dialog=await session.cdp.evaluate(`(()=>{const e=[...document.querySelectorAll('[role="dialog"],[role="alertdialog"],.vno-dialog-box,.vno-dialog-overlay')].find(n=>n.getClientRects().length&&getComputedStyle(n).display!=='none');return {open:!!e,focusInside:!!e&&e.contains(document.activeElement),rect:e?.getBoundingClientRect().toJSON()}})()`);
    const before=await session.cdp.send("Page.captureScreenshot",{format:"png",captureBeyondViewport:false});
    writeFileSync(path.join(outputDir,`focus-${target.app}-dialog-1366x768.png`),Buffer.from((before.result||before).data,"base64"));
    await press(session.cdp,"Escape",{},250);
    const restored=await session.cdp.evaluate(`({command:document.activeElement?.dataset?.commandId||null,tag:document.activeElement?.tagName||null})`);
    const after=await session.cdp.send("Page.captureScreenshot",{format:"png",captureBeyondViewport:false});
    writeFileSync(path.join(outputDir,`focus-${target.app}-return-1366x768.png`),Buffer.from((after.result||after).data,"base64"));
    const pass=focused===target.command&&dialog.open&&dialog.focusInside&&restored.command===target.command;
    if(!pass) failures++;
    console.log(`${pass?"PASS":"FAIL"} | keyboard open / Escape focus ${target.app} | ${JSON.stringify({target,focused,probe,dialog,restored})}`);
  }finally{await session.close()}
}
console.log(`SUMMARY ${targets.length-failures}/${targets.length} ribbon focus returns passed; failures=${failures}`);
if(failures) process.exitCode=1;
