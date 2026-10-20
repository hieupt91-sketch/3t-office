import { mkdirSync,writeFileSync } from "node:fs";
import path from "node:path";
import { launchApp } from "./session.mjs";
import { sleep } from "./actions.mjs";
const dir=path.resolve("docs/assets/q40-ui");mkdirSync(dir,{recursive:true});const phase=process.env.VNO_Q40_PHASE||"after";
const session=await launchApp("writer",{localAppData:process.env.VNO_CDP_LOCALAPPDATA});const {cdp}=session;const ev=x=>cdp.evaluate(x,{awaitPromise:true});const checks=[];const check=(n,p,d)=>{checks.push(!!p);console.log(`${p?"PASS":"FAIL"} | ${n} | ${JSON.stringify(d)}`)};
const resize=async(w,h)=>{const x=await cdp.send("Browser.getWindowForTarget",{});await cdp.send("Browser.setWindowBounds",{windowId:(x.result||x).windowId,bounds:{windowState:"normal",width:w,height:h}});await sleep(250)};
try{await sleep(700);for(const [w,h]of [[1366,768],[1280,720]])for(const theme of["light","dark"]){await resize(w,h);await ev(`document.documentElement.dataset.theme=${JSON.stringify(theme)}`);await ev(`(async()=>{const b=window.__vnoGlobalCommandBus||(await import('/platform/commands/command-bus.js')).globalCommandBus;await b.execute('writer.view.selectionPane')})()`);await sleep(180);
const m=await ev(`(()=>{const p=document.querySelector('#vno-writer-selection-pane'),e=p?.querySelector('.vno-writer-selection-pane-empty');return{open:!!p,empty:e?.textContent.trim()||'',objects:p?.querySelectorAll('.vno-selection-pane-item').length||0,rect:(()=>{const r=p?.getBoundingClientRect();return r&&{x:r.x,y:r.y,right:r.right,bottom:r.bottom}})(),viewport:{width:innerWidth,height:innerHeight}}})()`);
const s=await cdp.send("Page.captureScreenshot",{format:"png",captureBeyondViewport:false});writeFileSync(path.join(dir,`q40-writer-selection-empty-${w}x${h}-${theme}-${phase}.png`),Buffer.from((s.result||s).data,"base64"));
check(`Ngăn chọn thông báo trạng thái rỗng ${theme} ${w}x${h}`,m.open&&m.empty==="Chưa có đối tượng nào."&&m.objects===0&&m.rect.x>=0&&m.rect.bottom<=h,m);
await ev(`(async()=>{const b=window.__vnoGlobalCommandBus||(await import('/platform/commands/command-bus.js')).globalCommandBus;await b.execute('writer.view.selectionPane',false)})()`);
}}finally{await session.close()}
if(checks.some(x=>!x))process.exit(1);console.log(`Q40 Writer selection pane empty state: ${checks.length}/${checks.length} PASS`);
