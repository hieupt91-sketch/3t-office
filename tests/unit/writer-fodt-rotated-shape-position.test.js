/**
 * VN Writer — Vị trí hình bị XOAY trong file DOCX thật bị đọc sai.
 *
 * Lỗi thật đã xác nhận qua probe soffice thật: khi một hình bị XOAY,
 * soffice ghi vị trí qua draw:transform="rotate(...) translate(...)" —
 * svg:x/svg:y HOÀN TOÀN VẮNG MẶT trong trường hợp đó.
 * `_fodtShapeFromNode()` trước đây chỉ đọc thẳng svg:x/svg:y, không kiểm
 * tra draw:transform, khiến mọi hình bị xoay luôn bị đặt nhầm về góc (0,0).
 *
 * Cùng lỗi xảy ra trong `_fodtTextBoxFromFrame()` cho text box có draw:transform.
 *
 * Đã capture đúng nguyên văn đoạn draw:custom-shape từ soffice thật (probe
 * DOCX có hình chữ nhật xoay 30°, `a:xfrm rot="1800000"`) làm fixture.
 *
 * Tuân thủ chuẩn 06-testing/TESTING-STANDARD.md & AGENTS.md
 */
import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function createMinimalAdapter() {
  const bodyEl = { innerHTML: "" };
  return new WriterAdapter({
    innerHTML: "",
    querySelector(sel) { return sel === ".vno-writer-body" ? bodyEl : null; }
  });
}

/** Style chung cho tất cả fixture */
const STYLE_DEFS = `
  <office:automatic-styles>
    <style:style style:name="gr1" style:family="graphic">
      <style:graphic-properties draw:stroke="solid" svg:stroke-width="0.02cm" svg:stroke-color="#000000" draw:fill="solid" draw:fill-color="#3B82F6"/>
    </style:style>
  </office:automatic-styles>`;

/** Capture nguyên văn từ soffice thật (probe DOCX hình chữ nhật xoay 30°). */
const SOFFICE_ROTATED_SHAPE_FODT = `<?xml version="1.0" encoding="UTF-8"?>
<office:document office:mimetype="application/vnd.oasis.opendocument.text" xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
 xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"
 xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
 xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0"
 xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0">
  <office:body><office:text>
    <text:p>
      <draw:custom-shape draw:name="Rotated Rect" draw:style-name="gr1" svg:width="5.557cm" svg:height="2.779cm" draw:transform="rotate (-0.523598775598299) translate (1.38994444444444cm -5.18583333333333cm)">
        <text:p>Rotated Rect</text:p>
        <draw:enhanced-geometry draw:type="ooxml-rect"/>
      </draw:custom-shape>
    </text:p>
  </office:text>${STYLE_DEFS}</office:body>
</office:document>`;

/** Fixture FODT: text box có draw:transform (text box xoay) — phải nằm trong draw:frame. */
const SOFFICE_ROTATED_TEXTBOX_FODT = `<?xml version="1.0" encoding="UTF-8"?>
<office:document office:mimetype="application/vnd.oasis.opendocument.text" xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
 xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"
 xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
 xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0"
 xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0">
  <office:body><office:text>
    <text:p>
      <draw:frame draw:name="Rotated TextBox" draw:style-name="gr1" text:anchor-type="as-char" svg:width="4.000cm" svg:height="2.000cm" draw:transform="rotate (-0.523598775598299) translate (2.500cm -3.200cm)">
        <draw:text-box>
          <text:p>Noi dung text box xoay</text:p>
        </draw:text-box>
      </draw:frame>
    </text:p>
  </office:text>${STYLE_DEFS}</office:body>
</office:document>`;

