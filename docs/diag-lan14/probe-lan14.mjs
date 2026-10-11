// Do luong hieu nang mo/luu lan14.xlsx theo tung giai doan. Chi doc, khong sua code app.
// Chay: node docs/diag-lan14/probe-lan14.mjs <runLabel> [--save]
// Viet ra: docs/diag-lan14/samples-<timestamp>.jsonl (+ trace/stdout/perflog ke ben).
import { createWriteStream } from "node:fs";
import { open, mkdir, copyFile, stat, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { launchApp } from "../../tests/live/cdp/session.mjs";
import { sleep } from "../../tests/live/cdp/client.mjs";

const execFileP = promisify(execFile);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const SOURCE_XLSX = "E:\\VN OFice\\file test\\lan\\lan14.xlsx";
const LOCAL_APP_DATA = process.env.VNO_LAN14_LOCALAPPDATA
  || "E:\\VNOffice-profiles\\opencode-lan14";
const PROFILE_ROOT = path.join(LOCAL_APP_DATA, "VNOffice");
const PERF_SETTINGS = path.join(PROFILE_ROOT, "performance", "settings.json");
const PERF_LOG = path.join(PROFILE_ROOT, "performance", "performance.jsonl");
const SAMPLE_MS = 5000;
const SAVE_SAMPLE_MS = 2000;
const OPEN_LIMIT_MS = 20 * 60 * 1000;
const SAVE_LIMIT_MS = 20 * 60 * 1000;
const OPEN_TAIL_MS = 60 * 1000;
const SAVE_TAIL_MS = 10 * 1000;
const FREE_RAM_MIN_KB = 6 * 1024 * 1024;

const stamp = () => new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "").replace("T", "-");

function treeCommand(rootPid) {
  return [
    "$ErrorActionPreference='SilentlyContinue'",
    `$r=${rootPid}`,
    "$all=@()",
    "Get-CimInstance Win32_Process | ForEach-Object { $all += [pscustomobject]@{ p=[int]$_.ProcessId; pp=[int]$_.ParentProcessId; n=[string]$_.Name; ws=[math]::Round($_.WorkingSetSize/1MB,1); k=[int64]$_.KernelModeTime; u=[int64]$_.UserModeTime } }",
    "$bp=@{}",
    "foreach($x in $all){ if(-not $bp.ContainsKey($x.pp)){ $bp[$x.pp]=@() }; $bp[$x.pp]+=$x }",
    "$q=New-Object 'System.Collections.Generic.Queue[int]'",
    "$q.Enqueue($r)",
    "$seen=@{}",
    "$kids=@()",
    "while($q.Count -gt 0){ $c=$q.Dequeue(); if($seen.ContainsKey($c)){ continue }; $seen[$c]=$true; if($bp.ContainsKey($c)){ foreach($k in $bp[$c]){ $q.Enqueue([int]$k.p); $kids+=$k } } }",
    "$root=$all | Where-Object { $_.p -eq $r }",
    "$ids=@($r)",
    "foreach($k in $kids){ $ids += [int]$k.p }",
    "$peaks=@()",
    "foreach($id in $ids){ $pr=Get-Process -Id $id -ErrorAction SilentlyContinue; if($pr -and $pr.Id){ $peaks += [pscustomobject]@{ id=[int]$pr.Id; name=[string]$pr.ProcessName; ws=[math]::Round($pr.WorkingSet64/1MB,1); peakWS=[math]::Round($pr.PeakWorkingSet64/1MB,1) } } }",
    "[pscustomobject]@{ root=$root; children=$kids; peaks=$peaks } | ConvertTo-Json -Depth 6 -Compress",
  ].join("\r\n");
}

