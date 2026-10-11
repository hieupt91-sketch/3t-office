import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { launchApp } from "../../tests/live/cdp/session.mjs";
import { insertText, press } from "../../tests/live/cdp/actions.mjs";

const execFileAsync = promisify(execFile);
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const temp = await fs.mkdtemp(path.join(os.tmpdir(), "vno-doc-recheck2-"));
const docx = path.join(temp, "writer-created-audit.docx");
const records = [];
const rec = (name, status, value, why = "") => records.push({ name, status, value, why });
let session;

async function evaluate(cdp, expression, options) {
  return cdp.evaluate(expression, options);
}
async function selectText(cdp, needle, rootSelector = ".vno-writer-body") {
  return evaluate(cdp, `(() => { const root=document.querySelector(${JSON.stringify(rootSelector)}); if(!root)return false; const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT); let n; while(n=w.nextNode()){const i=n.data.indexOf(${JSON.stringify(needle)});if(i<0)continue;const r=document.createRange();r.setStart(n,i);r.setEnd(n,i+${needle.length});const s=getSelection();s.removeAllRanges();s.addRange(r);return true}return false})()`);
}
async function command(cdp, id, args) {
  return evaluate(cdp, `globalThis.__vnoGlobalCommandBus?.execute(${JSON.stringify(id)},${JSON.stringify(args)})`);
}
async function style(cdp, text) {
  return evaluate(cdp, `(() => {const root=document.querySelector('.vno-writer-body');const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;while(n=w.nextNode()){const i=n.data.indexOf(${JSON.stringify(text)});if(i>=0){const e=n.parentElement;const p=e.closest('p,div');return {run:e.outerHTML,paragraph:p?.getAttribute('style')||'',computed:p?{align:getComputedStyle(p).textAlign,indent:getComputedStyle(p).textIndent,before:getComputedStyle(p).marginTop,after:getComputedStyle(p).marginBottom,line:getComputedStyle(p).lineHeight}:null}}}return null})()`);
}
async function setParagraph(cdp, text, cmd, args) {
  if (!await selectText(cdp, text)) throw new Error("Không chọn được đoạn: " + text);
  return command(cdp, cmd, args);
}
async function saveThroughApp(cdp, destination) {
  const result = await evaluate(cdp, `globalThis.globalUnoBridge.saveRealFileInPlace("writer",window.__vnoAppInstance.adapter._contentForExport(),${JSON.stringify(destination)},null)`, { timeoutMilliseconds: 1200000 });
  if (result?.status !== "ok") throw new Error("Luồng lưu DOCX của ứng dụng trả lỗi: " + JSON.stringify(result));
  const stat = await fs.stat(destination);
  if (!stat.size) throw new Error("Ứng dụng lưu DOCX rỗng");
  return { status: result.status, bytes: stat.size };
}
async function inspectDocx(file) {
  const python = String.raw`import sys,zipfile,json,re,xml.etree.ElementTree as ET
z=zipfile.ZipFile(sys.argv[1]); names=z.namelist(); ns={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
def xml(name): return ET.fromstring(z.read(name)) if name in names else None
d=xml('word/document.xml'); settings=xml('word/settings.xml'); comments=xml('word/comments.xml')
paras=[]
for p in d.findall('.//w:body/w:p',ns):
 t=''.join(x.text or '' for x in p.findall('.//w:t',ns)); pr=p.find('w:pPr',ns); rpr=p.find('.//w:rPr',ns)
 def val(el,tag,attr='{'+ns['w']+'}val'):
  x=el.find(tag,ns) if el is not None else None
  return (x.get(attr) if x is not None and x.get(attr) is not None else ('true' if x is not None else None))
 spacing=pr.find('w:spacing',ns) if pr is not None else None; ind=pr.find('w:ind',ns) if pr is not None else None
 jc=pr.find('w:jc',ns) if pr is not None else None
 paras.append({'text':t,'jc':jc.get('{'+ns['w']+'}val') if jc is not None else None,'firstLine':ind.get('{'+ns['w']+'}firstLine') if ind is not None else None,'line':spacing.get('{'+ns['w']+'}line') if spacing is not None else None,'lineRule':spacing.get('{'+ns['w']+'}lineRule') if spacing is not None else None,'before':spacing.get('{'+ns['w']+'}before') if spacing is not None else None,'after':spacing.get('{'+ns['w']+'}after') if spacing is not None else None})
runs=[]
for r in d.findall('.//w:body//w:r',ns):
 t=''.join(x.text or '' for x in r.findall('.//w:t',ns)); q=r.find('w:rPr',ns)
 if t:
  fonts=q.find('w:rFonts',ns) if q is not None else None; color=q.find('w:color',ns) if q is not None else None; size=q.find('w:sz',ns) if q is not None else None; va=q.find('w:vertAlign',ns) if q is not None else None
  runs.append({'text':t,'b':bool(q is not None and q.find('w:b',ns)is not None),'i':bool(q is not None and q.find('w:i',ns)is not None),'u':q.find('w:u',ns).get('{'+ns['w']+'}val') if q is not None and q.find('w:u',ns)is not None else None,'strike':bool(q is not None and q.find('w:strike',ns)is not None),'vertAlign':va.get('{'+ns['w']+'}val') if va is not None else None,'sz':size.get('{'+ns['w']+'}val') if size is not None else None,'color':color.get('{'+ns['w']+'}val') if color is not None else None,'font':fonts.get('{'+ns['w']+'}ascii') if fonts is not None else None})
sect=d.find('.//w:sectPr',ns); refs=[] if sect is None else [x.tag.split('}')[-1] for x in sect]
headers={n:''.join(x.text or '' for x in xml(n).findall('.//w:t',ns)) for n in names if re.fullmatch(r'word/header\d+\.xml',n)}
footers={n:''.join(x.text or '' for x in xml(n).findall('.//w:t',ns)) for n in names if re.fullmatch(r'word/footer\d+\.xml',n)}
out={'parts':names,'paragraphs':paras,'runs':runs,'headerReferences':refs.count('headerReference'),'footerReferences':refs.count('footerReference'),'titlePg':'titlePg' in refs,'headers':headers,'footers':footers,'ins':len(d.findall('.//w:ins',ns)),'del':len(d.findall('.//w:del',ns)),'commentRanges':len(d.findall('.//w:commentRangeStart',ns)),'comments':len(comments.findall('.//w:comment',ns)) if comments is not None else 0,'commentText':[] if comments is None else [''.join(x.text or '' for x in c.findall('.//w:t',ns)) for c in comments.findall('.//w:comment',ns)],'trackRevisions':settings is not None and settings.find('w:trackRevisions',ns)is not None}
print(json.dumps(out,ensure_ascii=False))`;
  const { stdout } = await execFileAsync(process.env.VNO_PYTHON || "python", ["-c", python, file], { maxBuffer: 8 * 1024 * 1024 });
  return JSON.parse(stdout);
}

