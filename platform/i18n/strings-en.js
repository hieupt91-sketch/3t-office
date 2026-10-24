/**
 * 3T Office Platform — English Strings Catalog (ESM)
 * Mirror của strings-vi.js — mọi key ở đây PHẢI có key tương ứng bên strings-vi.js.
 */

export const enStrings = {
  printDialog: {
    title: "Print document", untitled: "Untitled document", sheetScopeLegend: "Workbook scope",
    sheetActive: "Print active sheet", sheetWorkbook: "Print entire workbook", sheetSelection: "Print selection",
    sheetSelectionHelp: "Select the cells to print before opening this dialog.", pageRangeLegend: "Page range",
    writerScopeLegend: "Print scope", writerScopeAll: "Entire document", writerScopeCurrent: "Current page",
    writerScopeSelection: "Selection (highlighted text)", writerScopeSelectionHelp: "Select the text to print before opening this dialog.",
    slidesScopeLegend: "Slide scope", slidesScopeAll: "Print all slides", slidesScopeCurrent: "Current slide",
    slidesScopeSelection: "Selected slides", slidesScopeHidden: "Hidden slides", slidesScopeSelectionHelp: "Printing only selected or hidden slides is not available in this dialog.",
    allPages: "All ({count} pages)", currentPage: "Current page ({page})", customPages: "Pages",
    rangePlaceholder: "Example: 1-3,5", rangeLabel: "Enter pages to print", rangeHelp: "Use commas to select multiple ranges, for example 1-3,5."
  },
  documentPassword: {
    setTitle: "Encrypt with Password",
    openTitle: "Enter password to open file",
    password: "Password",
    confirm: "Re-enter password",
    warning: "If you forget the password, the file cannot be recovered. The password stays in application memory.",
    mismatch: "The passwords do not match. Enter them again.",
    invalid: "The password is invalid.",
    wrongPassword: "The password is incorrect. Try again.",
    cancel: "Cancel",
    apply: "Apply",
    open: "Open File",
    action: "Encrypt with Password",
    enabled: "The file will be encrypted when you save. Leave both fields empty and apply to remove the password.",
    removed: "The password has been removed for future saves.",
    hint: "The file is encrypted when you save and needs the password to open. A forgotten password cannot be recovered.",
    unavailable: "Could not set a password for this document. Save the document first, then try again."
  },
  legacyFileFormat: {
    docWarning: "Legacy file format (.doc): some formatting may change when saved. Save as .docx.",
    saveDocx: "Save as .docx",
    xlsWarning: "Legacy file format (.xls): some formatting or formulas may change when saved. Save as .xlsx.",
    saveXlsx: "Save as .xlsx"
  },
  writerTableProperties: {
    table: "Table", row: "Row", column: "Column", cell: "Cell", columnWidth: "Selected column width",
    setColumnWidth: "Set column width:", cm: "cm", verticalAlign: "Cell vertical alignment",
    top: "Top", center: "Center", bottom: "Bottom", marginScope: "Apply margins to:", wholeTable: "Whole table",
    selectedCells: "Selected cells", marginTop: "Top (cm):", marginBottom: "Bottom (cm):",
    marginLeft: "Left (cm):", marginRight: "Right (cm):"
  },
  app: {
    suiteName: "3T Office",
    writer: "Doc (Text Documents)",
    sheet: "Sheet (Spreadsheet)",
    slides: "Slide (Presentation)"
  },
  writerArrange: {
    wrapTitle: "Wrap Text", positionTitle: "Position", choosePosition: "Choose position…",
    alignTitle: "Align", chooseAlign: "Choose alignment…", height: "Height (px)", width: "Width (px)",
    forward: "Bring Forward", backward: "Send Backward", group: "Arrange & Size",
    wrap: { inline: "In line with text", square: "Square", tight: "Tight", behind: "Behind text", front: "In front of text", topBottom: "Top and bottom" },
    position: { topLeft: "Top Left", topCenter: "Top Center", topRight: "Top Right", middleLeft: "Middle Left", center: "Center", middleRight: "Middle Right", bottomLeft: "Bottom Left", bottomCenter: "Bottom Center", bottomRight: "Bottom Right" },
    align: { left: "Left", center: "Center", right: "Right", top: "Top", middle: "Middle", bottom: "Bottom" }
  },
  writerPicture: {
    adjustGroup: "Adjust",
    cropGroup: "Crop",
    change: "Change Picture…",
    reset: "Reset Picture",
    compress: "Compress Picture",
    corrections: "Brightness & Contrast…",
    crop: "Crop…"
  },
  writerTrackChanges: {
    showMarkup: "Show Markup",
    balloons: "Bong bóng",
    balloonsRevisions: "Show Revisions in Balloons",
    balloonsInline: "Show All Revisions Inline",
    balloonsCommentsOnly: "Show Only Comments and Formatting in Balloons"
  },
  writerStyles: {
    paneTitle: "Styles", paneHint: "Choose a style to apply to the current paragraph.", empty: "No paragraph styles in this document.", create: "Create a new style…", createTitle: "Create a new style from selection", createApply: "Create and apply", duplicate: "A style with this name already exists. Choose another name.",
    name: "Name", basedOn: "Based on", next: "Style for following paragraph", font: "Font", size: "Size (pt)", bold: "Bold", italic: "Italic", color: "Font color", alignment: "Alignment", left: "Left", center: "Center", right: "Right", justify: "Justified", spaceAfter: "After paragraph (pt)", lineSpacing: "Line spacing", leftIndent: "Left indent (pt)", firstLineIndent: "First line indent (pt)", normal: "Normal", characterStyle: "Character style"
  },
  writerDocumentProperties: {
    backstage: "Info",
    dialogTitle: "Document properties",
    title: "Title",
    creator: "Author",
    author: "Author",
    subject: "Subject",
    keywords: "Keywords",
    keywordsHint: "Separate multiple keywords with commas or semicolons.",
    description: "Comments",
    saved: "Document properties updated. Press Ctrl+S to save them to the file.",
    size: "Size",
    modified: "Modified",
    created: "Created",
    pages: "Pages",
    words: "Words",
    protectDocument: "Protect Document",
    protectDesc: "Control what types of changes people can make to this document.",
    markAsFinal: "Mark as Final",
    unmarkFinal: "Unmark Final",
    statusFinal: "MARKED AS FINAL",
    statusEditable: "Allow Editing",
    finalDescActive: "An author has marked this document as final to discourage editing. It is currently in soft read-only mode.",
    finalDescInactive: "Let readers know the document is final and set read-only to prevent accidental editing before sharing.",
    markAsFinalDesc: "Let readers know the document is final and prevent accidental editing.",
    isFinalStatus: "Marked as Final",
    editAnyway: "Edit Anyway",
    finalBanner: "MARKED AS FINAL — An author has marked this document as final to discourage editing.",
    inspectTitle: "Inspect Document",
    inspectBtn: "Inspect Document…",
    propertiesTitle: "Properties",
    editPropertiesBtn: "Edit…",
    editProperties: "Edit Detailed Properties…"
  },
  slidesDocumentProperties: {
    backstage: "Info", dialogTitle: "Presentation Properties", title: "Title", subject: "Subject", author: "Author", creator: "Author", manager: "Manager", company: "Company", keywords: "Tags", keywordsHint: "Separate keywords with commas", comments: "Comments", description: "Comments"
  },
  slidesInspector: {
    title: "Inspect Presentation", description: "Review information before sharing. Choose a category to remove it individually.", items: "items", remove: "Remove", personalInfo: "Document properties", comments: "Comments", speakerNotes: "Speaker notes", hiddenSlides: "Hidden slides", externalContent: "External content"
  },
  sheetDocumentProperties: {
    backstage: "Info",
    dialogTitle: "Workbook Properties",
    commandProperties: "Workbook Properties",
    title: "Title",
    creator: "Author",
    author: "Author",
    subject: "Subject",
    manager: "Manager",
    company: "Company",
    keywords: "Tags",
    keywordsHint: "Separate keywords with commas",
    description: "Comments",
    comments: "Comments",
    sheets: "Sheets",
    saved: "Workbook properties updated. Press Ctrl+S to save them to the file.",
    size: "Size",
    modified: "Modified",
    created: "Created",
    protectWorkbook: "Protect Workbook",
    markAsFinal: "Mark as Final",
    unmarkFinal: "Unmark Final",
    statusFinal: "MARKED AS FINAL",
    statusEditable: "Allow Editing",
    finalDescActive: "An author has marked this workbook as final to discourage editing. It is currently in soft read-only mode.",
    finalDescInactive: "Let readers know the workbook is final and set read-only to prevent accidental editing before sharing.",
    editAnyway: "Edit Anyway",
    finalBanner: "MARKED AS FINAL — An author has marked this workbook as final to discourage editing.",
    finalReadOnlyToast: "This workbook has been marked as final to discourage editing.",
    finalReadOnlyTooltip: "This workbook has been marked as final (read-only).",
    finalTitle: "Marked as Final",
    propertiesTitle: "Properties",
    editPropertiesBtn: "Edit…"
  },
  writerReview: {
    protectCommand: "Restrict Editing",
    unprotectCommand: "Stop Protection",
    protectTitle: "Restrict Editing",
    unprotectTitle: "Stop Protection",
    restrictionMode: "Restriction type",
    trackOnly: "Allow only edits with tracked changes",
    readOnly: "Read only",
    password: "Password",
    passwordConfirm: "Reenter password",
    passwordRequired: "Enter a password for stopping protection.",
    passwordMismatch: "The passwords do not match.",
    passwordWrong: "The password is incorrect or this file's password scheme is unsupported.",
    unprotectHint: "Enter the password that was set to allow normal editing.",
    noOpenPassword: "This password only stops editing restrictions; it does not encrypt the file or create a file-open password.",
    trackRequired: "This document requires every edit to be tracked. Stop protection before turning tracking off.",
    readOnlyBlocked: "This document is read only. Stop protection before changing its content.",
    trackedCommandBlocked: "This document only allows marked text changes. Stop protection to use formatting or object-insertion commands.",
    protected: "Editing restrictions enabled. Press Ctrl+S to save them to DOCX.",
    unprotected: "Editing restrictions removed. Press Ctrl+S to save the change.",
    protectFailedTitle: "Could not restrict editing",
    protectFailed: "Could not create the local password verifier.",
    cryptoUnavailable: "This device does not provide local password hashing.",
    compareFailedTitle: "Could not read the reference document",
    compareFailed: "Check the file and try again.",
    compareTooLarge: "The documents contain too many paragraphs to compare safely in this session.",
    noDifferencesTitle: "No differences",
    noDifferences: "The documents have the same paragraph content, so no result document was created.",
    compareComplete: "Result document created: {insertions} inserted paragraphs, {deletions} deleted paragraphs."
  },
  writerAutoCorrect: {
    optionsTitle: "Typing corrections",
    enabled: "Enable typing corrections in Doc",
    replaceText: "Replace text as you type",
    capitalizeSentences: "Capitalize the first letter of sentences",
    smartQuotes: "Replace straight quotation marks with smart quotation marks",
    smartDashes: "Replace two hyphens (--) with an en dash (–)",
    fractions: "Replace 1/2 with the fraction character (½)",
    replace: "Replace",
    with: "With",
    add: "Add row",
    remove: "Remove replacement row",
    reset: "Restore defaults",
    imeHint: "Corrections only process committed words; text currently being composed by a Vietnamese input method is left unchanged.",
    incompleteRow: "Each replacement row must contain both the Replace and With values.",
    replacementRequired: "Keep at least one replacement row or turn off Replace text as you type.",
    storageFailed: "Typing correction settings could not be saved. Check the application's data-storage permission."
  },
  quickAccess: {
    menuLabel: "Quick access toolbar",
    customize: "Customize Quick Access Toolbar",
    addTo: "Add to Quick Access Toolbar",
    removeFrom: "Remove from Quick Access Toolbar",
    reset: "Reset to default"
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
    customizeTheme: "Customize appearance (Theme)",
    appAppearance: "App appearance",
    documentAppearance: "Document appearance",
    themeSystem: "System",
    themeApply: "Apply",
    themeCancel: "Cancel",
    themeAccent: "App accent color",
    themeAccentHint: "Text on the accent color adjusts automatically to meet a 4.5:1 contrast ratio.",
    themeHeaderArea: "Title bar color",
    themeImageArea: "Title bar background image",
    themeImageTooLarge: "The optimized image is still too large to save (limit: 800,000 characters). Choose a smaller image.",
    themeHelpSearch: "app appearance title bar color",
    headerDefault: "Default (follow mode)",
    headerSolid: "Solid color",
    headerImage: "Image",
    customColor: "Custom color",
    chooseImage: "Choose image…",
    noImageChosen: "No image selected",
    headerPosition: "Image position (top ⇄ bottom)",
    headerDim: "Dark overlay (for readable text)",
    themeReset: "Reset to default",
    imageSelected: "New image selected",
    imageSaved: "Using saved image",
    imageReadError: "This image cannot be used.",
    headerFileType: "Choose a PNG, JPG, WEBP, GIF, or BMP image file.",
    headerFileTooLarge: "The original image is too large (maximum 25 MB). Choose a smaller image.",
    themeDark: "Dark Theme",
    themeLight: "Light Theme",
    notice: "Notice",
    confirm: "OK",
    promptRequired: "Please enter content before continuing.",
    featurePendingNotice: "This feature is being completed and will be available in the next update."
  },
  help: {
    panelTitle: "Help",
    searchPlaceholder: "Search a feature, e.g. Document Statistics",
    topicList: "Topic list",
    noResults: "No matching help topic.",
    pickTopic: "Select a feature in the list to read its guide.",
    location: "Location",
    stepsHeading: "How to use"
  },
  autoRecover: {
    settingsTitle: "AutoRecover",
    enabled: "Save recovery copies automatically",
    saveEvery: "Save every",
    minuteRange: "minutes (1–60)",
    showSaved: "View recovery copies",
    dialogTitle: "Recover unsaved documents",
    dialogDescription: "3T Office found automatic recovery copies from a session that did not close normally.",
    recover: "Recover",
    discard: "Discard",
    later: "Later",
    empty: "No recovery copies remain."
  },
  performance: {
    optionsTitle: "Options",
    logToggle: "Record performance log (not sent)",
    localOnly: "The log is stored on this device only; it is off by default.",
    openFolder: "Open log folder",
    enabledStatus: "Performance logging is on for this device.",
    disabledStatus: "Performance logging is off.",
    folderOpened: "Log folder opened.",
    desktopOnly: "This option is available in 3T Office Desktop."
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
    formulaFromDescInvalid: "The generated formula is not compatible with Sheet. Please try a different description.",
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
    recent: "Recent Files",
    close: "Close (Ctrl+W)",
    options: "Options",
    account: "Account and license",
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
    emptyRecentDesc: "Documents you create or edit will appear here for quick access.",
    exportConvert: "Export & Convert",
    exportConvertTitle: "Export & Convert File Formats",
    exportConvertSubtitle: "Export document to PDF or convert to other file formats with high Office compatibility.",
    officeCompatGroup: "Compatibility Options",
    officeCompat: "Office Compatibility",
    officeCompatDesc: "Optimize layout, encoding, and formatting for full fidelity when opened in Office suites.",
    exportPdfSection: "Export as PDF Document",
    exportConvertSection: "Convert to Other Formats",
    exportBtn: "Export...",
    exporting: "Exporting...",
    exportingStatus: "Exporting document to the selected format...",
    exportSuccess: "File exported successfully",
    exportSuccessMsg: "The file was successfully exported and saved to:",
    openFolder: "Open containing folder",
    openFolderTitle: "Open Containing Folder",
    openFolderFallback: "File path:",
    openFolderNotSupported: "(The current platform does not yet support opening the file manager directly.)",
    exportErrorTitle: "Cannot Export File",
    exportErrorGeneric: "An error occurred while exporting the file. Please verify write permissions and try again.",
    exportFormatUnsupported: "Unsupported export format:",
    exportFormatInvalid: "Invalid export format.",
    exportNoContent: "Unable to retrieve document content for export.",
    exportSuccessStatus: "File exported successfully:",
    exportCancelled: "Export cancelled.",
    formatPdfTitle: "PDF Document (.pdf)",
    formatPdfDesc: "Preserves layout, fonts, images, and print formatting across all devices; content cannot be edited directly.",
    formatXlsxTitle: "Office Spreadsheet (.xlsx)",
    formatXlsxDesc: "Preserves formulas, cell formats, tables, and multiple sheets compatible with modern Office.",
    formatXlsTitle: "Office 97-2003 Spreadsheet (.xls)",
    formatXlsDesc: "Compatible with older Office versions; limited to 65,536 rows and 256 columns, newer styles may be simplified.",
    formatOdsTitle: "OpenDocument Spreadsheet (.ods)",
    formatOdsDesc: "International open standard format; fully preserves cell structure, numerical data, and formulas.",
    formatCsvTitle: "Comma-Separated Values UTF-8 (.csv)",
    formatCsvDesc: "Saves raw text data of the active sheet only using UTF-8 encoding; does not preserve styles or formulas.",
    formatDocxTitle: "Office Document (.docx)",
    formatDocxDesc: "Preserves page layout, fonts, tables, shapes, and text formatting compatible with Office.",
    formatDocTitle: "Office 97-2003 Document (.doc)",
    formatDocDesc: "Compatible with older Office versions; maintains basic layout while simplifying advanced effects.",
    formatOdtTitle: "OpenDocument Text (.odt)",
    formatOdtDesc: "International open standard text format; preserves content structure, styles, and tables.",
    formatRtfTitle: "Rich Text Format (.rtf)",
    formatRtfDesc: "Preserves basic text and table formatting; widely compatible across many word processors and platforms.",
    formatTxtTitle: "Plain Text (.txt)",
    formatTxtDesc: "Saves raw UTF-8 text only; strips all fonts, images, tables, and page layout formatting.",
    formatPptxTitle: "Office Presentation (.pptx)",
    formatPptxDesc: "Preserves slide layout, shapes, colors, animations, and speaker notes compatible with Office.",
    formatPptTitle: "Office 97-2003 Presentation (.ppt)",
    formatPptDesc: "Compatible with older Office versions; newer shapes or effects may be converted to simpler forms.",
    formatOdpTitle: "OpenDocument Presentation (.odp)",
    formatOdpDesc: "International open standard presentation format; preserves slides, graphic objects, and presentation content."
  },
  dialog: {
    notice: "Notice",
    confirm: "Confirm",
    input: "Enter Data",
    findReplace: "Find and Replace"
  },
  findReplace: {
    dialogTitle: "Find and Replace",
    tabFind: "Find",
    tabReplace: "Replace",
    findWhat: "Find what:",
    findPlaceholder: "Enter text to find...",
    replaceWith: "Replace with:",
    replacePlaceholder: "Enter replacement text...",
    matchCase: "Match case",
    wholeWord: "Match whole word",
    matchCell: "Match entire cell contents",
    ignoreDiacritics: "Ignore diacritics",
    within: "Within:",
    scopeSheet: "Sheet",
    scopeWorkbook: "Workbook",
    searchBy: "Search:",
    byRows: "By Rows",
    byColumns: "By Columns",
    lookIn: "Look in:",
    lookInValues: "Values",
    lookInFormulas: "Formulas",
    btnFindPrev: "Find Previous",
    btnFindNext: "Find Next",
    btnReplace: "Replace",
    btnReplaceAll: "Replace All",
    btnClose: "Close",
    notFound: "Cannot find what you are looking for.",
    notFoundReplace: "Cannot find what to replace.",
    emptyInput: "Please enter text to find.",
    replacedCount: "All done. We made {count} replacements.",
    foundNext: "Found next match.",
    foundPrev: "Found previous match.",
    replacedOne: "Made 1 replacement.",
    useWildcards: "Use wildcards (*, ?)",
    btnFormat: "Format…",
    btnSpecial: "Special ▼",
    clearFormat: "No Formatting",
    fmtBold: "Bold",
    fmtItalic: "Italic",
    fmtFont: "Font:",
    fmtColor: "Color:",
    specParagraph: "Paragraph Mark (^p)",
    specTab: "Tab Character (^t)",
    specAnyChar: "Any Character (^?)",
    specWhitespace: "White Space (^w)",
    specCaret: "Caret Character (^^)",
    specFindWhat: "Find What Text (^&)"
  },
  sheetRibbon: {
    whatIfAnalysis: "What-If Analysis",
    tab: { home: "Home", formulas: "Formulas", data: "Data", insert: "Insert", pageLayout: "Page Layout", review: "Review", view: "View", help: "Help", ai: "3T AI Assistant", tableDesign: "Table Design" },
    group: { themes: "Themes", clipboard: "Clipboard", font: "Font", alignment: "Alignment", number: "Number", styles: "Styles", cells: "Cells", quickAnalysis: "Editing & Data", editing: "Editing", functionLibrary: "Function Library", definedNames: "Defined Names", formulaAuditing: "Formula Auditing", calculation: "Calculation", connections: "Connections", sortFilter: "Sort & Filter", dataTools: "Data Tools", outline: "Outline", pivotTable: "PivotTable", tables: "Tables", illustrations: "Illustrations", charts: "Charts", sparklines: "Sparklines", links: "Links", text: "Text", printArea: "Print Area", pageBreaks: "Page Breaks", pageSetup: "Page Setup", scaleToFit: "Scale to Fit", sheetOptions: "Sheet Options", proofing: "Proofing", comments: "Comments", protection: "Protect", workbookViews: "Workbook Views", show: "Show", zoom: "Zoom", window: "Window", macro: "Macros", help: "Help", aiAnalysis: "AI Data Analysis", properties: "Table Properties", tableStyleOptions: "Table Style Options", tableStyles: "Table Styles", filters: "Filters", tools: "Tools", arrange: "Arrange" },
    refreshAllSuccess: "Refreshed all links and external data.",
    editing: { fill: "Fill", clear: "Clear" },
    alignment: { orientation: "Orientation" },
    page: { themes: "Themes", themeColors: "Colors", themeFonts: "Fonts", margins: "Margins", orientation: "Orientation", size: "Size", fitWidth: "Width", fitHeight: "Height", marginNormal: "Normal", marginWide: "Wide", marginNarrow: "Narrow", marginCustom: "Custom Margins…", portrait: "Portrait", landscape: "Landscape", moreSizes: "More Paper Sizes…", fitAuto: "Automatic", fitPages1: "1 page", fitPages2: "2 pages", fitPages3: "3 pages", fitPages4: "4 pages", fitPages5: "5 pages", fitMore: "More Pages…" },
    cells: { format: "Format" },
    arrange: { bringForward: "Bring Forward", sendBackward: "Send Backward", align: "Align", group: "Group", rotate: "Rotate" },
    window: { freezePanes: "Freeze Panes", split: "Split" }
  },
  sheetThemes: {
    theme: {
      office: "Office",
      facet: "Facet",
      integral: "Integral",
      ion: "Ion",
      organic: "Organic",
      retrospect: "Retrospect",
      slice: "Slice",
      wisp: "Wisp"
    },
    palette: {
      office: "Office",
      office2007: "Office 2007 - 2010",
      grayscale: "Grayscale",
      facet: "Facet",
      integral: "Integral",
      ion: "Ion",
      organic: "Organic",
      retrospect: "Retrospect",
      slice: "Slice",
      wisp: "Wisp",
      blue: "Blue",
      green: "Green",
      red: "Red",
      violet: "Violet",
      orange: "Orange"
    },
    font: {
      office: "Office (Calibri Light / Calibri)",
      calibri: "Calibri",
      centuryGothic: "Century Gothic",
      garamond: "Garamond",
      bookman: "Bookman Old Style",
      arial: "Arial",
      timesNewRoman: "Times New Roman",
      georgia: "Georgia",
      trebuchet: "Trebuchet MS",
      corbel: "Corbel",
      candara: "Candara"
    }
  },
  sheetFormulaEntry: {
    status: { enter: "Enter", edit: "Edit", point: "Point" },
    referenceHint: "Click or drag across cells to insert references; press F2 to switch between Edit and Point.",
    formulaBarLabel: "Sheet Formula Bar"
  },
  sheetTableStyles: {
    catLight: "Light",
    catMedium: "Medium",
    catDark: "Dark",
    blue: "Blue Table",
    green: "Green Table",
    dark: "Dark Slate Table",
    orange: "Warm Orange Table",
    purple: "Modern Purple Table",
    tablestylelight1: "Light 1 (Gray)",
    tablestylelight2: "Light 2 (Blue)",
    tablestylelight3: "Light 3 (Teal)",
    tablestylelight4: "Light 4 (Olive Green)",
    tablestylelight5: "Light 5 (Purple)",
    tablestylelight6: "Light 6 (Light Blue)",
    tablestylelight7: "Light 7 (Orange)",
    tablestylemedium1: "Medium 1 (Gray)",
    tablestylemedium2: "Medium 2 (Blue)",
    tablestylemedium3: "Medium 3 (Orange)",
    tablestylemedium4: "Medium 4 (Green)",
    tablestylemedium5: "Medium 5 (Teal)",
    tablestylemedium6: "Medium 6 (Dark Blue)",
    tablestylemedium7: "Medium 7 (Lime Green)",
    tablestyledark1: "Dark 1 (Black)",
    tablestyledark2: "Dark 2 (Blue)",
    tablestyledark3: "Dark 3 (Orange)",
    tablestyledark4: "Dark 4 (Green)",
    tablestyledark5: "Dark 5 (Teal)",
    tablestyledark6: "Dark 6 (Purple)",
    tablestyledark7: "Dark 7 (Gray)"
  },
  sheetSlicer: { selectTable: "Select a cell in a table before inserting a visual filter.", layer: "Visual filters", aria: "Filter", multi: "Multi-select", clear: "Clear filter", close: "Remove visual filter" },
  slidesRibbon: {
    animationOptions: "Effect Options",
    pasteSpecial: "Paste Special", action: "Action", hyperlinkShortcut: "Link (Ctrl+K)",
    tab: { home: "Home", insert: "Insert", design: "Design", transitions: "Transitions", animations: "Animations", slideshow: "Slide Show", review: "Review", view: "View", help: "Help", ai: "3T AI Assistant", mediaPlayback: "Playback", chartDesign: "Chart Design", tableLayout: "Table Layout", tableDesign: "Table Design", shapeFormat: "Shape Format", pictureFormat: "Picture Format" },
    group: { pictureSize: "Size", pictureArrange: "Arrange", designVariants: "Variants", animPreview: "Preview", animEffects: "Animation", animTiming: "Timing", transitionGallery: "Transition to This Slide", transitionTiming: "Timing", shapeStyles: "Shape Styles", shapeArrange: "Arrange", shapeSize: "Size", mediaOptions: "Playback Options", chartType: "Type", chartData: "Data", tableCellSize: "Cell Size", tableAlignment: "Alignment", tableStyleOptions: "Table Style Options", tableStyles: "Table Styles", tableRowsCols: "Rows & Columns", tableMerge: "Merge", slides: "Slides", clipboard: "Clipboard", font: "Font", paragraph: "Paragraph", drawing: "Drawing", editing: "Editing", imagesObjects: "Images & Objects", images: "Images", illustrations: "Illustrations", tables: "Tables", text: "Text", links: "Links", symbols: "Symbols", media: "Media", themes: "Themes", master: "Slide Master", customize: "Customize", transitions: "Transition to This Slide", animations: "Animation", startSlideshow: "Start Slide Show", presenter: "Presenter Tools", setup: "Set Up", comments: "Comments", proofing: "Proofing", presentationViews: "Presentation Views", show: "Show", zoom: "Zoom", window: "Window", macro: "Macros", help: "Help", aiContent: "AI Presentation Content" },
    editing: { select: "Select" },
    drawing: { arrange: "Arrange" },
    section: "Section"
  },
  sheetArrayFormula: {
    editTitle: "Array formula",
    editPartError: "You cannot change part of an array. Select the entire array range, then enter it again with Ctrl+Shift+Enter."
  },
  sheetDialogs: {
    slicer: { title: "Insert visual filter", hint: "Choose one or more table columns to create floating filters.", columns: "Table columns", chooseColumn: "Choose at least one column." },
    editLinks: {
      title: "Edit Links",
      colSource: "Source",
      colType: "Type",
      colUpdate: "Update",
      colStatus: "Status",
      updateValues: "Update Values",
      changeSource: "Change Source...",
      openSource: "Open Source",
      breakLink: "Break Link",
      checkStatus: "Check Status",
      startupPrompt: "Startup Prompt...",
      location: "Location:",
      updateLabel: "Update:",
      modeAuto: "Automatic",
      modeManual: "Manual",
      empty: "This workbook does not contain any links to other workbooks.",
      noSelection: "No links",
      typeWorksheet: "Worksheet",
      statusUnknown: "Unknown",
      statusOk: "OK",
      statusOpen: "Source open",
      statusNotFound: "Error: Source not found",
      updatedMsg: "Updated values for link: {source}",
      promptNewSource: "Enter the new source file path or name:",
      openNotice: "Opening source file: {source}",
      breakConfirm: "Breaking links permanently converts existing formulas to their current values. Do you want to continue?",
      startupNotice: "Startup prompt: By default external links are not automatically refreshed to ensure offline security.",
      openingSource: "Opening source file: {source}"
    },
    deleteSheetMenu: "Delete sheet", deleteSheetConfirm: "Delete this sheet?", cannotDeleteLastSheet: "The last sheet cannot be deleted.",
    tabColorMenu: "Tab color", noTabColor: "No color", pasteSpecialKeepSource: "Keep source formatting", pasteSpecialText: "Keep text only",
    fillSeriesTitle: "Series", fillSeriesIn: "Series in", fillSeriesRows: "Rows", fillSeriesColumns: "Columns", fillSeriesType: "Type", fillSeriesLinear: "Linear", fillSeriesGrowth: "Growth", fillSeriesDate: "Date", fillSeriesDateUnit: "Date unit", fillSeriesUnitDay: "Day", fillSeriesUnitWeekday: "Weekday", fillSeriesUnitMonth: "Month", fillSeriesUnitYear: "Year", fillSeriesStep: "Step value", fillSeriesStop: "Stop value", fillSeriesBadStep: "Step value must be a number.", fillSeriesBadStart: "The first cell of the selection must contain a number (or a dd/mm/yyyy date for the Date type).", fillSeriesNothing: "Nothing to fill. Select the start cell plus the cells to fill, or enter a Stop value when only one cell is selected.", fillSeriesFailed: "Could not fill the series.", fillSeriesDone: "Filled {{count}} cells.",
    fillJustifyTitle: "Justify", fillJustifyOverflow: "Text will extend below selected range.", fillJustifyNoNumbers: "Cannot justify cells containing numbers or formulas.",
    calcOptions: {
      title: "Formula & Calculation Options",
      calcGroup: "Workbook Calculation",
      modeAuto: "Automatic",
      modeAutoNoTable: "Automatic except for data tables",
      modeManual: "Manual",
      recalcBeforeSave: "Recalculate workbook before saving",
      iterGroup: "Iterative Calculation",
      enableIteration: "Enable iterative calculation",
      maxIterations: "Maximum Iterations:",
      maxChange: "Maximum Change:",
      formulaGroup: "Working with formulas",
      r1c1Style: "R1C1 reference style",
      workbookGroup: "When calculating this workbook",
      precisionAsDisplayed: "Set precision as displayed",
      precisionDesc: "Permanently round stored numeric cell values and formula results to displayed format.",
      date1904: "Use 1904 date system",
      date1904Desc: "Calculate serial dates starting from January 1, 1904 instead of 1900.",
      precisionWarning: "Data will permanently lose accuracy according to displayed format. Do you want to continue?"
    },
    hideSheetMenu: "Hide Sheet", unhideSheetMenu: "Unhide Sheet...", unhideSheetTitle: "Unhide Sheet", unhideSheetChoose: "Choose a sheet to show:", unhideSheetAction: "Unhide", cannotHideLastSheet: "You cannot hide the last visible worksheet.", noHiddenSheets: "There are no hidden worksheets.",
    close: "Close", cancel: "Cancel", cancelLong: "Cancel", apply: "Apply", range: "Range", rangeLabel: "Range:", value: "Value", save: "Save",
    pasteSpecialTitle: "Paste Special", pasteSpecialGroup: "Paste", pasteSpecialSource: "Keep Source Formatting", pasteSpecialAll: "All", pasteSpecialValues: "Values", pasteSpecialFormulas: "Formulas", pasteSpecialFormats: "Formats", pasteSpecialComments: "Comments", pasteSpecialAllExceptBorders: "All except borders", pasteSpecialValidation: "Validation", pasteSpecialColumnWidths: "Column widths", pasteSpecialTranspose: "Transpose", pasteSpecialOperationGroup: "Operation", pasteSpecialOpNone: "None", pasteSpecialOpAdd: "Add", pasteSpecialOpSubtract: "Subtract", pasteSpecialOpMultiply: "Multiply", pasteSpecialOpDivide: "Divide", pasteSpecialSkipBlanks: "Skip blanks",
    mergeConfirmTitle: "Merge cells", mergeConfirmMessage: "Merging cells only keeps the upper-left value and discards other values.", mergeConfirmOk: "OK",
    functionTitle: "Insert Function", functionCategory: "Function category:", allCategory: "All", allFunctions: "All functions", mathFunctions: "Math & Trig", statsFunctions: "Statistical (AVERAGE, COUNT...)", logicFunctions: "Logical (IF, AND, OR...)", textFunctions: "Text (CONCAT, LEN...)", dateFunctions: "Date & Time (TODAY, NOW...)", financialFunctions: "Financial (PMT, FV, PV...)", lookupFunctions: "Lookup & Reference (VLOOKUP, INDEX...)", searchFunction: "Search for a function:", searchPlaceholder: "Type a brief description or function name...", insertFunction: "Insert Function",
    errorCheckingTitle: "Error Checking", noErrorsFound: "The error check is complete for the entire sheet. No errors were found.", errorsFoundPrompt: "Found <strong>{count}</strong> formula errors in the current sheet:", errorColCell: "Cell", errorColCode: "Error", errorColFormula: "Formula", errorColReason: "Reason", calcError: "Calculation error", divZero: "Division by zero or empty cell", invalidRef: "Invalid cell reference", wrongType: "Incorrect data type", naError: "Value not available", nameError: "Unrecognized formula or name", numError: "Numeric value out of range",
    watchWindowTitle: "Watch Window", addWatch: "Add Watch", deleteWatch: "Delete Watch", watchWindowColBook: "Book", watchWindowColSheet: "Sheet", watchWindowColName: "Name", watchWindowColCell: "Cell", watchWindowColValue: "Value", watchWindowColFormula: "Formula", watchWindowEmpty: "No watched cells.", addWatchTitle: "Add Watch", addWatchPrompt: "Select the cells that you would like to watch the value of:", addWatchBtn: "Add", deleteWatchConfirm: "Select a row in the table to delete watch.", watchWindowCountSuffix: "watched cell(s)", watchWindowKeyboardHint: "Shortcuts: Delete to remove, Enter to navigate, Esc to close", watchWindowInvalidCoord: "Invalid cell reference.", defineNameTitle: "Define Name", nameLabel: "Name:", refersTo: "Refers to:", useInFormulaTitle: "Paste Name", namePlaceholder: "e.g., Payroll, UnitPrice", scopeLabel: "Scope:", scopeWorkbook: "Workbook (Entire workbook)", invalidName: "The name is invalid or already exists.", useInFormulaPrompt: "Select a name to paste into the formula:",
    nameManagerTitle: "Name Manager", nameNew: "New...", nameEdit: "Edit...", nameDelete: "Delete", noNamedRanges: "No named ranges found.", invalidNameOrRef: "Name or reference is invalid or duplicate.",
    newComment: "New Comment {coord}", editComment: "Edit Comment {coord}", commentContent: "Comment", commentPlaceholder: "Enter a comment for {coord}", author: "Author", defaultAuthor: "3T Office User", saveChanges: "Save Changes", addComment: "Add Comment", deleteComment: "Delete Comment", emptyComment: "Comment text cannot be empty.",
    spellcheckTitle: "Spelling", spellcheckNotInDictionary: "Not in Dictionary:", spellcheckCell: "Cell", spellcheckContext: "Cell text", spellcheckSuggestions: "Suggestions:", spellcheckNoSuggestions: "(No close suggestions)", spellcheckIgnore: "Ignore Once", spellcheckIgnoreAll: "Ignore All", spellcheckAdd: "Add to Dictionary", spellcheckReplace: "Change", spellcheckReplaceAll: "Change All", spellcheckClose: "Close", spellcheckStatus: "Issue {current} of {total}", spellcheckComplete: "The spelling check is complete for the entire sheet. No misspellings were found.", spellcheckCompleteRemaining: "The spelling check is complete. No misspellings remain.",
    conditionalFormatting: "Conditional Formatting", cfCurrentRules: "Manage rules (top to bottom is priority order)", cfNoRules: "This sheet has no rules yet.", cfRemoveRule: "Delete", cfAddRule: "Add rule", cfNewRule: "New rule", cfSaveRule: "Save changes", cfRuleEditor: "Rule settings", rule: "Rule", cfHighlightCells: "Highlight cells", cfTopBottom: "Top, bottom, and average", cfVisual: "Visual formats", cfAdvanced: "Advanced", greaterThan: "Greater Than", lessThan: "Less Than", between: "Between", equalTo: "Equal To", blankCell: "Blanks", textContains: "Text Contains", dateOccurs: "A Date Occurring", duplicateValues: "Duplicate Values", topN: "Top N Items", bottomN: "Bottom N Items", topPercent: "Top Percentage", bottomPercent: "Bottom Percentage", aboveAverage: "Above Average", belowAverage: "Below Average", dataBar: "Data Bar", colorScale2: "2-Color Scale", colorScale3: "3-Color Scale", iconSet: "Icon Set", formulaRule: "Use a formula to determine cells", textValue: "Text to find", datePeriod: "Date period", rankCount: "Number of items (N)", rankPercent: "Percentage (%)", formula: "Formula", fillColor: "Fill Color", minimumColor: "Minimum color", midpointColor: "Midpoint color", maximumColor: "Maximum color", iconStyle: "Icon style", iconTrafficLights: "3 traffic lights", iconArrows3: "3 arrows", iconSymbols3: "3 symbols", iconArrows4: "4 arrows", iconRating4: "4 ratings", iconArrows5: "5 arrows", iconRating5: "5 ratings", reverseIconOrder: "Reverse icon order", yesterday: "Yesterday", today: "Today", tomorrow: "Tomorrow", last7Days: "Last 7 days", lastWeek: "Last week", thisWeek: "This week", nextWeek: "Next week", lastMonth: "Last month", thisMonth: "This month", nextMonth: "Next month", moveRuleUp: "Increase priority", moveRuleDown: "Decrease priority", invalidConditionalRule: "The rule range or parameters are invalid.", invalidNumber: "Enter a valid number.",
    dataValidation: "Data Validation", allow: "Allow", list: "List", numberRange: "Whole number range", listValues: "Source values (comma-separated)", listPlaceholder: "Approved, Rejected, In progress", minimum: "Minimum", maximum: "Maximum", invalidValidation: "The data validation settings are not valid.", resolveErrorToContinue: "Fix the error before applying.", inputRequired: "This field is required.", inputInvalidFormat: "Enter a value in the correct format.", inputOutOfRange: "Value is outside the allowed range.", chooseOption: "-- Select --", selectCellValue: "Select value for cell {col}{row}",
    validationSettings: "Settings", wholeNumber: "Whole number", decimal: "Decimal", date: "Date", time: "Time", textLength: "Text length", customFormula: "Custom (formula)", operator: "Operator", between: "between", notBetween: "not between", equal: "equal to", notEqual: "not equal to", greaterThan: "greater than", lessThan: "less than", greaterThanOrEqual: "greater than or equal to", lessThanOrEqual: "less than or equal to", formula: "Formula", allowBlank: "Ignore blank", inputMessage: "Input message", showInputMessage: "Show message when cell is selected", title: "Title", message: "Message", errorAlert: "Error alert", showErrorAlert: "Show alert after invalid data is entered", style: "Style", stop: "Stop", warning: "Warning", information: "Information", circleInvalid: "Circle invalid data", clearValidation: "Clear all", invalidCircled: "Cells that do not satisfy data validation rules are circled.", noValidationToClear: "The selection has no validation rule to clear.",
    removeDuplicatesTitle: "Remove Duplicates", myHeaderRow: "My data has headers", columnsToCompare: "Columns to compare", selectAtLeastOneColumn: "Select at least one column.", duplicatesRemovedResult: "{removed} duplicate values found and removed; {remaining} unique values remain.",
    customSortTitle: "Sort", customSortNeedsRange: "Custom Sort needs a range with at least two rows. Select a cell in the data range or select multiple cells before opening this command.", createNamesNeedsRange: "Create from Selection needs at least two rows: the first row supplies headers and the rows below supply data. Select both the headers and data, then try again.", createNamesNoHeaders: "No valid headers were found for creating names. Check the header row in the selected range.", addLevel: "Add Level", removeLevel: "Delete Level", sortBy: "Sort by", thenBy: "Then by", sortByColumn: "Sort column", sortOrder: "Order", sortAtoZ: "A to Z", sortZtoA: "Z to A",
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
    sparklineColumn: "Sparkline column", sparklineLine: "Sparkline line", sparklineWinLoss: "Sparkline win/loss",
    hfPresetLabel: "Preset", hfPresetCustom: "Custom", hfPresetPage: "Page X", hfPresetSheet: "Sheet name", hfPresetDate: "Date", hfPresetNone: "None", hfPresetPageVal: "Page &P", hfPresetSheetVal: "Sheet name: &A", hfPresetDateVal: "Date: &D", hfLeft: "Left", hfCenter: "Center", hfRight: "Right", headerFooterTitle: "Header / Footer", headerTitle: "Header", footerTitle: "Footer", hfDynamicCodesHint: "Dynamic codes: &P page number, &N total pages, &D date, &T time, &F file name, &A sheet name.",
    pivotTitle: "Create PivotTable", pivotSource: "Table/Range (first row contains headers)", loadFields: "Load Fields", chooseFields: "Choose the field layout:", pivotRows: "Rows", pivotColumns: "Columns", pivotValues: "Values", pivotFilters: "Filters", pivotFilterValues: "Select values to keep:", aggregateFor: "Summarize values by for {field}", sourceRangeFormat: "The source range must use a format such as A1:D20.", sourceRangeTooSmall: "The source range needs at least 2 rows and 1 column.", sourceNeedsHeaders: "The first row of the source range must contain headers.", uniqueHeaders: "Each source column must have a unique header.", selectValue: "Select at least one Values field.", columnNotFound: "Column {field} was not found.", sourceSheetNotFound: "The source worksheet was not found.", createPivotBtn: "Create PivotTable",
    changeDataSourceTitle: "Change PivotTable Data Source", changeDataSourceRange: "Table/Range:", pivotNotActive: "The active sheet does not contain a PivotTable.",
    pivotGroupTitle: "Grouping", pivotGroupField: "Field to group:", pivotGroupType: "Group type:", pivotGroupNumber: "Group by numbers", pivotGroupDate: "Group by dates", pivotGroupStart: "Starting at:", pivotGroupEnd: "Ending at:", pivotGroupBy: "By:", pivotGroupDays: "Days", pivotGroupMonths: "Months", pivotGroupQuarters: "Quarters", pivotGroupYears: "Years", pivotUngroupBtn: "Ungroup",
    pivotCalcFieldTitle: "Insert Calculated Field", pivotCalcFieldName: "Name:", pivotCalcFieldFormula: "Formula:", pivotCalcFieldFields: "Fields:", pivotCalcExisting: "Existing calculated fields:", pivotCalcFieldAdd: "Add / Modify", pivotCalcFieldModify: "Modify", pivotCalcFieldDelete: "Delete",
    chartDefaultTitle: "Data Chart", chartUnsupported: "Unsupported chart type: {type}", chartItem: "Item {number}", chartSeries: "Series {number}", chartNoNumericData: "The selected range contains no numeric data", chartPiePositive: "A pie chart requires positive values", chartInsertFrom: "Insert Chart from {range}", selectedRange: "selected range", chartType: "Chart Type", chartColumn: "Column", chartBarHorizontal: "Horizontal Bar", chartColumnStacked: "Stacked Column", chartColumnStacked100: "100% Stacked Column", chartLine: "Line", chartPie: "Pie", chartArea: "Area", chartScatter: "Scatter", chartCombo: "Combo", chartRadar: "Radar", chartBubble: "Bubble", insertIntoSheet: "Insert into Worksheet", chartTitle: "Chart title", chartTitlePlaceholder: "For example: Revenue by month", chartAxisTitles: "Titles", chartAxisTitlesEdit: "Edit Axis Titles", chartHorizontalAxis: "Horizontal (X) axis", chartVerticalAxis: "Vertical (Y) axis", chartAxisHorizontalPlaceholder: "For example: Month", chartAxisVerticalPlaceholder: "For example: Revenue", chartAxisApply: "Apply", chartDataLabels: "Show or hide data labels", chartDataLabelsShort: "Labels", chartSwitchRowsColumns: "Switch rows and columns", chartSwitchShort: "Rows/cols", chartTrendline: "Add or remove a linear trendline", chartTrendlineShort: "Trend", chartDelete: "Delete chart", splitVerticalSeparator: "Vertical window split", splitHorizontalSeparator: "Horizontal window split", insertedImageAlt: "Image inserted in the worksheet", deleteImage: "Delete image", imageFormatUnsupported: "Unsupported image format",
    sheetTab: "Sheet", printGridlines: "Print gridlines", printHeadings: "Print row and column headings", printComments: "Comments:", commentsNone: "(None)", commentsAtEnd: "At end of sheet", commentsAsDisplayed: "As displayed on sheet", cellErrors: "Cell errors as:", errorsDisplayed: "displayed", errorsBlank: "<blank>", errorsDash: "--", errorsNa: "#N/A", pageOrder: "Page order:", orderDownThenOver: "Down, then over", orderOverThenDown: "Over, then down",
    pageSetup: {
      title: "Page Setup", tabPage: "Page", tabMargins: "Margins", tabHeaderFooter: "Header / Footer", tabSheet: "Sheet",
      orientation: "Orientation", portrait: "Portrait", landscape: "Landscape", scaling: "Scaling", adjustTo: "Adjust to", fitTo: "Fit to", pagesWideBy: "page(s) wide by", pagesTall: "tall", autoDimensionHint: "Enter 0 for an automatic dimension.",
      paperSize: "Paper size", printQuality: "Print quality", firstPageNumber: "First page number", automatic: "Automatic",
      marginTop: "Top (cm)", marginBottom: "Bottom (cm)", marginLeft: "Left (cm)", marginRight: "Right (cm)", marginHeader: "Header (cm)", marginFooter: "Footer (cm)", centerOnPage: "Center on page", horizontally: "Horizontally", vertically: "Vertically",
      header: "Header", footer: "Footer", customHeader: "Custom header...", customFooter: "Custom footer...", left: "Left", center: "Center", right: "Right", dynamicCodesHint: "Dynamic codes: &P page number, &N total pages, &D date, &T time, &F file name, &A sheet name.",
      presetCustom: "Custom", presetNone: "(None)", presetPage: "Page X", presetPages: "Page X of Y", presetSheet: "Sheet name", presetFile: "File name", presetDate: "Date", presetPageValue: "Page &P", presetPagesValue: "Page &P / &N", presetSheetValue: "Sheet &A", presetFileValue: "File &F", presetDateValue: "Date &D",
      differentOddEven: "Different odd and even pages", differentFirst: "Different first page", scaleWithDocument: "Scale with document", alignWithMargins: "Align with page margins",
      printAreaAndTitles: "Print area and print titles", printArea: "Print area", rowsToRepeat: "Rows to repeat at top", colsToRepeat: "Columns to repeat at left", pickPrintArea: "Select print area on the grid", pickRows: "Select repeating rows on the grid", pickCols: "Select repeating columns on the grid", print: "Print", blackAndWhite: "Black and white", draftQuality: "Draft quality",
      selectPrintArea: "Select PRINT AREA", selectRows: "Select ROWS to repeat on each page", selectCols: "Select COLUMNS to repeat at left", selectAreaHint: "Select the cells to print, then choose Back to dialog.", selectTitlesHint: "Click row/column headers; hold Shift to extend.", backToDialog: "Back to dialog",
      invalidValue: "A page setup value is invalid.", invalidMargins: "Margins must be numbers from 0 to 25 cm.", invalidOrientation: "The page orientation is invalid.", invalidPaperSize: "The paper size is not supported.", invalidRows: "Repeating rows must look like 1 or 1:2.", invalidCols: "Repeating columns must look like A or A:B.", invalidScale: "Choose a valid scaling mode.", invalidScalePercent: "Scale must be an integer from 10 to 400%.", invalidFitPages: "Wide/tall page counts must be integers from 0 to 1000.", invalidPrintQuality: "Print quality must be from 72 to 2400 dpi.", invalidFirstPage: "First page number must be Automatic or an integer from 1 to 32767.", invalidPrintArea: "Print area must look like A1 or A1:H40."
    },
    cellStylesTitle: "Cell Styles Gallery", cellStylesHint: "Select a style to apply immediately to the selected cells:",
    formatAsTableTitle: "Format as Table", formatAsTableHint: "Create a named table with headers, filter buttons, banded rows, and automatic adjacent expansion.",
    formatTableRange: "Data range", formatTableHeaders: "My table has headers", formatTableNameLabel: "Table name", formatTableCreate: "Create table", formatTableRenameLabel: "New name", formatTableRename: "Rename table", formatTableConvert: "Convert to range", formatTableInvalid: "The range or table name is invalid, or the range overlaps another table.",
    resizeTableTitle: "Resize Table", resizeTableHint: "Select the new data range for your table (must include the same header row):", resizeTableInvalid: "The new data range is invalid or does not match the current table headers.",
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
    morphNoticeTitle: "Morph transition",
    morphUnsupported: "Morph is not fully supported yet. Choose a different transition effect.",
    animationDirection: "Effect direction", transitionDirection: "Transition direction", directionBottom: "From bottom", directionLeft: "From left", directionRight: "From right", directionTop: "From top", transPush: "Push", transFan: "Fan",
    pasteSpecialTitle: "Paste Special", pasteSource: "Keep source formatting", pasteTheme: "Use destination theme", pasteImage: "Picture (PNG)", pasteText: "Text only",
    actionTitle: "Action on click", actionType: "When this object is clicked", actionNone: "None", actionNext: "Next slide", actionPrevious: "Previous slide", actionFirst: "First slide", actionLast: "Last slide", actionSpecific: "Specific slide", actionWeb: "Open a web address", actionSlide: "Choose a slide", actionUrl: "Web address",
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
    printModeLegend: "Slide layout",
    printModeSlides: "Slides",
    printModeHandout: "Handouts",
    printModeNotes: "Notes pages",
    printSlidesPerPage: "Slides per sheet",
    masterTitle: "Slide Master", themeGalleryTitle: "Theme Gallery", themeGalleryHint: "Choose a theme to apply it immediately to the whole presentation.", themePreviewTitle: "Presentation title", themeCorporateBlue: "Corporate Blue", themeWarmTerracotta: "Warm Terracotta", themeMinimalMonochrome: "Minimal Monochrome", themeNaturalGreen: "Natural Green", themeModernCharcoal: "Modern Charcoal", themeEnergeticOrange: "Energetic Orange", slideSizeTitle: "Slide Size", slideSizeHint: "Choose a new aspect ratio. Existing shapes and objects will be scaled to fit.", slideSizeWide: "Widescreen", slideSizeStandard: "Standard", slideSizeCustom: "Custom", slideSizeWidthCm: "Width (cm)", slideSizeHeightCm: "Height (cm)", slideSizeApply: "Apply", slideSizeRangeError: "Each side must be between 2.54 cm and 142.24 cm.", slideSizeFormatError: "Enter a number, for example 25.4 or 19.05.", layoutTitle: "Choose a Slide Layout", transitionTitle: "Transitions", animationTitle: "Object Animations",
    applyMaster: "Apply Theme", applyLayout: "Apply Layout", applyTransition: "Apply Transition", applyAnimation: "Apply Animation", removeTransition: "Remove Transition", removeAnimation: "Remove Animation", previewTransition: "▶ Preview Transition", previewAnimation: "▶ Preview Animation", previewObject: "Preview Object",
    layoutHint: "Choose a layout to reshape the current slide's content structure:", applyLayoutAll: "Apply to All", applyLayoutCurrent: "Apply",
    masterHint: "Choose a style master to unify colors, fonts, and corner logo across all slides:", masterLogoLabel: "Organization / Corner Logo text:", masterLogoAria: "Organization name or corner logo text",
    transitionTypeLabel: "Transition effect:", transFade: "Fade", transSlide: "Slide", transWipe: "Wipe", transSplit: "Split", transCover: "Cover", transZoom: "Zoom", transFlip: "Flip 3D", durationFast: "Fast (0.3s)", durationNormal: "Medium (0.5s)", durationSlow: "Slow (0.8s)", durationVerySlow: "Very Slow (1.0s)", sampleSlide: "Sample Slide", applyTransitionCurrent: "Apply", applyTransitionAll: "Apply to All", transCustomKeep: "Keep the original effect from the file", transAdvanceLegend: "Advance Slide", transAdvanceClick: "On Mouse Click", transAdvanceAfter: "After", transAdvanceAfterSeconds: "Seconds before advancing automatically", transSecondsUnit: "seconds",
    animationTarget: "Apply to:", animationType: "Entrance animation:", animationDuration: "Duration:", animationDelay: "Delay:", noAnimation: "None", immediate: "Immediately (0s)",
    targetTitle: "Title", targetCol1: "Content Column 1", targetCol2: "Content Column 2", targetBody: "Content Body",     shapeFormatTitle: "Format Shape", shapeFormatMenu: "Format Shape…", shapeFill: "Fill", shapeFillColor: "Fill color {color}", shapeOutline: "Outline", shapeOutlineColor: "Outline color {color}", shapeNoOutline: "No outline", shapeLineWidth: "{width} px outline", shapeWidth: "Width (px)", shapeHeight: "Height (px)", shapeRotation: "Rotation (degrees)", applyShapeFormat: "Apply formatting", shapeFormatInvalid: "Enter dimensions from 24 px up to the slide size and a rotation from -360° to 360°.",
    shapeImage: "Image", shapeEllipse: "Ellipse", shapeRectangle: "Rectangle", animFadeIn: "Fade In", animFlyIn: "Fly In", animZoomIn: "Zoom In", animBounceIn: "Bounce In", animSlideLeft: "Slide Left", animSpin: "Spin (emphasis)", animGrowShrink: "Grow/Shrink (emphasis)", animFadeOut: "Fade Out (exit)", animFlyOut: "Fly Out (exit)", animZoomOut: "Zoom Out (exit)", animDisappear: "Disappear (exit)", animGroupEntrance: "Entrance", animGroupEmphasis: "Emphasis", animGroupExit: "Exit", durationVeryFast: "Very Fast (0.3s)", duration1s: "1.0 second", delay200: "After 0.2s", delay500: "After 0.5s", delay1000: "After 1.0s",
    presenterTitle: "Presenter View", presenterHeader: "PRESENTER VIEW", elapsedTime: "Elapsed presentation time", elapsedLabel: "ELAPSED:", actualClock: "Current clock time", clockLabel: "CLOCK:", presenterExit: "✕ End Show (Esc)", prevSlide: "◄ Previous", nextSlide: "Next ►", slideCounter: "Slide {current} of {total}", speakerNotesTitle: "📝 Speaker Notes", speakerNotesPlaceholder: "Enter notes for the presenter (visible only in Presenter View, hidden from the audience during the slide show)...", notesFontDec: "Decrease font size", notesFontInc: "Increase font size", nextSlideTitle: "⏭ Next Slide", noNotes: "(No notes for this slide. You can enter notes in the pane below canvas while editing).", endOfShow: "End of slide show.",
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
    tableSizeInputError: "Enter a whole number of rows and columns from 1 to 12.", diagramTitle: "Insert Diagram", diagramHint: "Choose a diagram type and number of boxes. You can edit text directly after insertion.", diagramNodeCount: "Number of boxes", diagramInsert: "Insert Diagram", diagramProcess: "Step Process", diagramCycle: "Cycle Process", diagramHierarchy: "Organization Hierarchy", diagramList: "Hierarchical List", diagramStep: "Step {number}", diagramItem: "Item {number}", diagramRoot: "Leader", diagramChild: "Department {number}",
    formatBackgroundTitle: "Format Background", formatBackgroundHint: "Change this slide's background. This does not replace the presentation theme.", formatBackgroundSolid: "Solid fill", formatBackgroundGradient: "Two-color gradient", formatBackgroundPicture: "Picture", formatBackgroundColor: "Fill color", formatBackgroundFrom: "Color 1", formatBackgroundTo: "Color 2", formatBackgroundDirection: "Direction", formatBackgroundHorizontal: "Horizontal", formatBackgroundVertical: "Vertical", formatBackgroundChoosePicture: "Choose picture…", formatBackgroundApplyCurrent: "Apply to this slide", formatBackgroundApplyAll: "Apply to all slides", formatBackgroundClear: "Remove custom background",
    spellcheckTitle: "Spelling", spellcheckNotInDictionary: "Not in Dictionary:", spellcheckLocation: "Location", spellcheckContext: "Text", spellcheckSuggestions: "Suggestions:", spellcheckNoSuggestions: "(No close suggestions)", spellcheckIgnore: "Ignore Once", spellcheckIgnoreAll: "Ignore All", spellcheckAdd: "Add to Dictionary", spellcheckReplace: "Change", spellcheckReplaceAll: "Change All", spellcheckClose: "Close", spellcheckStatus: "Issue {current} of {total}", spellcheckComplete: "The spelling check is complete for this slide. No misspellings were found.", spellcheckCompleteRemaining: "The spelling check is complete. No misspellings remain.", spellcheckFieldTitle: "Title", spellcheckFieldBody: "Body", spellcheckFieldBody2: "Second column", spellcheckFieldShape: "Shape",
    animationPaneTitle: "Animation Pane", animationPaneHint: "Every animation on the current slide. Reorder with Up/Down, choose how it starts, or remove the animation without deleting the object.", animationPaneEmpty: "This slide has no animations. Apply an object animation on the Animations tab, then open this pane to sequence them.", animStartLabel: "Start", animStartOnClick: "On Click", animStartWithPrevious: "With Previous", animStartAfterPrevious: "After Previous", animMoveUp: "Move up", animMoveDown: "Move down", animMoveUpShort: "↑", animMoveDownShort: "↓", animRemove: "Remove animation", animRemoveShort: "Remove", shapeWordArt: "WordArt", shapeChart: "Chart", shapeTable: "Table", shapeTextBox: "Text box",
    setupShowTitle: "Set Up Slide Show", setupShowHint: "Slide show options for this presentation. Loop until Esc applies immediately in F5. Default pen and laser pointer color during slide show (toggle with Ctrl+P, Ctrl+L).", setupShowLoop: "Loop continuously until Esc", setupShowUseTimings: "Use timings to advance slides automatically", setupShowNoNarration: "Show without narration", setupShowNoNarrationHint: "Slide does not have audio narration yet — this option only stores a flag and does not mute or hide audio.", setupShowPointerColor: "Pen / laser pointer color",
    selectionPaneRename: "Rename (double-click or F2)", selectionPaneHide: "Hide object", selectionPaneShow: "Show object", keepInkTitle: "Slide", keepInkPrompt: "Do you want to keep your ink annotations?", keepInkKeep: "Keep", keepInkDiscard: "Discard",
    slideshowNext: "Next", slideshowPrev: "Previous", slideshowPointerOptions: "Pointer Options", slideshowArrow: "Arrow", slideshowPen: "Pen", slideshowLaser: "Laser Pointer", slideshowPenColor: "Pen Color", slideshowEraseInk: "Erase Ink on Slide", slideshowEndShow: "End Show",
    showControls: "Slide show controls", showPrevious: "Previous slide (←)", showNext: "Next slide (Space or →)", showPen: "Pen (Ctrl+P)", showLaser: "Laser pointer (Ctrl+L)", showPenShort: "Pen", showLaserShort: "Laser", showExit: "End show (Esc)", showExitShort: "End",
    colorRed: "Red", colorBlue: "Blue", colorYellow: "Yellow", colorGreen: "Green", colorBlack: "Black"
  },
  commands: {
    "writer.file.properties": { label: "Document properties", tooltip: "View and edit the title, author, subject, keywords, and comments" },
    "writer.file.inspectDocument": { label: "Inspect Document", tooltip: "Inspect and remove comments, revisions, hidden text, and personal properties" },
    "writer.file.options": { label: "Options", tooltip: "Open Options: appearance, AutoCorrect and smart characters" },
    "writer.edit.select": { label: "Select", tooltip: "Select text or objects in the document" },
    "writer.edit.goTo": { label: "Go To", tooltip: "Jump to a page, line, heading, bookmark or footnote (Ctrl+G, F5)" },
    "writer.edit.pasteSpecial": { label: "Paste Special", tooltip: "Paste with advanced options (keep source formatting, plain text) (Ctrl+Alt+V)" },
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
    "sheet.page.themes": { label: "Themes", tooltip: "Change the overall design of the entire workbook including colors and fonts" },
    "sheet.page.themeColors": { label: "Colors", tooltip: "Change the color palette used for cell styles and charts in the workbook" },
    "sheet.page.themeFonts": { label: "Fonts", tooltip: "Change the heading and body font scheme for the entire workbook" },
    "sheet.page.margins": { label: "Margins", tooltip: "Set page margins for printed worksheets" },
    "sheet.page.orientation": { label: "Orientation", tooltip: "Switch between portrait and landscape layouts" },
    "sheet.page.size": { label: "Size", tooltip: "Choose paper size for printing" }
  ,"sheet.page.fitWidth": { label: "Width", tooltip: "Fit the printout to a number of pages wide (Automatic, 1-5 pages)" }, "sheet.page.fitHeight": { label: "Height", tooltip: "Fit the printout to a number of pages tall (Automatic, 1-5 pages)" },
    "sheet.page.printTitles": { label: "Print Titles", tooltip: "Specify rows and columns to repeat on each printed page" },
    "sheet.page.scale": { label: "Scale to Fit", tooltip: "Scale printed content by percentage or page count" },
    "sheet.page.headerFooter": { label: "Header & Footer", tooltip: "Set printable page headers and footers" },
    "sheet.help.open": { label: "Help", tooltip: "Open user guidance (F1)" },
    "writer.nav.docStart": { label: "Document Start", tooltip: "Go to the start of the document (Ctrl+Home)" },
    "writer.nav.docEnd": { label: "Document End", tooltip: "Go to the end of the document (Ctrl+End)" },
    "sheet.nav.home": { label: "First Cell", tooltip: "Go to cell A1 (Ctrl+Home)" },
    "sheet.nav.end": { label: "Last Data Cell", tooltip: "Go to the last cell containing data (Ctrl+End)" },
    "sheet.insert.sparklineLine": { label: "Line", tooltip: "Insert a line sparkline from the selected range; save the workbook to keep the change" },
    "sheet.insert.sparklineWinLoss": { label: "Win/Loss", tooltip: "Insert a win/loss sparkline: positive values as up bars, negative as down bars" },
    "sheet.insert.sparklineColumn": { label: "Column", tooltip: "Insert a column sparkline from the selected range; save the workbook to keep the change" },
    "sheet.insert.hyperlink": { label: "Link", tooltip: "Insert a hyperlink in the active cell (Ctrl+K)" },
    "sheet.insert.textbox": { label: "Text Box", tooltip: "Insert a floating text box" },
    "sheet.insert.symbol": { label: "Symbol", tooltip: "Insert a special character (Symbol)" },
    "common.file.new": { label: "New", tooltip: "Create a new document (Ctrl+N)" },
    "common.file.open": { label: "Open", tooltip: "Open an existing document (Ctrl+O)" },
    "common.file.save": { label: "Save", tooltip: "Save the current document (Ctrl+S)" },
    "common.file.saveAs": { label: "Save As", tooltip: "Save the document under a new name (F12)" },
    "common.file.passwordProtection": { label: "Encrypt with Password", tooltip: "Set or remove the file open password in File > Info" },
    "common.file.exportPdf": { label: "Export PDF", tooltip: "Export content to standard PDF format" },
    "common.file.exportConvert": { label: "Export & Convert", tooltip: "Export document to PDF or other file formats" },
    "common.file.print": { label: "Print", tooltip: "Print the document (Ctrl+P)" },
    "common.file.close": { label: "Close", tooltip: "Close the document (Ctrl+W)" },
    "common.help.about": { label: "About 3T Office", tooltip: "View version, copyright and open source licenses for 3T Office" },
    "common.macro.recordToggle": { label: "Record Macro", tooltip: "Start/Stop recording actions into a Macro (Ctrl+Shift+R)" },
    "common.macro.manager": { label: "View Macros", tooltip: "View, run, rename or delete recorded Macros (Alt+F8)" },
    "common.edit.undo": { label: "Undo", tooltip: "Undo the last action (Ctrl+Z)" },
    "common.edit.redo": { label: "Redo", tooltip: "Redo the last undone action (Ctrl+Y)" },
    "common.edit.repeat": { label: "Repeat", tooltip: "Repeat the last action (F4)" },
    "common.edit.cut": { label: "Cut", tooltip: "Cut the selected text or object to the clipboard (Ctrl+X)" },
    "common.edit.copy": { label: "Copy", tooltip: "Copy the selected text or object to the clipboard (Ctrl+C)" },
    "common.edit.paste": { label: "Paste", tooltip: "Paste clipboard content into the current selection or slide (Ctrl+V)" },
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
    ,"sheet.cell.insertLineBreak": { label: "Wrap Line in Cell", tooltip: "Insert line break within cell (Alt+Enter)" }
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
    ,"sheet.insert.time": { label: "Current Time", tooltip: "Insert the current time as a numeric value that can be calculated (Ctrl+Shift+;)" }
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
    ,"sheet.calc.modeAutoNoTable": { label: "Automatic Except Data Tables", tooltip: "Recalculate formulas automatically except for data tables" }
    ,"sheet.calc.modeManual": { label: "Manual", tooltip: "Recalculate formulas only when you press Calculate Now (F9)" }
    ,"sheet.calc.optionsDialog": { label: "Formula & Calculation Options", tooltip: "Open dialog to configure calculation and formula options" }
    ,"sheet.calc.calculateSheet": { label: "Calculate Sheet", tooltip: "Recalculate formulas in the active worksheet (Shift+F9)" }
    ,"sheet.calc.calculateNow": { label: "Calculate Now", tooltip: "Recalculate all formulas in the workbook immediately (F9)" }
    ,"sheet.calc.toggleR1C1": { label: "R1C1 Reference Style", tooltip: "Toggle between A1 and R1C1 reference styles" }
    ,"sheet.calc.toggleIterative": { label: "Iterative Calculation", tooltip: "Enable or disable iterative calculation for circular formulas" }
    ,"sheet.calc.togglePrecisionAsDisplayed": { label: "Precision as Displayed", tooltip: "Permanently round values to displayed number format" }
    ,"sheet.calc.toggleDate1904": { label: "1904 Date System", tooltip: "Switch workbook to use the 1904 date system" }
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
    ,"sheet.data.pivotChangeDataSource": { label: "Change Data Source", tooltip: "Change the source data range or table for the PivotTable" }
    ,"sheet.data.pivotGroup": { label: "Group", tooltip: "Group number or date fields in the PivotTable" }
    ,"sheet.data.pivotUngroup": { label: "Ungroup", tooltip: "Ungroup grouped fields in the PivotTable" }
    ,"sheet.data.pivotCalculatedField": { label: "Calculated Field", tooltip: "Add, modify, or delete calculated fields for the PivotTable" }
    ,"sheet.data.refreshAll": { label: "Refresh All", tooltip: "Update all links and external data sources (Ctrl+Alt+F5)" }
    ,"sheet.data.editLinks": { label: "Edit Links", tooltip: "View and manage all links to other workbooks or external files" }
    ,"sheet.view.normal": { label: "Normal", tooltip: "View worksheet in normal view" }
    ,"sheet.view.pageBreakPreview": { label: "Page Break Preview", tooltip: "Show where page breaks will occur in worksheet" }
    ,"sheet.view.pageLayout": { label: "Page Layout", tooltip: "View sheet as printed on paper with headers and footers" }
    ,"sheet.format.clearRulesSelection": { label: "Clear Rules from Selected Cells", tooltip: "Remove conditional formatting rules from the selected cells (rules outside the selection are kept)" }
    ,"sheet.format.clearRulesSheet": { label: "Clear Rules from Entire Sheet", tooltip: "Remove every conditional formatting rule from the current sheet" }
    ,"sheet.insert.shapes": { label: "Shapes", tooltip: "Insert a ready-made shape (rectangle, ellipse, triangle, arrow, star…) at the active cell" }
    ,"sheet.view.expandFormulaBar": { label: "Expand Formula Bar", tooltip: "Expand or collapse the formula bar to read long multi-line formulas (Ctrl+Shift+U)" }
    ,"sheet.view.formulaBar": { label: "Formula Bar", tooltip: "Show or hide the formula bar" }
    ,"sheet.view.toggleFormulas": { label: "Show Formulas", tooltip: "Show formulas in cells instead of calculated values (Ctrl+`)" }
    ,"sheet.view.freezePanes": { label: "Freeze Panes", tooltip: "Keep the rows above and columns to the left of the selected cell visible while scrolling" }
    ,"sheet.view.freezeTopRow": { label: "Freeze Top Row", tooltip: "Keep only row 1 visible while scrolling vertically" }
    ,"sheet.view.freezeFirstColumn": { label: "Freeze First Column", tooltip: "Keep only column A visible while scrolling horizontally" }
    ,"sheet.view.split": { label: "Split", tooltip: "Split the window at the selected cell without freezing panes" }
    ,"sheet.view.zoomIn": { label: "Zoom In", tooltip: "Increase the worksheet zoom level" }
    ,"sheet.view.zoomOut": { label: "Zoom Out", tooltip: "Decrease the worksheet zoom level" }
    ,"sheet.view.zoomReset": { label: "100%", tooltip: "Reset the worksheet zoom level to 100%" }
    ,"sheet.view.zoomToSelection": { label: "Zoom to Selection", tooltip: "Zoom worksheet to fit selected range" }
    ,"sheet.view.newWindow": { label: "New Window", tooltip: "Open a new window for the spreadsheet document" }
    ,"sheet.view.gridlines": { label: "Gridlines", tooltip: "Show or hide worksheet gridlines" }
    ,"sheet.view.headings": { label: "Headings", tooltip: "Show or hide row and column headings" }
    ,"sheet.review.spellCheck": { label: "Spelling", tooltip: "Check Vietnamese spelling in text cells of the current worksheet (F7)" }
    ,"sheet.review.toggleSpellCheck": { label: "Spell Check", tooltip: "Toggle Vietnamese inline spelling check on/off" }
    ,"sheet.review.commentInsert": { label: "New Comment", tooltip: "Add, edit, or delete a comment on the active cell" }
    ,"sheet.review.commentPrevious": { label: "Previous Comment", tooltip: "Go to the previous comment" }
    ,"sheet.review.commentNext": { label: "Next Comment", tooltip: "Go to the next comment" }
    ,"sheet.review.commentDelete": { label: "Delete Comment", tooltip: "Delete the selected comment" }
    ,"sheet.review.commentToggleVisible": { label: "Show/Hide Note", tooltip: "Show or hide the classic note box for the active cell" }
    ,"sheet.review.commentShowAll": { label: "Show All Notes", tooltip: "Show or hide all notes in the entire worksheet" }
    ,"sheet.review.commentResolve": { label: "Resolve Comment", tooltip: "Resolve or reopen the selected comment" }
    ,"sheet.file.properties": { label: "Workbook Properties", tooltip: "View and edit title, subject, author, manager, company, tags, and comments" }
    ,"sheet.file.markAsFinal": { label: "Mark as Final", tooltip: "Mark workbook as final and set read-only to prevent accidental editing" }
    ,"sheet.file.printPreview": { label: "Print Preview", tooltip: "Print Preview (Ctrl+F2)" }
    ,"sheet.page.setPrintArea": { label: "Set Print Area", tooltip: "Set the selected range as the print area" }
    ,"sheet.page.clearPrintArea": { label: "Clear Print Area", tooltip: "Clear the current worksheet's print area" }
    ,"sheet.page.insertPageBreak": { label: "Insert Page Break", tooltip: "Insert row and column page breaks at the active cell" }
    ,"sheet.page.removePageBreak": { label: "Remove Page Break", tooltip: "Remove row and column page breaks at the active cell" }
    ,"sheet.arrange.bringToFront": { label: "Bring to Front", tooltip: "Bring the selected object in front of all other objects" }
    ,"sheet.arrange.bringForward": { label: "Bring Forward", tooltip: "Bring the selected object forward one level" }
    ,"sheet.arrange.sendBackward": { label: "Send Backward", tooltip: "Send the selected object backward one level" }
    ,"sheet.arrange.sendToBack": { label: "Send to Back", tooltip: "Send the selected object behind all other objects" }
    ,"sheet.arrange.alignLeft": { label: "Align Left", tooltip: "Align selected objects to the left" }
    ,"sheet.arrange.alignCenter": { label: "Align Center", tooltip: "Align selected objects horizontally to the center" }
    ,"sheet.arrange.alignRight": { label: "Align Right", tooltip: "Align selected objects to the right" }
    ,"sheet.arrange.alignTop": { label: "Align Top", tooltip: "Align selected objects to the top" }
    ,"sheet.arrange.alignMiddle": { label: "Align Middle", tooltip: "Align selected objects vertically to the middle" }
    ,"sheet.arrange.alignBottom": { label: "Align Bottom", tooltip: "Align selected objects to the bottom" }
    ,"sheet.arrange.distributeHorizontal": { label: "Distribute Horizontally", tooltip: "Distribute selected objects evenly horizontally" }
    ,"sheet.arrange.distributeVertical": { label: "Distribute Vertically", tooltip: "Distribute selected objects evenly vertically" }
    ,"sheet.arrange.bringForwardMenu": { label: "Bring Forward", tooltip: "Options to bring the selected object forward" }
    ,"sheet.arrange.sendBackwardMenu": { label: "Send Backward", tooltip: "Options to send the selected object backward" }
    ,"sheet.arrange.alignMenu": { label: "Align", tooltip: "Align selected objects" }
    ,"sheet.arrange.groupMenu": { label: "Group", tooltip: "Group or ungroup selected objects" }
    ,"sheet.arrange.rotateMenu": { label: "Rotate", tooltip: "Rotate or flip the selected object" }
    ,"sheet.arrange.group": { label: "Group", tooltip: "Group selected objects together" }
    ,"sheet.arrange.ungroup": { label: "Ungroup", tooltip: "Ungroup the selected group of objects" }
    ,"sheet.arrange.rotateRight90": { label: "Rotate Right 90°", tooltip: "Rotate the selected object 90 degrees to the right" }
    ,"sheet.arrange.rotateLeft90": { label: "Rotate Left 90°", tooltip: "Rotate the selected object 90 degrees to the left" }
    ,"sheet.arrange.flipHorizontal": { label: "Flip Horizontal", tooltip: "Flip the selected object horizontally" }
    ,"sheet.arrange.flipVertical": { label: "Flip Vertical", tooltip: "Flip the selected object vertically" }
    ,"sheet.view.selectionPane": { label: "Selection Pane", tooltip: "Show or hide the selection pane to manage objects on the sheet" }
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
    ,"sheet.sheet.hide": { label: "Hide Sheet", tooltip: "Hide the current worksheet tab" }
    ,"sheet.sheet.unhide": { label: "Unhide Sheet...", tooltip: "Choose a hidden worksheet to show again" }
    ,"sheet.sheet.protect": { label: "Protect Sheet...", tooltip: "Lock cell edits, formatting, and row/column deletion on the current sheet (UI lock, not real security)" }
    ,"sheet.workbook.protect": { label: "Protect Workbook...", tooltip: "Lock workbook structure: no adding, deleting, renaming, moving, or copying sheets. Does not lock cell contents (UI lock, not real security)" }
    ,"sheet.chart.insert": { label: "Chart", tooltip: "Insert a chart to visualize data" }
    ,"sheet.chart.pivotChart": { label: "PivotChart", tooltip: "Insert a Column or Pie chart linked to summarized Pivot data" }
    ,"sheet.insert.image": { label: "Pictures", tooltip: "Insert a picture at the selected cell" }
    ,"sheet.style.formatAsTable": { label: "Format as Table", tooltip: "Create a named table with filters and automatic expansion" }
    ,"sheet.table.resize": { label: "Resize Table", tooltip: "Change the data range of the table" }
    ,"sheet.table.toggleHeaderRow": { label: "Header Row", tooltip: "Turn on or off the table header row" }
    ,"sheet.table.toggleTotalRow": { label: "Total Row", tooltip: "Turn on or off the table total row" }
    ,"sheet.table.toggleBandedRows": { label: "Banded Rows", tooltip: "Display alternating row shading in the table" }
    ,"sheet.table.toggleFirstColumn": { label: "First Column", tooltip: "Apply special formatting to the first column of the table" }
    ,"sheet.table.toggleLastColumn": { label: "Last Column", tooltip: "Apply special formatting to the last column of the table" }
    ,"sheet.table.toggleBandedColumns": { label: "Banded Columns", tooltip: "Display alternating column shading in the table" }
    ,"sheet.table.toggleFilterButton": { label: "Filter Button", tooltip: "Toggle filter drop-down buttons in the header row" }
    ,"sheet.table.styles": { label: "Table Styles", tooltip: "Choose a pre-designed table style with colors and borders" }
    ,"sheet.table.insertSlicer": { label: "Insert Visual Filter", tooltip: "Filter a table quickly with floating value buttons" }
    ,"sheet.table.convertToRange": { label: "Convert to Range", tooltip: "Convert the table into a regular cell range while keeping formats" }
    ,"sheet.style.cellStyles": { label: "Cell Styles", tooltip: "Open cell styles gallery (Normal, Good, Bad, Neutral...)" }
    ,"sheet.edit.goTo": { label: "Go To...", tooltip: "Jump to a cell, range or defined name (F5 or Ctrl+G)" }
    ,"sheet.edit.goToSpecial": { label: "Go To Special...", tooltip: "Select cells by type: comments, formulas, blanks, current region..." }
    ,"sheet.edit.fillDown": { label: "Fill Down", tooltip: "Fill down from the cell above (Ctrl+D)" }
    ,"sheet.edit.fillRight": { label: "Fill Right", tooltip: "Fill right from the cell to the left (Ctrl+R)" }
  ,"sheet.edit.fillUp": { label: "Fill Up", tooltip: "Fill up from the bottom cell of the selection" }
  ,"sheet.edit.fillLeft": { label: "Fill Left", tooltip: "Fill left from the right-most column of the selection" }
  ,"sheet.edit.fillSeries": { label: "Series...", tooltip: "Fill a number or date series: linear, growth, day/month/year" }
    ,"sheet.edit.clearAll": { label: "Clear All", tooltip: "Clear all contents, formulas, and formatting from selected cells" }
    ,"sheet.edit.clearFormats": { label: "Clear Formats", tooltip: "Clear cell formatting back to default while keeping contents" }
  ,"sheet.data.clearFilter": { label: "Clear Filter", tooltip: "Remove every filter on the sheet and show all rows again" }
  ,"sheet.data.reapplyFilter": { label: "Reapply", tooltip: "Filter the list again with the current conditions (use after the data changed)" }
  ,"sheet.data.advancedFilter": { label: "Advanced", tooltip: "Filter with a criteria range (several AND/OR conditions), in place or copy the result elsewhere" }
  ,"sheet.edit.fillAcrossSheets": { label: "Across Worksheets...", tooltip: "Copy the selected range to the grouped worksheets (hold Ctrl and click the sheet tabs to group them)" }
  ,"sheet.edit.fillJustify": { label: "Justify", tooltip: "Reflow text lines in the selected range to fit the column width" }
  ,"sheet.edit.clearComments": { label: "Clear Notes", tooltip: "Remove the notes (comments) from the selected cells and keep the cell contents" }
  ,"sheet.edit.clearHyperlinks": { label: "Clear Hyperlinks", tooltip: "Remove hyperlinks from the selected cells and keep the text" }
    ,"sheet.edit.clearContents": { label: "Clear Contents", tooltip: "Clear cell contents and formulas while keeping formatting" }
    ,"slides.review.toggleComments": { label: "Show Comments", tooltip: "Show or hide the comments pane of the current slide" }
    ,"slides.review.commentInsert": { label: "New Comment", tooltip: "Add a comment to the current slide" }
    ,"slides.review.commentPrevious": { label: "Previous Comment", tooltip: "Go to the previous comment" }
    ,"slides.review.commentNext": { label: "Next Comment", tooltip: "Go to the next comment" }
    ,"slides.review.commentDelete": { label: "Delete Comment", tooltip: "Delete the selected comment" }
    ,"slides.review.commentResolve": { label: "Resolve Comment", tooltip: "Resolve or reopen the selected comment" }
    ,"slides.review.spellCheck": { label: "Spelling", tooltip: "Check Vietnamese spelling on the current slide (F7)" }
    ,"slides.review.toggleSpellCheck": { label: "Spell Check", tooltip: "Toggle Vietnamese inline spelling check on/off" }
    ,"slides.edit.formatPainter": { label: "Format Painter", tooltip: "Copy text or shape formatting to another object. Double-click to lock and apply multiple times. Esc to cancel." }
    ,"slides.edit.selectAll": { label: "Select All", tooltip: "Select every shape on the current slide" }
    ,"slides.edit.selectObjects": { label: "Select Objects", tooltip: "Select drawing objects on the current slide (excluding connectors)" }
    ,"slides.slide.new": { label: "New Slide", tooltip: "Insert a new slide (Ctrl+M)" }
    ,"slides.layout.apply": { label: "Layout", tooltip: "Change the slide layout (Title, Content, Two Content, Blank)" }
    ,"slides.layout.select": { label: "Choose Layout", tooltip: "Open the slide layout gallery" }
    ,"slides.layout.reset": { label: "Reset Layout", tooltip: "Reapply the current layout to placeholders while keeping their content" }
    ,"slides.slide.duplicate": { label: "Duplicate Slide", tooltip: "Duplicate the selected slide (Ctrl+D)" }
    ,"slides.slide.delete": { label: "Delete Slide", tooltip: "Delete the selected slide (Delete)" }
    ,"slides.slide.toggleHidden": { label: "Hide Slide", tooltip: "Hide or show the selected slide during F5. The slide stays in the file and Slide Sorter." }
    ,"slides.context.copy": { label: "Copy Slide", tooltip: "Copy this slide to the in-app slide clipboard" }
    ,"slides.context.cut": { label: "Cut Slide", tooltip: "Move this slide to the in-app slide clipboard" }
    ,"slides.context.paste": { label: "Paste Slide", tooltip: "Insert the copied slide after this slide" }
    ,"slides.context.hide": { label: "Hide Slide", tooltip: "Hide or show this slide during the slide show" }
    ,"slides.context.moveUp": { label: "Move Up", tooltip: "Move this slide one position earlier" }
    ,"slides.context.moveDown": { label: "Move Down", tooltip: "Move this slide one position later" }
    ,"slides.context.sort": { label: "Slide Sorter", tooltip: "Open the slide grid to review and reorder slides" }
    ,"slides.context.layout": { label: "Layout", tooltip: "Change the layout of this slide" }
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
  ,"slides.table.insertRowAbove": { label: "Insert Row Above", tooltip: "Insert an empty row above the row with the cursor" }
  ,"slides.table.insertRowBelow": { label: "Insert Row Below", tooltip: "Insert an empty row below the row with the cursor" }
  ,"slides.table.insertColLeft": { label: "Insert Column Left", tooltip: "Insert an empty column to the left of the column with the cursor" }
  ,"slides.table.insertColRight": { label: "Insert Column Right", tooltip: "Insert an empty column to the right of the column with the cursor" }
  ,"slides.table.deleteRow": { label: "Delete Row", tooltip: "Delete the row with the cursor" }
  ,"slides.table.deleteCol": { label: "Delete Column", tooltip: "Delete the column with the cursor" }
  ,"slides.table.deleteTable": { label: "Delete Table", tooltip: "Delete the whole selected table" }
  ,"slides.table.mergeCells": { label: "Merge Cells", tooltip: "Merge the selected cells (click the first cell, hold Shift and click the last) into one" }
  ,"slides.table.splitCell": { label: "Split Cells", tooltip: "Split a merged cell back into its original cells" }
    ,"slides.insert.chart": { label: "Chart", tooltip: "Insert a chart into the active slide" }
    ,"slides.insert.headerFooter": { label: "Header & Footer", tooltip: "Show or hide date, slide number, and footer" }
    ,"slides.insert.dateTime": { label: "Date & Time", tooltip: "Insert an auto-updating date and time placeholder" }
    ,"slides.insert.slideNumber": { label: "Slide Number", tooltip: "Insert an auto-updating slide number placeholder" }
    ,"slides.insert.symbol": { label: "Symbol", tooltip: "Insert a special character into the selected text box" }
  ,"slides.insert.hyperlink": { label: "Link", tooltip: "Insert a hyperlink (Ctrl+K)" }
  ,"slides.edit.pasteSpecial": { label: "Paste Special", tooltip: "Choose how to paste clipboard content (Ctrl+Alt+V)" }
  ,"slides.insert.action": { label: "Action", tooltip: "Set what happens when an object is clicked during a show" }
  ,"slides.animation.effectOptions": { label: "Effect Options", tooltip: "Choose the direction of the selected effect" }
    ,"slides.insert.wordart": { label: "WordArt", tooltip: "Insert stylized title text with outline, shadow, or gradient fill" }
    ,"slides.master.apply": { label: "Slide Master", tooltip: "Apply a Slide Master theme across the presentation" }
    ,"slides.design.themeGallery": { label: "Themes", tooltip: "Choose a design theme for the whole presentation" }
    ,"slides.design.slideSize": { label: "Slide Size", tooltip: "Choose 16:9, 4:3 or enter a custom size (cm)" }
    ,"slides.design.formatBackground": { label: "Format Background", tooltip: "Change the current slide or all slides to a solid color, two-color gradient, or picture" }
    ,"slides.transition.gallery": { label: "Transition Effects", tooltip: "Choose how this slide appears (None, Fade, Push, Zoom, Flip, Morph)" }
  ,"slides.transition.set": { label: "Effect", tooltip: "Set the transition of the current slide" }
  ,"slides.transition.durationMenu": { label: "Duration", tooltip: "Set how long the transition runs" }
  ,"slides.transition.duration": { label: "Transition Duration", tooltip: "Pick 0.3 / 0.5 / 0.8 / 1 / 2 seconds for the transition" }
  ,"slides.transition.advanceMenu": { label: "Advance Slide", tooltip: "Allow or disallow advancing by mouse click" }
  ,"slides.transition.advanceClick": { label: "On Mouse Click", tooltip: "Turn advancing on mouse click on or off during the show" }
  ,"slides.transition.afterMenu": { label: "After", tooltip: "Automatically advance after a number of seconds" }
  ,"slides.transition.advanceAfter": { label: "Advance After", tooltip: "Set the seconds before the slide advances (or turn it off)" }
  ,"slides.transition.applyAll": { label: "Apply To All", tooltip: "Use this slide's transition settings on every slide" }
  ,"slides.transition.preview": { label: "Preview", tooltip: "Play the current slide's transition" }
  ,"slides.font.dialog": { label: "Font…", tooltip: "Open the Font dialog: font, style, size, color, underline, effects, character spacing (Ctrl+T)" }
  ,"slides.font.spacing": { label: "Character Spacing", tooltip: "Expand or condense the spacing between characters of the selected text" }
  ,"slides.font.setSpacing": { label: "Spacing Level", tooltip: "Pick a spacing level: very tight, tight, normal, loose, very loose" }
  ,"slides.shape.galleryInsert": { label: "Shapes", tooltip: "Pick a ready-made shape to insert (Insert tab)" }
  ,"slides.shape.gallery": { label: "Shapes", tooltip: "Pick a ready-made shape (rectangle, triangle, star, arrow, heart...) to insert" }
  ,"slides.shape.insertPreset": { label: "Insert Shape", tooltip: "Insert the chosen ready-made shape" }
  ,"slides.shape.changeType": { label: "Change Shape", tooltip: "Switch the selected shape to another shape, keeping position, size and colors" }
  ,"slides.shape.setType": { label: "New Shape", tooltip: "Apply the chosen shape to the selected shape" }
  ,"slides.text.changeCase": { label: "Change Case", tooltip: "Change the case of the selected text (Shift+F3 cycles)" }
  ,"slides.text.changeCaseMode": { label: "Case Style", tooltip: "Pick a style: sentence case, lowercase, UPPERCASE, capitalize each initial, or toggle case" }
  ,"slides.design.themeColors": { label: "Theme Colors", tooltip: "Change the theme color set for the whole deck (title, body, accent, background)" }
  ,"slides.design.setThemeColors": { label: "Color Set", tooltip: "Apply the chosen color set to the whole deck" }
  ,"slides.design.themeFonts": { label: "Theme Fonts", tooltip: "Change the theme font for the whole deck" }
  ,"slides.design.setThemeFonts": { label: "Font Set", tooltip: "Apply the chosen font to the whole deck" }
  ,"slides.picture.crop": { label: "Crop", tooltip: "Crop the selected picture to an aspect ratio or enter crop amounts per edge" }
  ,"slides.picture.cropDrag": { label: "Crop by Dragging Edges", tooltip: "Turn on crop mode: drag a handle on an edge or corner of the picture to cut away the outside (Esc or Enter to finish)" }
  ,"slides.picture.cropRatio": { label: "Crop to Ratio", tooltip: "Crop the selected picture to the chosen aspect ratio (centered), or reset the crop" }
  ,"slides.picture.cropDialog": { label: "Crop Amounts…", tooltip: "Enter the crop percentage for the left, right, top and bottom edges" }
  ,"slides.view.notesPage": { label: "Notes Page", tooltip: "View each slide with the speaker notes as a printed page" }
  ,"slides.view.outline": { label: "Outline View", tooltip: "View and edit the titles and text of every slide as an outline" }
  ,"slides.design.hideBackground": { label: "Hide Background Graphics", tooltip: "Hide the master graphics and logo on the current slide (toggle)" }
  ,"slides.edit.selectionPane": { label: "Selection Pane", tooltip: "Open a list of every object on the slide to select it quickly and change layer order (Alt+F10)" }
  ,"slides.transition.apply": { label: "Transitions", tooltip: "Apply a slide transition (Fade, Push, Zoom, Flip)" }
    ,"slides.animation.preview": { label: "Preview", tooltip: "Play the current slide's animations on the slide" }
  ,"slides.animation.gallery": { label: "Effect", tooltip: "Pick an entrance, emphasis or exit effect for the selected object" }
  ,"slides.animation.add": { label: "Add Animation", tooltip: "Add one more effect to the selected object (for example entrance then exit)" }
  ,"slides.animation.addEffect": { label: "Add Effect", tooltip: "Append the chosen effect to the object's animation sequence" }
  ,"slides.animation.trigger": { label: "Trigger", tooltip: "Pick the shape that starts this effect when clicked during the slide show" }
  ,"slides.table.style": { label: "Table Styles", tooltip: "Choose a color scheme for the table: header and banded row colors" }
  ,"slides.table.setStyle": { label: "Pick Table Style", tooltip: "Apply the chosen style to the selected table" }
  ,"slides.table.shading": { label: "Shading", tooltip: "Shade the cell, the selected cells or the whole table" }
  ,"slides.table.shadingColor": { label: "Cell Shading", tooltip: "Apply the chosen fill color to the cell or selected cells" }
  ,"slides.table.optHeaderRow": { label: "Header Row", tooltip: "Turn the header row on or off: bold text and style color" }
  ,"slides.table.optTotalRow": { label: "Total Row", tooltip: "Turn the last row into a total row" }
  ,"slides.table.optBandedRows": { label: "Banded Rows", tooltip: "Shade alternate rows lightly" }
  ,"slides.table.optFirstCol": { label: "First Column", tooltip: "Emphasize the first column: bold text and style color" }
  ,"slides.table.optLastCol": { label: "Last Column", tooltip: "Emphasize the last column: bold text and style color" }
  ,"slides.table.optBandedCols": { label: "Banded Columns", tooltip: "Shade alternate columns lightly" }
  ,"slides.table.alignLeft": { label: "Align Left", tooltip: "Align text in the cell to the left" }
  ,"slides.table.alignCenter": { label: "Center", tooltip: "Center text in the cell horizontally" }
  ,"slides.table.alignRight": { label: "Align Right", tooltip: "Align text in the cell to the right" }
  ,"slides.table.alignTop": { label: "Align Top", tooltip: "Move text in the cell to the top edge" }
  ,"slides.table.alignMiddle": { label: "Center Vertically", tooltip: "Center text in the cell vertically" }
  ,"slides.table.alignBottom": { label: "Align Bottom", tooltip: "Move text in the cell to the bottom edge" }
  ,"slides.table.borders": { label: "Borders", tooltip: "Draw or remove borders for the selected cells or the whole table" }
  ,"slides.table.bordersAll": { label: "All Borders", tooltip: "Draw borders around every cell of the selection (whole table when nothing is selected)" }
  ,"slides.table.bordersOutside": { label: "Outside Borders", tooltip: "Draw only the outer frame of the selection or the whole table" }
  ,"slides.table.bordersInside": { label: "Inside Borders", tooltip: "Draw only the lines between cells inside the selection or the whole table" }
  ,"slides.table.bordersNone": { label: "No Border", tooltip: "Remove the borders of the selection or the whole table" }
  ,"slides.table.distributeRows": { label: "Distribute Rows", tooltip: "Make the table rows (or the selected rows) the same height" }
  ,"slides.table.distributeCols": { label: "Distribute Columns", tooltip: "Make the table columns (or the selected columns) the same width" }
  ,"slides.table.cellSize": { label: "Cell Size…", tooltip: "Set the row height and column width of the current cell (cm)" }
  ,"slides.media.autoplay": { label: "Start Automatically", tooltip: "Play the video or audio on its own when the slide appears, without a click" }
  ,"slides.media.loop": { label: "Loop until Stopped", tooltip: "Keep playing the video or audio until it is stopped or the slide changes" }
  ,"slides.chart.type": { label: "Change Chart Type", tooltip: "Change the selected chart to column, line, pie or area while keeping its data" }
  ,"slides.chart.setType": { label: "Pick Chart Type", tooltip: "Apply the chosen chart type to the selected chart" }
  ,"slides.chart.editData": { label: "Edit Data…", tooltip: "Open the dialog to edit the title, labels and values of the selected chart" }
  ,"slides.animation.setType": { label: "Effect Type", tooltip: "Apply an effect type to the selected object" }
  ,"slides.animation.startMenu": { label: "Start", tooltip: "Choose when it starts: on click, with previous or after previous" }
  ,"slides.animation.setStart": { label: "Start Timing", tooltip: "Set when the selected object's effect starts" }
  ,"slides.animation.durationMenu": { label: "Duration", tooltip: "Set how long the selected object's effect runs" }
  ,"slides.animation.setDuration": { label: "Effect Duration", tooltip: "Pick the effect duration" }
  ,"slides.animation.delayMenu": { label: "Delay", tooltip: "Set the wait before the effect starts" }
  ,"slides.animation.setDelay": { label: "Delay Time", tooltip: "Pick the wait before the effect runs" }
  ,"slides.animation.painter": { label: "Animation Painter", tooltip: "Pick up the selected object's animation and apply it to another (press once to copy, select the target, press again to paste)" }
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
    ,"slides.view.zoomDialog": { label: "Zoom…", tooltip: "Set an exact zoom percentage (50–200%) or fit to window" }
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
  ,"slides.shape.fill": { label: "Shape Fill", tooltip: "Fill the selected shape with a colour" }
  ,"slides.shape.fillColor": { label: "Fill", tooltip: "Fill the selected shape (pick a colour, No Fill or More Colours…)" }
  ,"slides.shape.outline": { label: "Shape Outline", tooltip: "Change the colour, weight and dash style of the shape outline" }
  ,"slides.shape.outlineColor": { label: "Outline Colour", tooltip: "Change the outline colour of the selected shape" }
  ,"slides.shape.outlineWeight": { label: "Outline Weight", tooltip: "Change the outline weight of the selected shape (pt)" }
  ,"slides.shape.outlineDash": { label: "Outline Dash Style", tooltip: "Choose solid, dash, dot or dash-dot for the outline" }
  ,"slides.shape.effects": { label: "Shape Effects", tooltip: "Add or remove a shadow on the selected shape" }
  ,"slides.shape.shadow": { label: "Shadow", tooltip: "Add a shadow to the selected shape in the chosen direction" }
  ,"slides.shape.sizeDialog": { label: "Size and Position…", tooltip: "Open the dialog to set exact width, height and rotation" }
  ,"slides.arrange.rotate": { label: "Rotate", tooltip: "Rotate or flip the selected shape" }
  ,"slides.arrange.rotateRight90": { label: "Rotate Right 90°", tooltip: "Rotate the selected shape 90° clockwise" }
  ,"slides.arrange.rotateLeft90": { label: "Rotate Left 90°", tooltip: "Rotate the selected shape 90° counter-clockwise" }
  ,"slides.arrange.flipHorizontal": { label: "Flip Horizontal", tooltip: "Flip the selected shape horizontally" }
  ,"slides.arrange.flipVertical": { label: "Flip Vertical", tooltip: "Flip the selected shape vertically" }
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
  ,"slides.text.shadow": { label: "Text Shadow", tooltip: "Add a shadow to the selected text (toggle)" }
  ,"slides.text.columns": { label: "Columns", tooltip: "Split the text in a text box into 1, 2 or 3 columns" }
  ,"slides.text.columnsOne": { label: "One Column", tooltip: "Text runs in one column (default)" }
  ,"slides.text.columnsTwo": { label: "Two Columns", tooltip: "Split the text in a text box into two columns" }
  ,"slides.text.columnsThree": { label: "Three Columns", tooltip: "Split the text in a text box into three columns" }
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
    "writer.format.fontDialog": { label: "Font dialog", tooltip: "Open the Font dialog (Ctrl+D)" },
    "writer.font.size": { label: "Font Size", tooltip: "Select font size (Ctrl+Shift+P)" },
    "writer.style.apply": { label: "Styles", tooltip: "Apply paragraph style (Normal, Heading 1, 2, 3, Quote, Emphasis)" },
    "writer.style.gallery": { label: "Styles Gallery", tooltip: "Open visual styles gallery" },
    "writer.styles.pane": { label: "Styles Pane", tooltip: "Open or close the Styles Pane (Ctrl+Alt+Shift+S)" },
    "writer.styles.create": { label: "Create New Style", tooltip: "Create a paragraph style from the current selection" },
    "writer.design.themeGallery": { label: "Document Themes", tooltip: "Choose colors and fonts for document content; this does not change app appearance" },
    "writer.color.text": { label: "Font Color", tooltip: "Change font color" },
    "writer.color.highlight": { label: "Text Highlight Color", tooltip: "Highlight text (Ctrl+Alt+H)" },
    "writer.format.textEffects": { label: "Text Effects", tooltip: "Add text outline, shadow, and glow effects" },
    "writer.format.textOutline": { label: "Text Outline", tooltip: "Toggle or customize text outline" },
    "writer.format.textShadow": { label: "Shadow", tooltip: "Toggle or customize text shadow" },
    "writer.format.textGlow": { label: "Glow", tooltip: "Toggle or customize text glow effect" },
    "writer.format.clearTextEffects": { label: "Clear Text Effects", tooltip: "Clear all outline, shadow, and glow effects" },
    "writer.para.alignLeft": { label: "Align Left", tooltip: "Align text left (Ctrl+L)" },
    "writer.para.alignCenter": { label: "Center", tooltip: "Center text (Ctrl+E)" },
    "writer.para.alignRight": { label: "Align Right", tooltip: "Align text right (Ctrl+R)" },
    "writer.para.justify": { label: "Justify", tooltip: "Justify text (Ctrl+J)" },
    "writer.para.spacing1": { label: "Line Spacing 1.0", tooltip: "Single line spacing (Ctrl+1)" },
    "writer.para.spacing15": { label: "Line Spacing 1.5", tooltip: "1.5 line spacing (Ctrl+5)" },
    "writer.para.spacing2": { label: "Line Spacing 2.0", tooltip: "Double line spacing (Ctrl+2)" },
    "writer.para.spacingBefore": { label: "Spacing Before", tooltip: "Space before paragraph (pt)" },
    "writer.para.spacingAfter": { label: "Spacing After", tooltip: "Space after paragraph (pt)" },
    "writer.para.firstLineIndent": { label: "First-line Indent", tooltip: "Set the first line indent for the paragraph" },
    "writer.list.bullet": { label: "Bullets", tooltip: "Create a bulleted list (Ctrl+Shift+L)" },
    "writer.list.numbered": { label: "Numbering", tooltip: "Create a numbered list" },
    "writer.list.restartNumbering": { label: "Restart at 1", tooltip: "Restart numbering from 1" },
    "writer.list.continueNumbering": { label: "Continue Numbering", tooltip: "Continue numbering from previous list" },
    "writer.para.multilevelList": { label: "Multilevel List", tooltip: "Multilevel list: 1. / 1.1. / 1.1.1., 1. / a. / i., or Vietnamese Điều / Khoản / Điểm" },
    "writer.para.defineMultilevelList": { label: "Define New Multilevel List", tooltip: "Customize number formats and indents for nine list levels" },
    "writer.para.indentInc": { label: "Increase Indent", tooltip: "Increase indent (Ctrl+M)" },
    "writer.para.indentDec": { label: "Decrease Indent", tooltip: "Decrease indent (Ctrl+Shift+M)" },
    "writer.para.moveUp": { label: "Move Paragraph Up", tooltip: "Move paragraph up (Alt+Shift+Up)" },
    "writer.para.moveDown": { label: "Move Paragraph Down", tooltip: "Move paragraph down (Alt+Shift+Down)" },
    "writer.style.normal": { label: "Normal Style", tooltip: "Apply Normal style (Ctrl+Shift+N)" },
    "writer.style.heading1": { label: "Heading 1", tooltip: "Apply the standard Heading 1 style in new documents (Ctrl+Alt+1)" },
    "writer.style.heading2": { label: "Heading 2", tooltip: "Apply the standard Heading 2 style in new documents (Ctrl+Alt+2)" },
    "writer.style.heading3": { label: "Heading 3", tooltip: "Apply the standard Heading 3 style in new documents (Ctrl+Alt+3)" },
    "writer.text.changeCase": { label: "Change Case", tooltip: "Cycle lowercase / UPPERCASE / Title Case (Shift+F3)" },
    "writer.text.changeCaseDialog": { label: "Change Case Dialog…", tooltip: "Open Change Case dialog (Sentence case, UPPERCASE, lowercase, Title case, tOGGLE cASE)" },
    "writer.para.sort": { label: "Sort", tooltip: "Sort selected paragraphs or list items A–Z" },
    "writer.para.showFormattingMarks": { label: "Show/Hide Formatting Marks", tooltip: "Show or hide paragraph and line-break marks (Ctrl+*)" },
    "writer.para.shading": { label: "Shading", tooltip: "Apply paragraph or table-cell shading" },
    "writer.para.borders": { label: "Borders", tooltip: "Choose paragraph or table-cell borders" },
    "writer.table.insert": { label: "Table", tooltip: "Insert a table into document" },
    "writer.table.quickTables": { label: "Quick Tables", tooltip: "Insert built-in table templates such as calendars, checklists, or analysis matrices" },
    "writer.table.toText": { label: "Convert Table to Text", tooltip: "Convert the current table into regular text separated by a delimiter" },
    "writer.table.insertRowAbove": { label: "Insert Above", tooltip: "Insert a new row above current row" },
    "writer.table.insertRowBelow": { label: "Insert Below", tooltip: "Insert a new row below current row" },
    "writer.table.insertColLeft": { label: "Insert Left", tooltip: "Insert a new column to the left" },
    "writer.table.insertColRight": { label: "Insert Right", tooltip: "Insert a new column to the right" },
    "writer.table.deleteRow": { label: "Delete Rows", tooltip: "Delete selected row(s)" },
    "writer.table.deleteCol": { label: "Delete Columns", tooltip: "Delete selected column(s)" },
    "writer.table.deleteTable": { label: "Delete Table", tooltip: "Delete entire table" },
    "writer.table.mergeCells": { label: "Merge Cells", tooltip: "Merge selected cells into one" },
    "writer.table.splitCells": { label: "Split Cells", tooltip: "Split selected cell into multiple cells" },
    "writer.table.distributeRows": { label: "Distribute Rows", tooltip: "Distribute row heights evenly" },
    "writer.table.distributeCols": { label: "Distribute Columns", tooltip: "Distribute column widths evenly" },
    "writer.table.autoFitContents": { label: "AutoFit Contents", tooltip: "Fit the table to the content in its cells" },
    "writer.table.autoFitWindow": { label: "AutoFit Window", tooltip: "Expand the table to the page text width" },
    "writer.table.alignTop": { label: "Align Top", tooltip: "Align text to the top of cell" },
    "writer.table.alignMiddle": { label: "Align Center", tooltip: "Center text vertically in cell" },
    "writer.table.alignBottom": { label: "Align Bottom", tooltip: "Align text to the bottom of cell" },
    "writer.table.selectCell": { label: "Select Cell", tooltip: "Select active cell" },
    "writer.table.selectRow": { label: "Select Row", tooltip: "Select active row" },
    "writer.table.selectCol": { label: "Select Column", tooltip: "Select active column" },
    "writer.table.selectTable": { label: "Select Table", tooltip: "Select entire table" },
    "writer.table.cellBg": { label: "Shading", tooltip: "Change table cell background color" },
    "writer.table.borders": { label: "Borders", tooltip: "Customize table borders" },
    "writer.table.bordersStyle": { label: "Border Style…", tooltip: "Choose line style (solid, dashed, dotted, double), thickness, color and where to apply it on table borders" },
    "writer.table.bordersAll": { label: "All Borders", tooltip: "Show borders around every cell" },
    "writer.table.bordersOutside": { label: "Outside Borders", tooltip: "Show only the border around the selected area" },
    "writer.table.bordersInside": { label: "Inside Borders", tooltip: "Show only borders inside the selected area" },
    "writer.table.bordersNone": { label: "No Border", tooltip: "Hide borders in the selected area" },
    "writer.table.viewGridlines": { label: "View Gridlines", tooltip: "Show or hide gridlines for tables without borders" },
    "writer.table.toggleHeaderRow": { label: "Header Row", tooltip: "Toggle table header row formatting" },
    "writer.table.toggleBandedRows": { label: "Banded Rows", tooltip: "Toggle banded rows formatting" },
    "writer.table.toggleFirstColumn": { label: "First Column", tooltip: "Toggle bold formatting for the first column of the table" },
    "writer.table.toggleLastColumn": { label: "Last Column", tooltip: "Toggle bold formatting for the last column of the table" },
    "writer.table.toggleBandedColumns": { label: "Banded Columns", tooltip: "Toggle alternating column shading in the table" },
    "writer.table.splitTable": { label: "Split Table", tooltip: "Split table into two tables at the selected row" },
    "writer.table.textDirection": { label: "Text Direction", tooltip: "Rotate text direction in table cells (horizontal, 90°, 270°)" },
    "writer.table.properties": { label: "Table Properties", tooltip: "Open table properties dialog to configure alignment, indent, row height and cell margins" },
    "writer.table.stylesGallery": { label: "Table Styles", tooltip: "Open table styles gallery to apply professional color schemes" },
    "writer.table.formula": { label: "Formula", tooltip: "Insert a calculation formula into the table cell (=SUM(ABOVE), =SUM(LEFT)...)" },
    "writer.table.sort": { label: "Sort Table", tooltip: "Sort table rows alphabetically A–Z" },
    "writer.arrange.group": { label: "Group", tooltip: "Group selected shapes into a single object (Ctrl+G)" },
    "writer.arrange.ungroup": { label: "Ungroup", tooltip: "Ungroup the selected group of shapes (Ctrl+Shift+G)" },
    "writer.image.insert": { label: "Pictures", tooltip: "Insert pictures from your computer" },
    "writer.image.resize": { label: "Resize Picture", tooltip: "Resize picture and adjust aspect ratio" },
    "writer.image.wrap": { label: "Wrap Text", tooltip: "Configure text wrapping around picture" },
    "writer.image.crop": { label: "Crop Picture", tooltip: "Crop the outer edges of the picture" },
    "writer.image.border": { label: "Picture Border", tooltip: "Set a border for the picture: line style (solid, dashed, dotted, double), thickness and color, or remove the border" },
    "writer.image.corrections": { label: "Brightness & Contrast", tooltip: "Adjust the brightness and contrast of the picture" },
    "writer.image.changePicture": { label: "Change Picture", tooltip: "Replace the current picture while keeping formatting" },
    "writer.image.resetPicture": { label: "Reset Picture", tooltip: "Reset picture back to its original size and formatting" },
    "writer.image.compress": { label: "Compress Picture", tooltip: "Compress picture data to optimize document file size" },
    "writer.shape.insert": { label: "Shapes", tooltip: "Insert shapes (rectangle, circle, arrow, star, heart, line...)" },
    "writer.diagram.insert": { label: "SmartArt", tooltip: "Insert a SmartArt diagram (process, cycle, hierarchy, list)" },
    "writer.chart.insert": { label: "Chart", tooltip: "Insert an illustration chart" },
    "writer.insert.coverPage": { label: "Cover Page", tooltip: "Open cover page gallery with 4 administrative and report templates" },
    "writer.insert.removeCoverPage": { label: "Remove Cover Page", tooltip: "Remove cover page and its page break from the document" },
    "writer.page.break": { label: "Page Break", tooltip: "Insert a page break (Ctrl+Enter)" },
    "writer.page.blank": { label: "Blank Page", tooltip: "Insert a completely blank page at the cursor" },
    "writer.header.insert": { label: "Header", tooltip: "Insert header" },
    "writer.footer.insert": { label: "Footer", tooltip: "Insert footer" },
    "writer.insert.textbox": { label: "Text Box", tooltip: "Insert a text box at its standard starting size; drag a corner to resize" },
    "writer.insert.wordart": { label: "WordArt", tooltip: "Insert stylized decorative text with outline, shadow, or gradient at the cursor" },
    "writer.format.dropCap": { label: "Drop Cap", tooltip: "Enlarge the first letter of the paragraph" },
    "writer.insert.dateTime": { label: "Date & Time", tooltip: "Insert the current date and time at the cursor" },
    "writer.insert.equation": { label: "Equation", tooltip: "Insert a math equation at the cursor (Alt+=)" },
    "writer.equation.dialog.title": "Equation — Doc",
    "writer.equation.dialog.instructions": "Enter linear format and preview native MathML. Use a/b, x^2, x_1, \\sqrt(x), or type \\alpha then press Space.",
    "writer.equation.dialog.linearFormat": "Linear format",
    "writer.equation.dialog.linearHint": "Example: a/b + x^2 = \\sqrt(y). Press Ctrl+Enter to insert.",
    "writer.equation.dialog.preview": "Preview",
    "writer.equation.dialog.insert": "Insert into document",
    "writer.equation.dialog.structures": "Equation structures",
    "writer.equation.dialog.symbols": "Math symbols",
    "writer.equation.structure.fraction": "Fraction",
    "writer.equation.structure.superscript": "Superscript",
    "writer.equation.structure.subscript": "Subscript",
    "writer.equation.structure.squareRoot": "Square root",
    "writer.equation.structure.nthRoot": "Nth root",
    "writer.equation.structure.integral": "Integral",
    "writer.equation.structure.sum": "Sum",
    "writer.equation.structure.product": "Product",
    "writer.equation.structure.brackets": "Brackets",
    "writer.equation.structure.matrix2": "2 × 2 matrix",
    "writer.equation.structure.matrix3": "3 × 3 matrix",
    "writer.insert.symbol": { label: "Symbol", tooltip: "Insert a special character at the cursor" },
    "writer.insert.bookmark": { label: "Bookmark", tooltip: "Mark a location in the document to jump to later" },
    "writer.insert.crossReference": { label: "Cross-reference", tooltip: "Insert an internal link to a heading or bookmark; DOCX saves it as a REF field" },
    "writer.comment.insert": { label: "New Comment", tooltip: "Add a comment to the selected text (Ctrl+Alt+M)" },
    "writer.review.commentPrevious": { label: "Previous Comment", tooltip: "Go to the previous comment" },
    "writer.review.commentNext": { label: "Next Comment", tooltip: "Go to the next comment" },
    "writer.review.commentDelete": { label: "Delete Comment", tooltip: "Delete the selected comment" },
    "writer.review.commentResolve": { label: "Resolve Comment", tooltip: "Resolve or reopen the selected comment" },
    "writer.review.commentReply": { label: "Reply to Comment", tooltip: "Reply to the selected comment" },
    "writer.trackChanges.toggle": { label: "Track Changes", tooltip: "Track changes in the document (Ctrl+Shift+E)" },
    "writer.trackChanges.previous": { label: "Previous Change", tooltip: "Go to the previous tracked change" },
    "writer.trackChanges.next": { label: "Next Change", tooltip: "Go to the next tracked change" },
    "writer.trackChanges.acceptOne": { label: "Accept This", tooltip: "Accept the selected change" },
    "writer.trackChanges.rejectOne": { label: "Reject This", tooltip: "Reject the selected change" },
    "writer.trackChanges.acceptAll": { label: "Accept All Changes", tooltip: "Accept all changes in document" },
    "writer.trackChanges.rejectAll": { label: "Reject All Changes", tooltip: "Reject all changes in document" },
    "writer.review.compare": { label: "Compare Documents", tooltip: "Choose a revised document and create a new result with inserted/deleted paragraphs marked" },
    "writer.review.combine": { label: "Combine Documents", tooltip: "Combine differences from the selected document as reviewable changes" },
    "writer.review.restrictEditing": { label: "Restrict Editing", tooltip: "Require tracked changes or make the document read only; the password only stops protection" },
    "writer.trackChanges.displayMode": { label: "Display for Review", tooltip: "Choose how to view changes: Simple Markup, All Markup, No Markup, Original" },
    "writer.trackChanges.displaySimple": { label: "Simple Markup", tooltip: "Show clean text with red revision line in the margin" },
    "writer.trackChanges.displayAll": { label: "All Markup", tooltip: "Show all insertions and deletions inline" },
    "writer.trackChanges.displayNone": { label: "No Markup", tooltip: "Preview document with all changes accepted" },
    "writer.trackChanges.displayOriginal": { label: "Original", tooltip: "Preview original document before any changes" },
    "writer.trackChanges.showMarkup": { label: "Show Markup", tooltip: "Choose which markup and balloons to display in the document" },
    "writer.trackChanges.balloons": { label: "Balloons", tooltip: "Choose how revisions and comments appear in balloons or inline" },
    "writer.trackChanges.balloonsMode": { label: "Balloons Mode", tooltip: "Switch track changes balloon display mode" },
    "writer.trackChanges.balloonsRevisions": { label: "Show Revisions in Balloons", tooltip: "Show revision changes in balloons in the right margin" },
    "writer.trackChanges.balloonsInline": { label: "Show All Revisions Inline", tooltip: "Show all revisions directly inline in the text" },
    "writer.trackChanges.balloonsCommentsOnly": { label: "Show Only Comments and Formatting in Balloons", tooltip: "Show only comments and formatting in balloons, and revisions inline" },
    "writer.file.markAsFinal": { label: "Mark as Final", tooltip: "Mark document as final and make read-only to prevent accidental changes" },
    "writer.review.wordCount": { label: "Document Statistics", tooltip: "Show words, characters, paragraphs and lines in the document" },
    "writer.review.toggleSpellCheck": { label: "Spell Check", tooltip: "Toggle Vietnamese inline spelling check on/off" },
    "writer.help.open": { label: "Help", tooltip: "Open the in-app user guide (F1)" },
    "writer.page.margins": { label: "Margins", tooltip: "Adjust document margins" },
    "writer.page.orientation": { label: "Orientation", tooltip: "Switch page orientation between portrait and landscape" },
    "writer.page.size": { label: "Size", tooltip: "Choose page size (A4, Letter, etc.)" },
    "writer.table.fromText": { label: "Convert Text to Table", tooltip: "Turn the selected paragraphs into a table, splitting cells at a separator" },
    "writer.page.setupDialog": { label: "Page Setup…", tooltip: "Configure document margins, orientation, paper size, and section layout" },
    "writer.page.columns": { label: "Columns", tooltip: "Split text into two or more columns" },
    "writer.format.paragraphDialog": { label: "Paragraph…", tooltip: "Alignment, indents, spacing and line spacing in one dialog" },
    "writer.format.tabStops": { label: "Tab Stops…", tooltip: "Set tab positions, text alignment and leader characters for a paragraph" },
    "writer.paragraph.tabStops": { label: "Tab Stops…", tooltip: "Set tab positions, text alignment and leader characters for a paragraph" },
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
    "writer.layout.lineNumbers": { label: "Line Numbers", tooltip: "Line numbers in saved documents: None, Continuous, Restart each page, Restart each section" },
    "writer.page.watermark": { label: "Watermark", tooltip: "Add or remove a background watermark" },
    "writer.page.color": { label: "Page Color", tooltip: "Set a solid page background color" },
    "writer.page.border": { label: "Page Borders", tooltip: "Add or change border around the page" },
    "writer.file.printPreview": { label: "Print Preview", tooltip: "Preview document before printing (Ctrl+F2)" },
    "writer.view.printLayout": { label: "Print Layout", tooltip: "Show page boundaries, headers, and footers" },
    "writer.view.webLayout": { label: "Web Layout", tooltip: "Flow document content continuously across the window" },
    "writer.view.readMode": { label: "Read Mode", tooltip: "Hide the ribbon and expand the reading area; press Esc to exit" },
    "writer.view.outline": { label: "Outline", tooltip: "View document as a heading hierarchy to organize and navigate" },
    "writer.view.draft": { label: "Draft", tooltip: "Display text continuously without page layout for fast editing" },
    "writer.outline.promote": { label: "Promote Heading", tooltip: "Promote heading or paragraph to a higher level (Alt+Shift+Left)" },
    "writer.outline.demote": { label: "Demote Heading", tooltip: "Demote heading or paragraph to a lower level (Alt+Shift+Right)" },
    "writer.outline.moveUp": { label: "Move Up", tooltip: "Move current section above preceding section" },
    "writer.outline.moveDown": { label: "Move Down", tooltip: "Move current section below following section" },
    "writer.outline.expand": { label: "Expand", tooltip: "Expand subordinate content under selected heading (Alt+Shift++)" },
    "writer.outline.collapse": { label: "Collapse", tooltip: "Collapse subordinate content under selected heading (Alt+Shift+-)" },
    "writer.outline.showLevel": { label: "Show Level", tooltip: "Filter visible heading levels in outline view" },
    "writer.outline.close": { label: "Close Outline View", tooltip: "Close outline view and return to Print Layout" },
    "writer.view.toggleHeadingCollapse": { label: "Expand/Collapse Heading", tooltip: "Collapse or expand content under heading in Print Layout" },
    "writer.view.ruler": { label: "Ruler", tooltip: "Show or hide horizontal and vertical rulers based on page setup" },
    "writer.view.navigationPane": { label: "Navigation Pane", tooltip: "Show document headings for quick search and navigation (Ctrl+Alt+N)" },
    "writer.ruler.getState": { label: "Read ruler state", tooltip: "Sync the ruler with the page margins and the selected paragraph" },
    "writer.ruler.setParagraphIndents": { label: "Set indents with the ruler", tooltip: "Set first-line, hanging, left or right indent for the selected paragraph" },
    "writer.ruler.setPageMargins": { label: "Set page margins with the ruler", tooltip: "Drag the left or right margin boundary on the ruler" },
    "writer.view.gridlines": { label: "Gridlines", tooltip: "Show or hide non-printing alignment gridlines" },
    "writer.view.zoomIn": { label: "Zoom In", tooltip: "Increase document zoom" },
    "writer.view.zoomOut": { label: "Zoom Out", tooltip: "Decrease document zoom" },
    "writer.view.zoomReset": { label: "Reset", tooltip: "Reset document zoom to 100%" },
    "writer.view.zoom100": { label: "100%", tooltip: "Show the document at 100%" },
    "writer.view.pageWidth": { label: "Page Width", tooltip: "Fit the page width to the workspace" },
    "writer.view.zoomDialog": { label: "Custom Zoom", tooltip: "Set a percentage or fit the page" },
    "writer.view.fitPage": { label: "Fit Page", tooltip: "Fit the page height in the workspace" },
    "writer.view.multiplePages": { label: "Multiple Pages", tooltip: "Zoom out to see multiple pages" },
    "writer.view.newWindow": { label: "New Window", tooltip: "Open the document in a new browser window" },
    "writer.view.split": { label: "Split", tooltip: "Split the editor window into two independent panes" },
    "writer.view.selectionPane": { label: "Selection Pane", tooltip: "Show or hide the selection pane to manage document objects" },
    "writer.reference.tocInsert": { label: "Table of Contents", tooltip: "Insert a table of contents" },
    "writer.reference.tocUpdate": { label: "Update Table", tooltip: "Update the table of contents" },
    "writer.reference.nextNote": { label: "Next Note", tooltip: "Go to the next footnote or endnote mark in the document (wraps to the start)" },
    "writer.reference.prevNote": { label: "Previous Note", tooltip: "Go to the previous footnote or endnote mark in the document (wraps to the end)" },
    "writer.reference.footnoteInsert": { label: "Insert Footnote", tooltip: "Add a note at the bottom of the page (Ctrl+Alt+F)" },
    "writer.reference.endnoteInsert": { label: "Insert Endnote", tooltip: "Add a note at the end of the document (Ctrl+Alt+D)" },
    "writer.reference.citationStyle": { label: "Citation Style", tooltip: "Choose APA or MLA citation style" },
    "writer.reference.citationInsert": { label: "Insert Citation", tooltip: "Insert a citation from the source list" },
    "writer.reference.sourcesManage": { label: "Manage Sources", tooltip: "Add, edit, or delete document sources" },
    "writer.reference.bibliographyInsert": { label: "Bibliography", tooltip: "Insert a bibliography from cited sources" },
    "writer.reference.captionInsert": { label: "Insert Caption", tooltip: "Insert an auto-numbered caption for a picture, table, or equation" },
    "writer.reference.tofInsert": { label: "Insert Table of Figures", tooltip: "Insert a table of figures or tables from existing captions" },
    "writer.reference.tofUpdate": { label: "Update Table of Figures", tooltip: "Refresh the table of figures from captions in the document" },
    "writer.reference.indexMark": { label: "Mark Entry", tooltip: "Mark the selected word or phrase for the alphabetical index" },
    "writer.reference.indexInsert": { label: "Insert Index", tooltip: "Build an alphabetical index from marked entries" },
    "writer.insert.quickParts": { label: "Reusable Blocks", tooltip: "Save the selection for reuse or insert a saved block" },
    "writer.layout.hyphenation": { label: "Hyphenation", tooltip: "Turn automatic language-aware hyphenation on or off" },
    "writer.mailMerge.open": { label: "Select Recipients", tooltip: "Open mail merge recipient list from spreadsheet (.xlsx, .xls) or CSV/TSV file" },
    "writer.mailMerge.insertField": { label: "Insert Merge Field", tooltip: "Insert a mail merge field" },
    "writer.mailMerge.addressBlock": { label: "Address Block", tooltip: "Insert the recipient address block: the chosen fields, one per line" },
    "writer.mailMerge.greetingLine": { label: "Greeting Line", tooltip: "Insert a greeting line such as «Dear «Name»,»" },
    "writer.mailMerge.highlightFields": { label: "Highlight Merge Fields", tooltip: "Turn the colored background of mail merge fields on or off" },
    "writer.mailMerge.ifRule": { label: "Rules", tooltip: "Insert Skip record if, Next record if, If…Then…Else, or Fill in" },
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
      tableDesign: "Table Design",
      tableLayout: "Table Layout",
      ai: "3T AI Assistant"
    },
    group: {
      documentReview: "Compare & Protect",
      clipboard: "Clipboard",
      font: "Font",
      styles: "Styles",
      paragraph: "Paragraph",
      quickInsert: "Quick Insert",
      pages: "Pages",
      tables: "Tables",
      tableStyleOptions: "Table Style Options",
      tableStyles: "Table Styles",
      tableBordersShading: "Borders & Shading",
      tableBordersButton: "Table Borders",
      arrange: "Arrange",
      tableSelectGroup: "Table",
      tableRowsColsGroup: "Rows & Columns",
      tableMergeGroup: "Merge",
      tableSizeGroup: "Cell Size",
      tableAlignGroup: "Alignment",
      tableDataGroup: "Data",
      tablesIllustrations: "Tables & Illustrations",
      illustrations: "Illustrations",
      links: "Links",
      documentFormatting: "Document appearance",
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
      index: "Index",
      createMailings: "Create",
      startMerge: "Start Mail Merge",
      writeInsert: "Write & Insert Fields",
      previewResults: "Preview Results",
      finishMerge: "Finish",
      proofread: "Proofing",
      comments: "Comments",
      tracking: "Tracking",
      inspect: "Document Inspector",
      views: "Views",
      show: "Show",
      zoom: "Zoom",
      window: "Window",
      macro: "Macros",
      help: "Help",
      aiFeatures: "Vietnamese AI Features"
    },
    hyphenation: { none: "Hyphenation: None", auto: "Hyphenation: Automatic" }
  },
  writerNavigation: {
    title: "Navigation Pane",
    close: "Close Navigation Pane",
    searchLabel: "Search document",
    searchPlaceholder: "Search document",
    branchActions: "Collapse or expand heading branches",
    collapseAll: "Collapse all",
    expandAll: "Expand all",
    treeLabel: "Document headings",
    page: "Page {page}",
    empty: "This document has no headings. Apply Heading 1–6 to show them here.",
    noResults: "No matching headings."
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
      marginPreset: "Preset margins",
      marginCustom: "Custom",
      marginNormal: "Normal (1 in)",
      marginNarrow: "Narrow (0.5 in)",
      marginModerate: "Moderate",
      marginWide: "Wide",
      applyTo: "Apply to",
      thisSection: "This section",
      wholeDocument: "Whole document",
      apply: "Apply",
      cancel: "Cancel",
      close: "Close",
      marginRangeError: "Page margins must be numbers from 0 to 100 mm."
    },
    paragraph: {
      leftIndent: "Left indentation",
      rightIndent: "Right indentation",
      specialIndent: "Special indentation value",
      beforeSpacing: "Spacing before",
      afterSpacing: "Spacing after",
      lineSpacing: "Line spacing value",
      fieldRequired: "Please enter {label}.",
      invalidNumber: "{label} must be a valid number.",
      rangeError: "{label} must be between {min}–{max}.",
      indentTotalTooLarge: "Total left and right indentation is too large for the page width. Please decrease indentation.",
      hangingIndentTooLarge: "Hanging indentation cannot be greater than left indentation. Increase Left or decrease Value."
    },
    bookmark: {
      title: "Bookmark",
      nameLabel: "Bookmark name",
      nameRequired: "Enter a bookmark name."
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
      title: "Document Statistics",
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
      cancel: "Cancel",
      countError: "Number of columns must be an integer from 1 to 4.",
      gapError: "Column gap must be a number from 0 to 50 mm."
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
      textRequired: "Enter watermark text; to remove it, use the Remove Watermark button.",
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
      dataSourceTitle: "Mail Merge — Recipient Data Source (spreadsheet / CSV)",
      pastePrompt: "Select an spreadsheet (.xlsx, .xls) / CSV file, or paste table data below:",
      pasteSampleBtn: "📋 Paste Sample Data",
      noData: "No data",
      missingAddressSource: "No recipient data source is loaded. Open Mailings > Data Source before inserting an address block.",
      missingGreetingSource: "No recipient data source is loaded. Open Mailings > Data Source before inserting a greeting line.",
      invalidCsv: "Invalid data (missing column headers)",
      foundData: "Found: {count} columns | {records} records",
      saveDataSource: "Save Data Source",
      insertFieldTitle: "Insert Merge Field",
      selectFieldPrompt: "Select field to insert into document:",
      insertBtn: "Insert Field",
      noDataWarningTitle: "Mail Merge Preview",
      noDataWarningMsg: "No mail merge data source found. Please open 'Select Recipients' to choose an spreadsheet/CSV file first.",
      finishTitle: "Finish & Merge",
      replaceCurrent: "Replace the open document's contents (join records in order with page breaks)",
      replaceConfirm: "I understand this will replace the current contents of this document.",
      finishNoData: "No mail merge data source to create documents. Please open 'Select Recipients' to select an spreadsheet/CSV file.",
      finishNoFields: "Current document contains no merge fields. Use 'Insert Merge Field' to insert at least one field.",
      finishSuccess: "Successfully merged {count} records into document. You can preview or export the document.",
      allRecordsSkipped: "Every record was excluded by a Skip record if rule.",
      previewSkipped: "This record is skipped by a mail merge rule."
      ,ifTitle: "If...Then...Else Rule", ifField: "Field", ifFieldRequired: "Select a data field.", ifOperator: "Comparison", ifValue: "Compare to", ifThen: "Then", ifElse: "Otherwise", opEquals: "equal to", opNotEquals: "not equal to", opContains: "contains", opGreater: "greater than", opLess: "less than", opEmpty: "is blank", opNotEmpty: "is not blank"
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
      subtitle: { label: "Subtitle", sublabel: "Subtitle", desc: "Built-in Subtitle style for text below the title" },
      h1: { label: "Heading 1", sublabel: "Heading 1", desc: "Heading 1: Uppercase, bold, centered, 16pt" },
      h2: { label: "Heading 2", sublabel: "Heading 2", desc: "Heading 2: Title case bold, 14pt" },
      h3: { label: "Heading 3", sublabel: "Heading 3", desc: "Heading 3: Bold italic, 13pt" },
      quote: { label: "Quote", sublabel: "Quote", desc: "Built-in Quote style with italic, centered, indented text" },
      listparagraph: { label: "List Paragraph", sublabel: "List Paragraph", desc: "Built-in List Paragraph style with a half-inch indent" },
      emphasis: { label: "Emphasis", sublabel: "Emphasis", desc: "Emphasis: Bold, italic, amber color" }
    },
    comments: {
      noSelectionTitle: "No Text Selected",
      noSelectionMsg: "Please select text in the document before adding a comment.",
      addCommentTitle: "New Comment",
      addCommentPlaceholder: "Type your comment here...",
      addCommentBtn: "Add Comment",
      replyTitle: "Reply to Comment",
      replyPlaceholder: "Type your reply...",
      replyBtn: "Send Reply",
      panelLabel: "Document Comments",
      openCommentAria: "Open comment for: {text}",
      placeholderHeader: "Click to enter header...",
      placeholderFooter: "Click to enter footer..."
    },
    headerRegionLabel: "Header",
    footerRegionLabel: "Footer",
    hyperlink: {
      title: "Insert Hyperlink",
      message: "Enter hyperlink URL:",
      invalidUrl: "Please enter a valid link address."
    },
    diagram: {
      countError: "Please enter an integer from 3 to 6."
    },
    chart: {
      itemValueError: "Please enter a valid numeric value for item {index}."
    },
    tableSize: {
      title: "Insert Table",
      gridLabel: "Choose columns and rows",
      cellLabel: "{columns} columns, {rows} rows",
      hint: "Choose columns × rows",
      selection: "{columns} columns × {rows} rows",
      custom: "Insert Table...",
      customTitle: "Insert Table",
      columns: "Columns (1–63)",
      rows: "Rows (1–63)",
      cancel: "Cancel",
      insert: "Insert",
      invalid: "Enter a whole number from 1 to 63 for both columns and rows."
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
    },
    splitHorizontalSeparator: "Horizontal split bar",
    selectionPane: {
      title: "Selection",
      empty: "There are no objects yet.",
      showAll: "Show All",
      hideAll: "Hide All",
      bringForward: "Bring Forward",
      sendBackward: "Send Backward",
      group: "Group",
      ungroup: "Ungroup",
      close: "Close Selection Pane"
    },
    tableStyles: {
      title: "Table Styles Gallery",
      plainTables: "Plain Tables",
      gridTables: "Grid Tables",
      listTables: "List Tables"
    },
    tableFormula: {
      title: "Formula",
      formulaLabel: "Formula:",
      numberFormatLabel: "Number format:",
      pasteFunctionLabel: "Paste function:",
      ok: "OK",
      cancel: "Cancel",
      invalidFormula: "Formula must begin with an equal sign (=)."
    }
  },
  sheetContextMenu: {
    insert: "Insert", delete: "Delete", select: "Select", table: "Table", move: "Move",
    tableColumnLeft: "Table Columns to the Left", tableColumnRight: "Table Columns to the Right",
    tableRowAbove: "Table Rows Above", tableRowBelow: "Table Rows Below",
    tableColumn: "Table Columns", tableRow: "Table Rows",
    tableColumnData: "Table Column Data", tableColumnAll: "Entire Table Column", tableRowSelect: "Table Row",
    totalRow: "Totals Row", totalLabel: "Total", convertToRange: "Convert to Range",
    chartArea: "Chart Area", plotArea: "Plot Area", series: "Series",
    chartType: "Change Chart Type...", chartTypeDialog: "Change Chart Type",
    selectData: "Select Data...", chartDataRange: "Enter the data range for the chart (for example A1:B10):", invalidChartRange: "The data range is not valid.", showDataLabels: "Show Data Labels", hideDataLabels: "Hide Data Labels", switchRowsColumns: "Switch Row/Column", addTrendline: "Add Trendline", removeTrendline: "Remove Trendline",
    moveChart: "Move Chart...", moveChartMessage: "Enter the name of the sheet to move the chart to. Available sheets: {sheets}", invalidSheetName: "No sheet with that name was found.",
    deleteObject: "Delete",
    cut: "Cut", copy: "Copy", paste: "Paste",
    bringToFront: "Bring to Front", bringToFrontTop: "Bring to Front", bringForward: "Bring Forward",
    sendToBack: "Send to Back", sendToBackBottom: "Send to Back", sendBackward: "Send Backward",
    formatObject: "Format Object...", formatObjectDialog: "Format Object",
    formatShape: "Format Shape...", formatPicture: "Format Picture...", formatTextBox: "Format Text Box...",
    grouping: "Grouping", group: "Group", ungroup: "Ungroup", regroup: "Regroup",
    align: "Align", alignLeft: "Align Left", alignCenter: "Align Center", alignRight: "Align Right", alignTop: "Align Top", alignMiddle: "Align Middle", alignBottom: "Align Bottom", distributeHorizontal: "Distribute Horizontally", distributeVertical: "Distribute Vertically",
    rotate: "Rotate", rotateRight90: "Rotate Right 90°", rotateLeft90: "Rotate Left 90°", flipHorizontal: "Flip Horizontal", flipVertical: "Flip Vertical",
    editText: "Edit Text", changePicture: "Change Picture...",
    altText: "Edit Alt Text...", altTextDialog: "Alt Text", altTextDesc: "Alternative text description for the object (screen reader support):",
    assignMacro: "Assign Macro...", assignMacroNotice: "Assign macro to object feature is under development according to compatibility roadmap.",
    setDefaultShape: "Set as Default Shape", setDefaultTextBox: "Set as Default Text Box", setDefaultNotice: "Default object formatting saved for the current session.",
    selectAllObjects: "Select All Objects", selectionPane: "Selection Pane...", hyperlink: "Hyperlink...",
    objectMenu: "Object context menu",
    objectWidth: "Width", objectHeight: "Height", anchorCell: "Anchor Cell", offsetX: "Horizontal Offset", offsetY: "Vertical Offset", textContent: "Text Content"
  },
  sheetFilter: {
    colorActions: "Filter and sort by color", iconActions: "Sort by icon", sortIcon: "Sort by cell icon (put on top)", sortFillColor: "Sort by cell color", filterFillColor: "Filter by cell color", sortFontColor: "Sort by font color", filterFontColor: "Filter by font color",
    advanced: "Filter by condition", type: "Filter type", text: "Text", number: "Number", date: "Date", operator: "Condition", value: "Value", secondValue: "Second value", applyCondition: "Filter", byValue: "Filter by value", blank: "(Blanks)",
    contains: "contains", notContains: "does not contain", startsWith: "begins with", endsWith: "ends with", equals: "equals", notEqual: "does not equal", greaterThan: "greater than", greaterThanOrEqual: "greater than or equal to", lessThan: "less than", lessThanOrEqual: "less than or equal to", between: "between", top10: "Top items", topCount: "Count (default 10)", today: "today", thisMonth: "this month", thisYear: "this year", before: "before", after: "after"
  },
  sheetGoTo: {
    title: "Go To", reference: "Reference", placeholder: "For example: B5, A1:C10, Sheet2!D3 or a name", nameList: "Defined names", noNames: "No names yet.",
    invalid: "The reference is not valid.", special: "Special...", specialTitle: "Go To Special", select: "Select", noCells: "No cells were found.", truncated: "There are too many areas; only the first part was selected."
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
    catTime: "Time",
    catPercentage: "Percentage",
    catFraction: "Fraction",
    catScientific: "Scientific",
    catText: "Text",
    catSpecial: "Special",
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
    locale: "Locale", localeVietnam: "Vietnamese (Vietnam)", localeUs: "English (United States)", type: "Type", timeType: "Time type", deleteCustom: "Delete format", cannotDeleteBuiltin: "Built-in formats cannot be deleted.", customDeleted: "Deleted custom format {pattern}.",
    fractionOneDigit: "Up to one digit", fractionTwoDigits: "Up to two digits", fractionThreeDigits: "Up to three digits", fractionHalves: "As halves", fractionQuarters: "As quarters", fractionEighths: "As eighths", fractionSixteenths: "As sixteenths", fractionTenths: "As tenths", fractionHundredths: "As hundredths",
    specialPostal: "Postal code", specialPostalPlus: "Extended postal code", specialPhone: "Phone number", specialSSN: "Social Security Number", accountingDesc: "Accounting formats align symbols and decimal points by column.", scientificDesc: "Display the value in scientific notation.",
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
    alignFill: "Fill", alignCenterContinuous: "Center Across Selection", alignDistributed: "Distributed", alignJustifyV: "Justify", alignDistributedV: "Distributed", verticalText: "Vertical text", previewText: "Sample text",
    fontSettings: "Font settings", fontName: "Font", fontStyle: "Font style", fontSize: "Size", fontRegular: "Regular", fontItalic: "Italic", fontBold: "Bold", fontBoldItalic: "Bold Italic", underline: "Underline", none: "None", underlineSingle: "Single", underlineDouble: "Double", underlineSingleAccounting: "Single Accounting", underlineDoubleAccounting: "Double Accounting", fontColor: "Font color", effects: "Effects", normalFont: "Normal font", strikethrough: "Strikethrough", positionNormal: "Normal", superscript: "Superscript", subscript: "Subscript",
    line: "Line", lineStyle: "Style", lineColor: "Color", borderThin: "Thin", borderMedium: "Medium", borderThick: "Thick", borderDashed: "Dashed", borderDotted: "Dotted", borderDouble: "Double", presets: "Presets", presetNone: "None", presetOutline: "Outline", presetInside: "Inside", borderPreview: "Border", borderLeft: "Left", borderRight: "Right", borderTop: "Top", borderBottom: "Bottom", borderInsideH: "Inside horizontal", borderInsideV: "Inside vertical", borderDiagonalUp: "Diagonal up", borderDiagonalDown: "Diagonal down",
    background: "Background", backgroundColor: "Background color", noColor: "No color", pattern: "Pattern", patternColor: "Pattern color", patternStyle: "Pattern style", patternSolid: "Solid", patternGray: "Gray dots", patternDarkDown: "Diagonal down", patternDarkUp: "Diagonal up", patternGrid: "Grid", fillEffects: "Fill effects", gradientSecondColor: "Second color", gradientDirection: "Direction", gradientHorizontal: "Horizontal", gradientVertical: "Vertical", gradientDiagonalUp: "Diagonal up", gradientDiagonalDown: "Diagonal down", applyGradient: "Apply gradient", clearGradient: "Clear gradient",
    protectionSettings: "Cell protection", locked: "Locked", formulaHidden: "Hidden formula", protectionHint: "These options take effect when the sheet is protected.", protectSheetLink: "Protect sheet...", protectUnavailable: "The sheet protection dialog could not be opened.", gapNotSupported: "Feature not yet supported"
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
  },
  sheetAutofill: {
    optionsButtonTitle: "Auto Fill Options (Ctrl)",
    copyCells: "Copy Cells",
    fillSeries: "Fill Series",
    fillFormattingOnly: "Fill Formatting Only",
    fillWithoutFormatting: "Fill Without Formatting",
    fillDays: "Fill Days",
    fillWeekdays: "Fill Weekdays",
    fillMonths: "Fill Months",
    fillYears: "Fill Years",
    flashFill: "Flash Fill"
  }
};
