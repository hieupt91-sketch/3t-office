import { launchApp } from "./session.mjs";
import { click, insertText, mouseClick, press, sleep } from "./actions.mjs";

const session = await launchApp("sheet", {
  root: process.env.VNO_APP_ROOT,
  localAppData: process.env.VNO_CDP_LOCALAPPDATA,
  startTimeoutMilliseconds: 180000,
  readyTimeoutMilliseconds: 180000,
});
const { cdp } = session;
const failures = [];
const check = (name, ok, detail) => {
  console.log(`${ok ? "PASS" : "FAIL"} | ${name} | ${JSON.stringify(detail)}`);
  if (!ok) failures.push(name);
};
const state = () => cdp.evaluate(`(() => {
  const g=window.__vnoAppInstance?.grid;
  const take=coords=>Object.fromEntries(coords.map(coord=>[coord,g?.cellsData?.get(coord)||null]));
  return {cells:take(["F1","G1","F2","G2","J1"]),bar:g?.formulaInput?.value||"",range:g?.getSelectedRangeLabel?.()||"",undo:g?.undoStack?.length||0,dialogs:[...document.querySelectorAll(".vno-dialog-overlay")].map(x=>x.textContent)};
})()`);
const shiftClick = async selector => {
  const point = await cdp.evaluate(`(() => {const n=document.querySelector(${JSON.stringify(selector)});if(!n)return null;const r=n.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2}})()`);
  if (!point) throw new Error(`Không thấy ${selector}`);
  await mouseClick(cdp, point.x, point.y, { shift: true });
};
const replaceFormulaBar = async formula => {
  await click(cdp, "#vno-formula-val");
  await cdp.evaluate(`(() => {const n=document.querySelector("#vno-formula-val");n.focus();n.select();})()`);
  await insertText(cdp, formula);
};

try {
  await cdp.waitFor("!!window.__vnoAppInstance?.grid?.cellsData && !!document.querySelector('.vno-grid-cell[data-coord=\"A1\"]')", { timeoutMilliseconds: 180000 });
  await sleep(2000);
  await cdp.evaluate(`(() => {
    const g=window.__vnoAppInstance.grid;
    [["A",1,1],["B",1,2],["A",2,3],["B",2,4]].forEach(([c,r,v])=>g.setCellValue(c,r,v,false));
    g._renderVirtualRows(g.currentStartRow||1,g.currentEndRow||40);
  })()`);
  await click(cdp, '.vno-grid-cell[data-coord="F1"]');
  await shiftClick('.vno-grid-cell[data-coord="G2"]');
  await replaceFormulaBar("=MMULT(A1:B2,A1:B2)");
  await press(cdp, "Enter", { ctrl: true, shift: true }, 500, 180000);
  let current = await state();
  check("Ctrl+Shift+Enter điền ma trận 2×2", [7,10,15,22].every((value,index)=>current.cells[["F1","G1","F2","G2"][index]]?.val===value), current);
  await click(cdp, '.vno-grid-cell[data-coord="F1"]');
  current = await state();
  check("Thanh công thức hiện ngoặc mảng", current.bar === "{=MMULT(A1:B2,A1:B2)}", current);
  check("Metadata dùng chung một arrayRange", ["F1","G1","F2","G2"].every(coord=>current.cells[coord]?.isArrayFormula&&current.cells[coord]?.arrayRange==="F1:G2"), current.cells);

  await click(cdp, '.vno-grid-cell[data-coord="G1"]');
  await press(cdp, "Delete", {}, 500, 180000);
  current = await state();
  check("Không thể xóa riêng một phần mảng", [7,10,15,22].every((value,index)=>current.cells[["F1","G1","F2","G2"][index]]?.val===value), current);
  check("Thông báo lỗi sửa một phần mảng", current.dialogs.some(text=>text.includes("Không thể thay đổi một phần của mảng")), current.dialogs);
  await click(cdp, ".vno-dialog-overlay button");

  await click(cdp, '.vno-grid-cell[data-coord="F1"]');
  await shiftClick('.vno-grid-cell[data-coord="G2"]');
  await press(cdp, "Delete", {}, 500, 180000);
  current = await state();
  check("Chọn cả khối rồi Delete xóa toàn bộ", ["F1","G1","F2","G2"].every(coord=>!current.cells[coord]), current);
  await press(cdp, "z", { ctrl: true }, 500, 180000);
  current = await state();
  check("Ctrl+Z phục hồi cả khối trong một bước", [7,10,15,22].every((value,index)=>current.cells[["F1","G1","F2","G2"][index]]?.val===value), current);

  await click(cdp, '.vno-grid-cell[data-coord="J1"]');
  await replaceFormulaBar("=SUM(IF(A1:B2>1,1,0))");
  await press(cdp, "Enter", { ctrl: true, shift: true }, 500, 180000);
  current = await state();
  check("CSE một ô SUM(IF) tính theo mảng", current.cells.J1?.val===3&&current.cells.J1?.isArrayFormula, current.cells.J1);
  await sleep(300);
} finally {
  await session.close();
}

if (failures.length) {
  console.error(`FAILURES ${failures.length}: ${failures.join(" | ")}`);
  process.exitCode = 1;
}
