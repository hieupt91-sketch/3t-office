import { launchApp } from "./session.mjs";
import { click, press, typeText, sleep } from "./actions.mjs";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const checks = [];
const check = (name, pass, detail = "") => {
  checks.push({ name, pass: Boolean(pass) });
  console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`);
};
const session = await launchApp("writer", {});
const { cdp } = session;
const ev = (expression) => cdp.evaluate(expression, { awaitPromise: true, timeoutMilliseconds: 60000 });

try {
  await sleep(1200);
  await click(cdp, ".vno-writer-body");
  await press(cdp, "a", { ctrl: true });
  await typeText(cdp, "Đoạn kiểm tra kiểu mới");

  await press(cdp, "s", { ctrl: true, alt: true, shift: true });
  const opened = await ev("!!document.querySelector('.vno-writer-styles-pane')");
  const presetCount = await ev("document.querySelectorAll('.vno-writer-styles-pane [role=option]').length");
  check("Ctrl+Alt+Shift+S mở Ngăn Kiểu và liệt kê kiểu dựng sẵn", opened && presetCount >= 9, `opened=${opened}; items=${presetCount}`);

  await click(cdp, '.vno-writer-style-row[data-style-id="h1"]');
  const applied = await ev("document.querySelector('.vno-writer-body')?.firstElementChild?.tagName === 'H1'");
  check("Bấm kiểu Tiêu đề 1 áp dụng lên đoạn đang chọn", applied);

  await click(cdp, ".vno-writer-body");
  await press(cdp, "a", { ctrl: true });
  await click(cdp, ".vno-writer-styles-pane [data-create]");
  await sleep(250);
  await click(cdp, ".vno-create-style-dialog input[name=name]");
  await press(cdp, "a", { ctrl: true });
  await typeText(cdp, "Kiểu thử 1");
  await click(cdp, ".vno-create-style-dialog input[name=font]");
  await press(cdp, "a", { ctrl: true });
  await typeText(cdp, "Arial");
  await click(cdp, ".vno-create-style-dialog input[name=size]");
  await press(cdp, "a", { ctrl: true });
  await typeText(cdp, "13");
  await click(cdp, ".vno-create-style-dialog input[name=bold]");
  await click(cdp, ".vno-create-style-dialog select[name=alignment]");
  await press(cdp, "ArrowDown");
  await press(cdp, "Enter");
  await click(cdp, ".vno-create-style-dialog input[name=spaceAfter]");
  await press(cdp, "a", { ctrl: true });
  await typeText(cdp, "12");
  await click(cdp, ".vno-create-style-dialog footer button[type=submit]");
  await sleep(500);
  const created = await ev(`(() => { const p=document.querySelector('.vno-writer-body')?.firstElementChild, s=getComputedStyle(p); return {id:p?.dataset.vnoStyleId, name:p?.dataset.vnoStyleName, definition:p?.dataset.vnoStyleDefinition, bold:s.fontWeight, font:s.fontFamily, size:p?.style.fontSize, align:s.textAlign, after:p?.style.marginBottom, visible:[...document.querySelectorAll('.vno-writer-styles-pane [role=option]')].some(e=>e.textContent==='Kiểu thử 1')}; })()`);
  check("Tạo kiểu thật, áp dụng ngay và hiện trong Ngăn Kiểu", !!created?.id && created.name === "Kiểu thử 1" && created.visible, JSON.stringify(created));
  check("Định dạng đã tạo là Arial 13 pt, đậm, căn giữa, sau đoạn 12 pt", created?.bold === "700" && /Arial/i.test(created.font || "") && created.size === "13pt" && created.align === "center" && /12pt/.test(created.after || ""), JSON.stringify(created));

  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "vno-writer-style-"));
  const outputPath = path.join(outputDir, "writer-custom-style.docx");
  const exportHtml = await ev("window.__vnoAppInstance.adapter._contentForExport()");
  fs.writeFileSync(path.join(outputDir, "source.html"), exportHtml, "utf8");
  const exportMarker = await ev(`(() => { const html=window.__vnoAppInstance.adapter._contentForExport(); return {id:html.includes('data-vno-style-id'),definition:html.includes('data-vno-style-definition'),name:html.includes('Kiểu thử 1')}; })()`);
  check("Metadata kiểu riêng đi vào nội dung HTML của luồng lưu", exportMarker.id && exportMarker.definition, JSON.stringify(exportMarker));
  const saveResult = await ev(`(async () => { const a=window.__vnoAppInstance.adapter; a.isDirty=true; return await globalThis.globalUnoBridge.saveRealFileInPlace('writer', a._contentForExport(), ${JSON.stringify(outputPath)}, null); })()`);
  check("Lưu thật qua luồng DOCX của ứng dụng", saveResult?.status === "ok" && fs.existsSync(outputPath), `${JSON.stringify(saveResult)} | ${outputPath}`);

  await click(cdp, ".vno-writer-body");
  await press(cdp, "z", { ctrl: true });
  const undone = await ev("!document.querySelector('.vno-writer-body')?.firstElementChild?.dataset?.vnoStyleId");
  check("Ctrl+Z hoàn tác một bước tạo và áp dụng kiểu", undone);
  await click(cdp, ".vno-writer-styles-pane");
  await press(cdp, "Escape");
  await sleep(250);
  check("Esc đóng Ngăn Kiểu", !(await ev("!!document.querySelector('.vno-writer-styles-pane')")));
} catch (error) {
  check("Không phát sinh ngoại lệ", false, error.stack || error.message);
} finally {
  await session.close();
}
if (checks.some((item) => !item.pass)) process.exit(1);
console.log(`Writer styles pane: ${checks.length}/${checks.length} PASS`);
