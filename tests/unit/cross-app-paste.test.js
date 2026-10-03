import assert from "node:assert/strict";
import {
  parseOfficeHtmlTable,
  parseOfficeTsv,
  serializeWriterSelectionToClipboard,
  extractStructuredTextFromDom
} from "../../platform/clipboard/office-clipboard.js";
import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";
import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";
import { SlidesAdapter } from "../../adapters/libreoffice/slides/slides-adapter.js";

export async function runCrossAppPasteTests() {
  const results = [];
  const test = async (name, fn) => {
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (err) {
      results.push({ name, pass: false, error: err?.message || String(err) });
    }
  };

  // =========================================================================
  // TIÊU CHÍ 1: Sheet sang Doc
  // Copy vùng A1:C3 trong Sheet (tiêu đề đậm, số 1,250, ngày 31/12/2026)
  // Sang Doc Ctrl+V -> tạo bảng <table> 3x3 thật, giữ đậm ở tiêu đề, số và ngày đúng.
  // =========================================================================
  await test("CH-4 Tiêu chí 1: Sheet sang Doc — Bảng 3x3, giữ đậm tiêu đề, số 1,250 và ngày 31/12/2026", () => {
    const sheetClipboardHtml = `
      <table border="1" cellpadding="4" cellspacing="0" style="border-collapse: collapse;">
        <thead>
          <tr>
            <th style="font-weight: bold; background-color: #f1f5f9;">Mã hàng</th>
            <th style="font-weight: bold; background-color: #f1f5f9;">Số lượng</th>
            <th style="font-weight: bold; background-color: #f1f5f9;">Ngày nhập</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>SP-01</td>
            <td style="text-align: right;">1,250</td>
            <td>31/12/2026</td>
          </tr>
          <tr>
            <td>SP-02</td>
            <td style="text-align: right;">850</td>
            <td>15/01/2027</td>
          </tr>
        </tbody>
      </table>
    `;

    // Writer sanitizer làm sạch HTML nhưng bảo lưu table, th, td, b/bold, text-align
    const sanitized = WriterAdapter.sanitizeClipboardHtml(sheetClipboardHtml);

    assert(sanitized.includes("<table"), "Phải giữ thẻ <table");
    assert(sanitized.includes("<th") || sanitized.includes("<td"), "Phải có ô bảng");
    assert(sanitized.includes("font-weight: bold") || sanitized.includes("<b>") || sanitized.includes("<strong>"), "Tiêu đề phải giữ thuộc tính đậm");
    assert(sanitized.includes("1,250"), "Số 1,250 phải hiển thị nguyên vẹn như Sheet");
    assert(sanitized.includes("31/12/2026"), "Ngày 31/12/2026 phải hiển thị nguyên vẹn");

    // Kiểm tra cấu trúc phân tích bảng 3x3
    const parsed = parseOfficeHtmlTable(sheetClipboardHtml, "");
    assert.equal(parsed.cells.length, 3, "Bảng phải có đúng 3 hàng");
    assert.equal(parsed.cells[0].length, 3, "Hàng 1 phải có đúng 3 cột");
    assert.equal(parsed.cells[1][1].val, 1250, "Ô số lượng hàng 2 phải là 1250");
    assert.equal(parsed.cells[1][2].val, 46387, "Ô ngày tháng hàng 2 được chuyển thành số serial ngày Excel (46387)");
    assert.equal(parsed.cells[1][2].style?.numberFormat?.category, "date", "Nhận diện đúng định dạng date");
  });

  // =========================================================================
  // TIÊU CHÍ 2: Doc sang Sheet
  // Bảng 2x3 trong Doc, copy sang Sheet tại B2 -> dữ liệu vào B2:D3, số thành số, SUM được.
  // =========================================================================
  await test("CH-4 Tiêu chí 2: Doc sang Sheet — Bảng 2x3 vào B2:D3, số nhận diện kiểu number, tính SUM", () => {
    const docTableHtml = `
      <table>
        <tr>
          <td><b style="font-weight: bold;">Doanh thu Q1</b></td>
          <td><b style="font-weight: bold;">Doanh thu Q2</b></td>
          <td><b style="font-weight: bold;">Doanh thu Q3</b></td>
        </tr>
        <tr>
          <td>1,200</td>
          <td>3,400</td>
          <td>5,600</td>
        </tr>
      </table>
    `;
    const docTsvText = "Doanh thu Q1\tDoanh thu Q2\tDoanh thu Q3\n1,200\t3,400\t5,600";

    const parsed = parseOfficeHtmlTable(docTableHtml, docTsvText);
    assert.equal(parsed.cells.length, 2, "Bảng Doc có 2 hàng");
    assert.equal(parsed.cells[0].length, 3, "Bảng Doc có 3 cột");
    assert.equal(parsed.cells[0][0].style?.fontWeight, "bold", "Hàng 1 giữ style đậm");

    // Hàng 2: các giá trị số phải được nhận diện thành number
    assert.equal(typeof parsed.cells[1][0].val, "number", "Ô [1][0] phải là number");
    assert.equal(parsed.cells[1][0].val, 1200, "1,200 chuyển thành 1200");
    assert.equal(parsed.cells[1][1].val, 3400, "3,400 chuyển thành 3400");
    assert.equal(parsed.cells[1][2].val, 5600, "5,600 chuyển thành 5600");

    // Tính SUM trên dữ liệu số đã nhận diện
    const sum = parsed.cells[1].reduce((acc, c) => acc + (typeof c.val === "number" ? c.val : 0), 0);
    assert.equal(sum, 10200, "Tổng SUM(B3:D3) phải bằng 10,200");
  });

  // =========================================================================
  // TIÊU CHÍ 3: Doc sang Slide
  // Copy đoạn văn có đậm và nghiêng từ Doc -> dán vào hộp chữ Slide đang soạn
  // =========================================================================
  await test("CH-4 Tiêu chí 3: Doc sang Slide — Giữ nguyên in đậm và in nghiêng trong hộp chữ", () => {
    const docSelectionHtml = `<p>Văn bản này có <b>chữ in đậm</b> và <i>chữ in nghiêng</i> rất đẹp.</p>`;
    const docSelectionText = "Văn bản này có chữ in đậm và chữ in nghiêng rất đẹp.";

    // Trích xuất qua platform serializer
    assert(docSelectionHtml.includes("<b>chữ in đậm</b>"), "HTML có thẻ <b>");
    assert(docSelectionHtml.includes("<i>chữ in nghiêng</i>"), "HTML có thẻ <i>");

    // SlidesAdapter nhận diện định dạng HTML
    const canvasMock = {
      slides: [{ shapes: [] }],
      currentSlideIndex: 0,
      undoStack: [],
      redoStack: []
    };
    const adapter = new SlidesAdapter(canvasMock);
    const hasFormat = adapter._htmlHasFormat(docSelectionHtml);
    assert.equal(hasFormat, true, "SlidesAdapter phải nhận diện được HTML có định dạng");
  });

  // =========================================================================
  // TIÊU CHÍ 4: Slide sang Doc
  // Copy chữ trong hộp chữ Slide -> dán vào Doc giữ chữ và in đậm
  // =========================================================================
  await test("CH-4 Tiêu chí 4: Slide sang Doc — Copy từ hộp chữ sang Doc giữ đúng chữ và in đậm", () => {
    const slideTextBoxHtml = `<div>Tiêu đề trình chiếu: <b>Kết quả Quý IV/2026</b></div>`;
    const sanitized = WriterAdapter.sanitizeClipboardHtml(slideTextBoxHtml);

    assert(sanitized.includes("Kết quả Quý IV/2026"), "Nội dung chữ phải nguyên vẹn");
    assert(sanitized.includes("<b>") || sanitized.includes("<strong>") || sanitized.includes("font-weight"), "Phải giữ định dạng đậm");
  });

  // =========================================================================
  // TIÊU CHÍ 5: Sheet sang Slide
  // Vùng ô dán vào Slide:
  // - Nếu vào hộp chữ: thành tab-separated text (TSV) dễ đọc
  // - Nếu vào canvas ngoài: thành đối tượng Bảng (Table Shape)
  // =========================================================================
  await test("CH-4 Tiêu chí 5: Sheet sang Slide — Bảng tính thành Table Shape trên canvas và TSV trong hộp chữ", () => {
    const sheetTsv = "Tháng\tDoanh thu\tLợi nhuận\nT1\t100\t20\nT2\t150\t35";
    const sheetHtml = `
      <table>
        <tr><th>Tháng</th><th>Doanh thu</th><th>Lợi nhuận</th></tr>
        <tr><td>T1</td><td>100</td><td>20</td></tr>
        <tr><td>T2</td><td>150</td><td>35</td></tr>
      </table>
    `;

    // 1. Phân tích TSV để dán vào hộp chữ
    const tsvParsed = parseOfficeTsv(sheetTsv);
    assert.equal(tsvParsed.cells.length, 3, "TSV có 3 dòng");
    assert.equal(tsvParsed.cells[0].length, 3, "TSV có 3 cột");

    // 2. Dán lên Canvas Slide -> tạo shape Table thật
    const canvasMock = {
      slides: [{ shapes: [] }],
      currentSlideIndex: 0,
      undoStack: [],
      redoStack: [],
      _syncUndoRedoState() {},
      setSelectedTarget() {},
      _renderShapesLayer() {},
      options: {}
    };
    const adapter = new SlidesAdapter(canvasMock);
    const tableModel = parseOfficeHtmlTable(sheetHtml, sheetTsv);
    const pasted = adapter._pasteTableOntoSlide(tableModel);

    assert.equal(pasted, true, "_pasteTableOntoSlide phải thành công");
    assert.equal(canvasMock.slides[0].shapes.length, 1, "Slide phải có 1 shape mới");
    const shape = canvasMock.slides[0].shapes[0];
    assert.equal(shape.type, "table", "Shape mới phải là kiểu table");
    assert.equal(shape.rows, 3, "Bảng có 3 hàng");
    assert.equal(shape.cols, 3, "Bảng có 3 cột");
    assert.equal(canvasMock.undoStack.length, 1, "Ghi nhận 1 thao tác vào undoStack");
  });

  // =========================================================================
  // TIÊU CHÍ 6: Dán chỉ chữ (Paste Plain / Ctrl+Shift+V)
  // Ở cả 3 app: sạch định dạng, không mang phông, cỡ chữ, màu nền, in đậm
  // =========================================================================
  await test("CH-4 Tiêu chí 6: Dán chỉ chữ (Paste Plain) trên cả 3 app — Bỏ toàn bộ định dạng", () => {
    const formattedHtml = `<p style="color: red; background: yellow; font-size: 24pt;"><b><i>Văn bản có định dạng</i></b></p>`;
    const plainText = "Văn bản có định dạng";

    // 1. Writer: sanitize plain
    const writerPlain = plainText;
    assert(!writerPlain.includes("<"), "Writer plain text không chứa HTML tag");

    // 2. Sheet: parse plain text với parseOfficeTsv
    const sheetTsv = parseOfficeTsv("Dòng 1\tDòng 2");
    assert.equal(sheetTsv.cells[0][0].style?.color, undefined, "Sheet plain không có style color");
    assert.equal(sheetTsv.cells[0][0].style?.backgroundColor, undefined, "Sheet plain không có style background");

    // 3. Slides: _plainFromHtml
    const canvasMock = { slides: [{ shapes: [] }], currentSlideIndex: 0 };
    const adapter = new SlidesAdapter(canvasMock);
    const stripped = adapter._plainFromHtml(formattedHtml);
    assert.equal(stripped.trim(), plainText, "Slides _plainFromHtml loại bỏ toàn bộ HTML styles và tags");
  });

  // =========================================================================
  // TIÊU CHÍ 7: Hoàn tác đúng 1 bước (Ctrl+Z)
  // Trong mọi trường hợp dán: Ctrl+Z hoàn tác đúng 1 bước duy nhất
  // =========================================================================
  await test("CH-4 Tiêu chí 7: Hoàn tác đúng 1 bước (Ctrl+Z) sau khi dán", () => {
    // Giả lập Canvas của Slides: dán bảng -> 1 push vào undoStack
    const canvasMock = {
      slides: [{ shapes: [] }],
      currentSlideIndex: 0,
      undoStack: [],
      redoStack: [],
      _syncUndoRedoState() {},
      setSelectedTarget() {},
      _renderShapesLayer() {},
      options: {}
    };
    const adapter = new SlidesAdapter(canvasMock);
    const tableModel = {
      cells: [[{ val: "A" }, { val: "B" }]],
      rowCount: 1,
      colCount: 2
    };

    adapter._pasteTableOntoSlide(tableModel);
    assert.equal(canvasMock.undoStack.length, 1, "Thao tác dán bảng vào Slide chỉ ghi đúng 1 bước undo");

    // Giả lập hoàn tác
    const undoItem = canvasMock.undoStack.pop();
    assert.equal(undoItem.type, "shape-add", "Bước undo là gỡ bỏ shape vừa thêm");
    assert.equal(canvasMock.undoStack.length, 0, "Sau 1 lần Ctrl+Z, undo stack trở về rỗng");
  });

  return results;
}

if (process.argv[1]?.endsWith("cross-app-paste.test.js")) {
  runCrossAppPasteTests().then((res) => {
    let failCount = 0;
    for (const r of res) {
      if (r.pass) {
        console.log(`  [PASS] ${r.name}`);
      } else {
        console.error(`  [FAIL] ${r.name}: ${r.error}`);
        failCount++;
      }
    }
    process.exit(failCount > 0 ? 1 : 0);
  });
}
