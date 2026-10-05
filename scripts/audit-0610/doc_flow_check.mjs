// D4 end-to-end: hộp thoại Đoạn văn, thẻ "Ngắt dòng và ngắt trang" -> lưu DOCX bằng luồng của app -> đọc XML.
// Chạy: node --experimental-websocket scripts/audit-0610/doc_flow_check.mjs   (chỉ CDP, không SendKeys/OS input)
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { launchApp } from "../../tests/live/cdp/session.mjs";
import { insertText } from "../../tests/live/cdp/actions.mjs";

const execFileAsync = promisify(execFile);
const temp = await fs.mkdtemp(path.join(os.tmpdir(), "vno-doc-flow-"));
const docx = path.join(temp, "flow.docx");
const rows = [];
const rec = (name, ok, value) => { rows.push({ name, ok, value }); console.log(ok ? "PASS" : "FAIL", "|", name, "|", JSON.stringify(value).slice(0, 220)); };
let session;
const ev = (expression, options) => session.cdp.evaluate(expression, options);

async function selectText(needle) {
  return ev(`(() => { const root=document.querySelector('.vno-writer-body'); const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT); let n; while(n=w.nextNode()){const i=n.data.indexOf(${JSON.stringify(needle)});if(i<0)continue;const r=document.createRange();r.setStart(n,i);r.setEnd(n,i+${needle.length});const s=getSelection();s.removeAllRanges();s.addRange(r);return true}return false})()`);
}
async function pause(ms) { await new Promise(resolve => setTimeout(resolve, ms)); }

async function inspect(file) {
  const py = String.raw`import sys,zipfile,re,json
z=zipfile.ZipFile(sys.argv[1]); x=z.read('word/document.xml').decode('utf-8')
out={}
for key in ('KEEPNEXT_P','KEEPLINES_P','PAGEBEFORE_P','NOWIDOW_P','PLAIN_P'):
  i=x.find(key); j=max(x.rfind('<w:p>',0,i),x.rfind('<w:p ',0,i)); seg=x[j:i]
  out[key]={'keepNext':'<w:keepNext' in seg,'keepLines':'<w:keepLines' in seg,'widowControl':re.findall(r'<w:widowControl[^>]*>',seg),'brBefore':'w:type="page"' in x[max(0,j-900):j+10],'pageBreakBeforeProp':'<w:pageBreakBefore' in seg,'brTotal':x.count('w:type="page"')}
print(json.dumps(out))`;
  const { stdout } = await execFileAsync(process.env.VNO_PYTHON || "python", ["-c", py, file], { maxBuffer: 8 * 1024 * 1024 });
  return JSON.parse(stdout);
}

