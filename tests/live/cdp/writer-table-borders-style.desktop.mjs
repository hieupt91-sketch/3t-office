// Writer: Thiết kế Bảng > Đường viền bảng > Kiểu viền… (nét đứt 2,25 pt đỏ, viền ngoài); lưu DOCX; Word COM đọc LineStyle/LineWidth/Color.
// Cần VNO_CDP_LOCALAPPDATA. Đọc lại bằng scripts/audit-0610/word_table_borders_readback.ps1.
import path from "node:path";
import { launchApp } from "./session.mjs";
import { click, sleep } from "./actions.mjs";

const profile = process.env.VNO_CDP_LOCALAPPDATA;
if (!profile) throw new Error("VNO_CDP_LOCALAPPDATA must point to an isolated profile.");
const output = path.join(profile, "writer-table-borders.docx");
const session = await launchApp("writer", { localAppData: profile });
const { cdp } = session;
const checks = [];
const check = (name, pass, detail = "") => {
  checks.push(Boolean(pass));
  console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`);
};
try {
  await sleep(1500);
  await click(cdp, ".vno-writer-body");
  await cdp.evaluate(`window.__vnoAppInstance.adapter.insertTable(2, 2)`);
  await sleep(500);
  await click(cdp, ".vno-writer-body table td");
  await sleep(300);
  const opened = await cdp.evaluate(`(async () => { window.__vnoAppInstance.adapter.openTableBordersDialog(); await new Promise(r => setTimeout(r, 400)); return !!document.querySelector('#vno-tblb-style'); })()`);
  check("Hộp thoại Kiểu viền… mở khi con trỏ trong bảng", opened === true);
  await cdp.evaluate(`(() => { const set = (id, v) => { const el = document.querySelector(id); el.value = v; el.dispatchEvent(new Event('change', { bubbles: true })); }; set('#vno-tblb-type', 'outside'); set('#vno-tblb-style', 'dashed'); set('#vno-tblb-width', '2.25'); set('#vno-tblb-color', '#ff0000'); })()`);
  const preview = await cdp.evaluate(`document.querySelector('#vno-tblb-preview').style.border`);
  check("Xem trước theo lựa chọn", /dashed/.test(preview) && /3px/.test(preview), preview);
  await click(cdp, ".vno-dialog-ok-btn");
  await sleep(500);
  const borders = await cdp.evaluate(`(() => { const t = document.querySelector('.vno-writer-body table'); const c = t.rows[0].cells[0]; const d = t.rows[1].cells[1]; return JSON.stringify({ aTop: c.style.borderTop, aRight: c.style.borderRight, aLeft: c.style.borderLeft, aBottom: c.style.borderBottom, dTop: d.style.borderTop, dRight: d.style.borderRight, html: c.getAttribute('style'), dBottom: d.style.borderBottom, dLeft: d.style.borderLeft }); })()`);
  const b = JSON.parse(borders);
  check("Viền ngoài nét đứt đỏ 3px; viền trong ô (phải ô A) không có", /dashed/.test(b.aTop) && /3px/.test(b.aTop) && /dashed/.test(b.dBottom) && !/solid|dashed/.test(b.aRight) && !/solid|dashed/.test(b.dLeft) && /dashed/.test(b.aLeft) && /dashed/.test(b.dRight) && !/border-image/.test(b.html), borders);
  console.log("Kiểm tra DOCX bằng scripts/audit-0610/word_table_borders_readback.ps1: 4 cạnh ngoài LineStyle=4 (nét đứt) LineWidth=18 (2,25 pt) Color=255 (đỏ)");
  const content = await cdp.evaluate("window.__vnoAppInstance.adapter._contentForExport()");
  const result = await cdp.evaluate(
    `globalThis.globalUnoBridge.saveRealFileInPlace("writer", ${JSON.stringify(content)}, ${JSON.stringify(output)}, null)`,
    { timeoutMilliseconds: 1200000 },
  );
  check("Lưu DOCX", result?.status === "ok", JSON.stringify(result).slice(0, 100));
  console.log("OUT " + output);
} catch (error) {
  check("Không phát sinh ngoại lệ", false, error.stack || error.message);
} finally {
  await session.close();
}
if (checks.some((c) => !c)) process.exit(1);
