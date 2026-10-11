import { launchApp } from "./session.mjs";
import { mouseClick, mouseDoubleClick, press } from "./actions.mjs";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const dir = "E:\\VNOffice-profiles\\claude-pptpar";
const template = dir + "\\template.pptx";
// [ten, loai, id, gia tri]   loai: click | select | text-select (cho phan chon)
const ops = [
  ["bold","click","slides.text.bold"],["italic","click","slides.text.italic"],["underline","click","slides.text.underline"],["strike","click","slides.text.strike"],
  ["fontGrow","click","slides.font.grow"],["fontTimes","select","slides.font.family","Times New Roman"],
  ["colorDefault","click","slides.color.text"],
  ["alignCenter","click","slides.para.alignCenter"],["alignRight","click","slides.para.alignRight"],["alignJustify","click","slides.para.justify"],
  ["bullet","click","slides.list.bullet"],["numbered","click","slides.list.numbered"],["lineSpacing15","select","slides.para.lineSpacing","1.5"],
  ["slideNew","click","slides.slide.new"],["slideDuplicate","click","slides.slide.duplicate"],["slideHide","click","slides.slide.toggleHidden"],
];
const only = (process.env.OPS || "").split(",").filter(Boolean);
for (const [name, kind, id, value] of ops) {
  if (only.length && !only.includes(name)) continue;
  const out = dir + "\\app_" + name + ".pptx";
  const session = await launchApp("slides", { filePath: template, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
  const ev = (e) => session.cdp.evaluate(e, { awaitPromise: true, timeoutMilliseconds: 300000 });
  try {
    const norm = template.replace(/\\/g, "/").toLowerCase();
    await session.cdp.waitFor(`(() => { const a = window.__vnoAppInstance?.adapter; const p = String(a?._sourcePath || a?.sourceFilePath || '').replace(/\\\\/g, '/').toLowerCase(); return p === ${JSON.stringify(norm)} && a?.canvas?.slides?.length > 0 && JSON.stringify(a.canvas.slides[0].shapes||[]).includes('Alpha'); })()`, { timeoutMilliseconds: 240000, intervalMilliseconds: 500 });
    await sleep(2000);
    if (!name.startsWith("slide")) {
      const pos = JSON.parse(await ev(`(() => { const e=document.querySelector('[data-shape-id="TB1"]'); if(!e) return 'null'; const r=e.getBoundingClientRect(); return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2}); })()`));
      if (!pos) { console.log(name.padEnd(16), "khong thay TB1"); continue; }
      if (process.env.MODE === "single") { await mouseClick(session.cdp, pos.x, pos.y); await sleep(350); } else { await mouseDoubleClick(session.cdp, pos.x, pos.y); await sleep(500); await press(session.cdp, "a", { ctrl: true }, 150); await sleep(300); }
    }
    let status;
    if (kind === "click") status = await ev(`(() => { const nodes=[...document.querySelectorAll('[data-command-id="${id}"]')]; const v=nodes.find(n=>{const r=n.getBoundingClientRect(); return r.width>0&&r.height>0;}); if(!v) return 'NO_BUTTON'; v.click(); return 'clicked'; })()`);
    else status = await ev(`(() => { const s=document.querySelector('select[data-command-id="${id}"]'); if(!s) return 'NO_SELECT'; const opts=[...s.options].map(o=>o.value); const has=opts.includes(${JSON.stringify(value)}); s.value=${JSON.stringify(value)}; s.dispatchEvent(new Event('change',{bubbles:true})); return 'select '+(has?'ok':'GIA TRI KHONG CO '+opts.slice(0,10).join('/')); })()`);
    await sleep(700);
    const info = await ev(`(() => { const c=window.__vnoAppInstance.adapter.canvas; const sh=(c.slides[0].shapes||[]).find(s=>s.id==='TB1')||{}; return JSON.stringify({n:c.slides.length, bold:sh.fontWeight||sh.bold, ta:sh.textAlign, fs:sh.fontSize, html:(sh.textHtml||'').slice(0,100)}); })()`);
    await ev("window.__vnoAppInstance.adapter.isDirty = true");
    const saved = await ev(`(() => { window.__vnoAuditContent = window.__vnoAppInstance.adapter.serializeToFodp(); return globalThis.globalUnoBridge.saveRealFileInPlace("slides", window.__vnoAuditContent, ${JSON.stringify(out)}, ${JSON.stringify(template)}); })()`);
    console.log(name.padEnd(16), "save=" + (saved && saved.status), "|", status, "|", info.slice(0, 200));
  } catch (e) { console.log(name.padEnd(16), "LOI:", String(e.message).slice(0, 120)); } finally { await session.close(); }
}