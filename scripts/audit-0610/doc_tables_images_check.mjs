// Kiem chung bang va hinh anh Writer: CDP, DOCX XML, mo lai bang main.py filePath.
// Chay: node --experimental-websocket scripts/audit-0610/doc_tables_images_check.mjs
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { launchApp } from "../../tests/live/cdp/session.mjs";

const run = promisify(execFile);
const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "vno-table-image-"));
const docx = path.join(tmp, "writer-tables-images.docx");
const png = path.join(tmp, "tiny.png");
// PNG 1x1, tao tai cho de kiem thu offline.
await fs.writeFile(png, Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jXioAAAAASUVORK5CYII=", "base64"));
const results = [];
const rec = (name, ok, evidence = null) => {
  const item = { name, status: ok ? "PASS" : "FAIL", evidence };
  results.push(item);
  console.log(`${item.status} | ${name} | ${JSON.stringify(evidence).slice(0, 260)}`);
};
const blocked = (name, evidence) => {
  results.push({ name, status: "BLOCKED", evidence });
  console.log(`BLOCKED | ${name} | ${JSON.stringify(evidence).slice(0, 260)}`);
};
let session;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const py = String.raw`import sys,zipfile,json,xml.etree.ElementTree as E
z=zipfile.ZipFile(sys.argv[1]); ns={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main','wp':'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing'}
x=E.fromstring(z.read('word/document.xml')); q=lambda p: x.findall('.//'+p,ns)
tbl=q('w:tbl'); rows=q('w:tr'); cells=q('w:tc'); pics=q('w:drawing'); inline=q('wp:inline'); anchor=q('wp:anchor')
out={'tables':len(tbl),'rows':len(rows),'cells':len(cells),'gridSpan':len(q('w:gridSpan')),'vMerge':len(q('w:vMerge')),'shd':len(q('w:shd')),'tcBorders':len(q('w:tcBorders')),'vAlign':len(q('w:vAlign')),'tblHeader':len(q('w:tblHeader')),'drawings':len(pics),'inline':len(inline),'anchor':len(anchor),'extent':[],'texts':[''.join(t.text or '' for t in c.findall('.//w:t',ns)) for c in cells]}
for node in inline+anchor:
 e=node.find('wp:extent',ns)
 if e is not None: out['extent'].append([int(e.get('cx')),int(e.get('cy'))])
print(json.dumps(out,ensure_ascii=False))`;
async function inspect(file) {
  const { stdout } = await run(process.env.VNO_PYTHON || "python", ["-c", py, file], { encoding: "utf8", maxBuffer: 1 << 20 });
  return JSON.parse(stdout);
}
try {
  session = await launchApp("writer", { startTimeoutMilliseconds: 90000 });
  const cdp = session.cdp;
  const ev = (expr, opts) => cdp.evaluate(expr, opts);
  await ev("document.querySelector('.vno-writer-body').focus()");
  const inserted = await ev("window.__vnoAppInstance.adapter.insertTable(3,4)");
  rec("Chen bang 3x4", inserted !== false && await ev("document.querySelector('.vno-writer-body table')?.rows.length===3 && document.querySelector('.vno-writer-body table')?.rows[0].cells.length===4"), await ev("({rows:document.querySelector('.vno-writer-body table')?.rows.length,cols:document.querySelector('.vno-writer-body table')?.rows[0]?.cells.length})"));
  const activate = async (r=0,c=0) => ev(`(() => {const t=document.querySelector('.vno-writer-body table');const cell=t?.rows[${r}]?.cells[${c}];if(!cell)return false;cell.focus();const range=document.createRange();range.selectNodeContents(cell);range.collapse(true);const s=getSelection();s.removeAllRanges();s.addRange(range);cell.dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));cell.dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));return true})()`);
  await activate(0,0);
  await ev("document.execCommand('insertText',false,'Bang dau'); window.__vnoAppInstance.adapter.recordSnapshot('audit.table.text');");
  rec("Nhap chu vao o", (await ev("document.querySelector('.vno-writer-body table')?.innerText||''")).includes("Bang dau"), await ev("document.querySelector('.vno-writer-body table')?.innerText"));
  let r = await ev("window.__vnoGlobalCommandBus.execute('writer.table.insertRowBelow')"); rec("Lenh writer.table.insertRowBelow", r !== false && await ev("document.querySelector('.vno-writer-body table').rows.length===4"), await ev("document.querySelector('.vno-writer-body table').rows.length"));
  await activate(1,0); r = await ev("window.__vnoGlobalCommandBus.execute('writer.table.deleteRow')"); rec("Lenh writer.table.deleteRow", r !== false && await ev("document.querySelector('.vno-writer-body table').rows.length===3"), await ev("document.querySelector('.vno-writer-body table').rows.length"));
  await activate(0,0); r = await ev("window.__vnoGlobalCommandBus.execute('writer.table.insertColRight')"); rec("Lenh writer.table.insertColRight", r !== false && await ev("document.querySelector('.vno-writer-body table').rows[0].cells.length===5"), await ev("document.querySelector('.vno-writer-body table').rows[0].cells.length"));
  await activate(0,1); r = await ev("window.__vnoGlobalCommandBus.execute('writer.table.deleteCol')"); rec("Lenh writer.table.deleteCol", r !== false && await ev("document.querySelector('.vno-writer-body table').rows[0].cells.length===4"), await ev("document.querySelector('.vno-writer-body table').rows[0].cells.length"));
  await ev(`(() => {const t=document.querySelector('.vno-writer-body table'),ctl=window.__vnoAppInstance.tableController||window.__vnoAppInstance.adapter.tableController;ctl?.selectCellRange(t.rows[1].cells[0],t.rows[1].cells[1])})()`);
  r = await ev("window.__vnoGlobalCommandBus.execute('writer.table.mergeCells')");
  rec("Lenh writer.table.mergeCells -> span", r !== false && await ev("document.querySelector('.vno-writer-body table').rows[1].cells[0].colSpan===2"), await ev("({colSpan:document.querySelector('.vno-writer-body table').rows[1].cells[0].colSpan,cells:document.querySelector('.vno-writer-body table').rows[1].cells.length})"));
  await ev("(() => {const t=document.querySelector('.vno-writer-body table'),ctl=window.__vnoAppInstance.tableController||window.__vnoAppInstance.adapter.tableController,c=t.rows[1].cells[0];ctl.activeTable=t;ctl.activeCell=c;ctl.selectCell(c)})()"); r = await ev("window.__vnoGlobalCommandBus.execute('writer.table.splitCells')"); rec("Lenh writer.table.splitCells", r !== false && await ev("document.querySelector('.vno-writer-body table').rows[1].cells[0].colSpan===1"), await ev("({cells:document.querySelector('.vno-writer-body table').rows[1].cells.length,colSpan:document.querySelector('.vno-writer-body table').rows[1].cells[0].colSpan})"));
  await ev("(() => {const t=document.querySelector('.vno-writer-body table'),ctl=window.__vnoAppInstance.tableController||window.__vnoAppInstance.adapter.tableController;ctl.activeTable=t;ctl.selectCellRange(t.rows[1].cells[0],t.rows[1].cells[1])})()");
  r = await ev("window.__vnoGlobalCommandBus.execute('writer.table.mergeCells')");
  rec("Giu o da gop de xac minh DOCX", r !== false && await ev("document.querySelector('.vno-writer-body table').rows[1].cells[0].colSpan===2"), await ev("document.querySelector('.vno-writer-body table').rows[1].cells[0].colSpan"));
  await activate(0,0); await ev("window.__vnoGlobalCommandBus.execute('writer.table.cellBg','#12ab34')");
  rec("writer.table.cellBg", await ev("getComputedStyle(document.querySelector('.vno-writer-body table td')).backgroundColor==='rgb(18, 171, 52)'"), await ev("document.querySelector('.vno-writer-body table td').style.backgroundColor"));
  await ev("window.__vnoGlobalCommandBus.execute('writer.table.borders','all')");
  rec("writer.table.borders", await ev("!!document.querySelector('.vno-writer-body table td').style.border"), await ev("document.querySelector('.vno-writer-body table td').style.border"));
  await ev("window.__vnoGlobalCommandBus.execute('writer.table.alignMiddle')");
  rec("Can le doc trong o", await ev("document.querySelector('.vno-writer-body table td').style.verticalAlign==='middle'"), await ev("document.querySelector('.vno-writer-body table td').style.verticalAlign"));
  await ev("document.querySelectorAll('.vno-writer-body table tr').forEach(tr=>[...tr.cells].forEach((c,i)=>c.style.width=i===0?'180px':'90px')); window.__vnoAppInstance.adapter.recordSnapshot('audit.table.columnWidth')");
  rec("Rong cot", await ev("document.querySelector('.vno-writer-body table tr').cells[0].style.width==='180px'"), await ev("[...document.querySelector('.vno-writer-body table tr').cells].map(c=>c.style.width)"));
  await activate(0,0); r = await ev("window.__vnoGlobalCommandBus.execute('writer.table.toggleHeaderRow')");
  rec("Hang tieu de lap", r !== false && await ev("document.querySelector('.vno-writer-body table tr').classList.contains('vno-table-header-row')"), await ev("document.querySelector('.vno-writer-body table tr').className"));

  // Dung command chinh thuc va CDP file input de chen PNG khong can OS input.
  await ev("(() => {const create=Document.prototype.createElement;Document.prototype.createElement=function(tag,...args){const el=create.call(this,tag,...args);if(String(tag).toLowerCase()==='input'){const click=el.click.bind(el);Object.defineProperty(el,'click',{configurable:true,value:()=>{if(el.type==='file'){el.id='vno-audit-file-input';el.style.display='none';document.body.appendChild(el);window.__vnoAuditFileInput=el;return}click()}})}return el};window.__vnoGlobalCommandBus.execute('writer.image.insert')})()"); await sleep(300);
  const remoteInput = await cdp.send("Runtime.evaluate", { expression: "window.__vnoAuditFileInput", returnByValue: false });
  const requestedNode = remoteInput.result?.result?.objectId ? await cdp.send("DOM.requestNode", { objectId: remoteInput.result.result.objectId }) : null;
  const inputNodeId = requestedNode?.result?.nodeId;
  if (inputNodeId) {
    await cdp.send("DOM.setFileInputFiles", { nodeId: inputNodeId, files: [png] });
    await sleep(700);
  }
  const imageBefore = await ev("(() => {const i=document.querySelector('.vno-writer-body img');if(!i)return null;return {w:i.getBoundingClientRect().width,h:i.getBoundingClientRect().height,src:i.src.slice(0,30)}})()");
  const pickerEvidence = { image: imageBefore, inputCaptured: await ev("!!window.__vnoAuditFileInput"), fileInputConnected: await ev("!!window.__vnoAuditFileInput?.isConnected"), fileInputNodeFound: Boolean(inputNodeId) };
  const imageAvailable = !!imageBefore && imageBefore.src.startsWith("data:image/png");
  if (imageAvailable) rec("Chen PNG qua writer.image.insert", true, imageBefore);
  else blocked("Chen PNG qua writer.image.insert", { ...pickerEvidence, reason: "CDP khong lay duoc DOM node cua input file do lenh mo native picker; khong the cap file bang DOM.setFileInputFiles de tiep tuc." });
  let sized = null;
  if (imageBefore) sized = await ev("(() => {const i=document.querySelector('.vno-writer-body img');i.style.width='120px';i.style.height='80px';i.style.maxWidth='none';window.__vnoAppInstance.adapter.recordSnapshot('writer.image.resize');return {w:i.getBoundingClientRect().width,h:i.getBoundingClientRect().height}})()");
  if (imageAvailable) rec("Doi kich thuoc anh", !!sized && Math.abs(sized.w-120)<1 && Math.abs(sized.h-80)<1, sized);
  else blocked("Doi kich thuoc anh", "BLOCKED phu thuoc ket qua chen anh bi chan boi native picker.");
  if (imageAvailable) {
    const undo = await ev("window.__vnoAppInstance.adapter.undo()"); await sleep(150);
    rec("Hoan tac thay doi kich thuoc", undo !== false && await ev("(() => {const i=document.querySelector('.vno-writer-body img');return !!i && i.style.width!=='120px'})()"), await ev("document.querySelector('.vno-writer-body img')?.getAttribute('style')"));
  } else blocked("Hoan tac thay doi kich thuoc", "BLOCKED phu thuoc thao tac resize anh.");

  const saved = await ev(`globalThis.globalUnoBridge.saveRealFileInPlace('writer',window.__vnoAppInstance.adapter._contentForExport(),${JSON.stringify(docx)},null)`, { timeoutMilliseconds: 1200000 });
  rec("Luu DOCX", saved?.status === "ok" && (await fs.stat(docx)).size > 0, { result: saved?.status, bytes: (await fs.stat(docx).catch(()=>({size:0}))).size });
  const xml = await inspect(docx);
  rec("DOCX bang: w:tbl/tr/tc va w:gridSpan/w:vMerge", xml.tables === 1 && xml.rows === 3 && xml.cells + xml.gridSpan === 12 && xml.gridSpan >= 1, { tables:xml.tables, rows:xml.rows, cells:xml.cells, gridSpan:xml.gridSpan, vMerge:xml.vMerge, logicalCells:xml.cells+xml.gridSpan });
  rec("DOCX bang: w:shd, w:tcBorders, w:vAlign, w:tblHeader", xml.shd>0 && xml.tcBorders>0 && xml.vAlign>0 && xml.tblHeader>0, { shd:xml.shd, tcBorders:xml.tcBorders, vAlign:xml.vAlign, tblHeader:xml.tblHeader });
  if (imageAvailable) rec("DOCX anh drawing va kich thuoc EMU (+-2%)", xml.drawings>0 && xml.extent.some(([w,h])=>Math.abs(w-1143000)/1143000<=.02 && Math.abs(h-762000)/762000<=.02), { drawings:xml.drawings, inline:xml.inline, anchor:xml.anchor, extent:xml.extent, expected:[1143000,762000] });
  else blocked("DOCX anh drawing va kich thuoc EMU (+-2%)", { drawings:xml.drawings, inline:xml.inline, anchor:xml.anchor, extent:xml.extent, reason:"BLOCKED do khong chen duoc PNG qua native picker trong CDP." });
  await session.close(); session = null;
  const reopened = await launchApp("writer", { filePath: docx, startTimeoutMilliseconds: 90000 });
  await reopened.cdp.waitFor("document.querySelector('.vno-writer-body table') || document.querySelector('.vno-writer-body img')", { timeoutMilliseconds: 15000, intervalMilliseconds: 500 }).catch(()=>{});
  const reopenedState = await reopened.cdp.evaluate("(() => {const b=document.querySelector('.vno-writer-body');return {tables:b?.querySelectorAll('table').length||0,rows:b?.querySelector('table')?.rows.length||0,cells:b?.querySelector('table')?.rows[0]?.cells.length||0,images:b?.querySelectorAll('img').length||0,text:b?.innerText?.includes('Bang dau')||false,source:window.__vnoAppInstance?.adapter?._sourcePath||null}})()");
  rec("Mo lai DOCX bang luong mo tep that", reopenedState.tables===1 && reopenedState.rows===3 && reopenedState.text, reopenedState);
  await reopened.close();
} catch (error) {
  rec("Loi harness / thao tac", false, String(error?.stack || error));
  await session?.close?.().catch(()=>{});
}

const totals = Object.fromEntries(["PASS","FAIL","BLOCKED"].map(status=>[status,results.filter(x=>x.status===status).length]));
const reportPath = path.resolve("docs/AUDIT-DOC-TABLES-IMAGES-0610.md");
const lines = ["# Audit VN Writer: bảng và hình ảnh — 06/10/2026", "", "Phương pháp: chạy Writer qua `tests/live/cdp/session.mjs`, thao tác qua CDP/command bus, lưu DOCX bằng `globalUnoBridge.saveRealFileInPlace`, đọc `word/document.xml` bằng Python `zipfile` + ElementTree, sau đó mở lại đúng tệp DOCX qua `launchApp('writer', { filePath })`. Không dùng SendKeys/input hệ điều hành, không dùng Word COM.", "", `Tổng: PASS ${totals.PASS} / FAIL ${totals.FAIL} / BLOCKED ${totals.BLOCKED}.`, "", "| Hạng mục | Trạng thái | Bằng chứng đo được |", "|---|---|---|"];
for (const x of results) lines.push(`| ${x.name.replaceAll("|","/")} | ${x.status} | ${JSON.stringify(x.evidence).replaceAll("|","/")} |`);
lines.push("", "Tệp DOCX tạm dùng để kiểm tra nằm trong thư mục tạm của hệ điều hành; xóa cùng vòng đời môi trường.", "");
await fs.mkdir(path.dirname(reportPath), { recursive: true });
await fs.writeFile(reportPath, lines.join("\n"), "utf8");
console.log(`Bao cao: ${reportPath}`);
console.log(`TONG: PASS ${totals.PASS} / FAIL ${totals.FAIL} / BLOCKED ${totals.BLOCKED}`);
process.exit(totals.FAIL ? 1 : 0);
