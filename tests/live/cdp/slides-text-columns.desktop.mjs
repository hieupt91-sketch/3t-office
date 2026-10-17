// Kiem tra CDP desktop: chia cot trong hop van ban (Trang dau > Doan van > Cot): chon hop, chon 2 cot, hoan tac, luu/mo lai.
import { launchApp } from "./session.mjs";
import { mouseClick } from "./actions.mjs";
import fs from "node:fs";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const savePath = process.argv[2] || "";
const session = await launchApp("slides", { localAppData: process.env.VNO_CDP_LOCALAPPDATA || "E:\\VNOffice-profiles\\claude-slides-columns" });
const cdp = session.cdp; const ev = e => cdp.evaluate(e, { awaitPromise: true, timeoutMilliseconds: 120000 });
let pass = 0, fail = 0;
const check = (name, ok, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"} | ${name}${ok ? "" : " | " + detail}`); ok ? pass++ : fail++; };
const canvas = "window.__vnoAppInstance.canvas";
const execBus = id => ev(`import('/platform/commands/command-bus.js').then(m => m.globalCommandBus.execute(${JSON.stringify(id)}))`);
const textbox = () => `${canvas}.slides[${canvas}.currentSlideIndex].shapes.find(s => s.type === 'textbox')`;
try {
  for (let i = 0; i < 40; i++) { if (await ev(`Boolean(window.__vnoAppInstance && window.__vnoAppInstance.canvas && window.__vnoAppInstance.canvas.slides)`)) break; await sleep(500); }
  const long = "Mot hai ba bon nam sau bay tam chin muoi. ".repeat(14);
  await ev(`(() => { const c = ${canvas}; const s = c.insertTextBox ? c.insertTextBox() : null; })()`);
  await sleep(400);
  let has = await ev(`Boolean(${textbox()})`);
  if (!has) { await ev(`(() => { const c = ${canvas}; const slide = c.slides[c.currentSlideIndex]; slide.shapes.push({ id: 'tbcol', type: 'textbox', x: 60, y: 120, w: 800, h: 300, text: ${JSON.stringify(long)}, color: 'transparent' }); c._renderShapesLayer(); })()`); await sleep(400); }
  await ev(`(() => { const s = ${textbox()}; s.text = ${JSON.stringify(long)}; delete s.textHtml; ${canvas}._renderShapesLayer(); ${canvas}.setSelectedTarget(s.id); })()`);
  await sleep(300);
  check("Co hop van ban de chia cot", await ev(`Boolean(${textbox()})`));
  await execBus("slides.text.columnsTwo"); await sleep(500);
  check("Chia hai cot: shape.textColumns = 2", (await ev(`${textbox()}.textColumns`)) === 2);
  const css = JSON.parse(await ev(`JSON.stringify((() => { const el = document.querySelector('.vno-shape-textbox-text.is-textbox-text'); return el ? { count: el.style.columnCount, gap: el.style.columnGap } : null; })())`));
  check("Canvas ve 2 cot (CSS column-count)", css && css.count === "2" && css.gap === "18px", JSON.stringify(css));
  await execBus("slides.text.columnsThree"); await sleep(400);
  check("Doi sang ba cot", (await ev(`${textbox()}.textColumns`)) === 3);
  await ev(`${canvas}.undo()`); await sleep(300);
  check("Hoan tac ve hai cot", (await ev(`${textbox()}.textColumns`)) === 2);
  await ev(`${canvas}.redo()`); await sleep(300);
  check("Lam lai ba cot", (await ev(`${textbox()}.textColumns`)) === 3);
  await execBus("slides.text.columnsTwo"); await sleep(300);
  const fodp = await ev(`(async () => { const a = window.__vnoAppInstance.adapter || window.__vnoAppInstance; return a.serializeToFodp(); })()`);
  check("FODP ghi style:columns fo:column-count=2", /<style:columns[^>]*fo:column-count="2"/.test(fodp));
  if (process.argv[3]) fs.writeFileSync(process.argv[3], fodp, "utf8");
  await execBus("slides.text.columnsOne"); await sleep(300);
  check("Mot cot: bo thuoc tinh textColumns", (await ev(`${textbox()}.textColumns`)) === undefined);
  if (savePath) {
    await execBus("slides.text.columnsTwo"); await sleep(300);
    const content = await ev(`(async () => { const a = window.__vnoAppInstance.adapter || window.__vnoAppInstance; return a.serializeToFodp(); })()`);
    const res = await ev(`window.pywebview.api.save_document_in_place(${JSON.stringify(content)}, 'slides', ${JSON.stringify(savePath)}, null)`);
    check("Luu PPTX thanh cong", res && res.status === "ok", JSON.stringify(res).slice(0, 160));
  }
} catch (err) { console.error("LOI NGOAI LE TRONG PHIEN TEST CDP:", err); fail++; }
finally { console.log(`KET QUA TEST CDP DESKTOP [slides cot]: ${pass}/${pass + fail} PASS | ${fail} FAIL`); try { await session.close(); } catch {} }
process.exitCode = fail ? 1 : 0;