// Do do tre go phim THAT bang Event Timing API (keydown/keypress/input: tu luc nhan phim den khi ve xong khung hinh), khong phu thuoc MutationObserver.
// Chay: node --experimental-websocket scripts/audit-0610/doc_typing_latency.mjs [so-doan]   (mac dinh 1800 doan ~ 54 trang; 5400 ~ 160 trang)
import { launchApp } from "../../tests/live/cdp/session.mjs";
import { press } from "../../tests/live/cdp/actions.mjs";

const paragraphs = Number(process.argv[2] || 1800);
const session = await launchApp("writer", { startTimeoutMilliseconds: 90000 });
const ev = (expression, options) => session.cdp.evaluate(expression, options);
try {
  await ev(`(() => { const b=document.querySelector('.vno-writer-body'); let h=''; for(let i=0;i<${paragraphs};i++) h+='<p>Doan van so '+i+' Cong hoa xa hoi chu nghia Viet Nam doc lap tu do hanh phuc.</p>'; b.innerHTML=h; b.focus(); const t=b.lastChild.firstChild; const r=document.createRange(); r.setStart(t,3); r.collapse(true); const s=getSelection(); s.removeAllRanges(); s.addRange(r); window.__ev=[]; new PerformanceObserver(l => { for (const e of l.getEntries()) if (['keydown','keypress','keyup','beforeinput','input'].includes(e.name)) window.__ev.push([e.name, Math.round(e.duration), Math.round(e.startTime)]); }).observe({ type: 'event', durationThreshold: 16, buffered: false }); })()`, { timeoutMilliseconds: 120000 });
  await new Promise((resolve) => setTimeout(resolve, 5000));
  // Go 60 phim voi nhip nguoi that (~110 ms), moi 15 phim nghi 700 ms de giong luc nguoi dung dung lai suy nghi
  for (let i = 0; i < 60; i += 1) {
    await press(session.cdp, "a", {}, 110);
    if (i % 15 === 14) await new Promise((resolve) => setTimeout(resolve, 700));
  }
  await new Promise((resolve) => setTimeout(resolve, 1500));
  const events = await ev("window.__ev");
  const slow = events.filter((e) => e[1] > 100).map((e) => `${e[0]}:${e[1]}ms@${e[2]}`);
  if (slow.length) console.log("cham >100ms:", slow.slice(0, 12).join(" | "));
  const perKey = {};
  // Gom theo khoang thoi gian: lay duration lon nhat moi phim (keydown/keypress/input cua cung mot phim)
  const durations = events.map((e) => e[1]).sort((a, b) => a - b);
  const total = 60;
  const maxPerType = {};
  for (const [name, duration] of events) maxPerType[name] = Math.max(maxPerType[name] || 0, duration);
  const sorted = durations.length ? durations : [0];
  const p95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))];
  const over100 = durations.filter((d) => d > 100).length;
  console.log(JSON.stringify({ paragraphs, keys: total, eventsOver16ms: durations.length, maxPerType, p95Among16msPlus: p95, over100ms: over100 }));
  console.log(over100 === 0 ? "PASS | khong phim nao tre > 100 ms (Event Timing)" : `FAIL | ${over100} su kien > 100 ms`);
} finally {
  await session.close();
}
