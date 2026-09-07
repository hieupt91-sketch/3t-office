/**
 * Unit tests — Slides native PPTX post-process: khổ trang chiếu thật (p:sldSz).
 * Lỗi thật đo được: soffice --convert-to pptx BỎ QUA style:page-layout-properties
 * của FODP, luôn tự ghi <p:sldSz> mặc định 28cm x 15.75cm bất kể canvas.slideSize
 * thật của người dùng. Xem docs/HANDOFF-SLIDES-SLIDESIZE-EXPORT-FIX.md.
 */
import { SlidesAdapter } from "../../adapters/libreoffice/slides/slides-adapter.js";
import {
  applyIntendedSlideSize,
  parseIntendedSlideSizeFromFodp,
  parseSlideSize
} from "../../adapters/libreoffice/slides/pptx-master-logo.js";
import { postProcessSlidesPptx } from "../../adapters/libreoffice/slides/pptx-native-postprocess.js";
import { createZip, readZipEntry } from "../helpers/zip-package.mjs";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

/** <p:sldSz> mặc định SAI mà soffice thật luôn ghi ra, đo được thực tế (28cm x 15.75cm). */
const LO_PRESENTATION_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:sldSz cx="10080625" cy="5670550"/></p:presentation>`;

function fakePptx(presentationXml = LO_PRESENTATION_XML) {
  return createZip([
    { name: "[Content_Types].xml", data: '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"></Types>' },
    { name: "ppt/presentation.xml", data: presentationXml },
    { name: "ppt/slides/slide1.xml", data: '<?xml version="1.0"?><p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"/>' }
  ]);
}

export async function runSlidesPptxSlideSizeTests() {
  const results = [];
  const test = (name, fn) => { try { fn(); results.push({ name, pass: true }); } catch (error) { results.push({ name, pass: false, error: error.message }); } };

  test("parseIntendedSlideSizeFromFodp: đọc đúng cm thật từ style:page-layout-properties, quy đổi EMU chính xác", () => {
    const fodp = new SlidesAdapter({ slides: [{ id: 1, title: "T", body: "B", layoutType: "title-content", shapes: [], comments: [], hidden: false }], slideSize: { width: 960, height: 540 } }).serializeToFodp();
    const size = parseIntendedSlideSizeFromFodp(fodp);
    assert(size, "phải đọc được page-layout-properties do chính serializeToFodp() ghi ra");
    assert(size.cx === Math.round(25.4 * 360000), `cx sai: ${size.cx}`);
    assert(size.cy === Math.round(14.287 * 360000), `cy sai: ${size.cy}`);
  });

  test("parseIntendedSlideSizeFromFodp: trả về null khi FODP không có page-layout-properties", () => {
    assert(parseIntendedSlideSizeFromFodp("<office:document/>") === null, "phải null, không throw");
    assert(parseIntendedSlideSizeFromFodp("") === null);
    assert(parseIntendedSlideSizeFromFodp(null) === null);
  });

  test("applyIntendedSlideSize: ghi đè đúng cx/cy, giữ nguyên thuộc tính khác trên sldSz", () => {
    const xml = '<p:presentation><p:sldSz cx="10080625" cy="5670550" type="screen16x9"/></p:presentation>';
    const next = applyIntendedSlideSize(xml, { cx: 9144000, cy: 5143500 });
    assert(next.includes('cx="9144000"'), next);
    assert(next.includes('cy="5143500"'), next);
    assert(next.includes('type="screen16x9"'), "thuộc tính khác trên sldSz phải giữ nguyên");
  });

  test("applyIntendedSlideSize: không đổi gì khi size=null hoặc không tìm thấy sldSz", () => {
    const xml = "<p:presentation/>";
    assert(applyIntendedSlideSize(xml, null) === xml);
    assert(applyIntendedSlideSize("<p:presentation><p:sldSz cx=\"1\" cy=\"2\"/></p:presentation>", null).includes('cx="1"'));
  });

  test("postProcessSlidesPptx: khổ 16:9 mặc định (960x540) được tự sửa đúng dù không dùng logo/sections/show", () => {
    const original = fakePptx();
    const fodp = new SlidesAdapter({ slides: [{ id: 1, title: "T", body: "B", layoutType: "title-content", shapes: [], comments: [], hidden: false }], slideSize: { width: 960, height: 540 } }).serializeToFodp();
    const patched = postProcessSlidesPptx(original, { sourceFodp: fodp });
    assert(Buffer.compare(original, patched) !== 0, "phải có thay đổi vì khổ trang soffice ghi sai");
    const size = parseSlideSize(readZipEntry(patched, "ppt/presentation.xml").toString("utf8"));
    assert(size.cx === Math.round(25.4 * 360000), `cx sai: ${size.cx}`);
    assert(size.cy === Math.round(14.287 * 360000), `cy sai: ${size.cy}`);
  });

  test("postProcessSlidesPptx: khổ tùy chỉnh 4:3 (720x540) được tự sửa đúng, không bị bỏ mặc định 16:9", () => {
    const original = fakePptx();
    const fodp = new SlidesAdapter({ slides: [{ id: 1, title: "T", body: "B", layoutType: "title-content", shapes: [], comments: [], hidden: false }], slideSize: { width: 720, height: 540 } }).serializeToFodp();
    const patched = postProcessSlidesPptx(original, { sourceFodp: fodp });
    const size = parseSlideSize(readZipEntry(patched, "ppt/presentation.xml").toString("utf8"));
    assert(size.cx === Math.round(19.05 * 360000), `cx sai: ${size.cx}`);
    assert(size.cy === Math.round(14.287 * 360000), `cy sai: ${size.cy}`);
  });

  test("postProcessSlidesPptx: hình khối nằm ĐÚNG TRONG khổ trang đã sửa (không còn lệch pha giữa sldSz và tọa độ hình thật)", () => {
    const original = fakePptx();
    const shape = { id: "s1", type: "rect", x: 900, y: 480, w: 60, h: 60, color: "#3b82f6", text: "" };
    const fodp = new SlidesAdapter({ slides: [{ id: 1, title: "T", body: "B", layoutType: "title-content", shapes: [shape], comments: [], hidden: false }], slideSize: { width: 960, height: 540 } }).serializeToFodp();
    const patched = postProcessSlidesPptx(original, { sourceFodp: fodp });
    const size = parseSlideSize(readZipEntry(patched, "ppt/presentation.xml").toString("utf8"));
    // Hình ở góc dưới-phải canvas (x=900..960, y=480..540) quy đổi cm bằng đúng
    // công thức _pxToOdf (px/37.795275591) - phải nằm gọn trong khổ đã sửa.
    const shapeRightCm = 960 / 37.795275591;
    const shapeBottomCm = 540 / 37.795275591;
    const pageWidthCm = size.cx / 360000;
    const pageHeightCm = size.cy / 360000;
    assert(shapeRightCm <= pageWidthCm + 0.01, `Hình vượt phải khổ trang: ${shapeRightCm} > ${pageWidthCm}`);
    assert(shapeBottomCm <= pageHeightCm + 0.01, `Hình vượt dưới khổ trang: ${shapeBottomCm} > ${pageHeightCm}`);
  });

  return results;
}
