import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { spawn, execFileSync } from "node:child_process";
import { createServer, createConnection } from "node:net";

const root = path.resolve(import.meta.dirname, "../..");
const bootstrap = path.join(import.meta.dirname, "ch9-proof-bootstrap.py");
const toolsRoot = process.env.VNO_PLAYWRIGHT_ROOT || "C:/Users/3T Computer/AppData/Local/Temp/vno-playwright-tools";
const { chromium } = await import(pathToFileURL(path.join(toolsRoot, "node_modules/playwright-core/index.mjs")));
const scratch = await fs.mkdtemp(path.join(os.tmpdir(), "ch9-desktop-"));
const fixture = path.join(scratch, "small.xlsx");
const dataName = `VNOffice-CH9-Proof-${process.pid}`;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const ps = script => execFileSync("powershell", ["-NoProfile", "-Command", script], { encoding: "utf8", windowsHide: true }).trim();
const python = (...args) => execFileSync("python", [bootstrap, ...args], { cwd: root, encoding: "utf8", windowsHide: true }).trim();
const alive = rows => JSON.parse(python("inspect", JSON.stringify(rows)));
let passes = 0;
function pass(name, detail) { passes++; console.log(`PASS\t${name}\t${JSON.stringify(detail)}`); }
async function memoryGate() {
  for (;;) {
    const value = JSON.parse(ps("$a=@(Get-CimInstance Win32_Process | Where-Object {$_.Name -match 'python' -and $_.CommandLine -match '_batch_audit|batch_document_audit'}); $o=Get-CimInstance Win32_OperatingSystem; @{freeGB=$o.FreePhysicalMemory/1MB; audits=$a.Count}|ConvertTo-Json -Compress"));
    console.log(`RAM_GATE\t${JSON.stringify(value)}`);
    if (value.audits === 0 && value.freeGB > 3) return;
    await sleep(15000);
  }
}
async function freePort() {
  return new Promise(resolve => { const s = createServer(); s.listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => resolve(p)); }); });
}
async function waitForUno(port) {
  for (let i = 0; i < 600; i++) {
    const ready = await new Promise(resolve => {
      const socket = createConnection({ host: "127.0.0.1", port });
      socket.setTimeout(200);
      socket.once("connect", () => { socket.destroy(); resolve(true); });
      socket.once("error", () => { socket.destroy(); resolve(false); });
      socket.once("timeout", () => { socket.destroy(); resolve(false); });
    });
    if (ready) return;
    await sleep(200);
  }
  throw new Error("isolated LibreOffice sentinel did not become ready");
}
const sessions = [];
async function start() {
  await memoryGate();
  const port = await freePort();
  const child = spawn("python", [bootstrap, "desktop", String(port), dataName, fixture], { cwd: root, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  const session = { child, output: "" }; sessions.push(session);
  child.stdout.on("data", b => { session.output += b; }); child.stderr.on("data", b => { session.output += b; });
  for (let i = 0; i < 150; i++) {
    assert.equal(child.exitCode, null, session.output.slice(-1500));
    try { if ((await fetch(`http://127.0.0.1:${port}/json/version`)).ok) break; } catch {}
    await sleep(200);
  }
  session.browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
  for (let i = 0; i < 100; i++) {
    session.page = session.browser.contexts()[0].pages().find(p => p.url().includes("localhost"));
    if (session.page) break;
    await sleep(200);
  }
  await session.page.waitForSelector(".vno-sheet-container", { timeout: 30000 });
  await session.page.waitForFunction(() => window.__vnoAppInstance?.adapter && window.pywebview?.api?.proof_records);
  session.page.setDefaultTimeout(120000);
  return session;
}
async function open(session) {
  await session.page.evaluate(async () => {
    await window.pywebview.api.proof_select_fixture();
    await window.__vnoAppInstance.adapter.open();
  });
  assert.ok(await session.page.evaluate(() => window.__vnoAppInstance.adapter.serializeToFods().includes("CH9 desktop proof")));
}
async function save(session) {
  const result = await session.page.evaluate(async fixture => window.pywebview.api.save_document_in_place(window.__vnoAppInstance.adapter.serializeToFods(), "sheet", fixture, fixture), fixture);
  assert.equal(result.status, "ok", JSON.stringify(result));
  return result;
}
async function print(session) {
  const prepared = await session.page.evaluate(async fixture => window.pywebview.api.prepare_print_document("sheet", window.__vnoAppInstance.adapter.serializeToFods(), "CH9", fixture, true), fixture);
  assert.equal(prepared.status, "ok", JSON.stringify(prepared));
  const dest = path.join(scratch, "proof.pdf");
  const printed = await session.page.evaluate(async ({ id, dest }) => window.pywebview.api.print_document(id, { printer: "Microsoft Print to PDF", copies: 1, pageRange: "", destinationPath: dest }), { id: prepared.sessionId, dest });
  assert.equal(printed.status, "ok", JSON.stringify(printed));
  assert.equal((await fs.readFile(dest)).subarray(0, 5).toString(), "%PDF-");
  return { prepared, printed, bytes: (await fs.stat(dest)).size };
}
async function close(session) {
  const closed = session.page.waitForEvent("close", { timeout: 15000 });
  await session.page.evaluate(() => window.pywebview.api.close_current_window());
  await closed;
  await sleep(5000);
  assert.equal(session.child.exitCode, 0, session.output.slice(-1500));
  await session.browser.close();
}

// Independent hidden Office + isolated headless LibreOffice represent unrecorded user sessions.
const sentinelScript = path.join(scratch, "office-sentinel.ps1");
const ready = path.join(scratch, "office-ready.json");
const stop = path.join(scratch, "office-stop");
await fs.writeFile(sentinelScript, `param([string]$Ready,[string]$Stop)
$prior=@(Get-Process EXCEL -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Id)
$app=$null; $owned=$false
try {
 $app=New-Object -ComObject Excel.Application
 Add-Type -Namespace CH9 -Name WindowOwner -MemberDefinition '[DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint p);'
 [uint32]$officePid=0; [void][CH9.WindowOwner]::GetWindowThreadProcessId([IntPtr]$app.Hwnd,[ref]$officePid)
 $owned=($officePid -gt 0 -and $prior -notcontains [int]$officePid)
 if(-not $owned){throw 'COM returned an existing user process'}
 $app.Visible=$false; $app.DisplayAlerts=$false
 @{pid=[int]$officePid;created_at=[string](Get-Process -Id $officePid).StartTime.ToUniversalTime().ToFileTimeUtc()} | ConvertTo-Json -Compress | Set-Content -Encoding ASCII -LiteralPath $Ready
 while(-not (Test-Path -LiteralPath $Stop)){Start-Sleep -Milliseconds 200}
} finally {if($owned -and $app){$app.Quit()}; if($app){[void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($app)}}
`);
let office, libreoffice;
let loIdentities = [];
let failed = false;
try {
  await memoryGate();
  python("fixture", fixture);
  const baseline = JSON.parse(ps("$p=@(Get-Process EXCEL,WINWORD,POWERPNT,soffice,soffice.bin -ErrorAction SilentlyContinue | ForEach-Object {@{pid=$_.Id;created_at=[string]$_.StartTime.ToUniversalTime().ToFileTimeUtc()}}); ConvertTo-Json -InputObject $p -Compress"));
  office = spawn("powershell", ["-NoProfile", "-File", sentinelScript, ready, stop], { windowsHide: true, stdio: "ignore" });
  for (let i = 0; i < 100; i++) { try { await fs.access(ready); break; } catch {} await sleep(200); }
  const officeIdentity = JSON.parse(await fs.readFile(ready, "utf8"));
  const soffice = ps("(Get-Content main.py | Out-Null); & python -c 'import main; print(main.find_soffice())'");
  const loPort = await freePort();
  libreoffice = spawn(soffice, [`-env:UserInstallation=${pathToFileURL(path.join(scratch, "user-lo-profile"))}`, "--headless", "--norestore", "--nodefault", `--accept=socket,host=127.0.0.1,port=${loPort};urp;StarOffice.ComponentContext`], { windowsHide: true, stdio: "ignore" });
  // A brand-new LO profile can restart soffice.bin during initialization.
  // The UNO accept socket proves initialization finished before identities are captured.
  await waitForUno(loPort);
  loIdentities = JSON.parse(execFileSync("python", ["-c", "import main,json,sys; t=main._PROCESS_TRACKER_MODULE; ids=[int(sys.argv[1])]+[p for p,_ in t.process_tree(int(sys.argv[1]))]; print(json.dumps([{'pid':p,'created_at':t.process_identity(p)} for p in ids if t.process_identity(p)]))", String(libreoffice.pid)], { cwd: root, encoding: "utf8" }));
  assert.ok(loIdentities.length > 0);
  // Only controlled sentinels are guaranteed to remain open throughout this test.
  // Other agents may legitimately close processes present in the initial snapshot.
  const protectedRows = [officeIdentity, ...loIdentities];
  console.log(`SENTINELS_READY\t${JSON.stringify(protectedRows)}`);
  const first = await start();
  await first.page.waitForSelector(".vno-performance-enabled", { state: "attached", timeout: 30000 });
  await first.page.evaluate(() => window.__vnoAppInstance.helpPanel.open());
  const checkbox = first.page.locator(".vno-performance-enabled");
  await checkbox.waitFor({ state: "visible" });
  assert.equal(await checkbox.isChecked(), false);
  await checkbox.check();
  await first.page.waitForFunction(async () => (await window.pywebview.api.get_performance_log_settings()).enabled === true);
  pass("CH-9.5 UI opt-in", { defaultEnabled: false, enabled: true });
  await open(first); const saved = await save(first); const printed = await print(first);
  pass("CH-9.4/9.5 XLSX open/save/print PDF", { savedStatus: saved.status, ...printed });
  const logPath = await first.page.evaluate(() => window.pywebview.api.proof_log_path());
  const lines = (await fs.readFile(logPath, "utf8")).trim().split("\n");
  const logs = lines.map(JSON.parse);
  for (const op of ["open", "save", "print_prepare", "print"]) assert.ok(logs.some(l => l.operation === op && l.outcome === "ok"), op);
  assert.ok(logs.every(l => typeof l.memory_bytes === "number" && l.memory_bytes > 0));
  pass("CH-9.5 JSONL operations", logs);
  for (let i = 0; i < 3; i++) {
    // Valid duplicate test records fill only this isolated proof log to the production limit.
    const sample = lines[0] + "\n";
    await fs.writeFile(logPath, sample.repeat(Math.floor(5 * 1024 * 1024 / Buffer.byteLength(sample))));
    await save(first);
  }
  const rotated = [];
  for (const suffix of ["", ".1", ".2"]) { const p = logPath.replace(/\.jsonl$/, `${suffix}.jsonl`); rotated.push({ file: path.basename(p), bytes: (await fs.stat(p)).size }); }
  assert.ok(rotated.every(f => f.bytes <= 5 * 1024 * 1024));
  const files = (await fs.readdir(path.dirname(logPath))).filter(f => /^performance(?:\.\d+)?\.jsonl$/.test(f));
  assert.equal(files.length, 3);
  pass("CH-9.5 rotation 5MB x 3", rotated);
  const recorded = await first.page.evaluate(() => window.pywebview.api.proof_records());
  assert.ok(recorded.length > 0);
  assert.ok(recorded.every(r => !protectedRows.some(p => p.pid === r.pid && p.created_at === r.created_at)), "user sentinel was recorded as app-owned");
  assert.deepEqual(alive(protectedRows), protectedRows, "sentinel changed before normal close");
  await close(first);
  assert.equal(alive(recorded).length, 0);
  assert.deepEqual(alive(protectedRows), protectedRows, "normal cleanup touched a user sentinel");
  pass("CH-9.4 normal close + 5s", { recorded: recorded.length, alive: 0, identities: recorded });
  const second = await start(); await open(second);
  await second.page.evaluate(() => window.pywebview.api.proof_hold_com_worker());
  // Fire the real print operation without awaiting it, then observe its durable ledger.
  await second.page.evaluate(fixture => {
    window.__ch9PendingPrint = window.pywebview.api.prepare_print_document("sheet", window.__vnoAppInstance.adapter.serializeToFods(), "CH9 interrupted", fixture, true);
  }, fixture);
  let beforeKill;
  for (let i = 0; i < 600; i++) {
    beforeKill = await second.page.evaluate(() => window.pywebview.api.proof_records());
    if (beforeKill.some(r => r.role === "office-com")) break;
    await sleep(200);
  }
  assert.ok(beforeKill.some(r => r.role === "office-com"), "hidden COM job never recorded an Office PID");
  assert.ok(beforeKill.every(r => !protectedRows.some(p => p.pid === r.pid && p.created_at === r.created_at)), "user sentinel was recorded in interrupted job");
  await sleep(1000);
  const liveBefore = alive(beforeKill); assert.ok(liveBefore.length > 0);
  // Deliberately kill only main: /T would remove the orphans that this proof must exercise.
  execFileSync("taskkill", ["/F", "/PID", String(second.child.pid)], { stdio: "ignore" });
  await sleep(1500); await second.browser.close().catch(() => {});
  const orphans = alive(beforeKill); assert.ok(orphans.length > 0);
  assert.deepEqual(alive(protectedRows), protectedRows, "sentinel changed before startup sweep");
  const third = await start();
  assert.equal(alive(orphans).length, 0);
  const survivingProtected = alive(protectedRows);
  console.log(`ISOLATION_EVIDENCE\t${JSON.stringify({ expected: protectedRows, actual: survivingProtected, otherProcessesObservedBefore: baseline.length, otherProcessesStillAlive: alive(baseline).length })}`);
  assert.deepEqual(survivingProtected, protectedRows);
  pass("CH-9.4 next launch orphan sweep + user isolation", { mainKilled: second.child.pid, faultInjection: "120s pause in real COM worker after hidden activation/identity registration", liveBeforeKill: liveBefore.length, orphansBeforeRestart: orphans.length, aliveAfterRestart: 0, protectedBefore: protectedRows.length, protectedAfter: survivingProtected.length, sweepTrace: third.output.split(/\r?\n/).filter(l => l.includes("orphan_processes_swept")), orphanIdentities: orphans, protectedIdentities: protectedRows });
  await close(third);
} catch (error) {
  failed = true; console.log(`FAIL\t${error.stack}`);
} finally {
  for (const s of sessions) {
    if (s.child.exitCode === null) { try { await s.page?.evaluate(() => window.pywebview.api.close_current_window()); } catch {} await sleep(2000); }
    if (s.child.exitCode === null) { try { execFileSync("taskkill", ["/F", "/PID", String(s.child.pid)], { stdio: "ignore" }); } catch {} }
    await s.browser?.close().catch(() => {});
  }
  if (office) { await fs.writeFile(stop, "stop"); for (let i = 0; i < 50 && office.exitCode === null; i++) await sleep(100); }
  if (loIdentities.length) {
    execFileSync("python", ["-c", "import main,json,sys; t=main._PROCESS_TRACKER_MODULE; rows=json.loads(sys.argv[1]); [t._terminate(r['pid']) for r in reversed(rows) if t.process_identity(r['pid'])==r['created_at']]", JSON.stringify(loIdentities)], { cwd: root, windowsHide: true });
  }
  console.log(`KET QUA CH9 DESKTOP: ${passes} PASS, ${failed ? 1 : 0} FAIL; scratch=${scratch}`);
}
if (failed) process.exitCode = 1;
