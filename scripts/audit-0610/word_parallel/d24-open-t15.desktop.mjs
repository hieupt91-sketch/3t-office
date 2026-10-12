import fs from "node:fs/promises";
import path from "node:path";
import { launchApp } from "../../../tests/live/cdp/session.mjs";

const root = process.env.VNO_APP_ROOT;
const profile = process.env.VNO_CDP_LOCALAPPDATA;
const file = process.env.VNO_D24_FILE || path.join(root || "", "file test", "landocx", "d24.docx");
if (!root || !profile) throw new Error("Set VNO_APP_ROOT and VNO_CDP_LOCALAPPDATA.");
const result = { root, file, startedAt: new Date().toISOString(), events: [] };
let session;
try {
  session = await launchApp("writer", {
    root,
    filePath: file,
    localAppData: path.join(profile, "d24-open-t15", "app-profile"),
    startTimeoutMilliseconds: 180000,
    readyTimeoutMilliseconds: 180000,
  });
  result.pid = session.child.pid;
  result.debugPort = session.debugPort;
  await session.cdp.send("Runtime.enable");
  await session.cdp.send("Log.enable");
  session.cdp.socket.addEventListener("message", event => {
    try {
      const message = JSON.parse(String(event.data));
      if (message.method === "Runtime.exceptionThrown" || message.method === "Log.entryAdded" || message.method === "Inspector.targetCrashed") {
        result.events.push(message);
      }
    } catch {}
  });
  try {
    await session.cdp.waitFor(`(() => {const a=window.__vnoAppInstance?.adapter;const b=document.querySelector('.vno-writer-body');return !!a?._sourcePath && !!b && b.children.length>0 && Number.isFinite(a._livePageCount) && !a._paginating})()`, {
      timeoutMilliseconds: 600000,
      intervalMilliseconds: 1000,
    });
    result.appState = await session.cdp.evaluate(`(() => {const a=window.__vnoAppInstance?.adapter;const b=document.querySelector('.vno-writer-body');return {source:a?._sourcePath||null,children:b?.children.length||0,images:b?.querySelectorAll('img').length||0,tables:b?.querySelectorAll('table').length||0,pages:a?._livePageCount||null,stats:a?.getWordCountStats?.({preferSelection:false})||null}})()`);
    result.status = "loaded";
  } catch (error) {
    result.status = "load-error";
    result.error = error?.stack || String(error);
    result.exitCode = session.child.exitCode;
    result.signalCode = session.child.signalCode;
    result.appOutput = session.output;
  }
} catch (error) {
  result.status = "launch-error";
  result.error = error?.stack || String(error);
  result.appOutput = session?.output || null;
} finally {
  result.finishedAt = new Date().toISOString();
  if (session) {
    result.exitCodeBeforeClose = session.child.exitCode;
    result.signalCodeBeforeClose = session.child.signalCode;
    result.appOutputBeforeClose = session.output;
    await session.close().catch(error => { result.closeError = String(error); });
    result.exitCodeAfterClose = session.child.exitCode;
    result.signalCodeAfterClose = session.child.signalCode;
  }
  const out = path.join(profile, "d24-open-t15.json");
  await fs.writeFile(out, JSON.stringify(result, null, 2) + "\n", "utf8");
  console.log(JSON.stringify({ ...result, outputPath: out }, null, 2));
}
