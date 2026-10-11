# Bản đồ ghi chú phát hành 0.9.8 (line → commit)

Mục tiêu: nội dung tiếng Việt cho trang **Trợ giúp → Có gì mới** của bản 0.9.8.
Mỗi dòng trong `release-notes.txt` (phần 0.9.8) phải tương ứng đúng một commit merge đã vào `main`.
Task docs-only: không đổi `APP_VERSION`, không build, không merge `main`, không push.

## 1. Ranh giới 0.9.7 → 0.9.8

- Gói 0.9.7 đóng từ commit `df896485` (merge `docs/release-notes-097-opencode`, 02/10 09:55).
- Nội dung 0.9.8 = toàn bộ thay đổi vào `main` **sau** `df896485`, tức khoảng `df896485..main` (đỉnh `main` hiện tại: `0b9a3dad`).

Lệnh liệt kê merge (first-parent):

```text
git log --first-parent --merges df896485..main --format='%h %cd %s' --date=format:'%d/%m %H:%M'
```

| # | Commit merge | Thời gian | Nội dung |
|---|---|---|---|
| 1 | `c57ffac0` | 02/10 10:13 | merge nhánh `feat/ch4-cross-app-paste-agy` — dán chéo giữa Doc, Sheet và Slide (CH-4) |
| 2 | `13cc44bc` | 02/10 10:46 | merge `test/ch6-5-kill-by-name-guard-opencode` — cấm kill tiến trình theo tên trong `tests/`, `scripts/` |
| 3 | `0b9a3dad` | 03/10 09:48 | merge `fix/sheet-time-detect-opencode` — nhận diện giờ gõ tay 13:45 ở Sheet |

Ghi chú về topo: `git reflog show main` ghi `c57ffac0 ... merge feat/ch4-cross-app-paste-agy: Fast-forward`, nghĩa là nhánh CH-4 được đưa vào `main` bằng fast-forward. `c57ffac0` là merge commit (cha thứ hai = `df896485`) và cũng là mốc đầu tiên của CH-4 trên lịch sử first-parent của `main`, nên toàn bộ dòng CH-4 trong bảng dưới đây ánh xạ vào `c57ffac0`.
Các commit nền của nhánh CH-4 (không phải merge): `2af05468`, `1fa38436`, `59d3af61`, `1cc1358b`.

Toàn bộ `df896485..main` chỉ có 9 commit (3 merge + 6 commit thường). Ngoài CH-4 và lỗi giờ Sheet, chỉ còn `13cc44bc`/`445ba510` (bộ kiểm thử nội bộ, không hiện ra giao diện người dùng).

## 2. Bảng line → commit

Dòng tương ứng từng dòng `- ` trong mục 0.9.8 của `release-notes.txt`:

| # | Nhóm | Dòng ghi chú (tóm tắt) | Commit merge |
|---|---|---|---|
| 1 | Chung | Dán chéo giữa Doc, Sheet và Slide: Ctrl+C, Ctrl+V; dán xong Ctrl+Z hoàn tác một bước | `c57ffac0` |
| 2 | Chung | Dán chỉ giữ chữ bằng Ctrl+Shift+V ở Doc, Sheet và Slide | `c57ffac0` |
| 3 | Doc | Dán bảng từ Sheet vào Doc đúng số hàng, số cột; giữ đậm tiêu đề, số và ngày | `c57ffac0` |
| 4 | Doc | Sao chép bảng hoặc đoạn văn từ Doc sang Sheet và Slide giữ in đậm, in nghiêng | `c57ffac0` |
| 5 | Sheet | Dán từ Doc hoặc Slide: bảng tính thành từng ô, số là số dùng cho công thức | `c57ffac0` |
| 6 | Sheet | Cắt ô Ctrl+X rồi Ctrl+V, ô nguồn được xóa sạch | `c57ffac0` |
| 7 | Sheet | Gõ giờ 13:45 vào ô được nhận là giờ; giờ sai như 25:00 giữ nguyên dạng chữ | `0b9a3dad` |
| 8 | Slide | Dán bảng từ Sheet hoặc Doc lên trang chiếu tạo bảng; vào hộp chữ giữ đậm, nghiêng | `c57ffac0` |

