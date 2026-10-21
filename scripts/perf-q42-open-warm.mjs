import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const [rootArg, manifestArg, outputArg, profilesArg] = process.argv.slice(2);
if (!rootArg || !manifestArg || !outputArg || !profilesArg) {
  throw new Error("Usage: node --experimental-websocket scripts/perf-q42-open-warm.mjs <root> <manifest.json> <output-dir> <profiles-dir>");
}

const root = path.resolve(rootArg);
const outputDir = path.resolve(outputArg);
const profilesDir = path.resolve(profilesArg);
const manifest = JSON.parse(await fs.readFile(manifestArg, "utf8"));
const { launchApp } = await import(pathToFileURL(path.join(root, "tests/live/cdp/session.mjs")));
const records = [];
await fs.mkdir(profilesDir, { recursive: true });
process.env.VNO_APP_ROOT = root;
process.env.VNO_PERF_DEBUG = "1";

const probeByApp = {
  writer: `(() => { const a=window.__vnoAppInstance?.adapter; return !!(a?.bodyDom && a.bodyDom.innerText.trim().length > 20 && a.bodyDom.contentEditable === "true"); })()`,
  slides: `(() => { const c=window.__vnoAppInstance?.canvas; return !!(c?.slides?.length && document.querySelector(".vno-slide-canvas")); })()`,
  sheet: `(() => { const a=window.__vnoAppInstance?.adapter; return !!(a?.grid && (a.grid.workbook?.sheets?.length || a.workbook?.sheets?.length)); })()`,
};

