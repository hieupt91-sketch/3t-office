import { launchApp } from "../../../tests/live/cdp/session.mjs";
import { click, typeText } from "../../../tests/live/cdp/actions.mjs";
import { mkdirSync, writeFileSync } from "node:fs";
const dir=process.env.VNO_CDP_LOCALAPPDATA;
if(!dir||!process.env.VNO_APP_ROOT)throw new Error("Set VNO_CDP_LOCALAPPDATA and VNO_APP_ROOT.");
mkdirSync(dir,{recursive:true});const output=`${dir}\\app_captions_t8_new.docx`;
const session=await launchApp("writer",{localAppData:dir,root:process.env.VNO_APP_ROOT,startTimeoutMilliseconds:180000,readyTimeoutMilliseconds:180000});
try{
 const cdp=session.cdp;await cdp.waitFor("!!document.querySelector('.vno-writer-body')",{timeoutMilliseconds:180000,intervalMilliseconds:500});
 await click(cdp,".vno-writer-body p",0);await typeText(cdp,"Caption audit",20);
 const refs=await cdp.evaluate("[...document.querySelectorAll('.vno-ribbon-tab')].findIndex(x=>/Tham chiếu|References/i.test(x.textContent))");await click(cdp,".vno-ribbon-tab",refs);
 const addCaption=async text=>{await click(cdp,'button[data-command-id="writer.reference.captionInsert"]');await click(cdp,".vno-caption-text-input");await typeText(cdp,text,20);await click(cdp,".vno-insert-caption");};
 await addCaption("Revenue chart");await addCaption("Expense chart");
 await click(cdp,'button[data-command-id="writer.reference.tofInsert"]');await click(cdp,".vno-insert-tof");
 const state=await cdp.evaluate(`(()=>{const b=document.querySelector('.vno-writer-body');return {captions:[...b.querySelectorAll('[data-vno-caption="true"]')].map(x=>x.textContent.replace(/\\s+/g,' ').trim()),tof:b.querySelector('[data-vno-tof="true"]')?.innerText}})()`);
 const shot=await cdp.send("Page.captureScreenshot",{format:"png",captureBeyondViewport:false});writeFileSync(`${dir}\\captions-t8-before.png`,Buffer.from(shot.result.data,"base64"));
 const saved=await cdp.evaluate(`(()=>{const a=window.__vnoAppInstance.adapter;return globalThis.globalUnoBridge.saveRealFileInPlace("writer",a._contentForExport(),${JSON.stringify(output)},${JSON.stringify(output)});})()`,{awaitPromise:true,timeoutMilliseconds:240000});
 console.log(JSON.stringify({state,saved,output,screenshot:`${dir}\\captions-t8-before.png`}));
}finally{await session.close();}
