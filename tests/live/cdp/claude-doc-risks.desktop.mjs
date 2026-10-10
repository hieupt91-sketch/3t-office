import { launchApp } from "./session.mjs";
import { press, typeText, mouseClick } from "./actions.mjs";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const session = await launchApp("writer", { startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
const ev = (e) => session.cdp.evaluate(e, { awaitPromise: true });
const results = [];
const check = (n, ok, d) => { results.push(ok); console.log((ok ? "PASS" : "FAIL") + " | " + n + " | " + String(d).slice(0, 220)); };
const clickSel = async (q) => { const p = JSON.parse(await ev(`(() => { const e=document.querySelector(${JSON.stringify(q)}); const r=e.getBoundingClientRect(); return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2}); })()`)); await mouseClick(session.cdp, p.x, p.y); };
const selectText = (pIndex, from, to) => ev(`(() => { const p=document.querySelectorAll('.vno-writer-body p')[${pIndex}]; const ft=(p)=>{const w=document.createTreeWalker(p,NodeFilter.SHOW_TEXT);let t;while((t=w.nextNode())){if(t.data.length)return t;}return null;}; const t=ft(p); const r=document.createRange(); r.setStart(t,${from}); r.setEnd(t,${to === null ? "t.data.length" : to}); const s=getSelection(); s.removeAllRanges(); s.addRange(r); document.querySelector('.vno-writer-body').focus(); return 1; })()`);
try {
  await session.cdp.waitFor("!!document.querySelector('.vno-writer-body')", { timeoutMilliseconds: 180000, intervalMilliseconds: 500 });
  await sleep(4000);
  await ev("document.querySelector('.vno-writer-body').focus()");
  await typeText(session.cdp, "alpha beta", 8); await press(session.cdp, "Enter", {}, 60);
  await typeText(session.cdp, "gamma delta", 8); await press(session.cdp, "Enter", {}, 60);
  await typeText(session.cdp, "epsilon zeta", 8); await sleep(600);
  // 1. Doi hoa/thuong tren vung chon TRAI NHIEU DOAN (giua doan 1 -> giua doan 3)
  await ev(`(() => { const ps=document.querySelectorAll('.vno-writer-body p'); const ft=(p)=>{const w=document.createTreeWalker(p,NodeFilter.SHOW_TEXT);let t;while((t=w.nextNode())){if(t.data.length)return t;}return null;}; const t1=ft(ps[0]); const t3=ft(ps[2]); const r=document.createRange(); r.setStart(t1,2); r.setEnd(t3,5); const s=getSelection(); s.removeAllRanges(); s.addRange(r); document.querySelector('.vno-writer-body').focus(); return 1; })()`);
  await clickSel("#vno-ribbon-tab-home"); await sleep(300);
  await clickSel('[data-command-id="writer.text.changeCase"]'); await sleep(500);
  const st = JSON.parse(await ev(`JSON.stringify({ps:[...document.querySelectorAll('.vno-writer-body p')].map(p=>p.textContent), nested:document.querySelectorAll('.vno-writer-body p p').length, count:document.querySelectorAll('.vno-writer-body p').length, sel:getSelection().toString()})`));
  check("Doi hoa/thuong nhieu doan: giu 3 doan, khong long the <p>", st.count === 3 && st.nested === 0, JSON.stringify(st));
  check("Doi hoa/thuong nhieu doan: chi doi dung vung chon", st.ps[0].startsWith("al") && st.ps[0].slice(2) === st.ps[0].slice(2).toUpperCase() && st.ps[1] === st.ps[1].toUpperCase() && st.ps[2].startsWith("EPSIL") && st.ps[2].slice(5) === "on zeta", JSON.stringify(st.ps));
  check("Doi hoa/thuong nhieu doan: vung chon van con", st.sel.length > 10, "sel.length=" + st.sel.length);
  // 2. Sao chep dinh dang: sao chep ca CO CHU
  await ev("window.__vnoAppInstance.adapter._applyFontSizePt && 1");
  await selectText(0, 0, null);
  await ev("window.__vnoAppInstance.adapter._applyFontSizePt(24)"); await sleep(300);
  const sizeSrc = await ev("getComputedStyle(document.querySelectorAll('.vno-writer-body p')[0].querySelector('span,font')||document.querySelectorAll('.vno-writer-body p')[0]).fontSize");
  await selectText(0, 0, null);
  await clickSel('[data-command-id="common.edit.formatPainter"]'); await sleep(300);
  await selectText(1, 0, null); // chon dich bang script (khong nha chuot) roi bam lai nut de ap dung
  await clickSel('[data-command-id="common.edit.formatPainter"]'); await sleep(500);
  const sizeDst = await ev("(() => { const p=document.querySelectorAll('.vno-writer-body p')[1]; const n=p.querySelector('span,font')||p; return getComputedStyle(n).fontSize; })()");
  check("Sao chep dinh dang: co chu nguon duoc ap len dich", sizeDst === "32px" /* 24pt nguon */, `nguon=${sizeSrc} dich=${sizeDst}`);
  // 3. Choi dinh dang khong bi ap khi bam ribbon
  await selectText(0, 0, 5);
  await clickSel('[data-command-id="common.edit.formatPainter"]'); await sleep(300);
  const htmlBefore = await ev("document.querySelector('.vno-writer-body').innerHTML");
  await clickSel("#vno-ribbon-tab-insert"); await sleep(500);
  const activeAfter = await ev("!!document.querySelector('.vno-format-painter-active')");
  const htmlAfter = await ev("document.querySelector('.vno-writer-body').innerHTML");
  check("Choi dinh dang con cho khi bam tab ribbon (khong tu ap len vung nguon)", activeAfter === true && htmlBefore === htmlAfter, `active=${activeAfter} noiDungDoi=${htmlBefore !== htmlAfter}`);
  await press(session.cdp, "Escape", {}, 100); await sleep(200);
  check("Esc huy choi dinh dang", (await ev("!!document.querySelector('.vno-format-painter-active')")) === false, "");
  console.log("SUMMARY", results.filter(Boolean).length + "/" + results.length);
} finally { await session.close(); }