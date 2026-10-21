import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { launchApp } from "./session.mjs";
import { sleep } from "./actions.mjs";

const profileRoot=process.env.VNO_CDP_LOCALAPPDATA;
if(!profileRoot) throw new Error("Set VNO_CDP_LOCALAPPDATA to a unique profile path before running.");
const outputDir=path.resolve("docs/assets/q50-ui");
mkdirSync(outputDir,{recursive:true});
const session=await launchApp("writer",{localAppData:path.join(profileRoot,"writer")});
let failures=0;
try{
  const win=await session.cdp.send("Browser.getWindowForTarget",{});
  await session.cdp.send("Browser.setWindowBounds",{windowId:(win.result||win).windowId,bounds:{windowState:"normal",width:1366,height:768}});
  for(const theme of ["light","dark"]){
    await session.cdp.evaluate(`document.documentElement.setAttribute('data-theme',${JSON.stringify(theme)})`);
    for(const [type,message] of [["success","Đã lưu thành công"],["error","Không thể lưu thay đổi"],["info","Đã sao chép nội dung"]]){
      await session.cdp.evaluate(`window.__vnoAppInstance?.shell?.showNotification({type:${JSON.stringify(type)},message:${JSON.stringify(message)}})`);
      await sleep(100);
      const initial=await session.cdp.evaluate(`(()=>{const e=document.querySelector('.vno-notification-bar');const r=e?.getBoundingClientRect();return {visible:!!e,role:e?.getAttribute('role'),live:e?.getAttribute('aria-live'),message:e?.innerText,rect:r?.toJSON(),viewport:{w:innerWidth,h:innerHeight},controls:[...document.querySelectorAll('.vno-ribbon-tab,.vno-theme-toggle-btn')].map(n=>({text:n.innerText,rect:n.getBoundingClientRect().toJSON()}))}})()`);
      const shot=await session.cdp.send("Page.captureScreenshot",{format:"png",captureBeyondViewport:false});
      writeFileSync(path.join(outputDir,`toast-${theme}-${type}-1366x768.png`),Buffer.from((shot.result||shot).data,"base64"));
      await sleep(2200);
      const persistent=await session.cdp.evaluate("!!document.querySelector('.vno-notification-bar')");
      const inside=initial.rect&&initial.rect.top>=0&&initial.rect.bottom<=initial.viewport.h&&initial.rect.left>=0&&initial.rect.right<=initial.viewport.w;
      const pass=initial.visible&&initial.role==="status"&&initial.live==="polite"&&inside&&persistent;
      if(!pass) failures++;
      console.log(`${pass?"PASS":"FAIL"} | notification ${theme}/${type} | ${JSON.stringify({initial,persistent})}`);
      await session.cdp.evaluate("window.__vnoAppInstance?.shell?.clearNotification()");
    }
  }
}finally{await session.close()}
console.log(`SUMMARY ${6-failures}/6 notification states measured; failures=${failures}; notification remains after 2.2s in current UI`);
if(failures)process.exitCode=1;
