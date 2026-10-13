// Đến (F5/Ctrl+G) và Đến đặc biệt trên app desktop qua CDP.
import { launchApp } from "./session.mjs";
import { mouseClick, press, typeText } from "./actions.mjs";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const session = await launchApp("sheet", { localAppData: process.env.VNO_CDP_LOCALAPPDATA });
const cdp = session.cdp;
const ev = (e) => cdp.evaluate(e, { awaitPromise: true, timeoutMilliseconds: 60000 });
let pass = 0, fail = 0;
const check = (name, ok, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"} | ${name}${ok ? "" : " | " + detail}`); ok ? pass++ : fail++; };
const g = "window.__vnoAppInstance.grid";
const sel = async () => JSON.parse(await ev(`JSON.stringify({ areas: ${g}.selectionRanges.map(r => ${g}._rangeLabel(r)), active: ${g}.selectedCoord })`));
const dialogOpen = async () => (await ev(`!!document.querySelector('[role="dialog"]')`)) === true;
try {
  await sleep(3000);
  await ev(`(() => { const x = ${g}; x.setCellValue('A',1,'a'); x.setCellValue('B',1,1); x.setCellValue('A',2,'b'); x.setCellValue('B',2,'=B1+1'); x.setCellValue('A',4,'c'); x.setCellValue('B',4,3); return true; })()`);
  await sleep(500);
  const c = JSON.parse(await ev(`JSON.stringify((() => { const r = document.querySelector('.vno-grid-cell[data-coord="A1"]').getBoundingClientRect(); return { x: r.left + 8, y: r.top + 8 }; })())`));
  await mouseClick(cdp, c.x, c.y);
  await press(cdp, "F5");
  await sleep(500);
  check("F5 mở hộp thoại Đến", await dialogOpen());
  await typeText(cdp, "B4"); await press(cdp, "Enter"); await sleep(500);
  let s = await sel();
  check("Đến B4 chọn đúng ô", s.areas.join() === "B4:B4" && s.active.c === "B" && s.active.r === 4, JSON.stringify(s));
  await press(cdp, "g", { ctrl: true }); await sleep(500);
  check("Ctrl+G mở hộp thoại Đến", await dialogOpen());
  await typeText(cdp, "A1:B2"); await press(cdp, "Enter"); await sleep(500);
  s = await sel();
  check("Đến vùng A1:B2", s.areas.join() === "A1:B2", JSON.stringify(s));
  await mouseClick(cdp, c.x, c.y);
  await press(cdp, "F5"); await sleep(400); await typeText(cdp, "ZZZ999999"); await press(cdp, "Enter"); await sleep(300);
  check("Tham chiếu sai báo lỗi và giữ hộp thoại", await dialogOpen());
  await press(cdp, "Escape"); await sleep(300);
  // Đến đặc biệt qua API cùng logic của hộp thoại
  const run = async (kind) => JSON.parse(await ev(`(async () => { const m = await import('/apps/sheet/sheet-goto.js'); const found = m.findSpecialCells(${g}, '${kind}').map(c => c.c + c.r).sort(); return JSON.stringify(found); })()`));
  await ev(`${g}.selectCell('A',1); ${g}.selectCell('B',4,true)`);
  check("Đến đặc biệt: Công thức = B2", (await run("formulas")).join() === "B2", JSON.stringify(await run("formulas")));
  const blanks = await run("blanks");
  check("Đến đặc biệt: Ô trống trong A1:B4 gồm A3,B3", blanks.join() === "A3,B3", blanks.join());
  const consts = await run("constants");
  check("Đến đặc biệt: Hằng số = A1,A2,A4,B1,B4", consts.join() === "A1,A2,A4,B1,B4", consts.join());
  await ev(`${g}.saveComment({ coord: 'A2', text: 'x' })`);
  check("Đến đặc biệt: Ghi chú = A2", (await run("comments")).join() === "A2");
  // Hộp thoại Đến: nút Đặc biệt mở hộp thoại Đến đặc biệt (mở bằng F5 như trên, rồi bấm nút)
  await press(cdp, "Escape"); await sleep(300);
  await mouseClick(cdp, c.x, c.y);
  await ev(`import('/apps/sheet/sheet-goto.js').then(m => m.showGoToDialog(${g}))`); await sleep(600);
  const specialBtn = JSON.parse(await ev(`JSON.stringify((() => { const b = document.querySelector('#vno-goto-special-btn'); const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })())`));
  await mouseClick(cdp, specialBtn.x, specialBtn.y); await sleep(500);
  check("Nút Đặc biệt mở hộp thoại Đến đặc biệt", (await ev(`!!document.querySelector('input[name="vno-goto-special"]')`)) === true);
  await ev(`${g}.selectCell('A',1); ${g}.selectCell('B',4,true)`);
  const blankRadio = JSON.parse(await ev(`JSON.stringify((() => { const b = document.querySelector('input[name="vno-goto-special"][value="blanks"]'); const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })())`));
  await mouseClick(cdp, blankRadio.x, blankRadio.y); await press(cdp, "Enter"); await sleep(500);
  s = await sel();
  check("Chọn Ô trống rồi Enter chọn A3:B3", s.areas.join() === "A3:B3", JSON.stringify(s));
} finally {
  console.log(`SUMMARY ${pass}/${pass + fail} PASS, ${fail} FAIL`);
  try { await session.close(); } catch {}
}