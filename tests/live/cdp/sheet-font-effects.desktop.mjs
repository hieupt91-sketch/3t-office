// Sheet: Định dạng ô > Phông chữ: gạch chân đôi, gạch ngang, chỉ số trên, chỉ số dưới -> lưu XLSX -> đọc XML (scripts/audit-0610/sheet_font_xml.py).
import path from "node:path";
import { launchApp } from "./session.mjs";
import { sleep } from "./actions.mjs";

const profile = process.env.VNO_CDP_LOCALAPPDATA;
if (!profile) throw new Error("VNO_CDP_LOCALAPPDATA must point to an isolated profile.");
const out = path.join(profile, "font-effects.xlsx");
const session = await launchApp("sheet", { localAppData: profile });
const { cdp } = session;
const checks = [];
const check = (name, pass, detail = "") => {
  checks.push(Boolean(pass));
  console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`);
};
try {
  await sleep(2000);
  const model = await cdp.evaluate(`(() => {
    const g = window.__vnoAppInstance.grid;
    ['A', 'B', 'C', 'D'].forEach((c, i) => g.setCellValue(c, 1, ['Dup', 'Gach', 'Tren', 'Duoi'][i]));
    const one = (col, patch) => g.applyCellFormat({ stylePatch: patch }, { start: { c: col, r: 1 }, end: { c: col, r: 1 } });
    one('A', { fontUnderline: 'double', textDecoration: 'underline' });
    one('B', { textDecoration: 'line-through' });
    one('C', { fontPosition: 'super' });
    one('D', { fontPosition: 'sub' });
    return JSON.stringify(['A1', 'B1', 'C1', 'D1'].map(k => { const s = g.cellsData.get(k)?.style || {}; return [s.fontUnderline, s.textDecoration, s.fontPosition]; }));
  })()`);
  const m = JSON.parse(model);
  check("Mô hình ô giữ gạch chân đôi, gạch ngang, chỉ số trên/dưới", m[0][0] === "double" && /line-through/.test(m[1][1] || "") && m[2][2] === "super" && m[3][2] === "sub", model);
  const saved = await cdp.evaluate(`globalThis.globalUnoBridge.saveRealFileInPlace("sheet", window.__vnoAppInstance.adapter.serializeToFods(), ${JSON.stringify(out)}, null)`, { timeoutMilliseconds: 600000 });
  check("Lưu XLSX", saved?.status === "ok", JSON.stringify(saved).slice(0, 100));
  console.log("OUT " + out);
} catch (error) {
  check("Không phát sinh ngoại lệ", false, error.stack || error.message);
} finally {
  await session.close();
}
if (checks.some((c) => !c)) process.exit(1);
