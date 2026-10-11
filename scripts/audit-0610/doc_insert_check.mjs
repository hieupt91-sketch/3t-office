// D13 end-to-end: Trang trắng và Văn bản thành bảng -> lưu DOCX bằng luồng của app -> đọc XML. Chỉ CDP.
// Chạy: node --experimental-websocket scripts/audit-0610/doc_insert_check.mjs
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { launchApp } from "../../tests/live/cdp/session.mjs";
import { insertText } from "../../tests/live/cdp/actions.mjs";

const execFileAsync = promisify(execFile);
const temp = await fs.mkdtemp(path.join(os.tmpdir(), "vno-doc-insert-"));
const docx = path.join(temp, "insert.docx");
const rows = [];
const rec = (name, ok, value) => { rows.push({ name, ok }); console.log(ok ? "PASS" : "FAIL", "|", name, "|", JSON.stringify(value).slice(0, 200)); };
let session;
const ev = (expression, options) => session.cdp.evaluate(expression, options);

async function selectParagraphs(first, last) {
  return ev(`(() => { const ps=[...document.querySelectorAll('.vno-writer-body p')]; const a=ps.find(p=>p.textContent.includes(${JSON.stringify(first)})); const b=ps.find(p=>p.textContent.includes(${JSON.stringify(last)})); if(!a||!b) return false; const r=document.createRange(); r.setStartBefore(a.firstChild||a); r.setEndAfter(b.lastChild||b); const s=getSelection(); s.removeAllRanges(); s.addRange(r); return true; })()`);
}
async function inspect(file) {
  const py = String.raw`import sys,zipfile,re,json
x=zipfile.ZipFile(sys.argv[1]).read('word/document.xml').decode('utf-8')
tbl=re.findall(r'<w:tbl>.*?</w:tbl>',x,re.S)
out={'tables':len(tbl),'brPage':x.count('w:type="page"'),'pageBreakBefore':x.count('<w:pageBreakBefore')}
if tbl:
  out['rows']=len(re.findall(r'<w:tr[ >]',tbl[0])); out['cells']=len(re.findall(r'<w:tc>',tbl[0]))
  out['text']=''.join(re.findall(r'<w:t[^>]*>([^<]*)</w:t>',tbl[0]))
print(json.dumps(out,ensure_ascii=False))`;
  const { stdout } = await execFileAsync(process.env.VNO_PYTHON || "python", ["-c", py, file], { maxBuffer: 8 * 1024 * 1024 });
  return JSON.parse(stdout);
}

try {
  session = await launchApp("writer", { startTimeoutMilliseconds: 90000 });
  await ev(`document.querySelector('.vno-writer-body')?.focus()`);
  await insertText(session.cdp, "TITLE_P\nNAME;ROLE;ROOM\nAn;Truong phong;P1\nBinh;Ke toan;P2\nEND_P");

  // Văn bản thành bảng: mở hộp thoại thật, chọn dấu chấm phẩy, tạo bảng.
  rec("Chọn được 3 đoạn dữ liệu", await selectParagraphs("NAME;ROLE;ROOM", "Binh;Ke toan;P2"), true);
  ev(`globalThis.__vnoGlobalCommandBus.execute('writer.table.fromText')`).catch(() => {});
  await session.cdp.waitFor(`!!document.querySelector('.vno-text-to-table-dialog')`, { timeoutMilliseconds: 10000 });
  await ev(`(() => { const s=document.querySelector('#vno-t2t-delim'); s.value='semicolon'; s.dispatchEvent(new Event('change',{bubbles:true})); })()`);
  const summary = await ev(`document.querySelector('#vno-t2t-summary').textContent`);
  rec("Hộp thoại báo đúng 3 hàng × 3 cột", /3 hàng × 3 cột/.test(summary), summary);
  await ev(`document.querySelector('.vno-dialog-ok-btn').click()`);
  await session.cdp.waitFor(`!document.querySelector('.vno-text-to-table-dialog')`, { timeoutMilliseconds: 10000 });
  const dom = await ev(`(() => { const t=document.querySelector('.vno-writer-body table'); return t ? {rows:t.rows.length, cols:t.rows[0].cells.length, first:t.rows[0].cells[0].textContent, last:t.rows[2].cells[2].textContent, stillThere:document.body.innerText.includes('NAME;ROLE')} : null; })()`);
  rec("Bảng thay thế đoạn gốc (3×3, ô đúng, không còn chữ thô)", dom && dom.rows === 3 && dom.cols === 3 && dom.first === "NAME" && dom.last === "P2" && !dom.stillThere, dom);

  // Hoàn tác một bước trả lại các đoạn gốc; làm lại.
  await ev(`globalThis.__vnoGlobalCommandBus.execute('common.edit.undo')`);
  await new Promise(r => setTimeout(r, 300));
  const undone = await ev(`({tables:document.querySelectorAll('.vno-writer-body table').length, text:document.body.innerText.includes('NAME;ROLE;ROOM')})`);
  rec("Hoàn tác một bước khôi phục đoạn gốc", undone.tables === 0 && undone.text === true, undone);
  await ev(`globalThis.__vnoGlobalCommandBus.execute('common.edit.redo')`);
  await new Promise(r => setTimeout(r, 300));

  // Trang trắng ở cuối tài liệu.
  await ev(`(() => { const p=[...document.querySelectorAll('.vno-writer-body p')].find(e=>e.textContent.includes('END_P')); const r=document.createRange(); r.selectNodeContents(p); r.collapse(false); const s=getSelection(); s.removeAllRanges(); s.addRange(r); })()`);
  await ev(`globalThis.__vnoGlobalCommandBus.execute('writer.page.blank')`);
  const breaks = await ev(`document.querySelectorAll('.vno-writer-body [data-vno-page-break]').length`);
  rec("Trang trắng chèn 2 ngắt trang", breaks === 2, breaks);

  const saved = await ev(`globalThis.globalUnoBridge.saveRealFileInPlace("writer",window.__vnoAppInstance.adapter._contentForExport(),${JSON.stringify(docx)},null)`, { timeoutMilliseconds: 1200000 });
  rec("Lưu DOCX qua luồng của app", saved?.status === "ok", saved?.status);
  const x = await inspect(docx);
  rec("DOCX: có đúng 1 bảng 3 hàng 9 ô, đúng chữ", x.tables === 1 && x.rows === 3 && x.cells === 9 && x.text.includes("NAMEROLEROOM") && x.text.includes("Binh") , x);
  rec("DOCX: có ít nhất 2 ngắt trang cho Trang trắng", x.brPage + x.pageBreakBefore >= 2, x);
} catch (error) {
  rec("Lỗi chạy kiểm tra", false, String(error?.stack || error));
} finally {
  await session?.close?.();
}
const failed = rows.filter(r => !r.ok).length;
console.log(`TONG: ${rows.length - failed} PASS, ${failed} FAIL`);
process.exit(failed ? 1 : 0);
