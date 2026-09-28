# TASK BRIEF — Sheet: kế hoạch tăng tốc mở file lớn (S33 — CHỈ ĐO + LẬP KẾ HOẠCH, CHƯA CODE) (Codex)

Worktree: `E:\VNOffice-codex-sheet-open-perf` (nhánh `plan/sheet-open-perf-codex`, tách từ `main`). Đặt `$env:LOCALAPPDATA = "E:\VNOffice-profiles\codex"` trước mọi lần chạy app/soffice.

## Bối cảnh — người phụ trách đã đồng ý (28/9)
VN Sheet mở file lớn chậm hơn nhiều so với ứng dụng khác. Số đo 28/9 trên `file test\lan\lan14.xlsx` (9,3 MB, 33.643 dòng):

| Ứng dụng | Thời gian mở |
|---|---|
| Excel 2016 (COM, read-only) | ~15 s |
| LibreOffice headless xlsx→fods | ~30 s |
| VN Sheet | ~210–240 s |

Người phụ trách đồng ý thay đổi kiến trúc để tăng tốc, NHƯNG theo Plan gate (AGENTS.md mục 6): **vòng này chỉ đo + viết kế hoạch để người phụ trách duyệt — KHÔNG sửa code sản phẩm.** Mục tiêu đầu: lan14 < 60 s tổng (từ lúc chọn file tới lúc lưới hiện dữ liệu), 26 file LAN vẫn tổng lệch 0.

## Những gì đã biết (đọc kỹ, không đo lại từ đầu)
- `docs/HANDOFF-SHEET-S29-PERF.md`, `-ROUND2.md` … `-ROUND5.md`, `docs/HANDOFF-SHEET-S29-REGRESSION-CHECK.md`.
- Python (`main.py` + `adapters/libreoffice/common/ooxml_zip_patch.py`, đo bằng `scripts/layout-audit/_time_sheet_open_stages.py`): tổng ~110–138 s trên lan14 — soffice convert 16–20 s, cell metadata overlay (formats+strings+XF) 30–36 s, FODS optimize 27 s, XF reoverlay 30–42 s, layout ~3–10 s. Tức Python đọc/ghi lại FODS khổng lồ nhiều lượt.
- JS (`adapters/libreoffice/sheet/sheet-adapter.js` `parseFods`, đo bằng hook `VNO_PERF_DEBUG=1` / `window.__vnoPerfDebug`): ~92–102 s — DOM parse (DOMParser trên chuỗi FODS) 38–45 s, dựng workbook model 35–49 s. Vòng 4–5 đã chứng minh tối ưu vi mô (cache, bỏ mảng trung gian) KHÔNG đo được cải thiện.
- **Số đo mới nhất (Claude, 28/9 17:20, main, `_time_sheet_open_stages.py`):** lan14.xlsx **9,74 MB** → soffice sinh FODS **257 MB** (17,7 s) → overlay metadata **31,3 s** (FODS lên 326 MB) → optimize 25,4 s → reoverlay XF 31,1 s → **chuỗi FODS cuối 316 MB** gửi sang WebView rồi `DOMParser`. Tổng Python 120,2 s. File FODS cuối đã lưu tại `E:\VNOffice-profiles\claude2\perf\lan14.fods` (KHÔNG commit) — dùng để phân tích thành phần: phần nào của 316 MB là dữ liệu JS thật sự dùng (giá trị, công thức, style dùng tới) và phần nào thừa (text:p lặp giá trị, style không dùng, ô rỗng lặp, thuộc tính vno:* dư…). Giảm kích thước chuỗi này có thể là đòn bẩy lớn nhất cho cả Python (ít lượt ghi) lẫn JS (DOM parse tỉ lệ với kích thước).
- Hiện dữ liệu đi: XLSX → soffice → FODS (XML phẳng rất lớn) → Python vá nhiều lượt → chuỗi FODS gửi sang WebView → DOMParser → model.

