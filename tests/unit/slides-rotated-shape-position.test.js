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

  return results;
}