/** Fixture FODT: shape KHÔNG xoay (chỉ có svg:x/svg:y) — phải đọc đúng như trước. */
const SOFFICE_UNROTATED_SHAPE_FODT = `<?xml version="1.0" encoding="UTF-8"?>
<office:document office:mimetype="application/vnd.oasis.opendocument.text" xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
 xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"
 xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
 xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0"
 xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0">
  <office:body><office:text>
    <text:p>
      <draw:rect draw:name="Plain Rect" draw:style-name="gr1" svg:x="3cm" svg:y="4cm" svg:width="2cm" svg:height="1cm">
      </draw:rect>
    </text:p>
  </office:text>${STYLE_DEFS}</office:body>
</office:document>`;

/** Fixture FODT: text box KHÔNG xoay (chỉ có svg:x/svg:y). */
const SOFFICE_UNROTATED_TEXTBOX_FODT = `<?xml version="1.0" encoding="UTF-8"?>
<office:document office:mimetype="application/vnd.oasis.opendocument.text" xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
 xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"
 xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
 xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0"
 xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0">
  <office:body><office:text>
    <text:p>
      <draw:frame draw:name="Plain TextBox" draw:style-name="gr1" text:anchor-type="as-char" svg:width="2cm" svg:height="1cm" svg:x="3cm" svg:y="4cm">
        <draw:text-box>
          <text:p>Noi dung text box thuong</text:p>
        </draw:text-box>
      </draw:frame>
    </text:p>
  </office:text>${STYLE_DEFS}</office:body>
</office:document>`;

