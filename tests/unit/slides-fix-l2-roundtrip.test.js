import assert from "node:assert/strict";
import { SlidesAdapter } from "../../adapters/libreoffice/slides/slides-adapter.js";

const FODP = `<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
 xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"
 xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
 xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0"
 xmlns:presentation="urn:oasis:names:tc:opendocument:xmlns:presentation:1.0"
 xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
 xmlns:smil="urn:oasis:names:tc:opendocument:xmlns:smil-compatible:1.0">
 <office:automatic-styles>
  <style:style style:name="dp1" style:family="drawing-page">
   <style:drawing-page-properties smil:type="fade" smil:dur="500ms"/>
  </style:style>
 </office:automatic-styles>
 <office:body><office:presentation>
  <draw:page draw:name="Trang 1" draw:style-name="dp1">
   <draw:frame draw:name="title" presentation:class="title" svg:x="1cm" svg:y="1cm" svg:width="20cm" svg:height="2cm"><draw:text-box><text:p>Tiêu đề</text:p></draw:text-box></draw:frame>
   <draw:frame draw:name="body" presentation:class="outline" svg:x="1cm" svg:y="4cm" svg:width="20cm" svg:height="10cm"><draw:text-box><text:p>Nội dung</text:p></draw:text-box></draw:frame>
   <draw:custom-shape draw:name="textbox-1" svg:x="2cm" svg:y="2cm" svg:width="5cm" svg:height="2cm"><draw:text-box><text:p>Hộp kiểm thử L2</text:p></draw:text-box></draw:custom-shape>
   <draw:frame draw:name="user-frame" presentation:class="outline" presentation:user-transformed="true" svg:x="3cm" svg:y="5cm" svg:width="5cm" svg:height="2cm"><draw:text-box><text:p>Nhãn lớp giữa</text:p></draw:text-box></draw:frame>
   <draw:custom-shape draw:name="shape-2" svg:x="8cm" svg:y="2cm" svg:width="4cm" svg:height="3cm"><draw:enhanced-geometry draw:type="ooxml-rect"/></draw:custom-shape>
  </draw:page>
 </office:presentation></office:body>
</office:document>`;

export async function runSlidesFixL2RoundtripTests() {
  const canvas = {
    slides: [],
    selectSlide(index) { this.currentSlideIndex = index; },
    setSlideSize(size) { this.slideSize = size; }
  };
  const adapter = new SlidesAdapter(canvas);
  adapter.loadFromFodp(FODP);

  assert.equal(canvas.slides.length, 1, "FODP trang chiếu được nạp vào canvas");
  assert.deepEqual(
    canvas.slides[0].shapes.map(({ type, text }) => ({ type, text })),
    [
      { type: "rect", text: "Hộp kiểm thử L2" },
      { type: "textbox", text: "Nhãn lớp giữa" },
      { type: "rect", text: "" }
    ],
    "textbox và hình giữ đúng nội dung cùng thứ tự lớp"
  );
  assert.equal(canvas.slides[0].transition?.type, "fade", "giữ transition fade sau parse + load");

  const serialized = adapter.serializeToFodp();
  const reopened = new SlidesAdapter(null).parseFodp(serialized)[0];
  assert.deepEqual(
    reopened.shapes.map(({ type, text }) => ({ type, text })),
    canvas.slides[0].shapes.map(({ type, text }) => ({ type, text })),
    "serialize + parse giữ nguyên đối tượng và thứ tự lớp"
  );
  assert.equal(reopened.transition?.type, "fade", "serialize + parse giữ transition fade");
  return [{
    name: "Slides FIX-L2 FODP -> canvas -> FODP giữ textbox, shape, thứ tự lớp và fade",
    pass: true
  }];
}
