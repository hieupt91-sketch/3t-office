# FIX-S12 results

## Nhóm Trang đầu: căn ngang

- Chạy app Sheet desktop từ worktree này trên fixture `tests/live/cdp/test_sheet_home.xlsx`; CDP thao tác nút ribbon bằng chuột, mỗi lệnh lưu thành một XLSX riêng.
- Căn giữa: `app_alignCenter.xlsx`, Excel COM mở `ReadOnly=true`, ô B2 `HorizontalAlignment=-4108` (center). **KHỚP EXCEL**.
- Căn phải: `app_alignRight.xlsx`, Excel COM mở `ReadOnly=true`, ô B2 `HorizontalAlignment=-4152` (right). **KHỚP EXCEL**.
- Ảnh CDP: `evidence/s12/fix-s12-alignCenter.png`, `evidence/s12/fix-s12-alignRight.png`.
- Nút Ngắt dòng tự động đã chạy CDP và lưu `app_wrap.xlsx`; Excel đọc `WrapText=0`, giống fixture gốc. Chưa xác nhận được kết quả bật ngắt dòng nên vẫn **CHƯA ĐỐI CHIẾU**; ảnh `evidence/s12/fix-s12-wrap.png`. Fixture gốc được mở read-only riêng và B2 cũng có `WrapText=0`.

### Kiểm chứng

- **PASS** — ba thao tác CDP lưu XLSX riêng; log ở profile audit `s12-home-format.log`.
- **PASS** — Excel COM chỉ đọc xác nhận căn giữa và căn phải; log `s12-home-format-excel.log`, `excel-alignRight.log`.
- **CHƯA ĐỐI CHIẾU** — nút Ngắt dòng: readback khớp trạng thái fixture nên chưa chứng minh thao tác đổi trạng thái.

## Nhóm Trang đầu: định dạng số

- Nút Phần trăm: thao tác CDP trên D2; Excel COM chỉ đọc xác nhận `Value2=0.075`, `NumberFormat=0%`, hiển thị `8%`. **KHỚP EXCEL**. Ảnh `evidence/s12/fix-s12-percentBtn.png`.
- Nút Tăng số thập phân: thao tác CDP trên C2; Excel COM chỉ đọc xác nhận `Value2=1234.5`, `NumberFormat=0.00`, hiển thị `1234.50`. **KHỚP EXCEL**. Ảnh `evidence/s12/fix-s12-decInc.png`.
- Lựa chọn trong danh sách Định dạng số chưa được xác nhận bằng UI/readback và vẫn **CHƯA ĐỐI CHIẾU**.

### Kiểm chứng nhóm định dạng số

- **PASS** — hai thao tác CDP lưu XLSX riêng; log `s12-format-buttons.log` trong profile audit.
- **PASS** — Excel COM ReadOnly xác nhận NumberFormat cho `app_S12_percentBtn.xlsx` và `app_S12_decInc.xlsx`; log `excel-percentBtn.log`, `excel-decInc.log`.
- **NOT RUN** — chưa chạy bộ kiểm thử tổng (`npm test`, unittest và batch XLSX); sẽ chạy khi hoàn tất lượt rà soát.

## Tab Dữ liệu: sắp xếp Z-A

- CDP chọn ô B2, bấm Sắp xếp Z-A và lưu riêng `app_S12_sortDesc.xlsx`.
- Excel COM ReadOnly xác nhận thứ tự B2:B6: `Trần Thị B / Phạm Thị D / Nguyễn Văn A / Lê Văn C / Hoàng Văn E`, đúng thứ tự giảm dần theo thao tác; **KHỚP EXCEL**.
- Ảnh UI: `evidence/s12/fix-s12-sortDesc.png`; log CDP `s12-sort-desc.log`, Excel COM `excel-sortDesc.log` trong profile audit.
- Danh sách Định dạng số qua CDP bàn phím chưa được xác nhận: probe XLSX vẫn đọc `General`; giữ CHƯA ĐỐI CHIẾU, không tính các probe này là bằng chứng.

