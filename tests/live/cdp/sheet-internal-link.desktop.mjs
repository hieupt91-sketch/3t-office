// Sheet: liên kết tới vị trí trong sổ làm việc (Ctrl+K > Vị trí trong sổ này) -> lưu XLSX (location) -> mở lại -> bấm liên kết đi tới ô đích.
import { copyFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { launchApp } from "./session.mjs";
const profile = process.env.VNO_CDP_LOCALAPPDATA;
if (!profile) throw new Error("Set VNO_CDP_LOCALAPPDATA.");
mkdirSync(profile, { recursive: true });
const file = path.join(profile, "internal-link.xlsx");
copyFileSync(path.resolve("tests/live/cdp/test_sheet_home.xlsx"), file);
const check = (ok, msg, detail = "") => { if (!ok) throw new Error(`${msg}${detail ? " | " + detail : ""}`); console.log(`PASS | ${msg}${detail ? " | " + detail : ""}`); };
let session = await launchApp("sheet", { localAppData: profile, filePath: file, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
try {
  const cdp = session.cdp;
  await cdp.waitFor("window.__vnoAppInstance?.grid?.cellsData?.size > 0", { timeoutMilliseconds: 120000 });
  // Thêm trang thứ hai, quay lại trang đầu, mở hộp thoại Ctrl+K và chọn vị trí.
  const prep = await cdp.evaluate(`(() => {
    const g = window.__vnoAppInstance.grid;
    if (!g.sheets.includes("Số liệu")) g.addSheet("Số liệu");
    g.switchSheet(g.sheets[0]);
    g.selectCell("Z", 1);
    return JSON.stringify(g.sheets);
  })()`);
  console.log("Sheets", prep);
  await cdp.evaluate(`void (globalThis.__linkPromise = window.globalCommandBus.execute("sheet.insert.hyperlink"))`);
  await cdp.waitFor("document.querySelector('.vno-hyperlink-kind')", { timeoutMilliseconds: 10000 });
  check(true, "Hộp thoại liên kết có mục chọn Liên kết tới");
  const dlg = await cdp.evaluate(`(() => {
    const kind = document.querySelector('.vno-hyperlink-kind');
    kind.value = 'place'; kind.dispatchEvent(new Event('change', { bubbles: true }));
    const sheet = document.querySelector('.vno-hyperlink-sheet');
    sheet.value = ${JSON.stringify("Số liệu")};
    document.querySelector('.vno-hyperlink-ref').value = 'c5';
    document.querySelector('.vno-hyperlink-text-input').value = 'Đi tới số liệu';
    const shown = document.querySelector('.vno-hyperlink-place-row').style.display;
    document.querySelector('.vno-dialog-ok-btn').click();
    return shown;
  })()`);
  check(dlg === "flex", "Chọn Vị trí trong sổ hiện hàng trang tính + ô");
  await cdp.evaluate("globalThis.__linkPromise", { awaitPromise: true });
  const link = await cdp.evaluate(`window.__vnoAppInstance.grid.cellsData.get('Z1')?.hyperlink`);
  check(link === "#'Số liệu'!C5", "Ô lưu liên kết nội bộ", String(link));
  await cdp.evaluate("window.__vnoAppInstance.grid.followInternalLink(window.__vnoAppInstance.grid.cellsData.get('Z1').hyperlink)");
  const at = await cdp.evaluate(`JSON.stringify([window.__vnoAppInstance.grid.activeSheet, window.__vnoAppInstance.grid.selectedCoord])`);
  check(JSON.parse(at)[0] === "Số liệu" && JSON.parse(at)[1].c === "C" && JSON.parse(at)[1].r === 5, "Đi tới đúng trang và ô đích", at);
  await cdp.evaluate(`(() => { const g = window.__vnoAppInstance.grid; g.switchSheet(g.sheets[0]); window.__vnoAppInstance.adapter.isDirty = true; })()`);
  const saved = await cdp.evaluate("window.__vnoAppInstance.adapter.save()", { awaitPromise: true, timeoutMilliseconds: 180000 });
  check(saved !== false && saved?.status !== "error", "Lưu XLSX", JSON.stringify(saved).slice(0, 80));
  await new Promise((r) => setTimeout(r, 800));
} finally { await session.close(); }
console.log(`FILE ${file}`);
session = await launchApp("sheet", { localAppData: profile, filePath: file, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
try {
  const cdp = session.cdp;
  await cdp.waitFor("window.__vnoAppInstance?.grid?.cellsData?.size > 0 && !document.querySelector('.vno-sheet-quick-view')", { timeoutMilliseconds: 180000 });
  const link = await cdp.evaluate(`window.__vnoAppInstance.grid.cellsData.get('Z1')?.hyperlink`);
  check(link === "#'Số liệu'!C5", "Mở lại giữ liên kết nội bộ", String(link));
  await cdp.evaluate(`document.querySelector('.vno-grid-cell[data-coord="Z1"] a')?.click()`);
  const at = JSON.parse(await cdp.evaluate(`JSON.stringify([window.__vnoAppInstance.grid.activeSheet, window.__vnoAppInstance.grid.selectedCoord])`));
  check(at[0] === "Số liệu" && at[1].c === "C" && at[1].r === 5, "Bấm liên kết sau khi mở lại đi tới đúng ô", JSON.stringify(at));
} finally { await session.close(); }
