// EXCEL-G4: Điền lên / Điền trái / Chuỗi (tuyến tính, tăng trưởng, ngày) trong app desktop; lưu XLSX; mở lại; Excel 2016 đọc cùng giá trị.
import { copyFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { launchApp } from "./session.mjs";
const profile = process.env.VNO_CDP_LOCALAPPDATA;
if (!profile) throw new Error("Set VNO_CDP_LOCALAPPDATA.");
mkdirSync(profile, { recursive: true });
const file = path.join(profile, "fill-series.xlsx");
copyFileSync(path.resolve("tests/live/cdp/test_sheet_home.xlsx"), file);
const results = [];
const check = (ok, msg, detail = "") => { results.push({ ok, msg }); console.log(`${ok ? "PASS" : "FAIL"} | ${msg}${detail ? " | " + detail : ""}`); };
const waitReady = (cdp) => cdp.waitFor("window.__vnoAppInstance?.grid?.cellsData?.size > 0 && !document.querySelector('.vno-sheet-quick-view')", { timeoutMilliseconds: 240000 });

let session = await launchApp("sheet", { localAppData: profile, filePath: file, startTimeoutMilliseconds: 240000, readyTimeoutMilliseconds: 240000 });
try {
  const cdp = session.cdp;
  await waitReady(cdp);
  const out = JSON.parse(await cdp.evaluate(`JSON.stringify((() => {
    const g = window.__vnoAppInstance.grid;
    const range = (a, b) => ({ start: { c: a[0], r: Number(a.slice(1)) }, end: { c: b[0], r: Number(b.slice(1)) } });
    const v = k => g.cellsData.get(k)?.val;
    const r = {};
    // Điền lên: A5 là nguồn, A1:A5 chọn
    g.setCellValue("A", 5, "đáy");
    r.up = g.fillUp(range("A1", "A5"));
    r.upA1 = v("A1"); r.upA4 = v("A4");
    // Điền trái: E10 là nguồn
    g.setCellValue("E", 10, "phải");
    r.left = g.fillLeft(range("B10", "E10"));
    r.leftB10 = v("B10"); r.leftD10 = v("D10");
    // Chuỗi tuyến tính theo cột G1:G5, bước 2
    g.setCellValue("G", 1, 1);
    r.linear = g.fillSeries({ axis: "columns", type: "linear", step: 2 }, range("G1", "G5"));
    r.lin = [1,2,3,4,5].map(i => v("G" + i));
    // Tăng trưởng theo hàng H20:L20, bước 3
    g.setCellValue("H", 20, 2);
    r.growth = g.fillSeries({ axis: "rows", type: "growth", step: 3 }, range("H20", "L20"));
    r.gro = ["H","I","J","K","L"].map(c => v(c + "20"));
    // Ngày theo tháng M1:M4
    g.setCellValue("M", 1, "31/01/2024");
    r.date = g.fillSeries({ axis: "columns", type: "date", dateUnit: "month", step: 1 }, range("M1", "M4"));
    r.dat = [1,2,3,4].map(i => v("M" + i));
    // Một ô + giá trị dừng: O1=1 ... đến 5
    g.setCellValue("O", 1, 1);
    r.stop = g.fillSeries({ axis: "columns", type: "linear", step: 1, stop: 5 }, range("O1", "O1"));
    r.stp = [1,2,3,4,5,6].map(i => v("O" + i));
    return r;
  })())`));
  check(out.up === true && out.upA1 === "đáy" && out.upA4 === "đáy", "Điền lên: ô dưới cùng sao chép lên A1:A4", `${out.upA1}, ${out.upA4}`);
  check(out.left === true && out.leftB10 === "phải" && out.leftD10 === "phải", "Điền trái: cột phải nhất sao chép sang B:D", `${out.leftB10}, ${out.leftD10}`);
  check(JSON.stringify(out.lin) === JSON.stringify([1, 3, 5, 7, 9]), "Chuỗi tuyến tính bước 2 = 1,3,5,7,9", JSON.stringify(out.lin));
  check(JSON.stringify(out.gro) === JSON.stringify([2, 6, 18, 54, 162]), "Chuỗi tăng trưởng bước 3 = 2,6,18,54,162", JSON.stringify(out.gro));
  check(JSON.stringify(out.dat) === JSON.stringify([45322, 45351, 45382, 45412]), "Chuỗi ngày theo tháng (31/01, 29/02, 31/03, 30/04 — kẹp cuối tháng)", JSON.stringify(out.dat));
  check(JSON.stringify(out.stp) === JSON.stringify([1, 2, 3, 4, 5, undefined]) || (out.stp[4] === 5 && (out.stp[5] === undefined || out.stp[5] === null || out.stp[5] === "")), "Một ô + giá trị dừng 5 điền tới O5", JSON.stringify(out.stp));
  // lệnh qua ribbon/CommandBus
  const viaBus = JSON.parse(await cdp.evaluate(`(async () => {
    const { globalCommandBus: bus } = await import('/platform/commands/command-bus.js');
    return JSON.stringify({ up: bus.hasHandler('sheet.edit.fillUp'), left: bus.hasHandler('sheet.edit.fillLeft'), series: bus.hasHandler('sheet.edit.fillSeries') });
  })()`, { awaitPromise: true }));
  check(viaBus.up && viaBus.left && viaBus.series, "Ba lệnh Điền lên / Điền trái / Chuỗi đã gắn vào CommandBus", JSON.stringify(viaBus));
  const dialog = JSON.parse(await cdp.evaluate(`(async () => {
    const { globalCommandBus: bus } = await import('/platform/commands/command-bus.js');
    const g = window.__vnoAppInstance.grid; g.selectCell('Q', 1); g.setCellValue('Q', 1, 10);
    await bus.execute('sheet.edit.fillSeries');
    await new Promise(r => setTimeout(r, 300));
    const ov = document.querySelector('.vno-rule-overlay,.vno-dialog-overlay,[class*=overlay]');
    const text = ov ? ov.innerText.replace(/\\s+/g, ' ').slice(0, 200) : '';
    const hasFields = !!document.querySelector('#vno-fs-step') && !!document.querySelector('#vno-fs-stop') && !!document.querySelector('#vno-fs-unit');
    document.querySelectorAll('.vno-rule-cancel,.vno-dialog-close').forEach(b => b.click());
    return JSON.stringify({ hasFields, text });
  })()`, { awaitPromise: true }));
  check(dialog.hasFields, "Hộp thoại Chuỗi... có đủ Bước nhảy, Giá trị dừng, Đơn vị ngày", dialog.text);
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
    const v = k => g.cellsData.get(k)?.val;
    return { lin: [1,2,3,4,5].map(i => v("G" + i)), gro: ["H","I","J","K","L"].map(c => v(c + "20")), a1: v("A1"), b10: v("B10") };
  })())`));
  check(JSON.stringify(re.lin) === JSON.stringify([1, 3, 5, 7, 9]) && JSON.stringify(re.gro) === JSON.stringify([2, 6, 18, 54, 162]) && re.a1 === "đáy" && re.b10 === "phải", "Mở lại trong app giữ đủ giá trị điền", JSON.stringify(re));
} finally { await session.close(); }

const ps = path.resolve("tests/live/cdp/sheet-fill-series-readonly.ps1");
let raw = "";
for (let attempt = 0; attempt < 4 && !raw; attempt++) {
  try { raw = execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", ps, "-Path", file], { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 }).trim(); } catch { await new Promise(r => setTimeout(r, 3000)); }
}
const com = raw ? JSON.parse(raw.split(/\r?\n/).at(-1)) : null;
check(Boolean(com) && com.ReadOnly === true, "Excel 2016 mở được tệp (chỉ-đọc)");
check(com && JSON.stringify(com.Linear) === JSON.stringify([1, 3, 5, 7, 9]), "Excel 2016: G1:G5 = 1,3,5,7,9", JSON.stringify(com?.Linear));
check(com && JSON.stringify(com.Growth) === JSON.stringify([2, 6, 18, 54, 162]), "Excel 2016: H20:L20 = 2,6,18,54,162", JSON.stringify(com?.Growth));
check(com && com.Up === "đáy" && com.Left === "phải", "Excel 2016: A1 = đáy, B10 = phải", JSON.stringify([com?.Up, com?.Left]));
const failed = results.filter(r => !r.ok);
console.log(`SUMMARY ${results.length - failed.length}/${results.length} PASS`);
if (failed.length) process.exitCode = 1;
