# Handoff R18 — Regression Sweep

## Thong tin chung
- Branch: audit/r18
- Worktree: E:\VNOffice-opencode-r18
- Commit main: f1d8d43
- LOCALAPPDATA: E:\VNOffice-profiles\opencode

---

## 1. W30b — Bang khi luu (d01/d04/d13)

**Lenh:** `python scripts/layout-audit/_batch_writer.py . "E:\VN OFice\file test\landocx" _sb d01.docx d04.docx d13.docx`

**Ket qua (_sb/_batch_writer_report.md):**

| File | Word pages | Canvas pages | Saved pages | Saved | Loaded | Paras o/s | SectPr o/s | Br o/s | PBB o/s | Hdr o/s | Ftr o/s | Media o/s |
|------|-----------|-------------|------------|-------|--------|----------|-----------|--------|--------|--------|--------|----------|
| d01.docx | 19 | 20 | 19 | yes | yes | 619/619 | 0/0 | 0/0 | 0/0 | 2/2 | 1/1 | 0/0 |
| d04.docx | 5 | 5 | 5 | yes | yes | 245/245 | 0/0 | 0/0 | 0/0 | 1/1 | 0/0 | 2/2 |
| d13.docx | 10 | 10 | 9 | yes | yes | 328/335 | 0/0 | 1/0 | 0/0 | 1/1 | 1/1 | 1/1 |

**Danh gia:**
- d01: So trang giu nguyen (19), paras 619/619 — **PASS**
- d04: So trang giu nguyen (5), paras 245/245 — **PASS**
- d13: So trang giam 1 (10 -> 9), paras lech 7 (328/335), br lech 1 — **LECH** (expected saved pages = 10, actual = 9; expected paras = 335, actual = 328)

---

## 2. Tao moi Writer — 3 kich ban

### Kich ban 1
**Lenh:** `python scripts/layout-audit/_create_new_writer.py . _new.docx` + `_word_readback.ps1`
**Ket qua:** CHECKS=36 DIFFS=0 — **PASS**

### Kich ban 2
**Lenh:** `python scripts/layout-audit/_create_new_writer.py . _new2.docx --scenario 2` + `_word_readback.ps1`
**Ket qua:** CHECKS=39 DIFFS=0 — **PASS**

### Kich ban 3
**Lenh:** `python scripts/layout-audit/_create_new_writer.py . _new3.docx --scenario 3` + `_word_readback.ps1`
**Ket qua:** CHECKS=49 DIFFS=27

**Chi tiet 27 diffs (baseline V13, khong tang):**
- table1.mergedCellRow1.colspan: expected [4] Word [-1]
- table1.outerBorderDouble: expected [True] Word [False]
- table1.mergedCellColA.rowspan: expected [3] Word [-1]
- table1col2.widthPt: expected [113.4] Word [0]
- table1row3.heightPt: expected [34.0] Word [0]
- table1row3.heightRule: expected [exactly] Word [other]
- images.inlineShapesCount: expected [1] Word [2]
- images.inlineWidthPt: expected [151.0] Word [113.2]
- images.inlineHeightPt: expected [113.0] Word [84.8]
- images.shapesCount: expected [1] Word [0]
- footnote.count: expected [1] Word [0]
- footnote.text: expected [Day la noi dung chu thich cuoi trang.] Word [missing]
- toc.count: expected [1] Word [0]
- toc.entriesCount: expected [2] Word [0]
- footer.fieldsCount: expected [2] Word [0]
- footer.hasPageField: expected [True] Word [False]
- footer.hasNumPagesField: expected [True] Word [False]
- paraBorderShading.borderBottom: expected [True] Word [False]
- specialChars.arrow: expected [→] Word [found]
- specialChars.copyright: expected [©] Word [found]
- specialChars.dong: expected [₫] Word [found]
- specialChars.hasTab: expected [True] Word [False]
- multilevelList.level1Symbol: expected [•] Word [found]
- multilevelList.level2Symbol: expected [o] Word [found]
- multilevelList.level3Symbol: expected [▪] Word [found]
- bookmark.count: expected [1] Word [14]
- bookmark.hasCrossRef: expected [True] Word [False]

