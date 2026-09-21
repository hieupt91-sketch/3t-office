# Handoff W29 — Writer Placeholder Header/Footer & Table Cell Padding

## TASK
W29a (L13 placeholder header/footer chiếm chỗ/đè chữ) + W29b (L12 đệm ô bảng d20: 5 trang canvas vs 3 trang Word)

## AGENT/ROLE
Writer Agent (opencode)

## BRANCH
fix/writer-w29

## WORKTREE
E:\VNOffice-opencode-writer-w29

## OBJECTIVE
- W29a: Sửa placeholder header/footer — chỉ hiện khi focus/hover, không chiếm chỗ layout (position: absolute, min-height: 0 cho zone rỗng). Đo bodyTop/headerH/footerH của d02/d11/d16 khớp Word; canvas pages d11 6→5, d16 9→8.
- W29b: Tìm nguyên nhân chung khiến d20 canvas 5 trang thay vì 3 (Word). Sửa 1 chỗ nếu trong tầm; nếu vượt tầm (cần bộ phân trang), ghi số đo đầy đủ cho W24.

## FINDINGS

### W29a — Placeholder Header/Footer
**Trước sửa (baseline):**
| File | Word pages | Canvas pages | headerH (px) | footerH (px) | bodyTop (px) |
|------|------------|--------------|--------------|--------------|--------------|
| d02  | 11         | 11           | 26           | 34           | 42           |
| d11  | 5          | 6            | 26           | 26           | 96           |
| d16  | 8          | 9            | 26           | 26           | 96           |
| d20  | 3          | 5            | 18           | 26           | 42           |

**Sau sửa (W29a — CSS placeholder fix):**
| File | Word pages | Canvas pages | headerH (px) | footerH (px) | bodyTop (px) |
|------|------------|--------------|--------------|--------------|--------------|
| d02  | 11         | 11           | 25           | 34           | 42           |
| d11  | 5          | 6            | 22           | 22           | 96           |
| d16  | 8          | 9            | 25           | 25           | 96           |
| d20  | 3          | 5            | 18           | 18           | 42           |

**Nhận xét:**
- headerH giảm 1-4px (từ 26→22-25) do bỏ `min-height: 26px` cho `:empty`.
- footerH d20 giảm 26→18 (footer rỗng giờ collapse đúng).
- bodyTop không đổi vì được quyết định bởi page padding (từ page setup của tài liệu), không phải headerH.
- Canvas pages **không giảm** (d11 vẫn 6, d16 vẫn 9) — chênh trang chủ yếu do `line-height`, `spacing`, `wrap` tích lũy, không do placeholder.
- Placeholder giờ `position: absolute`, chỉ hiện khi `:focus-within`/`:hover` — không còn đè chữ (d02) hay đẩy trang (d11/d16).

### W29b — Table Cell Padding (d20)
**Vấn đề:** d20 Word 3 trang, canvas 5 trang. Drift table = 2.

**Thử nghiệm đã làm:**
1. Thêm parse `fo:padding*` cho `table-cell` style trong FODT import (writer-adapter.js:9096-9110).
2. Áp dụng paragraph style (marginTop/marginBottom/textAlign) cho đoạn trong ô bảng (writer-adapter.js:9370-9385).

**Kết quả:** Canvas pages d20 vẫn 5 (không giảm). Drift:table vẫn 2.

**Nguyên nhân:** Chênh trang d20 do tích lũy từ nhiều yếu tố (line-height, font-name, row height, table layout) — không phải 1 nguyên nhân đơn lẻ sửa được tại chỗ. Cần bộ phân trang tổng thể (W24).

**Số đo chuyển giao cho W24:**
| File | Word pages | Canvas pages | Drift kinds chính |
|------|------------|--------------|-------------------|
| d20  | 3          | 5            | drift:table=2, page=2, font-name=4, line-height=1 |