for (const item of manifest) {
  const itemDir = path.join(outputDir, item.slug);
  const profileDir = path.join(profilesDir, item.slug);
  await fs.mkdir(itemDir, { recursive: true });
  await fs.mkdir(profileDir, { recursive: false });
  const sessionStart = performance.now();
  const session = await launchApp(item.app, {
    root,
    localAppData: profileDir,
    startTimeoutMilliseconds: 300000,
    readyTimeoutMilliseconds: 300000,
  });
  const launchSeconds = (performance.now() - sessionStart) / 1000;
  try {
    await session.cdp.waitFor(
      "!!window.pywebview?.api?.open_document_dialog && !!window.globalUnoBridge && !!window.__vnoAppInstance?.adapter",
      { timeoutMilliseconds: 30000 },
    );
    for (let lap = 1; lap <= 4; lap += 1) {
      const start = performance.now();
      const startState = await session.cdp.evaluate(`(() => {
        const app=${JSON.stringify(item.app)};
        const doc=window.__vnoAppInstance;
        const adapter=doc?.adapter;
        const root=app==="writer" ? adapter?.bodyDom : app==="slides" ? document.querySelector(".vno-slide-canvas") : document.querySelector(".vno-sheet-container");
        if (!root) throw new Error("No document render root for " + app);
        const bridge=window.globalUnoBridge;
        bridge.openRealFile=async kind=>{
          window.__q42ApiStart=performance.now();
          const result=await window.pywebview.api.open_document_dialog(kind,${JSON.stringify(item.file)});
          window.__q42ApiDone=performance.now();
          return result;
        };
        window.__q42Started=performance.now();
        window.__q42ContentAt=null;
        window.__q42ApiStart=null;
        window.__q42ApiDone=null;
        window.__q42Stages={};
        window.__q42WrappedMethods ||= new Set();
        const timeMethod=(obj,name,key)=>{
          if(typeof obj?.[name]!=="function"||window.__q42WrappedMethods.has(name))return;
          window.__q42WrappedMethods.add(name);
          const original=obj[name];
          obj[name]=function(...args){
            const t=performance.now();
            const finish=()=>{window.__q42Stages[key]=(window.__q42Stages[key]||0)+(performance.now()-t)};
            try{const result=original.apply(this,args);if(result&&typeof result.then==="function")return result.finally(finish);finish();return result}
            catch(error){finish();throw error}
          };
        };
        timeMethod(adapter,"_normalizeImportedHtml","writer_normalize_html_ms");
        timeMethod(adapter,"_renderShapes","writer_render_shapes_ms");
        timeMethod(adapter,"_recomputeLivePagination","writer_pagination_layout_ms");
        timeMethod(adapter,"loadFromFodp","slides_load_fodp_ms");
        timeMethod(adapter,"loadFromFods","sheet_load_fods_ms");
        timeMethod(adapter,"loadFromPayload","sheet_load_payload_ms");
        const observer=new MutationObserver(records=>{
          if (window.__q42ContentAt!==null || !records.length) return;
          requestAnimationFrame(()=>{
            const text=app==="writer" ? adapter.bodyDom?.innerText : app==="slides" ? (doc.canvas?.slides?.length ? "slides" : "") : (adapter.grid?.workbook?.sheets?.length || adapter.workbook?.sheets?.length ? "sheet" : "");
            if (String(text||"").trim().length>0) window.__q42ContentAt=performance.now();
          });
        });
        observer.observe(root,{subtree:true,childList:true,characterData:true,attributes:true});
        window.__q42Observer=observer;
        window.__q42OpenPromise=adapter.open();
        return { started:true, priorTextLength:app==="writer" ? adapter.bodyDom?.innerText?.length||0 : 0 };
      })()`);
      let contentSeconds = null;
      try {
        await session.cdp.waitFor("window.__q42ContentAt !== null || [...document.querySelectorAll('[role=dialog]')].some(d=>{const r=d.getBoundingClientRect();return r.width>0&&r.height>0&&/không thể mở|không thể đọc|tệp đang mở được giữ nguyên/i.test(d.innerText||'')})", { timeoutMilliseconds: 300000, intervalMilliseconds: 50 });
        const hasErrorDialog = await session.cdp.evaluate("[...document.querySelectorAll('[role=dialog]')].some(d=>{const r=d.getBoundingClientRect();return r.width>0&&r.height>0&&/không thể mở|không thể đọc|tệp đang mở được giữ nguyên/i.test(d.innerText||'')})");
        if (hasErrorDialog) {
          const errorShot = await session.cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false }, 30000);
          await fs.writeFile(path.join(itemDir, `lap-${lap}-error.png`), Buffer.from(errorShot.result.data, "base64"));
          await session.cdp.evaluate("(()=>{const d=[...document.querySelectorAll('[role=dialog]')].find(x=>{const r=x.getBoundingClientRect();return r.width>0&&r.height>0});d?.querySelector('.vno-dialog-ok-btn,button[aria-label=\\\"Đóng\\\"]')?.click();return true})()");
        } else {
          contentSeconds = await session.cdp.evaluate("(window.__q42ContentAt-window.__q42Started)/1000");
        }
      } catch (error) {
        contentSeconds = null;
      }
      const opened = await session.cdp.evaluate(`(async()=>{let ok=false,error="";try{ok=await window.__q42OpenPromise;}catch(e){error=String(e?.stack||e)}finally{window.__q42Observer?.disconnect()}const app=${JSON.stringify(item.app)},doc=window.__vnoAppInstance,a=doc?.adapter;return {ok,error,path:a?._sourcePath||a?.sourceFilePath||"",api_s:window.__q42ApiStart==null?null:(window.__q42ApiDone-window.__q42ApiStart)/1000,stages:{...window.__q42Stages},editable:${probeByApp[item.app]},writerText:app==="writer"?(a?.bodyDom?.innerText||"").slice(0,120):"",slideCount:doc?.canvas?.slides?.length||0,sheetCount:a?.grid?.workbook?.sheets?.length||a?.workbook?.sheets?.length||0};})()`, { timeoutMilliseconds: 300000 });
      const editableReady = opened.ok
        ? await session.cdp.waitFor(probeByApp[item.app], { timeoutMilliseconds: 300000, intervalMilliseconds: 100 }).then(() => true, () => false)
        : false;
      const layoutReadySeconds = opened.ok
        ? await session.cdp.evaluate(`new Promise(resolve=>{const app=${JSON.stringify(item.app)},a=window.__vnoAppInstance?.adapter,root=app==="writer"?a?.bodyDom:app==="slides"?document.querySelector(".vno-slide-canvas"):document.querySelector(".vno-sheet-container");let prev="",same=0,n=0;const sample=()=>{const r=root?.getBoundingClientRect();const current=[r?.x,r?.y,r?.width,r?.height,root?.scrollHeight,root?.scrollWidth,app==="slides"?window.__vnoAppInstance?.canvas?.slides?.length:app==="sheet"?(a?.grid?.workbook?.sheets?.length||a?.workbook?.sheets?.length):root?.innerText?.length].join("|");same=current===prev?same+1:0;prev=current;n++;if(same>=2||n>=120)resolve((performance.now()-window.__q42Started)/1000);else requestAnimationFrame(sample)};requestAnimationFrame(sample)})`, { timeoutMilliseconds: 30000 })
        : null;
      const visual = await session.cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false }, 30000);
      const screenshot = path.join(itemDir, `lap-${lap}.png`);
      await fs.writeFile(screenshot, Buffer.from(visual.result.data, "base64"));
      const record = {
        slug: item.slug,
        app: item.app,
        file: item.file,
        lap,
        launch_s: Number(launchSeconds.toFixed(3)),
        open_call_to_content_s: contentSeconds,
        open_call_to_editable_s: Number(((performance.now() - start) / 1000).toFixed(3)),
        conversion_api_s: opened.api_s,
        stage_timings_ms: opened.stages,
        layout_stable_s: layoutReadySeconds,
        editable_ready: editableReady,
        state: opened,
        screenshot,
        probe: startState,
      };
      records.push(record);
      await fs.appendFile(path.join(outputDir, "results.jsonl"), JSON.stringify(record) + "\n", "utf8");
      if (!opened.ok) break;
    }
  } finally {
    await fs.writeFile(path.join(itemDir, "app-perf.log"), session.output, "utf8");
    await session.close();
  }
}

await fs.writeFile(path.join(outputDir, "results.json"), JSON.stringify(records, null, 2), "utf8");
