# Agent Handoff
TASK: iOS/iPadOS adaptive mobile UI
AGENT/ROLE: agy / Mobile UI
BRANCH: agy/ios-mobile-ui
WORKTREE: /Users/hieupc/.codex/worktrees/ios-mobile-ui/3t-office
OBJECTIVE: Replace desktop-shaped iOS presentation with touch-first adaptive iPhone/iPad chrome while keeping the app fully offline.
FINDINGS: UIKit must own the top safe area; CSS-only top insets were inconsistent in WKWebView. A mutation observer also needs idempotent updates or it can starve WebKit rendering.
IMPLEMENTATION SUMMARY: Added an offline adaptive UI script, compact iPhone command dock, on-demand formatting ribbon, iPad sidebar control, keyboard/size-class bridge, safe-area correction, app-specific mobile CSS and accessibility states.
FILES CHANGED: See docs/mobile/HANDOFF-IOS-ADAPTIVE-UI.md.
COMMANDS RUN: Focused unittest; node --check; Xcode Simulator build; native install/launch/screenshots on iPhone 17 Pro and iPad Air 11-inch M3.
BUILD RESULT: PASS — Debug iphonesimulator app built.
TEST RESULTS: PASS — 8/8 focused tests, Xcode build, and native portrait render for Writer/Sheet/Slides on both device classes. BLOCKED — iPhone keyboard screenshot after Simulator window switch. NOT RUN — landscape and iPad Split View automation.
KNOWN FAILURES: No known failure in tested portrait layouts. Orientation command is unavailable in this simctl version; Computer Use could not map coordinates after switching Simulator device windows.
RISKS: DOM selector coupling, WebKit contenteditable differences, no real-device/Pencil/Stage Manager coverage.
DEPENDENCIES/BLOCKERS: Shared Platform mobile command API is recommended before broad feature expansion.
CORE PATCH ID (if any): None.
NEXT ACTION: Test physical iPhone/iPad, landscape and Split View; then add document picker bridge.

---

# Agent Handoff
TASK: I2 — iOS/iPadOS native offline file workflow
AGENT/ROLE: OpenCode delegate / iOS Platform
BRANCH: mobile/ios-native-files
WORKTREE: /Users/hieupc/.codex/worktrees/ios-native-files/3t-office
OBJECTIVE: Add a truthful native Files open/save bridge without claiming unsupported OOXML round-trip.
FINDINGS: The existing JS adapters can directly consume/produce Writer HTML, Sheet FODS and Slide FODP. DOCX/XLSX/PPTX still require an engine unavailable on iOS.
IMPLEMENTATION SUMMARY: Added UIDocumentPicker, security-scoped coordinated I/O, atomic export/in-place save, format/content guards, 24 MB limit, Vietnamese error/help states and document type declarations. No shared source or external dependency changed.
FILES CHANGED: See docs/mobile/HANDOFF-IOS-NATIVE-FILES-I2.md.
COMMANDS RUN: Focused Python unittest; plist/shell validation; Xcode Simulator build; native iPad install/launch and visual picker/help/cancel checks.
BUILD RESULT: PASS — Debug iphonesimulator app built.
TEST RESULTS: PASS — focused 7/7; native app, help panel, UIDocumentPicker presentation and cancel return on iPad Simulator. NOT RUN — file-provider fixture selection/export completion and real devices.
KNOWN FAILURES: DOCX/XLSX/PPTX are intentionally BLOCKED; they are not converted or overwritten. Full Office round-trip is not implemented.
RISKS: Provider access/save conflicts need device testing; 24 MB bridge limit is provisional; HTML is deliberately rejected when active content is detected.
DEPENDENCIES/BLOCKERS: A separately reviewed offline OOXML adapter is required for Office formats. No blocker for the supported flat formats.
CORE PATCH ID (if any): None.
NEXT ACTION: Integrate after review, then run real-device/provider fixtures for HTML/FODS/FODP before widening format support.

---

# Agent Handoff
TASK: iOS/iPadOS offline shell and mobile-responsive UI
AGENT/ROLE: Codex / Mobile Architecture
BRANCH: mobile/ios-offline-analysis
WORKTREE: /Users/hieupc/.codex/worktrees/ios-offline-analysis/3t-office
OBJECTIVE: Deliver the first offline universal iPhone/iPad shell with device-appropriate UI.
FINDINGS: ES modules require the bundled vno:// scheme in WKWebView; file loading produced a blank UI. Desktop chrome needs dedicated compact/regular mobile layouts.
IMPLEMENTATION SUMMARY: Added the Swift/WKWebView target, offline asset handler/staging, iPhone compact toolbar, iPad touch ribbon, safe-area constraints and focused tests. No dependency was added.
FILES CHANGED: See docs/mobile/HANDOFF-IOS-OFFLINE-ANALYSIS-0.9.11.md.
COMMANDS RUN: Xcode Simulator build; native install/launch/screenshots on iPhone 17 Pro and iPad Air 11-inch; focused/full tests.
BUILD RESULT: PASS — Debug iphonesimulator app built.
TEST RESULTS: PASS — 6/6 focused and native render on both device classes. FAIL — npm 3151/3167 environment/baseline probes. BLOCKED — full Python lacks webview in system Python.
KNOWN FAILURES: Cold first Simulator render can take 20–25 seconds; document picker, OOXML round-trip and real-device tests are not implemented yet.
RISKS: WebKit editing differences and OOXML data loss unless unsupported features are read-only/Save a Copy.
DEPENDENCIES/BLOCKERS: ZIP/XML dependency audit, real devices and later signing.
CORE PATCH ID (if any): None.
NEXT ACTION: Add native document picker/security-scoped URL bridge, then guarded format adapters.

---

