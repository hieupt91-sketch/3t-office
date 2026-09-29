# Sheet Open Phase 2 — Findings ban đầu

Ngày: 29/09/2026  
Worktree/branch: `E:\VNOffice-codex-sheet-open-phase2` / `perf/sheet-open-phase2-codex`

## Phạm vi và ranh giới

Task này chỉ tạo nguyên mẫu trong `scripts/perf-proto/` và tài liệu kế hoạch/handoff. Không sửa `main.py`, `adapters/**`, `apps/**`, `platform/**`; không thêm dependency; không đưa workbook, FODS hay payload sinh ra vào Git. Không chạy nhánh phase 1 của Claude và không merge.

## Inventory lấy trực tiếp từ `SheetAdapter.parseFods` và `loadFromFods`

`parseFods` trả về một object workbook có các nhóm dữ liệu sau. Bộ nạp thử nghiệm cần khôi phục kiểu collection và giá trị sau `toPlain`, không chỉ các giá trị ô:

- Cấu trúc workbook: `sheets`, `activeSheet`, `sheetsData`. Mỗi `sheetsData[sheet]` là `Map` từ tọa độ A1 sang cell `{ val, formula, style }`, có thể thêm `externalLink` và `richText`; `style` chứa number format, visual style, rotation, XF gốc/hash.
- Dữ liệu theo sheet: `commentsBySheet`, `mergedRangesBySheet`, `namedRangesBySheet`, `printAreaBySheet`, `pageSetupBySheet`, `rowHeightsBySheet`, `colWidthsBySheet`, `userHiddenRowsBySheet`, `userHiddenColsBySheet`, `autoRowsAtImportBySheet`, `imagesBySheet`, `imagesAtOpenBySheet`, `tabColors`.
- Cấu trúc/workbook features gắn sau khi parse sheet: `namedRangesWorkbook`, `conditionalFormattingBySheet`, `dataValidationsBySheet`, `pivotTablesBySheet`, `chartsBySheet`, `pageBreaksBySheet`, `workbookProtection`, `protectionBySheet`, `freezePanesBySheet`, `sheetVisibilityBySheet`, `autoFilterBySheet`, `sparklinesBySheet`, `outlineGroupsBySheet`.
- `validationHits` là danh sách trung gian: `_attachImportedRules` dùng nó để dựng `dataValidationsBySheet` rồi xóa khỏi workbook cuối. Không được coi `validationHits` là field kết quả.
- `loadFromFods` tiêu thụ các field trên để tạo trạng thái lưới và bổ sung trạng thái lọc/freeze/ẩn sheet, tab color, page breaks và protection. Phần dựng workbook trong prototype dừng ở object trả về tương đương `parseFods`; không gọi product loader.

Đây là phạm vi model cần kiểm chứng. Các giá trị cell và thuộc tính feature sẽ được refine nếu model diff cho thấy inventory này chưa đủ.

## Hiện trạng nguyên mẫu trước khi bắt đầu

- `compare_parsefods_models.mjs` hiện chỉ so sánh hai FODS qua `parseFods`; chưa nhận payload.
- `fods_iterparse_json_probe.py` hiện phát tên sheet, hàng, cell, thuộc tính XML và text thô. Header của nó ghi rõ đây là subset, chưa giải mã model Sheet.
- `json_parse_probe.js` đo riêng JSON.parse trong Node/V8; không dựng workbook.
- `webview_payload_probe.py` đo transfer và JSON/XML parse trong WebView2; chưa dựng model payload.
- `fods_sheet_size_probe.py` đo span XML của sheet, không tạo workbook model.

Do đó chưa có bằng chứng tương đương model, hiệu năng end-to-end của đường payload, hay khả năng giảm payload đủ cho lan14.

## Baseline đã có trong `docs/PLAN-SHEET-OPEN-PERF.md`

lan14: Python 111.83–112.64 s; bridge FODS→WebView2 55.72–55.95 s; `loadFromFods` 94.55–97.13 s; FODS cuối 316.01 triệu ký tự. Prototype subset trước đó: Python stream 38.34 s, JSON 189.76 MB, bridge 37.43–38.37 s, nhưng thiếu semantics nên không dùng làm bằng chứng parity.

## Kế hoạch và điều kiện đo

1. Hoàn thành schema/model loader trong `scripts/perf-proto/`; chỉ tái sử dụng logic/thư viện có sẵn, không import prototype vào runtime.
2. Mở rộng công cụ so sánh để đối chiếu `toPlain(parseFods(FODS))` với `toPlain(loadPayload(payload))`, giới hạn diff đủ để chỉ ra path sai và chạy trên bốn fixture cùng lan11/12/28/06/14 nếu tìm thấy input corpus.
3. Đo hai foreground lượt cho từng đường đủ điều kiện: Python tạo payload + byte/MB, WebView2 bridge, JSON.parse và dựng model trong renderer. Ghi rõ các lượt không chạy và nguyên nhân; so lan14 với baseline nêu trên.
4. Không tuyên bố parity/performance khi corpus thiếu hoặc model diff còn.
5. Ghi kết quả, phần thiếu, ước lượng lan14, flag mặc định tắt và rollback trong `docs/PLAN-SHEET-OPEN-PERF-PHASE2.md`; hoàn tất `docs/HANDOFF-SHEET-OPEN-PHASE2.md` theo trạng thái test trung thực.

## Rủi ro/rollback

Rủi ro chính là khác biệt giữa XML parsing và quy tắc chuyển đổi của `parseFods`, nhất là style/XF, cell text/rich text, repeated rows/columns, layout, comments/images, rules, names, protection, print setup và chart/pivot metadata. Payload lớn có thể vẫn bị giới hạn bridge/RAM kể cả khi JSON parse nhanh hơn. Mọi prototype có thể bỏ bằng cách revert commit của prototype; product path không bị thay đổi.

## Trạng thái

- Findings inventory: ghi nhận từ source; chưa chạy model diff.
- Parity: NOT RUN.
- Payload/bridge/render timing cho model hoàn chỉnh: NOT RUN.
- LAN/fixture coverage: đang xác định vị trí input corpus; chưa claim PASS.