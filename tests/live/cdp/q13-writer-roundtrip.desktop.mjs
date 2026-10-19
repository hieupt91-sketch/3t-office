import { launchApp } from "./session.mjs";
import path from "node:path";

const profile = process.env.VNO_CDP_LOCALAPPDATA;
if (!profile) throw new Error("Set VNO_CDP_LOCALAPPDATA to a fresh profile directory.");
const output = path.join(profile, "q13-writer-roundtrip.docx");
const first = await launchApp("writer", { localAppData: path.join(profile, "create"), startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
try {
  const result = await first.cdp.evaluate(`(async () => {
    const a=window.__vnoAppInstance.adapter;
    a.bodyDom.innerHTML='<p>Thư mời Q13</p><p style="page-break-before:always;break-before:page">Phụ lục Q13</p><p>Nội dung phụ lục.</p>';
    a._initZones(); a.headerDom.innerHTML='<p>Đầu trang Q13</p>'; a.footerDom.innerHTML='<p>Chân trang Q13</p>';
    a.setColumns({count:2,gap:10,rule:false});
    const p=a.bodyDom.querySelectorAll('p')[2]; const r=document.createRange(); r.selectNodeContents(p); r.collapse(false);
    const s=window.getSelection(); s.removeAllRanges(); s.addRange(r);
    await a.insertEquation({linear:'S=v*t'});
    a.insertTextBox({text:'Hộp Q13',x:420,y:560});
    const content=a._contentForExport();
    const meta=content.match(/<!--vno-sections-meta:[\\s\\S]*?-->/)?.[0]||'';
    const saved=await window.pywebview.api.save_document_in_place(content,'writer',${JSON.stringify(output)},null);
    return {saved,columns:a.columns,header:a.headerDom.innerText,footer:a.footerDom.innerText,meta};
  })()`, { awaitPromise: true, timeoutMilliseconds: 240000 });
  console.log("SAVED " + JSON.stringify(result));
  if (result.saved?.status !== "ok") throw new Error("Document save failed: " + JSON.stringify(result.saved));
} finally { await first.close(); }

const reopened = await launchApp("writer", { filePath: output, localAppData: path.join(profile, "reopen"), startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
try {
  const expectedPath = output.replace(/\\/g, "/").toLowerCase();
  await reopened.cdp.waitFor(`(() => { const a=window.__vnoAppInstance?.adapter; const source=String(a?._sourcePath||a?.sourceFilePath||'').replace(/\\\\/g,'/').toLowerCase(); return source===${JSON.stringify(expectedPath)} && a?.bodyDom?.innerText?.includes('Thư mời Q13'); })()`, { timeoutMilliseconds: 180000, intervalMilliseconds: 500 });
  const state = await reopened.cdp.evaluate(`(() => { const a=window.__vnoAppInstance.adapter; a._initZones(); return {
    source:a._sourcePath||a.sourceFilePath, columns:a.columns, body:a.bodyDom.innerText,
    header:a.headerDom.innerText,footer:a.footerDom.innerText,
    equations:a.bodyDom.querySelectorAll('[data-vno-equation="true"],.vno-equation').length,
    textboxes:a.shapes.filter(shape=>shape.type==='textbox').map(shape=>shape.text),
    pageBreaks:a.bodyDom.querySelectorAll('[style*="page-break-before"],[style*="break-before"]').length
  }; })()`);
  const checks = [
    ["Two columns round-trip", Number(state.columns?.count) === 2],
    ["Header and footer round-trip", state.header.includes("Đầu trang Q13") && state.footer.includes("Chân trang Q13")],
    ["Equation round-trips", state.equations > 0],
    ["Textbox content round-trips", state.body.includes("Hộp Q13")],
    ["Manual page break round-trips", state.pageBreaks > 0],
  ];
  for (const [name, passed] of checks) console.log(`${passed ? "PASS" : "FAIL"} ${name}`);
  console.log("REOPENED " + JSON.stringify(state));
  if (checks.some(([, passed]) => !passed)) process.exitCode = 1;
} finally { await reopened.close(); }
