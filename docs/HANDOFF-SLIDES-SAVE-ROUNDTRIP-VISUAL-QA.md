# Báo Cáo Bàn Giao: Kiểm Tra Thị Giác Round-Trip Lưu File Slides (FODP → PPTX → FODP)

- **TASK**: Kiểm tra thị giác round-trip Lưu file của Slides (đặc biệt tính năng Xoay hình vừa xây)
- **AGENT/ROLE**: agy (Visual QA & Integration Verification)
- **BRANCH**: `visual-qa/slides-save-roundtrip`
- **WORKTREE**: `E:\VNOffice-agy-slides-save-roundtrip`
- **DATE**: 2026-09-08

---

## 1. Mục tiêu & Ranh giới an toàn

### 1.1. Mục tiêu kiểm thử
Sau khi tính năng Xoay hình khối (Shape Rotation) được hoàn thiện ở phiên trước, mục tiêu của phiên này là:
1. Xác minh **vòng Lưu file THẬT**: `Canvas Slides (DOM) → serializeToFodp() → main.py save_document_dialog() → LibreOffice headless engine (soffice) → tệp .pptx thật → soffice → FODP → open_document_dialog() → Slides UI/Canvas`.
2. Kiểm tra trực quan và số liệu:
   - Các hình khối xoay ở các góc khác nhau (30°, 90°, 135°) có giữ **chính xác góc xoay** sau khi lưu và mở lại không (bằng mắt và số liệu DOM)?
   - Tọa độ vị trí (`x`, `y`) và kích thước (`w`, `h`) có được bảo toàn nguyên vẹn hay không?
   - Các tay cầm thao tác (tay cầm xoay `.vno-shape-rotate-handle`, 8 tay cầm co giãn `.vno-shape-resize-handle`) có hoạt động bình thường trên hình vừa mở lại, hay bị "đông cứng" / mất tương tác?

### 1.2. Ranh giới an toàn
- Tuyệt đối không sửa `main.py`.
- Không sửa `adapters/libreoffice/slides/slides-adapter.js` (không có lỗi serialize/parse nào cần can thiệp).
- Không can thiệp vào các ứng dụng Writer hay Sheet.
- Không merge vào `main`, không push remote.

---

## 2. Phương pháp thực nghiệm (Methodology)

Để kiểm tra vòng lưu và mở thật 100% không dùng mock dữ liệu giả định:
1. **Khởi chạy môi trường kiểm thử**:
   - Khởi chạy HTTP test server cục bộ (cổng `8796`) phục vụ toàn bộ mã nguồn web.
   - Sử dụng Microsoft Edge headless qua Playwright (`tests/live/slides-save-roundtrip-visual-qa.playwright.mjs`).
2. **Tạo nội dung và thao tác xoay bằng tay cầm thật**:
   - Mở VN Slides ở độ phân giải chuẩn 1600x1000.
   - Tạo 3 hình khối đại diện: Hình chữ nhật (`rect`), Hình elip (`ellipse`), Hộp văn bản (`textbox`).
   - Dùng Playwright mô phỏng sự kiện chuột kéo tay cầm xoay thật (`.vno-shape-rotate-handle`) kết hợp giữ phím Shift (snap 15°):
     - Hình chữ nhật: xoay tới **30°**
     - Hình elip: xoay tới **90°**
     - Hộp văn bản: xoay tới **135°**
   - Chụp ảnh màn hình trạng thái **Trước Lưu** (`slides-roundtrip-01-before-save-canvas.png` và `slides-roundtrip-02-before-save-selected.png`).
3. **Cầu nối Python headless (`scripts/slides_save_roundtrip_bridge.py`)**:
   - Trích xuất chuỗi FODP trực tiếp từ canvas đang mở thông qua `globalUnoBridge.activeDocument.serializeToFodp()`.
   - Chuyển chuỗi FODP qua script Python để gọi trực tiếp `main.VnOfficeApi.save_document_dialog(content, "slides", target_format="pptx", ...)` với mock `webview.create_file_dialog` headless:
     - LibreOffice engine thật (`soffice.exe`) chuyển đổi `draft.fodp` sang `draft.pptx`.
     - Bộ hậu-kỳ `_apply_native_export_postprocess()` xử lý cấu trúc OOXML PPTX.
     - Xuất ra tệp `.pptx` thật (`slides-saved-roundtrip.pptx`, kích thước 20,493 bytes).
   - Gọi trực tiếp `main.VnOfficeApi.open_document_dialog("slides")` trỏ tới tệp `.pptx` vừa xuất:
     - LibreOffice engine thật chuyển đổi từ `.pptx` ngược lại định dạng trung gian `fodp`.
     - Bộ tiền xử lý `_apply_native_import_overlay()` nạp cấu trúc PPTX.
     - Trả về payload mở tệp chuẩn chứa toàn bộ nội dung FODP thật (151,502 ký tự XML).
