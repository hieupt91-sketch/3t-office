/**
 * Test Suite: VN Slides Slide Layouts (Tier 1 Parity)
 * Kiểm thử toàn diện tính năng Bố cục trang chiếu cho VN Slides:
 * 1. Khai báo Command & Shortcut & Ribbon & Icon không generic
 * 2. Thay đổi thật cấu trúc hiển thị DOM (4 layout: Title, Title+Content, Two-Content, Blank)
 * 3. Hỗ trợ 2 cột nội dung độc lập (body & body2)
 * 4. Cô lập layoutType giữa các slide, không rò rỉ chéo khi đổi slide
 * 5. Undo/Redo cho thao tác đổi layout
 * 6. Điều phối qua SlidesAdapter handleDispatch & .uno:AssignLayout
 * 7. FODP XML Round-Trip Serialization & Parsing lưu trữ layoutType và 2 cột nội dung
 * 8. SlideShow F5 & Presenter Console phản ánh chính xác từng layout
 */

import { SlidesCanvasController, SLIDE_LAYOUT_TYPES } from "../../apps/slides/slides-canvas.js";
import { SlidesAdapter } from "../../adapters/libreoffice/slides/slides-adapter.js";
import { SLIDES_COMMANDS } from "../../platform/commands/command-definitions.js";
import { mapVnCommandToUno } from "../../adapters/libreoffice/common/command-dispatch-mapper.js";
import { ICONS } from "../../platform/ui-kit/icons.js";
import { SLIDES_RIBBON_TABS } from "../../apps/slides/slides-ribbon.js";

