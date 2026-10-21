import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { launchApp } from "./session.mjs";
import { sleep } from "./actions.mjs";

const profileRoot=process.env.VNO_CDP_LOCALAPPDATA;
if(!profileRoot) throw new Error("Set VNO_CDP_LOCALAPPDATA to a unique profile path before running.");
const outputDir=path.resolve("docs/assets/q50-ui");mkdirSync(outputDir,{recursive:true});
let checks=0,failures=0;
for(const app of ["writer","sheet","slides"]){
 const session=await launchApp(app,{localAppData:path.join(profileRoot,app)});
 try{
  const win=await session.cdp.send("Browser.getWindowForTarget",{});
  await session.cdp.send("Browser.setWindowBounds",{windowId:(win.result||win).windowId,bounds:{windowState:"normal",width:1366,height:768}});
  for(const theme of ["light","dark"]){
   await session.cdp.evaluate(`document.documentElement.setAttribute('data-theme',${JSON.stringify(theme)})`);
   for(const [type,message] of [["success","\u0110\u00e3 l\u01b0u th\u00e0nh c\u00f4ng"],["error","Kh\u00f4ng th\u1ec3 l\u01b0u thay \u0111\u1ed5i"],["info","\u0110\u00e3 sao ch\u00e9p n\u1ed9i dung"]]){
    await session.cdp.evaluate(`window.__vnoAppInstance?.shell?.showNotification({type:${JSON.stringify(type)},message:${JSON.stringify(message)}})`);
    await sleep(100);
    const state=await session.cdp.evaluate(`(()=>{const e=document.querySelector('.vno-notification-bar'),r=e?.getBoundingClientRect();const ribbon=[...document.querySelectorAll('.vno-ribbon-content [data-command-id]')].filter(n=>n.getClientRects().length).map(n=>n.getBoundingClientRect());const overlaps=ribbon.some(x=>r&&r.top<x.bottom&&r.bottom>x.top&&r.left<x.right&&r.right>x.left);return {visible:!!e,role:e?.getAttribute('role'),live:e?.getAttribute('aria-live'),message:e?.querySelector('.vno-notification-bar-message')?.innerText,rect:r?.toJSON(),overlapsRibbon:overlaps,viewport:{w:innerWidth,h:innerHeight}}})()`);
    const shot=await session.cdp.send("Page.captureScreenshot",{format:"png",captureBeyondViewport:false});
    const prefix=app==="writer"?"toast":"toast-"+app;
    writeFileSync(path.join(outputDir,`${prefix}-${theme}-${type}-1366x768.png`),Buffer.from((shot.result||shot).data,"base64"));
    await sleep(2200);
    const persistent=await session.cdp.evaluate("!!document.querySelector('.vno-notification-bar')");
    const r=state.rect,v=state.viewport;const inside=r&&r.top>=0&&r.bottom<=v.h&&r.left>=0&&r.right<=v.w;
    const pass=state.visible&&state.role==="status"&&state.live==="polite"&&inside&&!state.overlapsRibbon&&persistent;
    checks++;if(!pass)failures++;
    console.log(`${pass?"PASS":"FAIL"} | ${app} notification ${theme}/${type} | ${JSON.stringify({message:state.message,rect:state.rect,overlapsRibbon:state.overlapsRibbon,persistentAfter2_2s:persistent})}`);
    await session.cdp.evaluate("window.__vnoAppInstance?.shell?.clearNotification()");
   }
  }
 }finally{await session.close()}
}
console.log(`SUMMARY ${checks-failures}/${checks} notification states; failures=${failures}; notification remains after 2.2s`);if(failures)process.exitCode=1;
