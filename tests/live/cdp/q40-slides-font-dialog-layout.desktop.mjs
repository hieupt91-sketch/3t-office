import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { launchApp } from "./session.mjs";
import { click, press, sleep } from "./actions.mjs";

const evidence = path.resolve("docs/assets/q40-ui");
mkdirSync(evidence,{recursive:true});
const phase = process.env.VNO_Q40_PHASE || "after";
const session = await launchApp("slides",{localAppData:process.env.VNO_CDP_LOCALAPPDATA});
const {cdp}=session;
const ev=(expr)=>cdp.evaluate(expr,{awaitPromise:true});
const results=[];
const check=(name,pass,detail)=>{results.push(Boolean(pass));console.log(`${pass?"PASS":"FAIL"} | ${name} | ${JSON.stringify(detail)}`)};
const resize=async(width,height)=>{const w=await cdp.send("Browser.getWindowForTarget",{});await cdp.send("Browser.setWindowBounds",{windowId:(w.result||w).windowId,bounds:{windowState:"normal",width,height}});await sleep(250)};
const shot=async(name)=>{const r=await cdp.send("Page.captureScreenshot",{format:"png",captureBeyondViewport:false});writeFileSync(path.join(evidence,`${name}-${phase}.png`),Buffer.from((r.result||r).data,"base64"))};
try{
  await sleep(800);
  for(const [width,height] of [[1366,768],[1280,720]])for(const theme of ["light","dark"]){
    await resize(width,height);
    await ev(`document.documentElement.setAttribute('data-theme',${JSON.stringify(theme)})`);
    await click(cdp,"#vno-ribbon-tab-home");
    await press(cdp,"t",{ctrl:true});
    await sleep(200);
    const metrics=await ev(`(()=>{const o=document.querySelector('#vno-font-dialog-overlay'),d=o?.querySelector('[role="dialog"]');if(!d)return null;const r=d.getBoundingClientRect(),controls=[...d.querySelectorAll('[data-panel="font"] label select,[data-panel="font"] label input')].filter(e=>!e.closest('[hidden]')).map(e=>{const x=e.getBoundingClientRect(),l=e.closest('label').getBoundingClientRect();return{tag:e.tagName,top:x.top,left:x.left,bottom:x.bottom,labelTop:l.top,labelBottom:l.bottom,contained:x.left>=l.left-1&&x.right<=l.right+1&&x.top>=l.top};});const tabs=[...d.querySelectorAll('[role="tab"]')].map(e=>({bg:getComputedStyle(e).backgroundColor,radius:getComputedStyle(e).borderRadius,rect:(()=>{const x=e.getBoundingClientRect();return{x:x.x,y:x.y,width:x.width,height:x.height}})()}));const p=d.querySelector('[data-preview]'),pc=p&&getComputedStyle(p);return{dialog:{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom},viewport:{width:innerWidth,height:innerHeight},controls,tabs,preview:p?{background:pc.backgroundColor,color:pc.color,contrastTarget:p.innerText}:null};})()`);
    await shot(`q40-slides-font-${width}x${height}-${theme}`);
    const layoutOk=metrics&&metrics.dialog.x>=0&&metrics.dialog.y>=0&&metrics.dialog.right<=width&&metrics.dialog.bottom<=height&&metrics.controls.every(x=>x.contained)&&metrics.tabs.every(x=>x.rect.width>0&&x.rect.height>0)&&metrics.preview?.background==="rgb(255, 255, 255)";
    check(`Phông chữ không chồng lấn, vừa khung và xem trước rõ ${width}x${height} ${theme}`,layoutOk,metrics);
    await click(cdp,"#vno-font-dialog-overlay [data-close]");
  }
}finally{await session.close()}
if(results.some(x=>!x))process.exit(1);
console.log(`Q40 Slides font dialog layout: ${results.length}/${results.length} PASS`);