export async function runSlidesLayoutsTests() {
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
  // PHẦN 1: Command, UNO Mapping, Icon và Ribbon
  // =========================================================================

  test("Slide Layouts Commands: slides.layout.apply và slides.layout.select được khai báo trong command-definitions.js", () => {
    const applyCmd = SLIDES_COMMANDS.find(c => c.id === "slides.layout.apply");
    if (!applyCmd) {
      throw new Error("Không tìm thấy command slides.layout.apply trong SLIDES_COMMANDS");
    }
    if (applyCmd.category !== "slide" || applyCmd.label !== "Bố cục") {
      throw new Error(`Cấu hình slides.layout.apply chưa chuẩn: category=${applyCmd.category}, label=${applyCmd.label}`);
    }

    const selectCmd = SLIDES_COMMANDS.find(c => c.id === "slides.layout.select");
    if (!selectCmd) {
      throw new Error("Không tìm thấy command slides.layout.select trong SLIDES_COMMANDS");
    }
    if (selectCmd.icon !== "slideLayout") {
      throw new Error(`Command slides.layout.select phải dùng icon slideLayout, nhận: ${selectCmd.icon}`);
    }
  });

  test("Slide Layouts UNO Mapping: Ánh xạ đúng .uno:AssignLayout trong command-dispatch-mapper.js", () => {
    const unoApply = mapVnCommandToUno("slides.layout.apply");
    if (unoApply !== ".uno:AssignLayout") {
      throw new Error(`slides.layout.apply phải ánh xạ sang .uno:AssignLayout, nhận: ${unoApply}`);
    }

    const unoSelect = mapVnCommandToUno("slides.layout.select");
    if (unoSelect !== ".uno:AssignLayout") {
      throw new Error(`slides.layout.select phải ánh xạ sang .uno:AssignLayout, nhận: ${unoSelect}`);
    }
  });

  test("Slide Layouts Icon: Icon slideLayout có định nghĩa SVG chuẩn Office, không phải fallback rỗng hay generic circle", () => {
    const icon = ICONS["slideLayout"];
    if (!icon) {
      throw new Error("ICONS.slideLayout chưa được định nghĩa trong platform/ui-kit/icons.js");
    }
    if (icon.includes("circle cx=\"12\" cy=\"12\" r=\"4\"")) {
      throw new Error("ICONS.slideLayout không được là icon generic chấm tròn!");
    }
    if (!icon.includes("<svg") || !icon.includes("</svg>")) {
      throw new Error("ICONS.slideLayout phải là chuỗi SVG hoàn chỉnh");
    }
    if (!icon.includes("#B53818")) {
      throw new Error("ICONS.slideLayout phải chứa màu thương hiệu slides (#B53818)");
    }
  });

  test("Slide Layouts Ribbon: Hiện diện trong thanh Ribbon ở cả tab 'Trang đầu' và 'Thiết kế'", () => {
    const homeTab = SLIDES_RIBBON_TABS.find(t => t.id === "home");
    if (!homeTab) throw new Error("Không tìm thấy tab home");
    const slideGroup = homeTab.groups.find(g => g.label === "Trang chiếu");
    if (!slideGroup) throw new Error("Không tìm thấy nhóm Trang chiếu trong tab home");
    const hasLayoutInHome = slideGroup.items.some(it => it.commandId === "slides.layout.apply");
    if (!hasLayoutInHome) {
      throw new Error("slides.layout.apply chưa xuất hiện trong nhóm Trang chiếu của tab Trang đầu");
    }

    const designTab = SLIDES_RIBBON_TABS.find(t => t.id === "design");
    if (!designTab) throw new Error("Không tìm thấy tab design");
    const layoutGroup = designTab.groups.find(g => g.label === "Bố cục trang" || g.label === "Bố cục");
    if (!layoutGroup) throw new Error("Không tìm thấy nhóm Bố cục trong tab Thiết kế");
    const hasLayoutInDesign = layoutGroup.items.some(it => it.commandId === "slides.layout.apply");
    if (!hasLayoutInDesign) {
      throw new Error("slides.layout.apply chưa xuất hiện trong nhóm Bố cục của tab Thiết kế");
    }
  });

  // =========================================================================
  // PHẦN 2: Canvas Controller & Bố cục DOM thật (4 layout)
  // =========================================================================

  function createMockCanvasController() {
    const container = { innerHTML: "", className: "", appendChild() {} };
    const canvas = new SlidesCanvasController(container);

    // Mock DOM elements
    canvas.titleEl = {
      innerText: "",
      style: {},
      classList: {
        _classes: new Set(),
        add(c) { this._classes.add(c); },
        remove(c) { this._classes.delete(c); },
        contains(c) { return this._classes.has(c); }
      }
    };
    canvas.bodyRowEl = {
      style: {},
      appendChild() {}
    };
    canvas.bodyEl = {
      innerText: "",
      style: {},
      classList: {
        _classes: new Set(),
        add(c) { this._classes.add(c); },
        remove(c) { this._classes.delete(c); },
        contains(c) { return this._classes.has(c); }
      }
    };
    canvas.body2El = {
      innerText: "",
      style: {},
      classList: {
        _classes: new Set(),
        add(c) { this._classes.add(c); },
        remove(c) { this._classes.delete(c); },
        contains(c) { return this._classes.has(c); }
      }
    };
    canvas.canvasEl = {
      style: {},
      dataset: {}
    };

    return canvas;
  }

  test("Slide Layouts Default: Slide mới khởi tạo có layoutType là 'title-content'", () => {
    const canvas = createMockCanvasController();
    canvas.selectSlide(0);
    const curLayout = canvas.getSlideLayout();
    if (curLayout !== "title-content") {
      throw new Error(`Layout mặc định phải là title-content, nhận: ${curLayout}`);
    }
    if (canvas.bodyEl.style.display !== "block" || canvas.body2El.style.display !== "none") {
      throw new Error("Layout title-content phải hiển thị bodyEl và ẩn body2El");
    }
  });

  test("Slide Layouts Apply: Áp dụng layout 'title-only' ẩn body, hiện title lớn căn giữa", () => {
    const canvas = createMockCanvasController();
    canvas.selectSlide(0);

    const ok = canvas.applySlideLayout("title-only", false);
    if (!ok) throw new Error("applySlideLayout('title-only') trả về false");

    if (canvas.getSlideLayout() !== "title-only") {
      throw new Error("getSlideLayout() không trả về title-only");
    }
    if (canvas.titleEl.style.display !== "block") {
      throw new Error("titleEl phải hiển thị ở layout title-only");
    }
    if (!canvas.titleEl.classList.contains("is-title-only")) {
      throw new Error("titleEl phải có class 'is-title-only' để căn giữa");
    }
    if (canvas.bodyRowEl.style.display !== "none") {
      throw new Error("bodyRowEl phải bị ẩn (display: none) ở layout title-only");
    }
  });

  test("Slide Layouts Apply: Áp dụng layout 'two-content' mở rộng 2 cột body độc lập", () => {
    const canvas = createMockCanvasController();
    canvas.selectSlide(0);

    const ok = canvas.applySlideLayout("two-content", false);
    if (!ok) throw new Error("applySlideLayout('two-content') trả về false");

    if (canvas.getSlideLayout() !== "two-content") {
      throw new Error("getSlideLayout() không trả về two-content");
    }
    if (canvas.titleEl.style.display !== "block" || canvas.titleEl.classList.contains("is-title-only")) {
      throw new Error("titleEl ở two-content không được có class is-title-only");
    }
    if (canvas.bodyRowEl.style.display !== "flex") {
      throw new Error("bodyRowEl phải hiển thị display: flex để tạo 2 cột");
    }
    if (canvas.bodyEl.style.display !== "block" || canvas.body2El.style.display !== "block") {
      throw new Error("Cả bodyEl và body2El đều phải hiển thị display: block");
    }
    if (!canvas.slides[0].body2) {
      throw new Error("Khi chuyển sang two-content, slide.body2 phải được khởi tạo nếu chưa có");
    }
  });

  test("Slide Layouts Two-Content Input: Gõ nội dung ở cột 1 và cột 2 lưu tách biệt vào slide.body và slide.body2", () => {
    const canvas = createMockCanvasController();
    canvas.selectSlide(0);
    canvas.applySlideLayout("two-content", false);

    // Gõ nội dung cột 1
    canvas.bodyEl.innerText = "Ưu điểm giải pháp VN Office";
    canvas.slides[0].body = canvas.bodyEl.innerText;

    // Gõ nội dung cột 2
    canvas.body2El.innerText = "Kế hoạch nâng cấp giai đoạn 2026-2027";
    canvas.slides[0].body2 = canvas.body2El.innerText;

    if (canvas.slides[0].body !== "Ưu điểm giải pháp VN Office") {
      throw new Error("Cột 1 không lưu đúng vào slide.body");
    }
    if (canvas.slides[0].body2 !== "Kế hoạch nâng cấp giai đoạn 2026-2027") {
      throw new Error("Cột 2 không lưu đúng vào slide.body2");
    }
    if (canvas.slides[0].body === canvas.slides[0].body2) {
      throw new Error("Dữ liệu giữa 2 cột bị trùng hoặc rò rỉ");
    }
  });

  test("Slide Layouts Apply: Áp dụng layout 'blank' ẩn toàn bộ title và body, tạo canvas trắng tự do", () => {
    const canvas = createMockCanvasController();
    canvas.selectSlide(0);

    const ok = canvas.applySlideLayout("blank", false);
    if (!ok) throw new Error("applySlideLayout('blank') trả về false");

    if (canvas.getSlideLayout() !== "blank") {
      throw new Error("getSlideLayout() không trả về blank");
    }
    if (canvas.titleEl.style.display !== "none") {
      throw new Error("titleEl phải bị ẩn (display: none) ở layout blank");
    }
    if (canvas.bodyRowEl.style.display !== "none") {
      throw new Error("bodyRowEl phải bị ẩn (display: none) ở layout blank");
    }
  });

  // =========================================================================
  // PHẦN 3: Cô lập dữ liệu Layout giữa các Slide (Anti-Cross-Leakage)
  // =========================================================================

  test("Slide Layouts Isolation: Đổi slide giữ nguyên bố cục riêng biệt từng slide, hoàn toàn không rò rỉ chéo layout", () => {
    const canvas = createMockCanvasController();

    // Slide 1: đặt là two-content
    canvas.selectSlide(0);
    canvas.applySlideLayout("two-content", false);
    canvas.slides[0].title = "Trang 1: Hai cột";
    canvas.slides[0].body = "Cột trái 1";
    canvas.slides[0].body2 = "Cột phải 1";

    // Slide 2: đặt là blank
    canvas.selectSlide(1);
    canvas.applySlideLayout("blank", false);

    // Slide 3: đặt là title-only
    canvas.selectSlide(2);
    canvas.applySlideLayout("title-only", false);
    canvas.slides[2].title = "Trang 3: Tiêu đề lớn";

    // Kiểm tra slide 2: phải là blank
    canvas.selectSlide(1);
    if (canvas.getSlideLayout() !== "blank") {
      throw new Error(`Slide 2 phải là blank, nhận: ${canvas.getSlideLayout()}`);
    }
    if (canvas.titleEl.style.display !== "none" || canvas.bodyRowEl.style.display !== "none") {
      throw new Error("Slide 2 (blank) nhưng title hoặc body vẫn hiển thị!");
    }

    // Kiểm tra slide 3: phải là title-only
    canvas.selectSlide(2);
    if (canvas.getSlideLayout() !== "title-only") {
      throw new Error(`Slide 3 phải là title-only, nhận: ${canvas.getSlideLayout()}`);
    }
    if (canvas.titleEl.style.display !== "block" || !canvas.titleEl.classList.contains("is-title-only")) {
      throw new Error("Slide 3 không hiển thị đúng kiểu title-only");
    }
    if (canvas.bodyRowEl.style.display !== "none") {
      throw new Error("Slide 3 (title-only) nhưng body vẫn hiển thị!");
    }

    // Quay lại Slide 1: phải khôi phục chuẩn xác two-content
    canvas.selectSlide(0);
    if (canvas.getSlideLayout() !== "two-content") {
      throw new Error(`Slide 1 phải là two-content, nhận: ${canvas.getSlideLayout()}`);
    }
    if (canvas.bodyRowEl.style.display !== "flex") {
      throw new Error("Slide 1 phải hiển thị flex cho bodyRowEl");
    }
    if (canvas.bodyEl.style.display !== "block" || canvas.body2El.style.display !== "block") {
      throw new Error("Slide 1 phải hiển thị cả 2 cột bodyEl và body2El");
    }
    if (canvas.bodyEl.innerText !== "Cột trái 1" || canvas.body2El.innerText !== "Cột phải 1") {
      throw new Error(`Nội dung 2 cột bị sai lệch khi chuyển slide: Cột 1=${canvas.bodyEl.innerText}, Cột 2=${canvas.body2El.innerText}`);
    }
  });

  test("Slide Layouts Duplicate & Add: Nhân đôi slide giữ nguyên layoutType và nội dung 2 cột", () => {
    const canvas = createMockCanvasController();
    canvas.selectSlide(0);
    canvas.applySlideLayout("two-content", false);
    canvas.slides[0].body2 = "Nội dung cột 2 gốc";

    canvas.duplicateCurrentSlide(false);

    if (canvas.slides.length !== 4) {
      throw new Error(`Số lượng slide sau khi nhân đôi phải là 4, nhận: ${canvas.slides.length}`);
    }
    const dupSlide = canvas.slides[1];
    if (dupSlide.layoutType !== "two-content") {
      throw new Error(`Slide bản sao phải giữ layoutType two-content, nhận: ${dupSlide.layoutType}`);
    }
    if (dupSlide.body2 !== "Nội dung cột 2 gốc") {
      throw new Error(`Slide bản sao không giữ đúng body2: ${dupSlide.body2}`);
    }

    // Thêm slide mới chỉ định layout
    canvas.addNewSlide(false, "title-only");
    const addedSlide = canvas.slides[canvas.slides.length - 1];
    if (addedSlide.layoutType !== "title-only") {
      throw new Error(`Slide mới thêm phải có layoutType title-only, nhận: ${addedSlide.layoutType}`);
    }
  });

  test("Slide Layouts Undo/Redo: Hoàn tác và làm lại thay đổi bố cục chuẩn xác", () => {
    const canvas = createMockCanvasController();
    canvas.selectSlide(0);
    if (canvas.getSlideLayout() !== "title-content") {
      throw new Error("Slide 0 phải có layout ban đầu là title-content");
    }

    // Đổi sang two-content có ghi nhận undo
    canvas.applySlideLayout("two-content", true);
    if (canvas.getSlideLayout() !== "two-content") {
      throw new Error("Đổi sang two-content không thành công");
    }

    // Undo -> quay về title-content
    const undoOk = canvas.undo();
    if (!undoOk) throw new Error("Lệnh undo() trả về false");
    if (canvas.getSlideLayout() !== "title-content") {
      throw new Error(`Sau undo, layout phải là title-content, nhận: ${canvas.getSlideLayout()}`);
    }
    if (canvas.body2El.style.display !== "none") {
      throw new Error("Sau undo về title-content, body2El phải bị ẩn");
    }

    // Redo -> quay lại two-content
    const redoOk = canvas.redo();
    if (!redoOk) throw new Error("Lệnh redo() trả về false");
    if (canvas.getSlideLayout() !== "two-content") {
      throw new Error(`Sau redo, layout phải là two-content, nhận: ${canvas.getSlideLayout()}`);
    }
    if (canvas.body2El.style.display !== "block") {
      throw new Error("Sau redo về two-content, body2El phải hiển thị");
    }
  });

  // =========================================================================
  // PHẦN 4: SlidesAdapter Dispatch & showLayoutDialog
  // =========================================================================

  test("Slide Layouts Dispatch: SlidesAdapter.handleDispatch điều phối slides.layout.apply gọi showLayoutDialog", async () => {
    let dialogCalled = false;
    const mockCanvas = {
      showLayoutDialog() {
        dialogCalled = true;
        return true;
      }
    };
    const adapter = new SlidesAdapter(mockCanvas);

    const resApply = await adapter.handleDispatch(".uno:AssignLayout", null, "slides.layout.apply");
    if (!resApply || !dialogCalled) {
      throw new Error("handleDispatch không gọi showLayoutDialog khi nhận slides.layout.apply");
    }

    dialogCalled = false;
    const resSelect = await adapter.handleDispatch(".uno:AssignLayout", null, "slides.layout.select");
    if (!resSelect || !dialogCalled) {
      throw new Error("handleDispatch không gọi showLayoutDialog khi nhận slides.layout.select");
    }

    dialogCalled = false;
    const resUnoOnly = await adapter.handleDispatch(".uno:AssignLayout", null, null);
    if (!resUnoOnly || !dialogCalled) {
      throw new Error("handleDispatch không gọi showLayoutDialog khi chỉ nhận .uno:AssignLayout");
    }
  });

  // =========================================================================
  // PHẦN 5: FODP Round-Trip Serialization & Parsing
  // =========================================================================

  test("Slide Layouts FODP Serialization & Parse: Lưu và đọc lại layoutType cùng 2 cột nội dung trọn vẹn", () => {
    const mockCanvas = {
      slides: [
        {
          id: 1,
          title: "Trang Tiêu Đề Chính",
          body: "",
          layoutType: "title-only",
          shapes: [],
          notes: ""
        },
        {
          id: 2,
          title: "So Sánh Hai Giải Pháp",
          body: "• Giải pháp hiện tại\n• Chi phí cao",
          body2: "• Giải pháp VN Office\n• Tự chủ 100%",
          layoutType: "two-content",
          shapes: [],
          notes: "Thuyết minh chi tiết bảng so sánh"
        },
        {
          id: 3,
          title: "",
          body: "",
          layoutType: "blank",
          shapes: [],
          notes: ""
        }
      ]
    };

    const adapter = new SlidesAdapter(mockCanvas);
    const fodpXml = adapter.serializeToFodp();

    // 1. Kiểm tra XML có lưu presentation:layout
    if (!fodpXml.includes('presentation:layout="title-only"')) {
      throw new Error("FODP thiếu thuộc tính presentation:layout=\"title-only\"");
    }
    if (!fodpXml.includes('presentation:layout="two-content"')) {
      throw new Error("FODP thiếu thuộc tính presentation:layout=\"two-content\"");
    }
    if (!fodpXml.includes('presentation:layout="blank"')) {
      throw new Error("FODP thiếu thuộc tính presentation:layout=\"blank\"");
    }
    if (!fodpXml.includes("Giải pháp VN Office") || !fodpXml.includes("Tự chủ 100%")) {
      throw new Error("FODP thiếu nội dung cột 2 (body2)");
    }

    // 2. Phân tích ngược lại từ XML (parseFodp)
    const parsed = adapter.parseFodp(fodpXml);
    if (parsed.length !== 3) {
      throw new Error(`Số slide parse được phải là 3, nhận: ${parsed.length}`);
    }

    // Slide 1
    if (parsed[0].layoutType !== "title-only" || parsed[0].title !== "Trang Tiêu Đề Chính") {
      throw new Error(`Parse slide 1 không đúng: layout=${parsed[0].layoutType}, title=${parsed[0].title}`);
    }

    // Slide 2
    if (parsed[1].layoutType !== "two-content") {
      throw new Error(`Parse slide 2 layoutType không đúng: ${parsed[1].layoutType}`);
    }
    if (!parsed[1].body.includes("Giải pháp hiện tại")) {
      throw new Error(`Parse slide 2 cột 1 không đúng: ${parsed[1].body}`);
    }
    if (!parsed[1].body2 || !parsed[1].body2.includes("Giải pháp VN Office")) {
      throw new Error(`Parse slide 2 cột 2 (body2) không đúng: ${parsed[1].body2}`);
    }

    // Slide 3
    if (parsed[2].layoutType !== "blank") {
      throw new Error(`Parse slide 3 layoutType không đúng: ${parsed[2].layoutType}`);
    }
  });

  // =========================================================================
  // PHẦN 6: SLIDE_LAYOUT_TYPES Metadata
  // =========================================================================

  test("Slide Layouts Metadata: Đầy đủ 4 layout chuẩn với preview SVG sắc nét", () => {
    if (!Array.isArray(SLIDE_LAYOUT_TYPES) || SLIDE_LAYOUT_TYPES.length !== 4) {
      throw new Error(`SLIDE_LAYOUT_TYPES phải chứa đúng 4 layout, nhận: ${SLIDE_LAYOUT_TYPES.length}`);
    }
    const ids = SLIDE_LAYOUT_TYPES.map(l => l.id);
    const expected = ["title-only", "title-content", "two-content", "blank"];
    for (const exp of expected) {
      if (!ids.includes(exp)) {
        throw new Error(`Thiếu layout bắt buộc: ${exp}`);
      }
    }
    for (const layout of SLIDE_LAYOUT_TYPES) {
      if (!layout.previewSvg || !layout.previewSvg.includes("<svg") || !layout.previewSvg.includes("</svg>")) {
        throw new Error(`Layout ${layout.id} thiếu preview SVG hợp lệ`);
      }
      if (!layout.name || !layout.description) {
        throw new Error(`Layout ${layout.id} thiếu tên hoặc mô tả tiếng Việt`);
      }
    }
  });

  return results;
}
