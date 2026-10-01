# Agent Handoff

TASK: CH-7.1 — Shared Find and Replace (Ctrl+F, Ctrl+H, F3, Shift+F3) for 3T Doc, 3T Sheet and 3T Slide & Desktop CDP Proof
AGENT/ROLE: Opencode / Platform & App Integration
BRANCH: feat/ch7-find-replace-opencode
WORKTREE: E:\VNOffice-opencode-findreplace
OBJECTIVE: Resolve merge conflicts with `main` (CH-8 UI/Help consistency, CH-6 desktop test harness, cold-start G12 lazy dialogs), retain all suites and features from both sides, verify full test gate, and provide desktop CDP proof for Find/Replace with Vietnamese diacritics and 1-step undo across 3T Doc, 3T Sheet, and 3T Slide.

## 1. Merge Conflict Resolution
Merged branch `main` into `feat/ch7-find-replace-opencode`.
Resolved content conflicts in:
- `apps/sheet/sheet-grid.js`: Kept both `createLazyDialogs("sheet")` (cold-start optimization) and `createMatcher` from `find-engine.js`.
- `apps/slides/slides-canvas.js`: Kept main's lazy feature loaders, wordart, and chart utilities alongside `createMatcher` for slide canvas search & replace.
- `tests/run-tests.js`: Kept all suites from both branches. Suite 168 (Shared Find and Replace, 9 tests), Suite 169 (CH-8 UI Consistency), and Suite 170 (OS Input Safety Guard) are registered.

## 2. Test Execution & Gate Results

### A. Node Full Test Gate (`node tests/run-tests.js`)
All 170 test suites executed in foreground:
```
==================================================
KẾT QUẢ KIỂM THỬ: 2277/2277 PASS | 0 FAIL
==================================================
Toàn bộ các bài kiểm tra đều đạt chuẩn chất lượng.
```
- Known load-sensitive soffice FODS->XLSX pivot conversion tests: passed cleanly under this run.
- Total test count: 2277 (Main baseline 2268 + 9 new shared Find/Replace unit tests).

### B. Python Full Test Gate (`python -m unittest discover -s tests`)
```
Ran 544 tests in 409.049s

OK
END-TO-END 0.9.1 apply=OK health_marker=OK relaunch=OK
END-TO-END 0.9.2 crash=detected rollback=OK relaunch_old=OK
END-TO-END tampered_manifest=refused blobs_downloaded=0
END-TO-END 0.9.1 downloaded_bytes=48 package_bytes=12441
```
544 tests run, 544 passed (0 FAIL, 0 ERROR).

