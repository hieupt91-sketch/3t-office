// Kiem tra CDP desktop: thao tac bang tren trang chieu (Bo cuc bang): chen/xoa hang-cot, gop/tach o, hoan tac, tab ngu canh.
// Quy tac: khong SendKeys, khong kill theo ten; chi dung session PID cua launchApp.
import { launchApp } from "./session.mjs";
import { mouseClick } from "./actions.mjs";

const sleep = ms => new Promise(r => setTimeout(r, ms));
const session = await launchApp("slides", { localAppData: process.env.VNO_CDP_LOCALAPPDATA || "E:\\VNOffice-profiles\\claude-slides-table" });
const cdp = session.cdp;
const ev = e => cdp.evaluate(e, { awaitPromise: true, timeoutMilliseconds: 60000 });
let pass = 0, fail = 0;
const check = (name, ok, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"} | ${name}${ok ? "" : " | " + detail}`); ok ? pass++ : fail++; };
const canvas = "window.__vnoAppInstance.canvas";
const shape = async () => JSON.parse(await ev(`JSON.stringify((() => { const s = ${canvas}.slides[${canvas}.currentSlideIndex].shapes.find(x => x.type === 'table'); return s ? { rows: s.rows, cols: s.cols, cells: s.cells, merges: s.merges || [] } : null; })())`));
const centerOf = async sel => JSON.parse(await ev(`JSON.stringify((() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; const r = e.getBoundingClientRect(); return r.width ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null; })())`));
const tabVisible = async () => ev(`(() => { const t = document.querySelector('#vno-ribbon-tab-tableLayout'); return !!t && !t.hidden; })()`);
const cmd = async id => { await ev(`window.__vnoAppInstance.shell ? 0 : 0`); await ev(`import('/platform/commands/command-bus.js').then(m => m.globalCommandBus.execute(${JSON.stringify(id)}))`); await sleep(350); };

try {
  let ready = false;
  for (let i = 0; i < 40 && !ready; i++) { ready = await ev(`Boolean(window.__vnoAppInstance && window.__vnoAppInstance.canvas && window.__vnoAppInstance.canvas.slides)`); if (!ready) await sleep(500); }
  check("App Slides khoi dong", ready);
  check("Tab Bo cuc bang an khi chua co bang", !(await tabVisible()));

  await ev(`${canvas}.insertTable({ rows: 3, cols: 3 })`);
  await sleep(600);
  let s = await shape();
  check("Chen bang 3x3", s && s.rows === 3 && s.cols === 3, JSON.stringify(s));
  // dien chu vao o
  await ev(`(() => { const sh = ${canvas}.slides[${canvas}.currentSlideIndex].shapes.find(x => x.type === 'table'); sh.cells = [["a","b","c"],["d","e","f"],["g","h","i"]]; ${canvas}._renderShapesLayer(); })()`);
  await sleep(400);

  const cellPt = async (r, c) => centerOf(`[data-table-row="${r}"][data-table-col="${c}"]`);
  let p = await cellPt(1, 1);
  check("Co o de nhap vao", Boolean(p));
  await mouseClick(cdp, p.x, p.y); await sleep(400);
  check("Nhap vao o: hien tab Bo cuc bang", await tabVisible());

  await cmd("slides.table.insertRowBelow");
  s = await shape();
  check("Chen hang phia duoi hang giua", s.rows === 4 && JSON.stringify(s.cells[2]) === JSON.stringify(["", "", ""]) && s.cells[3][0] === "g", JSON.stringify(s));

  await cmd("slides.table.insertColLeft");
  s = await shape();
  check("Chen cot ben trai cot giua", s.cols === 4 && s.cells[0][1] === "" && s.cells[0][2] === "b", JSON.stringify(s.cells[0]));

  await ev(`${canvas}.undo()`); await sleep(300);
  s = await shape();
  check("Hoan tac chen cot", s.cols === 3, JSON.stringify(s));
  await ev(`${canvas}.redo()`); await sleep(300);
  s = await shape();
  check("Lam lai chen cot", s.cols === 4, JSON.stringify(s));

  // gop o: chon (0,0) roi shift+click (1,1) bang chuot that
  p = await cellPt(0, 0); await mouseClick(cdp, p.x, p.y); await sleep(300);
  const p2 = await cellPt(1, 1);
  await mouseClick(cdp, p2.x, p2.y, { shift: true });
  await sleep(400);
  const sel = await ev(`document.querySelectorAll('.is-table-cell-selected').length`);
  check("Shift+nhap chon dai o (to nen)", sel >= 4, "so o duoc to: " + sel);
  await cmd("slides.table.mergeCells");
  s = await shape();
  check("Gop o 2x2", s.merges.length === 1 && s.merges[0].rs === 2 && s.merges[0].cs === 2, JSON.stringify(s.merges));
  const spans = await ev(`(() => { const td = document.querySelector('[data-table-row="0"][data-table-col="0"]'); return td ? td.rowSpan + 'x' + td.colSpan : null; })()`);
  check("O gop ve rowSpan 2, colSpan 2", spans === "2x2", String(spans));

  p = await cellPt(0, 0); await mouseClick(cdp, p.x, p.y); await sleep(300);
  await cmd("slides.table.splitCell");
  s = await shape();
  check("Tach o tro lai binh thuong", s.merges.length === 0, JSON.stringify(s.merges));

  p = await cellPt(1, 1); await mouseClick(cdp, p.x, p.y); await sleep(300);
  await cmd("slides.table.deleteRow");
  s = await shape();
  check("Xoa hang chua con tro", s.rows === 3, JSON.stringify(s.rows));
  await cmd("slides.table.deleteCol");
  s = await shape();
  check("Xoa cot chua con tro", s.cols === 3, JSON.stringify(s.cols));

  await cmd("slides.table.deleteTable");
  s = await shape();
  check("Xoa ca bang", s === null);
  check("Tab Bo cuc bang an lai khi het bang", !(await tabVisible()));
} catch (err) {
  console.error("LOI NGOAI LE TRONG PHIEN TEST CDP:", err);
  fail++;
} finally {
  console.log(`KET QUA TEST CDP DESKTOP [slides bang]: ${pass}/${pass + fail} PASS | ${fail} FAIL`);
  try { await session.close(); } catch {}
}
process.exitCode = fail ? 1 : 0;