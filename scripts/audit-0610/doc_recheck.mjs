import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { roundtripFile } from '../../tests/live/cdp/roundtrip-file.mjs';
import { listZipEntries, readZipEntry } from '../../tests/helpers/zip-package.mjs';

// Re-run against the disposable source fixtures created by the 2026-10-03 audit.
// Override VNO_AUDIT_FIXTURES and VNO_AUDIT_OUT to use another private location.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const fixtures = process.env.VNO_AUDIT_FIXTURES || 'E:/tmp/doc-basics-audit';
const outDir = process.env.VNO_AUDIT_OUT || path.join(os.tmpdir(), 'vno-doc-recheck-0610');
const localAppData = process.env.LOCALAPPDATA;
if (!localAppData) throw new Error('LOCALAPPDATA must point to the dedicated audit profile.');
await fs.mkdir(outDir, { recursive: true });
const rows = [];
const esc = s => s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const has = (xml, re) => re.test(xml || '');
async function roundtrip(name) {
  const input = path.join(fixtures, name), output = path.join(outDir, name.replace('.docx', '-0610.docx'));
  await fs.access(input);
  const result = await roundtripFile({ app: 'writer', input, output });
  const entries = await listZipEntries(output);
  const read = async n => entries.includes(n) ? (await readZipEntry(output, n)).toString('utf8') : '';
  return { result, entries, document: await read('word/document.xml'), styles: await read('word/styles.xml'), comments: await read('word/comments.xml'), output };
}
function row(item, old, status, evidence, repro='') { rows.push({item,old,status,evidence,repro}); }
try {
  const char = await roundtrip('doc9-basics.docx');
  const d = char.document;
  const characterChecks = {
    bold: has(d, /<w:b(?:\s|\/|>)/), italic: has(d, /<w:i(?:\s|\/|>)/), underline: has(d, /<w:u\b/), strike: has(d, /<w:strike\b/),
    superscript: has(d, /<w:vertAlign[^>]*w:val="superscript"/), subscript: has(d, /<w:vertAlign[^>]*w:val="subscript"/), size: has(d, /<w:sz\b/), color: has(d, /<w:color\b/), font: has(d, /<w:rFonts\b/),
  };
  const cFalse = Object.entries(characterChecks).filter(([,v])=>!v).map(([k])=>k);
  row('B2 ma trận định dạng ký tự round-trip DOCX','FAIL','BLOCKED',`Đã round-trip ${char.output} (${char.result.outputBytes} bytes); fixture doc9-basics không có các run cần kiểm tra (giá trị nhận được: ${JSON.stringify(characterChecks)}), nên không thể đánh giá ma trận do app xuất.`, '1) Áp dụng đủ 9 thuộc tính trên các run riêng; 2) lưu qua app; 3) đọc document.xml/styles.xml. Nghi ngờ: chưa đủ bằng chứng để quy tệp:hàm.');

  const para = await roundtrip('doc10-exact.docx');
  const pChecks = {
    alignLeft: has(para.document,/w:jc[^>]*w:val="left"/), alignCenter: has(para.document,/w:jc[^>]*w:val="center"/), alignRight: has(para.document,/w:jc[^>]*w:val="right"/), alignJustify: has(para.document,/w:jc[^>]*w:val="both"/),
    firstLineIndent: has(para.document,/w:ind[^>]*w:firstLine="\d+"/), lineSpacing15: has(para.document,/w:spacing[^>]*w:line="360"/), before: has(para.document,/w:spacing[^>]*w:before="/), after: has(para.document,/w:spacing[^>]*w:after="/),
  };
  row('B3 round-trip DOCX (4 căn lề, thụt dòng đầu, giãn dòng 1.5, trước/sau)','FAIL','BLOCKED',`Đã round-trip ${para.output} (${para.result.outputBytes} bytes); fixture doc10-exact không chứng minh đủ bốn căn lề/first-line/1.5/trước/sau; các giá trị thấy: ${JSON.stringify(pChecks)}.`, '1) Tạo đoạn mẫu với đầy đủ thuộc tính; 2) lưu qua app; 3) đọc w:pPr. Nghi ngờ: chưa đủ bằng chứng để quy tệp:hàm.');
  row('B3 undo từng thiết lập đoạn','FAIL','BLOCKED','roundtrip-file.mjs lưu trạng thái qua app nhưng không kích hoạt Ctrl+Z hoặc đo trạng thái trước/sau; không có bằng chứng mới để kết luận.', '1) Đặt một thuộc tính đoạn; 2) Ctrl+Z; 3) đo lại từng thuộc tính trước/sau. Nghi ngờ: apps/writer/* undo command mapping.');

  const hf = await roundtrip('doc10-header-footer.docx');
  const sect = (hf.document.match(/<w:sectPr[\s\S]*?<\/w:sectPr>/g)||[]).join('');
  const hfChecks={titlePg:has(sect,/<w:titlePg\b/),headerReference:has(sect,/<w:headerReference\b/),footerReference:has(sect,/<w:footerReference\b/),headerParts:hf.entries.filter(x=>/^word\/header\d+\.xml$/.test(x)),footerParts:hf.entries.filter(x=>/^word\/footer\d+\.xml$/.test(x))};
  row('B8 header/footer + trang đầu khác round-trip DOCX','FAIL',hfChecks.titlePg&&hfChecks.headerReference&&hfChecks.footerReference&&hfChecks.headerParts.length&&hfChecks.footerParts.length?'PASS':'FAIL',`DOCX ${hf.output}; ${JSON.stringify(hfChecks)}; bytes=${hf.result.outputBytes}`, '1) Thêm header/footer; 2) bật Trang đầu khác biệt; 3) lưu DOCX, kiểm tra w:titlePg/w:headerReference/w:footerReference và header*.xml/footer*.xml. Nghi ngờ: adapters/libreoffice/writer/* section export.');

  const tc = await roundtrip('doc10-track-comments.docx');
  const tcChecks={insert:has(tc.document,/<w:ins\b/),delete:has(tc.document,/<w:del\b/),commentPart:tc.entries.includes('word/comments.xml'),commentRangeStart:has(tc.document,/<w:commentRangeStart\b/),commentRangeEnd:has(tc.document,/<w:commentRangeEnd\b/)};
  row('B12 Track Changes + Comments round-trip DOCX','FAIL',Object.values(tcChecks).every(Boolean)?'PASS':'FAIL',`DOCX ${tc.output}; ${JSON.stringify(tcChecks)}; bytes=${tc.result.outputBytes}`, '1) Bật Theo dõi thay đổi và sửa chữ; 2) thêm comment vào vùng chọn; 3) lưu, mở lại, kiểm tra w:ins/w:del, word/comments.xml và commentRangeStart. Nghi ngờ: adapters/libreoffice/writer/* tracked change/comment exporter.');

  row('A5 xác nhận ghi đè','FAIL','BLOCKED','Chưa đo hộp thoại xác nhận bằng tương tác CDP trong lượt này; lưu qua helper không mô phỏng xác nhận ghi đè.', '1) Mở Save As; 2) chọn đường dẫn đã tồn tại; 3) quan sát hộp thoại DOM trước khi xác nhận ghi đè. Nghi ngờ: apps/writer save-as flow / platform file dialog bridge.');
} catch (e) {
  row('Chạy lại DOCX qua CDP','FAIL','BLOCKED',`Không hoàn tất: ${String(e.stack||e)}`);
}
const md=['# Đánh giá lại DOCX (06/10/2026)','','Nhánh: `docs/audit-doc-recheck-codex`. Phương pháp: app qua CDP `roundtrip-file.mjs`; kiểm tra ZIP/XML trực tiếp; profile `LOCALAPPDATA` riêng. Không dùng Word COM.','','| Hạng mục | Kết quả cũ | Kết quả mới | Bằng chứng đo được | Tái hiện 3 bước / nghi ngờ tệp:hàm |','|---|---|---|---|---|',...rows.map(r=>`| ${r.item} | ${r.old} | ${r.status} | ${esc(r.evidence)} | ${esc(r.repro||'—')} |`),'','Ghi chú: PASS/FAIL ở B2/B3 round-trip phản ánh các thẻ/giá trị XML được thấy trong gói DOCX đầu ra; không đồng nghĩa Word đã render đúng. BLOCKED nghĩa là thao tác chưa được đo trong lượt này.'].join('\n');
const report=path.join(root,'docs/AUDIT-DOC-RECHECK-0610.md'); await fs.writeFile(report,md,'utf8');
console.log(JSON.stringify({report,outputDirectory:outDir,counts:Object.fromEntries(['PASS','FAIL','BLOCKED'].map(s=>[s,rows.filter(r=>r.status===s).length])),rows},null,2));
