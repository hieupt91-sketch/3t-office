import { launchApp } from "./session.mjs";
import { click, press, typeText, sleep } from "./actions.mjs";

const selected = new Set(process.argv.find((arg) => arg.startsWith("--only="))?.slice(7).split(",") || []);
const results = [];
const check = (name, pass, detail) => {
  results.push({ name, pass: Boolean(pass), detail });
  console.log(`${pass ? "PASS" : "FAIL"} | ${name} | ${JSON.stringify(detail)}`);
};
const session = await launchApp("writer", { localAppData: process.env.VNO_CDP_LOCALAPPDATA });
const { cdp } = session;

try {
  if (!selected.size || selected.has("1")) {
    await click(cdp, "#vno-ribbon-tab-insert");
    await click(cdp, '[data-command-id="writer.table.insert"]');
    await sleep(300);
    const firstCell = await cdp.evaluate(`(() => { const r=document.querySelector('.vno-writer-body table td')?.getBoundingClientRect(); return r&&{x:r.left+r.width/2,y:r.top+r.height/2}; })()`);
    if (!firstCell) throw new Error("Bảng mới không có ô để kích hoạt tab ngữ cảnh");
    await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x: firstCell.x, y: firstCell.y, button: "left", buttons: 1, clickCount: 1 });
    await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: firstCell.x, y: firstCell.y, button: "left", buttons: 0, clickCount: 1 });
    await click(cdp, "#vno-ribbon-tab-tableLayout");
    const beforeKey = await cdp.evaluate(`(() => { const p=document.querySelector('.vno-ribbon-content'),g=p?.querySelector('[data-group-id="tableSelectGroup"]'); const buttons=[...g.querySelectorAll('button[data-command-id^="writer.table.select"]')]; const pr=p.getBoundingClientRect(); return { viewport:{top:pr.top,bottom:pr.bottom},buttons:buttons.map(b=>{const r=b.getBoundingClientRect();return {id:b.dataset.commandId,top:r.top,bottom:r.bottom,height:r.height};})}; })()`);
    await click(cdp, '[data-command-id="writer.table.selectRow"]');
    await press(cdp, "Tab");
    const afterKey = await cdp.evaluate(`(() => { const g=document.querySelector('.vno-ribbon-content [data-group-id="tableSelectGroup"]'); const b=[...g.querySelectorAll('button[data-command-id^="writer.table.select"]')]; return {focus:document.activeElement?.dataset?.commandId,heights:b.map(x=>x.getBoundingClientRect().height),selectedCells:document.querySelectorAll('.is-vno-cell-selected').length}; })()`);
    const pass = beforeKey.buttons.length === 4 && beforeKey.buttons.every(b => b.height > 0 && b.top >= beforeKey.viewport.top && b.bottom <= beforeKey.viewport.bottom) && afterKey.heights.length === 4 && afterKey.heights.every(h => h > 0) && afterKey.selectedCells === 4;
    check("U7 chuột + phím: nhóm Bảng hiển thị đủ bốn nút và Chọn hàng chạy", pass, { cdpPort: session.debugPort, beforeKey, afterKey });
  }
  if (!selected.size || selected.has("2")) {
    const hasTable = await cdp.evaluate("!!document.querySelector('.vno-writer-body table')");
    if (!hasTable) {
      await click(cdp, "#vno-ribbon-tab-insert");
      await click(cdp, '[data-command-id="writer.table.insert"]');
      await sleep(300);
    }
    await cdp.evaluate(`(() => {
      const table = document.querySelector('.vno-writer-body table');
      if (!table) throw new Error('Thiếu bảng desktop test');
      [...table.rows].forEach((row, ri) => [...row.cells].forEach((cell, ci) => { cell.textContent = 'R' + (ri + 1) + 'C' + (ci + 1); }));
    })()`);
    const cell = await cdp.evaluate(`(() => { const r=document.querySelector('.vno-writer-body table td')?.getBoundingClientRect(); return r&&{x:r.left+r.width/2,y:r.top+r.height/2}; })()`);
    await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x: cell.x, y: cell.y, button: "left", buttons: 1, clickCount: 1 });
    await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: cell.x, y: cell.y, button: "left", buttons: 0, clickCount: 1 });
    await click(cdp, "#vno-ribbon-tab-tableLayout");
    await click(cdp, '[data-command-id="writer.table.mergeCells"]');
    const mergeNotice = await cdp.evaluate(`(() => ({message:document.querySelector('.vno-notification-bar-message')?.textContent||'', rows:document.querySelector('.vno-writer-body table')?.rows.length, cells:document.querySelector('.vno-writer-body table')?.rows[0]?.cells.length}))()`);
    check("U11 chuột: Gộp ô khi chưa chọn nhiều hiện hướng dẫn ngắn", /ít nhất hai ô liền kề/.test(mergeNotice.message) && mergeNotice.rows === 3 && mergeNotice.cells === 4, { cdpPort: session.debugPort, mergeNotice });

    await click(cdp, '[data-command-id="writer.table.selectRow"]');
    const rowSelection = await cdp.evaluate(`(() => ({text:getSelection().toString(), selected:[...document.querySelectorAll('.is-vno-cell-selected')].map(c=>c.textContent)}))()`);
    await cdp.evaluate(`window.__t5Copied=''; document.addEventListener('copy',e=>{window.__t5Copied=e.clipboardData?.getData('text/plain')||getSelection().toString();},{once:true});`);
    await press(cdp, "c", { ctrl: true });
    const copied = await cdp.evaluate("window.__t5Copied");
    check("U12 chuột + Ctrl+C: chọn hàng tạo vùng văn bản có thể sao chép", rowSelection.text.replace(/\s/g, "") === "R1C1R1C2R1C3R1C4" && /R1C1/.test(copied) && /R1C4/.test(copied), { rowSelection, copied });

    const start = await cdp.evaluate(`(() => { const r=document.querySelector('.vno-writer-body table td')?.getBoundingClientRect(); return r&&{x:r.left+r.width/2,y:r.top+r.height/2}; })()`);
    await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x: start.x, y: start.y, button: "left", buttons: 1, clickCount: 1 });
    await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: start.x, y: start.y, button: "left", buttons: 0, clickCount: 1 });
    await press(cdp, " ", { shift: true });
    const shortcut = await cdp.evaluate(`(() => ({text:getSelection().toString(), selected:document.querySelectorAll('.is-vno-cell-selected').length}))()`);
    await press(cdp, "b", { ctrl: true });
    const formatted = await cdp.evaluate(`(() => ({html:document.querySelector('.vno-writer-body table tr')?.innerHTML, text:getSelection().toString()}))()`);
    check("U12 Shift+Space + Ctrl+B: chọn hàng bằng phím và áp định dạng", shortcut.text.replace(/\s/g, "") === "R1C1R1C2R1C3R1C4" && shortcut.selected === 4 && /<(b|strong)\b/i.test(formatted.html), { shortcut, formatted });
    await cdp.evaluate("globalCommandBus.execute('writer.table.selectCol')");
    const column = await cdp.evaluate(`(() => ({selected:document.querySelectorAll('.is-vno-cell-selected').length,text:getSelection().toString()}))()`);
    await cdp.evaluate("globalCommandBus.execute('writer.table.selectTable')");
    const wholeTable = await cdp.evaluate(`(() => ({selected:document.querySelectorAll('.is-vno-cell-selected').length,text:getSelection().toString()}))()`);
    check("U12 chuột: chọn cột và bảng tô sáng, có vùng chọn văn bản", column.selected === 3 && column.text.includes("R1C1") && column.text.includes("R3C1") && wholeTable.selected === 12 && wholeTable.text.includes("R3C4"), { column, wholeTable });
  }
  if (!selected.size || selected.has("3")) {
    const ensureTable = await cdp.evaluate("!!document.querySelector('.vno-writer-body table')");
    if (!ensureTable) {
      await click(cdp, "#vno-ribbon-tab-insert");
      await click(cdp, '[data-command-id="writer.table.insert"]');
      await sleep(300);
    }
    const cell = await cdp.evaluate(`(() => { const r=document.querySelector('.vno-writer-body table td')?.getBoundingClientRect(); return r&&{x:r.left+r.width/2,y:r.top+r.height/2}; })()`);
    await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x: cell.x, y: cell.y, button: "left", buttons: 1, clickCount: 1 });
    await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: cell.x, y: cell.y, button: "left", buttons: 0, clickCount: 1 });
    await click(cdp, "#vno-ribbon-tab-tableDesign");
    await click(cdp, '[data-command-id="writer.table.cellBg"]');
    const cellBg = await cdp.evaluate(`(() => { const b=document.querySelector('[data-command-id="writer.table.cellBg"]'); const s=getComputedStyle(b); return {class:b.className,pressed:b.getAttribute('aria-pressed'),checked:b.getAttribute('aria-checked'),background:s.backgroundColor}; })()`);
    await click(cdp, "#vno-ribbon-tab-layout");
    await click(cdp, '[data-command-id="writer.page.border"]');
    await press(cdp, "Escape");
    const borderAfterClose = await cdp.evaluate(`(() => { const b=document.querySelector('[data-command-id="writer.page.border"]'); return {class:b.className,pressed:b.getAttribute('aria-pressed'),checked:b.getAttribute('aria-checked'),focused:document.activeElement===b,background:getComputedStyle(b).backgroundColor}; })()`);
    await click(cdp, '[data-command-id="writer.page.margins"]');
    await press(cdp, "Escape");
    const marginsAfterClose = await cdp.evaluate(`(() => { const b=document.querySelector('[data-command-id="writer.page.margins"]'); return {class:b.className,pressed:b.getAttribute('aria-pressed'),checked:b.getAttribute('aria-checked'),focused:document.activeElement===b,background:getComputedStyle(b).backgroundColor}; })()`);
    check("U14 chuột + Esc: nút không giữ nền sáng sau thao tác", cellBg.class.includes("vno-action-complete") && borderAfterClose.class.includes("vno-action-complete") && marginsAfterClose.class.includes("vno-action-complete") && [cellBg, borderAfterClose, marginsAfterClose].every(s => !/is-(checked|active)/.test(s.class) && s.pressed !== "true" && s.background === "rgb(255, 255, 255)"), { cdpPort: session.debugPort, cellBg, borderAfterClose, marginsAfterClose });
  }
  if (!selected.size || selected.has("4")) {
    await click(cdp, "#vno-ribbon-tab-help");
    await click(cdp, '[data-command-id="writer.help.open"]');
    await cdp.evaluate(`(() => { const list=document.querySelector('.vno-help-list'); if(!list) throw new Error('Thiếu danh sách chủ đề Help'); list.scrollTop=500; })()`);
    await press(cdp, "Escape");
    await click(cdp, '[data-command-id="writer.help.open"]');
    const helpScroll = await cdp.evaluate(`(() => { const root=document.querySelector('.vno-help-panel'),list=document.querySelector('.vno-help-list'),topic=list?.querySelector('[data-help-id]'),lr=list?.getBoundingClientRect(),tr=topic?.getBoundingClientRect(),pr=root?.getBoundingClientRect(),wr=document.querySelector('.vno-workspace')?.getBoundingClientRect(); return {scrollTop:list?.scrollTop,firstTopic:topic?.textContent?.trim(),listTop:lr?.top,topicTop:tr?.top,topicBottom:tr?.bottom,listBottom:lr?.bottom,panel:{top:pr?.top,bottom:pr?.bottom,height:pr?.height},children:[...root.children].map(c=>({class:c.className,top:c.getBoundingClientRect().top,bottom:c.getBoundingClientRect().bottom,height:c.getBoundingClientRect().height,scroll:c.scrollTop,scrollHeight:c.scrollHeight})),workspace:{top:wr?.top,bottom:wr?.bottom,height:wr?.height},innerHeight:innerHeight,scrollY:scrollY,docScroll:document.scrollingElement?.scrollTop}; })()`);
    check("U17 chuột + Esc + mở lại: danh sách Help bắt đầu tại chủ đề đầu tiên", helpScroll.scrollTop === 0 && Boolean(helpScroll.firstTopic) && helpScroll.topicTop >= helpScroll.listTop && helpScroll.topicBottom <= helpScroll.listBottom, { cdpPort: session.debugPort, helpScroll });
  }
  if (results.some(item => !item.pass)) process.exitCode = 1;
} finally {
  await session.close();
}
