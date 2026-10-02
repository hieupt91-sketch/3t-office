# Bản đồ ghi chú phát hành 0.9.7 (line → commit)

Mục tiêu: nội dung tiếng Việt cho trang **Trợ giúp → Có gì mới** của bản 0.9.7.
Mỗi dòng trong `release-notes.txt` (phần 0.9.7) phải tương ứng đúng một commit merge đã vào `main`.
Không đổi số phiên bản, không build gì ở task này (đóng gói là việc của Claude).

## 1. Trang "Có gì mới" đọc tệp nào

| Thành phần | Vị trí | Hành vi |
|---|---|---|
| Bridge Python `get_release_notes` | `main.py` (hàm `get_release_notes`) | Thử lần lượt `notes-<APP_VERSION>.txt` → `release-notes.txt` → `RELEASE-NOTES.md` → `docs/RELEASE-NOTES.md`; trả về chuỗi nguyên văn |
| Fallback phía JS | `platform/help/help-panel.js` (`_loadReleaseNotesInto`) | Nếu không có bridge: `fetch` `release-notes.txt` → `RELEASE-NOTES.md` → `notes-0.9.0-pilot1.txt` |
| Unit test của trang | `tests/unit/ui-user-visible-strings.test.js` (mục CH-8.3) | Bắt buộc `release-notes.txt` tồn tại, chứa `3T Office` và `0.9.0-pilot1`; đồng thời quét cấm từ bị chặn trên chính tệp này |

Repo chưa từng có tệp `notes-*.txt` (các tệp `notes-0.9.x.txt` chỉ nằm ngoài repo ở `E:\VNOffice-dist`, dùng cho manifest cập nhật qua `scripts/release/release-pilot.ps1 -NotesFile`).
→ **Một tệp duy nhất**: thêm mục 0.9.7 lên đầu `release-notes.txt`, giữ nguyên mục 0.9.0-pilot1 bên dưới (test vẫn đòi chuỗi `0.9.0-pilot1`).
Dạng văn bản thuần UTF-8, không BOM, mỗi thay đổi một dòng `- `, chia nhóm `1. Chung / 2. Doc / 3. Sheet / 4. Slide`.

Ghi chú cho bước đóng gói (không sửa ở task này): `scripts/build-pilot.ps1` hiện **chưa** chép `release-notes.txt` vào gói; gói 0.9.7 cần mang theo `release-notes.txt` (hoặc `notes-0.9.7.txt`) ở thư mục gốc của app thì trang "Có gì mới" mới có nội dung. `APP_VERSION` trong `main.py` giữ nguyên, số 0.9.7 chỉ do `build-pilot.ps1 -Version` tiêm lúc build.

## 2. Ranh giới 0.9.6 → 0.9.7

Heuristic trong đề bài (`git log --grep=0.9.6`) chỉ ra `4919c607` — nhưng đó là merge CH-2 có dòng test `e2e desktop 0.9.5->0.9.6`, **sau** thời điểm 0.9.6 đã đóng gói.

Bằng chứng đóng gói 0.9.6 (thư mục phát hành, chỉ đọc):