async function readTree(rootPid) {
  const { stdout } = await execFileP(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-Command", treeCommand(rootPid)],
    { timeout: 45000, maxBuffer: 32 * 1024 * 1024, windowsHide: true },
  );
  const text = String(stdout || "").trim();
  if (!text) throw new Error("powershell tree returned empty output");
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    if (start < 0) throw new Error("powershell tree output is not JSON: " + text.slice(0, 200));
    parsed = JSON.parse(text.slice(start));
  }
  const root = parsed.root || null;
  const children = Array.isArray(parsed.children) ? parsed.children : (parsed.children ? [parsed.children] : []);
  const peaks = Array.isArray(parsed.peaks) ? parsed.peaks : (parsed.peaks ? [parsed.peaks] : []);
  const procs = (root ? [root] : []).concat(children);
  const named = procs.filter(p => /^(python|pythonw|msedgewebview2|soffice)/i.test(String(p.n || "")));
  const total = procs.reduce((sum, p) => sum + (Number(p.ws) || 0), 0);
  const namedTotal = named.reduce((sum, p) => sum + (Number(p.ws) || 0), 0);
  const sofficePids = procs.filter(p => /soffice/i.test(String(p.n || ""))).map(p => p.p);
  const top = procs.slice().sort((a, b) => (Number(b.ws) || 0) - (Number(a.ws) || 0)).slice(0, 25);
  const peakTotal = peaks.reduce((sum, p) => sum + (Number(p.peakWS) || 0), 0);
  const cpuSec = p => ((Number(p.k) || 0) + (Number(p.u) || 0)) / 1e7;
  const cpuTreeSec = Math.round(procs.reduce((sum, p) => sum + cpuSec(p), 0) * 1000) / 1000;
  const cpuTop = procs.slice().sort((a, b) => cpuSec(b) - cpuSec(a)).slice(0, 6)
    .map(p => ({ p: p.p, n: p.n, cpuSec: Math.round(cpuSec(p) * 1000) / 1000 }));
  return { rootPid: rootPid, root, childCount: children.length, procs: top, treeWsMB: Math.round(total * 10) / 10, namedTreeWsMB: Math.round(namedTotal * 10) / 10, sofficePids, peaks, peakTotalMB: Math.round(peakTotal * 10) / 10, cpuTreeSec, cpuTop };
}

