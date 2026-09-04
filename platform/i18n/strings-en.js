/**
 * VN Office Platform — English Strings Catalog (ESM)
 * Mirror của strings-vi.js — mọi key ở đây PHẢI có key tương ứng bên strings-vi.js.
 */

export const enStrings = {
  app: {
    suiteName: "VN Office",
    writer: "VN Writer (Word Processor)",
    sheet: "VN Sheet (Spreadsheet)",
    slides: "VN Slides (Presentation)"
  },
  common: {
    save: "Save document",
    undo: "Undo",
    redo: "Redo",
    print: "Print document",
    exportPdf: "Export PDF",
    ready: "Ready",
    ok: "OK",
    cancel: "Cancel",
    close: "Close",
    fileMenu: "File",
    switchLanguage: "Language"
  },
  backstage: {
    home: "Home",
    new: "New (Ctrl+N)",
    open: "Open (Ctrl+O)",
    save: "Save (Ctrl+S)",
    saveAs: "Save As (F12)",
    print: "Print (Ctrl+P)",
    exportPdf: "Export PDF",
    about: "About VN Office",
    templateTitle: "Standard Vietnamese Document Templates",
    templateSubtitle: "Quickly start a new document from an administrative or business template",
    recentTitle: "Recent Documents",
    recentColName: "DOCUMENT NAME",
    recentColFormat: "LOCATION / FORMAT",
    clearRecent: "Clear History",
    emptyRecentTitle: "No Recent Documents",
    emptyRecentDesc: "Documents you create or edit will appear here for quick access."
  },
  dialog: {
    notice: "Notice",
    confirm: "Confirm",
    input: "Enter Data",
    findReplace: "Find and Replace"
  },
  sheetRibbon: {
    tab: { home: "Home", formulas: "Formulas", data: "Data", insert: "Insert", pageLayout: "Page Layout", review: "Review", view: "View", ai: "VN AI Assistant" },
    group: { clipboard: "Clipboard", font: "Font", alignment: "Alignment", number: "Number", quickAnalysis: "Editing & Data", functionLibrary: "Function Library", definedNames: "Defined Names", sortFilter: "Sort & Filter", dataTools: "Data Tools", pivotTable: "PivotTable", cells: "Cells", charts: "Charts", printArea: "Print Area", pageBreaks: "Page Breaks", comments: "Comments", show: "Show", zoom: "Zoom", window: "Window", aiAnalysis: "AI Data Analysis" }
  },
  slidesRibbon: {
    tab: { home: "Home", insert: "Insert", design: "Design", transitions: "Transitions", animations: "Animations", slideshow: "Slide Show", review: "Review", view: "View", ai: "VN AI Assistant" },
    group: { slides: "Slides", clipboard: "Clipboard", drawing: "Drawing", imagesObjects: "Images & Objects", media: "Media", master: "Slide Master", transitions: "Transition to This Slide", animations: "Animation", startSlideshow: "Start Slide Show", presenter: "Presenter Tools", comments: "Comments", presentationViews: "Presentation Views", aiContent: "AI Presentation Content" }
  },
  sheetDialogs: {
    close: "Close", cancel: "Cancel", cancelLong: "Cancel", apply: "Apply", range: "Range", value: "Value",
    functionTitle: "Insert Function", functionCategory: "Function category:", allCategory: "All", allFunctions: "All functions", mathFunctions: "Math & Trig", statsFunctions: "Statistical (AVERAGE, COUNT...)", logicFunctions: "Logical (IF, AND, OR...)", textFunctions: "Text (CONCAT, LEN...)", dateFunctions: "Date & Time (TODAY, NOW...)", insertFunction: "Insert Function",
    newComment: "New Comment {coord}", editComment: "Edit Comment {coord}", commentContent: "Comment", commentPlaceholder: "Enter a comment for {coord}", author: "Author", defaultAuthor: "VN Office User", saveChanges: "Save Changes", addComment: "Add Comment", deleteComment: "Delete Comment", emptyComment: "Comment text cannot be empty.",
    conditionalFormatting: "Conditional Formatting", rule: "Rule", greaterThan: "Greater Than", lessThan: "Less Than", blankCell: "Blanks", fillColor: "Fill Color", invalidNumber: "Enter a valid number.",
    dataValidation: "Data Validation", allow: "Allow", list: "List", numberRange: "Whole number range", listValues: "Source values (comma-separated)", listPlaceholder: "Approved, Rejected, In progress", minimum: "Minimum", maximum: "Maximum", invalidValidation: "The data validation settings are not valid.",
    pivotTitle: "Create PivotTable", pivotSource: "Table/Range (first row contains headers)", loadFields: "Load Fields", chooseFields: "Choose fields for each area:", aggregateFor: "Summarize values by for {field}", sourceRangeFormat: "The source range must use a format such as A1:D20.", sourceNeedsHeaders: "The first row of the source range must contain headers.", uniqueHeaders: "Each source column must have a unique header.", selectValue: "Select at least one Values field.", columnNotFound: "Column {field} was not found.", sourceSheetNotFound: "The source worksheet was not found.",
    chartDefaultTitle: "Data Chart", chartUnsupported: "Unsupported chart type: {type}", chartItem: "Item {number}", chartNoNumericData: "The selected range contains no numeric data", chartPiePositive: "A pie chart requires positive values", chartInsertFrom: "Insert Chart from {range}", selectedRange: "selected range", chartType: "Chart Type", chartColumn: "Column", chartLine: "Line", chartPie: "Pie", chartArea: "Area", insertIntoSheet: "Insert into Worksheet"
  },
  slidesDialogs: {
    close: "Close", cancel: "Cancel", apply: "Apply", preview: "Preview", delete: "Delete",
    masterTitle: "Slide Master", layoutTitle: "Choose a Slide Layout", transitionTitle: "Transitions", animationTitle: "Object Animations",
    applyMaster: "Apply Theme", applyLayout: "Apply Layout", applyTransition: "Apply Transition", applyAnimation: "Apply Animation", removeTransition: "Remove Transition", removeAnimation: "Remove Animation", previewTransition: "▶ Preview Transition", previewAnimation: "▶ Preview Animation", previewObject: "Preview Object",
    animationTarget: "Apply to:", animationType: "Entrance animation:", animationDuration: "Duration:", animationDelay: "Delay:", noAnimation: "None", immediate: "Immediately (0s)",
    commentsLabel: "Slide Comments", newComment: "New Comment", commentPlaceholder: "Enter a comment...", addComment: "Add Comment", rehearsalConfirm: "Total slide show time: {time}.\nSave the rehearsal timings for each slide?"
  },
  commands: {
    "common.file.new": { label: "New", tooltip: "Create a new document (Ctrl+N)" },
    "common.file.open": { label: "Open", tooltip: "Open an existing document (Ctrl+O)" },
    "common.file.save": { label: "Save", tooltip: "Save the current document (Ctrl+S)" },
    "common.file.saveAs": { label: "Save As", tooltip: "Save the document under a new name (F12)" },
    "common.file.exportPdf": { label: "Export PDF", tooltip: "Export content to standard PDF format" },
    "common.file.print": { label: "Print", tooltip: "Print the document (Ctrl+P)" },
    "common.file.close": { label: "Close", tooltip: "Close the document (Ctrl+W)" },
    "common.edit.undo": { label: "Undo", tooltip: "Undo the last action (Ctrl+Z)" },
    "common.edit.redo": { label: "Redo", tooltip: "Redo the last undone action (Ctrl+Y)" },
    "common.edit.cut": { label: "Cut", tooltip: "Cut selection to clipboard (Ctrl+X)" },
    "common.edit.copy": { label: "Copy", tooltip: "Copy selection (Ctrl+C)" },
    "common.edit.paste": { label: "Paste", tooltip: "Paste from clipboard (Ctrl+V)" },
    "common.edit.pastePlain": { label: "Paste Plain Text", tooltip: "Paste without formatting (Ctrl+Shift+V)" },
    "common.edit.formatPainter": { label: "Format Painter", tooltip: "Copy formatting (Ctrl+Shift+C)" },
    "common.edit.selectAll": { label: "Select All", tooltip: "Select all content (Ctrl+A)" },
    "common.edit.find": { label: "Find", tooltip: "Find text (Ctrl+F)" },
    "common.edit.replace": { label: "Replace", tooltip: "Find and replace text (Ctrl+H)" },
    "common.edit.hyperlink": { label: "Insert Link", tooltip: "Insert a hyperlink (Ctrl+K)" },
    "common.view.ribbonToggle": { label: "Collapse Ribbon", tooltip: "Collapse or expand the ribbon (Ctrl+F1)" },
    "common.view.zoomIn": { label: "Zoom In", tooltip: "Increase zoom level (Ctrl++)" },
    "common.view.zoomOut": { label: "Zoom Out", tooltip: "Decrease zoom level (Ctrl+-)" },
    "common.view.fullScreen": { label: "Full Screen", tooltip: "Toggle full screen mode (F11)" },
    "ai.assistant.toggle": { label: "VN AI Assistant", tooltip: "Open the VN AI assistant panel (Alt+J)" },
    "ai.assistant.summarize": { label: "Quick Summary", tooltip: "Summarize the selected content with AI" },
    "ai.assistant.rewrite": { label: "Polish Writing", tooltip: "Rewrite text in polished Vietnamese style" },
    "ai.assistant.grammarCheck": { label: "Spell Check", tooltip: "Check Vietnamese spelling and grammar (F7)" }
    ,"sheet.cell.edit": { label: "Edit Cell", tooltip: "Edit the active cell (F2)" }
    ,"sheet.cell.bold": { label: "Bold", tooltip: "Apply bold formatting (Ctrl+B)" }
    ,"sheet.cell.italic": { label: "Italic", tooltip: "Apply italic formatting (Ctrl+I)" }
    ,"sheet.cell.underline": { label: "Underline", tooltip: "Apply underline formatting (Ctrl+U)" }
    ,"sheet.cell.alignLeft": { label: "Align Left", tooltip: "Align cell contents to the left" }
    ,"sheet.cell.alignCenter": { label: "Center", tooltip: "Center cell contents" }
    ,"sheet.cell.alignRight": { label: "Align Right", tooltip: "Align cell contents to the right" }
    ,"sheet.cell.merge": { label: "Merge & Center", tooltip: "Merge the selected cells and center the contents" }
    ,"sheet.cell.borders": { label: "Borders", tooltip: "Apply borders to the selected cells" }
    ,"sheet.cell.fillColor": { label: "Fill Color", tooltip: "Change the background color of selected cells" }
    ,"sheet.cell.textColor": { label: "Font Color", tooltip: "Change the text color in selected cells" }
    ,"sheet.format.currencyVND": { label: "VND Currency", tooltip: "Apply VND currency format (Ctrl+Shift+4 or Ctrl+Shift+$)" }
    ,"sheet.format.percent": { label: "Percent Style", tooltip: "Apply percentage format (Ctrl+Shift+5)" }
    ,"sheet.format.standard": { label: "Comma Style", tooltip: "Apply number format with thousands separators (Ctrl+Shift+1)" }
    ,"sheet.insert.date": { label: "Current Date", tooltip: "Insert the current date (Ctrl+;)" }
    ,"sheet.formula.sum": { label: "AutoSum", tooltip: "Insert an AutoSum formula (Alt+=)" }
    ,"sheet.formula.average": { label: "Average", tooltip: "Insert an AVERAGE formula" }
    ,"sheet.formula.nameManager": { label: "Name Manager", tooltip: "Create, edit, and delete defined names" }
    ,"sheet.data.sortAsc": { label: "Sort A to Z", tooltip: "Sort data in ascending order" }
    ,"sheet.data.sortDesc": { label: "Sort Z to A", tooltip: "Sort data in descending order" }
    ,"sheet.data.filter": { label: "Filter", tooltip: "Turn AutoFilter on or off (Ctrl+Shift+L)" }
    ,"sheet.format.conditional": { label: "Conditional Formatting", tooltip: "Highlight cells based on values or blank status" }
    ,"sheet.data.validation": { label: "Data Validation", tooltip: "Create a drop-down list or restrict values to a number range" }
    ,"sheet.data.pivotTable": { label: "PivotTable", tooltip: "Create a PivotTable from the selected data range" }
    ,"sheet.data.pivotRefresh": { label: "Refresh PivotTable", tooltip: "Refresh the PivotTable from its source data" }
    ,"sheet.view.freezePanes": { label: "Freeze Panes", tooltip: "Keep row 1 and column A visible while scrolling" }
    ,"sheet.view.zoomIn": { label: "Zoom In", tooltip: "Increase the worksheet zoom level" }
    ,"sheet.view.zoomOut": { label: "Zoom Out", tooltip: "Decrease the worksheet zoom level" }
    ,"sheet.view.zoomReset": { label: "100%", tooltip: "Reset the worksheet zoom level to 100%" }
    ,"sheet.view.gridlines": { label: "Gridlines", tooltip: "Show or hide worksheet gridlines" }
    ,"sheet.view.headings": { label: "Headings", tooltip: "Show or hide row and column headings" }
    ,"sheet.review.commentInsert": { label: "New Comment", tooltip: "Add, edit, or delete a comment on the active cell" }
    ,"sheet.page.setPrintArea": { label: "Set Print Area", tooltip: "Set the selected range as the print area" }
    ,"sheet.page.clearPrintArea": { label: "Clear Print Area", tooltip: "Clear the current worksheet's print area" }
    ,"sheet.page.insertPageBreak": { label: "Insert Page Break", tooltip: "Insert row and column page breaks at the active cell" }
    ,"sheet.page.removePageBreak": { label: "Remove Page Break", tooltip: "Remove row and column page breaks at the active cell" }
    ,"sheet.row.insert": { label: "Insert Row", tooltip: "Insert a new row (Ctrl+Shift+=)" }
    ,"sheet.col.insert": { label: "Insert Column", tooltip: "Insert a new column" }
    ,"sheet.chart.insert": { label: "Chart", tooltip: "Insert a chart to visualize data" }
    ,"slides.review.commentInsert": { label: "New Comment", tooltip: "Add a comment to the current slide" }
    ,"slides.slide.new": { label: "New Slide", tooltip: "Insert a new slide (Ctrl+M)" }
    ,"slides.layout.apply": { label: "Layout", tooltip: "Change the slide layout (Title, Content, Two Content, Blank)" }
    ,"slides.layout.select": { label: "Choose Layout", tooltip: "Open the slide layout gallery" }
    ,"slides.slide.duplicate": { label: "Duplicate Slide", tooltip: "Duplicate the selected slide (Ctrl+D)" }
    ,"slides.slide.delete": { label: "Delete Slide", tooltip: "Delete the selected slide (Delete)" }
    ,"slides.text.insert": { label: "Text Box", tooltip: "Insert a text box" }
    ,"slides.shape.insert": { label: "Shapes", tooltip: "Insert a rectangle, oval, or arrow" }
    ,"slides.image.insert": { label: "Pictures", tooltip: "Insert a picture from this device" }
    ,"slides.media.insertVideo": { label: "Video", tooltip: "Insert a video from this device" }
    ,"slides.media.insertAudio": { label: "Audio", tooltip: "Insert audio from this device" }
    ,"slides.master.apply": { label: "Slide Master", tooltip: "Apply a Slide Master theme across the presentation" }
    ,"slides.transition.apply": { label: "Transitions", tooltip: "Apply a slide transition (Fade, Push, Zoom, Flip)" }
    ,"slides.animation.apply": { label: "Animations", tooltip: "Apply an entrance animation to an object" }
    ,"slides.notes.toggle": { label: "Speaker Notes", tooltip: "Show or hide the speaker notes pane" }
    ,"slides.view.slideSorter": { label: "Slide Sorter", tooltip: "View all slides in a grid and drag to reorder them" }
    ,"slides.show.startFromBegin": { label: "From Beginning", tooltip: "Start the slide show from the first slide (F5)" }
    ,"slides.show.startFromCurrent": { label: "From Current Slide", tooltip: "Start the slide show from the current slide (Shift+F5)" }
    ,"slides.show.presenterMode": { label: "Presenter View", tooltip: "Start Presenter View with notes and a timer (Alt+F5)" }
    ,"slides.show.rehearseTimings": { label: "Rehearse Timings", tooltip: "Practice the slide show and record the time spent on each slide" }
  }
};
