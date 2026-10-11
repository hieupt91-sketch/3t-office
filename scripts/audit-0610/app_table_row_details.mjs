// Chẩn đoán DOM/CSS các hàng bảng trong app thật qua CDP.
// Chạy: node --experimental-websocket scripts/audit-0610/app_table_row_details.mjs <docx> <out.json> <table:row[,table:row...]>
import fs from "node:fs/promises";
import path from "node:path";
import { launchApp } from "../../tests/live/cdp/session.mjs";

const [file, out, targetArg, minHeightArg = ""] = [process.argv[2], process.argv[3], process.argv[4], process.argv[5]];
if (!file || !out || !targetArg) throw new Error("Expected <docx> <out.json> <table:row[,table:row...]>");
const targets = targetArg.split(",").map(value => value.trim()).filter(Boolean);
const minHeights = Object.fromEntries(minHeightArg.split(",").filter(Boolean).map(item => {
  const match = item.match(/^(\d+:\d+)=([\d.]+)$/);
  if (!match) throw new Error(`Invalid min height '${item}'; expected table:row=points`);
  return [match[1], Number(match[2])];
}));
const localAppData = process.env.VNO_CDP_LOCALAPPDATA || path.resolve(path.dirname(out), "localappdata");
const session = await launchApp("writer", { filePath: file, localAppData, startTimeoutMilliseconds: 120000 });
try {
  await session.cdp.waitFor("!!document.querySelector('.vno-writer-body') && document.querySelector('.vno-writer-body').textContent.length > 50", { timeoutMilliseconds: 120000, intervalMilliseconds: 500 });
  await new Promise(resolve => setTimeout(resolve, 8000));
  const details = await session.cdp.evaluate(`(() => {
    const wanted = new Set(${JSON.stringify(targets)});
    const pt = value => Math.round(value * 0.75 * 100) / 100;
    const styleOf = el => {
      const s = getComputedStyle(el);
      return {
        display:s.display, width:s.width, height:s.height, minHeight:s.minHeight,
        fontFamily:s.fontFamily, fontSize:s.fontSize, lineHeight:s.lineHeight,
        marginTop:s.marginTop, marginRight:s.marginRight, marginBottom:s.marginBottom, marginLeft:s.marginLeft,
        paddingTop:s.paddingTop, paddingRight:s.paddingRight, paddingBottom:s.paddingBottom, paddingLeft:s.paddingLeft,
        borderTopWidth:s.borderTopWidth, borderRightWidth:s.borderRightWidth,
        borderBottomWidth:s.borderBottomWidth, borderLeftWidth:s.borderLeftWidth,
        verticalAlign:s.verticalAlign, whiteSpace:s.whiteSpace, boxSizing:s.boxSizing,
        vnoLineHeight:s.getPropertyValue('--vno-lh').trim(), docLineHeight:s.getPropertyValue('--vno-doc-line-height').trim(),
        fontRatio:s.getPropertyValue('--vno-font-ratio').trim(), gdiAdvance:s.getPropertyValue('--vno-gdi-advance').trim()
      };
    };
    const rectOf = el => { const r=el.getBoundingClientRect(); return {topPt:pt(r.top), leftPt:pt(r.left), widthPt:pt(r.width), heightPt:pt(r.height), bottomPt:pt(r.bottom)}; };
    const lineTops = el => {
      const range=document.createRange(); range.selectNodeContents(el);
      const tops=[...range.getClientRects()].filter(r=>r.width || r.height).map(r=>Math.round(r.top*10)/10);
      return [...new Set(tops)].map(value=>pt(value));
    };
    const lineRects = el => {
      const range=document.createRange(); range.selectNodeContents(el);
      return [...range.getClientRects()].filter(r=>r.width || r.height).map(r=>({topPt:pt(r.top), widthPt:pt(r.width), heightPt:pt(r.height)}));
    };
    const body=document.querySelector('.vno-writer-body');
    const tables=[...body.querySelectorAll('table')].filter(t => !t.parentElement.closest('table'));
    const output=[];
    tables.forEach((table, ti) => {
      const rows=[...table.querySelectorAll(':scope > thead > tr, :scope > tbody > tr, :scope > tfoot > tr, :scope > tr')]
        .filter(tr => !tr.hasAttribute('data-vno-auto-page-gap'));
      rows.forEach((tr, ri) => {
        const key=(ti+1)+':' +(ri+1); if (!wanted.has(key)) return;
        const cells=[...tr.children].filter(el => /^(TD|TH)$/.test(el.tagName)).map((cell, ci) => {
          const paragraphs=[...cell.querySelectorAll('p')].filter(p => p.closest('td,th') === cell && !p.closest('[data-vno-auto-page-gap="true"]'));
          const lists=[...cell.querySelectorAll('ol,ul')].filter(list => list.closest('td,th') === cell);
          return {
            index:ci+1, tag:cell.tagName.toLowerCase(), colspan:cell.colSpan, rowspan:cell.rowSpan,
            attributes:Object.fromEntries([...cell.attributes].map(a=>[a.name,a.value])),
            rect:rectOf(cell), computed:styleOf(cell),
            paragraphs:paragraphs.map((p, pi) => ({
              index:pi+1, tag:p.tagName.toLowerCase(), text:(p.innerText||p.textContent||'').replace(/\\s+/g,' ').trim(),
              empty:!(p.textContent||'').trim(), attributes:Object.fromEntries([...p.attributes].map(a=>[a.name,a.value])),
              rect:rectOf(p), computed:styleOf(p), lineTopsPt:lineTops(p), lineRects:lineRects(p),
              clientWidthPt:pt(p.clientWidth), scrollWidthPt:pt(p.scrollWidth), brCount:p.querySelectorAll('br').length
            })),
            lists:lists.map((list, li) => ({index:li+1, tag:list.tagName.toLowerCase(), itemCount:list.querySelectorAll(':scope > li').length, attributes:Object.fromEntries([...list.attributes].map(a=>[a.name,a.value])), rect:rectOf(list), computed:styleOf(list)}))
          };
        });
        output.push({ key, tableAttributes:Object.fromEntries([...table.attributes].map(a=>[a.name,a.value])), tableRect:rectOf(table), rowAttributes:Object.fromEntries([...tr.attributes].map(a=>[a.name,a.value])), rowRect:rectOf(tr), rowComputed:styleOf(tr), cells, outerHTML:tr.outerHTML });
      });
    });
    const initialBodyStyle=styleOf(body);
    const heightMap=${JSON.stringify(minHeights)};
    const targetRows=new Map(output.map(item => {
      const [ti,ri]=item.key.split(':').map(Number);
      const table=tables[ti-1];
      const rows=[...table.querySelectorAll(':scope > thead > tr, :scope > tbody > tr, :scope > tfoot > tr, :scope > tr')].filter(tr => !tr.hasAttribute('data-vno-auto-page-gap'));
      return [item.key, rows[ri-1]];
    }));
    const sample=label => ({label, rows:Object.fromEntries([...targetRows].map(([key,row])=>[key,rectOf(row).heightPt])), lineHeight:[...targetRows.values()].map(row=>{const p=row.querySelector('p,li'); return p?styleOf(p).lineHeight:null;})});
    const variants=[sample('baseline')];
    if (Object.keys(heightMap).length) {
      for (const [key,value] of Object.entries(heightMap)) targetRows.get(key)?.style.setProperty('height',value+'pt');
      variants.push(sample('tr-height-minimum'));
      for (const row of targetRows.values()) row.style.removeProperty('height');
      body.style.setProperty('--vno-lh','1');
      variants.push(sample('single-line-height'));
      for (const [key,value] of Object.entries(heightMap)) targetRows.get(key)?.style.setProperty('height',value+'pt');
      variants.push(sample('minimum-and-single'));
      for (const row of targetRows.values()) row.style.removeProperty('height');
      body.style.removeProperty('--vno-lh');
    }
    return { bodyStyle:initialBodyStyle, targets:output, variants };
  })()`);
  await fs.writeFile(out, JSON.stringify(details, null, 2));
  console.log(`OK targets=${details.targets.length} out=${out}`);
} finally {
  await session.close();
}
