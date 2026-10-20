import { mkdirSync,writeFileSync } from "node:fs";
import path from "node:path";
import { launchApp } from "./session.mjs";
import { click,sleep } from "./actions.mjs";

const dir=path.resolve("docs/assets/q40-ui");mkdirSync(dir,{recursive:true});
const phase=process.env.VNO_Q40_PHASE||"after";
const session=await launchApp("writer",{localAppData:process.env.VNO_CDP_LOCALAPPDATA});
const {cdp}=session;const ev=(x)=>cdp.evaluate(x,{awaitPromise:true});const checks=[];
const check=(n,p,d)=>{checks.push(!!p);console.log(`${p?"PASS":"FAIL"} | ${n} | ${JSON.stringify(d)}`)};
const resize=async(w,h)=>{const x=await cdp.send("Browser.getWindowForTarget",{});await cdp.send("Browser.setWindowBounds",{windowId:(x.result||x).windowId,bounds:{windowState:"normal",width:w,height:h}});await sleep(250)};
try{await sleep(700);for(const [w,h]of [[1366,768],[1280,720]])for(const theme of["light","dark"]){
  await resize(w,h);await ev(`document.documentElement.dataset.theme=${JSON.stringify(theme)}`);await click(cdp,"#vno-ribbon-tab-design");await click(cdp,'[data-command-id="writer.design.themeGallery"]');await sleep(180);
  const m=await ev(`(()=>{const d=document.querySelector('.vno-dialog-overlay [role="dialog"]'),c=d?.querySelector('.vno-theme-card'),r=d?.getBoundingClientRect(),bg=d&&getComputedStyle(d).backgroundColor,card=c&&getComputedStyle(c).backgroundColor,expected=getComputedStyle(document.documentElement).getPropertyValue('--vno-bg-window').trim();return{open:!!d,rect:r&&{x:r.x,y:r.y,right:r.right,bottom:r.bottom},viewport:{width:innerWidth,height:innerHeight},background:bg,cardBackground:card,expected};})()`);
  const shot=await cdp.send("Page.captureScreenshot",{format:"png",captureBeyondViewport:false});writeFileSync(path.join(dir,`q40-writer-theme-${w}x${h}-${theme}-${phase}.png`),Buffer.from((shot.result||shot).data,"base64"));
  const darkGood=theme!=="dark"||(m.background!=="rgb(255, 255, 255)"&&m.cardBackground!=="rgb(255, 255, 255)");
  check(`Thư viện chủ đề ${theme} ${w}x${h} dùng nền theo giao diện và vừa khung`,m.open&&m.rect.x>=0&&m.rect.y>=0&&m.rect.right<=w&&m.rect.bottom<=h&&darkGood,m);
  await click(cdp,".vno-dialog-cancel-btn");
}}finally{await session.close()}
if(checks.some(x=>!x))process.exit(1);console.log(`Q40 Writer theme gallery: ${checks.length}/${checks.length} PASS`);