### C. Desktop Regression Harness (`node --experimental-websocket tests/live/cdp/run-desktop-regression.mjs`)
Executed via CDP with isolated `LOCALAPPDATA` and WebView2 remote debugging port:
```
STATUS | CHECK                                   | DETAIL
-------+-----------------------------------------+-------------------------------------------------------------------------
PASS   | 3T Doc startup typing                   | CDP Startup Writer
PASS   | 3T Doc Enter/Tab                        | {"text":"CDP Startup WriterCDPKey\n\nCDPNext","paragraphs":2}
PASS   | 3T Doc Ctrl+C/X/V                       | {"copyKeptSelection":true,"cutLength":10,"pasteLength":39}
N/A    | 3T Doc type detection                   | Data type detection applies to 3T Sheet.
N/A    | 3T Doc formula entry with point mode    | Formula point mode applies to 3T Sheet.
PASS   | 3T Doc Writer Tab character insertion   | {"text":"TabA\tTabB","html":"TabA<span class=\"vno-tab-character\" data-vno-tab-character=\"true\">\tTabB</span>","active":"vno-writer-body"}
PASS   | 3T Doc New                              | WebView2 pages 1 -> 2
PASS   | 3T Doc Save As                          | cdp-regression-writer.docx 5504 bytes
PASS   | 3T Doc Save                             | {"dirty":false,"bytes":5462}
PASS   | 3T Doc Open                             | {"file":"cdp-regression-writer.docx","title":"cdp-regression-writer.docx","contentLength":1804}
PASS   | 3T Doc Print to PDF                     | {"pages":1,"engine":"Microsoft Office","bytes":86775,"previewVisible":false}
PASS   | 3T Sheet startup typing                 | 2468
PASS   | 3T Sheet Enter/Tab                      | {"a1":"123","a2":"alpha","b2":"beta"}
PASS   | 3T Sheet Ctrl+C/X/V                     | {"a1":"Clipboard","b1":"","c1":"Clipboard"}
FAIL   | 3T Sheet type detection                 | {"detected":{"numberDetected":false,"dateDetected":false,"timeDetected":false,"percentageDetected":false,"textPreserved":true,"leadingZeroPreserved":true},"state":[{"coord":"A1","value":"1234.56","valueType":"string","formula":"","dataType":"","numberFormat":null,"formatCategory":""},{"coord":"A2","value":"31/12/2026","valueType":"string","formula":"","dataType":"","numberFormat":null,"formatCategory":""},{"coord":"A3","value":"13:45","valueType":"string","formula":"","dataType":"","numberFormat":null,"formatCategory":""},{"coord":"A4","value":"25%","valueType":"string","formula":"","dataType":"","numberFormat":null,"formatCategory":""},{"coord":"A5","value":"abc","valueType":"string","formula":"","dataType":"","numberFormat":null,"formatCategory":""},{"coord":"A6","value":"0123","valueType":"string","formula":"","dataType":"","numberFormat":null,"formatCategory":""}]}
PASS   | 3T Sheet formula entry with point mode  | {"editState":{"formulaBar":"=A1+A2","active":"vno-formula-input has-reference-colors"},"result":{"value":"5","formula":"=A1+A2","modelValue":5,"formulaBar":"beta"}}
N/A    | 3T Sheet Writer Tab character insertion | This behavior belongs to 3T Doc.
FAIL   | 3T Sheet New                            | WebView2 pages 1 -> 1
PASS   | 3T Sheet Save As                        | cdp-regression-sheet.xlsx 5126 bytes
PASS   | 3T Sheet Save                           | {"dirty":false,"bytes":5374}
PASS   | 3T Sheet Open                           | {"file":"cdp-regression-sheet.xlsx","title":"cdp-regression-sheet.xlsx","contentLength":7917}
PASS   | 3T Sheet Print to PDF                   | {"pages":1,"engine":"Microsoft Office","bytes":78347,"previewVisible":false}
PASS   | 3T Slide startup typing                 | CDP Startup Slides
PASS   | 3T Slide Enter/Tab                      | {"text":"CDP Startup SlidesCDPSlideEnterA\nCDPSlideEnterB","canvas":true,"active":"vno-slide-body is-selected"}
FAIL   | 3T Slide Ctrl+C/X/V                     | {"clipboardHasMarker":true,"caretReady":true,"afterCutLength":1,"afterPasteLength":1}
N/A    | 3T Slide type detection                 | Data type detection applies to 3T Sheet.
N/A    | 3T Slide formula entry with point mode  | Formula point mode applies to 3T Sheet.
N/A    | 3T Slide Writer Tab character insertion | This behavior belongs to 3T Doc.
FAIL   | 3T Slide New                            | WebView2 pages 1 -> 1
PASS   | 3T Slide Save As                        | cdp-regression-slides.pptx 8043 bytes
PASS   | 3T Slide Save                           | {"dirty":false,"bytes":8082}
PASS   | 3T Slide Open                           | {"file":"cdp-regression-slides.pptx","title":"cdp-regression-slides.pptx","contentLength":5668}
PASS   | 3T Slide Print to PDF                   | {"pages":1,"engine":"LibreOffice","bytes":91286,"previewVisible":false}

TOTAL: 23 PASS, 4 FAIL, 0 BLOCKED, 6 N/A
```
Baseline parity achieved: Exactly 23 PASS / 4 FAIL / 6 N/A matching `main`.

### D. Desktop Find/Replace & Undo Proof (`node --experimental-websocket tests/live/cdp/find-replace.desktop.mjs`)
Real desktop app launched via CDP, typing Vietnamese with diacritics, opening Find dialog with trusted CDP Ctrl+F key events, matching diacritics, switching to Replace with Ctrl+H, replacing all, and restoring with Ctrl+Z in ONE undo:
```
▶ Starting desktop CDP proof for 3T Doc...
  [PASS] 3T Doc: Found 'Việt Nam' -> Replaced with 'Hà Nội' -> Restored via Ctrl+Z in 1 undo

▶ Starting desktop CDP proof for 3T Sheet...
  [PASS] 3T Sheet: Found 'Hà Nội' -> Replaced with 'Đà Nẵng' -> Restored via Ctrl+Z in 1 undo

▶ Starting desktop CDP proof for 3T Slide...
  [PASS] 3T Slide: Found 'tiếng Việt' -> Replaced with 'toàn cầu' -> Restored via Ctrl+Z in 1 undo

STATUS | CHECK                               | DETAIL
-------+-------------------------------------+-------------------------------------------------------------------------
PASS   | 3T Doc Find/Replace & 1-step Undo   | Found 'Việt Nam' -> Replaced with 'Hà Nội' -> Restored via Ctrl+Z in 1 undo
PASS   | 3T Sheet Find/Replace & 1-step Undo | Found 'Hà Nội' -> Replaced with 'Đà Nẵng' -> Restored via Ctrl+Z in 1 undo
PASS   | 3T Slide Find/Replace & 1-step Undo | Found 'tiếng Việt' -> Replaced with 'toàn cầu' -> Restored via Ctrl+Z in 1 undo

TOTAL: 3 PASS, 0 FAIL
```

## 3. Safety Guard Compliance
- Rejected all OS-level automation APIs: No `SendKeys`, `SendInput`, `keybd_event`, `mouse_event`, or `pyautogui`.
- All interactions driven through pure Chrome DevTools Protocol (`Input.dispatchKeyEvent`, `Input.dispatchMouseEvent`, `Input.insertText`).
- Verified by `tests/unit/os-input-guard.test.js` (PASS).