4. **Tiêm kết quả và kích hoạt Mở qua UI thật**:
   - Đưa payload thật vào `globalUnoBridge.openRealFile` trên trang Playwright.
   - Kích hoạt menu **Tệp → Mở tệp** trên thanh Ribbon (`.vno-ribbon-tab-file` → `[data-backstage-cmd="common.file.open"]`).
   - Ứng dụng nạp dữ liệu FODP thật vào Canvas qua `SlidesAdapter.loadFromFodp()`.
5. **So sánh thị giác và kiểm tra tương tác**:
   - Chụp ảnh màn hình trạng thái **Sau Khi Mở Lại** (`slides-roundtrip-03-after-open-canvas.png`).
   - So sánh góc xoay, vị trí và kích thước của từng hình.
   - Chọn hình chữ nhật đã mở lại, xác nhận 8 tay cầm resize và tay cầm xoay xuất hiện (`slides-roundtrip-04-after-open-selected.png`).
   - Thao tác kéo xoay tiếp từ 30° lên 60° và kéo co giãn kích thước bằng tay cầm `se` để kiểm chứng tương tác không bị đông cứng (`slides-roundtrip-05-after-open-interaction.png`).

---

## 3. Bảng đối chiếu số liệu Trước Lưu vs Sau Khi Mở Lại

Dữ liệu được trích xuất trực tiếp từ DOM và Document Model của VN Slides:

| Đối tượng | Thuộc tính | Trước Lưu (Gốc) | Sau Khi Mở Lại (Round-Trip) | Độ lệch (Delta) | Đánh giá |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Hình chữ nhật** (`shape-rect-30`) | **Góc xoay (rotation)** | **30°** | **30.00000000000007°** | **< 0.000001°** | **Hoàn hảo (Khớp 100%)** |
| | Tọa độ X | 120 px | 120 px | 0 px | Giữ nguyên tuyệt đối |
| | Tọa độ Y | 120 px | 120 px | 0 px | Giữ nguyên tuyệt đối |
| | Chiều rộng W | 220 px | 220 px | 0 px | Giữ nguyên tuyệt đối |
| | Chiều cao H | 140 px | 140 px | 0 px | Giữ nguyên tuyệt đối |
| | Màu sắc & Nội dung | `#2563eb` / "Chữ nhật 30°" | `#2563eb` / "Chữ nhật 30°" | 0 | Giữ nguyên tuyệt đối |
| **Hình elip** (`shape-ellipse-90`) | **Góc xoay (rotation)** | **90°** | **90.0000000000002°** | **< 0.000001°** | **Hoàn hảo (Khớp 100%)** |
| | Tọa độ X | 420 px | 420 px | 0 px | Giữ nguyên tuyệt đối |
| | Tọa độ Y | 120 px | 120 px | 0 px | Giữ nguyên tuyệt đối |
| | Chiều rộng W | 180 px | 180 px | 0 px | Giữ nguyên tuyệt đối |
| | Chiều cao H | 180 px | 180 px | 0 px | Giữ nguyên tuyệt đối |
| | Màu sắc & Nội dung | `#10b981` / "Elip 90°" | `#10b981` / "Elip 90°" | 0 | Giữ nguyên tuyệt đối |
| **Hộp văn bản** (`shape-textbox-135`) | **Góc xoay (rotation)** | **135°** | **135.0000000000003°** | **< 0.000001°** | **Hoàn hảo (Khớp 100%)** |
| | Tọa độ X | 680 px | 680 px | 0 px | Giữ nguyên tuyệt đối |
| | Tọa độ Y | 140 px | 140 px | 0 px | Giữ nguyên tuyệt đối |
| | Chiều rộng W | 220 px | 220 px | 0 px | Giữ nguyên tuyệt đối |
| | Chiều cao H | 100 px | 100 px | 0 px | Giữ nguyên tuyệt đối |
| | Màu sắc & Nội dung | `transparent` / "Hộp văn bản 135°" | `transparent` / "Hộp văn bản 135°" | 0 | Giữ nguyên tuyệt đối |

---

## 4. Đánh giá tính năng tương tác sau khi Mở lại (Interaction Health Check)

Sau khi tài liệu PPTX thật được nạp lại vào canvas:
1. **Hiển thị tay cầm**:
   - Khi nhấp chọn hình khối vừa mở lại, tay cầm xoay `.vno-shape-rotate-handle` và cuống nối `.vno-shape-rotate-stem` xuất hiện chuẩn xác phía trên đỉnh hình.
   - Đủ 8 tay cầm co giãn `.vno-shape-resize-handle` xuất hiện tại các góc và cạnh của bounding box đã xoay.
   - Nút xóa đỏ `.vno-shape-delete-btn` tự động counter-rotate và giữ tư thế thẳng đứng.
