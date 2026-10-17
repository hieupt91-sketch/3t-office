// FIX-T2 desktop regression: shared word count, format-preserving case cycle, Ctrl+D Font dialog.
import { launchApp } from "./session.mjs";
import { click, press, sleep } from "./actions.mjs";

const checks = [];
const check = (name, pass, detail = "") => {
  checks.push({ name, pass: Boolean(pass), detail });
  console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`);
};
const session = await launchApp("writer", {});
const { cdp } = session;

try {
  await sleep(900);
  await cdp.evaluate(`(() => {
    const body = document.querySelector('.vno-writer-body');
    body.innerHTML = '<p>Một hai ba bốn</p>';
    body.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  await sleep(700);
  const statusCount = await cdp.evaluate(`document.querySelector('#vno-status-wordcount')?.textContent.trim()`);
  const stats = await cdp.evaluate(`window.__vnoAppInstance?.adapter?.getWordCountStats({ preferSelection: false })`);
  check("U18: thanh trạng thái lấy số từ từ bộ đếm chung", statusCount === "4 từ" && stats?.words === 4, `status=${statusCount}, stats=${stats?.words}`);
  await click(cdp, "#vno-status-wordcount");
  const dialogWords = await cdp.evaluate(`document.querySelector('#vno-wordcount-overlay [data-stat="words"]')?.textContent.trim()`);
  check("U18: hộp thoại Đếm từ khớp thanh trạng thái", dialogWords === "4" && statusCount === "4 từ", `dialog=${dialogWords}, status=${statusCount}`);
  await click(cdp, "#vno-wordcount-overlay .vno-dialog-close-btn");

  await click(cdp, "#vno-ribbon-tab-ai");
  await click(cdp, '[data-command-id="ai.assistant.summarize"]');
  await cdp.waitFor(`(() => { const msg = document.querySelector('#vno-ai-messages')?.lastElementChild?.innerText || ''; return msg.includes('Phát hiện 4 từ'); })()`, { timeoutMilliseconds: 20000 });
  const aiReply = await cdp.evaluate(`document.querySelector('#vno-ai-messages')?.lastElementChild?.innerText || ''`);
  check("U18: Tóm tắt nhanh khớp số từ thanh trạng thái", aiReply.includes("Phát hiện 4 từ") && !aiReply.includes("Phát hiện 5 từ"), aiReply.slice(-100));

  await click(cdp, "#vno-ai-close");
  await click(cdp, "#vno-ribbon-tab-home");
  await cdp.evaluate(`(() => {
    const body = document.querySelector('.vno-writer-body');
    body.innerHTML = '<p><span style="font-size:14pt;color:rgb(180, 20, 20);font-weight:700;font-family:Georgia">VIỆT NAM</span></p>';
    const span = body.querySelector('span');
    const range = document.createRange(); range.selectNodeContents(span);
    const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
  })()`);

  const before = await cdp.evaluate(`(() => { const s=document.querySelector('.vno-writer-body span'); const q=getSelection(); return {length:q.toString().length,size:getComputedStyle(s).fontSize,color:getComputedStyle(s).color,weight:getComputedStyle(s).fontWeight}; })()`);
  await click(cdp, '[data-command-id="writer.text.changeCase"]');
  const cases = [];
  for (let i = 0; i < 3; i += 1) {
    cases.push(await cdp.evaluate(`(() => { const s=document.querySelector('.vno-writer-body span'); const q=getSelection(); const c=getComputedStyle(s); return {text:q.toString(),length:q.toString().length,size:c.fontSize,color:c.color,weight:c.fontWeight}; })()`));
    if (i < 2) await click(cdp, '[data-command-id="writer.text.changeCase"]');
  }
  check("U19: Aa giữ nguyên vùng chọn và định dạng qua đủ ba trạng thái", before.length === 8
    && cases.map(v => v.text).join("|") === "Việt Nam|việt nam|VIỆT NAM"
    && cases.every(v => v.length === 8 && v.size === before.size && v.color === before.color && v.weight === before.weight),
  `before=${JSON.stringify(before)}; after=${JSON.stringify(cases)}`);

  await press(cdp, "d", { ctrl: true });
  const dialogOpen = await cdp.evaluate(`Boolean(document.querySelector('#vno-font-dialog-overlay [role="dialog"]'))`);
  check("U29: Ctrl+D mở hộp thoại Phông chữ trong Writer", dialogOpen);
  if (dialogOpen) {
    await cdp.evaluate(`(() => { document.querySelector('#vno-font-dialog-overlay [data-size]').value='18'; document.querySelector('#vno-font-dialog-overlay [data-family]').value='Arial'; })()`);
    await click(cdp, "#vno-font-dialog-overlay [data-apply]");
    const applied = await cdp.evaluate(`(() => { const q=getSelection(); const node=q.anchorNode; const s=node?.nodeType===3?node.parentElement:node; return {open:!!document.querySelector('#vno-font-dialog-overlay'),size:getComputedStyle(s).fontSize,family:getComputedStyle(s).fontFamily,selection:q.toString()}; })()`);
    check("U29: hộp thoại áp dụng phông/cỡ chữ lên vùng chọn", !applied.open && applied.size === "24px" && applied.family.includes("Arial"), JSON.stringify(applied));
  }
} catch (error) {
  check("FIX-T2 desktop regression không phát sinh ngoại lệ", false, error.stack || error.message);
} finally {
  await session.close();
}

const failed = checks.filter(item => !item.pass);
if (failed.length) process.exit(1);
console.log(`FIX-T2 desktop regression: ${checks.length}/${checks.length} PASS`);
