# Kế hoạch payload v3: gửi metadata ô riêng, không dán vào XML từng ô

Cập nhật: 06/10/2026 · Trạng thái: **kế hoạch + phân tích xong, chưa viết mã** · Cơ sở: `docs/perf-measure/payload-v3-consumers.md` (Codex kiểm kê consumer), `docs/perf-measure/payload-v3-libreoffice-analysis.md` (Codex đọc mã LibreOffice), số đo trong `docs/SPEC-PERF-OPEN.md` mục 6.1f.

## 0. Kết luận sau khi phân tích kỹ hơn (06/10, cùng ngày) — **khuyến nghị: KHÔNG làm v3**
Bộ chuẩn G2 (S0) đã dựng xong và xác định được (băm mô hình JS của 28 file, chạy 2 lần cho kết quả giống nhau: `scripts/perf-proto/payload_dump.py`, `payload_model_hash.mjs`). Nhưng khi đối chiếu thứ tự các bước thì thấy v3 **không thể chứng minh giống hệt v2 với chi phí hợp lý**:
- Overlay hiện **tách** run ô lặp thành ô đơn ở mọi ô có metadata (vì mỗi ô được dán thuộc tính riêng), rồi `optimize` **gộp lại** các ô chỉ-có-kiểu cùng `style-name` (giữ thuộc tính của ô đầu run) và **cắt** đuôi ô rỗng theo `keep_count` (nhánh `repeat > 64` chỉ chạy khi run còn nguyên, không chạy khi run đã bị tách thành ô đơn).
- Bỏ dán ở overlay nghĩa là run không còn bị tách trước `optimize` ⇒ cấu trúc FODS sau `optimize` khác v2 (số ô đuôi giữ lại có thể lệch 1–65 ô ở vùng đuôi rỗng có kiểu; thuộc tính `number-format` của các ô gộp lệch nếu mã khác nhau trong cùng run). Hai điều này ảnh hưởng vùng dùng (used range) và định dạng ô rỗng — đúng loại sai lệch không thấy ngay nhưng làm lệch tệp lưu ra.
- Muốn giống hệt phải mô phỏng đúng thuật toán tách/gộp/cắt trong JS hoặc bắt `optimize` biết toạ độ metadata: thêm một bản sao thuật toán nhạy cảm, rủi ro cao hơn lợi ích 4–6 s (≈ 8–10% của một file cực lớn nằm ngoài chế độ xem nhanh).
**Phương án giữ nguyên kết quả từng byte** (không đổi định dạng payload, không đổi JS): gộp overlay → optimize → payload thành **một lượt worker trên từng chunk** (cùng phép biến đổi, cùng thứ tự, chỉ bỏ hai vòng gửi/nhận chuỗi lớn). Kiểm bằng băm byte của `final_fods` + payload (cổng đã có, 28/28). Ước tính tiết kiệm ≈ 3 s trên lan14. Chưa làm; cần chủ sở hữu quyết định có đáng không.

## 1. Mục tiêu và lợi ích dự kiến
Hiện overlay dán `vno:number-format`, `vno:original-string`, `vno:xf` vào từng thẻ ô (≈ 5 s pool trên lan14), rồi bước payload gỡ `vno:xf` và dán lại ở toạ độ cuối. Mục tiêu: bỏ hai lượt dán đó, gửi metadata dạng **bảng phụ theo toạ độ** (sidecar). Ước tính tiết kiệm ròng 4–6 s trên lan14 (JS phải tra bảng, +1–2 s); chưa đo. Mọi file nhỏ gần như không đổi.

## 2. LibreOffice làm thế nào (đọc mã nguồn, `core-master`)
- Import xlsx: `s` của ô vào `CellModel.mnXfId`, chỉ dùng để gom vùng theo XF rồi áp thuộc tính (`sheetdatacontext.cxx:371`, `sheetdatabuffer.cxx:721-768`). Mô hình ô lưu **đoạn thuộc tính theo cột/hàng** (`ScAttrArray` → `ScPatternAttr`), **không giữ XF gốc** (`attarray.cxx:181-269`, `patattr.hxx:126-154`).
- FODS export gộp ô kề nhau thành run `number-columns-repeated` theo kiểu tự động + giá trị, không theo XF (`xmlexprt.cxx:2986-4018`); mã format nằm trong `office:automatic-styles` qua `style:data-style-name` (`xmlstyle.cxx:652-670`).
- Hệ quả: (a) định dạng *hiện hành* lấy được từ FODS/UNO mà không cần xlsx; (b) **XF gốc và chuỗi gốc chỉ có trong xlsx** nên ta vẫn phải tự đọc xlsx (đã làm, `_xlsx_cells_with_metadata_p1`, prefetch chạy ẩn trong lúc LibreOffice chuyển đổi). Bài học áp dụng từ LibreOffice: giữ thông tin theo **run**, không theo ô.
- Khuyến nghị: **không** thay mô hình bằng truy vấn UNO (`getCellFormatRanges`…): đổi nguồn sự thật, không có XF gốc, rủi ro cao. Chỉ dùng ý tưởng run.

