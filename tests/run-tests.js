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
import { runSheetFormulasTabTests } from "./unit/sheet-formulas-tab.test.js";
import { runDesktopLaunchContextTests } from "./unit/desktop-launch-context.test.js";
import { runSheetCfValidationFodsRoundTripTests } from "./unit/sheet-cf-validation-fods-roundtrip.test.js";
import { runWriterTrackChangesImportTests } from "./unit/writer-trackchanges-import.test.js";
import { runWriterCommentsImportTests } from "./unit/writer-comments-import.test.js";
import { runSheetPivotImportTests } from "./unit/sheet-pivot-import.test.js";

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
    { title: "62. Behavioral & Unit Tests — VN Sheet Real Formulas Tab (Function Library, Defined Names, Auditing, Calculation Mode)", runner: runSheetFormulasTabTests },
    { title: "63. Desktop Launch Context — Single App & Web Suite Mode", runner: runDesktopLaunchContextTests },
    { title: "64. Round-trip Tests — VN Sheet CF & Data Validation Save FODS", runner: runSheetCfValidationFodsRoundTripTests },
    { title: "65. Unit Tests — Writer Track Changes Import Fidelity (real DOCX w:ins/w:del)", runner: runWriterTrackChangesImportTests },
    { title: "66. Unit Tests — Writer Comments Import Fidelity (real DOCX w:comment)", runner: runWriterCommentsImportTests },
    { title: "67. Unit Tests — Sheet Pivot Table Import Fidelity (real XLSX DataPilot)", runner: runSheetPivotImportTests }
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