try {
  session = await launchApp("writer", { startTimeoutMilliseconds: 90000 });
  const { cdp } = session;
  const appInfo = await evaluate(cdp, `({hasAdapter:!!window.__vnoAppInstance?.adapter,hasBus:!!globalThis.__vnoGlobalCommandBus,source:window.__vnoAppInstance?.adapter?._sourcePath||null})`);
  if (!appInfo.hasAdapter || !appInfo.hasBus) throw new Error("Writer adapter/command bus chưa sẵn sàng: " + JSON.stringify(appInfo));
  rec("Mở Writer mới", "PASS", appInfo);

  const body = await evaluate(cdp, `document.querySelector('.vno-writer-body')?.innerText||''`);
  await evaluate(cdp, `document.querySelector('.vno-writer-body')?.focus()`);
  await insertText(cdp, "BOLD_RUN ITALIC_RUN UNDERLINE_RUN STRIKE_RUN SUPER_RUN SUB_RUN SIZE16_RUN RED_RUN ARIAL_RUN\nALIGN_LEFT\nALIGN_CENTER\nALIGN_RIGHT\nALIGN_JUSTIFY\nINDENT_127\nLINE_15\nBEFORE_12\nAFTER_6\nUNDO_LEFT\nUNDO_CENTER\nUNDO_RIGHT\nUNDO_JUSTIFY\nUNDO_INDENT\nUNDO_LINE\nUNDO_BEFORE\nUNDO_AFTER\nTRACK_KEEP\nDELETE_ME\nCOMMENT_TARGET");
  const hasSeed = await evaluate(cdp, `document.querySelector('.vno-writer-body')?.innerText?.includes('BOLD_RUN')||false`);
  if (!hasSeed) throw new Error("CDP Input.insertText chưa tạo được nội dung trong vùng soạn thảo");

  const runCases = [
    ["BOLD_RUN", "writer.text.bold"], ["ITALIC_RUN", "writer.text.italic"], ["UNDERLINE_RUN", "writer.text.underline"],
    ["STRIKE_RUN", "writer.text.strike"], ["SUPER_RUN", "writer.text.superscript"], ["SUB_RUN", "writer.text.subscript"],
    ["SIZE16_RUN", "writer.font.size", "4"], ["RED_RUN", "writer.color.text", "#ff0000"], ["ARIAL_RUN", "writer.font.family", "Arial"],
  ];
  for (const [label, id, arg] of runCases) {
    try { const selected = await selectText(cdp, label); const result = selected && await command(cdp, id, arg); const measured = await style(cdp, label); rec("Run " + label, result ? "PASS" : "FAIL", {result, measured}); }
    catch (e) { rec("Run " + label, "BLOCKED", null, e.message); }
  }

  const paraCases = [
    ["ALIGN_LEFT", "writer.para.alignLeft"], ["ALIGN_CENTER", "writer.para.alignCenter"], ["ALIGN_RIGHT", "writer.para.alignRight"], ["ALIGN_JUSTIFY", "writer.para.justify"],
    ["INDENT_127", "writer.para.firstLineIndent", "36"], ["LINE_15", "writer.para.lineSpacing", "1.5"],
    ["BEFORE_12", "writer.para.spacingBefore", "12"], ["AFTER_6", "writer.para.spacingAfter", "6"],
  ];
  for (const [label, id, arg] of paraCases) {
    try { await setParagraph(cdp, label, id, arg); rec("Đoạn " + label + " / " + id, "PASS", await style(cdp, label)); }
    catch (e) { rec("Đoạn " + label + " / " + id, "BLOCKED", null, e.message); }
  }

  for (const [label, id, arg] of [["UNDO_LEFT","writer.para.alignLeft"],["UNDO_CENTER","writer.para.alignCenter"],["UNDO_RIGHT","writer.para.alignRight"],["UNDO_JUSTIFY","writer.para.justify"],["UNDO_INDENT","writer.para.firstLineIndent","36"],["UNDO_LINE","writer.para.lineSpacing","1.5"],["UNDO_BEFORE","writer.para.spacingBefore","12"],["UNDO_AFTER","writer.para.spacingAfter","6"]]) {
    try {
      const before = await style(cdp, label); await setParagraph(cdp, label, id, arg); const applied = await style(cdp, label);
      await press(cdp, "z", { ctrl: true }); const after = await style(cdp, label);
      const changed = before?.paragraph !== applied?.paragraph;
      const restored = before?.paragraph === after?.paragraph;
      rec("Undo " + label, changed && restored ? "PASS" : "FAIL", {before, applied, after, changed, restored}, changed ? "" : "Lệnh không làm đổi kiểu đoạn; Ctrl+Z không thể chứng minh thiết lập này.");
    } catch (e) { rec("Undo " + label, "BLOCKED", null, e.message); }
  }

  try {
    await command(cdp, "writer.trackChanges.toggle", {enabled:true});
    const state = await evaluate(cdp, `({enabled:!!window.__vnoAppInstance.adapter.trackChangesEnabled,button:document.querySelector('[data-command-id="writer.trackChanges.toggle"]')?.getAttribute('aria-pressed')})`);
    await selectText(cdp, "DELETE_ME"); await press(cdp, "Backspace");
    await selectText(cdp, "TRACK_KEEP"); await insertText(cdp, "TRACK_INSERTED");
    const live = await evaluate(cdp, `({ins:document.querySelectorAll('.vno-writer-body ins').length,del:document.querySelectorAll('.vno-writer-body del').length,text:document.querySelector('.vno-writer-body')?.innerText||''})`);
    rec("Theo dõi sửa/chèn/xóa", live.ins + live.del > 0 ? "PASS" : "FAIL", {state,live});
  } catch (e) { rec("Theo dõi sửa/chèn/xóa", "BLOCKED", null, e.message); }
  try {
    await selectText(cdp, "COMMENT_TARGET"); await command(cdp, "writer.comment.insert", {content:"AUDIT_COMMENT"});
    const overlay = await evaluate(cdp, `!!document.querySelector('.vno-dialog-overlay')`);
    if (overlay) {
      await evaluate(cdp, `(() => {const x=document.querySelector('.vno-dialog-input');if(x){x.value='AUDIT_COMMENT';x.dispatchEvent(new Event('input',{bubbles:true}))}})()`);
      await evaluate(cdp, `document.querySelector('.vno-dialog-ok-btn')?.click()`);
    }
    const comments = await evaluate(cdp, `({cards:document.querySelectorAll('.vno-comment-card').length,text:document.body.innerText.includes('AUDIT_COMMENT')})`);
    rec("Comment trên vùng chọn", comments.cards ? "PASS" : "FAIL", comments);
  } catch (e) { rec("Comment trên vùng chọn", "BLOCKED", null, e.message); }

  try {
    const header = await evaluate(cdp, `!!document.querySelector('.vno-writer-header')`);
    const footer = await evaluate(cdp, `!!document.querySelector('.vno-writer-footer')`);
    if (!header || !footer) throw new Error("UI chưa render vùng header/footer có thể nhập");
    await evaluate(cdp, `window.__vnoAppInstance.adapter.setDifferentFirstPage(true)`);
    for (const [sel, value] of [[".vno-writer-header","AUDIT_HEADER"],[".vno-writer-footer","AUDIT_FOOTER"]]) {
      await evaluate(cdp, `document.querySelector(${JSON.stringify(sel)})?.focus()`);
      await insertText(cdp, value);
    }
    const hf = await evaluate(cdp, `({header:document.querySelector('.vno-writer-header')?.innerText||'',footer:document.querySelector('.vno-writer-footer')?.innerText||'',first:window.__vnoAppInstance.adapter.sectionHeadersFooters?.[window.__vnoAppInstance.adapter.activeSectionId]?.differentFirstPage})`);
    rec("Header/footer + first page", hf.header.includes("AUDIT_HEADER") && hf.footer.includes("AUDIT_FOOTER") ? "PASS" : "FAIL", hf);
  } catch (e) { rec("Header/footer + first page", "BLOCKED", null, e.message); }

  const saved = await saveThroughApp(cdp, docx);
  const xml = await inspectDocx(docx);
  rec("Lưu DOCX qua bridge của app", "PASS", {saved, runCount:xml.runs.length,paragraphCount:xml.paragraphs.length});
  const expectedRuns = [
    ["BOLD_RUN", r=>r.b], ["ITALIC_RUN", r=>r.i], ["UNDERLINE_RUN", r=>Boolean(r.u)], ["STRIKE_RUN", r=>r.strike],
    ["SUPER_RUN", r=>r.vertAlign==="superscript"], ["SUB_RUN", r=>r.vertAlign==="subscript"],
    ["SIZE16_RUN", r=>r.sz==="32"], ["RED_RUN", r=>r.color==="FF0000"], ["ARIAL_RUN", r=>r.font==="Arial"],
  ];
  for(const [label,check] of expectedRuns){const run=xml.runs.find(r=>r.text.includes(label));rec("OOXML "+label,run&&check(run)?"PASS":"FAIL",run||null,run?"":"Không có run trong document.xml");}
  const expectedParas = [["ALIGN_LEFT",p=>p.jc==="left"],["ALIGN_CENTER",p=>p.jc==="center"],["ALIGN_RIGHT",p=>p.jc==="right"],["ALIGN_JUSTIFY",p=>p.jc==="both"],["INDENT_127",p=>p.firstLine==="720"],["LINE_15",p=>p.line==="360"&&p.lineRule==="auto"],["BEFORE_12",p=>p.before==="240"],["AFTER_6",p=>p.after==="120"]];
  for(const [label,check] of expectedParas){const p=xml.paragraphs.find(x=>x.text.includes(label));rec("OOXML "+label,p&&check(p)?"PASS":"FAIL",p||null,p?"":"Không có đoạn trong document.xml");}
  rec("DOCX header/footer/titlePg", xml.headerReferences&&xml.footerReferences&&xml.titlePg&&Object.values(xml.headers).join("").includes("AUDIT_HEADER")&&Object.values(xml.footers).join("").includes("AUDIT_FOOTER")?"PASS":"FAIL", {headerReferences:xml.headerReferences,footerReferences:xml.footerReferences,titlePg:xml.titlePg,headers:xml.headers,footers:xml.footers});
  rec("DOCX revisions/comments", xml.ins>0&&xml.del>0&&xml.comments>0&&xml.commentRanges>0?"PASS":"FAIL", {ins:xml.ins,del:xml.del,comments:xml.comments,commentRanges:xml.commentRanges,commentText:xml.commentText,trackRevisions:xml.trackRevisions});

  await session.close(); session = null;
  session = await launchApp("writer", {filePath:docx,startTimeoutMilliseconds:90000});
  const realDocx = (await fs.realpath(docx)).replace(/\\/g,"/").toLowerCase();
  await session.cdp.waitFor(`(window.__vnoAppInstance?.adapter?._sourcePath||'').replace(/\\\\/g,'/').toLowerCase()===${JSON.stringify(realDocx)}`, {timeoutMilliseconds:90000});
  const reopen = await evaluate(session.cdp, `({text:document.querySelector('.vno-writer-body')?.innerText||'',comments:document.querySelectorAll('.vno-comment-card').length,header:document.querySelector('.vno-writer-header')?.innerText||'',footer:document.querySelector('.vno-writer-footer')?.innerText||''})`);
  rec("Mở lại cùng DOCX", reopen.text.includes("BOLD_RUN") ? "PASS":"FAIL", reopen);
} catch (error) {
  rec("Luồng audit tổng thể", "BLOCKED", null, error?.stack || String(error));
} finally {
  if (session) await session.close().catch(() => {});
}

