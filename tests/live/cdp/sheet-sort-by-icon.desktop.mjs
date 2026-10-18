// Sheet: bộ lọc/sắp xếp cột > Sắp xếp theo biểu tượng ô (bộ biểu tượng của định dạng có điều kiện): hàng có biểu tượng chọn lên đầu, hoàn tác.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { launchApp } from "./session.mjs";

const profile = process.env.VNO_CDP_LOCALAPPDATA || path.join(os.tmpdir(), `vno-sbi-${Date.now()}`);
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
    g.setCellValue("A", 1, "Ten"); g.setCellValue("B", 1, "Diem");
    [["An", 90], ["Binh", 10], ["Chi", 55], ["Dung", 95], ["Em", 5]].forEach(([n, v], i) => { g.setCellValue("A", i + 2, n); g.setCellValue("B", i + 2, v); });
    g.addConditionalFormattingRule({ start: { c: "B", r: 2 }, end: { c: "B", r: 6 } }, { type: "iconSet", iconSet: "3TrafficLights1" });
    (g.sheetStates ||= {})[g.activeSheet] ||= {};
    g.sheetStates[g.activeSheet].filterRange = "A1:B6";
    g.selectCell("A", 1);
    g._renderVirtualRows(g.currentStartRow || 1, g.currentEndRow || 40);
  })()`);
  const names = () => ev(`["A2","A3","A4","A5","A6"].map(c => window.__vnoAppInstance.grid.cellsData.get(c)?.val).join(",")`);
  const icons = JSON.parse(await ev(`JSON.stringify(["B2","B3","B4","B5","B6"].map(c => window.__vnoAppInstance.grid._conditionalCellVisual("B", Number(c.slice(1))).icon + "|" + window.__vnoAppInstance.grid._conditionalCellVisual("B", Number(c.slice(1))).iconColor))`));
  check("Có 3 loại biểu tượng khác nhau trong cột", new Set(icons).size === 3, JSON.stringify(icons));
  check("Thứ tự ban đầu", (await names()) === "An,Binh,Chi,Dung,Em");
  const lowIcon = icons[1]; // Binh = 10 (thấp)
  const menu = await ev(`(() => { const g = window.__vnoAppInstance.grid; g.selectCell("B", 1); const btn = document.querySelector('.vno-filter-button[data-col="B"], [data-filter-col="B"]'); return !!btn; })()`);
  // Mở trình đơn lọc của cột B bằng API rồi bấm nút biểu tượng thật.
  const opened = await ev(`(() => { const g = window.__vnoAppInstance.grid; const fn = g.showFilterMenu || g._showFilterMenu || g.openFilterMenu; if (!fn) return "nofn"; try { fn.call(g, "B", document.body); } catch (e) { return String(e.message); } return "ok"; })()`);
  console.log("OPEN", menu, opened);
  const hasBtn = await ev(`!!document.querySelector('.vno-filter-icon-btn')`);
  check("Trình đơn cột có nút sắp xếp theo biểu tượng", hasBtn === true, String(hasBtn));
  if (hasBtn) {
    await ev(`[...document.querySelectorAll('.vno-filter-icon-btn')].find(b => b.dataset.sortColor === ${JSON.stringify(lowIcon)}).click()`);
    await new Promise(r => setTimeout(r, 300));
    check("Sắp xếp theo biểu tượng thấp: Bình và Em lên đầu (giữ thứ tự cũ trong nhóm)", (await names()) === "Binh,Em,An,Chi,Dung", await names());
    await ev(`window.__vnoAppInstance.grid.undo()`);
    check("Hoàn tác trả thứ tự cũ", (await names()) === "An,Binh,Chi,Dung,Em", await names());
  }
} catch (error) {
  check("Không phát sinh ngoại lệ", false, error.stack || error.message);
} finally { await session.close().catch(() => {}); }
if (results.some(r => !r)) process.exit(1);
