/**
 * Test Suite: VN Slides Object Animations & Speaker Notes
 * Kiểm thử toàn diện:
 * 1. Lưu cấu hình Animation vào đối tượng (Title, Body, Shapes)
 * 2. Cô lập dữ liệu Speaker Notes giữa các trang chiếu (chống rò rỉ dữ liệu chéo slide)
 * 3. Chế độ Presenter Console độc lập với SlideShow F5
 * 4. FODP XML Round-Trip Serialization & Parsing giữ toàn vẹn Speaker Notes
 * 5. Điều phối lệnh Command Bus & UNO Adapter
 */

import { SlidesCanvasController } from "../../apps/slides/slides-canvas.js";
import { SlidesAdapter } from "../../adapters/libreoffice/slides/slides-adapter.js";
import { mapVnCommandToUno, getVnCommand } from "../../adapters/libreoffice/common/command-dispatch-mapper.js";

export async function runSlidesAnimationsNotesTests() {
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

  // =========================================================================
  // PHẦN 1: Cấu hình Animation trên từng đối tượng (Title, Body, Shapes)
  // =========================================================================

  test("Animations Config: Lưu đúng hiệu ứng fadeIn, flyIn, zoomIn vào Title, Body và Shape", () => {
    const container = { innerHTML: "", className: "", appendChild() {} };
    const canvas = new SlidesCanvasController(container);

    // 1. Áp animation cho Title
    canvas.setObjectAnimation("title", { type: "fadeIn", duration: 600, delay: 200 });
    const titleAnim = canvas.getObjectAnimation("title");
    if (titleAnim.type !== "fadeIn" || titleAnim.duration !== 600 || titleAnim.delay !== 200) {
      throw new Error(`Cấu hình titleAnimation không khớp: ${JSON.stringify(titleAnim)}`);
    }

    // 2. Áp animation cho Body
    canvas.setObjectAnimation("body", { type: "flyIn", duration: 750, delay: 300 });
    const bodyAnim = canvas.getObjectAnimation("body");
    if (bodyAnim.type !== "flyIn" || bodyAnim.duration !== 750 || bodyAnim.delay !== 300) {
      throw new Error(`Cấu hình bodyAnimation không khớp: ${JSON.stringify(bodyAnim)}`);
    }

    // 3. Chèn hình khối và áp animation cho Shape
    canvas.slides[0].shapes = [
      { id: 999, type: "rect", x: 100, y: 100, w: 200, h: 100, color: "#3b82f6" }
    ];
    canvas.setObjectAnimation(999, { type: "zoomIn", duration: 500, delay: 100 });
    const shapeAnim = canvas.getObjectAnimation(999);
    if (shapeAnim.type !== "zoomIn" || shapeAnim.duration !== 500 || shapeAnim.delay !== 100) {
      throw new Error(`Cấu hình shape.animation không khớp: ${JSON.stringify(shapeAnim)}`);
    }

    // 4. Xóa animation về "none"
    canvas.setObjectAnimation(999, { type: "none" });
    const clearedAnim = canvas.getObjectAnimation(999);
    if (clearedAnim.type !== "none") {
      throw new Error(`Xóa animation thất bại: ${JSON.stringify(clearedAnim)}`);
    }
  });

  test("Animations Copy: Nhân đôi slide (duplicate) sao chép nguyên vẹn cấu hình animation mà không làm biến dạng bản gốc", () => {
    const container = { innerHTML: "", className: "", appendChild() {} };
    const canvas = new SlidesCanvasController(container);
    canvas.currentSlideIndex = 0;
    canvas.setObjectAnimation("title", { type: "fadeIn", duration: 600, delay: 150 });
    canvas.slides[0].shapes = [
      { id: 101, type: "ellipse", x: 50, y: 50, w: 100, h: 100, color: "#10b981", animation: { type: "bounceIn", duration: 800, delay: 200 } }
    ];

    canvas.duplicateCurrentSlide(false);

    if (canvas.slides.length !== 4) {
      throw new Error(`Số lượng slide sau khi nhân đôi không đúng: ${canvas.slides.length}`);
    }

    const dupSlide = canvas.slides[1];
    if (!dupSlide.titleAnimation || dupSlide.titleAnimation.type !== "fadeIn" || dupSlide.titleAnimation.duration !== 600) {
      throw new Error(`Slide bản sao không giữ đúng titleAnimation: ${JSON.stringify(dupSlide.titleAnimation)}`);
    }

    if (!dupSlide.shapes[0].animation || dupSlide.shapes[0].animation.type !== "bounceIn") {
      throw new Error(`Shape trong slide bản sao không giữ đúng animation: ${JSON.stringify(dupSlide.shapes[0])}`);
    }

    // Biến đổi slide bản sao không ảnh hưởng slide gốc (deep copy)
    dupSlide.shapes[0].animation.type = "none";
    if (canvas.slides[0].shapes[0].animation.type !== "bounceIn") {
      throw new Error("Lỗi tham chiếu nông (shallow copy): sửa animation bản sao làm đổi luôn bản gốc");
    }
  });

  // =========================================================================
  // PHẦN 2: Speaker Notes — Cô lập dữ liệu giữa các slide (Anti-Leakage)
  // =========================================================================

  test("Speaker Notes Isolation: Gõ ghi chú ở slide 1, chuyển sang slide 2 ghi chú hoàn toàn độc lập, không rò rỉ chéo", () => {
    const container = { innerHTML: "", className: "", appendChild() {} };
    const canvas = new SlidesCanvasController(container);

    // Thiết lập mock DOM elements cho notesTextarea
    let mockTextareaVal = "";
    canvas.notesTextarea = {
      get value() { return mockTextareaVal; },
      set value(v) { mockTextareaVal = v; },
      focus() {}
    };
    canvas.notesCharCountEl = { textContent: "" };

    // Slide 0: Gán ghi chú
    canvas.selectSlide(0);
    canvas.slides[0].notes = "Ghi chú riêng của trang chiếu 1";
    canvas.notesTextarea.value = canvas.slides[0].notes;

    // Chuyển sang Slide 1: Phải hiển thị ghi chú của slide 1, KHÔNG phải slide 0
    canvas.selectSlide(1);
    if (canvas.notesTextarea.value === "Ghi chú riêng của trang chiếu 1") {
      throw new Error("Lỗi rò rỉ dữ liệu: Ghi chú của slide 1 bị tràn sang slide 2!");
    }
    if (canvas.notesTextarea.value !== canvas.slides[1].notes) {
      throw new Error(`Notes textarea không hiển thị đúng ghi chú slide 2: ${canvas.notesTextarea.value}`);
    }

    // Người dùng sửa ghi chú ở Slide 1
    canvas.notesTextarea.value = "Ghi chú hoàn toàn mới cho trang chiếu 2";
    canvas.slides[1].notes = canvas.notesTextarea.value;

    // Chuyển lại về Slide 0: Ghi chú của slide 0 phải còn nguyên vẹn 100%
    canvas.selectSlide(0);
    if (canvas.notesTextarea.value !== "Ghi chú riêng của trang chiếu 1") {
      throw new Error(`Ghi chú slide 1 bị sai sau khi quay lại: ${canvas.notesTextarea.value}`);
    }
    if (canvas.slides[0].notes !== "Ghi chú riêng của trang chiếu 1") {
      throw new Error("Dữ liệu slide 0 trong model bị ghi đè bởi slide 1");
    }

    // Kiểm tra slide 1 trong mảng dữ liệu vẫn giữ đúng nội dung riêng của nó
    if (canvas.slides[1].notes !== "Ghi chú hoàn toàn mới cho trang chiếu 2") {
      throw new Error("Dữ liệu slide 1 trong model bị thất lạc");
    }
  });

  test("Speaker Notes Add/Delete: Tạo slide mới có notes rỗng, xóa slide chuyển ghi chú đúng vị trí", () => {
    const container = { innerHTML: "", className: "", appendChild() {} };
    const canvas = new SlidesCanvasController(container);

    let mockTextareaVal = "";
    canvas.notesTextarea = {
      get value() { return mockTextareaVal; },
      set value(v) { mockTextareaVal = v; }
    };
    canvas.notesCharCountEl = { textContent: "" };

    canvas.addNewSlide(false);
    const addedSlide = canvas.slides[canvas.slides.length - 1];

    if (typeof addedSlide.notes !== "string" || addedSlide.notes !== "") {
      throw new Error(`Slide mới tạo phải có notes là chuỗi rỗng, thực tế: ${addedSlide.notes}`);
    }

    // Gán notes cho slide mới
    addedSlide.notes = "Ghi chú của slide mới tạo";
    canvas.selectSlide(canvas.slides.length - 1);
    if (canvas.notesTextarea.value !== "Ghi chú của slide mới tạo") {
      throw new Error("Textarea không cập nhật đúng khi chọn slide mới tạo");
    }
  });

  // =========================================================================
  // PHẦN 3: Chế độ Presenter View vs Trình chiếu F5
  // =========================================================================

  test("SlideShow F5: Khán giả không nhìn thấy Speaker Notes khi xem trình chiếu tiêu chuẩn", () => {
    let appendedEl = null;
    const origDocument = globalThis.document;

    globalThis.document = {
      createElement: (tag) => {
        const el = {
          tagName: tag.toUpperCase(),
          style: {},
          className: "",
          innerHTML: "",
          appendChild(child) { this.child = child; },
          addEventListener() {},
          removeEventListener() {}
        };
        return el;
      },
      body: {
        appendChild(el) { appendedEl = el; }
      },
      addEventListener() {},
      removeEventListener() {}
    };

    try {
      const container = { innerHTML: "", className: "", appendChild() {} };
      const canvas = new SlidesCanvasController(container);
      canvas.slides[0].notes = "BÍ MẬT NỘI BỘ: Không được để khán giả thấy ghi chú này!";

      canvas.startSlideShow(0);

      if (!appendedEl) {
        throw new Error("startSlideShow không gắn overlay trình chiếu vào document.body");
      }

      const overlayHtml = appendedEl.child ? appendedEl.child.innerHTML : appendedEl.innerHTML;
      if (overlayHtml.includes("BÍ MẬT NỘI BỘ")) {
        throw new Error("LỖI NGHIÊM TRỌNG: Ghi chú người thuyết trình bị lộ trên màn hình khán giả F5!");
      }
    } finally {
      globalThis.document = origDocument;
    }
  });

  test("Presenter Mode: Hiển thị đầy đủ ghi chú người thuyết trình và đồng hồ", () => {
    let presenterOverlay = null;
    const origDocument = globalThis.document;

    globalThis.document = {
      createElement: (tag) => {
        const element = {
          tagName: tag.toUpperCase(),
          style: {},
          className: "",
          innerHTML: "",
          querySelector(selector) {
            return {
              style: {},
              textContent: "",
              innerHTML: "",
              addEventListener() {}
            };
          },
          appendChild() {},
          addEventListener() {},
          removeEventListener() {}
        };
        return element;
      },
      body: {
        appendChild(el) { presenterOverlay = el; }
      },
      addEventListener() {},
      removeEventListener() {}
    };

    try {
      const container = { innerHTML: "", className: "", appendChild() {} };
      const canvas = new SlidesCanvasController(container);
      canvas.slides[0].notes = "Ghi chú dành riêng cho Presenter Console.";

      const ok = canvas.startPresenterMode(0);
      if (!ok || !presenterOverlay) {
        throw new Error("startPresenterMode không khởi chạy thành công");
      }

      if (!presenterOverlay.innerHTML.includes("PRESENTER VIEW") || !presenterOverlay.innerHTML.includes("vno-presenter-timer")) {
        throw new Error("Presenter View thiếu giao diện bảng điều khiển thuyết trình hoặc đồng hồ");
      }
    } finally {
      globalThis.document = origDocument;
    }
  });

  // =========================================================================
  // PHẦN 4: FODP XML Round-Trip với Speaker Notes
  // =========================================================================

  test("FODP Serialization & Parse: Ghi và đọc lại Speaker Notes giữ nguyên vẹn ký tự tiếng Việt có dấu", () => {
    const canvasMock = {
      slides: [
        {
          id: 1,
          title: "Bản báo cáo kinh doanh 2026",
          body: "• Doanh thu tăng trưởng 18%\n• Lợi nhuận vượt mức chỉ tiêu",
          shapes: [],
          notes: "Nhấn mạnh số liệu quý 4: Đã đạt & vượt 120% kế hoạch đề ra!\nCần lưu ý: Tỷ giá ngoại tệ."
        },
        {
          id: 2,
          title: "Định hướng quý tiếp theo",
          body: "• Mở rộng thị trường phía Nam",
          shapes: [],
          notes: ""
        }
      ]
    };

    const adapter = new SlidesAdapter(canvasMock);
    const xml = adapter.serializeToFodp();

    // Kiểm tra thẻ presentation:notes
    if (!xml.includes("<presentation:notes>")) {
      throw new Error("FODP XML thiếu thẻ <presentation:notes>");
    }
    if (!xml.includes("Nhấn mạnh số liệu quý 4: Đã đạt &amp; vượt 120% kế hoạch đề ra!")) {
      throw new Error("Speaker notes chưa được escape hoặc lưu đúng vào XML");
    }

    // Parse ngược lại
    const parsed = adapter.parseFodp(xml);
    if (parsed.length !== 2) {
      throw new Error(`Số slide parse sai: ${parsed.length}`);
    }

    if (parsed[0].notes !== "Nhấn mạnh số liệu quý 4: Đã đạt & vượt 120% kế hoạch đề ra!\nCần lưu ý: Tỷ giá ngoại tệ.") {
      throw new Error(`Nội dung notes parse lại không khớp:\nThực tế: ${parsed[0].notes}`);
    }

    // Kiểm tra slide 2 notes rỗng
    if (parsed[1].notes !== "") {
      throw new Error(`Slide 2 không có notes nhưng parse ra: ${parsed[1].notes}`);
    }

    // Kiểm tra body không bị lẫn notes
    if (parsed[0].body.includes("Nhấn mạnh số liệu")) {
      throw new Error("Lỗi rò rỉ: Thẻ notes bị parse nhầm vào slide body!");
    }
  });

  // =========================================================================
  // PHẦN 5: Ánh xạ UNO & Điều phối Command Bus
  // =========================================================================

  test("UNO Mapping & Dispatch: slides.animation.apply, slides.notes.toggle, slides.show.presenterMode", async () => {
    // 1. Ánh xạ 2 chiều
    const animUno = mapVnCommandToUno("slides.animation.apply");
    if (animUno !== ".uno:CustomAnimation") {
      throw new Error(`slides.animation.apply ánh xạ sai: ${animUno}`);
    }
    if (getVnCommand(".uno:CustomAnimation") !== "slides.animation.apply") {
      throw new Error("Ánh xạ ngược .uno:CustomAnimation thất bại");
    }

    const notesUno = mapVnCommandToUno("slides.notes.toggle");
    if (notesUno !== ".uno:InsertAnnotation") {
      throw new Error(`slides.notes.toggle ánh xạ sai: ${notesUno}`);
    }

    const presenterUno = mapVnCommandToUno("slides.show.presenterMode");
    if (presenterUno !== ".uno:PresenterConsole") {
      throw new Error(`slides.show.presenterMode ánh xạ sai: ${presenterUno}`);
    }

    // 2. Dispatch thật qua SlidesAdapter
    let animDialogOpened = false;
    let notesToggled = false;
    let presenterStarted = false;

    const mockCanvas = {
      showAnimationDialog: () => { animDialogOpened = true; return true; },
      toggleNotes: () => { notesToggled = true; return true; },
      startPresenterMode: () => { presenterStarted = true; return true; }
    };

    const adapter = new SlidesAdapter(mockCanvas);

    await adapter.handleDispatch(".uno:CustomAnimation", null, "slides.animation.apply");
    if (!animDialogOpened) throw new Error("handleDispatch không gọi canvas.showAnimationDialog");

    await adapter.handleDispatch(".uno:InsertAnnotation", null, "slides.notes.toggle");
    if (!notesToggled) throw new Error("handleDispatch không gọi canvas.toggleNotes");

    await adapter.handleDispatch(".uno:PresenterConsole", null, "slides.show.presenterMode");
    if (!presenterStarted) throw new Error("handleDispatch không gọi canvas.startPresenterMode");
  });

  test("Morph: matches only same-id same-type shapes with finite geometry", () => {
    const canvas = new SlidesCanvasController({ innerHTML: "", className: "", appendChild() {} });
    const matches = canvas._getMorphMatches(
      { shapes: [
        { id: "stable", type: "rect", x: 10, y: 20, w: 100, h: 60, color: "#ff0000" },
        { id: "wrong-type", type: "ellipse", x: 0, y: 0, w: 20, h: 20 },
        { id: "connector", type: "connector", x: 0, y: 0, w: 20, h: 20 }
      ] },
      { shapes: [
        { id: "stable", type: "rect", x: 210, y: 120, w: 200, h: 90, color: "#0000ff" },
        { id: "wrong-type", type: "rect", x: 0, y: 0, w: 20, h: 20 },
        { id: "connector", type: "connector", x: 0, y: 0, w: 20, h: 20 },
        { id: "new", type: "rect", x: 0, y: 0, w: 20, h: 20 }
      ] }
    );
    if (matches.length !== 1 || matches[0].id !== "stable") {
      throw new Error(`Morph matching incorrect: ${JSON.stringify(matches.map(item => item.id))}`);
    }
  });

  test("Morph FODP: custom vno metadata round-trips with a standards-safe SMIL fade fallback", () => {
    const source = {
      slides: [{
        id: 1, title: "Morph", body: "", layoutType: "blank", shapes: [],
        transition: { type: "morph", duration: 800 }
      }]
    };
    const adapter = new SlidesAdapter(source);
    const xml = adapter.serializeToFodp();
    if (!xml.includes('xmlns:vno="urn:vn-office:slides:1.0"') || !xml.includes('vno:transition="morph"')) {
      throw new Error("FODP is missing custom vno:transition Morph metadata");
    }
    if (!xml.includes('smil:type="fade"') || !xml.includes('smil:dur="0.8s"')) {
      throw new Error("FODP Morph is missing the safe SMIL fade fallback");
    }
    const parsed = new SlidesAdapter(null).parseFodp(xml);
    if (parsed[0]?.transition?.type !== "morph" || parsed[0]?.transition?.duration !== 800) {
      throw new Error(`Morph FODP round-trip incorrect: ${JSON.stringify(parsed[0]?.transition)}`);
    }
  });

  return results;
}
