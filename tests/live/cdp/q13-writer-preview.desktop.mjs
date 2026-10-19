import { launchApp } from "./session.mjs";

const session = await launchApp("writer", { startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
try {
  const cdp = session.cdp;
  const setup = await cdp.evaluate(`(async () => {
    const a = window.__vnoAppInstance.adapter;
    a.bodyDom.innerHTML = '<p>Trang đầu Q13</p><p style="page-break-before:always;break-before:page">Trang hai Q13</p><p>Phụ lục nội dung</p>';
    a._initZones();
    a.headerDom.innerHTML = '<p>Đầu trang Q13</p>';
    a.footerDom.innerHTML = '<p>Chân trang Q13</p>';
    const p = a.bodyDom.querySelectorAll('p')[2];
    const range = document.createRange(); range.selectNodeContents(p); range.collapse(false);
    const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
    await a.insertEquation({linear:'S=v*t'});
    a.insertTextBox({text:'Hộp văn bản Q13',x:420,y:560});
    return {bodyText:a.bodyDom.innerText, header:a.headerDom.innerText, footer:a.footerDom.innerText,
      shapes:a.shapes.filter(s=>s.type==='textbox').length, equations:a.bodyDom.querySelectorAll('[data-vno-equation="true"],.vno-equation').length};
  })()`, { awaitPromise: true, timeoutMilliseconds: 30000 });
  const started = Date.now();
  await cdp.evaluate(`(async () => { const a=window.__vnoAppInstance.adapter; await a.print(); return true; })()`, { awaitPromise: true, timeoutMilliseconds: 240000 });
  const elapsedMs = Date.now() - started;
  const preview = await cdp.evaluate(`(() => { const d=document.querySelector('.vno-print-dialog-overlay');
    return {visible:!!d, loading:d?.querySelector('.vno-print-preview-loading')?.innerText||'',
      pages:d?.querySelector('.vno-print-total')?.textContent||'', stage:d?.querySelector('.vno-print-preview-stage')?.innerText?.slice(0,200)||''}; })()`);
  console.log(JSON.stringify({setup,elapsedMs,preview}));
  if (!preview.visible || preview.loading || Number(preview.pages) !== 2) process.exitCode = 1;
} finally { await session.close(); }
