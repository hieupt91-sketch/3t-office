import { launchApp } from "./session.mjs";
import { click, insertText, press, mouseDrag, sleep } from "./actions.mjs";
import fs from "node:fs";
import path from "node:path";

const root=process.env.VNO_CDP_LOCALAPPDATA, source=process.env.Q17_SOURCE_DOCX;
if(!root||!source)throw new Error("Set fresh VNO_CDP_LOCALAPPDATA and Q17_SOURCE_DOCX.");
const output=path.join(root,"q17-review-find.docx");
const checks=[]; const check=(name,ok,detail="")=>{checks.push(Boolean(ok));console.log(`${ok?"PASS":"FAIL"} | ${name}${detail?` | ${detail}`:""}`)};
const state=async cdp=>cdp.evaluate(`(()=>({text:document.querySelector('.vno-writer-body')?.innerText||'',comments:document.querySelectorAll('.vno-writer-body [data-vno-comment],.vno-writer-comments-panel [data-vno-comment]').length,revisionMarks:document.querySelectorAll('.vno-writer-body ins,.vno-writer-body del,[data-vno-revision]').length,dialogs:[...document.querySelectorAll('[role=dialog]')].map(x=>({text:x.innerText.slice(0,300),inputs:[...x.querySelectorAll('input')].map(i=>({type:i.type,id:i.id,placeholder:i.placeholder,checked:i.checked}))}))}))()`);
let session=await launchApp("writer",{filePath:source,localAppData:path.join(root,"create"),startTimeoutMilliseconds:180000,readyTimeoutMilliseconds:180000});
try{
 const cdp=session.cdp; const expected=source.replace(/\\/g,"/").toLowerCase();
 await cdp.waitFor(`(()=>{const a=window.__vnoAppInstance?.adapter;return String(a?._sourcePath||a?.sourceFilePath||'').replace(/\\\\/g,'/').toLowerCase()===${JSON.stringify(expected)}})()`,{timeoutMilliseconds:180000,intervalMilliseconds:500});
 await click(cdp,".vno-writer-body"); await press(cdp,"End",{ctrl:true}); await press(cdp,"Enter"); await insertText(cdp,"Trạng thái trước rà soát: kế hoạch cập nhật tuần 3.");
 await click(cdp,"#vno-ribbon-tab-review");
 await click(cdp,'[data-command-id="writer.trackChanges.toggle"]');
 await press(cdp,"End",{ctrl:true}); await press(cdp,"Enter"); await insertText(cdp,"Bổ sung: đầu mối xác nhận trước ngày 28/10.");
 let review=await cdp.evaluate(`(()=>{const b=document.querySelector('.vno-writer-body');return{hasText:[...b.querySelectorAll('p')].some(p=>p.innerText.includes('đầu mối xác nhận')),toggle:document.querySelector('[data-command-id="writer.trackChanges.toggle"]')?.getAttribute('aria-pressed')}})()`);
 check("Bật theo dõi thay đổi và nhập nội dung mới",review.hasText&&review.toggle!=="false",JSON.stringify(review));
 const selectionRect=await cdp.evaluate(`(()=>{const p=[...document.querySelectorAll('.vno-writer-body p')].find(x=>x.innerText.includes('đầu mối xác nhận'));if(!p)return null;const r=p.getBoundingClientRect();return{left:r.left,right:r.right,y:r.top+r.height/2,text:p.innerText}})()`);
 if(selectionRect)await mouseDrag(cdp,selectionRect.right-6,selectionRect.y,selectionRect.left+6,selectionRect.y,{steps:12});
 const selectedText=await cdp.evaluate(`window.getSelection()?.toString()`);
 await click(cdp,'[data-command-id="writer.comment.insert"]'); await sleep(400);
  let dlg=await state(cdp);
 check("Chọn đoạn văn bản để neo nhận xét",Boolean(selectedText?.trim()),JSON.stringify({selectedText,selectionRect}));
 if(selectedText?.trim()){
  await cdp.waitFor("document.querySelector('.vno-dialog-overlay .vno-dialog-input')",{timeoutMilliseconds:15000});
  await click(cdp,".vno-dialog-overlay .vno-dialog-input");await press(cdp,"a",{ctrl:true},50);await insertText(cdp,"Kiểm tra mốc thời gian với đơn vị phụ trách.");await click(cdp,".vno-dialog-overlay .vno-dialog-ok-btn");
 }
  dlg=await state(cdp);
 check("Thêm nhận xét có nội dung",await cdp.evaluate(`window.__vnoAppInstance.adapter.comments.some(x=>x.content.includes('Kiểm tra mốc thời gian'))`),JSON.stringify({dialogs:dlg.dialogs,text:dlg.text.slice(-180)}));
 await click(cdp,"#vno-ribbon-tab-home"); await click(cdp,'[data-command-id="common.edit.replace"]'); await sleep(300);
 let find=await state(cdp);
 check("Mở hộp Tìm và Thay thế",find.dialogs.length>0,JSON.stringify(find.dialogs));
 const formatting=await cdp.evaluate(`(()=>[...document.querySelectorAll('button')].filter(b=>b.getBoundingClientRect().width&&/Định dạng|Format|Biểu thức|regex/i.test(b.innerText)).map(b=>b.innerText.trim()))()`);
 const regex=await cdp.evaluate(`!![...document.querySelectorAll('input[type=checkbox]')].find(x=>/regex|regular|biểu thức/i.test((x.parentElement?.innerText||'')+' '+x.id+' '+x.name))`);
 check("Hộp tìm/thay có tùy chọn định dạng và regex",formatting.length>0||regex,JSON.stringify({formatting,regex}));
 const snap=await cdp.send("Page.captureScreenshot",{format:"png"},30000); fs.mkdirSync(path.join(root,"screenshots"),{recursive:true}); fs.writeFileSync(path.join(root,"screenshots","06-tim-thay-va-ra-soat.png"),Buffer.from((snap.result||snap).data,"base64"));
 await press(cdp,"Escape");
 const html=await cdp.evaluate("window.__vnoAppInstance.adapter._contentForExport()");
 const saved=await cdp.evaluate(`window.pywebview.api.save_document_in_place(${JSON.stringify(html)},'writer',${JSON.stringify(output)},null)`,{awaitPromise:true,timeoutMilliseconds:240000});
 check("Lưu DOCX nhóm nhận xét và rà soát",saved?.status==="ok",JSON.stringify(saved));
}catch(error){check("Nhóm rà soát không phát sinh ngoại lệ",false,error.stack||error.message)}finally{await session.close()}
if(fs.existsSync(output)){
 session=await launchApp("writer",{filePath:output,localAppData:path.join(root,"reopen"),startTimeoutMilliseconds:180000,readyTimeoutMilliseconds:180000});
 try{const expected=output.replace(/\\/g,"/").toLowerCase();await session.cdp.waitFor(`(()=>{const a=window.__vnoAppInstance?.adapter;return String(a?._sourcePath||a?.sourceFilePath||'').replace(/\\\\/g,'/').toLowerCase()===${JSON.stringify(expected)}})()`,{timeoutMilliseconds:180000,intervalMilliseconds:500});const v=await state(session.cdp);check("Mở lại nội dung nhóm rà soát",v.text.includes("đầu mối xác nhận"),JSON.stringify({comments:v.comments,revisions:v.revisionMarks,text:v.text.slice(-130)}))}catch(error){check("Mở lại nhóm rà soát",false,error.stack||error.message)}finally{await session.close()}
}
console.log(`REVIEW_DOCX ${output}`);console.log(`SUMMARY ${checks.filter(Boolean).length}/${checks.length} PASS | ${checks.length-checks.filter(Boolean).length} FAIL`);if(checks.some(x=>!x))process.exitCode=1;
