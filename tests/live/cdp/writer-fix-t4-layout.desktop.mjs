import { launchApp } from "./session.mjs";
import { click, mouseClick, sleep } from "./actions.mjs";

const results = [];
const check = (name, passed, detail) => {
  results.push({ name, passed: Boolean(passed) });
  console.log(`${passed ? "PASS" : "FAIL"} | ${name} | ${detail}`);
};
const session = await launchApp("writer", { localAppData: process.env.VNO_CDP_LOCALAPPDATA });
const { cdp } = session;

try {
  await sleep(800);
  await cdp.evaluate(`(() => {
    const body = document.querySelector('.vno-writer-body');
    body.innerHTML = '<h1>Tiêu đề chính T4</h1><h2>Mục con T4</h2><p>Nội dung mục T4.</p>';
    return true;
  })()`);
  const headingPoint = await cdp.evaluate(`(() => {
    const rect = document.querySelector('.vno-writer-body h1').getBoundingClientRect();
    return { x: rect.left + 4, y: rect.top + rect.height / 2 };
  })()`);
  await mouseClick(cdp, headingPoint.x, headingPoint.y);
  await click(cdp, "#vno-ribbon-tab-insert");
  await click(cdp, '[data-command-id="writer.insert.textbox"]');
  await sleep(100);
  await mouseClick(cdp, headingPoint.x, headingPoint.y);
  await click(cdp, "#vno-ribbon-tab-references");
  await click(cdp, '[data-command-id="writer.reference.tocInsert"]');
  await sleep(250);
  await cdp.evaluate(`(() => {
    const adapter = window.__vnoAppInstance.adapter;
    const shape = adapter.shapes[0];
    const toc = document.querySelector('.vno-toc-block').getBoundingClientRect();
    const editor = adapter.editorDom.getBoundingClientRect();
    adapter.moveShape(shape.id, toc.left - editor.left + 20, toc.top - editor.top + 20);
  })()`);

  const tocState = await cdp.evaluate(`(() => {
    const toc = document.querySelector('.vno-toc-block');
    const header = toc?.querySelector('.vno-toc-header')?.getBoundingClientRect();
    const first = toc?.querySelector('.vno-toc-item')?.getBoundingClientRect();
    const textbox = document.querySelector('.vno-writer-shape-item')?.getBoundingClientRect();
    const layer = document.querySelector('.vno-writer-shapes-layer');
    return toc && header && first ? {
      firstEntry: toc.querySelector('.vno-toc-item')?.textContent,
      gap: Math.round(first.top - header.bottom),
      tocZ: getComputedStyle(toc).zIndex,
      shapesLayerZ: getComputedStyle(layer).zIndex,
      overlapsTextbox: Boolean(textbox && toc.getBoundingClientRect().top < textbox.bottom && toc.getBoundingClientRect().bottom > textbox.top),
      box: textbox && { top: textbox.top, bottom: textbox.bottom },
      tocRect: { top: toc.getBoundingClientRect().top, bottom: toc.getBoundingClientRect().bottom }
    } : null;
  })()`);
  check("U27: khoảng cách dòng đầu với tiêu đề mục lục", Boolean(tocState && tocState.gap <= 24 && tocState.firstEntry?.includes("Tiêu đề chính T4")), JSON.stringify(tocState));
  check("U27: lớp mục lục nằm trên hộp văn bản nổi đang chồng vùng", Boolean(tocState?.overlapsTextbox && Number(tocState.tocZ) > Number(tocState.shapesLayerZ)), JSON.stringify(tocState));

} catch (error) {
  check("Kịch bản CDP U27 không có ngoại lệ", false, error.stack || error.message);
} finally {
  console.log(`CDP_PORT ${session.debugPort} | PROFILE ${session.localAppData}`);
  await session.close();
}

const passed = results.filter(result => result.passed).length;
console.log(`SUMMARY ${passed}/${results.length} PASS | ${results.length - passed} FAIL`);
if (passed !== results.length) process.exitCode = 1;