## Việc cần làm
1. **Đo phân rã đầy đủ 1 lần trên main hiện tại** cho lan14, lan06 và 2 file vừa (lan11, lan12): từng giai đoạn Python + từng giai đoạn JS + thời gian truyền chuỗi Python→WebView + kích thước FODS cuối (MB) + bộ nhớ đỉnh. Mọi lệnh foreground; chạy mỗi file ít nhất 2 lần, báo cả 2 số.
2. **Commit sớm** `docs/HANDOFF-SHEET-OPEN-PERF-PLAN-FINDINGS.md` với số đo trên (trước khi viết kế hoạch).
3. **Đánh giá tối thiểu 3 phương án kiến trúc**, mỗi phương án có ước lượng dựa trên số đo/nguyên mẫu nhỏ trong thư mục scratch (KHÔNG commit vào code sản phẩm), ví dụ:
   - (A) Python dựng sẵn workbook model gọn (JSON/nhị phân) bằng parser dạng luồng (`xml.etree.ElementTree.iterparse` hoặc tương đương có sẵn trong Python chuẩn) và gửi sang JS — JS bỏ DOMParser, chỉ `JSON.parse` + dựng model. Đo nguyên mẫu: thời gian iterparse FODS lan14, kích thước JSON, `JSON.parse` trong Edge/WebView2.
   - (B) Gộp các lượt vá Python (metadata overlay / optimize / reoverlay) thành một lượt luồng duy nhất trên FODS.
   - (C) Nạp theo phần: hiện sheet đang active + vùng nhìn thấy trước, phần còn lại nạp nền (lazy) — nêu rõ ảnh hưởng tới công thức liên sheet, tìm kiếm, lưu.
   - Có thể kết hợp; có thể đề xuất phương án khác nếu số đo chỉ ra.
   Ràng buộc: REUSE BEFORE REWRITE (LibreOffice vẫn là nền xử lý file); UI không gọi LibreOffice trực tiếp; không thêm dependency lớn / không dependency trả phí hay copyleft mới (chỉ thư viện chuẩn Python/trình duyệt); app phải chạy offline; không đổi ngữ nghĩa định dạng file khi lưu (đường lưu XLSX phải giữ nguyên độ trung thực hiện có).
4. **Viết kế hoạch** `docs/PLAN-SHEET-OPEN-PERF.md` theo đúng Plan gate AGENTS.md mục 6: objective, current capability, files/modules sẽ sửa, dependency, risk (đặc biệt: độ trung thực định dạng/kiểu ô/công thức/CF/validation/pivot, đường lưu, bộ nhớ), test plan (26 file LAN lệch 0 bằng `_batch_audit.py` + Excel COM; unit test snapshot `parseFods` hiện có; đo thời gian lan14/lan06/lan11/lan12 trước/sau), rollback (cờ bật/tắt để quay về đường cũ), chia thành các bước nhỏ có thể merge độc lập, ước lượng thời gian mở lan14 sau từng bước.
5. Đề xuất bước đầu tiên nên làm (lợi nhất/rủi ro thấp nhất) để người phụ trách duyệt.

## Luật cứng
KHÔNG sửa code sản phẩm (`main.py`, `adapters/**`, `apps/**`, `platform/**`) ở vòng này — nguyên mẫu đo đặt trong `scripts/perf-proto/` hoặc scratch, ghi rõ là nguyên mẫu. Không commit tài liệu thật hay file FODS/JSON sinh ra. KHÔNG chạy tác vụ ở nền, KHÔNG kết thúc lượt khi còn việc. Commit sau mỗi bước. Không merge vào `main`, không rebase/force. Handoff cuối `docs/HANDOFF-SHEET-OPEN-PERF-PLAN.md` theo mẫu `09-templates/AGENT-HANDOFF.md`, PASS/FAIL/NOT RUN/BLOCKED trung thực.
