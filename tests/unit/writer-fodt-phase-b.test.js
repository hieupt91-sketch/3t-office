import assert from "node:assert/strict";
import zlib from "node:zlib";
import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";

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

/** Real, valid, minimal PNG (no external file) - same CRC32 used by tests/helpers/zip-package.mjs. */
function crc32(buffer) {
  let crc = ~0;
  for (let index = 0; index < buffer.length; index++) {
    crc ^= buffer[index];
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (~crc) >>> 0;
}

function pngChunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([length, typeBuf, data, crc]);
}

function makeTestPngBase64(width, height, rgb = [200, 30, 30]) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // bit depth
  ihdrData.writeUInt8(2, 9); // color type: RGB
  ihdrData.writeUInt8(0, 10);
  ihdrData.writeUInt8(0, 11);
  ihdrData.writeUInt8(0, 12);
  const rows = [];
  for (let y = 0; y < height; y++) {
    rows.push(Buffer.from([0])); // filter: none
    for (let x = 0; x < width; x++) rows.push(Buffer.from(rgb));
  }
  const raw = Buffer.concat(rows);
  const idatData = zlib.deflateSync(raw);
  const png = Buffer.concat([
    signature,
    pngChunk("IHDR", ihdrData),
    pngChunk("IDAT", idatData),
    pngChunk("IEND", Buffer.alloc(0))
  ]);
  return png.toString("base64");
}

