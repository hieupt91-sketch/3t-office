# Kiểm kê consumer metadata ô FODS

Phạm vi: `vno:xf`, `vno:number-format`, `vno:original-string`; line là số dòng mã hiện tại.

| Tệp:dòng | Đọc/ghi | Thuộc tính | Dùng để làm gì | Cần thuộc tính nằm trong XML từng ô? |
|---|---|---|---|
| `adapters/libreoffice/common/ooxml_zip_patch.py:6763-6779` | Ghi | `vno:xf` | Gắn chỉ số style XF gốc vào cell FODS | Có: metadata tọa độ/cell xuất từ XLSX được ghi vào cell FODS. |
| `adapters/libreoffice/common/ooxml_zip_patch.py:6872-6939` | Đọc XLSX, ghi FODS | Cả 3 | Overlay metadata theo sheet/hàng/cột; format → chuỗi → XF | Có hiện tại: chèn vào cell target khi traverse; có thể thay bằng sidecar tọa độ. |
| `adapters/libreoffice/common/ooxml_zip_patch.py:7666-7750` | Đọc XLSX, ghi FODS | Cả 3 | Overlay P1 nhanh, ghi metadata cell từ map tọa độ (cùng setters) | Có hiện tại; có thể trả sidecar thay vì stamp XML. |
| `adapters/libreoffice/common/ooxml_zip_patch.py:7331-7353` | Ghi | Cả 3 | Worker overlay P1 ghi mã format, chuỗi gốc và XF lên cell tag | Có hiện tại; sidecar tọa độ thay thế được. |
| `adapters/libreoffice/common/ooxml_zip_patch.py:6727-6744` | Đọc/xóa | `vno:xf` | Bỏ XF đã gắn trước normalize để reoverlay tại tọa độ cuối | Có với normalize hiện tại; sidecar XF không cần strip trong XML. |
| `adapters/libreoffice/common/ooxml_zip_patch.py:7780-7786` | Đọc/xóa/ghi | `vno:xf` | Xóa XF cũ sau khi normalize, overlay lại từ XLSX ở tọa độ cuối | Có ở thiết kế hiện tại, do XML giữ nhãn XF trước khi reoverlay; có thể dùng sidecar tọa độ. |
| `adapters/libreoffice/common/ooxml_zip_patch.py:7789-7820` | Đọc | `vno:xf` | Quét tọa độ cell → XF, xử lý repeated row/column | Có ở hiện tại; thay bằng map tọa độ sẽ bỏ việc đọc cell XML. |
| `adapters/libreoffice/common/ooxml_zip_patch.py:7865-7925` | Đọc | `vno:xf` | Copy XF/style/font/fill/border/numFmt gốc, cập nhật `s` trong sheet XML XLSX | Có hiện tại vì `_fods_cells_with_vno_xf` đọc nó; không nếu truyền map tọa độ. |
| `adapters/libreoffice/common/ooxml_zip_patch.py:8104-8115` | Ghi | `vno:number-format` | Giữ mã định dạng Excel nguyên bản trên cell | Không về bản chất; tọa độ→mã format có thể cấp từ sidecar. |
| `adapters/libreoffice/common/ooxml_zip_patch.py:8118-8139` | Ghi | `vno:original-string` | Bảo toàn chuỗi gốc, khoảng trắng, tab/xuống dòng khi LO biến đổi | Không về bản chất; tọa độ→chuỗi gốc có thể cấp từ sidecar. |
| `adapters/libreoffice/sheet/sheet-adapter.js:3415-3418` | Ghi | `vno:number-format` | Serialize model numberFormat vào FODS | Không nếu serializer truy cập model/sidecar theo tọa độ. |
| `adapters/libreoffice/sheet/sheet-adapter.js:3471-3476` | Ghi | `vno:xf` | Serialize origXf khi style chưa đổi | Không nếu origXf sống trong model/sidecar theo tọa độ. |
| `adapters/libreoffice/sheet/sheet-adapter.js:3526-3544` | Đọc model, ghi cell XML | `vno:original-string` (ngữ cảnh) | Rich text lấy từ model; comment xác định metadata chuỗi là authoritative khi LO bỏ paragraph đầu rỗng | Không cần attr này để dựng richText; khôi phục chuỗi phải đọc model/sidecar. |
| `adapters/libreoffice/sheet/sheet-adapter.js:3814-3820` | Đọc | `vno:original-string` | Ưu tiên giá trị chuỗi gốc trước office:string-value | Có hiện tại để phục hồi value; sidecar theo tọa độ có thể thay. |
| `adapters/libreoffice/sheet/sheet-adapter.js:3721`, `:3757` | Đọc | `vno:original-string` | Xem cell có metadata chuỗi là nội dung hữu ích trong kiểm tra ô rỗng/used range | Có trong XML ở đây; kiểm tra có thể nhận metadata sidecar. |
| `adapters/libreoffice/sheet/sheet-adapter.js:3827-3868` | Đọc | `vno:number-format`, `vno:xf` | Parse mã định dạng thành style.numberFormat và lấy origXf vào model | Có hiện tại; thay bằng thuộc tính model từ sidecar. |
| `adapters/libreoffice/sheet/sheet-adapter.js:4308` | Đọc gián tiếp | Cả 3 | Điểm vào parseFods; parser cell lấy attributes và gọi `_cellFromFodsAttributes` | Có trong XML hiện tại; parser có thể nhận sidecar riêng. |
| `adapters/libreoffice/sheet/sheet-adapter.js:4525-4538` | Đọc | `vno:original-string` | Nhánh DOM/rich text dùng chuỗi gốc làm item.val | Có hiện tại; cần sidecar nếu bỏ XML attr. |
| `adapters/libreoffice/sheet/sheet-adapter.js:4809-4815` | Đọc | `vno:original-string` | Nhánh regex/rich text dùng chuỗi gốc làm item.val | Có hiện tại; cần sidecar nếu bỏ XML attr. |
| `adapters/libreoffice/sheet/sheet-payload-parser.js:697-709` | Đọc | `vno:original-string` | Parser compact payload phục hồi item.val cho rich text | Có trong support XML/parser hiện tại; có thể chuyển metadata vào payload map. |
| `main.py:1707-1735` | Đọc FODS, gọi consumer | Cả 3 (gián tiếp) | Save `.xlsx`: đưa source_fods vào `postprocess_sheet_xlsx` để khôi phục native style/metadata | Có vì `source_fods` là đầu vào consumer downstream hiện tại. |
| `main.py:1980-1985` | Gọi ghi | Cả 3 | Overlay metadata XLSX vào FODS lúc import (nhánh legacy) | Có: nhận FODS để stamp cell. |
| `main.py:2017-2028` | Gọi ghi | Cả 3 | Overlay P1 lúc import XLSX thành FODS | Có: nhận FODS để stamp cell. |
| `main.py:4498-4520` | Xóa/ghi gián tiếp | `vno:xf` | Sau optimize, build payload hoặc fallback reoverlay XF tọa độ cuối | Có trong đường cũ; sidecar/map tọa độ là thay thế khả thi. |
| `main.py:4545` | Xóa/ghi gián tiếp | `vno:xf` | Reoverlay XF khi không dùng compact payload | Có trong đường cũ; thay bằng sidecar tọa độ. |
| `main.py:3371-3375` (`ooxml_zip_patch.py`) | Đọc gián tiếp | `vno:xf` | Save postprocess gọi khôi phục XF cho cell có tem | Có hiện tại qua source_fods; thay bằng map sidecar. |
| `sheet-adapter.js:5433-5439` | Ghi/gửi | Cả 3 (gián tiếp) | Save gửi serializeToFods đến Python save pipeline | Có ở giao thức hiện tại vì FODS là payload; có thể truyền metadata riêng cùng FODS. |

