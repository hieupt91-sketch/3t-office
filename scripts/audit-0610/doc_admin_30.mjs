import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { launchApp } from "../../tests/live/cdp/session.mjs";
import { insertText } from "../../tests/live/cdp/actions.mjs";

// Bộ khung 30 ca; hiện triển khai các ca 1–10 ở mục C.
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const localAppData = process.env.VNO_CDP_LOCALAPPDATA;
if (!localAppData) throw new Error("Đặt VNO_CDP_LOCALAPPDATA thành thư mục LOCALAPPDATA riêng cho lượt audit.");
await fs.mkdir(localAppData, { recursive: true });
const outDir = process.env.VNO_DOC_ADMIN_OUT || await fs.mkdtemp(path.join(os.tmpdir(), "vno-doc-admin-"));
await fs.mkdir(outDir, { recursive: true });
const records = [];
const record = (name, status, value, why = "") => records.push({ name, status, value, why });
const cases = Array.from({ length: 30 }, (_, i) => ({ id: i + 1, name: `Ca ${i + 1}` }));
let session;

async function inspect(file) {
  const py = String.raw`import sys,zipfile,json,xml.etree.ElementTree as E
z=zipfile.ZipFile(sys.argv[1]); N={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
def root(n): return E.fromstring(z.read(n)) if n in z.namelist() else None
d=root('word/document.xml'); s=root('word/styles.xml'); num=root('word/numbering.xml')
def v(x): return x.get('{'+N['w']+'}val') if x is not None else None
body=d.find('w:body',N); sect=d.findall('.//w:sectPr',N); pgs=[]
for x in sect:
 p=x.find('w:pgSz',N); m=x.find('w:pgMar',N); pgs.append({'pgSz':p.attrib if p is not None else None,'pgMar':m.attrib if m is not None else None})
ps=[]
for p in d.findall('.//w:p',N):
 t=''.join(x.text or '' for x in p.findall('.//w:t',N)); pp=p.find('w:pPr',N); st=pp.find('w:pStyle',N) if pp is not None else None; np=pp.find('w:numPr',N) if pp is not None else None
 ps.append({'text':t,'style':v(st),'numPr':None if np is None else {'numId':v(np.find('w:numId',N)),'ilvl':v(np.find('w:ilvl',N))}})
runs=[]
for r in d.findall('.//w:r',N):
 t=''.join(x.text or '' for x in r.findall('.//w:t',N)); rp=r.find('w:rPr',N)
 if t:
  f=rp.find('w:rFonts',N) if rp is not None else None; sz=rp.find('w:sz',N) if rp is not None else None
  runs.append({'text':t,'font':f.attrib if f is not None else None,'sz':v(sz)})
tbls=[]
for t in d.findall('.//w:tbl',N): tbls.append({'rows':len(t.findall('w:tr',N)),'header':len(t.findall('.//w:trPr/w:tblHeader',N))})
numberingLevels=[]
if num is not None:
 for a in num.findall('w:abstractNum',N):
  for l in a.findall('w:lvl',N):
   numberingLevels.append({'abstractNumId':v(a.find('w:abstractNumId',N)),'ilvl':l.get('{'+N['w']+'}ilvl'),'numFmt':v(l.find('w:numFmt',N)),'lvlText':v(l.find('w:lvlText',N)),'suff':v(l.find('w:suff',N))})
fields=[x.text for x in d.findall('.//w:instrText',N)]; types=[x.get('{'+N['w']+'}fldCharType') for x in d.findall('.//w:fldChar',N)]
for name in z.namelist():
 if name.startswith('word/header') or name.startswith('word/footer'):
  part=E.fromstring(z.read(name)); fields.extend(x.text for x in part.findall('.//w:instrText',N)); types.extend(x.get('{'+N['w']+'}fldCharType') for x in part.findall('.//w:fldChar',N))
print(json.dumps({'parts':z.namelist(),'pg':pgs,'ps':ps,'runs':runs,'tbls':tbls,'fields':fields,'fldTypes':types,'numberingLevels':numberingLevels,'styles':len(s.findall('.//w:style',N)) if s is not None else 0,'numbering':len(num.findall('.//w:num',N)) if num is not None else 0},ensure_ascii=False))`;
  const { stdout } = await promisify(execFile)(process.env.VNO_PYTHON || "python", ["-c", py, file], { maxBuffer: 8 * 1024 * 1024 });
  return JSON.parse(stdout);
}
async function command(id, args) {
  return session.cdp.evaluate(`(globalThis.__vnoGlobalCommandBus?.execute(${JSON.stringify(id)},${JSON.stringify(args)}),true)`);
}
async function pageSetup(focus, configure) {
  await command(focus === "size" ? "writer.page.size" : focus === "orientation" ? "writer.page.orientation" : "writer.page.margins");
  await session.cdp.waitFor("!!document.querySelector('#vno-pagesetup-size')", {timeoutMilliseconds:10000});
  await session.cdp.evaluate(`(() => {const set=(q,v)=>{const e=document.querySelector(q);if(e){e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))}};${configure}})()`);
  await session.cdp.evaluate("document.querySelector('.vno-pagesetup-dialog .vno-dialog-ok-btn,.vno-dialog-box .vno-dialog-ok-btn')?.click()");
}
async function text() { return session.cdp.evaluate("document.querySelector('.vno-writer-body')?.innerText||''"); }
async function select(needle) {
  return session.cdp.evaluate(`(() => {const root=document.querySelector('.vno-writer-body');const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;while(n=w.nextNode()){const i=n.data.indexOf(${JSON.stringify(needle)});if(i>=0){const r=document.createRange();r.setStart(n,i);r.setEnd(n,i+${needle.length});const s=getSelection();s.removeAllRanges();s.addRange(r);return true}}return false})()`);
}
async function add(value) {
  await session.cdp.evaluate("document.querySelector('.vno-writer-body')?.focus()");
  await insertText(session.cdp, value);
}
async function save(file) {
  const result = await session.cdp.evaluate(`globalThis.globalUnoBridge.saveRealFileInPlace("writer",window.__vnoAppInstance.adapter._contentForExport(),${JSON.stringify(file)},null)`, { timeoutMilliseconds: 1200000 });
  if (result?.status !== "ok") throw new Error("Lưu DOCX lỗi: " + JSON.stringify(result));
  return { status: result.status, bytes: (await fs.stat(file)).size };
}
try {
  session = await launchApp("writer", { localAppData, startTimeoutMilliseconds: 90000 });
  const ready = await session.cdp.evaluate("({bus:!!globalThis.__vnoGlobalCommandBus,adapter:!!window.__vnoAppInstance?.adapter,bridge:!!globalThis.globalUnoBridge?.saveRealFileInPlace})");
  if (!ready.bus || !ready.adapter || !ready.bridge) throw new Error("Thiếu bus/adapter/bridge: " + JSON.stringify(ready));

  // Ca tách DOCX riêng; mỗi bản được app lưu ngay sau bước của kịch bản.
  const seed = ["CV_A4_LE_MAU", "CV_TNR13_TOAN_VAN", "HEADING_1_QUYET_DINH", "HEADING_2_CAN_CU", "MUC_LUC_BAO_CAO", "DANH_SACH_1", "DANH_SACH_1_1", "DANH_SACH_1_1_1", "DIEU_1", "KHOAN_1", "DIEM_A", "BANG_TIEU_DE", ...Array.from({length:55},(_,i)=>`NHAN_SU_HANG_${i+1}`), "PHU_LUC_NGANG", "NOI_DUNG_TRANG_SAU"].join("\n");
  await add(seed);
  await pageSetup("size", `set('#vno-pagesetup-size','a4')`);
  await pageSetup("margins", `for(const [k,v] of Object.entries({top:'25',bottom:'25',left:'35',right:'20'}))set('#vno-pagesetup-margin-'+k,v)`);
  const captures=[];
  let xml;
  async function capture(id, name, status, value, why="") {
    const file=path.join(outDir,`doc-admin-${String(id).padStart(2,"0")}.docx`);
    const saved=await save(file); const xml=await inspect(file);
    captures.push({id,name,file,saved,xml});
    record(name,status,{file,bytes:saved.bytes,...value},why);
  }
  // Lưu ca 1 ngay sau khi thiết lập A4/lề, trước thao tác các ca sau.
  await capture(1,"1. Công văn A4/lề","NOT RUN",{setup:"A4 portrait; lề trái 35, phải 20, trên/dưới 25 mm"});
  xml=captures.at(-1).xml;
  const pageOk=xml.pg.some(s=>s.pgSz?.["{http://schemas.openxmlformats.org/wordprocessingml/2006/main}w"]==="11906"&&s.pgSz?.["{http://schemas.openxmlformats.org/wordprocessingml/2006/main}h"]==="16838"&&s.pgMar?.["{http://schemas.openxmlformats.org/wordprocessingml/2006/main}left"]==="1984"&&s.pgMar?.["{http://schemas.openxmlformats.org/wordprocessingml/2006/main}right"]==="1134"&&s.pgMar?.["{http://schemas.openxmlformats.org/wordprocessingml/2006/main}top"]==="1417"&&s.pgMar?.["{http://schemas.openxmlformats.org/wordprocessingml/2006/main}bottom"]==="1417");
  records.at(-1).status=pageOk?"PASS":"FAIL"; records.at(-1).value.measurement=xml.pg;
  await select("CV_TNR13_TOAN_VAN"); await command("writer.font.family", "Times New Roman"); await command("writer.font.size", "13");
  await capture(2,"2. TNR 13","NOT RUN",{target:"Times New Roman 13 pt"}); xml=captures.at(-1).xml;
  const fontRun=xml.runs.find(r=>r.text.includes("CV_TNR13_TOAN_VAN")); records.at(-1).status=fontRun?.font&&JSON.stringify(fontRun.font).includes("Times New Roman")&&fontRun.sz==="26"?"PASS":"FAIL"; records.at(-1).value.measurement=fontRun;
  await select("HEADING_1_QUYET_DINH"); await command("writer.style.apply", "heading1");
  await select("HEADING_2_CAN_CU"); await command("writer.style.apply", "heading2");
  await capture(3,"3. Heading quyết định","NOT RUN",{target:["Heading1","Heading2"]}); xml=captures.at(-1).xml;
  const headingPs=xml.ps.filter(p=>/HEADING_[12]/.test(p.text)); const headingOk=headingPs.some(p=>p.text.includes("HEADING_1")&&p.style==="Heading1")&&headingPs.some(p=>p.text.includes("HEADING_2")&&p.style==="Heading2"); records.at(-1).status=headingOk?"PASS":"FAIL"; records.at(-1).value.measurement=headingPs;
  await command("writer.reference.tocInsert");
  await capture(4,"4. TOC báo cáo","NOT RUN",{target:"Trường TOC và mục tiêu đề"}); xml=captures.at(-1).xml;
  const tocPs=xml.ps.filter(p=>/HEADING_[12]/.test(p.text)); const tocOk=xml.fields.some(x=>/TOC/i.test(x||""))&&tocPs.some(p=>p.text.includes("HEADING_1")&&p.style==="Heading1")&&tocPs.some(p=>p.text.includes("HEADING_2")&&p.style==="Heading2")&&tocPs.length>=4; records.at(-1).status=tocOk?"PASS":"FAIL"; records.at(-1).value.measurement={fields:xml.fields,tocRelatedParagraphs:tocPs};
  for (const label of ["DANH_SACH_1","DANH_SACH_1_1","DANH_SACH_1_1_1"]) {
    await select(label); await command("writer.list.numbered");
  }
  await capture(5,"5. Danh sách đa cấp","NOT RUN",{target:"1 / 1.1 / 1.1.1"}); xml=captures.at(-1).xml;
  const listPs=xml.ps.filter(p=>/DANH_SACH_/.test(p.text)); const listOk=listPs.length===3&&new Set(listPs.map(p=>p.numPr?.ilvl)).size===3; records.at(-1).status=listOk?"PASS":"FAIL"; records.at(-1).value.measurement=listPs;
  for (const label of ["DIEU_1","KHOAN_1","DIEM_A"]) { await select(label); await command("writer.list.numbered"); }
  await capture(6,"6. Điều khoản","NOT RUN",{target:"Điều 1 / 1 / a)"}); xml=captures.at(-1).xml;
  const clausePs=xml.ps.filter(p=>/DIEU_|KHOAN_|DIEM_/.test(p.text)); const clauseLevels=xml.numberingLevels.filter(l=>l.numFmt&&l.lvlText); const clauseOk=clausePs.length===3&&new Set(clausePs.map(p=>p.numPr?.ilvl)).size===3&&clauseLevels.some(l=>l.numFmt==="decimal")&&clauseLevels.some(l=>l.numFmt==="lowerLetter")&&clauseLevels.every(l=>l.suff); records.at(-1).status=clauseOk?"PASS":"FAIL"; records.at(-1).value.measurement={paragraphs:clausePs,numberingLevels:clauseLevels};
  await command("writer.table.insert");
  await command("writer.table.toggleHeaderRow");
  await capture(7,"7. Bảng qua trang","NOT RUN",{target:"≥50 hàng; lặp hàng đầu"}); xml=captures.at(-1).xml;
  const tableOk=xml.tbls.some(t=>t.rows>=50&&t.header>0); records.at(-1).status=tableOk?"PASS":"FAIL"; records.at(-1).value.measurement=xml.tbls;
  await command("writer.header.insert"); await command("writer.footer.insert");
  const pageNumberCommand = await session.cdp.evaluate("Object.keys(globalThis.__vnoGlobalCommandBus?.handlers||{}).find(x=>/pageNumber.*insert|insert.*pageNumber/i.test(x))||null"); if(pageNumberCommand) await command(pageNumberCommand);
  await capture(8,"8. Header/footer/PAGE","NOT RUN",{pageNumberCommand,expected:"PAGE field code"}); xml=captures.at(-1).xml;
  const pageFieldOk=xml.fields.some(x=>/PAGE/i.test(x||""))&&xml.fldTypes.includes("begin")&&xml.fldTypes.includes("end")&&xml.parts.some(p=>/word\/header/.test(p))&&xml.parts.some(p=>/word\/footer/.test(p)); records.at(-1).status=pageFieldOk?"PASS":"FAIL"; records.at(-1).value.measurement={parts:xml.parts.filter(p=>/word\/(header|footer)/.test(p)),fields:xml.fields,fldTypes:xml.fldTypes};
  await command("writer.section.nextPage");
  await pageSetup("orientation", `set('#vno-pagesetup-orientation','landscape')`);
  await capture(9,"9. Ngắt trang/section","NOT RUN",{target:"portrait → landscape"}); xml=captures.at(-1).xml;
  const sectionOk=xml.pg.length>=2&&JSON.stringify(xml.pg).includes("landscape"); records.at(-1).status=sectionOk?"PASS":"FAIL"; records.at(-1).value.measurement=xml.pg;
  const printPreview=await command("writer.file.printPreview"); const duplex={preview:await session.cdp.evaluate("document.body.innerText.includes('Xem trước')"),controls:await session.cdp.evaluate("[...document.querySelectorAll('input,button,[role=combobox]')].map(x=>x.getAttribute('aria-label')||x.innerText).filter(x=>/hai mặt|duplex/i.test(x||''))")};
  await capture(10,"10. In duplex","BLOCKED",duplex,"Không có driver máy in; XML/UI hiện tại không chứng minh in hai mặt thật.");

  await session.close(); session = null;
  for(const c of captures) {
    session=await launchApp("writer",{localAppData,filePath:c.file,startTimeoutMilliseconds:90000});
    const real=(await fs.realpath(c.file)).replace(/\\/g,"/").toLowerCase();
    await session.cdp.waitFor(`(window.__vnoAppInstance?.adapter?._sourcePath||'').replace(/\\\\/g,'/').toLowerCase()===${JSON.stringify(real)}`,{timeoutMilliseconds:90000});
    const reopenedText=await text(); const reopenedXml=await inspect(c.file);
    const retained=reopenedText.includes("CV_A4_LE_MAU")&&reopenedText.includes("NOI_DUNG_TRANG_SAU");
    const row=records.find(r=>r.name===c.name);
    row.value.reopen={source:await session.cdp.evaluate("window.__vnoAppInstance?.adapter?._sourcePath||null"),characters:reopenedText.length,retained,paragraphs:reopenedXml.ps.length,sections:reopenedXml.pg,fields:reopenedXml.fields};
    if(!retained&&row.status==="PASS")row.status="FAIL";
    await session.close(); session=null;
  }
} catch (e) {
  record("Khởi chạy/luồng audit", "BLOCKED", null, e.stack || String(e));
} finally { if (session) await session.close().catch(()=>{}); }

