// Sheet: Chèn > Biểu đồ thu nhỏ > Thắng-thua -> vẽ cột lên/xuống -> lưu XLSX (sparklineGroup type=stacked) -> mở lại.
// XML đọc lại bằng scripts/audit-0610/sheet_sparkline_xml.py
import { copyFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { launchApp } from "./session.mjs";

const profile = process.env.VNO_CDP_LOCALAPPDATA;
if (!profile) throw new Error("Set VNO_CDP_LOCALAPPDATA.");
mkdirSync(profile, { recursive: true });
const file = path.join(profile, "winloss.xlsx");
copyFileSync(path.resolve("tests/live/cdp/test_sheet_home.xlsx"), file);
const results = [];
const check = (name, pass, detail = "") => { results.push(Boolean(pass)); console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`); };
let session = await launchApp("sheet", { localAppData: profile, filePath: file, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
try {
  const { cdp } = session;
  await cdp.waitFor("window.__vnoAppInstance?.grid?.cellsData?.size > 0 && !document.querySelector('.vno-sheet-quick-view')", { timeoutMilliseconds: 180000 });
  const ev = (expr) => cdp.evaluate(expr, { awaitPromise: true, timeoutMilliseconds: 600000 });
  await ev(`(() => { const g = window.__vnoAppInstance.grid; [5, -3, 0, 8, -1, 2].forEach((v, i) => g.setCellValue("ABCDEF"[i], 40, v)); })()`);
  await ev(`(() => { const g = window.__vnoAppInstance.grid; g.selectCell("G", 40); })()`);
  const ok = await ev(`window.globalCommandBus.execute("sheet.insert.sparklineWinLoss", { range: { start: { c: "A", r: 40 }, end: { c: "F", r: 40 } } })`);
  check("Chèn biểu đồ mini thắng-thua thành công", ok !== false, String(ok));
  const svg = JSON.parse(await ev(`JSON.stringify((() => { const td = document.querySelector('.vno-grid-cell[data-coord="G40"]'); const s = td && td.querySelector('svg[data-sparkline="winloss"]'); if (!s) return null; const rects = [...s.querySelectorAll('rect')]; return { n: rects.length, up: rects.filter(r => r.dataset.win === '1').length, down: rects.filter(r => r.dataset.win === '0').length }; })())`));
  check("Vẽ 4 cột: 2 lên (5, 8, 2 → 3 lên) và 2 xuống, bỏ giá trị 0", svg && svg.n === 5 && svg.up === 3 && svg.down === 2, JSON.stringify(svg));
  await ev(`window.__vnoAppInstance.adapter.isDirty = true`);
  const saved = await ev(`globalThis.globalUnoBridge.saveRealFileInPlace("sheet", window.__vnoAppInstance.adapter.serializeToFods(), ${JSON.stringify(file)}, null)`);
  check("Lưu XLSX", saved?.status === "ok", JSON.stringify(saved).slice(0, 60));
  await new Promise(r => setTimeout(r, 800));
} catch (error) {
  check("Không phát sinh ngoại lệ", false, error.stack || error.message);
} finally { await session.close().catch(() => {}); }
console.log("OUT " + file);
session = await launchApp("sheet", { localAppData: profile, filePath: file, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
try {
  const { cdp } = session;
  await cdp.waitFor("window.__vnoAppInstance?.grid?.cellsData?.size > 0 && !document.querySelector('.vno-sheet-quick-view')", { timeoutMilliseconds: 180000 });
  const ev = (expr) => cdp.evaluate(expr, { awaitPromise: true, timeoutMilliseconds: 600000 });
  const spark = JSON.parse(await ev(`JSON.stringify(window.__vnoAppInstance.grid.cellsData.get("G40")?.sparkline || null)`));
  check("Mở lại: biểu đồ mini vẫn là thắng-thua với đúng dữ liệu", spark && spark.type === "winloss" && spark.values.join(",") === "5,-3,0,8,-1,2", JSON.stringify(spark));
} catch (error) {
  check("Mở lại không phát sinh ngoại lệ", false, error.stack || error.message);
} finally { await session.close().catch(() => {}); }
if (results.some(r => !r)) process.exit(1);