## Tổng hợp consumer

- Python: 10 điểm chạm chính (overlay hai nhánh, worker/setters P1, strip/reoverlay, parse/restore XF); JS: 10 điểm chạm (serialize, parse attrs, used-range checks, rich text, compact parser); save/pipeline: 7 điểm gọi/điểm nối. Nhóm có thể chồng lấn, không cộng thành consumer độc lập.
- Phân biệt read trực tiếp: Python đọc `vno:xf`; JS đọc cả 3; Python tạo attrs cho cả 3. `main.py` chủ yếu điều phối.

## Đường lưu XLSX

1. Nạp XLSX: `main.py:1981` `overlay_sheet_xlsx_fods` hoặc `main.py:2024` `overlay_sheet_xlsx_fods_p1` → `ooxml_zip_patch.py:6872-6939` overlay cell attrs.
2. Parse: `sheet-adapter.js:4308` `parseFods` → `:3816-3868` `_cellFromFodsAttributes` đưa original-string/numberFormat/origXf vào `item.val`/`item.style`; rich-text override ở `:4525-4538`, `:4809-4815`; compact parser `sheet-payload-parser.js:697-709`.
3. Model → FODS: `sheet-adapter.js:2960` `serializeToFods`; ghi numFmt `:3415-3418`, XF `:3471-3476`; string được biểu diễn từ item value/rich text ở `:3526-3544` (serializer không ghi `vno:original-string` trong đoạn này).
4. Gửi và xuất: `sheet-adapter.js:5433-5439` → Python `main.py:1707-1735` → `ooxml_zip_patch.py:3369-3375` `_restore_original_xf_for_vno_cells` → `:7789-7820` đọc XF cell → `:7865-7925` cập nhật `s` trong XLSX. Khi mở tối ưu, `main.py:4500-4545` reoverlay XF sau normalize.

## Hỏng nếu bỏ attrs khỏi XML cell

- `vno:xf`: `_fods_cells_with_vno_xf` trả map rỗng/thiếu tọa độ; `_restore_original_xf_for_vno_cells` không copy XF gốc/không cập nhật `s` cho các cell đó. Nhánh normalize và compact payload mất nguồn reoverlay XF nếu không có map ngoài.
- `vno:number-format`: `_cellFromFodsAttributes` không nhận mã định dạng chính xác (đặc biệt chuỗi/ô rỗng/all cell types); style.numberFormat dựng sai hoặc mất mã Excel nguyên gốc, ảnh hưởng hiển thị và serialize.
- `vno:original-string`: cell string/rich text có thể nhận nội dung LO (`text:p`/office:string-value), làm mất chuỗi rỗng, khoảng trắng đầu/cuối hoặc newline/tab; hai parser rich text gán item.val bằng nội dung fallback.

## Cấu trúc thay thế đề xuất

Tạo sidecar `cellMetadataBySheet: Map<sheetName, Map<coord, {xf?, numberFormat?, originalString?}>>`, dùng tọa độ 1-based chuẩn (row,col) và gắn vào payload/import-session ngoài XML. Đổi các điểm: overlay `:6872-6939` trả sidecar thay stamp; `parseFods`/`sheet-payload-parser.js:697-709` tra sidecar theo coord; model giữ metadata trong item/style; `serializeToFods :3415-3476` không cần attrs; `reoverlay_sheet_xf_indices :7780-7820` và `_restore_original_xf_for_vno_cells :7865-7925` nhận map trực tiếp; `main.py:4498-4545` chuyển map xuyên normalize/compact; `main.py:1707-1735`/`sheet-adapter.js:5433-5439` truyền sidecar đến save. Phải xử lý merged/covered cell, repeated row/column, sửa style và fallback compact/session để giữ parity.