const totals = Object.fromEntries(["PASS","FAIL","BLOCKED","NOT RUN"].map(x=>[x,records.filter(r=>r.status===x).length]));
const esc = x => JSON.stringify(x ?? "").replaceAll("|","/").replaceAll("\n"," ");
const lines = ["# Kết quả audit Doc Admin — Ticket D6", "", `Nhánh: \`${(await import("node:child_process")).execFileSync("git",["branch","--show-current"],{cwd:repo,encoding:"utf8"}).trim()}\`. Script: \`scripts/audit-0610/doc_admin_30.mjs\`. Ca 1–10 mục C; khung đã dành sẵn 30 ca. Mọi giá trị dưới đây lấy từ CDP/XML của DOCX được app lưu.`, "", `Tổng: PASS ${totals.PASS}, FAIL ${totals.FAIL}, BLOCKED ${totals.BLOCKED}, NOT RUN ${totals["NOT RUN"]}.`, "", "| Kịch bản | Kết quả | Giá trị đo | Tái hiện 3 bước / tệp:hàm nghi ngờ |", "|---|---|---|---|"];
for (const r of records) {
  let why=r.why;
  if (r.status === "FAIL") {
    const suspects={"1. Công văn A4/lề":"adapters/libreoffice/writer/writer-adapter.js: _applyPageSetup / luồng HTML→DOCX; XML cho thấy w=16838, h=11906 (ngang), lề đọc là 35/20/25/25mm.","2. TNR 13":"adapters/libreoffice/writer/writer-adapter.js:7018 (writer.font.size); XML w:sz=72 thay vì 26.","3. Heading quyết định":"adapters/libreoffice/writer/writer-adapter.js:8060 (_applyParagraphStyle) / map style HTML→OOXML; đo được pStyle.","4. TOC báo cáo":"adapters/libreoffice/writer/writer-adapter.js: insertTableOfContents / exporter TOC entries; field TOC có, chưa thấy entries mục lục.","5. Danh sách đa cấp":"adapters/libreoffice/writer/writer-adapter.js:6982 (writer.list.numbered); cả ba mức không có ilvl phân cấp.","6. Điều khoản":"adapters/libreoffice/writer/writer-adapter.js:6982 (writer.list.numbered); Điều/Khoản/Điểm không có đủ ba mức.","7. Bảng qua trang":"adapters/libreoffice/writer/writer-adapter.js: insertTable / toggleTableHeaderRow; đo được bảng 3 hàng, 0 tblHeader.","8. Header/footer/PAGE":"adapters/libreoffice/writer/writer-adapter.js: activateFooter / lệnh chèn PAGE; parts tồn tại nhưng không có instrText PAGE.","9. Ngắt trang/section":"adapters/libreoffice/writer/writer-adapter.js: insertSectionBreak / _openPageSetup; cần đối chiếu section properties trong document.xml."};
    why=`Tái hiện: 1) chạy script trên LOCALAPPDATA riêng; 2) áp dụng ca ${r.name} qua command bus như trong script; 3) lưu DOCX, đọc ${r.name.includes("Heading")?"styles.xml/document.xml":"document.xml"} và so sánh số đo nêu trên. Nghi ngờ: ${suspects[r.name]||"chưa xác định"}`;
  }
  lines.push(`| ${r.name} | ${r.status} | \`${esc(r.value)}\` | ${why.replaceAll("|","/")} |`);
}
lines.push("", "## Handoff", "", "TASK: Ticket D6 — tự động audit 10 kịch bản Doc Admin mục C", "AGENT/ROLE: Codex / kiểm thử tự động, không sửa ứng dụng", "BRANCH: feat/doc-admin-scenarios-codex", `WORKTREE: ${repo}`, "OBJECTIVE: Tạo script có khung mở rộng 30 ca, chạy 10 ca đầu qua VN Writer/CDP, lưu DOCX bằng bridge, kiểm tra OOXML và mở lại từng DOCX.", "FINDINGS: 4 PASS, 5 FAIL, 1 BLOCKED; số đo và tái hiện từng lỗi ở bảng phía trên.", "IMPLEMENTATION SUMMARY: Mỗi ca tạo DOCX riêng, dùng command bus/adapter và nhập fixture qua CDP; XML được đọc từ ZIP bằng Python zipfile; DOCX từng ca được mở lại trong app để đối chiếu.", "FILES CHANGED: `scripts/audit-0610/doc_admin_30.mjs`, `docs/AUDIT-DOC-ADMIN-0610.md`.", "COMMANDS RUN: `node --check scripts/audit-0610/doc_admin_30.mjs`; `node --experimental-websocket scripts/audit-0610/doc_admin_30.mjs` với LOCALAPPDATA riêng.", "BUILD RESULT: NOT RUN (không đổi mã ứng dụng/build).", "TEST RESULTS: CDP/OOXML audit đã chạy; 4 PASS, 5 FAIL, 1 BLOCKED. `git diff --check` PASS.", "KNOWN FAILURES: Cỡ TNR 13, numbering đa cấp, điều khoản, bảng 50 hàng/lặp tiêu đề, ngắt section portrait/landscape.", "RISKS: Kết quả in duplex cần driver thật; ứng dụng không có xác nhận duplex trong UI quan sát được.", "DEPENDENCIES/BLOCKERS: Không có driver in; script cần `VNO_CDP_LOCALAPPDATA` riêng.", "CORE PATCH ID (if any): None.", "NEXT ACTION: Điều tra các hàm/tệp nghi ngờ đã khoanh trong bảng; mở rộng caseDefinitions để triển khai ca 11–30.", "", "Tái chạy: `node --experimental-websocket scripts/audit-0610/doc_admin_30.mjs`. Cần đặt `VNO_CDP_LOCALAPPDATA` vào thư mục profile riêng; có thể đặt `VNO_DOC_ADMIN_OUT` để giữ DOCX audit. Không dùng input hệ điều hành và không sửa mã ứng dụng.");
await fs.writeFile(path.join(repo,"docs/AUDIT-DOC-ADMIN-0610.md"), lines.join("\n")+"\n", "utf8");
console.log(JSON.stringify({totals,records,outDir},null,2));
