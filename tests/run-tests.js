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
import { runSlidesAnimationsNotesTests } from "./unit/slides-animations-notes.test.js";

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
    { title: "13. Unit Tests — VN Slides Object Animations & Speaker Notes", runner: runSlidesAnimationsNotesTests }
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
