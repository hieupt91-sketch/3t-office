# Q20 — Kết quả xử lý các tồn đọng Slides và trộn thư

Ngày: 20/10/2026  
Nhánh/worktree: `codex/queue-19-10` / `E:\VNOffice-codex-queue`

## Kết quả theo mục

### 1. Pulse và PPTX round-trip

Điều tra lại cho thấy ghi nhận Q18 đã gán nhầm hiệu ứng bị thiếu. CDP tạo PPTX riêng bằng mục Nhịp đập; PowerPoint COM chỉ đọc xác nhận hiệu ứng `EffectType=75`, thời lượng 0,5 giây trên hình “Hình thoi 1”. Vì vậy Pulse được giữ trong menu và mapping `ooo-emphasis-pulse` không đổi. Không có lỗi Pulse cần sửa.

Trong bài Q18 ba hiệu ứng, COM đọc được Pulse (`EffectType=75`) và Fade Out (`EffectType=10`), tổng 2/3; Fly In có trigger tới hình khác là mục không xuất hiện. Đây là vấn đề khác với yêu cầu Pulse và chưa sửa trong Q20.

### 2. Bố cục tùy chỉnh

CDP Q18 tạo/lưu/mở lại PPTX: bố cục trước lưu là `title-content`, `two-content`, `blank`; sau mở lại thành `blank`, `blank`, `title-content`. PowerPoint COM chỉ đọc thấy tên `Standard` trên cả 8 trang.

Chưa sửa. Luồng hiện tại xuất qua FODP/LibreOffice rồi vá một số thuộc tính OOXML; `_apply_slides_native_layout_types` chỉ đổi kiểu trên layout part mà LibreOffice đã tạo. Để mỗi trang chiếu giữ một CustomLayout riêng cần tạo/duy trì các `ppt/slideLayouts/*.xml` riêng, quan hệ slide-to-layout, danh sách layout trong master, content types và placeholder types. Chỉ đổi nhãn trong model không làm PowerPoint nhận đúng CustomLayout. Cần một thay đổi adapter/OOXML riêng với kiểm tra cấu trúc gói và COM đọc `CustomLayouts(i).Name` trước/sau.

### 3. In handout 3 trang chiếu/trang

Q18 và Q20 mở được preview; CDP báo 7 trang cho 7 slide không ẩn, một slide trên mỗi trang. Không có tùy chọn handout 3 trang/trang hoặc ghi chú.

Chưa sửa. Preview riêng của Slides dựng DOM từ `computePrintPages()`, còn hộp thoại In chung gửi FODP sang print worker để tạo PDF. Thêm nút đổi số slide trên preview sẽ không đổi PDF đầu ra. Cần mở rộng adapter/worker để dựng trang handout 3-up, truyền lựa chọn qua chuẩn bị/in PDF và kiểm tra số trang cùng bố cục PDF. Phạm vi này chưa được triển khai; chưa có bằng chứng PDF handout.

### 4. Hoàn tất trộn thư Writer

Đổi nhãn thành “Thay nội dung tài liệu đang mở”; mặc định bắt buộc đánh dấu xác nhận trước khi nút Hoàn tất được bật. Khi chọn in, xác nhận thay thế bị ẩn và không chặn nút. Help tiếng Việt mô tả rõ hành vi, vị trí ribbon và các bước; thêm chuỗi VI/EN.

CDP Q20: 5/5 PASS — hộp thoại mở, nhãn đúng, xác nhận bắt buộc, tiếp tục được sau xác nhận, tài liệu hiện tại nhận đúng hai bản ghi. Q19 đã xác nhận trước sửa rằng “Tạo tài liệu mới” không tạo cửa sổ mới và thay tài liệu hiện tại; Q20 chọn phương án đổi nhãn và xác nhận mà phiếu cho phép.

## Commits

- `4311adb5` — kiểm tra hành vi hiệu ứng trong danh sách.
- `90c28ae3` — đổi nhãn và thêm xác nhận thay nội dung khi trộn thư.
- `454b75fd` — giữ Pulse sau khi COM chứng minh preset được lưu; sửa kiểm tra mapping.

## Kiểm tra

- `slides-q18-verification.desktop.mjs`: PASS 17/17; mở lại 8 trang. Bố cục sai khác như nêu trên; preview 7 trang.
- `slides-q18-com-readback.ps1`: PASS đọc PPTX 8 trang; layout `Standard` trên 8 trang; hiệu ứng trang 5 gồm `EffectType=75` và `10`.
- `slides-pulse-effect.desktop.mjs`: PASS 2/2; PowerPoint COM đọc `EffectType=75`.
- `q20-writer-mailmerge-confirm.desktop.mjs`: PASS 5/5.
- `node tests/run-tests.js`: PASS 3772/3772.
- `node scripts/audit-0610/i18n_parity.mjs`: VI=3112, EN=3112, thiếu 0.
- Ba bộ sinh checklist đã chạy. `verify_checklist_evidence.py --all --no-fix`: PASS, 0 dòng bị hạ.
- `python -m pytest tests -q -k "slides or pptx or writer"`: PASS 463, bỏ qua 640.
- Không đổi `command-definitions.js`; không có build system thay đổi.

## Phạm vi còn mở

Q20 hoàn tất xác minh Pulse và sửa luồng trộn thư theo phương án đổi nhãn/xác nhận. Tên CustomLayout sau round-trip và chế độ in handout 3-up chưa được sửa; không tuyên bố hai mục đó PASS. Cần ticket tiếp theo riêng cho package layout OOXML và pipeline PDF handout.