export async function runWriterFodtPhaseBTests() {
  const results = [];
  const test = async (name, fn) => {
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: error.stack || error.message });
    }
  };

  await test("Writer FODT Phase B serializes a table as native table:table/table:table-cell", () => {
    const { adapter } = adapterWithBody(
      '<table><tbody><tr><td style="border:1px solid #94a3b8; background-color:#fef3c7"><strong>Tiêu đề</strong></td><td>Dữ liệu 1</td></tr><tr><td>A</td><td style="text-align:right">B</td></tr></tbody></table>'
    );
    const fodt = adapter.serializeToFodt();
    assert.match(fodt, /<table:table table:name="Table1">/);
    assert.match(fodt, /<table:table-column table:number-columns-repeated="2"\/>/);
    assert.match(fodt, /<table:table-row>/);
    assert.match(fodt, /<table:table-cell office:value-type="string" table:style-name="TC1">/);
    assert.match(fodt, /fo:border-top="0\.75pt solid #94a3b8"/);
    assert.match(fodt, /fo:background-color="#fef3c7"/);
    assert.match(fodt, /<text:p[^>]*>Dữ liệu 1<\/text:p>/);
    assert.match(fodt, /fo:text-align="right"/);
  });

  await test("Writer FODT Phase B table round-trip is exactly idempotent", () => {
    const initial = adapterWithBody('<table><tbody><tr><td style="border:1px solid #000000">X</td><td>Y</td></tr></tbody></table>');
    const first = initial.adapter.serializeToFodt();
    const parsed = adapterWithBody("<p>không giữ</p>");
    parsed.adapter.parseFodt(first);
    const second = parsed.adapter.serializeToFodt();
    assert.equal(second, first);
  });

  await test("Writer FODT Phase B.1 rejects tables with a genuine cell-count mismatch (no span explains it)", () => {
    const { adapter } = adapterWithBody('<table><tbody><tr><td>A</td><td>B</td></tr><tr><td>C</td></tr></tbody></table>');
    assert.throws(() => adapter.serializeToFodt(), error => error?.code === "WRITER_FODT_UNSUPPORTED_CONTENT");
  });

  await test("Writer FODT Phase B.1 serializes colspan as table:number-columns-spanned + table:covered-table-cell", () => {
    const { adapter } = adapterWithBody('<table><tbody><tr><td colspan="2">Tiêu đề gộp</td></tr><tr><td>A</td><td>B</td></tr></tbody></table>');
    const fodt = adapter.serializeToFodt();
    assert.match(fodt, /<table:table-column table:number-columns-repeated="2"\/>/);
    assert.match(fodt, /<table:table-cell office:value-type="string" table:number-columns-spanned="2">/);
    assert.match(fodt, /<table:covered-table-cell\/>/);
  });

  await test("Writer FODT Phase B.1 serializes rowspan as table:number-rows-spanned + table:covered-table-cell", () => {
    const { adapter } = adapterWithBody('<table><tbody><tr><td rowspan="2">Gộp dọc</td><td>A</td></tr><tr><td>B</td></tr></tbody></table>');
    const fodt = adapter.serializeToFodt();
    const rows = fodt.match(/<table:table-row>[\s\S]*?<\/table:table-row>/g);
    assert.equal(rows.length, 2);
    assert.match(rows[0], /table:number-rows-spanned="2"/);
    assert.match(rows[1], /<table:covered-table-cell\/>/);
  });

  await test("Writer FODT Phase B.1 colspan/rowspan round-trip is exactly idempotent and matches a hand-built occupancy grid", () => {
    // 3x3 grid: (0,0) spans 2 cols; (0,2) spans 2 rows -> real ODF occupancy:
    // row0: [origin cs=2][covered][origin rs=2]
    // row1: [A][B][covered]
    // row2: [C][D][E]
    const initial = adapterWithBody(
      '<table><tbody>' +
      '<tr><td colspan="2">TOP</td><td rowspan="2">SIDE</td></tr>' +
      '<tr><td>A</td><td>B</td></tr>' +
      '<tr><td>C</td><td>D</td><td>E</td></tr>' +
      '</tbody></table>'
    );
    const first = initial.adapter.serializeToFodt();
    const rows = first.match(/<table:table-row>[\s\S]*?<\/table:table-row>/g);
    assert.equal(rows.length, 3);
    assert.match(rows[0], /table:number-columns-spanned="2"[^>]*>[\s\S]*?TOP/);
    assert.match(rows[0], /table:number-rows-spanned="2"[^>]*>[\s\S]*?SIDE/);
    assert.equal((rows[0].match(/table:covered-table-cell/g) || []).length, 1, "row 0 must have exactly one covered slot (from the colspan)");
    assert.equal((rows[1].match(/table:covered-table-cell/g) || []).length, 1, "row 1 must have exactly one covered slot (from the rowspan carried down)");
    assert.equal((rows[2].match(/table:covered-table-cell/g) || []).length, 0, "row 2 has no spans reaching into it");
    const parsed = adapterWithBody("<p>không giữ</p>");
    parsed.adapter.parseFodt(first);
    const second = parsed.adapter.serializeToFodt();
    assert.equal(second, first, "serialize -> parse -> serialize must be exactly idempotent for spanned tables");
  });

  await test("Writer FODT Phase B.1 rejects invalid or overlapping spans", () => {
    for (const html of [
      '<table><tbody><tr><td colspan="0">A</td></tr></tbody></table>',
      '<table><tbody><tr><td>A</td><td>B</td></tr><tr><td colspan="3">C</td></tr></tbody></table>',
      '<table><tbody><tr><td rowspan="5">A</td></tr></tbody></table>'
    ]) {
      const { adapter } = adapterWithBody(html);
      assert.throws(() => adapter.serializeToFodt(), error => error?.code === "WRITER_FODT_UNSUPPORTED_CONTENT");
    }
  });

  await test("Writer FODT Phase B serializes a PNG image as native draw:frame/draw:image with real pixel size", () => {
    const png = makeTestPngBase64(4, 2);
    const { adapter } = adapterWithBody(`<p>Trước ảnh.</p><img src="data:image/png;base64,${png}" data-vno-wrap="inline" style="max-width:100%;height:auto;">`);
    const fodt = adapter.serializeToFodt();
    assert.match(fodt, /<draw:frame draw:name="Image1" text:anchor-type="as-char" svg:width="0\.106cm" svg:height="0\.053cm">/);
    assert.match(fodt, /<draw:image xlink:href="" xlink:type="simple" xlink:show="embed" xlink:actuate="onLoad" draw:mime-type="image\/png">/);
    assert.match(fodt, new RegExp(`<office:binary-data>${png}</office:binary-data>`));
  });

  await test("Writer FODT Phase B image round-trip is exactly idempotent and preserves real pixel dimensions", () => {
    const png = makeTestPngBase64(10, 6);
    const initial = adapterWithBody(`<p>Ảnh: <img src="data:image/png;base64,${png}" data-vno-wrap="inline" style="max-width:100%;height:auto;"></p>`);
    const first = initial.adapter.serializeToFodt();
    const parsed = adapterWithBody("<p>không giữ</p>");
    const html = parsed.adapter.parseFodt(first);
    assert.match(html, new RegExp(`src="data:image/png;base64,${png}"`));
    assert.match(html, /width="10" height="6"/);
    const second = parsed.adapter.serializeToFodt();
    assert.equal(second, first);
  });

  await test("Writer FODT Phase B rejects non-PNG images and invalid PNG bytes", () => {
    for (const src of ["data:image/bmp;base64,Qk02AAAAAAAAADYAAAAoAAAAAQAAAAEAAAABACAAAAAAAAAAAADEDgAAxA4AAAAAAAAAAAAA/wAAAA==", "data:image/png;base64,AA==", "not-a-data-uri.png"]) {
      const { adapter } = adapterWithBody(`<img src="${src}">`);
      assert.throws(() => adapter.serializeToFodt(), error => error?.code === "WRITER_FODT_UNSUPPORTED_CONTENT");
    }
  });

  await test("Writer FODT Phase B rejects unsupported imported table/image structures before mutating body", () => {
    const { adapter, body } = adapterWithBody("<p>Giữ nguyên</p>");
    const badRowspan = '<?xml version="1.0"?><office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" office:mimetype="application/vnd.oasis.opendocument.text"><office:body><office:text><table:table><table:table-row><table:table-cell><foo/></table:table-cell></table:table-row></table:table></office:text></office:body></office:document>';
    assert.throws(() => adapter.parseFodt(badRowspan), error => error?.code === "WRITER_FODT_UNSUPPORTED_CONTENT");
    assert.equal(body.innerHTML, "<p>Giữ nguyên</p>");
  });

  return results;
}
