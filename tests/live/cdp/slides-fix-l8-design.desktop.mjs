import fs from "node:fs/promises"; import path from "node:path";
import {launchApp} from "./session.mjs"; import {click} from "./actions.mjs";
const root=process.env.VNO_APP_ROOT,localAppData=process.env.VNO_CDP_LOCALAPPDATA,source=process.env.VNO_FIX_L8_SOURCE||"E:\\VN OFice\\file test\\sample-3.pptx";
if(!root||!localAppData)throw new Error("Set VNO_APP_ROOT and VNO_CDP_LOCALAPPDATA.");
const file=path.join(localAppData,"fix-l8-design.pptx"),evidence=path.resolve("docs/tickets-0710/evidence/fix-l8/design");
await fs.mkdir(localAppData,{recursive:true});await fs.mkdir(evidence,{recursive:true});await fs.copyFile(source,file);
const session=await launchApp("slides",{root,filePath:file,localAppData,startTimeoutMilliseconds:180000,readyTimeoutMilliseconds:180000});
const read=()=>session.cdp.evaluate(`JSON.stringify((()=>{const c=window.__vnoAppInstance.adapter.canvas,s=c.slides[c.currentSlideIndex];return{slides:c.slides.length,size:c.slideSize,background:s.background,theme:c.masterTheme?.id}})())`);
const shot=async n=>{const r=await session.cdp.send("Page.captureScreenshot",{format:"png",captureBeyondViewport:false});await fs.writeFile(path.join(evidence,n+".png"),Buffer.from(r.result.data,"base64"));};
try{
 const normalized=file.replace(/\\/g,"/").toLowerCase();await session.cdp.waitFor(`(()=>{const a=window.__vnoAppInstance?.adapter,p=String(a?._sourcePath||a?.sourceFilePath||"").replace(/\\\\/g,"/").toLowerCase();return p===${JSON.stringify(normalized)}&&a?.canvas?.slides?.length>0})()`,{timeoutMilliseconds:300000,intervalMilliseconds:500});
 await click(session.cdp,"#vno-ribbon-tab-design");const before=JSON.parse(await read());
 await click(session.cdp,'[data-command-id="slides.design.slideSize"]');await session.cdp.waitFor('!!document.querySelector(".vno-slide-size-dialog")',{timeoutMilliseconds:30000});
 await click(session.cdp,'.vno-slide-size-dialog [data-slide-size="standard"]');const slideSize=JSON.parse(await read());await shot("slide-size");
 await click(session.cdp,'[data-command-id="slides.design.formatBackground"]');await session.cdp.waitFor('!!document.querySelector(".vno-format-background-dialog")',{timeoutMilliseconds:30000});
 await click(session.cdp,'input[name="vno-bg-type"][value="gradient"]');await shot("format-background-dialog");await click(session.cdp,"#vno-bg-apply");const background=JSON.parse(await read());
 const saved=await session.cdp.evaluate("window.__vnoAppInstance.adapter.save()",{awaitPromise:true,timeoutMilliseconds:600000});if(!saved)throw new Error("Save returned false.");
 const out={before,slideSize,background,file,saved};await fs.writeFile(path.join(evidence,"design-cdp-readback.json"),JSON.stringify(out,null,2)+"\n","utf8");console.log(JSON.stringify(out));
}finally{await session.close();}
