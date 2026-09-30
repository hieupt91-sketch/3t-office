/**
 * Unit tests — G8 VN Slides basics vs PowerPoint 2016 (docs/HANDOFF-SLIDES-BASICS.md).
 * Mỗi test ứng với một lỗi đã đo được trên app thật + PowerPoint COM
 * (scripts/layout-audit/_slides_basic_ops.py) và FAIL trước khi sửa.
 */
import { SlidesCanvasController } from "../../apps/slides/slides-canvas.js";
import { SlidesAdapter } from "../../adapters/libreoffice/slides/slides-adapter.js";
import { SLIDES_COMMANDS } from "../../platform/commands/command-definitions.js";
import { mapVnCommandToUno } from "../../adapters/libreoffice/common/command-dispatch-mapper.js";
import { SLIDES_RIBBON_TABS } from "../../apps/slides/slides-ribbon.js";
import { globalShortcutManager } from "../../platform/commands/shortcut-manager.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function newCanvas() {
  const canvas = new SlidesCanvasController({ innerHTML: "", className: "", appendChild() {} });
  canvas.slides = [
    { id: 1, title: "Một", body: "", layoutType: "title-content", shapes: [], notes: "" },
    { id: 2, title: "Hai", body: "", layoutType: "title-content", shapes: [], notes: "" },
    { id: 3, title: "Ba", body: "", layoutType: "title-content", shapes: [], notes: "" }
  ];
  canvas.currentSlideIndex = 0;
  return canvas;
}

