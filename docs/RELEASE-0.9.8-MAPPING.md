# Bản đồ ghi chú phát hành 0.9.8 (line → commit)

Mục tiêu: nội dung tiếng Việt cho trang **Trợ giúp → Có gì mới** của bản vá 0.9.8.
Mỗi dòng gạch đầu dòng trong `release-notes.txt` (phần 0.9.8) phải tương ứng đúng một commit merge đã vào `main`.
Task docs-only: không sửa code, không đổi số phiên bản, không build, không merge `main`, không push.

## 1. Tệp ghi chú

| Thành phần | Vị trí | Ghi chú |
|---|---|---|
| Tệp duy nhất | `release-notes.txt` (thư mục gốc) | UTF-8 **không BOM**; 4 byte đầu vẫn là `33 54 20 4F` (`3T O`) |
| Thứ tự khối | Khối 0.9.8 nằm **trên** khối 0.9.7, ngăn bằng dòng `============================================================` | giữ nguyên toàn bộ khối 0.9.7 và 0.9.0-pilot1 |
| Dạng | Tiêu đề `3T Office — Thông tin phát hành phiên bản 0.9.8`, dòng `Ngày phát hành: (chưa phát hành)`, chia `1. Chung / 2. Doc / 3. Sheet / 4. Slide` | mỗi thay đổi một dòng `- ` |
| Unit test | `tests/unit/ui-user-visible-strings.test.js` (CH-8.3, CH-8.4) | quét cấm từ bị chặn trên chính `release-notes.txt`; vẫn phải giữ chuỗi `3T Office` và `0.9.0-pilot1` |

## 2. Ranh giới gói 0.9.7 → 0.9.8

- Gói 0.9.7 đóng từ commit **`df896485`** (`Merge docs/release-notes-097-opencode`).
- `main` hiện tại: **`0b9a3dad`**.
- Lệnh lấy danh sách merge (`git log --first-parent --merges df896485..main --format=%h" %cd "%s --date=format:%d/%m" "%H:%M`):

```text
0b9a3dad 03/10 09:48 Merge fix/sheet-time-detect-opencode (opencode): nhan dien gio go tay 13:45 o Sheet (so ngay + dinh dang gio); hoi quy desktop 27/27 lan dau
13cc44bc 02/10 10:46 Merge test/ch6-5-kill-by-name-guard-opencode (opencode): CH-6.5 chan tat tien trinh theo ten trong tests/scripts, sua 2 script sang tat dung PID; node 2566/2566
c57ffac0 02/10 10:13 merge: gop main vao feat/ch4-cross-app-paste-agy, giu nguyen logic cat dan doc va sua phan tram sheet, 2565/2565 test pass
```

Toàn bộ `df896485..main` có 9 commit; trong đó 3 commit merge như trên, 2 merge có thay đổi người dùng nhìn thấy
(`c57ffac0`, `0b9a3dad`), 1 merge chỉ sửa bộ kiểm thử (`13cc44bc`).

## 3. Bảng line → commit

| # | Nhóm | Dòng ghi chú (tóm tắt) | Commit merge |
|---|---|---|---|
| 1 | Chung | Dán chéo giữa Doc, Sheet và Slide qua bảng nhớ tạm của máy; giữ chữ đậm, chữ nghiêng, số, ngày; Ctrl+Z hoàn tác một bước sau khi dán | `c57ffac0` |
| 2 | Doc | Dán bảng từ Sheet hoặc chữ từ Slide sang Doc: bảng giữ kẻ ô, hàng tiêu đề in đậm, số và ngày đúng; chữ giữ đậm/nghiêng | `c57ffac0` |
| 3 | Sheet | Dán bảng từ Doc sang Sheet điền đúng ô, số nhận là số dùng ngay trong hàm; giữ giá trị hiển thị và chữ đậm từng ô | `c57ffac0` |
| 4 | Sheet | Gõ giờ (ví dụ 13:45) vào ô được nhận là giờ, có định dạng giờ và tính toán được; giờ sai (25:00) vẫn là văn bản | `0b9a3dad` |
| 5 | Slide | Dán bảng từ Sheet hoặc chữ từ Doc sang Slide: bảng thành bảng biểu trên trang chiếu, chữ giữ đậm/nghiêng trong hộp chữ | `c57ffac0` |

5 dòng → 2 commit merge (`c57ffac0` gộp các commit tính năng `1fa38436`, `1cc1358b` trên nhánh CH-4;
`0b9a3dad` gộp `5eedd0fe`).

## 4. Merge sau ranh giới nhưng KHÔNG đưa vào ghi chú

| Commit | Lý do |
|---|---|
| `13cc44bc` | CH-6.5 chặn kill tiến trình theo tên trong `tests/` và `scripts/`; chỉ sửa bộ kiểm thử, không đổi trải nghiệm người dùng |

## 5. Ứng viên đã đối chiếu và LOẠI (đã nằm trong gói 0.9.7)

Đối chiếu bằng `git merge-base --is-ancestor <commit> df896485` → tất cả đều là ancestor của `df896485`,
tức đã có trong gói 0.9.7 và đã được ghi ở khối 0.9.7, không lặp lại ở 0.9.8:

| Ứng viên trong đề bài | Commit | Kết luận |
|---|---|---|
| Ctrl+X/V ở Doc giữ cấu trúc đoạn | `38487ede` | Trong gói 0.9.7 (02/10 09:07) |
| Dán bảng tính khác: 25% không thành 0% (và phần trăm âm/nhỏ) | `168a03dc` (cùng `9e1fcd6a`, `ead89557`) | Trong gói 0.9.7 (02/10 09:44) |
| Chính tả tiếng Việt: gạch đỏ trên ô Sheet, gợi ý chuột phải, bật/tắt ở cả 3 ứng dụng | `36585233` | Trong gói 0.9.7 (02/10 08:46) — dòng 5 khối 0.9.7 |
| Đồng bộ màn hình Tệp, Tệp gần đây, thanh trạng thái, thu phóng (CH-8.1) | `3cb84014` | Trong gói 0.9.7 (02/10 09:36) — dòng 21 khối 0.9.7 |
| Bảng tính đủ 1.048.576 hàng x 16.384 cột | `e8178cc9` | Trong gói 0.9.7 (02/10 07:33) — dòng 17 khối 0.9.7 |
| Kiểm tra chính tả / thước dọc / ảnh / bảng ở Doc | `8348eb92` (dùng chung) + `9dc8d175` | Trong gói 0.9.7 — dòng 13–14 khối 0.9.7 |

Ứng viên còn lại **có thật sau ranh giới**: gõ giờ 13:45 vào ô Sheet (`0b9a3dad`) và dán chéo Doc/Sheet/Slide (`c57ffac0`)
→ là toàn bộ nội dung khối 0.9.8.

## 6. Kết quả kiểm thử

- `node tests/run-tests.js` (chạy foreground, không có tiến trình nền nào khác):

```text
KẾT QUẢ KIỂM THỬ: 2573/2573 PASS | 0 FAIL
```

Trạng thái test: **PASS = đã chạy và pass**. Test desktop `tests/live/cdp/*` NOT RUN (task docs-only).
