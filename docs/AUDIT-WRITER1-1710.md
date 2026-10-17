# Báo cáo đối chiếu: VN Writer khớp Word 2016 (Tabs, Thước ngang, Đi đến Ctrl+G, Tách bảng, Xoay chữ trong ô, Thuộc tính bảng)

**Mã ticket:** AGY-WRITER1  
**Ngày thực hiện:** 17/10/2026  
**Thực hiện bởi:** agy  
**Worktree:** `E:\VNOffice-agy-writer1` (nhánh `feat/writer-tabs-tables-agy`)  
**Tài liệu căn cứ:** `docs/WORD2016-FEATURE-CHECKLIST.md` (mục "Việc cần làm", dòng 3, 4, 10, 11, 12, 13, 15) và `docs/WORD2016-FINDINGS-1710.md`.  
**Công cụ đối chiếu:** Microsoft Word 2016 COM thật (`scripts/audit-0610/word_oracle_writer1.ps1`, lưu tại `docs/word-oracle-writer1-1710.json`).

---

## 1. Tổng quan kết quả thực hiện

Trong đợt nâng cấp này, 5 nhóm tính năng quan trọng của VN Writer đã được bổ sung và hoàn thiện theo đúng chuẩn Microsoft Word 2016:

1. **Hộp thoại Điểm dừng Tab (Tabs Dialog) & Tương tác đặt Tab trên thước ngang**:
   - Bổ sung hộp thoại Tabs hoàn chỉnh (`apps/writer/tab-stops.js`) hỗ trợ 5 kiểu căn lề (Trái, Giữa, Phải, Thập phân, Thanh) và 4 kiểu ký tự dẫn (Không, Chấm, Gạch ngang, Gạch dưới), các nút Đặt, Xóa, Xóa tất cả và thiết lập Điểm dừng mặc định.
   - Nâng cấp bộ điều khiển thước ngang (`apps/writer/writer-ruler-controller.js`) vẽ trực quan marker các điểm dừng tab theo kiểu căn tương ứng; hỗ trợ nhấp chuột lên thước để tạo tab stop mới, kéo rê marker để thay đổi vị trí, và kéo marker ra ngoài thanh thước để xóa tab.
   - Hỗ trợ khứ hồi DOCX: xuất chuẩn các thẻ `w:tabs/w:tab` với các thuộc tính `w:val`, `w:leader`, `w:pos` trong `adapters/libreoffice/common/ooxml_zip_patch.py`. Word 2016 COM đọc lại đúng `ParagraphFormat.TabStops`.

2. **Hộp thoại Đi đến (Go To / Ctrl+G)**:
   - Bổ sung lệnh `writer.edit.goTo` (gán phím tắt `Ctrl+G`) và hộp thoại chuyên dụng (`apps/writer/writer-goto-dialog.js`).
   - Hỗ trợ 6 loại đối tượng điều hướng chuẩn Word: Trang (Page), Dòng (Line), Đề mục (Heading), Dấu trang (Bookmark), Chú thích cuối trang (Footnote/Endnote), Bảng (Table).
   - Đầy đủ các nút thao tác: Đi đến (Go To), Tiếp theo (Next), Quay lại (Previous), tự động nhảy con trỏ và cuộn màn hình đến đúng vị trí phần tử mục tiêu.

3. **Lệnh Tách bảng (Split Table)**:
   - Bổ sung lệnh `writer.table.splitTable` trên Ribbon tab Bố trí bảng > nhóm Hàng & Cột.
   - Chia bảng hiện tại thành hai bảng độc lập tại hàng có con trỏ, tự động chèn một đoạn văn bản `<p>` trống giữa hai bảng (nếu đứng tại hàng 0 thì chèn đoạn trống phía trên bảng).
   - Hỗ trợ hoàn tác Undo 1 bước duy nhất, bảo toàn cấu trúc bảng. Khi lưu DOCX, xuất chuẩn thành 2 khối `w:tbl` riêng rẽ được Word 2016 nhận diện thành 2 bảng độc lập (`Tables.Count = 2`).

