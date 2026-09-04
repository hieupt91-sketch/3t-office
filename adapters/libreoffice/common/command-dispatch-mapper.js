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
  "common.edit.pastePlain": ".uno:PasteUnformatted",
  "common.edit.formatPainter": ".uno:FormatPainter",
  "common.edit.selectAll": ".uno:SelectAll",
  "common.edit.find": ".uno:SearchDialog",
  "common.edit.replace": ".uno:SearchDialog",
  "common.edit.hyperlink": ".uno:HyperlinkDialog",

  // Common / View
  "common.view.ribbonToggle": ".uno:ToggleRibbon",
  "common.view.zoomIn": ".uno:ZoomPlus",
  "common.view.zoomOut": ".uno:ZoomMinus",
  "common.view.zoomReset": ".uno:Zoom100Percent",
  "common.view.fullScreen": ".uno:FullScreen",

  // Writer / Text Formatting
  "writer.text.bold": ".uno:Bold",
  "writer.text.italic": ".uno:Italic",
  "writer.text.underline": ".uno:Underline",
  "writer.text.strike": ".uno:Strikeout",
  "writer.font.grow": ".uno:Grow",
  "writer.font.shrink": ".uno:Shrink",
  "writer.text.subscript": ".uno:SubScript",
  "writer.text.superscript": ".uno:SuperScript",
  "writer.text.clearFormat": ".uno:ResetAttributes",
  "writer.font.family": ".uno:FontName",
  "writer.font.size": ".uno:FontHeight",
  "writer.style.apply": ".uno:StyleApply",
  "writer.style.gallery": ".uno:DesignerDialog",
  "writer.color.text": ".uno:Color",
  "writer.color.highlight": ".uno:CharBackground",

  // Writer / Paragraph
  "writer.para.alignLeft": ".uno:LeftPara",
  "writer.para.alignCenter": ".uno:CenterPara",
  "writer.para.alignRight": ".uno:RightPara",
  "writer.para.justify": ".uno:JustifyPara",
  "writer.para.spacing1": ".uno:SpacePara1",
  "writer.para.spacing15": ".uno:SpacePara15",
  "writer.para.spacing2": ".uno:SpacePara2",
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

  // Writer / Review
  "writer.comment.insert": ".uno:InsertAnnotation",
  "writer.trackChanges.toggle": ".uno:TrackChanges",
  "writer.trackChanges.acceptAll": ".uno:AcceptAllTrackedChanges",
  "writer.trackChanges.rejectAll": ".uno:RejectAllTrackedChanges",

  // Writer / Page Setup & Print
  "writer.page.margins": ".uno:PageDialog",
  "writer.page.orientation": ".uno:PageDialog",
  "writer.page.size": ".uno:PageDialog",
  "writer.page.watermark": ".uno:Watermark",
  "writer.page.border": ".uno:BorderDialog",
  "writer.file.printPreview": ".uno:PrintPreview",

  // Writer / References
  "writer.reference.tocInsert": ".uno:InsertMultiIndex",
  "writer.reference.tocUpdate": ".uno:UpdateCurIndex",
  "writer.reference.footnoteInsert": ".uno:InsertFootnote",
  "writer.reference.endnoteInsert": ".uno:InsertEndnote",

  // Writer / Mail Merge
  "writer.mailMerge.open": ".uno:MailMergeWizard",
  "writer.mailMerge.insertField": ".uno:InsertField",
  "writer.mailMerge.preview": ".uno:MailMergePreview",
  "writer.mailMerge.prevRecord": ".uno:MailMergePrev",
  "writer.mailMerge.nextRecord": ".uno:MailMergeNext",
  "writer.mailMerge.finish": ".uno:MailMergeFinish",

  // Sheet / Calc
  "sheet.cell.edit": ".uno:SetInputMode",
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
  "sheet.format.standard": ".uno:NumberFormatStandard",
  "sheet.insert.date": ".uno:InsertCurrentDate",
  "sheet.formula.sum": ".uno:AutoSum",
  "sheet.formula.average": ".uno:AutoSum",
  "sheet.formula.nameManager": ".uno:DefineName",
  "sheet.data.sortAsc": ".uno:Sortup",
  "sheet.data.sortDesc": ".uno:Sortdown",
  "sheet.data.filter": ".uno:DataFilterAutoFilter",
  "sheet.view.freezePanes": ".uno:FreezePanes",
  "sheet.row.insert": ".uno:InsertRowsBefore",
  "sheet.col.insert": ".uno:InsertColumnsBefore",
  "sheet.chart.insert": ".uno:InsertObjectChart",

  // Slides / Impress
  "slides.slide.new": ".uno:InsertPage",
  "slides.slide.duplicate": ".uno:DuplicatePage",
  "slides.slide.delete": ".uno:DeletePage",
  "slides.layout.apply": ".uno:AssignLayout",
  "slides.layout.select": ".uno:AssignLayout",
  "slides.text.insert": ".uno:Text",
  "slides.shape.insert": ".uno:BasicShapes",
  "slides.image.insert": ".uno:InsertGraphic",
  "slides.master.apply": ".uno:MasterLayouts",
  "slides.transition.apply": ".uno:SlideTransition",
  "slides.animation.apply": ".uno:CustomAnimation",
  "slides.notes.toggle": ".uno:InsertAnnotation",
  "slides.view.slideSorter": ".uno:DiaMode",
  "slides.show.startFromBegin": ".uno:StartPresentation",
  "slides.show.startFromCurrent": ".uno:StartPresentation",
  "slides.show.presenterMode": ".uno:PresenterConsole",

  // AI
  // ai.assistant.grammarCheck CỐ Ý không có ở đây: nó có handler thật gắn qua
  // bindHandler() trong platform/shell/app-shell.js. Trước đây có mặt ở đây
  // TRÙNG với bind thủ công đó — vô hại hiện tại (thứ tự init khiến bản thật
  // luôn thắng) nhưng là bẫy dễ vỡ nếu thứ tự bootstrap đổi. Xem audit finding.
};

export function getUnoCommand(vnCommandId) {
  return VN_TO_UNO_MAP[vnCommandId] || null;
}
export const mapVnCommandToUno = getUnoCommand;

const REVERSE_MAP = new Map();
for (const [vnId, unoCmd] of Object.entries(VN_TO_UNO_MAP)) {
  REVERSE_MAP.set(unoCmd.toLowerCase(), vnId);
}

export function getVnCommand(unoUrl) {
  const normalized = unoUrl.toLowerCase().trim();
  return REVERSE_MAP.get(normalized) || null;
}
