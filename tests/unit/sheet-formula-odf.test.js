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
  return results;
}
