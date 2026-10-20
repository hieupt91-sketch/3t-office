import { launchApp } from "./session.mjs";
import { click, insertText, press, mouseClick, sleep } from "./actions.mjs";
import fs from "node:fs";
import path from "node:path";

const root = process.env.VNO_CDP_LOCALAPPDATA;
const image = process.env.VNO_AUDIT_IMAGE;
if (!root || !image) throw new Error("Set fresh VNO_CDP_LOCALAPPDATA and VNO_AUDIT_IMAGE.");
const output = path.join(root, "q17-image-caption.docx");
const shots = path.join(root, "screenshots");
fs.mkdirSync(shots, { recursive: true });
const results = [];
const check = (name, ok, detail="") => { results.push(Boolean(ok)); console.log(`${ok ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`); };
let session = await launchApp("writer", { localAppData: path.join(root, "create"), startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
try {
  const cdp = session.cdp;
  await click(cdp, ".vno-writer-body p");
  await insertText(cdp, "Báo cáo minh họa kết quả quý III.");
  await press(cdp, "Enter");
  await click(cdp, "#vno-ribbon-tab-insert");
  await cdp.send("Page.enable");
  await cdp.send("Page.setInterceptFileChooserDialog", { enabled: true });
  const chooser = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Timed out waiting for file chooser")), 12000);
    const listener = event => { const m=JSON.parse(String(event.data)); if(m.method!=="Page.fileChooserOpened")return; clearTimeout(timer); cdp.socket.removeEventListener("message",listener); resolve(m.params); };
    cdp.socket.addEventListener("message", listener);
  });
  await click(cdp, '[data-command-id="writer.image.insert"]');
  const opened = await chooser;
  await cdp.send("DOM.setFileInputFiles", { files: [path.resolve(image)], backendNodeId: opened.backendNodeId });
  await cdp.waitFor("document.querySelector('.vno-writer-body img')?.complete", { timeoutMilliseconds: 20000 });
  let state = await cdp.evaluate(`(() => {const i=document.querySelector('.vno-writer-body img');return{width:i?.width,height:i?.height,naturalWidth:i?.naturalWidth}})()`);
  check("Chèn ảnh từ tệp cục bộ", state.naturalWidth > 0, JSON.stringify(state));
  const p = await cdp.evaluate(`(() => {const r=document.querySelector('.vno-writer-body img')?.getBoundingClientRect();return r&&{x:r.left+r.width/2,y:r.top+r.height/2}})()`);
  if (p) await mouseClick(cdp,p.x,p.y);
  await click(cdp, '.vno-image-quick-wrap-btn');
  const wrapMenu = await cdp.evaluate(`([...document.querySelectorAll('.vno-image-wrap-option')].map(x=>x.innerText.trim()))`);
  const wrapIndex = await cdp.evaluate(`([...document.querySelectorAll('.vno-image-wrap-option')].findIndex(x=>/Vuông|Trên và dưới/.test(x.innerText)))`);
  if (wrapIndex >= 0) await click(cdp, '.vno-image-wrap-option', wrapIndex);
  await click(cdp, "#vno-ribbon-tab-references");
  await click(cdp, '[data-command-id="writer.reference.captionInsert"]');
  await cdp.waitFor("document.querySelector('.vno-caption-text-input')", { timeoutMilliseconds: 15000 });
  await click(cdp, ".vno-caption-text-input");
  await press(cdp, "a", { ctrl: true }, 50);
  await insertText(cdp, "Minh họa kết quả tổng hợp");
  const submit = await cdp.evaluate(`([...document.querySelectorAll('.vno-caption-dialog button')].findIndex(x=>x.innerText.includes('Chèn'))) `);
  if (submit >= 0) await click(cdp, ".vno-caption-dialog button", submit);
  state = await cdp.evaluate(`(() => {const i=document.querySelector('.vno-writer-body img');return{caption:document.querySelector('.vno-caption')?.innerText,wrap:i?.style.float||getComputedStyle(i).float,imageWidth:i?.naturalWidth}})()`);
  check("Chèn chú thích ảnh và áp dụng chế độ bao quanh", state.caption?.includes("Minh họa") && state.imageWidth > 0 && wrapIndex >= 0, JSON.stringify({ ...state, wrapOptions: wrapMenu }));
  const shot = await cdp.send("Page.captureScreenshot",{format:"png"},30000);
  fs.writeFileSync(path.join(shots,"05-anh-va-chu-thich.png"),Buffer.from((shot.result||shot).data,"base64"));
  const html = await cdp.evaluate("window.__vnoAppInstance.adapter._contentForExport()");
  const saved = await cdp.evaluate(`window.pywebview.api.save_document_in_place(${JSON.stringify(html)}, 'writer', ${JSON.stringify(output)}, null)`,{awaitPromise:true,timeoutMilliseconds:240000});
  check("Lưu DOCX nhóm ảnh", saved?.status === "ok", JSON.stringify(saved));
} catch(error) { check("Nhóm ảnh chạy không ngoại lệ",false,error.stack||error.message); }
finally { await session.close(); }
if (fs.existsSync(output)) {
  session = await launchApp("writer",{filePath:output,localAppData:path.join(root,"reopen"),startTimeoutMilliseconds:180000,readyTimeoutMilliseconds:180000});
  try {
    const expected=output.replace(/\\/g,"/").toLowerCase();
    await session.cdp.waitFor(`(()=>{const a=window.__vnoAppInstance?.adapter;return String(a?._sourcePath||a?.sourceFilePath||'').replace(/\\\\/g,'/').toLowerCase()===${JSON.stringify(expected)}})()`,{timeoutMilliseconds:180000,intervalMilliseconds:500});
    const state=await session.cdp.evaluate(`(()=>({images:document.querySelectorAll('.vno-writer-body img').length,captions:document.querySelectorAll('.vno-writer-body .vno-caption').length,text:document.querySelector('.vno-writer-body')?.innerText}))()`);
    check("Mở lại ảnh và chú thích ở phiên mới",state.images===1&&state.captions===1,JSON.stringify({images:state.images,captions:state.captions}));
  } catch(error) {check("Mở lại nhóm ảnh",false,error.stack||error.message);}
  finally {await session.close();}
}
console.log(`IMAGE_DOCX ${output}`);
console.log(`SUMMARY ${results.filter(Boolean).length}/${results.length} PASS | ${results.length-results.filter(Boolean).length} FAIL`);
if(results.some(x=>!x))process.exitCode=1;
