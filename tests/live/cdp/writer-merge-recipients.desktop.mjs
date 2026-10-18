// Writer: Trộn thư > Nguồn dữ liệu - danh sách người nhận: tìm/lọc, bỏ chọn, sắp xếp theo cột, chống chèn HTML, Lưu giữ thứ tự + lựa chọn.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { launchApp } from "./session.mjs";
import { click } from "./actions.mjs";

const profile = process.env.VNO_CDP_LOCALAPPDATA || path.join(os.tmpdir(), `vno-mmr-${Date.now()}`);
fs.mkdirSync(profile, { recursive: true });
const session = await launchApp("writer", { localAppData: profile, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
const results = [];
const check = (name, pass, detail = "") => { results.push(Boolean(pass)); console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`); };
try {
  const { cdp } = session;
  await cdp.waitFor("!!window.__vnoAppInstance?.adapter && !!document.querySelector('.vno-writer-body')", { timeoutMilliseconds: 120000 });
  const ev = (expr) => cdp.evaluate(expr, { awaitPromise: true, timeoutMilliseconds: 120000 });
  void ev(`window.globalCommandBus.execute("writer.mailMerge.open")`);
  await cdp.waitFor("document.querySelector('.vno-merge-toggle-paste-btn')", { timeoutMilliseconds: 15000 });
  await click(cdp, ".vno-merge-toggle-paste-btn");
  await ev(`(() => { document.querySelector('.vno-merge-csv-textarea').value = ${JSON.stringify("HoTen,Tuoi,<u id=hx>Cot</u>\nTran Binh,30,a\nAn Khang,9,b\n<b id=\"xss\">Dinh</b>,25,c\nLe Hoa,100,d")}; })()`);
  await click(cdp, ".vno-merge-apply-paste-btn");
  const rows = () => ev(`[...document.querySelectorAll('.vno-merge-tbody tr')].map(tr => tr.cells[1] ? tr.cells[1].textContent.trim() : '').join('|')`);
  check("Nạp 4 người nhận", (await rows()).split("|").length === 4, await rows());
  check("Tên có thẻ HTML được hiện nguyên văn, không chạy thẻ", await ev(`document.querySelector('#xss') === null && document.querySelector('.vno-merge-tbody').textContent.includes('<b id=xss>')`));
  // Tìm / lọc
  await ev(`(() => { const i = document.querySelector('.vno-merge-search-input'); i.value = 'an'; i.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  const filtered = await rows();
  check("Tìm «an» chỉ còn Tran Binh, An Khang", filtered === "Tran Binh|An Khang", filtered);
  await ev(`(() => { const i = document.querySelector('.vno-merge-search-input'); i.value = ''; i.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  // Sắp xếp theo cột HoTen rồi giảm dần, sau đó theo cột Tuoi (số)
  await click(cdp, '.vno-merge-sort-th[data-sort-field="HoTen"]');
  const asc = await rows();
  const ascList = asc.split("|");
  check("Tăng dần: danh sách đúng thứ tự chữ cái", [...ascList].sort((a, b) => a.localeCompare(b, "vi", { sensitivity: "base" })).join("|") === asc, asc);
  await click(cdp, '.vno-merge-sort-th[data-sort-field="HoTen"]');
  const desc = (await rows()).split("|");
  check("Bấm lần hai: giảm dần", desc.join("|") === [...ascList].reverse().join("|"), desc.join("|"));
  await click(cdp, '.vno-merge-sort-th[data-sort-field="Tuoi"]');
  const byAge = await ev(`[...document.querySelectorAll('.vno-merge-tbody tr')].map(tr => tr.cells[2].textContent.trim()).join('|')`);
  check("Sắp xếp cột số theo giá trị số (9 < 25 < 30 < 100)", byAge === "9|25|30|100", byAge);
  // Bỏ chọn Le Hoa (dòng cuối: Tuoi 100) rồi Lưu
  await ev(`(() => { const tr = [...document.querySelectorAll('.vno-merge-tbody tr')].find(t => t.cells[2].textContent.trim() === '100'); tr.querySelector('.vno-merge-row-checkbox').click(); })()`);
  await click(cdp, ".vno-dialog-save-btn");
  const kept = JSON.parse(await ev(`JSON.stringify({ all: window.__vnoAppInstance.adapter.mailMergeData.records.map(r => r.Tuoi), sel: window.__vnoAppInstance.adapter._getActiveMailMergeRecords().map(r => r.Tuoi) })`));
  check("Sau khi Lưu: giữ thứ tự theo tuổi và loại người đã bỏ chọn", kept.all.join("|") === "9|25|30|100" && kept.sel.join("|") === "9|25|30", JSON.stringify(kept));
  // Hộp «Chèn trường trộn»: tên cột chứa thẻ HTML vẫn hiện nguyên văn.
  void ev(`window.globalCommandBus.execute("writer.mailMerge.insertField")`);
  await cdp.waitFor("document.querySelector('#vno-merge-field-select')", { timeoutMilliseconds: 15000 });
  check("Hộp Chèn trường: tên cột có thẻ HTML hiện nguyên văn, không chạy thẻ", await ev(`document.querySelector('#hx') === null && [...document.querySelectorAll('#vno-merge-field-select option')].some(o => o.textContent === '<u id=hx>Cot</u>')`));
} catch (error) {
  check("Không phát sinh ngoại lệ", false, error.stack || error.message);
} finally { await session.close(); }
if (results.some(r => !r)) process.exit(1);
