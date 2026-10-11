/**
 * VN Office — Unit Tests: VN Sheet đọc/ghi ẢNH NHÚNG (draw:frame/draw:image)
 * trong sheet-adapter.js.
 *
 * Bug thật đã xác nhận: sheet-adapter.js chỉ parse <draw:frame><chart:chart>
 * (biểu đồ) từ FODS, KHÔNG BAO GIỜ đọc <draw:frame><draw:image> (ảnh raster
 * thường — logo công ty, ảnh chèn tay). Writer và Slides đã hỗ trợ draw:image
 * từ trước; chỉ riêng Sheet bị thiếu. Hậu quả kép:
 * 1. Mở file XLSX/ODS thật (Excel, Google Sheets...) có ảnh nhúng → ảnh biến
 *    mất hoàn toàn khi mở trong VN Sheet (xác nhận bằng cách mở file thật
 *    "Copy of máy bảo mật - KTQT - thẩm định.xlsx" — có logo neo tại A1,
 *    hoàn toàn không hiển thị).
 * 2. sheet-grid.js đã có sẵn imagesBySheet/insertImage()/renderImages() đầy
 *    đủ (người dùng tự chèn ảnh, undo/redo hoạt động) nhưng sheet-adapter.js
 *    chưa bao giờ đọc/ghi trường này — ảnh người dùng tự chèn cũng bị MẤT
 *    khi Lưu rồi Mở lại (serializeToFods() không ghi, parseFods() không đọc).
 *
 * Sửa: nhúng <draw:frame><draw:image> trực tiếp bên trong <table:table-cell>
 * neo — ĐÚNG định dạng chuẩn ODF thật do soffice tự ghi khi convert XLSX→FODS
 * (xác nhận qua probe file thật) — dùng CHUNG một định dạng cho cả đọc file
 * ngoài lẫn tự round-trip (không cần thuộc tính riêng vno:*).
 *
 * Tuân thủ chuẩn 06-testing/TESTING-STANDARD.md & AGENTS.md
 */
import { SheetGridController } from "../../apps/sheet/sheet-grid.js";
import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";

const assert = (value, message) => { if (!value) throw new Error(message); };

function container() {
  return {
    style: {}, className: "", classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    appendChild() {}, querySelector: () => null, querySelectorAll: () => [], addEventListener() {}
  };
}

const PNG_1X1_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
const PNG_DATA_URI = `data:image/png;base64,${PNG_1X1_BASE64}`;

