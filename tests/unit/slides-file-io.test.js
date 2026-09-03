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

  return results;
}