## Tab Công thức: Trung bình

- Probe đầu phát hiện C7 nhận sai `=AVERAGE(C3:C6)`, bỏ số ở C2. Excel hướng dẫn AutoAverage nhận dải số liền kề; đã sửa `insertFormula` để quét dải số liên tục phía trên ô đang chọn.
- Sau sửa, CDP bấm Trung bình tại C7 tạo `=AVERAGE(C2:C6)`. Excel COM ReadOnly đọc lại công thức và tính `Value2=4123.02`; **KHỚP EXCEL**. AutoSum cùng điểm chọn tạo `=SUM(C2:C6)`, Excel đọc `Value2=20615.1`.
- Ảnh: `evidence/s12/fix-s12-averageBtn.png`, `evidence/s12/fix-s12-autoSum.png`. Log CDP `s12-formula-buttons-fixed.log`; Excel COM `excel-averageBtn-fixed.log`, `excel-autoSum-fixed.log`.
- Hướng dẫn range detection của Excel: [Calculate the average of a group of numbers](https://support.microsoft.com/en-us/excel/calculate-the-average-of-a-group-of-numbers).
- **PASS** — focused unit tests cho range liền kề và dừng tại ô không phải số. **NOT RUN** — npm test, unittest tổng, batch XLSX và quét mã hóa (chạy khi hoàn tất lượt rà soát).

## Tab Công thức: Đếm số

- CDP bấm Đếm số tại C7; app tạo `=COUNT(C2:C6)`. Excel COM ReadOnly xác nhận công thức và `Value2=5`; **KHỚP EXCEL**.
- Ảnh `evidence/s12/fix-s12-countNumbersBtn.png`; log CDP `s12-count-numbers.log`, Excel COM `excel-countNumbersBtn.log` trong profile audit.

## Trang đầu: tăng/giảm cỡ chữ

- Tăng cỡ chữ trên B2 từ 11 lên 12 pt; Excel COM ReadOnly xác nhận `Font.Size=12`.
- Giảm cỡ chữ ban đầu không đổi 11 pt do quy đổi 14.67 px thành 11.0025 pt, rồi chọn lại nấc 11. Đã làm tròn điểm hiện tại trước khi chọn nấc; sau sửa B2 giảm còn 10 pt trong Excel.
- Ảnh: `evidence/s12/fix-s12-fontGrow.png`, `evidence/s12/fix-s12-fontShrink.png`. Log CDP `s12-fontsize.log`, `s12-font-shrink-fixed.log`; Excel COM `excel-fontGrow.log`, `excel-fontShrink-fixed.log`.
- **PASS** — focused unit suite gồm 3 kiểm tra range AutoSum/AutoAverage và bước giảm cỡ chữ.

## Trang đầu: lệnh trộn ô

- CDP chọn A8:B8 rồi lần lượt bấm Trộn theo hàng và Trộn ô trên fixture riêng.
- Excel COM ReadOnly mở từng XLSX và xác nhận `A8.MergeCells=True` cho cả hai lệnh; **KHỚP EXCEL**.
- Ảnh `evidence/s12/fix-s12-mergeAcross.png`, `evidence/s12/fix-s12-mergeCells.png`; log CDP `s12-merge.log`, Excel COM `excel-mergeAcross.log`, `excel-mergeCells.log`.

## Trang đầu: căn dọc (chưa kết luận)

- Đã thử Căn trên, Căn giữa dọc và Căn dưới bằng CDP trên B2. Excel COM ReadOnly cả ba file đều cho `VerticalAlignment=-4107` (Bottom), trùng trạng thái fixture và app model `verticalAlign=bottom`.
- Ảnh probe cho thấy tab Dữ liệu đang hiện sau thao tác. Harness đã được chỉnh để mở nhóm ribbon thu gọn và đợi tab yêu cầu hoạt động; lần lặp vẫn không chứng minh được lệnh đã thực thi.
- Ba command ID vẫn **CHƯA ĐỐI CHIẾU**; không dùng phản ứng `clicked` làm bằng chứng. Ảnh `evidence/s12/fix-s12-alignTop.png`, `fix-s12-alignMiddle.png`, `fix-s12-alignBottom.png`; log `s12-vertical-align-retry.log`, `excel-alignTop-retry.log`, `excel-alignMiddle-retry.log`, `excel-alignBottom-retry.log`.

## Bố trí trang: Xóa vùng in — lệch đã biết

- Đặt vùng in A1 qua UI/CDP; Excel COM ReadOnly xác nhận tệp đầu có `PrintArea='$A$1'`.
- Mở chính XLSX đó trong app, bấm Xóa vùng in. App model sau click có `printAreaBySheet.Sheet1=null`; Excel COM ReadOnly trên XLSX lưu sau đó vẫn thấy `PrintArea='$A$1'`. **LỆCH ĐÃ BIẾT**.
- Ảnh thao tác xóa: `evidence/s12/fix-s12-clearArea.png`; log CDP `s12-clear-area-retry.log`, Excel COM `excel-clearArea-retry.log`.
- Đường ghi/xuất thuộc `adapters/**`; đã tạo handoff riêng cho owner adapter, không sửa chéo ownership trong lượt này.

## Trang đầu: Giảm thụt lề — lệch đã biết

- Bấm Tăng thụt lề trên B2, lưu XLSX; Excel COM ReadOnly xác nhận `IndentLevel=1`.
- Mở XLSX đó, bấm Giảm thụt lề qua CDP; app model thành `indentLevel=0`, nhưng Excel COM ReadOnly trên XLSX sau lưu vẫn cho `IndentLevel=1`. **LỆCH ĐÃ BIẾT**.
- Ảnh `evidence/s12/fix-s12-indentDecrease.png`; log CDP `s12-indent-decrease.log`, Excel COM `excel-indent-decrease.log`.
- Adapter owner handoff: `docs/AGENT-HANDOFF-FIX-S12-INDENT-DECREASE.md`.

## Trang đầu: giảm số thập phân

- CDP bấm Giảm số thập phân trên C2; Excel COM ReadOnly đọc `Value2=1234.5`, `NumberFormat=0`, hiển thị `1235`. Giá trị giữ nguyên, định dạng giảm còn 0 chữ số thập phân; **KHỚP EXCEL**.
- Ảnh `evidence/s12/fix-s12-decDec.png`; log CDP `s12-decimal-decrease.log`, Excel COM `excel-decDec.log`.

## Trang đầu: Tách ô

- Mở XLSX đã tạo bằng nút Trộn ô (A8:B8 merged), CDP bấm Tách ô tại A8.
- Excel COM ReadOnly trên tệp lưu sau đó xác nhận `A8.MergeCells=False`; **KHỚP EXCEL**.
- Ảnh `evidence/s12/fix-s12-unmerge.png`; log CDP `s12-unmerge.log`, Excel COM `excel-unmerge.log`.

## Trang đầu: màu nền, màu chữ và viền

- CDP bấm Màu nền, Màu chữ và Viền trên B2, mỗi lệnh lưu XLSX riêng.
- Excel COM ReadOnly xác nhận màu nền `Interior.Color=65535` (vàng), màu chữ `Font.Color=255` (đỏ), và viền trên/dưới/trái/phải đều `LineStyle=1`. **KHỚP EXCEL**.
- Ảnh: `evidence/s12/fix-s12-fillDefault.png`, `fix-s12-textColorDefault.png`, `fix-s12-bordersDefault.png`. Log CDP `s12-home-colors.log`; Excel COM `excel-fillDefault.log`, `excel-textColorDefault.log`, `excel-bordersDefault.log`.

## Tab Công thức: MAX và MIN

- CDP bấm MAX và MIN riêng trên C7; Excel COM ReadOnly đọc `=MAX(C2:C6)` = `9876.5` và `=MIN(C2:C6)` = `1234.5`. **KHỚP EXCEL**.
- Ảnh `evidence/s12/fix-s12-maxBtn.png`, `fix-s12-minBtn.png`; log CDP `s12-max-min.log`, Excel COM `excel-maxBtn.log`, `excel-minBtn.log`.

## Chế độ xem: Đường lưới và Tiêu đề — lệch đã biết

- CDP bấm Đường lưới và Tiêu đề riêng từng fixture. App model xác nhận `gridlinesVisible=false` và `headingsVisible=false` tương ứng.
- Excel COM ReadOnly cho cả hai XLSX vẫn báo `DisplayGridlines=1`, `DisplayHeadings=1`; **LỆCH ĐÃ BIẾT** cho cả hai command ID.
- Ảnh `evidence/s12/fix-s12-gridlines.png`, `fix-s12-headings.png`; CDP `s12-gridlines-retry.log`, `s12-headings-retry.log`; Excel COM `excel-gridlines-retry.log`, `excel-headings-retry.log`.
- Adapter owner handoff: `docs/AGENT-HANDOFF-FIX-S12-VIEW-STATE.md`.
- Danh sách Cỡ chữ thử chọn 16 bằng chuột/phím CDP nhưng control giữ 11; Excel COM cũng đọc 11 pt. Chưa có bằng chứng thay đổi nên `sheet.font.size` vẫn **CHƯA ĐỐI CHIẾU**. Log `s12-font-size-select.log`, `excel-size16.log`; ảnh `evidence/s12/fix-s12-size16.png`.

## Trang dau: Tien te VNĐ

- CDP bam nut Tien te VNĐ tren C2; app luu XLSX rieng `app_S12_currencyBtn.xlsx`.
- Excel COM ReadOnly doc lai `Value2=1234.5`, `NumberFormat=#,##0 [$₫]`, hien thi `1,235 ₫`; **KHOP EXCEL**. Log CDP `s12-currency.log`, Excel COM `excel-currencyBtn.log` trong profile audit; anh `evidence/s12/fix-s12-currencyBtn.png`.

## Trang dau: Can trai

- CDP bam Can trai tai B2; app luu XLSX `app_S12_alignLeft.xlsx`.
- Excel COM ReadOnly xac nhan `HorizontalAlignment=-4131`; **KHOP EXCEL**. Log `s12-alignLeft.log`, `excel-alignLeft.log`; anh `evidence/s12/fix-s12-alignLeft.png`.

## Trang đầu: probe điều khiển lựa chọn

- Thử chọn `number` qua danh sách Định dạng số: UI báo select đã đóng trước khi đọc lại; model giữ trạng thái cũ, Excel COM đọc `NumberFormat=General`. **CHƯA ĐỐI CHIẾU**. Log `s12-numNumber.log`, `excel-numNumber.log`.
- Thử chọn Arial: UI báo giá trị Calibri dù hướng phím nhắm Arial; model và Excel COM vẫn Calibri. **CHƯA ĐỐI CHIẾU**. Log `s12-fontArial.log`, `excel-fontArial.log`.

## Chế độ xem: thu phóng — lệch đã biết

- CDP bấm Phóng to/Thu nhỏ; ảnh xác nhận giao diện lần lượt 110%/90%.
- Excel COM ReadOnly mở từng XLSX và đọc `ActiveWindow.Zoom=100` ở cả hai. `sheet.view.zoomIn` và `sheet.view.zoomOut` là **LỆCH ĐÃ BIẾT**; log `s12-zoomIn.log`, `s12-zoomOut.log`, `excel-zoomIn.log`, `excel-zoomOut.log`; ảnh `evidence/s12/fix-s12-zoomIn.png`, `fix-s12-zoomOut.png`.

- Cùng nhóm chế độ xem, CDP bấm Thanh công thức làm ẩn thanh trên UI; Excel COM ReadOnly vẫn đọc `DisplayFormulaBar=1`. `sheet.view.formulaBar` là **LỆCH ĐÃ BIẾT**; log `s12-formulaBar.log`, `excel-formulaBar.log`; ảnh `evidence/s12/fix-s12-formulaBar.png`.

- CDP bật Xem ngắt trang và Bố trí trang; ảnh lần lượt cho thấy vùng in có watermark/ngắt trang và vùng đầu/cuối trang. Excel COM ReadOnly đọc `ActiveWindow.View=1` (Normal) cho cả hai XLSX. `sheet.view.pageBreakPreview`, `sheet.view.pageLayout` là **LỆCH ĐÃ BIẾT**; log `s12-pageBreakPreview.log`, `s12-pageLayoutView.log`, `excel-pageBreakPreview.log`, `excel-pageLayoutView.log`; ảnh tương ứng trong `evidence/s12/`.

- Nút Hiện công thức hiển thị công thức trong lưới qua CDP; Excel COM ReadOnly đọc `ActiveWindow.DisplayFormulas=0`. `sheet.formula.showFormulas` là **LỆCH ĐÃ BIẾT**; log `s12-showFormulas.log`, `excel-showFormulas.log`; ảnh `evidence/s12/fix-s12-showFormulas.png`.

## Dữ liệu: Tách văn bản thành cột

- CDP chọn B2:B6, chọn dấu cách trong hộp thoại Tách văn bản và áp dụng.
- Excel COM ReadOnly xác nhận B2:D6 lần lượt `Nguyễn|Văn|A`, `Trần|Thị|B`, `Lê|Văn|C`, `Phạm|Thị|D`, `Hoàng|Văn|E`; **KHỚP EXCEL**. Log `s12-textToColumns.log`, `excel-textToColumns.log`; ảnh `evidence/s12/fix-s12-textToColumns.png`.

## Dữ liệu: Điền nhanh

- CDP nhập ví dụ `A`, `B` cạnh tên ở J2:J6, chọn K2:K6 và bấm Điền nhanh.
- Excel COM ReadOnly xác nhận K2:K6=`A/B/C/D/E`, khớp chữ cái cuối của tên nguồn; **KHỚP EXCEL**. Log `s12-flashFill.log`, `excel-flashFill.log`; ảnh `evidence/s12/fix-s12-flashFill.png`.

## Dữ liệu: Bảng tổng hợp Pivot

- CDP chọn A1:C6, đặt Họ tên vào Hàng và Số tiền vào Giá trị (SUM), tạo Pivot trên trang tính mới.
- Excel COM ReadOnly xác nhận `Sheet1 (2).PivotTables.Count=1`; trang tổng hợp có Họ tên/SUM Số tiền và giá trị từng người khớp nguồn; **KHỚP EXCEL**. Log `s12-pivotTable.log`, `excel-pivotTable.log`; ảnh `evidence/s12/fix-s12-pivotTable.png`.

## Dữ liệu: Làm mới Pivot — lệch đã biết

- Mở XLSX có Pivot đã tạo, đổi nguồn C2 từ 1234.5 thành 2222 qua CDP rồi bấm Làm mới Pivot.
- Excel COM xác nhận C2 nguồn=2222 nhưng Pivot vẫn có Nguyễn Văn A=1234.5, lặp thêm các hàng Trần/Phạm và Total Result=20615.1; **LỆCH ĐÃ BIẾT**. Log `s12-pivotRefresh.log`, `excel-pivotRefresh.log`; ảnh `evidence/s12/fix-s12-pivotRefresh.png`.
- Handoff cho adapter owner: `docs/AGENT-HANDOFF-FIX-S12-PIVOT-REFRESH.md`.

## Dữ liệu: Nhóm/Bỏ nhóm hàng

- CDP chọn hàng 2:6 bằng tiêu đề hàng, bấm Nhóm và lưu; Excel COM ReadOnly xác nhận `OutlineLevel=2`. Mở XLSX đó, chọn lại hàng 2:6 và bấm Bỏ nhóm; Excel COM xác nhận `OutlineLevel=1`. **KHỚP EXCEL**. Log `s12-groupRows.log`, `excel-groupRows.log`, `s12-ungroupRows.log`, `excel-ungroupRows.log`; ảnh `evidence/s12/fix-s12-groupRows.png`, `fix-s12-ungroupRows.png`.

## Dữ liệu: Tổng phụ

- CDP tạo hai tên Nguyễn Văn A liền nhau ở B2:B3, chọn A1:C6, dùng nhóm Họ tên và SUM Số tiền.
- Excel COM ReadOnly xác nhận tổng Nguyễn Văn A=`6913.4`, các nhóm còn lại đúng giá trị nguồn và Grand Total=`20615.1`; **KHỚP EXCEL**. Log `s12-subtotal.log`, `excel-subtotal.log`; ảnh `evidence/s12/fix-s12-subtotal.png`.

## Dữ liệu: Hợp nhất dữ liệu

- CDP chọn M1, thêm hai vùng cùng kích thước A2:C3 và A4:C5, dùng SUM, bỏ chọn nhãn hàng/cột.
- Excel COM ReadOnly đọc M1:O2=`4|0|3702.5` và `6|0|7036.1`, đúng tổng theo vị trí hai vùng nguồn; **KHỚP EXCEL**. Log `s12-consolidate.log`, `excel-consolidate.log`; ảnh `evidence/s12/fix-s12-consolidate.png`.

## Trang đầu: probe ribbon chưa kết luận

- Thử lại Căn trên và Ngắt dòng qua CDP sau khi chờ panel ribbon mới render; thao tác vẫn để ribbon chuyển sang tab khác và model/Excel giữ căn dưới, WrapText=0. Hai command tiếp tục **CHƯA ĐỐI CHIẾU**; chưa coi sự kiện click là bằng chứng. Log `s12-alignTop-tabfix.log`, `excel-alignTop-tabfix.log`, `s12-wrap-tabfix.log`.
- Runner hiện chờ `tabpanel` đúng tab và tìm command bên trong panel đó; cần xác nhận cách chọn nút sau khi đổi tab trước khi dùng cho các probe Trang đầu còn lại.


## S12 final validation (2026-10-12)

- PASS: `npm test` — 3079/3079 PASS, 0 FAIL (`npm-test.log`).
- FAIL: `python -m unittest discover -s tests` — 871 tests; first run had one Writer HTML import error (`status=error`). The focused `test_writer_tables_import.py` rerun passed 3/3. A serial full rerun had one unrelated updater cleanup error: `test_detached_helper_process_runs_from_a_path_with_spaces` could not remove its temporary update directory (WinError 32/5); 871 tests ran (`unittest-serial.log`).
- PASS: XLSX batch `lan01, lan02, lan04, lan06, lan09, lan11, lan22, lan26` — all PASS, diffs=0, lint clean, Excel=PASS (`batch_document_audit_report.md`).
- PASS: Sheet matrix generator (`python -X utf8 scripts/audit-0610/gen_sheet_button_matrix.py docs/ribbon-scan-sheet-1011.json docs/SHEET-BUTTON-MATRIX-1011.md`); generated matrix remains 59 match / 13 known gap / 66 unchecked.
- PASS: UTF-8/no-BOM and mojibake scan of changed text files; 7 files scanned, 0 findings. `git diff --check` clean.
- The ticket remains in progress: 66 buttons are unchecked. The unresolved Home-tab button selection probes and adapter-owned export gaps are recorded in the section handoffs.

## S12 continuation in worktree S14 (2026-10-12)

- Starting matrix from main: 72 KHỚP EXCEL / 66 CHƯA ĐỐI CHIẾU. Current generated matrix: **88 KHỚP EXCEL / 1 LỆCH ĐÃ BIẾT / 49 CHƯA ĐỐI CHIẾU**; no evidence was added for failed or inconclusive probes.
- New read-only Excel COM evidence: Formula named range (`S12Cell -> B2`), `#DIV/0!` error checking, formula recalculation (`F2=92.5875`), image (`Shapes.Count=1`, `TopLeft=B2`), comment insertion/deletion, page size Legal, print scale 80%, row 1 print titles, and page-break insert/remove. Hyperlink export regression fixed in the Sheet adapter/parser; Excel confirms one hyperlink at G2. Existing Vietnamese Help and VI/EN i18n cover hyperlink insertion.
- Comment Previous/Next remain CHƯA ĐỐI CHIẾU: on a workbook containing comments at C2/D2, real CDP clicks navigated Previous D2→C2 and Next C2→D2 (screenshots in evidence). Excel COM ReadOnly found both comments in the saved XLSX but reopened with `ActiveCell=A1`, so the transient navigation state was not retained for saved-file comparison. Header/Footer remains unchecked because the UI probe did not prove a saved value. Home vertical alignment/wrap remain unchecked; CDP diagnostics show the click did not act on the intended ribbon control. No product behavior was inferred from those clicks.
- **PASS** `npm test`: 3089/3089.
- **PASS** `python -m unittest discover -s tests`: 883 tests, 506.094 seconds, OK. Python emitted `ResourceWarning` for open subprocess streams; no test failed.
- **PASS** dirty-save XLSX batch for lan01/02/04/06/09/11/22/26: 8/8 saved, `diffs=0`, lint clean, Excel PASS. Report: `E:\VNOffice-profiles\codex-fs14\batch-xlsx\batch_document_audit_report.md`.
- **PASS** Insert sparklines: real CDP selection of `C2:C6` and ribbon commands created a line or column sparkline in active cell `C6`; Excel COM ReadOnly reported `SparklineGroups.Count=1`, `Type=1` (line) and `Type=2` (column). VI Help and VI/EN i18n already describe the feature; screenshots are in `docs/tickets-0710/evidence/fix-s12-sparkline*.png`.
- **KNOWN GAP** PivotChart: CDP inserted the Pivot bar chart from an existing PivotTable. Excel COM ReadOnly found `PivotTables=1`, `Charts=1`, `ChartType=51`, but `Chart.PivotLayout.PivotTable.Name` was empty and `PivotFields=0`; it is a regular chart without a Pivot link. Screenshot: `docs/tickets-0710/evidence/fix-s12-pivotChart.png`. Existing Vietnamese Help and VI/EN i18n claim the chart is linked to Pivot data. A real fix requires changing XLSX OOXML semantics, so this is gated for the owner's decision per `AGENTS.md` §11.
- **PASS** Insert Function: real CDP opened Formula > Insert Function, searched/select `TODAY`, and inserted it in H2. Excel COM ReadOnly confirmed `Formula='=TODAY()'`, `Value2=46307`, `NumberFormat=dd/mm/yyyy` in `app_S14_final_insertFunction.xlsx`; screenshot `docs/tickets-0710/evidence/fix-s12-insertFunction.png`. Existing Vietnamese Help and VI/EN i18n describe the fx dialog and category buttons.
- Matrix generator passed. The S14 CDP probe was refined to choose rendered tab/panel nodes and wait after tab changes. Hit testing for `sheet.cell.alignTop` found its sole command node at `(412,56)` while the Home panel starts at `y=78`; `document.elementFromPoint` resolves the tab strip instead of the command. The runner now rejects this occluded target (`NO_BUTTON`) rather than recording a misleading click. Alignment remains unchecked pending a ribbon layout/input fix. Remaining 49 buttons are unchecked; the PivotChart mismatch is recorded separately as a known gap. FIX-S12 remains open.
