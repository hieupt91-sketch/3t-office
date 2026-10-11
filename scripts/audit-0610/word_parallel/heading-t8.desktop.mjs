import { launchApp } from "../../../tests/live/cdp/session.mjs";
import { click, mouseDrag, press, typeText } from "../../../tests/live/cdp/actions.mjs";
import { mkdirSync, writeFileSync } from "node:fs";
const dir=process.env.VNO_CDP_LOCALAPPDATA;
if(!dir||!process.env.VNO_APP_ROOT)throw new Error("Set VNO_CDP_LOCALAPPDATA and VNO_APP_ROOT.");
mkdirSync(dir,{recursive:true});
const output=`${dir}\\app_heading_t8_new.docx`;
const session=await launchApp("writer",{localAppData:dir,root:process.env.VNO_APP_ROOT,startTimeoutMilliseconds:180000,readyTimeoutMilliseconds:180000});
try{
 const cdp=session.cdp;
 await cdp.waitFor("!!document.querySelector('.vno-writer-body')",{timeoutMilliseconds:180000,intervalMilliseconds:500});
 await click(cdp,".vno-writer-body p",0);
 const tab=await cdp.evaluate("[...document.querySelectorAll('.vno-ribbon-tab')].findIndex(x=>/Trang đầu|Home/i.test(x.textContent))");
 await click(cdp,".vno-ribbon-tab",tab);
 await click(cdp,".vno-writer-body p",0);
 const styleButtons=await cdp.evaluate("[...document.querySelectorAll('.vno-style-gallery-strip [data-style-id],.vno-style-gallery-dropdown [data-style-id]')].map(x=>({style:x.dataset.styleId,text:x.textContent.trim(),visible:!!x.getBoundingClientRect().width}))");
 for(const [index,label] of ["Heading one","Heading two","Heading three"].entries()){
   if(index) await press(cdp,"Enter",{},250);
   await typeText(cdp,label,25);
 }
 console.log("typed",await cdp.evaluate("({html:document.querySelector('.vno-writer-body')?.innerHTML,text:document.querySelector('.vno-writer-body')?.textContent})"));
 const selectParagraph = async label => {
   const rects=await cdp.evaluate(`(() => {const p=[...document.querySelectorAll('.vno-writer-body p')].find(x=>x.textContent.includes(${JSON.stringify(label)}));if(!p)return null;const range=document.createRange();range.selectNodeContents(p);const rs=[...range.getClientRects()].filter(r=>r.width&&r.height);if(!rs.length)return null;return{start:{x:rs[0].left+1,y:rs[0].top+rs[0].height/2},end:{x:rs.at(-1).right-1,y:rs.at(-1).top+rs.at(-1).height/2}}})()`);
   if(!rects)throw new Error(`Text paragraph missing before styling: ${label}`);
   await mouseDrag(cdp,rects.start.x,rects.start.y,rects.end.x,rects.end.y,{steps:8});
   const selected=await cdp.evaluate("String(getSelection())");
   if(!selected.includes(label))throw new Error(`CDP drag did not select ${label}: ${selected}`);
 };
 for(const [label,n] of [["Heading one",1],["Heading two",2],["Heading three",3]]){
   await selectParagraph(label);
   if(n===1) await click(cdp,'.vno-style-gallery-strip [data-style-id="h1"]');
   else {
     await click(cdp,'button[data-command-id="writer.style.gallery"]');
     await click(cdp,`.vno-style-gallery-dropdown .vno-style-card[data-style-id="h${n}"]`);
   }
 }
 const headingHtml=await cdp.evaluate("[...document.querySelectorAll('.vno-writer-body h1,.vno-writer-body h2,.vno-writer-body h3')].map(x=>({tag:x.tagName,text:x.textContent,html:x.outerHTML,style:getComputedStyle(x).cssText,color:getComputedStyle(x).color,font:getComputedStyle(x).fontFamily,size:getComputedStyle(x).fontSize,weight:getComputedStyle(x).fontWeight,marginTop:getComputedStyle(x).marginTop,marginBottom:getComputedStyle(x).marginBottom}))");
 const exportHtml=await cdp.evaluate("window.__vnoAppInstance.adapter._contentForExport()");
 writeFileSync(`${dir}\\app_heading_t8_export.html`,exportHtml);
 const shot=await cdp.send("Page.captureScreenshot",{format:"png",captureBeyondViewport:false});
 writeFileSync(`${dir}\\heading-t8-before.png`,Buffer.from(shot.result.data,"base64"));
 const saved=await cdp.evaluate(`(() => {const a=window.__vnoAppInstance.adapter;return globalThis.globalUnoBridge.saveRealFileInPlace("writer",a._contentForExport(),${JSON.stringify(output)},${JSON.stringify(output)});})()`,{awaitPromise:true,timeoutMilliseconds:240000});
 console.log(JSON.stringify({styleButtons,headingHtml,save:saved,output,screenshot:`${dir}\\heading-t8-before.png`}));
}finally{await session.close();}