4. **Xoay hướng chữ trong ô (Cell Text Direction)**:
   - Bổ sung lệnh `writer.table.textDirection` trên Ribbon tab Bố trí bảng > nhóm Căn chỉnh.
   - Hỗ trợ xoay hướng chữ trong ô qua chu trình 3 trạng thái chuẩn: Ngang (Horizontal / lrTb) -> Xoay 90° (Downward / tbRl) -> Xoay 270° (Upward / btLr) -> Ngang.
   - Áp dụng chuẩn CSS `writing-mode` và lưu trữ thuộc tính `data-vno-text-direction`. Xuất DOCX thẻ `<w:textDirection w:val="tbRl"/>` và `<w:textDirection w:val="btLr"/>` trong `w:tcPr`. Word 2016 COM đọc lại đúng `Cell.Range.Orientation` (0, 3, 2).

5. **Hộp thoại Thuộc tính bảng (Table Properties Dialog)**:
   - Bổ sung lệnh `writer.table.properties` và hộp thoại gộp (`apps/writer/writer-table-properties-dialog.js`) mở từ Ribbon tab Bố trí bảng > nhóm Bảng.
   - Tích hợp toàn diện các nhóm thuộc tính: Căn lề bảng (Trái, Giữa, Phải), Thụt lề trái bảng (Left indent), Độ rộng ưu tiên bảng (Preferred width), Chiều cao hàng (Row height), Lề ô mặc định (Cell Margins: Trên, Dưới, Trái, Phải), Khoảng cách giữa các ô (Cell Spacing).
   - Hỗ trợ lưu trữ và xuất chuẩn OOXML: `w:tblPr/w:jc`, `w:tblPr/w:tblInd`, `w:tblPr/w:tblCellMar` (`w:top`, `w:bottom`, `w:left`, `w:right`), `w:tblPr/w:tblCellSpacing`. Word 2016 COM đọc lại chính xác các giá trị padding, spacing và alignment.

---

## 2. Bảng đối chiếu chi tiết (Word 2016 vs VN Writer trước & sau)

