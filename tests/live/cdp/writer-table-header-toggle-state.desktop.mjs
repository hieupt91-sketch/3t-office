import { launchApp } from "./session.mjs";
import { click, sleep } from "./actions.mjs";

const session = await launchApp("writer");
const checks = [];
const check = (name, pass, detail = "") => {
  checks.push(Boolean(pass));
  console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`);
};
try {
  const { cdp } = session;
  await sleep(900);
  await cdp.evaluate(`window.__vnoAppInstance.adapter.insertTable(2, 2)`);
  await click(cdp, ".vno-writer-body table td");
  await sleep(300);
  await cdp.evaluate(`window.__vnoGlobalCommandBus.execute('writer.table.toggleHeaderRow')`);
  await click(cdp, "#vno-ribbon-tab-tableDesign");
  await sleep(250);
  const state = await cdp.evaluate(`(() => { const b=document.querySelector('[data-command-id="writer.table.toggleHeaderRow"]'); return {button:!!b,checked:b?.classList.contains('is-checked') || b?.getAttribute('aria-pressed') === 'true',bold:getComputedStyle(document.querySelector('.vno-writer-body table tr:first-child td')).fontWeight}; })()`);
  check("Hàng tiêu đề đang bật được phản ánh trên nút", state.button && Number(state.bold) >= 600 && state.checked, JSON.stringify(state));
} catch (error) {
  check("CDP không phát sinh ngoại lệ", false, error.stack || error.message);
} finally {
  await session.close();
}
if (checks.some(pass => !pass)) process.exit(1);
console.log(`Writer table header toggle state: ${checks.length}/${checks.length} PASS`);
