// Kiem tra CDP desktop: kich thuoc trang chieu tuy chinh (Thiet ke > Co trang chieu > Tuy chinh).
import { launchApp } from "./session.mjs";
import { mouseClick, insertText, press } from "./actions.mjs";
import fs from "node:fs";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const savePath = process.argv[2] || "";
const session = await launchApp("slides", { localAppData: process.env.VNO_CDP_LOCALAPPDATA || "E:\\VNOffice-profiles\\claude-slides-size" });
const cdp = session.cdp;
const ev = e => cdp.evaluate(e, { awaitPromise: true, timeoutMilliseconds: 120000 });
let pass = 0, fail = 0;
const check = (name, ok, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"} | ${name}${ok ? "" : " | " + detail}`); ok ? pass++ : fail++; };
const canvas = "window.__vnoAppInstance.canvas";
const center = async sel => JSON.parse(await ev(`JSON.stringify((() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; const r = e.getBoundingClientRect(); return r.width ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null; })())`));
const openDialog = async () => { await ev(`import('/platform/commands/command-bus.js').then(m => { m.globalCommandBus.execute('slides.design.slideSize'); })`); await sleep(500); };
const fillField = async (sel, text) => {
  const p = await center(sel); await mouseClick(cdp, p.x, p.y, {}); await sleep(150);
  await ev(`document.querySelector(${JSON.stringify(sel)}).select()`); await sleep(100);
  await insertText(cdp, text); await sleep(150);
};
try {
  for (let i = 0; i < 40; i++) { if (await ev(`Boolean(window.__vnoAppInstance && window.__vnoAppInstance.canvas && window.__vnoAppInstance.canvas.slides)`)) break; await sleep(500); }
  check("Mac dinh 960x540 (16:9)", JSON.stringify(JSON.parse(await ev(`JSON.stringify(${canvas}.slideSize)`))) === JSON.stringify({ preset: "wide", width: 960, height: 540 }));

  await openDialog();
  check("Hop thoai co muc Tuy chinh", Boolean(await center("#vno-slide-size-w")) && Boolean(await center("#vno-slide-size-apply")));
  // nhap sai
  await fillField("#vno-slide-size-w", "abc"); await fillField("#vno-slide-size-h", "21");
  let p = await center("#vno-slide-size-apply"); await mouseClick(cdp, p.x, p.y, {}); await sleep(300);
  check("Nhap chu: bao loi, khong doi kich thuoc", (await ev(`document.querySelector('#vno-slide-size-error').textContent`)).includes("số") && (await ev(`${canvas}.slideSize.width`)) === 960);
  await fillField("#vno-slide-size-w", "200"); await fillField("#vno-slide-size-h", "21");
  p = await center("#vno-slide-size-apply"); await mouseClick(cdp, p.x, p.y, {}); await sleep(300);
  check("Ngoai khoang 2,54-142,24: bao loi", (await ev(`document.querySelector('#vno-slide-size-error').textContent`)).includes("142,24") && (await ev(`${canvas}.slideSize.width`)) === 960);
  // hop le: A4 ngang 29,7 x 21 (dung dau phay)
  await fillField("#vno-slide-size-w", "29,7"); await fillField("#vno-slide-size-h", "21");
  p = await center("#vno-slide-size-apply"); await mouseClick(cdp, p.x, p.y, {}); await sleep(600);
  const size = JSON.parse(await ev(`JSON.stringify(${canvas}.slideSize)`));
  check("Ap dung 29,7 x 21 cm: preset custom, 842 x 595 px (1 px = 1 pt)", size.preset === "custom" && size.width === 842 && size.height === 595, JSON.stringify(size));
  check("Hop thoai dong sau khi ap dung", !(await center("#vno-slide-size-apply")));
  check("Khung trang chieu doi theo kich thuoc moi", (await ev(`parseInt(${canvas}.canvasEl.style.width)`)) === 842);

  await ev(`${canvas}.undo()`); await sleep(400);
  check("Hoan tac tro ve 960 x 540", (await ev(`${canvas}.slideSize.width`)) === 960);
  await ev(`${canvas}.redo()`); await sleep(400);
  check("Lam lai ve 842 x 595", (await ev(`${canvas}.slideSize.width`)) === 842);

  if (savePath) {
    const content = await ev(`(async () => { const a = window.__vnoAppInstance.adapter || window.__vnoAppInstance; return a.serializeToFodp(); })()`);
    const res = await ev(`window.pywebview.api.save_document_in_place(${JSON.stringify(content)}, 'slides', ${JSON.stringify(savePath)}, null)`);
    check("Luu PPTX thanh cong", res && res.status === "ok", JSON.stringify(res).slice(0, 160));
  }
} catch (err) { console.error("LOI NGOAI LE TRONG PHIEN TEST CDP:", err); fail++; }
finally { console.log(`KET QUA TEST CDP DESKTOP [slides co trang]: ${pass}/${pass + fail} PASS | ${fail} FAIL`); try { await session.close(); } catch {} }
process.exitCode = fail ? 1 : 0;