// Kiem tra CDP desktop: Do bong chu (slides.text.shadow): bat/tat, trang thai nut, luu/mo lai.
import { launchApp } from "./session.mjs";
import { mouseClick } from "./actions.mjs";
import fs from "node:fs";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const savePath = process.argv[2] || "";
const session = await launchApp("slides", { localAppData: process.env.VNO_CDP_LOCALAPPDATA || "E:\\VNOffice-profiles\\claude-slides-shadow" });
const cdp = session.cdp; const ev = e => cdp.evaluate(e, { awaitPromise: true, timeoutMilliseconds: 120000 });
let pass = 0, fail = 0;
const check = (name, ok, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"} | ${name}${ok ? "" : " | " + detail}`); ok ? pass++ : fail++; };
const canvas = "window.__vnoAppInstance.canvas";
const execBus = id => ev(`import('/platform/commands/command-bus.js').then(m => m.globalCommandBus.execute(${JSON.stringify(id)}))`);
const stateChecked = id => ev(`import('/platform/commands/command-bus.js').then(m => !!m.globalCommandBus.getState(${JSON.stringify(id)}).checked)`);
const selectWord = async (word) => ev(`(() => {
  const el = document.querySelector('.vno-slide-body, [data-field="body"], #vno-slide-body') || ${canvas}.bodyEl;
  el.focus();
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let n; while ((n = walker.nextNode())) { const i = n.textContent.indexOf(${JSON.stringify(word)}); if (i >= 0) { const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + ${JSON.stringify(word)}.length); const s = window.getSelection(); s.removeAllRanges(); s.addRange(r); document.dispatchEvent(new Event('selectionchange')); return true; } }
  return false; })()`);
try {
  for (let i = 0; i < 40; i++) { if (await ev(`Boolean(window.__vnoAppInstance && window.__vnoAppInstance.canvas && window.__vnoAppInstance.canvas.bodyEl)`)) break; await sleep(500); }
  await ev(`(() => { const c = ${canvas}; c.bodyEl.innerHTML = '<div>Xin chao the gioi</div>'; c._syncEditableFieldsFromDom(); })()`);
  await sleep(300);
  check("Chon duoc chu 'chao'", await selectWord("chao"));
  await execBus("slides.text.shadow"); await sleep(400);
  const html1 = await ev(`${canvas}.bodyEl.innerHTML`);
  check("Bam Do bong: chu duoc boc span text-shadow", /text-shadow/i.test(html1) && /chao/.test(html1), html1);
  check("Chi chu da chon co bong (khong phai ca dong)", !/Xin\s*<span[^>]*text-shadow[^>]*>[^<]*Xin/i.test(html1) && /<span[^>]*text-shadow[^>]*>chao<\/span>/i.test(html1), html1);
  await selectWord("chao"); await sleep(200);
  await ev(`window.__vnoAppInstance.adapter?._syncTextFormatState?.()`);
  check("Nut Do bong sang khi con tro trong chu co bong", await stateChecked("slides.text.shadow"));
  await execBus("slides.text.shadow"); await sleep(400);
  const html2 = await ev(`${canvas}.bodyEl.innerHTML`);
  const stillShadow = await ev(`(() => { const sp = ${canvas}.bodyEl.querySelectorAll('span'); return [...sp].some(s => s.style.textShadow && !/none/i.test(s.style.textShadow)); })()`);
  check("Bam lai: bo bong", !stillShadow, html2);
  // dat lai bong de luu
  await selectWord("the"); await execBus("slides.text.shadow"); await sleep(400);
  const fodp = await ev(`(async () => { const a = window.__vnoAppInstance.adapter || window.__vnoAppInstance; return a.serializeToFodp(); })()`);
  check("FODP ghi fo:text-shadow", /fo:text-shadow="1pt 1pt"/.test(fodp));
  if (process.argv[3]) fs.writeFileSync(process.argv[3], fodp, "utf8");
  if (savePath) {
    const res = await ev(`window.pywebview.api.save_document_in_place(${JSON.stringify(fodp)}, 'slides', ${JSON.stringify(savePath)}, null)`);
    check("Luu PPTX thanh cong", res && res.status === "ok", JSON.stringify(res).slice(0, 160));
  }
} catch (err) { console.error("LOI NGOAI LE TRONG PHIEN TEST CDP:", err); fail++; }
finally { console.log(`KET QUA TEST CDP DESKTOP [slides do bong]: ${pass}/${pass + fail} PASS | ${fail} FAIL`); try { await session.close(); } catch {} }
process.exitCode = fail ? 1 : 0;