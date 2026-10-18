// Sheet: T.TEST / F.TEST / CHISQ.TEST / GAMMA nhập trong ứng dụng desktop, tính đúng, lưu XLSX (tiền tố _xlfn.).
// Đọc lại: soffice chuyển XLSX -> CSV và so với giá trị trong ô (scripts/audit-0610/sheet_hypothesis_roundtrip.py).
import path from "node:path";
import { launchApp } from "./session.mjs";
import { sleep } from "./actions.mjs";

const profile = process.env.VNO_CDP_LOCALAPPDATA;
if (!profile) throw new Error("VNO_CDP_LOCALAPPDATA must point to an isolated profile.");
const out = path.join(profile, "hypothesis.xlsx");
const session = await launchApp("sheet", { localAppData: profile });
const { cdp } = session;
const checks = [];
const check = (name, pass, detail = "") => {
  checks.push(Boolean(pass));
  console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`);
};
try {
  await sleep(2000);
  const result = await cdp.evaluate(`(() => {
    const g = window.__vnoAppInstance.grid;
    const A = [3, 5, 7, 9, 11, 14], C = [4, 7, 9];
    A.forEach((v, i) => g.setCellValue('A', i + 1, String(v)));
    C.forEach((v, i) => g.setCellValue('C', i + 1, String(v)));
    g.setCellValue('E', 1, '=T.TEST(A1:A6,C1:C3,2,3)');
    g.setCellValue('E', 2, '=F.TEST(A1:A6,C1:C3)');
    g.setCellValue('E', 3, '=GAMMA(4.5)');
    g.setCellValue('E', 4, '=TTEST(A1:A6,C1:C3,2,2)');
    return JSON.stringify(['E1', 'E2', 'E3', 'E4'].map(k => g.cellsData.get(k)?.val));
  })()`);
  const values = JSON.parse(result).map(Number);
  const expected = [0.518274455715406, 0.610120373021096, 11.6317283965675, 0.579821766206743];
  check("Ô tính đúng T.TEST, F.TEST, GAMMA, TTEST", values.every((v, i) => Math.abs(v - expected[i]) < 1e-9), result);
  const saved = await cdp.evaluate(`globalThis.globalUnoBridge.saveRealFileInPlace("sheet", window.__vnoAppInstance.adapter.serializeToFods(), ${JSON.stringify(out)}, null)`, { timeoutMilliseconds: 600000 });
  check("Lưu XLSX", saved?.status === "ok", JSON.stringify(saved).slice(0, 100));
  console.log("OUT " + out);
} catch (error) {
  check("Không phát sinh ngoại lệ", false, error.stack || error.message);
} finally {
  await session.close();
}
if (checks.some((c) => !c)) process.exit(1);
