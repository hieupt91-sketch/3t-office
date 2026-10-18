// Sheet: Dán đặc biệt - chế độ "Quy tắc nhập liệu" và "Độ rộng cột" qua hộp thoại thật, hoàn tác.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { launchApp } from "./session.mjs";
import { click } from "./actions.mjs";

const profile = process.env.VNO_CDP_LOCALAPPDATA || path.join(os.tmpdir(), `vno-psp-${Date.now()}`);
fs.mkdirSync(profile, { recursive: true });
const session = await launchApp("sheet", { localAppData: profile });
const results = [];
const check = (name, pass, detail = "") => { results.push(Boolean(pass)); console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`); };
try {
  const { cdp } = session;
  await new Promise(r => setTimeout(r, 3000));
  const ev = (expr) => cdp.evaluate(expr, { awaitPromise: true, timeoutMilliseconds: 120000 });
  await ev(`(() => {
    const g = window.__vnoAppInstance.grid;
    g.setCellValue("A", 1, "x"); g.setCellValue("A", 2, "y");
    g.addDataValidation({ start: { c: "A", r: 1 }, end: { c: "A", r: 2 } }, { type: "list", values: ["x", "y", "z"] });
    g._colWidths().set("A", 200);
    g.setCellValue("D", 1, "giu"); g.setCellValue("D", 2, "giu2");
  })()`);
  const dvCount = () => ev(`window.__vnoAppInstance.grid.getDataValidations().length`);
  const dv0 = await dvCount();
  check("Có 1 quy tắc nhập liệu ở A1:A2", dv0 === 1, String(dv0));
  const openDialog = async (srcFrom, srcTo, dest) => {
    await ev(`(() => { const g = window.__vnoAppInstance.grid; g.selectCell(${JSON.stringify(srcFrom[0])}, ${srcFrom[1]}); g.selectCell(${JSON.stringify(srcTo[0])}, ${srcTo[1]}, true); g.copySelection(false); g.selectCell(${JSON.stringify(dest[0])}, ${dest[1]}); })()`);
    // Dựng mô hình bộ nhớ tạm như pasteClipboard rồi mở hộp Dán đặc biệt thật.
    await ev(`(() => { const g = window.__vnoAppInstance.grid; const cb = g._clipboardRange; const cells = []; for (let r = Number(cb.range.start.r); r <= Number(cb.range.end.r); r++) { const row = []; for (let c = g._columnNumber(cb.range.start.c); c <= g._columnNumber(cb.range.end.c); c++) row.push(structuredClone(g.cellsData.get(g._columnLabel(c) + r) || { val: "", formula: "", style: {} })); cells.push(row); } g.showPasteSpecialDialog({ range: structuredClone(cb.range), cells, sourceSheet: g.activeSheet }); })()`);
    await cdp.waitFor("document.querySelector('input[name=\"paste-special-mode\"][value=\"validation\"]')", { timeoutMilliseconds: 10000 });
  };
  // 1. Quy tắc nhập liệu A1:A2 -> C1
  await openDialog(["A", 1], ["A", 2], ["C", 1]);
  await click(cdp, 'input[name="paste-special-mode"][value="validation"]');
  await click(cdp, ".vno-rule-apply");
  await new Promise(r => setTimeout(r, 300));
  const dvs = JSON.parse(await ev(`JSON.stringify(window.__vnoAppInstance.grid.getDataValidations().map(v => { const n = window.__vnoAppInstance.grid._normalizeRange(v.range); return n.start.c + n.start.r + ":" + n.end.c + n.end.r + "/" + v.type; }))`));
  check("Dán Quy tắc nhập liệu: thêm quy tắc C1:C2", dvs.length === 2 && dvs.includes("C1:C2/list"), JSON.stringify(dvs));
  check("Không đổi giá trị ô đích", (await ev(`window.__vnoAppInstance.grid.cellsData.get("C1")?.val ?? ""`)) === "");
  await ev(`window.__vnoAppInstance.grid.undo()`);
  check("Hoàn tác gỡ quy tắc vừa dán", (await dvCount()) === 1);
  // 2. Độ rộng cột A -> D
  await openDialog(["A", 1], ["A", 2], ["D", 1]);
  await click(cdp, 'input[name="paste-special-mode"][value="columnWidths"]');
  await click(cdp, ".vno-rule-apply");
  await new Promise(r => setTimeout(r, 300));
  const wD = await ev(`window.__vnoAppInstance.grid.getColumnWidth("D")`);
  check("Dán Độ rộng cột: cột D rộng 200 như cột A", wD === 200, String(wD));
  check("Giá trị ô đích giữ nguyên", (await ev(`window.__vnoAppInstance.grid.cellsData.get("D1")?.val`)) === "giu");
  await ev(`window.__vnoAppInstance.grid.undo()`);
  const wBack = await ev(`window.__vnoAppInstance.grid.getColumnWidth("D")`);
  check("Hoàn tác trả độ rộng cột D", wBack !== 200, String(wBack));
} catch (error) {
  check("Không phát sinh ngoại lệ", false, error.stack || error.message);
} finally { await session.close().catch(() => {}); }
if (results.some(r => !r)) process.exit(1);
