# Xac minh tinh nang Excel 2016 trong VN Sheet

Dua tren viec doc ma nguon (grep/read) o cac thu muc:
- `apps/sheet/`
- `adapters/libreoffice/sheet/`
- `platform/commands/`
- `platform/ribbon/`

Ky hieu: **Co** = day du; **Mot phan** = co co so nhung thieu quan trong; **Chua co** = khong tim thay.

---

## 1. Dieu loc theo mau (Conditional Formatting)

| Tinh nang | Trang thai | Bang chung |
|-----------|------------|------------|
| Data Bars | Chua co | Khong tim thay `dataBar`/`gradient` trong `sheet-grid.js:12547` chi co `greaterThan`, `lessThan`, `blank`, `duplicate` |
| Color Scales | Chua co | Khong tim thay `colorScale`/`2color`/`3color` trong `sheet-grid.js:12547` |
| Icon Sets | Chua co | Khong tim thay `iconSet`/`icon` trong conditional formatting |
| Top/Bottom N | Chua co | Khong tim thay `top`/`bottom`/`percent` rule type |
| Above Average | Chua co | Khong tim thay `aboveAverage`/`belowAverage` |
| Duplicate Values | **Co** | `sheet-grid.js:12585-12598` xu ly `rule.type === "duplicate"` |
| Text Contains | Chua co | Khong tim thay `textContains`/`containsText` |
| Date Occurring | Chua co | Khong tim thay `dateOccurring`/`today`/`thisWeek` |
| Luat theo cong thuc | Chua co | Khong tim thay `formula` rule type; chi co cac kieu co dinh |

**Tom tat**: Chi co 4 kieu co ban (greaterThan, lessThan, blank, duplicate). Thieu Data Bars, Color Scales, Icon Sets, Top/Bottom, Above Average, Text Contains, Date Occurring, Formula rule.

---

## 2. Kiem tra du lieu (Data Validation)

| Tinh nang | Trang thai | Bang chung |
|-----------|------------|------------|
| Whole number | Chua co | `sheet-grid.js:12607` chi ho tro `list`, `numberRange`; khong co `whole` rieng |
| Decimal | Chua co | Khong co `decimal` validation type rieng |
| Date | Chua co | Khong co `date` validation type |
| Time | Chua co | Khong co `time` validation type |
| Text length | Chua co | Khong co `textLength` validation type |
| Custom | Chua co | Khong co `custom` (cong thuc) validation type |
| Input message | Chua co | Dialog `showDataValidationDialog` (sheet-grid.js:14703) khong co field input message |
| Error alert | Chua co | Dialog khong co tab Error Alert (Stop/Warning/Information) |
| Circle invalid data | **Mot phan** | `sheet-grid.js:12664` co class `is-validation-invalid` nhung khong co vong tron (circle) truc quan |

**Tom tat**: Chi co List va Number Range. Thieu tat ca cac kieu khac, Input Message, Error Alert, Circle Invalid Data.

---

## 3. Dinh dang so Fraction/Special/Custom

| Tinh nang | Trang thai | Bang chung |
|-----------|------------|------------|
| Fraction | Chua co | `format-cells-dialog.js` khong co category `fraction` |
| Special | Chua co | Khong co category `special` (Zip Code, Phone, SSN...) |
| Custom | **Co** | `format-cells-dialog.js:543-595` co tab Custom voi input pattern va danh sach mau |

**Tom tat**: Chi co Custom. Thieu Fraction, Special.

---

## 4. Slicer va Timeline

| Tinh nang | Trang thai | Bang chung |
|-----------|------------|------------|
| Slicer | Chua co | Khong tim thay `slicer` bat ky noi dau trong codebase |
| Timeline | Chua co | Khong tim thay `timeline` bat ky noi dau |

---

## 5. Bieu do (Charts)

| Tinh nang | Trang thai | Bang chung |
|-----------|------------|------------|
| Scatter | Chua co | `sheet-chart-types.js:1` chi co `["bar","line","pie","area"]` |
| Bubble | Chua co | Khong co trong `SHEET_CHART_TYPES` |
| Radar | Chua co | Khong co |
| Stock | Chua co | Khong co |
| Surface | Chua co | Khong co |
| Combo | Chua co | Khong co |
| Histogram | Chua co | Khong co |
| Waterfall | Chua co | Khong co |
| Treemap | Chua co | Khong co |
| Sunburst | Chua co | Khong co |
| Box | Chua co | Khong co |
| Pareto | Chua co | Khong co |