const totals = Object.fromEntries(["PASS","FAIL","BLOCKED"].map(k=>[k,records.filter(r=>r.status===k).length]));
const lines = ["# Audit DOCX tạo mới trong VN Writer — 06/10/2026", "", "Nhánh: `docs/audit-doc-recheck2-codex`. Phương pháp: khởi chạy VN Writer mới qua `tests/live/cdp/session.mjs`; nhập bằng CDP; định dạng qua command bus/adapter đã đăng ký; lưu DOCX bằng `globalUnoBridge.saveRealFileInPlace`; giải nén/đọc XML với Python zipfile; mở lại chính DOCX qua CDP. Không dùng Word COM.", "", `Tổng: PASS ${totals.PASS} / FAIL ${totals.FAIL} / BLOCKED ${totals.BLOCKED}.`, "", "| Hạng mục | Trạng thái | Giá trị đo được | Lý do / tái hiện nếu lỗi |", "|---|---|---|---|"];
for(const r of records) {
  let why = r.why;
  if(r.status==="FAIL" && !why) {
    const suspect = r.name.includes("SIZE16") ? "adapters/libreoffice/writer/writer-adapter.js:7018 (writer.font.size dùng execCommand fontSize) / khâu chuyển HTML→DOCX" : r.name.includes("ALIGN_JUSTIFY") ? "adapters/libreoffice/writer/writer-adapter.js:6936-6938 (writer.para.justify) và khâu chuyển HTML→DOCX" : r.name.includes("AFTER_6") ? "khâu chuyển HTML margin-bottom → OOXML w:spacing; cần đối chiếu adapter lưu DOCX" : r.name.includes("JUSTIFY") ? "adapters/libreoffice/writer/writer-adapter.js:6936-6938" : "adapters/libreoffice/writer/writer-adapter.js:6936-6938 / khâu chuyển HTML→DOCX";
    why = `Tái hiện: 1) Mở Writer mới; 2) áp dụng ${r.name.replace("OOXML ","")} qua command bus; 3) lưu DOCX bằng bridge app và đọc document.xml. Nghi ngờ: ${suspect}.`;
  }
  lines.push(`| ${r.name.replaceAll("|","/")} | ${r.status} | \`${JSON.stringify(r.value??"").replaceAll("|","/")}\` | ${why.replaceAll("|","/").replaceAll("\n"," ")} |`);
}
lines.push("", "Tái hiện lỗi: chạy `node --experimental-websocket scripts/audit-0610/doc_recheck2.mjs`. Tệp DOCX trung gian nằm trong thư mục tạm được in ở stdout nếu giữ `VNO_KEEP_CDP=1`; nghi ngờ file/hàm chỉ khoanh vùng từ XML và code hiện hữu, không thay đổi mã ứng dụng.", "");
const report = path.join(repo,"docs/AUDIT-DOC-RECHECK2-0610.md");
await fs.writeFile(report, lines.join("\n"), "utf8");
console.log(JSON.stringify({totals,records,report,docx},null,2));
if (process.env.VNO_KEEP_CDP !== "1") await fs.rm(temp,{recursive:true,force:true});
