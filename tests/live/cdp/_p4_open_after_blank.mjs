import path from "node:path";
import { launchApp } from "./session.mjs";
import { CdpClient, readTargets, sleep } from "./client.mjs";

const root = path.resolve(process.argv[2]);
const filePath = path.resolve(process.argv[3]);
const label = process.argv[4] || "run";
const session = await launchApp("writer", {
  root,
  localAppData: process.env.LOCALAPPDATA,
  startTimeoutMilliseconds: 90000,
  readyTimeoutMilliseconds: 90000,
});

let child = null;
try {
  await sleep(6500);
  const before = new Set((await readTargets(session.debugPort)).map(target => target.id));
  const started = performance.now();
  const response = await session.cdp.evaluate(`window.pywebview.api.open_file_in_new_window(${JSON.stringify(filePath)}, "writer")`);
  if (response?.status && response.status !== "ok") throw new Error(JSON.stringify(response));
  let target = null;
  while (performance.now() - started < 180000) {
    target = (await readTargets(session.debugPort)).find(item => item.type === "page" && !before.has(item.id));
    if (target) break;
    await sleep(100);
  }
  if (!target) throw new Error("No child window target");
  child = await new CdpClient(target).open();
  await child.waitFor("window.__vnoStartupEvents?.some(e => e.name === 'document_open_complete') === true", {
    timeoutMilliseconds: 180000,
    pollMilliseconds: 100,
  });
  console.log(`P4_OPEN ${label} milliseconds=${(performance.now() - started).toFixed(1)}`);
} finally {
  if (child) await child.close().catch(() => {});
  await session.close();
}
