import { launchApp } from "./session.mjs";
import { typeText } from "./actions.mjs";
import { writeFileSync } from "node:fs";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const session = await launchApp("writer", { startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
try {
  await session.cdp.waitFor("!!document.querySelector('.vno-writer-body')", { timeoutMilliseconds: 180000, intervalMilliseconds: 500 });
  await sleep(4000);
  await session.cdp.evaluate("document.querySelector('.vno-writer-body').focus()");
  await typeText(session.cdp, "Van ban co tu sai chinh ta xyzabc va qwertyu o day", 8);
  await sleep(1500);
  const r = await session.cdp.send("Page.captureScreenshot", { format: "png", clip: { x: 280, y: 200, width: 820, height: 160, scale: 2 } });
  writeFileSync("E:\\VNOffice-profiles\\ui-shots\\u1-wave.png", Buffer.from((r.result || r).data, "base64"));
  console.log("ok");
} finally { await session.close(); }