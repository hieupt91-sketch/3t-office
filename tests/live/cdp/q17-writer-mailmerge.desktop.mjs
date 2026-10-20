import { launchApp } from "./session.mjs";
import { click, insertText, press, sleep } from "./actions.mjs";
import fs from "node:fs";
import path from "node:path";

const root=process.env.VNO_CDP_LOCALAPPDATA,source=process.env.Q17_SOURCE_DOCX;
if(!root||!source)throw new Error("Set fresh VNO_CDP_LOCALAPPDATA and Q17_SOURCE_DOCX.");
fs.mkdirSync(root,{recursive:true});
const csv=path.join(root,"nguoi-nhan.csv"),output=path.join(root,"q17-mailmerge.docx");
fs.writeFileSync(csv,"\uFEFFHoTen,Email,DonVi\nNguyen An,an@example.invalid,Don vi A\nTran Binh,binh@example.invalid,Don vi B\nLe Chi,chi@example.invalid,Don vi C\n","utf8");
const results=[];const check=(n,ok,d="")=>{results.push(Boolean(ok));console.log(`${ok?"PASS":"FAIL"} | ${n}${d?` | ${d}`:""}`)};
let session=await launchApp("writer",{filePath:source,localAppData:path.join(root,"create"),startTimeoutMilliseconds:180000,readyTimeoutMilliseconds:180000});
try{
 const cdp=session.cdp;const expected=source.replace(/\\/g,"/").toLowerCase();
 await cdp.waitFor(`(()=>{const a=window.__vnoAppInstance?.adapter;return String(a?._sourcePath||a?.sourceFilePath||'').replace(/\\\\/g,'/').toLowerCase()===${JSON.stringify(expected)}})()`,{timeoutMilliseconds:180000,intervalMilliseconds:500});
 await click(cdp,".vno-writer-body");await press(cdp,"End",{ctrl:true});await press(cdp,"Enter");await insertText(cdp,"Kính gửi ");
 await click(cdp,"#vno-ribbon-tab-mailings");await cdp.send("DOM.enable");
 await click(cdp,'[data-command-id="writer.mailMerge.open"]');await cdp.waitFor("document.querySelector('.vno-merge-browse-btn')",{timeoutMilliseconds:15000});
 const documentNode=await cdp.send("DOM.getDocument",{depth:-1});const inputNode=await cdp.send("DOM.querySelector",{nodeId:documentNode.result.root.nodeId,selector:".vno-merge-file-input"});
 check("Hộp nguồn dữ liệu có ô chọn CSV",inputNode.result.nodeId>0,JSON.stringify(inputNode));
 await cdp.send("DOM.setFileInputFiles",{files:[csv],nodeId:inputNode.result.nodeId});await sleep(900);await click(cdp,".vno-dialog-save-btn");await sleep(350);
 let sourceState=await cdp.evaluate(`(()=>{const a=window.__vnoAppInstance.adapter;return{recordCount:a.mailMergeData?.records?.length||a.mailMergeRecords?.length||0,fields:a.mailMergeData?.fields||[],text:document.querySelector('.vno-writer-body')?.innerText.slice(-180)}})()`);
 check("Nạp CSV ba người nhận",sourceState.recordCount===3||String(sourceState.fields).includes("HoTen"),JSON.stringify(sourceState));
 await click(cdp,'[data-command-id="writer.mailMerge.insertField"]');await cdp.waitFor("document.querySelector('.vno-merge-field-select')",{timeoutMilliseconds:15000});
 const fields=await cdp.evaluate(`([...document.querySelectorAll('.vno-merge-field-select option')].map(x=>x.value))`);
 await click(cdp,".vno-merge-field-select");await press(cdp,"Enter");await click(cdp,".vno-dialog-insert-btn");await sleep(300);
 const mergeState=await cdp.evaluate(`(()=>({fields:document.querySelectorAll('.vno-writer-body .vno-merge-field').length,body:document.querySelector('.vno-writer-body')?.innerText.slice(-250)||''}))()`);
 check("Chèn trường người nhận tại con trỏ",mergeState.fields>0,JSON.stringify({fields,mergeState}));
 await click(cdp,'[data-command-id="writer.mailMerge.preview"]');await sleep(400);
 let preview=await cdp.evaluate(`(()=>({text:document.querySelector('.vno-writer-body')?.innerText.slice(-250),index:window.__vnoAppInstance.adapter.mailMergePreview?.recordIndex,count:window.__vnoAppInstance.adapter.mailMergePreview?.recordCount}))()`);
 check("Xem trước bản ghi trộn thư",Boolean(preview.text),JSON.stringify(preview));
 await click(cdp,'[data-command-id="writer.mailMerge.nextRecord"]');await sleep(250);
 await click(cdp,'[data-command-id="writer.mailMerge.finish"]');await sleep(400);
 const dialog=await cdp.evaluate(`(()=>[...document.querySelectorAll('[role=dialog]')].filter(x=>x.getBoundingClientRect().width).map(x=>({text:x.innerText,buttons:[...x.querySelectorAll('button')].map(b=>b.innerText.trim())})))()`);
 check("Mở luồng Hoàn tất trộn",dialog.length>0,JSON.stringify(dialog));
 const finishIndex=await cdp.evaluate(`([...document.querySelectorAll('button')].findIndex(x=>x.getBoundingClientRect().width&&x.innerText.includes('Hoàn tất và Trộn')))`);
 if(finishIndex>=0)await click(cdp,"button",finishIndex);
 await sleep(1200);
 const completed=await cdp.evaluate(`(()=>({body:document.querySelector('.vno-writer-body')?.innerText||'',fields:document.querySelectorAll('.vno-writer-body .vno-merge-field').length,dialogs:[...document.querySelectorAll('[role=dialog]')].filter(x=>x.getBoundingClientRect().width).map(x=>x.innerText)}))()`);
 check("Hoàn tất trộn và tạo đầu ra cho ba người nhận",completed.body.includes("Nguyen An")||completed.body.includes("Nguyễn An")||completed.body.includes("Tran Binh")||completed.body.includes("Trần Bình"),JSON.stringify({body:completed.body.slice(-500),dialogs:completed.dialogs}));
 const mergedText=await cdp.evaluate("document.querySelector('.vno-writer-body')?.innerText||''");
 const recipientNames=["Nguyen An","Tran Binh","Le Chi"];
 check("Kết quả trộn chứa đủ ba người nhận",recipientNames.every(name=>mergedText.includes(name)),JSON.stringify(recipientNames.map(name=>({name,found:mergedText.includes(name)}))));
 const mergedHtml=await cdp.evaluate("window.__vnoAppInstance.adapter._contentForExport()");
 const saved=await cdp.evaluate(`window.pywebview.api.save_document_in_place(${JSON.stringify(mergedHtml)},'writer',${JSON.stringify(output)},${JSON.stringify(source)})`,{awaitPromise:true,timeoutMilliseconds:240000});
 check("Lưu kết quả trộn thành DOCX thật",saved?.status==="ok",JSON.stringify(saved));
 if(saved?.status==="ok")console.log(`MERGED_DOCX ${output}`);
 const readback=await launchApp("writer",{filePath:output,localAppData:path.join(root,"readback"),startTimeoutMilliseconds:180000,readyTimeoutMilliseconds:180000});
 try {
  const expectedOutput=output.replace(/\\/g,"/").toLowerCase();
  await readback.cdp.waitFor(`(()=>{const a=window.__vnoAppInstance?.adapter;return String(a?._sourcePath||a?.sourceFilePath||'').replace(/\\\\/g,'/').toLowerCase()===${JSON.stringify(expectedOutput)}})()`,{timeoutMilliseconds:180000,intervalMilliseconds:500});
  const reopened=await readback.cdp.evaluate(`(()=>{const a=window.__vnoAppInstance.adapter;return{path:a?._sourcePath||'',text:document.querySelector('.vno-writer-body')?.innerText||''}})()`);
  check("Mở lại DOCX và đọc đủ ba bản ghi",recipientNames.every(name=>reopened.text.includes(name)),JSON.stringify({path:reopened.path,names:recipientNames.map(name=>({name,found:reopened.text.includes(name)}))}));
 } finally { await readback.close() }
 const snap=await cdp.send("Page.captureScreenshot",{format:"png"},30000);fs.mkdirSync(path.join(root,"screenshots"),{recursive:true});fs.writeFileSync(path.join(root,"screenshots","07-tron-thu-xem-truoc-hoan-tat.png"),Buffer.from((snap.result||snap).data,"base64"));
}catch(error){check("Trộn thư không phát sinh ngoại lệ CDP",false,error.stack||error.message)}finally{await session.close()}
console.log(`MAILMERGE_CSV ${csv}`);console.log(`SUMMARY ${results.filter(Boolean).length}/${results.length} PASS | ${results.length-results.filter(Boolean).length} FAIL`);if(results.some(x=>!x))process.exitCode=1;
