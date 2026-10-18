// Sheet: Page Setup > tab Trang tính (in lưới, tiêu đề hàng/cột, trắng đen, thứ tự trang, ghi chú, vùng in, tiêu đề lặp) lưu XLSX.
// Đọc XML: scripts/audit-0610/sheet_print_options_xml.py (kiểm printOptions, pageSetup, definedName).
import path from "node:path";
import { launchApp } from "./session.mjs";
import { sleep } from "./actions.mjs";

const profile = process.env.VNO_CDP_LOCALAPPDATA;
if (!profile) throw new Error("VNO_CDP_LOCALAPPDATA must point to an isolated profile.");
const out = path.join(profile, "print-options.xlsx");
const session = await launchApp("sheet", { localAppData: profile });
const { cdp } = session;
const checks = [];
const check = (name, pass, detail = "") => {
  checks.push(Boolean(pass));
  console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`);
};
try {
  await sleep(2000);
  const state = await cdp.evaluate(`(() => {
    const g = window.__vnoAppInstance.grid;
    ['Ten', 'Diem'].forEach((v, i) => g.setCellValue(String.fromCharCode(65 + i), 1, v));
    g.setCellValue('A', 2, 'An'); g.setCellValue('B', 2, '9');
    const r = g.setPageSetup({ printOptions: { gridlines: true, headings: true, blackAndWhite: true, comments: 'sheetEnd', pageOrder: 'overThenDown' } });
    return JSON.stringify(g.getPageSetup().printOptions);
  })()`);
  const options = JSON.parse(state);
  check("setPageSetup ghi đủ tuỳ chọn in", options.gridlines && options.headings && options.blackAndWhite && options.comments === "sheetEnd" && options.pageOrder === "overThenDown", state);
  const saved = await cdp.evaluate(`globalThis.globalUnoBridge.saveRealFileInPlace("sheet", window.__vnoAppInstance.adapter.serializeToFods(), ${JSON.stringify(out)}, null)`, { timeoutMilliseconds: 600000 });
  check("Lưu XLSX", saved?.status === "ok", JSON.stringify(saved).slice(0, 100));
  console.log("OUT " + out);
} catch (error) {
  check("Không phát sinh ngoại lệ", false, error.stack || error.message);
} finally {
  await session.close();
}
if (checks.some((c) => !c)) process.exit(1);