## 3. Ai đọc/ghi 3 thuộc tính (kiểm kê Codex, đã kiểm lại)
- JS đọc tại một điểm: `sheet-adapter.js:_cellFromFodsAttributes` (3814-3868) → đưa vào model (`item.val`, `style.numberFormat`, `style.origXf`); thêm hai nhánh rich text (4525-4538, 4809-4815, `sheet-payload-parser.js:697-709`) và hai kiểm tra ô rỗng (3721, 3757).
- **Đường lưu không đọc dấu trong XML mở file**: lưu đi từ model → `serializeToFods` ghi lại `vno:xf`/`vno:number-format` từ `style.origXf/numberFormat` (3415-3476) → Python `_restore_original_xf_for_vno_cells`. Nếu model sau khi mở **giống hệt** thì đường lưu giống hệt.
- Python còn đọc/ghi: overlay (hai nhánh), strip + `reoverlay_sheet_xf_indices` (đường dự phòng không dùng payload), `_fods_cells_with_vno_xf` (khi lưu từ FODS do JS gửi lên).
- Điểm nhạy cảm nhất: mất `vno:xf` ⇒ lưu xlsx sai style gốc. Vì vậy cổng so khớp ở **mô hình JS** và **tệp xlsx lưu ra**, không chỉ ở payload.

## 4. Thiết kế đề xuất (an toàn nhất, đổi ít nhất)
1. **Cờ + giữ v2.** `VNO_PAYLOAD_V3=1` bật; mặc định tắt cho tới khi qua mọi cổng. `build_sheet_open_payload` v2 giữ nguyên làm đường dự phòng; lỗi dựng v3 → tự rơi về v2 (như cơ chế `_record_sheet_open_payload_failure` hiện có).
2. **Sidecar theo run, toạ độ logic cuối** (cùng không gian toạ độ mà bước payload v2 đang dán `vno:xf`, tức *sau* optimize): `cellMeta = { "<sheet>": { "<row>": [[c0, c1, xf|-1, fmtId|-1, strId|-1], ...] } }`; bảng `formats[]` (mã format, loại trùng) và `strings[]` thưa (chỉ ô chuỗi có khoảng trắng/xuống dòng/tab đặc biệt — như hiện nay). Hàng không có metadata thì không có mục.
3. **JS chèn vào bước đọc thuộc tính, không đổi logic phía sau.** Trong `rowXmlRecord`, với mỗi ô (đã biết toạ độ nhờ repeat), tra sidecar và gán `attributes["vno:xf"|"vno:number-format"|"vno:original-string"]` rồi gọi `_cellFromFodsAttributes` như cũ. Run `repeated` mà sidecar không đồng nhất thì JS tách run (đúng việc Python đang làm trước khi dán).
4. **Python:** overlay bỏ bước dán (giữ các bước phụ: kiểm tra, ẩn/hiện, in…); payload dựng sidecar từ `formats/strings/xfs` đã có trong bộ nhớ đệm; không strip, không dán lại. `final_fods` lưu trong phiên dự phòng **vẫn được dán đủ** (làm chậm, chỉ khi JS gọi lấy bản dự phòng — hiếm) để đường rơi về `parseFods` cũ không mất metadata.
5. **Không đổi:** định dạng tệp xlsx/FODS khi lưu, `serializeToFods`, `_restore_original_xf_for_vno_cells`, UI.

## 5. Cổng bắt buộc (không qua = không bật)
| # | Cổng | Cách làm |
|---|---|---|
| G1 | Sidecar Python == dấu trong XML của v2 | với 28 file: đọc `vno:*` từ `final_fods` v2 (`_fods_cells_with_vno_xf` + 2 thuộc tính còn lại) so với sidecar, ô-theo-ô |
| G2 | **Mô hình JS v3 == v2** | script node dựng model từ payload v2 và v3 của 28 file, `toPlain` so sâu (có sẵn mẫu `tests/unit/sheet-payload-p2-equivalence.test.js`) |
| G3 | **Tệp lưu ra giống nhau** | trên máy thật (CDP): mở bằng v2 và v3, lưu xlsx, so `xl/styles.xml` + thuộc tính `s`, công thức, chuỗi của từng ô (bộ so sẵn của audit 26–28 file) |
| G4 | Hồi quy | node 2770, Python Sheet 218, desktop 27, kiểm tra tay 3 file (merged, ngày giờ, rich text) |
| G5 | Đo | lan14 + lan06/lan01/lan09: thời gian từng giai đoạn, RAM đỉnh toàn app; **chỉ giữ nếu tiết kiệm ≥ 3 s ở lan14 và không tăng RAM** |

## 6. Các bước nhỏ (mỗi bước 1 commit, hoàn tác được)
- **S0 (Claude):** bộ chuẩn G2 — script tạo payload v2 cho 28 file và băm mô hình JS của từng file (`scripts/perf-proto/payload_model_hash.mjs`); lưu băm chuẩn.
- **S1 (Claude):** Python dựng sidecar + G1.
- **S2 (Codex, vé nhỏ):** JS tra sidecar trong `rowXmlRecord`/tách run + test đơn vị (ô repeated, merged/covered, rich text) — Claude duyệt bằng G2.
- **S3 (Claude):** nối cờ vào `main.py`, rơi về v2 khi lỗi; G3 trên máy thật.
- **S4:** G4 + G5 → báo chủ sở hữu quyết định bật mặc định.

## 7. Rủi ro đã nhận diện
| Rủi ro | Giảm thiểu |
|---|---|
| Toạ độ sidecar lệch với toạ độ JS (repeat, merged, covered, optimize cắt ô) | dùng cùng không gian toạ độ như payload v2; G1 + G2 trên 28 file, thêm test tổng hợp cho covered/merged |
| Lưu mất `vno:xf` | G3 so tệp xlsx lưu ra; `serializeToFods` không đổi |
| Phiên dự phòng/`parseFods` cũ không có metadata | giữ stamp đầy đủ cho `final_fods` dự phòng; test rơi về dự phòng |
| Lợi ích nhỏ hơn dự tính | G5: dừng và bỏ nhánh nếu < 3 s |
| Mac | không có mã riêng hệ điều hành; cờ mặc định tắt; ghi vào `docs/macos/SYNC-NOTES.md` khi bật |