8 dòng → 2 commit merge khác nhau (`c57ffac0` ×7, `0b9a3dad` ×1).

Bằng chứng cho từng dòng (đo trong repo, không suy đoán):

- Dòng 1–6 và 8 (CH-4): `docs/HANDOFF-CH4-CROSS-APP-PASTE.md` (7 tiêu chí CDP: Sheet↔Doc, Doc↔Sheet, Doc↔Slide, Slide↔Doc, Sheet↔Slide, dán chỉ chữ, Ctrl+Z một bước); unit `tests/unit/cross-app-paste.test.js`; `tests/run-tests.js` suite 228.
- Dòng 5, 6: `adapters/libreoffice/sheet/sheet-adapter.js` (sửa `isInternal` khi cắt/dán trong Sheet, `_pasteIntoSelectedCell(plainTextOnly)`), `platform/clipboard/office-clipboard.js` (`getSheetCellDisplayText`, `isCellBold`).
- Dòng 7: `apps/sheet/sheet-grid.js` (nhãn `numberFormat` category `time` khi `NumberFormatter.isTimeInput`), `apps/sheet/number-formatter.js`, unit `tests/unit/sheet-format-cells.test.js`, `docs/HANDOFF-SHEET-TIME-INPUT-DETECT.md`.

## 3. Ứng viên bị loại (đối chiếu với merge list, KHÔNG đưa vào ghi chú)

| Ứng viên trong đề bài | Commit thật | Lý do loại |
|---|---|---|
| Ctrl+X/V ở Doc giữ cấu trúc đoạn | `38487ede` | Là ancestor của `df896485` → đã có trong gói 0.9.7 |
| Dán phần trăm 25% không thành 0% (và phần trăm âm/nhỏ) | `168a03dc` | Là ancestor của `df896485` → đã có trước gói 0.9.7 |
| Chính tả tiếng Việt: gạch đỏ trên ô Sheet, gợi ý chuột phải, bật/tắt ở cả 3 ứng dụng | `36585233`, `e61ccd75` | Đã nằm trong ghi chú 0.9.7 (dòng 9) |
| Đồng bộ màn hình Tệp, Tệp gần đây, thanh trạng thái, thu phóng (CH-8.1) | `3cb84014` | Đã nằm trong ghi chú 0.9.7 (dòng 17) |
| Bảng tính đủ 1.048.576 hàng × 16.384 cột | `e8178cc9` | Đã nằm trong ghi chú 0.9.7 (dòng 27) |
| Kiểm tra chính tả, thước dọc, ảnh, bảng ở Doc | `8348eb92` | Đã nằm trong ghi chú 0.9.7 (dòng 20) |
| Cấm kill tiến trình theo tên trong test/script | `13cc44bc` | Merge có thật sau `df896485` nhưng chỉ là guard kiểm thử, không thay đổi trải nghiệm người dùng |

Kiểm tra ancestry dùng: `git merge-base --is-ancestor <hash> df896485`.

## 4. Kết quả kiểm thử

- `node tests/run-tests.js` (foreground, không có tiến trình nền nào khác):

```text
KẾT QUẢ KIỂM THỬ: 2573/2573 PASS | 0 FAIL
```

Trạng thái test: **PASS = đã chạy và pass**. Test desktop `tests/live/cdp/*.desktop.mjs` NOT RUN (task này chỉ chạy `run-tests.js`).

## 5. Quy ước văn bản đã tuân thủ

- Tên ngắn: Doc, Sheet, Slide; tên sản phẩm: 3T Office.
- Mục 0.9.8: không nhắc tên sản phẩm của hãng khác, không nói quá (không "100%", "hoàn hảo", "chuẩn ...").
- Dấu tiếng Việt đầy đủ; mỗi dòng một thay đổi thấy được của người dùng.
- Tệp `release-notes.txt`: UTF-8 không BOM, giữ nguyên 2 byte đầu `33 54` (`3T`), mọi xuống dòng CRLF.
