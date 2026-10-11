# HANDOFF: Fix New Window Regression (Ctrl+N / File > New)

## Summary
Fixed the desktop regression where **3T Sheet** and **3T Slides** failed to open a new document window via `Ctrl+N` or **File > New**, while **3T Doc** worked correctly.

**Root Cause**: The `UnoBridge._bindAllStandardCommands()` was called in `init()` (after `switchApp()`), overwriting app-specific handlers bound in `attach()`. For Writer this didn't matter (uses `handleDispatch`), but Sheet/Slides bind their own `common.file.new` handler in `attach()` which got overwritten.

## Evidence

### Before Fix (Main Branch)
```
3T Doc New    = WebView2 pages 1 -> 2  PASS
3T Sheet New  = WebView2 pages 1 -> 1  FAIL
3T Slide New  = WebView2 pages 1 -> 1  FAIL
```

### After Fix (This Branch)
```
3T Doc New    = WebView2 pages 1 -> 2  PASS
3T Sheet New  = WebView2 pages 1 -> 2  PASS
3T Slide New  = WebView2 pages 1 -> 2  PASS
```

### Commands Run
```bash
# Writer
cd E:\VNOffice-opencode-newwin; node --experimental-websocket tests/live/cdp/run-desktop-regression.mjs writer
# TOTAL: 9 PASS, 0 FAIL, 0 BLOCKED, 2 N/A

# Sheet
cd E:\VNOffice-opencode-newwin; node --experimental-websocket tests/live/cdp/run-desktop-regression.mjs sheet
# TOTAL: 9 PASS, 1 FAIL (pre-existing type detection), 0 BLOCKED, 1 N/A

# Slides
cd E:\VNOffice-opencode-newwin; node --experimental-websocket tests/live/cdp/run-desktop-regression.mjs slides
# TOTAL: 7 PASS, 1 FAIL (pre-existing Ctrl+C/X/V), 0 BLOCKED, 3 N/A
```

### Unit Tests
```bash
cd E:\VNOffice-opencode-newwin; node tests/run-tests.js
# KẾT QUẢ KIỂM THỬ: 2293/2293 PASS | 0 FAIL
```

## Changes Made

### 1. `adapters/libreoffice/common/uno-bridge.js`
- **Constructor**: Added `_bindAllStandardCommands()` call so handlers are bound at module import time (during `switchApp()` dynamic import, AFTER `bootstrapPlatform()` registers commands).
- **`init()`**: Removed duplicate `_bindAllStandardCommands()` call to prevent overwriting app handlers bound in `attach()`.

### 2. `index.html` (no functional change needed, kept original order)
- `bootstrapPlatform()` → `switchApp()` → `connectDocumentServices()`
- Ensures commands registered before uno-bridge constructor runs, and app `attach()` runs after.

## Technical Details

### Handler Binding Order (Fixed)
1. `bootstrapPlatform()` registers all command definitions
2. `switchApp()` dynamically imports app → imports adapter → imports uno-bridge → **constructor binds standard handlers**
3. `app.init()` → `adapter.attach()` → **app binds its own handlers** (overwrites for Sheet/Slides)
4. `connectDocumentServices()` → `init()` connects to Python (no command binding)

### Why Writer Was Unaffected
Writer doesn't bind `common.file.new` in `attach()`; it handles it via `handleDispatch(unoUrl, args, "common.file.new")` which is called by the uno-bridge's standard handler. So overwriting didn't change behavior.

### Why Sheet/Slides Failed
Both bind `common.file.new` in `attach()`:
```javascript
globalCommandBus.bindHandler("common.file.new", () => this.shell?.requestNewDocumentWindow?.() ?? this.newDocument());
```
This was overwritten by uno-bridge's `init()` call, leaving the uno-bridge handler which calls `dispatch()` → `handleDispatch()` but Sheet/Slides don't implement `handleDispatch` for `common.file.new`, so it fell through to mock dispatch returning `true` without creating a window.

## Verification
- Manual CDP debugging confirmed: `shell.requestNewDocumentWindow()` works when called directly
- Command bus handler inspection showed `hasHandler: false` before fix, `true` after
- All 2293 unit tests pass
- Desktop regression tests pass for all three apps' "New" functionality