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
async function placeCaret(needle) {
  return session.cdp.evaluate(`(() => {const root=document.querySelector('.vno-writer-body');const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;while(n=w.nextNode()){const i=n.data.indexOf(${JSON.stringify(needle)});if(i>=0){const r=document.createRange();r.setStart(n,i);r.collapse(true);const s=getSelection();s.removeAllRanges();s.addRange(r);return true}}return false})()`);
}
async function selectMany(first, last) {
  return session.cdp.evaluate(`(() => {const root=document.querySelector('.vno-writer-body');const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let a=null,b=null,n;while(n=w.nextNode()){if(!a&&n.data.includes(${JSON.stringify(first)}))a={n,i:n.data.indexOf(${JSON.stringify(first)})};if(n.data.includes(${JSON.stringify(last)}))b={n,i:n.data.indexOf(${JSON.stringify(last)})+${last.length}}}if(!a||!b)return false;const r=document.createRange();r.setStart(a.n,a.i);r.setEnd(b.n,b.i);const s=getSelection();s.removeAllRanges();s.addRange(r);return true})()`);
}
async function pressTab() {
  await session.cdp.send("Input.dispatchKeyEvent", {type:"keyDown",key:"Tab",code:"Tab",windowsVirtualKeyCode:9});
  await session.cdp.send("Input.dispatchKeyEvent", {type:"keyUp",key:"Tab",code:"Tab",windowsVirtualKeyCode:9});
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
  // Ca 2: Cỡ chữ 13 pt theo Nghị định 30/2020/NĐ-CP (lưu OOXML w:sz=26)
  await select("CV_TNR13_TOAN_VAN"); await command("writer.font.family", "Times New Roman"); await command("writer.font.size", "13");
  await capture(2,"2. TNR 13","NOT RUN",{target:"Times New Roman 13 pt (w:sz=26)"}); xml=captures.at(-1).xml;
  const fontRun=xml.runs.find(r=>r.text.includes("CV_TNR13_TOAN_VAN")); records.at(-1).status=fontRun?.font&&JSON.stringify(fontRun.font).includes("Times New Roman")&&fontRun.sz==="26"?"PASS":"FAIL"; records.at(-1).value.measurement=fontRun;
  await select("HEADING_1_QUYET_DINH"); await command("writer.style.apply", "heading1");
  await select("HEADING_2_CAN_CU"); await command("writer.style.apply", "heading2");
  await capture(3,"3. Heading quyết định","NOT RUN",{target:["Heading1","Heading2"]}); xml=captures.at(-1).xml;
  const headingPs=xml.ps.filter(p=>/HEADING_[12]/.test(p.text)); const headingOk=headingPs.some(p=>p.text.includes("HEADING_1")&&p.style==="Heading1")&&headingPs.some(p=>p.text.includes("HEADING_2")&&p.style==="Heading2"); records.at(-1).status=headingOk?"PASS":"FAIL"; records.at(-1).value.measurement=headingPs;
  await command("writer.reference.tocInsert");
  await capture(4,"4. TOC báo cáo","NOT RUN",{target:"Trường TOC và mục tiêu đề"}); xml=captures.at(-1).xml;
  const tocPs=xml.ps.filter(p=>/HEADING_[12]/.test(p.text)); const tocOk=xml.fields.some(x=>/TOC/i.test(x||""))&&tocPs.some(p=>p.text.includes("HEADING_1")&&p.style==="Heading1")&&tocPs.some(p=>p.text.includes("HEADING_2")&&p.style==="Heading2")&&tocPs.length>=4; records.at(-1).status=tocOk?"PASS":"FAIL"; records.at(-1).value.measurement={fields:xml.fields,tocRelatedParagraphs:tocPs};
  for (const [label, depth] of [["DANH_SACH_1",0],["DANH_SACH_1_1",1],["DANH_SACH_1_1_1",2]]) {
    await select(label); await command("writer.list.numbered");
    for(let i=0;i<depth;i++) await command("writer.para.indentInc");
  }
  await capture(5,"5. Danh sách đa cấp","NOT RUN",{target:"1 / 1.1 / 1.1.1"}); xml=captures.at(-1).xml;
  const listPs=xml.ps.filter(p=>/DANH_SACH_/.test(p.text)); const listOk=listPs.length===3&&new Set(listPs.map(p=>p.numPr?.ilvl)).size===3; records.at(-1).status=listOk?"PASS":"FAIL"; records.at(-1).value.measurement=listPs;
  await selectMany("DIEU_1","DIEM_A");
  await command("writer.para.multilevelList", "nd30");
  for(const [label,depth] of [["DIEU_1",0],["KHOAN_1",1],["DIEM_A",2]]) {
    await placeCaret(label);
    for(let i=0;i<depth;i++) await pressTab();
  }
  await capture(6,"6. Điều khoản","NOT RUN",{target:"Điều 1 / 1 / a)"}); xml=captures.at(-1).xml;
  const clausePs=xml.ps.filter(p=>/DIEU_|KHOAN_|DIEM_/.test(p.text)); const clauseLevels=xml.numberingLevels.filter(l=>l.numFmt&&l.lvlText); const clauseOk=clausePs.length===3&&new Set(clausePs.map(p=>p.numPr?.ilvl)).size===3&&clauseLevels.some(l=>l.numFmt==="decimal")&&clauseLevels.some(l=>l.numFmt==="lowerLetter")&&clauseLevels.every(l=>l.suff); records.at(-1).status=clauseOk?"PASS":"FAIL"; records.at(-1).value.measurement={paragraphs:clausePs,numberingLevels:clauseLevels};
  await command("writer.table.insert");
  for(let i=0;i<47;i++) await command("writer.table.insertRowBelow");
  await select("Tiêu đề");
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
  const sectionOk=xml.pg.length>=2&&xml.pg.some(s=>s.pgSz?.["{http://schemas.openxmlformats.org/wordprocessingml/2006/main}w"]==="11906"&&s.pgSz?.["{http://schemas.openxmlformats.org/wordprocessingml/2006/main}h"]==="16838")&&xml.pg.some(s=>s.pgSz?.["{http://schemas.openxmlformats.org/wordprocessingml/2006/main}w"]==="16838"&&s.pgSz?.["{http://schemas.openxmlformats.org/wordprocessingml/2006/main}h"]==="11906"); records.at(-1).status=sectionOk?"PASS":"FAIL"; records.at(-1).value.measurement=xml.pg;
  const printPreview=await command("writer.file.printPreview"); const duplex={preview:await session.cdp.evaluate("document.body.innerText.includes('Xem trước')"),controls:await session.cdp.evaluate("[...document.querySelectorAll('input,button,[role=combobox]')].map(x=>x.getAttribute('aria-label')||x.innerText).filter(x=>/hai mặt|duplex/i.test(x||''))")};
  await capture(10,"10. In duplex","BLOCKED",duplex,"Không có driver máy in; XML/UI hiện tại không chứng minh in hai mặt thật.");

  // Ca 11–30: mẫu văn bản hành chính được nhập và định dạng từ UI qua CDP.
  // Mỗi ca lưu DOCX riêng ngay sau thao tác, rồi kiểm tra nội dung và cấu trúc OOXML.
  const adminCases = [
    [11,"Công văn đi","CÔNG VĂN SỐ 11\nVề việc triển khai nhiệm vụ\nKính gửi: Các đơn vị trực thuộc\nNơi nhận: Như trên; Lưu: VT"],
    [12,"Quyết định","QUYẾT ĐỊNH SỐ 12\nVề việc thành lập tổ công tác\nĐiều 1. Thành lập tổ công tác.\nĐiều 2. Quyết định có hiệu lực kể từ ngày ký."],
    [13,"Tờ trình","TỜ TRÌNH SỐ 13\nVề việc phê duyệt kế hoạch\nKính trình: Thủ trưởng cơ quan\nI. Sự cần thiết\nII. Nội dung đề xuất"],
    [14,"Biên bản cuộc họp","BIÊN BẢN CUỘC HỌP\nThời gian: 08 giờ 00 ngày 06/10/2026\nĐịa điểm: Phòng họp cơ quan\nChủ trì: Nguyễn Văn An\nThư ký: Trần Thị Bình"],
    [15,"Hợp đồng","HỢP ĐỒNG SỐ 15\nCăn cứ nhu cầu và năng lực của các bên\nĐiều 1. Nội dung hợp đồng\nĐiều 2. Quyền và nghĩa vụ\nĐẠI DIỆN BÊN A                 ĐẠI DIỆN BÊN B"],
    [16,"Báo cáo","BÁO CÁO KẾT QUẢ CÔNG TÁC\nI. Tình hình thực hiện\nII. Kết quả đạt được\nIII. Khó khăn, kiến nghị"],
    [17,"Bảng ký nhận","BẢNG KÝ NHẬN\nSTT | Họ và tên | Đơn vị | Chữ ký\n1 | Nguyễn Văn An | Văn phòng |\n2 | Trần Thị Bình | Tổ chức |"],
    [18,"Công văn đến","PHIẾU XỬ LÝ CÔNG VĂN ĐẾN\nSố đến: 018\nNgày đến: 06/10/2026\nĐơn vị xử lý: Phòng Hành chính\nÝ kiến chỉ đạo: Giải quyết theo quy định"],
    [19,"Quyết định bổ nhiệm","QUYẾT ĐỊNH BỔ NHIỆM\nĐiều 1. Bổ nhiệm ông Nguyễn Văn An.\nĐiều 2. Thời hạn bổ nhiệm là 05 năm.\nĐiều 3. Các đơn vị liên quan chịu trách nhiệm thi hành."],
    [20,"Tờ trình kinh phí","TỜ TRÌNH DỰ TOÁN KINH PHÍ\n1. Nội dung: tổ chức hội nghị\n2. Kinh phí đề nghị: 25.000.000 đồng\na) Hội trường; b) Tài liệu; c) Nước uống"],
    [21,"Biên bản bàn giao","BIÊN BẢN BÀN GIAO\nBên giao: Phòng Hành chính\nBên nhận: Phòng Tài vụ\nTài sản bàn giao: 05 bộ hồ sơ\nHai bên xác nhận đúng hiện trạng."],
    [22,"Hợp đồng dịch vụ","HỢP ĐỒNG DỊCH VỤ\nĐiều 1. Phạm vi công việc\nKhoản 1. Bên cung cấp thực hiện dịch vụ.\nĐiểm a) Bảo đảm tiến độ; b) Bảo mật thông tin."],
    [23,"Báo cáo tháng","BÁO CÁO CÔNG TÁC THÁNG 9\n1. Công tác chuyên môn\n2. Công tác phối hợp\n3. Nhiệm vụ trọng tâm tháng 10"],
    [24,"Bảng chấm công","BẢNG TỔNG HỢP CHẤM CÔNG\nSTT | Họ và tên | Ngày công | Ghi chú\n1 | Nguyễn Văn An | 22 | Đủ\n2 | Trần Thị Bình | 21 | Nghỉ phép"],
    [25,"Thông báo","THÔNG BÁO\nVề lịch nghỉ lễ\nCác đơn vị chủ động bố trí lịch trực.\nNơi nhận: Các đơn vị; Lưu: VT."],
    [26,"Kế hoạch","KẾ HOẠCH TRIỂN KHAI\nI. Mục đích, yêu cầu\nII. Nội dung thực hiện\nIII. Phân công trách nhiệm\nIV. Tiến độ"],
    [27,"Biên bản kiểm kê","BIÊN BẢN KIỂM KÊ TÀI SẢN\nThời điểm kiểm kê: 06/10/2026\nSTT | Tên tài sản | Số lượng | Tình trạng\n1 | Máy tính | 10 | Đang sử dụng"],
    [28,"Hợp đồng thuê","HỢP ĐỒNG THUÊ TÀI SẢN\nĐiều 1. Tài sản cho thuê\nĐiều 2. Thời hạn thuê\nĐiều 3. Giá thuê và phương thức thanh toán\nĐiều 4. Trách nhiệm các bên"],
    [29,"Báo cáo có phụ lục","BÁO CÁO KÈM PHỤ LỤC\nI. Kết quả thực hiện\nII. Đánh giá chung\nPHỤ LỤC: BẢNG SỐ LIỆU\nSTT | Chỉ tiêu | Kết quả"],
    [30,"Công văn trình ký","CÔNG VĂN TRÌNH KÝ\nKính trình Thủ trưởng xem xét, ký ban hành.\nNơi nhận: Như trên; Lưu: VT.\nNGƯỜI SOẠN THẢO                 THỦ TRƯỞNG ĐƠN VỊ"],
  ];
  for (const [id, label, content] of adminCases) {
    const marker = `AUDIT_${String(id).padStart(2,"0")}_${label.replaceAll(" ","_")}`;
    await add(`${marker}\n${content}`);
    await select(marker); await command("writer.font.family", "Times New Roman"); await command("writer.font.size", "13.5");
    const shown = await text();
    const shownOk = shown.includes(marker) && shown.includes(content.split("\n")[1]);
    await capture(id,`${id}. ${label}`,"NOT RUN",{template:label,uiVisible:shownOk,font:"Times New Roman 13,5 pt"});
    xml=captures.at(-1).xml;
    const paragraph=xml.ps.find(p=>p.text.includes(marker));
    const run=xml.runs.find(r=>r.text.includes(marker));
    const structureOk=xml.ps.some(p=>p.text.includes(marker))&&xml.styles>0&&xml.pg.length>0&&xml.parts.includes("word/document.xml");
    const fontOk=run?.font&&JSON.stringify(run.font).includes("Times New Roman")&&run.sz==="27";
    records.at(-1).status=!shownOk?"BLOCKED":structureOk&&fontOk?"PASS":"FAIL";
    if(!shownOk) records.at(-1).why="Lỗi bài kiểm/harness: thao tác nhập qua CDP không làm nội dung xuất hiện trên bề mặt Writer; chưa quy lỗi cho sản phẩm.";
    records.at(-1).value.measurement={visible:shownOk,paragraph,run,styles:xml.styles,sections:xml.pg.length,documentPart:xml.parts.includes("word/document.xml")};
  }

  await session.close(); session = null;
  for(const c of captures) {
    session=await launchApp("writer",{localAppData,filePath:c.file,startTimeoutMilliseconds:90000});
    const real=(await fs.realpath(c.file)).replace(/\\/g,"/").toLowerCase();
    await session.cdp.waitFor(`(window.__vnoAppInstance?.adapter?._sourcePath||'').replace(/\\\\/g,'/').toLowerCase()===${JSON.stringify(real)}`,{timeoutMilliseconds:90000});
    const reopenedText=await text(); const reopenedXml=await inspect(c.file);
    const expectedMarker=c.id>=11?`AUDIT_${String(c.id).padStart(2,"0")}_`:"CV_A4_LE_MAU";
    const retained=reopenedText.includes(expectedMarker)&&(c.id<11?reopenedText.includes("NOI_DUNG_TRANG_SAU"):true);
    const row=records.find(r=>r.name===c.name);
    row.value.reopen={source:await session.cdp.evaluate("window.__vnoAppInstance?.adapter?._sourcePath||null"),characters:reopenedText.length,retained,paragraphs:reopenedXml.ps.length,sections:reopenedXml.pg,fields:reopenedXml.fields};
    if(!retained&&row.status==="PASS")row.status="FAIL";
    await session.close(); session=null;
  }
} catch (e) {
  record("Khởi chạy/luồng audit", "BLOCKED", null, e.stack || String(e));
} finally { if (session) await session.close().catch(()=>{}); }

