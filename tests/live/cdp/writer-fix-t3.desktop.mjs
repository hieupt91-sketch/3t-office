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
  await session.close();

  // U37/U38 measured with the actual theme button, style gallery and contextual Table tab.
  session = await launchApp("writer", {});
  await sleep(700);
  await click(session.cdp, "#vno-toggle-theme-btn");
  await click(session.cdp, "#vno-ribbon-tab-home");
  await click(session.cdp, '[data-command-id="writer.style.gallery"]');
  await session.cdp.waitFor(`!!document.querySelector('.vno-style-gallery-dropdown')`);
  await press(session.cdp, "ArrowRight");
  const previews = await session.cdp.evaluate(`(() => [...document.querySelectorAll('.vno-style-card-preview span')].map(el=>({text:el.textContent,color:getComputedStyle(el).color,bg:getComputedStyle(el.parentElement.parentElement).backgroundColor})))()`);
  const luminance = value => {
    const rgb = value.match(/[0-9.]+/g).slice(0, 3).map(channel => Number(channel) / 255);
    const linear = rgb.map(channel => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  };
  const ratios = previews.map(item => {
    const values = [luminance(item.color), luminance(item.bg)].sort((a, b) => b - a);
    return { text: item.text, contrast: (values[0] + 0.05) / (values[1] + 0.05), color: item.color, bg: item.bg };
  });
  check("U37: thao tác chuột mở thư viện, phím mũi tên đổi thẻ; mọi mẫu đạt tương phản 4.5:1", previews.length >= 6 && ratios.every(item => item.contrast >= 4.5), JSON.stringify(ratios));
  await click(session.cdp, ".vno-style-gallery-dropdown");
  await session.cdp.evaluate(`(() => { const body=document.querySelector('.vno-writer-body'); body.innerHTML='<table><tbody><tr><td>Ô thử</td><td>Ô hai</td></tr></tbody></table>'; body.dispatchEvent(new Event('input',{bubbles:true})); })()`);
  await click(session.cdp, ".vno-writer-body td");
  await session.cdp.waitFor(`!document.querySelector('#vno-ribbon-tab-tableDesign')?.hidden`);
  await click(session.cdp, "#vno-ribbon-tab-tableDesign");
  const tableTab = await session.cdp.evaluate(`(() => {const el=document.querySelector('#vno-ribbon-tab-tableDesign'),s=getComputedStyle(el);return {color:s.color,bg:s.backgroundColor,active:el.classList.contains('is-active'),pressed:el.getAttribute('aria-selected')};})()`);
  const tabValues = [tableTab.color, tableTab.bg].map(value => {
    const rgb=value.match(/[0-9.]+/g).slice(0,3).map(channel=>Number(channel)/255);
    const linear=rgb.map(channel=>channel<=0.04045?channel/12.92:((channel+0.055)/1.055)**2.4);
    return 0.2126*linear[0]+0.7152*linear[1]+0.0722*linear[2];
  }).sort((a,b)=>b-a);
  const tableContrast=(tabValues[0]+0.05)/(tabValues[1]+0.05);
  check("U38: nhấp ô bảng rồi chọn tab ngữ cảnh bằng chuột giữ màu active tương phản >=4.5:1", tableTab.active && tableTab.pressed === "true" && tableContrast >= 4.5, JSON.stringify({...tableTab,contrast:tableContrast}));
} catch (error) {
  check("FIX-T3 U20 desktop regression không phát sinh ngoại lệ", false, error.stack || error.message);
} finally {
  if (session) await session.close();
}

const failed = checks.filter(item => !item.pass);
if (failed.length) process.exit(1);
console.log(`FIX-T3 U20 desktop regression: ${checks.length}/${checks.length} PASS`);
