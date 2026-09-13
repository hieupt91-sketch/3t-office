# Handoff: VN Sheet Tab Colors & Image Layer Z-Index Fix

## Overview
This work addresses two visual polish and layering issues in VN Sheet to match Excel 2016 parity:
1. **Sheet Tab Colors (Excel 2016 Parity)**: Inactive tabs with `tabColor` now display a full background fill with contrast text (black or white depending on luminance >= 130 threshold). Active tabs display a white background with a subtle 15% tint gradient and a 3px solid colored bottom border. Tabs without colors remain styled by default.
2. **Image Layer Z-Index Below Sticky Headers on Scroll**: Previously, scrolling down caused images (such as top-row banner images) to overlap sticky column and row headers. The image layer and image panels are now properly layered beneath sticky headers while remaining above sheet cells, in both normal and freeze-panes views.

---

## Root Cause Analysis

### Issue 1: Sheet Tab Colors
- **Previous behavior**: `_renderSheetTabs()` only applied a 3px colored bottom border to inactive tabs with `tabColor` and a subtle 12% opacity background tint to active tabs.
- **Excel 2016 standard**:
  - Inactive tabs with `tabColor`: full solid background fill using `tabColor`. Text color automatically chosen (black `#000000` or white `#ffffff`) based on standard ITU-R perceived brightness formula `(r * 299 + g * 587 + b * 114) / 1000 >= 130 ? black : white`. 3px transparent bottom border preserves layout alignment.
  - Active tab with `tabColor`: white background with a 15% tint gradient (`linear-gradient(to top, ${tabColor}26 0%, #ffffff 100%)`) and a prominent `3px solid ${tabColor}` bottom border.
  - Uncolored tabs: default styling untouched.

### Issue 2: Image Layer Z-Index on Scroll
- **Root causes**:
  1. **Stacking Context Trap on `<table>`**: In `_applyViewState()`, `this.table.style.transform = scale(1)` was set unconditionally at 100% zoom. By CSS Transforms Level 1 specification, any transform value other than `none` establishes a new local stacking context on `<table>`. Because `<table>` had static positioning and no positive z-index, all sticky `th` descendants were confined inside the table stacking context at level 0. The sibling `div.vno-sheet-image-layer` with `position: absolute; z-index: 7` was rendered over the entire table and its sticky headers.
  2. **Sub-optimal CSS Z-Indexes**: In `apps/sheet/sheet.css`, `.vno-col-header` was `z-index: 10`, `.vno-row-header` was `z-index: 9`. When freeze panes were active, frozen image panels were assigned `z-index: 10`, colliding with the column header z-index.
  3. **Table Transform Transition**: `.vno-grid-table` contained `transition: transform 120ms ease-out;` which could delay geometry updates.

---

## Changes Made

### 1. `apps/sheet/sheet-grid.js`
- **Exported helper `_getTabContrastTextColor(hexColor)`**:
  - Computes perceived brightness from 3-digit or 6-digit hex color using standard weights `(r * 299 + g * 587 + b * 114) / 1000`.
  - Returns `#000000` when brightness >= 130, else `#ffffff`.
- **Updated `_renderSheetTabs()`**:
  - Adds class `has-tab-color` when `tabColor` is defined on the sheet.
  - Inactive tab:
    - `background`: `tabColor`
    - `backgroundColor`: `tabColor`
    - `color`: `_getTabContrastTextColor(tabColor)`
    - `borderBottom`: `3px solid transparent`
  - Active tab:
    - `background`: `linear-gradient(to top, ${tabColor}26 0%, #ffffff 100%)`
    - `backgroundColor`: `#ffffff`
    - `borderBottom`: `3px solid ${tabColor}`
  - Uncolored tab: default styling untouched.
- **Updated `_applyViewState()`**:
  - When `this.zoomLevel === 1` and `this.table instanceof HTMLElement`, resets `this.table.style.transform = ""` and `this.table.style.transformOrigin = ""` to prevent creating an unwanted CSS stacking context on the table.
  - Retains `transform = scale(zoomLevel)` when zoomed (<1 or >1).
  - Keeps compatibility with Node mock tests where `this.table` is a plain object.

### 2. `apps/sheet/sheet.css`
- **Updated sticky header z-indexes**:
  - `.vno-grid-corner-header`: `z-index: 25` (was 20)
  - `.vno-col-header`: `z-index: 14` (was 10)
  - `.vno-row-header`: `z-index: 12` (was 9)
  - Removed `transition: transform 120ms ease-out;` on `.vno-grid-table`.
- **Added tab color classes**:
  - `.vno-sheet-tab-item.has-tab-color`: `border-bottom-width: 3px;`
  - `.vno-sheet-tab-item.has-tab-color:not(.is-active):hover`: `filter: brightness(0.92);`
  - `.vno-sheet-tab-item.has-tab-color.is-active`: `background-color: #ffffff; color: var(--vno-sheet-primary-fg, #0f6d38);`
- **Z-index hierarchy**:
  `cells (1..6) < normal images (7) < frozen cells (8) < frozen images (10) < row headers (12) < col headers (14) < frozen headers (18..20) < corner header (25)`

### 3. `tests/unit/sheet-images.test.js`
- Enhanced `FakeElement` with `classList` and `querySelector` for `#vno-sheet-tabs-list`.
- Added unit test: `Sheet Tab Color: _getTabContrastTextColor tinh do sang dung nguong 130 va DOM tab style background/color theo chuan Excel`.
- Added unit test: `Sheet Image Z-Index: lop anh va panel anh luon nam duoi header cot va header hang`.

---

## Verification & Screenshots
- **Capture 1 (`_app_after_scrolled.png`)**:
  - Command: `python _capture_vnsheet2.py E:\VNOffice-agy-sheet-polish "E:\VNOffice-agy-sheet-polish\file test\KHOACUA.xlsx" "KHÓA THÔNG MINH" 1 _app_after_scrolled.png`
  - Result: With viewport scrolled 25px down, column headers A, B, C, D, E, F, G, H, I, J, K, L remain fully visible on top. The banner image is clipped cleanly beneath the headers.
- **Capture 2 (`_app_after_top.png`)**:
  - Command: `python _capture_vnsheet2.py E:\VNOffice-agy-sheet-polish "E:\VNOffice-agy-sheet-polish\file test\KHOACUA.xlsx" "KHÓA THÔNG MINH" 0 _app_after_top.png`
  - Result: Inactive tabs show full solid backgrounds with high-contrast text ("KHÓA BIỆT THỰ" orange/black, "KHÓA NHÔM KÍNH" green/black, "KHÓA KÍNH" cyan/black, "KHÓA KHÁCH SẠN" blue/white, "KHÓA CỔNG" purple/white). Active tab "KHÓA THÔNG MINH" shows white background with 15% yellow tint gradient and 3px solid yellow bottom border. Matches Excel 2016 reference (`_excel_thongminh.png`).
- **Test Suite Results**:
  - Command: `node tests/run-tests.js`
  - Total: **1726/1726 PASS (100%)**, 0 failures, 0 regressions.
