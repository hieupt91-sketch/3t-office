import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { CdpClient, connectToPort, findFreePort, readTargets, sleep } from "../live/cdp/client.mjs";
import { click, insertText, mouseClick, press, typeText } from "../live/cdp/actions.mjs";

const distribution = path.resolve(process.argv[2]);
const evidence = path.resolve(process.argv[3]);
const support = path.join(evidence, "application-support");
const isolatedHome = path.join(evidence, "home");
await mkdir(support, { recursive: true });
await mkdir(isolatedHome, { recursive: true });

const cases = {
  writer: { launcher: "Doc", extension: "docx", ready: ".vno-writer-body" },
  sheet: { launcher: "Sheet", extension: "xlsx", ready: ".vno-sheet-container" },
  slides: { launcher: "Slide", extension: "pptx", ready: ".vno-slide-canvas" },
};

async function launch(kind, filePath = null) {
  const spec = cases[kind];
  const port = await findFreePort();
  const executable = path.join(distribution, `${spec.launcher}.app`, "Contents", "MacOS", spec.launcher);
  const args = filePath ? [filePath] : [];
  const env = {
    ...process.env,
    HOME: isolatedHome,
    VNO_APPLICATION_SUPPORT_ROOT: support,
    VNO_CDP_DEBUG_PORT: String(port),
    QTWEBENGINE_REMOTE_DEBUGGING: String(port),
  };
  const child = spawn(executable, args, { cwd: distribution, env, detached: true, stdio: ["ignore", "pipe", "pipe"] });
  let output = "";
  child.stdout.on("data", chunk => { output = (output + chunk).slice(-30000); });
  child.stderr.on("data", chunk => { output = (output + chunk).slice(-30000); });
  const exited = new Promise(resolve => child.once("exit", (code, signal) => resolve({ code, signal })));
  let ready = false;
  for (let started = Date.now(); Date.now() - started < 180000;) {
    if (child.exitCode !== null) throw new Error(`${spec.launcher} launcher exited early (${child.exitCode})\n${output}`);
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (response.ok) { ready = true; break; }
    } catch {}
    await sleep(300);
  }
  if (!ready) throw new Error(`${spec.launcher} CDP endpoint did not start\n${output}`);
  const cdp = await connectToPort(port, { timeoutMilliseconds: 30000 });
  await cdp.waitFor(`!!document.querySelector(${JSON.stringify(spec.ready)})`, { timeoutMilliseconds: 180000, intervalMilliseconds: 400 });
  const consent = await cdp.evaluate("!!document.querySelector('.vno-error-reporting-overlay')");
  if (consent) {
    const deny = ".vno-error-reporting-overlay [data-dialog-action=\"deny\"]";
    if (await cdp.evaluate(`!!document.querySelector(${JSON.stringify(deny)})`)) await click(cdp, deny);
  }
  return { kind, child, exited, cdp, port, output: () => output };
}

async function stop(session) {
  try {
    const targets = (await readTargets(session.port).catch(() => [])).filter(target => target.type === "page");
    for (const target of targets) {
      const client = target.id === session.cdp?.target?.id ? session.cdp : await new CdpClient(target).open();
      await client.evaluate("window.pywebview?.api?.close_current_window?.()", { awaitPromise: true }).catch(() => {});
      if (client !== session.cdp) await client.close().catch(() => {});
    }
  } catch {}
  await session.cdp?.close().catch(() => {});
  await Promise.race([session.exited, sleep(8000)]);
  if (session.child.exitCode === null && session.child.signalCode === null) {
    try { process.kill(-session.child.pid, "SIGTERM"); } catch {}
    await Promise.race([session.exited, sleep(3000)]);
  }
  if (session.child.exitCode === null && session.child.signalCode === null) {
    try { process.kill(-session.child.pid, "SIGKILL"); } catch {}
    await Promise.race([session.exited, sleep(3000)]);
  }
}

async function shot(cdp, filename) {
  const result = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false }, 60000);
  await writeFile(path.join(evidence, filename), Buffer.from((result.result || result).data, "base64"));
}

async function clickCoord(cdp, coord) {
  const value = await cdp.evaluate(`(() => { const e=[...document.querySelectorAll('.vno-grid-cell[data-coord="${coord}"]')].find(n=>{const r=n.getBoundingClientRect();return r.width>0&&r.height>0}); if(!e)return null; const r=e.getBoundingClientRect(); return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2}); })()`);
  if (!value) throw new Error(`Missing visible cell ${coord}`);
  const point = JSON.parse(value);
  await mouseClick(cdp, point.x, point.y);
}

