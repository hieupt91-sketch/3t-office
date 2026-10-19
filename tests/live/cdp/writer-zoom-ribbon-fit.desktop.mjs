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
  const { windowId } = await cdp.send("Browser.getWindowForTarget");
  await cdp.send("Browser.setWindowBounds", { windowId, bounds: { width: 1366, height: 768, windowState: "normal" } });
  await sleep(500);
  await click(cdp, "#vno-ribbon-tab-view");
  await sleep(250);
  const geometry = await cdp.evaluate(`(() => { const b=document.querySelector('[data-command-id="writer.view.zoomReset"]'); const g=b?.closest('.vno-ribbon-group'); const p=g?.parentElement; const r=b?.getBoundingClientRect(), pr=p?.getBoundingClientRect(), gr=g?.getBoundingClientRect(); return {button:!!b, buttonRight:r?.right, groupRight:gr?.right, parentRight:pr?.right, viewport:innerWidth, visible:b?.offsetParent!==null, clipped:!!b && (r.right > Math.min(pr.right, innerWidth) || r.left < pr.left)}; })()`);
  check("Nhóm Thu phóng hiển thị đủ đến nút Đặt lại ở 1366 px", geometry.button && geometry.visible && !geometry.clipped, JSON.stringify(geometry));
} catch (error) {
  check("CDP không phát sinh ngoại lệ", false, error.stack || error.message);
} finally {
  await session.close();
}
if (checks.some(pass => !pass)) process.exit(1);
console.log(`Writer zoom ribbon fit: ${checks.length}/${checks.length} PASS`);