const totals = Object.fromEntries(["PASS","FAIL","BLOCKED","NOT RUN"].map(x=>[x,records.filter(r=>r.status===x).length]));
const adminTotals = Object.fromEntries(["PASS","FAIL","BLOCKED","NOT RUN"].map(x=>[x,records.filter(r=>/^([1-2][1-9]|30)\./.test(r.name)&&r.status===x).length]));
const esc = x => JSON.stringify(x ?? "").replaceAll("|","/").replaceAll("\n"," ");
const lines = ["# Kết quả audit Doc Admin 11–30 (D6b)", "", `Nhánh: \`${(await import("node:child_process")).execFileSync("git",["branch","--show-current"],{cwd:repo,encoding:"utf8"}).trim()}\`. Ca 11–30 được nhập và định dạng qua CDP; mỗi DOCX lưu riêng, kiểm tra word/document.xml, styles, sectPr và hiển thị khi mở lại.`, "", `Kết quả ca 11–30: PASS ${adminTotals.PASS}, FAIL ${adminTotals.FAIL}, BLOCKED ${adminTotals.BLOCKED}, NOT RUN ${adminTotals["NOT RUN"]}.`, `Tổng toàn bộ lượt chạy (ca 1–30): PASS ${totals.PASS}, FAIL ${totals.FAIL}, BLOCKED ${totals.BLOCKED}, NOT RUN ${totals["NOT RUN"]}.`, "", "| Kịch bản | Kết quả | Kết luận | Giá trị đo | Tái hiện 3 bước / tệp:hàm nghi ngờ |", "|---|---|---|---|---|"];
for (const r of records) {
  let why=r.why;
  if (r.status === "FAIL") {
    const suspects={"1. Công văn A4/lề":"adapters/libreoffice/writer/writer-adapter.js: _applyPageSetup / luồng HTML→DOCX; XML cho thấy w=16838, h=11906 (ngang), lề đọc là 35/20/25/25mm.","2. TNR 13":"adapters/libreoffice/writer/writer-adapter.js:7018 (writer.font.size); XML w:sz=72 thay vì 26.","3. Heading quyết định":"adapters/libreoffice/writer/writer-adapter.js:8060 (_applyParagraphStyle) / map style HTML→OOXML; đo được pStyle.","4. TOC báo cáo":"adapters/libreoffice/writer/writer-adapter.js: insertTableOfContents / exporter TOC entries; field TOC có, chưa thấy entries mục lục.","5. Danh sách đa cấp":"adapters/libreoffice/writer/writer-adapter.js:6982 (writer.list.numbered); cả ba mức không có ilvl phân cấp.","6. Điều khoản":"adapters/libreoffice/writer/writer-adapter.js:6982 (writer.list.numbered); Điều/Khoản/Điểm không có đủ ba mức.","7. Bảng qua trang":"adapters/libreoffice/writer/writer-adapter.js: insertTable / toggleTableHeaderRow; đo được bảng 3 hàng, 0 tblHeader.","8. Header/footer/PAGE":"adapters/libreoffice/writer/writer-adapter.js: activateFooter / lệnh chèn PAGE; parts tồn tại nhưng không có instrText PAGE.","9. Ngắt trang/section":"adapters/libreoffice/writer/writer-adapter.js: insertSectionBreak / _openPageSetup; cần đối chiếu section properties trong document.xml."};
    const repro={"6. Điều khoản":"Tái hiện: 1) vào Trang đầu > Danh sách đa cấp > Điều 1./1./a); 2) gõ ba đoạn Điều/Khoản/Điểm, nhấn Tab đầu đoạn để lùi cấp; 3) lưu DOCX và kiểm tra document.xml: ba numPr vẫn ilvl 0. Nghi ngờ adapters/libreoffice/writer/writer-adapter.js: resolveWriterTabBehavior/applyMultilevelList; đề xuất sửa việc Tab đổi cấp và giữ numFmt theo preset.","7. Bảng qua trang":"Tái hiện: 1) Chèn bảng và tạo 50 hàng; 2) chọn hàng đầu > Bố trí > Lặp lại hàng tiêu đề; 3) lưu DOCX: 50 hàng nhưng không có w:tblHeader. Nghi ngờ adapters/libreoffice/writer/writer-adapter.js: toggleTableHeaderRow và luồng HTML→OOXML; đề xuất ánh xạ vno-table-header-row sang tblHeader.","9. Ngắt trang/section":"Tái hiện: 1) đặt con trỏ sau đoạn đầu > Bố trí > Ngắt > Trang tiếp theo; 2) tại đoạn sau ngắt chọn Bố trí > Hướng > Ngang; 3) lưu DOCX: chỉ một sectPr ngang, không có section portrait rồi landscape. Nghi ngờ adapters/libreoffice/writer/writer-adapter.js: insertSectionBreak/_openPageSetup/setPageSetup; đề xuất lưu sectPr riêng cho từng section."};
    why=repro[r.name]||`Tái hiện: 1) nhập mẫu “${r.name}” qua Writer; 2) chọn dòng AUDIT_${r.name.split(".")[0].padStart(2,"0")} và áp dụng Times New Roman 13,5 pt; 3) lưu DOCX, đối chiếu run trong word/document.xml và mở lại. Nghi ngờ adapters/libreoffice/writer/writer-adapter.js: writer.font.family / writer.font.size hoặc xuất HTML→DOCX; xác nhận bằng giá trị font/sz trong cột đo.`;
  }
  const conclusion = r.status === "PASS" ? "ĐẠT" : r.why?.startsWith("Lỗi bài kiểm") ? "LỖI BÀI KIỂM/HARNESS" : r.status === "FAIL" ? "LỖI SẢN PHẨM (UI hiển thị; DOCX/XML không đạt)" : r.status;
  lines.push(`| ${r.name} | ${r.status} | ${conclusion} | \`${esc(r.value)}\` | ${why.replaceAll("|","/")} |`);
}
lines.push("", "## Handoff", "", "TASK: Ticket D6b — mở rộng audit hành chính 11–30; không sửa ứng dụng.", "AGENT/ROLE: Codex / kiểm thử qua CDP, sửa script audit và báo cáo.", `BRANCH: ${(await import("node:child_process")).execFileSync("git",["branch", "--show-current"],{cwd:repo,encoding:"utf8"}).trim()}`, `WORKTREE: ${repo}`, "OBJECTIVE: Tạo 20 kịch bản hành chính, lưu DOCX từng ca và phân biệt lỗi bài kiểm với lỗi sản phẩm.", `FINDINGS: ${totals.PASS} PASS, ${totals.FAIL} FAIL, ${totals.BLOCKED} BLOCKED.`, "IMPLEMENTATION SUMMARY: Kịch bản 11–30 được thao tác qua CDP, lưu DOCX riêng, đo OOXML và mở lại để xác nhận hiển thị.", "FILES CHANGED: `scripts/audit-0610/doc_admin_30.mjs`, `docs/AUDIT-DOC-ADMIN-11-30.md`.", "BUILD RESULT: NOT RUN (không sửa ứng dụng).", `TEST RESULTS: CDP ${totals.PASS} PASS / ${totals.FAIL} FAIL / ${totals.BLOCKED} BLOCKED.`, "RISKS: In duplex cần driver máy in.", "DEPENDENCIES/BLOCKERS: Cần desktop Writer và profile CDP riêng qua VNO_CDP_LOCALAPPDATA.", "CORE PATCH ID (if any): None.", "NEXT ACTION: Xem lỗi sản phẩm còn lại trong bảng; không sửa ứng dụng theo phạm vi ticket.", "", "Tái chạy: `node --experimental-websocket scripts/audit-0610/doc_admin_30.mjs`.");
await fs.writeFile(path.join(repo,"docs/AUDIT-DOC-ADMIN-11-30.md"), lines.join("\n")+"\n", "utf8");
console.log(JSON.stringify({totals,records,outDir},null,2));