async function freeRamKB() {
  const { stdout } = await execFileP(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-Command", "(Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory"],
    { timeout: 30000, windowsHide: true },
  );
  return parseInt(String(stdout).trim(), 10);
}

const PAGE_EXPR = `(() => {
  const out = { tPage: Math.round(performance.now()) };
  try {
    const m = performance.memory;
    out.memory = m ? { usedJSHeapSize: m.usedJSHeapSize, totalJSHeapSize: m.totalJSHeapSize, jsHeapSizeLimit: m.jsHeapSizeLimit } : null;
  } catch (e) { out.memoryError = String(e); }
  try {
    out.startupEvents = (window.__vnoStartupEvents || []).map(e => ({ name: e.name, elapsedMs: Math.round(e.elapsedMs) }));
    out.docOpenComplete = out.startupEvents.some(e => e.name === "document_open_complete");
  } catch (e) { out.startupError = String(e); }
  try {
    const g = window.__vnoAppInstance && window.__vnoAppInstance.adapter && window.__vnoAppInstance.adapter.grid;
    out.cellsSize = g && g.cellsData ? g.cellsData.size : null;
    out.sheetCount = g && g.sheets ? g.sheets.length : null;
    out.rowCount = g && g.rowCount ? g.rowCount : null;
  } catch (e) { out.cellsError = String(e); }
  try { out.domCells = document.querySelectorAll(".vno-grid-cell").length; } catch (e) { out.domCellsError = String(e); }
  try { out.sourceFilePath = (window.__vnoAppInstance && window.__vnoAppInstance.adapter && window.__vnoAppInstance.adapter.sourceFilePath) || null; } catch (e) {}
  try { out.vnoDiag = window.__vnoDiag || null; } catch (e) { out.vnoDiagError = String(e); }
  return JSON.stringify(out);
})()`;

const HOOK_EXPR = `(() => {
  const d = window.__vnoDiag = window.__vnoDiag || {};
  if (d.installed && d.hasAdapter && d.moInstalled) return JSON.stringify({ installed: true, already: true, at: d.hookInstalledAt });
  if (d.hookInstalledAt === undefined) d.hookInstalledAt = Math.round(performance.now());
  d.renderMarks = d.renderMarks || [];
  d.hookAttempts = (d.hookAttempts || 0) + 1;
  const bridge = window.globalUnoBridge;
  if (bridge && !bridge.__vnoDiagWrapped) {
    bridge.__vnoDiagWrapped = true;
    const origOpen = bridge.openRealFile.bind(bridge);
    bridge.openRealFile = async function (...args) {
      const t = Math.round(performance.now());
      d.openCallStart = t;
      try {
        const res = await origOpen(...args);
        d.openCallEnd = Math.round(performance.now());
        d.openStatus = res && res.status;
        d.openHasSheetPayload = !!(res && res.sheetPayload);
        d.openContentChars = res && typeof res.content === "string" ? res.content.length : null;
        d.openResultKeys = res ? Object.keys(res).length : null;
        return res;
      } catch (e) {
        d.openCallEnd = Math.round(performance.now());
        d.openError = String(e);
        throw e;
      }
    };
    const origTransport = bridge.saveRealFileInPlace.bind(bridge);
    bridge.saveRealFileInPlace = async function (...args) {
      d.transportStart = Math.round(performance.now());
      try {
        const res = await origTransport(...args);
        d.transportEnd = Math.round(performance.now());
        d.transportStatus = res && res.status;
        d.transportMessage = res && res.message ? String(res.message).slice(0, 240) : null;
        d.transportPath = res && res.path ? String(res.path) : null;
        return res;
      } catch (e) {
        d.transportEnd = Math.round(performance.now());
        d.transportError = String(e);
        throw e;
      }
    };
  }
  const inst = window.__vnoAppInstance;
  const a = inst && inst.adapter;
  if (a && !a.__vnoDiagWrapped) {
    a.__vnoDiagWrapped = true;
    if (typeof a.loadFromPayload === "function") {
      const orig = a.loadFromPayload.bind(a);
      a.loadFromPayload = async function (...args) {
        const t0 = Math.round(performance.now());
        d.hydrateStart = t0;
        try {
          const r = await orig(...args);
          d.hydrateEnd = Math.round(performance.now());
          d.hydrateResult = r;
          d.cellsAfterHydrate = a.grid && a.grid.cellsData ? a.grid.cellsData.size : null;
          return r;
        } catch (e) {
          d.hydrateEnd = Math.round(performance.now());
          d.hydrateError = String(e);
          throw e;
        }
      };
    }
    if (typeof a.loadFromFods === "function") {
      const origF = a.loadFromFods.bind(a);
      a.loadFromFods = function (...args) {
        const t0 = Math.round(performance.now());
        d.loadFromFodsStart = t0;
        try {
          const r = origF(...args);
          d.loadFromFodsEnd = Math.round(performance.now());
          d.loadFromFodsResult = r;
          d.cellsAfterFods = a.grid && a.grid.cellsData ? a.grid.cellsData.size : null;
          return r;
        } catch (e) {
          d.loadFromFodsEnd = Math.round(performance.now());
          d.loadFromFodsError = String(e);
          throw e;
        }
      };
    }
    if (typeof a.serializeToFods === "function") {
      const origS = a.serializeToFods.bind(a);
      a.serializeToFods = function (...args) {
        const t0 = performance.now();
        const r = origS(...args);
        d.serializeMs = Math.round(performance.now() - t0);
        d.serializeStart = Math.round(t0);
        d.serializeEnd = Math.round(performance.now());
        d.fodsChars = typeof r === "string" ? r.length : null;
        return r;
      };
    }
    if (typeof a.save === "function") {
      const origSave = a.save.bind(a);
      a.save = async function (...args) {
        d.adapterSaveStart = Math.round(performance.now());
        try {
          const r = await origSave(...args);
          d.adapterSaveEnd = Math.round(performance.now());
          d.adapterSaveResult = r;
          return r;
        } catch (e) {
          d.adapterSaveEnd = Math.round(performance.now());
          d.adapterSaveError = String(e);
          throw e;
        }
      };
    }
  }
  const gridEl = document.querySelector(".vno-sheet-container");
  if (gridEl && !d.moInstalled) {
    try {
      const mo = new MutationObserver(() => {
        if (d.renderMarks.length < 60) d.renderMarks.push(Math.round(performance.now()));
      });
      mo.observe(gridEl, { subtree: true, childList: true, characterData: true });
      d.moInstalled = true;
    } catch (e) { d.moError = String(e); }
  }
  d.hasAdapter = !!a;
  d.hasBridge = !!bridge;
  d.installed = true;
  return JSON.stringify({ installed: true, hasAdapter: !!a, hasBridge: !!bridge, mo: !!d.moInstalled, at: d.hookInstalledAt, attempts: d.hookAttempts });
})()`;

async function main() {
  const runLabel = process.argv[2] || "1";
  const doSave = process.argv.includes("--save");
  const fileArgIndex = process.argv.indexOf("--file");
  const sourceXlsx = fileArgIndex >= 0 && process.argv[fileArgIndex + 1] ? process.argv[fileArgIndex + 1] : SOURCE_XLSX;
  const id = stamp();
  const samplesPath = path.join(HERE, `samples-${id}.jsonl`);
  const tracePath = path.join(HERE, `trace-${id}.jsonl`);
  const logPath = path.join(HERE, `stdout-${id}.log`);
  const launchSnapshotPath = path.join(HERE, `launch-output-${id}.txt`);
  const perfLogCopyPath = path.join(HERE, `perflog-${id}.jsonl`);
  const tempDir = path.join(os.tmpdir(), "vno_lan14_diag", `run-${id}`);
  const filePath = path.join(tempDir, "lan14.xlsx");

  if (process.argv.includes("--selftest-tree")) {
    const t = await readTree(process.pid);
    console.log(JSON.stringify(t, null, 2));
    return;
  }

  await mkdir(HERE, { recursive: true });
  await mkdir(tempDir, { recursive: true });

  const samples = createWriteStream(samplesPath, { flags: "a" });
  const logStream = createWriteStream(logPath, { flags: "a" });
  const rec = obj => { samples.write(JSON.stringify({ nodeTs: Date.now(), ...obj }) + "\n"); };
  const rawLog = (stream, line) => { logStream.write(`${new Date().toISOString()} ${stream} ${line}\n`); };

  let t0 = Date.now();
  let session = null;
  let perfLogStartBytes = 0;
  let traceRead = 0;
  let traceBuffer = "";
  let lineBuffer = "";
  let pollTimer = null;

  const flushLines = (chunk, stream, source) => {
    lineBuffer += chunk;
    const parts = lineBuffer.split(/\r?\n/);
    lineBuffer = parts.pop();
    for (const line of parts) {
      if (!line) continue;
      rawLog(stream, line);
      rec({ type: "stdout", stream, source, line });
    }
  };

  const pollTrace = async () => {
    try {
      const info = await stat(tracePath);
      if (info.size <= traceRead) return;
      const handle = await open(tracePath, "r");
      try {
        const length = info.size - traceRead;
        const buffer = Buffer.alloc(length);
        await handle.read(buffer, 0, length, traceRead);
        traceRead = info.size;
        traceBuffer += buffer.toString("utf8");
        const parts = traceBuffer.split(/\r?\n/);
        traceBuffer = parts.pop();
        for (const line of parts) {
          if (!line.trim()) continue;
          try {
            rec({ type: "trace", ...JSON.parse(line) });
          } catch (e) {
            rec({ type: "trace-unparsed", line, error: String(e) });
          }
        }
      } finally {
        await handle.close();
      }
    } catch (e) {
      if (e && e.code !== "ENOENT") rec({ type: "trace-poll-error", error: String(e) });
    }
  };

  const freeKB = await freeRamKB();
  rec({
    type: "meta",
    runLabel,
    doSave,
    id,
    root: ROOT,
    source: sourceXlsx,
    localAppData: LOCAL_APP_DATA,
    samplesPath,
    tracePath,
    logPath,
    env: { VNO_PERF_DEBUG: "1", VNO_STARTUP_TRACE_FILE: tracePath },
    limits: { SAMPLE_MS, SAVE_SAMPLE_MS, OPEN_LIMIT_MS, SAVE_LIMIT_MS, OPEN_TAIL_MS, SAVE_TAIL_MS },
    freeRAMKBBeforeRun: freeKB,
    freeRAMEligible: Number.isFinite(freeKB) && freeKB > FREE_RAM_MIN_KB,
    nodeVersion: process.version,
  });
  if (!Number.isFinite(freeKB) || freeKB <= FREE_RAM_MIN_KB) {
    rec({ type: "blocked", reason: "free RAM below 6 GB before run", freeRAMKB: freeKB });
    samples.end();
    logStream.end();
    console.log("BLOCKED: free RAM = " + freeKB + " KB (need > " + FREE_RAM_MIN_KB + " KB)");
    process.exitCode = 1;
    return;
  }

  await copyFile(sourceXlsx, filePath);
  const sourceInfo = await stat(sourceXlsx);
  const copyInfo = await stat(filePath);
  rec({ type: "file-copy", source: sourceXlsx, sourceBytes: sourceInfo.size, copy: filePath, copyBytes: copyInfo.size });

  await mkdir(path.dirname(PERF_SETTINGS), { recursive: true });
  let perfExisted = false;
  try { perfExisted = (await stat(PERF_LOG)).size > 0; } catch { perfExisted = false; }
  perfLogStartBytes = perfExisted ? (await stat(PERF_LOG)).size : 0;
  await writeFile(PERF_SETTINGS, JSON.stringify({ enabled: true }), "utf8");
  rec({ type: "perf-log-settings", path: PERF_SETTINGS, content: { enabled: true }, perfLogBytesBefore: perfLogStartBytes });

  process.env.VNO_PERF_DEBUG = "1";
  process.env.VNO_STARTUP_TRACE_FILE = tracePath;

  pollTimer = setInterval(() => { void pollTrace(); }, 200);

  t0 = Date.now();
  rec({ type: "phase", phase: "process_start", t0 });
  let launchError = null;
  try {
    session = await launchApp("sheet", {
      filePath,
      localAppData: LOCAL_APP_DATA,
      root: ROOT,
      startTimeoutMilliseconds: 900000,
    });
  } catch (e) {
    launchError = String(e && e.stack ? e.stack : e);
  }
  const tUiReady = Date.now();
  if (launchError) {
    rec({ type: "blocked", phase: "launch", error: launchError, launchMs: tUiReady - t0 });
    clearInterval(pollTimer);
    samples.end();
    logStream.end();
    console.log("BLOCKED: launchApp failed: " + launchError);
    process.exitCode = 1;
    return;
  }
  rec({ type: "phase", phase: "ui_ready", tUiReady, launchMs: tUiReady - t0, appPid: session.child.pid, debugPort: session.debugPort });

  session.child.stdout.on("data", chunk => flushLines(chunk.toString(), "stdout", "child"));
  session.child.stderr.on("data", chunk => flushLines(chunk.toString(), "stderr", "child"));

  const launchSnapshot = session.output || "";
  if (launchSnapshot.length) flushLines(launchSnapshot, "stdout", "launch-snapshot");
  if (lineBuffer) { const rest = lineBuffer; lineBuffer = ""; rawLog("stdout", rest); rec({ type: "stdout", stream: "stdout", source: "launch-snapshot", line: rest, partial: true }); }
  await writeFile(launchSnapshotPath, launchSnapshot, "utf8");
  rec({
    type: "launch-output",
    path: launchSnapshotPath,
    chars: launchSnapshot.length,
    possiblyTruncated: launchSnapshot.length >= 30000,
    file: "tests/live/cdp/session.mjs",
  });

  const rootPid = session.child.pid;
  const cdp = session.cdp;

  let hookResult = null;
  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      hookResult = JSON.parse(await cdp.evaluate(HOOK_EXPR, { timeoutMilliseconds: 10000 }));
    } catch (e) {
      hookResult = { installed: false, error: String(e && e.message ? e.message : e) };
    }
    if (hookResult && hookResult.installed && hookResult.hasAdapter && hookResult.mo) break;
    await sleep(200);
  }
  rec({ type: "hook", ...hookResult });

  const detected = new Set();
  const detectPhases = (s, phase, nodeTs) => {
    const d = s.vnoDiag || {};
    const mark = (name, pageMs) => {
      const key = phase + ":" + name;
      if (detected.has(key)) return;
      detected.add(key);
      rec({ type: "phase-detected", phase, name, nodeTs, pageMs: pageMs === undefined ? null : pageMs });
    };
    if (s.cellsSize !== null && s.cellsSize !== undefined && s.cellsSize > 0) mark("cells_data_filled", null);
    if (d.openCallEnd !== undefined) mark("data_received_in_page", d.openCallEnd);
    if (d.hydrateEnd !== undefined) mark("hydrate_finished", d.hydrateEnd);
    if (d.hydrateEnd !== undefined && Array.isArray(d.renderMarks)) {
      const first = d.renderMarks.find(m => m > d.hydrateEnd);
      if (first !== undefined) mark("first_render_after_hydrate", first);
    }
    if (s.docOpenComplete) mark("document_open_complete", null);
    if (d.loadFromFodsEnd !== undefined) mark("loadFromFods_finished", d.loadFromFodsEnd);
    if (d.serializeEnd !== undefined) mark("save_serialize_finished", d.serializeEnd);
    if (d.transportEnd !== undefined) mark("save_transport_finished", d.transportEnd);
    if (d.adapterSaveEnd !== undefined) mark("save_adapter_finished", d.adapterSaveEnd);
    if (d.saveDoneAt !== undefined) mark("save_command_finished", d.saveDoneAt);
    if (d.saveErrorAt !== undefined) mark("save_command_error", d.saveErrorAt);
  };

  const sampleOnce = async (phase, i, prevTNode) => {
    const tNode = Date.now();
    const s = { type: "sample", phase, i, tNode, tMs: tNode - t0, cadenceMs: prevTNode ? tNode - prevTNode : null };
    try {
      const raw = await cdp.evaluate(PAGE_EXPR, { timeoutMilliseconds: 15000 });
      Object.assign(s, JSON.parse(raw));
    } catch (e) {
      s.pageEvalError = String(e && e.message ? e.message : e);
    }
    try {
      const tree = await readTree(rootPid);
      s.tree = { treeWsMB: tree.treeWsMB, namedTreeWsMB: tree.namedTreeWsMB, childCount: tree.childCount, sofficePids: tree.sofficePids, peakTotalMB: tree.peakTotalMB, cpuTreeSec: tree.cpuTreeSec };
      s.cpuTop = tree.cpuTop;
      s.procs = tree.procs;
      s.peaks = tree.peaks;
    } catch (e) {
      s.treeError = String(e && e.message ? e.message : e);
    }
    rec(s);
    detectPhases(s, phase, tNode);
    return s;
  };

  const sampleLoop = async (phase, cadence, limitMs, tailMs, isDone) => {
    let i = 0;
    let lastStart = Date.now();
    let prevTNode = null;
    let doneSince = null;
    while (true) {
      const startedAt = Date.now();
      const s = await sampleOnce(phase, i++, prevTNode);
      prevTNode = s.tNode;
      const now = Date.now();
      if (doneSince === null && isDone(s)) doneSince = now;
      if (doneSince !== null && now - doneSince >= tailMs) {
        rec({ type: "note", phase, note: "tail-window-elapsed", tailMs });
        break;
      }
      if (now - t0 >= limitMs) {
        rec({ type: "note", phase, note: "limit-reached", limitMs, elapsedMs: now - t0, doneSince });
        break;
      }
      lastStart += cadence;
      const wait = lastStart - Date.now();
      if (wait > 0) await sleep(wait);
      else lastStart = Date.now();
    }
  };

  try {
    await sampleLoop("open", SAMPLE_MS, OPEN_LIMIT_MS, OPEN_TAIL_MS, s => Boolean(s.docOpenComplete));
    rec({ type: "phase", phase: "open_sampling_done", tNode: Date.now(), elapsedMs: Date.now() - t0 });

    if (doSave) {
      const freeKB2 = await freeRamKB();
      rec({ type: "save-precheck", freeRAMKB: freeKB2, freeRAMEligible: Number.isFinite(freeKB2) && freeKB2 > FREE_RAM_MIN_KB });
      const pre = await cdp.evaluate(PAGE_EXPR, { timeoutMilliseconds: 15000 }).catch(e => null);
      if (pre) rec({ type: "save-presample", ...JSON.parse(pre) });

      let commandInfo = null;
      try {
        commandInfo = JSON.parse(await cdp.evaluate(`JSON.stringify({ hasHandler: globalCommandBus.hasHandler("common.file.save"), state: (globalCommandBus.getState && globalCommandBus.getState("common.file.save")) || null })`, { timeoutMilliseconds: 10000 }));
      } catch (e) {
        commandInfo = { error: String(e) };
      }
      rec({ type: "save-command-info", ...commandInfo });

      const useCommandBus = commandInfo && commandInfo.hasHandler;
      const triggerExpr = `(() => {
        const d = window.__vnoDiag = window.__vnoDiag || {};
        d.saveTriggeredAt = Math.round(performance.now());
        d.saveTriggerPath = ${JSON.stringify(useCommandBus ? "command-bus:common.file.save" : "adapter.save() direct (no command handler)")};
        const finish = p => Promise.resolve(p).then(r => { d.saveDoneAt = Math.round(performance.now()); d.saveResult = (r === true) ? "true" : String(r); }).catch(e => { d.saveErrorAt = Math.round(performance.now()); d.saveError = String(e); });
        d.saveScheduledAt = Math.round(performance.now());
        setTimeout(() => {
          d.saveStartedAt = Math.round(performance.now());
          try {
            finish(${useCommandBus ? `globalCommandBus.execute("common.file.save")` : `window.__vnoAppInstance.adapter.save()`});
          } catch (e) {
            d.saveErrorAt = Math.round(performance.now());
            d.saveError = String(e);
          }
        }, 0);
        return JSON.stringify({ fired: true, scheduled: true, path: d.saveTriggerPath, at: d.saveTriggeredAt });
      })()`;
      let fired = null;
      try {
        fired = await cdp.evaluate(triggerExpr, { timeoutMilliseconds: 15000 });
      } catch (e) {
        fired = { triggerError: String(e && e.message ? e.message : e) };
      }
      const saveT0 = Date.now();
      rec({ type: "phase", phase: "save_triggered", tNode: saveT0, trigger: fired });
      let early = null;
      for (let k = 0; k < 20; k++) {
        await sleep(250);
        try {
          early = JSON.parse(await cdp.evaluate(`JSON.stringify({ saveStartedAt: (window.__vnoDiag||{}).saveStartedAt, saveResult: (window.__vnoDiag||{}).saveResult, saveError: (window.__vnoDiag||{}).saveError, adapterSaveStart: (window.__vnoDiag||{}).adapterSaveStart })`, { timeoutMilliseconds: 15000 }));
        } catch {
          early = { probeError: "cdp evaluate failed during early save check" };
          break;
        }
        if (early.adapterSaveStart !== undefined) break;
        if (early.saveResult === "false" || early.saveError) break;
      }
      rec({ type: "save-early-check", ...(early || {}) });
      if (early && early.adapterSaveStart === undefined && early.saveResult === "false") {
        try {
          const fb = await cdp.evaluate(`(() => { const d = window.__vnoDiag; d.saveFallbackAt = Math.round(performance.now()); d.saveTriggerPath = String(d.saveTriggerPath) + " | fallback: adapter.save()"; delete d.saveDoneAt; delete d.saveResult; delete d.saveErrorAt; delete d.saveError; setTimeout(() => Promise.resolve(window.__vnoAppInstance.adapter.save()).then(r => { d.saveDoneAt = Math.round(performance.now()); d.saveResult = (r === true) ? "true" : String(r); }).catch(e => { d.saveErrorAt = Math.round(performance.now()); d.saveError = String(e); }), 0); return "fallback-scheduled"; })()`, { timeoutMilliseconds: 15000 });
          rec({ type: "save-fallback", fired: fb, reason: "command returned false before adapter.save started" });
        } catch (e) {
          rec({ type: "save-fallback-error", error: String(e && e.message ? e.message : e) });
        }
      }
      await sampleLoop("save", SAVE_SAMPLE_MS, SAVE_LIMIT_MS, SAVE_TAIL_MS, s => Boolean(s.vnoDiag && (s.vnoDiag.adapterSaveEnd !== undefined || s.vnoDiag.saveDoneAt !== undefined || s.vnoDiag.saveErrorAt !== undefined)));
      rec({ type: "phase", phase: "save_sampling_done", tNode: Date.now(), elapsedMs: Date.now() - saveT0 });
    }
  } catch (e) {
    rec({ type: "error", error: String(e && e.stack ? e.stack : e) });
  } finally {
    const finalSamples = [];
    try {
      const last = await cdp.evaluate(PAGE_EXPR, { timeoutMilliseconds: 15000 });
      finalSamples.push(JSON.parse(last));
    } catch (e) {
      finalSamples.push({ pageEvalError: String(e && e.message ? e.message : e) });
    }
    try {
      const tree = await readTree(rootPid);
      finalSamples.push({ tree });
    } catch (e) {
      finalSamples.push({ treeError: String(e && e.message ? e.message : e) });
    }
    rec({ type: "final", tNode: Date.now(), elapsedMs: Date.now() - t0, data: finalSamples });
    clearInterval(pollTimer);
    await pollTrace().catch(() => {});
    if (lineBuffer) { const rest = lineBuffer; lineBuffer = ""; rawLog("stdout", rest); rec({ type: "stdout", stream: "stdout", source: "child", line: rest, partial: true }); }
    try {
      const info = await stat(PERF_LOG);
      const handle = await open(PERF_LOG, "r");
      try {
        const length = info.size - perfLogStartBytes;
        if (length > 0) {
          const buffer = Buffer.alloc(length);
          await handle.read(buffer, 0, length, perfLogStartBytes);
          await writeFile(perfLogCopyPath, buffer);
          rec({ type: "perf-log-copy", path: perfLogCopyPath, bytes: length, startOffset: perfLogStartBytes });
        } else {
          rec({ type: "perf-log-copy", path: PERF_LOG, bytes: 0, note: "no new entries" });
        }
      } finally {
        await handle.close();
      }
    } catch (e) {
      rec({ type: "perf-log-copy-error", error: String(e) });
    }
    rec({ type: "end", tNode: Date.now(), elapsedMs: Date.now() - t0 });
    await new Promise(resolve => { samples.end(resolve); });
    logStream.end();
    if (session) {
      try { await session.close(); } catch (e) { console.error("close error: " + String(e)); }
    }
    console.log(JSON.stringify({ samplesPath, tracePath, logPath, perfLogCopyPath, elapsedMs: Date.now() - t0 }, null, 2));
  }
}

main().catch(error => {
  console.error("PROBE FAILED: " + (error && error.stack ? error.stack : String(error)));
  process.exitCode = 1;
});