export async function runWriterFodtRotatedShapePositionTests() {
  const results = [];
  const test = (name, fn) => { try { fn(); results.push({ name, pass: true }); } catch (error) { results.push({ name, pass: false, error: error.message }); } };

  test("_fodtParseDrawTranslate(): khớp đúng draw:transform có khoảng trắng (định dạng soffice thật ghi ra)", () => {
    const adapter = createMinimalAdapter();
    const attrs = { "draw:transform": "rotate (-0.523598775598299) translate (1.38994444444444cm -5.18583333333333cm)" };
    const origin = adapter._fodtParseDrawTranslate(attrs);
    const expectedX = Math.round(1.38994444444444 * 96 / 2.54);
    const expectedY = Math.round(-5.18583333333333 * 96 / 2.54);
    assert(Math.abs(origin.x - expectedX) <= 2, `x phải ~${expectedX}px (từ translate), thực tế: ${origin.x}`);
    assert(Math.abs(origin.y - expectedY) <= 2, `y phải ~${expectedY}px (từ translate), thực tế: ${origin.y}`);
  });

  test("_fodtParseDrawTranslate(): khớp đúng draw:transform không khoảng trắng (dấu phẩy)", () => {
    const adapter = createMinimalAdapter();
    const attrs = { "draw:transform": "translate(3cm,4cm)" };
    const origin = adapter._fodtParseDrawTranslate(attrs);
    const expectedX = Math.round(3 * 96 / 2.54);
    const expectedY = Math.round(4 * 96 / 2.54);
    assert(Math.abs(origin.x - expectedX) <= 2, `x phải ~${expectedX}px, thực tế: ${origin.x}`);
    assert(Math.abs(origin.y - expectedY) <= 2, `y phải ~${expectedY}px, thực tế: ${origin.y}`);
  });

  test("_fodtParseDrawTranslate(): fallback svg:x/svg:y khi không có draw:transform", () => {
    const adapter = createMinimalAdapter();
    const attrs = { "svg:x": "3cm", "svg:y": "4cm" };
    const origin = adapter._fodtParseDrawTranslate(attrs);
    const expectedX = Math.round(3 * 96 / 2.54);
    const expectedY = Math.round(4 * 96 / 2.54);
    assert(Math.abs(origin.x - expectedX) <= 2, `x phải ~${expectedX}px, thực tế: ${origin.x}`);
    assert(Math.abs(origin.y - expectedY) <= 2, `y phải ~${expectedY}px, thực tế: ${origin.y}`);
  });

  test("_fodtParseDrawTranslate(): trả về (0,0) khi không có transform và không có svg:x/svg:y", () => {
    const adapter = createMinimalAdapter();
    const attrs = {};
    const origin = adapter._fodtParseDrawTranslate(attrs);
    assert(origin.x === 0, `x phải là 0, thực tế: ${origin.x}`);
    assert(origin.y === 0, `y phải là 0, thực tế: ${origin.y}`);
  });

  test("parseFodt(): draw:custom-shape bị xoay (fixture soffice thật) phải lấy đúng vị trí từ translate, không rơi về (0,0)", () => {
    const adapter = createMinimalAdapter();
    adapter.parseFodt(SOFFICE_ROTATED_SHAPE_FODT);
    const shapes = adapter.shapes || [];
    const rect = shapes.find(s => s.id === "Rotated Rect");
    assert(rect, "Phải parse được draw:custom-shape 'Rotated Rect'");
    const expectedX = Math.round(1.38994444444444 * 96 / 2.54);
    const expectedY = Math.round(-5.18583333333333 * 96 / 2.54);
    assert(Math.abs(rect.x - expectedX) <= 2, `x phải ~${expectedX}px (từ translate), thực tế: ${rect.x} (0 nghĩa là bug chưa sửa)`);
    assert(Math.abs(rect.y - expectedY) <= 2, `y phải ~${expectedY}px (từ translate), thực tế: ${rect.y}`);
  });

  test("parseFodt(): draw:text-box bị xoay (fixture soffice thật) phải lấy đúng vị trí từ translate, không rơi về (0,0)", () => {
    const adapter = createMinimalAdapter();
    adapter.parseFodt(SOFFICE_ROTATED_TEXTBOX_FODT);
    const shapes = adapter.shapes || [];
    const textbox = shapes.find(s => s.id === "Rotated TextBox");
    assert(textbox, "Phải parse được draw:text-box 'Rotated TextBox'");
    const expectedX = Math.round(2.500 * 96 / 2.54);
    const expectedY = Math.round(-3.200 * 96 / 2.54);
    assert(Math.abs(textbox.x - expectedX) <= 2, `x phải ~${expectedX}px (từ translate), thực tế: ${textbox.x} (0 nghĩa là bug textbox chưa sửa)`);
    assert(Math.abs(textbox.y - expectedY) <= 2, `y phải ~${expectedY}px (từ translate), thực tế: ${textbox.y}`);
  });

  test("parseFodt(): shape KHÔNG xoay (chỉ có svg:x/svg:y) vẫn đọc đúng như trước — không thoái lui", () => {
    const adapter = createMinimalAdapter();
    adapter.parseFodt(SOFFICE_UNROTATED_SHAPE_FODT);
    const shapes = adapter.shapes || [];
    const rect = shapes.find(s => s.id === "Plain Rect");
    assert(rect, "Phải parse được draw:rect 'Plain Rect'");
    const expectedX = Math.round(3 * 96 / 2.54);
    const expectedY = Math.round(4 * 96 / 2.54);
    assert(Math.abs(rect.x - expectedX) <= 2, `x không xoay phải ~${expectedX}px, thực tế: ${rect.x}`);
    assert(Math.abs(rect.y - expectedY) <= 2, `y không xoay phải ~${expectedY}px, thực tế: ${rect.y}`);
  });

  test("parseFodt(): text box KHÔNG xoay (chỉ có svg:x/svg:y) vẫn đọc đúng như trước — không thoái lui", () => {
    const adapter = createMinimalAdapter();
    adapter.parseFodt(SOFFICE_UNROTATED_TEXTBOX_FODT);
    const shapes = adapter.shapes || [];
    const textbox = shapes.find(s => s.id === "Plain TextBox");
    assert(textbox, "Phải parse được draw:text-box 'Plain TextBox'");
    const expectedX = Math.round(3 * 96 / 2.54);
    const expectedY = Math.round(4 * 96 / 2.54);
    assert(Math.abs(textbox.x - expectedX) <= 2, `x không xoay phải ~${expectedX}px, thực tế: ${textbox.x}`);
    assert(Math.abs(textbox.y - expectedY) <= 2, `y không xoay phải ~${expectedY}px, thực tế: ${textbox.y}`);
  });

  return results;
}
