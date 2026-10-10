// Desktop regression checks for FIX-T3. UI selection, clicks and keyboard input use CDP.
import { launchApp } from "./session.mjs";
import { click, mouseDrag, press, sleep } from "./actions.mjs";

const checks = [];
const check = (name, pass, detail = "") => {
  checks.push({ name, pass: Boolean(pass), detail });
  console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`);
};

async function prepare(session) {
  const { cdp } = session;
  await sleep(700);
  await click(cdp, "#vno-ribbon-tab-review");
  await click(cdp, '[data-command-id="writer.review.toggleSpellCheck"]');
  await click(cdp, "#vno-ribbon-tab-home");
  await cdp.evaluate(`(() => {
    const body = document.querySelector('.vno-writer-body');
    body.innerHTML = '<p><span style="font-weight:700;color:rgb(180,20,20)">Nguồn định dạng</span></p><p><span>Vùng đích cần định dạng</span></p>';
    body.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  await cdp.waitFor(`document.querySelectorAll('.vno-writer-body span').length === 2`);
}

async function selectText(session, index) {
  const rect = await session.cdp.evaluate(`(() => { const r=document.querySelectorAll('.vno-writer-body span')[${index}].getBoundingClientRect(); return {x1:r.left+1,x2:r.right-1,y:r.top+r.height/2}; })()`);
  await mouseDrag(session.cdp, rect.x1, rect.y, rect.x2, rect.y);
}

let session = null;
try {
  // Esc behavior has an isolated desktop session so it is measured with a real mouse selection and key event.
  session = await launchApp("writer", {});
  await prepare(session);
  await selectText(session, 0);
  await click(session.cdp, '[data-command-id="common.edit.formatPainter"]');
  let state = await session.cdp.evaluate(`(() => ({active:document.querySelector('.vno-writer-page')?.classList.contains('vno-format-painter-active'),pressed:document.querySelector('[data-command-id="common.edit.formatPainter"]')?.getAttribute('aria-pressed')}))()`);
  check("U20: chọn bằng chuột và bật chổi phản ánh class/aria-pressed", state.active && state.pressed === "true", JSON.stringify(state));
  await press(session.cdp, "Escape");
  state = await session.cdp.evaluate(`(() => ({active:document.querySelector('.vno-writer-page')?.classList.contains('vno-format-painter-active'),pressed:document.querySelector('[data-command-id="common.edit.formatPainter"]')?.getAttribute('aria-pressed')}))()`);
  check("U20: Esc hủy chổi và tắt trạng thái nút", !state.active && state.pressed === "false", JSON.stringify(state));
  await session.close();
  session = null;

  // One-shot behavior is measured in a fresh desktop session using mouse selection at source and target.
  session = await launchApp("writer", {});
  await prepare(session);
  await selectText(session, 0);
  await click(session.cdp, '[data-command-id="common.edit.formatPainter"]');
  state = await session.cdp.evaluate(`(() => ({active:document.querySelector('.vno-writer-page')?.classList.contains('vno-format-painter-active'),pressed:document.querySelector('[data-command-id="common.edit.formatPainter"]')?.getAttribute('aria-pressed')}))()`);
  check("U20: bật chổi lần đầu trước khi quét vùng đích", state.active && state.pressed === "true", JSON.stringify(state));
  await selectText(session, 1);
  await sleep(100);
  const result = await session.cdp.evaluate(`(() => { const el=document.querySelectorAll('.vno-writer-body span')[1],styled=el.querySelector('b'),s=getComputedStyle(styled||el),colored=styled?.querySelector('font')||styled||el; return {active:document.querySelector('.vno-writer-page')?.classList.contains('vno-format-painter-active'),pressed:document.querySelector('[data-command-id="common.edit.formatPainter"]')?.getAttribute('aria-pressed'),weight:s.fontWeight,color:getComputedStyle(colored).color,html:el.outerHTML}; })()`);
  check("U20: quét vùng đích áp định dạng một lần rồi tự tắt", !result.active && result.pressed === "false" && result.weight === "700" && result.color === "rgb(180, 20, 20)", JSON.stringify(result));
} catch (error) {
  check("FIX-T3 U20 desktop regression không phát sinh ngoại lệ", false, error.stack || error.message);
} finally {
  if (session) await session.close();
}

const failed = checks.filter(item => !item.pass);
if (failed.length) process.exit(1);
console.log(`FIX-T3 U20 desktop regression: ${checks.length}/${checks.length} PASS`);