async function saveAs(cdp, kind, output) {
  const expression = kind === "writer"
    ? `(() => { const a=window.__vnoAppInstance.adapter; a.isDirty=true; return globalThis.globalUnoBridge.saveRealFileInPlace("writer",a._contentForExport(),${JSON.stringify(output)},${JSON.stringify(output)}); })()`
    : kind === "sheet"
      ? `(() => { const a=window.__vnoAppInstance.adapter; a.isDirty=true; return globalThis.globalUnoBridge.saveRealFileInPlace("sheet",a.serializeToFods(),${JSON.stringify(output)},${JSON.stringify(output)}); })()`
      : `(() => { const a=window.__vnoAppInstance.adapter; a.isDirty=true; return globalThis.globalUnoBridge.saveRealFileInPlace("slides",a.serializeToFodp(),${JSON.stringify(output)},${JSON.stringify(output)}); })()`;
  return cdp.evaluate(expression, { awaitPromise: true, timeoutMilliseconds: 600000 });
}

const results = {};
for (const kind of Object.keys(cases)) {
  const output = path.join(evidence, `agy-${kind}.${cases[kind].extension}`);
  let session = await launch(kind);
  try {
    const cdp = session.cdp;
    if (kind === "writer") {
      await click(cdp, ".vno-writer-body p");
      await insertText(cdp, "VN Office kiểm thử đóng gói ngoại tuyến.");
      await press(cdp, "Enter");
      await insertText(cdp, "Nội dung tiếng Việt được lưu và mở lại thành công.");
    } else if (kind === "sheet") {
      await clickCoord(cdp, "A1"); await typeText(cdp, "Kiểm thử tiếng Việt", 10); await press(cdp, "Enter");
      await clickCoord(cdp, "B1"); await typeText(cdp, "2468", 10); await press(cdp, "Enter");
      await clickCoord(cdp, "B2"); await typeText(cdp, "=B1*2", 10); await press(cdp, "Enter");
    } else {
      await click(cdp, ".vno-slide-title"); await press(cdp, "a", { meta: true }); await insertText(cdp, "VN Office ngoại tuyến");
      await click(cdp, ".vno-slide-body"); await press(cdp, "a", { meta: true }); await insertText(cdp, "Nội dung tiếng Việt đã được chỉnh sửa và lưu.");
    }
    await sleep(800);
    const saved = await saveAs(cdp, kind, output);
    results[kind] = { output, saved };
  } finally { await stop(session); }

  session = await launch(kind, output);
  try {
    const cdp = session.cdp;
    if (kind === "writer") {
      await cdp.waitFor("document.querySelector('.vno-writer-body')?.innerText?.includes('VN Office kiểm thử đóng gói ngoại tuyến')", { timeoutMilliseconds: 180000, intervalMilliseconds: 500 });
      results[kind].model = await cdp.evaluate("JSON.stringify({text:document.querySelector('.vno-writer-body')?.innerText||'',paragraphs:document.querySelectorAll('.vno-writer-body p').length,title:document.title})");
    } else if (kind === "sheet") {
      await cdp.waitFor("window.__vnoAppInstance?.grid?.cellsData?.size > 0 && !document.querySelector('.vno-sheet-quick-view')", { timeoutMilliseconds: 180000, intervalMilliseconds: 500 });
      results[kind].model = await cdp.evaluate("JSON.stringify((()=>{const g=window.__vnoAppInstance.grid,c=k=>g.cellsData.get(k)||{};return{sheets:g.sheets,active:g.activeSheet,A1:c('A1'),B1:c('B1'),B2:c('B2'),title:document.title}})())");
    } else {
      await cdp.waitFor("window.__vnoAppInstance?.adapter?.canvas?.slides?.[0]?.title?.includes('VN Office ngoại tuyến')", { timeoutMilliseconds: 180000, intervalMilliseconds: 500 });
      results[kind].model = await cdp.evaluate("JSON.stringify((()=>{const c=window.__vnoAppInstance.adapter.canvas,s=c.slides[0];return{count:c.slides.length,title:s.title,body:s.body,shapes:s.shapes?.map(x=>x.text).filter(Boolean)||[],documentTitle:document.title}})())");
    }
    await shot(cdp, `${kind}-reopened.png`);
  } finally { await stop(session); }
}

await writeFile(path.join(evidence, "results.json"), JSON.stringify(results, null, 2) + "\n");
console.log(JSON.stringify(results, null, 2));
