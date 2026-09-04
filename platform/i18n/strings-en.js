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

    ,// VN Writer Commands
    "writer.text.bold": { label: "Bold", tooltip: "Bold (Ctrl+B)" },
    "writer.text.italic": { label: "Italic", tooltip: "Italic (Ctrl+I)" },
    "writer.text.underline": { label: "Underline", tooltip: "Underline (Ctrl+U)" },
    "writer.text.strike": { label: "Strikethrough", tooltip: "Strikethrough" },
    "writer.font.grow": { label: "Increase Font Size", tooltip: "Increase font size (Ctrl+Shift+>)" },
    "writer.font.shrink": { label: "Decrease Font Size", tooltip: "Decrease font size (Ctrl+Shift+<)" },
    "writer.text.subscript": { label: "Subscript", tooltip: "Subscript X₂ (Ctrl+=)" },
    "writer.text.superscript": { label: "Superscript", tooltip: "Superscript X² (Ctrl+Shift++)" },
    "writer.text.clearFormat": { label: "Clear All Formatting", tooltip: "Clear all formatting (Ctrl+Space)" },
    "writer.font.family": { label: "Font", tooltip: "Select font family" },
    "writer.font.size": { label: "Font Size", tooltip: "Select font size" },
    "writer.style.apply": { label: "Styles", tooltip: "Apply paragraph style (Normal, Heading 1, 2, 3, Quote, Emphasis)" },
    "writer.style.gallery": { label: "Styles Gallery", tooltip: "Open visual styles gallery" },
    "writer.color.text": { label: "Font Color", tooltip: "Change font color" },
    "writer.color.highlight": { label: "Text Highlight Color", tooltip: "Highlight text" },
    "writer.para.alignLeft": { label: "Align Left", tooltip: "Align text left (Ctrl+L)" },
    "writer.para.alignCenter": { label: "Center", tooltip: "Center text (Ctrl+E)" },
    "writer.para.alignRight": { label: "Align Right", tooltip: "Align text right (Ctrl+R)" },
    "writer.para.justify": { label: "Justify", tooltip: "Justify text (Ctrl+J)" },
    "writer.para.spacing1": { label: "Line Spacing 1.0", tooltip: "Single line spacing (Ctrl+1)" },
    "writer.para.spacing15": { label: "Line Spacing 1.5", tooltip: "1.5 line spacing (Ctrl+5)" },
    "writer.para.spacing2": { label: "Line Spacing 2.0", tooltip: "Double line spacing (Ctrl+2)" },
    "writer.list.bullet": { label: "Bullets", tooltip: "Create a bulleted list" },
    "writer.list.numbered": { label: "Numbering", tooltip: "Create a numbered list" },
    "writer.para.indentInc": { label: "Increase Indent", tooltip: "Increase indent (Ctrl+M)" },
    "writer.para.indentDec": { label: "Decrease Indent", tooltip: "Decrease indent (Ctrl+Shift+M)" },
    "writer.table.insert": { label: "Table", tooltip: "Insert a table into document" },
    "writer.image.insert": { label: "Pictures", tooltip: "Insert pictures from your computer" },
    "writer.page.break": { label: "Page Break", tooltip: "Insert a page break (Ctrl+Enter)" },
    "writer.header.insert": { label: "Header", tooltip: "Insert header" },
    "writer.footer.insert": { label: "Footer", tooltip: "Insert footer" },
    "writer.comment.insert": { label: "New Comment", tooltip: "Add a comment to the selected text (Ctrl+Alt+M)" },
    "writer.trackChanges.toggle": { label: "Track Changes", tooltip: "Track changes in the document (Ctrl+Shift+E)" },
    "writer.trackChanges.acceptAll": { label: "Accept All Changes", tooltip: "Accept all changes in document" },
    "writer.trackChanges.rejectAll": { label: "Reject All Changes", tooltip: "Reject all changes in document" },
    "writer.page.margins": { label: "Margins", tooltip: "Adjust document margins" },
    "writer.page.orientation": { label: "Orientation", tooltip: "Switch page orientation between portrait and landscape" },
    "writer.page.size": { label: "Size", tooltip: "Choose page size (A4, Letter, etc.)" },
    "writer.page.columns": { label: "Columns", tooltip: "Split text into two or more columns" },
    "writer.page.columns1": { label: "One Column", tooltip: "Format text into one column" },
    "writer.page.columns2": { label: "Two Columns", tooltip: "Split text into two columns" },
    "writer.page.columns3": { label: "Three Columns", tooltip: "Split text into three columns" },
    "writer.page.watermark": { label: "Watermark", tooltip: "Add or remove a background watermark" },
    "writer.page.border": { label: "Page Borders", tooltip: "Add or change border around the page" },
    "writer.file.printPreview": { label: "Print Preview", tooltip: "Preview document before printing (Ctrl+F2)" },
    "writer.reference.tocInsert": { label: "Table of Contents", tooltip: "Insert a table of contents" },
    "writer.reference.tocUpdate": { label: "Update Table", tooltip: "Update the table of contents" },
    "writer.reference.footnoteInsert": { label: "Insert Footnote", tooltip: "Add a note at the bottom of the page (Ctrl+Alt+F)" },
    "writer.reference.endnoteInsert": { label: "Insert Endnote", tooltip: "Add a note at the end of the document (Ctrl+Alt+D)" },
    "writer.mailMerge.open": { label: "Select Recipients", tooltip: "Set up mail merge data source (CSV)" },
    "writer.mailMerge.insertField": { label: "Insert Merge Field", tooltip: "Insert a mail merge field" },
    "writer.mailMerge.preview": { label: "Preview Results", tooltip: "Preview merged records" },
    "writer.mailMerge.prevRecord": { label: "Previous Record", tooltip: "Go to previous record" },
    "writer.mailMerge.nextRecord": { label: "Next Record", tooltip: "Go to next record" },
    "writer.mailMerge.finish": { label: "Finish & Merge", tooltip: "Complete merge and generate merged document" }
  },
  writerRibbon: {
    tab: {
      home: "Home",
      insert: "Insert",
      design: "Design",
      layout: "Layout",
      references: "References",
      mailings: "Mailings",
      review: "Review",
      ai: "VN AI Assistant"
    },
    group: {
      clipboard: "Clipboard",
      font: "Font",
      styles: "Styles",
      paragraph: "Paragraph",
      quickInsert: "Quick Insert",
      pages: "Pages",
      tablesIllustrations: "Tables & Illustrations",
      headerFooter: "Header & Footer",
      tocNotes: "Table of Contents & Notes",
      pageSetup: "Page Setup",
      pageBackground: "Page Background",
      print: "Print",
      tableOfContents: "Table of Contents",
      footnotes: "Footnotes",
      startMerge: "Start Mail Merge",
      writeInsert: "Write & Insert Fields",
      previewResults: "Preview Results",
      finishMerge: "Finish",
      proofread: "Proofing",
      comments: "Comments",
      tracking: "Tracking",
      aiFeatures: "Vietnamese AI Features"
    }
  },
  writerDialogs: {
    pageSetup: {
      title: "Page Setup",
      paperSize: "Paper Size",
      orientation: "Orientation",
      portrait: "Portrait",
      landscape: "Landscape",
      marginTop: "Top",
      marginBottom: "Bottom",
      marginLeft: "Left",
      marginRight: "Right",
      apply: "Apply",
      cancel: "Cancel",
      close: "Close"
    },
    columns: {
      title: "Columns",
      presetsTitle: "Presets:",
      presetOne: "One",
      presetTwo: "Two",
      presetThree: "Three",
      colCount: "Number of columns (1 – 4):",
      colGap: "Spacing between columns (mm):",
      colRule: "Line between columns",
      preview: "Preview",
      removeColumns: "Remove columns (1 column)",
      apply: "Apply",
      cancel: "Cancel"
    },
    watermark: {
      title: "Watermark",
      suggestionsTitle: "Text suggestions:",
      textLabel: "Watermark text:",
      placeholder: "Enter watermark text (e.g. DRAFT, CONFIDENTIAL)...",
      colorLabel: "Color:",
      angleLabel: "Layout:",
      angleDiagonal: "Diagonal (45°)",
      angleDiagonalNeg: "Diagonal (−45°)",
      angleHorizontal: "Horizontal (0°)",
      opacityLabel: "Transparency (Opacity):",
      removeWatermark: "Remove Watermark",
      apply: "Apply",
      cancel: "Cancel",
      suggestions: {
        draft: "DRAFT",
        secret: "CONFIDENTIAL",
        topSecret: "TOP SECRET",
        urgent: "URGENT",
        copy: "COPY"
      },
      colors: {
        red: "Light Red",
        gray: "Standard Gray",
        blue: "Blue",
        amber: "Amber"
      }
    },
    pageBorder: {
      title: "Page Border",
      styleLabel: "Style:",
      widthLabel: "Width:",
      colorLabel: "Color:",
      previewTitle: "Preview",
      sampleText: "Sample<br>document<br>text",
      removeBorder: "Remove Border",
      apply: "Apply",
      cancel: "Cancel",
      styles: {
        solid: "Solid",
        dashed: "Dashed",
        double: "Double",
        none: "None"
      },
      widths: {
        thin: "1 pt (Thin)",
        standard: "2 pt (Standard)",
        bold: "3 pt (Thick)",
        veryBold: "6 pt (Extra Thick)"
      },
      colors: {
        blueOffice: "VN Office Blue",
        charcoal: "Charcoal",
        gray: "Neutral Gray",
        adminRed: "Official Red",
        green: "Green"
      }
    },
    mailMerge: {
      dataSourceTitle: "Mail Merge — Data Source (CSV)",
      pastePrompt: "Paste spreadsheet data in <strong>CSV</strong> format below (first row as column headers):",
      pasteSampleBtn: "📋 Paste Sample Data",
      noData: "No data",
      invalidCsv: "Invalid CSV (missing column headers)",
      foundData: "Found: {count} columns | {records} records",
      saveDataSource: "Save Data Source",
      insertFieldTitle: "Insert Merge Field",
      selectFieldPrompt: "Select field to insert into document:",
      insertBtn: "Insert Field",
      noDataWarningTitle: "Mail Merge Preview",
      noDataWarningMsg: "No mail merge data source found. Please open 'Select Recipients' to paste CSV data first.",
      finishTitle: "Finish & Merge",
      finishNoData: "No mail merge data source to create documents. Please open 'Select Recipients' to paste CSV data.",
      finishNoFields: "Current document contains no merge fields. Use 'Insert Merge Field' to insert at least one field.",
      finishSuccess: "Successfully merged {count} records into document. You can preview or export the document."
    },
    printPreview: {
      title: "Print Preview",
      printBtn: "Print",
      printTooltip: "Print document (Ctrl+P)",
      prevPage: "◀ Previous",
      nextPage: "Next ▶",
      pagePrefix: "Page ",
      fitPage: "Fit Page",
      closeTooltip: "Close preview (Esc)",
      paperSize: "Size",
      margins: "Margins"
    },
    styleGallery: {
      title: "Styles Gallery",
      hint: "Click to apply style",
      normal: { label: "Normal", sublabel: "Normal text", desc: "Standard body text, 14pt justified (Decree 30/2020/ND-CP)" },
      h1: { label: "Heading 1", sublabel: "Heading 1", desc: "Heading 1: Uppercase, bold, centered, 16pt" },
      h2: { label: "Heading 2", sublabel: "Heading 2", desc: "Heading 2: Title case bold, 14pt" },
      h3: { label: "Heading 3", sublabel: "Heading 3", desc: "Heading 3: Bold italic, 13pt" },
      quote: { label: "Quote", sublabel: "Quote", desc: "Blockquote: Italic, 24pt indent, blue left border" },
      emphasis: { label: "Emphasis", sublabel: "Emphasis", desc: "Emphasis: Bold, italic, amber color" }
    },
    comments: {
      noSelectionTitle: "No Text Selected",
      noSelectionMsg: "Please select text in the document before adding a comment.",
      addCommentTitle: "New Comment",
      addCommentPlaceholder: "Type your comment here...",
      addCommentBtn: "Add Comment",
      panelLabel: "Document Comments",
      openCommentAria: "Open comment for: {text}",
      placeholderHeader: "Click to enter header...",
      placeholderFooter: "Click to enter footer..."
    },
    hyperlink: {
      title: "Insert Hyperlink",
      message: "Enter hyperlink URL:"
    }
  }
};
