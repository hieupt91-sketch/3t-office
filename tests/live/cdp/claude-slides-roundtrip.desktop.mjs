import { launchApp } from "./session.mjs";
import { mouseClick, typeText, press } from "./actions.mjs";
import { copyFileSync, mkdirSync, readFileSync, existsSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const dir = process.env.VNO_CDP_LOCALAPPDATA;
if (!dir) throw new Error("Set VNO_CDP_LOCALAPPDATA to a dedicated desktop-test profile.");
mkdirSync(dir, { recursive: true });
const file = dir + "\\work.pptx";
copyFileSync(process.env.VNO_FIX_L7_ROUNDTRIP_SOURCE || "E:\\VN OFice\\file test\\sample-3.pptx", file);
const results = [];
const check = (n, ok, d) => { results.push(ok); console.log((ok ? "PASS" : "FAIL") + " | " + n + " | " + String(d).slice(0, 230)); };
async function openApp(path) {
  const s = await launchApp("slides", { filePath: path, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
  const norm = path.replace(/\\/g, "/").toLowerCase();
  // Cho den khi app that su nap TEP (khong phai ban trong mac dinh 1 slide): nap PPTX qua soffice mat vai chuc giay.
  await s.cdp.waitFor(`(() => { const a = window.__vnoAppInstance?.adapter; const p = String(a?._sourcePath || a?.sourceFilePath || '').replace(/\\\\/g, '/').toLowerCase(); return p === ${JSON.stringify(norm)} && a?.canvas?.slides?.length > 0; })()`, { timeoutMilliseconds: 300000, intervalMilliseconds: 500 });
  await sleep(5000);
  return s;
}const unzipText = (zip, entry) => execFileSync("powershell", ["-NoProfile", "-Command", `Add-Type -A System.IO.Compression.FileSystem; $z=[IO.Compression.ZipFile]::OpenRead('${zip}'); $e=$z.Entries | ?{ $_.FullName -eq '${entry}' }; if(-not $e){ 'NOENTRY'; $z.Dispose(); exit }; $r=New-Object IO.StreamReader($e.Open(), [Text.Encoding]::UTF8); $r.ReadToEnd(); $r.Close(); $z.Dispose()`], { encoding: "utf8", maxBuffer: 50 * 1024 * 1024 });
const listZip = (zip) => execFileSync("powershell", ["-NoProfile", "-Command", `Add-Type -A System.IO.Compression.FileSystem; $z=[IO.Compression.ZipFile]::OpenRead('${zip}'); $z.Entries | %{ $_.FullName }; $z.Dispose()`], { encoding: "utf8" }).split(/\r?\n/).filter(Boolean);
let session = await openApp(file);
let ev = (e) => session.cdp.evaluate(e, { awaitPromise: true });
const clickSel = async (q) => { const p = await ev(`(() => { const e=document.querySelector(${JSON.stringify(q)}); if(!e) return null; e.scrollIntoView({block:'nearest'}); const r=e.getBoundingClientRect(); return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2}); })()`); if (!p) return false; const { x, y } = JSON.parse(p); await mouseClick(session.cdp, x, y); return true; };
const model = () => ev(`(() => { const c=window.__vnoAppInstance.adapter.canvas; return JSON.stringify({n:c.slides.length, cur:c.currentSlideIndex, titles:c.slides.map(s=>s.title), shapes:c.slides.map(s=>(s.shapes||[]).length), trans:c.slides.map(s=>s.transition&&s.transition.type||null)}); })()`);
let before;
try {
  before = JSON.parse(await model());
  console.log("truoc:", JSON.stringify(before));
  // 1. Nhan doi slide hien tai
  await clickSel('[data-command-id="slides.slide.duplicate"]'); await sleep(700);
  // 2. Them hop van ban + go chu vao slide hien tai (slide nhan doi)
  await clickSel('[data-command-id="slides.text.insert"]'); await sleep(600);
  await typeText(session.cdp, "Hop kiem thu Claude", 8); await sleep(400);
  // 3. Them hinh khoi
  await clickSel('[data-command-id="slides.shape.insert"]'); await sleep(800);
  // 4. Chuyen tiep Fade tren slide hien tai
  await clickSel("#vno-ribbon-tab-transitions"); await sleep(400);
  await clickSel('[data-command-id="slides.transition.apply"]'); await sleep(800);
  const dlg = await ev("[...document.querySelectorAll('.vno-dialog-box')].filter(e=>e.offsetParent).map(e=>e.className+' :: '+[...e.querySelectorAll('select')].map(s=>s.value+'['+[...s.options].map(o=>o.value).join('/')+']').join(';')+' :: '+[...e.querySelectorAll('button')].map(b=>b.textContent.trim()).join('|')).join('||')");
  console.log("hop thoai chuyen tiep:", dlg);
  await ev(`(() => { const d=[...document.querySelectorAll('.vno-dialog-box')].find(e=>e.offsetParent); const sel=d.querySelector('select'); const opt=[...sel.options].find(o=>/fade/i.test(o.value)||/Mờ|Fade/i.test(o.textContent)); sel.value=opt.value; sel.dispatchEvent(new Event('change',{bubbles:true})); const ok=[...d.querySelectorAll('button')].find(b=>/Áp dụng|Apply|OK/i.test(b.textContent)); ok.click(); return 1; })()`); await sleep(700);
  const after = JSON.parse(await model());
  console.log("sau thao tac:", JSON.stringify(after));
  check("So slide tang 1 sau Nhan doi", after.n === before.n + 1, `${before.n}->${after.n}`);
  check("Hinh khoi + hop van ban them vao slide hien tai (>=2 doi tuong)", after.shapes[after.cur] >= before.shapes[before.cur] + 2, JSON.stringify(after.shapes));
  check("Chuyen tiep duoc ghi vao model slide hien tai", !!after.trans[after.cur], JSON.stringify(after.trans));
  const beforeSaveShot = await session.cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  writeFileSync(dir + "\\fix-l7-roundtrip-before-save.png", Buffer.from((beforeSaveShot.result || beforeSaveShot).data, "base64"));
  await ev("window.__vnoAppInstance.adapter.isDirty = true");
  const out = dir + "\\saved.pptx";
  const saved = await session.cdp.evaluate(`(() => { window.__vnoAuditContent = window.__vnoAppInstance.adapter.serializeToFodp(); return globalThis.globalUnoBridge.saveRealFileInPlace("slides", window.__vnoAuditContent, ${JSON.stringify(out)}, ${JSON.stringify(file)}); })()`, { awaitPromise: true, timeoutMilliseconds: 600000 });
  console.log("luu:", JSON.stringify(saved).slice(0, 200));
  await sleep(2000);
} finally { await session.close(); }
// XML
const entries = listZip(dir + "\\saved.pptx");
const slideXmls = entries.filter((e) => /^ppt\/slides\/slide\d+\.xml$/.test(e));
check("Tep PPTX luu co so slide = " + (before.n + 1), slideXmls.length === before.n + 1, `slideXmls=${slideXmls.length}`);
const all = slideXmls.map((e) => unzipText(dir + "\\saved.pptx", e));
check("Co hop van ban 'Hop kiem thu Claude' trong XML", all.some((x) => x.includes("Hop kiem thu Claude")), "");
check("Co <p:transition> trong XML", all.some((x) => /<p:transition\b/.test(x) || /<mc:AlternateContent[^>]*>[\s\S]*?<p:transition/.test(x)), all.map((x) => (/<p:transition/.test(x) ? "T" : "-")).join(""));
// Mo lai
session = await openApp(dir + "\\saved.pptx"); ev = (e) => session.cdp.evaluate(e, { awaitPromise: true });
try {
  const re = JSON.parse(await model());
  console.log("mo lai:", JSON.stringify(re));
  const reopenedShot = await session.cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  writeFileSync(dir + "\\fix-l7-roundtrip-after-open.png", Buffer.from((reopenedShot.result || reopenedShot).data, "base64"));
  check("Mo lai: so slide giu nguyen sau luu", re.n === before.n + 1, `${re.n}`);
  check("Mo lai: co hop van ban moi", await ev(`JSON.stringify(window.__vnoAppInstance.adapter.canvas.slides.map(s=>s.shapes||[])).includes('Hop kiem thu Claude')`), "");
} finally { await session.close(); }
console.log("SUMMARY", results.filter(Boolean).length + "/" + results.length);
