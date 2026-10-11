import { launchApp } from "./session.mjs";
import { mouseClick, mouseRightClick } from "./actions.mjs";
import fs from "node:fs";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = process.env.OUTDIR;
const session = await launchApp("slides", { startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
const ev = (e) => session.cdp.evaluate(e, { awaitPromise: true, timeoutMilliseconds: 60000 });
const shot = async (name) => {
  const r = await session.cdp.send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(out + "\\" + name + ".png", Buffer.from((r.result || r).data, "base64"));
};
const visibleIds = async (re) => JSON.parse(await ev(`JSON.stringify([...document.querySelectorAll('[data-command-id]')].filter(n=>{const r=n.getBoundingClientRect();return r.width>0&&r.height>0;}).map(n=>n.dataset.commandId).filter(i=>/${re}/i.test(i)))`));
try {
  await sleep(4000);
  // Chuot phai vao thumbnail slide 1
  await mouseRightClick(session.cdp, 120, 285);
  await sleep(600);
  await shot("02-thumb-context");
  console.log("context:", (await visibleIds("hid|show|slide\\.")).join(","));
  await session.cdp.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
  await session.cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
  await sleep(300);
  // Tab Trinh chieu
  await mouseClick(session.cdp, 551, 60);
  await sleep(700);
  await shot("03-tab-trinh-chieu");
  console.log("trinh-chieu:", (await visibleIds("hid|show|slideshow|present")).join(","));
} finally {
  await session.close();
}
