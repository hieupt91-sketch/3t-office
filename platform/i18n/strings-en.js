/**
 * 3T Office Platform — English Strings Catalog (ESM)
 * Mirror của strings-vi.js — mọi key ở đây PHẢI có key tương ứng bên strings-vi.js.
 */

export const enStrings = {
  app: {
    suiteName: "3T Office",
    writer: "3T Doc (Word Processor)",
    sheet: "3T Sheet (Spreadsheet)",
    slides: "3T Slide (Presentation)"
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
    switchLanguage: "Language",
    toggleTheme: "Dark / Light Mode",
    themeDark: "Dark Theme",
    themeLight: "Light Theme",
    notice: "Notice",
    confirm: "OK",
    featurePendingNotice: "This feature is being completed and will be available in the next update."
  },
  help: {
    panelTitle: "Help",
    searchPlaceholder: "Search a feature, e.g. Word Count",
    topicList: "Topic list",
    noResults: "No matching help topic.",
    pickTopic: "Select a feature in the list to read its guide.",
    location: "Location",
    stepsHeading: "How to use"
  },
  aiAssistant: {
    title: "3T AI Assistant", provider: "AI provider", local: "Local (default)",
    activeProvider: "Actually in use", configureKey: "Configure API key", apiKey: "API key",
    showKey: "Show key", hideKey: "Hide key", saveConsent: "Consent & Save key", removeKey: "Remove key",
    send: "Send", stop: "Stop", analyzing: "Analyzing...", stopped: "Request stopped.",
    keySaved: "Key saved on this device.", keyRemoved: "Key removed from this device.",
    disclosureOpenai: "In this mode, document data is sent to OpenAI servers. The key is stored only on this device and is not sent anywhere else.",
    disclosureGemini: "In this mode, document data is sent to Google servers. The key is stored only on this device and is not sent anywhere else.",
    disclosureClaude: "In this mode, document data is sent to Anthropic servers. The key is stored only on this device and is not sent anywhere else.",
    translateTitle: "Translation",
    translateMessage: "Select target language to translate the selected text (or entire document if nothing selected).",
    translateResult: "Translation result",
    translateReplace: "Replace selection",
    translateInsertBelow: "Insert below",
    draftTitle: "AI Draft",
    draftMessage: "Describe the document you want AI to draft (e.g., 'draft a weekly meeting invitation', 'draft a basic house rental contract').",
    draftPlaceholder: "Describe your draft request...",
    draftWarning: "This is an AI-generated draft — please review the content before use, especially for contracts or legally binding documents.",
    explainFormulaTitle: "Explain Formula",
    explainFormulaNoFormula: "The selected cell does not contain a formula.",
    formulaFromDescTitle: "Create Formula from Description",
    formulaFromDescMessage: "Describe the formula you want to create in natural language (e.g., 'sum column B when column A is greater than 100').",
    formulaFromDescPlaceholder: "Describe the formula to create...",
    formulaFromDescPreview: "Formula Preview",
    formulaFromDescApply: "Apply to selected cell",
    formulaFromDescInvalid: "The generated formula is not compatible with 3T Sheet. Please try a different description.",
    formulaFromDescUnsupported: "Formula contains unsupported functions:"
  },
  backstage: {
    home: "Home",
    new: "New (Ctrl+N)",
    open: "Open (Ctrl+O)",
    save: "Save (Ctrl+S)",
    saveAs: "Save As (F12)",
    print: "Print (Ctrl+P)",
    printNow: "Print Now",
    exportPdf: "Export PDF",
    about: "About 3T Office",
    templateTitle: "Standard Vietnamese Document Templates",
    templateSubtitle: "Quickly start a new document from an administrative or business template",
    recentTitle: "Recent Documents",
    recentColName: "DOCUMENT NAME",
    recentColFormat: "LOCATION / FORMAT",
    clearRecent: "Clear History",
    removeRecent: "Remove from list",
    removeRecentTooltip: "Remove this file from recent list",
    fileNotFoundTitle: "File Not Found",
    fileNotFoundMessage: "The file \"{name}\" no longer exists or was moved. Do you want to remove it from the recent list?",
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
    whatIfAnalysis: "What-If Analysis",
    tab: { home: "Home", formulas: "Formulas", data: "Data", insert: "Insert", pageLayout: "Page Layout", review: "Review", view: "View", help: "Help", ai: "3T AI Assistant" },
    group: { clipboard: "Clipboard", font: "Font", alignment: "Alignment", number: "Number", styles: "Styles", cells: "Cells", quickAnalysis: "Editing & Data", editing: "Editing", functionLibrary: "Function Library", definedNames: "Defined Names", formulaAuditing: "Formula Auditing", calculation: "Calculation", sortFilter: "Sort & Filter", dataTools: "Data Tools", outline: "Outline", pivotTable: "PivotTable", tables: "Tables", illustrations: "Illustrations", charts: "Charts", sparklines: "Sparklines", links: "Links", text: "Text", printArea: "Print Area", pageBreaks: "Page Breaks", pageSetup: "Page Setup", scaleToFit: "Scale to Fit", sheetOptions: "Sheet Options", proofing: "Proofing", comments: "Comments", protection: "Protect", workbookViews: "Workbook Views", show: "Show", zoom: "Zoom", window: "Window", macro: "Macros", help: "Help", aiAnalysis: "AI Data Analysis" },
    editing: { fill: "Fill", clear: "Clear" },
    alignment: { orientation: "Orientation" },
    cells: { format: "Format" },
    window: { freezePanes: "Freeze Panes" }
  },
  slidesRibbon: {
    tab: { home: "Home", insert: "Insert", design: "Design", transitions: "Transitions", animations: "Animations", slideshow: "Slide Show", review: "Review", view: "View", help: "Help", ai: "3T AI Assistant" },
    group: { slides: "Slides", clipboard: "Clipboard", font: "Font", paragraph: "Paragraph", drawing: "Drawing", editing: "Editing", imagesObjects: "Images & Objects", images: "Images", illustrations: "Illustrations", tables: "Tables", text: "Text", symbols: "Symbols", media: "Media", themes: "Themes", master: "Slide Master", customize: "Customize", transitions: "Transition to This Slide", animations: "Animation", startSlideshow: "Start Slide Show", presenter: "Presenter Tools", setup: "Set Up", comments: "Comments", proofing: "Proofing", presentationViews: "Presentation Views", show: "Show", zoom: "Zoom", window: "Window", macro: "Macros", help: "Help", aiContent: "AI Presentation Content" },
    editing: { select: "Select" },
    drawing: { arrange: "Arrange" },
    section: "Section"
  },
  sheetDialogs: {
    close: "Close", cancel: "Cancel", cancelLong: "Cancel", apply: "Apply", range: "Range", rangeLabel: "Range:", value: "Value", save: "Save",
    pasteSpecialTitle: "Paste Special", pasteSpecialGroup: "Paste", pasteSpecialAll: "All", pasteSpecialValues: "Values", pasteSpecialFormulas: "Formulas", pasteSpecialFormats: "Formats", pasteSpecialTranspose: "Transpose",
    mergeConfirmTitle: "Merge cells", mergeConfirmMessage: "Merging cells only keeps the upper-left value and discards other values.", mergeConfirmOk: "OK",
    functionTitle: "Insert Function", functionCategory: "Function category:", allCategory: "All", allFunctions: "All functions", mathFunctions: "Math & Trig", statsFunctions: "Statistical (AVERAGE, COUNT...)", logicFunctions: "Logical (IF, AND, OR...)", textFunctions: "Text (CONCAT, LEN...)", dateFunctions: "Date & Time (TODAY, NOW...)", financialFunctions: "Financial (PMT, FV, PV...)", lookupFunctions: "Lookup & Reference (VLOOKUP, INDEX...)", searchFunction: "Search for a function:", searchPlaceholder: "Type a brief description or function name...", insertFunction: "Insert Function",
    errorCheckingTitle: "Error Checking", noErrorsFound: "The error check is complete for the entire sheet. No errors were found.", errorsFoundPrompt: "Found <strong>{count}</strong> formula errors in the current sheet:", errorColCell: "Cell", errorColCode: "Error", errorColFormula: "Formula", errorColReason: "Reason", calcError: "Calculation error", divZero: "Division by zero or empty cell", invalidRef: "Invalid cell reference", wrongType: "Incorrect data type", naError: "Value not available", nameError: "Unrecognized formula or name", numError: "Numeric value out of range",
    watchWindowTitle: "Watch Window", addWatch: "Add Watch", deleteWatch: "Delete Watch", watchWindowColBook: "Book", watchWindowColSheet: "Sheet", watchWindowColName: "Name", watchWindowColCell: "Cell", watchWindowColValue: "Value", watchWindowColFormula: "Formula", watchWindowEmpty: "No watched cells.", addWatchTitle: "Add Watch", addWatchPrompt: "Select the cells that you would like to watch the value of:", addWatchBtn: "Add", deleteWatchConfirm: "Select a row in the table to delete watch.", watchWindowCountSuffix: "watched cell(s)", watchWindowKeyboardHint: "Shortcuts: Delete to remove, Enter to navigate, Esc to close", watchWindowInvalidCoord: "Invalid cell reference.", defineNameTitle: "Define Name", nameLabel: "Name:", refersTo: "Refers to:", useInFormulaTitle: "Paste Name", namePlaceholder: "e.g., Payroll, UnitPrice", scopeLabel: "Scope:", scopeWorkbook: "Workbook (Entire workbook)", invalidName: "The name is invalid or already exists.", useInFormulaPrompt: "Select a name to paste into the formula:",
    nameManagerTitle: "Name Manager", nameNew: "New...", nameEdit: "Edit...", nameDelete: "Delete", noNamedRanges: "No named ranges found.", invalidNameOrRef: "Name or reference is invalid or duplicate.",
    newComment: "New Comment {coord}", editComment: "Edit Comment {coord}", commentContent: "Comment", commentPlaceholder: "Enter a comment for {coord}", author: "Author", defaultAuthor: "3T Office User", saveChanges: "Save Changes", addComment: "Add Comment", deleteComment: "Delete Comment", emptyComment: "Comment text cannot be empty.",
    spellcheckTitle: "Spelling", spellcheckNotInDictionary: "Not in Dictionary:", spellcheckCell: "Cell", spellcheckContext: "Cell text", spellcheckSuggestions: "Suggestions:", spellcheckNoSuggestions: "(No close suggestions)", spellcheckIgnore: "Ignore Once", spellcheckIgnoreAll: "Ignore All", spellcheckAdd: "Add to Dictionary", spellcheckReplace: "Change", spellcheckReplaceAll: "Change All", spellcheckClose: "Close", spellcheckStatus: "Issue {current} of {total}", spellcheckComplete: "The spelling check is complete for the entire sheet. No misspellings were found.", spellcheckCompleteRemaining: "The spelling check is complete. No misspellings remain.",
    conditionalFormatting: "Conditional Formatting", rule: "Rule", greaterThan: "Greater Than", lessThan: "Less Than", blankCell: "Blanks", fillColor: "Fill Color", invalidNumber: "Enter a valid number.",
    dataValidation: "Data Validation", allow: "Allow", list: "List", numberRange: "Whole number range", listValues: "Source values (comma-separated)", listPlaceholder: "Approved, Rejected, In progress", minimum: "Minimum", maximum: "Maximum", invalidValidation: "The data validation settings are not valid.", chooseOption: "-- Select --", selectCellValue: "Select value for cell {col}{row}",
    removeDuplicatesTitle: "Remove Duplicates", myHeaderRow: "My data has headers", columnsToCompare: "Columns to compare", selectAtLeastOneColumn: "Select at least one column.", duplicatesRemovedResult: "{removed} duplicate values found and removed; {remaining} unique values remain.",
    customSortTitle: "Sort", addLevel: "Add Level", removeLevel: "Delete Level", sortBy: "Sort by", thenBy: "Then by", sortByColumn: "Sort column", sortOrder: "Order", sortAtoZ: "A to Z", sortZtoA: "Z to A",
    printPreview: {
      title: "Print Preview",
      printBtn: "Print",
      prevPage: "◀ Previous Page",
      nextPage: "Next Page ▶",
      pagePrefix: "Page ",
      closeTooltip: "Close Preview (Esc)"
    },
    subtotalTitle: "Subtotal", subtotalHint: "The selected range must contain headers and be sorted by the group column.", atEachChangeIn: "At each change in:", useFunction: "Use function:", addToSubtotal: "Add subtotal to:", selectRangeAndCol: "Please select a range and at least one value column.", subtotalResult: "Inserted {groups} subtotal groups and a grand total row.",
    textToColumnsTitle: "Convert Text to Columns", ttcMode: "Original data type", ttcDelimited: "Delimited", ttcFixedWidth: "Fixed width", ttcComma: "Comma", ttcSemicolon: "Semicolon", ttcSpace: "Space", ttcCustom: "Other", ttcCustomChar: "Other character", ttcWidths: "Column widths (comma-separated)", ttcPreview: "Preview: ", selectSingleCol: "Select data in a single column only.",
    resultTitle: "Result", flashFillSuccess: "Flash Fill filled {filled} cells ({pattern}).", flashFillFailure: "We couldn't recognize a pattern. Please provide 1-2 examples next to your source data.",
    pivotChartTitle: "PivotChart", pivotChartNeedsPivot: "Select a Pivot worksheet or create a PivotTable first.",
    dataTableTitle: "Data Table", dataTableRange: "Selected range", dataTableHint: "Place the source formula in the top-left cell and replacement values across the top row and/or down the first column.", rowInputCell: "Row input cell", columnInputCell: "Column input cell", dataTableNeedsInput: "Select a row input cell or a column input cell.", dataTableDistinctInputs: "The two input cells must be different.", dataTableRangeSize: "The Data Table range must contain at least two rows and two columns.", dataTableFormulaCorner: "The top-left cell must contain the source formula.", scenarioManagerTitle: "Scenario Manager", scenarios: "Scenarios", scenarioName: "Scenario name", changingCells: "Changing cells", scenarioValues: "Values (comma-separated)", scenarioNameExists: "A scenario with this name already exists.", showScenario: "Show", selectScenario: "Select a scenario.", add: "Add", edit: "Edit", delete: "Delete", scenarioComment: "Comment", scenarioCommentPlaceholder: "Enter scenario comment...", scenarioMerge: "Merge...", scenarioMergeTitle: "Merge Scenarios", selectSourceSheet: "Select source worksheet containing scenarios to merge:", merge: "Merge", mergedCountSuccess: "Successfully merged {count} scenarios.", noScenariosFoundOnSheet: "No scenarios found on this worksheet.", noOtherSheetsForMerge: "No other worksheets to merge scenarios from.", scenarioSummary: "Summary...", scenarioSummaryTitle: "Scenario Summary", scenarioSummaryDialogTitle: "Scenario Summary", reportType: "Report type", scenarioSummaryType: "Scenario summary", resultCells: "Result cells", createdDate: "Created date", currentValues: "Current Values", changingCellsHeader: "Changing Cells:", resultCellsHeader: "Result Cells:", summaryNotes: "Notes: Current Values column represents values of changing cells at time Scenario Summary Report was created. Changing cells for each scenario are highlighted.", noScenariosForSummary: "No scenarios available to generate summary.", scenarioUpdated: "Scenario updated successfully.", scenarioAdded: "New scenario added successfully.", scenarioDeleted: "Scenario deleted.", scenarioApplied: "Applied scenario «{name}» to worksheet.", mergedFrom: "Merged from", sheetNotFound: "Source worksheet does not exist.",
    goalSeekTitle: "Goal Seek", goalSeekSetCell: "Set cell", goalSeekToValue: "To value", goalSeekByChangingCell: "By changing cell", goalSeekFind: "Find Solution", goalSeekResult: "Found solution for {cell} = {value} (residual {residual}). Choose OK to apply.",
    sparklineColumn: "Sparkline column", sparklineLine: "Sparkline line",
    hfPresetLabel: "Preset", hfPresetCustom: "Custom", hfPresetPage: "Page X", hfPresetSheet: "Sheet name", hfPresetDate: "Date", hfPresetNone: "None", hfPresetPageVal: "Page &P", hfPresetSheetVal: "Sheet name: &A", hfPresetDateVal: "Date: &D", hfLeft: "Left", hfCenter: "Center", hfRight: "Right", headerFooterTitle: "Header / Footer", headerTitle: "Header", footerTitle: "Footer", hfDynamicCodesHint: "Dynamic codes: &P page number, &N total pages, &D date, &T time, &F file name, &A sheet name.",
    pivotTitle: "Create PivotTable", pivotSource: "Table/Range (first row contains headers)", loadFields: "Load Fields", chooseFields: "Choose fields for each area:", aggregateFor: "Summarize values by for {field}", sourceRangeFormat: "The source range must use a format such as A1:D20.", sourceNeedsHeaders: "The first row of the source range must contain headers.", uniqueHeaders: "Each source column must have a unique header.", selectValue: "Select at least one Values field.", columnNotFound: "Column {field} was not found.", sourceSheetNotFound: "The source worksheet was not found.", createPivotBtn: "Create PivotTable",
    chartDefaultTitle: "Data Chart", chartUnsupported: "Unsupported chart type: {type}", chartItem: "Item {number}", chartNoNumericData: "The selected range contains no numeric data", chartPiePositive: "A pie chart requires positive values", chartInsertFrom: "Insert Chart from {range}", selectedRange: "selected range", chartType: "Chart Type", chartColumn: "Column", chartLine: "Line", chartPie: "Pie", chartArea: "Area", insertIntoSheet: "Insert into Worksheet", insertedImageAlt: "Image inserted in the worksheet", deleteImage: "Delete image", imageFormatUnsupported: "Unsupported image format",
    cellStylesTitle: "Cell Styles Gallery", cellStylesHint: "Select a style to apply immediately to the selected cells:",
    formatAsTableTitle: "Format as Table", formatAsTableHint: "Select a table style to apply header colors and banded rows:",
    rowHeightTitle: "Row Height", rowHeightMessage: "Row height (pixels):",
    colWidthTitle: "Column Width", colWidthMessage: "Column width (pixels):",
    invalidRowColSize: "Please enter a valid number in the allowed range.",
    renameSheetTitle: "Rename Sheet", renameSheetMenu: "Rename Sheet...", renameSheetMessage: "Sheet name:",
    renameSheetHint: "Up to 31 characters. Must be unique in this workbook and cannot contain / \\ ? * [ ] :",
    sheetNameEmpty: "The sheet name cannot be empty.",
    sheetNameTooLong: "Sheet names can be at most {max} characters.",
    sheetNameInvalidChars: "A sheet name cannot contain / \\ ? * [ ] : or an apostrophe.",
    sheetNameDuplicate: "A sheet with that name already exists in this workbook.",
    moveCopyTitle: "Move or Copy", moveCopyMenu: "Move or Copy Sheet...",
    moveCopyIntro: "Choose where to place the sheet «{name}».",
    moveCopyBefore: "Before sheet:",
    moveCopyToEnd: "(move to end)",
    moveCopyCreateCopy: "Create a copy",
    protectSheet: "Protect Sheet...", unprotectSheet: "Unprotect Sheet...",
    protectSheetTitle: "Protect Sheet",
    protectSheetCheckbox: "Protect worksheet and contents of locked cells",
    protectSheetHint: "When on: cell edits, formatting, and inserting/deleting rows or columns are blocked. This is a UI lock; the optional password is stored in plain text for this session — not real security.",
    protectSheetTooltip: "Lock cell edits, formatting, and row/column deletion on the current sheet (UI lock, not real security)",
    unprotectSheetTooltip: "Turn off the UI lock on the current sheet",
    protectPassword: "Password (optional)",
    protectPasswordConfirm: "Reenter password",
    protectPasswordMismatch: "The passwords do not match.",
    unprotectPasswordMessage: "Enter the password to unprotect this sheet (UI lock, not real security).",
    unprotectPasswordWrong: "The password is incorrect.",
    sheetProtectedEdit: "The sheet is protected. You cannot edit cells, change formatting, or delete rows/columns. Choose Unprotect Sheet to unlock (UI lock only, not real security).",
    sheetTabProtectedTitle: "{name} (protected)",
    sheetTabProtectedAria: "{name}, protected",
    addSheet: "Add a new sheet",
    protectWorkbook: "Protect Workbook...", unprotectWorkbook: "Unprotect Workbook...",
    protectWorkbookTitle: "Protect Workbook",
    protectWorkbookCheckbox: "Protect workbook structure (sheets)",
    protectWorkbookHint: "When on: adding, deleting, renaming, moving, or copying sheets is blocked. Cell contents stay editable — unlike Protect Sheet. This is a UI lock; the optional password is stored in plain text for this session — not real security.",
    protectWorkbookTooltip: "Lock workbook structure: no adding, deleting, renaming, moving, or copying sheets. Does not lock cell contents (UI lock, not real security)",
    unprotectWorkbookTooltip: "Turn off the workbook structure lock (add/delete/rename/move/copy sheets)",
    unprotectWorkbookPasswordMessage: "Enter the password to unprotect workbook structure (UI lock, not real security).",
    workbookProtectedStructure: "The workbook structure is protected. You cannot add, delete, rename, move, or copy sheets. Cell contents stay editable. Choose Unprotect Workbook to unlock (UI lock only, not real security).",
    evaluateFormulaTitle: "Evaluate Formula",
    evaluateFormulaRef: "Reference: {sheet}!{coord}",
    evaluateFormulaHint: "The underlined italic part is evaluated next.",
    evaluateFormulaEvaluate: "Evaluate",
    evaluateFormulaStepIn: "Step In",
    evaluateFormulaStepOut: "Step Out",
    evaluateFormulaRestart: "Restart",
    evaluateFormulaClose: "Close",
    evaluateFormulaNoFormula: "The selected cell does not contain a formula. Select a cell that starts with = and open Evaluate Formula again.",
    evaluateFormulaStepResult: "Just evaluated: {value}",
    evaluateFormulaCellValue: "Current cell value: {value}",
    evaluateFormulaDone: "Evaluation complete. Final result: {value}",
    evaluateFormulaDoneMatch: "The result matches the cell value.",
    evaluateFormulaDoneMismatch: "The stepped result differs from the current cell value ({value}).",
    consolidateTitle: "Consolidate",
    consolidateHint: "Combine ranges (including from other sheets in this workbook) into one table at the active cell. Results are static values; undo with Ctrl+Z.",
    consolidateDest: "Destination: {sheet}!{coord}",
    consolidateFunction: "Function",
    consolidateReference: "Reference",
    consolidateAllRefs: "All references",
    consolidateAdd: "Add",
    consolidateDelete: "Delete",
    consolidateBrowse: "Browse",
    consolidateTopRow: "Top row labels",
    consolidateLeftCol: "Left column labels",
    consolidatePickLabel: "Select a range on the grid",
    consolidatePickOk: "Select",
    consolidateNeedRefs: "Add at least one source reference.",
    consolidateBadRef: "Invalid reference. Use SheetName!A1:B10 and make sure the sheet exists.",
    consolidateDuplicateRef: "That reference is already in the list.",
    consolidateSizeMismatch: "When consolidating by position, every source range must have the same number of rows and columns.",
    consolidateSizeMismatchRows: "When using only top-row labels, source ranges must have the same number of data rows.",
    consolidateSizeMismatchCols: "When using only left-column labels, source ranges must have the same number of data columns.",
    consolidateNoData: "No data found after the label row/column. Check the source ranges.",
    consolidateBadFunction: "Choose SUM, AVERAGE, COUNT, MAX, or MIN.",
    consolidateNoOutput: "Could not write the result to the grid. Choose a destination cell with room on the sheet.",
    consolidateFailed: "Could not consolidate the data."
  },
  slidesDialogs: {
    close: "Close", cancel: "Cancel", apply: "Apply", preview: "Preview", delete: "Delete",
    canvasRegion: "Slide canvas region",
    removeSectionKeepSlides: "Remove Section (keep slides)",
    totalPrintSlides: "Total slides to print",
    printPreview: {
      title: "Print Preview",
      printBtn: "Print",
      prevPage: "◀ Previous Page",
      nextPage: "Next Page ▶",
      pagePrefix: "Page ",
      closeTooltip: "Close Preview (Esc)",
      slideUnit: "slides",
      slideCount: "{count} slides"
    },
    masterTitle: "Slide Master", themeGalleryTitle: "Theme Gallery", themeGalleryHint: "Choose a theme to apply it immediately to the whole presentation.", themePreviewTitle: "Presentation title", themeCorporateBlue: "Corporate Blue", themeWarmTerracotta: "Warm Terracotta", themeMinimalMonochrome: "Minimal Monochrome", themeNaturalGreen: "Natural Green", themeModernCharcoal: "Modern Charcoal", themeEnergeticOrange: "Energetic Orange", slideSizeTitle: "Slide Size", slideSizeHint: "Choose a new aspect ratio. Existing shapes and objects will be scaled to fit.", slideSizeWide: "Widescreen", slideSizeStandard: "Standard", layoutTitle: "Choose a Slide Layout", transitionTitle: "Transitions", animationTitle: "Object Animations",
    applyMaster: "Apply Theme", applyLayout: "Apply Layout", applyTransition: "Apply Transition", applyAnimation: "Apply Animation", removeTransition: "Remove Transition", removeAnimation: "Remove Animation", previewTransition: "▶ Preview Transition", previewAnimation: "▶ Preview Animation", previewObject: "Preview Object",
    layoutHint: "Choose a layout to reshape the current slide's content structure:", applyLayoutAll: "Apply to All", applyLayoutCurrent: "Apply",
    masterHint: "Choose a style master to unify colors, fonts, and corner logo across all slides:", masterLogoLabel: "Organization / Corner Logo text:", masterLogoAria: "Organization name or corner logo text",
    transitionTypeLabel: "Transition effect:", transFade: "Fade", transSlide: "Slide", transZoom: "Zoom", transFlip: "Flip 3D", durationFast: "Fast (0.3s)", durationNormal: "Medium (0.5s)", durationSlow: "Slow (0.8s)", durationVerySlow: "Very Slow (1.0s)", sampleSlide: "Sample Slide", applyTransitionCurrent: "Apply", applyTransitionAll: "Apply to All",
    animationTarget: "Apply to:", animationType: "Entrance animation:", animationDuration: "Duration:", animationDelay: "Delay:", noAnimation: "None", immediate: "Immediately (0s)",
    targetTitle: "Title", targetCol1: "Content Column 1", targetCol2: "Content Column 2", targetBody: "Content Body", shapeImage: "Image", shapeEllipse: "Ellipse", shapeRectangle: "Rectangle", animFadeIn: "Fade In", animFlyIn: "Fly In", animZoomIn: "Zoom In", animBounceIn: "Bounce In", animSlideLeft: "Slide Left", durationVeryFast: "Very Fast (0.3s)", duration1s: "1.0 second", delay200: "After 0.2s", delay500: "After 0.5s", delay1000: "After 1.0s",
    presenterTitle: "Presenter View", presenterHeader: "PRESENTER VIEW", elapsedTime: "Elapsed presentation time", elapsedLabel: "ELAPSED:", actualClock: "Current clock time", clockLabel: "CLOCK:", presenterExit: "✕ End Show (Esc)", prevSlide: "◄ Previous", nextSlide: "Next ►", slideCounter: "Slide {current} of {total}", speakerNotesTitle: "📝 Speaker Notes", notesFontDec: "Decrease font size", notesFontInc: "Increase font size", nextSlideTitle: "⏭ Next Slide", noNotes: "(No notes for this slide. You can enter notes in the pane below canvas while editing).", endOfShow: "End of slide show.",
    readingViewTitle: "Reading View", readingToolbar: "Reading Navigation Toolbar", prevSlideShort: "Previous", nextSlideShort: "Next", readingClose: "Close Reading View",
    rehearseTitle: "Rehearse Timings", slideshowTitle: "Slide Show", rehearseClockAria: "Rehearsal timer", slideshowHint: "Press Space or Click to advance | Esc to exit",
    allHiddenTitle: "No slides to present", allHiddenMessage: "Every slide is hidden. Unhide at least one slide in Slide Sorter or the Slide Show tab, then try again.", hiddenSlideAria: "Hidden slide", hiddenSlideBadge: "Hidden",
    sectionAddTitle: "Add Section", sectionAddMessage: "Section name", sectionAddConfirm: "Add",
    sectionRenameTitle: "Rename Section", sectionRenameMessage: "New name", sectionRenameConfirm: "Rename",
    sectionCollapse: "Collapse section", sectionExpand: "Expand section",
    slideElapsed: "Slide", totalElapsed: "Total", footerDoc: "3T Office Presentation",
    prevSlideTitle: "Previous slide (←)", nextSlideTitle: "Next slide (Space or →)",
    prevSlideReadingTitle: "Previous slide (Left arrow)", nextSlideReadingTitle: "Next slide (Right arrow)",
    exitReadingTitle: "Exit reading mode (Esc)", notesFontDecTitle: "Decrease font size", notesFontIncTitle: "Increase font size",
    exitPresenterAria: "Exit presenter mode (Esc)",
    commentsLabel: "Slide Comments", newComment: "New Comment", commentPlaceholder: "Enter a comment...", addComment: "Add Comment", rehearsalConfirm: "Total slide show time: {time}.\nSave the rehearsal timings for each slide?",
    diagramTitle: "Insert Diagram", diagramHint: "Choose a diagram type and number of boxes. You can edit text directly after insertion.", diagramNodeCount: "Number of boxes", diagramInsert: "Insert Diagram", diagramProcess: "Step Process", diagramCycle: "Cycle Process", diagramHierarchy: "Organization Hierarchy", diagramList: "Hierarchical List", diagramStep: "Step {number}", diagramItem: "Item {number}", diagramRoot: "Leader", diagramChild: "Department {number}",
    formatBackgroundTitle: "Format Background", formatBackgroundHint: "Change this slide's background. This does not replace the presentation theme.", formatBackgroundSolid: "Solid fill", formatBackgroundGradient: "Two-color gradient", formatBackgroundPicture: "Picture", formatBackgroundColor: "Fill color", formatBackgroundFrom: "Color 1", formatBackgroundTo: "Color 2", formatBackgroundDirection: "Direction", formatBackgroundHorizontal: "Horizontal", formatBackgroundVertical: "Vertical", formatBackgroundChoosePicture: "Choose picture…", formatBackgroundApplyCurrent: "Apply to this slide", formatBackgroundApplyAll: "Apply to all slides", formatBackgroundClear: "Remove custom background",
    spellcheckTitle: "Spelling", spellcheckNotInDictionary: "Not in Dictionary:", spellcheckLocation: "Location", spellcheckContext: "Text", spellcheckSuggestions: "Suggestions:", spellcheckNoSuggestions: "(No close suggestions)", spellcheckIgnore: "Ignore Once", spellcheckIgnoreAll: "Ignore All", spellcheckAdd: "Add to Dictionary", spellcheckReplace: "Change", spellcheckReplaceAll: "Change All", spellcheckClose: "Close", spellcheckStatus: "Issue {current} of {total}", spellcheckComplete: "The spelling check is complete for this slide. No misspellings were found.", spellcheckCompleteRemaining: "The spelling check is complete. No misspellings remain.", spellcheckFieldTitle: "Title", spellcheckFieldBody: "Body", spellcheckFieldBody2: "Second column", spellcheckFieldShape: "Shape",
    animationPaneTitle: "Animation Pane", animationPaneHint: "Every animation on the current slide. Reorder with Up/Down, choose how it starts, or remove the animation without deleting the object.", animationPaneEmpty: "This slide has no animations. Apply an object animation on the Animations tab, then open this pane to sequence them.", animStartLabel: "Start", animStartOnClick: "On Click", animStartWithPrevious: "With Previous", animStartAfterPrevious: "After Previous", animMoveUp: "Move up", animMoveDown: "Move down", animMoveUpShort: "↑", animMoveDownShort: "↓", animRemove: "Remove animation", animRemoveShort: "Remove", shapeWordArt: "WordArt", shapeChart: "Chart", shapeTable: "Table", shapeTextBox: "Text box",
    setupShowTitle: "Set Up Slide Show", setupShowHint: "Slide show options for this presentation. Loop until Esc applies immediately in F5. Default pen and laser pointer color during slide show (toggle with Ctrl+P, Ctrl+L).", setupShowLoop: "Loop continuously until Esc", setupShowNoNarration: "Show without narration", setupShowNoNarrationHint: "3T Slide does not have audio narration yet — this option only stores a flag and does not mute or hide audio.", setupShowPointerColor: "Pen / laser pointer color",
    keepInkTitle: "3T Slide", keepInkPrompt: "Do you want to keep your ink annotations?", keepInkKeep: "Keep", keepInkDiscard: "Discard",
    slideshowNext: "Next", slideshowPrev: "Previous", slideshowPointerOptions: "Pointer Options", slideshowArrow: "Arrow", slideshowPen: "Pen", slideshowLaser: "Laser Pointer", slideshowPenColor: "Pen Color", slideshowEraseInk: "Erase Ink on Slide", slideshowEndShow: "End Show",
    colorRed: "Red", colorBlue: "Blue", colorYellow: "Yellow", colorGreen: "Green", colorBlack: "Black"
  },
  commands: {
    "writer.edit.select": { label: "Select", tooltip: "Select text or objects in the document" },
    "writer.para.lineSpacing": { label: "Line Spacing", tooltip: "Adjust spacing between lines of text" },
    "writer.layout.breaks": { label: "Breaks", tooltip: "Insert page or section breaks" },
    "writer.layout.sectionOptions": { label: "Section Options", tooltip: "Edit headers, footers, and numbering for this section" },
    "writer.para.lineSpacingLayout": { label: "Line Spacing", tooltip: "Adjust line and paragraph spacing" },
    "sheet-what-if-analysis": { label: "What-If Analysis", tooltip: "Try out various values for formulas using Goal Seek, Data Table, Scenario Manager" },
    "sheet.view.freezePanesMenu": { label: "Freeze Panes", tooltip: "Freeze rows and columns to keep them visible while scrolling" },
    "sheet.cells.format": { label: "Format", tooltip: "Change row height or column width, organize sheets, or protect sheets" },
    "sheet.edit.fill": { label: "Fill", tooltip: "Continue a pattern or copy values in adjacent cells" },
    "sheet.edit.clear": { label: "Clear", tooltip: "Delete everything, formatting, or contents from selected cells" },
    "slides.edit.select": { label: "Select", tooltip: "Select text or objects on the slide" },
    "slides.section.menu": { label: "Section", tooltip: "Organize slides into sections" },
    "slides.drawing.arrange": { label: "Arrange", tooltip: "Change the placement and order of shapes and objects" },
    "slides.text.vAlign": { label: "Align Text", tooltip: "Change how text is aligned within the text box vertically" },
    "slides.text.direction": { label: "Text Direction", tooltip: "Change orientation of text to vertical, stacked, or rotated" },
    "sheet.page.margins": { label: "Margins", tooltip: "Set page margins for printed worksheets" },
    "sheet.page.orientation": { label: "Orientation", tooltip: "Switch between portrait and landscape layouts" },
    "sheet.page.size": { label: "Size", tooltip: "Choose paper size for printing" },
    "sheet.page.printTitles": { label: "Print Titles", tooltip: "Specify rows and columns to repeat on each printed page" },
    "sheet.page.scale": { label: "Scale to Fit", tooltip: "Scale printed content by percentage or page count" },
    "sheet.page.headerFooter": { label: "Header & Footer", tooltip: "Set printable page headers and footers" },
    "sheet.help.open": { label: "Help", tooltip: "Open user guidance (F1)" },
    "writer.nav.docStart": { label: "Document Start", tooltip: "Go to the start of the document (Ctrl+Home)" },
    "writer.nav.docEnd": { label: "Document End", tooltip: "Go to the end of the document (Ctrl+End)" },
    "sheet.nav.home": { label: "First Cell", tooltip: "Go to cell A1 (Ctrl+Home)" },
    "sheet.nav.end": { label: "Last Data Cell", tooltip: "Go to the last cell containing data (Ctrl+End)" },
    "sheet.insert.sparklineLine": { label: "Line", tooltip: "Insert a line sparkline from the selected range" },
    "sheet.insert.sparklineColumn": { label: "Column", tooltip: "Insert a column sparkline from the selected range" },
    "sheet.insert.hyperlink": { label: "Link", tooltip: "Insert a hyperlink in the active cell (Ctrl+K)" },
    "sheet.insert.textbox": { label: "Text Box", tooltip: "Insert a floating text box" },
    "common.file.new": { label: "New", tooltip: "Create a new document (Ctrl+N)" },
    "common.file.open": { label: "Open", tooltip: "Open an existing document (Ctrl+O)" },
    "common.file.save": { label: "Save", tooltip: "Save the current document (Ctrl+S)" },
    "common.file.saveAs": { label: "Save As", tooltip: "Save the document under a new name (F12)" },
    "common.file.exportPdf": { label: "Export PDF", tooltip: "Export content to standard PDF format" },
    "common.file.print": { label: "Print", tooltip: "Print the document (Ctrl+P)" },
    "common.file.close": { label: "Close", tooltip: "Close the document (Ctrl+W)" },
    "common.help.about": { label: "About 3T Office", tooltip: "View version, copyright and open source licenses for 3T Office" },
    "common.macro.recordToggle": { label: "Record Macro", tooltip: "Start/Stop recording actions into a Macro (Ctrl+Shift+R)" },
    "common.macro.manager": { label: "View Macros", tooltip: "View, run, rename or delete recorded Macros (Alt+F8)" },
    "common.edit.undo": { label: "Undo", tooltip: "Undo the last action (Ctrl+Z)" },
    "common.edit.redo": { label: "Redo", tooltip: "Redo the last undone action (Ctrl+Y)" },
    "common.edit.repeat": { label: "Repeat", tooltip: "Repeat the last action (F4)" },
    "common.edit.cut": { label: "Cut", tooltip: "Cut selection to clipboard (Ctrl+X)" },
    "common.edit.copy": { label: "Copy", tooltip: "Copy selection (Ctrl+C)" },
    "common.edit.paste": { label: "Paste", tooltip: "Paste from clipboard (Ctrl+V)" },
    "common.edit.pastePlain": { label: "Paste Plain Text", tooltip: "Paste without formatting (Ctrl+Shift+V)" },
    "sheet.edit.pasteSpecial": { label: "Paste Special", tooltip: "Paste values, formulas, formats, or transpose (Ctrl+Alt+V)" },
    "sheet.edit.formatPainter": { label: "Format Painter", tooltip: "Copy cell formatting to another cell or range. Double-click to lock and apply multiple times. Esc to cancel." },
    "common.edit.formatPainter": { label: "Format Painter", tooltip: "Copy formatting (Ctrl+Shift+C)" },
    "common.edit.selectAll": { label: "Select All", tooltip: "Select all content (Ctrl+A)" },
    "common.edit.find": { label: "Find", tooltip: "Find text (Ctrl+F)" },
    "common.edit.replace": { label: "Replace", tooltip: "Find and replace text (Ctrl+H)" },
    "common.edit.hyperlink": { label: "Link", tooltip: "Insert a hyperlink (Ctrl+K)" },
    "common.view.ribbonToggle": { label: "Collapse Ribbon", tooltip: "Collapse or expand the ribbon (Ctrl+F1)" },
    "common.view.zoomIn": { label: "Zoom In", tooltip: "Increase zoom level (Ctrl++)" },
    "common.view.zoomOut": { label: "Zoom Out", tooltip: "Decrease zoom level (Ctrl+-)" },
    "common.view.fullScreen": { label: "Full Screen", tooltip: "Toggle full screen mode (F11)" },
    "ai.assistant.toggle": { label: "3T AI Assistant", tooltip: "Open the 3T AI assistant panel (Alt+J)" },
    "ai.assistant.summarize": { label: "Quick Summary", tooltip: "Summarize the selected content with AI" },
    "ai.assistant.rewrite": { label: "Rewrite", tooltip: "Rewrite text in polished Vietnamese style" },
    "ai.assistant.grammarCheck": { label: "Spell Check", tooltip: "Check Vietnamese spelling and grammar (F7)" }
    ,"sheet.cell.edit": { label: "Edit Cell", tooltip: "Edit the active cell (F2)" }
    ,"sheet.select.column": { label: "Select Column", tooltip: "Select the entire current column (Ctrl+Space)" }
    ,"sheet.select.row": { label: "Select Row", tooltip: "Select the entire current row (Shift+Space)" }
    ,"sheet.cell.bold": { label: "Bold", tooltip: "Apply bold formatting (Ctrl+B)" }
    ,"sheet.font.family": { label: "Font", tooltip: "Choose the cell font" }
    ,"sheet.font.size": { label: "Font Size", tooltip: "Choose the cell font size" }
    ,"sheet.font.grow": { label: "Increase Font Size", tooltip: "Increase to the next standard font size" }
    ,"sheet.font.shrink": { label: "Decrease Font Size", tooltip: "Decrease to the previous standard font size" }
    ,"sheet.cell.alignTop": { label: "Top Align", tooltip: "Align content to the top of the cell" }
    ,"sheet.cell.alignMiddle": { label: "Middle Align", tooltip: "Center content vertically in the cell" }
    ,"sheet.cell.alignBottom": { label: "Bottom Align", tooltip: "Align content to the bottom of the cell" }
    ,"sheet.cell.wrapText": { label: "Wrap Text", tooltip: "Wrap content to fit the column width" }
    ,"sheet.cell.orientation": { label: "Orientation", tooltip: "Rotate cell text: 0°, 45°, -45°, 90°, -90°, or stacked vertical" }
    ,"sheet.cell.indentIncrease": { label: "Increase Indent", tooltip: "Increase cell content indentation" }
    ,"sheet.cell.indentDecrease": { label: "Decrease Indent", tooltip: "Decrease cell content indentation" }
    ,"sheet.format.quickCategory": { label: "Number Format", tooltip: "Choose a number format category" }
    ,"sheet.format.increaseDecimal": { label: "Increase Decimal", tooltip: "Show one more decimal place" }
    ,"sheet.format.decreaseDecimal": { label: "Decrease Decimal", tooltip: "Show one fewer decimal place" }
    ,"sheet.cell.italic": { label: "Italic", tooltip: "Apply italic formatting (Ctrl+I)" }
    ,"sheet.cell.underline": { label: "Underline", tooltip: "Apply underline formatting (Ctrl+U)" }
    ,"sheet.cell.alignLeft": { label: "Align Left", tooltip: "Align cell contents to the left" }
    ,"sheet.cell.alignCenter": { label: "Center", tooltip: "Center cell contents" }
    ,"sheet.cell.alignRight": { label: "Align Right", tooltip: "Align cell contents to the right" }
    ,"sheet.cell.merge": { label: "Merge & Center", tooltip: "Merge the selected cells and center the contents" }
    ,"sheet.cell.mergeCenter": { label: "Merge & Center", tooltip: "Merge the selected cells and center the contents" }
    ,"sheet.cell.mergeAcross": { label: "Merge Across", tooltip: "Merge each row in the selection separately" }
    ,"sheet.cell.mergeCells": { label: "Merge Cells", tooltip: "Merge the selection and keep its current alignment" }
    ,"sheet.cell.unmerge": { label: "Unmerge Cells", tooltip: "Split merged cells" }
    ,"sheet.cell.borders": { label: "Borders", tooltip: "Apply borders to the selected cells" }
    ,"sheet.cell.fillColor": { label: "Fill Color", tooltip: "Change the background color of selected cells" }
    ,"sheet.cell.textColor": { label: "Font Color", tooltip: "Change the text color in selected cells" }
    ,"sheet.format.cellsDialog": { label: "Format Cells...", tooltip: "Open the Format Cells dialog (Ctrl+1)" }
    ,"sheet.format.alignmentDialog": { label: "Cell Alignment...", tooltip: "Open Format Cells dialog - Alignment tab" }
    ,"sheet.format.currencyVND": { label: "VND Currency", tooltip: "Apply VND currency format (Ctrl+Shift+4 hoặc Ctrl+Shift+$)" }
    ,"sheet.format.percent": { label: "Percent Style", tooltip: "Apply percentage format (Ctrl+Shift+5)" }
    ,"sheet.format.standard": { label: "Comma Style", tooltip: "Apply number format with thousands separators (Ctrl+Shift+1)" }
    ,"sheet.insert.date": { label: "Current Date", tooltip: "Insert the current date (Ctrl+;)" }
    ,"sheet.insert.time": { label: "Current Time", tooltip: "Insert the current time (Ctrl+Shift+;)" }
    ,"sheet.formula.insertFunction": { label: "Insert Function", tooltip: "Open the Insert Function fx dialog (Shift+F3)" }
    ,"sheet.formula.sum": { label: "AutoSum", tooltip: "Insert an AutoSum formula (Alt+=)" }
    ,"sheet.formula.average": { label: "Average", tooltip: "Insert an AVERAGE formula" }
    ,"sheet.formula.countNumbers": { label: "Count Numbers", tooltip: "Insert a COUNT formula" }
    ,"sheet.formula.max": { label: "Max", tooltip: "Insert a MAX formula" }
    ,"sheet.formula.min": { label: "Min", tooltip: "Insert a MIN formula" }
    ,"sheet.formula.categoryFinancial": { label: "Financial", tooltip: "Browse financial functions (PMT, FV, PV, NPV, IRR...)" }
    ,"sheet.formula.categoryLogical": { label: "Logical", tooltip: "Browse logical functions (IF, AND, OR...)" }
    ,"sheet.formula.categoryText": { label: "Text", tooltip: "Browse text functions (CONCAT, LEN, MID...)" }
    ,"sheet.formula.categoryDateTime": { label: "Date & Time", tooltip: "Browse date and time functions (TODAY, NOW, DATE...)" }
    ,"sheet.formula.categoryLookup": { label: "Lookup & Reference", tooltip: "Browse lookup and reference functions (VLOOKUP, INDEX, MATCH...)" }
    ,"sheet.formula.categoryMath": { label: "Math & Trig", tooltip: "Browse math and trigonometry functions (ROUND, SUMPRODUCT...)" }
    ,"sheet.formula.categoryMore": { label: "More Functions", tooltip: "Browse statistical and additional functions" }
    ,"sheet.formula.nameManager": { label: "Name Manager", tooltip: "Create, edit, and delete defined names" }
    ,"sheet.formula.defineName": { label: "Define Name", tooltip: "Define a name for the selected cells" }
    ,"sheet.formula.useInFormula": { label: "Use in Formula", tooltip: "Paste a defined name into the active formula" }
    ,"sheet.formula.createFromSelection": { label: "Create from Selection", tooltip: "Automatically generate names from selected row/column labels (Ctrl+Shift+F3)" }
    ,"sheet.formula.tracePrecedents": { label: "Trace Precedents", tooltip: "Show arrows pointing to cells that provide values to the active cell" }
    ,"sheet.formula.traceDependents": { label: "Trace Dependents", tooltip: "Show arrows pointing to cells that depend on the active cell" }
    ,"sheet.formula.removeArrows": { label: "Remove Arrows", tooltip: "Remove all formula auditing arrows" }
    ,"sheet.formula.showFormulas": { label: "Show Formulas", tooltip: "Display formula expressions instead of results in cells (Ctrl+`)" }
    ,"sheet.formula.errorChecking": { label: "Error Checking", tooltip: "Scan for formula calculation errors across the worksheet" }
    ,"sheet.formula.watchWindow": { label: "Watch Window", tooltip: "Monitor values of critical cells in a floating window" }
    ,"sheet.formula.evaluateFormula": { label: "Evaluate Formula", tooltip: "Step through the selected formula and inspect intermediate values" }
    ,"sheet.calc.calculationOptions": { label: "Calculation Options", tooltip: "Choose automatic or manual calculation mode" }
    ,"sheet.calc.modeAutomatic": { label: "Automatic", tooltip: "Recalculate formulas automatically when values change" }
    ,"sheet.calc.modeManual": { label: "Manual", tooltip: "Recalculate formulas only when you press Calculate Now (F9)" }
    ,"sheet.calc.calculateSheet": { label: "Calculate Sheet", tooltip: "Recalculate formulas in the active worksheet (Shift+F9)" }
    ,"sheet.calc.calculateNow": { label: "Calculate Now", tooltip: "Recalculate all formulas in the workbook immediately (F9)" }
    ,"sheet.formula.arrayEnter": { label: "Enter Array Formula", tooltip: "Enter an array formula for the selected range (Ctrl+Shift+Enter)" }
    ,"sheet.formula.recalculate": { label: "Calculate Now", tooltip: "Recalculate all formulas in workbook (F9)" }
    ,"sheet.data.sortAsc": { label: "Sort A to Z", tooltip: "Sort data in ascending order" }
    ,"sheet.data.sortDesc": { label: "Sort Z to A", tooltip: "Sort data in descending order" }
    ,"sheet.data.filter": { label: "Filter", tooltip: "Turn AutoFilter on or off (Ctrl+Shift+L)" }
    ,"sheet.data.customSort": { label: "Custom Sort", tooltip: "Sort by multiple columns (Sort by Column, Then by Column...)" }
    ,"sheet.format.conditional": { label: "Conditional Formatting", tooltip: "Highlight cells based on values or blank status" }
    ,"sheet.data.validation": { label: "Data Validation", tooltip: "Create a drop-down list or restrict values to a number range" }
    ,"sheet.data.textToColumns": { label: "Text to Columns", tooltip: "Split one column by delimiter or fixed width" }
    ,"sheet.data.flashFill": { label: "Flash Fill", tooltip: "Fill values from examples in the adjacent output column" }
    ,"sheet.data.removeDuplicates": { label: "Remove Duplicates", tooltip: "Remove duplicate rows using selected columns" }
    ,"sheet.data.consolidate": { label: "Consolidate", tooltip: "Combine data from multiple ranges or sheets into one summary table" }
    ,"sheet.data.group": { label: "Group", tooltip: "Group selected consecutive rows or columns" }
    ,"sheet.data.ungroup": { label: "Ungroup", tooltip: "Remove the selected row or column group" }
    ,"sheet.data.subtotal": { label: "Subtotal", tooltip: "Insert subtotals and a final grand total" }
    ,"sheet.data.goalSeek": { label: "Goal Seek", tooltip: "Find the right input value for the formula to reach a specific goal" }
    ,"sheet.data.dataTable": { label: "Data Table", tooltip: "Calculate a formula with one or two sets of replacement input values" }
    ,"sheet.data.scenarioManager": { label: "Scenario Manager", tooltip: "Save and switch between named sets of assumption values" }
    ,"sheet.data.pivotTable": { label: "PivotTable", tooltip: "Create a PivotTable from the selected data range" }
    ,"sheet.data.pivotRefresh": { label: "Refresh PivotTable", tooltip: "Refresh the PivotTable from its source data" }
    ,"sheet.view.normal": { label: "Normal", tooltip: "View worksheet in normal view" }
    ,"sheet.view.pageBreakPreview": { label: "Page Break Preview", tooltip: "Show where page breaks will occur in worksheet" }
    ,"sheet.view.pageLayout": { label: "Page Layout", tooltip: "View sheet as printed on paper with headers and footers" }
    ,"sheet.view.formulaBar": { label: "Formula Bar", tooltip: "Show or hide the formula bar" }
    ,"sheet.view.toggleFormulas": { label: "Show Formulas", tooltip: "Show formulas in cells instead of calculated values (Ctrl+`)" }
    ,"sheet.view.freezePanes": { label: "Freeze Panes", tooltip: "Keep the rows above and columns to the left of the selected cell visible while scrolling" }
    ,"sheet.view.freezeTopRow": { label: "Freeze Top Row", tooltip: "Keep only row 1 visible while scrolling vertically" }
    ,"sheet.view.freezeFirstColumn": { label: "Freeze First Column", tooltip: "Keep only column A visible while scrolling horizontally" }
    ,"sheet.view.zoomIn": { label: "Zoom In", tooltip: "Increase the worksheet zoom level" }
    ,"sheet.view.zoomOut": { label: "Zoom Out", tooltip: "Decrease the worksheet zoom level" }
    ,"sheet.view.zoomReset": { label: "100%", tooltip: "Reset the worksheet zoom level to 100%" }
    ,"sheet.view.zoomToSelection": { label: "Zoom to Selection", tooltip: "Zoom worksheet to fit selected range" }
    ,"sheet.view.newWindow": { label: "New Window", tooltip: "Open a new window for the spreadsheet document" }
    ,"sheet.view.gridlines": { label: "Gridlines", tooltip: "Show or hide worksheet gridlines" }
    ,"sheet.view.headings": { label: "Headings", tooltip: "Show or hide row and column headings" }
    ,"sheet.review.spellCheck": { label: "Spelling", tooltip: "Check Vietnamese spelling in text cells of the current worksheet (F7)" }
    ,"sheet.review.commentInsert": { label: "New Comment", tooltip: "Add, edit, or delete a comment on the active cell" }
    ,"sheet.review.commentPrevious": { label: "Previous Comment", tooltip: "Go to the previous comment" }
    ,"sheet.review.commentNext": { label: "Next Comment", tooltip: "Go to the next comment" }
    ,"sheet.review.commentDelete": { label: "Delete Comment", tooltip: "Delete the selected comment" }
    ,"sheet.review.commentResolve": { label: "Resolve Comment", tooltip: "Resolve or reopen the selected comment" }
    ,"sheet.file.printPreview": { label: "Print Preview", tooltip: "Print Preview (Ctrl+F2)" }
    ,"sheet.page.setPrintArea": { label: "Set Print Area", tooltip: "Set the selected range as the print area" }
    ,"sheet.page.clearPrintArea": { label: "Clear Print Area", tooltip: "Clear the current worksheet's print area" }
    ,"sheet.page.insertPageBreak": { label: "Insert Page Break", tooltip: "Insert row and column page breaks at the active cell" }
    ,"sheet.page.removePageBreak": { label: "Remove Page Break", tooltip: "Remove row and column page breaks at the active cell" }
    ,"sheet.insert.cells": { label: "Insert Cells...", tooltip: "Insert cells, rows, or columns (Ctrl+Shift++)" }
    ,"sheet.sheet.insertBefore": { label: "Insert Sheet", tooltip: "Insert a new sheet before current sheet (Shift+F11)" }
    ,"sheet.row.insert": { label: "Insert Row", tooltip: "Insert a new row (Ctrl+Shift+=)" }
    ,"sheet.col.insert": { label: "Insert Column", tooltip: "Insert a new column" }
    ,"sheet.row.delete": { label: "Delete Row", tooltip: "Delete the row containing the active cell" }
    ,"sheet.col.delete": { label: "Delete Column", tooltip: "Delete the column containing the active cell" }
    ,"sheet.row.height": { label: "Row Height...", tooltip: "Set the height (pixels) of the selected rows" }
    ,"sheet.row.autoFit": { label: "AutoFit Row Height", tooltip: "AutoFit the height of the selected rows to their content" }
    ,"sheet.col.width": { label: "Column Width...", tooltip: "Set the width (pixels) of the selected columns" }
    ,"sheet.col.autoFit": { label: "AutoFit Column Width", tooltip: "AutoFit the width of the selected columns to their content" }
    ,"sheet.row.hide": { label: "Hide Rows", tooltip: "Hide the selected rows" }
    ,"sheet.row.unhide": { label: "Unhide Rows", tooltip: "Unhide hidden rows in the selection" }
    ,"sheet.col.hide": { label: "Hide Columns", tooltip: "Hide the selected columns" }
    ,"sheet.col.unhide": { label: "Unhide Columns", tooltip: "Unhide hidden columns in the selection" }
    ,"sheet.sheet.rename": { label: "Rename Sheet...", tooltip: "Rename the current worksheet (same dialog as double-clicking the sheet tab)" }
    ,"sheet.sheet.moveOrCopy": { label: "Move or Copy Sheet...", tooltip: "Reorder tabs or duplicate a worksheet (data, formatting, Page Setup)" }
    ,"sheet.sheet.protect": { label: "Protect Sheet...", tooltip: "Lock cell edits, formatting, and row/column deletion on the current sheet (UI lock, not real security)" }
    ,"sheet.workbook.protect": { label: "Protect Workbook...", tooltip: "Lock workbook structure: no adding, deleting, renaming, moving, or copying sheets. Does not lock cell contents (UI lock, not real security)" }
    ,"sheet.chart.insert": { label: "Chart", tooltip: "Insert a chart to visualize data" }
    ,"sheet.chart.pivotChart": { label: "PivotChart", tooltip: "Insert a Column or Pie chart linked to summarized Pivot data" }
    ,"sheet.insert.image": { label: "Pictures", tooltip: "Insert a picture at the selected cell" }
    ,"sheet.style.formatAsTable": { label: "Format as Table", tooltip: "Format selected range as a styled table with alternating rows" }
    ,"sheet.style.cellStyles": { label: "Cell Styles", tooltip: "Open cell styles gallery (Normal, Good, Bad, Neutral...)" }
    ,"sheet.edit.fillDown": { label: "Fill Down", tooltip: "Fill down from the cell above (Ctrl+D)" }
    ,"sheet.edit.fillRight": { label: "Fill Right", tooltip: "Fill right from the cell to the left (Ctrl+R)" }
    ,"sheet.edit.clearAll": { label: "Clear All", tooltip: "Clear all contents, formulas, and formatting from selected cells" }
    ,"sheet.edit.clearFormats": { label: "Clear Formats", tooltip: "Clear cell formatting back to default while keeping contents" }
    ,"sheet.edit.clearContents": { label: "Clear Contents", tooltip: "Clear cell contents and formulas while keeping formatting" }
    ,"slides.review.commentInsert": { label: "New Comment", tooltip: "Add a comment to the current slide" }
    ,"slides.review.commentPrevious": { label: "Previous Comment", tooltip: "Go to the previous comment" }
    ,"slides.review.commentNext": { label: "Next Comment", tooltip: "Go to the next comment" }
    ,"slides.review.commentDelete": { label: "Delete Comment", tooltip: "Delete the selected comment" }
    ,"slides.review.commentResolve": { label: "Resolve Comment", tooltip: "Resolve or reopen the selected comment" }
    ,"slides.review.spellCheck": { label: "Spelling", tooltip: "Check Vietnamese spelling on the current slide (F7)" }
    ,"slides.edit.formatPainter": { label: "Format Painter", tooltip: "Copy text or shape formatting to another object. Double-click to lock and apply multiple times. Esc to cancel." }
    ,"slides.edit.selectAll": { label: "Select All", tooltip: "Select every shape on the current slide" }
    ,"slides.edit.selectObjects": { label: "Select Objects", tooltip: "Select drawing objects on the current slide (excluding connectors)" }
    ,"slides.slide.new": { label: "New Slide", tooltip: "Insert a new slide (Ctrl+M)" }
    ,"slides.layout.apply": { label: "Layout", tooltip: "Change the slide layout (Title, Content, Two Content, Blank)" }
    ,"slides.layout.select": { label: "Choose Layout", tooltip: "Open the slide layout gallery" }
    ,"slides.slide.duplicate": { label: "Duplicate Slide", tooltip: "Duplicate the selected slide (Ctrl+D)" }
    ,"slides.slide.delete": { label: "Delete Slide", tooltip: "Delete the selected slide (Delete)" }
    ,"slides.slide.toggleHidden": { label: "Hide Slide", tooltip: "Hide or show the selected slide during F5. The slide stays in the file and Slide Sorter." }
    ,"slides.section.add": { label: "Add Section", tooltip: "Add a section starting at the selected slide to group consecutive slides" }
    ,"slides.section.rename": { label: "Rename Section", tooltip: "Rename the section that contains the selected slide" }
    ,"slides.section.remove": { label: "Remove Section", tooltip: "Ungroup the section without deleting the slides inside it" }
    ,"slides.section.moveUp": { label: "Move Section Up", tooltip: "Move the whole section group above the previous section, keeping slide order inside the group" }
    ,"slides.section.moveDown": { label: "Move Section Down", tooltip: "Move the whole section group below the next section, keeping slide order inside the group" }
    ,"slides.text.insert": { label: "Text Box", tooltip: "Insert a text box" }
    ,"slides.shape.insert": { label: "Shapes", tooltip: "Insert a rectangle, oval, or arrow" }
    ,"slides.diagram.insert": { label: "Diagram", tooltip: "Insert a process, cycle, or hierarchy diagram" }
    ,"slides.image.insert": { label: "Pictures", tooltip: "Insert a picture from this device" }
    ,"slides.media.insertVideo": { label: "Video", tooltip: "Insert a video from this device" }
    ,"slides.media.insertAudio": { label: "Audio", tooltip: "Insert audio from this device" }
    ,"slides.insert.table": { label: "Table", tooltip: "Insert a table you can drag and resize" }
    ,"slides.insert.chart": { label: "Chart", tooltip: "Insert a chart into the active slide" }
    ,"slides.insert.headerFooter": { label: "Header & Footer", tooltip: "Show or hide date, slide number, and footer" }
    ,"slides.insert.dateTime": { label: "Date & Time", tooltip: "Insert an auto-updating date and time placeholder" }
    ,"slides.insert.slideNumber": { label: "Slide Number", tooltip: "Insert an auto-updating slide number placeholder" }
    ,"slides.insert.symbol": { label: "Symbol", tooltip: "Insert a special character into the selected text box" }
    ,"slides.insert.wordart": { label: "WordArt", tooltip: "Insert stylized title text with outline, shadow, or gradient fill" }
    ,"slides.master.apply": { label: "Slide Master", tooltip: "Apply a Slide Master theme across the presentation" }
    ,"slides.design.themeGallery": { label: "Themes", tooltip: "Choose a design theme for the whole presentation" }
    ,"slides.design.slideSize": { label: "Slide Size", tooltip: "Choose a 16:9 or 4:3 slide ratio" }
    ,"slides.design.formatBackground": { label: "Format Background", tooltip: "Change the current slide or all slides to a solid color, two-color gradient, or picture" }
    ,"slides.transition.apply": { label: "Transitions", tooltip: "Apply a slide transition (Fade, Push, Zoom, Flip)" }
    ,"slides.animation.apply": { label: "Animations", tooltip: "Apply an entrance animation to an object" }
    ,"slides.animation.pane": { label: "Animation Pane", tooltip: "List every animation on the current slide, reorder, change start, or remove an animation" }
    ,"slides.view.normal": { label: "Normal", tooltip: "Normal view for editing slides" }
    ,"slides.view.slideSorter": { label: "Slide Sorter", tooltip: "View all slides in a grid and drag to reorder them" }
    ,"slides.notes.toggle": { label: "Speaker Notes", tooltip: "Show or hide the speaker notes pane" }
    ,"slides.view.reading": { label: "Reading View", tooltip: "Read presentation with simplified controls; press Esc to exit" }
    ,"slides.view.ruler": { label: "Ruler", tooltip: "Show or hide alignment rulers" }
    ,"slides.view.gridlines": { label: "Gridlines", tooltip: "Show or hide alignment gridlines" }
    ,"slides.view.guides": { label: "Guides", tooltip: "Show or hide draggable alignment guidelines" }
    ,"slides.view.zoomIn": { label: "Zoom In", tooltip: "Increase presentation zoom level" }
    ,"slides.view.zoomOut": { label: "Zoom Out", tooltip: "Decrease presentation zoom level" }
    ,"slides.view.zoomReset": { label: "100%", tooltip: "Reset presentation zoom level to 100%" }
    ,"slides.view.fitToWindow": { label: "Fit to Window", tooltip: "Fit presentation slide to current window size" }
    ,"slides.view.newWindow": { label: "New Window", tooltip: "Open a new window for the presentation document" }
    ,"slides.show.startFromBegin": { label: "From Beginning", tooltip: "Start the slide show from the first slide (F5)" }
    ,"slides.show.startFromCurrent": { label: "From Current Slide", tooltip: "Start the slide show from the current slide (Shift+F5)" }
    ,"slides.show.presenterMode": { label: "Presenter View", tooltip: "Start Presenter View with notes and a timer (Alt+F5)" }
    ,"slides.show.rehearseTimings": { label: "Rehearse Timings", tooltip: "Practice the slide show and record the time spent on each slide" }
    ,"slides.show.setupShow": { label: "Set Up Slide Show", tooltip: "Loop until Esc, show without narration, and pen/laser pointer color" }
    ,"slides.file.printPreview": { label: "Print Preview", tooltip: "Print Preview (Ctrl+F2)" }
    ,"slides.shape.group": { label: "Group", tooltip: "Group the selected objects together (Ctrl+G)" }
    ,"slides.shape.ungroup": { label: "Ungroup", tooltip: "Ungroup the selected objects (Ctrl+Shift+G)" }
    ,"slides.arrange.bringToFront": { label: "Bring to Front", tooltip: "Bring the selected object in front of all other objects" }
    ,"slides.arrange.bringForward": { label: "Bring Forward", tooltip: "Bring the selected object forward one level" }
    ,"slides.arrange.sendBackward": { label: "Send Backward", tooltip: "Send the selected object backward one level" }
    ,"slides.arrange.sendToBack": { label: "Send to Back", tooltip: "Send the selected object behind all other objects" }
    ,"slides.arrange.alignLeft": { label: "Align Left", tooltip: "Align the selected objects to the left edge" }
    ,"slides.arrange.alignCenter": { label: "Align Center", tooltip: "Align the selected objects to the horizontal center" }
    ,"slides.arrange.alignRight": { label: "Align Right", tooltip: "Align the selected objects to the right edge" }
    ,"slides.arrange.alignTop": { label: "Align Top", tooltip: "Align the selected objects to the top edge" }
    ,"slides.arrange.alignMiddle": { label: "Align Middle", tooltip: "Align the selected objects to the vertical middle" }
    ,"slides.arrange.alignBottom": { label: "Align Bottom", tooltip: "Align the selected objects to the bottom edge" }
    ,"slides.arrange.distributeHorizontal": { label: "Distribute Horizontally", tooltip: "Evenly space the objects horizontally (3 or more objects)" }
    ,"slides.arrange.distributeVertical": { label: "Distribute Vertically", tooltip: "Evenly space the objects vertically (3 or more objects)" }
    ,"slides.arrange.alignToSlide": { label: "Align to Slide", tooltip: "On: align relative to the whole slide. Off: align relative to the selected objects" }
    ,"slides.text.vAlignTop": { label: "Align Top", tooltip: "Align text to the top of the text box" }
    ,"slides.text.vAlignMiddle": { label: "Align Middle", tooltip: "Align text to the vertical middle of the text box" }
    ,"slides.text.vAlignBottom": { label: "Align Bottom", tooltip: "Align text to the bottom of the text box" }
    ,"slides.text.directionHorizontal": { label: "Horizontal", tooltip: "Horizontal text (default)" }
    ,"slides.text.directionVertical": { label: "Rotate all text 90°", tooltip: "Rotate all text by 90 degrees" }
    ,"slides.text.directionVertical270": { label: "Rotate all text 270°", tooltip: "Rotate all text by 270 degrees" }
    ,"slides.text.directionStacked": { label: "Stacked", tooltip: "Stack characters vertically without rotating them" }
    ,"slides.nav.firstSlide": { label: "First Slide", tooltip: "Go to the first slide (Ctrl+Home)" }
    ,"slides.nav.lastSlide": { label: "Last Slide", tooltip: "Go to the last slide (Ctrl+End)" }
    ,"slides.nav.prevSlide": { label: "Previous Slide", tooltip: "Go to the previous slide (Page Up)" }
    ,"slides.nav.nextSlide": { label: "Next Slide", tooltip: "Go to the next slide (Page Down)" }
    ,"slides.text.bold": { label: "Bold", tooltip: "Bold (Ctrl+B)" }
    ,"slides.text.italic": { label: "Italic", tooltip: "Italic (Ctrl+I)" }
    ,"slides.text.underline": { label: "Underline", tooltip: "Underline (Ctrl+U)" }
    ,"slides.text.strike": { label: "Strikethrough", tooltip: "Strikethrough" }
    ,"slides.text.clearFormat": { label: "Clear Formatting", tooltip: "Clear text formatting, keep the content" }
    ,"slides.font.family": { label: "Font", tooltip: "Choose a font" }
    ,"slides.font.size": { label: "Font Size", tooltip: "Choose a font size" }
    ,"slides.font.grow": { label: "Increase Font Size", tooltip: "Increase font size" }
    ,"slides.font.shrink": { label: "Decrease Font Size", tooltip: "Decrease font size" }
    ,"slides.color.text": { label: "Font Color", tooltip: "Change font color" }
    ,"slides.color.highlight": { label: "Text Highlight Color", tooltip: "Highlight text" }
    ,"slides.list.bullet": { label: "Bullets", tooltip: "Create a bulleted list" }
    ,"slides.list.numbered": { label: "Numbering", tooltip: "Create a numbered list" }
    ,"slides.para.alignLeft": { label: "Align Left", tooltip: "Align text left (Ctrl+L)" }
    ,"slides.para.alignCenter": { label: "Center", tooltip: "Center text (Ctrl+E)" }
    ,"slides.para.alignRight": { label: "Align Right", tooltip: "Align text right (Ctrl+R)" }
    ,"slides.para.justify": { label: "Justify", tooltip: "Justify text (Ctrl+J)" }
    ,"slides.para.indentInc": { label: "Increase Indent", tooltip: "Increase paragraph indent" }
    ,"slides.para.indentDec": { label: "Decrease Indent", tooltip: "Decrease paragraph indent" }
    ,"slides.para.lineSpacing": { label: "Line Spacing", tooltip: "Set line spacing to 1.0, 1.5, or 2.0" }
    ,"slides.help.open": { label: "Help", tooltip: "Open the in-app user guide (F1)" }

    ,// 3T Doc Commands
    "writer.text.bold": { label: "Bold", tooltip: "Bold (Ctrl+B)" },
    "writer.text.italic": { label: "Italic", tooltip: "Italic (Ctrl+I)" },
    "writer.text.underline": { label: "Underline", tooltip: "Underline (Ctrl+U)" },
    "writer.text.strike": { label: "Strikethrough", tooltip: "Strikethrough" },
    "writer.font.grow": { label: "Increase Font Size", tooltip: "Increase font size (Ctrl+Shift+>)" },
    "writer.font.shrink": { label: "Decrease Font Size", tooltip: "Decrease font size (Ctrl+Shift+<)" },
    "writer.font.grow1pt": { label: "Increase Font Size 1 pt", tooltip: "Increase font size by 1 point (Ctrl+])" },
    "writer.font.shrink1pt": { label: "Decrease Font Size 1 pt", tooltip: "Decrease font size by 1 point (Ctrl+[)" },
    "writer.text.subscript": { label: "Subscript", tooltip: "Subscript X₂ (Ctrl+=)" },
    "writer.text.superscript": { label: "Superscript", tooltip: "Superscript X² (Ctrl+Shift++)" },
    "writer.text.clearFormat": { label: "Clear All Formatting", tooltip: "Clear all formatting (Ctrl+Space)" },
    "writer.font.family": { label: "Font", tooltip: "Select font family" },
    "writer.font.size": { label: "Font Size", tooltip: "Select font size" },
    "writer.style.apply": { label: "Styles", tooltip: "Apply paragraph style (Normal, Heading 1, 2, 3, Quote, Emphasis)" },
    "writer.style.gallery": { label: "Styles Gallery", tooltip: "Open visual styles gallery" },
    "writer.design.themeGallery": { label: "Document Themes", tooltip: "Open document themes and formatting gallery" },
    "writer.color.text": { label: "Font Color", tooltip: "Change font color" },
    "writer.color.highlight": { label: "Text Highlight Color", tooltip: "Highlight text" },
    "writer.para.alignLeft": { label: "Align Left", tooltip: "Align text left (Ctrl+L)" },
    "writer.para.alignCenter": { label: "Center", tooltip: "Center text (Ctrl+E)" },
    "writer.para.alignRight": { label: "Align Right", tooltip: "Align text right (Ctrl+R)" },
    "writer.para.justify": { label: "Justify", tooltip: "Justify text (Ctrl+J)" },
    "writer.para.spacing1": { label: "Line Spacing 1.0", tooltip: "Single line spacing (Ctrl+1)" },
    "writer.para.spacing15": { label: "Line Spacing 1.5", tooltip: "1.5 line spacing (Ctrl+5)" },
    "writer.para.spacing2": { label: "Line Spacing 2.0", tooltip: "Double line spacing (Ctrl+2)" },
    "writer.para.spacingBefore": { label: "Spacing Before", tooltip: "Space before paragraph (pt)" },
    "writer.para.spacingAfter": { label: "Spacing After", tooltip: "Space after paragraph (pt)" },
    "writer.list.bullet": { label: "Bullets", tooltip: "Create a bulleted list" },
    "writer.list.numbered": { label: "Numbering", tooltip: "Create a numbered list" },
    "writer.para.multilevelList": { label: "Multilevel List", tooltip: "Multilevel list: 1. / 1.1. / 1.1.1., 1. / a. / i., or Vietnamese Điều / Khoản / Điểm" },
    "writer.para.indentInc": { label: "Increase Indent", tooltip: "Increase indent (Ctrl+M)" },
    "writer.para.indentDec": { label: "Decrease Indent", tooltip: "Decrease indent (Ctrl+Shift+M)" },
    "writer.para.moveUp": { label: "Move Paragraph Up", tooltip: "Move paragraph up (Alt+Shift+Up)" },
    "writer.para.moveDown": { label: "Move Paragraph Down", tooltip: "Move paragraph down (Alt+Shift+Down)" },
    "writer.style.normal": { label: "Normal Style", tooltip: "Apply Normal style (Ctrl+Shift+N)" },
    "writer.text.changeCase": { label: "Change Case", tooltip: "Cycle lowercase / UPPERCASE / Title Case (Shift+F3)" },
    "writer.para.sort": { label: "Sort", tooltip: "Sort selected paragraphs or list items A–Z" },
    "writer.para.showFormattingMarks": { label: "Show/Hide Formatting Marks", tooltip: "Show or hide paragraph and line-break marks" },
    "writer.para.shading": { label: "Shading", tooltip: "Apply paragraph or table-cell shading" },
    "writer.para.borders": { label: "Borders", tooltip: "Choose paragraph or table-cell borders" },
    "writer.table.insert": { label: "Table", tooltip: "Insert a table into document" },
    "writer.image.insert": { label: "Pictures", tooltip: "Insert pictures from your computer" },
    "writer.shape.insert": { label: "Shapes", tooltip: "Insert basic shapes (rectangle, circle, arrow, line)" },
    "writer.diagram.insert": { label: "SmartArt", tooltip: "Insert a SmartArt diagram (process, cycle, hierarchy, list)" },
    "writer.chart.insert": { label: "Chart", tooltip: "Insert an illustration chart" },
    "writer.page.break": { label: "Page Break", tooltip: "Insert a page break (Ctrl+Enter)" },
    "writer.header.insert": { label: "Header", tooltip: "Insert header" },
    "writer.footer.insert": { label: "Footer", tooltip: "Insert footer" },
    "writer.insert.textbox": { label: "Text Box", tooltip: "Insert a freely movable text box" },
    "writer.insert.wordart": { label: "WordArt", tooltip: "Insert stylized decorative text with outline, shadow, or gradient at the cursor" },
    "writer.format.dropCap": { label: "Drop Cap", tooltip: "Enlarge the first letter of the paragraph" },
    "writer.insert.dateTime": { label: "Date & Time", tooltip: "Insert the current date and time at the cursor" },
    "writer.insert.equation": { label: "Equation", tooltip: "Insert a basic math text box (reduced editor)" },
    "writer.insert.symbol": { label: "Symbol", tooltip: "Insert a special character at the cursor" },
    "writer.insert.bookmark": { label: "Bookmark", tooltip: "Mark a location in the document to jump to later" },
    "writer.insert.crossReference": { label: "Cross-reference", tooltip: "Insert an internal link to a heading or bookmark" },
    "writer.comment.insert": { label: "New Comment", tooltip: "Add a comment to the selected text (Ctrl+Alt+M)" },
    "writer.review.commentPrevious": { label: "Previous Comment", tooltip: "Go to the previous comment" },
    "writer.review.commentNext": { label: "Next Comment", tooltip: "Go to the next comment" },
    "writer.review.commentDelete": { label: "Delete Comment", tooltip: "Delete the selected comment" },
    "writer.review.commentResolve": { label: "Resolve Comment", tooltip: "Resolve or reopen the selected comment" },
    "writer.trackChanges.toggle": { label: "Track Changes", tooltip: "Track changes in the document (Ctrl+Shift+E)" },
    "writer.trackChanges.previous": { label: "Previous Change", tooltip: "Go to the previous tracked change" },
    "writer.trackChanges.next": { label: "Next Change", tooltip: "Go to the next tracked change" },
    "writer.trackChanges.acceptOne": { label: "Accept This", tooltip: "Accept the selected change" },
    "writer.trackChanges.rejectOne": { label: "Reject This", tooltip: "Reject the selected change" },
    "writer.trackChanges.acceptAll": { label: "Accept All Changes", tooltip: "Accept all changes in document" },
    "writer.trackChanges.rejectAll": { label: "Reject All Changes", tooltip: "Reject all changes in document" },
    "writer.review.wordCount": { label: "Word Count", tooltip: "Show words, characters, paragraphs and lines in the document" },
    "writer.help.open": { label: "Help", tooltip: "Open the in-app user guide (F1)" },
    "writer.page.margins": { label: "Margins", tooltip: "Adjust document margins" },
    "writer.page.orientation": { label: "Orientation", tooltip: "Switch page orientation between portrait and landscape" },
    "writer.page.size": { label: "Size", tooltip: "Choose page size (A4, Letter, etc.)" },
    "writer.page.columns": { label: "Columns", tooltip: "Split text into two or more columns" },
    "writer.page.columns1": { label: "One Column", tooltip: "Format text into one column" },
    "writer.page.columns2": { label: "Two Columns", tooltip: "Split text into two columns" },
    "writer.page.columns3": { label: "Three Columns", tooltip: "Split text into three columns" },
    "writer.break.column": { label: "Column Break", tooltip: "Move following content to the next column" },
    "writer.section.nextPage": { label: "Section Break — Next Page", tooltip: "Start a new section on the next page with separate page setup" },
    "writer.section.continuous": { label: "Section Break — Continuous", tooltip: "Start a new section at the current position" },
    "writer.section.evenPage": { label: "Section Break — Even Page", tooltip: "Start a new section on the next even page" },
    "writer.section.oddPage": { label: "Section Break — Odd Page", tooltip: "Start a new section on the next odd page" },
    "writer.section.options": { label: "Section Header and Footer", tooltip: "Set header, footer, and first-page options for this section" },
    "writer.section.linkToPrevious": { label: "Link to Previous", tooltip: "Use the previous section's headers and footers" },
    "writer.section.differentFirstPage": { label: "Different First Page", tooltip: "Use a separate header and footer on the first page" },
    "writer.section.differentOddEven": { label: "Different Odd and Even Pages", tooltip: "Use separate headers and footers on odd and even pages" },
    "writer.pageNumber.format": { label: "Page Number Format", tooltip: "Continue or restart page numbering in this section" },
    "writer.section.delete": { label: "Delete Section Break", tooltip: "Delete the selected section break" },
    "writer.layout.sectionOptions": { label: "Section Options", tooltip: "Set headers, footers, and page numbering for this section" },
    "writer.layout.lineNumbers": { label: "Line Numbers", tooltip: "Line numbers for Word/LibreOffice: None, Continuous, Restart each page, Restart each section" },
    "writer.page.watermark": { label: "Watermark", tooltip: "Add or remove a background watermark" },
    "writer.page.color": { label: "Page Color", tooltip: "Set a solid page background color" },
    "writer.page.border": { label: "Page Borders", tooltip: "Add or change border around the page" },
    "writer.file.printPreview": { label: "Print Preview", tooltip: "Preview document before printing (Ctrl+F2)" },
    "writer.view.printLayout": { label: "Print Layout", tooltip: "Show page boundaries, headers, and footers" },
    "writer.view.webLayout": { label: "Web Layout", tooltip: "Flow document content continuously across the window" },
    "writer.view.readMode": { label: "Read Mode", tooltip: "Hide the ribbon and expand the reading area; press Esc to exit" },
    "writer.view.ruler": { label: "Ruler", tooltip: "Show or hide the ruler based on page setup" },
    "writer.view.gridlines": { label: "Gridlines", tooltip: "Show or hide non-printing alignment gridlines" },
    "writer.view.zoomIn": { label: "Zoom In", tooltip: "Increase document zoom" },
    "writer.view.zoomOut": { label: "Zoom Out", tooltip: "Decrease document zoom" },
    "writer.view.zoomReset": { label: "Reset", tooltip: "Reset document zoom to 100%" },
    "writer.view.zoom100": { label: "100%", tooltip: "Show the document at 100%" },
    "writer.view.pageWidth": { label: "Page Width", tooltip: "Fit the page width to the workspace" },
    "writer.view.newWindow": { label: "New Window", tooltip: "Open the document in a new browser window" },
    "writer.reference.tocInsert": { label: "Table of Contents", tooltip: "Insert a table of contents" },
    "writer.reference.tocUpdate": { label: "Update Table", tooltip: "Update the table of contents" },
    "writer.reference.footnoteInsert": { label: "Insert Footnote", tooltip: "Add a note at the bottom of the page (Ctrl+Alt+F)" },
    "writer.reference.endnoteInsert": { label: "Insert Endnote", tooltip: "Add a note at the end of the document (Ctrl+Alt+D)" },
    "writer.reference.citationStyle": { label: "Citation Style", tooltip: "Choose APA or MLA citation style" },
    "writer.reference.citationInsert": { label: "Insert Citation", tooltip: "Insert a citation from the source list" },
    "writer.reference.sourcesManage": { label: "Manage Sources", tooltip: "Add, edit, or delete document sources" },
    "writer.reference.bibliographyInsert": { label: "Bibliography", tooltip: "Insert a bibliography from cited sources" },
    "writer.reference.captionInsert": { label: "Insert Caption", tooltip: "Insert an auto-numbered caption for a picture, table, or equation" },
    "writer.reference.tofInsert": { label: "Insert Table of Figures", tooltip: "Insert a table of figures or tables from existing captions" },
    "writer.reference.tofUpdate": { label: "Update Table of Figures", tooltip: "Refresh the table of figures from captions in the document" },
    "writer.mailMerge.open": { label: "Select Recipients", tooltip: "Open mail merge recipient list from Excel (.xlsx, .xls) or CSV/TSV file" },
    "writer.mailMerge.insertField": { label: "Insert Merge Field", tooltip: "Insert a mail merge field" },
    "writer.mailMerge.preview": { label: "Preview Results", tooltip: "Preview merged records" },
    "writer.mailMerge.prevRecord": { label: "Previous Record", tooltip: "Go to previous record" },
    "writer.mailMerge.nextRecord": { label: "Next Record", tooltip: "Go to next record" },
    "writer.mailMerge.finish": { label: "Finish & Merge", tooltip: "Complete mail merge: generate new document or print directly" },
    "writer.mailings.envelopes": { label: "Envelopes", tooltip: "Add an envelope page with delivery and return addresses" },
    "writer.mailings.labels": { label: "Labels", tooltip: "Create a label sheet — one text or a record per cell from Mail Merge" }
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
      view: "View",
      help: "Help",
      ai: "3T AI Assistant"
    },
    group: {
      clipboard: "Clipboard",
      font: "Font",
      styles: "Styles",
      paragraph: "Paragraph",
      quickInsert: "Quick Insert",
      pages: "Pages",
      tables: "Tables",
      tablesIllustrations: "Tables & Illustrations",
      illustrations: "Illustrations",
      links: "Links",
      documentFormatting: "Document Formatting",
      headerFooter: "Header & Footer",
      text: "Text",
      symbols: "Symbols",
      tocNotes: "Table of Contents & Notes",
      pageSetup: "Page Setup",
      pageBackground: "Page Background",
      print: "Print",
      tableOfContents: "Table of Contents",
      footnotes: "Footnotes",
      citationsBibliography: "Citations & Bibliography",
      captions: "Captions",
      createMailings: "Create",
      startMerge: "Start Mail Merge",
      writeInsert: "Write & Insert Fields",
      previewResults: "Preview Results",
      finishMerge: "Finish",
      proofread: "Proofing",
      comments: "Comments",
      tracking: "Tracking",
      views: "Views",
      show: "Show",
      zoom: "Zoom",
      window: "Window",
      macro: "Macros",
      help: "Help",
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
      applyTo: "Apply to",
      thisSection: "This section",
      wholeDocument: "Whole document",
      apply: "Apply",
      cancel: "Cancel",
      close: "Close"
    },
    sections: {
      nextPage: "Section Break (Next Page)",
      continuous: "Section Break (Continuous)",
      evenPage: "Section Break (Even Page)",
      oddPage: "Section Break (Odd Page)",
      linkToPrevious: "Link to Previous",
      differentFirstPage: "Different First Page",
      differentOddEven: "Different Odd & Even Pages",
      pageNumbers: "Page Number Format",
      continueFromPrevious: "Continue from previous section",
      startAt: "Start at:",
      deleteSection: "Delete Section Break",
      numbering: "Page numbering",
      optionsTitle: "Section Header and Footer",
      defaultHeader: "Default header",
      firstHeader: "First-page header",
      evenHeader: "Even-page header",
      defaultFooter: "Default footer",
      firstFooter: "First-page footer",
      evenFooter: "Even-page footer",
      optionsDescription: "These settings apply only to the current section.",
      firstSection: "The first section cannot link to a previous section."
    },
    wordCount: {
      title: "Word Count",
      scopeDocument: "Statistics for the whole document",
      scopeSelection: "Statistics for the current selection",
      words: "Words",
      charsNoSpaces: "Characters (no spaces)",
      charsWithSpaces: "Characters (with spaces)",
      paragraphs: "Paragraphs",
      lines: "Lines",
      statusLabel: "{count} words"
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
    pageColor: {
      title: "Page Color",
      hint: "Choose a solid background for the editing canvas and printed page.",
      palette: "Page color palette",
      noColor: "No Color",
      custom: "Custom color:",
      cancel: "Cancel",
      apply: "Apply"
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
        blueOffice: "3T Office Blue",
        charcoal: "Charcoal",
        gray: "Neutral Gray",
        adminRed: "Official Red",
        green: "Green"
      }
    },
    caption: {
      title: "Insert Caption",
      label: "Label",
      position: "Position",
      text: "Caption",
      insert: "Insert",
      deleteTooltip: "Delete caption"
    },
    tof: {
      title: "Insert Table of Figures",
      captionLabel: "Caption label",
      updateBtn: "Update",
      updateTooltip: "Update table of figures",
      deleteTooltip: "Delete table of figures",
      empty: "No captions in the document yet. Insert picture or table captions, then update the list."
    },
    envelopes: {
      title: "Envelopes",
      hint: "Enter the delivery address and an optional return address, choose an envelope size, then add a separate page to the document.",
      delivery: "Delivery address",
      returnAddr: "Return address",
      omitReturn: "Omit return address",
      size: "Envelope size",
      position: "Page position",
      positionStart: "Start of document",
      positionEnd: "End of document",
      addToDocument: "Add to document",
      useMailMerge: "Use the current Mail Merge source",
      records: "records",
      deliveryRequired: "Enter a delivery address, or turn on the Mail Merge source."
    },
    labels: {
      title: "Labels",
      hint: "Type one label (every cell repeats it) or fill each cell from Mail Merge. Extra records add extra pages.",
      content: "Label text",
      layout: "Label layout",
      createPage: "New label page",
      useMailMerge: "Fill from Mail Merge source",
      records: "records",
      contentRequired: "Enter label text, or turn on the Mail Merge source."
    },
    mailMerge: {
      dataSourceTitle: "Mail Merge — Recipient Data Source (Excel / CSV)",
      pastePrompt: "Select an Excel (.xlsx, .xls) / CSV file, or paste table data below:",
      pasteSampleBtn: "📋 Paste Sample Data",
      noData: "No data",
      invalidCsv: "Invalid data (missing column headers)",
      foundData: "Found: {count} columns | {records} records",
      saveDataSource: "Save Data Source",
      insertFieldTitle: "Insert Merge Field",
      selectFieldPrompt: "Select field to insert into document:",
      insertBtn: "Insert Field",
      noDataWarningTitle: "Mail Merge Preview",
      noDataWarningMsg: "No mail merge data source found. Please open 'Select Recipients' to choose an Excel/CSV file first.",
      finishTitle: "Finish & Merge",
      finishNoData: "No mail merge data source to create documents. Please open 'Select Recipients' to select an Excel/CSV file.",
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
    },
    toc: {
      title: "TABLE OF CONTENTS",
      updateBtn: "🔄 Update",
      updateTooltip: "Update table of contents",
      deleteTooltip: "Delete table of contents",
      empty: "No headings found in document. Format paragraphs with Heading 1, 2, or 3 styles, then update the table of contents."
    },
    notes: {
      footnotePlaceholder: "Type footnote text...",
      endnotePlaceholder: "Type endnote text...",
      endnotesTitle: "ENDNOTES",
      deleteFootnote: "Delete footnote",
      deleteEndnote: "Delete endnote",
      jumpToNote: "Click to jump to footnote",
      jumpToEndnote: "Click to jump to endnote",
      jumpToRef: "Jump to reference"
    }
  },
  sheetFormatCells: {
    dialogTitle: "Format Cells",
    tabNumber: "Number",
    tabAlignment: "Alignment",
    tabFont: "Font",
    tabBorder: "Border",
    tabFill: "Fill",
    tabProtection: "Protection",
    categoryLabel: "Category:",
    sampleLabel: "Sample:",
    catGeneral: "General",
    catNumber: "Number",
    catCurrency: "Currency",
    catAccounting: "Accounting",
    catDate: "Date",
    catPercentage: "Percentage",
    catScientific: "Scientific",
    catText: "Text",
    catCustom: "Custom",
    generalDesc: "General format cells have no specific number format.",
    decimalPlaces: "Decimal places:",
    useThousands: "Use 1000 Separator (,)",
    negativeNumbers: "Negative numbers:",
    currencySymbol: "Symbol:",
    noSymbol: "(None)",
    accountingTitle: "Accounting Format Features:",
    accountingRule1: "Currency symbols line up at the left edge of the cell.",
    accountingRule2: "Numbers align to the right to line up decimal points.",
    accountingRule3: "Zero values display as a dash (-).",
    accountingRule4: "Negative numbers appear in parentheses: (1,234.00).",
    dateType: "Type:",
    dateLocale: "Locale: Vietnamese (Vietnam)",
    percentageDesc: "Percentage formats multiply the cell value by 100 and display the result with a percent symbol. Raw cell value remains unchanged. Typing numbers into a percentage-formatted cell will automatically divide by 100.",
    textDesc: "Text format cells are treated as text even when a number is in the cell. The cell is displayed exactly as entered and mathematical sum formulas ignore these cells.",
    customType: "Type:",
    textAlignment: "Text alignment",
    horizontal: "Horizontal:",
    vertical: "Vertical:",
    indent: "Indent:",
    textControl: "Text control",
    wrapText: "Wrap text",
    shrinkToFit: "Shrink to fit",
    mergeCells: "Merge cells",
    rightToLeft: "Right-to-left",
    textDirection: "Text direction:",
    directionContext: "Context - GAP",
    directionLtr: "Left-to-Right",
    directionRtl: "Right-to-Left",
    orientation: "Orientation",
    orientationDegrees: "Degrees:",
    alignGeneral: "General",
    alignLeft: "Left (Indent)",
    alignCenter: "Center",
    alignRight: "Right (Indent)",
    alignJustify: "Justify",
    alignFillGap: "Fill (GAP)",
    alignCenterContinuousGap: "Center Across Selection (GAP)",
    alignDistributedGap: "Distributed (GAP)",
    alignTop: "Top",
    alignMiddle: "Center",
    alignBottom: "Bottom",
    alignJustifyVGap: "Justify (GAP)",
    alignDistributedVGap: "Distributed (GAP)",
    gapNotSupported: "Feature not yet supported (GAP)"
  },
  macro: {
    record: "Record Macro",
    stop: "Stop Recording",
    manager: "View Macros",
    statusRecording: "Recording Macro...",
    statusHint: "Recording Macro... Press Ctrl+Shift+R to stop.",
    saveTitle: "Save Macro",
    savePrompt: "Enter a name for the recorded Macro:",
    savedNotice: "Macro saved",
    noActionsNotice: "No actions were recorded — Macro was not saved.",
    emptyCancelled: "Cancelled — Macro was not saved."
  }
};
