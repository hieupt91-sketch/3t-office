import { mkdirSync,writeFileSync } from "node:fs";
import path from "node:path";
import { launchApp } from "./session.mjs";
import { sleep } from "./actions.mjs";

const dir=path.resolve("docs/assets/q40-ui");mkdirSync(dir,{recursive:true});const phase=process.env.VNO_Q40_PHASE||"after";
const session=await launchApp("writer",{localAppData:process.env.VNO_CDP_LOCALAPPDATA});const {cdp}=session;const ev=x=>cdp.evaluate(x,{awaitPromise:true});const checks=[];
const check=(n,p,d)=>{checks.push(!!p);console.log(`${p?"PASS":"FAIL"} | ${n} | ${JSON.stringify(d)}`)};
const resize=async(w,h)=>{const x=await cdp.send("Browser.getWindowForTarget",{});await cdp.send("Browser.setWindowBounds",{windowId:(x.result||x).windowId,bounds:{windowState:"normal",width:w,height:h}});await sleep(250)};
try{await sleep(800);await ev(`(()=>{const b=document.querySelector('.vno-writer-body');b.innerHTML='<table id="q40-table"><tbody><tr><td>Kiểm tra</td></tr></tbody></table>';const t=document.querySelector('#q40-table'),c=t.rows[0].cells[0],a=window.__vnoAppInstance.adapter;if(a.tableController){a.tableController.activeTable=t;a.tableController.activeCell=c;}const r=document.createRange();r.selectNodeContents(c);getSelection().removeAllRanges();getSelection().addRange(r)})()`);
for(const [w,h]of [[1366,768],[1280,720]])for(const theme of["light","dark"]){await resize(w,h);await ev(`document.documentElement.dataset.theme=${JSON.stringify(theme)}`);await ev(`document.querySelector('#vno-ribbon-tab-tableDesign')?.click()`);await sleep(120);await ev(`document.querySelector('[data-command-id="writer.table.stylesGallery"]')?.click()`);await sleep(180);
const m=await ev(`(()=>{const p=document.querySelector('#vno-table-styles-gallery-popup'),c=p?.querySelector('.vno-table-style-card'),l=p?.querySelector('.vno-table-style-label'),r=p?.getBoundingClientRect(),s=document.querySelector('.vno-statusbar')?.getBoundingClientRect();return{open:!!p,rect:r&&{x:r.x,y:r.y,right:r.right,bottom:r.bottom},statusTop:s?.top,viewport:{width:innerWidth,height:innerHeight},popup:p&&getComputedStyle(p).backgroundColor,card:c&&getComputedStyle(c).backgroundColor,label:l&&getComputedStyle(l).color,scroll:p&&{height:p.clientHeight,scroll:p.scrollHeight}}})()`);
const shot=await cdp.send("Page.captureScreenshot",{format:"png",captureBeyondViewport:false});writeFileSync(path.join(dir,`q40-writer-table-gallery-${w}x${h}-${theme}-${phase}.png`),Buffer.from((shot.result||shot).data,"base64"));
const darkOk=theme!=="dark"||(m.popup!=="rgb(255, 255, 255)"&&m.card!=="rgb(255, 255, 255)"&&m.label!=="rgb(255, 255, 255)");check(`Gallery kiểu bảng ${theme} ${w}x${h} rõ trong giao diện`,m.open&&m.rect.x>=0&&m.rect.y>=0&&m.rect.right<=w&&m.rect.bottom<=m.statusTop-1&&darkOk,m);
await ev(`document.querySelector('#vno-table-styles-gallery-popup')?.remove()`);
}}finally{await session.close()}
if(checks.some(x=>!x))process.exit(1);console.log(`Q40 Writer table gallery: ${checks.length}/${checks.length} PASS`);