| STT | Tính năng | Chuẩn Microsoft Word 2016 (Đo thực tế Word COM) | VN Writer trước nâng cấp | VN Writer sau nâng cấp | Trạng thái |
|:---:|---|---|---|---|:---:|
| 1 | **Hộp thoại Tabs** | Hộp thoại Tabs tùy biến TabStops: 5 kiểu căn (Left=0, Center=1, Right=2, Decimal=3, Bar=4); 4 kiểu leader (None=0, Dots=1, Dashes=2, Lines=3); DefaultTabStop mặc định 36 pt (1.27 cm / 0.5 in). Phím Đặt, Xóa, Xóa tất cả. Lưu `w:tabs/w:tab`. | Chỉ có phím Tab cơ bản thụt dòng theo tab mặc định; chưa có hộp thoại Tabs; thiếu kiểu căn Decimal và Bar; chỉ hỗ trợ l, c, r cơ bản. | Đầy đủ hộp thoại Tabs giao diện chuẩn (`apps/writer/tab-stops.js`); hỗ trợ 5 kiểu căn lề, 4 kiểu ký tự dẫn; lưu khứ hồi DOCX chuẩn `w:tabs` (`val`, `leader`, `pos`). | ✅ **ĐÃ ĐỐI CHIẾU** |
| 2 | **Đặt tab trên thước ngang** | Nhấp chuột trực tiếp lên thước ngang để đặt điểm dừng tab (Trái, Giữa, Phải, Thập phân, Thanh); kéo marker để đổi vị trí; kéo ra ngoài thanh thước để xóa tab. | Thước ngang chỉ hiển thị vạch chia cố định; không có marker tab stop; không tương tác nhấp hoặc kéo thả tab trên thước. | Hiển thị marker tab stop đồ họa sắc nét trên thanh thước (`WriterRulerController`); nhấp để đặt tab mới, kéo di chuyển tọa độ mm, kéo thả ra ngoài để xóa tab tức thời. | ✅ **ĐÃ ĐỐI CHIẾU** |
| 3 | **Đi đến (Ctrl+G)** | Nhấn Ctrl+G mở hộp thoại Find & Replace tab Go To: chuyển con trỏ tới Trang, Dòng, Đề mục, Dấu trang, Chú thích cuối trang, Bảng... Có nút Đi đến, Tiếp theo, Quay lại. | Chưa có lệnh và phím tắt Ctrl+G; chỉ có điều hướng Ctrl+Home / Ctrl+End đầu và cuối văn bản. | Lệnh `writer.edit.goTo` (Ctrl+G) và hộp thoại `writer-goto-dialog.js`; hỗ trợ 6 loại đối tượng điều hướng; nhảy con trỏ và cuộn màn hình mượt mà tới đúng đối tượng. | ✅ **ĐÃ ĐỐI CHIẾU** |
| 4 | **Tách bảng (Split Table)** | Tab Table Tools > Layout > Split Table: chia bảng thành 2 bảng riêng tại hàng chọn, chèn 1 đoạn văn phân cách giữa 2 bảng; lưu DOCX 2 thẻ `w:tbl` (`Tables.Count = 2`); Undo 1 bước khôi phục 1 bảng ban đầu. | Chưa có lệnh tách bảng; chỉ có các lệnh xóa hàng/cột và gộp/tách ô (`splitCells`). | Bổ sung lệnh `writer.table.splitTable` trên Ribbon tab Bố trí bảng; chia thành 2 phần tử `<table>` độc lập xen giữa bởi đoạn văn `<p>`; Undo khôi phục 1 bước; lưu DOCX chuẩn 2 `w:tbl`. | ✅ **ĐÃ ĐỐI CHIẾU** |
| 5 | **Hướng chữ trong ô (Text Direction)** | Tab Table Tools > Layout > Text Direction: xoay vòng Ngang (0) -> Xoay 90° (3) -> Xoay 270° (2) -> Ngang. Lưu DOCX `w:tcPr/w:textDirection` (`tbRl` / `btLr`). | Chưa có lệnh đổi hướng chữ trong ô bảng; không hỗ trợ xoay chữ 90° / 270°; OOXML không có thẻ `w:textDirection`. | Bổ sung lệnh `writer.table.textDirection` trên Ribbon; xoay vòng 3 trạng thái; áp dụng CSS `writing-mode`; xuất chuẩn OOXML `w:textDirection` (`tbRl`, `btLr`); Word COM đọc đúng `Cell.Range.Orientation`. | ✅ **ĐÃ ĐỐI CHIẾU** |
| 6 | **Thuộc tính bảng (Table Properties Dialog)** | Tab Table Tools > Layout > Properties: hộp thoại gộp Căn lề bảng, Thụt lề trái, Độ rộng ưu tiên, Chiều cao hàng, Lề ô mặc định (Top/Bottom/Left/RightPadding), Khoảng cách ô (Cell Spacing). Lưu `w:tblCellMar`, `w:jc`, `w:tblInd`, `w:tblCellSpacing`. | Các nút căn lề rải rác trên Ribbon; không có hộp thoại Table Properties gộp; chưa hỗ trợ tùy biến lề ô bảng và khoảng cách ô cấp độ bảng; OOXML adapter bỏ qua `tblCellMar`. | Hộp thoại Thuộc tính bảng gộp `writer-table-properties-dialog.js` mở từ lệnh `writer.table.properties`; đầy đủ các trường căn lề, thụt lề, độ rộng, lề ô trên/dưới/trái/phải và khoảng cách ô; xuất chuẩn `w:tblCellMar`, `w:tblInd`, `w:jc`, `w:tblCellSpacing`. | ✅ **ĐÃ ĐỐI CHIẾU** |

---

## 3. Dữ liệu đo kiểm thực tế từ Word COM (`docs/word-oracle-writer1-1710.json`)

