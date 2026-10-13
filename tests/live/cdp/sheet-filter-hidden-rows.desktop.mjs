// EXCEL-G2 (tai hien loi): loc theo danh sach gia tri -> luu XLSX. Mong doi: file co <autoFilter> kem filterColumn VA cac hang bi loc co hidden=1 (Excel mo len thay dung hang an).
// Hien tai: main luu tieu chi nhung KHONG danh dau hang an; G2 con mat ca autoFilter. Doc XML: python (zipfile) dem <row ... hidden=1>.
import { copyFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { launchApp } from "./session.mjs";
const profile = process.env.VNO_CDP_LOCALAPPDATA; mkdirSync(profile, { recursive: true });
const file = path.join(profile, "filter-hidden.xlsx"); copyFileSync(path.resolve("tests/live/cdp/test_sheet_home.xlsx"), file);
const session = await launchApp("sheet", { localAppData: profile, filePath: file, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
try {
  await session.cdp.waitFor("window.__vnoAppInstance?.grid?.cellsData?.size > 0", { timeoutMilliseconds: 120000 });
  const info = await session.cdp.evaluate(`(() => { const g = window.__vnoAppInstance.grid; ["Tên","An","Bình","An","Chi"].forEach((v, i) => g.setCellValue("A", i + 1, v)); g.setCellValue("B",1,"v"); [1,2,3,4].forEach(i => g.setCellValue("B", i + 1, i)); g.selectCell("A",1); g.selectCell("B",5,true); if (!g.isFilterActive) g.toggleFilter(); g.applyFilter("A", new Set(["An"])); window.__vnoAppInstance.adapter.isDirty = true; return JSON.stringify({ hidden: [...g.hiddenRows] }); })()`);
  console.log("MODEL", info);
  await session.cdp.evaluate("window.__vnoAppInstance.adapter.save()", { awaitPromise: true, timeoutMilliseconds: 180000 });
} finally { await session.close(); }
console.log("FILE", file);