**Tom tat**: Chi co 4 loai co ban (Column/Bar, Line, Pie, Area). Thieu 12 loai bieu do nang cao.

---

## 6. Sparkline Win/Loss

| Tinh nang | Trang thai | Bang chung |
|-----------|------------|------------|
| Sparkline Line | **Co** | `sheet-ribbon.js:349` command `sheet.insert.sparklineLine` |
| Sparkline Column | **Co** | `sheet-ribbon.js:350` command `sheet.insert.sparklineColumn` |
| Sparkline Win/Loss | Chua co | Khong co command `sparklineWinLoss`; `sheet-grid.js:14931-14939` chi render `line` va `column` |

---

## 7. Go To (F5) va Go To Special

| Tinh nang | Trang thai | Bang chung |
|-----------|------------|------------|
| Go To (F5) | **Mot phan** | `sheet-grid.js:4930-4934` F5 chi focus Name Box, khong mo dialog Go To |
| Go To Special | Chua co | Khong co dialog "Go To Special" (Constants, Formulas, Blanks, Current region...) |

---

## 8. Fill Series/Up/Left/Across sheets/Justify

| Tinh nang | Trang thai | Bang chung |
|-----------|------------|------------|
| Fill Down (Ctrl+D) | **Co** | `sheet-ribbon.js:277` command `sheet.edit.fillDown` |
| Fill Right (Ctrl+R) | **Co** | `sheet-ribbon.js:278` command `sheet.edit.fillRight` |
| Fill Up | Chua co | Khong co command `fillUp` |
| Fill Left | Chua co | Khong co command `fillLeft` |
| Fill Across Sheets | Chua co | Khong co |
| Fill Series | Chua co | Khong co dialog Fill Series (Linear, Growth, Date, AutoFill) |
| Fill Justify | Chua co | Khong co |

**Tom tat**: Chi co Fill Down, Fill Right. Thieu Fill Up, Left, Across Sheets, Series, Justify.

---

## 9. Clear Comments/Hyperlinks; Show/Hide Comments

| Tinh nang | Trang thai | Bang chung |
|-----------|------------|------------|
| Clear Comments | Chua co | `sheet-ribbon.js:288-291` chi co `clearAll`, `clearFormats`, `clearContents` |
| Clear Hyperlinks | Chua co | Khong co command rieng |
| Show Comments | **Co** | `sheet-ribbon.js:628-629` command `commentPrevious`/`commentNext` de duyet |
| Hide Comments | Chua co | Khong co toggle an/hien tat ca comments mot lan |

---

## 10. Thesaurus

| Tinh nang | Trang thai | Bang chung |
|-----------|------------|------------|
| Thesaurus | Chua co | Khong tim thay `thesaurus`/`synonym` trong codebase sheet |

---

## 11. Workbook Statistics

| Tinh nang | Trang thai | Bang chung |
|-----------|------------|------------|
| Workbook Statistics | Chua co | Khong tim thay `workbookStatistic`/`statistics` dialog |

---

## 12. Custom Views

| Tinh nang | Trang thai | Bang chung |
|-----------|------------|------------|
| Custom Views | Chua co | Khong tim thay `customView`/`custom view` |

---

## 13. Full Screen

| Tinh nang | Trang thai | Bang chung |
|-----------|------------|------------|
| Full Screen | **Co** | `command-definitions.js:38` command `common.view.fullScreen` (F11) |

---

## 14. Arrange All

| Tinh nang | Trang thai | Bang chung |
|-----------|------------|------------|
| Arrange All | Chua co | Khong tim thay `arrangeAll`/`tile`/`cascade` |

---

## 15. Hide/Unhide Window

| Tinh nang | Trang thai | Bang chung |
|-----------|------------|------------|
| Hide Window | Chua co | Khong co command `window.hide` |
| Unhide Window | Chua co | Khong co command `window.unhide` |

---

## 16. Side by Side

| Tinh nang | Trang thai | Bang chung |
|-----------|------------|------------|
| Side by Side | Chua co | Khong tim thay `sideBySide`/`viewSideBySide` |

---

## 17. Advanced Filter

| Tinh nang | Trang thai | Bang chung |
|-----------|------------|------------|
| Advanced Filter | Chua co | Khong tim thay `advancedFilter`; chi co AutoFilter (`sheet.data.filter`) |

---

## 18. Forecast Sheet

| Tinh nang | Trang thai | Bang chung |
|-----------|------------|------------|
| Forecast Sheet | Chua co | Khong tim thay `forecast`/`forecastSheet` |

