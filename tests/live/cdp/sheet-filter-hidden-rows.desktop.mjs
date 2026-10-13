// Lọc theo danh sách giá trị -> lưu XLSX: file phải có <autoFilter> VÀ các hàng bị lọc đánh dấu hidden (Excel mở lên thấy đúng hàng ẩn).
import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { launchApp } from "./session.mjs";
import { readZipEntry } from "../../helpers/zip-package.mjs";
const profile = process.env.VNO_CDP_LOCALAPPDATA;
if (!profile) throw new Error("Set VNO_CDP_LOCALAPPDATA.");
mkdirSync(profile, { recursive: true });
const file = path.join(profile, "filter-hidden.xlsx");
copyFileSync(path.resolve("tests/live/cdp/test_sheet_home.xlsx"), file);
const check = (ok, msg, detail = "") => { if (!ok) throw new Error(`${msg}${detail ? " | " + detail : ""}`); console.log(`PASS | ${msg}${detail ? " | " + detail : ""}`); };
const session = await launchApp("sheet", { localAppData: profile, filePath: file, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
try {
  await session.cdp.waitFor("window.__vnoAppInstance?.grid?.cellsData?.size > 0 && !document.querySelector('.vno-sheet-quick-view')", { timeoutMilliseconds: 180000 });
  await new Promise((r) => setTimeout(r, 1500));
  const hidden = JSON.parse(await session.cdp.evaluate(`(() => { const g = window.__vnoAppInstance.grid; ["Tên","An","Bình","An","Chi"].forEach((v, i) => g.setCellValue("A", i + 1, v)); g.setCellValue("B", 1, "v"); [1,2,3,4].forEach(i => g.setCellValue("B", i + 1, i)); g.selectCell("A", 1); g.selectCell("B", 5, true); if (!g.isFilterActive) g.toggleFilter(); g.applyFilter("A", new Set(["An"])); window.__vnoAppInstance.adapter.isDirty = true; return JSON.stringify([...g.hiddenRows].filter((r) => r <= 5)); })()`));
  check(JSON.stringify(hidden) === "[3,5]", "Bộ lọc ẩn đúng hàng 3 và 5 trong app", JSON.stringify(hidden));
  const saved = await session.cdp.evaluate("window.__vnoAppInstance.adapter.save()", { awaitPromise: true, timeoutMilliseconds: 180000 });
  check(saved === true || (saved && saved.status !== "error"), "Lưu XLSX qua app desktop", JSON.stringify(saved));
} finally { await session.close(); }
const xml = readZipEntry(readFileSync(file), "xl/worksheets/sheet1.xml").toString("utf8");
check(/<autoFilter\b/.test(xml), "XLSX giữ autoFilter kèm tiêu chí");
const hiddenRows = [...xml.matchAll(/<row r="(\d+)"[^>]*\bhidden="(?:1|true)"/g)].map((m) => Number(m[1])).filter((r) => r <= 5);
check(JSON.stringify(hiddenRows) === "[3,5]", "XLSX đánh dấu hidden đúng các hàng bị lọc (3 và 5)", JSON.stringify(hiddenRows));