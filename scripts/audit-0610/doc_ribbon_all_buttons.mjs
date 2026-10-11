// Moi nut tren MOI tab ribbon Writer (ke ca tab ngu canh Bang/Hinh): bam nut that bang chuot (CDP) tren tai lieu co noi dung,
// phan loai: DOI NOI DUNG / HOP THOAI / THONG BAO / TRANG THAI / IM LANG / LOI. Bo qua lenh mo hop thoai tep goc cua he dieu hanh.
// Chay: node --experimental-websocket scripts/audit-0610/doc_ribbon_all_buttons.mjs
import { launchApp } from "../../tests/live/cdp/session.mjs";
import { press } from "../../tests/live/cdp/actions.mjs";

const SKIP = /^common\.file\.(open|save|saveAs|print|exportPdf|new|close|recent|share|options|backstage)|^common\.app\.(exit|quit)|common\.help\.open|writer\.help\.open/;
const session = await launchApp("writer", { startTimeoutMilliseconds: 90000 });
const ev = (expression, options) => session.cdp.evaluate(expression, options);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const results = [];
try {
  await session.cdp.waitFor("!!document.querySelector('[id^=\"vno-ribbon-tab-\"]')", { timeoutMilliseconds: 60000, intervalMilliseconds: 300 });
  const tabIds = await ev(`[...document.querySelectorAll('[id^="vno-ribbon-tab-"]')].map(x => x.id.replace('vno-ribbon-tab-', ''))`);
  const SETUP = `(() => { const b=document.querySelector('.vno-writer-body'); b.innerHTML='<h1>Tieu de</h1><p>Doan mot co chu de thu nghiem cac lenh.</p><table border="1"><tbody><tr><td>A1</td><td>B1</td></tr><tr><td>A2</td><td>B2</td></tr></tbody></table><p>Doan cuoi.</p>'; b.focus(); const t=b.querySelector('p').firstChild; const r=document.createRange(); r.setStart(t,2); r.setEnd(t,12); const s=getSelection(); s.removeAllRanges(); s.addRange(r); })()`;
  const SNAP = `(() => { const b=document.querySelector('.vno-writer-body'); const ds=[...document.querySelectorAll('[role=dialog], .vno-dialog, .vno-modal, .vno-dialog-overlay, .vno-find-panel')].filter(x => x.getClientRects().length && !/Tiếng Việt/.test(x.innerText||'') && (x.innerText||'').trim().length); const notice=[...document.querySelectorAll('.vno-toast, .vno-notice, [role=alert], [role=status]')].filter(x => x.getClientRects().length && (x.innerText||'').trim()).map(x => x.innerText.trim().slice(0,70)); return { html: b.innerHTML, dlg: ds.length, dlgText: ds.length ? (ds[ds.length-1].innerText||'').slice(0,60).replace(/\\s+/g,' ') : '', notice, status: (document.querySelector('.vno-statusbar')?.innerText||'').slice(0,90).replace(/\\s+/g,' '), ai: !!document.querySelector('.vno-ai-sidebar:not(.is-hidden)'), pages: document.querySelector('.vno-writer-page')?.innerHTML.length }; })()`;
  const seen = new Set();
  for (const tab of tabIds) {
    await ev(`document.getElementById('vno-ribbon-tab-${tab}').hidden = false; document.getElementById('vno-ribbon-tab-${tab}').click(); true`);
    await sleep(300);
    const buttons = await ev(`[...document.querySelectorAll('.vno-ribbon-content button[data-command-id], .vno-ribbon-content [data-command-id]')].filter(x => x.getClientRects().length).map(x => ({ id: x.getAttribute('data-command-id'), tag: x.tagName, label: (x.getAttribute('aria-label') || x.title || x.innerText || '').trim().slice(0, 40), disabled: x.disabled === true || x.getAttribute('aria-disabled') === 'true' }))`);
    for (const button of buttons) {
      const key = `${button.id}`;
      if (!button.id || seen.has(key)) continue;
      seen.add(key);
      if (SKIP.test(button.id)) { results.push({ tab, ...button, result: "BO QUA (hop thoai he dieu hanh)" }); continue; }
      if (button.tag === "SELECT") { results.push({ tab, ...button, result: "O CHON (da kiem rieng)" }); continue; }
      try {
        await ev(SETUP);
        const before = await ev(SNAP);
        const clicked = await ev(`(() => { const el = document.querySelector('.vno-ribbon-content [data-command-id=${JSON.stringify(button.id)}]'); if (!el) return false; el.click(); return true; })()`);
        await sleep(450);
        const after = await ev(SNAP);
        const changed = before.html !== after.html || before.pages !== after.pages;
        let result;
        if (!clicked) result = "KHONG BAM DUOC";
        else if (button.disabled) result = "DANG VO HIEU (dung ngu canh)";
        else if (after.dlg > before.dlg) result = "HOP THOAI";
        else if (changed) result = "DOI NOI DUNG";
        else if (after.ai && !before.ai) result = "MO BANG AI";
        else if (after.notice.join("|") !== before.notice.join("|") && after.notice.length) result = "THONG BAO: " + after.notice[0];
        else if (after.status !== before.status) result = "TRANG THAI";
        else result = "IM LANG";
        results.push({ tab, ...button, result });
      } catch (error) {
        results.push({ tab, ...button, result: "LOI: " + String(error).slice(0, 60) });
      }
      for (let i = 0; i < 2; i += 1) { await press(session.cdp, "Escape", {}, 100).catch(() => {}); }
    }
  }
} finally {
  await session.close();
}
const tally = {};
for (const r of results) { const k = r.result.split(":")[0]; tally[k] = (tally[k] || 0) + 1; }
for (const r of results) console.log(`${r.result.padEnd(34)} | ${r.tab.padEnd(13)} | ${r.id} | ${r.label}`);
console.log("TONG:", results.length, JSON.stringify(tally));
