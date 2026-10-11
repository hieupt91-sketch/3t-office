/**
 * VN Office — Writer illustration dialogs (Hình khối / Sơ đồ / Biểu đồ)
 * Ribbon commands must open the Writer picker before insert; cancel inserts nothing.
 */

import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";
import { mapVnCommandToUno } from "../../adapters/libreoffice/common/command-dispatch-mapper.js";
import { globalCommandBus } from "../../platform/commands/command-bus.js";
import { registerAllStandardCommands } from "../../platform/commands/command-definitions.js";
import {
  SHAPE_TYPES,
  DIAGRAM_TYPES,
  renderShapeSvg
} from "../../apps/writer/writer-illustrations.js";

registerAllStandardCommands(globalCommandBus);

function createMockWriterDoc(initialHtml = "<p>Van ban minh hoa</p>") {
  const styleObj = { width: "", minHeight: "", padding: "", setProperty() {} };
  const bodyEl = {
    innerHTML: initialHtml,
    innerText: initialHtml.replace(/<[^>]*>/g, ""),
    style: styleObj,
    dataset: {},
    focus() {},
    contains() { return true; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {}
  };
  const pageEl = {
    style: { ...styleObj },
    dataset: {},
    querySelector(sel) {
      if (sel === ".vno-writer-body") return bodyEl;
      return null;
    },
    querySelectorAll(sel) {
      if (sel === ".vno-writer-body") return [bodyEl];
      return [];
    }
  };
  return { page: pageEl, body: bodyEl };
}

export async function runWriterIllustrationDialogTests() {
  const results = [];
  const test = async (name, fn) => {
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: error.message });
    }
  };

  await test("Writer Illustrations: SHAPE_TYPES có circle và DIAGRAM_TYPES có cycle/hierarchy", () => {
    if (!SHAPE_TYPES.some((item) => item.id === "circle")) {
      throw new Error("Thiếu SHAPE_TYPES.circle");
    }
    if (!DIAGRAM_TYPES.some((item) => item.id === "cycle")) {
      throw new Error("Thiếu DIAGRAM_TYPES.cycle");
    }
    if (!DIAGRAM_TYPES.some((item) => item.id === "hierarchy")) {
      throw new Error("Thiếu DIAGRAM_TYPES.hierarchy");
    }
  });

  await test("Writer Illustrations: lệnh ribbon không có lựa chọn thì mở dialog; không document → hủy, không chèn mặc định", async () => {
    const { page } = createMockWriterDoc();
    const adapter = new WriterAdapter(page);
    const shapeResult = await Promise.race([
      adapter.insertShapeFromCommand(null),
      new Promise((_, reject) => setTimeout(() => reject(new Error("insertShapeFromCommand treo dialog")), 1000))
    ]);
    if (shapeResult !== null) throw new Error(`Hủy hình khối phải trả null, nhận ${shapeResult}`);
    if ((adapter.shapes || []).length !== 0) throw new Error("Hủy Hình khối vẫn chèn chữ nhật mặc định");

    const dispatched = await adapter.handleDispatch(
      mapVnCommandToUno("writer.shape.insert"),
      null,
      "writer.shape.insert"
    );
    if (dispatched !== null) throw new Error("handleDispatch writer.shape.insert không args phải hủy, không chèn");
    if ((adapter.shapes || []).length !== 0) throw new Error("handleDispatch null vẫn chèn hình mặc định");

    const diag = await adapter.insertDiagramFromCommand({});
    if (diag !== null) throw new Error("Hủy sơ đồ phải trả null");
    if ((page.querySelector(".vno-writer-body").innerHTML || "").includes("vno-writer-diagram")) {
      throw new Error("Hủy Sơ đồ vẫn chèn Process 4 bước mặc định");
    }

    const chart = await adapter.insertChartFromCommand(null);
    if (chart !== null) throw new Error("Hủy biểu đồ phải trả null");
    if ((page.querySelector(".vno-writer-body").innerHTML || "").includes("vno-writer-chart")) {
      throw new Error("Hủy Biểu đồ vẫn chèn cột «Không có dữ liệu»");
    }
  });

  await test("Writer Illustrations: bindHandler ribbon execute không args không chèn mặc định", async () => {
    const { page } = createMockWriterDoc();
    const adapter = new WriterAdapter(page);
    globalCommandBus.bindHandler("writer.shape.insert", (args) => adapter.insertShapeFromCommand(args));
    globalCommandBus.bindHandler("writer.diagram.insert", (args) => adapter.insertDiagramFromCommand(args));
    globalCommandBus.bindHandler("writer.chart.insert", (args) => adapter.insertChartFromCommand(args));

    const shapeResult = await globalCommandBus.execute("writer.shape.insert");
    if (shapeResult !== null) throw new Error(`execute shape phải hủy khi không chọn, nhận ${shapeResult}`);
    if ((adapter.shapes || []).length !== 0) throw new Error("execute writer.shape.insert vẫn chèn mặc định");

    await globalCommandBus.execute("writer.diagram.insert");
    await globalCommandBus.execute("writer.chart.insert");
    const html = page.querySelector(".vno-writer-body").innerHTML;
    if (html.includes("vno-writer-diagram") || html.includes("vno-writer-chart")) {
      throw new Error("execute diagram/chart không args vẫn chèn mặc định");
    }
  });

  await test("Writer Illustrations: chọn circle qua command — chèn đúng loại, không phải rectangle mặc định", async () => {
    const { page } = createMockWriterDoc();
    const adapter = new WriterAdapter(page);
    const circleDef = SHAPE_TYPES.find((item) => item.id === "circle");
    const inserted = await adapter.handleDispatch(
      mapVnCommandToUno("writer.shape.insert"),
      { type: "circle", w: circleDef.defaultW, h: circleDef.defaultH },
      "writer.shape.insert"
    );
    if (!inserted || inserted.type !== "circle") {
      throw new Error(`Không chèn circle, nhận ${JSON.stringify(inserted)}`);
    }
    if (inserted.w !== 110 || inserted.h !== 110) {
      throw new Error(`Kích thước circle sai: ${inserted.w}x${inserted.h}, kỳ vọng 110x110`);
    }
    if (inserted.fill !== "#0ea5e9") {
      throw new Error(`Màu circle sai: ${inserted.fill}`);
    }
    if (adapter.shapes.length !== 1 || adapter.shapes[0].type !== "circle") {
      throw new Error("shapes[] không lưu circle");
    }
    const svg = renderShapeSvg(inserted);
    if (!svg.includes("<ellipse")) throw new Error("SVG circle phải là ellipse, không phải rect mặc định");
    if (inserted.type === "rectangle") throw new Error("Vẫn là rectangle mặc định");
  });

  await test("Writer Illustrations: SHAPE_TYPES có triangle và diamond với cấu trúc và kích thước chuẩn", () => {
    const triangleDef = SHAPE_TYPES.find((item) => item.id === "triangle");
    if (!triangleDef) throw new Error("Thiếu SHAPE_TYPES.triangle");
    if (triangleDef.nameVi !== "Hình tam giác" || triangleDef.nameEn !== "Triangle") {
      throw new Error(`Tên triangle sai: vi=${triangleDef.nameVi}, en=${triangleDef.nameEn}`);
    }
    if (triangleDef.defaultW !== 120 || triangleDef.defaultH !== 100) {
      throw new Error(`Kích thước triangle sai: ${triangleDef.defaultW}x${triangleDef.defaultH}`);
    }

    const diamondDef = SHAPE_TYPES.find((item) => item.id === "diamond");
    if (!diamondDef) throw new Error("Thiếu SHAPE_TYPES.diamond");
    if (diamondDef.nameVi !== "Hình thoi" || diamondDef.nameEn !== "Diamond") {
      throw new Error(`Tên diamond sai: vi=${diamondDef.nameVi}, en=${diamondDef.nameEn}`);
    }
    if (diamondDef.defaultW !== 120 || diamondDef.defaultH !== 100) {
      throw new Error(`Kích thước diamond sai: ${diamondDef.defaultW}x${diamondDef.defaultH}`);
    }
  });

  await test("Writer Illustrations: renderShapeSvg sinh thẻ SVG polygon chuẩn cho triangle và diamond", () => {
    // Triangle mặc định
    const svgTri = renderShapeSvg({ type: "triangle" });
    if (!svgTri.includes("<polygon")) throw new Error("SVG triangle phải chứa thẻ polygon");
    if (!svgTri.includes('points="50,4 96,92 4,92"')) throw new Error(`Points triangle sai: ${svgTri}`);
    if (!svgTri.includes('fill="#16a34a"')) throw new Error(`Màu fill mặc định triangle sai: ${svgTri}`);
    if (!svgTri.includes('stroke="#15803d"')) throw new Error(`Màu stroke mặc định triangle sai: ${svgTri}`);
    if (!svgTri.includes('viewBox="0 0 100 100"')) throw new Error(`viewBox triangle sai: ${svgTri}`);

    // Diamond mặc định
    const svgDia = renderShapeSvg({ type: "diamond" });
    if (!svgDia.includes("<polygon")) throw new Error("SVG diamond phải chứa thẻ polygon");
    if (!svgDia.includes('points="50,4 96,50 50,96 4,50"')) throw new Error(`Points diamond sai: ${svgDia}`);
    if (!svgDia.includes('fill="#9333ea"')) throw new Error(`Màu fill mặc định diamond sai: ${svgDia}`);
    if (!svgDia.includes('stroke="#7e22ce"')) throw new Error(`Màu stroke mặc định diamond sai: ${svgDia}`);
    if (!svgDia.includes('viewBox="0 0 100 100"')) throw new Error(`viewBox diamond sai: ${svgDia}`);

    // Custom fill & stroke
    const svgCustomTri = renderShapeSvg({ type: "triangle", fill: "#ff0000", stroke: "#00ff00", strokeWidth: 4 });
    if (!svgCustomTri.includes('fill="#ff0000"') || !svgCustomTri.includes('stroke="#00ff00"') || !svgCustomTri.includes('stroke-width="4"')) {
      throw new Error(`Custom styling triangle không được áp dụng: ${svgCustomTri}`);
    }

    const svgCustomDia = renderShapeSvg({ type: "diamond", fill: "#112233", stroke: "#445566", strokeWidth: 3 });
    if (!svgCustomDia.includes('fill="#112233"') || !svgCustomDia.includes('stroke="#445566"') || !svgCustomDia.includes('stroke-width="3"')) {
      throw new Error(`Custom styling diamond không được áp dụng: ${svgCustomDia}`);
    }
  });

  await test("Writer Illustrations: chọn triangle và diamond qua command — chèn đúng loại và render đúng polygon", async () => {
    const { page } = createMockWriterDoc();
    const adapter = new WriterAdapter(page);
    const triDef = SHAPE_TYPES.find((item) => item.id === "triangle");
    const insertedTri = await adapter.handleDispatch(
      mapVnCommandToUno("writer.shape.insert"),
      { type: "triangle", w: triDef.defaultW, h: triDef.defaultH, fill: "#16a34a", stroke: "#15803d" },
      "writer.shape.insert"
    );
    if (!insertedTri || insertedTri.type !== "triangle") {
      throw new Error(`Không chèn triangle, nhận ${JSON.stringify(insertedTri)}`);
    }
    if (insertedTri.w !== 120 || insertedTri.h !== 100) {
      throw new Error(`Kích thước triangle sai: ${insertedTri.w}x${insertedTri.h}, kỳ vọng 120x100`);
    }
    const svgTri = renderShapeSvg(insertedTri);
    if (!svgTri.includes("<polygon") || !svgTri.includes('points="50,4 96,92 4,92"')) {
      throw new Error("renderShapeSvg(insertedTri) không vẽ đúng tam giác");
    }

    const diaDef = SHAPE_TYPES.find((item) => item.id === "diamond");
    const insertedDia = await adapter.handleDispatch(
      mapVnCommandToUno("writer.shape.insert"),
      { type: "diamond", w: diaDef.defaultW, h: diaDef.defaultH, fill: "#9333ea", stroke: "#7e22ce" },
      "writer.shape.insert"
    );
    if (!insertedDia || insertedDia.type !== "diamond") {
      throw new Error(`Không chèn diamond, nhận ${JSON.stringify(insertedDia)}`);
    }
    if (insertedDia.w !== 120 || insertedDia.h !== 100) {
      throw new Error(`Kích thước diamond sai: ${insertedDia.w}x${insertedDia.h}, kỳ vọng 120x100`);
    }
    const svgDia = renderShapeSvg(insertedDia);
    if (!svgDia.includes("<polygon") || !svgDia.includes('points="50,4 96,50 50,96 4,50"')) {
      throw new Error("renderShapeSvg(insertedDia) không vẽ đúng hình thoi");
    }

    if (adapter.shapes.length !== 2) {
      throw new Error(`shapes[] phải lưu 2 hình, nhận ${adapter.shapes.length}`);
    }
  });

  await test("Writer Illustrations: chọn sơ đồ cycle 5 bước — không phải Process 4 bước mặc định", async () => {
    const { page, body } = createMockWriterDoc();
    const adapter = new WriterAdapter(page);
    const ok = await adapter.handleDispatch(
      mapVnCommandToUno("writer.diagram.insert"),
      { type: "cycle", count: 5 },
      "writer.diagram.insert"
    );
    if (!ok) throw new Error("insertDiagramFromCommand cycle thất bại");
    const html = body.innerHTML;
    if (!html.includes("data-diagram-type=\"cycle\"")) {
      throw new Error(`Thiếu data-diagram-type=cycle: ${html.slice(0, 240)}`);
    }
    if (html.includes("data-diagram-type=\"process\"")) {
      throw new Error("Vẫn chèn Process mặc định");
    }
    if (!html.includes("Sơ đồ chu trình") && !html.includes("Cycle Diagram")) {
      throw new Error("Thiếu tiêu đề chu trình");
    }
    const nodes = html.match(/class="vno-diagram-node"/g) || [];
    if (nodes.length !== 5) throw new Error(`cycle phải có 5 node, nhận ${nodes.length}`);
    if (!html.includes("↻")) throw new Error("cycle thiếu dấu chu trình");
  });

  await test("Writer Illustrations: chọn biểu đồ pie với dữ liệu thật — không phải cột trống", async () => {
    const { page, body } = createMockWriterDoc();
    const adapter = new WriterAdapter(page);
    const ok = await adapter.handleDispatch(
      mapVnCommandToUno("writer.chart.insert"),
      { type: "pie", title: "Doanh thu", labels: ["Bắc", "Nam"], data: [40, 60] },
      "writer.chart.insert"
    );
    if (!ok) throw new Error("insertChartFromCommand pie thất bại");
    const html = body.innerHTML;
    if (!html.includes("vno-writer-chart")) throw new Error("Thiếu khối biểu đồ");
    if (!html.includes('data-chart-type="pie"')) throw new Error(`Không phải pie: ${html.slice(0, 280)}`);
    if (!html.includes("Doanh thu")) throw new Error("Thiếu tiêu đề đã chọn");
    if (html.includes("Không có dữ liệu")) throw new Error("Vẫn chèn biểu đồ trống mặc định");
  });

  await test("Writer Illustrations: API insertShape(null) vẫn chèn trực tiếp (không đi qua dialog command)", () => {
    const { page } = createMockWriterDoc();
    const adapter = new WriterAdapter(page);
    const shape = adapter.insertShape(null);
    if (!shape || shape.type !== "rectangle") {
      throw new Error("insertShape(null) phải giữ API chèn chữ nhật trực tiếp");
    }
  });

  await test("Writer Illustrations: Undo/Redo sau khi chèn qua dialog (circle / hierarchy / line chart)", async () => {
    const { page, body } = createMockWriterDoc("<p>Goc</p>");
    const adapter = new WriterAdapter(page);

    await adapter.insertShapeFromCommand({ type: "circle" });
    if (adapter.shapes[0]?.type !== "circle") throw new Error("Chưa chèn circle trước Undo");
    if (!adapter.undo()) throw new Error("Undo hình khối thất bại");
    if ((adapter.shapes || []).length !== 0) throw new Error("Undo chưa gỡ circle");
    if (!adapter.redo()) throw new Error("Redo hình khối thất bại");
    if (adapter.shapes[0]?.type !== "circle") throw new Error("Redo chưa khôi phục circle");

    await adapter.insertDiagramFromCommand({ type: "hierarchy", count: 3 });
    if (!body.innerHTML.includes("data-diagram-type=\"hierarchy\"")) {
      throw new Error("Chưa chèn hierarchy");
    }
    if (!adapter.undo()) throw new Error("Undo sơ đồ thất bại");
    if (body.innerHTML.includes("vno-writer-diagram")) throw new Error("Undo chưa gỡ sơ đồ");
    if (!adapter.redo()) throw new Error("Redo sơ đồ thất bại");
    if (!body.innerHTML.includes("data-diagram-type=\"hierarchy\"")) {
      throw new Error("Redo chưa khôi phục hierarchy");
    }

    await adapter.insertChartFromCommand({
      chartType: "line",
      title: "San luong",
      labels: ["T1", "T2"],
      data: [10, 20]
    });
    if (!body.innerHTML.includes('data-chart-type="line"')) throw new Error("Chưa chèn line chart");
    if (!adapter.undo()) throw new Error("Undo biểu đồ thất bại");
    if (body.innerHTML.includes("vno-writer-chart")) throw new Error("Undo chưa gỡ biểu đồ");
    if (!adapter.redo()) throw new Error("Redo biểu đồ thất bại");
    if (!body.innerHTML.includes('data-chart-type="line"') || !body.innerHTML.includes("San luong")) {
      throw new Error("Redo chưa khôi phục line chart");
    }
  });

  return results;
}
