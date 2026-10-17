# Audit AGY — macOS offline arm64 package and app command surface

Date: 2026-10-17  
Artifact: `/Volumes/Data/Projects/3t-office/build/macos-offline-pilot` (read-only)  
Evidence root: `/tmp/vno-agy-packaged-visual-qa.zaAD2I`

## Scope and method

- Real `Doc.app`, `Sheet.app`, and `Slide.app` launchers started the packaged Python/PySide6/QtWebEngine runtime.
- `HOME` and `VNO_APPLICATION_SUPPORT_ROOT` pointed at an isolated test root. The launcher bootstrapped `app-0.9.11`, and `current` was a relative symlink.
- Input used Chromium CDP mouse/key events in the Qt page. No external browser and no `scripts/serve.js` were used.
- Each app was edited, saved through its production bridge to OOXML, closed, relaunched with the saved file, model-checked, screenshotted, and ZIP-tested.
- The repository Node suite was also run with the packaged Python and embedded LibreOffice paths to exercise commands, adapters, ribbon declarations, keyboard/mouse helpers, syntax, and offline-resource guards.

## Results

| Area | Result | Evidence |
|---|---|---|
| Package validator | PASS | Layout, runtime imports, PySide6 6.12.0, pywebview 6.2.1, arm64; Intel NOT SUPPORTED. |
| Isolated bootstrap | PASS | `application-support/current -> app-0.9.11`; packaged `Runtime/bin/python3` and embedded `LibreOffice.app/Contents/MacOS/soffice` used. |
| Doc create/edit/save/reopen | PASS | Two Vietnamese paragraphs persisted; reopened model had 2 paragraphs; screenshot visually checked. |
| Sheet create/edit/save/reopen | FAIL | Intended A1=`Kiểm thử tiếng Việt`, B1=`2468`, B2=`=B1*2`; reopened model/UI had A1=`2468`, B1 empty, B2 formula with cached value 0. |
| Slide create/edit/save/reopen | PASS | Vietnamese title/body persisted as two editable shapes; screenshot visually checked. |
| OOXML ZIP integrity | PASS | `unzip -t` reported no compressed-data errors for DOCX/XLSX/PPTX. |
| Node command/UI regression suite | FAIL | 3167/3168 passed with packaged Python/LibreOffice; one test hard-codes missing `python` executable. |
| Signing/notarization/DMG/clean Apple Silicon account | NOT RUN | Explicitly outside this unsigned pilot task. |

## Findings

### [P1] Sheet mouse selection/direct typing can target the previous cell in the packaged Qt path

Reproduction:

1. Launch packaged `Sheet.app` with isolated `HOME` and `VNO_APPLICATION_SUPPORT_ROOT`.
2. Click visible A1, type `Kiểm thử tiếng Việt`, press Enter.
3. Click visible B1, type `2468`, press Enter.
4. Click visible B2, type `=B1*2`, press Enter; save XLSX, close, and reopen through `Sheet.app`.
5. Observe A1=`2468`, B1 empty, and B2=`0`; the intended Vietnamese text is absent.

The failure reproduced twice, including after the harness was tightened to choose only a visible `data-coord` element. Cell selection begins on `mousedown` in `apps/sheet/sheet-grid.js:4459-4468` and applies the active coordinate in `apps/sheet/sheet-grid.js:2237-2265`. This audit does not patch source; instrument those handlers in a dedicated Sheet task before changing behavior.

### [P2] One Node test is not portable to macOS packaged environments

`tests/unit/sheet-import-audit.test.js:118` invokes literal `python`, unlike nearby tests that honor `process.env.PYTHON || "python"`. On this machine `/usr/bin/python3` exists but `python` does not. Even with `PYTHON` set to the packaged runtime, this single test fails before exercising the overlay. The other 3167 tests passed with:

```sh
PYTHON=<artifact>/Runtime/bin/python3 \
VNOFFICE_SOFFICE_PATH=<artifact>/LibreOffice.app/Contents/MacOS/soffice \
node tests/run-tests.js
```

The initial unqualified run produced 15 failures: 14 were environment-path failures for Python/LibreOffice, leaving only the hard-coded invocation after supplying the packaged paths.

## Visual review

- Doc: ribbon, ruler, page canvas, Vietnamese glyphs, status bar and zoom rendered without visible overlap.
- Sheet: ribbon/grid/status bar rendered cleanly, but the wrong-cell result is visible in the reopened screenshot.
- Slide: filmstrip, ribbon, canvas, Vietnamese title/body and status bar rendered cleanly. A transient `Đang mở tài liệu...` toast remained when the screenshot was captured after the model was ready; functional content was already loaded.

Evidence and SHA-256 hashes are in `docs/macos/evidence/agy-packaged-visual-qa/`.
