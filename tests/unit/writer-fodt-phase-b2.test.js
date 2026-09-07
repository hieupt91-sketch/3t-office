import assert from "node:assert/strict";
import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";
import {
  jpeg16x10, jpegSof2Header, gif12x8, bmp8x6, tiffHeader,
  webpVp8, webpVp8l, webpVp8x, webpVp8xCanvas, toDataUrl
} from "../helpers/tiny-images.mjs";

function adapterWithBody(innerHTML) {
  const body = { innerHTML };
  const editor = {
    innerHTML,
    querySelector(selector) {
      return selector === ".vno-writer-body" ? body : null;
    }
  };
  return { adapter: new WriterAdapter(editor), body };
}

function imgHtml(mime, buffer) {
  return `<p>Ảnh: <img src="${toDataUrl(mime, buffer)}" data-vno-wrap="inline" style="max-width:100%;height:auto;"></p>`;
}

export async function runWriterFodtPhaseB2Tests() {
  const results = [];
  const test = async (name, fn) => {
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: error.stack || error.message });
    }
  };

  await test("Writer FODT Phase B.2 reads JPEG size from SOF0 (0xFFC0), not from CSS", () => {
    const jpeg = jpeg16x10();
    assert.equal(jpeg[0], 0xff);
    assert.equal(jpeg[1], 0xd8);
    const { adapter } = adapterWithBody(imgHtml("image/jpeg", jpeg));
    const { width, height } = adapter._fodtJpegDimensionsPx(jpeg.toString("base64"));
    assert.equal(width, 16);
    assert.equal(height, 10);
    const fodt = adapter.serializeToFodt();
    assert.match(fodt, /draw:mime-type="image\/jpeg"/);
    assert.match(fodt, /svg:width="0\.423cm" svg:height="0\.265cm"/);
    assert.ok(fodt.includes(`<office:binary-data>${jpeg.toString("base64")}</office:binary-data>`));
  });

  await test("Writer FODT Phase B.2 reads JPEG size from SOF2 (0xFFC2) header", () => {
    const { adapter } = adapterWithBody("<p></p>");
    const header = jpegSof2Header(20, 14);
    const { width, height } = adapter._fodtJpegDimensionsPx(header.toString("base64"));
    assert.equal(width, 20);
    assert.equal(height, 14);
  });

  await test("Writer FODT Phase B.2 JPEG round-trip is exactly idempotent", () => {
    const jpeg = jpeg16x10();
    const initial = adapterWithBody(imgHtml("image/jpeg", jpeg));
    const first = initial.adapter.serializeToFodt();
    const parsed = adapterWithBody("<p>không giữ</p>");
    const html = parsed.adapter.parseFodt(first);
    assert.match(html, /src="data:image\/jpeg;base64,/);
    assert.match(html, /width="16" height="10"/);
    assert.equal(parsed.adapter.serializeToFodt(), first);
  });

  await test("Writer FODT Phase B.2 reads GIF size from bytes 6-9 little-endian", () => {
    const gif = gif12x8();
    assert.equal(gif.subarray(0, 6).toString("ascii"), "GIF89a");
    assert.equal(gif[6] | (gif[7] << 8), 12);
    assert.equal(gif[8] | (gif[9] << 8), 8);
    const { adapter } = adapterWithBody(imgHtml("image/gif", gif));
    const { width, height } = adapter._fodtGifDimensionsPx(gif.toString("base64"));
    assert.equal(width, 12);
    assert.equal(height, 8);
    const fodt = adapter.serializeToFodt();
    assert.match(fodt, /draw:mime-type="image\/gif"/);
    assert.match(fodt, /svg:width="0\.318cm" svg:height="0\.212cm"/);
  });

  await test("Writer FODT Phase B.2 GIF87a header is accepted with the same logical-screen layout", () => {
    const header = Buffer.alloc(10);
    header.write("GIF87a");
    header.writeUInt16LE(9, 6);
    header.writeUInt16LE(7, 8);
    const { adapter } = adapterWithBody("<p></p>");
    const { width, height } = adapter._fodtGifDimensionsPx(header.toString("base64"));
    assert.equal(width, 9);
    assert.equal(height, 7);
  });

  await test("Writer FODT Phase B.2 GIF round-trip is exactly idempotent", () => {
    const gif = gif12x8();
    const initial = adapterWithBody(imgHtml("image/gif", gif));
    const first = initial.adapter.serializeToFodt();
    const parsed = adapterWithBody("<p>không giữ</p>");
    parsed.adapter.parseFodt(first);
    assert.equal(parsed.adapter.serializeToFodt(), first);
  });

  await test("Writer FODT Phase B.2 reads WEBP VP8 size from the VP8 frame header, not VP8X", () => {
    const bytes = webpVp8();
    const { adapter } = adapterWithBody(imgHtml("image/webp", bytes));
    const { width, height } = adapter._fodtWebpDimensionsPx(bytes.toString("base64"));
    assert.equal(width, 1);
    assert.equal(height, 1);
    const fodt = adapter.serializeToFodt();
    assert.match(fodt, /draw:mime-type="image\/webp"/);
    assert.match(fodt, /svg:width="0\.026cm" svg:height="0\.026cm"/);
  });

  await test("Writer FODT Phase B.2 reads WEBP VP8L size from the lossless bitstream header", () => {
    const bytes = webpVp8l();
    const { adapter } = adapterWithBody("<p></p>");
    const { width, height } = adapter._fodtWebpDimensionsPx(bytes.toString("base64"));
    assert.equal(width, 1);
    assert.equal(height, 1);
  });

  await test("Writer FODT Phase B.2 reads WEBP VP8X canvas size, not the inner VP8 1x1", () => {
    const bytes = webpVp8xCanvas(16, 10);
    const { adapter } = adapterWithBody("<p></p>");
    const { width, height } = adapter._fodtWebpDimensionsPx(bytes.toString("base64"));
    assert.equal(width, 16, "VP8X canvas width must be used even when inner VP8 is 1x1");
    assert.equal(height, 10, "VP8X canvas height must be used even when inner VP8 is 1x1");
  });

  await test("Writer FODT Phase B.2 WEBP VP8/VP8L/VP8X round-trips are exactly idempotent", () => {
    for (const bytes of [webpVp8(), webpVp8l(), webpVp8x()]) {
      const initial = adapterWithBody(imgHtml("image/webp", bytes));
      const first = initial.adapter.serializeToFodt();
      const parsed = adapterWithBody("<p>không giữ</p>");
      parsed.adapter.parseFodt(first);
      assert.equal(parsed.adapter.serializeToFodt(), first);
    }
  });

  await test("Writer FODT Phase B.2 rejects BMP and TIFF instead of silently dropping them", () => {
    for (const src of [toDataUrl("image/bmp", bmp8x6()), toDataUrl("image/tiff", tiffHeader())]) {
      const { adapter } = adapterWithBody(`<img src="${src}">`);
      assert.throws(() => adapter.serializeToFodt(), error => error?.code === "WRITER_FODT_UNSUPPORTED_CONTENT");
    }
  });

  function withShapes(innerHTML, shapes) {
    const { adapter, body } = adapterWithBody(innerHTML);
    adapter.shapes = shapes;
    return { adapter, body };
  }

  await test("Writer FODT Phase B.2 serializes UI rectangle/ellipse/line/arrow/textbox/round-rect inside text:p", () => {
    const { adapter } = withShapes("<p>HINH</p>", [
      { id: "shape-rect", type: "rectangle", x: 100, y: 160, w: 140, h: 80, fill: "#2563eb", stroke: "#1d4ed8", strokeWidth: 2 },
      { id: "shape-round", type: "round-rect", x: 120, y: 180, w: 140, h: 80, fill: "#2563eb", stroke: "#1d4ed8", strokeWidth: 2 },
      { id: "shape-circle", type: "circle", x: 80, y: 90, w: 110, h: 110, fill: "#0ea5e9", stroke: "#0284c7", strokeWidth: 2 },
      { id: "shape-line", type: "line", x: 40, y: 50, w: 160, h: 30, fill: "none", stroke: "#0f172a", strokeWidth: 3 },
      { id: "shape-arrow", type: "arrow", x: 60, y: 70, w: 140, h: 70, fill: "#f59e0b", stroke: "#d97706", strokeWidth: 2 },
      { id: "shape-box", type: "textbox", x: 72, y: 120, w: 220, h: 80, fill: "transparent", stroke: "#2563eb", strokeWidth: 2, text: "HOP_VAN_BAN" }
    ]);
    const fodt = adapter.serializeToFodt();
    assert.match(fodt, /<text:p><draw:rect /);
    assert.match(fodt, /draw:name="shape-rect"[^>]*text:anchor-type="paragraph"/);
    assert.match(fodt, /draw:name="shape-round"[^>]*draw:corner-radius="/);
    assert.match(fodt, /<draw:ellipse [^>]*draw:name="shape-circle"/);
    assert.match(fodt, /<draw:line [^>]*draw:name="shape-line"/);
    assert.match(fodt, /<draw:custom-shape [^>]*draw:name="shape-arrow"/);
    assert.match(fodt, /draw:type="right-arrow"/);
    assert.match(fodt, /<draw:frame [^>]*draw:name="shape-box"[^>]*>[\s\S]*<draw:text-box><text:p>HOP_VAN_BAN<\/text:p><\/draw:text-box>/);
    assert.match(fodt, /style:family="graphic"/);
    assert.doesNotMatch(fodt, /<\/office:text><draw:/);
  });

  await test("Writer FODT Phase B.2 shape and Text Box round-trip is exactly idempotent and restores this.shapes", () => {
    const shapes = [
      { id: "shape-rect", type: "rectangle", shapeType: "rectangle", x: 100, y: 160, w: 140, h: 80, width: 140, height: 80, fill: "#2563eb", stroke: "#1d4ed8", strokeWidth: 2 },
      { id: "shape-box", type: "textbox", shapeType: "textbox", x: 72, y: 120, w: 220, h: 80, width: 220, height: 80, fill: "transparent", stroke: "#2563eb", strokeWidth: 2, text: "HOP_VAN_BAN" }
    ];
    const initial = withShapes("<p>HINH</p>", shapes);
    const first = initial.adapter.serializeToFodt();
    const parsed = adapterWithBody("<p>không giữ</p>");
    parsed.adapter.shapes = [{ id: "stale" }];
    parsed.adapter.parseFodt(first);
    assert.equal(parsed.body.innerHTML, "<p>HINH</p>");
    assert.equal(parsed.adapter.shapes.length, 2);
    assert.equal(parsed.adapter.shapes[0].type, "rectangle");
    assert.equal(parsed.adapter.shapes[0].id, "shape-rect");
    assert.equal(parsed.adapter.shapes[1].type, "textbox");
    assert.equal(parsed.adapter.shapes[1].text, "HOP_VAN_BAN");
    assert.equal(parsed.adapter.serializeToFodt(), first);
  });

  await test("Writer FODT Phase B.2 rejects shape types that Writer UI cannot create", () => {
    const { adapter } = withShapes("<p>X</p>", [{ id: "nope", type: "star", x: 0, y: 0, w: 10, h: 10, fill: "#000", stroke: "#000" }]);
    assert.throws(() => adapter.serializeToFodt(), error => error?.code === "WRITER_FODT_UNSUPPORTED_CONTENT");
  });

  // Lỗi thật đã xác nhận qua soffice thật: DOCX thật có ảnh neo nổi
  // (wp:anchor + wrapSquare — Word dùng kiểu này rất phổ biến cho
  // logo/letterhead có chữ chạy quanh) được soffice convert sang FODT với
  // text:anchor-type="char", KHÔNG PHẢI "as-char" mà VN Office tự ghi khi
  // chèn ảnh qua UI. Trước đây parseFodt() ném lỗi ngay khi gặp anchor-type
  // khác "as-char" — khiến TOÀN BỘ file DOCX không mở được, không chỉ mất 1
  // ảnh. Sửa: chấp nhận thêm "char"/"paragraph" (đặt ảnh inline tại vị trí
  // đó trong luồng văn bản — mất hiệu ứng chữ chạy quanh, nhưng không mất
  // ảnh và không mất nội dung, file mở được).
  const fodtBodyWithImage = (anchorType) => `<?xml version="1.0"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" office:version="1.3" office:mimetype="application/vnd.oasis.opendocument.text">
<office:body><office:text>
<text:p>Truoc<draw:frame draw:name="Picture 1" text:anchor-type="${anchorType}" svg:width="1cm" svg:height="1cm"><draw:image draw:mime-type="image/png"><office:binary-data>iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=</office:binary-data></draw:image></draw:frame>Sau</text:p>
</office:text></office:body>
</office:document>`;

  await test("Writer FODT Phase B.2 chấp nhận draw:frame text:anchor-type=\"char\" (ảnh neo nổi thật từ Word thật qua soffice) thay vì ném lỗi làm hỏng cả file", () => {
    const { adapter, body } = adapterWithBody("<p>không giữ</p>");
    const html = adapter.parseFodt(fodtBodyWithImage("char"));
    assert.match(html, /<img\b[^>]*src="data:image\/png;base64,/, "Ảnh phải hiển thị dù neo kiểu 'char'");
    assert.ok(html.includes("Truoc") && html.includes("Sau"), "Văn bản trước/sau ảnh không được mất");
    assert.equal(body.innerHTML, html);
  });

  await test("Writer FODT Phase B.2 chấp nhận draw:frame text:anchor-type=\"paragraph\" tương tự", () => {
    const { adapter } = adapterWithBody("<p>không giữ</p>");
    const html = adapter.parseFodt(fodtBodyWithImage("paragraph"));
    assert.match(html, /<img\b[^>]*src="data:image\/png;base64,/);
  });

  await test("Writer FODT Phase B.2 vẫn từ chối anchor-type thật sự chưa hỗ trợ (không âm thầm bỏ qua)", () => {
    const { adapter } = adapterWithBody("<p>không giữ</p>");
    assert.throws(() => adapter.parseFodt(fodtBodyWithImage("page")), error => /anchor-type/.test(error.message));
  });

  // Lỗi thật đã xác nhận qua soffice thật: file DOCX thật có hình cơ bản
  // (hình chữ nhật, elip, bo góc — chèn qua "Insert Shapes" của Word,
  // RẤT PHỔ BIẾN) không được soffice ghi thành <draw:rect>/<draw:ellipse>
  // chuẩn ODF như VN Writer tự ghi, mà LUÔN thành <draw:custom-shape> với
  // draw:enhanced-geometry draw:type="ooxml-<prstGeom>". Trước đây
  // parseFodt() ném lỗi với BẤT KỲ type nào khác "right-arrow" — khiến
  // file DOCX có 1 hình chữ nhật/elip bình thường cũng không mở được.
  const fodtCustomShape = (ooxmlType) => `<?xml version="1.0"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0" office:version="1.3" office:mimetype="application/vnd.oasis.opendocument.text">
<office:body><office:text>
<text:p><draw:custom-shape draw:name="Shape 1" text:anchor-type="as-char" svg:width="5cm" svg:height="3cm">
<draw:enhanced-geometry draw:type="${ooxmlType}"/>
</draw:custom-shape></text:p>
</office:text></office:body>
</office:document>`;

  await test("Writer FODT Phase B.2 chấp nhận draw:custom-shape type \"ooxml-rect\" (hình chữ nhật thật từ Word thật) — ánh xạ đúng sang type \"rectangle\"", () => {
    const { adapter } = adapterWithBody("<p>không giữ</p>");
    adapter.parseFodt(fodtCustomShape("ooxml-rect"));
    assert.equal(adapter.shapes.length, 1);
    assert.equal(adapter.shapes[0].type, "rectangle");
  });

  await test("Writer FODT Phase B.2 chấp nhận \"ooxml-ellipse\" -> \"circle\" và \"ooxml-roundRect\" -> \"round-rect\"", () => {
    const ellipse = adapterWithBody("<p>không giữ</p>");
    ellipse.adapter.parseFodt(fodtCustomShape("ooxml-ellipse"));
    assert.equal(ellipse.adapter.shapes[0].type, "circle");

    const roundRect = adapterWithBody("<p>không giữ</p>");
    roundRect.adapter.parseFodt(fodtCustomShape("ooxml-roundRect"));
    assert.equal(roundRect.adapter.shapes[0].type, "round-rect");
  });

  await test("Writer FODT Phase B.2 chấp nhận \"ooxml-triangle\" -> \"triangle\" và \"ooxml-diamond\" -> \"diamond\"", () => {
    const triangle = adapterWithBody("<p>không giữ</p>");
    triangle.adapter.parseFodt(fodtCustomShape("ooxml-triangle"));
    assert.equal(triangle.adapter.shapes[0].type, "triangle");

    const diamond = adapterWithBody("<p>không giữ</p>");
    diamond.adapter.parseFodt(fodtCustomShape("ooxml-diamond"));
    assert.equal(diamond.adapter.shapes[0].type, "diamond");
  });

  await test("Writer FODT Phase B.2 vẫn từ chối hình dạng KHÔNG có renderer tương ứng trong VN Writer (ví dụ pentagon) — không âm thầm vẽ sai", () => {
    const { adapter } = adapterWithBody("<p>không giữ</p>");
    assert.throws(() => adapter.parseFodt(fodtCustomShape("ooxml-pentagon")), error => /ooxml-pentagon/.test(error.message));
  });

  return results;
}
