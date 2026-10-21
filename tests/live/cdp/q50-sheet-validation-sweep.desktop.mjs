import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { launchApp } from "./session.mjs";
import { sleep } from "./actions.mjs";
const profileRoot=process.env.VNO_CDP_LOCALAPPDATA;
if(!profileRoot) throw new Error("Set VNO_CDP_LOCALAPPDATA to a unique profile path before running.");
const out=path.resolve("docs/assets/q50-ui");mkdirSync(out,{recursive:true});
const commands=["sheet.data.validation","sheet.data.goalSeek","sheet.data.dataTable","sheet.data.scenarioManager","sheet.format.conditional","sheet.data.customSort","sheet.data.advancedFilter","sheet.data.removeDuplicates"];
const session=await launchApp("sheet",{localAppData:path.join(profileRoot,"sheet")});let failures=0;
try{
 const w=await session.cdp.send("Browser.getWindowForTarget",{});await session.cdp.send("Browser.setWindowBounds",{windowId:(w.result||w).windowId,bounds:{windowState:"normal",width:1366,height:768}});
 for(const command of commands){
  await session.cdp.evaluate(`void window.globalCommandBus.execute(${JSON.stringify(command)})`);await sleep(350);
  const opened=await session.cdp.evaluate(`(()=>{const v=e=>e&&e.getClientRects().length&&getComputedStyle(e).display!=="none";const e=[...document.querySelectorAll('[role="dialog"],.vno-dialog-box')].filter(v).at(-1);if(!e)return null;return {title:e.querySelector('.vno-dialog-title,h1,h2,h3')?.innerText||"",text:e.innerText,fields:[...e.querySelectorAll('input,textarea,select')].map(x=>({id:x.id,type:x.type||x.tagName,value:x.value,required:x.required,disabled:x.disabled,ariaInvalid:x.getAttribute('aria-invalid')})),alerts:[...e.querySelectorAll('[role="alert"]')].map(x=>x.innerText),apply:e.querySelector('.vno-rule-apply,.vno-btn-primary')?.innerText,disabled:e.querySelector('.vno-rule-apply,.vno-btn-primary')?.disabled||false}})()`);
  if(!opened){console.log(`FAIL | ${command} | no dialog opened`);failures++;continue;}
  const stem=command.split('.').at(-1);let shot=await session.cdp.send("Page.captureScreenshot",{format:"png",captureBeyondViewport:false});writeFileSync(path.join(out,`sheet-sweep-${stem}-before-1366x768.png`),Buffer.from((shot.result||shot).data,"base64"));
  // A blank-submit probe exercises the dialog's own validation without inserting data into the empty temporary workbook.
  await session.cdp.evaluate(`(()=>{const d=[...document.querySelectorAll('[role="dialog"],.vno-dialog-box')].filter(e=>e.getClientRects().length).at(-1);const b=d?.querySelector('.vno-rule-apply,.vno-btn-primary');if(b&&!b.disabled)b.click()})()`);await sleep(350);
  const after=await session.cdp.evaluate(`(()=>{const v=e=>e&&e.getClientRects().length&&getComputedStyle(e).display!=="none";const e=[...document.querySelectorAll('[role="dialog"],.vno-dialog-box')].filter(v).at(-1);if(!e)return {open:false};const b=e.querySelector('.vno-rule-apply,.vno-btn-primary');return {open:true,title:e.querySelector('.vno-dialog-title,h1,h2,h3')?.innerText||"",alerts:[...e.querySelectorAll('[role="alert"]')].map(x=>x.innerText.trim()).filter(Boolean),disabled:!!b&&(b.disabled||b.getAttribute('aria-disabled')==='true'),fields:[...e.querySelectorAll('input,textarea,select')].map(x=>({id:x.id,type:x.type||x.tagName,value:x.value,ariaInvalid:x.getAttribute('aria-invalid')}))}})()`);
  shot=await session.cdp.send("Page.captureScreenshot",{format:"png",captureBeyondViewport:false});writeFileSync(path.join(out,`sheet-sweep-${stem}-after-1366x768.png`),Buffer.from((shot.result||shot).data,"base64"));
  const pass=!after.open||(!after.alerts.length||after.disabled);if(!pass)failures++;
  console.log(`${pass?"PASS":"FAIL"} | ${command} | blank Apply | ${JSON.stringify({opened,after})}`);
  if(after.open)await session.cdp.evaluate(`document.querySelectorAll('.vno-dialog-overlay').forEach(e=>e.closeDialog?.());document.querySelector('.vno-rule-cancel')?.click();document.querySelector('.vno-dialog-close-btn')?.click()`);
 }
}finally{await session.close()}
console.log(`SUMMARY ${commands.length-failures}/${commands.length} Sheet blank-Apply probes behaved as expected; failures=${failures}`);if(failures)process.exitCode=1;