2. **Khả năng xoay tiếp (Second Rotation)**:
   - Thao tác kéo tay cầm xoay trên hình chữ nhật vừa mở lại (từ 30° lên 60°) hoạt động trơn tru.
   - Góc xoay cập nhật chính xác thành `60°`.
3. **Khả năng co giãn (Resize)**:
   - Kéo tay cầm `se` của hình đã mở lại làm thay đổi kích thước từ `220x140` thành `266x120` một cách mượt mà theo trục tọa độ cục bộ.
   - Không xuất hiện hiện tượng "đông cứng" (frozen handles) hay mất bộ lắng nghe sự kiện (`pointerdown`/`pointermove`).

---

## 5. Danh mục ảnh chụp màn hình kiểm chứng (Visual Evidence)

Toàn bộ ảnh chụp màn hình thực tế được ghi lại tự động từ Edge Playwright trong thư mục `docs/screenshots/`:

| STT | Tên tệp ảnh | Nội dung kiểm chứng |
| :---: | :--- | :--- |
| 1 | `docs/screenshots/slides-roundtrip-01-before-save-canvas.png` | Toàn cảnh Canvas trước khi lưu: 3 hình khối xoay ở các góc 30°, 90°, 135° |
| 2 | `docs/screenshots/slides-roundtrip-02-before-save-selected.png` | Hình chữ nhật xoay 30° trước lưu đang được chọn: hiển thị tay cầm xoay và 8 tay cầm resize |
| 3 | `docs/screenshots/slides-roundtrip-03-after-open-canvas.png` | Toàn cảnh Canvas sau khi Lưu thành file PPTX thật và Mở lại qua soffice: góc xoay và vị trí giữ nguyên vẹn |
| 4 | `docs/screenshots/slides-roundtrip-04-after-open-selected.png` | Hình khối sau khi mở lại được chọn: đầy đủ tay cầm xoay, 8 tay cầm resize và nút xóa hoạt động |
| 5 | `docs/screenshots/slides-roundtrip-05-after-open-interaction.png` | Kiểm tra tương tác trên hình vừa mở lại: xoay tiếp lên 60° và co giãn kích thước thành công |

---

## 6. Kết luận về lỗi & Độ tin cậy

- **Có lỗi UI/CSS nào không?** KHÔNG. Giao diện hiển thị chuẩn xác, không bị lệch pixel hay vỡ layout.
- **Có lỗi logic serialize/parse FODP hay Python không?** KHÔNG. Vòng chuyển đổi hai chiều qua LibreOffice headless engine (`serializeToFodp` → `draw:transform="rotate(...) translate(...)"` → PPTX native OOXML → `parseFodp` → Canvas) bảo toàn 100% góc xoay, vị trí và kích thước.
- **Tương tác**: Hoàn toàn bình thường, không bị đông cứng hay thoái lui.

---

## 7. Kết quả kiểm thử bắt buộc (Test Truthfulness)

- `node scripts/check-syntax.js`: **89/89 PASS** (0 lỗi cú pháp).
- `node tests/run-tests.js`: **1511/1511 PASS** (không giảm so với ban đầu).
- `node tests/live/slides-save-roundtrip-visual-qa.playwright.mjs`: **100% PASS**.

---

## 8. Git Log và Git Status Thực Tế (Verbatim Output)

### Git Log (`git log --oneline main..HEAD`)
```text
(Chưa commit - xem mục bên dưới trước khi tạo commit)
```

### Git Status (`git status`)
```text
On branch visual-qa/slides-save-roundtrip
Untracked files:
  (use "git add <file>..." to include in what will be committed)
	TASK-BRIEF-SLIDES-SAVE-ROUNDTRIP.md
	docs/HANDOFF-SLIDES-SAVE-ROUNDTRIP-VISUAL-QA.md
	docs/screenshots/slides-roundtrip-01-before-save-canvas.png
	docs/screenshots/slides-roundtrip-02-before-save-selected.png
	docs/screenshots/slides-roundtrip-03-after-open-canvas.png
	docs/screenshots/slides-roundtrip-04-after-open-selected.png
	docs/screenshots/slides-roundtrip-05-after-open-interaction.png
	scripts/slides_save_roundtrip_bridge.py
	tests/fixtures/slides-roundtrip/
	tests/live/slides-save-roundtrip-visual-qa.playwright.mjs

nothing added to commit but untracked files present (use "git add" to track)
```
