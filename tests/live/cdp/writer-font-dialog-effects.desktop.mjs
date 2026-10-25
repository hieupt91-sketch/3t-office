// Hộp thoại Phông chữ kiểu Word 2016 (Ctrl+D): hiệu ứng, kiểu/màu gạch chân, khoảng cách, vị trí, trạng thái trộn lẫn,
// hoàn tác, và lưu DOCX (đọc lại bằng Word thật ở scripts/audit-0610/word_font_dialog_readback.ps1).
import { launchApp } from "./session.mjs";
import { click, press, sleep } from "./actions.mjs";
import { platformOutputPath } from "./output-path.mjs";

const OUT = process.env.VNO_FONTDLG_OUT || platformOutputPath("E:\\VNOffice-profiles\\claude-wordpar\\fontdlg_effects.docx");
const TEMPLATE = process.env.VNO_FONTDLG_TEMPLATE || "E:\\VNOffice-profiles\\claude-wordpar\\template.docx";
const checks = [];
const check = (name, pass, detail = "") => {
  checks.push({ name, pass: Boolean(pass), detail });
  console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`);
};

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
const setSelect = (selector, value) => ev(`(() => { const el = document.querySelector(${JSON.stringify("#vno-font-dialog-overlay " + selector)}); el.value = ${JSON.stringify(value)}; el.dispatchEvent(new Event('change', { bubbles: true })); return el.value; })()`);

try {
  await cdp.waitFor(`document.querySelector('.vno-writer-body')?.textContent.includes('Alpha')`, { timeoutMilliseconds: 240000, intervalMilliseconds: 500 });
  await sleep(2000);
  await ev(`(() => { const p = [...document.querySelectorAll('.vno-writer-body p')].find(x => x.textContent.includes('Alpha')); p.innerHTML = 'Dau Beta Giua Gamma Cuoi Delta het'; document.querySelector('.vno-writer-body').dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await sleep(500);

  // --- 1. Mở bằng Ctrl+D, trạng thái ban đầu của vùng chọn thường
  await selectWord("Beta");
  await press(cdp, "d", { ctrl: true });
  const tabs = await ev(`[...document.querySelectorAll('#vno-font-dialog-overlay [data-tab]')].map(b => b.textContent.trim())`);
  check("Hộp Phông chữ có hai thẻ Phông chữ / Nâng cao", JSON.stringify(tabs) === JSON.stringify(["Phông chữ", "Nâng cao"]), JSON.stringify(tabs));
  const initial = await ev(`(() => { const o = document.querySelector('#vno-font-dialog-overlay'); return { effects: [...o.querySelectorAll('[data-effect]')].map(c => c.dataset.effect + ':' + (c.indeterminate ? 'mixed' : c.checked)).join(','), underline: o.querySelector('[data-underline-style]').value }; })()`);
  check("Vùng chọn thường: mọi hiệu ứng tắt, không gạch chân", !/true|mixed/.test(initial.effects) && initial.underline === "none", JSON.stringify(initial));

  // --- 2. Đặt hiệu ứng bằng chuột thật: gạch ngang đôi, chữ hoa nhỏ; gạch chân lượn sóng đỏ; giãn 2pt; nâng 4pt
  await click(cdp, '#vno-font-dialog-overlay [data-effect="dstrike"]');
  await click(cdp, '#vno-font-dialog-overlay [data-effect="smallCaps"]');
  await setSelect("[data-underline-style]", "wave");
  await ev(`(() => { const o = document.querySelector('#vno-font-dialog-overlay'); const c = o.querySelector('[data-underline-color]'); c.value = '#ff0000'; c.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await click(cdp, '#vno-font-dialog-overlay [data-tab="advanced"]');
  await setSelect("[data-spacing-mode]", "expanded");
  await ev(`document.querySelector('#vno-font-dialog-overlay [data-spacing-by]').value = '2'`);
  await setSelect("[data-position-mode]", "raised");
  await ev(`document.querySelector('#vno-font-dialog-overlay [data-position-by]').value = '4'`);
  await click(cdp, "#vno-font-dialog-overlay [data-apply]");
  await sleep(500);
  const dom = await ev(`(() => { const s = [...document.querySelectorAll('.vno-writer-body [data-vno-fx]')].find(e => e.textContent === 'Beta'); if (!s) return null; const c = getComputedStyle(s); return { fx: s.getAttribute('data-vno-fx') + '|' + (s.querySelector('[data-vno-fx]')?.getAttribute('data-vno-fx') || ''), line: c.textDecorationLine, style: c.textDecorationStyle, caps: c.fontVariantCaps, spacing: c.letterSpacing, top: s.style.top, selected: getSelection().toString() }; })()`);
  check("DOM: dấu hiệu ứng, gạch ngang đôi + gạch chân sóng, hoa nhỏ, giãn, nâng", dom && /dstrike/.test(dom.fx) && /ul=wave/.test(dom.fx) && /ulc=FF0000/.test(dom.fx) && /posx=8/.test(dom.fx)
    && /small-caps/.test(dom.caps) && parseFloat(dom.spacing) > 2 && dom.top === "-4pt" && dom.selected === "Beta", JSON.stringify(dom));

  // --- 3. Mở lại hộp: phải đọc đúng trạng thái đã đặt
  await selectWord("Beta");
  await press(cdp, "d", { ctrl: true });
  const reread = await ev(`(() => { const o = document.querySelector('#vno-font-dialog-overlay'); const e = k => o.querySelector('[data-effect="' + k + '"]').checked; return { dstrike: e('dstrike'), strike: e('strike'), smallCaps: e('smallCaps'), underline: o.querySelector('[data-underline-style]').value, spacingMode: o.querySelector('[data-spacing-mode]').value, positionMode: o.querySelector('[data-position-mode]').value }; })()`);
  check("Mở lại hộp: đọc đúng hiệu ứng đã đặt", reread.dstrike && !reread.strike && reread.smallCaps && reread.underline === "wave" && reread.spacingMode === "expanded" && reread.positionMode === "raised", JSON.stringify(reread));
  await click(cdp, "#vno-font-dialog-overlay [data-apply]");

  // --- 4. Vùng chọn trộn lẫn -> ô tick "không xác định"; bấm Áp dụng khi không đổi gì thì không đụng DOM
  await ev(`(() => { const body = document.querySelector('.vno-writer-body'); const p = [...body.querySelectorAll('p')].find(x => x.textContent.includes('Beta')); const r = document.createRange(); r.selectNodeContents(p); const s = getSelection(); s.removeAllRanges(); s.addRange(r); })()`);
  const htmlBefore = await ev(`document.querySelector('.vno-writer-body').innerHTML`);
  await press(cdp, "d", { ctrl: true });
  const mixed = await ev(`(() => { const o = document.querySelector('#vno-font-dialog-overlay'); return { dstrike: o.querySelector('[data-effect="dstrike"]').indeterminate, underline: o.querySelector('[data-underline-style]').value }; })()`);
  check("Vùng chọn trộn lẫn: gạch ngang đôi ở trạng thái không xác định", mixed.dstrike === true && mixed.underline === "", JSON.stringify(mixed));
  await click(cdp, "#vno-font-dialog-overlay [data-apply]");
  const htmlAfter = await ev(`document.querySelector('.vno-writer-body').innerHTML`);
  check("Áp dụng khi không đổi gì: nội dung không thay đổi", htmlBefore === htmlAfter);

  // --- 5. Chữ ẩn + hoàn tác
  await selectWord("Delta");
  await press(cdp, "d", { ctrl: true });
  await click(cdp, '#vno-font-dialog-overlay [data-effect="hidden"]');
  await click(cdp, "#vno-font-dialog-overlay [data-apply]");
  await sleep(300);
  const hidden = await ev(`(() => { const s = [...document.querySelectorAll('.vno-writer-body [data-vno-fx]')].find(e => e.textContent === 'Delta'); return s ? { fx: s.getAttribute('data-vno-fx'), display: getComputedStyle(s).display } : null; })()`);
  check("Ẩn: chữ có dấu vanish và không hiển thị", hidden && /vanish/.test(hidden.fx) && hidden.display === "none", JSON.stringify(hidden));
  await ev(`document.querySelector('.vno-writer-body').focus()`);
  await press(cdp, "z", { ctrl: true });
  await sleep(500);
  const undone = await ev(`[...document.querySelectorAll('.vno-writer-body [data-vno-fx]')].some(e => e.textContent === 'Delta')`);
  check("Ctrl+Z hoàn tác hiệu ứng Ẩn", undone === false);

  // Một từ ẩn được giữ lại để kiểm tra w:vanish trong tệp lưu
  await selectWord("Cuoi");
  await press(cdp, "d", { ctrl: true });
  await click(cdp, '#vno-font-dialog-overlay [data-effect="hidden"]');
  await click(cdp, "#vno-font-dialog-overlay [data-apply]");
  await sleep(300);

  // --- 6. Lưu thật để Word 2016 đọc lại
  const saved = await ev(`(async () => { const a = window.__vnoAppInstance.adapter; a.isDirty = true; const c = a._contentForExport(); return JSON.stringify(await globalThis.globalUnoBridge.saveRealFileInPlace("writer", c, ${JSON.stringify(OUT)}, ${JSON.stringify(TEMPLATE)})); })()`);
  check("Lưu DOCX thành công", /"status":"ok"/.test(saved), saved.slice(0, 80));
} catch (error) {
  check("Font dialog desktop không phát sinh ngoại lệ", false, error.stack || error.message);
} finally {
  await session.close();
}

const failed = checks.filter(item => !item.pass);
if (failed.length) process.exit(1);
console.log(`Font dialog effects desktop: ${checks.length}/${checks.length} PASS`);
