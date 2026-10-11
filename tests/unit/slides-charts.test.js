import { SlidesCanvasController } from "../../apps/slides/slides-canvas.js";
import { generateSlidesChartSvg } from "../../apps/slides/slides-chart.js";
import { SlidesAdapter } from "../../adapters/libreoffice/slides/slides-adapter.js";
import { SLIDES_RIBBON_TABS } from "../../apps/slides/slides-ribbon.js";

class FakeElement {
  constructor() { this.style = {}; this.children = []; this.listeners = {}; }
  appendChild(child) { this.children.push(child); return child; }
  addEventListener(type, handler) { (this.listeners[type] ||= []).push(handler); }
  closest() { return null; }
  get offsetWidth() { return 960; }
}

function canvasController() {
  const canvas = new SlidesCanvasController(new FakeElement());
  canvas.shapesLayer = null;
  canvas._renderThumbnails = () => {};
  canvas.selectSlide = (index) => { canvas.currentSlideIndex = index; };
  return canvas;
}

export async function runSlidesChartTests() {
  const results = [];
  const test = async (name, fn) => {
    try { await fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };

  await test("Slides Chart: renderer SVG thật hỗ trợ cột/đường/tròn/miền", () => {
    const base = { title: "Doanh thu", labels: ["Q1", "Q2", "Q3"], data: [12, 28, 19] };
    const bar = generateSlidesChartSvg({ ...base, chartType: "bar" });
    if (!bar.includes('data-chart-type="bar"') || (bar.match(/data-point-index=/g) || []).length !== 3 || !bar.includes("Doanh thu")) throw new Error("SVG cột sai");
    if (!generateSlidesChartSvg({ ...base, chartType: "line" }).includes('data-series="line"')) throw new Error("SVG đường sai");
    if (!generateSlidesChartSvg({ ...base, chartType: "pie" }).includes("<path")) throw new Error("SVG tròn sai");
    if (!generateSlidesChartSvg({ ...base, chartType: "area" }).includes('data-series="area"')) throw new Error("SVG miền sai");
  });

  await test("Slides Chart: ribbon và adapter dispatch slides.insert.chart", async () => {
    const item = SLIDES_RIBBON_TABS.flatMap(tab => tab.groups).flatMap(group => group.items).find(entry => entry.commandId === "slides.insert.chart");
    if (!item || item.label !== "Biểu đồ" || item.icon !== "chart") throw new Error("Thiếu nút chart trên tab Chèn");
    const args = { chartType: "bar", labels: ["A"], data: [1] };
    const dispatched = await new SlidesAdapter({ insertChart: value => value }).handleDispatch(null, args, "slides.insert.chart");
    if (dispatched !== args) throw new Error("Adapter chưa dispatch insertChart");
  });

  await test("Slides Chart: chèn cột, sửa dữ liệu và Undo/Redo", async () => {
    const canvas = canvasController();
    const chart = await canvas.insertChart({ chartType: "bar", title: "Doanh số", labels: ["Bắc", "Nam"], data: [25, 40] });
    if (chart.type !== "chart" || canvas.undoStack.at(-1)?.type !== "shape-add") throw new Error("Insert không tạo chart/shape-add");
    if (!canvas._shapePresentationHtml(chart).includes("vno-slides-chart-svg") || !canvas._shapeSorterHtml(chart).includes("vno-sorter-chart")) throw new Error("F5/Sorter không render chart");
    canvas.updateChart(chart.id, { chartType: "line", title: "Đã sửa", labels: ["T1", "T2"], data: [7, 9] });
    if (chart.chartType !== "line" || chart.data[1] !== 9 || canvas.undoStack.at(-1)?.type !== "chart-edit") throw new Error("Sửa dữ liệu không ghi lịch sử");
    if (!canvas.undo() || chart.chartType !== "bar" || chart.data[1] !== 40) throw new Error("Undo sửa chart sai");
    if (!canvas.redo() || chart.chartType !== "line" || chart.data[1] !== 9) throw new Error("Redo sửa chart sai");
  });

  await test("Slides Chart: xóa và Undo/Redo dùng shape-delete hiện hữu", async () => {
    const canvas = canvasController();
    const chart = await canvas.insertChart({ chartType: "bar", labels: ["A"], data: [10] });
    if (!canvas.deleteShape(chart.id) || canvas.slides[0].shapes.length) throw new Error("Xóa chart sai");
    if (canvas.undoStack.at(-1)?.type !== "shape-delete") throw new Error("Không dùng shape-delete");
    if (!canvas.undo() || canvas.slides[0].shapes[0]?.type !== "chart") throw new Error("Undo xóa sai");
    if (!canvas.redo() || canvas.slides[0].shapes.length) throw new Error("Redo xóa sai");
  });

  await test("Slides Chart: FODP chứa chart:chart + local table và parse giữ dữ liệu", async () => {
    const canvas = canvasController();
    await canvas.insertChart({ chartType: "area", title: "Sản lượng & kế hoạch", labels: ["Tháng 1", "Tháng 2"], data: [100, 135] });
    const adapter = new SlidesAdapter(canvas);
    const xml = adapter.serializeToFodp();
    if (!xml.includes("<chart:chart") || !xml.includes('chart:class="chart:area"') || !xml.includes('table:name="local-table"') || !xml.includes('vno:chart="true"')) throw new Error("FODP thiếu ODF chart/data");
    const chart = adapter.parseFodp(xml)[0]?.shapes?.find(shape => shape.type === "chart");
    if (!chart || chart.title !== "Sản lượng & kế hoạch" || chart.labels[1] !== "Tháng 2" || chart.data[1] !== 135) throw new Error(`Round-trip sai: ${JSON.stringify(chart)}`);
  });

  return results;
}
