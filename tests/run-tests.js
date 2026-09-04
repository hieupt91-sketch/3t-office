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
import { runSheetCommentsPrintAreaTests } from "./unit/sheet-comments-printarea.test.js";

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
    { title: "27. Behavioral Tests — VN Sheet Comments, Print Area & Page Breaks", runner: runSheetCommentsPrintAreaTests }
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
