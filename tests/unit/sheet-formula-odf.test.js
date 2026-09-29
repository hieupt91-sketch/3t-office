/**
 * Test Suite: Sheet formula Excel ⇄ ODF conversion of deleted references (#REF!).
 * LibreOffice spells a deleted reference `[#REF!]`; writing it bare made the saved
 * .xls hold `=#N/A` instead of Excel's `#REF!` (legacy06.xls, 9 cells, 29/9/2026).
 */

import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";

export async function runSheetFormulaOdfTests() {
  const adapter = new SheetAdapter(null);
  const results = [];
  const check = (name, actual, expected) => results.push({ name, pass: actual === expected, error: `got ${actual}` });

  check("#REF! ghi ra ODF có ngoặc vuông", adapter._formulaToOdf("=#REF!-(#REF!*#REF!)"), "of:=[#REF!]-([#REF!]*[#REF!])");
  check("#REF! khứ hồi ODF → Excel giữ nguyên", adapter._formulaFromOdf(adapter._formulaToOdf("=#REF!-(#REF!*#REF!)")), "=#REF!-(#REF!*#REF!)");
  check("#REF! lẫn tham chiếu thường", adapter._formulaToOdf("=SUM(A1:B2)+#REF!"), "of:=SUM([.A1:.B2])+[#REF!]");
  check("Chuỗi \"#REF!\" trong ngoặc kép giữ nguyên", adapter._formulaToOdf("=IF(A1=\"#REF!\",1,2)"), "of:=IF([.A1]=\"#REF!\";1;2)");
  // legacy09.xls: a sheet name containing the argument separator lost its comma on save.
  check("Tên sheet có dấu phẩy giữ nguyên khi ghi ODF",
    adapter._formulaToOdf("=SUM('Mạng, camera'!G8:G11)"), "of:=SUM([$'Mạng, camera'.G8:$'Mạng, camera'.G11])");
  check("Tên sheet có dấu phẩy khứ hồi ODF → Excel",
    adapter._formulaFromOdf("of:=SUM([$'Mạng, camera'.G8:.G11];1)"), "=SUM('Mạng, camera'!G8:G11,1)");
  // Sheet names with doubled apostrophe (escaped quote) — Excel writes 'O''Brien'!A1
  check("Tên sheet có dấu nháy kép (escaped) đơn lẻ ô — _formulaToOdf",
    adapter._formulaToOdf("='O''Brien'!A1"), "of:=[$'O''Brien'.A1]");
  check("Tên sheet có dấu nháy kép (escaped) vùng ô — _formulaToOdf",
    adapter._formulaToOdf("='O''Brien'!A1:B2"), "of:=[$'O''Brien'.A1:$'O''Brien'.B2]");
  check("Tên sheet có dấu nháy kép (escaped) toàn cột — _formulaToOdf",
    adapter._formulaToOdf("=SUM('O''Brien'!\$A:\$C)"), "of:=SUM([$'O''Brien'.$A\$1:$'O''Brien'.$C\$1048576])");
  check("Tên sheet có dấu nháy kép (escaped) khứ hồi đơn lẻ ô",
    adapter._formulaFromOdf(adapter._formulaToOdf("='O''Brien'!A1")), "='O''Brien'!A1");
  check("Tên sheet có dấu nháy kép (escaped) khứ hồi vùng ô",
    adapter._formulaFromOdf(adapter._formulaToOdf("='O''Brien'!A1:B2")), "='O''Brien'!A1:B2");
  check("Tên sheet có dấu nháy kép (escaped) khứ hồi toàn cột",
    adapter._formulaFromOdf(adapter._formulaToOdf("=SUM('O''Brien'!\$A:\$C)")), "=SUM('O''Brien'!\$A:\$C)");
  // Sheet name with apostrophe AND comma
  check("Tên sheet có dấu nháy kép VÀ dấu phẩy — _formulaToOdf",
    adapter._formulaToOdf("=SUM('Mạng, O''Brien'!G8:G11,1)"), "of:=SUM([$'Mạng, O''Brien'.G8:$'Mạng, O''Brien'.G11];1)");
  check("Tên sheet có dấu nháy kép VÀ dấu phẩy — khứ hồi",
    adapter._formulaFromOdf("of:=SUM([$'Mạng, O''Brien'.G8:.G11];1)"), "=SUM('Mạng, O''Brien'!G8:G11,1)");

  // Cross-sheet / mixed ranges regression fixes
  check("Cross-sheet range [.A1:$Other.B2] -> A1:Other!B2",
    adapter._formulaFromOdf("of:=[.A1:$Other.B2]"), "=A1:Other!B2");
  check("Same-sheet range [$S.A1:.B2] -> S!A1:B2",
    adapter._formulaFromOdf("of:=[$S.A1:.B2]"), "=S!A1:B2");
  check("Same-sheet range [$S.A1:$S.B2] -> S!A1:B2",
    adapter._formulaFromOdf("of:=[$S.A1:$S.B2]"), "=S!A1:B2");
  check("#REF! trong SUM khứ hồi",
    adapter._formulaFromOdf("of:=SUM([#REF!];1)"), "=SUM(#REF!,1)");
  check("Toàn cột khác sheet giữ tên sheet đầu",
    adapter._formulaFromOdf("of:=SUM([$S1.$A$1:$S2.$C$1048576])"), "=SUM(S1!$A:$C)");

  return results;
}
