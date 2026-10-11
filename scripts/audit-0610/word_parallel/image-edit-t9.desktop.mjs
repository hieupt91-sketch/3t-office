import { launchApp } from "../../../tests/live/cdp/session.mjs";
import { click, mouseClick, press, typeText } from "../../../tests/live/cdp/actions.mjs";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
const dir=process.env.VNO_CDP_LOCALAPPDATA,image=process.env.VNO_AUDIT_IMAGE;
if(!dir||!image||!process.env.VNO_APP_ROOT)throw new Error("Set VNO_CDP_LOCALAPPDATA, VNO_AUDIT_IMAGE and VNO_APP_ROOT.");
mkdirSync(dir,{recursive:true}); const output=`${dir}\\app_image_edit_t9.docx`; rmSync(output,{force:true});
const session=await launchApp("writer",{localAppData:dir,root:process.env.VNO_APP_ROOT,startTimeoutMilliseconds:180000,readyTimeoutMilliseconds:180000});
try {
 const cdp=session.cdp; await cdp.send("Emulation.setDeviceMetricsOverride",{width:1366,height:768,deviceScaleFactor:1,mobile:false}); await cdp.send("Page.enable");
 await cdp.waitFor("!!document.querySelector('.vno-writer-body')",{timeoutMilliseconds:180000,intervalMilliseconds:500});
 await click(cdp,".vno-writer-body p",0); await typeText(cdp,"Before image. After image.",15); const insertTab=await cdp.evaluate("[...document.querySelectorAll(\".vno-ribbon-tab\")].findIndex(x=>/Chèn|Insert/i.test(x.textContent))"); await click(cdp,".vno-ribbon-tab",insertTab); await cdp.send("Page.setInterceptFileChooserDialog",{enabled:true});
 const event=new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error("Timed out waiting for file chooser")),10000); cdp.socket.addEventListener("message",function listener(e){const m=JSON.parse(String(e.data)); if(m.method==="Page.fileChooserOpened"){clearTimeout(timer);cdp.socket.removeEventListener("message",listener);resolve(m.params);}})});
 await click(cdp,'button[data-command-id="writer.image.insert"]'); const opened=await event; await cdp.send("DOM.setFileInputFiles",{files:[image],backendNodeId:opened.backendNodeId}); await new Promise(r=>setTimeout(r,500));
 let rect=await cdp.evaluate("(()=>{const i=document.querySelector('.vno-writer-body img');const r=i.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2}})()"); await mouseClick(cdp,rect.x,rect.y);
 const tab=await cdp.evaluate("[...document.querySelectorAll('.vno-ribbon-tab')].findIndex(x=>/Picture Format|Định dạng ảnh|Định dạng/i.test(x.textContent))"); if(tab<0)throw new Error("Picture Format tab not found"); await click(cdp,".vno-ribbon-tab",tab);
 await cdp.waitFor("!!document.querySelector('#vno-ribbon-tabpanel-pictureFormat .vno-writer-arrange-group')",{timeoutMilliseconds:5000,intervalMilliseconds:100});
 const beforeWrap=await cdp.evaluate("document.querySelector('[data-arrange=wrap]')?.value");
 await click(cdp,"[data-arrange=wrap]"); await press(cdp,"Home"); await press(cdp,"ArrowDown"); await press(cdp,"Enter");
 const posValue=await cdp.evaluate("[...document.querySelector('[data-arrange=position]').options].map(o=>o.value)");
 const target=posValue.find(x=>/right/i.test(x))||posValue.at(-1); const posIndex=posValue.indexOf(target);
 await click(cdp,"[data-arrange=position]"); await press(cdp,"Home"); for(let i=0;i<posIndex;i++)await press(cdp,"ArrowDown"); await press(cdp,"Enter");
 const wInput=await cdp.evaluate("document.querySelector('[data-arrange=width]').value"); await click(cdp,"[data-arrange=width]"); await press(cdp,"Home"); await press(cdp,"End",{shift:true}); await typeText(cdp,String(Number(wInput)+24),10); await press(cdp,"Enter");
 const state=await cdp.evaluate("(()=>{const i=document.querySelector('.vno-writer-body img');return{width:i.style.width,height:i.style.height,wrap:i.dataset.vnoWrap,position:i.dataset.vnoPosition,left:i.style.left,top:i.style.top,transform:i.style.transform,rect:(()=>{const r=i.getBoundingClientRect();return{width:r.width,height:r.height,left:r.left,top:r.top}})()}})()");
 const shot=await cdp.send("Page.captureScreenshot",{format:"png",captureBeyondViewport:false}); writeFileSync(`${dir}\\image-edit-t9.png`,Buffer.from(shot.result.data,"base64"));
 const exportHtml=await cdp.evaluate("window.__vnoAppInstance.adapter._contentForExport()"); writeFileSync(`${dir}\\image-edit-t9.html`,exportHtml,"utf8"); const saved=await cdp.evaluate(`(()=>{const a=window.__vnoAppInstance.adapter;return globalThis.globalUnoBridge.saveRealFileInPlace("writer",a._contentForExport(),${JSON.stringify(output)},${JSON.stringify(output)});})()`,{awaitPromise:true,timeoutMilliseconds:240000});
 console.log(JSON.stringify({beforeWrap,values:posValue,target,state,saved,output,screenshot:`${dir}\\image-edit-t9.png`}));
} finally {await session.close();}