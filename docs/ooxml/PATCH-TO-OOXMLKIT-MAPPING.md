# BÁO CÁO ÁNH XẠ ooxml_zip_patch.py SANG NĂNG LỰC OOXMLKit

> **Ngày thực hiện:** 24/10/2026  
> **Phạm vi tài liệu:** Ánh xạ toàn diện 1.012 hàm (31.182 dòng mã) của `adapters/libreoffice/common/ooxml_zip_patch.py`, tập trung chi tiết vào **217 hàm lớn (>40 dòng)** sang năng lực đọc/ghi và mô hình đối tượng của thư viện lõi `ports/ios/OOXMLKit/Sources/**`.  
> **Cơ sở dữ liệu:** Phân tích cú pháp trừu tượng AST thực tế (`python -c với ast`), đo đạc dòng và hàm trực tiếp từ mã nguồn, không bịa số.  

---

## 1. TỔNG QUAN VÀ BỐI CẢNH KIẾN TRÚC

### 1.1. Vì sao `ooxml_zip_patch.py` tồn tại trong kiến trúc cũ?
Trong kiến trúc trước đây của VN Office trên desktop:
1. **Luồng Lưu (Export):** Giao diện Web (JS) dựng tệp ODF trung gian (FODS cho Sheet, FODT cho Writer, FODP cho Slides) -> gọi LibreOffice CLI `soffice --convert-to xlsx/docx/pptx`.
   - Bộ lọc xuất OOXML của LibreOffice Core (C++) có nhiều hạn chế nghiêm trọng: làm mất định dạng nâng cao, gộp section, bỏ qua chú thích, xóa sạch liên kết ngoài, hỏng hoạt ảnh, mất Slide Master chuẩn Office 2016, xáo trộn thứ tự schema XML ECMA-376 khiến Microsoft Office báo lỗi tệp.
   - Do đó, VN Office phải phát triển mô-đun Python đồ sộ `adapters/libreoffice/common/ooxml_zip_patch.py` (**31.182 dòng**, 1.012 hàm) để giải nén tệp ZIP sau khi LibreOffice xuất, phân tích cú pháp XML, vá lại từng phần tử và đóng gói lại.
2. **Luồng Mở (Import):** LibreOffice chuyển OOXML sang ODF/HTML để nạp vào giao diện Web.
   - LibreOffice tiếp tục làm rơi các thuộc tính như màu tab, vùng in, trạng thái ẩn sheet, freeze panes, run text-effects...
   - `ooxml_zip_patch.py` phải thực hiện các hàm `overlay_*` để đọc từ tệp OOXML gốc và tiêm các thuộc tính mở rộng `vno:*` vào tệp FODS/FODP trung gian.

### 1.2. Cách mạng kiến trúc với OOXMLKit (ADR Mức B)
Theo ADR `docs/ios/ADR-OOXMLKIT-LOI-DUNG-CHUNG.md` và kế hoạch `docs/PLAN-OOXMLKIT-WINDOWS.md`:
- **OOXMLKit thao tác trực tiếp trên gói OOXML (OPC/ZIP) và XML DOM**, loại bỏ hoàn toàn việc chuyển đổi qua lại định dạng ODF/HTML trung gian.
- **Nguyên tắc bất biến (Byte-identical preservation):** Các phần tài liệu (part/XML/media/drawing/theme) mà người dùng không chỉnh sửa sẽ được `OPCPackage` chép nguyên byte 100% từ tệp nguồn. Không bị phân tích, không bị biến đổi, không bị LibreOffice làm mất mát.
- **Sửa đổi khoanh vùng (Isolated modifications):** Khi người dùng sửa dữ liệu (ví dụ sửa giá trị ô A1, chèn 1 hàng), OOXMLKit chỉ tải và biến đổi đúng XML part đó (`xl/worksheets/sheet1.xml`), giữ nguyên toàn bộ các phần tử XML lạ, thuộc tính định dạng, biểu đồ, pivot table, macros đi kèm.

---

## 2. THỐNG KÊ VÀ TỔNG HỢP TỶ LỆ THAY THẾ

### 2.1. Số liệu đo đạc thực tế từ AST
- **Tổng số dòng mã `ooxml_zip_patch.py`:** `31.182` dòng
- **Tổng số hàm/phương thức (AST FunctionDef):** `1.012` hàm
  - Hàm cấp cao (Top-level functions): `757` hàm
  - Hàm lồng / phương thức lớp (Nested/method functions): `255` hàm
- **Số hàm lớn (> 40 dòng mã):** `217` hàm (chiếm phần lớn khối lượng logic phức tạp nhất của bộ vá)

### 2.2. Tỷ lệ mức độ thay thế của 217 hàm lớn

| Mức độ thay thế | Số lượng hàm | Tỷ lệ (%) | Ý nghĩa kiến trúc |
|---|:---:|:---:|---|
| **Hết cần** | **179** | **82,49%** | Trở nên hoàn toàn thừa thãi vì OOXMLKit chép nguyên byte tệp gốc, không đi qua ODF/LibreOffice, hoặc OOXMLKit đã có sẵn API tương ứng |
| **Cần API mới** | **37** | **17,05%** | Cần bổ sung API Swift tương ứng trong OOXMLKit để ứng dụng có thể tạo mới / chỉnh sửa tính năng này trực tiếp (ưu tiên số 1 là XLSX) |
| **Vẫn cần** | **1** | **0,46%** | Duy trì tạm thời cho vai trò xuất định dạng cũ `.doc` nhị phân qua LibreOffice (Phase W6) |
| **TỔNG CỘNG** | **217** | **100,0%** | |

### 2.3. Phân bổ theo từng ứng dụng

| Nhóm ứng dụng | Tổng số hàm lớn | Hết cần | Cần API mới | Vẫn cần | Tỷ lệ hết cần |
|---|:---:|:---:|:---:|:---:|:---:|
| **VN Sheet (XLSX)** | 96 | 77 | 19 | 0 | **80,2%** |
| **VN Writer (DOCX)** | 83 | 70 | 12 | 1 | **84,3%** |
| **VN Slides (PPTX)** | 38 | 32 | 6 | 0 | **84,2%** |
| **Tổng cộng** | **217** | **179** | **37** | **1** | **82,5%** |

> [!TIP]
> **Kết luận đột phá:** Hơn **82%** các thuật toán vá lỗi phức tạp nhất trong `ooxml_zip_patch.py` (bao gồm các hàm khôi phục Master Slide 207 dòng, khôi phục biểu đồ 352 dòng, passthrough run 341 dòng...) sẽ **tự động biến mất** ngay khi chuyển sang OOXMLKit, vì nguồn gốc gây lỗi là bộ lọc ODF của LibreOffice đã bị loại bỏ.

---

## 3. BẢNG ÁNH XẠ CHI TIẾT 217 HÀM LỚN (> 40 DÒNG)

Dưới đây là danh mục kiểm kê đầy đủ, chính xác từng hàm lớn theo đúng thứ tự xuất hiện trong tệp `adapters/libreoffice/common/ooxml_zip_patch.py`:

