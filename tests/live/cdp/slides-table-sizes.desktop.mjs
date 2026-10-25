// Slides: Bố cục bảng > Kích thước ô… (chiều cao hàng, bề rộng cột), Phân phối đều hàng/cột, hoàn tác, lưu PPTX.
// PowerPoint COM đọc kích thước bằng scripts/audit-0610/ppt_table_sizes_readback.ps1.
import { launchApp } from "./session.mjs";
import { click, press, sleep } from "./actions.mjs";
import { platformOutputPath } from "./output-path.mjs";

const OUT = process.env.VNO_TABLESIZES_OUT || platformOutputPath("E:\\VNOffice-profiles\\claude-slidetrans\\table_sizes.pptx");
const checks = [];
const check = (name, pass, detail = "") => {
  checks.push(Boolean(pass));
  console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`);
};
const session = await launchApp("slides", {});
const { cdp } = session;
const ev = (expression) => cdp.evaluate(expression, { awaitPromise: true, timeoutMilliseconds: 60000 });
const canvas = "window.__vnoAppInstance.canvas";
const model = async () => JSON.parse(await ev(`JSON.stringify((({ rowHeights, colWidths, w, h, rows, cols }) => ({ rowHeights, colWidths, w: Math.round(w), h: Math.round(h), rows, cols }))(${canvas}.slides[0].shapes[0]))`));
const equal = (list) => !!list && list.every((v) => Math.abs(v - list[0]) < 1);
try {
  await sleep(1500);
  await ev(`${canvas}.insertTable({ rows: 3, cols: 3 })`);
  await sleep(600);
  await click(cdp, '[data-table-row="1"][data-table-col="1"]');
  await sleep(300);
  await click(cdp, "#vno-ribbon-tab-tableLayout");
  await sleep(300);
  await click(cdp, '[data-command-id="slides.table.cellSize"]');
  await cdp.waitFor("!!document.querySelector('#vno-tblsize-h')", { timeoutMilliseconds: 10000 });
  await ev(`(() => { document.querySelector('#vno-tblsize-h').value = '2,5'; document.querySelector('#vno-tblsize-w').value = '8'; })()`);
  await click(cdp, "#vno-tblsize-apply");
  await sleep(500);
  let m = await model();
  check("Đặt hàng 2 cao 2,5 cm và cột 2 rộng 8 cm", m.rowHeights && m.colWidths && m.rowHeights[1] > m.rowHeights[0] * 1.5 && m.colWidths[1] > m.colWidths[0] * 1.5, JSON.stringify(m));
  const rendered = await ev(`(() => { const td = document.querySelector('[data-table-row="1"][data-table-col="1"]'); const r = td.getBoundingClientRect(); const s = document.querySelector('[data-table-row="0"][data-table-col="0"]').getBoundingClientRect(); return JSON.stringify({ ratioW: r.width / s.width, ratioH: r.height / s.height }); })()`);
  const ratios = JSON.parse(rendered);
  check("Trình soạn thảo vẽ đúng tỉ lệ ô to hơn", ratios.ratioW > 1.5 && ratios.ratioH > 1.3, rendered);
  const customOut = OUT.replace(".pptx", "_custom.pptx");
  const savedCustom = await ev(`(async () => { const x = window.__vnoAppInstance.adapter || window.__vnoAppInstance; return JSON.stringify(await window.pywebview.api.save_document_in_place(x.serializeToFodp(), 'slides', ${JSON.stringify(customOut)}, null)).slice(0, 80); })()`);
  check("Lưu PPTX với kích thước tùy chỉnh", /"status":\s*"ok"/.test(savedCustom), customOut);
  await click(cdp, '[data-command-id="slides.table.distributeCols"]');
  await sleep(300);
  m = await model();
  check("Phân phối đều cột: các cột bằng nhau, tổng rộng giữ nguyên", equal(m.colWidths) && !equal(m.rowHeights), JSON.stringify(m.colWidths));
  await click(cdp, '[data-command-id="slides.table.distributeRows"]');
  await sleep(300);
  m = await model();
  check("Phân phối đều hàng: các hàng bằng nhau", equal(m.rowHeights), JSON.stringify(m.rowHeights));
  await ev(`document.body.focus()`);
  await press(cdp, "z", { ctrl: true });
  await sleep(300);
  m = await model();
  check("Ctrl+Z hoàn tác phân phối đều hàng", !equal(m.rowHeights), JSON.stringify(m.rowHeights));
  await press(cdp, "y", { ctrl: true });
  await sleep(300);
  await ev(`${canvas}.tableInsertRow("below")`);
  await sleep(300);
  m = await model();
  check("Chèn hàng: thêm một kích thước hàng, tổng khung bằng tổng các hàng", m.rows === 4 && m.rowHeights.length === 4 && Math.abs(m.rowHeights.reduce((a, b) => a + b, 0) - m.h) < 2, JSON.stringify(m));
  const saved = await ev(`(async () => { const x = window.__vnoAppInstance.adapter || window.__vnoAppInstance; return JSON.stringify(await window.pywebview.api.save_document_in_place(x.serializeToFodp(), 'slides', ${JSON.stringify(OUT)}, null)).slice(0, 80); })()`);
  check("Lưu PPTX", /"status":\s*"ok"/.test(saved), saved);
  console.log("OUT " + OUT);
} catch (error) {
  check("Không phát sinh ngoại lệ", false, error.stack || error.message);
} finally {
  await session.close();
}
if (checks.some((c) => !c)) process.exit(1);
console.log(`Slides table sizes: ${checks.length}/${checks.length} PASS`);
