/**
 * VN Slides — Vị trí hình bị XOAY trong file PPTX thật bị đọc sai.
 *
 * Lỗi thật đã xác nhận qua probe soffice thật: khi một hình (ảnh, hình khối,
 * v.v.) trong PPTX thật bị XOAY, soffice ghi vị trí qua
 * draw:transform="rotate(...) translate(...)" — svg:x/svg:y HOÀN TOÀN VẮNG
 * MẶT trong trường hợp đó. `_parseFrameShape()` trước đây chỉ đọc thẳng
 * svg:x/svg:y, không kiểm tra draw:transform, khiến mọi hình bị xoay luôn
 * bị đặt nhầm về góc (0,0) thay vì đúng vị trí thật.
 *
 * Lỗi thứ 2, sâu hơn: `_parseDrawTranslate()` (hàm dùng chung cho cả
 * <draw:g> nhóm SmartArt lẫn <draw:frame> hình đơn) có regex yêu cầu
 * "translate(" liền nhau, nhưng soffice thật ghi "translate (5.318cm
 * 1.726cm)" — CÓ khoảng trắng — nên regex không bao giờ khớp, luôn rơi về
 * nhánh dự phòng svg:x/svg:y (thường vắng mặt) → vị trí sai.
 *
 * Đã capture đúng nguyên văn đoạn draw:frame từ soffice thật (probe PPTX
 * có ảnh xoay 45°, offset x=1000000 EMU y=1000000 EMU, ext 1828800 EMU
 * vuông) làm fixture cho test này.
 *
 * Tuân thủ chuẩn 06-testing/TESTING-STANDARD.md & AGENTS.md
 */
import { SlidesAdapter } from "../../adapters/libreoffice/slides/slides-adapter.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

/** Capture nguyên văn từ soffice thật (probe PPTX ảnh xoay 45°, 07/09/2026). */
const SOFFICE_ROTATED_IMAGE_FODP = `<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
 xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"
 xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
 xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0"
 xmlns:presentation="urn:oasis:names:tc:opendocument:xmlns:presentation:1.0"
 xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0">
  <office:body><office:presentation>
    <draw:page draw:name="Slide1">
      <draw:frame draw:name="Picture 1" draw:style-name="gr3" draw:text-style-name="P7" draw:layer="layout" svg:width="5.079cm" svg:height="5.079cm" draw:transform="rotate (-0.785398163397449) translate (5.318cm 1.726cm)">
        <draw:image draw:mime-type="image/png">
          <office:binary-data>iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=</office:binary-data>
          <text:p/>
        </draw:image>
      </draw:frame>
    </draw:page>
  </office:presentation></office:body>
</office:document>`;

