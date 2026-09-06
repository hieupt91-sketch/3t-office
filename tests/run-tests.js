/**
 * VN Office — Master Test Runner
 * Tuân thủ quy định 06-testing/TESTING-STANDARD.md
 */

import { runCommandBusTests } from "./unit/command-bus.test.js";
import { runAdapterMappingTests } from "./unit/adapter-mapping.test.js";
import { runSuiteSmokeTests } from "./smoke/suite-smoke.test.js";
import { runFormulaEngineTests } from "./unit/formula-engine.test.js";
import { runFormulaAutocompleteTests } from "./unit/formula-autocomplete.test.js";
import { runI18nTests } from "./unit/i18n.test.js";
import { runSyntaxCheckTests } from "./unit/syntax-check.test.js";
import { runHtmlSmokeTests } from "./smoke/html-smoke.test.js";
import { runAiServiceTests } from "./unit/ai-service.test.js";
import { runApiKeyManagerTests } from "./unit/api-key-manager.test.js";
import { runCloudProviderTests } from "./unit/cloud-providers.test.js";
import { runSheetFileIoTests } from "./unit/sheet-file-io.test.js";
import { runSlidesFileIoTests } from "./unit/slides-file-io.test.js";
import { runMultiSheetTests } from "./unit/sheet-multi-sheet.test.js";
import { runWriterCommentsTests } from "./unit/writer-comments.test.js";
import { runSlidesAnimationsNotesTests } from "./unit/slides-animations-notes.test.js";
import { runSheetRulesValidationTests } from "./unit/sheet-rules-validation.test.js";
import { runWriterTrackChangesTests } from "./unit/writer-track-changes.test.js";
import { runWriterPrintPreviewTests } from "./unit/writer-print-preview.test.js";
import { runSlidesLayoutsTests } from "./unit/slides-layouts.test.js";
import { runSheetChartTests } from "./unit/sheet-charts.test.js";
import { runSheetUndoRedoTests } from "./unit/sheet-undo-redo.test.js";
import { runWriterUndoRedoTests } from "./unit/writer-undo-redo.test.js";
import { runSheetLookupConditionalFunctionTests } from "./unit/sheet-lookup-conditional-functions.test.js";
import { runSheetPivotTableTests } from "./unit/sheet-pivot-table.test.js";
import { runSlidesSorterViewTests } from "./unit/slides-sorter-view.test.js";
import { runWriterTocFootnotesTests } from "./unit/writer-toc-footnotes.test.js";
import { runSheetNamedRangesTextDateTests } from "./unit/sheet-named-ranges-text-date.test.js";
import { runWriterMailMergeTests } from "./unit/writer-mail-merge.test.js";
import { runSheetCommentsPrintAreaTests } from "./unit/sheet-comments-printarea.test.js";
import { runSlidesTimingsMediaTests } from "./unit/slides-timings-media.test.js";
import { runWriterStyleGalleryWatermarkTests } from "./unit/writer-style-gallery-watermark.test.js";
import { runSheetViewSlidesCommentsTests } from "./unit/sheet-view-slides-comments.test.js";
import { runWriterColumnsTests } from "./unit/writer-columns.test.js";
import { runSheetRowColInsertTests } from "./unit/sheet-row-col-insert.test.js";
import { runSheetSlidesI18nShortcutTests } from "./unit/sheet-slides-i18n-shortcuts.test.js";
import { runWriterI18nShortcutsTests } from "./unit/writer-i18n-shortcuts.test.js";
import { runSheetArrayFormulaTests } from "./unit/sheet-array-formulas.test.js";
import { runSlidesDiagramTests } from "./unit/slides-diagrams.test.js";
import { runShortcutScopeTests } from "./unit/shortcut-scope.test.js";
import { runWriterRefMailAuditTests } from "./unit/writer-refmail-audit.test.js";
import { runSheetImageTests } from "./unit/sheet-images.test.js";
import { runSlidesSlideSizeTests } from "./unit/slides-slide-size.test.js";
import { runWriterRibbonBreadthTests } from "./unit/writer-ribbon-breadth.test.js";
import { runSheetKeyboardAuditTests } from "./unit/sheet-keyboard-audit.test.js";
import { runSheetFormatCellsTests } from "./unit/sheet-format-cells.test.js";
import { runSheetEditingStylesTests } from "./unit/sheet-editing-styles.test.js";
import { runSheetReferenceFunctionTests } from "./unit/sheet-reference-functions.test.js";
import { runSheetMathStatFunctionTests } from "./unit/sheet-math-stat-functions.test.js";
import { runSheetTextFunctionTests } from "./unit/sheet-text-functions.test.js";
import { runSheetDateFunctionTests } from "./unit/sheet-date-functions.test.js";
import { runSheetMouseShortcutsTests } from "./unit/sheet-mouse-shortcuts.test.js";
import { runWriterMouseShortcutsTests } from "./unit/writer-mouse-shortcuts.test.js";
import { runRibbonGapsRealOfficeTests } from "./unit/ribbon-gaps-real-office.test.js";
import { runSlidesMouseShortcutsTests } from "./unit/slides-mouse-shortcuts.test.js";
import { runWriterSlidesInsertGapsTests } from "./unit/writer-slides-insert-gaps.test.js";
import { runSheetDataToolsTests } from "./unit/sheet-data-tools.test.js";
import { runSlidesDialogsA11yTests } from "./unit/slides-dialogs-a11y.test.js";
import { runColorContrastAuditTests } from "./unit/color-contrast-audit.test.js";
import { runRealOfficeImportFidelityTests } from "./unit/real-office-import-fidelity.test.js";
import { runVietnameseSpellcheckerTests } from "./unit/vi-spellchecker.test.js";
import { runSheetSlidesViewTabTests } from "./unit/sheet-slides-view-tab.test.js";
import { runSlidesSpellcheckViTests } from "./unit/slides-spellcheck-vi.test.js";
import { runSheetSpellcheckViTests } from "./unit/sheet-spellcheck-vi.test.js";
import { runSheetFormulasTabTests } from "./unit/sheet-formulas-tab.test.js";
import { runDesktopLaunchContextTests } from "./unit/desktop-launch-context.test.js";
import { runSheetCfValidationFodsRoundTripTests } from "./unit/sheet-cf-validation-fods-roundtrip.test.js";
import { runWriterTrackChangesImportTests } from "./unit/writer-trackchanges-import.test.js";
import { runWriterCommentsImportTests } from "./unit/writer-comments-import.test.js";
import { runSheetPivotImportTests } from "./unit/sheet-pivot-import.test.js";
import { runSheetPivotSaveFodsTests } from "./unit/sheet-pivot-save-fods.test.js";
import { runSheetMergeCellsTests } from "./unit/sheet-merge-cells.test.js";
import { runSheetPasteSpecialTests } from "./unit/sheet-paste-special.test.js";
import { runSlidesSmartartImportTests } from "./unit/slides-smartart-import.test.js";
import { runWriterHeaderFooterImportTests } from "./unit/writer-headerfooter-import.test.js";
import { runWriterFootnotesImportTests } from "./unit/writer-footnotes-import.test.js";
import { runSlidesDiagramGroupSelectTests } from "./unit/slides-diagram-group-select.test.js";
import { runSlidesSpeakernotesImportTests } from "./unit/slides-speakernotes-import.test.js";
import { runSheetChartsImportTests } from "./unit/sheet-charts-import.test.js";
import { runWriterTablesImportTests } from "./unit/writer-tables-import.test.js";
import { runA11yAuditNewFeaturesTests } from "./unit/a11y-audit-new-features.test.js";
import { runSlidesWordArtTests } from "./unit/slides-wordart.test.js";
import { runSheetFormatPainterTests } from "./unit/sheet-format-painter.test.js";
import { runSheetGoalSeekTests } from "./unit/sheet-goal-seek.test.js";
import { runSheetWhatIfAnalysisTests } from "./unit/sheet-what-if-analysis.test.js";
import { runSheetPivotChartTests } from "./unit/sheet-pivot-chart.test.js";
import { runWriterArrangeTests } from "./unit/writer-arrange.test.js";
import { runSlidesHideSlideTests } from "./unit/slides-hide-slide.test.js";
import { runSlidesChartTests } from "./unit/slides-charts.test.js";
import { runWriterCitationsTests } from "./unit/writer-citations.test.js";
import { runSlidesFontParagraphTests } from "./unit/slides-font-paragraph.test.js";
import { runWriterCaptionsTests } from "./unit/writer-captions.test.js";
import { runSheetFormatDropdownTests } from "./unit/sheet-format-dropdown.test.js";
import { runSheetRenameMoveProtectTests } from "./unit/sheet-rename-move-protect.test.js";
import { runSheetProtectWorkbookTests } from "./unit/sheet-protect-workbook.test.js";
import { runSlidesEditingGroupTests } from "./unit/slides-editing-group.test.js";
import { runSlidesFormatPainterTests } from "./unit/slides-format-painter.test.js";
import { runSlidesSpellcheckRibbonTests } from "./unit/slides-spellcheck-ribbon.test.js";
import { runSlidesFormatBackgroundTests } from "./unit/slides-format-background.test.js";
import { runWriterWordCountTests } from "./unit/writer-word-count.test.js";
import { runWriterHelpTests } from "./unit/writer-help.test.js";
import { runWriterSectionBreaksPageColorTests } from "./unit/writer-sectionbreaks-pagecolor.test.js";
import { runSheetHelpTests } from "./unit/sheet-help.test.js";
import { runSlidesHelpTests } from "./unit/slides-help.test.js";
import { runWriterWordArtTests } from "./unit/writer-wordart.test.js";
import { runSlidesAnimationPaneSetupShowTests } from "./unit/slides-animation-pane-setup-show.test.js";
import { runWriterIllustrationDialogTests } from "./unit/writer-illustration-dialogs.test.js";
import { runSheetEvaluateFormulaTests } from "./unit/sheet-evaluate-formula.test.js";
import { runSheetConsolidateTests } from "./unit/sheet-consolidate.test.js";
import { runSlidesSectionsTests } from "./unit/slides-sections.test.js";
import { runWriterEnvelopesLabelsTests } from "./unit/writer-envelopes-labels.test.js";
import { runSheetRealexportFodsTests } from "./unit/sheet-realexport-fods.test.js";
import { runWriterFodtPhaseATests } from "./unit/writer-fodt-phase-a.test.js";
import { runSheetXlsxNativePostprocessTests } from "./unit/sheet-xlsx-native-postprocess.test.js";
import { runSheetXlsxNativeOpenOverlayTests } from "./unit/sheet-xlsx-native-open-overlay.test.js";
import { runSlidesPptxMasterLogoTests } from "./unit/slides-pptx-master-logo.test.js";
import { runWriterFodtPhaseBTests } from "./unit/writer-fodt-phase-b.test.js";
import { runWriterFodtPhaseB2Tests } from "./unit/writer-fodt-phase-b2.test.js";
import { runWriterFodtPhaseCTests } from "./unit/writer-fodt-phase-c.test.js";
import { runWriterFodtPhaseDTests } from "./unit/writer-fodt-phase-d.test.js";
import { runWriterFodtPhaseE1Tests } from "./unit/writer-fodt-phase-e1.test.js";
import { runWriterFodtPhaseE2Tests } from "./unit/writer-fodt-phase-e2.test.js";
import { runWriterFodtPhaseE3WordArtTests } from "./unit/writer-fodt-phase-e3-wordart.test.js";
import { runWriterFodtPhaseE4ChartTests } from "./unit/writer-fodt-phase-e4-chart.test.js";
import { runSlidesPptxSectionListTests } from "./unit/slides-pptx-section-list.test.js";
import { runSlidesPptxSectionsOpenOverlayTests } from "./unit/slides-pptx-sections-open-overlay.test.js";
import { runSlidesPptxMasterLogoOpenOverlayTests } from "./unit/slides-pptx-masterlogo-open-overlay.test.js";
import { runSlidesPptxShowPropertiesTests } from "./unit/slides-pptx-show-properties.test.js";
import { runSlidesPptxSetupShowOpenOverlayTests } from "./unit/slides-pptx-setup-show-open-overlay.test.js";
import { runWriterParagraphSpacingTests } from "./unit/writer-paragraph-spacing.test.js";
import { runWriterLineNumbersTests } from "./unit/writer-line-numbers.test.js";
import { runSheetCellOrientationTests } from "./unit/sheet-cell-orientation.test.js";
import { runWriterMultilevelListTests } from "./unit/writer-multilevel-list.test.js";
import { runSheetPrintPreviewTests } from "./unit/sheet-print-preview.test.js";
import { runSlidesPrintPreviewTests } from "./unit/slides-print-preview.test.js";
import { runSheetPagesetupRealFileImportTests } from "./unit/sheet-pagesetup-real-file-import.test.js";
import { runWriterFodtRealDocxParsingTests } from "./unit/writer-fodt-real-docx-parsing.test.js";
import { runBackstagePrintThumbnailTests } from "./unit/backstage-print-thumbnail.test.js";

