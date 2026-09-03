/**
 * Test Suite: Adapter UNO Mapping Verification
 */

import { mapVnCommandToUno, VN_TO_UNO_MAP } from "../../adapters/libreoffice/common/command-dispatch-mapper.js";

export async function runAdapterMappingTests() {
  const results = [];

  const requiredCommands = [
    // Writer
    { vn: "writer.text.bold", expectedUno: ".uno:Bold" },
    { vn: "writer.text.italic", expectedUno: ".uno:Italic" },
    { vn: "writer.table.insert", expectedUno: ".uno:InsertTable" },
    { vn: "common.file.save", expectedUno: ".uno:Save" },
    { vn: "common.file.exportPdf", expectedUno: ".uno:ExportDirectToPDF" },
    
    // Sheet
    { vn: "sheet.cell.merge", expectedUno: ".uno:ToggleMergeCells" },
    { vn: "sheet.formula.sum", expectedUno: ".uno:AutoSum" },
    { vn: "sheet.format.currencyVND", expectedUno: ".uno:NumberFormatCurrency" },

    // Slides
    { vn: "slides.slide.new", expectedUno: ".uno:InsertPage" },
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
