// Slides: Thiết kế bảng > Viền bảng (tất cả, viền ngoài, viền trong, không viền), hoàn tác, lưu PPTX.
// PowerPoint COM đọc viền từng ô bằng scripts/audit-0610/ppt_table_borders_readback.ps1.
import { launchApp } from "./session.mjs";
import { click, mouseClick, press, sleep } from "./actions.mjs";
import { platformOutputPath } from "./output-path.mjs";

const OUT = process.env.VNO_TABLEBORDERS_OUT || platformOutputPath("E:\\VNOffice-profiles\\claude-slidetrans\\table_borders.pptx");
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
const edges = async (r, c) => JSON.parse(await ev(`(() => { const td = document.querySelector('[data-table-row="${r}"][data-table-col="${c}"]'); const s = td.style; return JSON.stringify([s.borderTopStyle, s.borderRightStyle, s.borderBottomStyle, s.borderLeftStyle]); })()`));
const all = (list, value) => list.every((v) => v === value);
try {
  await sleep(1500);
  await ev(`${canvas}.insertTable({ rows: 3, cols: 3 })`);
  await sleep(600);
  await ev(`(() => { const s = ${canvas}.slides[0].shapes[0]; ${canvas}._tableCursor = null; ${canvas}.setSelectedTarget(s.id); ${canvas}._renderShapesLayer(); ${canvas}._syncTableContext(s.id); })()`);
  await sleep(400);
  await click(cdp, "#vno-ribbon-tab-tableDesign");
  await sleep(300);
  await openDropdown("slides.table.borders");
  await menuItem("Không viền");
  check("Không viền cả bảng: mọi cạnh none", all(await edges(1, 1), "none") && all(await edges(0, 0), "none"));
  await openDropdown("slides.table.borders");
  await menuItem("Viền ngoài");
  const corner = await edges(0, 0);
  const center = await edges(1, 1);
  check("Viền ngoài: ô góc có viền trên và trái, ô giữa không viền", corner[0] === "solid" && corner[3] === "solid" && corner[1] === "none" && all(center, "none"), JSON.stringify([corner, center]));
  await openDropdown("slides.table.borders");
  await menuItem("Không viền");
  await openDropdown("slides.table.borders");
  await menuItem("Viền trong");
  const c00 = await edges(0, 0);
  check("Viền trong: ô giữa đủ 4 cạnh, ô góc chỉ phải và dưới", all(await edges(1, 1), "solid") && c00[1] === "solid" && c00[2] === "solid" && c00[0] === "none" && c00[3] === "none", JSON.stringify(c00));
  await openDropdown("slides.table.borders");
  await menuItem("Tất cả đường viền");
  check("Tất cả đường viền: mọi ô đủ 4 cạnh", all(await edges(2, 2), "solid") && all(await edges(0, 1), "solid"));
  await ev(`document.body.focus()`);
  await press(cdp, "z", { ctrl: true });
  await sleep(300);
  const afterUndo = await edges(0, 0);
  check("Ctrl+Z hoàn tác về Viền trong (ô góc lại không viền trên)", afterUndo[0] === "none" && afterUndo[1] === "solid", JSON.stringify(afterUndo));
  await press(cdp, "y", { ctrl: true });
  await sleep(300);
  await click(cdp, '[data-table-row="1"][data-table-col="1"]');
  await ev(`(() => { const s = ${canvas}.slides[0].shapes[0]; const host = document.querySelector('[data-shape-id="' + s.id + '"]'); ${canvas}._extendTableSelection(s, 2, 2, host); })()`);
  await sleep(300);
  await openDropdown("slides.table.borders");
  await menuItem("Không viền");
  check("Không viền cho vùng (2,2)-(3,3): ô (3,3) không viền, ô (1,1) còn viền trên", all(await edges(2, 2), "none") && (await edges(0, 0))[0] === "solid");
  const saved = await ev(`(async () => { const x = window.__vnoAppInstance.adapter || window.__vnoAppInstance; return JSON.stringify(await window.pywebview.api.save_document_in_place(x.serializeToFodp(), 'slides', ${JSON.stringify(OUT)}, null)).slice(0, 80); })()`);
  check("Lưu PPTX", /"status":\s*"ok"/.test(saved), saved);
  console.log("OUT " + OUT);
} catch (error) {
  check("Không phát sinh ngoại lệ", false, error.stack || error.message);
} finally {
  await session.close();
}
if (checks.some((c) => !c)) process.exit(1);
console.log(`Slides table borders: ${checks.length}/${checks.length} PASS`);
