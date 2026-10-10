/**
 * VN Office — Unit & Behavioral Tests: VN Writer Ribbon Breadth
 * Kiểm thử chi tiết 4 tính năng mở rộng Ribbon VN Writer:
 * 1. Nút Chỉ số dưới / Chỉ số trên (Subscript & Superscript)
 * 2. Nhóm Minh họa: Chèn hình khối (Shape), Sơ đồ (SmartArt/Diagram), Biểu đồ (Chart)
 * 3. Nhóm Định dạng tài liệu: Thư viện Kiểu & Chủ đề (Document Themes)
 * 4. Nút Siêu liên kết (Hyperlink) trên tab Chèn
 */

import { WRITER_COMMANDS } from "../../platform/commands/command-definitions.js";
import { WRITER_RIBBON_TABS } from "../../apps/writer/writer-ribbon.js";
import { ICONS } from "../../platform/ui-kit/icons.js";
import { mapVnCommandToUno, getVnCommand } from "../../adapters/libreoffice/common/command-dispatch-mapper.js";
import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";
import { DOCUMENT_THEMES } from "../../apps/writer/theme-gallery.js";
import { renderShapeSvg, generateDiagramHtml, generateChartHtml } from "../../apps/writer/writer-illustrations.js";
import { viStrings } from "../../platform/i18n/strings-vi.js";
import { enStrings } from "../../platform/i18n/strings-en.js";
import { readFileSync } from "node:fs";