async function runAll() {
  console.log("==================================================");
  console.log("      VN OFFICE AUTOMATED TEST SUITE RUNNER       ");
  console.log("==================================================");

  let total = 0;
  let passed = 0;
  let failed = 0;

  const suites = [
    { title: "1. Unit Tests — Command Bus", runner: runCommandBusTests },
    { title: "2. Unit Tests — LibreOffice Adapter Mapping", runner: runAdapterMappingTests },
    { title: "3. Unit Tests — Excel Spreadsheet Formula Engine", runner: runFormulaEngineTests },
    { title: "4. Unit Tests — Formula Autocomplete & Parameter IntelliSense", runner: runFormulaAutocompleteTests },
    { title: "5. Unit Tests — Vietnamese i18n Localization Layer", runner: runI18nTests },
    { title: "6. Smoke Tests — Suite & Vietnamese Unicode", runner: runSuiteSmokeTests },
    { title: "7. Syntax & Codebase Integrity — node --check", runner: runSyntaxCheckTests },
    { title: "8. Smoke Tests — Application Entrypoints & index.html Runtime", runner: runHtmlSmokeTests },
    { title: "9. Unit Tests — AI Service Provider Orchestration", runner: runAiServiceTests },
    { title: "9b. Unit Tests — AI API Key Manager", runner: runApiKeyManagerTests },
    { title: "9c. Unit Tests — AI Cloud Providers (mock fetch)", runner: runCloudProviderTests },
    { title: "10. Unit Tests — VN Sheet Real File I/O & CSV Adapter", runner: runSheetFileIoTests },
    { title: "11. Unit Tests — VN Slides Real File I/O & FODP Adapter", runner: runSlidesFileIoTests },
    { title: "12. Unit Tests — VN Sheet Multi-Sheet Data Isolation", runner: runMultiSheetTests },
    { title: "13. Behavioral Tests — VN Writer Comments", runner: runWriterCommentsTests },
    { title: "14. Unit Tests — VN Slides Object Animations & Speaker Notes", runner: runSlidesAnimationsNotesTests },
    { title: "15. Behavioral Tests — Sheet Conditional Formatting & Data Validation", runner: runSheetRulesValidationTests },
    { title: "16. Behavioral Tests — VN Writer Track Changes", runner: runWriterTrackChangesTests },
    { title: "17. Behavioral Tests — VN Writer Print Preview", runner: runWriterPrintPreviewTests },
    { title: "18. Behavioral Tests — VN Slides Slide Layouts", runner: runSlidesLayoutsTests },
    { title: "19. Behavioral Tests — VN Sheet Live Charts", runner: runSheetChartTests },
    { title: "20. Behavioral Tests — VN Sheet Deep Undo/Redo", runner: runSheetUndoRedoTests },
    { title: "21. Behavioral Tests — VN Writer Deep Undo/Redo History", runner: runWriterUndoRedoTests },
    { title: "22. Unit Tests — VN Sheet Lookup & Conditional Functions", runner: runSheetLookupConditionalFunctionTests },
    { title: "23. Behavioral Tests — VN Sheet Pivot Table", runner: runSheetPivotTableTests },
    { title: "24. Behavioral Tests — VN Slides Slide Sorter View", runner: runSlidesSorterViewTests },
    { title: "25. Behavioral Tests — VN Writer Table of Contents & Footnotes/Endnotes", runner: runWriterTocFootnotesTests },
    { title: "26. Behavioral Tests — VN Sheet Named Ranges & Advanced TEXT/DATE", runner: runSheetNamedRangesTextDateTests },
    { title: "27. Behavioral Tests — VN Writer Mail Merge", runner: runWriterMailMergeTests },
    { title: "28. Behavioral Tests — VN Sheet Comments, Print Area & Page Breaks", runner: runSheetCommentsPrintAreaTests },
    { title: "29. Behavioral Tests — VN Slides Rehearse Timings & Embed Media", runner: runSlidesTimingsMediaTests },
    { title: "30. Behavioral Tests — VN Writer Style Gallery & Watermark / Page Border", runner: runWriterStyleGalleryWatermarkTests },
    { title: "31. Behavioral Tests — VN Sheet View & VN Slides Review Comments", runner: runSheetViewSlidesCommentsTests },
    { title: "32. Behavioral Tests — VN Writer Columns", runner: runWriterColumnsTests },
    { title: "33. Behavioral Tests — VN Sheet Row & Column Insert", runner: runSheetRowColInsertTests },
    { title: "34. Behavioral Tests — Sheet/Slides i18n & Standard Shortcuts", runner: runSheetSlidesI18nShortcutTests },
    { title: "35. Behavioral & Unit Tests — VN Writer i18n & Word Shortcuts", runner: runWriterI18nShortcutsTests },
    { title: "36. Behavioral Tests — VN Sheet Cross-Sheet & Array Formulas", runner: runSheetArrayFormulaTests },
    { title: "37. Behavioral Tests — VN Slides SmartArt-like Diagrams", runner: runSlidesDiagramTests },
    { title: "38. Runtime Tests — Active App Shortcut Scope", runner: runShortcutScopeTests },
    { title: "39. Behavioral & Unit Tests — VN Writer References & Mailings Audit", runner: runWriterRefMailAuditTests },
    { title: "40. Behavioral Tests — VN Sheet Insert Pictures", runner: runSheetImageTests },
    { title: "41. Behavioral Tests — VN Slides Slide Size", runner: runSlidesSlideSizeTests },
    { title: "42. Behavioral & Unit Tests — VN Writer Ribbon Breadth (Sub/Sup, Illustrations, Themes, Links)", runner: runWriterRibbonBreadthTests },
    { title: "43. Behavioral & Unit Tests — VN Sheet Keyboard Entry & Formula Evaluation", runner: runSheetKeyboardAuditTests },
    { title: "44. Behavioral & Unit Tests — VN Sheet Format Cells Dialog & Number Formats", runner: runSheetFormatCellsTests },
    { title: "45. Behavioral & Unit Tests — VN Sheet Styles & Editing Groups", runner: runSheetEditingStylesTests },
    { title: "46. Unit Tests — VN Sheet Cross-Sheet Reference Functions", runner: runSheetReferenceFunctionTests },
    { title: "47. Unit Tests — VN Sheet Math & Statistics Functions", runner: runSheetMathStatFunctionTests },
    { title: "48. Unit Tests — VN Sheet Text Functions", runner: runSheetTextFunctionTests },
    { title: "49. Unit Tests — VN Sheet Date Functions", runner: runSheetDateFunctionTests },
    { title: "50. Behavioral & Unit Tests — VN Sheet Mouse Interactions & Office Parity Shortcuts", runner: runSheetMouseShortcutsTests },
    { title: "51. Behavioral & Unit Tests — VN Writer Mouse Interactions & Office Parity Shortcuts", runner: runWriterMouseShortcutsTests },
    { title: "52. Behavioral & Unit Tests — Real Office Home Ribbon Gaps", runner: runRibbonGapsRealOfficeTests },
    { title: "53. Behavioral & Unit Tests — VN Slides Mouse Interactions & Office Parity Shortcuts", runner: runSlidesMouseShortcutsTests },
    { title: "54. Behavioral & Unit Tests — Writer/Slides Insert Tab Gaps (Word/PowerPoint)", runner: runWriterSlidesInsertGapsTests },
    { title: "55. Behavioral & Unit Tests — VN Sheet Data Tools & Outline", runner: runSheetDataToolsTests },
    { title: "56. Behavioral & Unit Tests — VN Slides Dialogs & Overlays Accessibility (WCAG 2.1 / ARIA)", runner: runSlidesDialogsA11yTests },
    { title: "57. Automated Audit — Suite-Wide WCAG 2.1 Color Contrast (AA / AAA)", runner: runColorContrastAuditTests },
    { title: "58. Unit Tests — Real Office File Import Fidelity (DOCX/XLSX/PPTX via soffice HTML/FODS/FODP)", runner: runRealOfficeImportFidelityTests },
    { title: "59. Unit Tests — Vietnamese Writer Spellchecker", runner: runVietnameseSpellcheckerTests },
    { title: "60. Behavioral & Unit Tests — VN Sheet & VN Slides Real View Tabs", runner: runSheetSlidesViewTabTests },
    { title: "61. Behavioral & Unit Tests — Vietnamese Slides Spellchecker", runner: runSlidesSpellcheckViTests },
    { title: "61b. Behavioral & Unit Tests — Vietnamese Sheet Spellchecker (F7 dialog scan)", runner: runSheetSpellcheckViTests },
    { title: "62. Behavioral & Unit Tests — VN Sheet Real Formulas Tab (Function Library, Defined Names, Auditing, Calculation Mode)", runner: runSheetFormulasTabTests },
    { title: "63. Desktop Launch Context — Single App & Web Suite Mode", runner: runDesktopLaunchContextTests },
    { title: "64. Round-trip Tests — VN Sheet CF & Data Validation Save FODS", runner: runSheetCfValidationFodsRoundTripTests },
    { title: "65. Unit Tests — Writer Track Changes Import Fidelity (real DOCX w:ins/w:del)", runner: runWriterTrackChangesImportTests },
    { title: "66. Unit Tests — Writer Comments Import Fidelity (real DOCX w:comment)", runner: runWriterCommentsImportTests },
    { title: "67. Unit Tests — Sheet Pivot Table Import Fidelity (real XLSX DataPilot)", runner: runSheetPivotImportTests },
    { title: "68. Round-trip Tests — Sheet Pivot Table Save FODS", runner: runSheetPivotSaveFodsTests },
    { title: "69. Behavioral Tests — VN Sheet Merge Cells", runner: runSheetMergeCellsTests },
    { title: "70. Behavioral Tests — VN Sheet Paste Special", runner: runSheetPasteSpecialTests },
    { title: "71. Unit Tests — Slides SmartArt Import Fidelity (real PPTX DrawingML → FODP)", runner: runSlidesSmartartImportTests },
    { title: "72. Unit Tests — Writer Header/Footer Import Fidelity (real DOCX → StarWriter HTML)", runner: runWriterHeaderFooterImportTests },
    { title: "73. Behavioral Tests — VN Slides Diagram Group Select / Move / Delete", runner: runSlidesDiagramGroupSelectTests },
    { title: "74. Unit Tests — Writer Footnotes/Endnotes Import Fidelity (real DOCX → StarWriter HTML)", runner: runWriterFootnotesImportTests },
    { title: "75. Unit Tests — Slides Speaker Notes Import Fidelity (real PPTX notesSlides → FODP)", runner: runSlidesSpeakernotesImportTests },
    { title: "76. Unit Tests — Sheet Charts Import Fidelity (real XLSX DrawingML chart → FODS)", runner: runSheetChartsImportTests },
    { title: "77. Unit Tests — Writer Tables Import Fidelity (real DOCX w:tbl merge/border/shading)", runner: runWriterTablesImportTests },
    { title: "78. Behavioral Tests — VN Slides WordArt (chữ nghệ thuật)", runner: runSlidesWordArtTests },
    { title: "79. Behavioral Tests — VN Sheet Format Painter", runner: runSheetFormatPainterTests },
    { title: "80. Accessibility Audit — Keyboard Navigation for New Features (Paste Special, Merge Cells, Sections, WordArt, SmartArt Group Select, Dark Mode Toggle)", runner: runA11yAuditNewFeaturesTests },
    { title: "81. Behavioral Tests — VN Sheet Goal Seek", runner: runSheetGoalSeekTests },
    { title: "81b. Behavioral Tests — VN Sheet What-If Analysis", runner: runSheetWhatIfAnalysisTests },
    { title: "81c. Behavioral Tests — VN Sheet PivotChart", runner: runSheetPivotChartTests },
    { title: "82. Behavioral Tests — VN Writer Arrange Group", runner: runWriterArrangeTests },
    { title: "83. Behavioral Tests — VN Slides Hide Slide (Ẩn trang chiếu)", runner: runSlidesHideSlideTests },
    { title: "84. Behavioral Tests — VN Slides Insert Chart", runner: runSlidesChartTests },
    { title: "85. Behavioral Tests — VN Writer Citations & Bibliography", runner: runWriterCitationsTests },
    { title: "86. Behavioral Tests — VN Slides Font & Paragraph (Home tab)", runner: runSlidesFontParagraphTests },
    { title: "87. Behavioral Tests — VN Writer Captions & Table of Figures", runner: runWriterCaptionsTests },
    { title: "88. Behavioral Tests — VN Sheet Home Cells Format dropdown (row/col size & hide)", runner: runSheetFormatDropdownTests },
    { title: "97. Behavioral Tests — VN Sheet Rename / Move-Copy / Protect Sheet", runner: runSheetRenameMoveProtectTests },
    { title: "99. Behavioral Tests — VN Sheet Protect Workbook", runner: runSheetProtectWorkbookTests },
    { title: "100. Behavioral Tests — VN Slides Home Editing group (Find/Replace/Select)", runner: runSlidesEditingGroupTests },
    { title: "89. Behavioral Tests — VN Slides Format Painter", runner: runSlidesFormatPainterTests },
    { title: "90. Behavioral Tests — VN Slides Review Spellcheck Ribbon", runner: runSlidesSpellcheckRibbonTests },
    { title: "91. Behavioral Tests — VN Slides Format Background", runner: runSlidesFormatBackgroundTests },
    { title: "92. Behavioral Tests — VN Writer Word Count", runner: runWriterWordCountTests },
    { title: "93. Behavioral Tests — VN Writer In-app Help", runner: runWriterHelpTests },
    { title: "93b. Behavioral Tests — VN Writer Section Breaks & Page Color", runner: runWriterSectionBreaksPageColorTests },
    { title: "94. Behavioral Tests — VN Sheet In-app Help", runner: runSheetHelpTests },
    { title: "95. Behavioral Tests — VN Slides In-app Help", runner: runSlidesHelpTests },
    { title: "96. Behavioral Tests — VN Writer WordArt (chữ nghệ thuật)", runner: runWriterWordArtTests },
    { title: "98. Behavioral Tests — VN Slides Animation Pane & Set Up Slide Show", runner: runSlidesAnimationPaneSetupShowTests },
    { title: "101. Behavioral Tests — VN Writer Illustration Dialogs (Shape/Diagram/Chart pickers)", runner: runWriterIllustrationDialogTests },
    { title: "102. Behavioral Tests — VN Sheet Evaluate Formula", runner: runSheetEvaluateFormulaTests },
    { title: "103. Behavioral Tests — VN Sheet Consolidate (Hợp nhất dữ liệu)", runner: runSheetConsolidateTests },
    { title: "104. Behavioral Tests — VN Slides Sections (nhóm trang chiếu)", runner: runSlidesSectionsTests },
    { title: "105. Behavioral Tests — VN Writer Envelopes & Labels (Mailings > Create)", runner: runWriterEnvelopesLabelsTests },
    { title: "106. Unit Tests — Sheet FODS real-export serialize (charts, page-break, sparkline, protect, outline)", runner: runSheetRealexportFodsTests },
    { title: "107. Unit Tests — Writer FODT Phase A serialize/parse", runner: runWriterFodtPhaseATests },
    { title: "108. Unit Tests — Sheet native XLSX post-process (workbookProtection lockStructure)", runner: runSheetXlsxNativePostprocessTests },
    { title: "109. Unit Tests — Sheet native XLSX open overlay (lockStructure → structure-protected)", runner: runSheetXlsxNativeOpenOverlayTests },
    { title: "110. Unit Tests — Slides native PPTX post-process (Slide Master logo p:sp)", runner: runSlidesPptxMasterLogoTests },
    { title: "111. Unit Tests — Writer FODT Phase B (table, image)", runner: runWriterFodtPhaseBTests },
    { title: "111b. Unit Tests — Writer FODT Phase B.2 (JPEG/GIF/WEBP, Text Box/shape)", runner: runWriterFodtPhaseB2Tests },
    { title: "111c. Unit Tests — Writer FODT Phase C (page-layout, header/footer, section geometry)", runner: runWriterFodtPhaseCTests },
    { title: "111d. Unit Tests — Writer FODT Phase D (footnote/endnote, comment, TOC)", runner: runWriterFodtPhaseDTests },
    { title: "111e. Unit Tests — Writer FODT Phase E.1 (Track Changes)", runner: runWriterFodtPhaseE1Tests },
    { title: "111f. Unit Tests — Writer FODT Phase E.2 (Watermark)", runner: runWriterFodtPhaseE2Tests },
    { title: "111g. Unit Tests — Writer FODT Phase E.3 (WordArt Fontwork)", runner: runWriterFodtPhaseE3WordArtTests },
    { title: "111h. Unit Tests — Writer FODT Phase E.4 (Chart native)", runner: runWriterFodtPhaseE4ChartTests },
    { title: "112. Unit Tests — Slides native PPTX post-process (p14:sectionLst)", runner: runSlidesPptxSectionListTests },
    { title: "113. Unit Tests — Slides native PPTX open overlay (p14:sectionLst → vno:section-*)", runner: runSlidesPptxSectionsOpenOverlayTests },
    { title: "114. Unit Tests — Slides native PPTX open overlay (VNOfficeMasterLogo → vno:master-theme)", runner: runSlidesPptxMasterLogoOpenOverlayTests },
    { title: "115. Unit Tests — Slides native PPTX post-process (p:showPr Set Up Show)", runner: runSlidesPptxShowPropertiesTests },
    { title: "116. Unit Tests — Slides native PPTX open overlay (p:showPr → vno Set Up Show)", runner: runSlidesPptxSetupShowOpenOverlayTests },
    { title: "117. Unit Tests — Writer paragraph spacing before/after (pt)", runner: runWriterParagraphSpacingTests },
    { title: "118. Unit Tests — Writer line numbers (FODT linenumbering-configuration)", runner: runWriterLineNumbersTests },
    { title: "119. Unit Tests — VN Sheet cell text orientation (FODS rotation + XLSX textRotation)", runner: runSheetCellOrientationTests },
    { title: "120. Unit Tests — Writer multilevel list (3 presets × 3 levels)", runner: runWriterMultilevelListTests },
    { title: "121. Unit & Behavioral Tests — VN Sheet Print Preview (Ctrl+F2) + in thật (Ctrl+P)", runner: runSheetPrintPreviewTests },
    { title: "122. Unit & Behavioral Tests — VN Slides Print Preview (Ctrl+F2) + in thật (Ctrl+P)", runner: runSlidesPrintPreviewTests },
    { title: "123. Unit Tests — VN Sheet Page Setup: đọc đúng file ODF thật (không phụ thuộc thuộc tính riêng vno:page-*)", runner: runSheetPagesetupRealFileImportTests },
    { title: "124. Unit Tests — Writer parseFodt(): đọc đúng file FODT thật từ vòng chuyển đổi DOCX (page-layout regex + text:sequence-decls)", runner: runWriterFodtRealDocxParsingTests },
    { title: "125. Unit & Behavioral Tests — VN Office Backstage Print Thumbnail & Live Preview", runner: runBackstagePrintThumbnailTests }
  ];

  for (const suite of suites) {
    console.log(`\n▶ Đang chạy: ${suite.title}`);
    try {
      const results = await suite.runner();
      for (const res of results) {
        total++;
        if (res.pass) {
          passed++;
          console.log(`  [PASS] ${res.name}`);
        } else {
          failed++;
          console.log(`  [FAIL] ${res.name}`);
          if (res.error) {
            console.error(`    ↳ Chi tiết: ${res.error}`);
          }
        }
      }
    } catch (err) {
      console.error(`  [ERROR] Lỗi không mong muốn trong suite:`, err);
      failed++;
    }
  }

  console.log("\n==================================================");
  console.log(`KẾT QUẢ KIỂM THỬ: ${passed}/${total} PASS | ${failed} FAIL`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log("Toàn bộ các bài kiểm tra đều đạt chuẩn chất lượng.");
    process.exit(0);
  }
}

runAll();
