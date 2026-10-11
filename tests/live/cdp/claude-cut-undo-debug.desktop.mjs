import { launchApp } from "./session.mjs";
import { press, typeText } from "./actions.mjs";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const session = await launchApp("writer", { startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
const ev = (e) => session.cdp.evaluate(e, { awaitPromise: true });
const show = async (label) => console.log(label.padEnd(26), await ev("JSON.stringify({p:[...document.querySelector('.vno-writer-body').querySelectorAll('p,h1,h2,li')].map(p=>p.textContent), sel:getSelection().toString(), undo:(window.__vnoAppInstance&&window.__vnoAppInstance.adapter&&window.__vnoAppInstance.adapter.undoStack?window.__vnoAppInstance.adapter.undoStack.length:null)})"));
try {
  await session.cdp.waitFor("!!document.querySelector('.vno-writer-body')", { timeoutMilliseconds: 180000, intervalMilliseconds: 500 });
  await sleep(4000);
  await ev("document.querySelector('.vno-writer-body').focus()");
  await typeText(session.cdp, "Dong mot", 8); await press(session.cdp, "Enter", {}, 60);
  await typeText(session.cdp, "Dong hai", 8); await press(session.cdp, "Enter", {}, 60);
  await typeText(session.cdp, "Dong ba", 8); await sleep(800);
  await show("sau go 3 dong");
  await press(session.cdp, "ArrowUp", {}, 60); await press(session.cdp, "End", {}, 60); await press(session.cdp, "Home", { shift: true }, 60);
  await show("chon dong 2");
  await press(session.cdp, "x", { ctrl: true }, 150); await sleep(500);
  await show("sau Ctrl+X");
  await press(session.cdp, "z", { ctrl: true }, 150); await sleep(500);
  await show("sau Ctrl+Z");
  await press(session.cdp, "z", { ctrl: true }, 150); await sleep(500);
  await show("sau Ctrl+Z lan 2");
} finally { await session.close(); }