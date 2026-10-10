// Dem so doan "chua sua" (data-vno-untouched) va "da sua" (data-vno-edited) trong HTML xuat NGAY SAU KHI MO, khong sua gi.
// Dung de chung minh thay doi vi tay thuoc tinh doan khong lam doan nao thanh 'da sua' oan. So sanh truoc/sau bang cach chay o 2 ma nguon.
// Chay: node --experimental-websocket scripts/audit-0610/doc_untouched_count.mjs d01 d07 d13 ...
import { launchApp } from "../../tests/live/cdp/session.mjs";
const names = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (const name of names.length ? names : ["d13"]) {
  const file = `E:\\VN OFice\\file test\\landocx\\${name}.docx`;
  const session = await launchApp("writer", { filePath: file, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
  try {
    await session.cdp.waitFor("!!document.querySelector('.vno-writer-body') && document.querySelector('.vno-writer-body').textContent.length > 300", { timeoutMilliseconds: 180000, intervalMilliseconds: 500 });
    await sleep(6000);
    const r = await session.cdp.evaluate(`(() => {
      const html = window.__vnoAppInstance.adapter._contentForExport();
      const untouched = (html.match(/data-vno-untouched=/g) || []).length;
      const edited = (html.match(/data-vno-edited=/g) || []).length;
      const ids = (html.match(/id="vno-untouched-/g) || []).length;
      const live = document.querySelectorAll('.vno-writer-body p, .vno-writer-body h1, .vno-writer-body h2, .vno-writer-body h3, .vno-writer-body h4, .vno-writer-body h5, .vno-writer-body h6').length;
      return { untouched, edited, idsUntouched: ids, paragraphs: live, withSrcProps: document.querySelectorAll('[data-vno-src-props]').length };
    })()`);
    console.log(`${name}: ${JSON.stringify(r)}`);
  } finally { await session.close(); }
}
