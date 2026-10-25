// Writer: hộp Phông chữ (Ctrl+D) > Kiểu gạch chân: Hai nét, Nét đậm, Chấm, Gạch ngang, Lượn sóng -> lưu DOCX.
// Đọc lại bằng Word 2016 thật: scripts/audit-0610/word_underline_readback.ps1
import { launchApp } from "./session.mjs";
import { click, press, sleep } from "./actions.mjs";
import { platformOutputPath } from "./output-path.mjs";

const OUT = process.env.VNO_UL_OUT || platformOutputPath("E:\\VNOffice-profiles\\claude-wordpar\\underline_styles.docx");
const TEMPLATE = process.env.VNO_FONTDLG_TEMPLATE || "E:\\VNOffice-profiles\\claude-wordpar\\template.docx";
const WORDS = [["Aaa", "double"], ["Bbb", "thick"], ["Ccc", "dotted"], ["Ddd", "dash"], ["Eee", "wave"]];
const results = [];
const check = (name, pass, detail = "") => { results.push(Boolean(pass)); console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`); };
const session = await launchApp("writer", { filePath: TEMPLATE, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
const { cdp } = session;
const ev = (expression) => cdp.evaluate(expression, { awaitPromise: true, timeoutMilliseconds: 240000 });
const selectWord = (word) => ev(`(() => {
  const body = document.querySelector('.vno-writer-body'); body.focus();
  const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
  let node; while ((node = walker.nextNode())) { const i = node.nodeValue.indexOf(${JSON.stringify(word)}); if (i >= 0) {
    const r = document.createRange(); r.setStart(node, i); r.setEnd(node, i + ${word.length});
    const s = getSelection(); s.removeAllRanges(); s.addRange(r); return true; } }
  return false; })()`);
try {
  await cdp.waitFor(`document.querySelector('.vno-writer-body')?.textContent.includes('Alpha')`, { timeoutMilliseconds: 240000, intervalMilliseconds: 500 });
  await sleep(2000);
  await ev(`(() => { const p = [...document.querySelectorAll('.vno-writer-body p')].find(x => x.textContent.includes('Alpha')); p.innerHTML = ${JSON.stringify(WORDS.map(w => w[0]).join(" ") + " Thuong")}; document.querySelector('.vno-writer-body').dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await sleep(500);
  for (const [word, style] of WORDS) {
    await selectWord(word);
    await press(cdp, "d", { ctrl: true });
    await ev(`(() => { const el = document.querySelector('#vno-font-dialog-overlay [data-underline-style]'); el.value = ${JSON.stringify(style)}; el.dispatchEvent(new Event('change', { bubbles: true })); })()`);
    await click(cdp, "#vno-font-dialog-overlay [data-apply]");
    await sleep(400);
    const fx = await ev(`(() => { const s = [...document.querySelectorAll('.vno-writer-body [data-vno-fx]')].find(e => e.textContent === ${JSON.stringify(word)}); return s ? s.getAttribute('data-vno-fx') : null; })()`);
    check(`${style}: DOM giữ dấu kiểu gạch chân`, fx && new RegExp(`ul=${style}`).test(fx), String(fx));
  }
  const saved = await ev(`(async () => { const a = window.__vnoAppInstance.adapter; a.isDirty = true; const c = a._contentForExport(); return JSON.stringify(await globalThis.globalUnoBridge.saveRealFileInPlace("writer", c, ${JSON.stringify(OUT)}, ${JSON.stringify(TEMPLATE)})); })()`);
  check("Lưu DOCX", /"status":"ok"/.test(saved), saved.slice(0, 80));
} catch (error) {
  check("Không phát sinh ngoại lệ", false, error.stack || error.message);
} finally { await session.close(); }
if (results.some(r => !r)) process.exit(1);
