# TASK BRIEF — Sheet tăng tốc mở tệp: PHASE 2 nguyên mẫu mô hình gọn (Codex)

Worktree: `E:\VNOffice-codex-sheet-open-phase2` (nhánh `perf/sheet-open-phase2-codex`, tách từ `main`). Đặt `$env:LOCALAPPDATA = "E:\VNOffice-profiles\codex"` trước mọi lần chạy app/soffice. Chạy Codex với `-m gpt-6-luna`.

## Bối cảnh — người phụ trách ĐÃ DUYỆT `docs/PLAN-SHEET-OPEN-PERF.md` (29/9)
Số đo của bạn (lan14): Python ~112 s, bridge Python→WebView2 ~56 s cho chuỗi FODS 316 M ký tự, JS `parseFods`/`loadFromFods` ~95 s (DOM parse ~40 s + dựng model ~35 s). Claude đang làm phase 1 (bỏ tem XF thừa ở lượt overlay đầu, nhánh `perf/sheet-open-phase1-claude`) — KHÔNG đụng phần đó.

## Việc — CHỈ NGUYÊN MẪU trong `scripts/perf-proto/`, CHƯA sửa code sản phẩm
1. Viết bộ chuyển Python dạng luồng (thư viện chuẩn: `xml.etree.ElementTree.iterparse`/`xml.parsers.expat`) biến FODS CUỐI (sau overlay/optimize/reoverlay — dùng `scripts/layout-audit/_time_sheet_open_stages.py <xlsx> <out.fods>` để lấy) thành một **payload model gọn** (JSON, hoặc JSON + mảng nén) chứa ĐỦ những gì `SheetAdapter.parseFods` (`adapters/libreoffice/sheet/sheet-adapter.js`) trả về: sheets, sheetsData (val/formula/style/numberFormat/merge/comment/image/validation…), activeSheet, merged ranges, named ranges, print area, page setup, row heights/col widths, hidden rows/cols, CF, pivot… — liệt kê từ code `parseFods` + `loadFromFods`, không đoán.
2. Viết bộ nạp JS nguyên mẫu dựng lại đúng object workbook như `parseFods` từ payload đó (không DOMParser).
3. **Tiêu chí tương đương:** dùng `scripts/perf-proto/compare_parsefods_models.mjs` (Claude đã viết: so model sau `toPlain`) hoặc mở rộng nó để so model từ payload với model `parseFods` trên FODS cuối của lan11, lan12, lan28, lan06, lan14 và 4 fixture `tests/fixtures/*.fods` — phải MODEL IDENTICAL. Ghi rõ trường nào chưa làm được.
4. **Đo:** thời gian Python tạo payload, kích thước payload (MB), thời gian chuyển qua bridge WebView2 (tái dùng `scripts/perf-proto/webview_payload_probe.py`), thời gian `JSON.parse` + dựng model trong Edge/WebView2 — so với đường hiện tại (bridge 56 s + parseFods 95 s trên lan14). Mỗi phép đo 2 lượt.
5. Viết `docs/PLAN-SHEET-OPEN-PERF-PHASE2.md`: kết quả, những gì thiếu để đạt tương đương 100%, ước lượng lan14 sau phase 2, đề xuất cách tích hợp có cờ bật/tắt (mặc định tắt) + rollback — để Claude/người phụ trách duyệt trước khi sửa code sản phẩm.

## Luật cứng
KHÔNG sửa `main.py`, `adapters/**`, `apps/**`, `platform/**` ở vòng này. Không thêm dependency. Không commit tài liệu thật/FODS/JSON sinh ra. KHÔNG chạy tác vụ ở nền rồi ngồi chờ. Commit sớm findings `docs/HANDOFF-SHEET-OPEN-PHASE2-FINDINGS.md`, commit sau mỗi bước, tiền tố `perf(sheet): S33p2`. Không merge vào `main`. Handoff `docs/HANDOFF-SHEET-OPEN-PHASE2.md`, PASS/FAIL/NOT RUN/BLOCKED trung thực.