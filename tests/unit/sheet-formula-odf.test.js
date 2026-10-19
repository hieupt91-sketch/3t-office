/**
 * Test Suite: Sheet formula Excel ⇄ ODF conversion of deleted references (#REF!).
 * LibreOffice spells a deleted reference `[#REF!]`; writing it bare made the saved
 * .xls hold `=#N/A` instead of Excel's `#REF!` (legacy06.xls, 9 cells, 29/9/2026).
 */

import { SheetAdapter, EXCEL2016_OOXML_FUTURE_FUNCTIONS } from "../../adapters/libreoffice/sheet/sheet-adapter.js";
import { readFileSync } from "node:fs";

export async function runSheetFormulaOdfTests() {
  const adapter = new SheetAdapter(null);
  const results = [];
  const check = (name, actual, expected) => results.push({ name, pass: actual === expected, error: `got ${actual}` });

  check("#REF! ghi ra ODF có ngoặc vuông", adapter._formulaToOdf("=#REF!-(#REF!*#REF!)"), "of:=[#REF!]-([#REF!]*[#REF!])");
  check("#REF! khứ hồi ODF → Excel giữ nguyên", adapter._formulaFromOdf(adapter._formulaToOdf("=#REF!-(#REF!*#REF!)")), "=#REF!-(#REF!*#REF!)");
  check("#REF! lẫn tham chiếu thường", adapter._formulaToOdf("=SUM(A1:B2)+#REF!"), "of:=SUM([.A1:.B2])+[#REF!]");
  check("RANK.EQ tự thêm _xlfn. khi ghi ODF", adapter._formulaToOdf("=RANK.EQ(A1,A1:A5,0)"), "of:=_xlfn.RANK.EQ([.A1];[.A1:.A5];0)");
  check("FORMULATEXT tự thêm _xlfn. khi ghi ODF", adapter._formulaToOdf("=FORMULATEXT(A1)"), "of:=_xlfn.FORMULATEXT([.A1])");
  check("hàm lồng nhau nhận tiền tố đúng", adapter._formulaToOdf("=IF(A1>0,STDEV.S(A1:A5),0)"), "of:=IF([.A1]>0;_xlfn.STDEV.S([.A1:.A5]);0)");
  check("mã sản phẩm trong chuỗi SUMIF không biến thành tham chiếu ô", adapter._formulaToOdf('=SUMIF(B2:B22,"SP01",G2:G22)'), 'of:=SUMIF([.B2:.B22];"SP01";[.G2:.G22])');
  check("tiền tố có sẵn không bị lặp", adapter._formulaToOdf("=_xlfn.RANK.EQ(A1,A1:A5,0)"), "of:=_xlfn.RANK.EQ([.A1];[.A1:.A5];0)");
  check("chuỗi có tên hàm không bị đổi", adapter._formulaToOdf('=IF(A1="RANK.EQ(",RANK.EQ(A1,A1:A5),0)'), 'of:=IF([.A1]="RANK.EQ(";_xlfn.RANK.EQ([.A1];[.A1:.A5]);0)');
  check("hàm sau Excel 2016 không được thêm tiền tố", adapter._formulaToOdf("=CONCAT(A1,A2)"), "of:=CONCAT([.A1];[.A2])");
  check("hàm mảng động SEQUENCE (Excel 2021) không được thêm tiền tố", adapter._formulaToOdf("=SEQUENCE(2)"), "of:=SEQUENCE(2)");
  check("cờ tương thích tắt giữ nguyên hàm", new SheetAdapter(null, { excel2016FunctionNameCompat: false })._formulaToOdf("=RANK.EQ(A1,A1:A5)"), "of:=RANK.EQ([.A1];[.A1:.A5])");
  check("đọc ODF bỏ tiền tố Excel 2016", adapter._formulaFromOdf("of:=_xlfn.RANK.EQ([.A1];[.A1:.A5];0)"), "=RANK.EQ(A1,A1:A5,0)");
  check("đọc ODF bỏ tiền tố worksheet-only", adapter._formulaFromOdf("of:=_xlfn._xlws.SORT([.A1:.A5])"), "=SORT(A1:A5)");
  check("đọc ODF bỏ tiền tố _xlws riêng", adapter._formulaFromOdf("of:=_xlws.SORT([.A1:.A5])"), "=SORT(A1:A5)");
  const publishedMap = JSON.parse(readFileSync(new URL("../../docs/EXCEL2016-FUNCTION-COMPAT-MAP.json", import.meta.url), "utf8"));
  check("bảng ánh xạ công khai đồng bộ mã adapter", [...EXCEL2016_OOXML_FUTURE_FUNCTIONS].sort().join(","), publishedMap.functions.join(","));
  check("Chuỗi \"#REF!\" trong ngoặc kép giữ nguyên", adapter._formulaToOdf("=IF(A1=\"#REF!\",1,2)"), "of:=IF([.A1]=\"#REF!\";1;2)");
  // legacy09.xls: a sheet name containing the argument separator lost its comma on save.
  check("Tên sheet có dấu phẩy giữ nguyên khi ghi ODF",
    adapter._formulaToOdf("=SUM('Mạng, camera'!G8:G11)"), "of:=SUM([$'Mạng, camera'.G8:$'Mạng, camera'.G11])");
  check("Tên sheet có dấu phẩy khứ hồi ODF → Excel",
    adapter._formulaFromOdf("of:=SUM([$'Mạng, camera'.G8:.G11];1)"), "=SUM('Mạng, camera'!G8:G11,1)");
  // Not covered yet: sheet names containing an escaped quote ('O''Brien'!A1) — the reference
  // regex in _formulaToOdf matches '[^']+' only (pre-existing limitation, tracked separately).
  return results;
}