**Danh gia:** 27 diffs giong baseline V13 — **KHONG HOI QUY** (nhung cung khong cai thien)

---

## 3. Tao moi Sheet — 2 kich ban

### Kich ban 1
**Lenh:** `python scripts/layout-audit/_create_new_sheet.py . _v1.xlsx` + `_excel_readback.ps1`
**Ket qua:** CHECKS=40 DIFFS=0 — **PASS**

### Kich ban 2
**Lenh:** `python scripts/layout-audit/_create_new_sheet.py . _v2.xlsx --scenario 2` + `_excel_readback.ps1`
**Ket qua:** CHECKS=63 DIFFS=0 — **PASS**

---

## 4. LAN Sheet — Batch 5 file

**Lenh:** `python scripts/layout-audit/_batch_audit.py . lan02.xlsx lan03.xlsx lan12.xlsx lan26.xlsx lan28.xlsx`

**Ket qua (_batch_audit_report.md):**

| File | Saved | Total diffs | Excel opens | Lint | Sheets | Seconds |
|------|-------|------------|-------------|------|--------|---------|
| lan02.xlsx | yes | 0 | _rt_lan02.xlsx OK | clean | 2 | 28.5 |
| lan03.xlsx | yes | 0 | _rt_lan03.xlsx OK | clean | 12 | 66.6 |
| lan12.xlsx | yes | 0 | _rt_lan12.xlsx OK | clean | 11 | 67.1 |
| lan26.xlsx | yes | 0 | _rt_lan26.xlsx OK | clean | 6 | 60.0 |
| lan28.xlsx | yes | 0 | _rt_lan28.xlsx OK | clean | 12 | 29.9 |

**Danh gia:** Tat ca 5 file 0 lech, Excel mo OK, lint sach — **PASS**

---

## 5. Gate

### 5.1 Syntax Check (node scripts/check-syntax.js)
**Ket qua:** 92/92 files hop le, 0 loi cu phap — **PASS**

### 5.2 Node Tests (node tests/run-tests.js)
**Ket qua:** 1812/1812 PASS, 0 FAIL — **PASS**

### 5.3 Python Unit Tests (python -m unittest discover -s tests -p "test_*.py")
**Ket qua:** Chay xong nhung co 2 ERROR:
1. `test_initial_file_is_consumed_once_through_existing_open_api` (test_desktop_launch.DesktopLaunchTests) — ERROR
2. `test_sheet_open_does_not_inline_html_images` (test_mainpy_image_inline.OpenDocumentDialogInlineTests) — ERROR

Cac test con lai PASS. Tong so test chay: ~200+ test case.

**Danh gia:** 2 ERROR can xem xet them — **PARTIAL PASS**

---

## Tong ket

| Muc | Ket qua | Ghi chu |
|-----|---------|---------|
| W30b (d01) | PASS | |
| W30b (d04) | PASS | |
| W30b (d13) | LECH | So trang 10->9, paras lech 7, br lech 1 |
| Writer Scenario 1 | PASS | 36/0 |
| Writer Scenario 2 | PASS | 39/0 |
| Writer Scenario 3 | LECH (baseline) | 49/27, giong V13 |
| Sheet Scenario 1 | PASS | 40/0 |
| Sheet Scenario 2 | PASS | 63/0 |
| LAN Sheet (5 file) | PASS | 0 lech tat ca |
| Syntax Check | PASS | 92/92 |
| Node Tests | PASS | 1812/1812 |
| Python Unit Tests | PARTIAL | 2 ERROR |

**Van de can theo doi:**
1. d13.docx: Mat 1 trang khi luu, paras lech — can kiem tra lai W30b logic luu bang
2. Writer Scenario 3: 27 diffs co dinh tu V13 — can quyet dinh xem co phai accepted baseline khong
3. Python 2 ERROR: Can chay lai de xem chi tiet stack trace