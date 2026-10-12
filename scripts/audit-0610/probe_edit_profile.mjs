// Profile CPU khi bat dau sua o va Enter tren tep lon: in top ham theo thoi gian rieng.
// Chay: VNO_APP_ROOT=<repo> node --experimental-websocket scripts/audit-0610/probe_edit_profile.mjs <LOCALAPPDATA> <tep.xlsx>
import { launchApp } from "../../tests/live/cdp/session.mjs";
import { mouseClick, press } from "../../tests/live/cdp/actions.mjs";
const [lad, file] = process.argv.slice(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const session = await launchApp("sheet", { localAppData: lad, filePath: file, startTimeoutMilliseconds: 600000, readyTimeoutMilliseconds: 600000 });
const send = (m, p) => session.cdp.send(m, p || {}, 600000);
try {
  const norm = file.replace(/\\/g, "/").toLowerCase();
  await session.cdp.waitFor(`(() => { const a = window.__vnoAppInstance?.adapter; const p = String(a?._sourcePath || a?.sourceFilePath || '').replace(/\\\\/g, '/').toLowerCase(); return p === ${JSON.stringify(norm)}; })()`, { timeoutMilliseconds: 600000, intervalMilliseconds: 250 });
  await sleep(3000);
  await send("Profiler.enable");
  await send("Profiler.setSamplingInterval", { interval: 1000 });
  await send("Profiler.start");
  await mouseClick(session.cdp, 860, 420);
  await press(session.cdp, "t", { shift: true }, 20);
  await press(session.cdp, "Enter", {}, 20);
  await sleep(1500);
  const res = await send("Profiler.stop");
  const profile = (res.result || res).profile;
  const nodes = new Map(profile.nodes.map((n) => [n.id, n]));
  const self = new Map();
  const dt = profile.timeDeltas;
  profile.samples.forEach((id, i) => { const n = nodes.get(id); const cf = n.callFrame; const key = `${cf.functionName || "(anon)"} ${String(cf.url).split("/").slice(-2).join("/")}:${cf.lineNumber + 1}`; self.set(key, (self.get(key) || 0) + (dt[i] || 0)); });
  const top = [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k, v]) => `${(v / 1000).toFixed(0)}ms  ${k}`);
  console.log(top.join("\n"));
} finally { try { await session.close(); } catch {} }
