import { launchApp } from "./session.mjs";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const session = await launchApp("slides", { filePath: "E:\\VNOffice-profiles\\claude-slides-rt\\saved.pptx", startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
const ev = (e) => session.cdp.evaluate(e, { awaitPromise: true });
try {
  await session.cdp.waitFor("window.__vnoAppInstance?.adapter?.canvas?.slides?.length > 0", { timeoutMilliseconds: 180000, intervalMilliseconds: 500 });
  await sleep(4000);
  console.log("props chuoi dai tren adapter/app/canvas:", await ev(`(() => { const out=[]; for (const [name,o] of [['adapter',window.__vnoAppInstance.adapter],['app',window.__vnoAppInstance],['canvas',window.__vnoAppInstance.adapter.canvas]]) { for (const k of Object.keys(o)) { const v=o[k]; if (typeof v==='string' && v.length>500) out.push(name+'.'+k+' len='+v.length+' hasText='+v.includes('Hop kiem')+' hasTransition='+/transition/i.test(v)); } } return out.join('\\n'); })()`));
  const fodp = await ev("(() => { const a=window.__vnoAppInstance.adapter; const f=a.serializeToFodp(); return JSON.stringify({len:f.length, hasText:f.includes('Hop kiem'), shapes:(f.match(/<draw:custom-shape|<draw:frame/g)||[]).length}); })()");
  console.log("serializeToFodp ngay sau mo:", fodp);
} finally { await session.close(); }