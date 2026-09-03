/**
 * VN Office LibreOffice Adapter — Command & Dispatch Mapper
 * Ánh xạ chuẩn hóa giữa VN Command IDs và LibreOffice .uno: URLs
 * Tuân thủ chuẩn 01-architecture/COMMAND-ARCHITECTURE.md
 */

export const VN_TO_UNO_MAP = {
  // Common / File
  "common.file.new": ".uno:AddDirect",
  "common.file.open": ".uno:Open",
  "common.file.save": ".uno:Save",
  "common.file.saveAs": ".uno:SaveAs",
  "common.file.exportPdf": ".uno:ExportDirectToPDF",
  "common.file.print": ".uno:Print",
  "common.file.close": ".uno:CloseDoc",

  // Common / Edit
  "common.edit.undo": ".uno:Undo",
  "common.edit.redo": ".uno:Redo",
  "common.edit.cut": ".uno:Cut",
  "common.edit.copy": ".uno:Copy",
  "common.edit.paste": ".uno:Paste",
  "common.edit.selectAll": ".uno:SelectAll",
  "common.edit.find": ".uno:SearchDialog",
  "common.edit.replace": ".uno:SearchDialog",

  // Common / View
  "common.view.zoomIn": ".uno:ZoomPlus",
  "common.view.zoomOut": ".uno:ZoomMinus",
  "common.view.zoomReset": ".uno:Zoom100Percent",
  "common.view.fullScreen": ".uno:FullScreen",

  // Writer / Text Formatting
  "writer.text.bold": ".uno:Bold",
  "writer.text.italic": ".uno:Italic",
  "writer.text.underline": ".uno:Underline",
  "writer.text.strike": ".uno:Strikeout",
  "writer.text.clearFormat": ".uno:ResetAttributes",
  "writer.font.family": ".uno:FontName",
  "writer.font.size": ".uno:FontHeight",
  "writer.color.text": ".uno:Color",
  "writer.color.highlight": ".uno:CharBackground",

  // Writer / Paragraph
  "writer.para.alignLeft": ".uno:LeftPara",
  "writer.para.alignCenter": ".uno:CenterPara",
  "writer.para.alignRight": ".uno:RightPara",
  "writer.para.justify": ".uno:JustifyPara",
  "writer.para.lineSpacing": ".uno:LineSpacing",
  "writer.list.bullet": ".uno:DefaultBullet",
  "writer.list.numbered": ".uno:DefaultNumbering",
  "writer.para.indentInc": ".uno:IncrementIndent",
  "writer.para.indentDec": ".uno:DecrementIndent",

  // Writer / Insert
  "writer.table.insert": ".uno:InsertTable",
  "writer.image.insert": ".uno:InsertGraphic",
  "writer.page.break": ".uno:InsertPagebreak",
  "writer.header.insert": ".uno:InsertPageHeader",
  "writer.footer.insert": ".uno:InsertPageFooter",

  // Sheet / Calc
  "sheet.cell.bold": ".uno:Bold",
  "sheet.cell.italic": ".uno:Italic",
  "sheet.cell.underline": ".uno:Underline",
  "sheet.cell.alignLeft": ".uno:AlignLeft",
  "sheet.cell.alignCenter": ".uno:AlignCenter",
  "sheet.cell.alignRight": ".uno:AlignRight",
  "sheet.cell.merge": ".uno:ToggleMergeCells",
  "sheet.cell.wrapText": ".uno:WrapText",
  "sheet.cell.borders": ".uno:FormatCellBorders",
  "sheet.cell.fillColor": ".uno:BackgroundColor",
  "sheet.cell.textColor": ".uno:Color",
  "sheet.format.currencyVND": ".uno:NumberFormatCurrency",
  "sheet.format.percent": ".uno:NumberFormatPercent",
  "sheet.format.comma": ".uno:NumberFormatStandard",
  "sheet.formula.sum": ".uno:AutoSum",
  "sheet.data.sortAsc": ".uno:Sortup",
  "sheet.data.sortDesc": ".uno:Sortdown",
  "sheet.data.filter": ".uno:DataFilterAutoFilter",
  "sheet.row.insert": ".uno:InsertRowsBefore",
  "sheet.col.insert": ".uno:InsertColumnsBefore",
  "sheet.chart.insert": ".uno:InsertObjectChart",

  // Slides / Impress
  "slides.slide.new": ".uno:InsertPage",
  "slides.slide.duplicate": ".uno:DuplicatePage",
  "slides.slide.delete": ".uno:DeletePage",
  "slides.layout.apply": ".uno:AssignLayout",
  "slides.text.insert": ".uno:Text",
  "slides.shape.insert": ".uno:BasicShapes",
  "slides.image.insert": ".uno:InsertGraphic",
  "slides.show.startFromBegin": ".uno:StartPresentation",
  "slides.show.startFromCurrent": ".uno:StartPresentation"
};

/**
 * Lấy LibreOffice .uno: URL tương ứng với VN Command ID
 * @param {string} vnCommandId 
 * @returns {string|null}
 */
export function mapVnCommandToUno(vnCommandId) {
  return VN_TO_UNO_MAP[vnCommandId] || null;
}