export async function runSlidesBasicsG8Tests() {
  const results = [];
  const test = async (name, fn) => {
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (err) {
      results.push({ name, pass: false, error: err.message });
    }
  };

  // ---------------------------------------------------------------- D1
  await test("D1 Ctrl+M: trang mới chèn NGAY SAU trang đang chọn, placeholder trống (không chữ gợi ý thành nội dung)", () => {
    const canvas = newCanvas();
    canvas.selectSlide(0);
    canvas.addNewSlide();
    assert(canvas.slides.length === 4, `phải có 4 trang, có ${canvas.slides.length}`);
    assert(canvas.currentSlideIndex === 1, `trang mới phải ở vị trí 2 (index 1), đang ở ${canvas.currentSlideIndex}`);
    const added = canvas.slides[1];
    assert(added.title === "" && added.body === "", `placeholder phải trống, nhận title='${added.title}' body='${added.body}'`);
    assert(canvas.slides[2].title === "Hai", "các trang sau phải dời xuống giữ nguyên thứ tự");
    canvas.undo();
    assert(canvas.slides.length === 3 && canvas.slides[1].title === "Hai", "Ctrl+Z phải gỡ đúng trang vừa chèn");
  });

  await test("D1 Nhân đôi trang: bản sao giữ nguyên tiêu đề (không thêm « (Bản sao)»)", () => {
    const canvas = newCanvas();
    canvas.selectSlide(1);
    canvas.duplicateCurrentSlide();
    assert(canvas.slides[2].title === "Hai", `tiêu đề bản sao phải là 'Hai', nhận '${canvas.slides[2].title}'`);
  });

  await test("D1 Bố cục Hai nội dung: cột phải là placeholder trống, cả khi thêm trang mới two-content", () => {
    const canvas = newCanvas();
    canvas.selectSlide(0);
    canvas.applySlideLayout("two-content");
    assert(canvas.slides[0].body2 === "", `body2 phải rỗng, nhận '${canvas.slides[0].body2}'`);
    canvas.addNewSlide(true, "two-content");
    assert(canvas.slides[canvas.currentSlideIndex].body2 === "", "trang two-content mới phải có body2 rỗng");
  });

  await test("D1/D8 Lưu: tiêu đề trống giữ placeholder trống — không tự ghi «Trang chiếu N»", () => {
    const canvas = newCanvas();
    canvas.slides[1].title = "";
    const fodp = new SlidesAdapter(canvas).serializeToFodp();
    assert(!/Trang chiếu 2/.test(fodp), "FODP không được chứa chữ tự điền 'Trang chiếu 2'");
  });

  // ---------------------------------------------------------------- D3
  await test("D3 Chèn > Hộp văn bản: tạo đối tượng textbox riêng, khung nội dung không đổi", async () => {
    const canvas = newCanvas();
    canvas.selectSlide(0);
    canvas.slides[0].body = "Nội dung gốc";
    const adapter = new SlidesAdapter(canvas);
    const ok = await adapter.handleDispatch(".uno:Text", null, "slides.text.insert");
    assert(ok === true, "slides.text.insert phải trả true");
    const shapes = canvas.slides[0].shapes;
    assert(shapes.length === 1 && shapes[0].type === "textbox", `phải có 1 textbox, nhận ${JSON.stringify(shapes.map(s => s.type))}`);
    assert(canvas.slides[0].body === "Nội dung gốc", `body không được đổi, nhận '${canvas.slides[0].body}'`);
  });

  await test("D3 Hộp văn bản giữ nhiều đoạn (Enter) để gạch đầu dòng/đánh số nhiều mục", () => {
    const canvas = newCanvas();
    canvas.selectSlide(0);
    canvas.insertTextBox();
    const tb = canvas.slides[0].shapes[0];
    canvas.updateShapeText(tb.id, "Bước một\nBước hai\n");
    assert(tb.text === "Bước một\nBước hai", `textbox phải giữ 2 đoạn, nhận ${JSON.stringify(tb.text)}`);
    const fodp = new SlidesAdapter(canvas).serializeToFodp();
    assert(/Bước một<\/text:p>|Bước một<\/text:span><\/text:p>/.test(fodp) && /Bước hai/.test(fodp), "FODP phải có 2 đoạn riêng");
  });

  await test("D3 Cỡ chữ: ô ribbon '6' = 32pt; từ khóa CSS/px quy đổi sang pt (không ghi 'xx-large')", () => {
    // Tệp mở từ ngoài (96 dpi, 0,75 pt/px).
    const importedCanvas = newCanvas();
    importedCanvas.ptPerPx = 0.75;
    const adapter = new SlidesAdapter(importedCanvas);
    assert(adapter._ribbonFontSizeToPt("6") === 32, "ô cỡ '6' phải là 32pt");
    assert(adapter._ribbonFontSizeToPt("20") === 20, "giá trị số phải giữ nguyên pt");
    const fromKeyword = adapter._styleFromHtmlAttrs("span", ' style="font-size: xx-large"');
    assert(fromKeyword.size === "24pt", `xx-large (32px) phải thành 24pt, nhận ${fromKeyword.size}`);
    const fromPx = adapter._styleFromHtmlAttrs("span", ' style="font-size: 48px"');
    assert(fromPx.size === "36pt", `48px phải thành 36pt, nhận ${fromPx.size}`);
    const fromPt = adapter._styleFromHtmlAttrs("span", ' style="font-size: 32pt"');
    assert(fromPt.size === "32pt", `32pt giữ nguyên, nhận ${fromPt.size}`);
    // Bản mới (khổ PowerPoint thật, 1 pt/px): 32 px trên canvas = 32 pt trong tệp.
    const fresh = new SlidesAdapter(newCanvas());
    const freshPx = fresh._styleFromHtmlAttrs("span", ' style="font-size: 32px"');
    assert(freshPx.size === "32pt", `bản mới 32px phải thành 32pt, nhận ${freshPx.size}`);
  });

  await test("D3 Không lưu nền bán trong suốt của khung đang chọn thành màu tô sáng; font-weight normal bỏ đậm", () => {
    const adapter = new SlidesAdapter(newCanvas());
    const css = adapter._styleFromHtmlAttrs("span", ' style="font-weight: normal; background-color: rgba(254, 242, 242, 0.5); color: rgb(255, 0, 0)"');
    assert(css.bg === undefined, `không được có bg, nhận ${css.bg}`);
    assert(css.bold === false, "font-weight: normal phải cho bold=false");
    assert(css.color === "#ff0000", `màu chữ giữ nguyên, nhận ${css.color}`);
    const hl = adapter._styleFromHtmlAttrs("span", ' style="background-color: rgb(255, 205, 0)"');
    assert(hl.bg === "#ffcd00", "màu tô sáng đặc vẫn phải giữ");
  });

  await test("D3/D5 Lưu: tiêu đề/nội dung mang phông, cỡ, màu, đậm, căn lề như màn hình VN (LibreOffice bỏ qua prTitle)", () => {
    const canvas = newCanvas();
    canvas.masterTheme = { ...canvas.masterTheme, fontFamily: "Arial, sans-serif", titleColor: "#1e3a8a", bodyColor: "#334155" };
    canvas.slides = [{ id: 1, title: "Doanh thu", body: "Dòng 1", layoutType: "title-content", shapes: [] }];
    const adapter = new SlidesAdapter(canvas);
    const fodp = adapter.serializeToFodp();
    // Bản mới: canvas 32 px / 20 px = 32 pt / 20 pt trên trang 960 × 540 pt (giữ đúng tỉ lệ màn hình).
    assert(/fo:font-weight="bold"[^>]*fo:color="#1e3a8a"[^>]*fo:font-family="Arial"[^>]*fo:font-size="32pt"/.test(fodp), "phải có style chữ tiêu đề Arial 32pt đậm #1e3a8a");
    assert(/fo:color="#334155"[^>]*fo:font-family="Arial"[^>]*fo:font-size="20pt"/.test(fodp), "phải có style chữ nội dung Arial 20pt #334155");
    assert(/fo:text-align="left"/.test(fodp), "tiêu đề/nội dung căn trái như màn hình (LibreOffice mặc định căn giữa tiêu đề)");
    canvas.imported = true;
    const imported = adapter.serializeToFodp();
    assert(!/fo:font-size="24pt"/.test(imported), "tệp mở từ ngoài không bị áp định dạng chủ đề VN");
  });

  // ---------------------------------------------------------------- D4
  await test("D4 Chèn bảng: mọi ô trống như PowerPoint (không điền «Cột 1»…)", async () => {
    const canvas = newCanvas();
    canvas.selectSlide(0);
    const table = await canvas.insertTable({ rows: 2, cols: 3 });
    assert(table.cells.flat().every(cell => cell === ""), `ô phải trống, nhận ${JSON.stringify(table.cells)}`);
  });

  await test("D4 Sắp lớp: Đưa lên/xuống một lớp, lên trên cùng, xuống dưới cùng + Hoàn tác/Làm lại", () => {
    const canvas = newCanvas();
    canvas.selectSlide(0);
    canvas.slides[0].shapes = [{ id: "a", type: "rect", x: 0, y: 0, w: 10, h: 10 }, { id: "b", type: "rect", x: 0, y: 0, w: 10, h: 10 }, { id: "c", type: "rect", x: 0, y: 0, w: 10, h: 10 }];
    const order = () => canvas.slides[0].shapes.map(s => s.id).join("");
    canvas.setSelectedTarget("a");
    assert(canvas.reorderSelectedShapes("forward") && order() === "bac", `forward: ${order()}`);
    assert(canvas.reorderSelectedShapes("front") && order() === "bca", `front: ${order()}`);
    assert(canvas.reorderSelectedShapes("backward") && order() === "bac", `backward: ${order()}`);
    assert(canvas.reorderSelectedShapes("back") && order() === "abc", `back: ${order()}`);
    assert(canvas.reorderSelectedShapes("back") === false, "đã dưới cùng thì không đổi");
    canvas.undo();
    assert(order() === "bac", `undo phải trả về bac, nhận ${order()}`);
    canvas.redo();
    assert(order() === "abc", `redo phải về abc, nhận ${order()}`);
  });

  await test("D4 Sắp lớp: lệnh có trong Command Bus, ánh xạ UNO, ribbon Sắp xếp và dispatch adapter", async () => {
    for (const id of ["slides.arrange.bringForward", "slides.arrange.sendBackward", "slides.arrange.bringToFront", "slides.arrange.sendToBack"]) {
      assert(SLIDES_COMMANDS.some(c => c.id === id), `thiếu định nghĩa ${id}`);
      assert(mapVnCommandToUno(id), `thiếu ánh xạ UNO ${id}`);
    }
    const arrange = SLIDES_RIBBON_TABS.find(t => t.id === "home").groups.find(g => g.id === "drawing").items.find(i => i.id === "slides.drawing.arrange");
    assert(arrange.items.some(i => i.commandId === "slides.arrange.sendToBack"), "ribbon Sắp xếp phải có Đưa xuống dưới cùng");
    const canvas = newCanvas();
    canvas.selectSlide(0);
    canvas.slides[0].shapes = [{ id: "a", type: "rect", x: 0, y: 0, w: 10, h: 10 }, { id: "b", type: "rect", x: 0, y: 0, w: 10, h: 10 }];
    canvas.setSelectedTarget("b");
    const ok = await new SlidesAdapter(canvas).handleDispatch(".uno:SendToBack", null, "slides.arrange.sendToBack");
    assert(ok === true && canvas.slides[0].shapes[0].id === "b", "dispatch sendToBack phải đưa b xuống dưới cùng");
  });

  await test("D4 Kéo/đổi cỡ ở thu phóng khác 100%: tỉ lệ con trỏ = kích thước hiển thị / kích thước trang", () => {
    const canvas = newCanvas();
    canvas.canvasEl = { offsetWidth: 960, getBoundingClientRect: () => ({ width: 768 }) };
    assert(Math.abs(canvas._pointerScale() - 0.8) < 1e-9, `thu phóng 80% phải cho tỉ lệ 0.8, nhận ${canvas._pointerScale()}`);
  });

  await test("D4/D8 Hình xoay: lưu/đọc vị trí theo góc CHƯA xoay (tâm xoay như PowerPoint)", () => {
    const canvas = newCanvas();
    canvas.slides = [{ id: 1, title: "", layoutType: "blank", shapes: [{ id: "r1", type: "rect", x: 200, y: 160, w: 320, h: 120, rotation: 30, color: "#3b82f6", text: "" }] }];
    const adapter = new SlidesAdapter(canvas);
    const fodp = adapter.serializeToFodp();
    const m = fodp.match(/translate \(([\d.]+)cm ([\d.]+)cm\)/);
    assert(m, "phải có draw:transform translate");
    // T = C − R(30°)(160, 60) = (251.44, 88.04) px; bản mới 1 px = 1 pt → (8.870cm, 3.106cm)
    assert(Math.abs(parseFloat(m[1]) - 8.870) < 0.01 && Math.abs(parseFloat(m[2]) - 3.106) < 0.01, `translate sai: ${m[1]} ${m[2]}`);
    // Đọc lại như tệp mở từ ngoài (96 dpi): 200/160 pt = 266.7/213.3 px.
    const back = adapter.parseFodp(fodp)[0].shapes.find(s => s.type === "rect" || s.type === "custom" || s.rotation);
    assert(back && Math.abs(back.x - 266.7) <= 1 && Math.abs(back.y - 213.3) <= 1, `đọc lại phải về x=266.7 y=213.3 px, nhận ${back?.x} ${back?.y}`);
  });

  await test("D8 Tệp PowerPoint mở rồi lưu lại: khung Tiêu đề giữ vai trò placeholder tiêu đề (không thành hộp chữ thường)", () => {
    const fodp = `<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0" xmlns:presentation="urn:oasis:names:tc:opendocument:xmlns:presentation:1.0">
<office:body><office:presentation><draw:page draw:name="Slide1" draw:master-page-name="Office">
<draw:frame draw:name="PlaceHolder 1" presentation:class="title" svg:x="2cm" svg:y="1cm" svg:width="20cm" svg:height="3cm"><draw:text-box><text:p>Báo cáo năm</text:p></draw:text-box></draw:frame>
<draw:frame draw:name="PlaceHolder 2" presentation:class="outline" svg:x="2cm" svg:y="5cm" svg:width="20cm" svg:height="8cm"><draw:text-box><text:p>Nội dung</text:p></draw:text-box></draw:frame>
</draw:page></office:presentation></office:body></office:document>`;
    const canvas = newCanvas();
    const adapter = new SlidesAdapter(canvas);
    const slides = adapter.parseFodp(fodp);
    const title = slides[0].shapes.find(s => s.text === "Báo cáo năm");
    assert(title && title.presentationClass === "title", `khung tiêu đề phải nhớ presentationClass=title, nhận ${title?.presentationClass}`);
    canvas.slides = slides;
    canvas.imported = true;
    const out = adapter.serializeToFodp();
    assert(/<draw:frame [^>]*presentation:class="title"[^>]*>\s*<draw:text-box>\s*<text:p>Báo cáo năm/.test(out), "lưu lại phải ghi khung Báo cáo năm với presentation:class=title");
    assert(/presentation:class="outline"[^>]*>\s*<draw:text-box>\s*<text:p>Nội dung/.test(out), "khung nội dung giữ presentation:class=outline");
  });

  // ---------------------------------------------------------------- D5
  await test("D5 Khổ trang bản mới = preset PowerPoint: Widescreen 12192000×6858000 EMU, Standard (4:3) 9144000×6858000 type=screen4x3", async () => {
    const { parseIntendedSlideSizeFromFodp, applyIntendedSlideSize } = await import("../../adapters/libreoffice/slides/pptx-master-logo.js");
    const canvas = newCanvas();
    assert(canvas.ptPerPx === 1, "bản mới phải dùng 1 px = 1 pt");
    const adapter = new SlidesAdapter(canvas);
    const wide = parseIntendedSlideSizeFromFodp(adapter.serializeToFodp());
    assert(wide.cx === 12192000 && wide.cy === 6858000 && wide.type === "", `16:9 sai: ${JSON.stringify(wide)}`);
    canvas.setSlideSize({ preset: "standard" }, false);
    assert(canvas.slideSize.width === 720 && canvas.slideSize.height === 540, "canvas 4:3 vẫn 720 × 540 px (màn hình không đổi)");
    const std = parseIntendedSlideSizeFromFodp(adapter.serializeToFodp());
    assert(std.cx === 9144000 && std.cy === 6858000 && std.type === "screen4x3", `4:3 sai: ${JSON.stringify(std)}`);
    const lo = '<p:presentation><p:sldSz cx="9144000" cy="6857999"/></p:presentation>';
    assert(applyIntendedSlideSize(lo, std).includes('<p:sldSz cx="9144000" cy="6858000" type="screen4x3"/>'), "phải ghi đúng sldSz kèm type");
    const lo2 = '<p:presentation><p:sldSz cx="12192120" cy="6858000" type="custom"/></p:presentation>';
    assert(applyIntendedSlideSize(lo2, wide).includes('<p:sldSz cx="12192000" cy="6858000"/>'), "Widescreen không có type");
  });

  await test("D5 Tệp mở từ PowerPoint giữ NGUYÊN khổ gốc tới từng EMU khi lưu lại (không làm tròn qua px/cm)", async () => {
    const { parseIntendedSlideSizeFromFodp } = await import("../../adapters/libreoffice/slides/pptx-master-logo.js");
    const fodp = `<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0" xmlns:presentation="urn:oasis:names:tc:opendocument:xmlns:presentation:1.0">
<office:automatic-styles><style:page-layout style:name="PM1"><style:page-layout-properties fo:page-width="28.002cm" fo:page-height="15.752cm" style:print-orientation="landscape"/></style:page-layout></office:automatic-styles>
<office:master-styles><style:master-page style:name="Office" style:page-layout-name="PM1"/></office:master-styles>
<office:body><office:presentation><draw:page draw:name="S1" draw:master-page-name="Office"><draw:frame presentation:class="title" svg:x="1cm" svg:y="1cm" svg:width="20cm" svg:height="3cm"><draw:text-box><text:p>Tiêu đề</text:p></draw:text-box></draw:frame></draw:page></office:presentation></office:body></office:document>`;
    const pres = '<p:presentation><p:sldSz cx="10080625" cy="5670550"/></p:presentation>';
    const canvas = newCanvas();
    const adapter = new SlidesAdapter(canvas);
    adapter.loadFromFodp(fodp, pres);
    assert(canvas.ptPerPx === 0.75, "tệp mở từ ngoài dùng 96 dpi");
    const size = parseIntendedSlideSizeFromFodp(adapter.serializeToFodp());
    assert(size.cx === 10080625 && size.cy === 5670550, `khổ gốc phải giữ nguyên, nhận ${JSON.stringify(size)}`);
    canvas.setSlideSize({ preset: "wide" }, false);
    const changed = parseIntendedSlideSizeFromFodp(adapter.serializeToFodp());
    assert(changed.cx === 12192000 && changed.cy === 6858000, `đổi sang Widescreen phải ra đúng preset, nhận ${JSON.stringify(changed)}`);
  });

  // ---------------------------------------------------------------- D6
  await test("D6 Trình chiếu: ↓/↑/Enter/Backspace/Home/End chuyển trang, phím tắt soạn thảo tạm tắt, không chèn chữ VN OFFICE", () => {
    const listeners = [];
    const made = [];
    const makeEl = (tag) => {
      const el = {
        tagName: String(tag).toUpperCase(), style: {}, dataset: {}, className: "", innerHTML: "", children: [], parentNode: null,
        setAttribute() {}, appendChild(child) { child.parentNode = this; this.children.push(child); return child; },
        removeChild(child) { child.parentNode = null; }, addEventListener() {}, focus() {}, get offsetWidth() { return 960; }
      };
      made.push(el);
      return el;
    };
    const origDocument = globalThis.document;
    globalThis.document = {
      activeElement: null,
      createElement: makeEl,
      body: makeEl("body"),
      addEventListener(type, fn) { if (type === "keydown") listeners.push(fn); },
      removeEventListener(type, fn) { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); }
    };
    try {
      const canvas = newCanvas();
      canvas.masterTheme = { ...canvas.masterTheme, logoText: "", footerText: "", showLogo: false, showFooter: false };
      globalShortcutManager.setActiveScope("slides");
      const show = canvas.startSlideShow(0);
      assert(globalShortcutManager.getActiveScope() === "slides-show", "đang chiếu phải tạm tắt phím tắt soạn thảo (PageDown/F5/Delete)");
      const press = (key) => listeners.forEach(fn => fn({ key, preventDefault() {}, ctrlKey: false, altKey: false, metaKey: false }));
      press("ArrowDown"); assert(show.getIndex() === 1, `↓ phải sang trang 2, đang ${show.getIndex()}`);
      press("Enter"); assert(show.getIndex() === 2, `Enter phải sang trang 3, đang ${show.getIndex()}`);
      press("ArrowUp"); assert(show.getIndex() === 1, `↑ phải về trang 2, đang ${show.getIndex()}`);
      press("Home"); assert(show.getIndex() === 0, "Home về trang đầu");
      press("End"); assert(show.getIndex() === 2, "End tới trang cuối");
      press("Backspace"); assert(show.getIndex() === 1, "Backspace về trang trước");
      const html = made.map(el => el.innerHTML).join(" ");
      assert(!/VN OFFICE|Tài liệu thuyết trình VN Office/.test(html), "màn chiếu không được tự chèn chữ VN OFFICE khi mẫu không có logo/chân trang");
      press("Escape");
      assert(globalShortcutManager.getActiveScope() === "slides", "thoát chiếu phải trả lại phím tắt Slides");
    } finally {
      globalThis.document = origDocument;
    }
  });

  // ---------------------------------------------------------------- D7
  await test("D7 Ghi chú: lưu thành placeholder notes thật (presentation:style-name + ảnh trang) để PowerPoint hiện trong khung Ghi chú", () => {
    const canvas = newCanvas();
    canvas.slides[0].notes = "Ghi chú 1\nGhi chú 2";
    const fodp = new SlidesAdapter(canvas).serializeToFodp();
    assert(/<draw:frame presentation:style-name="prNotes" presentation:class="notes"/.test(fodp), "khung notes phải có presentation:style-name");
    assert(/<style:style style:name="prNotes" style:family="presentation">/.test(fodp), "phải khai báo style prNotes");
    assert(/<draw:page-thumbnail presentation:class="page"/.test(fodp), "trang ghi chú phải có ảnh trang chiếu");
    const back = new SlidesAdapter(newCanvas()).parseFodp(fodp);
    assert(back[0].notes === "Ghi chú 1\nGhi chú 2", `đọc lại ghi chú sai: ${JSON.stringify(back[0].notes)}`);
  });

  return results;
}