| Hạt nhân | Thời điểm |
|---|---|
| `E:\VNOffice-dist\notes-0.9.6.txt` | 01/10/2026 13:54 |
| `E:\VNOffice-dist\VNOffice-0.9.6\` (gói) | 01/10/2026 14:13 |
| `E:\VNOffice-dist\updates-staging\0.9.6\` + `channels\pilot.json` | 01/10/2026 14:21 |
| `E:\VNOffice-dist\VNOffice-Setup-0.9.6.exe` | 01/10/2026 14:25 |

Nội dung `notes-0.9.6.txt` chỉ liệt kê các merge ≤ `69133660` (01/10 12:56), không chứa merge nào sau đó.

→ **Ranh giới dùng ở đây: `69133660`** (merge code cuối trước khi đóng gói 0.9.6).
Có 32 merge vào `main` sau `69133660` (`git log --first-parent --merges 69133660..main`).

## 3. Bảng line → commit

| # | Nhóm | Dòng ghi chú (tóm tắt) | Commit merge |
|---|---|---|---|
| 1 | Chung | Giao diện và Trợ giúp thống nhất: Alt/KeyTips, F1 theo ngữ cảnh, trang "Có gì mới" | `69a9412c` |
| 2 | Chung | Cập nhật một chạm (báo trước, lưu, áp bản vá, mở lại, nhật ký/khôi phục) | `4919c607` |
| 3 | Chung | Tìm/Thay thế chung Ctrl+F, Ctrl+H, F3 | `2186b1fa` |
| 4 | Chung | Gõ tiếng Việt Unikey/EVKey: hoàn tác theo từng từ, chuẩn hóa, không chèn nhầm gợi ý công thức | `ab745872` |
| 5 | Chung | Chinh tả tiếng Việt gạch đỏ 3 app, chuột phải để sửa, bật/tắt trong Tùy chọn | `36585233` |
| 6 | Chung | Tên ngắn Doc, Sheet, Slide ở tiêu đề/giao diện/nội dung mẫu | `afaa8b78` |
| 7 | Chung | Phím tắt desktop, ghim thanh tác vụ dùng tên ngắn, bỏ tên cũ khi nâng cấp | `786278e8` |
| 8 | Chung | Hộp thoại In không lộ tên thư viện kỹ thuật | `bb63f561` |
| 9 | Chung | Rà soát Trợ giúp tiếng Việt 47 mục | `b45684ff` |
| 10 | Chung | Mở app/mở tệp nhanh hơn, gõ phím ngay sau khi mở | `a6fd67c2` |
| 11 | Chung | Tạo mới ở Sheet/Slide mở cửa sổ mới | `1529cd25` |
| 12 | Chung | Ổn định tiến trình: dọn tiến trình thừa, lưu tạm 2 phút, nhật ký hiệu năng tuỳ chọn | `fa29db17` |
| 13 | Doc | Thước, thụt đầu dòng, đánh số lại từ 1, lệnh Bảng, ảnh 8 tay cầm/giữ tỉ lệ/ngắt dòng, bảng tạm, gợi ý chinh tả | `8348eb92` |
| 14 | Doc | Sửa lỗi số trang trên màn hình lệch bản in (CSS trang) | `8348eb92` |
| 15 | Doc | Chèn phương trình Alt+=, dạng tuyến tính, lưu/mở lại giữ nguyên | `9a1e7ff9` |
| 16 | Sheet | 5 lỗi: số/ngày lưu thành số thật, giữ thiết lập in, Ctrl+A chọn vùng, sắp xếp giữ tiêu đề, xóa trang tính và màu tab | `214d3e7a` |
| 17 | Sheet | Đủ 1.048.576 hàng × 16.384 cột (trước 200 × 26), ảo hoá vùng nhìn thấy, Ctrl+mũi tên, ô tên vùng | `e8178cc9` |
| 18 | Sheet | Hộp thoại In thêm Phạm vi sổ làm việc (trang hiện hoạt / toàn bộ / vùng bôi đen) | `255b2973` |
| 19 | Slide | Tab/Shift+Tab thụt lề, Enter không thoát hộp chữ, giữ tỉ lệ ảnh, xóa/nhân bản trang an toàn, phím ở chế độ sắp xếp | `da59b302` |
| 20 | Slide | Ctrl+C/X/V trong hộp chữ | `bd747e65` |
| 21 | Chung | Giao diện dùng chung đồng bộ: màn hình Tệp, Tệp gần đây, thanh trạng thái, chế độ xem, thu phóng và phím tắt giữa Doc/Sheet/Slide | `3cb84014` |

20 commit merge khác nhau cho 21 dòng (dòng 13 và 14 cùng `8348eb92`).

## 4. Merge sau ranh giới nhưng KHÔNG đưa vào ghi chú

| Commit | Lý do |
|---|---|
| `0883d2f6`, `3eb582ce`, `17c25e2e`, `ca448272`, `c254c4ad`, `e6fec77c` | Chỉ tài liệu/spec, không thay đổi trải nghiệm người dùng |
| `16f3eb40` | Bộ kiểm thử desktop dùng chung (CH-6) |
| `b40cfbf3`, `3d58962f`, `8d428086`, `06c7c8c4` | Nghiệm thu/test, không thêm tính năng mới cho người dùng |
| `e279252d` | Nghiệm thu CH-7.2; sửa nhỏ "gợi ý hoàn tác 1 bước" đã nằm trong dòng 5 (`36585233`) |
| `adfcc339` | Đặt giá bản quyền (cấu hình máy chủ), không hiện trong ứng dụng |

## 5. Kết quả kiểm thử

- `node tests/run-tests.js` (chạy nền console, không có tiến trình nền nào khác):

```text
KẾT QUẢ KIỂM THỬ: 2448/2448 PASS | 0 FAIL
```

- Chạy riêng suite của trang "Có gì mới" (`tests/unit/ui-user-visible-strings.test.js`, 15/15 PASS), trong đó:

```text
PASS | CH-8.3 Có gì mới: Bài hướng dẫn Có gì mới tồn tại trong catalog và đọc được ghi chú phát hành
PASS | Names: installer wizard, pilot guide, release notes and desktop app titles use public names
```

Trạng thái test: **PASS = đã chạy và pass**. Test desktop `tests/live/ch8-ui-help-consistency.desktop.mjs` NOT RUN (task này chỉ chạy unit test + `run-tests.js`).
| + | Sheet/Doc | Dan tu bang tinh/van ban phan mem khac giu dinh dang (Claude bo sung) | `e24222b5` |
