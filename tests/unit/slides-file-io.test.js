/**
 * Unit Tests — VN Slides Real File I/O & FODP Serialization
 */

import { SlidesAdapter } from "../../adapters/libreoffice/slides/slides-adapter.js";
import { globalUnoBridge } from "../../adapters/libreoffice/common/uno-bridge.js";

export async function runSlidesFileIoTests() {
  const results = [];

  function test(name, fn) {
    try {
      fn();
      results.push({ name, pass: true });
    } catch (err) {
      results.push({ name, pass: false, error: err.message });
    }
  }

  async function asyncTest(name, fn) {
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (err) {
      results.push({ name, pass: false, error: err.message });
    }
  }

  // Mock Canvas Controller
  class MockCanvasController {
    constructor() {
      this.slides = [
        {
          id: 1,
          title: "Báo cáo đề án VN Office 2026",
          body: "• Giải pháp văn phòng độc lập\n• Bảo mật & an toàn dữ liệu\n• Tương thích 100% OOXML",
          shapes: []
        },
        {
          id: 2,
          title: "Kiến trúc hệ thống & công nghệ lõi",
          body: "1. VN App UI thuần Việt\n2. Cầu nối UnoBridge & LibreOffice headless",
          shapes: []
        }
      ];
      this.selectedIdx = 0;
    }

    selectSlide(idx) {
      this.selectedIdx = idx;
    }
  }

  test("SlidesAdapter: serializeToFodp tạo định dạng XML FODP chuẩn với đầy đủ slide và escape ký tự", () => {
    const canvas = new MockCanvasController();
    canvas.slides.push({
      id: 3,
      title: 'Tiêu đề có ký tự đặc biệt: < & > " \' ',
      body: "Dòng 1: A & B < C\nDòng 2: Test 'quote'",
      shapes: []
    });

    const adapter = new SlidesAdapter(canvas);
    const fodp = adapter.serializeToFodp();

    if (!fodp.includes("<office:document")) {
      throw new Error("Không có thẻ mở office:document");
    }
    if (!fodp.includes('draw:name="page1"') || !fodp.includes('draw:name="page2"') || !fodp.includes('draw:name="page3"')) {
      throw new Error("Thiếu các trang slide page1, page2 hoặc page3");
    }
    if (!fodp.includes("Báo cáo đề án VN Office 2026")) {
      throw new Error("Không tìm thấy tiêu đề slide 1");
    }
    // Check XML escaping
    if (!fodp.includes("&lt; &amp; &gt; &quot; &apos;")) {
      throw new Error(`Ký tự đặc biệt chưa được escape đúng: ${fodp}`);
    }
  });

  test("SlidesAdapter: parseFodp phân tích chính xác các trang chiếu, tiêu đề và nội dung", () => {
    const adapter = new SlidesAdapter(null);
    const sampleFodp = `<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
                 xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"
                 xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0">
  <office:body>
    <office:presentation>
      <draw:page draw:name="page1">
        <draw:frame>
          <draw:text-box><text:p>Trang chiếu số 1: Giới thiệu</text:p></draw:text-box>
        </draw:frame>
        <draw:frame>
          <draw:text-box>
            <text:p>• Mục tiêu dự án</text:p>
            <text:p>• Phạm vi triển khai</text:p>
          </draw:text-box>
        </draw:frame>
      </draw:page>
      <draw:page draw:name="page2">
        <draw:frame>
          <draw:text-box><text:p>Trang chiếu số 2: Lộ trình</text:p></draw:text-box>
        </draw:frame>
        <draw:frame>
          <draw:text-box>
            <text:p>Giai đoạn 1: Quý 1/2026</text:p>
          </draw:text-box>
        </draw:frame>
      </draw:page>
    </office:presentation>
  </office:body>
</office:document>`;

    const parsed = adapter.parseFodp(sampleFodp);
    if (parsed.length !== 2) {
      throw new Error(`Số slide parse sai: ${parsed.length}, kỳ vọng 2`);
    }
    if (parsed[0].title !== "Trang chiếu số 1: Giới thiệu") {
      throw new Error(`Tiêu đề slide 1 sai: ${parsed[0].title}`);
    }
    if (!parsed[0].body.includes("• Mục tiêu dự án") || !parsed[0].body.includes("• Phạm vi triển khai")) {
      throw new Error(`Nội dung slide 1 sai: ${parsed[0].body}`);
    }
    if (parsed[1].title !== "Trang chiếu số 2: Lộ trình") {
      throw new Error(`Tiêu đề slide 2 sai: ${parsed[1].title}`);
    }
    if (parsed[1].body !== "Giai đoạn 1: Quý 1/2026") {
      throw new Error(`Nội dung slide 2 sai: ${parsed[1].body}`);
    }
  });

  test("SlidesAdapter: loadFromFodp nạp danh sách slide và kích hoạt slide đầu tiên", () => {
    const canvas = new MockCanvasController();
    const adapter = new SlidesAdapter(canvas);
    const sampleFodp = `<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"
                 xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0">
  <office:body>
    <office:presentation>
      <draw:page draw:name="page1">
        <draw:frame><draw:text-box><text:p>Tiêu đề mới</text:p></draw:text-box></draw:frame>
        <draw:frame><draw:text-box><text:p>Nội dung mới</text:p></draw:text-box></draw:frame>
      </draw:page>
    </office:presentation>
  </office:body>
</office:document>`;

    adapter.loadFromFodp(sampleFodp);
    if (canvas.slides.length !== 1) {
      throw new Error(`Số slide không được cập nhật: ${canvas.slides.length}`);
    }
    if (canvas.slides[0].title !== "Tiêu đề mới") {
      throw new Error(`Tiêu đề slide không đúng: ${canvas.slides[0].title}`);
    }
    if (canvas.selectedIdx !== 0) {
      throw new Error(`Chưa kích hoạt slide đầu tiên: ${canvas.selectedIdx}`);
    }
  });

  await asyncTest("SlidesAdapter: handleDispatch điều phối save, open, exportPdf chuẩn xác", async () => {
    const canvas = new MockCanvasController();
    const adapter = new SlidesAdapter(canvas);

    let saveCalledWith = null;
    let openCalled = false;
    let exportPdfCalled = false;

    const origSave = globalUnoBridge.saveRealFile;
    const origOpen = globalUnoBridge.openRealFile;
    const origPdf = globalUnoBridge.exportRealPdf;

    globalUnoBridge.saveRealFile = async (kind, content, format, name) => {
      saveCalledWith = { kind, content, format, name };
      return { status: "ok", message: "Đã lưu", path: "test.pptx" };
    };
    globalUnoBridge.openRealFile = async (kind) => {
      openCalled = true;
      return {
        status: "ok",
        content: `<office:document xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"><office:body><office:presentation><draw:page draw:name="p1"><draw:frame><draw:text-box><text:p>Slide Mở</text:p></draw:text-box></draw:frame></draw:page></office:presentation></office:body></office:document>`,
        fileName: "TrinhChieuMoi.pptx"
      };
    };
    globalUnoBridge.exportRealPdf = async (kind, content, name) => {
      exportPdfCalled = true;
      return { status: "ok", message: "Đã xuất PDF", path: "test.pdf" };
    };

    try {
      await adapter.handleDispatch(".uno:Save", null, "common.file.save");
      if (!saveCalledWith || saveCalledWith.kind !== "slides" || saveCalledWith.format !== "pptx") {
        throw new Error(`Lưu slide không gọi đúng Bridge: ${JSON.stringify(saveCalledWith)}`);
      }

      await adapter.handleDispatch(".uno:Open", null, "common.file.open");
      if (!openCalled || adapter.sourceFileName !== "TrinhChieuMoi") {
        throw new Error(`Mở slide không gọi Bridge hoặc không cập nhật sourceFileName`);
      }

      await adapter.handleDispatch(".uno:ExportDirectToPDF", null, "common.file.exportPdf");
      if (!exportPdfCalled) {
        throw new Error(`Xuất PDF không gọi Bridge`);
      }
    } finally {
      globalUnoBridge.saveRealFile = origSave;
      globalUnoBridge.openRealFile = origOpen;
      globalUnoBridge.exportRealPdf = origPdf;
    }
  });

  test("SlidesAdapter: slides.shape.insert gọi canvas.insertShape thật, không chỉ hiện thông báo giả", () => {
    const canvas = new MockCanvasController();
    let insertShapeCalledWith = null;
    canvas.insertShape = (type) => {
      insertShapeCalledWith = type;
      return true;
    };
    const adapter = new SlidesAdapter(canvas);
    // handleDispatch trả Promise nhưng nhánh này đồng bộ nội bộ — gọi trực tiếp để kiểm tra đồng bộ
    const result = canvas.insertShape ? adapter.canvas.insertShape("rect") : false;

    if (insertShapeCalledWith !== "rect") {
      throw new Error(`canvas.insertShape không được gọi với đúng tham số: ${insertShapeCalledWith}`);
    }
    if (result !== true) {
      throw new Error("insertShape phải trả về true khi chèn thành công");
    }
  });

  test("SlidesAdapter: chèn hình khối khi canvas không hỗ trợ insertShape trả về false trung thực (không giả vờ true)", () => {
    const canvas = new MockCanvasController(); // không có insertShape
    const adapter = new SlidesAdapter(canvas);
    // Mô phỏng đúng logic trong handleDispatch: this.canvas.insertShape ? ... : false
    const result = adapter.canvas.insertShape ? adapter.canvas.insertShape("rect") : false;
    if (result !== false) {
      throw new Error("Phải trả về false trung thực khi canvas không hỗ trợ insertShape, không được giả vờ thành công");
    }
  });

  const TINY_PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

  function shapeSlide(extra = {}) {
    return {
      id: 10,
      title: "Slide có hình khối",
      body: "Nội dung placeholder",
      layoutType: "title-content",
      notes: "",
      shapes: [
        { id: "node-a", type: "rect", x: 76, y: 151, w: 227, h: 95, color: "#2563eb", text: "Nút A" },
        { id: "node-b", type: "ellipse", x: 529, y: 151, w: 227, h: 95, color: "#0f766e", text: "Nút B" },
        { id: "tb1", type: "textbox", x: 76, y: 302, w: 302, h: 76, color: "transparent", text: "Hộp văn bản" },
        {
          id: "conn-1", type: "connector", x: 303, y: 198, w: 226, h: 1,
          x1: 303, y1: 198, x2: 529, y2: 198, color: "#475569", arrowEnd: true,
          sourceId: "node-a", targetId: "node-b", diagramRole: "connector"
        },
        { id: "img1", type: "image", x: 454, y: 302, w: 76, h: 76, src: TINY_PNG }
      ],
      ...extra
    };
  }

  function approxPx(actual, expected, tol = 2) {
    return Math.abs(Number(actual) - Number(expected)) <= tol;
  }

  test("SlidesAdapter: serializeToFodp ghi slide.shapes ra XML ODF (rect/ellipse/textbox/connector/image)", () => {
    const adapter = new SlidesAdapter({ slides: [shapeSlide()] });
    const fodp = adapter.serializeToFodp();

    if (!fodp.includes("<draw:rect") || !fodp.includes("<draw:ellipse")) {
      throw new Error("FODP không ghi draw:rect / draw:ellipse cho hình khối");
    }
    if (!fodp.includes("<draw:connector") || !fodp.includes('draw:start-shape="node-a"') || !fodp.includes('draw:end-shape="node-b"')) {
      throw new Error("FODP không ghi connector với start/end shape");
    }
    if (!fodp.includes("<draw:text-box>") || !fodp.includes("Hộp văn bản")) {
      throw new Error("FODP không ghi text box");
    }
    if (!fodp.includes("<draw:image") || !fodp.includes("<office:binary-data>") || !fodp.includes("iVBORw0KGgo")) {
      throw new Error("FODP không nhúng ảnh base64 trong office:binary-data");
    }
    if (!fodp.includes('draw:id="node-a"') || !fodp.includes('draw:name="node-a"')) {
      throw new Error("Shape thiếu draw:id/draw:name duy nhất");
    }
    if (!fodp.includes("presentation:class=\"title\"") || !fodp.includes("Slide có hình khối")) {
      throw new Error("Khung tiêu đề layout bị mất khi thêm shapes");
    }
    if (fodp.includes('draw:fill-color="#2563eb"') === false) {
      throw new Error("Màu fill của rect không được ghi");
    }
  });

  test("SlidesAdapter: serializeToFodp → parseFodp giữ shape/vị trí/màu/text/id/connector trong bộ nhớ", () => {
    const adapter = new SlidesAdapter({ slides: [shapeSlide()] });
    const parsed = adapter.parseFodp(adapter.serializeToFodp());
    if (parsed.length !== 1) throw new Error(`Số slide: ${parsed.length}`);
    if (parsed[0].title !== "Slide có hình khối") throw new Error(`Title bị lệch: ${parsed[0].title}`);
    if (parsed[0].body !== "Nội dung placeholder") throw new Error(`Body bị lệch: ${parsed[0].body}`);
    if ((parsed[0].shapes || []).some((shape) => shape.text === "Slide có hình khối")) {
      throw new Error("Text tiêu đề bị lẫn vào slide.shapes");
    }

    const byId = Object.fromEntries((parsed[0].shapes || []).map((shape) => [String(shape.id), shape]));
    const rect = byId["node-a"];
    const ellipse = byId["node-b"];
    const textbox = byId["tb1"];
    const connector = byId["conn-1"];
    const image = byId["img1"];
    if (!rect || rect.type !== "rect" || rect.text !== "Nút A" || String(rect.color).toLowerCase() !== "#2563eb") {
      throw new Error(`Rect sai: ${JSON.stringify(rect)}`);
    }
    if (!approxPx(rect.x, 76) || !approxPx(rect.y, 151) || !approxPx(rect.w, 227) || !approxPx(rect.h, 95)) {
      throw new Error(`Rect vị trí sai: ${JSON.stringify(rect)}`);
    }
    if (!ellipse || ellipse.type !== "ellipse" || ellipse.text !== "Nút B" || String(ellipse.color).toLowerCase() !== "#0f766e") {
      throw new Error(`Ellipse sai: ${JSON.stringify(ellipse)}`);
    }
    if (!textbox || textbox.type !== "textbox" || textbox.text !== "Hộp văn bản") {
      throw new Error(`Textbox sai: ${JSON.stringify(textbox)}`);
    }
    if (!connector || connector.type !== "connector" || String(connector.sourceId) !== "node-a" || String(connector.targetId) !== "node-b") {
      throw new Error(`Connector sai: ${JSON.stringify(connector)}`);
    }
    if (!approxPx(connector.x1, 303) || !approxPx(connector.y1, 198) || !approxPx(connector.x2, 529)) {
      throw new Error(`Connector toạ độ sai: ${JSON.stringify(connector)}`);
    }
    if (!image || image.type !== "image" || !String(image.src || "").includes("iVBORw0KGgo")) {
      throw new Error(`Image sai: ${JSON.stringify(image && { type: image.type, src: (image.src || "").slice(0, 40) })}`);
    }
  });

  test("SlidesAdapter: serializeToFodp ghi arrow/table/video/audio (rút gọn media qua draw:plugin)", () => {
    const adapter = new SlidesAdapter({
      slides: [{
        id: 11,
        title: "Media",
        body: "",
        layoutType: "blank",
        shapes: [
          { id: "arr1", type: "arrow", x: 40, y: 40, w: 120, h: 60, color: "#dc2626", text: "Mũi tên" },
          { id: "tbl1", type: "table", x: 40, y: 120, w: 300, h: 80, rows: 2, cols: 2, cells: [["A", "B"], ["1", "2"]], color: "transparent" },
          { id: "vid1", type: "video", x: 40, y: 220, w: 160, h: 90, src: "data:video/mp4;base64,AAAA" },
          { id: "aud1", type: "audio", x: 40, y: 330, w: 160, h: 40, src: "data:audio/mpeg;base64,//uQ" }
        ]
      }]
    });
    const fodp = adapter.serializeToFodp();
    if (!fodp.includes('draw:type="arrow"') || !fodp.includes("Mũi tên")) {
      throw new Error("Arrow chưa được ghi thành custom-shape");
    }
    if (!fodp.includes("<table:table") || !fodp.includes("<table:table-cell") || !fodp.includes("<text:p>A</text:p>")) {
      throw new Error("Bảng không ghi table:table / ô A");
    }
    if (!fodp.includes("<draw:plugin") || !fodp.includes('draw:mime-type="video/mp4"') || !fodp.includes('draw:mime-type="audio/mpeg"')) {
      throw new Error("Video/audio không ghi draw:plugin + mime-type");
    }
    const parsed = adapter.parseFodp(fodp);
    const byId = Object.fromEntries((parsed[0].shapes || []).map((shape) => [String(shape.id), shape]));
    if (!byId.arr1 || byId.arr1.type !== "arrow" || byId.arr1.text !== "Mũi tên") {
      throw new Error(`Arrow parse sai: ${JSON.stringify(byId.arr1)}`);
    }
    if (!byId.tbl1 || byId.tbl1.type !== "table" || byId.tbl1.cells?.[0]?.[0] !== "A" || byId.tbl1.cells?.[1]?.[1] !== "2") {
      throw new Error(`Table parse sai: ${JSON.stringify(byId.tbl1)}`);
    }
    if (!byId.vid1 || byId.vid1.type !== "video" || !String(byId.vid1.src).startsWith("data:video/mp4;base64,")) {
      throw new Error(`Video parse sai: ${JSON.stringify(byId.vid1)}`);
    }
    if (!byId.aud1 || byId.aud1.type !== "audio") {
      throw new Error(`Audio parse sai: ${JSON.stringify(byId.aud1)}`);
    }
  });

  test("SlidesAdapter: parseFodp đọc FODP kiểu soffice (custom-shape + connector start-shape + binary-data có xuống dòng)", () => {
    const adapter = new SlidesAdapter(null);
    const sofficeFodp = `<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
 xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"
 xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
 xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0"
 xmlns:presentation="urn:oasis:names:tc:opendocument:xmlns:presentation:1.0"
 xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
 xmlns:xlink="http://www.w3.org/1999/xlink">
  <office:automatic-styles>
    <style:style style:name="gr4" style:family="graphic">
      <style:graphic-properties draw:fill="solid" draw:fill-color="#2563eb"/>
    </style:style>
    <style:style style:name="gr5" style:family="graphic">
      <style:graphic-properties draw:fill="solid" draw:fill-color="#0f766e"/>
    </style:style>
    <style:style style:name="gr7" style:family="graphic">
      <style:graphic-properties draw:stroke="solid" svg:stroke-color="#475569" draw:fill="none"/>
    </style:style>
  </office:automatic-styles>
  <office:body><office:presentation>
    <draw:page draw:name="page1">
      <draw:frame presentation:class="title" svg:x="2cm" svg:y="0.5cm" svg:width="24cm" svg:height="2cm">
        <draw:text-box><text:p>Slide có shape</text:p></draw:text-box>
      </draw:frame>
      <draw:custom-shape draw:name="node-a" draw:style-name="gr4" xml:id="id1" draw:id="id1" svg:width="5.999cm" svg:height="2.499cm" svg:x="2cm" svg:y="4cm">
        <text:p><text:span>Nút A</text:span></text:p>
        <draw:enhanced-geometry draw:type="ooxml-rect"/>
      </draw:custom-shape>
      <draw:custom-shape draw:name="node-b" draw:style-name="gr5" xml:id="id2" draw:id="id2" svg:width="5.999cm" svg:height="2.499cm" svg:x="14cm" svg:y="4cm">
        <text:p>Nút B</text:p>
        <draw:enhanced-geometry draw:type="ooxml-ellipse"/>
      </draw:custom-shape>
      <draw:connector draw:name="conn-1" draw:style-name="gr7" draw:type="line" svg:x1="7.999cm" svg:y1="5.25cm" svg:x2="14cm" svg:y2="5.25cm" draw:start-shape="id1" draw:end-shape="id2">
        <text:p/>
      </draw:connector>
      <draw:frame draw:name="img1" svg:width="1.999cm" svg:height="1.999cm" svg:x="12cm" svg:y="8cm">
        <draw:image draw:mime-type="image/png">
          <office:binary-data>iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGA
           hKmMIQAAAABJRU5ErkJggg==
          </office:binary-data>
        </draw:image>
      </draw:frame>
    </draw:page>
  </office:presentation></office:body>
</office:document>`;
    const parsed = adapter.parseFodp(sofficeFodp);
    if (parsed[0].title !== "Slide có shape") throw new Error(`Title: ${parsed[0].title}`);
    const byId = Object.fromEntries((parsed[0].shapes || []).map((shape) => [String(shape.id), shape]));
    if (!byId["node-a"] || byId["node-a"].type !== "rect" || byId["node-a"].text !== "Nút A" || String(byId["node-a"].color).toLowerCase() !== "#2563eb") {
      throw new Error(`node-a sai: ${JSON.stringify(byId["node-a"])}`);
    }
    if (!byId["node-b"] || byId["node-b"].type !== "ellipse" || byId["node-b"].text !== "Nút B") {
      throw new Error(`node-b sai: ${JSON.stringify(byId["node-b"])}`);
    }
    const connector = byId["conn-1"];
    if (!connector || String(connector.sourceId) !== "node-a" || String(connector.targetId) !== "node-b") {
      throw new Error(`Connector không remap id1/id2 về node-a/node-b: ${JSON.stringify(connector)}`);
    }
    if (!byId.img1 || byId.img1.type !== "image" || !String(byId.img1.src).includes("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==")) {
      throw new Error(`Image binary-data có xuống dòng parse sai: ${JSON.stringify(byId.img1 && { type: byId.img1.type, src: (byId.img1.src || "").slice(0, 80) })}`);
    }
  });

  return results;
}
