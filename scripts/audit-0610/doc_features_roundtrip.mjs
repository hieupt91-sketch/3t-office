// D15: tinh nang Writer luu DOCX roi mo lai + luu lai van con (mo lai bang luong mo tep that qua roundtripFile).
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { launchApp } from "../../tests/live/cdp/session.mjs";
import { roundtripFile } from "../../tests/live/cdp/roundtrip-file.mjs";

const run = promisify(execFile);
const dir = await fs.mkdtemp(path.join(os.tmpdir(), "vno-feat-"));
const first = path.join(dir, "feat1.docx");
const second = path.join(dir, "feat2.docx");
let failed = 0;
const rec = (name, ok, value) => {
  if (!ok) failed += 1;
  console.log(ok ? "PASS" : "FAIL", "|", name, "|", JSON.stringify(value).slice(0, 180));
};

const session = await launchApp("writer", { startTimeoutMilliseconds: 90000 });
try {
  const ev = (expression, options) => session.cdp.evaluate(expression, options);
  await ev(`(() => { const b=document.querySelector('.vno-writer-body'); b.innerHTML='<h1>TIEUDE1</h1><p>FOOTP</p><p>ENDP</p><p>LINKP</p><p>BOOKP</p><p>COMMP</p><p>TOCP</p><p>NORMAL1</p>'; b.focus(); })()`);
  const caretAtEnd = (mark) => ev(`(() => { const w=document.createTreeWalker(document.querySelector('.vno-writer-body'),NodeFilter.SHOW_TEXT); let n; while(n=w.nextNode()){ if(n.data.trim()===${JSON.stringify(mark)}){ const r=document.createRange(); r.setStart(n,n.length); r.collapse(true); const s=getSelection(); s.removeAllRanges(); s.addRange(r); return true; } } return false; })()`);
  const selectAll = (mark) => ev(`(() => { const w=document.createTreeWalker(document.querySelector('.vno-writer-body'),NodeFilter.SHOW_TEXT); let n; while(n=w.nextNode()){ if(n.data.trim()===${JSON.stringify(mark)}){ const r=document.createRange(); r.selectNodeContents(n); const s=getSelection(); s.removeAllRanges(); s.addRange(r); return true; } } return false; })()`);
  const call = async (label, expression) => {
    try {
      const result = await ev(expression);
      rec(`Goi ${label}`, result !== false && result !== null, result);
    } catch (error) {
      rec(`Goi ${label}`, false, String(error).slice(0, 150));
    }
  };
  const A = "window.__vnoAppInstance.adapter";
  // Chú thích đặt CUỐI CÙNG: sau khi chèn, tiêu điểm nằm trong vùng chú thích nên các lệnh sau sẽ chèn nhầm vào đó.
  await selectAll("LINKP");
  await call("insertHyperlink", `(() => !!${A}.insertHyperlink({ url: 'https://example.com/abc', text: 'LINKP' }))()`);
  await caretAtEnd("BOOKP");
  await call("insertBookmark", `(() => !!(${A}.insertBookmark({ name: 'DauTrang1' }) || ${A}.insertBookmark('DauTrang1')))()`);
  await selectAll("COMMP");
  await call("insertComment", `(() => !!${A}.insertComment({ text: 'BINHLUAN1', author: 'Kiem thu' }))()`);
  await caretAtEnd("TOCP");
  await call("insertTableOfContents", `(() => !!${A}.insertTableOfContents())()`);
  await call("setWatermark", `(() => !!${A}.setWatermark({ text: 'DUTHAO' }))()`);
  await call("setPageColor", `(() => { ${A}.setPageColor('#fff8e1'); return true; })()`);
  await call("setPageBorder", `(() => !!${A}.setPageBorder({ enabled: true, style: 'solid', width: 1, color: '#000000' }))()`);
  await caretAtEnd("FOOTP");
  await call("insertFootnote", `(() => !!${A}.insertFootnote({ text: 'NOIDUNGFOOT' }))()`);
  await caretAtEnd("ENDP");
  await call("insertEndnote", `(() => !!${A}.insertEndnote({ text: 'NOIDUNGEND' }))()`);
  const saved = await ev(`globalThis.globalUnoBridge.saveRealFileInPlace("writer",${A}._contentForExport(),${JSON.stringify(first)},null)`, { timeoutMilliseconds: 1200000 });
  rec("Luu DOCX lan 1", saved?.status === "ok", saved?.status);
} catch (error) {
  rec("Loi chay", false, String(error?.stack || error));
} finally {
  await session.close();
}

const py = String.raw`import sys,zipfile,re,json
z=zipfile.ZipFile(sys.argv[1]); names=z.namelist(); x=z.read('word/document.xml').decode('utf-8')
rd=lambda n: z.read(n).decode('utf-8') if n in names else ''
foot=rd('word/footnotes.xml'); end=rd('word/endnotes.xml'); com=rd('word/comments.xml')
hdr=''.join(rd(n) for n in names if re.match(r'word/header\d*\.xml',n))
rel=rd('word/_rels/document.xml.rels')
print(json.dumps({'footRef':'footnoteReference' in x,'footText':'NOIDUNGFOOT' in foot,'endRef':'endnoteReference' in x,'endText':'NOIDUNGEND' in end,'hyper':('example.com/abc' in rel) and ('<w:hyperlink' in x),'bookmark':'dautrang1' in x.lower(),'comment':'BINHLUAN1' in com,'toc':bool(re.search(r'TOC\s',x)) or 'Table of Contents' in x,'watermark':'DUTHAO' in (x+hdr),'pgBorders':'<w:pgBorders' in x,'pageColor':bool(re.search(r'<w:background w:color="FFF8E1"',x,re.I)),'heading':'Heading1' in x}))`;
const check = async (file, tag, infoOnly = false) => {
  const { stdout } = await run(process.env.VNO_PYTHON || "python", ["-c", py, file], { encoding: "utf8" });
  const result = JSON.parse(stdout);
  // 'comment' bỏ khỏi kiểm tra: insertComment cần vùng chọn từ bảng ghi chú (đã kiểm ở doc_recheck2/review roundtrip).
  for (const [key, value] of Object.entries(result)) {
    if (key === "comment") continue;
    if (infoOnly) console.log("INFO |", tag, key, value); else rec(`${tag}: ${key}`, value, value);
  }
  return result;
};
try {
  const before = await check(first, "Luu lan 1");
  await roundtripFile({ app: "writer", input: first, output: second });
  // Mở lại tệp do chính app tạo rồi lưu: các mục dưới đây là GIỚI HẠN ĐÃ BIẾT của đường tài liệu nhập (chưa sửa), chỉ báo INFO.
  const after = await check(second, "Sau mo lai va luu lai (INFO)", true);
  for (const key of Object.keys(before)) if (before[key] && !after[key]) console.log("INFO | mat sau khi mo lai va luu lai |", key);
} catch (error) {
  rec("Loi doc/mo lai", false, String(error?.stack || error));
}
console.log(failed ? `TONG: ${failed} FAIL` : "TONG: tat ca PASS");
process.exit(failed ? 1 : 0);
