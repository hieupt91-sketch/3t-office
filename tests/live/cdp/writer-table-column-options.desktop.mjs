// Writer: Thiết kế Bảng > Cột đầu / Cột cuối / Cột xen kẽ -> bật/tắt/hoàn tác -> lưu DOCX (Word 2016 đọc bằng scripts/audit-0610/word_table_cols_readback.ps1).
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { launchApp } from "./session.mjs";

const profile = process.env.VNO_CDP_LOCALAPPDATA || path.join(os.tmpdir(), `vno-tblcol-${Date.now()}`);
fs.mkdirSync(profile, { recursive: true });
const OUT = process.env.VNO_TBLCOL_OUT || path.join(profile, "table-columns.docx");
const session = await launchApp("writer", { localAppData: profile, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
const results = [];
const check = (name, pass, detail = "") => { results.push(Boolean(pass)); console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`); };
try {
  const { cdp } = session;
  await cdp.waitFor("!!window.__vnoAppInstance?.adapter && !!document.querySelector('.vno-writer-body')", { timeoutMilliseconds: 120000 });
  const ev = (expr) => cdp.evaluate(expr, { awaitPromise: true, timeoutMilliseconds: 240000 });
  const exec = (id) => ev(`window.globalCommandBus.execute(${JSON.stringify(id)})`);
  await ev(`(() => {
    const body = document.querySelector('.vno-writer-body');
    const cell = (t) => '<td style="border:1px solid #000;width:100px;">' + t + '</td>';
    body.innerHTML = '<table id="t1" style="border-collapse:collapse;">' + [1, 2, 3, 4].map(r => '<tr>' + ['A', 'B', 'C'].map(c => cell(c + r)).join('') + '</tr>').join('') + '</table><p>Sau bang</p>';
    document.querySelector('#t1 td').focus();
    const r = document.createRange(); r.selectNodeContents(document.querySelector('#t1 td')); const s = getSelection(); s.removeAllRanges(); s.addRange(r);
    body.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  const snap = () => ev(`JSON.stringify([...document.querySelectorAll('#t1 tr')].map(tr => [...tr.cells].map(td => (getComputedStyle(td).fontWeight >= 600 ? 'B' : '-') + (td.style.backgroundColor ? 'S' : '-'))))`).then(JSON.parse);
  const base = await snap();
  check("Bảng ban đầu không đậm, không tô", base.flat().every(x => x === "--"), JSON.stringify(base));

  await exec("writer.table.toggleFirstColumn");
  let s = await snap();
  check("Cột đầu: chỉ cột A đậm", s.every(r => r[0] === "B-" && r[1] === "--" && r[2] === "--"), JSON.stringify(s));
  await exec("writer.table.toggleLastColumn");
  s = await snap();
  check("Cột cuối: thêm cột C đậm", s.every(r => r[0] === "B-" && r[1] === "--" && r[2] === "B-"));
  await exec("writer.table.toggleBandedColumns");
  s = await snap();
  check("Cột xen kẽ: cột A và C tô màu, cột B không", s.every(r => r[0] === "BS" && r[1] === "--" && r[2] === "BS"), JSON.stringify(s));
  await exec("writer.table.toggleBandedRows");
  s = await snap();
  const bothOk = s.every((r, i) => i % 2 === 1 ? r.every(x => x.endsWith("S")) : r[0].endsWith("S") && r[2].endsWith("S"));
  check("Hàng xen kẽ bật cùng cột xen kẽ không làm mất màu cột", bothOk, JSON.stringify(s));
  await exec("writer.table.toggleBandedRows");

  // Lưu để Word đọc: giữ cột đầu, cột cuối, cột xen kẽ bật.
  const saved = await ev(`(async () => { const a = window.__vnoAppInstance.adapter; a.isDirty = true; const c = a._contentForExport(); return JSON.stringify(await globalThis.globalUnoBridge.saveRealFileInPlace("writer", c, ${JSON.stringify(OUT)}, null)); })()`);
  check("Lưu DOCX", /"status":"ok"/.test(saved), saved.slice(0, 80));
  console.log("OUT " + OUT);

  // Tắt cả ba: trả về như ban đầu.
  await exec("writer.table.toggleBandedColumns");
  await exec("writer.table.toggleLastColumn");
  await exec("writer.table.toggleFirstColumn");
  s = await snap();
  check("Tắt cả ba: bảng về như ban đầu", s.flat().every(x => x === "--"), JSON.stringify(s));
} catch (error) {
  check("Không phát sinh ngoại lệ", false, error.stack || error.message);
} finally { await session.close(); }
if (results.some(r => !r)) process.exit(1);
