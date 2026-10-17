// Chẩn đoán: áp từng thay đổi của hộp thoại Phông chữ và in HTML tiêu đề sau mỗi bước.
import { launchApp } from "../../tests/live/cdp/session.mjs";
import { mouseClick, typeText, press, sleep } from "../../tests/live/cdp/actions.mjs";
const session = await launchApp("slides", {});
const ev = (e) => session.cdp.evaluate(e, { awaitPromise: true, timeoutMilliseconds: 60000 });
try {
  await sleep(1500);
  const t = await ev(`(() => { const r = document.querySelector('.vno-slide-title').getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; })()`);
  await mouseClick(session.cdp, t.x, t.y);
  await typeText(session.cdp, "Chu thu nghiem");
  await press(session.cdp, "a", { ctrl: true });
  const steps = [
    { family: "Georgia" }, { size: 28 }, { color: "#ff0000" }, { bold: true }, { underlineStyle: "double" }, { sup: true }, { spacing: 2 }
  ];
  for (const change of steps) {
    await ev(`(() => { const a = window.__vnoAppInstance.adapter; const sel = getSelection(); const range = sel.getRangeAt(0).cloneRange(); a.applyFontDialogChanges(${JSON.stringify(change)}, range, document.querySelector('.vno-slide-title')); })()`);
    console.log(JSON.stringify(change), "=>", (await ev(`document.querySelector('.vno-slide-title').innerHTML`)).slice(0, 300));
  }
} finally { await session.close(); }