export async function runSheetImageImportExportTests() {
  const results = [];
  const test = (name, fn) => { try { fn(); results.push({ name, pass: true }); } catch (error) { results.push({ name, pass: false, error: error.message }); } };

  test("_parseCellEmbeddedImage(): đọc đúng draw:frame/draw:image chuẩn ODF thật trong 1 ô", () => {
    const adapter = new SheetAdapter(null);
    const cellXml = `<draw:frame draw:name="Picture 1" svg:width="4.068cm" svg:height="3.548cm" svg:x="0.543cm" svg:y="0cm"><draw:image draw:mime-type="image/png"><office:binary-data>${PNG_1X1_BASE64}</office:binary-data></draw:image></draw:frame>`;
    const image = adapter._parseCellEmbeddedImage(cellXml, "fallback");
    assert(image, "Phải parse được ảnh");
    assert(image.src === PNG_DATA_URI, `src phải khớp data URI gốc, thực tế: ${image.src}`);
    assert(image.id === "Picture 1", `id phải lấy từ draw:name, thực tế: ${image.id}`);
    assert(Math.abs(image.widthCm - 4.068) < 0.001, `widthCm phải là 4.068, thực tế: ${image.widthCm}`);
    assert(Math.abs(image.heightCm - 3.548) < 0.001, `heightCm phải là 3.548, thực tế: ${image.heightCm}`);
    assert(Math.abs(image.offsetXCm - 0.543) < 0.001, `offsetXCm phải là 0.543, thực tế: ${image.offsetXCm}`);
    assert(Math.abs(image.offsetYCm - 0) < 0.001, `offsetYCm phải là 0, thực tế: ${image.offsetYCm}`);
  });

  test("_parseCellEmbeddedImage(): trả về null khi ô không có ảnh", () => {
    const adapter = new SheetAdapter(null);
    assert(adapter._parseCellEmbeddedImage("<text:p>Không có ảnh</text:p>", "x") === null);
    assert(adapter._parseCellEmbeddedImage("", "x") === null);
  });

  test("parseFods() (nhánh regex): đọc đúng ảnh nhúng từ FODS thật, đúng ô neo", () => {
    const fods = `<?xml version="1.0"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" office:version="1.3" office:mimetype="application/vnd.oasis.opendocument.spreadsheet">
<office:body><office:spreadsheet>
<table:table table:name="Sheet1">
<table:table-column table:number-columns-repeated="5"/>
<table:table-row>
<table:table-cell>
<draw:frame draw:name="Logo" svg:width="4.068cm" svg:height="3.548cm"><draw:image draw:mime-type="image/png"><office:binary-data>${PNG_1X1_BASE64}</office:binary-data></draw:image></draw:frame>
</table:table-cell>
<table:table-cell office:value-type="string" office:string-value="Công ty"><text:p>Công ty</text:p></table:table-cell>
</table:table-row>
<table:table-row><table:table-cell/></table:table-row>
</table:table>
</office:spreadsheet></office:body>
</office:document>`;
    const adapter = new SheetAdapter(null);
    const parsed = adapter.parseFods(fods);
    const images = parsed.imagesBySheet?.Sheet1;
    assert(Array.isArray(images), "Phải có imagesBySheet.Sheet1");
    assert(images.length === 1, `Phải có đúng 1 ảnh, thực tế: ${images?.length}`);
    assert(images[0].anchor.c === "A" && images[0].anchor.r === 1, `Ảnh phải neo tại A1, thực tế: ${JSON.stringify(images[0].anchor)}`);
    assert(images[0].src === PNG_DATA_URI, "src ảnh phải khớp base64 gốc");
    // Ô B1 vẫn phải đọc đúng giá trị text bình thường — ảnh không được làm hỏng parse giá trị ô khác.
    assert(parsed.sheetsData.Sheet1.get("B1")?.val === "Công ty", "Ô B1 (không có ảnh) vẫn phải parse đúng giá trị");
  });

  test("parseFods(): ảnh neo tại ô KHÔNG có giá trị (ô trống hoàn toàn) vẫn được parse, không bị gộp vào vùng trống", () => {
    const fods = `<?xml version="1.0"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" office:version="1.3" office:mimetype="application/vnd.oasis.opendocument.spreadsheet">
<office:body><office:spreadsheet>
<table:table table:name="Sheet1">
<table:table-column table:number-columns-repeated="10"/>
<table:table-row><table:table-cell/></table:table-row>
<table:table-row><table:table-cell/></table:table-row>
<table:table-row><table:table-cell/></table:table-row>
<table:table-row><table:table-cell/></table:table-row>
<table:table-row>
<table:table-cell/><table:table-cell/><table:table-cell/><table:table-cell/>
<table:table-cell><draw:frame draw:name="Deep"><draw:image draw:mime-type="image/png"><office:binary-data>${PNG_1X1_BASE64}</office:binary-data></draw:image></draw:frame></table:table-cell>
</table:table-row>
</table:table>
</office:spreadsheet></office:body>
</office:document>`;
    const adapter = new SheetAdapter(null);
    const parsed = adapter.parseFods(fods);
    const images = parsed.imagesBySheet?.Sheet1 || [];
    assert(images.length === 1, `Phải parse được ảnh ở ô sâu (E5), thực tế: ${images.length}`);
    assert(images[0].anchor.c === "E" && images[0].anchor.r === 5, `Ảnh phải neo tại E5, thực tế: ${JSON.stringify(images[0].anchor)}`);
  });

  test("loadFromFods(): renderImages() phải chạy SAU KHI imagesBySheet đã có dữ liệu thật (không render sớm với dữ liệu rỗng rồi bỏ quên)", () => {
    // Bug thật đã xác nhận bằng cách mở file thật trên máy: parseFods() parse
    // đúng ảnh (test ở trên đã PASS), nhưng ảnh vẫn KHÔNG hiển thị trên màn
    // hình khi mở file thật. Nguyên nhân: loadFromFods() gọi
    // grid.switchSheet(workbook.activeSheet) (tự động renderImages() bên
    // trong) TRƯỚC KHI gán grid.imagesBySheet từ dữ liệu vừa parse — lần
    // render đó thấy imagesBySheet rỗng/cũ. sheet-adapter.js gán dữ liệu
    // xong thì không gọi lại renderImages() nữa (renderCharts() ĐÃ được gọi
    // lại cho đúng lý do này — xem dòng "switchSheet() ở trên chạy TRƯỚC...").
    const fods = `<?xml version="1.0"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" office:version="1.3" office:mimetype="application/vnd.oasis.opendocument.spreadsheet">
<office:body><office:spreadsheet>
<table:table table:name="Sheet1">
<table:table-column table:number-columns-repeated="5"/>
<table:table-row><table:table-cell><draw:frame draw:name="Logo"><draw:image draw:mime-type="image/png"><office:binary-data>${PNG_1X1_BASE64}</office:binary-data></draw:image></draw:frame></table:table-cell></table:table-row>
</table:table>
</office:spreadsheet></office:body>
</office:document>`;
    const grid = new SheetGridController(container());
    const adapter = new SheetAdapter(grid);
    const renderCallSnapshots = [];
    const originalRenderImages = grid.renderImages.bind(grid);
    grid.renderImages = function () {
      renderCallSnapshots.push((this.imagesBySheet[this.activeSheet] || []).length);
      return originalRenderImages();
    };
    adapter.loadFromFods(fods);
    assert(renderCallSnapshots.length > 0, "renderImages() phải được gọi ít nhất 1 lần khi Mở file thật");
    const lastSnapshot = renderCallSnapshots[renderCallSnapshots.length - 1];
    assert(lastSnapshot === 1, `Lần gọi renderImages() CUỐI CÙNG phải thấy đúng 1 ảnh đã nạp, thực tế: ${lastSnapshot} (0 nghĩa là renderImages() chỉ chạy TRƯỚC khi imagesBySheet được gán dữ liệu thật — ảnh sẽ KHÔNG hiển thị trên màn hình dù parse đúng)`);
  });

  test("serializeToFods() → parseFods(): ảnh người dùng tự chèn (insertImage) PHẢI sống sót qua Lưu rồi Mở lại", () => {
    const grid = new SheetGridController(container());
    grid.setCellValue?.("B2", "Xin chào");
    grid.cellsData.set("B2", { val: "Xin chào", formula: "", style: {} });
    const inserted = grid.insertImage(PNG_DATA_URI, { c: "D", r: 3 }, false);
    assert(inserted && inserted.id, "insertImage() phải trả về ảnh với id");

    const adapter = new SheetAdapter(grid);
    const fodsXml = adapter.serializeToFods();
    assert(fodsXml.includes("draw:image"), "FODS xuất ra phải chứa draw:image — ảnh không được bỏ qua khi Lưu");

    const reparsed = adapter.parseFods(fodsXml);
    const images = reparsed.imagesBySheet?.[grid.activeSheet] || [];
    assert(images.length === 1, `Ảnh phải sống sót qua round-trip Lưu→Mở, thực tế còn ${images.length} ảnh`);
    assert(images[0].anchor.c === "D" && images[0].anchor.r === 3, `Ảnh phải giữ đúng ô neo D3, thực tế: ${JSON.stringify(images[0].anchor)}`);
    assert(images[0].src === PNG_DATA_URI, "Dữ liệu ảnh phải khớp nguyên vẹn sau round-trip");

    // Ô B2 (có dữ liệu, không có ảnh) không được bị ảnh hưởng bởi logic ảnh mới.
    const cellB2 = reparsed.sheetsData[grid.activeSheet].get("B2");
    assert(cellB2?.val === "Xin chào", "Ô B2 vẫn phải giữ đúng giá trị sau round-trip");
  });

  test("serializeToFods(): sheet KHÔNG có ảnh nào thì không ghi draw:image thừa", () => {
    const grid = new SheetGridController(container());
    grid.cellsData.set("A1", { val: "Chỉ có chữ", formula: "", style: {} });
    const adapter = new SheetAdapter(grid);
    const fodsXml = adapter.serializeToFods();
    assert(!fodsXml.includes("draw:image"), "Không được ghi draw:image khi sheet không có ảnh nào");
  });

  test("serializeToFods(): ghi images-at-open dùng phân biệt Calc không nhập ảnh và người dùng xóa hết", () => {
    const grid = new SheetGridController(container());
    grid.imagesAtOpenBySheet = { [grid.activeSheet]: 2 };
    grid.imagesBySheet[grid.activeSheet] = [];
    const fodsXml = new SheetAdapter(grid).serializeToFods();
    assert(fodsXml.includes('vno:images-at-open="2"'), "Phải giữ số ảnh lúc mở sau khi người dùng xóa hết");

    grid.imagesAtOpenBySheet[grid.activeSheet] = 0;
    const noImportedImagesXml = new SheetAdapter(grid).serializeToFods();
    assert(noImportedImagesXml.includes('vno:images-at-open="0"'), "Calc không nhập ảnh phải được ghi marker 0");
  });

  test("serializeToFods() → parseFods(): nhiều ảnh trên cùng 1 sheet đều sống sót, đúng từng ô neo", () => {
    const grid = new SheetGridController(container());
    grid.insertImage(PNG_DATA_URI, { c: "A", r: 1 }, false);
    grid.insertImage(PNG_DATA_URI, { c: "F", r: 10 }, false);
    const adapter = new SheetAdapter(grid);
    const fodsXml = adapter.serializeToFods();
    const reparsed = adapter.parseFods(fodsXml);
    const images = reparsed.imagesBySheet?.[grid.activeSheet] || [];
    assert(images.length === 2, `Phải còn đúng 2 ảnh, thực tế: ${images.length}`);
    const anchors = images.map(image => `${image.anchor.c}${image.anchor.r}`).sort();
    assert(anchors[0] === "A1" && anchors[1] === "F10", `Vị trí neo phải là A1 và F10, thực tế: ${anchors.join(",")}`);
  });

  test("_parseCellEmbeddedImage(): đổi đúng các đơn vị in, mm, pt về cm", () => {
    const adapter = new SheetAdapter(null);
    // 1in = 2.54cm, 10mm = 1cm, 72pt = 2.54cm, 36pt = 1.27cm
    const cellXml = `<draw:frame draw:name="Units" svg:width="1in" svg:height="10mm" svg:x="72pt" svg:y="36pt"><draw:image draw:mime-type="image/png"><office:binary-data>${PNG_1X1_BASE64}</office:binary-data></draw:image></draw:frame>`;
    const image = adapter._parseCellEmbeddedImage(cellXml, "fallback");
    assert(image, "Phải parse được ảnh");
    assert(Math.abs(image.widthCm - 2.54) < 0.01, `widthCm từ 1in phải là 2.54, thực tế: ${image.widthCm}`);
    assert(Math.abs(image.heightCm - 1) < 0.01, `heightCm từ 10mm phải là 1, thực tế: ${image.heightCm}`);
    assert(Math.abs(image.offsetXCm - 2.54) < 0.01, `offsetXCm từ 72pt phải là 2.54, thực tế: ${image.offsetXCm}`);
    assert(Math.abs(image.offsetYCm - 1.27) < 0.01, `offsetYCm từ 36pt phải là 1.27, thực tế: ${image.offsetYCm}`);
  });

  test("_parseCellEmbeddedImageDom(): đọc đúng svg:x, svg:y, widthCm, heightCm qua DOM", () => {
    const adapter = new SheetAdapter(null);
    const xml = `<table:table-cell xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0" xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0">
      <draw:frame draw:name="Picture 2" svg:width="6.27cm" svg:height="6.251cm" svg:x="1.334cm" svg:y="0.552cm">
        <draw:image draw:mime-type="image/png"><office:binary-data>${PNG_1X1_BASE64}</office:binary-data></draw:image>
      </draw:frame>
    </table:table-cell>`;
    let cellEl;
    if (typeof DOMParser !== "undefined") {
      cellEl = new DOMParser().parseFromString(xml, "application/xml").documentElement;
    } else {
      const frameEl = {
        localName: "frame",
        namespaceURI: "urn:oasis:names:tc:opendocument:xmlns:drawing:1.0",
        getAttribute: (attr) => ({
          "draw:name": "Picture 2",
          "svg:width": "6.27cm",
          "svg:height": "6.251cm",
          "svg:x": "1.334cm",
          "svg:y": "0.552cm"
        }[attr] || null),
        children: [{
          localName: "image",
          namespaceURI: "urn:oasis:names:tc:opendocument:xmlns:drawing:1.0",
          getAttribute: (attr) => attr === "draw:mime-type" ? "image/png" : null,
          children: [{
            localName: "binary-data",
            namespaceURI: "urn:oasis:names:tc:opendocument:xmlns:office:1.0",
            textContent: PNG_1X1_BASE64
          }]
        }]
      };
      cellEl = { localName: "table-cell", namespaceURI: "urn:oasis:names:tc:opendocument:xmlns:table:1.0", children: [frameEl] };
    }
    const image = adapter._parseCellEmbeddedImageDom(cellEl, "fallback");
    assert(image, "Phải parse được ảnh qua DOM");
    assert(image.id === "Picture 2", `id phải là Picture 2, thực tế: ${image.id}`);
    assert(Math.abs(image.widthCm - 6.27) < 0.001, `widthCm phải là 6.27, thực tế: ${image.widthCm}`);
    assert(Math.abs(image.heightCm - 6.251) < 0.001, `heightCm phải là 6.251, thực tế: ${image.heightCm}`);
    assert(Math.abs(image.offsetXCm - 1.334) < 0.001, `offsetXCm phải là 1.334, thực tế: ${image.offsetXCm}`);
    assert(Math.abs(image.offsetYCm - 0.552) < 0.001, `offsetYCm phải là 0.552, thực tế: ${image.offsetYCm}`);
  });

  test("serializeToFods() → parseFods(): ghi và nạp lại chính xác svg:x, svg:y (offset)", () => {
    const grid = new SheetGridController(container());
    grid.imagesBySheet[grid.activeSheet] = [{
      id: "Camera B5",
      src: PNG_DATA_URI,
      anchor: { c: "B", r: 5 },
      widthCm: 6.27,
      heightCm: 6.251,
      offsetXCm: 1.334,
      offsetYCm: 0.552
    }];
    const adapter = new SheetAdapter(grid);
    const fodsXml = adapter.serializeToFods();
    assert(fodsXml.includes('svg:x="1.334cm"'), `FODS phải chứa svg:x="1.334cm", thực tế: ${fodsXml.slice(fodsXml.indexOf("<draw:frame"), fodsXml.indexOf("</draw:frame>") + 13)}`);
    assert(fodsXml.includes('svg:y="0.552cm"'), `FODS phải chứa svg:y="0.552cm"`);

    const reparsed = adapter.parseFods(fodsXml);
    const img = reparsed.imagesBySheet?.[grid.activeSheet]?.[0];
    assert(img, "Ảnh phải được nạp lại");
    assert(img.anchor.c === "B" && img.anchor.r === 5, "Anchor phải là B5");
    assert(Math.abs(img.offsetXCm - 1.334) < 0.001, `offsetXCm sau round-trip phải là 1.334, thực tế: ${img.offsetXCm}`);
    assert(Math.abs(img.offsetYCm - 0.552) < 0.001, `offsetYCm sau round-trip phải là 0.552, thực tế: ${img.offsetYCm}`);
    assert(Math.abs(img.widthCm - 6.27) < 0.001, `widthCm sau round-trip phải là 6.27, thực tế: ${img.widthCm}`);
    assert(Math.abs(img.heightCm - 6.251) < 0.001, `heightCm sau round-trip phải là 6.251, thực tế: ${img.heightCm}`);
  });

  test("parseFods(): đọc đúng ảnh nhúng nằm trong <table:covered-table-cell> (ô gộp nhiều cột)", () => {
    const fods = `<?xml version="1.0"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0">
<office:body><office:spreadsheet>
<table:table table:name="Sheet1">
<table:table-column table:number-columns-repeated="5"/>
<table:table-row>
  <table:table-cell table:number-columns-spanned="3"><text:p>Gộp</text:p></table:table-cell>
  <table:covered-table-cell>
    <draw:frame draw:name="CoveredPic" svg:width="3cm" svg:height="3cm">
      <draw:image draw:mime-type="image/jpeg"><office:binary-data>${PNG_1X1_BASE64}</office:binary-data></draw:image>
    </draw:frame>
  </table:covered-table-cell>
  <table:covered-table-cell/>
</table:table-row>
</table:table>
</office:spreadsheet></office:body>
</office:document>`;
    const adapter = new SheetAdapter(null);
    const parsed = adapter.parseFods(fods);
    const images = parsed.imagesBySheet?.Sheet1 || [];
    assert(images.length === 1, `Phải parse được ảnh trong covered-table-cell, thực tế: ${images.length}`);
    assert(images[0].anchor.c === "B" && images[0].anchor.r === 1, `Ảnh phải neo tại B1, thực tế: ${images[0].anchor.c}${images[0].anchor.r}`);
  });

  test("serializeToFods(): giữ lại <draw:frame> ảnh trong <table:covered-table-cell> khi ô bị che", () => {
    const grid = new SheetGridController(container());
    grid.activeSheet = "Sheet1";
    grid.sheets = ["Sheet1"];
    grid.mergedRangesBySheet = { "Sheet1": [{ start: { c: "A", r: 1 }, end: { c: "C", r: 1 } }] };
    grid.imagesBySheet["Sheet1"] = [{
      id: "CoveredImg",
      src: PNG_DATA_URI,
      anchor: { c: "B", r: 1 },
      widthCm: 3,
      heightCm: 3
    }];
    const adapter = new SheetAdapter(grid);
    const fods = adapter.serializeToFods();
    assert(fods.includes("<table:covered-table-cell><draw:frame"), "FODS phải chứa draw:frame bên trong covered-table-cell");
  });

  test("serializeToFods() & parseFods(): ghi và đọc chuẩn ODF tableooo:tab-color trong style:table-properties", () => {
    const grid = new SheetGridController(container());
    grid.activeSheet = "Sheet1";
    grid.sheets = ["Sheet1", "Sheet2"];
    grid.tabColors = { "Sheet1": "#FF5500", "Sheet2": "#00AAFF" };
    const adapter = new SheetAdapter(grid);
    const fods = adapter.serializeToFods();
    assert(fods.includes('tableooo:tab-color="#ff5500"') || fods.includes('tableooo:tab-color="#FF5500"'), "FODS phải có tableooo:tab-color");
    assert(fods.includes('table:tab-color="#ff5500"') || fods.includes('table:tab-color="#FF5500"'), "FODS phải có table:tab-color");

    const parsed = adapter.parseFods(fods);
    assert(parsed.tabColors, "parsed phải có tabColors");
    assert(parsed.tabColors["Sheet1"].toLowerCase() === "#ff5500", `Sheet1 color phải là #ff5500, thực tế: ${parsed.tabColors["Sheet1"]}`);
    assert(parsed.tabColors["Sheet2"].toLowerCase() === "#00aaff", `Sheet2 color phải là #00aaff, thực tế: ${parsed.tabColors["Sheet2"]}`);
  });

  return results;
}
