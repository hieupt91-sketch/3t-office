import fs from "node:fs/promises";
import path from "node:path";
import { launchApp } from "./session.mjs";

const [inputPath, outputPath] = process.argv.slice(2);
if (!inputPath || !outputPath) throw new Error("Usage: node --experimental-websocket tests/live/cdp/lan14-save-stage-probe.mjs <input.xlsx> <output.xlsx>");

const session = await launchApp("sheet", { filePath: path.resolve(inputPath) });
const started = Date.now();
const resultPath = outputPath + ".stage-probe.json";
let monitor;
try {
  const expected = path.resolve(inputPath).replace(/\\/g, "/").toLowerCase();
  await session.cdp.waitFor(`(() => { const a = window.__vnoAppInstance?.adapter; const p = String(a?._sourcePath || a?.sourceFilePath || "").replace(/\\\\/g, "/").toLowerCase(); return p === ${JSON.stringify(expected)} && !!a?.grid?.sheets?.length; })()`, { timeoutMilliseconds: 900000, intervalMilliseconds: 500 });
  const setup = await session.cdp.evaluate(`(() => {
    const bridge = globalThis.globalUnoBridge;
    const api = bridge?.desktopApi;
    if (!api || typeof api.append_content_stage !== "function") throw new Error("pywebview append_content_stage unavailable");
    const state = globalThis.__q10StageProbe = { startedAt: Date.now(), rows: [], inflight: 0, maxInflight: 0, done: false, error: null, result: null };
    const append = api.append_content_stage.bind(api);
    api.append_content_stage = async function(stageId, chunk) {
      const row = { index: state.rows.length + 1, chars: chunk.length, utf8Bytes: new TextEncoder().encode(chunk).length, startedAt: Date.now(), heapUsed: performance.memory?.usedJSHeapSize ?? null };
      state.inflight++; state.maxInflight = Math.max(state.maxInflight, state.inflight);
      try { row.result = await append(stageId, chunk); row.ok = Boolean(row.result?.ok); }
      catch (error) { row.error = String(error); throw error; }
      finally { row.elapsedMs = Date.now() - row.startedAt; row.heapUsedAfter = performance.memory?.usedJSHeapSize ?? null; state.inflight--; state.rows.push(row); }
      return row.result;
    };
    state.bridgeFunctionType = typeof api.append_content_stage;
    state.bridgeFunctionName = api.append_content_stage.name || null;
    state.userAgent = navigator.userAgent;
    state.deviceMemoryGb = navigator.deviceMemory ?? null;
    state.realEngine = bridge.hasRealEngine;
    state.engineStatus = null;
    state.content = window.__vnoAppInstance.adapter.serializeToFods();
    state.contentChars = state.content.length;
    const adapter = window.__vnoAppInstance.adapter;
    return { contentChars: state.contentChars, sourcePath: adapter._sourcePath || adapter.sourceFilePath || null, sheetCount: adapter.grid?.sheets?.length ?? null, memory: performance.memory ? { used: performance.memory.usedJSHeapSize, limit: performance.memory.jsHeapSizeLimit } : null, realEngine: state.realEngine, bridgeFunctionType: state.bridgeFunctionType, bridgeFunctionName: state.bridgeFunctionName };
  })()`);
  await fs.mkdir(path.dirname(path.resolve(outputPath)), { recursive: true });
  if (!setup.realEngine) throw new Error("LibreOffice engine unavailable; staging was not run.");
  await session.cdp.evaluate(`(() => { const s = globalThis.__q10StageProbe; globalThis.__q10SavePromise = globalThis.globalUnoBridge.saveRealFileInPlace("sheet", s.content, ${JSON.stringify(path.resolve(outputPath))}, ${JSON.stringify(path.resolve(inputPath))}).then(v => { s.result = v; if (v?.status !== "ok") s.error = JSON.stringify(v); s.done = true; return v; }, e => { s.error = String(e?.stack || e); s.done = true; }); return true; })()`);
  monitor = setInterval(async () => {
    try {
      const state = await session.cdp.evaluate(`(() => { const s = globalThis.__q10StageProbe; return { done: s.done, rows: s.rows, inflight: s.inflight, maxInflight: s.maxInflight, error: s.error, result: s.result, heapUsed: performance.memory?.usedJSHeapSize ?? null, bridgeFunctionType: s.bridgeFunctionType, bridgeFunctionName: s.bridgeFunctionName }; })()`);
      await fs.writeFile(resultPath, JSON.stringify({ ...state, inputPath: path.resolve(inputPath), outputPath: path.resolve(outputPath), elapsedMs: Date.now() - started }, null, 2), "utf8");
      if (state.done) { clearInterval(monitor); monitor = null; }
    } catch (error) {
      await fs.writeFile(resultPath, JSON.stringify({ setup, elapsedMs: Date.now() - started, monitorError: String(error) }, null, 2), "utf8").catch(() => {});
    }
  }, 1000);
  const deadline = Date.now() + 30 * 60 * 1000;
  while (Date.now() < deadline) {
    const state = await session.cdp.evaluate(`(() => { const s = globalThis.__q10StageProbe; return { done: s.done, rows: s.rows.length, last: s.rows.at(-1) || null, maxInflight: s.maxInflight, error: s.error, result: s.result }; })()`);
    if (state.done) {
      await new Promise(resolve => setTimeout(resolve, 1200));
      const report = JSON.parse(await fs.readFile(resultPath, "utf8"));
      if (state.error || state.last?.ok === false) throw new Error(JSON.stringify({ error: state.error, report }));
      if (state.result?.status !== "ok") throw new Error(JSON.stringify({ error: state.error, result: state.result, report }));
      const stat = await fs.stat(path.resolve(outputPath));
      report.outputBytes = stat.size;
      report.elapsedMs = Date.now() - started;
      await fs.writeFile(resultPath, JSON.stringify(report, null, 2), "utf8");
      console.log(JSON.stringify({ status: "PASS", setup, save: state.result, totalCalls: report.rows?.length, maxInflight: report.maxInflight, lastCall: report.rows?.at(-1), outputBytes: stat.size, elapsedMs: report.elapsedMs, report: resultPath }, null, 2));
      break;
    }
    console.log(JSON.stringify({ elapsedMs: Date.now() - started, rows: state.rows, maxInflight: state.maxInflight, lastCall: state.last }));
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  if (Date.now() >= deadline) throw new Error("Q10 staging probe exceeded 30 minute deadline; latest progress is in " + resultPath);
} finally {
  if (monitor) clearInterval(monitor);
  await session.close();
}