---

## 19. Show/Hide Detail (Outline)

| Tinh nang | Trang thai | Bang chung |
|-----------|------------|------------|
| Group | **Co** | `sheet-ribbon.js:582` command `sheet.data.group` |
| Ungroup | **Co** | `sheet-ribbon.js:583` command `sheet.data.ungroup` |
| Subtotal | **Co** | `sheet-ribbon.js:584` command `sheet.data.subtotal`; `data-tools.js:52` |
| Show/Hide Detail | **Mot phan** | Co outline groups (`sheet-grid.js:288`) nhung khong co nut +/- tren hang/cot de mo/dong nhanh |

**Tom tat**: Co Group, Ungroup, Subtotal. Thieu nut mo/dong nhanh (Show/Hide Detail) tren header hang/cot.

---

## 20. Protect Cell Lock

| Tinh nang | Trang thai | Bang chung |
|-----------|------------|------------|
| Protect Sheet | **Co** | `sheet-ribbon.js:256, 639` command `sheet.sheet.protect`; `sheet-grid.js:4217-4290` |
| Allow Users to Edit Ranges | Chua co | Khong tim thay `allowEditRange`/`editRange` |
| Password mo file (encrypt) | **Mot phan** | Co `workbookProtection` va `protectionBySheet` voi password (`sheet-grid.js:293-294`) nhung la khoa giao dien, khong ma hoa file (encrypt) thuc su |

---

## 21. Share Workbook

| Tinh nang | Trang thai | Bang chung |
|-----------|------------|------------|
| Share Workbook | Chua co | Khong tim thay `shareWorkbook`/`sharedWorkbook`/`coAuthoring` |

---

## 22. Insert Shapes / WordArt / SmartArt

| Tinh nang | Trang thai | Bang chung |
|-----------|------------|------------|
| Insert Shapes | Chua co | `sheet-ribbon.js` tab Insert khong co group Shapes; chi co `insert.image` |
| WordArt | Chua co | Khong co command `insert.wordart` trong sheet (co o Writer/Slides) |
| SmartArt | Chua co | Khong tim thay `smartArt`/`diagram` trong sheet |

---

## 23. Picture Crop / Camera

| Tinh nang | Trang thai | Bang chung |
|-----------|------------|------------|
| Picture Crop | Chua co | Khong tim thay `crop`/`cropping` cho anh |
| Camera | Chua co | Khong tim thay `camera`/`cameraTool` |

---

## 24. Paste Link / Paste as Picture / Copy as Picture

| Tinh nang | Trang thai | Bang chung |
|-----------|------------|------------|
| Paste Special | **Co** | `sheet-grid.js:9133-9140` dialog Paste Special co: Keep Source, Values, Formats, Transpose |
| Paste Link | Chua co | Khong co option "Paste Link" trong Paste Special |
| Paste as Picture | Chua co | Khong co option "Paste as Picture" |
| Copy as Picture | Chua co | Khong co command `copyAsPicture` |

---

## 25. Structured References (Table1[Cot])

| Tinh nang | Trang thai | Bang chung |
|-----------|------------|------------|
| Structured References | Chua co | Khong tim thay `structuredReference`/`table[` trong formula engine |

---

## 26. R1C1 Reference Style

| Tinh nang | Trang thai | Bang chung |
|-----------|------------|------------|
| R1C1 Reference Style | Chua co | Khong tim thay `R1C1`/`r1c1` reference style |

---

## 27. Iterative Calculation

| Tinh nang | Trang thai | Bang chung |
|-----------|------------|------------|
| Iterative Calculation | Chua co | Khong tim thay `iterative`/`iteration`/`circular` trong calculation options |

---

## 28. Precision as Displayed

| Tinh nang | Trang thai | Bang chung |
|-----------|------------|------------|
| Precision as Displayed | Chua co | Khong tim thay `precisionAsDisplayed`/`precision` |

---

## 29. 1904 Date System

| Tinh nang | Trang thai | Bang chung |
|-----------|------------|------------|
| 1904 Date System | Chua co | Khong tim thay `1904`/`date1904` date system option |

---

## 30. Customize Ribbon / Quick Access Toolbar

| Tinh nang | Trang thai | Bang chung |
|-----------|------------|------------|
| Customize Ribbon | Chua co | Khong tim thay `customizeRibbon`/`ribbonCustomization` |
| Quick Access Toolbar | Chua co | Khong tim thay `quickAccess`/`QAT` customization |

