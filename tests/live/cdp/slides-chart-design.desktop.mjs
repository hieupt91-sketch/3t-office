// Slides: tab Thiết kế biểu đồ (Đổi kiểu biểu đồ, Sửa dữ liệu), hoàn tác, lưu PPTX; PowerPoint COM đọc ChartType.
// Đọc: scripts/audit-0610/ppt_chart_readback.ps1
import { launchApp } from "./session.mjs";
import { click, mouseClick, press, sleep } from "./actions.mjs";

const OUT = process.env.VNO_CHARTDESIGN_OUT || "E:\\VNOffice-profiles\\claude-slidetrans\\chart_design.pptx";
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
const chartType = async () => ev(`${canvas}.slides[0].shapes[0].chartType`);
try {
  await sleep(1500);
  check("Chưa chọn biểu đồ: tab Thiết kế biểu đồ ẩn", (await ev(`document.querySelector('#vno-ribbon-tab-chartDesign')?.hidden`)) === true);
  await ev(`${canvas}.insertChart({ chartType: "bar", title: "Doanh thu", labels: ["Q1", "Q2", "Q3"], data: [10, 20, 15] })`);
  await sleep(800);
  await ev(`(() => { const c = ${canvas}; c.setSelectedTarget(c.slides[0].shapes[0].id); c._renderShapesLayer(); c._syncShapeFormatContext(); })()`);
  await sleep(400);
  check("Chọn biểu đồ: tab Thiết kế biểu đồ hiện, tab Định dạng hình ẩn", (await ev(`document.querySelector('#vno-ribbon-tab-chartDesign')?.hidden`)) === false && (await ev(`document.querySelector('#vno-ribbon-tab-shapeFormat')?.hidden`)) === true);
  await click(cdp, "#vno-ribbon-tab-chartDesign");
  await sleep(300);
  const dd = await boxOf(`document.querySelector('[data-dropdown-id="slides.chart.type"]')`);
  await mouseClick(cdp, dd.x, dd.y);
  await sleep(250);
  const item = await boxOf(`[...document.querySelectorAll('.vno-ribbon-dropdown-item')].filter(e => e.getClientRects().length > 0).find(e => (e.getAttribute("title") || e.textContent.trim()) === "Đường")`);
  await mouseClick(cdp, item.x, item.y);
  await sleep(400);
  check("Đổi sang biểu đồ đường, giữ dữ liệu", (await chartType()) === "line" && (await ev(`${canvas}.slides[0].shapes[0].data.join(",")`)) === "10,20,15");
  check("Biểu đồ vẽ lại bằng đường", (await ev(`!!document.querySelector('.vno-slides-chart-svg[data-chart-type="line"]')`)) === true);
  await ev(`document.body.focus()`);
  await press(cdp, "z", { ctrl: true });
  await sleep(300);
  check("Ctrl+Z trả về biểu đồ cột", (await chartType()) === "bar");
  await press(cdp, "y", { ctrl: true });
  await sleep(300);
  await ev(`(() => { const c = ${canvas}; c.setSelectedTarget(c.slides[0].shapes[0].id); c._renderShapesLayer(); c._syncShapeFormatContext(); })()`);
  await sleep(300);
  await click(cdp, "#vno-ribbon-tab-chartDesign");
  await click(cdp, '[data-command-id="slides.chart.editData"]');
  await cdp.waitFor("!!document.querySelector('.vno-dialog-overlay input, .vno-dialog-overlay textarea')", { timeoutMilliseconds: 10000 });
  check("Sửa dữ liệu… mở hộp thoại", true);
  await press(cdp, "Escape");
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
console.log(`Slides chart design: ${checks.length}/${checks.length} PASS`);
