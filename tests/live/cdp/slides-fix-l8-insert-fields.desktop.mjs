import fs from "node:fs/promises";
import path from "node:path";
import { launchApp } from "./session.mjs";
import { click, typeText } from "./actions.mjs";

const root=process.env.VNO_APP_ROOT, localAppData=process.env.VNO_CDP_LOCALAPPDATA;
const source=process.env.VNO_FIX_L8_SOURCE||"E:\\VN OFice\\file test\\sample-3.pptx";
if(!root||!localAppData)throw new Error("Set VNO_APP_ROOT and VNO_CDP_LOCALAPPDATA.");
const file=path.join(localAppData,"fix-l8-insert-fields.pptx"), evidence=path.resolve("docs/tickets-0710/evidence/fix-l8/insert");
await fs.mkdir(localAppData,{recursive:true}); await fs.mkdir(evidence,{recursive:true}); await fs.copyFile(source,file);
const session=await launchApp("slides",{root,filePath:file,localAppData,startTimeoutMilliseconds:180000,readyTimeoutMilliseconds:180000});
const state=()=>session.cdp.evaluate(`JSON.stringify((()=>{const c=window.__vnoAppInstance.adapter.canvas,s=c.slides[c.currentSlideIndex];return{slides:c.slides.length,shapes:s.shapes.length,headerFooter:s.headerFooter||c.headerFooter,slideNumbers:c.slides.map(x=>x.headerFooter?.showSlideNumber),dates:c.slides.map(x=>x.headerFooter?.showDate),footers:c.slides.map(x=>x.headerFooter?.footerText)}})())`);
const shot=async name=>{const r=await session.cdp.send("Page.captureScreenshot",{format:"png",captureBeyondViewport:false});await fs.writeFile(path.join(evidence,`${name}.png`),Buffer.from(r.result.data,"base64"));};
try{
 const normalized=file.replace(/\\/g,"/").toLowerCase();
 await session.cdp.waitFor(`(()=>{const a=window.__vnoAppInstance?.adapter,p=String(a?._sourcePath||a?.sourceFilePath||"").replace(/\\\\/g,"/").toLowerCase();return p===${JSON.stringify(normalized)}&&a?.canvas?.slides?.length>0})()`,{timeoutMilliseconds:300000,intervalMilliseconds:500});
 await click(session.cdp,"#vno-ribbon-tab-insert");
 await click(session.cdp,'[data-command-id="slides.insert.headerFooter"]');
 await session.cdp.waitFor('!!document.querySelector("[data-vno-dialog=header-footer]")',{timeoutMilliseconds:30000});
 await click(session.cdp,"#vno-hf-date"); await click(session.cdp,"#vno-hf-number"); await click(session.cdp,"#vno-hf-footer");
 await click(session.cdp,"#vno-hf-text"); await typeText(session.cdp,"VN Office audit footer",20); await shot("header-footer-dialog");
 await click(session.cdp,'[data-vno-dialog="header-footer"] .vno-dialog-ok-btn');
 const headerFooter=JSON.parse(await state());
 await click(session.cdp,'[data-command-id="slides.insert.dateTime"]');
 await session.cdp.waitFor('!!document.querySelector("[data-vno-dialog=datetime-picker]")',{timeoutMilliseconds:30000});
 await shot("date-time-dialog"); await click(session.cdp,'[data-vno-dialog="datetime-picker"] .vno-dialog-ok-btn');
 const dateTime=JSON.parse(await state());
 await click(session.cdp,'[data-command-id="slides.insert.slideNumber"]');
 const slideNumber=JSON.parse(await state()); await shot("slide-number");
 const saved=await session.cdp.evaluate("window.__vnoAppInstance.adapter.save()",{awaitPromise:true,timeoutMilliseconds:600000});
 if(!saved)throw new Error("Save returned false.");
 const result={headerFooter,dateTime,slideNumber,file,saved};
 await fs.writeFile(path.join(evidence,"insert-fields-cdp-readback.json"),JSON.stringify(result,null,2)+"\n","utf8"); console.log(JSON.stringify(result));
}finally{await session.close();}
