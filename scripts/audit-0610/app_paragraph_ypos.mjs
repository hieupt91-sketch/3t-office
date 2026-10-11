// App: toa do doc (px tu dinh trang) cua moi doan cap cao nhat (P/DIV...) -> JSON, de so voi word_paragraph_ypos.ps1.
// Chay: node --experimental-websocket scripts/audit-0610/app_paragraph_ypos.mjs <docx> <out.json> [maxPage]
import fs from "node:fs/promises";
import { launchApp } from "../../tests/live/cdp/session.mjs";
const [file, out, maxPageArg] = [process.argv[2], process.argv[3], process.argv[4]];
const maxPage = Number(maxPageArg || 99);
const session = await launchApp("writer", { filePath: file, startTimeoutMilliseconds: 120000 });
try {
  await session.cdp.waitFor("!!document.querySelector('.vno-writer-body') && document.querySelector('.vno-writer-body').textContent.length > 50", { timeoutMilliseconds: 120000, intervalMilliseconds: 500 });
  await new Promise((r) => setTimeout(r, 8000));
    const rows = await session.cdp.evaluate(`(() => { const body=document.querySelector('.vno-writer-body'); const gaps=[...body.querySelectorAll('[data-vno-auto-page-gap]')]; const out=[]; let lastPage=0, pageTop=null; const pageOf = el => { let n=1; for (const g of gaps) { if (g.contains(el)) return null; if (g.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) n++; } return n; }; for (const el of body.children) { if (el.hasAttribute('data-vno-auto-page-gap')) continue; const r=el.getBoundingClientRect(); const text=(el.textContent||'').replace(/\\s+/g,' ').trim(); if (!r.height && !text) continue; const page=pageOf(el); if (page===null) continue; if (page!==lastPage) { lastPage=page; const prev=gaps[page-2]; pageTop = prev ? prev.getBoundingClientRect().bottom : r.top; } const cs=getComputedStyle(el); out.push({ page, top: Math.round((r.top-pageTop)*100)/100, h: Math.round(r.height*100)/100, tag: el.tagName, text: text.slice(0,60), mt: cs.marginTop, mb: cs.marginBottom, lh: cs.lineHeight }); } return out; })()`);await fs.writeFile(out, JSON.stringify(rows.filter((r) => r.page <= maxPage), null, 1));
  console.log("OK elements=" + rows.length);
} finally { await session.close(); }