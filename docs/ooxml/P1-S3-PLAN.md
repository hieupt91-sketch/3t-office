# KẾ HOẠCH S3 — SHEET UI ĐỌC MÀN HÌNH ĐẦU TỪ ENGINE (SAU CỜ)

> **Issue:** #18 ([PLAN][perf]) + #27 (phiếu tuần 16–20/11, mục M-3).
> **Trạng thái:** BẢN KẾ HOẠCH — chờ Windows duyệt bằng comment trên #27
> trước khi viết bất kỳ code S3 nào. Không tự triển khai khi chưa có duyệt.
> **Nhánh làm việc (sau khi duyệt):** `muse/p1-e2e-open-1011` (P1).
> **Ngày viết:** 13/11/2026 (Muse, theo phiếu #27).

## 1. Mục tiêu

Khi cờ `VNO_OOXML_ENGINE_OPEN=1` bật, Sheet UI hiện **màn hình đầu**
(100 hàng đầu của sheet đang xem) từ `ooxml-engine` thay vì chờ
LibreOffice chuyển toàn bộ workbook sang FODS. Mục đích duy nhất của S3
là **đo đầu-cuối** đường engine ở UI thật: mở gói + đọc dữ liệu +
dựng hình (`render_ms`), trên cùng bộ fixture với đường cũ. S3 không đổi
mặc định, không thay đường lưu, không gỡ FODS.

Ngưỡng đạt của S3 (đề xuất, chờ chốt ở §7):
- Có bảng số đầu-cuối cho 27 tệp XLSX bộ LAN + 2 tệp tổng hợp 1 MB /
  10 MB: `package_ms` (mở lazy), `first_screen_ms` (đọc 100 hàng đầu),
  `render_ms` (dựng hình qua CDP trên Windows), `peak_rss_kb` (engine).
- Nội dung màn hình đầu khớp đường FODS: giá trị, công thức (chuỗi công
  thức + giá trị cache), định dạng (font/fill/border/căn + numberFormat),
  ô gộp, độ rộng cột / cao hàng, freeze panes, autoFilter trong vùng nhìn
  thấy. Lệch = FAIL, không sửa expected để xanh.
- Mọi lỗi engine đều rơi về đường FODS cũ, người dùng không thấy lỗi
  engine; cờ tắt = hành vi hôm nay, từng byte.

## 2. Hiện trạng (đã kiểm chứng)

**Đường cũ (mặc định, không đổi):** `main.py`
`_open_document_dialog_impl` → `_run_soffice_convert` sang FODS →
`_apply_native_import_overlay` → `_optimize_fods_for_sheet` → nếu
`_should_use_sheet_open_payload` (cờ `SHEET_OPEN_PAYLOAD=1` hoặc FODS
> 20 MB) thì `build_sheet_open_payload` (compact v2: `rowsDeflateBase64`
+ `supportXml`) + fallback session giữ FODS đầy đủ; ngược lại trả
`content` = FODS. UI nhận `payload` (`status/sourcePath/fileName/format`
+ `sheetPayload`/`openId` hoặc `content`), parse bằng
`sheet-payload-parser.js` rồi `SheetAdapter._commitWorkbook`.

**API engine đã có (vn-main `aebdea91`, không cần sửa bridge):**
- `open` với `"lazy": true` (ENGINE-PROTOCOL §4.1b); `sheet.readRows`
  (`from`/`count` hoặc `range`, trả `cells`/`rowCount`/`lastRow`);
  `sheet.setValues` (đường vá byte, rơi về DOM khi không đủ điều kiện).
- Phía client (M-2, #27): `EngineClient.open(path, lazy=False)`,
  `read_rows(...)`, `set_values(...)`; `measure_open` báo thêm pha màn
  hình đầu. Số đo thật (M-2, engine release, VM Linux 4 CPU / 7,9 GB,
  3 lần, trung vị): tệp 10 MB (104.501 hàng) màn hình đầu 535 ms
  (434–580), RAM 78,5 MB — khớp RAM tham chiếu iOS-coord (0,30–0,46 s /
  78 MB); đọc toàn bộ 30.911 ms / 1,86 GB.

**Phương pháp đo dựng hình đã có:** `docs/ooxml/BENCH-OLD-VS-NEW-24-10.md`
— mở app thật qua WebView2 CDP (`claude-sheet-open.mjs`,
`roundtrip-file.mjs`, `batch_document_audit.py`), hồ sơ người dùng ấm,
≥ 3 lần, trung vị/min/max, `loadMs` + long task > 50 ms qua CDP
Performance. Chỉ chạy được trên Windows.

## 3. Thiết kế

### 3.1. Cờ và điểm móc

- Cờ `VNO_OOXML_ENGINE_OPEN=1` (đã có từ S1, mặc định tắt). S3 chỉ chạy
  khi cờ bật **và** `app_kind == "sheet"` **và** tệp `.xlsx` không mã hóa.
  Cờ tắt: không gọi engine, không đổi một dòng hành vi.
- Điểm móc duy nhất ở Python: trong `_open_document_dialog_impl`,
  nhánh sheet/xlsx, **trước** `_run_soffice_convert`. Thử engine path
  trong `try/except` hẹp:
  - Thành công → trả payload engine (mục 3.3), bỏ qua soffice.
  - Bất kỳ lỗi nào (`OOXMLProtocolError`, `OOXMLUnsupportedError`,
    timeout, kết quả rỗng, engine không tìm thấy) → ghi log +
    `_open_perf_log(phase="engine_open_failed")` rồi đi tiếp đường FODS
    cũ **y như hôm nay**, không đổi thông báo lỗi cho người dùng.
- Không đổi chữ ký `_open_document_dialog_impl`; không đổi đường Writer /
  Slides; không đổi `_open_sheet_quick_view_if_enabled` (preview P8 vẫn
  chạy như cũ — nó không phụ thuộc nguồn dữ liệu chính).

### 3.2. Luồng engine (S3)

1. `EngineClient.open(path, lazy=True)` → metadata sheets
   (`name`/`kind`/`state`).
2. `read_rows(handle, sheet=<sheet đang mở>, from_row=1, count=100)` →
   100 hàng đầu. Sheet đang mở = sheet được đánh dấu active trong
   `workbook.xml` (khớp quy ước FODS hiện tại); nếu không xác định được
   → sheet visible đầu tiên; nếu workbook không có sheet visible →
   fallback FODS.
3. Đọc metadata hiển thị từ **ZIP gốc bằng code Python đã có**
   (`ooxml_zip_patch` + helper prefetch): `dimension`/used range, ô gộp
   (`mergeCell`), độ rộng cột + cột ẩn, cao hàng + hàng ẩn, freeze panes,
   autoFilter, `cellXfs` (định dạng). Lý do: bridge không có lệnh đọc
   riêng cho các metadata này; đọc từ ZIP tránh thêm lệnh bridge mới
   trong S3.
4. Map engine → model UI (mục 3.3) → payload engine → UI commit qua
   `_commitWorkbook` dùng chung với đường FODS.
5. Cuộn quá hàng 100 / chuyển sheet: gọi tiếp `read_rows` theo trang
   (100 hàng/trang) qua cùng client, nối vào cùng model. S3 dùng MỘT
   nguồn dữ liệu (engine) cho cả phiên khi cờ bật; không trộn FODS và
   engine trong cùng một lần mở.
6. Sửa ô trong UI: đi qua model UI như hôm nay. Lưu: dùng luồng lưu hiện
   tại (bytes gốc + delta); S3 kiểm chứng parity lưu (mục 5) chứ không
   sửa đường lưu.

### 3.3. Mapping engine → UI (quyết định chính của bản kế hoạch)

Model đích = **intermediate workbook model mà `sheet-payload-parser.js`
trả ra** (cùng object `SheetAdapter._commitWorkbook` nhận từ đường FODS),
không phải FODS text. Python dựng model này từ:

| Nguồn | Dữ liệu UI cần | Cách lấy (S3) |
|---|---|---|
| `open` | danh sách sheet (tên/trạng thái) | bridge `open` |
| `readRows` | ô: `ref`, giá trị, `numberFormat`, `style` (index) | bridge `sheet.readRows` |
| ZIP gốc | `cellXfs` → font/fill/border/căn/numberFormat theo `style` index | Python đọc `xl/styles.xml` (dùng helper đã có) |
| ZIP gốc | ô gộp, độ rộng cột, cao hàng, freeze, autoFilter, used range | Python đọc `xl/worksheets/sheetN.xml` (dùng helper đã có) |
| ZIP gốc | chuỗi công thức của ô công thức (giá trị cache lấy từ engine) | Python đọc `<f>` trong `sheetN.xml`; nếu ô không có `<f>` thì không phải công thức |

**Đề xuất:** làm đủ bảng trên trong S3 (định dạng + công thức + metadata
đều có), vì màn hình đầu thiếu định dạng là sai nhìn thấy được, và code
đọc `styles.xml`/`sheetN.xml` đã có sẵn trong `ooxml_zip_patch` (đường
FODS làm việc tương đương). Nếu lúc làm thấy phần style vượt quá một lát
cắt, **dừng và báo trên #27** thay vì lặng lẽ ra màn hình đầu không định
dạng — phương án rơi lại là S3 v1 chỉ hiển thị giá trị + numberFormat,
ghi rõ là giới hạn v1, và định dạng theo sau ở lát riêng.

**Không làm trong S3:** dựng FODS từ engine (phương án đã cân nhắc và
loại — tốn công serialize lại đúng thứ tự XF/overlay mà đường FODS đã
làm, không thêm gì so với map trực tiếp sang model); thêm lệnh bridge
mới; đổi `_commitWorkbook` hay `sheet-payload-parser.js` ngoài một entry
point nhận model đã dựng (nếu cần).

### 3.4. Đo `render_ms` qua CDP (Windows)

- Chạy trên máy Windows (owner/Windows team), không chạy trên VM Linux:
  mở app thật qua WebView2 CDP bằng script đã có
  (`claude-sheet-open.mjs` / `batch_document_audit.py`), cờ
  `VNO_OOXML_ENGINE_OPEN=1`, hồ sơ ấm, mỗi tệp ≥ 3 lần, trung vị/min/max.
- Mốc: `render_ms` = từ lúc UI nhận payload engine đến lúc lưới vẽ xong
  màn hình đầu (khớp mốc `loadMs` của BENCH-OLD-VS-NEW; long task
  > 50 ms ghi riêng). VM Linux báo `render_ms` = NOT RUN như S1/S2.
- Đối chiếu: cùng tệp, cùng máy, đường FODS (cờ tắt) làm baseline.

## 4. Phạm vi (in / out)

**Trong S3:** Sheet/xlsx, màn hình đầu + phân trang cuộn + chuyển sheet
qua engine; cờ `VNO_OOXML_ENGINE_OPEN`; fallback FODS cho mọi lỗi;
mapping mục 3.3; đo `render_ms` qua CDP trên Windows; test fake-stdio +
parity nội dung + parity lưu trên bộ fixture mục 5.

**Ngoài S3:** Writer/Slides qua engine (lát S3-docx/pptx riêng sau);
đổi mặc định; gỡ FODS; đường lưu qua engine (`xlsx.save` — thuộc E-1
của iOS-coord, không động vào `xlsx.save`/`SheetPatcher`/`SheetRowReader`
theo phiếu #27); công thức tính lại trong UI (engine trả giá trị cache;
tính lại thuộc engine công thức M7); undo/redo, filter UI, chart,
ảnh — dùng model UI hiện tại, không thêm tính năng.

## 5. Kiểm chứng (AGENTS §8)

- Test Python fake-stdio mới: `open(lazy)` + `read_rows` phân trang +
  mapping (giá trị/công thức/style/ô gộp/metadata) + mọi lỗi engine →
  fallback; PASS kèm số thật.
- Parity nội dung: bộ 27 tệp XLSX LAN + 2 tệp tổng hợp 1 MB / 10 MB;
  so màn hình đầu engine vs FODS theo từng ô (giá trị, công thức,
  numberFormat, style index → định dạng đã map, ô gộp, cột/hàng).
  Lệch = FAIL, liệt kê từng ô lệch, không sửa expected.
- Parity lưu: cùng loạt sửa trên doc engine-load vs FODS-load, lưu bằng
  đường hiện tại, so kết quả (nội dung + byte các part không đụng).
  Không đạt → S3 chưa xong, cờ tắt là rollback.
- Đo CDP trên Windows: bảng mục 1 cho 27 tệp LAN + 2 tệp tổng hợp;
  `render_ms` thật, không suy từ số VM.
- `npm test` + `pytest` liên quan trước PR; CI `ios-ooxmlkit.yml` xanh;
  mục chưa đo ghi NOT RUN.

## 6. Tệp chạm tới (sau khi duyệt)

- `main.py` — điểm móc mục 3.1 (hẹp, trong `_open_document_dialog_impl`).
- `platform/ooxml/engine_client.py` — helper `open_first_screen`
  (mở lazy + `read_rows` 100 hàng đầu + metadata ZIP) nếu cần; không đổi
  API đã có.
- `adapters/libreoffice/sheet/` — module mapping engine → model UI
  (mới, đặt cạnh `sheet_open_payload.py`); không sửa parser FODS.
- `apps/sheet/*` (JS) — một entry point nhận model đã dựng + commit qua
  `_commitWorkbook`; không sửa logic lưới.
- `tests/test_ooxml_engine_s3_*.py` (mới) + script CDP trên Windows.
- Không đổi: `ports/ios/OOXMLKit` (bridge đã đủ lệnh); không đổi mặc
  định; không gỡ `ooxml_zip_patch.py`.

## 7. Rủi ro & rollback

- Map style sai (index → `cellXfs` lệch) → màn hình đầu sai định dạng:
  chặn bằng parity mục 5 trên 27 tệp LAN trước PR.
- Engine treo/crash giữa phiên → mọi lệnh sau lỗi → fallback FODS ở lần
  mở tiếp theo; trong phiên, UI báo lỗi mở như đường cũ (không kẹt).
- Phân trang cuộn chậm trên tệp rất lớn → đo ở mục 5; nếu chậm hơn FODS
  thì ghi rõ, không giấu.
- Rollback: `VNO_OOXML_ENGINE_OPEN=0` (hoặc gỡ biến); không có thay đổi
  mặc định nào để hoàn tác. Mọi thay đổi S3 sau cờ nên người dùng không
  bị ảnh hưởng.

## 8. Câu hỏi chờ Windows chốt (trả lời bằng comment trên #27)

1. Duyệt thiết kế mục 3 (đặc biệt mapping mục 3.3 + metadata đọc từ ZIP
   gốc thay vì thêm lệnh bridge)?
2. Ai chạy đo CDP `render_ms` trên Windows, trên máy nào, và bộ fixture
   có giữ nguyên 27 tệp LAN + 2 tệp tổng hợp không?
3. Ngưỡng đạt mục 1 có giữ không (parity từng ô + bảng số đầu-cuối), hay
   muốn nới/lùi phần nào (ví dụ: S3 v1 không cần parity lưu)?

---
*Kế hoạch này chỉ là tài liệu. Không viết code S3 khi chưa có duyệt bằng
comment trên #27.*
