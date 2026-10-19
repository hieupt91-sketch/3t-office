// Read-only LAN14 open timing diagnostic. Outputs only to E:\VNOffice-briefs.
// Run: node --experimental-websocket scripts/audit-0610/lan14_open_diag.mjs
import fs from "node:fs/promises";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { launchApp } from "../../tests/live/cdp/session.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const source = "E:\\VN OFice\\file test\\lan\\lan14.xlsx";
const outDir = "E:\\VNOffice-briefs\\logs\\codex-lan14";
const profileBase = "E:\\VNOffice-profiles\\codex-lan14-diag";
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const stamp = () => new Date().toISOString().replace(/[:.]/g, "-");
const records = [];
const quickOnly = process.argv.includes("--quick-only");
const excelOnly = process.argv.includes("--excel-only");
await fs.mkdir(outDir, { recursive: true });
if (!(await fs.stat(source)).isFile()) throw new Error(`Missing source: ${source}`);

function runChild(exe, args, timeoutMs = 900000) {
  return new Promise((resolve, reject) => {
    const child = spawn(exe, args, { cwd: root, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "", stderr = "";
    child.stdout.on("data", b => stdout += b.toString());
    child.stderr.on("data", b => stderr += b.toString());
    const timer = setTimeout(() => { child.kill(); reject(new Error(`${exe} timed out after ${timeoutMs} ms`)); }, timeoutMs);
    child.once("error", e => { clearTimeout(timer); reject(e); });
    child.once("exit", (code, signal) => { clearTimeout(timer); resolve({ code, signal, stdout, stderr }); });
  });
}
function summarize(values) {
  const xs = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!xs.length) return null;
  return { min_s: +(xs[0] / 1000).toFixed(2), median_s: +(xs[Math.floor(xs.length / 2)] / 1000).toFixed(2), max_s: +(xs.at(-1) / 1000).toFixed(2), runs_s: xs.map(x => +(x / 1000).toFixed(2)) };
}
// Fast first-view probe: stop each isolated instance as soon as preview cells appear.
if (quickOnly) {
  const quick = [];
  for (let i = 1; i <= 3; i++) {
    const tag = `qv-${i}-${stamp()}`, lad = path.join(profileBase, `quick-${i}`), t0 = performance.now();
    await fs.mkdir(lad, { recursive: true });
    process.env.VNO_PERF_DEBUG = "1";
    process.env.VNO_STARTUP_TRACE_FILE = path.join(outDir, `startup-${tag}.jsonl`);
    let session;
    try {
      session = await launchApp("sheet", { root, localAppData: lad, filePath: source, startTimeoutMilliseconds: 900000, readyTimeoutMilliseconds: 900000 });
      const expr = `!!document.querySelector('.vno-sheet-quick-view') && (document.querySelector('.vno-sheet-quick-view').innerText||'').replace(/\\s+/g,'').length>20`;
      await session.cdp.waitFor(expr, { timeoutMilliseconds: 900000, intervalMilliseconds: 50 });
      const ms = performance.now() - t0;
      quick.push(ms);
      records.push({ type: "quick_view", run: i, ms: +ms.toFixed(1), visibleCells: await session.cdp.evaluate("(document.querySelector('.vno-sheet-quick-view')?.innerText||'').replace(/\\s+/g,' ').slice(0,70)") });
    } catch (e) { records.push({ type: "quick_view", run: i, status: "BLOCKED", error: String(e) }); }
    finally { if (session) await session.close(); }
  }
  const result = { source, bytes: (await fs.stat(source)).size, quickView: summarize(quick), records };
  await fs.writeFile(path.join(outDir, "quickview.json"), JSON.stringify(result, null, 2), "utf8");
  console.log(JSON.stringify({ output: path.join(outDir, "quickview.json"), quickView: result.quickView }, null, 2));
  process.exit(0);
}

// External LibreOffice headless baseline, each run has its own user profile.
const locate = spawnSync("python", ["-c", "import main; print(main.SOFFICE_PATH or '')"], { cwd: root, encoding: "utf8", timeout: 60000, windowsHide: true });
const soffice = locate.status === 0 ? locate.stdout.trim().split(/\r?\n/).at(-1) : "";
const loMs = [];
if (!excelOnly && soffice) for (let i = 1; i <= 3; i++) {
  const dir = path.join(outDir, `lo-${i}-${stamp()}`);
  const user = path.join(profileBase, `lo-${i}`);
  await fs.mkdir(dir, { recursive: true }); await fs.mkdir(user, { recursive: true });
  const t = performance.now();
  const r = await runChild(soffice, [`-env:UserInstallation=${pathToFileURL(user).href}`, "--headless", "--convert-to", "fods", "--outdir", dir, source], 900000);
  const ms = performance.now() - t;
  loMs.push(ms);
  records.push({ type: "lo_headless", run: i, ms: +ms.toFixed(1), exitCode: r.code, output: (r.stdout + r.stderr).trim().slice(-1200) });
} else records.push({ type: "lo_headless", status: "BLOCKED", reason: locate.stderr || "Could not locate soffice via main.SOFFICE_PATH" });

// Three isolated application opens; only instrument with existing opt-in perf hooks.
const app = [];
if (!excelOnly) for (let i = 1; i <= 3; i++) {
  const tag = `${i}-${stamp()}`;
  const lad = path.join(profileBase, `app-${i}`);
  const trace = path.join(outDir, `startup-${tag}.jsonl`);
  await fs.mkdir(lad, { recursive: true });
  process.env.VNO_PERF_DEBUG = "1";
  process.env.VNO_STARTUP_TRACE_FILE = trace;
  const t0 = performance.now();
  let session;
  try {
    session = await launchApp("sheet", { root, localAppData: lad, filePath: source, startTimeoutMilliseconds: 900000, readyTimeoutMilliseconds: 900000 });
    let logs = session.output || "";
    session.child.stdout.on("data", b => logs += b.toString());
    session.child.stderr.on("data", b => logs += b.toString());
    const cdp = session.cdp;
    const qvExpr = `!!document.querySelector('.vno-sheet-quick-view') && (document.querySelector('.vno-sheet-quick-view').innerText||'').replace(/\\s+/g,'').length>20`;
    let firstData = null;
    try { await cdp.waitFor(qvExpr, { timeoutMilliseconds: 900000, intervalMilliseconds: 50 }); firstData = performance.now() - t0; } catch {}
    const norm = source.replace(/\\/g, "/").toLowerCase();
    const isSource = `(() => { const a=window.__vnoAppInstance?.adapter; const p=String(a?._sourcePath||a?.sourceFilePath||'').replace(/\\\\/g,'/').toLowerCase(); return p===${JSON.stringify(norm)}; })()`;
    await cdp.waitFor(isSource, { timeoutMilliseconds: 900000, intervalMilliseconds: 100 });
    let editableMs = null;
    const busyExpr = `![...document.querySelectorAll('.vno-sheet-quick-view,.vno-loading,[role=progressbar]')].some(n=>{const b=n.getBoundingClientRect(),s=getComputedStyle(n);return b.width>0&&b.height>0&&s.display!=='none'&&s.visibility!=='hidden'})`;
    try { await cdp.waitFor(`(${isSource}) && (${busyExpr}) && !!window.__vnoAppInstance?.grid?.cellsData?.size`, { timeoutMilliseconds: 900000, intervalMilliseconds: 250 }); editableMs = performance.now() - t0; } catch {}
    await sleep(500);
    const state = await cdp.evaluate(`JSON.stringify({events:window.__vnoStartupEvents||[], mode:window.__vnoAppInstance?.adapter?.loadMode||null, cells:window.__vnoAppInstance?.grid?.cellsData?.size||0, sheets:window.__vnoAppInstance?.grid?.sheets?.length||0})`).catch(() => "{}");
    await sleep(200);
    const item = { type: "app_open", run: i, quickView_s: firstData === null ? null : +(firstData / 1000).toFixed(2), editable_s: editableMs === null ? null : +(editableMs / 1000).toFixed(2), state: JSON.parse(state), stdout: logs };
    await fs.writeFile(path.join(outDir, `app-${i}-${tag}.log`), logs, "utf8");
    app.push(item); records.push(item);
  } catch (e) {
    records.push({ type: "app_open", run: i, status: "BLOCKED", error: String(e), elapsed_s: +((performance.now() - t0) / 1000).toFixed(2) });
  } finally {
    if (session) await session.close();
  }
}

// Read-only Excel COM open, one isolated instance, with a 10 minute ceiling.
const excelScript = `$ErrorActionPreference='Stop'; $before=@(Get-Process EXCEL -ErrorAction SilentlyContinue | ForEach-Object Id); $x=$null; $wb=$null; $mine=@(); try { if($before.Count){ throw 'Excel already running; refusing to attach to or close another session' }; $typ=[Type]::GetTypeFromProgID('Excel.Application'); if(-not $typ){ throw 'Excel ProgID unavailable' }; $x=[Activator]::CreateInstance($typ); $mine=@(Get-Process EXCEL -ErrorAction SilentlyContinue | Where-Object { $before -notcontains $_.Id } | ForEach-Object Id); if(-not $mine.Count){ throw 'Excel COM did not start an isolated EXCEL process' }; $x.Visible=$false; $x.DisplayAlerts=$false; $t=[Diagnostics.Stopwatch]::StartNew(); $wb=$x.Workbooks.Open('${source.replace(/'/g, "''")}',0,$true); $t.Stop(); if($null -eq $wb -or $wb.Worksheets.Count -lt 1){ throw 'Excel COM returned no workbook with worksheets for lan14.xlsx' }; [pscustomobject]@{status='OK';openMs=$t.ElapsedMilliseconds;fullName=$wb.FullName;name=$wb.Name;sheets=$wb.Sheets.Count;worksheets=$wb.Worksheets.Count;readOnly=$wb.ReadOnly;pid=$mine[0]}|ConvertTo-Json -Compress } catch { [pscustomobject]@{status='BLOCKED';reason=$_.Exception.Message}|ConvertTo-Json -Compress } finally { if($wb){try{$wb.Close($false)}catch{}}; if($x){try{$x.Quit()}catch{}}; foreach($id in $mine){$p=Get-Process -Id $id -ErrorAction SilentlyContinue; if($p){Stop-Process -Id $id -Force -ErrorAction SilentlyContinue}} }`;
const excel = await runChild("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", excelScript], 660000).catch(e => ({ code: 1, stdout: "", stderr: String(e) }));
records.push({ type: "excel_com", output: excel.stdout.trim(), stderr: excel.stderr.trim() });
if (excelOnly) {
  await fs.writeFile(path.join(outDir, "excel-com.json"), excel.stdout.trim() || JSON.stringify({ status: "BLOCKED", reason: excel.stderr.trim() }), "utf8");
  console.log(excel.stdout.trim() || `BLOCKED: ${excel.stderr.trim()}`);
  process.exit(0);
}