# Agent Handoff
TASK: FIX-P1b (Sheet formula regression audit and P1 edit latency)
AGENT/ROLE: Codex / Sheet QA
BRANCH: fix/sheet-p1b-codex
WORKTREE: E:\VNOffice-codex-fp1b
OBJECTIVE: Verify each of the 28 real XLSX files matches its pre-P1 formula-cache baseline, lan01 remains 100%, and quick-view first-character/Enter latency stays within 100/300 ms.
FINDINGS: The corrected desktop audit matches the pre-P1 baseline commit 0be02c89 exactly for all 28 files: 72,707/72,837 (99.82%); lan01 is 865/865 (100%). The background preview check on lan01 verified 78/78 visible cross-sheet formulas. Closed external-workbook formulas must use the workbook's stored cached values, matching the app's offline behavior. Latency probe results (first key / Enter): lan01 39/42 ms; lan04 35/43 ms; lan06 32/48 ms; lan09 32/46 ms; lan16 40/47 ms. Each edit was retained in the quick-view journal during 12% background load. XLSX round-trip audit: 7/8 PASS; lan11 has a conditional-formatting L2 difference already present in the pre-P1 structural audit.
IMPLEMENTATION SUMMARY: Corrected audit timing and offline external-link semantics, added per-file baseline gates and quick-view checks, and made the typing probe wait for the editable preview and verify a retained edit. No product source changes were needed because the desktop formula results already meet the ticket baseline.
FILES CHANGED: scripts/audit-0610/sheet_formulas_vs_cache.mjs; scripts/audit-0610/probe_typing_cost.mjs; 09-templates/AGENT-HANDOFF.md.
COMMANDS RUN: npm test; python -m unittest discover -s tests; 28-file desktop sheet_formulas_vs_cache audit against 0be02c89; dirty-save XLSX round-trip for lan01/02/04/06/09/11/22/26; desktop CDP typing probe for lan01/04/06/09/16; node --check scripts/audit-0610/probe_typing_cost.mjs. Desktop runs used VNO_CDP_LOCALAPPDATA=E:\VNOffice-profiles\codex-fp1b and E: TEMP/TMP.
BUILD RESULT: NOT RUN (no build was required by the ticket).
TEST RESULTS: PASS — npm test 3119/3119; Python unittest 912 tests; formula baseline gate 28/28 files with zero per-file regressions; typing metrics all within thresholds. XLSX round-trip 7/8 PASS; lan11's L2 CF difference is documented in the pre-P1 structural audit.
KNOWN FAILURES: No formula-baseline regressions. lan02 (2/4), lan14 (68,121/68,125), lan19 (4/5), and lan28 (152/275) retain the same pre-P1 per-file results; lan23 has no formulas to evaluate. lan11 CF L2 is pre-existing.
RISKS: The formula-cache check intentionally treats closed external workbook links as stored offline values; recalculating those formulas without the linked workbook does not represent app behavior.
DEPENDENCIES/BLOCKERS: None.
CORE PATCH ID (if any): None.
NEXT ACTION: Review the committed audit/handoff changes, then merge FIX-P1b. P2 merge is not required for this task because no product formula changes were needed.

---

# Agent Handoff
TASK: E0 — Restore VLOOKUP for numeric lookup values and text identifier keys
AGENT/ROLE: Codex / Sheet Formula Engine
BRANCH: fix/excel-e0-codex
WORKTREE: E:\VNOffice-codex-fe0
OBJECTIVE: Fix the first-load formula-cache regression on lan28 and verify all 28 real workbooks without per-file regressions.
FINDINGS: On the desktop load path, lan28 had 12 sheets and the lookup source was fully loaded (315 cells, 105 populated A-column keys). B3 loaded as numeric 20413. Source key A40 was text-formatted "00020413" and passed the existing text-cell marker, but the exact-lookup index's numeric branch only checked numMap and concluded #N/A before considering eligible text identifiers.
IMPLEMENTATION SUMMARY: Added a numericTextMap to both regular lookup indexes and whole-column VLOOKUP indexes for text-formatted zero-padded identifiers and six-or-more-digit codes. Numeric exact lookup consults this index after the native numeric index misses, while short text such as "5" remains distinct from number 5. Existing FormulaEngine regression cases cover zero-padded IDs, long digit codes, and short numeric text.
FILES CHANGED: apps/sheet/formula-engine.js; 09-templates/AGENT-HANDOFF.md.
COMMANDS RUN: npm test; desktop 28-file audit: node --experimental-websocket scripts/audit-0610/sheet_formulas_vs_cache.mjs --force --report E:\VNOffice-temp\e0-audit-28-after.md. All desktop profile and TEMP data were stored under E:\VNOffice-temp.
BUILD RESULT: NOT RUN (no build requested or required for this JavaScript engine change).
TEST RESULTS: PASS — npm test 3136/3136. Fresh --force audit evaluated 72,837 formulas across all 28 files; lan28 improved from 152/275 (55.27%) to 270/275 (98.18%), exceeding 0.9.9's 97.45% gate. Lan28 VLOOKUP mismatches were eliminated. Other recorded baseline exceptions remained unchanged: lan02 2/4, lan14 68,121/68,125, lan19 4/5; lan23 had no evaluable formulas.
KNOWN FAILURES: The five remaining lan28 mismatches are outside VLOOKUP; report examples include S18, M1, A2, and B2. The audit report is on E:\VNOffice-temp and was not added to the repository.
RISKS: Numeric-to-text matching is limited to text-formatted zero-padded identifiers or digit strings of at least six characters, preserving the existing distinction for short numeric text.
DEPENDENCIES/BLOCKERS: None.
CORE PATCH ID (if any): None.
NEXT ACTION: Commit this E0 fix for independent review and merge following review.
