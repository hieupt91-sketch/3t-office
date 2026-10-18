// Slides: tab Bố cục bảng > Căn chỉnh (ngang: trái/giữa/phải; dọc: trên/giữa/dưới), hoàn tác, lưu PPTX, mở lại.
// PowerPoint COM đọc căn lề ô bằng scripts/audit-0610/ppt_table_align_readback.ps1.
import { launchApp } from "./session.mjs";
import { click, press, sleep } from "./actions.mjs";

const OUT = process.env.VNO_TABLEALIGN_OUT || "E:\\VNOffice-profiles\\claude-slidetrans\\table_align.pptx";
const checks = [];
const check = (name, pass, detail = "") => {
  checks.push(Boolean(pass));
  console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`);
};
const session = await launchApp("slides", {});
const { cdp } = session;
const ev = (expression) => cdp.evaluate(expression, { awaitPromise: true, timeoutMilliseconds: 60000 });
const canvas = "window.__vnoAppInstance.canvas";
const model = () => ev(`JSON.stringify({ cells: ${canvas}.slides[0].shapes[0].cells, valign: ${canvas}.slides[0].shapes[0].cellValign || null })`);
try {
  await sleep(1500);
  await ev(`${canvas}.insertTable({ rows: 2, cols: 2 })`);
  await sleep(600);
  await ev(`(() => { const s = ${canvas}.slides[0].shapes[0]; s.cells = [["Ten", "Diem"], ["An", "9"]]; ${canvas}._renderShapesLayer(); })()`);
  await sleep(400);
  await click(cdp, '[data-table-row="0"][data-table-col="1"]');
  await sleep(300);
  await click(cdp, "#vno-ribbon-tab-tableLayout");
  await sleep(300);
  await click(cdp, '[data-command-id="slides.table.alignCenter"]');
  await sleep(300);
  let m = JSON.parse(await model());
  check("Căn giữa ô (1,2): nội dung mang text-align:center, ô khác giữ nguyên", /text-align:center/.test(m.cells[0][1]) && m.cells[0][0] === "Ten", JSON.stringify(m.cells));
  await click(cdp, '[data-table-row="1"][data-table-col="1"]');
  await sleep(300);
  await click(cdp, '[data-command-id="slides.table.alignRight"]');
  await click(cdp, '[data-command-id="slides.table.alignMiddle"]');
  await sleep(300);
  m = JSON.parse(await model());
  check("Ô (2,2): căn phải và căn giữa dọc", /text-align:right/.test(m.cells[1][1]) && m.valign?.[1]?.[1] === "middle", JSON.stringify(m));
  const rendered = await ev(`(() => { const td = document.querySelector('[data-table-row="1"][data-table-col="1"]'); return td.style.verticalAlign + '|' + getComputedStyle(td.querySelector('p') || td).textAlign; })()`);
  check("Trình soạn thảo vẽ đúng căn dọc và căn ngang", /^middle\|right$/.test(rendered), rendered);
  await ev(`document.body.focus()`);
  await press(cdp, "z", { ctrl: true });
  await sleep(300);
  m = JSON.parse(await model());
  check("Ctrl+Z hoàn tác căn giữa dọc", !m.valign?.[1]?.[1], JSON.stringify(m.valign));
  await press(cdp, "y", { ctrl: true });
  await sleep(300);
  const saved = await ev(`(async () => { const x = window.__vnoAppInstance.adapter || window.__vnoAppInstance; return JSON.stringify(await window.pywebview.api.save_document_in_place(x.serializeToFodp(), 'slides', ${JSON.stringify(OUT)}, null)).slice(0, 80); })()`);
  check("Lưu PPTX", /"status":\s*"ok"/.test(saved), saved);
  console.log("OUT " + OUT);
} catch (error) {
  check("Không phát sinh ngoại lệ", false, error.stack || error.message);
} finally {
  await session.close();
}
if (checks.some((c) => !c)) process.exit(1);
console.log(`Slides table align: ${checks.length}/${checks.length} PASS`);
