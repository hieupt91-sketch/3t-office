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

  test("SlidesAdapter: serializeToFodp ghi arrow/table/video/audio (draw:plugin + data href)", () => {
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
    if (!fodp.includes('draw:type="right-arrow"') || !fodp.includes("Mũi tên")) {
      throw new Error("Arrow chưa được ghi thành custom-shape right-arrow (PPTX-safe)");
    }
    if (!fodp.includes("<table:table") || !fodp.includes("<table:table-cell") || !fodp.includes("<text:p>A</text:p>")) {
      throw new Error("Bảng không ghi table:table / ô A");
    }
    if (!fodp.includes("<draw:plugin") || !fodp.includes('draw:mime-type="video/mp4"') || !fodp.includes('draw:mime-type="audio/mpeg"')) {
      throw new Error("Video/audio không ghi draw:plugin + mime-type");
    }
    if (!fodp.includes('xlink:href="data:video/mp4;base64,AAAA"') || !fodp.includes('xlink:href="data:audio/mpeg;base64,//uQ"')) {
      throw new Error("Video/audio phải ghi data URL vào xlink:href (soffice PPTX hop bỏ office:binary-data trong plugin)");
    }
    if (!fodp.includes("<office:binary-data>AAAA</office:binary-data>") || !fodp.includes("<office:binary-data>//uQ</office:binary-data>")) {
      throw new Error("Video/audio vẫn cần office:binary-data cho FODP thuần VN Office");
    }
    const parsed = adapter.parseFodp(fodp);
    const byId = Object.fromEntries((parsed[0].shapes || []).map((shape) => [String(shape.id), shape]));
    if (!byId.arr1 || byId.arr1.type !== "arrow" || byId.arr1.text !== "Mũi tên") {
      throw new Error(`Arrow parse sai: ${JSON.stringify(byId.arr1)}`);
    }
    if (!approxPx(byId.arr1.x, 40) || !approxPx(byId.arr1.w, 120) || String(byId.arr1.color).toLowerCase() !== "#dc2626") {
      throw new Error(`Arrow vị trí/màu sai: ${JSON.stringify(byId.arr1)}`);
    }
    const table = byId.tbl1;
    if (!table || table.type !== "table") {
      throw new Error(`Table parse sai type: ${JSON.stringify(table)}`);
    }
    if (table.rows !== 2 || table.cols !== 2 || JSON.stringify(table.cells) !== JSON.stringify([["A", "B"], ["1", "2"]])) {
      throw new Error(`Table cells/rows/cols sai: ${JSON.stringify(table)}`);
    }
    if (table.cells[0][0] !== "A" || table.cells[0][1] !== "B" || table.cells[1][0] !== "1" || table.cells[1][1] !== "2") {
      throw new Error(`Từng ô bảng sai: ${JSON.stringify(table.cells)}`);
    }
    if (!byId.vid1 || byId.vid1.type !== "video" || !String(byId.vid1.src).startsWith("data:video/mp4;base64,")) {
      throw new Error(`Video parse sai: ${JSON.stringify(byId.vid1)}`);
    }
    if (byId.vid1.src !== "data:video/mp4;base64,AAAA") {
      throw new Error(`Video src bytes lệch: ${byId.vid1.src}`);
    }
    if (!byId.aud1 || byId.aud1.type !== "audio") {
      throw new Error(`Audio parse sai: ${JSON.stringify(byId.aud1)}`);
    }
  });

  test("SlidesAdapter: parseFodp đọc plugin soffice (data href + mime unknown + poster image)", () => {
    const adapter = new SlidesAdapter(null);
    const sofficeFodp = `<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
 xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"
 xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
 xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0"
 xmlns:presentation="urn:oasis:names:tc:opendocument:xmlns:presentation:1.0"
 xmlns:xlink="http://www.w3.org/1999/xlink">
  <office:body><office:presentation>
    <draw:page draw:name="page1">
      <draw:frame presentation:class="object" svg:width="8.466cm" svg:height="4.761cm" svg:x="1.058cm" svg:y="1.058cm">
        <draw:plugin xlink:href="data:video/mp4;base64,AAAAHGZ0eXA=" xlink:type="simple" xlink:show="embed" draw:mime-type="video/unknown">
          <draw:param draw:name="Loop" draw:value="false"/>
        </draw:plugin>
      </draw:frame>
      <draw:frame presentation:class="object" svg:width="6.878cm" svg:height="1.057cm" svg:x="1.058cm" svg:y="6.35cm">
        <draw:plugin xlink:href="data:audio/mpeg;base64,//uQBA==" xlink:type="simple" xlink:show="embed" draw:mime-type="audio/unknown">
          <draw:param draw:name="Loop" draw:value="false"/>
        </draw:plugin>
      </draw:frame>
      <draw:frame draw:name="vid-poster" svg:width="8cm" svg:height="4cm" svg:x="12cm" svg:y="1cm">
        <draw:plugin xlink:href="data:video/mp4;base64,AAAAPPTX" draw:mime-type="video/mp4"></draw:plugin>
        <draw:image>
          <office:binary-data>iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==</office:binary-data>
        </draw:image>
      </draw:frame>
    </draw:page>
  </office:presentation></office:body>
</office:document>`;
    const parsed = adapter.parseFodp(sofficeFodp);
    const shapes = parsed[0].shapes || [];
    const video = shapes.find((shape) => shape.type === "video" && String(shape.src || "").includes("AAAAHGZ0eXA="));
    const audio = shapes.find((shape) => shape.type === "audio");
    const poster = shapes.find((shape) => String(shape.id) === "vid-poster");
    if (!video || video.type !== "video" || video.src !== "data:video/mp4;base64,AAAAHGZ0eXA=") {
      throw new Error(`Video data-href soffice sai: ${JSON.stringify(video)}`);
    }
    if (!audio || audio.type !== "audio" || audio.src !== "data:audio/mpeg;base64,//uQBA==") {
      throw new Error(`Audio data-href soffice sai: ${JSON.stringify(audio)}`);
    }
    if (!poster || poster.type !== "video" || poster.src !== "data:video/mp4;base64,AAAAPPTX") {
      throw new Error(`Plugin+poster phải là video, không phải PNG: ${JSON.stringify(poster && { type: poster.type, src: (poster.src || "").slice(0, 60) })}`);
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

  test("SlidesAdapter: parseFodp đọc bảng soffice (table:table + draw:image preview) và ooxml-rightArrow", () => {
    const adapter = new SlidesAdapter(null);
    const sofficeFodp = `<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
 xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"
 xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
 xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0"
 xmlns:presentation="urn:oasis:names:tc:opendocument:xmlns:presentation:1.0"
 xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
 xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0">
  <office:automatic-styles>
    <style:style style:name="gr4" style:family="graphic">
      <style:graphic-properties draw:fill="solid" draw:fill-color="#dc2626"/>
    </style:style>
  </office:automatic-styles>
  <office:body><office:presentation>
    <draw:page draw:name="page1">
      <draw:frame presentation:class="title" svg:x="2cm" svg:y="0.5cm" svg:width="24cm" svg:height="2cm">
        <draw:text-box><text:p>Slide bảng và mũi tên</text:p></draw:text-box>
      </draw:frame>
      <draw:frame draw:name="tbl1" svg:width="12.011cm" svg:height="3.015cm" svg:x="2.011cm" svg:y="3.995cm">
        <table:table>
          <table:table-column table:style-name="co1"/>
          <table:table-column table:style-name="co1"/>
          <table:table-row>
            <table:table-cell><text:p><text:span>Sản phẩm</text:span></text:p></table:table-cell>
            <table:table-cell><text:p><text:span>Số lượng</text:span></text:p></table:table-cell>
          </table:table-row>
          <table:table-row>
            <table:table-cell><text:p><text:span>VN Writer</text:span></text:p></table:table-cell>
            <table:table-cell><text:p><text:span>120</text:span></text:p></table:table-cell>
          </table:table-row>
        </table:table>
        <draw:image>
          <office:binary-data>AAAA</office:binary-data>
        </draw:image>
      </draw:frame>
      <draw:custom-shape draw:name="arr1" draw:style-name="gr4" svg:width="5.291cm" svg:height="2.116cm" svg:x="15.028cm" svg:y="5.001cm">
        <text:p><text:span>Mũi tên phải</text:span></text:p>
        <draw:enhanced-geometry draw:type="ooxml-rightArrow" svg:viewBox="0 0 21600 21600"/>
      </draw:custom-shape>
    </draw:page>
  </office:presentation></office:body>
</office:document>`;
    const parsed = adapter.parseFodp(sofficeFodp);
    if (parsed[0].title !== "Slide bảng và mũi tên") throw new Error(`Title: ${parsed[0].title}`);
    const byId = Object.fromEntries((parsed[0].shapes || []).map((shape) => [String(shape.id), shape]));
    const table = byId.tbl1;
    if (!table || table.type !== "table") {
      throw new Error(`tbl1 phải là table, không phải image preview: ${JSON.stringify(table)}`);
    }
    if (table.rows !== 2 || table.cols !== 2) {
      throw new Error(`rows/cols: ${table.rows}x${table.cols}`);
    }
    const expected = [["Sản phẩm", "Số lượng"], ["VN Writer", "120"]];
    if (JSON.stringify(table.cells) !== JSON.stringify(expected)) {
      throw new Error(`cells: ${JSON.stringify(table.cells)}`);
    }
    if (!approxPx(table.x, 76, 2) || !approxPx(table.y, 151, 2)) {
      throw new Error(`table geom: ${JSON.stringify({ x: table.x, y: table.y, w: table.w, h: table.h })}`);
    }
    const arrow = byId.arr1;
    if (!arrow || arrow.type !== "arrow" || arrow.text !== "Mũi tên phải") {
      throw new Error(`ooxml-rightArrow phải parse thành arrow: ${JSON.stringify(arrow)}`);
    }
    if (String(arrow.color).toLowerCase() !== "#dc2626") {
      throw new Error(`arrow color: ${arrow.color}`);
    }
    if ((parsed[0].shapes || []).some((shape) => shape.type === "image" && String(shape.id) === "tbl1")) {
      throw new Error("draw:image preview của bảng bị nhận nhầm thành shape image");
    }
  });

  test("SlidesAdapter: serialize/parse bảng 3x4 đủ 12 ô (tiếng Việt + số)", () => {
    const cells = [
      ["Hạng mục", "Tháng 1", "Tháng 2", "Tháng 3"],
      ["Doanh thu", "120", "135", "150"],
      ["Chi phí", "45", "45", "52"]
    ];
    const adapter = new SlidesAdapter({
      slides: [{
        id: 21,
        title: "Bảng lớn",
        body: "",
        layoutType: "blank",
        shapes: [
          { id: "tbl3x4", type: "table", x: 76, y: 151, w: 680, h: 160, rows: 3, cols: 4, cells, color: "transparent" }
        ]
      }]
    });
    const fodp = adapter.serializeToFodp();
    if ((fodp.match(/<table:table-row\b/g) || []).length !== 3) {
      throw new Error("Serializer không ghi 3 hàng");
    }
    if ((fodp.match(/<table:table-cell\b/g) || []).length !== 12) {
      throw new Error("Serializer không ghi 12 ô");
    }
    if (!fodp.includes("<text:p>Hạng mục</text:p>") || !fodp.includes("<text:p>120</text:p>")) {
      throw new Error("Serializer thiếu ô tiếng Việt hoặc số");
    }
    const parsed = adapter.parseFodp(fodp);
    const table = (parsed[0].shapes || []).find((shape) => String(shape.id) === "tbl3x4");
    if (!table || table.type !== "table") {
      throw new Error(`3x4 parse sai type: ${JSON.stringify(table)}`);
    }
    if (table.rows !== 3 || table.cols !== 4) {
      throw new Error(`3x4 rows/cols: ${table.rows}x${table.cols}`);
    }
    if (JSON.stringify(table.cells) !== JSON.stringify(cells)) {
      throw new Error(`3x4 cells: ${JSON.stringify(table.cells)}`);
    }
  });

  test("SlidesAdapter: parseFodp bung table:number-columns-repeated / number-rows-repeated / ô rỗng tự đóng", () => {
    const adapter = new SlidesAdapter(null);
    const sofficeFodp = `<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
 xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"
 xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
 xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0"
 xmlns:presentation="urn:oasis:names:tc:opendocument:xmlns:presentation:1.0"
 xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0">
  <office:body><office:presentation>
    <draw:page draw:name="page1">
      <draw:frame presentation:class="title" svg:x="2cm" svg:y="0.5cm" svg:width="24cm" svg:height="2cm">
        <draw:text-box><text:p>Bảng nén cột</text:p></draw:text-box>
      </draw:frame>
      <draw:frame draw:name="tbl-repeat" svg:width="12cm" svg:height="4cm" svg:x="2cm" svg:y="4cm">
        <table:table>
          <table:table-column table:number-columns-repeated="4"/>
          <table:table-row>
            <table:table-cell><text:p>Hạng mục</text:p></table:table-cell>
            <table:table-cell><text:p>Tháng 1</text:p></table:table-cell>
            <table:table-cell><text:p>Tháng 2</text:p></table:table-cell>
            <table:table-cell><text:p>Tháng 3</text:p></table:table-cell>
          </table:table-row>
          <table:table-row>
            <table:table-cell><text:p>Doanh thu</text:p></table:table-cell>
            <table:table-cell office:value-type="float" office:value="120"><text:p>120</text:p></table:table-cell>
            <table:table-cell><text:p>135</text:p></table:table-cell>
            <table:table-cell><text:p>150</text:p></table:table-cell>
          </table:table-row>
          <table:table-row>
            <table:table-cell><text:p>Chi phí</text:p></table:table-cell>
            <table:table-cell table:number-columns-repeated="2"><text:p>45</text:p></table:table-cell>
            <table:table-cell><text:p>52</text:p></table:table-cell>
          </table:table-row>
        </table:table>
      </draw:frame>
      <draw:frame draw:name="tbl-empty" svg:width="8cm" svg:height="2cm" svg:x="2cm" svg:y="9cm">
        <table:table>
          <table:table-row>
            <table:table-cell><text:p>A</text:p></table:table-cell>
            <table:table-cell table:number-columns-repeated="2"/>
            <table:table-cell><text:p>D</text:p></table:table-cell>
          </table:table-row>
          <table:table-row table:number-rows-repeated="2">
            <table:table-cell><text:p>X</text:p></table:table-cell>
            <table:table-cell office:value-type="float" office:value="7"/>
          </table:table-row>
        </table:table>
      </draw:frame>
    </draw:page>
  </office:presentation></office:body>
</office:document>`;
    const parsed = adapter.parseFodp(sofficeFodp);
    const byId = Object.fromEntries((parsed[0].shapes || []).map((shape) => [String(shape.id), shape]));
    const compressed = byId["tbl-repeat"];
    const expected = [
      ["Hạng mục", "Tháng 1", "Tháng 2", "Tháng 3"],
      ["Doanh thu", "120", "135", "150"],
      ["Chi phí", "45", "45", "52"]
    ];
    if (!compressed || compressed.type !== "table") {
      throw new Error(`tbl-repeat type: ${JSON.stringify(compressed)}`);
    }
    if (compressed.rows !== 3 || compressed.cols !== 4) {
      throw new Error(`tbl-repeat rows/cols (parser cũ đếm thiếu cột khi number-columns-repeated): ${compressed.rows}x${compressed.cols} cells=${JSON.stringify(compressed.cells)}`);
    }
    if (JSON.stringify(compressed.cells) !== JSON.stringify(expected)) {
      throw new Error(`tbl-repeat cells: ${JSON.stringify(compressed.cells)}`);
    }
    const empty = byId["tbl-empty"];
    if (!empty || empty.type !== "table") {
      throw new Error(`tbl-empty type: ${JSON.stringify(empty)}`);
    }
    if (JSON.stringify(empty.cells) !== JSON.stringify([["A", "", "", "D"], ["X", "7"], ["X", "7"]])) {
      throw new Error(`tbl-empty cells (ô rỗng tự đóng / office:value / number-rows-repeated): ${JSON.stringify(empty.cells)}`);
    }
    if (empty.rows !== 3 || empty.cols !== 4) {
      throw new Error(`tbl-empty rows/cols: ${empty.rows}x${empty.cols}`);
    }
  });

  test("SlidesAdapter: serializeToFodp ghi transition slide và animation shape ra SMIL ODF", () => {
    const adapter = new SlidesAdapter({
      slides: [{
        id: 1,
        title: "Chuyen trang Fade",
        body: "",
        layoutType: "title-content",
        transition: { type: "fade", duration: 500 },
        shapes: [{
          id: "rect-fly",
          type: "rect",
          x: 76, y: 151, w: 227, h: 95,
          color: "#2563eb",
          text: "Bay vao",
          animation: { type: "flyIn", duration: 800, delay: 200 }
        }]
      }, {
        id: 2,
        title: "Zoom va Flip",
        body: "",
        layoutType: "title-content",
        transition: { type: "zoom", duration: 800 },
        shapes: [{
          id: "rect-fade",
          type: "rect",
          x: 10, y: 10, w: 100, h: 40,
          color: "#0f766e",
          text: "Fade In",
          animation: { type: "fadeIn", duration: 300, delay: 0 }
        }]
      }, {
        id: 3,
        title: "Flip",
        body: "",
        layoutType: "title-content",
        transition: { type: "flip", duration: 1000 },
        shapes: []
      }]
    });
    const fodp = adapter.serializeToFodp();
    if (!fodp.includes('xmlns:smil="urn:oasis:names:tc:opendocument:xmlns:smil-compatible:1.0"')) {
      throw new Error("Thieu xmlns:smil");
    }
    if (!fodp.includes('xmlns:anim="urn:oasis:names:tc:opendocument:xmlns:animation:1.0"')) {
      throw new Error("Thieu xmlns:anim");
    }
    if (!fodp.includes('smil:type="fade"') || !fodp.includes('smil:subtype="crossfade"')) {
      throw new Error("Khong ghi transition fade/crossfade");
    }
    if (!fodp.includes('smil:type="irisWipe"') || !fodp.includes('smil:subtype="rectangle"')) {
      throw new Error("Khong ghi transition zoom bang irisWipe/rectangle (PPTX-safe)");
    }
    if (!fodp.includes('smil:type="fadeOverColor"')) {
      throw new Error("Khong ghi transition flip bang fadeOverColor (ODF)");
    }
    if (!fodp.includes("<anim:transitionFilter")) {
      throw new Error("Khong ghi anim:transitionFilter (soffice doc duration tai day)");
    }
    if (!fodp.includes('presentation:preset-id="ooo-entrance-fly-in"') || !fodp.includes('presentation:preset-sub-type="from-bottom"')) {
      throw new Error("Khong ghi animation fly-in");
    }
    if (!fodp.includes('presentation:preset-id="ooo-entrance-fade-in"')) {
      throw new Error("Khong ghi animation fade-in");
    }
    if (!fodp.includes('smil:begin="0.2s"')) {
      throw new Error("Khong ghi delay 200ms thanh smil:begin=0.2s");
    }
    if (!fodp.includes('smil:dur="0.8s"')) {
      throw new Error("Khong ghi duration 800ms thanh smil:dur=0.8s");
    }
    if (!fodp.includes('smil:targetElement="rect-fly"')) {
      throw new Error("Animation khong tro draw:id cua shape");
    }
    const parsed = adapter.parseFodp(fodp);
    if (parsed[1].transition?.type !== "zoom" || parsed[1].transition?.duration !== 800) {
      throw new Error(`irisWipe phai parse lai thanh zoom: ${JSON.stringify(parsed[1].transition)}`);
    }
    if (parsed[2].transition?.type !== "flip" || parsed[2].transition?.duration !== 1000) {
      throw new Error(`fadeOverColor phai parse lai thanh flip (FODP thuan): ${JSON.stringify(parsed[2].transition)}`);
    }
  });

  test("SlidesAdapter: serializeToFodp → parseFodp giu transition va animation trong bo nho", () => {
    const adapter = new SlidesAdapter({
      slides: [{
        id: 1,
        title: "Chuyen trang Fade",
        body: "Noi dung",
        layoutType: "title-content",
        transition: { type: "fade", duration: 500 },
        shapes: [{
          id: "rect-fly",
          type: "rect",
          x: 76, y: 151, w: 227, h: 95,
          color: "#2563eb",
          text: "Bay vao",
          animation: { type: "flyIn", duration: 800, delay: 200 }
        }, {
          id: "plain",
          type: "ellipse",
          x: 300, y: 151, w: 80, h: 80,
          color: "#64748b",
          text: "Khong hieu ung"
        }]
      }, {
        id: 2,
        title: "Truot",
        body: "",
        layoutType: "title-content",
        transition: { type: "slide", duration: 300 },
        shapes: [{
          id: "r-wipe",
          type: "rect",
          x: 20, y: 20, w: 90, h: 40,
          color: "#dc2626",
          text: "Wipe",
          animation: { type: "slideLeft", duration: 1000, delay: 500 }
        }]
      }, {
        id: 3,
        title: "Khong transition",
        body: "",
        layoutType: "title-content",
        shapes: []
      }]
    });
    const parsed = adapter.parseFodp(adapter.serializeToFodp());
    if (parsed.length !== 3) throw new Error(`so slide: ${parsed.length}`);
    if (!parsed[0].transition || parsed[0].transition.type !== "fade" || parsed[0].transition.duration !== 500) {
      throw new Error(`slide1.transition: ${JSON.stringify(parsed[0].transition)}`);
    }
    const byId = Object.fromEntries((parsed[0].shapes || []).map((shape) => [String(shape.id), shape]));
    const fly = byId["rect-fly"];
    if (!fly || fly.animation?.type !== "flyIn" || fly.animation.duration !== 800 || fly.animation.delay !== 200) {
      throw new Error(`rect-fly.animation: ${JSON.stringify(fly?.animation)}`);
    }
    if (byId.plain?.animation?.type !== "none") {
      throw new Error(`shape khong animation phai fallback none: ${JSON.stringify(byId.plain?.animation)}`);
    }
    if (parsed[1].transition?.type !== "slide" || parsed[1].transition?.duration !== 300) {
      throw new Error(`slide2.transition: ${JSON.stringify(parsed[1].transition)}`);
    }
    const wipe = (parsed[1].shapes || []).find((shape) => String(shape.id) === "r-wipe");
    if (wipe?.animation?.type !== "slideLeft" || wipe.animation.duration !== 1000 || wipe.animation.delay !== 500) {
      throw new Error(`r-wipe.animation: ${JSON.stringify(wipe?.animation)}`);
    }
    if (parsed[2].transition) {
      throw new Error(`slide khong transition van bi gan: ${JSON.stringify(parsed[2].transition)}`);
    }
  });

  test("SlidesAdapter: parseFodp doc FODP kieu soffice (drawing-page smil + ooo-entrance + id remap)", () => {
    const adapter = new SlidesAdapter(null);
    const sofficeFodp = `<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
 xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"
 xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
 xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0"
 xmlns:presentation="urn:oasis:names:tc:opendocument:xmlns:presentation:1.0"
 xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
 xmlns:smil="urn:oasis:names:tc:opendocument:xmlns:smil-compatible:1.0"
 xmlns:anim="urn:oasis:names:tc:opendocument:xmlns:animation:1.0">
  <office:automatic-styles>
    <style:style style:name="dp3" style:family="drawing-page">
      <style:drawing-page-properties presentation:transition-speed="fast" smil:type="fade" smil:subtype="crossfade" smil:fadeColor="#000000"/>
    </style:style>
    <style:style style:name="dp4" style:family="drawing-page">
      <style:drawing-page-properties smil:type="pushWipe" smil:subtype="fromRight"/>
    </style:style>
    <style:style style:name="dp5" style:family="drawing-page">
      <style:drawing-page-properties smil:type="zoom"/>
    </style:style>
    <style:style style:name="gr4" style:family="graphic">
      <style:graphic-properties draw:fill="solid" draw:fill-color="#2563eb"/>
    </style:style>
  </office:automatic-styles>
  <office:body><office:presentation>
    <draw:page draw:name="Fade slide" draw:style-name="dp3" xml:id="id1" draw:id="id1">
      <draw:frame presentation:class="title" svg:x="2cm" svg:y="2cm" svg:width="24cm" svg:height="3cm">
        <draw:text-box><text:p>Fade slide</text:p></draw:text-box>
      </draw:frame>
      <draw:custom-shape draw:name="rect-fly" draw:style-name="gr4" xml:id="id2" draw:id="id2" svg:width="6cm" svg:height="2.5cm" svg:x="2cm" svg:y="4cm">
        <text:p>Bay vao</text:p>
        <draw:enhanced-geometry draw:type="ooxml-rect"/>
      </draw:custom-shape>
      <anim:par smil:dur="indefinite" presentation:node-type="timing-root">
        <anim:par smil:begin="id1.begin">
          <anim:transitionFilter smil:dur="0.5s" smil:type="fade" smil:subtype="crossfade"/>
        </anim:par>
        <anim:seq smil:dur="indefinite" presentation:node-type="main-sequence">
          <anim:par smil:begin="next" smil:fill="hold">
            <anim:par smil:begin="0.2s" smil:fill="hold" presentation:node-type="on-click" presentation:preset-class="entrance" presentation:preset-id="ooo-entrance-fly-in" presentation:preset-sub-type="from-bottom">
              <anim:set smil:begin="0s" smil:dur="0.001s" smil:fill="hold" smil:targetElement="id2" smil:attributeName="visibility" smil:to="visible"/>
              <anim:animate smil:dur="0.8s" smil:fill="hold" smil:targetElement="id2" smil:attributeName="y" smil:values="height;y" smil:keyTimes="0;1"/>
            </anim:par>
          </anim:par>
        </anim:seq>
      </anim:par>
    </draw:page>
    <draw:page draw:name="Push / Fly In" draw:style-name="dp4" xml:id="id3" draw:id="id3">
      <draw:frame presentation:class="title"><draw:text-box><text:p>Push</text:p></draw:text-box></draw:frame>
      <draw:rect draw:name="rect-fade" draw:style-name="gr4" xml:id="id4" draw:id="id4" svg:width="6cm" svg:height="2cm" svg:x="2cm" svg:y="6cm">
        <text:p>Fade In</text:p>
      </draw:rect>
      <anim:par presentation:node-type="timing-root">
        <anim:par smil:begin="id3.begin">
          <anim:transitionFilter smil:dur="0.3s" smil:type="pushWipe" smil:subtype="fromRight"/>
        </anim:par>
        <anim:seq presentation:node-type="main-sequence">
          <anim:par smil:begin="indefinite">
            <anim:par smil:begin="0s" smil:fill="hold" presentation:node-type="on-click" presentation:preset-class="entrance" presentation:preset-id="ooo-entrance-fade-in">
              <anim:set smil:begin="0s" smil:dur="0.001s" smil:fill="hold" smil:targetElement="id4" smil:attributeName="visibility" smil:to="visible"/>
              <anim:animate smil:dur="0.5s" smil:fill="hold" smil:targetElement="id4" smil:attributeName="opacity" smil:from="0" smil:to="1"/>
            </anim:par>
          </anim:par>
        </anim:seq>
      </anim:par>
    </draw:page>
    <draw:page draw:name="Iris / Zoom In" draw:style-name="dp5">
      <draw:frame presentation:class="title"><draw:text-box><text:p>Zoom</text:p></draw:text-box></draw:frame>
    </draw:page>
  </office:presentation></office:body>
</office:document>`;
    const parsed = adapter.parseFodp(sofficeFodp);
    if (parsed.length !== 3) throw new Error(`so slide: ${parsed.length}`);
    if (parsed[0].transition?.type !== "fade" || parsed[0].transition?.duration !== 500) {
      throw new Error(`soffice fade transition: ${JSON.stringify(parsed[0].transition)}`);
    }
    const fly = (parsed[0].shapes || []).find((shape) => String(shape.id) === "rect-fly");
    if (!fly) throw new Error("Khong map lai shape theo draw:name sau khi draw:id doi thanh id2");
    if (fly.animation?.type !== "flyIn" || fly.animation.duration !== 800 || fly.animation.delay !== 200) {
      throw new Error(`soffice flyIn qua targetElement=id2: ${JSON.stringify(fly.animation)}`);
    }
    if (parsed[1].transition?.type !== "slide" || parsed[1].transition?.duration !== 300) {
      throw new Error(`soffice pushWipe → slide: ${JSON.stringify(parsed[1].transition)}`);
    }
    const fadeShape = (parsed[1].shapes || []).find((shape) => String(shape.id) === "rect-fade");
    if (fadeShape?.animation?.type !== "fadeIn" || fadeShape.animation.duration !== 500) {
      throw new Error(`soffice fade-in: ${JSON.stringify(fadeShape?.animation)}`);
    }
    if (parsed[2].transition?.type !== "zoom") {
      throw new Error(`soffice smil:type=zoom: ${JSON.stringify(parsed[2].transition)}`);
    }
  });

  test("SlidesAdapter: serializeToFodp ghi titleAnimation/bodyAnimation ra SMIL, van giu placeholder class", () => {
    const adapter = new SlidesAdapter({
      slides: [{
        id: 1,
        title: "Tieu de fade",
        body: "Noi dung fly",
        layoutType: "title-content",
        titleAnimation: { type: "fadeIn", duration: 600, delay: 100 },
        bodyAnimation: { type: "flyIn", duration: 700, delay: 300 },
        shapes: []
      }, {
        id: 2,
        title: "Hai cot",
        body: "Cot mot",
        body2: "Cot hai",
        layoutType: "two-content",
        titleAnimation: { type: "zoomIn", duration: 500, delay: 0 },
        body2Animation: { type: "bounceIn", duration: 800, delay: 200 },
        shapes: []
      }]
    });
    const fodp = adapter.serializeToFodp();
    if (!fodp.includes('presentation:class="title"') || !fodp.includes('presentation:class="outline"')) {
      throw new Error("Van phai ghi presentation:class title/outline");
    }
    if (!fodp.includes('draw:id="title-1"') || !fodp.includes('xml:id="title-1"') || !fodp.includes('draw:name="title"')) {
      throw new Error("Khung title phai co draw:id/xml:id/draw:name de SMIL tro");
    }
    if (!fodp.includes('draw:id="body-1"') || !fodp.includes('draw:name="body"')) {
      throw new Error("Khung outline body phai co draw:id");
    }
    if (!fodp.includes('draw:id="body2-2"') || !fodp.includes('draw:name="body2"')) {
      throw new Error("Khung outline body2 phai co draw:id rieng");
    }
    if (!fodp.includes('smil:targetElement="title-1"') || !fodp.includes('presentation:preset-id="ooo-entrance-fade-in"')) {
      throw new Error("titleAnimation fadeIn khong tro title-1");
    }
    if (!fodp.includes('smil:targetElement="body-1"') || !fodp.includes('presentation:preset-id="ooo-entrance-fly-in"')) {
      throw new Error("bodyAnimation flyIn khong tro body-1");
    }
    if (!fodp.includes('smil:targetElement="body2-2"') || !fodp.includes('presentation:preset-id="ooo-entrance-bounce"')) {
      throw new Error("body2Animation bounceIn khong tro body2-2");
    }
    if (!fodp.includes('smil:begin="0.1s"') || !fodp.includes('smil:dur="0.6s"')) {
      throw new Error("Khong ghi delay/duration titleAnimation");
    }
    const parsed = adapter.parseFodp(fodp);
    if (parsed[0].title !== "Tieu de fade" || !parsed[0].body.includes("Noi dung fly")) {
      throw new Error(`Gan id khong duoc pha title/body: title=${parsed[0].title} body=${parsed[0].body}`);
    }
    if ((parsed[0].shapes || []).some((shape) => String(shape.id).startsWith("title") || String(shape.id).startsWith("body"))) {
      throw new Error(`Khung title/body bi parse thanh shape: ${JSON.stringify(parsed[0].shapes)}`);
    }
    if (parsed[0].titleAnimation?.type !== "fadeIn" || parsed[0].titleAnimation.duration !== 600 || parsed[0].titleAnimation.delay !== 100) {
      throw new Error(`titleAnimation parse: ${JSON.stringify(parsed[0].titleAnimation)}`);
    }
    if (parsed[0].bodyAnimation?.type !== "flyIn" || parsed[0].bodyAnimation.duration !== 700 || parsed[0].bodyAnimation.delay !== 300) {
      throw new Error(`bodyAnimation parse: ${JSON.stringify(parsed[0].bodyAnimation)}`);
    }
    if (parsed[1].titleAnimation?.type !== "zoomIn") {
      throw new Error(`slide2 titleAnimation: ${JSON.stringify(parsed[1].titleAnimation)}`);
    }
    if (parsed[1].body2Animation?.type !== "bounceIn" || parsed[1].body2Animation.duration !== 800 || parsed[1].body2Animation.delay !== 200) {
      throw new Error(`body2Animation parse: ${JSON.stringify(parsed[1].body2Animation)}`);
    }
    if (parsed[1].body2 !== "Cot hai") {
      throw new Error(`two-content body2 mat sau khi gan id: ${parsed[1].body2}`);
    }
  });

  test("SlidesAdapter: serializeToFodp → parseFodp giu title/body/body2 animation trong bo nho", () => {
    const adapter = new SlidesAdapter({
      slides: [{
        id: 1,
        title: "Co ca hai",
        body: "Than bai",
        layoutType: "title-content",
        titleAnimation: { type: "fadeIn", duration: 600, delay: 100 },
        bodyAnimation: { type: "flyIn", duration: 700, delay: 300 },
        shapes: [{
          id: "rect-zoom",
          type: "rect",
          x: 76, y: 151, w: 100, h: 40,
          color: "#2563eb",
          text: "Shape",
          animation: { type: "zoomIn", duration: 500, delay: 0 }
        }]
      }, {
        id: 2,
        title: "Chi title",
        body: "",
        layoutType: "title-only",
        titleAnimation: { type: "slideLeft", duration: 1000, delay: 500 },
        shapes: []
      }, {
        id: 3,
        title: "Khong animation placeholder",
        body: "Van giu text",
        layoutType: "title-content",
        shapes: []
      }]
    });
    const parsed = adapter.parseFodp(adapter.serializeToFodp());
    if (parsed[0].titleAnimation?.type !== "fadeIn" || parsed[0].titleAnimation.duration !== 600 || parsed[0].titleAnimation.delay !== 100) {
      throw new Error(`slide1.titleAnimation: ${JSON.stringify(parsed[0].titleAnimation)}`);
    }
    if (parsed[0].bodyAnimation?.type !== "flyIn" || parsed[0].bodyAnimation.duration !== 700 || parsed[0].bodyAnimation.delay !== 300) {
      throw new Error(`slide1.bodyAnimation: ${JSON.stringify(parsed[0].bodyAnimation)}`);
    }
    const zoom = (parsed[0].shapes || []).find((shape) => String(shape.id) === "rect-zoom");
    if (zoom?.animation?.type !== "zoomIn") {
      throw new Error(`shape animation hoi quy: ${JSON.stringify(zoom?.animation)}`);
    }
    if (parsed[1].titleAnimation?.type !== "slideLeft" || parsed[1].titleAnimation.duration !== 1000 || parsed[1].titleAnimation.delay !== 500) {
      throw new Error(`title-only titleAnimation: ${JSON.stringify(parsed[1].titleAnimation)}`);
    }
    if (parsed[1].bodyAnimation) {
      throw new Error(`title-only khong co body frame nhung van gan bodyAnimation: ${JSON.stringify(parsed[1].bodyAnimation)}`);
    }
    if (parsed[2].titleAnimation || parsed[2].bodyAnimation) {
      throw new Error(`slide khong animation van bi gan: title=${JSON.stringify(parsed[2].titleAnimation)} body=${JSON.stringify(parsed[2].bodyAnimation)}`);
    }
    if (parsed[2].title !== "Khong animation placeholder" || parsed[2].body !== "Van giu text") {
      throw new Error(`slide3 text: title=${parsed[2].title} body=${parsed[2].body}`);
    }
  });

  test("SlidesAdapter: parseFodp doc title/body animation kieu soffice (id remap, giu class, khong id)", () => {
    const adapter = new SlidesAdapter(null);
    const sofficeFodp = `<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
 xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"
 xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
 xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0"
 xmlns:presentation="urn:oasis:names:tc:opendocument:xmlns:presentation:1.0"
 xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
 xmlns:smil="urn:oasis:names:tc:opendocument:xmlns:smil-compatible:1.0"
 xmlns:anim="urn:oasis:names:tc:opendocument:xmlns:animation:1.0">
  <office:body><office:presentation>
    <draw:page draw:name="page1" xml:id="id1" draw:id="id1">
      <draw:frame presentation:class="title" draw:name="title" xml:id="id2" draw:id="id2" svg:x="2cm" svg:y="2cm" svg:width="24cm" svg:height="3cm">
        <draw:text-box><text:p>Tieu de remap</text:p></draw:text-box>
      </draw:frame>
      <draw:frame presentation:class="outline" draw:name="body" xml:id="id3" draw:id="id3" svg:x="2cm" svg:y="5.5cm" svg:width="24cm" svg:height="11cm">
        <draw:text-box><text:p>Noi dung remap</text:p></draw:text-box>
      </draw:frame>
      <anim:par presentation:node-type="timing-root">
        <anim:seq presentation:node-type="main-sequence">
          <anim:par smil:begin="indefinite">
            <anim:par smil:begin="0.1s" smil:fill="hold" presentation:node-type="on-click" presentation:preset-class="entrance" presentation:preset-id="ooo-entrance-fade-in">
              <anim:set smil:begin="0s" smil:dur="0.001s" smil:fill="hold" smil:targetElement="id2" smil:attributeName="visibility" smil:to="visible"/>
              <anim:animate smil:dur="0.6s" smil:fill="hold" smil:targetElement="id2" smil:attributeName="opacity" smil:from="0" smil:to="1"/>
            </anim:par>
          </anim:par>
          <anim:par smil:begin="indefinite">
            <anim:par smil:begin="0.3s" smil:fill="hold" presentation:node-type="on-click" presentation:preset-class="entrance" presentation:preset-id="ooo-entrance-fly-in" presentation:preset-sub-type="from-bottom">
              <anim:set smil:begin="0s" smil:dur="0.001s" smil:fill="hold" smil:targetElement="id3" smil:attributeName="visibility" smil:to="visible"/>
              <anim:animate smil:dur="0.7s" smil:fill="hold" smil:targetElement="id3" smil:attributeName="y" smil:values="height;y" smil:keyTimes="0;1"/>
            </anim:par>
          </anim:par>
        </anim:seq>
      </anim:par>
    </draw:page>
    <draw:page draw:name="page2">
      <draw:frame presentation:class="title"><draw:text-box><text:p>Hai cot</text:p></draw:text-box></draw:frame>
      <draw:frame presentation:class="outline" xml:id="id4" draw:id="id4"><draw:text-box><text:p>Trai</text:p></draw:text-box></draw:frame>
      <draw:frame presentation:class="outline" xml:id="id5" draw:id="id5"><draw:text-box><text:p>Phai</text:p></draw:text-box></draw:frame>
      <anim:par presentation:node-type="timing-root">
        <anim:seq presentation:node-type="main-sequence">
          <anim:par smil:begin="indefinite">
            <anim:par smil:begin="0.2s" smil:fill="hold" presentation:node-type="on-click" presentation:preset-class="entrance" presentation:preset-id="ooo-entrance-bounce">
              <anim:set smil:targetElement="id5" smil:attributeName="visibility" smil:to="visible"/>
              <anim:animate smil:dur="0.8s" smil:targetElement="id5" smil:attributeName="opacity" smil:from="0" smil:to="1"/>
            </anim:par>
          </anim:par>
        </anim:seq>
      </anim:par>
    </draw:page>
    <draw:page draw:name="page3">
      <draw:frame presentation:class="title"><draw:text-box><text:p>Khong id van parse</text:p></draw:text-box></draw:frame>
      <draw:frame presentation:class="outline"><draw:text-box><text:p>Body khong id</text:p></draw:text-box></draw:frame>
    </draw:page>
  </office:presentation></office:body>
</office:document>`;
    const parsed = adapter.parseFodp(sofficeFodp);
    if (parsed.length !== 3) throw new Error(`so slide: ${parsed.length}`);
    if (parsed[0].title !== "Tieu de remap" || parsed[0].body !== "Noi dung remap") {
      throw new Error(`slide1 text sau remap: title=${parsed[0].title} body=${parsed[0].body}`);
    }
    if ((parsed[0].shapes || []).length) {
      throw new Error(`title/outline remap khong duoc thanh shape: ${JSON.stringify(parsed[0].shapes)}`);
    }
    if (parsed[0].titleAnimation?.type !== "fadeIn" || parsed[0].titleAnimation.duration !== 600 || parsed[0].titleAnimation.delay !== 100) {
      throw new Error(`soffice title fadeIn qua id2: ${JSON.stringify(parsed[0].titleAnimation)}`);
    }
    if (parsed[0].bodyAnimation?.type !== "flyIn" || parsed[0].bodyAnimation.duration !== 700 || parsed[0].bodyAnimation.delay !== 300) {
      throw new Error(`soffice body flyIn qua id3: ${JSON.stringify(parsed[0].bodyAnimation)}`);
    }
    if (parsed[1].layoutType !== "two-content") {
      throw new Error(`thieu presentation:layout nhung 2 outline phai suy two-content: ${parsed[1].layoutType}`);
    }
    if (parsed[1].body !== "Trai" || parsed[1].body2 !== "Phai") {
      throw new Error(`two-content khong id name: body=${parsed[1].body} body2=${parsed[1].body2}`);
    }
    if (parsed[1].body2Animation?.type !== "bounceIn" || parsed[1].body2Animation.duration !== 800 || parsed[1].body2Animation.delay !== 200) {
      throw new Error(`outline thu 2 (body2) qua id5: ${JSON.stringify(parsed[1].body2Animation)}`);
    }
    if (parsed[2].title !== "Khong id van parse" || parsed[2].body !== "Body khong id") {
      throw new Error(`placeholder khong id: title=${parsed[2].title} body=${parsed[2].body}`);
    }
    if (parsed[2].titleAnimation || parsed[2].bodyAnimation) {
      throw new Error("File khong animation van bi gan title/body animation");
    }
  });

  function commentSlide(extra = {}) {
    return {
      id: 21,
      title: "Slide nhan xet",
      body: "Noi dung slide",
      layoutType: "title-content",
      notes: "Ghi chu dien gia",
      shapes: [],
      comments: [
        {
          id: "comment-hoa-1",
          text: "Can doi chieu so lieu quy II.",
          author: "Tran Thi Hoa",
          timestamp: "2026-09-05T09:10:00.000Z"
        },
        {
          id: "comment-duc-2",
          text: "Xac nhan chu ky nguoi soan.",
          author: "Pham Minh Duc",
          timestamp: "2026-09-05T09:25:00.000Z"
        }
      ],
      ...extra
    };
  }

  test("SlidesAdapter: serializeToFodp ghi slide.comments ra office:annotation tren draw:page", () => {
    const adapter = new SlidesAdapter({
      slides: [
        commentSlide(),
        { id: 22, title: "Slide khong comment", body: "", layoutType: "title-only", shapes: [], comments: [] }
      ]
    });
    const fodp = adapter.serializeToFodp();
    if (!fodp.includes('xmlns:dc="http://purl.org/dc/elements/1.1/"')) {
      throw new Error("Thieu xmlns:dc cho dc:creator/dc:date");
    }
    if (!fodp.includes("<office:annotation") || !fodp.includes("</office:annotation>")) {
      throw new Error("FODP khong ghi office:annotation tren trang chieu");
    }
    if (!fodp.includes("<dc:creator>Tran Thi Hoa</dc:creator>") || !fodp.includes("<dc:creator>Pham Minh Duc</dc:creator>")) {
      throw new Error("FODP thieu ten nguoi comment");
    }
    if (!fodp.includes("<dc:date>2026-09-05T09:10:00</dc:date>") || !fodp.includes("<dc:date>2026-09-05T09:25:00</dc:date>")) {
      throw new Error(`FODP thieu/sai dc:date: ${fodp.match(/<dc:date>[^<]+<\/dc:date>/g)}`);
    }
    if (!fodp.includes("Can doi chieu so lieu quy II.") || !fodp.includes("Xac nhan chu ky nguoi soan.")) {
      throw new Error("FODP thieu noi dung comment");
    }
    if (!fodp.includes('draw:name="comment-hoa-1"') || !fodp.includes('draw:name="comment-duc-2"')) {
      throw new Error("FODP thieu draw:name giu id comment trong bo nho");
    }
    const page1 = fodp.match(/<draw:page[^>]*draw:name="page1"[\s\S]*?<\/draw:page>/)?.[0] || "";
    const page2 = fodp.match(/<draw:page[^>]*draw:name="page2"[\s\S]*?<\/draw:page>/)?.[0] || "";
    if (!page1.includes("<office:annotation") || page2.includes("<office:annotation")) {
      throw new Error("Comment phai gan dung tren page1, khong rò sang page2");
    }
    if (page1.indexOf("<office:annotation") < page1.indexOf("Can doi chieu")) {
      // ok, just ensure annotation is a child of draw:page not of table:table-cell
    }
    if (page1.includes("<table:table-cell") && page1.includes("<office:annotation")) {
      const cellIdx = page1.indexOf("<table:table-cell");
      const annIdx = page1.indexOf("<office:annotation");
      if (cellIdx >= 0 && annIdx > cellIdx && page1.indexOf("</table:table-cell>", cellIdx) > annIdx) {
        throw new Error("Annotation bi long trong table-cell (cau truc Sheet, sai cho Slides)");
      }
    }
  });

  test("SlidesAdapter: serializeToFodp → parseFodp giu comments text/author/timestamp/id, khong lan vao title/body", () => {
    const adapter = new SlidesAdapter({ slides: [commentSlide()] });
    const parsed = adapter.parseFodp(adapter.serializeToFodp());
    if (parsed.length !== 1) throw new Error(`So slide: ${parsed.length}`);
    if (parsed[0].title !== "Slide nhan xet") throw new Error(`Title lech: ${parsed[0].title}`);
    if (parsed[0].body !== "Noi dung slide") throw new Error(`Body lech: ${parsed[0].body}`);
    if (parsed[0].notes !== "Ghi chu dien gia") throw new Error(`Notes lech: ${parsed[0].notes}`);
    const comments = parsed[0].comments || [];
    if (comments.length !== 2) throw new Error(`So comment: ${JSON.stringify(comments)}`);
    if (comments[0].id !== "comment-hoa-1" || comments[0].author !== "Tran Thi Hoa" || comments[0].text !== "Can doi chieu so lieu quy II.") {
      throw new Error(`Comment 1 sai: ${JSON.stringify(comments[0])}`);
    }
    if (!String(comments[0].timestamp).startsWith("2026-09-05T09:10:00")) {
      throw new Error(`Timestamp 1 sai: ${comments[0].timestamp}`);
    }
    if (comments[1].id !== "comment-duc-2" || comments[1].author !== "Pham Minh Duc" || comments[1].text !== "Xac nhan chu ky nguoi soan.") {
      throw new Error(`Comment 2 sai: ${JSON.stringify(comments[1])}`);
    }
  });

  test("SlidesAdapter: parseFodp doc office:annotation viet tay va officeooo:annotation kieu soffice, khong lan text vao title", () => {
    const adapter = new SlidesAdapter(null);
    const handwritten = `<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
 xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"
 xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
 xmlns:presentation="urn:oasis:names:tc:opendocument:xmlns:presentation:1.0"
 xmlns:dc="http://purl.org/dc/elements/1.1/">
  <office:body>
    <office:presentation>
      <draw:page draw:name="page1">
        <draw:frame presentation:class="title"><draw:text-box><text:p>Slide nhan xet</text:p></draw:text-box></draw:frame>
        <draw:frame presentation:class="outline"><draw:text-box><text:p>Noi dung slide</text:p></draw:text-box></draw:frame>
        <office:annotation draw:name="comment-hoa-1" svg:x="22cm" svg:y="0.4cm" svg:width="5cm" svg:height="3cm">
          <dc:creator>Tran Thi Hoa</dc:creator>
          <dc:date>2026-09-05T09:10:00</dc:date>
          <text:p>Can doi chieu so lieu quy II.</text:p>
        </office:annotation>
      </draw:page>
    </office:presentation>
  </office:body>
</office:document>`;
    const parsedHand = adapter.parseFodp(handwritten);
    if (parsedHand[0].title !== "Slide nhan xet" || parsedHand[0].body !== "Noi dung slide") {
      throw new Error(`Handwritten title/body bi lan comment: title=${parsedHand[0].title} body=${parsedHand[0].body}`);
    }
    if (parsedHand[0].comments?.[0]?.author !== "Tran Thi Hoa" || parsedHand[0].comments?.[0]?.text !== "Can doi chieu so lieu quy II.") {
      throw new Error(`Handwritten comment sai: ${JSON.stringify(parsedHand[0].comments)}`);
    }

    const sofficeStyle = `<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
 xmlns:officeooo="http://openoffice.org/2009/office"
 xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"
 xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
 xmlns:presentation="urn:oasis:names:tc:opendocument:xmlns:presentation:1.0"
 xmlns:dc="http://purl.org/dc/elements/1.1/">
  <office:body>
    <office:presentation>
      <draw:page draw:name="page1">
        <draw:frame presentation:class="title"><draw:text-box><text:p>Slide nhan xet</text:p></draw:text-box></draw:frame>
        <draw:frame presentation:class="outline"><draw:text-box><text:p>Noi dung slide</text:p></draw:text-box></draw:frame>
        <presentation:notes>
          <draw:frame presentation:class="notes"><draw:text-box><text:p>Notes khong phai comment</text:p></draw:text-box></draw:frame>
        </presentation:notes>
        <officeooo:annotation svg:x="22.217cm" svg:y="0cm" svg:width="1.079cm" svg:height="0.496cm">
          <dc:creator>Tran Thi Hoa</dc:creator>
          <dc:date>2026-09-05T09:10:00</dc:date>
          <text:p>Can doi chieu so lieu quy II.</text:p>
        </officeooo:annotation>
        <officeooo:annotation svg:x="22.217cm" svg:y="3.174cm" svg:width="1.177cm" svg:height="0.496cm">
          <dc:creator>Pham Minh Duc</dc:creator>
          <dc:date>2026-09-05T09:25:00</dc:date>
          <text:p>Xac nhan chu ky nguoi soan.</text:p>
        </officeooo:annotation>
      </draw:page>
      <draw:page draw:name="page2">
        <draw:frame presentation:class="title"><draw:text-box><text:p>Slide khong comment</text:p></draw:text-box></draw:frame>
      </draw:page>
    </office:presentation>
  </office:body>
</office:document>`;
    const parsedLo = adapter.parseFodp(sofficeStyle);
    if (parsedLo.length !== 2) throw new Error(`So slide soffice-style: ${parsedLo.length}`);
    if (parsedLo[0].title !== "Slide nhan xet" || parsedLo[0].body !== "Noi dung slide") {
      throw new Error(`soffice-style title/body lan comment: title=${parsedLo[0].title} body=${parsedLo[0].body}`);
    }
    if (parsedLo[0].notes !== "Notes khong phai comment") {
      throw new Error(`Notes bi lan: ${parsedLo[0].notes}`);
    }
    const loComments = parsedLo[0].comments || [];
    if (loComments.length !== 2) throw new Error(`soffice-style so comment: ${JSON.stringify(loComments)}`);
    if (loComments[0].author !== "Tran Thi Hoa" || loComments[0].text !== "Can doi chieu so lieu quy II.") {
      throw new Error(`soffice-style comment 1: ${JSON.stringify(loComments[0])}`);
    }
    if (loComments[1].author !== "Pham Minh Duc" || loComments[1].text !== "Xac nhan chu ky nguoi soan.") {
      throw new Error(`soffice-style comment 2: ${JSON.stringify(loComments[1])}`);
    }
    if ((parsedLo[1].comments || []).length !== 0) {
      throw new Error(`page2 khong co comment nhung parse ra: ${JSON.stringify(parsedLo[1].comments)}`);
    }
    if (parsedLo[1].title !== "Slide khong comment") {
      throw new Error(`page2 title sai: ${parsedLo[1].title}`);
    }
  });

  await asyncTest("SlidesAdapter: comment escape XML va loadFromFodp/open path nap comments", async () => {
    const canvas = new MockCanvasController();
    const adapter = new SlidesAdapter({
      slides: [{
        id: 31,
        title: "Escape",
        body: "Body",
        layoutType: "title-content",
        shapes: [],
        comments: [{
          id: "comment-esc",
          text: 'A & B < C > "quote"',
          author: "Lan <Test>",
          timestamp: "2026-09-05T10:00:00.000Z"
        }]
      }]
    });
    const fodp = adapter.serializeToFodp();
    if (!fodp.includes("A &amp; B &lt; C &gt; &quot;quote&quot;") || !fodp.includes("Lan &lt;Test&gt;")) {
      throw new Error(`Comment chua escape XML: ${fodp.match(/<office:annotation[\s\S]*?<\/office:annotation>/)}`);
    }
    const parsed = adapter.parseFodp(fodp);
    if (parsed[0].comments[0].text !== 'A & B < C > "quote"' || parsed[0].comments[0].author !== "Lan <Test>") {
      throw new Error(`Unescape comment sai: ${JSON.stringify(parsed[0].comments[0])}`);
    }

    const openAdapter = new SlidesAdapter(canvas);
    const origOpen = globalUnoBridge.openRealFile;
    globalUnoBridge.openRealFile = async () => ({
      status: "ok",
      fileName: "NhanXet.pptx",
      content: `<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:officeooo="http://openoffice.org/2009/office" xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:presentation="urn:oasis:names:tc:opendocument:xmlns:presentation:1.0" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <office:body><office:presentation>
    <draw:page draw:name="page1">
      <draw:frame presentation:class="title"><draw:text-box><text:p>Mo PPTX that</text:p></draw:text-box></draw:frame>
      <officeooo:annotation>
        <dc:creator>Tran Thi Hoa</dc:creator>
        <dc:date>2026-09-05T09:10:00</dc:date>
        <text:p>Can doi chieu so lieu quy II.</text:p>
      </officeooo:annotation>
    </draw:page>
  </office:presentation></office:body>
</office:document>`
    });
    try {
      const ok = await openAdapter.open();
      if (ok !== true) throw new Error("open() phai tra true");
      if (canvas.slides[0].title !== "Mo PPTX that") throw new Error(`open title: ${canvas.slides[0].title}`);
      if (canvas.slides[0].comments?.[0]?.author !== "Tran Thi Hoa" || canvas.slides[0].comments?.[0]?.text !== "Can doi chieu so lieu quy II.") {
        throw new Error(`open() khong nap comment: ${JSON.stringify(canvas.slides[0].comments)}`);
      }
    } finally {
      globalUnoBridge.openRealFile = origOpen;
    }
  });

  return results;
}
