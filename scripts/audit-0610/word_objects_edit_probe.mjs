import { launchApp } from "../../tests/live/cdp/session.mjs";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const src = "E:\\VNOffice-profiles\\claude-wordpar\\objects_src.docx";
const out = "E:\\VNOffice-profiles\\claude-wordpar\\objects_edited.docx";
const session = await launchApp("writer", { filePath: src, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
const ev = (e) => session.cdp.evaluate(e, { awaitPromise: true, timeoutMilliseconds: 240000 });
try {
  await session.cdp.waitFor("document.querySelector('.vno-writer-body')?.textContent.includes('P02')", { timeoutMilliseconds: 240000, intervalMilliseconds: 500 });
  await sleep(2500);
  const n = await ev(`(() => {
    const b = document.querySelector('.vno-writer-body');
    b.focus();
    const ps = [...b.querySelectorAll('p, li')];
    let n = 0;
    for (const p of ps) {
      if (!p.textContent.includes('P02')) continue;
      const r = document.createRange();
      r.selectNodeContents(p);
      r.collapse(false);
      const s = getSelection();
      s.removeAllRanges();
      s.addRange(r);
      document.execCommand('insertText', false, ' [DA SUA]');
      n++;
      break;
    }
    const td = b.querySelector('td');
    if (td && td.textContent.includes('R1C1')) {
      const r = document.createRange();
      r.selectNodeContents(td);
      r.collapse(false);
      const s = getSelection();
      s.removeAllRanges();
      s.addRange(r);
      document.execCommand('insertText', false, ' [EDIT]');
      n++;
    }
    return n;
  })()`);
  await sleep(1000);
  const saved = await ev(`(async () => {
    const a = window.__vnoAppInstance.adapter;
    a.isDirty = true;
    const res = await globalThis.globalUnoBridge.saveRealFileInPlace('writer', a._contentForExport(), ${JSON.stringify(out)}, ${JSON.stringify(src)});
    return JSON.stringify(res).slice(0, 100);
  })()`);
  console.log("edited count:", n, "saved:", saved);
} finally {
  await session.close();
}
