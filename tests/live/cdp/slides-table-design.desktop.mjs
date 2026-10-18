// Slides: tab Thiết kế bảng (kiểu bảng, tùy chọn hàng tiêu đề/sọc, tô màu nền ô), hoàn tác, lưu PPTX.
// PowerPoint COM đọc màu nền từng ô bằng scripts/audit-0610/ppt_table_fills_readback.ps1.
import { launchApp } from "./session.mjs";
import { click, mouseClick, press, sleep } from "./actions.mjs";

const OUT = process.env.VNO_TABLEDESIGN_OUT || "E:\\VNOffice-profiles\\claude-slidetrans\\table_design.pptx";
const checks = [];
const check = (name, pass, detail = "") => {
  checks.push(Boolean(pass));
  console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`);
};
const session = await launchApp("slides", {});
const { cdp } = session;
const ev = (expression) => cdp.evaluate(expression, { awaitPromise: true, timeoutMilliseconds: 60000 });
const canvas = "window.__vnoAppInstance.canvas";
const boxOf = (selector) => ev(`(() => { const el = ${selector}; if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; })()`);
const openDropdown = async (id) => {
  const box = await boxOf(`document.querySelector('[data-dropdown-id="${id}"]')`);
  if (!box) throw new Error("Không thấy nút: " + id);
  await mouseClick(cdp, box.x, box.y);
  await sleep(250);
};
const menuItem = async (label) => {
  const box = await boxOf(`[...document.querySelectorAll('.vno-ribbon-dropdown-item')].filter(e => e.getClientRects().length > 0).find(e => (e.getAttribute("title") || e.textContent.trim()) === ${JSON.stringify(label)})`);
  if (!box) throw new Error("Không thấy mục menu: " + label);
  await mouseClick(cdp, box.x, box.y);
  await sleep(300);
};
const fills = () => ev(`JSON.stringify(Array.from({ length: ${canvas}.slides[0].shapes[0].rows }, (_, r) => Array.from({ length: ${canvas}.slides[0].shapes[0].cols }, (_, c) => document.querySelector('[data-table-row="' + r + '"][data-table-col="' + c + '"]')?.style.background || '')))`);
try {
  await sleep(1500);
  await ev(`${canvas}.insertTable({ rows: 3, cols: 3 })`);
  await sleep(600);
  await click(cdp, '[data-table-row="1"][data-table-col="1"]');
  await sleep(400);
  check("Chọn bảng: hiện tab Thiết kế bảng", (await ev(`document.querySelector('#vno-ribbon-tab-tableDesign')?.hidden`)) === false);
  await click(cdp, "#vno-ribbon-tab-tableDesign");
  await sleep(300);
  await openDropdown("slides.table.style");
  await menuItem("Xanh dương");
  let f = JSON.parse(await fills());
  check("Kiểu Xanh dương: hàng tiêu đề tô #BDD7EE, hàng sọc #DEEAF6", /189, 215, 238/.test(f[0][0]) && /222, 234, 246/.test(f[1][0]) && !/222, 234, 246/.test(f[2][0]), JSON.stringify(f));
  await click(cdp, '[data-command-id="slides.table.optBandedRows"]');
  await sleep(300);
  f = JSON.parse(await fills());
  check("Tắt Hàng sọc: các hàng thân hết sọc", !/222, 234, 246/.test(f[1][0]), JSON.stringify(f));
  await click(cdp, '[data-command-id="slides.table.optFirstCol"]');
  await sleep(300);
  f = JSON.parse(await fills());
  check("Bật Cột đầu tiên: ô (3,1) tô màu tiêu đề", /189, 215, 238/.test(f[2][0]), JSON.stringify(f));
  await click(cdp, '[data-table-row="1"][data-table-col="1"]');
  await openDropdown("slides.table.shading");
  await menuItem("Vàng");
  f = JSON.parse(await fills());
  check("Tô màu nền một ô: ô (2,2) vàng", /255, 255, 0/.test(f[1][1]) && !/255, 255, 0/.test(f[1][2]), JSON.stringify(f));
  await ev(`document.body.focus()`);
  await press(cdp, "z", { ctrl: true });
  await sleep(300);
  f = JSON.parse(await fills());
  check("Ctrl+Z hoàn tác tô màu ô", !/255, 255, 0/.test(f[1][1]), JSON.stringify(f));
  await press(cdp, "y", { ctrl: true });
  await sleep(300);
  await ev(`${canvas}.tableInsertRow("below")`);
  await sleep(300);
  const model = JSON.parse(await ev(`JSON.stringify({ rows: ${canvas}.slides[0].shapes[0].rows, fills: ${canvas}.slides[0].shapes[0].cellFills })`));
  check("Chèn hàng: màu tô tay đi theo ô (vẫn ở hàng 2)", model.rows === 4 && model.fills[1][1] && !model.fills[2]?.[1], JSON.stringify(model));
  const saved = await ev(`(async () => { const x = window.__vnoAppInstance.adapter || window.__vnoAppInstance; return JSON.stringify(await window.pywebview.api.save_document_in_place(x.serializeToFodp(), 'slides', ${JSON.stringify(OUT)}, null)).slice(0, 80); })()`);
  check("Lưu PPTX", /"status":\s*"ok"/.test(saved), saved);
  console.log("OUT " + OUT);
} catch (error) {
  check("Không phát sinh ngoại lệ", false, error.stack || error.message);
} finally {
  await session.close();
}
if (checks.some((c) => !c)) process.exit(1);
console.log(`Slides table design: ${checks.length}/${checks.length} PASS`);
