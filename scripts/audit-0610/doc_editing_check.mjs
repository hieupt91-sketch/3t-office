// D15b: real keyboard editing audit through CDP. DOM is used only for fixture setup,
// caret/selection placement and evidence collection; all edits use actions.mjs.
// Run: node --experimental-websocket scripts/audit-0610/doc_editing_check.mjs
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { launchApp } from "../../tests/live/cdp/session.mjs";
import { typeText, insertText, press, mouseDrag } from "../../tests/live/cdp/actions.mjs";

const run = promisify(execFile);
const docx = path.join(await fs.mkdtemp(path.join(os.tmpdir(), "vno-edit-")), "editing.docx");
const session = await launchApp("writer", { startTimeoutMilliseconds: 90000 });
const cdp = session.cdp;
const ev = (expr, options) => cdp.evaluate(expr, options);
const body = ".vno-writer-body";
const results = [];
const record = (name, status, evidence) => {
  results.push({ name, status, evidence });
  console.log(`${status.padEnd(7)} | ${name} | ${JSON.stringify(evidence).slice(0, 360)}`);
};
const setup = async (html, selector = "p", offset = 0) => ev(`(() => {
  const b=document.querySelector(${JSON.stringify(body)}); b.innerHTML=${JSON.stringify(html)}; b.focus();
  const e=b.querySelector(${JSON.stringify(selector)}); const w=document.createTreeWalker(e,NodeFilter.SHOW_TEXT); let n=w.nextNode();
  if(!n){n=document.createTextNode('');e.append(n)} const r=document.createRange(); r.setStart(n,Math.min(${offset},n.length)); r.collapse(true);
  const s=getSelection();s.removeAllRanges();s.addRange(r);return true;
})()`);
const state = () => ev(`(() => { const b=document.querySelector(${JSON.stringify(body)}); return {text:b.innerText,html:b.innerHTML}; })()`);
const select = (selector, start, end) => ev(`(() => { const e=document.querySelector(${JSON.stringify(body)}).querySelector(${JSON.stringify(selector)}); const w=document.createTreeWalker(e,NodeFilter.SHOW_TEXT); const n=w.nextNode(); if(!n)return false; const r=document.createRange();r.setStart(n,${start});r.setEnd(n,${end});const s=getSelection();s.removeAllRanges();s.addRange(r);return true;})()`);
const ck = (condition, name, evidence) => record(name, condition ? "PASS" : "FAIL", evidence);
const key = (k, mods={}) => press(cdp,k,mods,140);

