/**
 * Bug thật đã phát hiện khi kiểm tra file thật mở trên Microsoft Excel: parseFods()
 * chỉ đọc Page Setup từ thuộc tính vno:page-* riêng của VN Office. Thuộc tính này CHỈ
 * tồn tại khi chính VN Office ghi ra và CHƯA từng qua vòng chuyển đổi thật nào - bất kỳ
 * file ODF/FODS thật nào khác (từ LibreOffice thật, từ Excel thật qua LibreOffice, hoặc
 * chính file của VN Office sau khi đã qua một vòng convert thật) đều KHÔNG có các thuộc
 * tính riêng này, khiến Page Setup của người dùng bị âm thầm reset về mặc định khi mở lại.
 * Test này dùng một đoạn FODS chuẩn ODF THẬT (không có bất kỳ thuộc tính vno:* nào),
 * mô phỏng đúng cấu trúc thật mà LibreOffice/Excel thật tạo ra
 * (table:style-name -> style:style[master-page-name] -> style:master-page[page-layout-name]
 * -> style:page-layout[style:page-layout-properties]) để xác nhận parseFods() đọc đúng.
 */
import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

// Cấu trúc rút gọn từ một FODS THẬT do LibreOffice tạo ra khi convert từ XLSX thật
// (không có bất kỳ thuộc tính vno:* nào - mô phỏng đúng file người dùng mở từ Excel).
function realOdfFods({ orientation = "landscape", marginTop = "2.75cm", marginBottom = "2.499cm", marginLeft = "1.9cm", marginRight = "1.499cm", scale = "85%", centering = "horizontal", printTokens = "objects charts drawings zero-values" } = {}) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" office:version="1.2" office:mimetype="application/vnd.oasis.opendocument.spreadsheet">
 <office:automatic-styles>
  <style:style style:name="ta1" style:family="table" style:master-page-name="PageStyle_5f_BaoCaoQuy">
   <style:table-properties table:display="true"/>
  </style:style>
  <style:page-layout style:name="pm1">
   <style:page-layout-properties style:writing-mode="lr-tb"/>
  </style:page-layout>
  <style:page-layout style:name="pm3">
   <style:page-layout-properties fo:page-width="29.7cm" fo:page-height="21.001cm" style:print-orientation="${orientation}" fo:margin-top="${marginTop}" fo:margin-bottom="${marginBottom}" fo:margin-left="${marginLeft}" fo:margin-right="${marginRight}" style:scale-to="${scale}" style:table-centering="${centering}" style:print="${printTokens}"/>
  </style:page-layout>
 </office:automatic-styles>
 <office:master-styles>
  <style:master-page style:name="Default" style:page-layout-name="pm1"/>
  <style:master-page style:name="PageStyle_5f_BaoCaoQuy" style:display-name="PageStyle_BaoCaoQuy" style:page-layout-name="pm3"/>
 </office:master-styles>
 <office:body>
  <office:spreadsheet>
   <table:table table:name="BaoCaoQuy" table:style-name="ta1" table:print-ranges="BaoCaoQuy.A1:BaoCaoQuy.F30">
    <table:table-column table:number-columns-repeated="6"/>
    <table:table-row>
     <table:table-cell office:value-type="string"><text:p>STT</text:p></table:table-cell>
    </table:table-row>
   </table:table>
  </office:spreadsheet>
 </office:body>
