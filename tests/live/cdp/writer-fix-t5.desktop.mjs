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
  if (results.some(item => !item.pass)) process.exitCode = 1;
} finally {
  await session.close();
}
