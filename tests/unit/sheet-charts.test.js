/** Behavioral tests — real Sheet chart data, rendering, refresh and sheet isolation. */
import { SheetGridController } from "../../apps/sheet/sheet-grid.js";
import { createSheetGridWithSheets } from "./sheet-test-fixtures.js";
import { SheetChartBuilder } from "../../apps/sheet/sheet-chart.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function container() {
  return {
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener() {},
    classList: { add() {}, remove() {} }
  };
}

class FakePanel {
  constructor() {
    this.dataset = {};
    this.style = {};
    this.className = "";
    this._innerHTML = "";
    this.deleteHandler = null;
  }
  set innerHTML(value) { this._innerHTML = String(value); }
  get innerHTML() { return this._innerHTML; }
  querySelector(selector) {
    if (selector !== "[data-chart-delete]") return null;
    return { addEventListener: (_event, handler) => { this.deleteHandler = handler; } };
  }
}

function chartLayer() {
  return {
    children: [],
    set innerHTML(_value) { this.children = []; },
    appendChild(child) { this.children.push(child); return child; }
  };
}

export async function runSheetChartTests() {
  const results = [];
  const test = async (name, callback) => {
    try {
      await callback();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: error.message });
    }
  };
  const originalDocument = globalThis.document;
  globalThis.document = { createElement: () => new FakePanel() };

  try {
    await test("Sheet Charts: openChartBuilder dùng dữ liệu thật của vùng chọn", async () => {
      const grid = createSheetGridWithSheets(container(), ["Dự toán chi phí", "Kế hoạch Q3", "Nhân sự"]);
      await grid.initializeOptionalDocumentFeatures();
      grid.setCellValue("A", 1, "Tháng 1");
      grid.setCellValue("B", 1, 125);
      grid.setCellValue("A", 2, "Tháng 2");
      grid.setCellValue("B", 2, 260);
      grid.selectionRange = { start: { c: "A", r: 1 }, end: { c: "B", r: 2 } };

      const originalModal = SheetChartBuilder.showChartModal;
      let receivedItems;
      try {
        SheetChartBuilder.showChartModal = (items, onInsert, options) => {
          receivedItems = items;
          assert(options.rangeLabel === "A1:B2", "Dialog phải hiển thị đúng nhãn vùng chọn A1:B2");
          onInsert("line");
          return { opened: true };
        };
        await grid.openChartBuilder();
      } finally {
        SheetChartBuilder.showChartModal = originalModal;
      }

      assert(JSON.stringify(receivedItems) === JSON.stringify([
        { label: "Tháng 1", value: 125 },
        { label: "Tháng 2", value: 260 }
      ]), `Dialog nhận sai dữ liệu thật: ${JSON.stringify(receivedItems)}`);
      const chart = grid.getCharts()[0];
      assert(chart?.type === "line", "Callback Chèn phải lưu chart loại line vào state");
      assert(chart.range.start.c === "A" && chart.range.end.c === "B", "Chart phải lưu vùng nguồn A1:B2");
    });

    await test("Sheet Charts: insert render SVG và tự cập nhật khi ô nguồn đổi", async () => {
      const grid = createSheetGridWithSheets(container(), ["Dự toán chi phí", "Kế hoạch Q3", "Nhân sự"]);
      await grid.initializeOptionalDocumentFeatures();
      grid.chartLayer = chartLayer();
      grid.setCellValue("A", 4, "Doanh thu");
      grid.setCellValue("B", 4, 100);
      const chart = grid.insertChart("bar", { start: { c: "A", r: 4 }, end: { c: "B", r: 4 } });
      assert(grid.chartLayer.children.length === 1, "Phải render đúng một chart panel vào DOM");
      assert(grid.chartLayer.children[0].innerHTML.includes('<svg data-chart-type="bar"'), "Chart panel phải chứa SVG bar thật");
      assert(grid.chartLayer.children[0].innerHTML.includes('data-value="100"'), "SVG phải chứa giá trị nguồn 100");

      grid.setCellValue("B", 4, 375);
      assert(chart.data[0] === 375, "State chart phải cập nhật thành 375 khi ô nguồn đổi");
      assert(grid.chartLayer.children[0].innerHTML.includes('data-value="375"'), "SVG phải được vẽ lại với giá trị 375");
      assert(!grid.chartLayer.children[0].innerHTML.includes('data-value="100"'), "SVG cũ không được giữ giá trị 100");
    });

    await test("Sheet Charts: state và DOM không rò rỉ chéo sheet", async () => {
      const grid = createSheetGridWithSheets(container(), ["Dự toán chi phí", "Kế hoạch Q3", "Nhân sự"]);
      await grid.initializeOptionalDocumentFeatures();
      grid.chartLayer = chartLayer();
      grid.setCellValue("A", 1, "Sheet một");
      grid.setCellValue("B", 1, 10);
      grid.insertChart("pie", { start: { c: "A", r: 1 }, end: { c: "B", r: 1 } });
      const firstSheet = grid.activeSheet;

      grid.switchSheet("Kế hoạch Q3");
      assert(grid.getCharts().length === 0, "Sheet thứ hai phải có chart state riêng rỗng");
      assert(grid.chartLayer.children.length === 0, "Chart của sheet đầu không được hiện trên sheet thứ hai");
      grid.setCellValue("A", 1, "Sheet hai");
      grid.setCellValue("B", 1, 99);
      grid.insertChart("area", { start: { c: "A", r: 1 }, end: { c: "B", r: 1 } });

      grid.switchSheet(firstSheet);
      assert(grid.getCharts().length === 1 && grid.getCharts()[0].type === "pie", "Quay lại phải khôi phục đúng chart sheet đầu");
      assert(grid.chartLayer.children.length === 1 && grid.chartLayer.children[0].dataset.sheet === firstSheet, "DOM chỉ được render chart của active sheet");
      assert(grid.chartLayer.children[0].innerHTML.includes('data-value="10"'), "Chart sheet đầu phải giữ dữ liệu riêng 10");
    });

    await test("Sheet Charts: xóa chart loại bỏ state và SVG", async () => {
      const grid = createSheetGridWithSheets(container(), ["Dự toán chi phí", "Kế hoạch Q3", "Nhân sự"]);
      await grid.initializeOptionalDocumentFeatures();
      grid.chartLayer = chartLayer();
      grid.setCellValue("A", 3, 42);
      const chart = grid.insertChart("bar", { start: { c: "A", r: 3 }, end: { c: "A", r: 3 } });
      const panel = grid.chartLayer.children[0];
      assert(panel.dataset.chartId === chart.id && typeof panel.deleteHandler === "function", "Chart render phải có nút xóa gắn đúng id");
      panel.deleteHandler();
      assert(grid.getCharts().length === 0, "Chart đã xóa không được còn trong state");
      assert(grid.chartLayer.children.length === 0, "Chart đã xóa không được còn trong DOM");
    });
  } finally {
    globalThis.document = originalDocument;
  }

  return results;
}