</office:document>`;
}

export async function runSheetPagesetupRealFileImportTests() {
  const results = [];
  const test = (name, fn) => { try { fn(); results.push({ name, pass: true }); } catch (error) { results.push({ name, pass: false, error: error.message }); } };

  test("parseFods: file ODF thật (không có thuộc tính vno:page-*) vẫn đọc đúng hướng trang từ style:print-orientation", () => {
    const adapter = new SheetAdapter(null);
    const parsed = adapter.parseFods(realOdfFods({ orientation: "landscape" }));
    assert(parsed.pageSetupBySheet.BaoCaoQuy.orientation === "landscape", `orientation sai: ${parsed.pageSetupBySheet.BaoCaoQuy.orientation}`);
  });

  test("parseFods: file ODF thật đọc đúng lề từ fo:margin-top/bottom/left/right (cm)", () => {
    const adapter = new SheetAdapter(null);
    const parsed = adapter.parseFods(realOdfFods({ marginTop: "2.5cm", marginBottom: "2.5cm", marginLeft: "1.9cm", marginRight: "1.5cm" }));
    const margins = parsed.pageSetupBySheet.BaoCaoQuy.margins;
    assert(margins.top === 2.5, `margin top sai: ${margins.top}`);
    assert(margins.bottom === 2.5, `margin bottom sai: ${margins.bottom}`);
    assert(margins.left === 1.9, `margin left sai: ${margins.left}`);
    assert(margins.right === 1.5, `margin right sai: ${margins.right}`);
  });

  test("parseFods: file ODF thật đọc đúng lề khi đơn vị là inch, không chỉ cm", () => {
    const adapter = new SheetAdapter(null);
    const parsed = adapter.parseFods(realOdfFods({ marginTop: "0.75in", marginBottom: "0.75in", marginLeft: "0.7in", marginRight: "0.7in" }));
    const margins = parsed.pageSetupBySheet.BaoCaoQuy.margins;
    assert(Math.abs(margins.top - 1.905) < 0.01, `margin top (inch->cm) sai: ${margins.top}`);
    assert(Math.abs(margins.left - 1.778) < 0.01, `margin left (inch->cm) sai: ${margins.left}`);
  });

  test("parseFods: file ODF thật đọc đúng tỷ lệ in từ style:scale-to", () => {
    const adapter = new SheetAdapter(null);
    const parsed = adapter.parseFods(realOdfFods({ scale: "85%" }));
    const scale = parsed.pageSetupBySheet.BaoCaoQuy.scale;
    assert(scale.mode === "percent", `scale mode sai: ${scale.mode}`);
    assert(scale.percent === 85, `scale percent sai: ${scale.percent}`);
  });

  test("parseFods: file ODF thật đọc đúng Căn giữa trang từ style:table-centering", () => {
    const adapter = new SheetAdapter(null);
    const parsedBoth = new SheetAdapter(null).parseFods(realOdfFods({ centering: "both" }));
    assert(parsedBoth.pageSetupBySheet.BaoCaoQuy.centerOnPage.horizontal === true, "centering=both phải bật horizontal");
    assert(parsedBoth.pageSetupBySheet.BaoCaoQuy.centerOnPage.vertical === true, "centering=both phải bật vertical");
    const parsedNone = adapter.parseFods(realOdfFods({ centering: "none" }));
    assert(parsedNone.pageSetupBySheet.BaoCaoQuy.centerOnPage.horizontal === false, "centering=none không được bật horizontal");
  });

  test("parseFods: file ODF thật đọc đúng khổ giấy A4 từ kích thước fo:page-width/height thật", () => {
    const adapter = new SheetAdapter(null);
    const parsed = adapter.parseFods(realOdfFods({}));
    assert(parsed.pageSetupBySheet.BaoCaoQuy.size === "a4", `size sai: ${parsed.pageSetupBySheet.BaoCaoQuy.size}`);
  });

  test("parseFods: file do chính VN Office ghi ra (có vno:page-*) vẫn ưu tiên giá trị vno:* chính xác tuyệt đối, không bị fallback ODF chuẩn ghi đè", () => {
    const sheet = "S1";
    const grid = {
      sheets: [sheet], activeSheet: sheet,
      sheetsData: { [sheet]: new Map([["A1", { val: "x", formula: "", style: {} }]]) },
      commentsBySheet: { [sheet]: {} }, namedRangesBySheet: { [sheet]: [] }, namedRangesWorkbook: [],
      printAreaBySheet: { [sheet]: null },
      pageSetupBySheet: { [sheet]: {
        margins: { top: 3.33, bottom: 3.33, left: 3.33, right: 3.33 },
        orientation: "landscape", size: "legal",
        scale: { mode: "pages", percent: 100, pagesWide: 2, pagesTall: 3 },
        headerFooter: { header: { left: "", center: "", right: "" }, footer: { left: "", center: "", right: "" } },
        centerOnPage: { horizontal: true, vertical: true },
        printOptions: { gridlines: true, headings: true },
        printTitles: { rows: "1:2", cols: "" }
      } }
    };
    const fods = new SheetAdapter(grid).serializeToFods();
    const parsed = new SheetAdapter(null).parseFods(fods);
    const after = parsed.pageSetupBySheet[sheet];
    assert(after.margins.top === 3.33, `Tự-round-trip phải giữ nguyên lề chính xác 3.33, nhận ${after.margins.top}`);
    assert(after.scale.mode === "pages" && after.scale.pagesWide === 2 && after.scale.pagesTall === 3, "Tự-round-trip phải giữ đúng chế độ scale pages 2x3, không bị fallback percent ODF ghi đè");
    assert(after.size === "legal", `Tự-round-trip phải giữ đúng khổ Legal, nhận ${after.size}`);
  });

  return results;
}
