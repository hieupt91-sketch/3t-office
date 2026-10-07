// Thu cap nhat that: ban cai 0.9.8 co lap -> tu phat hien 0.9.9 tren nguon da ky -> khoi dong lai -> len 0.9.9.
// Chay: node --experimental-websocket scripts/audit-0610/release_update_e2e.mjs <thu-muc-cai> <LOCALAPPDATA co lap> [app]
import { launchApp } from "../../tests/live/cdp/session.mjs";
import { connectToPort, sleep } from "../../tests/live/cdp/client.mjs";
import path from "node:path";
import { readFileSync, existsSync } from "node:fs";

const inst = process.argv[2];
const lad = process.argv[3];
const app = process.argv[4] || "writer";
const root = path.join(inst, "app");
const python = path.join(inst, "python", "python.exe");
const readVersion = () => readFileSync(path.join(inst, "VERSION.txt"), "ascii").trim();
const result = { before: readVersion() };

const session = await launchApp(app, { root, python, localAppData: lad, startTimeoutMilliseconds: 120000, readyTimeoutMilliseconds: 90000 });
const port = session.debugPort;
const ev = (e) => session.cdp.evaluate(e, { awaitPromise: true });
try {
  result.uiVersion = await ev(`window.pywebview.api.get_update_status().then(s => JSON.stringify(s))`);
  // Cho nen tai ve va xep gon ban vá.
  let status = null;
  await ev(`window.pywebview.api.check_for_updates().then(s => JSON.stringify(s))`);
  for (let i = 0; i < 240; i += 1) {
    status = JSON.parse(await ev(`window.pywebview.api.get_update_status().then(s => JSON.stringify(s))`));
    if (status.ready) break;
    await sleep(5000);
  }
  result.afterCheck = status;
  result.notification = await ev(`(document.querySelector('.vno-notification-bar, [data-vno-notification]')||{}).textContent||''`);
  console.log(JSON.stringify(result, null, 1));
  // Yeu cau khoi dong lai (khong co tai lieu chua luu).
  const r = await ev(`window.pywebview.api.request_update_restart().then(s => JSON.stringify(s))`);
  console.log("request_update_restart:", r);
} finally {
  // Khong dong app: trinh cap nhat tu dong dong va mo lai.
}
// Cho ban moi len.
for (let i = 0; i < 120; i += 1) {
  await sleep(3000);
  if (readVersion() === "0.9.9") break;
}
console.log("version file after:", readVersion());
await sleep(15000);
try {
  const cdp = await connectToPort(port, { timeoutMilliseconds: 90000 });
  await cdp.waitFor("!!document.querySelector('.vno-writer-body, .vno-sheet-container, .vno-slide-canvas')", { timeoutMilliseconds: 90000 });
  const st = await cdp.evaluate(`window.pywebview.api.get_update_status().then(s => JSON.stringify(s))`, { awaitPromise: true });
  console.log("relaunched status:", st);
  const health = await cdp.evaluate(`window.pywebview.api.confirm_update_health().then(s => JSON.stringify(s))`, { awaitPromise: true });
  console.log("health:", health);
  await cdp.close();
} catch (e) { console.log("reconnect failed:", e.message); }
const logPath = path.join(lad, "VNOffice", "updates", "update-log.txt");
console.log(existsSync(logPath) ? readFileSync(logPath, "utf8").split(/\r?\n/).slice(-25).join("\n") : "no update-log");