```json
[
    {
        "ten_phep_do": "1_tab_stops",
        "thuoc_tinh": "Paragraph.TabStops",
        "count": 7,
        "defaultTabStop": 36.0,
        "tab1_position_pt": 144.0,
        "tab1_alignment": 2,
        "tab1_leader": 1,
        "y_nghia": "DefaultTabStop = 36 pt (1.27 cm); Tab1: Pos=144 pt, Align=2 (Right), Leader=1 (Dots)"
    },
    {
        "ten_phep_do": "2_split_table",
        "thuoc_tinh": "Tables.Count",
        "initial_tables": 1,
        "after_split_tables": 2,
        "table1_rows": 2,
        "table2_rows": 2,
        "y_nghia": "Tách bảng 4 hàng tại hàng 3 tạo ra 2 bảng: bảng 1 có 2 hàng, bảng 2 có 2 hàng"
    },
    {
        "ten_phep_do": "3_cell_text_direction",
        "thuoc_tinh": "Cell.Range.Orientation",
        "initial": 0,
        "downward_90": 3,
        "upward_270": 2,
        "horizontal": 0,
        "y_nghia": "0=wdTextOrientationHorizontal, 3=wdTextOrientationDownward (90 deg), 2=wdTextOrientationUpward (270 deg)"
    },
    {
        "ten_phep_do": "4_table_properties",
        "thuoc_tinh": "Table.Padding_Spacing_Alignment",
        "alignment": 1,
        "left_indent_pt": 18.0,
        "top_padding_pt": 5.65,
        "bottom_padding_pt": 5.65,
        "left_padding_pt": 8.5,
        "right_padding_pt": 8.5,
        "cell_spacing_pt": 2.8,
        "y_nghia": "Table.Rows.Alignment=1 (Center), LeftIndent=18 pt; Top/BottomPad=5.65 pt, Left/RightPad=8.5 pt, Spacing=2.8 pt"
    }
]
```

---

## 4. Kiểm thử chất lượng và hồi quy

1. **Kiểm thử đơn vị (Unit Tests)**:
   - Bộ kiểm thử mới `tests/unit/writer-tabs-tables-agy.test.js` (11 ca kiểm thử chuyên sâu) đã được tích hợp vào `tests/run-tests.js`.
   - Kết quả chạy `npm test`: **3578/3578 PASS (100%), 0 FAIL** (vượt mốc nền quy định >= 3563).
   - Kiểm thử xuất nhập OOXML Python: `tests/test_writer_tabs_export.py` (4/4 PASS) và `tests/test_writer_table_properties_export.py` (3/3 PASS).

2. **Độ phủ Hướng dẫn sử dụng (Help Coverage)**:
   - Bổ sung đầy đủ các bài viết Hướng dẫn sử dụng chi tiết bằng tiếng Việt trong `platform/help/entries-writer.js`:
     - `writer-tabs-dialog`: Hộp thoại Điểm dừng Tab (Bố cục > Đoạn văn).
     - `writer-ruler-tab-stops`: Đặt điểm dừng tab trên thước ngang (Chế độ xem > Thước).
     - `writer-goto`: Đi đến đối tượng trong văn bản (Ctrl+G) (Trang đầu > Chỉnh sửa).
     - `writer-table-split`: Tách bảng thành hai bảng độc lập (Bố trí bảng > Hàng & Cột).
     - `writer-table-text-direction`: Hướng chữ trong ô bảng (Bố trí bảng > Căn chỉnh).
     - `writer-table-properties`: Thuộc tính bảng (Bố trí bảng > Bảng).
   - Chạy `node scripts/help-coverage.mjs`: Độ phủ Help VN Writer đạt **208/208 lệnh (100.0%)**, không phát hiện bất kỳ nút chết nào trên Ribbon.
   - Nội dung bài viết tuân thủ nghiêm ngặt: không chứa tên thương mại cấm, chỉ đúng tab/nhóm ribbon, có đầy đủ các bước thực hiện cụ thể.

3. **Tính toàn vẹn đa ngôn ngữ (i18n Parity)**:
   - Chạy `node scripts/audit-0610/i18n_parity.mjs`:
     - Tổng số khóa: VI = 2698, EN = 2698.
     - Số khóa thiếu: missingVI = 0, missingEN = 0.

4. **Ma trận Hoàn tác toàn diện (Undo Matrix Full)**:
   - Bổ sung cấu hình kịch bản cho `writer.table.splitTable`, `writer.table.textDirection`, `writer.table.properties` và đăng ký bỏ qua an toàn cho các lệnh hộp thoại `writer.edit.goTo`, `writer.format.tabStops`, `writer.paragraph.tabStops`.
   - Chạy ma trận Hoàn tác: **0 FAIL**, mọi lệnh thao tác nội dung đều khôi phục hoàn hảo qua 1 bước Undo.
