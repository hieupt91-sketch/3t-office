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
  const ready = await cdp.evaluate(`(() => { const m=window.__vnoAppInstance?.autoRecoverManager; if(!m) return false; m.leftovers=[{snapshot_id:'cdp-last-recovery',app_kind:'writer',title:'Bản nháp thử'}]; m.bridge.deleteAutoRecoverSnapshot=async()=>true; return true; })()`);
  if (!ready) throw new Error("AutoRecoverManager is not available on the Writer app instance");
  await cdp.evaluate(`window.__vnoAppInstance.autoRecoverManager.showStartupRecovery()`);
  await sleep(200);
  await click(cdp, '[data-recovery-action="delete"]');
  await sleep(350);
  const result = await cdp.evaluate(`({overlay:!!document.querySelector('.vno-recovery-overlay'),empty:document.querySelector('.vno-recovery-empty')?.textContent || '',button:document.querySelector('.vno-recovery-later')?.textContent || ''})`);
  check("Xóa bản cuối cùng tự đóng hộp thoại khôi phục", !result.overlay, JSON.stringify(result));
} catch (error) {
  check("CDP không phát sinh ngoại lệ", false, error.stack || error.message);
} finally {
  await session.close();
}
if (checks.some(pass => !pass)) process.exit(1);
console.log(`Writer AutoRecover last item: ${checks.length}/${checks.length} PASS`);