function createMockWriterDoc(initialHtml = "<p>Văn bản kiểm thử ban đầu</p>") {
  const listeners = {};
  const styleObj = {
    fontFamily: "",
    lineHeight: "",
    color: "",
    width: "",
    minHeight: "",
    padding: "",
    setProperty() {}
  };
  const datasetObj = {};

  const bodyEl = {
    innerHTML: initialHtml,
    innerText: initialHtml.replace(/<[^>]*>/g, ""),
    style: styleObj,
    dataset: datasetObj,
    focus() {},
    contains() { return true; },
    setAttribute(k, v) { datasetObj[k] = v; },
    getAttribute(k) { return datasetObj[k] || null; },
    removeAttribute(k) { delete datasetObj[k]; },
    addEventListener(evt, fn) {
      if (!listeners[evt]) listeners[evt] = [];
      listeners[evt].push(fn);
    },
    removeEventListener(evt, fn) {
      if (listeners[evt]) {
        listeners[evt] = listeners[evt].filter(f => f !== fn);
      }
    },
    dispatchEvent(evt) {
      if (listeners[evt.type]) {
        listeners[evt.type].forEach(fn => fn(evt));
      }
    },
    querySelectorAll(sel) {
      const res = [];
      if (sel.includes(".vno-writer-shape-item") && bodyEl.innerHTML.includes("vno-writer-shape-item")) {
        res.push({
          getAttribute: (attr) => attr === "data-shape-id" ? "shape-1" : null,
          classList: {
            add() {},
            remove() {},
            toggle() {}
          },
          querySelector() { return null; },
          remove() {}
        });
      }
      return res;
    },
    querySelector(sel) {
      if (sel.includes(".vno-writer-shape-item") && bodyEl.innerHTML.includes("vno-writer-shape-item")) {
        return {
          getAttribute: (attr) => attr === "data-shape-id" ? "shape-1" : null,
          classList: { add() {}, remove() {}, toggle() {} },
          remove() {}
        };
      }
      if (sel.includes("shape-layer")) {
        return {
          innerHTML: "",
          appendChild() {}
        };
      }
      return null;
    }
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

export async function runWriterRibbonBreadthTests() {
  const results = [];

  function assert(name, condition, errorMsg = "") {
    if (condition) {
      results.push({ name, pass: true });
    } else {
      results.push({ name, pass: false, error: errorMsg });
    }
  }

  (() => {
    const body = { contains: () => true };
    const plain = { nodeType: 1, tagName: "SPAN", style: {}, parentElement: body };
    const underlined = { nodeType: 1, tagName: "U", style: {}, parentElement: body };
    const adapter = Object.create(WriterAdapter.prototype);
    adapter.bodyDom = body;
    const originalDocument = globalThis.document;
    const originalWindow = globalThis.window;
    try {
      globalThis.document = { queryCommandState: () => true };
      globalThis.window = { getSelection: () => ({ anchorNode: plain }), getComputedStyle: () => ({ textDecorationLine: "none" }) };
      const staleBrowserStateIsIgnored = adapter._readInlineCommandState("underline") === false;
      globalThis.window = { getSelection: () => ({ anchorNode: underlined }), getComputedStyle: () => ({ textDecorationLine: "underline", textDecorationStyle: "solid" }) };
      const realUnderlineIsDetected = adapter._readInlineCommandState("underline") === true;
      const spellNode = { nodeType: 1, tagName: "SPAN", style: {}, classList: { contains: c => c === "vno-spelling-uncertain" }, parentElement: body };
      globalThis.window = { getSelection: () => ({ anchorNode: spellNode }), getComputedStyle: () => ({ textDecorationLine: "underline", textDecorationStyle: "wavy" }) };
      const wavySpellUnderlineIsIgnored = adapter._readInlineCommandState("underline") === false;
      assert(
        "Writer Home: trạng thái nút Gạch chân theo DOM thật khi Chromium giữ queryCommandState cũ",
        staleBrowserStateIsIgnored && realUnderlineIsDetected && wavySpellUnderlineIsIgnored,
        "Nút Gạch chân không tắt/bật theo định dạng thật của vùng chọn"
      );
    } finally {
      if (originalDocument === undefined) delete globalThis.document; else globalThis.document = originalDocument;
      if (originalWindow === undefined) delete globalThis.window; else globalThis.window = originalWindow;
    }
  })();

  // =========================================================================
  // PHẦN 1: Chỉ số dưới (Subscript) và Chỉ số trên (Superscript)
  // =========================================================================
  (() => {
    const subCmd = WRITER_COMMANDS.find(c => c.id === "writer.text.subscript");
    const supCmd = WRITER_COMMANDS.find(c => c.id === "writer.text.superscript");

    assert(
      "Writer Ribbon: writer.text.subscript và writer.text.superscript được định nghĩa chuẩn",
      subCmd && supCmd && subCmd.icon === "subscript" && supCmd.icon === "superscript",
      "Thiếu khai báo command hoặc icon không khớp"
    );

    const unoSub = mapVnCommandToUno("writer.text.subscript");
    const unoSup = mapVnCommandToUno("writer.text.superscript");
    const revSub = getVnCommand(".uno:Subscript");
    const revSup = getVnCommand(".uno:SuperScript");

    assert(
      "Writer Ribbon: Ánh xạ 2 chiều .uno:Subscript và .uno:SuperScript chuẩn xác",
      unoSub === ".uno:Subscript" && unoSup === ".uno:SuperScript" &&
      revSub === "writer.text.subscript" && revSup === "writer.text.superscript",
      `Ánh xạ lỗi: unoSub=${unoSub}, unoSup=${unoSup}`
    );

    assert(
      "Writer Ribbon: Icon subscript và superscript là SVG vector chuẩn Office",
      typeof ICONS.subscript === "string" && ICONS.subscript.includes("<svg") &&
      typeof ICONS.superscript === "string" && ICONS.superscript.includes("<svg"),
      "Icon subscript hoặc superscript không phải chuỗi SVG hợp lệ"
    );

    const homeTab = WRITER_RIBBON_TABS.find(t => t.id === "home");
    const fontGroup = homeTab?.groups?.find(g => g.id === "font");
    const groupJson = JSON.stringify(fontGroup?.items || []);
    const hasSubInRibbon = groupJson.includes("writer.text.subscript");
    const hasSupInRibbon = groupJson.includes("writer.text.superscript");

    assert(
      "Writer Ribbon: Nút Subscript & Superscript hiện diện trực tiếp trong nhóm Phông chữ (Trang đầu)",
      hasSubInRibbon && hasSupInRibbon,
      "Không tìm thấy subscript/superscript trong WRITER_RIBBON_TABS[home].groups[font]"
    );
  })();

  // =========================================================================
  // PHẦN 2: Nhóm Minh họa (Illustrations: Shape, Diagram, Chart)
  // =========================================================================
  (() => {
    const shapeCmd = WRITER_COMMANDS.find(c => c.id === "writer.shape.insert");
    const diagCmd = WRITER_COMMANDS.find(c => c.id === "writer.diagram.insert");
    const chartCmd = WRITER_COMMANDS.find(c => c.id === "writer.chart.insert");

    assert(
      "Writer Illustrations: 3 lệnh Minh họa được khai báo trong WRITER_COMMANDS",
      shapeCmd && diagCmd && chartCmd,
      "Thiếu ít nhất một lệnh trong WRITER_COMMANDS"
    );

    const unoShape = mapVnCommandToUno("writer.shape.insert");
    const unoDiag = mapVnCommandToUno("writer.diagram.insert");
    const unoChart = mapVnCommandToUno("writer.chart.insert");

    assert(
      "Writer Illustrations: Ánh xạ UNO chuẩn cho shape, diagram, chart",
      unoShape === ".uno:InsertDraw" && unoDiag === ".uno:InsertDraw" && unoChart === ".uno:InsertObjectChart",
      `Ánh xạ UNO không đúng: shape=${unoShape}, diag=${unoDiag}, chart=${unoChart}`
    );

    assert(
      "Writer Illustrations: Icon shape, diagram, chart là vector SVG chuẩn",
      typeof ICONS.shape === "string" && ICONS.shape.includes("<svg") &&
      typeof ICONS.diagram === "string" && ICONS.diagram.includes("<svg") &&
      typeof ICONS.chart === "string" && ICONS.chart.includes("<svg"),
      "Icon shape, diagram hoặc chart thiếu thẻ SVG"
    );

    const insertTab = WRITER_RIBBON_TABS.find(t => t.id === "insert");
    const illusGroup = insertTab?.groups?.find(g => g.id === "illustrations");

    const illusHasCommand = (id) => illusGroup?.items?.some(it => it.commandId === id);
    assert(
      "Writer Illustrations: Nhóm 'Minh họa' hiện diện trên tab Chèn với đủ 3 nút",
      illusGroup && illusHasCommand("writer.shape.insert") &&
      illusHasCommand("writer.diagram.insert") &&
      illusHasCommand("writer.chart.insert"),
      "Nhóm illustrations không đầy đủ trên tab Chèn"
    );
  })();

  // Dispatch & Backend Handler Test: Shapes, Diagrams, Charts
  (() => {
    const { page, body } = createMockWriterDoc();
    const adapter = new WriterAdapter(page);

    // Chèn hình khối với options = null an toàn (Lesson 3)
    const shape1 = adapter.insertShape(null);
    assert(
      "Writer Illustrations: insertShape an toàn tuyệt đối khi options là null",
      typeof shape1 === "object" && shape1.id && adapter.shapes.length === 1,
      "insertShape(null) thất bại"
    );

    // Chèn hình chữ nhật bo tròn tùy biến
    const shape2 = adapter.insertShape({ shapeType: "round-rect", width: 140, height: 70, fill: "#fef3c7" });
    assert(
      "Writer Illustrations: insertShape lưu đúng thông số loại, kích thước và màu nền",
      shape2.type === "round-rect" && shape2.width === 140 && shape2.height === 70 && shape2.fill === "#fef3c7",
      "insertShape không lưu đúng thông số cấu hình"
    );

    // Render SVG hình khối
    const svgRect = renderShapeSvg(shape2);
    assert(
      "Writer Illustrations: renderShapeSvg sinh thẻ SVG chuẩn với rx, ry cho round-rect",
      svgRect.includes("<svg") && svgRect.includes("rx=\"8\""),
      "renderShapeSvg không sinh đúng thuộc tính bo góc"
    );

    // Xóa hình khối
    const deleted = adapter.deleteShape(shape1.id);
    assert(
      "Writer Illustrations: deleteShape loại bỏ đúng hình theo ID và giữ lại các hình khác",
      deleted && adapter.shapes.length === 1 && adapter.shapes[0].id === shape2.id,
      "deleteShape không hoạt động chính xác"
    );

    // Chèn Sơ đồ (SmartArt)
    const diagHtml = generateDiagramHtml({
      diagramType: "process",
      title: "Quy trình xử lý",
      nodes: ["Bước 1", "Bước 2", "Bước 3"]
    });
    assert(
      "Writer Illustrations: generateDiagramHtml tạo đúng các node và mũi tên kết nối",
      diagHtml.includes("Quy trình xử lý") && diagHtml.includes("Bước 1") &&
      diagHtml.includes("Bước 2") && diagHtml.includes("Bước 3") && diagHtml.includes("→"),
      "generateDiagramHtml thiếu node hoặc mũi tên liên kết"
    );

    // Chèn Biểu đồ (Chart)
    const chartHtml = generateChartHtml({
      chartType: "bar",
      title: "Doanh số quý",
      categories: ["Q1", "Q2", "Q3"],
      values: [50, 75, 100]
    });
    assert(
      "Writer Illustrations: generateChartHtml tạo biểu đồ SVG trực quan với cột và nhãn",
      chartHtml.includes("Doanh số quý") && chartHtml.includes("<svg") && chartHtml.includes("<rect"),
      "generateChartHtml không sinh được cấu trúc SVG hoàn chỉnh"
    );

    // Chèn diagram & chart qua adapter
    const diagInserted = adapter.insertDiagram({ diagramType: "cycle" });
    const chartInserted = adapter.insertChart({ chartType: "line" });
    assert(
      "Writer Illustrations: adapter.insertDiagram và adapter.insertChart chèn thẻ vào bodyDom thành công",
      diagInserted && chartInserted && body.innerHTML.includes("vno-writer-diagram") && body.innerHTML.includes("vno-writer-chart"),
      "insertDiagram hoặc insertChart không chèn vào nội dung body"
    );
  })();

  // =========================================================================
  // PHẦN 3: Nhóm Định dạng tài liệu (Document Themes)
  // =========================================================================
  (() => {
    const themeCmd = WRITER_COMMANDS.find(c => c.id === "writer.design.themeGallery");
    assert(
      "Writer Themes: Lệnh writer.design.themeGallery được định nghĩa chuẩn",
      themeCmd && themeCmd.icon === "themeGallery",
      "writer.design.themeGallery thiếu hoặc sai icon"
    );

    const unoTheme = mapVnCommandToUno("writer.design.themeGallery");
    assert(
      "Writer Themes: Ánh xạ UNO .uno:PageTheme chuẩn xác",
      unoTheme === ".uno:PageTheme",
      `Ánh xạ UNO lỗi: ${unoTheme}`
    );

    assert(
      "Writer Themes: Icon themeGallery là SVG vector đa sắc chất lượng cao",
      typeof ICONS.themeGallery === "string" && ICONS.themeGallery.includes("<svg"),
      "Icon themeGallery không phải chuỗi SVG hợp lệ"
    );

    const designTab = WRITER_RIBBON_TABS.find(t => t.id === "design");
    const formattingGroup = designTab?.groups?.find(g => g.id === "documentFormatting");
    assert(
      "Writer Themes: Nhóm 'Định dạng tài liệu' hiện diện trên tab Thiết kế với nút themeGallery",
      formattingGroup && formattingGroup.items?.some(it => it.commandId === "writer.design.themeGallery"),
      "Thiếu nhóm documentFormatting hoặc nút themeGallery trên tab Thiết kế"
    );

    assert(
      "Writer Themes: Cung cấp tối thiểu 5 chủ đề văn bản chuẩn Office & Hành chính Việt Nam",
      Array.isArray(DOCUMENT_THEMES) && DOCUMENT_THEMES.length >= 5,
      `Chỉ có ${DOCUMENT_THEMES?.length || 0} chủ đề, yêu cầu tối thiểu 5`
    );

    // Kiểm tra từng theme có đủ thuộc tính typography và màu sắc
    const hasValidProps = DOCUMENT_THEMES.every(th =>
      th.id && th.nameVi && th.nameEn && th.fontFamily && th.bodyColor &&
      th.h1Color && th.h2Color && th.paraSpacing && th.lineHeight
    );
    assert(
      "Writer Themes: Tất cả các chủ đề đều có đầy đủ cấu hình phông chữ, màu sắc và dãn dòng",
      hasValidProps,
      "Có chủ đề thiếu thuộc tính bắt buộc"
    );

    const themeGallerySource = readFileSync(new URL("../../apps/writer/theme-gallery.js", import.meta.url), "utf8");
    const writerCss = readFileSync(new URL("../../apps/writer/writer.css", import.meta.url), "utf8");
    const elegantPreview = DOCUMENT_THEMES.find(theme => theme.id === "elegant")?.previewSample;
    assert(
      "Writer Themes: mẫu Trang nhã giữ tiếng Việt và đặt font/khoảng chữ riêng cho dòng xem trước",
      elegantPreview?.startsWith("Ấn bản") && themeGallerySource.includes("vno-theme-card-preview-text") &&
        /\.vno-theme-card-preview-text\s*\{[^}]*font-family:\s*Arial,\s*\"Noto Sans\",\s*sans-serif;[^}]*letter-spacing:\s*normal;/s.test(writerCss),
      "Dòng xem trước Elegant cần font có dấu tiếng Việt và letter-spacing bình thường"
    );

    // Áp dụng chủ đề và kiểm tra snapshot undo/redo
    const { page, body } = createMockWriterDoc("<p>Đoạn văn áp dụng chủ đề</p>");
    const adapter = new WriterAdapter(page);

    adapter.applyDocumentTheme("modern", true);
    assert(
      "Writer Themes: applyDocumentTheme đổi documentTheme sang 'modern' và cập nhật style/dataset",
      adapter.documentTheme === "modern" && body.dataset.vnoTheme === "modern",
      "applyDocumentTheme không cập nhật state hoặc dataset"
    );

    // Hoàn tác đưa về chủ đề cũ
    const canUndo = adapter.canUndo();
    const undoRes = adapter.undo();
    assert(
      "Writer Themes: Hoàn tác (Undo) phục hồi chủ đề văn bản ban đầu trọn vẹn",
      canUndo && undoRes && adapter.documentTheme === "office",
      "Undo thay đổi chủ đề tài liệu thất bại"
    );

    // Làm lại khôi phục chủ đề modern
    const redoRes = adapter.redo();
    assert(
      "Writer Themes: Làm lại (Redo) khôi phục chủ đề modern thành công",
      redoRes && adapter.documentTheme === "modern",
      "Redo thay đổi chủ đề tài liệu thất bại"
    );
  })();

  // =========================================================================
  // PHẦN 4: Siêu liên kết (Hyperlink) trên tab Chèn
  // =========================================================================
  (() => {
    const insertTab = WRITER_RIBBON_TABS.find(t => t.id === "insert");
    const linksGroup = insertTab?.groups?.find(g => g.id === "links");

    assert(
      "Writer Hyperlink: Nhóm 'Liên kết' hiện diện trên tab Chèn với nút common.edit.hyperlink",
      linksGroup && linksGroup.items?.some(it => it.commandId === "common.edit.hyperlink"),
      "Không tìm thấy nhóm links hoặc nút common.edit.hyperlink trên tab Chèn"
    );

    assert(
      "Writer Hyperlink: Icon hyperlink là SVG vector chuẩn Office xích liên kết",
      typeof ICONS.hyperlink === "string" && ICONS.hyperlink.includes("<svg"),
      "Icon hyperlink không hợp lệ"
    );

    // Chèn hyperlink vào tài liệu
    const { page, body } = createMockWriterDoc("<p>Xem chi tiết tại </p>");
    const adapter = new WriterAdapter(page);

    // options = null an toàn
    const linkNull = adapter.insertHyperlink(null);
    assert(
      "Writer Hyperlink: insertHyperlink an toàn tuyệt đối khi options là null",
      linkNull === true && body.innerHTML.includes("https://"),
      "insertHyperlink(null) thất bại"
    );

    // Chèn link có url và text cụ thể
    adapter.insertHyperlink({ url: "https://vnoffice.vn", text: "Văn phòng Việt Nam" });
    assert(
      "Writer Hyperlink: Chèn thẻ <a href='...'> chuẩn với thuộc tính target='_blank'",
      body.innerHTML.includes("https://vnoffice.vn") && body.innerHTML.includes("Văn phòng Việt Nam") &&
      body.innerHTML.includes("target=\"_blank\""),
      "insertHyperlink không sinh đúng thẻ <a> hoặc thuộc tính"
    );
  })();

  // =========================================================================
  // PHẦN 5: Đa ngôn ngữ (Bilingual i18n VI/EN) cho các nhóm và nút mới
  // =========================================================================
  (() => {
    const requiredCommands = [
      "writer.text.subscript",
      "writer.text.superscript",
      "writer.shape.insert",
      "writer.diagram.insert",
      "writer.chart.insert",
      "writer.design.themeGallery",
      "common.edit.hyperlink"
    ];

    const missingViCmds = requiredCommands.filter(id => !viStrings.commands[id] || !viStrings.commands[id].label);
    const missingEnCmds = requiredCommands.filter(id => !enStrings.commands[id] || !enStrings.commands[id].label);

    assert(
      "Writer i18n: Tất cả 7 lệnh mới có đầy đủ bản dịch nhãn và gợi ý song ngữ VI/EN",
      missingViCmds.length === 0 && missingEnCmds.length === 0,
      `Thiếu bản dịch command: VI=[${missingViCmds}], EN=[${missingEnCmds}]`
    );

    const requiredGroups = ["illustrations", "links", "documentFormatting", "tables"];
    const missingViGroups = requiredGroups.filter(g => !viStrings.writerRibbon?.group?.[g]);
    const missingEnGroups = requiredGroups.filter(g => !enStrings.writerRibbon?.group?.[g]);

    assert(
      "Writer i18n: Tất cả các nhóm Ribbon mới (illustrations, links, documentFormatting) có bản dịch song ngữ",
      missingViGroups.length === 0 && missingEnGroups.length === 0,
      `Thiếu bản dịch nhóm ribbon: VI=[${missingViGroups}], EN=[${missingEnGroups}]`
    );
  })();

  return results;
}
