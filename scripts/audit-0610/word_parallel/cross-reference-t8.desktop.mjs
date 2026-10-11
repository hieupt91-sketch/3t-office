import { launchApp } from "../../../tests/live/cdp/session.mjs";
import { click, mouseDrag, press, typeText } from "../../../tests/live/cdp/actions.mjs";
import { mkdirSync, writeFileSync } from "node:fs";

const dir=process.env.VNO_CDP_LOCALAPPDATA;
if(!dir||!process.env.VNO_APP_ROOT)throw new Error("Set VNO_CDP_LOCALAPPDATA and VNO_APP_ROOT.");
mkdirSync(dir,{recursive:true});
const output=`${dir}\\app_crossref_t8_new.docx`;
const session=await launchApp("writer",{localAppData:dir,root:process.env.VNO_APP_ROOT,startTimeoutMilliseconds:180000,readyTimeoutMilliseconds:180000});
try{
 const cdp=session.cdp;
 await cdp.waitFor("!!document.querySelector('.vno-writer-body')",{timeoutMilliseconds:180000,intervalMilliseconds:500});
 await click(cdp,".vno-writer-body p",0);await typeText(cdp,"Target heading",20);
 const home=await cdp.evaluate("[...document.querySelectorAll('.vno-ribbon-tab')].findIndex(x=>/Trang đầu|Home/i.test(x.textContent))");
 await click(cdp,".vno-ribbon-tab",home);
 const r=await cdp.evaluate(`(()=>{const e=[...document.querySelectorAll('.vno-writer-body p')].find(x=>x.textContent.includes('Target heading'));const q=document.createRange();q.selectNodeContents(e);const a=[...q.getClientRects()].filter(x=>x.width&&x.height);return{x1:a[0].left+1,y1:a[0].top+a[0].height/2,x2:a.at(-1).right-1,y2:a.at(-1).top+a.at(-1).height/2}})()`);
 await mouseDrag(cdp,r.x1,r.y1,r.x2,r.y2,{steps:7});await click(cdp,'.vno-style-gallery-strip [data-style-id="h1"]');
 await press(cdp,"End",{},100);await press(cdp,"Enter",{},100);await typeText(cdp,"Reference goes here",20);
 await press(cdp,"End",{},100);
 const insert=await cdp.evaluate("[...document.querySelectorAll('.vno-ribbon-tab')].findIndex(x=>/Chèn|Insert/i.test(x.textContent))");await click(cdp,".vno-ribbon-tab",insert);
 await click(cdp,'button[data-command-id="writer.insert.crossReference"]');
 await click(cdp,"#vno-xref-select");await click(cdp,".vno-dialog-ok-btn");
 const html=await cdp.evaluate("document.querySelector('.vno-writer-body')?.innerHTML");
 const shot=await cdp.send("Page.captureScreenshot",{format:"png",captureBeyondViewport:false});writeFileSync(`${dir}\\crossref-t8-before.png`,Buffer.from(shot.result.data,"base64"));
 const saved=await cdp.evaluate(`(()=>{const a=window.__vnoAppInstance.adapter;return globalThis.globalUnoBridge.saveRealFileInPlace("writer",a._contentForExport(),${JSON.stringify(output)},${JSON.stringify(output)});})()`,{awaitPromise:true,timeoutMilliseconds:240000});
 console.log(JSON.stringify({html,saved,output,screenshot:`${dir}\\crossref-t8-before.png`}));
}finally{await session.close();}