### Ma trận 24 file (trước/sau giống nhau — không file nào tăng pages)
| kind            | files affected | total paragraphs |
|-----------------|----------------|------------------|
| page            | 4              | 52               |
| line-height     | 4              | 15               |
| drift:unknown   | 4              | 7                |
| wrap            | 3              | 6                |
| spacing         | 2              | 5                |
| font-name       | 1              | 4                |
| drift:empty-para| 2              | 3                |
| drift:table     | 1              | 2                |
| font-size       | 1              | 1                |

## IMPLEMENTATION SUMMARY

### W29a — apps/writer/writer.css
1. `.vno-writer-header:empty, .vno-writer-footer:empty` → `min-height: 0` (từ 26px).
2. Placeholder `::before`:
   - `position: absolute; left: 0; right: 0; top: 50%; transform: translateY(-50%);`
   - `opacity: 0; transition: opacity 0.15s;`
   - Chỉ hiện khi `:empty:focus-within::before` hoặc `:empty:hover::before` → `opacity: 1`.
3. Kết quả: Placeholder không chiếm chỗ, không đè nội dung, chỉ hiện khi người dùng tương tác.

### W29b — adapters/libreoffice/writer/writer-adapter.js
1. Parse `fo:padding`, `fo:padding-top/bottom/left/right` từ `style:table-cell-properties` (dòng 9100-9108).
2. Render padding inline style cho `<td>` (dòng 9362-9368).
3. Áp dụng paragraph style (`marginTop`, `marginBottom`, `textAlign`) cho `<p>`/`<h>` trong ô bảng (dòng 9370-9385) — trước đây bỏ qua, dùng CSS default `margin-bottom: 6pt`.

## FILES CHANGED
- `apps/writer/writer.css` — W29a placeholder fix
- `adapters/libreoffice/writer/writer-adapter.js` — W29b table cell padding + paragraph style in cells

## COMMANDS RUN
```powershell
$env:LOCALAPPDATA = 'E:\VNOffice-profiles\opencode'
node scripts/check-syntax.js
node tests/run-tests.js
python -m unittest discover -s tests -p "test_writer*.py"
python scripts/layout-audit/_writer_layout_audit.py "E:\VNOffice-opencode-writer-w29" "E:\VN OFice\file test\landocx" "_out" d02.docx d11.docx d16.docx d20.docx
```

## BUILD RESULT
- Syntax check: 92/92 PASS
- JS unit tests: 1808/1808 PASS
- Python writer tests: 68/68 PASS

## TEST RESULTS
- Tất cả gate PASS.
- Harness tạo mới `_new.docx` (36/0) và `_new2.docx` (39/0) vẫn sạch — header/footer tạo mới nhập được.

## KNOWN FAILURES
- W29b: d20 canvas pages vẫn 5 (Word 3). Drift:table=2 chưa giải quyết.
- d11 canvas 6 (Word 5), d16 canvas 9 (Word 8) — chênh do tích lũy line-height/spacing/wrap, không do placeholder.
- Không file nào trong ma trận 24 có pages tăng sau fix.

## RISKS
- Placeholder chỉ hiện khi focus/hover — người dùng không quen có thể không biết vùng header/footer rỗng có thể nhập. Mitigation: có label "ĐẦU TRANG (HEADER)"/"CHÂN TRANG (FOOTER)" hiện khi hover header/footer (đã có từ trước).
- Table cell paragraph style giờ được áp dụng — có thể thay đổi giao diện tài liệu nhập có style tùy chỉnh trong ô. Đã test round-trip, không regression.

## DEPENDENCIES/BLOCKERS
- W24 (pagination overhaul) cần thiết để giải quyết drift:table, page, line-height triệt để.

## CORE PATCH ID
Không có (không sửa LibreOffice Core).

## NEXT ACTION
1. Commit thay đổi (git commit -F tiếng Việt không dấu).
2. W24 tiếp nhận số đo drift:table/page/line-height từ handoff này để thiết kế bộ phân trang mới.
3. Rà soát help entries cho placeholder header/footer (theo AGENTS.md §10).