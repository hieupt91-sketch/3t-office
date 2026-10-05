// Dừng tab: hộp thoại -> độ rộng Tab trên màn hình đúng vị trí -> DOCX có w:tabs + w:tab. Chỉ CDP.
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { launchApp } from "../../tests/live/cdp/session.mjs";
import { insertText, press } from "../../tests/live/cdp/actions.mjs";

const execFileAsync = promisify(execFile);
const docx = path.join(await fs.mkdtemp(path.join(os.tmpdir(), "vno-tabstops-")), "tabs.docx");
let session, failed = 0;
const rec = (name, ok, value) => { if (!ok) failed += 1; console.log(ok ? "PASS" : "FAIL", "|", name, "|", JSON.stringify(value).slice(0, 300)); };
try {
  session = await launchApp("writer", { startTimeoutMilliseconds: 90000 });
  const ev = (e, o) => session.cdp.evaluate(e, o);
  await ev(`document.querySelector('.vno-writer-body')?.focus()`);
  await insertText(session.cdp, "KINH_GUI:");
  await press(session.cdp, "Tab");
  await insertText(session.cdp, "UBND");
  await press(session.cdp, "Tab");
  await insertText(session.cdp, "99");
  // Hộp thoại thật: vị trí 8 cm trái; rồi 15 cm phải có chấm dẫn.
  ev(`globalThis.__vnoGlobalCommandBus.execute('writer.format.tabStops')`).catch(() => {});
  await session.cdp.waitFor(`!!document.querySelector('.vno-tab-stops-dialog')`, { timeoutMilliseconds: 10000 });
  const fill = (pos, align, leader) => ev(`(() => { document.querySelector('#vno-tabs-pos').value='${pos}'; document.querySelector('#vno-tabs-align').value='${align}'; document.querySelector('#vno-tabs-leader').value='${leader}'; document.querySelector('#vno-tabs-set').click(); return [...document.querySelectorAll('#vno-tabs-list option')].map(o=>o.textContent); })()`);
  await fill(8, "l", "n");
  const listed = await fill(15, "r", "d");
  rec("Hộp thoại liệt kê 2 dừng tab", listed.length === 2, listed);
  await ev(`document.querySelector('.vno-dialog-ok-btn').click()`);
  await session.cdp.waitFor(`!document.querySelector('.vno-tab-stops-dialog')`, { timeoutMilliseconds: 10000 });
  await new Promise(r => setTimeout(r, 400));
  const geom = await ev(`(() => { const p=[...document.querySelectorAll('.vno-writer-body p')].find(e=>e.dataset.vnoTabs); if(!p) return null; const cs=getComputedStyle(p); const left=p.getBoundingClientRect().left+(parseFloat(cs.paddingLeft)||0); const w=document.createTreeWalker(p,NodeFilter.SHOW_TEXT); let n, res={}; while(n=w.nextNode()){ for (const key of ['UBND','99']) { const i=n.data.indexOf(key); if(i>=0){ const r=document.createRange(); r.setStart(n,i); r.setEnd(n,i+key.length); const b=r.getBoundingClientRect(); res[key]={left:Math.round((b.left-left)/37.795*100)/100, right:Math.round((b.right-left)/37.795*100)/100}; } } } return {attr:p.dataset.vnoTabs, res}; })()`);
  rec("Màn hình: UBND bắt đầu đúng 8 cm (±0,15)", geom && Math.abs(geom.res.UBND.left - 8) < 0.15, geom);
  rec("Màn hình: số 99 kết thúc đúng 15 cm (căn phải, ±0,15)", geom && Math.abs(geom.res["99"].right - 15) < 0.15, geom);
  // Hoàn tác một bước rồi làm lại.
  await ev(`globalThis.__vnoGlobalCommandBus.execute('common.edit.undo')`);
  await new Promise(r => setTimeout(r, 300));
  const undone = await ev(`!document.querySelector('.vno-writer-body [data-vno-tabs]')`);
  rec("Hoàn tác một bước gỡ dừng tab", undone === true, undone);
  await ev(`globalThis.__vnoGlobalCommandBus.execute('common.edit.redo')`);
  await new Promise(r => setTimeout(r, 400));
  const saved = await ev(`globalThis.globalUnoBridge.saveRealFileInPlace("writer",window.__vnoAppInstance.adapter._contentForExport(),${JSON.stringify(docx)},null)`, { timeoutMilliseconds: 1200000 });
  rec("Lưu DOCX", saved?.status === "ok", saved?.status);
  const py = String.raw`import sys,zipfile,re,json
x=zipfile.ZipFile(sys.argv[1]).read('word/document.xml').decode('utf-8')
p=[q for q in re.findall(r'<w:p[ >].*?</w:p>',x,re.S) if 'KINH_GUI' in q][0]
tabs=re.findall(r'<w:tab w:val="(\w+)"(?: w:leader="(\w+)")? w:pos="(\d+)"/>',re.search(r'<w:tabs>.*?</w:tabs>',p,re.S).group(0))
print(json.dumps({'tabs':tabs,'tabChars':p.count('<w:tab/>'),'tabsCount':p.count('<w:tabs>')}))`;
  const { stdout } = await execFileAsync(process.env.VNO_PYTHON || "python", ["-c", py, docx]);
  const x = JSON.parse(stdout);
  rec("DOCX: w:tabs có trái 8 cm và phải 15 cm chấm dẫn", x.tabsCount === 1 && x.tabs.length === 2 && x.tabs[0][0] === "left" && Math.abs(Number(x.tabs[0][2]) - 4535) <= 2 && x.tabs[1][0] === "right" && x.tabs[1][1] === "dot" && Math.abs(Number(x.tabs[1][2]) - 8504) <= 2, x);
  rec("DOCX: 2 ký tự w:tab trong đoạn", x.tabChars === 2, x.tabChars);
} catch (error) {
  rec("Lỗi chạy", false, String(error?.stack || error));
} finally { await session?.close?.(); }
console.log(failed ? `TONG: ${failed} FAIL` : "TONG: tat ca PASS");
process.exit(failed ? 1 : 0);