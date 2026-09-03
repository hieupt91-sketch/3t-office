/**
 * Test Suite: Adapter UNO Mapping & Microsoft Shortcut Parity Verification
 */

import { mapVnCommandToUno, VN_TO_UNO_MAP } from "../../adapters/libreoffice/common/command-dispatch-mapper.js";

export async function runAdapterMappingTests() {
  const results = [];

  const requiredCommands = [
    // Writer / Microsoft Parity
    { vn: "writer.text.bold", expectedUno: ".uno:Bold" },
    { vn: "writer.text.italic", expectedUno: ".uno:Italic" },
    { vn: "writer.font.grow", expectedUno: ".uno:Grow" },
    { vn: "writer.font.shrink", expectedUno: ".uno:Shrink" },
    { vn: "writer.text.subscript", expectedUno: ".uno:SubScript" },
    { vn: "writer.text.superscript", expectedUno: ".uno:SuperScript" },
    { vn: "writer.para.spacing1", expectedUno: ".uno:SpacePara1" },
    { vn: "writer.table.insert", expectedUno: ".uno:InsertTable" },
    { vn: "common.file.save", expectedUno: ".uno:Save" },
    { vn: "common.file.exportPdf", expectedUno: ".uno:ExportDirectToPDF" },
    { vn: "common.edit.pastePlain", expectedUno: ".uno:PasteUnformatted" },
    
    // Sheet / Microsoft Parity
    { vn: "sheet.cell.edit", expectedUno: ".uno:SetInputMode" },
    { vn: "sheet.cell.merge", expectedUno: ".uno:ToggleMergeCells" },
    { vn: "sheet.formula.sum", expectedUno: ".uno:AutoSum" },
    { vn: "sheet.format.currencyVND", expectedUno: ".uno:NumberFormatCurrency" },
    { vn: "sheet.insert.date", expectedUno: ".uno:InsertCurrentDate" },

    // Slides / Microsoft Parity
    { vn: "slides.slide.new", expectedUno: ".uno:InsertPage" },
    { vn: "slides.slide.duplicate", expectedUno: ".uno:DuplicatePage" },
    { vn: "slides.show.startFromBegin", expectedUno: ".uno:StartPresentation" }
  ];

  for (const check of requiredCommands) {
    const uno = mapVnCommandToUno(check.vn);
    if (uno === check.expectedUno) {
      results.push({ name: `Mapping: ${check.vn} -> ${check.expectedUno}`, pass: true });
    } else {
      results.push({ name: `Mapping: ${check.vn} thất bại (nhận được: ${uno})`, pass: false });
    }
  }

  return results;
}