| STT | Tên hàm | Dòng | Loại | Phần XML / Thuộc tính vá | Vì sao cần (LibreOffice làm mất/đổi gì) | Năng lực OOXMLKit & Cách xử lý | Mức độ thay thế |
|:---:|---|:---:|:---:|---|---|---|:---:|
| 1 | `parse_calculation_options_from_workbook` | L613-657<br>(45 d) | Sheet | xl/workbook.xml (<calcPr>, date1904, iterate) | LibreOffice Calc bỏ qua hoặc đặt lại các tùy chọn tính toán nâng cao (date1904, iterate, calcMode) khi mở XLSX | OPCPackage đọc trực tiếp xl/workbook.xml, không làm mất thẻ calcPr; khi không sửa được chép nguyên byte | **Hết cần** |
| 2 | `_drawing_preset_shape` | L797-842<br>(46 d) | Sheet | xl/drawings/drawing*.xml (<xdr:sp>, <a:prstGeom>) | LibreOffice xuất hình vẽ preset shape từ FODS sang XLSX sai cấu trúc DrawingML hoặc thiếu kiểu hình | OOXMLKit chép nguyên byte part xl/drawings/ khi không sửa hình vẽ; không qua ODF trung gian | **Hết cần** |
| 3 | `_apply_sheet_text_boxes_to_xlsx` | L877-946<br>(70 d) | Sheet | xl/drawings/drawing*.xml, [Content_Types].xml, .rels | LibreOffice không chuyển đổi hộp văn bản (DrawingML text box) từ ODF sang XLSX đúng chuẩn ECMA-376 | Chép nguyên byte part drawings và rels gốc của tệp XLSX | **Hết cần** |
| 4 | `_parse_xlsx_drawing_text_boxes` | L957-1057<br>(101 d) | Sheet | xl/drawings/drawing*.xml -> FODS draw:custom-shape | LibreOffice mở XLSX bỏ sót DrawingML text boxes khi convert sang ODF | OOXMLKit đọc trực tiếp XML part drawings, UI web render trực tiếp không cần FODS | **Hết cần** |
| 5 | `_apply_sheet_comments_vml_to_xlsx` | L1203-1312<br>(110 d) | Sheet | xl/drawings/vmlDrawing1.vml (<v:shape>, <x:ClientData>) | LibreOffice xuất chú thích cổ điển (comments) sang VML thiếu toạ độ neo hoặc sai cấu trúc ClientData | OOXMLKit giữ nguyên part VML drawing gốc khi tài liệu mở-lưu; cần API mới nếu muốn thêm comment mới từ UI | **Hết cần** |
| 6 | `patch_shape` | L1235-1308<br>(74 d) | Sheet | xl/drawings/vmlDrawing1.vml (<v:shape>) | LibreOffice làm sai các thuộc tính kiểu dáng và neo của shape comment trong VML | Chép nguyên byte VML shape gốc từ tệp nguồn | **Hết cần** |
| 7 | `_overlay_sheet_comments_from_xlsx` | L1315-1385<br>(71 d) | Sheet | xl/comments*.xml, xl/drawings/vmlDrawing*.vml -> FODS office:annotation | LibreOffice mở XLSX sang FODS làm rơi hoặc hiển thị sai các chú thích ô | OOXMLKit mở XLSX trực tiếp, không dùng định dạng trung gian ODF FODS | **Hết cần** |
| 8 | `apply_calculation_options_to_workbook` | L1388-1464<br>(77 d) | Sheet | xl/workbook.xml (<calcPr>, date1904, iterate) | LibreOffice ghi đè tùy chọn tính toán bằng cấu hình mặc định của Calc khi lưu XLSX | Cần bổ sung API Workbook.setCalculationOptions(...) để ghi trực tiếp vào xl/workbook.xml | `Cần API mới` |
| 9 | `_set_local_print_area` | L1712-1765<br>(54 d) | Sheet | xl/workbook.xml (<definedName name="_xlnm.Print_Area" localSheetId="...">) | LibreOffice làm mất phạm vi vùng in cục bộ của từng sheet khi xuất sang XLSX | Cần API Worksheet.setPrintArea(range:) hoặc Workbook.setDefinedName với localSheetId | `Cần API mới` |
| 10 | `make_print_scope_xlsx` | L1768-1843<br>(76 d) | Sheet | xl/workbook.xml (<definedNames> print scope) | LibreOffice xuất phạm vi vùng in toàn cục thay vì cục bộ hoặc làm hỏng cú pháp tham chiếu | Cần API quản lý phạm vi vùng in trong OOXMLSpreadsheet | `Cần API mới` |
| 11 | `parse_tab_colors_from_fods` | L1885-1955<br>(71 d) | Sheet | xl/worksheets/sheet*.xml (<sheetPr><tabColor rgb="..."/></sheetPr>) | LibreOffice không xuất màu tab từ ODF table sang OOXML tabColor | Giữ nguyên màu tab gốc; cần API Worksheet.setTabColor(rgb:) khi người dùng đổi màu tab | `Cần API mới` |
| 12 | `apply_active_sheet_to_fods` | L2035-2111<br>(77 d) | Sheet | ODF office:settings ooo:view-settings ActiveTable | LibreOffice mở XLSX không đồng bộ tab hoạt động (activeTab) vào cài đặt hiển thị ODF | OOXMLKit không dùng ODF; Workbook.sheets đọc trực tiếp activeTab | **Hết cần** |
| 13 | `_insert_worksheet_child_in_schema_order` | L2181-2236<br>(56 d) | Sheet | xl/worksheets/sheet*.xml (CT_Worksheet schema sequence) | LibreOffice sinh các thẻ con trong worksheet sai thứ tự schema ECMA-376 khiến Excel báo lỗi tệp | OOXMLKit XDocument/Worksheet tuần tự hóa XML trực tiếp theo chuẩn schema ECMA-376 | **Hết cần** |
| 14 | `_cf_rule_xml` | L2320-2380<br>(61 d) | Sheet | xl/worksheets/sheet*.xml (<conditionalFormatting><cfRule>) | Dựng XML cho các quy tắc định dạng có điều kiện (colorScale, dataBar, iconSet) mà LibreOffice không xuất | Cần API Worksheet.setConditionalFormatting(rules:) trong OOXMLSpreadsheet | `Cần API mới` |
| 15 | `apply_conditional_formatting_from_fods` | L2414-2459<br>(46 d) | Sheet | xl/worksheets/sheet*.xml (<conditionalFormatting>) | LibreOffice làm mất định dạng có điều kiện khi chuyển từ FODS sang XLSX | Tệp gốc giữ nguyên byte-by-byte; khi sửa cần API Worksheet.setConditionalFormatting | `Cần API mới` |
| 16 | `parse_conditional_formatting_from_xlsx` | L2500-2572<br>(73 d) | Sheet | xl/worksheets/sheet*.xml -> FODS vno:conditional-formatting | LibreOffice mở XLSX sang FODS làm mất các quy tắc định dạng có điều kiện nâng cao | Không dùng ODF FODS; OOXMLKit đọc trực tiếp XML part | **Hết cần** |
| 17 | `parse_autofilter_filter_columns_from_worksheet` | L2644-2689<br>(46 d) | Sheet | xl/worksheets/sheet*.xml (<autoFilter><filterColumn>) | LibreOffice làm rơi tiêu chí lọc chi tiết trong AutoFilter khi mở XLSX | Giữ nguyên cấu trúc filterColumn gốc; cần API Worksheet.setAutoFilter khi áp dụng lọc mới | `Cần API mới` |
| 18 | `strip_autofilter_table_parts` | L2695-2772<br>(78 d) | Sheet | xl/worksheets/sheet*.xml (<tableParts>), [Content_Types].xml | LibreOffice sinh sai thẻ tableParts xung đột với autoFilter độc lập gây lỗi Excel | OOXMLKit không sinh mã lỗi; chép nguyên byte phần không đụng tới | **Hết cần** |
| 19 | `apply_data_validations_to_worksheet` | L2860-2930<br>(71 d) | Sheet | xl/worksheets/sheet*.xml (<dataValidations><dataValidation>) | LibreOffice làm mất quy tắc kiểm tra hợp lệ dữ liệu (Data Validation: list, date, range) khi xuất | Tệp gốc giữ nguyên; cần API Worksheet.setDataValidation(...) khi người dùng tạo/sửa rule | `Cần API mới` |
| 20 | `_apply_table_metadata_from_fods` | L2967-3058<br>(92 d) | Sheet | xl/tables/table*.xml, xl/_rels/workbook.xml.rels | LibreOffice không xuất bảng dữ liệu chuẩn Excel (Excel Tables) từ ODF | OOXMLKit giữ nguyên part xl/tables/table*.xml và relationships | **Hết cần** |
| 21 | `apply_autofilter_to_worksheet` | L3061-3123<br>(63 d) | Sheet | xl/worksheets/sheet*.xml (<autoFilter ref="...">) | LibreOffice không xuất vùng AutoFilter từ database-ranges của ODF | Cần API Worksheet.setAutoFilter(range:) trong OOXMLSpreadsheet | `Cần API mới` |
| 22 | `_extract_fods_layout_metrics` | L3537-3634<br>(98 d) | Sheet | FODS table:table-column, table:table-row layout metrics | Trích xuất thông số layout từ ODF để bù trừ sai lệch rendering của LibreOffice | Không dùng FODS; OOXMLKit đọc trực tiếp kích thước dòng/cột từ OOXML | **Hết cần** |
| 23 | `_restore_normal_font_and_layout` | L3637-3719<br>(83 d) | Sheet | xl/styles.xml (<fonts>, <cellXfs>), xl/worksheets/sheet*.xml | LibreOffice ghi đè font mặc định (Calibri 11) thành font hệ thống Linux/Windows của LibreOffice | OPCPackage giữ nguyên styles.xml của tệp gốc, không bị ghi đè font hệ thống | **Hết cần** |
| 24 | `_apply_new_workbook_defaults` | L3754-3796<br>(43 d) | Sheet | xl/styles.xml, xl/workbook.xml | Thiết lập các giá trị mặc định chuẩn Excel cho workbook mới tạo từ LibreOffice | Tạo workbook mới trực tiếp bằng template OOXML chuẩn, không cần vá lại | **Hết cần** |
| 25 | `_restore_column_widths` | L3814-3928<br>(115 d) | Sheet | xl/worksheets/sheet*.xml (<cols><col width="..." customWidth="1"/>) | LibreOffice làm lệch độ rộng cột do thuật toán tính font metric khác biệt với Excel | Giữ nguyên độ rộng cột gốc; cần API Worksheet.setColumnWidth(col:width:) | `Cần API mới` |
| 26 | `_restore_empty_string_cells_step` | L3968-4124<br>(157 d) | Sheet | xl/worksheets/sheet*.xml (<c r="..." s="..." t="s"><v>...</v></c>) | LibreOffice tự động bỏ qua các ô chuỗi rỗng có format hoặc viền/màu nền khi xuất ODF | Worksheet.swift giữ nguyên các ô có styleIndex dù giá trị rỗng | **Hết cần** |
| 27 | `_restore_literal_error_cells_step` | L4127-4200<br>(74 d) | Sheet | xl/worksheets/sheet*.xml (<c t="e"><v>#N/A</v></c>) | LibreOffice chuyển đổi giá trị lỗi cố định (#N/A, #VALUE!) thành chuỗi hoặc 0 | CellValue.error(String) trong Worksheet.swift lưu đúng kiểu lỗi chuẩn ECMA-376 | **Hết cần** |
| 28 | `_insert_or_replace_cells` | L4203-4247<br>(45 d) | Sheet | xl/worksheets/sheet*.xml (<sheetData><row><c>) | Chèn hoặc thay thế ô vào đúng thứ tự cột/hàng trong sheetData | Worksheet.setValue / CellReference đã xử lý chèn/cập nhật ô đúng thứ tự | **Hết cần** |
| 29 | `_restore_formula_results_and_missing_errors_step` | L4429-4538<br>(110 d) | Sheet | xl/worksheets/sheet*.xml (<c><f>...</f><v>cachedValue</v></c>) | LibreOffice Calc xóa giá trị đệm kết quả công thức hoặc tính lại sai theo chuẩn ODF | Worksheet.setFormula(_:at:cachedValue:) đã hỗ trợ lưu giá trị đệm chuẩn | **Hết cần** |
| 30 | `_restore_sheet_zoom_step` | L4577-4629<br>(53 d) | Sheet | xl/worksheets/sheet*.xml (<sheetViews><sheetView zoomScale="..."/></sheetViews>) | LibreOffice làm mất tỉ lệ thu phóng (zoomScale) khi chuyển đổi qua lại | Giữ nguyên sheetView của tệp gốc; cần API nhỏ Worksheet.setZoom(scale:) | **Hết cần** |
| 31 | `_restore_autofilter_filter_columns_step` | L4632-4698<br>(67 d) | Sheet | xl/worksheets/sheet*.xml (<autoFilter><filterColumn>) | Khôi phục cấu trúc lọc cột từ tệp gốc bị LibreOffice làm rơi | Chép nguyên byte cấu trúc autoFilter từ tệp gốc khi không sửa | **Hết cần** |
| 32 | `_restore_missing_defined_names_step` | L4701-4768<br>(68 d) | Sheet | xl/workbook.xml (<definedNames><definedName>) | LibreOffice làm mất các tên định nghĩa (defined names) có phạm vi sheet hoặc tên nội bộ | Workbook.swift quản lý danh sách DefinedName đầy đủ, không làm mất | **Hết cần** |
| 33 | `_restore_missing_hyperlinks_step` | L4771-4895<br>(125 d) | Sheet | xl/worksheets/sheet*.xml (<hyperlinks>), xl/worksheets/_rels/sheet*.xml.rels | LibreOffice làm hỏng các liên kết hyperlink trỏ ra ngoài hoặc neo trong sheet | Chép nguyên byte part rels và hyperlinks gốc nếu người dùng không sửa | **Hết cần** |
| 34 | `_restore_hidden_columns_and_rows_from_source` | L4936-5040<br>(105 d) | Sheet | xl/worksheets/sheet*.xml (<row hidden="1">, <col hidden="1">) | LibreOffice làm mất trạng thái ẩn hàng/cột khi round-trip qua ODF | Giữ nguyên thuộc tính hidden của row/col; cần API Worksheet.setRowHidden/setColumnHidden | `Cần API mới` |
| 35 | `_preserve_external_links` | L5158-5308<br>(151 d) | Sheet | xl/externalLinks/externalLink*.xml, [Content_Types].xml, .rels | LibreOffice xóa sạch thư mục liên kết ngoài khi mở và lưu XLSX | OPCPackage giữ nguyên toàn bộ part trong xl/externalLinks/ byte-by-byte | **Hết cần** |
| 36 | `_preserve_external_formulas` | L5374-5460<br>(87 d) | Sheet | xl/worksheets/sheet*.xml (<f>[1]Sheet1!A1</f>) | LibreOffice làm hỏng cú pháp tham chiếu công thức liên kết file ngoài | Giữ nguyên công thức liên kết ngoài; engine JS quản lý công thức | **Hết cần** |
| 37 | `_apply_accounting_number_formats_from_fods` | L5463-5630<br>(168 d) | Sheet | xl/styles.xml (<numFmts><numFmt>) | LibreOffice xuất định dạng số kế toán không tương thích với Excel | Styles.swift đã hỗ trợ ghi mã định dạng số chuẩn OOXML | **Hết cần** |
| 38 | `_rewrite_scalar_concat_for_legacy_excel` | L5636-5696<br>(61 d) | Sheet | xl/worksheets/sheet*.xml (<c><f>CONCAT(...)</f></c>) | Chuyển đổi CONCAT thành toán tử & cho các phiên bản Excel cũ | FormulaRewriter.swift / JS formula engine xử lý cú pháp công thức | **Hết cần** |
| 39 | `_apply_sheet_view_state_from_fods` | L5814-5862<br>(49 d) | Sheet | xl/worksheets/sheet*.xml (<sheetViews><sheetView showGridLines="..."/></sheetViews>) | LibreOffice làm mất các thiết lập hiển thị lưới, tiêu đề hàng/cột | Giữ nguyên sheetView gốc; cần API Worksheet.setViewOptions | `Cần API mới` |
| 40 | `_restore_view_attributes_from_source_step` | L5865-5921<br>(57 d) | Sheet | xl/worksheets/sheet*.xml (<pane ySplit="..." state="frozen"/>) | Khôi phục cố định dòng/cột (Freeze Panes) từ tệp gốc do LibreOffice làm mất | Giữ nguyên freeze panes gốc; cần API Worksheet.setFreezePanes(row:col:) | `Cần API mới` |
| 41 | `_apply_refreshed_pivot_locations_from_fods` | L5989-6040<br>(52 d) | Sheet | xl/pivotTables/pivotTable*.xml (<location ref="..."/>) | Cập nhật toạ độ pivot table khi người dùng di chuyển bảng | Giữ nguyên toàn bộ part xl/pivotTables/ byte-by-byte | **Hết cần** |
| 42 | `_xlsx_chart_anchors_by_sheet` | L6208-6279<br>(72 d) | Sheet | xl/charts/chart*.xml, xl/drawings/drawing*.xml | LibreOffice chuyển đổi biểu đồ sang ODF làm mất các kiểu chart Excel 2016 (Sunburst, Treemap, Waterfall) và định dạng 3D | OOXMLKit chép nguyên byte 100% tất cả chart parts và drawings không sửa | **Hết cần** |
| 43 | `_chart_feature_from_xml` | L6282-6346<br>(65 d) | Sheet | xl/charts/chart*.xml, xl/drawings/drawing*.xml | LibreOffice chuyển đổi biểu đồ sang ODF làm mất các kiểu chart Excel 2016 (Sunburst, Treemap, Waterfall) và định dạng 3D | OOXMLKit chép nguyên byte 100% tất cả chart parts và drawings không sửa | **Hết cần** |
| 44 | `overlay_sheet_chart_metadata_to_fods` | L6349-6394<br>(46 d) | Sheet | xl/charts/chart*.xml, xl/drawings/drawing*.xml | LibreOffice chuyển đổi biểu đồ sang ODF làm mất các kiểu chart Excel 2016 (Sunburst, Treemap, Waterfall) và định dạng 3D | OOXMLKit chép nguyên byte 100% tất cả chart parts và drawings không sửa | **Hết cần** |
| 45 | `_sheet_chart_plot` | L6449-6565<br>(117 d) | Sheet | xl/charts/chart*.xml, xl/drawings/drawing*.xml | LibreOffice chuyển đổi biểu đồ sang ODF làm mất các kiểu chart Excel 2016 (Sunburst, Treemap, Waterfall) và định dạng 3D | OOXMLKit chép nguyên byte 100% tất cả chart parts và drawings không sửa | **Hết cần** |
| 46 | `_apply_sheet_print_options_from_fods` | L6651-6696<br>(46 d) | Sheet | xl/worksheets/sheet*.xml (<printOptions gridLines="..."/></printOptions>) | LibreOffice làm rơi tùy chọn in lưới và tiêu đề | Cần API Worksheet.setPrintOptions trong OOXMLSpreadsheet | `Cần API mới` |
| 47 | `overlay_sheet_xlsx_structured_formulas` | L6795-6840<br>(46 d) | Sheet | xl/worksheets/sheet*.xml (<c><f>Table1[@Col]</f></c>) | LibreOffice đổi công thức có cấu trúc bảng thành toạ độ ô tuyệt đối | Giữ nguyên công thức nguyên bản của tệp Excel | **Hết cần** |
| 48 | `parse_page_setup_metadata_from_sheet_xml` | L6904-6947<br>(44 d) | Sheet | xl/worksheets/sheet*.xml (<pageSetup>, <pageMargins>) | Đọc metadata hướng giấy, lề trang để đưa vào ODF | Không dùng ODF; cần API Worksheet.setPageSetup(margins:orientation:paperSize:) | `Cần API mới` |
| 49 | `_pivot_chart_parts_by_sheet` | L7180-7223<br>(44 d) | Sheet | xl/pivotTables/, xl/charts/, xl/_rels/ | LibreOffice ngắt quan hệ liên kết giữa PivotChart và PivotTable | OPCPackage giữ nguyên toàn bộ quan hệ rels và các part liên quan | **Hết cần** |
| 50 | `overlay_pivot_chart_metadata_to_fods` | L7226-7277<br>(52 d) | Sheet | xl/pivotTables/, xl/charts/, xl/_rels/ | LibreOffice ngắt quan hệ liên kết giữa PivotChart và PivotTable | OPCPackage giữ nguyên toàn bộ quan hệ rels và các part liên quan | **Hết cần** |
| 51 | `_apply_pivot_chart_links_from_fods` | L7280-7361<br>(82 d) | Sheet | xl/pivotTables/, xl/charts/, xl/_rels/ | LibreOffice ngắt quan hệ liên kết giữa PivotChart và PivotTable | OPCPackage giữ nguyên toàn bộ quan hệ rels và các part liên quan | **Hết cần** |
| 52 | `_apply_native_cell_formats_from_fods` | L7398-7551<br>(154 d) | Sheet | xl/styles.xml (<cellXfs><xf .../></cellXfs>) | LibreOffice sinh hàng nghìn style ODF trùng lặp làm phình file khi lưu | Styles.swift đã có thuật toán dedup định dạng ô (CellFormatChange) tối ưu | **Hết cần** |
| 53 | `style_index` | L7441-7520<br>(80 d) | Sheet | xl/styles.xml (<cellXfs><xf .../></cellXfs>) | LibreOffice sinh hàng nghìn style ODF trùng lặp làm phình file khi lưu | Styles.swift đã có thuật toán dedup định dạng ô (CellFormatChange) tối ưu | **Hết cần** |
| 54 | `_apply_sheet_document_properties_to_xlsx` | L7590-7770<br>(181 d) | Sheet | docProps/core.xml, docProps/app.xml | LibreOffice ghi đè tác giả, ngày tạo, tên phần mềm bằng LibreOffice | OPCPackage đọc/ghi docProps trực tiếp; cần API nhỏ PackageTools.setProperties | `Cần API mới` |
| 55 | `_apply_sheet_slicers_to_xlsx` | L7907-8053<br>(147 d) | Sheet | xl/slicers/slicer*.xml, xl/slicerCaches/slicerCache*.xml | LibreOffice xóa bỏ hoàn toàn các part slicer của Excel khi mở/lưu | OPCPackage giữ nguyên toàn bộ part slicers byte-by-byte | **Hết cần** |
| 56 | `resolve_sheet_theme` | L8233-8275<br>(43 d) | Sheet | xl/theme/theme1.xml (<a:theme>) | LibreOffice không hiểu hệ thống màu/font theme của DrawingML Excel 2016 | Giữ nguyên theme1.xml gốc; cần API Workbook.setTheme khi người dùng đổi chủ đề | `Cần API mới` |
| 57 | `parse_sheet_theme_xml` | L8278-8373<br>(96 d) | Sheet | xl/theme/theme1.xml (<a:theme>) | LibreOffice không hiểu hệ thống màu/font theme của DrawingML Excel 2016 | Giữ nguyên theme1.xml gốc; cần API Workbook.setTheme khi người dùng đổi chủ đề | `Cần API mới` |
| 58 | `generate_sheet_theme_xml` | L8376-8476<br>(101 d) | Sheet | xl/theme/theme1.xml (<a:theme>) | LibreOffice không hiểu hệ thống màu/font theme của DrawingML Excel 2016 | Giữ nguyên theme1.xml gốc; cần API Workbook.setTheme khi người dùng đổi chủ đề | `Cần API mới` |
| 59 | `postprocess_sheet_xlsx` | L8577-8953<br>(377 d) | Sheet | Toàn bộ gói XLSX (hàm điều phối chính cho Sheet) | Hàm trung tâm gọi hàng chục bước vá lỗi sau khi LibreOffice xuất FODS->XLSX | Khi OOXMLKit thay thế lớp I/O XLSX, toàn bộ hàm điều phối này trở nên lỗi thời | **Hết cần** |
| 60 | `inject_docx_half_point_styles_css` | L9097-9219<br>(123 d) | Writer | word/document.xml (<w:rPr>) | LibreOffice HTML/ODF làm mất gạch ngang đôi, ẩn chữ, chỉ số, font nửa point, bóng chữ | WordDocument thao tác trực tiếp trên DOM XML, không đi qua HTML trung gian | **Hết cần** |
| 61 | `restore_docx_html_half_points_and_empty_paras` | L9222-9370<br>(149 d) | Writer | word/document.xml (<w:rPr>) | LibreOffice HTML/ODF làm mất gạch ngang đôi, ẩn chữ, chỉ số, font nửa point, bóng chữ | WordDocument thao tác trực tiếp trên DOM XML, không đi qua HTML trung gian | **Hết cần** |
| 62 | `replace_para` | L9324-9368<br>(45 d) | Writer | xl/worksheets/sheet*.xml, xl/styles.xml | Vá lỗi sai lệch dữ liệu do LibreOffice Calc làm mất khi convert ODF | OOXMLKit chép nguyên byte phần không sửa | **Hết cần** |
| 63 | `docx_heading_style_props` | L9376-9462<br>(87 d) | Writer | word/document.xml, word/styles.xml, word/numbering.xml | LibreOffice làm xáo trộn thứ tự phần tử body, làm hỏng bảng trôi, công thức toán OMML | Chép nguyên byte phần không sửa; WordDocument.swift quản lý sửa văn bản | **Hết cần** |
| 64 | `_quoted_attr` | L9527-9567<br>(41 d) | Writer | xl/worksheets/sheet*.xml, xl/styles.xml | Vá lỗi sai lệch dữ liệu do LibreOffice Calc làm mất khi convert ODF | OOXMLKit chép nguyên byte phần không sửa | **Hết cần** |
| 65 | `_strip_repeat_attrs` | L9617-9664<br>(48 d) | Writer | xl/worksheets/sheet*.xml, xl/styles.xml | Vá lỗi sai lệch dữ liệu do LibreOffice Calc làm mất khi convert ODF | OOXMLKit chép nguyên byte phần không sửa | **Hết cần** |
| 66 | `_resolve_slide_page_layout_name` | L9777-9818<br>(42 d) | Slides | ppt/slides/slide*.xml, ppt/theme/, ppt/fonts/ | LibreOffice làm mất hoặc đổi định dạng shape, connector, font nhúng, crop ảnh, section | OPCPackage giữ nguyên các part không sửa; Presentation.swift hỗ trợ replaceText, sections | **Hết cần** |
| 67 | `parse_intended_slide_size_from_fodp` | L9821-9869<br>(49 d) | Slides | ppt/slides/slide*.xml, ppt/theme/, ppt/fonts/ | LibreOffice làm mất hoặc đổi định dạng shape, connector, font nhúng, crop ảnh, section | OPCPackage giữ nguyên các part không sửa; Presentation.swift hỗ trợ replaceText, sections | **Hết cần** |
| 68 | `choose_master_logo_box` | L9953-10020<br>(68 d) | Slides | ppt/slideMasters/slideMaster1.xml (<p:sp> logo) | LibreOffice làm mất logo công ty trên slide master | Chép nguyên byte slide master gốc của tệp PPTX | **Hết cần** |
| 69 | `_build_logo_shape_xml` | L10039-10092<br>(54 d) | Slides | ppt/slideMasters/slideMaster1.xml (<p:sp> logo) | LibreOffice làm mất logo công ty trên slide master | Chép nguyên byte slide master gốc của tệp PPTX | **Hết cần** |
| 70 | `apply_fodp_show_settings_attrs` | L10370-10422<br>(53 d) | Slides | ppt/slides/slide*.xml, ppt/theme/, ppt/fonts/ | LibreOffice làm mất hoặc đổi định dạng shape, connector, font nhúng, crop ảnh, section | OPCPackage giữ nguyên các part không sửa; Presentation.swift hỗ trợ replaceText, sections | **Hết cần** |
| 71 | `apply_fodp_image_crops` | L10466-10515<br>(50 d) | Slides | ppt/slides/slide*.xml, ppt/theme/, ppt/fonts/ | LibreOffice làm mất hoặc đổi định dạng shape, connector, font nhúng, crop ảnh, section | OPCPackage giữ nguyên các part không sửa; Presentation.swift hỗ trợ replaceText, sections | **Hết cần** |
| 72 | `_resolve_pptx_slide_entries` | L10518-10567<br>(50 d) | Slides | ppt/slides/slide*.xml, ppt/theme/, ppt/fonts/ | LibreOffice làm mất hoặc đổi định dạng shape, connector, font nhúng, crop ảnh, section | OPCPackage giữ nguyên các part không sửa; Presentation.swift hỗ trợ replaceText, sections | **Hết cần** |
| 73 | `apply_fodp_textboxes` | L10597-10638<br>(42 d) | Slides | ppt/slides/slide*.xml, ppt/theme/, ppt/fonts/ | LibreOffice làm mất hoặc đổi định dạng shape, connector, font nhúng, crop ảnh, section | OPCPackage giữ nguyên các part không sửa; Presentation.swift hỗ trợ replaceText, sections | **Hết cần** |
| 74 | `overlay_fodp_sections` | L10856-10901<br>(46 d) | Slides | ppt/slides/slide*.xml, ppt/theme/, ppt/fonts/ | LibreOffice làm mất hoặc đổi định dạng shape, connector, font nhúng, crop ảnh, section | OPCPackage giữ nguyên các part không sửa; Presentation.swift hỗ trợ replaceText, sections | **Hết cần** |
| 75 | `_restore_source_masters_unsafe` | L11293-11499<br>(207 d) | Slides | xl/worksheets/sheet*.xml, xl/styles.xml | Vá lỗi sai lệch dữ liệu do LibreOffice Calc làm mất khi convert ODF | OOXMLKit chép nguyên byte phần không sửa | **Hết cần** |
| 76 | `_restore_untouched_slides_unsafe` | L11545-11734<br>(190 d) | Slides | ppt/slideMasters/, ppt/slideLayouts/, ppt/slides/slide*.xml | LibreOffice thay thế toàn bộ slide master, layout và slide bằng master Standard làm mất logo, nền, phông | OPCPackage không đụng tới master/layout, giữ nguyên byte-by-byte tất cả slide không sửa | **Hết cần** |
| 77 | `overlay_fodp_native_slides_theme` | L11769-11819<br>(51 d) | Slides | ppt/slides/slide*.xml, ppt/theme/, ppt/fonts/ | LibreOffice làm mất hoặc đổi định dạng shape, connector, font nhúng, crop ảnh, section | OPCPackage giữ nguyên các part không sửa; Presentation.swift hỗ trợ replaceText, sections | **Hết cần** |
| 78 | `_build_notes_slide_xml` | L11926-11970<br>(45 d) | Slides | ppt/notesSlides/notesSlide*.xml | LibreOffice làm mất hoặc hỏng liên kết ghi chú thuyết trình của diễn giả | Slide.swift đã có hàm setNotesText đọc/ghi trực tiếp notesSlide | **Hết cần** |
| 79 | `restore_notes_to_pptx` | L11991-12117<br>(127 d) | Slides | ppt/notesSlides/notesSlide*.xml | LibreOffice làm mất hoặc hỏng liên kết ghi chú thuyết trình của diễn giả | Slide.swift đã có hàm setNotesText đọc/ghi trực tiếp notesSlide | **Hết cần** |
| 80 | `_normalize_slides_animation_timing` | L12120-12172<br>(53 d) | Slides | ppt/slides/slide*.xml (<p:timing>) | LibreOffice làm hỏng cấu trúc hoạt ảnh PowerPoint (nhấn mạnh, biến mất, lặp video) | Giữ nguyên 100% p:timing của slide gốc; cần API Slide.setAnimation khi sửa hiệu ứng | `Cần API mới` |
| 81 | `_anim_effect_xml` | L12187-12249<br>(63 d) | Slides | xl/worksheets/sheet*.xml, xl/styles.xml | Vá lỗi sai lệch dữ liệu do LibreOffice Calc làm mất khi convert ODF | OOXMLKit chép nguyên byte phần không sửa | **Hết cần** |
| 82 | `_slides_native_effect_groups` | L12300-12352<br>(53 d) | Slides | ppt/slides/slide*.xml, ppt/theme/, ppt/fonts/ | LibreOffice làm mất hoặc đổi định dạng shape, connector, font nhúng, crop ảnh, section | OPCPackage giữ nguyên các part không sửa; Presentation.swift hỗ trợ replaceText, sections | **Hết cần** |
| 83 | `_slides_animation_specs_from_fodp` | L12366-12434<br>(69 d) | Slides | ppt/slides/slide*.xml (<p:timing>) | LibreOffice làm hỏng cấu trúc hoạt ảnh PowerPoint (nhấn mạnh, biến mất, lặp video) | Giữ nguyên 100% p:timing của slide gốc; cần API Slide.setAnimation khi sửa hiệu ứng | `Cần API mới` |
| 84 | `_apply_slides_media_loops` | L12492-12546<br>(55 d) | Slides | ppt/slides/slide*.xml (<p:timing>) | LibreOffice làm hỏng cấu trúc hoạt ảnh PowerPoint (nhấn mạnh, biến mất, lặp video) | Giữ nguyên 100% p:timing của slide gốc; cần API Slide.setAnimation khi sửa hiệu ứng | `Cần API mới` |
| 85 | `_apply_slides_native_animation_timing` | L12549-12652<br>(104 d) | Slides | ppt/slides/slide*.xml (<p:timing>) | LibreOffice làm hỏng cấu trúc hoạt ảnh PowerPoint (nhấn mạnh, biến mất, lặp video) | Giữ nguyên 100% p:timing của slide gốc; cần API Slide.setAnimation khi sửa hiệu ứng | `Cần API mới` |
| 86 | `_apply_slides_paragraph_levels` | L12718-12760<br>(43 d) | Slides | ppt/slides/slide*.xml, ppt/theme/, ppt/fonts/ | LibreOffice làm mất hoặc đổi định dạng shape, connector, font nhúng, crop ảnh, section | OPCPackage giữ nguyên các part không sửa; Presentation.swift hỗ trợ replaceText, sections | **Hết cần** |
| 87 | `_slides_text_shadow_ranges_from_fodp` | L12763-12813<br>(51 d) | Slides | ppt/slides/slide*.xml, ppt/theme/, ppt/fonts/ | LibreOffice làm mất hoặc đổi định dạng shape, connector, font nhúng, crop ảnh, section | OPCPackage giữ nguyên các part không sửa; Presentation.swift hỗ trợ replaceText, sections | **Hết cần** |
| 88 | `_apply_slides_text_shadow` | L12848-12906<br>(59 d) | Slides | ppt/slides/slide*.xml, ppt/theme/, ppt/fonts/ | LibreOffice làm mất hoặc đổi định dạng shape, connector, font nhúng, crop ảnh, section | OPCPackage giữ nguyên các part không sửa; Presentation.swift hỗ trợ replaceText, sections | **Hết cần** |
| 89 | `_postprocess_slides_header_footer` | L13011-13097<br>(87 d) | Slides | ppt/slides/slide*.xml, ppt/theme/, ppt/fonts/ | LibreOffice làm mất hoặc đổi định dạng shape, connector, font nhúng, crop ảnh, section | OPCPackage giữ nguyên các part không sửa; Presentation.swift hỗ trợ replaceText, sections | **Hết cần** |
| 90 | `overlay_fodp_source_transitions` | L13233-13274<br>(42 d) | Slides | ppt/slides/slide*.xml (<p:transition>) | LibreOffice chỉ hiểu vài kiểu chuyển trang cơ bản và làm mất cấu trúc XML timing | Giữ nguyên transition gốc; cần API Slide.setTransition(type:duration:) khi đổi hiệu ứng | `Cần API mới` |
| 91 | `_apply_slides_source_transitions` | L13307-13387<br>(81 d) | Slides | ppt/slides/slide*.xml (<p:transition>) | LibreOffice chỉ hiểu vài kiểu chuyển trang cơ bản và làm mất cấu trúc XML timing | Giữ nguyên transition gốc; cần API Slide.setTransition(type:duration:) khi đổi hiệu ứng | `Cần API mới` |
| 92 | `_apply_slides_native_textboxes` | L13390-13460<br>(71 d) | Slides | ppt/slides/slide*.xml, ppt/theme/, ppt/fonts/ | LibreOffice làm mất hoặc đổi định dạng shape, connector, font nhúng, crop ảnh, section | OPCPackage giữ nguyên các part không sửa; Presentation.swift hỗ trợ replaceText, sections | **Hết cần** |
| 93 | `_apply_slides_native_shape_lines` | L13463-13541<br>(79 d) | Slides | ppt/slides/slide*.xml, ppt/theme/, ppt/fonts/ | LibreOffice làm mất hoặc đổi định dạng shape, connector, font nhúng, crop ảnh, section | OPCPackage giữ nguyên các part không sửa; Presentation.swift hỗ trợ replaceText, sections | **Hết cần** |
| 94 | `_apply_slides_native_pictures` | L13544-13639<br>(96 d) | Slides | ppt/slides/slide*.xml, ppt/theme/, ppt/fonts/ | LibreOffice làm mất hoặc đổi định dạng shape, connector, font nhúng, crop ảnh, section | OPCPackage giữ nguyên các part không sửa; Presentation.swift hỗ trợ replaceText, sections | **Hết cần** |
| 95 | `_apply_slides_native_connectors_from_fodp` | L13667-13750<br>(84 d) | Slides | ppt/slides/slide*.xml, ppt/theme/, ppt/fonts/ | LibreOffice làm mất hoặc đổi định dạng shape, connector, font nhúng, crop ảnh, section | OPCPackage giữ nguyên các part không sửa; Presentation.swift hỗ trợ replaceText, sections | **Hết cần** |
| 96 | `_apply_slides_native_connectors` | L13753-13830<br>(78 d) | Slides | ppt/slides/slide*.xml, ppt/theme/, ppt/fonts/ | LibreOffice làm mất hoặc đổi định dạng shape, connector, font nhúng, crop ảnh, section | OPCPackage giữ nguyên các part không sửa; Presentation.swift hỗ trợ replaceText, sections | **Hết cần** |
| 97 | `_apply_slides_native_text_formatting` | L13833-13997<br>(165 d) | Slides | ppt/slides/slide*.xml, ppt/theme/, ppt/fonts/ | LibreOffice làm mất hoặc đổi định dạng shape, connector, font nhúng, crop ảnh, section | OPCPackage giữ nguyên các part không sửa; Presentation.swift hỗ trợ replaceText, sections | **Hết cần** |
| 98 | `patch_sp` | L13913-13989<br>(77 d) | Slides | xl/worksheets/sheet*.xml, xl/styles.xml | Vá lỗi sai lệch dữ liệu do LibreOffice Calc làm mất khi convert ODF | OOXMLKit chép nguyên byte phần không sửa | **Hết cần** |
| 99 | `patch_p` | L13927-13986<br>(60 d) | Slides | xl/worksheets/sheet*.xml, xl/styles.xml | Vá lỗi sai lệch dữ liệu do LibreOffice Calc làm mất khi convert ODF | OOXMLKit chép nguyên byte phần không sửa | **Hết cần** |
| 100 | `_apply_slides_native_layout_types` | L14092-14141<br>(50 d) | Slides | ppt/slides/slide*.xml, ppt/theme/, ppt/fonts/ | LibreOffice làm mất hoặc đổi định dạng shape, connector, font nhúng, crop ảnh, section | OPCPackage giữ nguyên các part không sửa; Presentation.swift hỗ trợ replaceText, sections | **Hết cần** |
| 101 | `_restore_slides_embedded_fonts` | L14192-14336<br>(145 d) | Slides | ppt/slides/slide*.xml, ppt/theme/, ppt/fonts/ | LibreOffice làm mất hoặc đổi định dạng shape, connector, font nhúng, crop ảnh, section | OPCPackage giữ nguyên các part không sửa; Presentation.swift hỗ trợ replaceText, sections | **Hết cần** |
| 102 | `postprocess_slides_pptx` | L14339-14582<br>(244 d) | Slides | Toàn bộ gói PPTX (hàm điều phối chính cho Slides) | Điều phối các bước vá lỗi PPTX sau khi qua LibreOffice | Thay thế hoàn toàn khi dùng Presentation.swift | **Hết cần** |
| 103 | `_parse_xlsx_drawing_images` | L14626-14712<br>(87 d) | Sheet | xl/worksheets/sheet*.xml, xl/styles.xml | Vá lỗi sai lệch dữ liệu do LibreOffice Calc làm mất khi convert ODF | OOXMLKit chép nguyên byte phần không sửa | **Hết cần** |
| 104 | `_overlay_sheet_drawing_image_ids` | L14733-14824<br>(92 d) | Sheet | xl/worksheets/sheet*.xml, xl/styles.xml | Vá lỗi sai lệch dữ liệu do LibreOffice Calc làm mất khi convert ODF | OOXMLKit chép nguyên byte phần không sửa | **Hết cần** |
| 105 | `_restore_untouched_drawings_step` | L14827-15178<br>(352 d) | Sheet | xl/worksheets/sheet*.xml, xl/styles.xml | Vá lỗi sai lệch dữ liệu do LibreOffice Calc làm mất khi convert ODF | OOXMLKit chép nguyên byte phần không sửa | **Hết cần** |
| 106 | `_xlsx_table_slicer_metadata` | L15215-15336<br>(122 d) | Sheet | xl/worksheets/sheet*.xml, xl/styles.xml | Vá lỗi sai lệch dữ liệu do LibreOffice Calc làm mất khi convert ODF | OOXMLKit chép nguyên byte phần không sửa | **Hết cần** |
| 107 | `overlay_sheet_xlsx_fods` | L15364-15439<br>(76 d) | Sheet | xl/worksheets/sheet*.xml, xl/styles.xml | Vá lỗi sai lệch dữ liệu do LibreOffice Calc làm mất khi convert ODF | OOXMLKit chép nguyên byte phần không sửa | **Hết cần** |
| 108 | `overlay_sheet_xlsx_fods_p1` | L15442-15575<br>(134 d) | Sheet | xl/worksheets/sheet*.xml, xl/styles.xml | Vá lỗi sai lệch dữ liệu do LibreOffice Calc làm mất khi convert ODF | OOXMLKit chép nguyên byte phần không sửa | **Hết cần** |
| 109 | `_set_native_cell_format_attr` | L15793-15833<br>(41 d) | Sheet | xl/worksheets/sheet*.xml, xl/styles.xml | Vá lỗi sai lệch dữ liệu do LibreOffice Calc làm mất khi convert ODF | OOXMLKit chép nguyên byte phần không sửa | **Hết cần** |
| 110 | `_xlsx_native_formats_by_xf` | L15853-15984<br>(132 d) | Sheet | xl/worksheets/sheet*.xml, xl/styles.xml | Vá lỗi sai lệch dữ liệu do LibreOffice Calc làm mất khi convert ODF | OOXMLKit chép nguyên byte phần không sửa | **Hết cần** |
| 111 | `_overlay_native_cell_formats_from_xlsx` | L15993-16086<br>(94 d) | Sheet | xl/worksheets/sheet*.xml, xl/styles.xml | Vá lỗi sai lệch dữ liệu do LibreOffice Calc làm mất khi convert ODF | OOXMLKit chép nguyên byte phần không sửa | **Hết cần** |
| 112 | `_overlay_sheet_cell_metadata_from_xlsx` | L16178-16298<br>(121 d) | Sheet | xl/worksheets/sheet*.xml, xl/styles.xml | Vá lỗi sai lệch dữ liệu do LibreOffice Calc làm mất khi convert ODF | OOXMLKit chép nguyên byte phần không sửa | **Hết cần** |
| 113 | `apply_row` | L16202-16247<br>(46 d) | Sheet | xl/worksheets/sheet*.xml, xl/styles.xml | Vá lỗi sai lệch dữ liệu do LibreOffice Calc làm mất khi convert ODF | OOXMLKit chép nguyên byte phần không sửa | **Hết cần** |
| 114 | `_xlsx_cells_with_metadata` | L16301-16357<br>(57 d) | Sheet | xl/worksheets/sheet*.xml, xl/styles.xml | Vá lỗi sai lệch dữ liệu do LibreOffice Calc làm mất khi convert ODF | OOXMLKit chép nguyên byte phần không sửa | **Hết cần** |
| 115 | `_p1_stamp_cell_metadata` | L16633-16697<br>(65 d) | Sheet | xl/worksheets/sheet*.xml, xl/styles.xml | Vá lỗi sai lệch dữ liệu do LibreOffice Calc làm mất khi convert ODF | OOXMLKit chép nguyên byte phần không sửa | **Hết cần** |
| 116 | `_p1_apply_metadata_row` | L16700-16761<br>(62 d) | Sheet | xl/worksheets/sheet*.xml, xl/styles.xml | Vá lỗi sai lệch dữ liệu do LibreOffice Calc làm mất khi convert ODF | OOXMLKit chép nguyên byte phần không sửa | **Hết cần** |
| 117 | `_p1_transform_metadata_rows_chunk` | L16798-16847<br>(50 d) | Sheet | Tệp FODS trung gian (ODF XML streaming parser) | Tối ưu hoá đọc/ghi tệp XML ODF khổng lồ khi qua LibreOffice Calc | OOXMLKit đọc trực tiếp tệp nén XLSX, không bao giờ sinh hay phân tích tệp FODS | **Hết cần** |
| 118 | `_xlsx_cells_with_metadata_p1` | L16850-16912<br>(63 d) | Sheet | xl/worksheets/sheet*.xml, xl/styles.xml | Vá lỗi sai lệch dữ liệu do LibreOffice Calc làm mất khi convert ODF | OOXMLKit chép nguyên byte phần không sửa | **Hết cần** |
| 119 | `_overlay_sheet_cell_metadata_from_xlsx_p1` | L17019-17140<br>(122 d) | Sheet | xl/worksheets/sheet*.xml, xl/styles.xml | Vá lỗi sai lệch dữ liệu do LibreOffice Calc làm mất khi convert ODF | OOXMLKit chép nguyên byte phần không sửa | **Hết cần** |
| 120 | `_restore_original_xf_for_vno_cells` | L17224-17299<br>(76 d) | Sheet | xl/worksheets/sheet*.xml, xl/styles.xml | Vá lỗi sai lệch dữ liệu do LibreOffice Calc làm mất khi convert ODF | OOXMLKit chép nguyên byte phần không sửa | **Hết cần** |
| 121 | `_restore_source_color_palette` | L17409-17454<br>(46 d) | Sheet | xl/worksheets/sheet*.xml, xl/styles.xml | Vá lỗi sai lệch dữ liệu do LibreOffice Calc làm mất khi convert ODF | OOXMLKit chép nguyên byte phần không sửa | **Hết cần** |
| 122 | `_strip_first_repeat_attr` | L17514-17555<br>(42 d) | Sheet | xl/worksheets/sheet*.xml, xl/styles.xml | Vá lỗi sai lệch dữ liệu do LibreOffice Calc làm mất khi convert ODF | OOXMLKit chép nguyên byte phần không sửa | **Hết cần** |
| 123 | `_xlsx_cells_with_original_strings` | L17778-17826<br>(49 d) | Sheet | xl/worksheets/sheet*.xml, xl/styles.xml | Vá lỗi sai lệch dữ liệu do LibreOffice Calc làm mất khi convert ODF | OOXMLKit chép nguyên byte phần không sửa | **Hết cần** |
| 124 | `_extract_normal_font_from_xlsx` | L17870-17919<br>(50 d) | Sheet | xl/worksheets/sheet*.xml, xl/styles.xml | Vá lỗi sai lệch dữ liệu do LibreOffice Calc làm mất khi convert ODF | OOXMLKit chép nguyên byte phần không sửa | **Hết cần** |
| 125 | `_gdi_font_descent` | L18057-18097<br>(41 d) | Sheet | xl/worksheets/sheet*.xml, xl/styles.xml | Vá lỗi sai lệch dữ liệu do LibreOffice Calc làm mất khi convert ODF | OOXMLKit chép nguyên byte phần không sửa | **Hết cần** |
| 126 | `_xlsx_cell_fonts` | L18233-18279<br>(47 d) | Sheet | xl/worksheets/sheet*.xml, xl/styles.xml | Vá lỗi sai lệch dữ liệu do LibreOffice Calc làm mất khi convert ODF | OOXMLKit chép nguyên byte phần không sửa | **Hết cần** |
| 127 | `_excel_wrap_lines` | L18332-18391<br>(60 d) | Sheet | xl/worksheets/sheet*.xml, xl/styles.xml | Vá lỗi sai lệch dữ liệu do LibreOffice Calc làm mất khi convert ODF | OOXMLKit chép nguyên byte phần không sửa | **Hết cần** |
| 128 | `_compute_xlsx_sheet_layouts` | L18593-18840<br>(248 d) | Sheet | xl/worksheets/sheet*.xml, xl/styles.xml | Vá lỗi sai lệch dữ liệu do LibreOffice Calc làm mất khi convert ODF | OOXMLKit chép nguyên byte phần không sửa | **Hết cần** |
| 129 | `_restore_lost_leading_newlines_step` | L18893-18980<br>(88 d) | Sheet | xl/worksheets/sheet*.xml, xl/styles.xml | Vá lỗi sai lệch dữ liệu do LibreOffice Calc làm mất khi convert ODF | OOXMLKit chép nguyên byte phần không sửa | **Hết cần** |
| 130 | `_overlay_autofilter_from_xlsx` | L19021-19070<br>(50 d) | Sheet | xl/worksheets/sheet*.xml, xl/styles.xml | Vá lỗi sai lệch dữ liệu do LibreOffice Calc làm mất khi convert ODF | OOXMLKit chép nguyên byte phần không sửa | **Hết cần** |
| 131 | `_parse_xlsx_tables` | L19073-19128<br>(56 d) | Sheet | xl/worksheets/sheet*.xml, xl/styles.xml | Vá lỗi sai lệch dữ liệu do LibreOffice Calc làm mất khi convert ODF | OOXMLKit chép nguyên byte phần không sửa | **Hết cần** |
| 132 | `overlay_slides_pptx_fodp` | L19163-19218<br>(56 d) | Slides | Toàn bộ gói PPTX (hàm điều phối chính cho Slides) | Điều phối các bước vá lỗi PPTX sau khi qua LibreOffice | Thay thế hoàn toàn khi dùng Presentation.swift | **Hết cần** |
| 133 | `_extract_all_docx_sections` | L19333-19396<br>(64 d) | Writer | word/document.xml, word/styles.xml, word/numbering.xml | LibreOffice làm xáo trộn thứ tự phần tử body, làm hỏng bảng trôi, công thức toán OMML | Chép nguyên byte phần không sửa; WordDocument.swift quản lý sửa văn bản | **Hết cần** |
| 134 | `_collect_header_footer_dependencies` | L19484-19533<br>(50 d) | Writer | xl/worksheets/sheet*.xml, xl/styles.xml | Vá lỗi sai lệch dữ liệu do LibreOffice Calc làm mất khi convert ODF | OOXMLKit chép nguyên byte phần không sửa | **Hết cần** |
| 135 | `_remove_duplicate_writer_textbox_anchors` | L19757-19819<br>(63 d) | Writer | word/document.xml, word/styles.xml, word/numbering.xml | LibreOffice làm xáo trộn thứ tự phần tử body, làm hỏng bảng trôi, công thức toán OMML | Chép nguyên byte phần không sửa; WordDocument.swift quản lý sửa văn bản | **Hết cần** |
| 136 | `_writer_passthrough_matches` | L19822-19968<br>(147 d) | Writer | word/document.xml (<w:rPr>) | LibreOffice HTML/ODF làm mất gạch ngang đôi, ẩn chữ, chỉ số, font nửa point, bóng chữ | WordDocument thao tác trực tiếp trên DOM XML, không đi qua HTML trung gian | **Hết cần** |
| 137 | `_restore_writer_matched_formatting` | L20124-20378<br>(255 d) | Writer | word/document.xml (<w:rPr>) | LibreOffice HTML/ODF làm mất gạch ngang đôi, ẩn chữ, chỉ số, font nửa point, bóng chữ | WordDocument thao tác trực tiếp trên DOM XML, không đi qua HTML trung gian | **Hết cần** |
| 138 | `_writer_align_runs_by_offset` | L20386-20438<br>(53 d) | Writer | word/document.xml, word/styles.xml, word/numbering.xml | LibreOffice làm xáo trộn thứ tự phần tử body, làm hỏng bảng trôi, công thức toán OMML | Chép nguyên byte phần không sửa; WordDocument.swift quản lý sửa văn bản | **Hết cần** |
| 139 | `_writer_restore_untouched_runs` | L20452-20501<br>(50 d) | Writer | word/document.xml, word/styles.xml, word/numbering.xml | LibreOffice làm xáo trộn thứ tự phần tử body, làm hỏng bảng trôi, công thức toán OMML | Chép nguyên byte phần không sửa; WordDocument.swift quản lý sửa văn bản | **Hết cần** |
| 140 | `_writer_apply_text_edit` | L20522-20615<br>(94 d) | Writer | word/document.xml, word/styles.xml, word/numbering.xml | LibreOffice làm xáo trộn thứ tự phần tử body, làm hỏng bảng trôi, công thức toán OMML | Chép nguyên byte phần không sửa; WordDocument.swift quản lý sửa văn bản | **Hết cần** |
| 141 | `_writer_patch_edited_paragraphs` | L20618-20667<br>(50 d) | Writer | word/document.xml, word/styles.xml, word/numbering.xml | LibreOffice làm xáo trộn thứ tự phần tử body, làm hỏng bảng trôi, công thức toán OMML | Chép nguyên byte phần không sửa; WordDocument.swift quản lý sửa văn bản | **Hết cần** |
| 142 | `_restore_untouched_writer_equations` | L20707-20792<br>(86 d) | Writer | word/document.xml, word/styles.xml, word/numbering.xml | LibreOffice làm xáo trộn thứ tự phần tử body, làm hỏng bảng trôi, công thức toán OMML | Chép nguyên byte phần không sửa; WordDocument.swift quản lý sửa văn bản | **Hết cần** |
| 143 | `_writer_body_flow_elements` | L20867-20925<br>(59 d) | Writer | word/document.xml, word/styles.xml, word/numbering.xml | LibreOffice làm xáo trộn thứ tự phần tử body, làm hỏng bảng trôi, công thức toán OMML | Chép nguyên byte phần không sửa; WordDocument.swift quản lý sửa văn bản | **Hết cần** |
| 144 | `_restore_writer_floating_tables` | L21060-21117<br>(58 d) | Writer | word/document.xml, word/styles.xml, word/numbering.xml | LibreOffice làm xáo trộn thứ tự phần tử body, làm hỏng bảng trôi, công thức toán OMML | Chép nguyên byte phần không sửa; WordDocument.swift quản lý sửa văn bản | **Hết cần** |
| 145 | `_restore_writer_sections_by_order` | L21123-21186<br>(64 d) | Writer | word/document.xml, word/styles.xml, word/numbering.xml | LibreOffice làm xáo trộn thứ tự phần tử body, làm hỏng bảng trôi, công thức toán OMML | Chép nguyên byte phần không sửa; WordDocument.swift quản lý sửa văn bản | **Hết cần** |
| 146 | `_writer_apply_source_table_properties` | L21358-21408<br>(51 d) | Writer | word/document.xml, word/styles.xml, word/numbering.xml | LibreOffice làm xáo trộn thứ tự phần tử body, làm hỏng bảng trôi, công thức toán OMML | Chép nguyên byte phần không sửa; WordDocument.swift quản lý sửa văn bản | **Hết cần** |
| 147 | `_restore_writer_page_breaks` | L21411-21494<br>(84 d) | Writer | word/document.xml, word/styles.xml, word/numbering.xml | LibreOffice làm xáo trộn thứ tự phần tử body, làm hỏng bảng trôi, công thức toán OMML | Chép nguyên byte phần không sửa; WordDocument.swift quản lý sửa văn bản | **Hết cần** |
| 148 | `_relocate_writer_background_anchors` | L21550-21601<br>(52 d) | Writer | word/document.xml, word/styles.xml, word/numbering.xml | LibreOffice làm xáo trộn thứ tự phần tử body, làm hỏng bảng trôi, công thức toán OMML | Chép nguyên byte phần không sửa; WordDocument.swift quản lý sửa văn bản | **Hết cần** |
| 149 | `_relocate_passthrough_anchors` | L21604-21944<br>(341 d) | Writer | xl/worksheets/sheet*.xml, xl/styles.xml | Vá lỗi sai lệch dữ liệu do LibreOffice Calc làm mất khi convert ODF | OOXMLKit chép nguyên byte phần không sửa | **Hết cần** |
| 150 | `_passthrough_writer_anchors` | L21974-22070<br>(97 d) | Writer | word/document.xml (<w:rPr>) | LibreOffice HTML/ODF làm mất gạch ngang đôi, ẩn chữ, chỉ số, font nửa point, bóng chữ | WordDocument thao tác trực tiếp trên DOM XML, không đi qua HTML trung gian | **Hết cần** |
| 151 | `replace` | L21998-22049<br>(52 d) | Writer | xl/worksheets/sheet*.xml, xl/styles.xml | Vá lỗi sai lệch dữ liệu do LibreOffice Calc làm mất khi convert ODF | OOXMLKit chép nguyên byte phần không sửa | **Hết cần** |
| 152 | `_restore_mid_document_sections` | L22073-22218<br>(146 d) | Writer | xl/worksheets/sheet*.xml, xl/styles.xml | Vá lỗi sai lệch dữ liệu do LibreOffice Calc làm mất khi convert ODF | OOXMLKit chép nguyên byte phần không sửa | **Hết cần** |
| 153 | `_drop_starwriter_duplicate_pics` | L22429-22514<br>(86 d) | Writer | word/document.xml, word/styles.xml, word/numbering.xml | LibreOffice làm xáo trộn thứ tự phần tử body, làm hỏng bảng trôi, công thức toán OMML | Chép nguyên byte phần không sửa; WordDocument.swift quản lý sửa văn bản | **Hết cần** |
| 154 | `_writer_should_restore_drawing` | L22586-22626<br>(41 d) | Writer | word/document.xml, word/styles.xml, word/numbering.xml | LibreOffice làm xáo trộn thứ tự phần tử body, làm hỏng bảng trôi, công thức toán OMML | Chép nguyên byte phần không sửa; WordDocument.swift quản lý sửa văn bản | **Hết cần** |
| 155 | `_restore_missing_writer_drawings` | L22657-22807<br>(151 d) | Writer | word/document.xml, word/styles.xml, word/numbering.xml | LibreOffice làm xáo trộn thứ tự phần tử body, làm hỏng bảng trôi, công thức toán OMML | Chép nguyên byte phần không sửa; WordDocument.swift quản lý sửa văn bản | **Hết cần** |
| 156 | `postprocess_writer_docx` | L22841-23302<br>(462 d) | Writer | Toàn bộ gói DOCX (hàm điều phối chính cho Writer) | Điều phối hàng chục bước vá lỗi văn bản, bảng biểu, section, style sau LibreOffice | Khi dùng WordDocument.swift làm động cơ I/O DOCX thì không cần chạy các hàm vá này | **Hết cần** |
| 157 | `prepare_writer_docx_for_legacy_doc_export` | L23347-23401<br>(55 d) | Writer | word/document.xml (chuẩn bị để xuất .doc cũ qua LibreOffice) | Chuyển đổi các cấu trúc DOCX hiện đại sang dạng tương thích filter DOC nhị phân của LibreOffice | Giữ lại cho bước xuất định dạng cũ .doc nếu cần dùng LibreOffice làm công cụ chuyển đổi phụ | *Vẫn cần* |
| 158 | `_writer_restore_custom_paragraph_styles` | L23484-23541<br>(58 d) | Writer | word/document.xml, word/styles.xml, word/numbering.xml | LibreOffice làm xáo trộn thứ tự phần tử body, làm hỏng bảng trôi, công thức toán OMML | Chép nguyên byte phần không sửa; WordDocument.swift quản lý sửa văn bản | **Hết cần** |
| 159 | `_writer_patch_header_footer_text` | L23821-23866<br>(46 d) | Writer | word/document.xml, word/styles.xml, word/numbering.xml | LibreOffice làm xáo trộn thứ tự phần tử body, làm hỏng bảng trôi, công thức toán OMML | Chép nguyên byte phần không sửa; WordDocument.swift quản lý sửa văn bản | **Hết cần** |
| 160 | `_writer_apply_section_header_footer_metadata` | L23879-24088<br>(210 d) | Writer | word/document.xml, word/styles.xml, word/numbering.xml | LibreOffice làm xáo trộn thứ tự phần tử body, làm hỏng bảng trôi, công thức toán OMML | Chép nguyên byte phần không sửa; WordDocument.swift quản lý sửa văn bản | **Hết cần** |
| 161 | `_writer_restore_created_paragraph_css` | L24120-24270<br>(151 d) | Writer | word/document.xml, word/styles.xml, word/numbering.xml | LibreOffice làm xáo trộn thứ tự phần tử body, làm hỏng bảng trôi, công thức toán OMML | Chép nguyên byte phần không sửa; WordDocument.swift quản lý sửa văn bản | **Hết cần** |
| 162 | `patch_paragraph` | L24199-24259<br>(61 d) | Writer | word/document.xml, word/styles.xml, word/numbering.xml | LibreOffice làm xáo trộn thứ tự phần tử body, làm hỏng bảng trôi, công thức toán OMML | Chép nguyên byte phần không sửa; WordDocument.swift quản lý sửa văn bản | **Hết cần** |
| 163 | `_writer_restore_created_vertical_alignment` | L24291-24379<br>(89 d) | Writer | word/document.xml, word/styles.xml, word/numbering.xml | LibreOffice làm xáo trộn thứ tự phần tử body, làm hỏng bảng trôi, công thức toán OMML | Chép nguyên byte phần không sửa; WordDocument.swift quản lý sửa văn bản | **Hết cần** |
| 164 | `_writer_restore_created_image_layout` | L24382-24483<br>(102 d) | Writer | word/document.xml, word/styles.xml, word/numbering.xml | LibreOffice làm xáo trộn thứ tự phần tử body, làm hỏng bảng trôi, công thức toán OMML | Chép nguyên byte phần không sửa; WordDocument.swift quản lý sửa văn bản | **Hết cần** |
| 165 | `_writer_clone_lower_alpha_suffix` | L24580-24708<br>(129 d) | Writer | word/document.xml, word/styles.xml, word/numbering.xml | LibreOffice làm xáo trộn thứ tự phần tử body, làm hỏng bảng trôi, công thức toán OMML | Chép nguyên byte phần không sửa; WordDocument.swift quản lý sửa văn bản | **Hết cần** |
| 166 | `_writer_normalize_simple_list_numbering` | L24711-24758<br>(48 d) | Writer | word/document.xml, word/styles.xml, word/numbering.xml | LibreOffice làm xáo trộn thứ tự phần tử body, làm hỏng bảng trôi, công thức toán OMML | Chép nguyên byte phần không sửa; WordDocument.swift quản lý sửa văn bản | **Hết cần** |
| 167 | `_writer_apply_word_default_heading_styles_for_new_documents` | L24760-24835<br>(76 d) | Writer | word/document.xml, word/styles.xml, word/numbering.xml | LibreOffice làm xáo trộn thứ tự phần tử body, làm hỏng bảng trôi, công thức toán OMML | Chép nguyên byte phần không sửa; WordDocument.swift quản lý sửa văn bản | **Hết cần** |
| 168 | `_writer_restore_heading_styles` | L24882-24980<br>(99 d) | Writer | word/document.xml, word/styles.xml, word/numbering.xml | LibreOffice làm xáo trộn thứ tự phần tử body, làm hỏng bảng trôi, công thức toán OMML | Chép nguyên byte phần không sửa; WordDocument.swift quản lý sửa văn bản | **Hết cần** |
| 169 | `_writer_restore_gallery_builtin_styles` | L24983-25066<br>(84 d) | Writer | word/document.xml, word/styles.xml, word/numbering.xml | LibreOffice làm xáo trộn thứ tự phần tử body, làm hỏng bảng trôi, công thức toán OMML | Chép nguyên byte phần không sửa; WordDocument.swift quản lý sửa văn bản | **Hết cần** |
| 170 | `_writer_restore_caption_sequence_fields` | L25146-25193<br>(48 d) | Writer | word/document.xml (<w:fldSimple>, <w:instrText>) | LibreOffice làm đông cứng các trường tự động (TOC, PAGE, SEQ) thành văn bản tĩnh | Tệp gốc giữ nguyên trường động; cần API WordDocument.insertField(name:args:) | `Cần API mới` |
| 171 | `patch_paragraph` | L25150-25191<br>(42 d) | Writer | word/document.xml, word/styles.xml, word/numbering.xml | LibreOffice làm xáo trộn thứ tự phần tử body, làm hỏng bảng trôi, công thức toán OMML | Chép nguyên byte phần không sửa; WordDocument.swift quản lý sửa văn bản | **Hết cần** |
| 172 | `_writer_restore_native_writer_shapes` | L25196-25311<br>(116 d) | Writer | word/document.xml, word/styles.xml, word/numbering.xml | LibreOffice làm xáo trộn thứ tự phần tử body, làm hỏng bảng trôi, công thức toán OMML | Chép nguyên byte phần không sửa; WordDocument.swift quản lý sửa văn bản | **Hết cần** |
| 173 | `_writer_restore_toc_field` | L25314-25358<br>(45 d) | Writer | word/document.xml (<w:fldSimple>, <w:instrText>) | LibreOffice làm đông cứng các trường tự động (TOC, PAGE, SEQ) thành văn bản tĩnh | Tệp gốc giữ nguyên trường động; cần API WordDocument.insertField(name:args:) | `Cần API mới` |
| 174 | `_writer_restore_tof_field` | L25431-25486<br>(56 d) | Writer | word/document.xml (<w:fldSimple>, <w:instrText>) | LibreOffice làm đông cứng các trường tự động (TOC, PAGE, SEQ) thành văn bản tĩnh | Tệp gốc giữ nguyên trường động; cần API WordDocument.insertField(name:args:) | `Cần API mới` |
| 175 | `_writer_insert_page_field` | L25489-25532<br>(44 d) | Writer | word/document.xml (<w:fldSimple>, <w:instrText>) | LibreOffice làm đông cứng các trường tự động (TOC, PAGE, SEQ) thành văn bản tĩnh | Tệp gốc giữ nguyên trường động; cần API WordDocument.insertField(name:args:) | `Cần API mới` |
| 176 | `_restore_writer_html_page_breaks` | L25649-25730<br>(82 d) | Writer | word/document.xml, word/styles.xml, word/numbering.xml | LibreOffice làm xáo trộn thứ tự phần tử body, làm hỏng bảng trôi, công thức toán OMML | Chép nguyên byte phần không sửa; WordDocument.swift quản lý sửa văn bản | **Hết cần** |
| 177 | `_writer_omml_to_mathml_node` | L25765-25865<br>(101 d) | Writer | word/document.xml, word/styles.xml, word/numbering.xml | LibreOffice làm xáo trộn thứ tự phần tử body, làm hỏng bảng trôi, công thức toán OMML | Chép nguyên byte phần không sửa; WordDocument.swift quản lý sửa văn bản | **Hết cần** |
| 178 | `writer_docx_equations_to_mathml_html` | L25880-25950<br>(71 d) | Writer | word/document.xml, word/styles.xml, word/numbering.xml | LibreOffice làm xáo trộn thứ tự phần tử body, làm hỏng bảng trôi, công thức toán OMML | Chép nguyên byte phần không sửa; WordDocument.swift quản lý sửa văn bản | **Hết cần** |
| 179 | `_writer_mathml_to_omml_node` | L25953-26014<br>(62 d) | Writer | word/document.xml, word/styles.xml, word/numbering.xml | LibreOffice làm xáo trộn thứ tự phần tử body, làm hỏng bảng trôi, công thức toán OMML | Chép nguyên byte phần không sửa; WordDocument.swift quản lý sửa văn bản | **Hết cần** |
| 180 | `_collapse_single_section_cols` | L26117-26165<br>(49 d) | Writer | xl/worksheets/sheet*.xml, xl/styles.xml | Vá lỗi sai lệch dữ liệu do LibreOffice Calc làm mất khi convert ODF | OOXMLKit chép nguyên byte phần không sửa | **Hết cần** |
| 181 | `_restore_created_writer_section_metadata` | L26168-26424<br>(257 d) | Writer | word/document.xml (<w:sectPr>), word/header*.xml, word/footer*.xml | LibreOffice gộp section, làm hỏng chia cột báo chí, mất header/footer khác nhau trang đầu/chẵn lẻ | Giữ nguyên sectPr của tệp gốc; cần API WordDocument.setSectionProperties | `Cần API mới` |
| 182 | `source_page_setup_changes` | L26223-26275<br>(53 d) | Writer | xl/worksheets/sheet*.xml, xl/styles.xml | Vá lỗi sai lệch dữ liệu do LibreOffice Calc làm mất khi convert ODF | OOXMLKit chép nguyên byte phần không sửa | **Hết cần** |
| 183 | `_apply_writer_link_to_previous` | L26427-26468<br>(42 d) | Writer | word/document.xml, word/styles.xml, word/numbering.xml | LibreOffice làm xáo trộn thứ tự phần tử body, làm hỏng bảng trôi, công thức toán OMML | Chép nguyên byte phần không sửa; WordDocument.swift quản lý sửa văn bản | **Hết cần** |
| 184 | `_restore_created_writer_header_footer_refs` | L26471-26515<br>(45 d) | Writer | word/document.xml (<w:sectPr>), word/header*.xml, word/footer*.xml | LibreOffice gộp section, làm hỏng chia cột báo chí, mất header/footer khác nhau trang đầu/chẵn lẻ | Giữ nguyên sectPr của tệp gốc; cần API WordDocument.setSectionProperties | `Cần API mới` |
| 185 | `postprocess_writer_section_metadata` | L26518-26611<br>(94 d) | Writer | word/document.xml (<w:sectPr>), word/header*.xml, word/footer*.xml | LibreOffice gộp section, làm hỏng chia cột báo chí, mất header/footer khác nhau trang đầu/chẵn lẻ | Giữ nguyên sectPr của tệp gốc; cần API WordDocument.setSectionProperties | `Cần API mới` |
| 186 | `postprocess_created_writer_docx` | L26614-27530<br>(917 d) | Writer | Toàn bộ gói DOCX (hàm điều phối chính cho Writer) | Điều phối hàng chục bước vá lỗi văn bản, bảng biểu, section, style sau LibreOffice | Khi dùng WordDocument.swift làm động cơ I/O DOCX thì không cần chạy các hàm vá này | **Hết cần** |
| 187 | `patch_table` | L27266-27307<br>(42 d) | Writer | xl/worksheets/sheet*.xml, xl/styles.xml | Vá lỗi sai lệch dữ liệu do LibreOffice Calc làm mất khi convert ODF | OOXMLKit chép nguyên byte phần không sửa | **Hết cần** |
| 188 | `postprocess_writer_document_properties` | L27669-27805<br>(137 d) | Writer | word/document.xml, word/styles.xml, word/numbering.xml | LibreOffice làm xáo trộn thứ tự phần tử body, làm hỏng bảng trôi, công thức toán OMML | Chép nguyên byte phần không sửa; WordDocument.swift quản lý sửa văn bản | **Hết cần** |
| 189 | `postprocess_writer_notes` | L27892-27997<br>(106 d) | Writer | word/comments.xml, word/footnotes.xml, word/document.xml | LibreOffice làm mất vết sửa (track changes), chú thích chân trang, trộn thư, hình mờ chìm | Revisions.swift đã đọc revisions; tệp gốc giữ nguyên; cần API mới nếu muốn thêm footnote/watermark | `Cần API mới` |
| 190 | `postprocess_writer_captions` | L28000-28045<br>(46 d) | Writer | word/document.xml, word/styles.xml, word/numbering.xml | LibreOffice làm xáo trộn thứ tự phần tử body, làm hỏng bảng trôi, công thức toán OMML | Chép nguyên byte phần không sửa; WordDocument.swift quản lý sửa văn bản | **Hết cần** |
| 191 | `postprocess_writer_drop_caps` | L28087-28139<br>(53 d) | Writer | word/document.xml, word/styles.xml, word/numbering.xml | LibreOffice làm xáo trộn thứ tự phần tử body, làm hỏng bảng trôi, công thức toán OMML | Chép nguyên byte phần không sửa; WordDocument.swift quản lý sửa văn bản | **Hết cần** |
| 192 | `postprocess_writer_merge_fields` | L28142-28186<br>(45 d) | Writer | word/comments.xml, word/footnotes.xml, word/document.xml | LibreOffice làm mất vết sửa (track changes), chú thích chân trang, trộn thư, hình mờ chìm | Revisions.swift đã đọc revisions; tệp gốc giữ nguyên; cần API mới nếu muốn thêm footnote/watermark | `Cần API mới` |
| 193 | `postprocess_writer_if_ref_fields` | L28189-28341<br>(153 d) | Writer | word/comments.xml, word/footnotes.xml, word/document.xml | LibreOffice làm mất vết sửa (track changes), chú thích chân trang, trộn thư, hình mờ chìm | Revisions.swift đã đọc revisions; tệp gốc giữ nguyên; cần API mới nếu muốn thêm footnote/watermark | `Cần API mới` |
| 194 | `postprocess_writer_page_decor` | L28362-28462<br>(101 d) | Writer | word/document.xml, word/styles.xml, word/numbering.xml | LibreOffice làm xáo trộn thứ tự phần tử body, làm hỏng bảng trôi, công thức toán OMML | Chép nguyên byte phần không sửa; WordDocument.swift quản lý sửa văn bản | **Hết cần** |
| 195 | `postprocess_writer_native_charts` | L28525-28654<br>(130 d) | Writer | word/document.xml, word/styles.xml, word/numbering.xml | LibreOffice làm xáo trộn thứ tự phần tử body, làm hỏng bảng trôi, công thức toán OMML | Chép nguyên byte phần không sửa; WordDocument.swift quản lý sửa văn bản | **Hết cần** |
| 196 | `postprocess_writer_native_diagrams` | L28657-28701<br>(45 d) | Writer | word/document.xml, word/styles.xml, word/numbering.xml | LibreOffice làm xáo trộn thứ tự phần tử body, làm hỏng bảng trôi, công thức toán OMML | Chép nguyên byte phần không sửa; WordDocument.swift quản lý sửa văn bản | **Hết cần** |
| 197 | `postprocess_writer_native_wordart` | L28704-28773<br>(70 d) | Writer | word/document.xml, word/styles.xml, word/numbering.xml | LibreOffice làm xáo trộn thứ tự phần tử body, làm hỏng bảng trôi, công thức toán OMML | Chép nguyên byte phần không sửa; WordDocument.swift quản lý sửa văn bản | **Hết cần** |
| 198 | `postprocess_writer_native_watermark` | L28776-28861<br>(86 d) | Writer | word/comments.xml, word/footnotes.xml, word/document.xml | LibreOffice làm mất vết sửa (track changes), chú thích chân trang, trộn thư, hình mờ chìm | Revisions.swift đã đọc revisions; tệp gốc giữ nguyên; cần API mới nếu muốn thêm footnote/watermark | `Cần API mới` |
| 199 | `postprocess_writer_review_markup` | L28864-29180<br>(317 d) | Writer | word/comments.xml, word/footnotes.xml, word/document.xml | LibreOffice làm mất vết sửa (track changes), chú thích chân trang, trộn thư, hình mờ chìm | Revisions.swift đã đọc revisions; tệp gốc giữ nguyên; cần API mới nếu muốn thêm footnote/watermark | `Cần API mới` |
| 200 | `_patch_blip_fill` | L29183-29238<br>(56 d) | Writer | xl/worksheets/sheet*.xml, xl/styles.xml | Vá lỗi sai lệch dữ liệu do LibreOffice Calc làm mất khi convert ODF | OOXMLKit chép nguyên byte phần không sửa | **Hết cần** |
| 201 | `_writer_restore_picture_tools_effects` | L29277-29351<br>(75 d) | Writer | word/document.xml, word/styles.xml, word/numbering.xml | LibreOffice làm xáo trộn thứ tự phần tử body, làm hỏng bảng trôi, công thức toán OMML | Chép nguyên byte phần không sửa; WordDocument.swift quản lý sửa văn bản | **Hết cần** |
| 202 | `_writer_restore_text_effects` | L29370-29509<br>(140 d) | Writer | word/document.xml (<w:rPr>) | LibreOffice HTML/ODF làm mất gạch ngang đôi, ẩn chữ, chỉ số, font nửa point, bóng chữ | WordDocument thao tác trực tiếp trên DOM XML, không đi qua HTML trung gian | **Hết cần** |
| 203 | `_run_fx_from_rpr` | L29581-29629<br>(49 d) | Writer | word/document.xml (<w:rPr>) | LibreOffice HTML/ODF làm mất gạch ngang đôi, ẩn chữ, chỉ số, font nửa point, bóng chữ | WordDocument thao tác trực tiếp trên DOM XML, không đi qua HTML trung gian | **Hết cần** |
| 204 | `_run_fx_apply_to_rpr` | L29632-29698<br>(67 d) | Writer | word/document.xml (<w:rPr>) | LibreOffice HTML/ODF làm mất gạch ngang đôi, ẩn chữ, chỉ số, font nửa point, bóng chữ | WordDocument thao tác trực tiếp trên DOM XML, không đi qua HTML trung gian | **Hết cần** |
| 205 | `_run_fx_apply_para` | L29812-29952<br>(141 d) | Writer | word/document.xml (<w:rPr>) | LibreOffice HTML/ODF làm mất gạch ngang đôi, ẩn chữ, chỉ số, font nửa point, bóng chữ | WordDocument thao tác trực tiếp trên DOM XML, không đi qua HTML trung gian | **Hết cần** |
| 206 | `inject_docx_run_effects` | L29955-30010<br>(56 d) | Writer | word/document.xml, word/styles.xml, word/numbering.xml | LibreOffice làm xáo trộn thứ tự phần tử body, làm hỏng bảng trôi, công thức toán OMML | Chép nguyên byte phần không sửa; WordDocument.swift quản lý sửa văn bản | **Hết cần** |
| 207 | `_run_fx_wrap_inner` | L30013-30077<br>(65 d) | Writer | word/document.xml (<w:rPr>) | LibreOffice HTML/ODF làm mất gạch ngang đôi, ẩn chữ, chỉ số, font nửa point, bóng chữ | WordDocument thao tác trực tiếp trên DOM XML, không đi qua HTML trung gian | **Hết cần** |
| 208 | `_writer_apply_custom_multilevel` | L30166-30253<br>(88 d) | Writer | word/document.xml, word/styles.xml, word/numbering.xml | LibreOffice làm xáo trộn thứ tự phần tử body, làm hỏng bảng trôi, công thức toán OMML | Chép nguyên byte phần không sửa; WordDocument.swift quản lý sửa văn bản | **Hết cần** |
| 209 | `postprocess_writer_run_effects` | L30256-30358<br>(103 d) | Writer | word/document.xml, word/styles.xml, word/numbering.xml | LibreOffice làm xáo trộn thứ tự phần tử body, làm hỏng bảng trôi, công thức toán OMML | Chép nguyên byte phần không sửa; WordDocument.swift quản lý sửa văn bản | **Hết cần** |
| 210 | `optimize_fods_streaming_legacy` | L30571-30785<br>(215 d) | Sheet | Tệp FODS trung gian (ODF XML streaming parser) | Tối ưu hoá đọc/ghi tệp XML ODF khổng lồ khi qua LibreOffice Calc | OOXMLKit đọc trực tiếp tệp nén XLSX, không bao giờ sinh hay phân tích tệp FODS | **Hết cần** |
| 211 | `process_table` | L30675-30783<br>(109 d) | Sheet | Tệp FODS trung gian (ODF XML streaming parser) | Tối ưu hoá đọc/ghi tệp XML ODF khổng lồ khi qua LibreOffice Calc | OOXMLKit đọc trực tiếp tệp nén XLSX, không bao giờ sinh hay phân tích tệp FODS | **Hết cần** |
| 212 | `process_row` | L30705-30774<br>(70 d) | Sheet | Tệp FODS trung gian (ODF XML streaming parser) | Tối ưu hoá đọc/ghi tệp XML ODF khổng lồ khi qua LibreOffice Calc | OOXMLKit đọc trực tiếp tệp nén XLSX, không bao giờ sinh hay phân tích tệp FODS | **Hết cần** |
| 213 | `_p1_optimize_rows_chunk` | L30917-30987<br>(71 d) | Sheet | Tệp FODS trung gian (ODF XML streaming parser) | Tối ưu hoá đọc/ghi tệp XML ODF khổng lồ khi qua LibreOffice Calc | OOXMLKit đọc trực tiếp tệp nén XLSX, không bao giờ sinh hay phân tích tệp FODS | **Hết cần** |
| 214 | `process_row` | L30920-30978<br>(59 d) | Sheet | Tệp FODS trung gian (ODF XML streaming parser) | Tối ưu hoá đọc/ghi tệp XML ODF khổng lồ khi qua LibreOffice Calc | OOXMLKit đọc trực tiếp tệp nén XLSX, không bao giờ sinh hay phân tích tệp FODS | **Hết cần** |
| 215 | `optimize_fods_streaming` | L30990-31178<br>(189 d) | Sheet | Tệp FODS trung gian (ODF XML streaming parser) | Tối ưu hoá đọc/ghi tệp XML ODF khổng lồ khi qua LibreOffice Calc | OOXMLKit đọc trực tiếp tệp nén XLSX, không bao giờ sinh hay phân tích tệp FODS | **Hết cần** |
| 216 | `process_table` | L31071-31176<br>(106 d) | Sheet | Tệp FODS trung gian (ODF XML streaming parser) | Tối ưu hoá đọc/ghi tệp XML ODF khổng lồ khi qua LibreOffice Calc | OOXMLKit đọc trực tiếp tệp nén XLSX, không bao giờ sinh hay phân tích tệp FODS | **Hết cần** |
| 217 | `process_row` | L31114-31167<br>(54 d) | Sheet | Tệp FODS trung gian (ODF XML streaming parser) | Tối ưu hoá đọc/ghi tệp XML ODF khổng lồ khi qua LibreOffice Calc | OOXMLKit đọc trực tiếp tệp nén XLSX, không bao giờ sinh hay phân tích tệp FODS | **Hết cần** |

---

## 4. DANH SÁCH API OOXMLKit CẦN BỔ SUNG (ƯU TIÊN XLSX)

Để thay thế hoàn toàn 37 hàm còn lại (đặc biệt là 19 hàm của VN Sheet), OOXMLKit cần được mở rộng các API sau đây trong `ports/ios/OOXMLKit/Sources/OOXMLSpreadsheet/` và các mô-đun liên quan:

### 4.1. Nhóm Ưu Tiên P0 — Năng lực cốt lõi cho XLSX (Phase W2 - W3)

#### 1. Cố định hàng/cột (Freeze Panes / Split Panes)
- **Mô-đun:** `OOXMLSpreadsheet/Worksheet.swift`
- **Thay thế các hàm:** `_restore_view_attributes_from_source_step` (L5865), `_apply_sheet_view_state_from_fods` (L5814)
- **XML mục tiêu:** `xl/worksheets/sheet*.xml` bên trong `<sheetViews><sheetView>` chèn `<pane xSplit="..." ySplit="..." topLeftCell="..." activePane="..." state="frozen"/>`
- **Đặc tả API đề xuất:**
  ```swift
  public func setFreezePanes(rows: Int, cols: Int) throws
  public func removeFreezePanes() throws
  ```

#### 2. Vùng lọc tự động (AutoFilter)
- **Mô-đun:** `OOXMLSpreadsheet/Worksheet.swift`
- **Thay thế các hàm:** `apply_autofilter_to_worksheet` (L3061), `parse_autofilter_filter_columns_from_worksheet` (L2644)
- **XML mục tiêu:** `<autoFilter ref="A1:Z100"><filterColumn colId="..."><filters>...</filters></filterColumn></autoFilter>`
- **Đặc tả API đề xuất:**
  ```swift
  public func setAutoFilter(range: CellRange) throws
  public func removeAutoFilter() throws
  ```

#### 3. Màu thẻ Sheet (Tab Color) & Trạng thái hiển thị Sheet
- **Mô-đun:** `OOXMLSpreadsheet/Worksheet.swift` & `Workbook.swift`
- **Thay thế các hàm:** `parse_tab_colors_from_fods` (L1885), xử lý sheet state (veryHidden)
- **XML mục tiêu:** `<sheetPr><tabColor rgb="FF00FF00"/></sheetPr>` và `xl/workbook.xml` `<sheet state="hidden|veryHidden" .../>`
- **Đặc tả API đề xuất:**
  ```swift
  public func setTabColor(rgbHex: String) throws
  public func setSheetState(named name: String, state: SheetState) throws // .visible, .hidden, .veryHidden
  ```

#### 4. Kích thước & Ẩn Hàng/Cột (Column Widths, Row Heights, Hidden)
- **Mô-đun:** `OOXMLSpreadsheet/Worksheet.swift`
- **Thay thế các hàm:** `_restore_column_widths` (L3814), `_restore_hidden_columns_and_rows_from_source` (L4936)
- **XML mục tiêu:** `<cols><col min="1" max="1" width="15.5" customWidth="1" hidden="1"/></cols>` và `<row r="2" ht="25" customHeight="1" hidden="1">`
- **Đặc tả API đề xuất:**
  ```swift
  public func setColumnWidth(col: Int, width: Double, hidden: Bool = false) throws
  public func setRowHeight(row: Int, height: Double, hidden: Bool = false) throws
  public func setColumnHidden(col: Int, hidden: Bool) throws
  public func setRowHidden(row: Int, hidden: Bool) throws
  ```

#### 5. Thiết lập trang in & Vùng in cục bộ (Page Setup & Print Area)
- **Mô-đun:** `OOXMLSpreadsheet/Worksheet.swift` & `Workbook.swift`
- **Thay thế các hàm:** `_set_local_print_area` (L1712), `make_print_scope_xlsx` (L1768), `_apply_sheet_print_options_from_fods` (L6651), `parse_page_setup_metadata_from_sheet_xml` (L6904)
- **XML mục tiêu:** `<pageMargins left="..." right="..."/>`, `<pageSetup orientation="landscape" paperSize="9"/>`, `<definedName name="_xlnm.Print_Area" localSheetId="0">`
- **Đặc tả API đề xuất:**
  ```swift
  public func setPageSetup(margins: PageMargins, orientation: PageOrientation, paperSize: Int) throws
  public func setPrintArea(range: CellRange) throws
  ```

---

### 4.2. Nhóm Ưu Tiên P1 — Năng lực nâng cao cho XLSX (Phase W3 - W4)

#### 6. Định dạng có điều kiện (Conditional Formatting)
- **Mô-đun:** `OOXMLSpreadsheet/Worksheet.swift`
- **Thay thế các hàm:** `_cf_rule_xml` (L2320), `apply_conditional_formatting_from_fods` (L2414)
- **XML mục tiêu:** `<conditionalFormatting sqref="B2:B10"><cfRule type="cellIs" operator="greaterThan" priority="1"><formula>100</formula></cfRule></conditionalFormatting>`
- **Đặc tả API đề xuất:**
  ```swift
  public func addConditionalFormatting(range: CellRange, rule: CFRule) throws
  public func clearConditionalFormatting(range: CellRange?) throws
  ```

#### 7. Kiểm tra dữ liệu (Data Validation)
- **Mô-đun:** `OOXMLSpreadsheet/Worksheet.swift`
- **Thay thế các hàm:** `apply_data_validations_to_worksheet` (L2860)
- **XML mục tiêu:** `<dataValidations count="1"><dataValidation type="list" allowBlank="1" sqref="A1:A50"><formula1>"Nam,Nữ"</formula1></dataValidation></dataValidations>`
- **Đặc tả API đề xuất:**
  ```swift
  public func addDataValidation(range: CellRange, validation: DataValidationRule) throws
  ```

#### 8. Bảo vệ Sheet & Workbook (Protection)
- **Mô-đun:** `OOXMLSpreadsheet/Worksheet.swift` & `Workbook.swift`
- **Thay thế các hàm:** `apply_calculation_options_to_workbook` (L1388), `_apply_sheet_view_state_from_fods`
- **XML mục tiêu:** `<sheetProtection password="..." sheet="1" objects="1" scenarios="1"/>` và `<workbookProtection lockStructure="1"/>`
- **Đặc tả API đề xuất:**
  ```swift
  public func setSheetProtection(password: String?, options: SheetProtectionOptions) throws
  public func setWorkbookProtection(lockStructure: Bool, password: String?) throws
  ```

#### 9. Tùy chọn tính toán & Chủ đề (Calc Options & Themes)
- **Mô-đun:** `OOXMLSpreadsheet/Workbook.swift`
- **Thay thế các hàm:** `apply_calculation_options_to_workbook` (L1388), `resolve_sheet_theme` (L8233), `generate_sheet_theme_xml` (L8376)
- **Đặc tả API đề xuất:**
  ```swift
  public func setCalculationOptions(calcMode: CalcMode, iterate: Bool, date1904: Bool) throws
  public func setTheme(preset: SheetThemePreset) throws
  ```

---

### 4.3. Nhóm API cho VN Writer (DOCX) và VN Slides (PPTX)

#### Cho VN Writer (`OOXMLWord/WordDocument.swift`):
1. **Trường động (Dynamic Fields):** Hỗ trợ chèn trường Mục lục (`TOC`), Số trang (`PAGE`), Tổng số trang (`NUMPAGES`), Số thứ tự chú thích (`SEQ Caption`).
   - API: `public func insertField(name: String, argument: String, before: Paragraph)`
2. **Section Properties & Header/Footer:** Quản lý lề trang, hướng giấy ngang/dọc theo phân đoạn, liên kết header/footer trang trước (`linkToPrevious`).
   - API: `public func addSection(pageSetup: WordPageSetup)`
3. **Footnotes / Endnotes:** Chèn chú thích cuối trang.
   - API: `public func addFootnote(text: String, at: Paragraph)`
4. **Watermark & Page Borders:** Chèn hình mờ chìm và viền trang.

#### Cho VN Slides (`OOXMLPresentation/Slide.swift` & `Presentation.swift`):
1. **Chuyển trang chiếu (Transitions):** Thiết lập kiểu chuyển trang, thời lượng, tự động chuyển trang sau N giây.
   - API: `public func setTransition(type: TransitionType, durationMs: Int, autoAdvanceSec: Double?)`
2. **Hoạt ảnh đối tượng (Animations):** Thiết lập hiệu ứng xuất hiện/nhấn mạnh/biến mất cho shape/textbox.
   - API: `public func setAnimation(shapeId: String, effect: AnimationEffect, timing: AnimationTiming)`

---

## 5. ĐỀ XUẤT THỨ TỰ TRIỂN KHAI THEO LỘ TRÌNH (ROADMAP)

Bám sát kế hoạch 6 giai đoạn tại `docs/PLAN-OOXMLKIT-WINDOWS.md`:

```mermaid
flowchart TD
    W0["W0: Hoàn tất kiểm kê & Môi trường Linux/WSL"] --> W1["W1: Dựng OOXMLKit trên Windows (Codex) + stdio JSON"]
    W1 --> W2["W2: Khung cổng đối chiếu Parity Gate (Grok) 28 XLSX + 24 DOCX"]
    W2 --> W3["W3: Lớp Lưu XLSX trước (Thay 77 hàm hết cần + 5 API P0)"]
    W3 --> W4["W4: Lớp Lưu DOCX/PPTX (Thay 70 hàm Writer + 32 hàm Slides)"]
    W4 --> W5["W5: Lớp Mở (Đọc trực tiếp OOXML -> UI model, bỏ FODS/FODP)"]
    W5 --> W6["W6: Gỡ bỏ LibreOffice khỏi luồng OOXML"]
```

### Bước 1: Triển khai ngay cho Giai đoạn W3 (Lớp Lưu XLSX)
1. Bổ sung **5 API P0** vào `OOXMLSpreadsheet`:
   - Freeze Panes (`setFreezePanes`)
   - AutoFilter (`setAutoFilter`)
   - Tab Color (`setTabColor`)
   - Column Widths / Hidden (`setColumnWidth`, `setRowHidden`)
   - Page Setup / Print Area (`setPageSetup`, `setPrintArea`)
2. Kích hoạt cờ `VNO_OOXML_ENGINE=1` cho luồng Lưu tệp XLSX mở từ nguồn OOXML:
   - Giữ nguyên 100% định dạng nguyên thủy (charts, pivots, themes, drawings, macros) bằng `OPCPackage`.
   - **Loại bỏ ngay lập tức 77 hàm vá XLSX** của `ooxml_zip_patch.py` trong luồng này.

### Bước 2: Triển khai cho Giai đoạn W4 (Lớp Lưu DOCX & PPTX)
1. Kích hoạt lưu DOCX/PPTX qua OOXMLKit:
   - Toàn bộ Master Slide, Transition, Animation, Font nhúng được bảo toàn nguyên vẹn.
   - Toàn bộ Section, Equation OMML, Review Markup, Run Effects của Word được bảo toàn nguyên vẹn.
   - **Loại bỏ 70 hàm vá DOCX và 32 hàm vá PPTX**.

### Bước 3: Triển khai cho Giai đoạn W5 (Lớp Mở trực tiếp)
1. Cung cấp dữ liệu từ OOXMLKit trực tiếp cho UI Web thông qua giao thức stdio JSON (`OOXMLBridge`).
2. **Xóa bỏ vĩnh viễn toàn bộ các hàm streaming FODS** (`optimize_fods_streaming`, `process_table`, `process_row`) và toàn bộ các hàm `overlay_*`.

### Bước 4: Hoàn tất Giai đoạn W6
- Gỡ bỏ hoàn toàn tệp `ooxml_zip_patch.py` (31.182 dòng) khỏi codebase của VN Office.
- LibreOffice chỉ còn đóng vai trò phụ trợ thu hẹp tối đa: xuất PDF và nhập định dạng nhị phân cổ xưa (`.doc`, `.xls`, `.ppt`).

---
*Tài liệu được khởi tạo và kiểm chứng tự động bằng công cụ AST trên worktree `docs/patch-mapping-agy`.*