export async function runSlidesRotatedShapePositionTests() {
  const results = [];
  const test = (name, fn) => { try { fn(); results.push({ name, pass: true }); } catch (error) { results.push({ name, pass: false, error: error.message }); } };

  test("parseFodp(): ảnh bị xoay trong PPTX thật (draw:transform=\"rotate(...) translate(...)\") phải lấy đúng vị trí, không rơi về (0,0)", () => {
    const slides = new SlidesAdapter(null).parseFodp(SOFFICE_ROTATED_IMAGE_FODP);
    const shapes = slides[0]?.shapes || [];
    const image = shapes.find(s => s.type === "image");
    assert(image, "Phải parse được shape type=image");
    // 5.318cm và 1.726cm ở 96dpi: cm * 96 / 2.54
    const expectedX = Math.round(5.318 * 96 / 2.54);
    const expectedY = Math.round(1.726 * 96 / 2.54);
    assert(Math.abs(image.x - expectedX) <= 2, `x phải ~${expectedX}px (từ translate), thực tế: ${image.x} (0 nghĩa là bug cũ chưa sửa)`);
    assert(Math.abs(image.y - expectedY) <= 2, `y phải ~${expectedY}px (từ translate), thực tế: ${image.y}`);
  });

  test("parseFodp(): kích thước ảnh xoay vẫn đọc đúng từ svg:width/height (không bị ảnh hưởng bởi fix vị trí)", () => {
    const slides = new SlidesAdapter(null).parseFodp(SOFFICE_ROTATED_IMAGE_FODP);
    const image = (slides[0]?.shapes || []).find(s => s.type === "image");
    const expectedSize = Math.round(5.079 * 96 / 2.54);
    assert(Math.abs(image.w - expectedSize) <= 2, `w phải ~${expectedSize}px, thực tế: ${image.w}`);
    assert(Math.abs(image.h - expectedSize) <= 2, `h phải ~${expectedSize}px, thực tế: ${image.h}`);
  });

  test("_parseDrawTranslate(): khớp đúng cả khi CÓ khoảng trắng giữa tên hàm và dấu ngoặc (định dạng soffice thật ghi ra)", () => {
    const adapter = new SlidesAdapter(null);
    const withSpace = adapter._parseDrawTranslate('draw:transform="rotate (-0.785) translate (5.318cm 1.726cm)"');
    const noSpace = adapter._parseDrawTranslate('draw:transform="translate(5.318cm,1.726cm)"');
    assert(Math.abs(withSpace.x - Math.round(5.318 * 96 / 2.54)) <= 2, `Định dạng CÓ khoảng trắng phải khớp, thực tế x=${withSpace.x}`);
    assert(Math.abs(noSpace.x - Math.round(5.318 * 96 / 2.54)) <= 2, "Định dạng KHÔNG khoảng trắng (dấu phẩy) vẫn phải khớp như trước — không được thoái lui");
  });

  // Tính năng mới: HIỂN THỊ (chỉ đọc) góc xoay đọc được từ file thật — xem
  // HANDOFF-SLIDES-SHAPE-ROTATION-DISPLAY.md. ODF rotate(radian) dùng chiều
  // DƯƠNG = ngược kim đồng hồ (chuẩn toán học), OOXML/CSS transform:rotate(deg)
  // dùng chiều DƯƠNG = xuôi kim đồng hồ — _parseDrawTranslate() phải đảo dấu
  // khi quy đổi để CSS hiển thị đúng chiều xoay thật của PowerPoint.
  test("_parseDrawTranslate(): trả về rotationDeg đúng dấu/độ lớn (đảo dấu radian ODF sang độ CSS xuôi kim đồng hồ)", () => {
    const adapter = new SlidesAdapter(null);
    // OOXML rot=1800000 (1/60000 độ) = 30° xuôi kim đồng hồ → soffice ghi
    // rotate(-0.5235987755982988) [radian, ngược kim đồng hồ theo ODF].
    const result = adapter._parseDrawTranslate('draw:transform="rotate (-0.5235987755982988) translate (5.233cm 1.019cm)"');
    assert(Math.abs(result.rotationDeg - 30) < 0.01, `rotationDeg phải ~30 (xuôi kim đồng hồ, khớp CSS transform:rotate), thực tế: ${result.rotationDeg}`);
  });

  test("_parseDrawTranslate(): rotationDeg = 0 khi không có draw:transform (không thoái lui)", () => {
    const adapter = new SlidesAdapter(null);
    const result = adapter._parseDrawTranslate('svg:x="3cm" svg:y="4cm"');
    assert(result.rotationDeg === 0, `rotationDeg phải là 0 khi không xoay, thực tế: ${result.rotationDeg}`);
  });

  test("parseFodp(): ảnh xoay 45° (fixture soffice thật) có shape.rotation ~45, KHÔNG có trường rotation khi không xoay", () => {
    const slides = new SlidesAdapter(null).parseFodp(SOFFICE_ROTATED_IMAGE_FODP);
    const image = (slides[0]?.shapes || []).find(s => s.type === "image");
    assert(Math.abs(image.rotation - 45) < 0.01, `image.rotation phải ~45, thực tế: ${image.rotation}`);

    const unrotatedFodp = `<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0" xmlns:presentation="urn:oasis:names:tc:opendocument:xmlns:presentation:1.0">
<office:body><office:presentation><draw:page draw:name="Slide1">
<draw:frame draw:name="Picture 1" svg:width="2cm" svg:height="2cm" svg:x="3cm" svg:y="4cm">
<draw:image draw:mime-type="image/png"><office:binary-data>iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=</office:binary-data></draw:image>
</draw:frame></draw:page></office:presentation></office:body></office:document>`;
    const unrotated = new SlidesAdapter(null).parseFodp(unrotatedFodp);
    const plainImage = (unrotated[0]?.shapes || []).find(s => s.type === "image");
    assert(plainImage.rotation === undefined, `image không xoay KHÔNG được có trường rotation, thực tế: ${plainImage.rotation}`);
  });

  test("parseFodp(): shape KHÔNG xoay (chỉ có svg:x/svg:y bình thường) vẫn đọc đúng như trước — không thoái lui", () => {
    const fodp = `<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0" xmlns:presentation="urn:oasis:names:tc:opendocument:xmlns:presentation:1.0">
<office:body><office:presentation>
<draw:page draw:name="Slide1">
<draw:frame draw:name="Picture 1" svg:width="2cm" svg:height="2cm" svg:x="3cm" svg:y="4cm">
<draw:image draw:mime-type="image/png"><office:binary-data>iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=</office:binary-data></draw:image>
</draw:frame>
</draw:page>
</office:presentation></office:body>
</office:document>`;
    const slides = new SlidesAdapter(null).parseFodp(fodp);
    const image = (slides[0]?.shapes || []).find(s => s.type === "image");
    const expectedX = Math.round(3 * 96 / 2.54);
    const expectedY = Math.round(4 * 96 / 2.54);
    assert(Math.abs(image.x - expectedX) <= 2, `x không xoay phải ~${expectedX}px, thực tế: ${image.x}`);
    assert(Math.abs(image.y - expectedY) <= 2, `y không xoay phải ~${expectedY}px, thực tế: ${image.y}`);
  });

  // Cùng lỗi thật, nhưng xảy ra ĐỘC LẬP trong _parseDrawShape() (rect/
  // ellipse/custom-shape) — hàm khác với _parseFrameShape() (ảnh/bảng/
  // chart/wordart/textbox), không dùng chung base object nên phải sửa
  // riêng. Rất phổ biến trong sơ đồ/biểu trình bày thật (hình chữ nhật/
  // mũi tên xoay). Đoạn draw:custom-shape capture từ probe soffice thật
  // (07/09/2026): hình chữ nhật xoay -30°, offset x=1500000 y=800000 EMU.
  const SOFFICE_ROTATED_RECT_FODP = `<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0" xmlns:presentation="urn:oasis:names:tc:opendocument:xmlns:presentation:1.0">
<office:body><office:presentation>
<draw:page draw:name="Slide1">
<draw:custom-shape draw:name="Rectangle 1" draw:style-name="gr3" svg:width="5.555cm" svg:height="2.777cm" draw:transform="rotate (-0.523598775598299) translate (5.233cm 1.019cm)">
<text:p>Hop xoay</text:p>
<draw:enhanced-geometry draw:type="ooxml-rect"/>
</draw:custom-shape>
</draw:page>
</office:presentation></office:body>
</office:document>`;

  test("parseFodp(): hình chữ nhật/custom-shape bị xoay (_parseDrawShape, KHÁC hàm ảnh) cũng phải lấy đúng vị trí, không rơi về (0,0)", () => {
    const slides = new SlidesAdapter(null).parseFodp(SOFFICE_ROTATED_RECT_FODP);
    const shapes = slides[0]?.shapes || [];
    const rect = shapes.find(s => s.text === "Hop xoay");
    assert(rect, "Phải parse được hình chữ nhật xoay");
    const expectedX = Math.round(5.233 * 96 / 2.54);
    const expectedY = Math.round(1.019 * 96 / 2.54);
    assert(Math.abs(rect.x - expectedX) <= 2, `x phải ~${expectedX}px, thực tế: ${rect.x} (0 nghĩa là bug _parseDrawShape chưa sửa)`);
    assert(Math.abs(rect.y - expectedY) <= 2, `y phải ~${expectedY}px, thực tế: ${rect.y}`);
  });

  test("parseFodp(): hình chữ nhật xoay 30° (_parseDrawShape) có shape.rotation ~30, khớp chiều xoay xuôi kim đồng hồ của CSS", () => {
    const slides = new SlidesAdapter(null).parseFodp(SOFFICE_ROTATED_RECT_FODP);
    const rect = (slides[0]?.shapes || []).find(s => s.text === "Hop xoay");
    assert(Math.abs(rect.rotation - 30) < 0.01, `rect.rotation phải ~30, thực tế: ${rect.rotation}`);
  });

  return results;
}
