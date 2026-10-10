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
  await session.close();

  // U40: force the reported 1024x600 viewport, reveal contextual tabs, and use scroll controls plus keyboard.
  session = await launchApp("writer", {});
  await session.cdp.send("Emulation.setDeviceMetricsOverride", { width: 1024, height: 600, deviceScaleFactor: 1, mobile: false });
  await session.cdp.evaluate(`window.dispatchEvent(new Event('resize'))`);
  await sleep(250);
  await session.cdp.evaluate(`(() => { const body=document.querySelector('.vno-writer-body'); body.innerHTML='<table><tbody><tr><td>Ô thử</td><td>Ô hai</td></tr></tbody></table>'; body.dispatchEvent(new Event('input',{bubbles:true})); })()`);
  await click(session.cdp, ".vno-writer-body td");
  await session.cdp.waitFor(`!document.querySelector('#vno-ribbon-tab-tableDesign')?.hidden`);
  const narrowStart = await session.cdp.evaluate(`(() => {const bar=document.querySelector('.vno-ribbon-tabs'),strip=document.querySelector('.vno-ribbon-tab-strip'),ai=document.querySelector('#vno-ribbon-tab-ai'),right=document.querySelector('.vno-ribbon-tab-scroll-btn.is-right'); const r=ai.getBoundingClientRect(),b=bar.getBoundingClientRect(),p=strip.getBoundingClientRect(),q=right.getBoundingClientRect();return {width:innerWidth,height:innerHeight,client:bar.clientWidth,scroll:bar.scrollWidth,scrollLeft:bar.scrollLeft,barLeft:b.left,barRight:b.right,stripLeft:p.left,stripRight:p.right,rightWidth:q.width,aiLeft:r.left,aiRight:r.right,aiVisible:r.left>=0&&r.right<=innerWidth,rightVisible:!right.hidden};})()`);
  check("U40: tại 1024x600, thanh tab có vùng cuộn và hiện nút cuộn phải khi Trợ lý AI nằm ngoài khung", narrowStart.width === 1024 && narrowStart.height === 600 && narrowStart.scroll > narrowStart.client && !narrowStart.aiVisible && narrowStart.rightVisible, JSON.stringify(narrowStart));
  await click(session.cdp, ".vno-ribbon-tab-scroll-btn.is-right");
  await session.cdp.waitFor(`(() => {const r=document.querySelector('#vno-ribbon-tab-help').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth;})()`);
  let visibleHelp = await session.cdp.evaluate(`(() => {const r=document.querySelector('#vno-ribbon-tab-help').getBoundingClientRect();return {left:r.left,right:r.right,visible:r.left>=0&&r.right<=innerWidth,scrollLeft:document.querySelector('.vno-ribbon-tabs').scrollLeft};})()`);
  check("U40: nhấn nút cuộn bằng chuột đưa tab Trợ giúp vào vùng bấm được", visibleHelp.visible, JSON.stringify(visibleHelp));
  await click(session.cdp, "#vno-ribbon-tab-help");
  await session.cdp.waitFor(`document.activeElement===document.querySelector('#vno-ribbon-tab-help')`);
  const helpAfterClick = await session.cdp.evaluate(`(() => ({active:document.querySelector('#vno-ribbon-tab-help').classList.contains('is-active'),focused:document.activeElement===document.querySelector('#vno-ribbon-tab-help')}))()`);
  await press(session.cdp, "ArrowRight");
  const aiFocus = await session.cdp.evaluate(`(() => {const el=document.querySelector('#vno-ribbon-tab-ai'),r=el.getBoundingClientRect();return {active:el.classList.contains('is-active'),focused:document.activeElement===el,visible:r.left>=0&&r.right<=innerWidth,helpActive:document.querySelector('#vno-ribbon-tab-help').classList.contains('is-active'),current:document.querySelector('.vno-ribbon-tab.is-active')?.dataset.tabId};})()`);
  check("U40: chọn Trợ giúp bằng chuột rồi ArrowRight đưa Trợ lý AI vào vùng nhìn thấy", aiFocus.active && aiFocus.focused && aiFocus.visible, JSON.stringify({helpAfterClick,aiFocus}));
  await session.cdp.send("Emulation.setDeviceMetricsOverride", { width: 1366, height: 768, deviceScaleFactor: 1, mobile: false });
  await sleep(350);
  const wide = await session.cdp.evaluate(`(() => {const bar=document.querySelector('.vno-ribbon-tabs');return {width:innerWidth,client:bar.clientWidth,scroll:bar.scrollWidth,leftVisible:!document.querySelector('.vno-ribbon-tab-scroll-btn.is-left').hidden,rightVisible:!document.querySelector('.vno-ribbon-tab-scroll-btn.is-right').hidden};})()`);
  check("U40: ở 1366x768 các tab vẫn vừa như trước và nút cuộn tự ẩn", wide.width === 1366 && wide.scroll <= wide.client + 1 && !wide.leftVisible && !wide.rightVisible, JSON.stringify(wide));

  // U30/U33/U35: icon artwork contributes no duplicate text; visible and accessible labels stay intact.
  const labelChecks = [
    ["writer.reference.footnoteInsert", "Chú thích trang", "Chú thích trang (Ctrl+Alt+F)"],
    ["writer.reference.endnoteInsert", "Chú thích cuối", "Chú thích cuối (Ctrl+Alt+D)"],
    ["writer.reference.bibliographyInsert", "Thư mục tài liệu", "Thư mục tài liệu"],
    ["writer.mailMerge.insertField", "Chèn trường", "Chèn trường"],
    ["writer.mailMerge.ifRule", "Quy tắc", "Quy tắc"],
    ["writer.review.wordCount", "Đếm từ", "Đếm từ"],
  ];
  const measuredLabels = [];
  for (const tab of ["references", "mailings", "review"]) {
    await click(session.cdp, `#vno-ribbon-tab-${tab}`);
    const ids = labelChecks.filter(([id]) => {
      if (tab === "references") return id.startsWith("writer.reference.");
      if (tab === "mailings") return id.startsWith("writer.mailMerge.");
      return id === "writer.review.wordCount";
    }).map(([id]) => id);
    const values = await session.cdp.evaluate(`(${JSON.stringify(ids)}).map(id => {const button=document.querySelector('[data-command-id="'+id+'"]');return {id,label:button?.querySelector('.vno-btn-label')?.innerText?.trim(),aria:button?.getAttribute('aria-label'),iconText:button?.querySelector('.vno-btn-icon')?.textContent?.trim()||''};})`);
    measuredLabels.push(...values);
  }
  const labelsPass = measuredLabels.length === labelChecks.length && measuredLabels.every(value => {
    const expected = labelChecks.find(([id]) => id === value.id);
    return value.label === expected[1] && value.aria === expected[2] && !value.iconText;
  });
  check("U30/U33/U35: nhãn hiển thị chỉ một lần, tên truy cập giữ nguyên trên ba tab", labelsPass, JSON.stringify(measuredLabels));
} catch (error) {
  check("FIX-T3 U20 desktop regression không phát sinh ngoại lệ", false, error.stack || error.message);
} finally {
  if (session) await session.close();
}

const failed = checks.filter(item => !item.pass);
if (failed.length) process.exit(1);
console.log(`FIX-T3 U20 desktop regression: ${checks.length}/${checks.length} PASS`);
