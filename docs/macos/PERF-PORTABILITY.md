# Tăng tốc dùng chung — những gì macOS dùng được và phải kiểm

Ngày: 05/10/2026 · Nguồn: các đợt tăng tốc 03–05/10 trên `main` (xem `docs/SPEC-PERF-OPEN.md` mục 6.1d). Nguyên tắc của `docs/SPEC-PLATFORMS-AND-BRANCHES.md`: sửa mã dùng chung ở `main` trước, macOS kéo xuống.

Cột "Đã kiểm trên macOS" luôn là **chưa**: mọi số đo dưới đây lấy trên Windows. Team mac phải đo lại cùng probe trước khi tin các con số.

| Tăng tốc | Mã nằm ở | Dùng chung? | Việc team mac cần làm |
|---|---|---|---|
| Mở Sheet: payload Python (P1), mô hình JS (P2) | `adapters/libreoffice/common/ooxml_zip_patch.py`, `adapters/libreoffice/sheet/*` | Có — Python/JS thuần | Chạy `scripts/perf-proto/compare_sheet_open_p1.py` trên 28 file LAN, kết quả phải **giống hệt** Windows |
| Chạy song song P1b (`ProcessPoolExecutor`) | `ooxml_zip_patch.py` `_p1_process_pool` | Có — đã ghim `spawn` cho mọi OS | Nếu đóng gói bằng công cụ freeze, gọi `multiprocessing.freeze_support()` ở điểm vào; kiểm pool không treo khi đóng ứng dụng |
| Doc: sửa regex bậc hai | `adapters/libreoffice/writer/writer-adapter.js` | Có — JS | Không |
| Máy chủ tĩnh backlog 128 (hết cửa sổ trắng khi khởi động) | `main.py` `_QuietTCPServer` | Có | Đo lại tỉ lệ cửa sổ trắng 60 lượt khởi động |
| Làm nóng hồ sơ LibreOffice cho Slide | `scripts/release/build-seed-profiles.py`, `main.py` `_warmup_persistent_filter` | Mã chung, **dữ liệu theo nền tảng** | Tạo hồ sơ seed riêng cho macOS (đường dẫn hồ sơ LibreOffice khác Windows) rồi đo mở Slide lần đầu |
| Xem trước khi in dùng worker LibreOffice đang chạy; đếm trang PDF trực tiếp | `main.py` (`_PRINT_CONTEXT`, `_inspect_print_pdf_pages`), `platform/print/print_pipeline.py` | Có — Python thuần | Worker kết nối UNO qua `pipe,name=` (`soffice_uno_worker.py:43,420`); LibreOffice trên Unix có hỗ trợ pipe nhưng **chưa kiểm** — nếu không dùng được thì đổi sang `socket,host=localhost` theo `docs/SPEC-MACOS-PORT.md`. Đối chiếu PDF với đường cũ bằng `VNO_PRINT_VERIFY=1` |
| Lưu file rất lớn theo từng đoạn | `main.py` (`begin_content_stage…`), `adapters/libreoffice/common/uno-bridge.js` | Có | Không |
| Xem nhanh Sheet (view-first) | `soffice_uno_worker.py` (`view_*`), `apps/sheet/sheet-quick-view.*` | Có — cờ `VNO_OPEN_VIEWFIRST`, đang tắt | Chạy `tests/live/cdp/sheet-viewfirst.desktop.mjs` tương đương trên engine mac |
| Chiều cao dòng Sheet theo chân chữ | `ooxml_zip_patch.py` `_gdi_font_descent` | **Mới dùng chung**: `adapters/libreoffice/common/font_descent_table.json` (số đo GDI dựng sẵn) | Trên macOS không có GDI nên bảng là nguồn duy nhất; font ngoài bảng (đa số font VnTime/VNI cũ) rơi về heuristic cũ — kiểm các file chứa font đó |

## Chỗ chỉ dành cho Windows (đừng sao chép sang mac)
- `main.py`: `taskkill` ở nhánh `os.name == "nt"` (nhánh khác dùng `terminate()`), tiền tố đường dẫn dài `\\?\`, `GetLocaleInfoEx`, `MessageBoxW`, `SetCurrentProcessExplicitAppUserModelID`.
- Gọi GDI trực tiếp trong `_gdi_font_descent` (chỉ còn là đường dự phòng sau bảng số đo).
- Áp dụng cập nhật bằng `adapters/updater/apply-helper.ps1`; mac cần bản `apply-helper.sh` riêng trong `ports/macos`.
- Bộ đo trong test dùng PowerShell/WMI để lấy RAM WebView2 và CDP trên WebView2; mac cần bộ đo tương đương.

## Cờ hoàn tác chung (giống Windows)
`VNO_OPEN_LEGACY=1` (Sheet mở), `VNO_PRINT_LEGACY=1` (xem trước in), `VNO_FONT_TABLE_LEGACY=1` (bảng số đo font), `VNO_OPEN_VIEWFIRST=1` (bật xem nhanh), `VNO_PERF_DEBUG=1` (in thời gian từng bước).

## Cách giữ đồng bộ
Mỗi tuần: `git merge main` vào `platform/macos`, đọc mục này và `docs/SPEC-PERF-OPEN.md` mục 6.1d, chạy lại các probe nói trên trên mac và ghi số đo vào `docs/macos/`.
