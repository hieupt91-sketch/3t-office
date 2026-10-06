// Chinh ta tang dan: go mot tu sai vao MOT doan -> chi doan do duoc danh dau lai, cac doan khac giu nguyen (khong quet lai ca tai lieu).
// Chay: node --experimental-websocket scripts/audit-0610/doc_spell_incremental_check.mjs
import { launchApp } from "../../tests/live/cdp/session.mjs";
import { typeText } from "../../tests/live/cdp/actions.mjs";

const session = await launchApp("writer", { startTimeoutMilliseconds: 90000 });
let failed = 0;
const rec = (name, ok, value) => { if (!ok) failed += 1; console.log(ok ? "PASS" : "FAIL", "|", name, "|", JSON.stringify(value).slice(0, 200)); };
try {
  const ev = (expression, options) => session.cdp.evaluate(expression, options);
  await ev(`(() => { const b=document.querySelector('.vno-writer-body'); b.innerHTML='<p>Cong hoa xa hoi chu nghia Viet Nam</p><p>Doan hai co chu saii sai o day</p><p>Doan ba binh thuong</p><p id="target">Doan muc tieu: </p>'; b.focus(); })()`);
  await new Promise((resolve) => setTimeout(resolve, 2500));
  const before = await ev(`(() => { const b=document.querySelector('.vno-writer-body'); return { total: b.querySelectorAll('[data-vno-spelling-uncertain]').length, p2: b.children[1].querySelectorAll('[data-vno-spelling-uncertain]').length }; })()`);
  rec("Truoc khi go: doan 2 co tu duoc danh dau", before.p2 >= 1, before);
  // Giu tham chieu node cua doan 2: neu quet lai ca tai lieu thi cac span cu bi thay moi
  await ev(`(() => { window.__p2span = document.querySelector('.vno-writer-body').children[1].querySelector('[data-vno-spelling-uncertain]'); const t=document.getElementById('target'); const r=document.createRange(); r.setStart(t.firstChild, t.firstChild.length); r.collapse(true); const s=getSelection(); s.removeAllRanges(); s.addRange(r); })()`);
  await typeText(session.cdp, "xyzqwv", 40);
  await new Promise((resolve) => setTimeout(resolve, 1800));
  const after = await ev(`(() => { const b=document.querySelector('.vno-writer-body'); const t=document.getElementById('target'); return { targetMarked: t.querySelectorAll('[data-vno-spelling-uncertain]').length, p2StillSameNode: window.__p2span === b.children[1].querySelector('[data-vno-spelling-uncertain]'), text: t.textContent }; })()`);
  rec("Tu moi go o doan muc tieu duoc danh dau", after.targetMarked >= 1 && /xyzqwv/.test(after.text), after);
  rec("Doan khac khong bi quet lai (span cu van la cung node)", after.p2StillSameNode, after.p2StillSameNode);
} catch (error) {
  failed += 1;
  console.log("FAIL | Loi chay |", String(error?.stack || error).slice(0, 300));
} finally {
  await session.close();
}
console.log(failed ? `TONG: ${failed} FAIL` : "TONG: tat ca PASS");
process.exit(failed ? 1 : 0);
