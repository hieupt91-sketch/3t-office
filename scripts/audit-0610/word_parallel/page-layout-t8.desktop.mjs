import { launchApp } from "../../../tests/live/cdp/session.mjs";
import { click, press, typeText, mouseClick } from "../../../tests/live/cdp/actions.mjs";
import { mkdirSync, writeFileSync } from "node:fs";
const dir = process.env.VNO_CDP_LOCALAPPDATA;
if (!dir || !process.env.VNO_APP_ROOT) throw new Error("Set VNO_CDP_LOCALAPPDATA and VNO_APP_ROOT.");
mkdirSync(dir, { recursive: true });
const session = await launchApp("writer", { filePath: `${dir}\\template.docx`, localAppData: dir, root: process.env.VNO_APP_ROOT, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
try {
  const cdp = session.cdp;
  const screenshot = async name => {
    const shot = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    writeFileSync(`${dir}\\${name}.png`, Buffer.from(shot.result.data, "base64"));
    return `${dir}\\${name}.png`;
  };
  const save = async name => cdp.evaluate(`(() => { const a=window.__vnoAppInstance.adapter; return globalThis.globalUnoBridge.saveRealFileInPlace("writer", a._contentForExport(), ${JSON.stringify(`${dir}\\${name}.docx`)}, ${JSON.stringify(`${dir}\\template.docx`)}); })()`, { awaitPromise: true, timeoutMilliseconds: 240000 });
  const state = async () => cdp.evaluate("(() => {const a=window.__vnoAppInstance.adapter;const s=a.getActiveSectionId?.()||a.activeSectionId;const h=a.sectionHeadersFooters?.[s]||{};return {pageSetup:a.pageSetup,sectionIds:Object.keys(a.sectionPageSetups||{}),activeSection:s,header:a.headerDom?.innerText,footer:a.footerDom?.innerText,footerHtml:a.footerDom?.innerHTML,differentFirstPage:h.differentFirstPage,differentOddEven:h.differentOddEven,pageNumberRestart:h.pageNumberRestart,pageNumberStart:h.pageNumberStart}})()");
  await cdp.waitFor("!!document.querySelector('.vno-writer-body')", { timeoutMilliseconds: 180000, intervalMilliseconds: 500 });
  await cdp.waitFor("document.querySelector('.vno-writer-body')?.textContent.includes('Alpha')", { timeoutMilliseconds: 180000, intervalMilliseconds: 500 });
  const layoutTab = await cdp.evaluate("[...document.querySelectorAll('.vno-ribbon-tab')].findIndex(x=>/Bố cục|Layout/i.test(x.textContent))");
  await click(cdp, ".vno-ribbon-tab", layoutTab);
  await click(cdp, 'button[data-command-id="writer.page.size"]');
  await click(cdp, "#vno-pagesetup-size"); await press(cdp, "ArrowDown"); await press(cdp, "ArrowDown"); await press(cdp, "Enter");
  await click(cdp, "#vno-pagesetup-orientation"); await press(cdp, "ArrowDown"); await press(cdp, "Enter");
  await click(cdp, "#vno-pagesetup-margin-preset"); await press(cdp, "ArrowDown"); await press(cdp, "Enter");
  const presetPreview = await cdp.evaluate("({size:document.querySelector('#vno-pagesetup-size').value,orientation:document.querySelector('#vno-pagesetup-orientation').value,margins:[...document.querySelectorAll('[id^=\\\"vno-pagesetup-margin-\\\"]')].filter(x=>x.tagName==='INPUT').map(x=>x.value),preset:document.querySelector('#vno-pagesetup-margin-preset').value})");
  await screenshot("layout-a5-dialog");
  await click(cdp, ".vno-dialog-ok-btn");
  const a5State = await state();
  const a5Save = await save("app_page_t8_a5_normal_landscape");

  // Restore A4 portrait and apply the Word Narrow margin preset through the same dialog.
  await click(cdp, 'button[data-command-id="writer.page.margins"]');
  await click(cdp, "#vno-pagesetup-size"); await press(cdp, "Home"); await press(cdp, "Enter");
  await click(cdp, "#vno-pagesetup-orientation"); await press(cdp, "Home"); await press(cdp, "Enter");
  await click(cdp, "#vno-pagesetup-margin-preset"); await press(cdp, "ArrowDown"); await press(cdp, "ArrowDown"); await press(cdp, "Enter");
  const narrowPreview = await cdp.evaluate("({size:document.querySelector('#vno-pagesetup-size').value,orientation:document.querySelector('#vno-pagesetup-orientation').value,margins:[...document.querySelectorAll('[id^=\\\"vno-pagesetup-margin-\\\"]')].filter(x=>x.tagName==='INPUT').map(x=>x.value),preset:document.querySelector('#vno-pagesetup-margin-preset').value})");
  await click(cdp, ".vno-dialog-ok-btn");
  const narrowState = await state();
  const narrowSave = await save("app_page_t8_narrow");

  // Exercise the remaining Word presets and Letter paper through the UI.
  await click(cdp, 'button[data-command-id="writer.page.margins"]');
  await click(cdp, "#vno-pagesetup-margin-preset"); for (let i=0;i<3;i++) await press(cdp, "ArrowDown"); await press(cdp, "Enter");
  const moderatePreview = await cdp.evaluate("({preset:document.querySelector('#vno-pagesetup-margin-preset').value,margins:[...document.querySelectorAll('[id^=\"vno-pagesetup-margin-\"]')].filter(x=>x.tagName==='INPUT').map(x=>x.value)})");
  await click(cdp, ".vno-dialog-ok-btn"); const moderateSave = await save("app_page_t8_moderate");
  await click(cdp, 'button[data-command-id="writer.page.margins"]');
  await click(cdp, "#vno-pagesetup-margin-preset"); for (let i=0;i<4;i++) await press(cdp, "ArrowDown"); await press(cdp, "Enter");
  const widePreview = await cdp.evaluate("({preset:document.querySelector('#vno-pagesetup-margin-preset').value,margins:[...document.querySelectorAll('[id^=\"vno-pagesetup-margin-\"]')].filter(x=>x.tagName==='INPUT').map(x=>x.value)})");
  await click(cdp, ".vno-dialog-ok-btn"); const wideSave = await save("app_page_t8_wide");
  await click(cdp, 'button[data-command-id="writer.page.size"]');
  await click(cdp, "#vno-pagesetup-size"); await press(cdp, "ArrowDown"); await press(cdp, "Enter");
  const letterPreview = await cdp.evaluate("({size:document.querySelector('#vno-pagesetup-size').value,orientation:document.querySelector('#vno-pagesetup-orientation').value})");
  await click(cdp, ".vno-dialog-ok-btn"); const letterSave = await save("app_page_t8_letter");

  // Insert page and section breaks from the Layout ribbon dropdown using real mouse clicks.
  await click(cdp, ".vno-writer-body p", 0);
  await press(cdp, "End");
  await click(cdp, 'button[data-dropdown-id="writer.layout.breaks"]');
  await click(cdp, '[role="menuitem"][data-command-id="writer.page.break"]');
  await typeText(cdp, "After page break", 5);
  await click(cdp, 'button[data-dropdown-id="writer.layout.breaks"]');
  await click(cdp, '[role="menuitem"][data-command-id="writer.section.nextPage"]');
  await typeText(cdp, "Next page section", 5);
  await click(cdp, 'button[data-dropdown-id="writer.layout.breaks"]');
  await click(cdp, '[role="menuitem"][data-command-id="writer.section.continuous"]');
  await typeText(cdp, "Continuous section", 5);
  await click(cdp, 'button[data-dropdown-id="writer.layout.breaks"]');
  await click(cdp, '[role="menuitem"][data-command-id="writer.section.evenPage"]');
  await typeText(cdp, "Even page section", 5);
  await click(cdp, 'button[data-dropdown-id="writer.layout.breaks"]');
  await click(cdp, '[role="menuitem"][data-command-id="writer.section.oddPage"]');
  await typeText(cdp, "Odd page section", 5);
  const breakState = await cdp.evaluate("(() => {const b=document.querySelector('.vno-writer-body');return{pageBreaks:b.querySelectorAll('[data-vno-page-break=\\\"true\\\"]').length,sections:[...b.querySelectorAll('[data-vno-section-id]')].map(x=>({id:x.dataset.vnoSectionId,type:x.dataset.vnoSectionBreak}))}})()");
  await screenshot("layout-breaks");

  // Add a header and footer (footer has native PAGE / NUMPAGES fields).
  const insertTab = await cdp.evaluate("[...document.querySelectorAll('.vno-ribbon-tab')].findIndex(x=>/Chèn|Insert/i.test(x.textContent))");
  await click(cdp, ".vno-ribbon-tab", insertTab);
  await click(cdp, 'button[data-command-id="writer.header.insert"]');
  await typeText(cdp, "Word parity header", 5);
  await click(cdp, 'button[data-command-id="writer.footer.insert"]');
  const headerFooterState = await state();
  const hfSave = await save("app_page_t8_header_footer");
  await screenshot("layout-header-footer");

  // Set a different first page and restart page numbering at 3 for the active section.
  await click(cdp, ".vno-ribbon-tab", layoutTab);
  await click(cdp, 'button[data-dropdown-id="writer.layout.sectionOptions"]');
  await click(cdp, '[role="menuitem"][data-command-id="writer.section.options"]');
  await click(cdp, "#vno-hf-diff-first");
  await click(cdp, "#vno-hf-diff-oddeven");
  await click(cdp, ".vno-dialog-ok-btn");
  await click(cdp, 'button[data-dropdown-id="writer.layout.sectionOptions"]');
  await click(cdp, '[role="menuitem"][data-command-id="writer.pageNumber.format"]');
  await click(cdp, 'input[name="vno-pgnum-choice"][value="restart"]');
  await click(cdp, "#vno-pgnum-start-val"); await press(cdp, "A", { ctrl: true }); await typeText(cdp, "3", 10);
  await click(cdp, ".vno-dialog-ok-btn");
  const finalState = await state();
  const exportHtml = await cdp.evaluate("window.__vnoAppInstance.adapter._contentForExport()");
  writeFileSync(`${dir}\\app_page_t8_export.html`, exportHtml);
  const finalSave = await save("app_page_t8_final");
  await screenshot("layout-page-numbers");
  console.log(JSON.stringify({presetPreview,narrowPreview,moderatePreview,widePreview,letterPreview,a5State,narrowState,breakState,headerFooterState,finalState,saves:[a5Save?.status,narrowSave?.status,moderateSave?.status,wideSave?.status,letterSave?.status,hfSave?.status,finalSave?.status],screenshots:["layout-a5-dialog.png","layout-breaks.png","layout-header-footer.png","layout-page-numbers.png"].map(x=>`${dir}\\${x}`)},null,2));
} finally { await session.close(); }

