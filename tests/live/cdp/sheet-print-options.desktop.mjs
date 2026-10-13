// Tùy chọn in (đường lưới, tiêu đề hàng/cột, chú thích, lỗi ô, thứ tự trang): đặt trong app desktop, lưu XLSX, mở lại.
import { copyFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { launchApp } from "./session.mjs";
const profile = process.env.VNO_CDP_LOCALAPPDATA;
if (!profile) throw new Error("Set VNO_CDP_LOCALAPPDATA.");
mkdirSync(profile, { recursive: true });
const file = path.join(profile, "print-options-roundtrip.xlsx");
copyFileSync(path.resolve("tests/live/cdp/test_sheet_home.xlsx"), file);
const check = (ok, msg, detail = "") => { if (!ok) throw new Error(`${msg}${detail ? " | " + detail : ""}`); console.log(`PASS | ${msg}${detail ? " | " + detail : ""}`); };
const WANT = { gridlines: true, headings: true, comments: "sheetEnd", cellErrors: "dash", pageOrder: "overThenDown" };
let session = await launchApp("sheet", { localAppData: profile, filePath: file, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
try {
  const cdp = session.cdp;
  await cdp.waitFor("window.__vnoAppInstance?.grid?.cellsData?.size > 0 && !document.querySelector('.vno-sheet-quick-view')", { timeoutMilliseconds: 180000 });
  await cdp.evaluate(`(() => { const g = window.__vnoAppInstance.grid; g.setPageSetup({ printOptions: ${JSON.stringify(WANT)} }); window.__vnoAppInstance.adapter.isDirty = true; })()`);
  const saved = await cdp.evaluate("window.__vnoAppInstance.adapter.save()", { awaitPromise: true, timeoutMilliseconds: 180000 });
  check(saved !== false && saved?.status !== "error", "Lưu XLSX qua app desktop");
  await new Promise((r) => setTimeout(r, 800));
} finally { await session.close(); }
console.log(`FILE ${file}`);
session = await launchApp("sheet", { localAppData: profile, filePath: file, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
try {
  await session.cdp.waitFor("window.__vnoAppInstance?.grid?.cellsData?.size > 0 && !document.querySelector('.vno-sheet-quick-view')", { timeoutMilliseconds: 180000 });
  const got = JSON.parse(await session.cdp.evaluate(`JSON.stringify(window.__vnoAppInstance.grid.getPageSetup?.()?.printOptions || null)`));
  check(got && Object.keys(WANT).every((k) => got[k] === WANT[k]), "Mở lại trong app giữ đủ 5 tùy chọn in", JSON.stringify(got));
} finally { await session.close(); }
