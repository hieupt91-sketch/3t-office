// Writer: Ngăn kiểu dáng (writer.styles.pane) và Ngăn chọn (writer.view.selectionPane) mở được bằng lệnh và hiện trong giao diện.
import { launchApp } from "./session.mjs";
import { sleep } from "./actions.mjs";

const profile = process.env.VNO_CDP_LOCALAPPDATA;
if (!profile) throw new Error("VNO_CDP_LOCALAPPDATA must point to an isolated profile.");
const session = await launchApp("writer", { localAppData: profile });
const { cdp } = session;
const checks = [];
const check = (name, pass, detail = "") => {
  checks.push(Boolean(pass));
  console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`);
};
const visiblePane = (pattern) => cdp.evaluate(`[...document.querySelectorAll('aside, [role=complementary], [class*="pane"], [id*="pane"]')].filter(e => e.getClientRects().length > 0 && /${pattern}/i.test((e.className || '') + ' ' + (e.id || '') + ' ' + (e.getAttribute('aria-label') || '')))
  .map(e => (e.className || e.id)).join(' | ')`);
const run = (id) => cdp.evaluate(`import('/platform/commands/command-bus.js').then(m => m.globalCommandBus.execute(${JSON.stringify(id)}))`, { awaitPromise: true });
try {
  await sleep(1500);
  await run("writer.styles.pane");
  await sleep(600);
  const styles = await visiblePane("style");
  check("Lệnh Ngăn kiểu dáng mở ngăn hiển thị", styles.length > 0, styles);
  await run("writer.styles.pane");
  await sleep(300);
  await cdp.evaluate(`(() => { const b = document.querySelector('.vno-writer-body'); b.innerHTML = '<p>Mot</p>'; })()`);
  await run("writer.view.selectionPane");
  await sleep(600);
  const selection = await visiblePane("selection");
  check("Lệnh Ngăn chọn mở ngăn hiển thị", selection.length > 0, selection);
} catch (error) {
  check("Không phát sinh ngoại lệ", false, error.stack || error.message);
} finally {
  await session.close();
}
if (checks.some((c) => !c)) process.exit(1);