try {
  session = await launchApp("writer", { startTimeoutMilliseconds: 90000 });
  await ev(`document.querySelector('.vno-writer-body')?.focus()`);
  await insertText(session.cdp, "KEEPNEXT_P\nKEEPLINES_P\nPAGEBEFORE_P\nNOWIDOW_P\nPLAIN_P");

  // Mở hộp thoại thật cho đoạn KEEPNEXT_P, chuyển thẻ bằng chuột (CDP), tích ô, Áp dụng.
  async function viaDialog(label, checkboxId) {
    if (!await selectText(label)) throw new Error("Không chọn được " + label);
    ev(`globalThis.__vnoGlobalCommandBus.execute('writer.format.paragraphDialog')`).catch(() => {});
    await session.cdp.waitFor(`!!document.querySelector('.vno-paragraph-dialog')`, { timeoutMilliseconds: 10000 });
    const tabs = await ev(`({tabs:[...document.querySelectorAll('.vno-paragraph-dialog [role=tab]')].map(b=>b.textContent.trim()), selected:[...document.querySelectorAll('.vno-paragraph-dialog [role=tab]')].map(b=>b.getAttribute('aria-selected'))})`);
    await ev(`document.querySelector('#vno-para-tab-flow').click()`);
    const visible = await ev(`(() => { const p=document.querySelector('#vno-para-panel-flow'); const i=document.querySelector('#vno-para-panel-indent'); return {flow:getComputedStyle(p).display!=='none'&&!p.hidden, indent:getComputedStyle(i).display==='none'||i.hidden, widowChecked:document.querySelector('#vno-para-widow').checked} })()`);
    if (checkboxId) await ev(`document.querySelector(${JSON.stringify(checkboxId)}).click()`);
    await ev(`document.querySelector('.vno-dialog-ok-btn').click()`);
    await session.cdp.waitFor(`!document.querySelector('.vno-paragraph-dialog')`, { timeoutMilliseconds: 10000 });
    return { tabs, visible };
  }
  const first = await viaDialog("KEEPNEXT_P", "#vno-para-keepnext");
  rec("Hộp thoại có hai thẻ; thẻ Ngắt dòng hiện khi chọn; Mồ côi/góa mặc định bật", first.tabs.tabs.length === 2 && first.visible.flow && first.visible.indent && first.visible.widowChecked === true, first);
  await viaDialog("KEEPLINES_P", "#vno-para-keeplines");
  await viaDialog("PAGEBEFORE_P", "#vno-para-pagebefore");
  await viaDialog("NOWIDOW_P", "#vno-para-widow");

  const dataset = await ev(`[...document.querySelectorAll('.vno-writer-body p, .vno-writer-body div')].filter(e=>Object.keys(e.dataset).some(k=>k.startsWith('vnoFlow'))).map(e=>({tag:e.tagName,t:e.textContent.slice(0,14),d:{...e.dataset}}))`);
  rec("Áp dụng ghi thuộc tính vno đúng đoạn", dataset.length >= 4, dataset);

  const saved = await ev(`globalThis.globalUnoBridge.saveRealFileInPlace("writer",window.__vnoAppInstance.adapter._contentForExport(),${JSON.stringify(docx)},null)`, { timeoutMilliseconds: 1200000 });
  rec("Lưu DOCX qua luồng của app", saved?.status === "ok", saved);
  if (process.env.VNO_FLOW_DEBUG) {
    const html = await ev(`(() => { const h = window.__vnoAppInstance.adapter._contentForExport(); const i = h.indexOf('KEEPNEXT_P'); return h.slice(Math.max(0, i - 260), i + 40); })()`);
    console.log("HTML-EXPORT:", html);
  }
  const x = await inspect(docx);
  rec("DOCX: keepNext cho KEEPNEXT_P", x.KEEPNEXT_P.keepNext === true, x.KEEPNEXT_P);
  rec("DOCX: keepLines cho KEEPLINES_P", x.KEEPLINES_P.keepLines === true, x.KEEPLINES_P);
  rec("DOCX: ngắt trang đặt trước PAGEBEFORE_P", x.PAGEBEFORE_P.brBefore === true, x.PAGEBEFORE_P);
  rec("DOCX: tắt kiểm soát mồ côi/góa cho NOWIDOW_P (w:val=false)", x.NOWIDOW_P.widowControl.some(t => /w:val="(false|0)"/.test(t)), x.NOWIDOW_P);
  rec("DOCX: đoạn thường không bị thêm thuộc tính ngắt dòng", !x.PLAIN_P.keepNext && !x.PLAIN_P.keepLines, x.PLAIN_P);

  // Hoàn tác: một Ctrl+Z (command bus) gỡ thiết lập của đoạn cuối (NOWIDOW_P).
  await ev(`globalThis.__vnoGlobalCommandBus.execute('common.edit.undo')`);
  await pause(300);
  const afterUndo = await ev(`[...document.querySelectorAll('.vno-writer-body p, .vno-writer-body div')].filter(e=>e.textContent.includes('NOWIDOW_P')).map(e=>({...e.dataset}))`);
  rec("Hoàn tác một bước gỡ đúng thiết lập vừa áp dụng", !afterUndo.some(d => d.vnoFlowWidow === "off"), afterUndo);
  await ev(`globalThis.__vnoGlobalCommandBus.execute('common.edit.redo')`);
  await pause(300);


} catch (error) {
  rec("Lỗi chạy kiểm tra", false, String(error?.stack || error));
} finally {
  await session?.close?.();
}
const failed = rows.filter(r => !r.ok).length;
console.log(`TỔNG: ${rows.length - failed} PASS, ${failed} FAIL`);
process.exit(failed ? 1 : 0);
