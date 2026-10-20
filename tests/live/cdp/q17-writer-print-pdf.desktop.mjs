import { launchApp } from "./session.mjs";
import { click, press, sleep } from "./actions.mjs";
import fs from "node:fs";
import path from "node:path";

const root=process.env.VNO_CDP_LOCALAPPDATA,source=process.env.Q17_SOURCE_DOCX;
if(!root||!source)throw new Error("Set fresh VNO_CDP_LOCALAPPDATA and Q17_SOURCE_DOCX.");
const pdf=source.replace(/\.docx$/i,".pdf"),shots=path.join(root,"screenshots");fs.mkdirSync(shots,{recursive:true});
const results=[];const check=(n,ok,d="")=>{results.push(Boolean(ok));console.log(`${ok?"PASS":"FAIL"} | ${n}${d?` | ${d}`:""}`)};
const session=await launchApp("writer",{filePath:source,localAppData:path.join(root,"create"),startTimeoutMilliseconds:180000,readyTimeoutMilliseconds:180000});
try{
 const cdp=session.cdp;const expected=source.replace(/\\/g,"/").toLowerCase();
 await cdp.waitFor(`(()=>{const a=window.__vnoAppInstance?.adapter;return String(a?._sourcePath||a?.sourceFilePath||'').replace(/\\\\/g,'/').toLowerCase()===${JSON.stringify(expected)}})()`,{timeoutMilliseconds:180000,intervalMilliseconds:500});
 const direct=await cdp.evaluate(`(()=>{const e=document.querySelector('[data-command-id="common.file.exportPdf"]');return!!(e&&e.getBoundingClientRect().width&&e.getBoundingClientRect().height)})()`);
 if(direct)await click(cdp,'[data-command-id="common.file.exportPdf"]');
 else{await press(cdp,"f",{alt:true});await cdp.waitFor("document.querySelector('.vno-backstage-overlay')",{timeoutMilliseconds:15000});await click(cdp,'#vno-backstage-nav-exportpdf');}
 await cdp.waitFor("[...document.querySelectorAll('[role=dialog]')].some(x=>x.getBoundingClientRect().width&&/PDF|xuất/i.test(x.innerText))",{timeoutMilliseconds:180000,intervalMilliseconds:500});
 const alert=await cdp.evaluate(`(()=>[...document.querySelectorAll('[role=dialog]')].filter(x=>x.getBoundingClientRect().width).map(x=>x.innerText))()`);
 check("Lệnh Xuất PDF mở kết quả hoặc xác nhận",alert.some(x=>/PDF|xuất|thành công/i.test(x)),JSON.stringify(alert));
 const ok=await cdp.evaluate(`([...document.querySelectorAll('[role=dialog] button')].findIndex(x=>x.getBoundingClientRect().width&&/Đồng ý|OK/i.test(x.innerText)))`);
 if(ok>=0)await click(cdp,"[role=dialog] button",ok);
 if(fs.existsSync(pdf)){check("PDF được tạo cạnh DOCX",true,pdf)}else check("PDF được tạo cạnh DOCX",false,pdf);
 if(direct===false&&await cdp.evaluate(`!!document.querySelector('.vno-backstage-overlay')`)){await click(cdp,"#vno-backstage-back");}
 await click(cdp,'[data-command-id="writer.file.printPreview"]');
 await cdp.waitFor("document.querySelector('.vno-print-preview-overlay')",{timeoutMilliseconds:180000});
 await cdp.waitFor("!document.querySelector('.vno-print-preview-loading')",{timeoutMilliseconds:180000,intervalMilliseconds:500});
 const preview=await cdp.evaluate(`(()=>({total:Number(document.querySelector('.vno-print-preview-total-pages')?.textContent||0),sheets:document.querySelectorAll('.vno-print-preview-sheet').length,loading:!!document.querySelector('.vno-print-preview-loading'),title:document.querySelector('.vno-print-preview-paper-info')?.innerText}))()`);
 check("Xem trước khi in hiển thị số trang đã dựng",preview.total>0&&preview.total===preview.sheets&&!preview.loading,JSON.stringify(preview));
 const snap=await cdp.send("Page.captureScreenshot",{format:"png"},30000);fs.writeFileSync(path.join(shots,"08-xem-truoc-in.png"),Buffer.from((snap.result||snap).data,"base64"));
 console.log(`PDF_PATH ${pdf}`);
}catch(error){check("In và xuất PDF không phát sinh ngoại lệ",false,error.stack||error.message)}finally{await session.close()}
console.log(`SUMMARY ${results.filter(Boolean).length}/${results.length} PASS | ${results.length-results.filter(Boolean).length} FAIL`);if(results.some(x=>!x))process.exitCode=1;