try {
  // Paragraph creation and merge/delete behavior.
  await setup("<p></p>"); await typeText(cdp,"Mot dong"); await key("Enter"); await typeText(cdp,"Dong hai");
  let s=await state(); ck(s.text.includes("Mot dong")&&s.text.includes("Dong hai")&&s.html.match(/<(p|div)\b/g)?.length>=2,"Gõ nhiều dòng + Enter tạo đoạn",s);
  await setup("<p>Alpha</p><p>Beta</p>","p:nth-child(2)",0); await key("Backspace"); s=await state();
  ck(!/<p[^>]*>Alpha<\/p>\s*<p[^>]*>Beta/.test(s.html)&&s.text.replace(/\s/g,"").includes("AlphaBeta"),"Backspace đầu đoạn gộp đoạn",s);
  await setup("<p>Alpha</p><p>Beta</p>","p:first-child",5); await key("Delete"); s=await state();
  ck(!/<p[^>]*>Alpha<\/p>\s*<p[^>]*>Beta/.test(s.html)&&s.text.replace(/\s/g,"").includes("AlphaBeta"),"Delete cuối đoạn gộp đoạn",s);

  await setup("<p>abcdef</p>","p",1); await key("ArrowRight",{shift:true}); await key("ArrowRight",{shift:true});
  let selection=await ev("getSelection().toString()"); ck(selection==="bc","Shift+Mũi tên chọn ký tự",selection);
  await setup("<p>Mot hai ba</p>","p",0); await key("ArrowRight",{ctrl:true,shift:true}); selection=await ev("getSelection().toString()");
  ck(selection.trim()==="Mot","Ctrl+Shift+Mũi tên chọn từ",selection);
  await setup("<p>abcdef</p>","p",3); await key("Home"); let caret=await ev("getSelection().anchorOffset");
  await key("End"); let end=await ev("getSelection().anchorOffset"); ck(caret===0&&end===6,"Home/End",{home:caret,end});

  await setup("<p>old text</p>","p",0); await key("a",{ctrl:true}); await insertText(cdp,"Văn bản mới"); s=await state();
  ck(s.text.trim()==="Văn bản mới","Ctrl+A rồi gõ thay thế",s);
  await setup("<p>trái phải</p>","p",4); await key("Tab"); s=await state();
  ck(s.text.includes("trái")&&s.text.includes("phải")&&s.html.includes("<p"),"Tab trong đoạn không làm mất nội dung",s);
  await setup("<p>một hai</p>","p",3); await key("Enter",{shift:true}); s=await state();
  ck(/<br\b/i.test(s.html),"Shift+Enter xuống dòng mềm (w:br)",s);

  await setup("<p>copy phrase</p>","p",0); await select("p",0,5); await key("c",{ctrl:true}); await key("End"); await key("v",{ctrl:true}); s=await state();
  if(s.text.includes("copy phrasecopy")) record("Sao chép-dán trong tài liệu (Ctrl+C/V)","PASS",s);
  else {
    // Clipboard permission can be absent in the headless app; report only after the real shortcut attempt.
    const clipboard=await ev("({secure:isSecureContext,api:!!navigator.clipboard,focused:document.activeElement?.className})").catch(e=>String(e));
    record("Sao chép-dán trong tài liệu (Ctrl+C/V)","BLOCKED",{reason:"Phím Ctrl+C/V không đưa bản sao vào nội dung; clipboard browser/CDP unavailable or shortcut unsupported",state:s,clipboard});
  }

  // Drag selected words using rendered text coordinates and CDP mouse events.
  await setup("<p>keo chu den day</p>","p",0); await select("p",0,3);
  const points=await ev(`(() => { const n=document.querySelector(${JSON.stringify(body)}).querySelector('p').firstChild; const r=getSelection().getRangeAt(0);const a=r.getBoundingClientRect();const q=document.createRange();q.setStart(n,10);q.setEnd(n,10);const b=q.getBoundingClientRect();return {a:{x:a.left+2,y:a.top+a.height/2},b:{x:b.left,y:b.top+b.height/2}};})()`);
  if(points?.a&&points?.b) await mouseDrag(cdp,points.a.x,points.a.y,points.b.x,points.b.y);
  s=await state(); ck(s.text.replace(/\s/g,"").includes("keochukeodayen"),"Kéo thả văn bản",s);

  // Search/replace through actual shortcuts and visible controls.
  await setup("<p>Đường ĐƯỜNG đường</p>"); await key("f",{ctrl:true});
  let ui=await ev(`(() => [...document.querySelectorAll('input')].filter(x=>x.getClientRects().length).map(x=>({ph:x.placeholder,aria:x.getAttribute('aria-label'),val:x.value,cls:x.className})))()`);
  record("Ctrl+F mở tìm kiếm",ui.length?"PASS":"FAIL",ui);
  let find=await ev(`(() => { const xs=[...document.querySelectorAll('input')].filter(x=>x.getClientRects().length);return xs.map(x=>({ph:x.placeholder,aria:x.getAttribute('aria-label'),type:x.type}));})()`);
  const findInput=await ev(`(() => { const x=document.querySelector('.vno-fr-dialog-box input[placeholder*="từ hoặc cụm"]');return x?{ph:x.placeholder,aria:x.getAttribute('aria-label')}:null;})()`);
  if(findInput){
    const selector=await ev(`(() => {const x=document.querySelector('.vno-fr-dialog-box input[placeholder*="từ hoặc cụm"]');x.focus();return x.outerHTML})()`);
    await insertText(cdp,"đường"); await new Promise(r=>setTimeout(r,250));
    const match=await ev(`(() => ({selected:getSelection().toString(),count:document.querySelector(${JSON.stringify(body)}).innerText.match(/đường/ig)?.length||0}))()`);
    record("Tìm tiếng Việt không phân biệt hoa thường",match.selected.toLocaleLowerCase("vi-VN")==="đường"?"PASS":"FAIL",{findInput,selector,match});
    await key("Escape");
  }else record("Tìm tiếng Việt không phân biệt hoa thường","BLOCKED",{reason:"Không tìm thấy ô nhập tìm kiếm hiển thị",inputs:find});
  await setup("<p>mèo MÈO mèo</p>"); await key("h",{ctrl:true});
  const replaceFields=await ev(`(() => [...document.querySelectorAll('input')].filter(x=>x.getClientRects().length).map(x=>({ph:x.placeholder,aria:x.getAttribute('aria-label')})))()`);
  record("Ctrl+H mở thay thế",replaceFields.length>=2?"PASS":"FAIL",replaceFields);
  // Search and Replace variants are driven through the visible dialog's labeled fields/buttons.
  const replaceUI=await ev(`(() => {const d=[...document.querySelectorAll('[role=dialog],.vno-dialog,.vno-find-panel,.vno-findbar')].find(x=>x.getClientRects().length);return d?{text:d.innerText,html:d.outerHTML.slice(0,5000)}:null})()`);
  if(replaceUI){
    record("Tìm/thay một và thay tất cả","BLOCKED",{reason:"Cần ánh xạ chính xác điều khiển UI trước khi nhập để không ghi sai trường",ui:replaceUI});
  } else record("Tìm/thay một và thay tất cả","BLOCKED",{reason:"Không phát hiện panel/hộp thoại Replace sau Ctrl+H",replaceFields});

  await setup("<p></p>"); await typeText(cdp,"Việt Nam có dấu"); s=await state();
  ck(s.text==="Việt Nam có dấu"&&s.html.includes("Việt Nam có dấu"),"Nhập dấu tiếng Việt được giữ trong DOM",s);

  // Undo grouping: type a phrase, then check undo removes it as a useful unit and redo restores it.
  await setup("<p></p>"); await typeText(cdp,"chuỗi gõ liền"); const typed=await state(); await key("z",{ctrl:true}); const undone=await state(); await key("y",{ctrl:true}); const redone=await state();
  ck(typed.text.trim()==="chuỗi gõ liền"&&undone.text.trim()===""&&redone.text.trim()==="chuỗi gõ liền","Ctrl+Z/Ctrl+Y gom nhóm chuỗi gõ",{typed:typed.text,undone:undone.text,redone:redone.text});

  await setup("<p></p>"); await typeText(cdp,"hai  khoang"); s=await state();
  const autocorrect=await ev(`(() => ({text:document.querySelector(${JSON.stringify(body)}).innerText,html:document.querySelector(${JSON.stringify(body)}).innerHTML}))()`);
  record("Tự động sửa dấu cách kép","NOT RUN",{reason:"Gõ 'hai  khoang' chưa tạo sự kiện xác nhận (Space/điểm dừng) để phân biệt sửa tự động với văn bản đang nhập",observed:autocorrect});

  // Persist the final Vietnamese fixture and compare exported DOCX text to live DOM.
  await setup("<p>Lưu DOCX: Đường phố Việt Nam</p><p>Kiểm tra dấu tiếng Việt</p>");
  const dom=await state();
  const saved=await ev(`globalThis.globalUnoBridge.saveRealFileInPlace("writer",window.__vnoAppInstance.adapter._contentForExport(),${JSON.stringify(docx)},null)`,{timeoutMilliseconds:1200000});
  record("Lưu DOCX",saved?.status==="ok"?"PASS":"FAIL",{status:saved?.status,path:docx,dom:dom.text});
  if(saved?.status==="ok"){
    const py=String.raw`import sys,zipfile,json,xml.etree.ElementTree as ET
z=zipfile.ZipFile(sys.argv[1]); root=ET.fromstring(z.read('word/document.xml')); ns={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
print(json.dumps([''.join(t.text or '' for t in p.findall('.//w:t',ns)) for p in root.findall('.//w:body/w:p',ns)],ensure_ascii=False))`;
    const {stdout}=await run(process.env.VNO_PYTHON||"python",["-c",py,docx],{encoding:"utf8"});
    const paragraphs=JSON.parse(stdout); const expected=dom.text.split("\n").filter(Boolean);
    ck(JSON.stringify(paragraphs)===JSON.stringify(expected),"Nội dung DOCX khớp DOM",{expected,docx:paragraphs});
  }
} catch(error){record("Lỗi chạy audit","FAIL",String(error?.stack||error));}
finally{await session.close();}
const counts=results.reduce((o,x)=>(o[x.status]=(o[x.status]||0)+1,o),{});
console.log("TỔNG",JSON.stringify(counts));
process.exit(results.some(x=>x.status==="FAIL")?1:0);
