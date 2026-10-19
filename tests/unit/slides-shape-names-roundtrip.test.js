import assert from "node:assert/strict";
import { SlidesAdapter } from "../../adapters/libreoffice/slides/slides-adapter.js";

export async function runSlidesShapeNamesRoundtripTests() {
  const results = [];
  const test = (name, fn) => {
    try {
      fn();
      results.push({ name, pass: true });
    } catch (err) {
      results.push({ name, pass: false, error: err.message });
    }
  };

  test("1. Khứ hồi FODP giữ tên có dấu, dấu nháy kép, dấu nháy đơn, ký tự đặc biệt", () => {
    const specialName = `Hình "đặc biệt" & 'vip' (màu xanh)`;
    const canvas = {
      slides: [{
        shapes: [
          { id: "custom-shape-1", type: "rect", name: specialName, x: 50, y: 50, w: 200, h: 100 }
        ]
      }],
      selectSlide(i) { this.currentSlideIndex = i; },
      setSlideSize(s) { this.slideSize = s; }
    };
    const adapter = new SlidesAdapter(canvas);
    const xml = adapter.serializeToFodp();

    assert.ok(xml.includes(`vno:shape-id="custom-shape-1"`), "FODP phải có vno:shape-id");
    assert.ok(xml.includes(`draw:name="Hình &quot;đặc biệt&quot; &amp; &apos;vip&apos; (màu xanh)"`), "FODP phải escape XML cho draw:name");

    const parsed = new SlidesAdapter(null).parseFodp(xml);
    assert.equal(parsed[0].shapes.length, 1);
    assert.equal(parsed[0].shapes[0].id, "custom-shape-1", "id nội bộ được khôi phục chính xác từ vno:shape-id");
    assert.equal(parsed[0].shapes[0].name, specialName, "tên hình có dấu và dấu nháy được khôi phục nguyên vẹn");
  });

  test("2. Khứ hồi FODP an toàn với tên chứa thẻ HTML/script", () => {
    const htmlName = `<img src=x onerror=alert(1)> & <b class="test">`;
    const canvas = {
      slides: [{
        shapes: [
          { id: "xss-test-1", type: "ellipse", name: htmlName, x: 10, y: 10, w: 100, h: 100 }
        ]
      }],
      selectSlide(i) { this.currentSlideIndex = i; },
      setSlideSize(s) { this.slideSize = s; }
    };
    const adapter = new SlidesAdapter(canvas);
    const xml = adapter.serializeToFodp();

    assert.ok(!xml.includes(`<img`), "FODP không được chứa thẻ HTML thô chưa escape");
    assert.ok(xml.includes(`&lt;img src=x onerror=alert(1)&gt;`), "FODP phải escape đúng ký tự HTML");

    const parsed = new SlidesAdapter(null).parseFodp(xml);
    assert.equal(parsed[0].shapes[0].id, "xss-test-1");
    assert.equal(parsed[0].shapes[0].name, htmlName, "Tên chứa HTML được đọc lại an toàn nguyên bản");
  });

  test("3. Hai hình trùng tên trên cùng một trang được cấp ID riêng, không để trùng id", () => {
    const canvas = {
      slides: [{
        shapes: [
          { id: "rect-a", type: "rect", name: "Tiêu đề phụ", x: 10, y: 10, w: 100, h: 50 },
          { id: "rect-b", type: "rect", name: "Tiêu đề phụ", x: 10, y: 70, w: 100, h: 50 }
        ]
      }],
      selectSlide(i) { this.currentSlideIndex = i; },
      setSlideSize(s) { this.slideSize = s; }
    };
    const adapter = new SlidesAdapter(canvas);
    const xml = adapter.serializeToFodp();

    const parsed = new SlidesAdapter(null).parseFodp(xml);
    assert.equal(parsed[0].shapes.length, 2);
    assert.equal(parsed[0].shapes[0].id, "rect-a");
    assert.equal(parsed[0].shapes[1].id, "rect-b");
    assert.equal(parsed[0].shapes[0].name, "Tiêu đề phụ");
    assert.equal(parsed[0].shapes[1].name, "Tiêu đề phụ");
  });

  test("4. Tệp cũ không có vno:shape-id mở ra không hiện mã máy làm tên (ink-..., số dài)", () => {
    const oldFodp = `<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
 xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"
 xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
 xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0"
 xmlns:presentation="urn:oasis:names:tc:opendocument:xmlns:presentation:1.0">
 <office:body><office:presentation>
  <draw:page draw:name="Trang 1">
   <draw:custom-shape draw:id="shape-1" draw:name="ink-1792314159822-9xi4h" svg:x="1cm" svg:y="1cm" svg:width="5cm" svg:height="3cm">
    <text:p>Nét vẽ</text:p>
   </draw:custom-shape>
   <draw:custom-shape draw:id="shape-2" draw:name="1792314159822" svg:x="1cm" svg:y="5cm" svg:width="5cm" svg:height="3cm">
    <text:p>Hình số</text:p>
   </draw:custom-shape>
   <draw:custom-shape draw:id="shape-3" draw:name="Rectangle 5" svg:x="1cm" svg:y="9cm" svg:width="5cm" svg:height="3cm">
    <text:p>Hình từ tệp thật</text:p>
   </draw:custom-shape>
  </draw:page>
 </office:presentation></office:body>
</office:document>`;

    const parsed = new SlidesAdapter(null).parseFodp(oldFodp);
    const shapes = parsed[0].shapes;
    assert.equal(shapes.length, 3);
    assert.equal(shapes[0].id, "ink-1792314159822-9xi4h", "id cũ được giữ");
    assert.equal(shapes[0].name, undefined, "mã máy ink-... không được dùng làm name");

    assert.equal(shapes[1].id, 1792314159822, "id số cũ được giữ");
    assert.equal(shapes[1].name, undefined, "số dài timestamp không được dùng làm name");

    assert.equal(shapes[2].id, "Rectangle 5", "id tệp ngoài được giữ");
    assert.equal(shapes[2].name, "Rectangle 5", "tên người dùng/Office thật 'Rectangle 5' được giữ làm name");
  });

  test("5. Tệp cũ không có vno:shape-id bị trùng draw:name vẫn nhận id duy nhất không va chạm", () => {
    const duplicateFodp = `<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
 xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"
 xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
 xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0"
 xmlns:presentation="urn:oasis:names:tc:opendocument:xmlns:presentation:1.0">
 <office:body><office:presentation>
  <draw:page draw:name="Trang 1">
   <draw:custom-shape draw:name="Box" svg:x="1cm" svg:y="1cm" svg:width="5cm" svg:height="3cm"><text:p>1</text:p></draw:custom-shape>
   <draw:custom-shape draw:name="Box" svg:x="1cm" svg:y="5cm" svg:width="5cm" svg:height="3cm"><text:p>2</text:p></draw:custom-shape>
  </draw:page>
 </office:presentation></office:body>
</office:document>`;

    const parsed = new SlidesAdapter(null).parseFodp(duplicateFodp);
    const shapes = parsed[0].shapes;
    assert.equal(shapes.length, 2);
    assert.notEqual(shapes[0].id, shapes[1].id, "Hai hình phải có ID khác nhau khi mở tệp");
    assert.equal(shapes[0].id, "Box");
    assert.equal(shapes[1].id, "Box-2");
    assert.equal(shapes[0].name, "Box");
    assert.equal(shapes[1].name, "Box");
  });

  test("6. Xuất FODP tự động sinh tên mặc định tiếng Việt duy nhất theo loại trên trang khi shape.name rỗng", () => {
    const canvas = {
      slides: [{
        shapes: [
          { id: "s1", type: "rect", x: 10, y: 10, w: 100, h: 50 },
          { id: "s2", type: "rect", x: 10, y: 70, w: 100, h: 50 },
          { id: "s3", type: "ellipse", x: 10, y: 130, w: 100, h: 50 }
        ]
      }],
      selectSlide(i) { this.currentSlideIndex = i; },
      setSlideSize(s) { this.slideSize = s; }
    };
    const adapter = new SlidesAdapter(canvas);
    const xml = adapter.serializeToFodp();

    assert.ok(xml.includes(`draw:name="Hình chữ nhật 1"`), "rect đầu tiên sinh tên Hình chữ nhật 1");
    assert.ok(xml.includes(`draw:name="Hình chữ nhật 2"`), "rect thứ hai sinh tên Hình chữ nhật 2");
    assert.ok(xml.includes(`draw:name="Hình elip 1"`), "ellipse sinh tên Hình elip 1");
  });

  return results;
}
