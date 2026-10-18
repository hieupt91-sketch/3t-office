// Sheet: hàm GETPIVOTDATA đọc ô của PivotTable thật tạo trong app; lưu XLSX, mở lại, công thức và giá trị còn đúng.
import { copyFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { launchApp } from "./session.mjs";

const profile = process.env.VNO_CDP_LOCALAPPDATA;
if (!profile) throw new Error("Set VNO_CDP_LOCALAPPDATA.");
mkdirSync(profile, { recursive: true });
const file = path.join(profile, "getpivotdata.xlsx");
copyFileSync(path.resolve("tests/live/cdp/test_sheet_home.xlsx"), file);
const results = [];
const check = (name, pass, detail = "") => { results.push(Boolean(pass)); console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`); };
let session = await launchApp("sheet", { localAppData: profile, filePath: file, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
try {
  const { cdp } = session;
  await cdp.waitFor("window.__vnoAppInstance?.grid?.cellsData?.size > 0 && !document.querySelector('.vno-sheet-quick-view')", { timeoutMilliseconds: 180000 });
  const ev = (expr) => cdp.evaluate(expr, { awaitPromise: true, timeoutMilliseconds: 600000 });
  await ev(`(async () => {
    const g = window.__vnoAppInstance.grid;
    g.clearAll?.();
    const src = [["Vung", "Sp", "Tien"], ["Bac", "A", 10], ["Bac", "B", 20], ["Nam", "A", 5], ["Nam", "A", 7]];
    src.forEach((row, r) => row.forEach((v, c) => g.setCellValue("ABC"[c], r + 21, v)));
    await g._loadPivotEngine(false);
  })()`);
  const created = await ev(`(async () => {
    const g = window.__vnoAppInstance.grid;
    if (!g.pivotTableEngine) await g._loadPivotEngine(false);
    try {
      const p = g.createPivotTable({ sourceSheet: g.activeSheet, sourceRange: "A21:C25", rows: ["Vung"], columns: ["Sp"], values: [{ field: "Tien", aggregate: "SUM" }], showGrandTotal: true, targetSheet: g.activeSheet, targetCoord: "F21" });
      return JSON.stringify({ ok: !!p, range: p && p.resultRange });
    } catch (e) { return "ERR " + e.message; }
  })()`);
  check("Tạo PivotTable thật trong app", /"ok":true/.test(created), created);
  const calc = async (formula) => {
    await ev(`(() => { const g = window.__vnoAppInstance.grid; g.setCellValue("J", 30, ${JSON.stringify(formula)}, true); })()`);
    return ev(`window.__vnoAppInstance.grid.cellsData.get("J30")?.val`);
  };
  check("Bắc / sản phẩm B = 20", (await calc('=GETPIVOTDATA("Tien",F21,"Vung","Bac","Sp","B")')) === 20);
  check("Nam / sản phẩm A = 12", (await calc('=GETPIVOTDATA("Tien",F21,"Vung","Nam","Sp","A")')) === 12);
  check("Không có mục => #REF!", (await calc('=GETPIVOTDATA("Tien",F21,"Vung","Dong","Sp","A")')) === "#REF!");
  await ev(`window.__vnoAppInstance.grid.setCellValue("J", 30, '=GETPIVOTDATA("Tien",F21,"Vung","Bac","Sp","B")', true)`);
  const saved = await ev(`globalThis.globalUnoBridge.saveRealFileInPlace("sheet", window.__vnoAppInstance.adapter.serializeToFods(), ${JSON.stringify(file)}, null)`);
  check("Lưu XLSX", saved?.status === "ok", JSON.stringify(saved).slice(0, 60));
  await new Promise(r => setTimeout(r, 800));
} catch (error) {
  check("Không phát sinh ngoại lệ", false, error.stack || error.message);
} finally { await session.close().catch(() => {}); }
session = await launchApp("sheet", { localAppData: profile, filePath: file, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
try {
  const { cdp } = session;
  await cdp.waitFor("window.__vnoAppInstance?.grid?.cellsData?.size > 0 && !document.querySelector('.vno-sheet-quick-view')", { timeoutMilliseconds: 180000 });
  const ev = (expr) => cdp.evaluate(expr, { awaitPromise: true, timeoutMilliseconds: 600000 });
  const info = JSON.parse(await ev(`JSON.stringify({ f: window.__vnoAppInstance.grid.cellsData.get("J30")?.formula, v: window.__vnoAppInstance.grid.cellsData.get("J30")?.val })`));
  check("Mở lại: công thức còn nguyên", /GETPIVOTDATA/i.test(String(info.f)), JSON.stringify(info));
  check("Mở lại: giá trị đã tính còn là 20", info.v === 20 || info.v === "20", JSON.stringify(info));
} catch (error) {
  check("Mở lại không phát sinh ngoại lệ", false, error.stack || error.message);
} finally { await session.close().catch(() => {}); }
if (results.some(r => !r)) process.exit(1);