const phases = {};
const logPatterns = [
  ["app_soffice_convert", /uno_load_and_store:\s*([\d.]+) ms app=sheet bytes=257170257/g],
  ["python_overlay", /sheet_open_stage:\s*([\d.]+) ms phase=native_overlay/g],
  ["python_optimize_fods", /sheet_open_stage:\s*([\d.]+) ms phase=optimize_fods/g],
  ["python_payload", /sheet_open_stage:\s*([\d.]+) ms phase=build_compact_payload/g],
  ["js_parse_fods", /parseFods:\s*([\d.]+) ms/g],
  ["js_load_from_fods", /loadFromFods:\s*([\d.]+) ms/g],
  ["js_payload_model", /buildSheetPayloadModel:\s*([\d.]+) ms/g],
  ["js_load_from_payload", /loadFromPayload:\s*([\d.]+) ms/g],
  ["js_first_grid_render", /first grid render:\s*([\d.]+) ms/g],
  ["js_first_layout", /first layout:\s*([\d.]+) ms/g],
];
for (const [name, re] of logPatterns) {
  const values = [];
  for (const a of app) for (const m of a.stdout.matchAll(re)) values.push(Number(m[1]));
  phases[name] = summarize(values);
}
const result = {
  source, bytes: (await fs.stat(source)).size, appRuns: app.length,
  stages: phases, loHeadless: summarize(loMs),
  quickView: summarize(app.map(x => x.quickView_s * 1000)),
  editable: summarize(app.map(x => x.editable_s * 1000)),
  excelCom: excel.stdout.trim() || `BLOCKED: ${excel.stderr.trim() || "no result"}`,
  records,
};
await fs.writeFile(path.join(outDir, "measurements.json"), JSON.stringify(result, null, 2), "utf8");
console.log(JSON.stringify({ output: path.join(outDir, "measurements.json"), stages: result.stages, loHeadless: result.loHeadless, quickView: result.quickView, editable: result.editable, excelCom: result.excelCom }, null, 2));