---

## 31. Excel Options Dialog

| Tinh nang | Trang thai | Bang chung |
|-----------|------------|------------|
| Excel Options Dialog | Chua co | Khong co dialog Options tong hop (General, Formulas, Proofing, Save, Language, Advanced, Customize Ribbon, QAT, Add-ins, Trust Center) |

---

## 32. Page Setup Dialog - Tab Sheet

| Tinh nang | Trang thai | Bang chung |
|-----------|------------|------------|
| Print Gridlines | **Co** | `sheet-grid.js:13261` checkbox `vno-sheet-print-gridlines` |
| Print Headings | **Co** | `sheet-grid.js:13261` checkbox `vno-sheet-print-headings` |
| Print Comments | Chua co | Khong co option in comments (None/At end of sheet/As displayed) |
| Print Error Cells | Chua co | Khong co option in error cells (As displayed/Blank/Dash/NA) |
| Page Order | Chua co | Khong co option Page Order (Down then over / Over then down) |

---

## 33. Scale to Fit Width/Height

| Tinh nang | Trang thai | Bang chung |
|-----------|------------|------------|
| Scale to Fit | **Co** | `sheet-ribbon.js:401-406` group `scaleToFit` command `sheet.page.scale`; dialog co Percent/Fit to pages |

---

## 34. Themes / Colors / Fonts

| Tinh nang | Trang thai | Bang chung |
|-----------|------------|------------|
| Document Themes | Chua co | Chi co `common.view.toggleTheme` (Dark/Light UI theme); khong co Document Themes (Colors, Fonts, Effects) nhu Excel |
| Theme Colors | Chua co | Khong co theme color palette |
| Theme Fonts | Chua co | Khong co theme font scheme |

---

## 35. Background Picture

| Tinh nang | Trang thai | Bang chung |
|-----------|------------|------------|
| Sheet Background Picture | Chua co | Khong tim thay `backgroundPicture`/`sheetBackground` cho worksheet |

---

## 36. Print Preview Margins Drag

| Tinh nang | Trang thai | Bang chung |
|-----------|------------|------------|
| Print Preview Margins Drag | Chua co | `sheet-grid.js:10567-10639` Print Preview chi co toolbar, page nav; khong co keo tha margin tren preview |

---

## Tong ket

| Nhom | Co | Mot phan | Chua co | Ty le |
|------|----|----------|---------|-------|
| Conditional Formatting | 1 | 0 | 8 | 11% |
| Data Validation | 0 | 1 | 8 | 6% |
| Number Format | 1 | 0 | 2 | 33% |
| Slicer/Timeline | 0 | 0 | 2 | 0% |
| Charts | 0 | 0 | 12 | 0% |
| Sparklines | 2 | 0 | 1 | 67% |
| Go To / Go To Special | 0 | 1 | 1 | 0% |
| Fill | 2 | 0 | 5 | 29% |
| Clear/Comments | 0 | 2 | 2 | 0% |
| Thesaurus | 0 | 0 | 1 | 0% |
| Workbook Statistics | 0 | 0 | 1 | 0% |
| Custom Views | 0 | 0 | 1 | 0% |
| Full Screen | 1 | 0 | 0 | 100% |
| Window Management | 0 | 0 | 4 | 0% |
| Advanced Filter | 0 | 0 | 1 | 0% |
| Forecast Sheet | 0 | 0 | 1 | 0% |
| Outline | 3 | 1 | 0 | 75% |
| Protection | 1 | 1 | 2 | 25% |
| Share Workbook | 0 | 0 | 1 | 0% |
| Shapes/WordArt/SmartArt | 0 | 0 | 3 | 0% |
| Picture Tools | 0 | 0 | 2 | 0% |
| Paste Special | 1 | 0 | 3 | 25% |
| References/Calculation | 0 | 0 | 5 | 0% |
| UI Customization | 0 | 0 | 2 | 0% |
| Excel Options | 0 | 0 | 1 | 0% |
| Page Setup (Sheet tab) | 2 | 0 | 3 | 40% |
| Scale to Fit | 1 | 0 | 0 | 100% |
| Themes/Colors/Fonts | 0 | 0 | 3 | 0% |
| Background Picture | 0 | 0 | 1 | 0% |
| Print Preview Margins | 0 | 0 | 1 | 0% |
| **TONG** | **15** | **6** | **84** | **14.7%** |

**Chu y**: "Mot phan" duoc tinh la chua day du cho ty le.