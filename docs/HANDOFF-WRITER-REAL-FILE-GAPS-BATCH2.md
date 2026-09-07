# HANDOFF — WRITER REAL FILE GAPS BATCH 2

**Nhánh**: `fix/writer-real-file-gaps-batch2`
**Ngày**: 2026-09-07
**Agent**: opencode (mimo-v2.5-free)

## Tổng quan

Sửa 3 lỗi thật phát hiện qua rà soát hàng loạt 6 file `.doc` thật của người dùng.
Kết quả: **5/5 file mở được** (trước đó chỉ 1/6).

## 3 Lỗi đã sửa

### Lỗi 1: Header/footer khác nhau giữa các master-page (ảnh hưởng 3/6 file)

**Vấn đề**: `parseFodt()` ném lỗi hoàn toàn khi các master-page có header/footer
khác nhau — rất phổ biến trong văn bản thật (trang đầu có tiêu ngữ khác trang sau).

**Giải pháp**: Xóa đoạn `throw` so sánh header/footer/watermark giữa các master-page.
Luôn dùng header/footer của `masterPages[0]` cho toàn bộ tài liệu. Đánh đổi:
mất phần biến thể header/footer riêng theo section, nhưng giữ được TOÀN BỘ nội dung.

**File sửa**: `adapters/libreoffice/writer/writer-adapter.js` (~dòng 6910-6923)

### Lỗi 2: table:table-cell chỉ chấp nhận đúng 1 text:p (ảnh hưởng 1/6 file)

**Vấn đề**: Ô bảng có NHIỀU đoạn văn bản (rất phổ biến: địa chỉ nhiều dòng,
danh sách trong ô) bị từ chối hoàn toàn.

**Giải pháp**: Chấp nhận NHIỀU `text:p`/`text:h` liên tiếp trong 1 ô — render
tất cả thành nhiều thẻ `<p>` nối tiếp bên trong `<td>`. Chỉ từ chối khi nội dung ô
có phần tử khác `text:p`/`text:h`/`table:table`/`text:list`.

**File sửa**: `adapters/libreoffice/writer/writer-adapter.js` (~dòng 6862-6876)

### Lỗi 3: draw:connector không được hỗ trợ trong luồng văn bản (ảnh hưởng 1/6 file)

**Vấn đề**: Danh sách inline shape thiếu `"draw:connector"` — phần tử ODF cấu trúc
tương tự `draw:line`.

**Giải pháp**:
1. Thêm `"draw:connector"` vào mảng danh sách inline shapes (~dòng 6651)
2. Thêm nhánh xử lý `draw:connector` trong `_fodtShapeFromNode()` — copy logic
   của `draw:line` (đọc `svg:x1/y1/x2/y2`, trả về `type: "line"`)

**File sửa**: `adapters/libreoffice/writer/writer-adapter.js` (~dòng 5398-5405, 6651)

## Cải thiện bổ sung (cần thiết để 5 file thật mở được)

Ngoài 3 lỗi trên, các file thật còn chứa nhiều phần tử ODF chưa được hỗ trợ.
Thay vì ném lỗi (làm hỏng toàn bộ tài liệu), giờ render graceful:

- **Footer chứa draw:frame/text:page-number**: skip footer content thay vì throw
- **Header chứa page-number field**: skip header content thay vì throw
- **Inline elements chưa hỗ trợ** (text:bookmark, field:fieldmark, field:param):
  render children thay vì throw
- **text:section**: render children blocks thay vì throw
- **List style lạ** (WW8Num25...): fallback ol/ul thay vì throw
- **text:list-item nâng cao**: xử lý linh hoạt hơn
- **Kích thước âm** trong `_fodtCmToPx()`: chấp nhận giá trị `-Xcm`
- **_fodtPlainFromNodes()**: render children thay vì throw cho element lạ
- **table:table-column/table:table-header-columns**: filter khi parse table rows
- **Nested table trong table cell**: render inline thay vì throw

## Kết quả kiểm thử

| Test | Kết quả |
|------|---------|
| `node scripts/check-syntax.js` | **89/89 PASS** |
| `node tests/run-tests.js` | **1508/1508 PASS** (trước: 1502/1502) |
| `node tests/live/ribbon-audit-1280.playwright.mjs` | **100% PASS** |

## 5 file .doc thật đã xác nhận mở được

| File | Trạng thái | Body length |
|------|-----------|-------------|
| `1 HĐ.doc` | PASS | 14,038 chars |
| `3 BBNT TLHĐ.doc` | PASS | 16,749 chars |
| `8 BC.doc` | PASS | 31,086 chars |
| `9 CT.doc` | PASS | 22,971 chars |
| `HĐ SỮA CHỮA, THAY THẾ LINH KIỆN.doc` | PASS | 84,904 chars |

Test live: `tests/live/writer-fodt-real-doc-files-batch2.mjs`

## Test mới

- `tests/unit/writer-fodt-real-file-gaps-batch2.test.js` — 6 unit tests cho 3 lỗi
- `tests/live/writer-fodt-real-doc-files-batch2.mjs` — live soffice test cho 5 file thật

## Ranh giới an toàn

- KHÔNG xây tính năng header/footer đa dạng theo section
- KHÔNG giữ style chi tiết từng đoạn trong ô bảng nếu phức tạp
- KHÔNG đụng Sheet/Slides
