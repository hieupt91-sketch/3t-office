// EXCEL-G4: tham chiếu có cấu trúc Table1[Cột] - tính trong app desktop, lưu XLSX, mở lại, Excel 2016 đọc cùng công thức.
import { copyFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { launchApp } from "./session.mjs";
const profile = process.env.VNO_CDP_LOCALAPPDATA;
if (!profile) throw new Error("Set VNO_CDP_LOCALAPPDATA.");
mkdirSync(profile, { recursive: true });
const file = path.join(profile, "structured-refs.xlsx");
copyFileSync(path.resolve("tests/live/cdp/test_sheet_home.xlsx"), file);
const results = [];
const check = (ok, msg, detail = "") => { results.push({ ok, msg }); console.log(`${ok ? "PASS" : "FAIL"} | ${msg}${detail ? " | " + detail : ""}`); };
const waitReady = (cdp) => cdp.waitFor("window.__vnoAppInstance?.grid?.cellsData?.size > 0 && !document.querySelector('.vno-sheet-quick-view')", { timeoutMilliseconds: 240000 });

let session = await launchApp("sheet", { localAppData: profile, filePath: file, startTimeoutMilliseconds: 240000, readyTimeoutMilliseconds: 240000 });
try {
  const cdp = session.cdp;
  await waitReady(cdp);
  const built = JSON.parse(await cdp.evaluate(`JSON.stringify((() => {
    const g = window.__vnoAppInstance.grid;
    const rows = [["Tên","SL","Giá"],["An",2,10],["Bình",3,20],["Chi",4,30],["Dũng",5,40]];
    rows.forEach((row, r) => row.forEach((v, c) => g.setCellValue("ABC"[c], r + 1, v)));
    g.setCellValue("D", 1, "Thành tiền");
    const ok = g.formatAsTable("tableBlue", { start: { c: "A", r: 1 }, end: { c: "D", r: 5 } }, true, { name: "Sales" });
    g.setCellValue("E1", 1, "x");
    g.setCellValue("E", 2, "=SUM(Sales[SL])");
    g.setCellValue("E", 3, "=AVERAGE(Sales[Giá])");
    for (let r = 2; r <= 5; r++) g.setCellValue("D", r, "=[@SL]*[@Giá]");
    g.setCellValue("E", 4, "=COUNTA(Sales[#All])");
    g.setCellValue("E", 5, "=SUM(Sales[[SL]:[Giá]])");
    const get = (c, r) => g.cellsData.get(c + r)?.val;
    return { ok, tables: g.tablesBySheet[g.activeSheet].map(t => t.name + ":" + t.ref), E2: get("E",2), E3: get("E",3), E4: get("E",4), E5: get("E",5), D2: get("D",2), D5: get("D",5) };
  })())`));
  check(built.ok !== false, "Tạo bảng Sales", JSON.stringify(built.tables));
  check(built.E2 === 14, "=SUM(Sales[SL]) = 14", String(built.E2));
  check(built.E3 === 25, "=AVERAGE(Sales[Giá]) = 25", String(built.E3));
  check(built.D2 === 20 && built.D5 === 200, "=[@SL]*[@Giá] theo từng dòng", `${built.D2}, ${built.D5}`);
  check(built.E5 === 14 + 100, "=SUM(Sales[[SL]:[Giá]]) = 114", String(built.E5));
  await cdp.evaluate(`(() => { window.__vnoAppInstance.adapter.isDirty = true; return 1; })()`);
  const saved = await cdp.evaluate("window.__vnoAppInstance.adapter.save()", { awaitPromise: true, timeoutMilliseconds: 240000 });
  check(saved !== false && saved?.status !== "error", "Lưu XLSX qua app desktop");
  await new Promise(r => setTimeout(r, 800));
} finally { await session.close(); }
console.log(`FILE ${file}`);

session = await launchApp("sheet", { localAppData: profile, filePath: file, startTimeoutMilliseconds: 240000, readyTimeoutMilliseconds: 240000 });
try {
  const cdp = session.cdp;
  await waitReady(cdp);
  const re = JSON.parse(await cdp.evaluate(`JSON.stringify((() => {
    const g = window.__vnoAppInstance.grid;
    const c = k => g.cellsData.get(k) || {};
    return { E2f: c("E2").formula, E2: c("E2").val, D3f: c("D3").formula, D3: c("D3").val, E5f: c("E5").formula, E5: c("E5").val, tables: (g.tablesBySheet[g.activeSheet] || []).map(t => t.name) };
  })())`));
  check(re.E2 === 14 && /Sales\[SL\]/.test(re.E2f || ""), "Mở lại: công thức bảng giữ nguyên dạng Sales[SL] và giá trị 14", `${re.E2f} => ${re.E2}`);
  check(re.D3 === 60 && /@|#This Row/.test(re.D3f || ""), "Mở lại: [@SL]*[@Giá] giữ giá trị 60", `${re.D3f} => ${re.D3}`);
  check(re.E5 === 114, "Mở lại: SUM(Sales[[SL]:[Giá]]) = 114", `${re.E5f} => ${re.E5}`);
} finally { await session.close(); }

const ps = path.resolve("tests/live/cdp/sheet-structured-refs-readonly.ps1");
let comRaw = "";
for (let attempt = 0; attempt < 4 && !comRaw; attempt++) {
  try { comRaw = execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", ps, "-Path", file], { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 }).trim(); } catch { await new Promise(r => setTimeout(r, 3000)); }
}
const com = comRaw ? JSON.parse(comRaw.split(/\r?\n/).at(-1)) : null;
check(Boolean(com) && com.ReadOnly === true, "Excel 2016 mở được tệp (chỉ-đọc)");
check(com && /Sales\[SL\]/.test(com.E2Formula) && Number(com.E2Value) === 14, "Excel 2016: E2 là SUM(Sales[SL]) = 14", JSON.stringify([com?.E2Formula, com?.E2Value]));
check(com && /Sales\[\[#This Row\],\[SL\]\]|\[@SL\]/.test(com.D3Formula) && Number(com.D3Value) === 60, "Excel 2016: D3 là dòng hiện tại * = 60", JSON.stringify([com?.D3Formula, com?.D3Value]));
check(com && /Sales\[\[SL\]:\[Giá\]\]/.test(com.E5Formula) && Number(com.E5Value) === 114, "Excel 2016: E5 là SUM(Sales[[SL]:[Giá]]) = 114", JSON.stringify([com?.E5Formula, com?.E5Value]));
const failed = results.filter(r => !r.ok);
console.log(`SUMMARY ${results.length - failed.length}/${results.length} PASS`);
if (failed.length) process.exitCode = 1;
