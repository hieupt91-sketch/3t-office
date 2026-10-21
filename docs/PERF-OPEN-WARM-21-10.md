# Q42 — Đo tốc độ mở tệp với hồ sơ ấm

## Phương pháp và phạm vi

Đo trên E:\VN OFice\file test bằng app desktop thật qua CDP. Mỗi tệp có profile LOCALAPPDATA riêng cho phiên đó; app được khởi chạy một lần, lượt 1 mở trên profile mới, rồi lượt 2–4 mở cùng tệp trong cùng app/profile. A là thời gian khởi chạy app tới khi CDP sẵn sàng; B là từ lúc gọi mở tệp đến khi có nội dung nhìn thấy và tới lúc model sửa được; C = A + thời gian sửa được. Bảng ghi giây, làm tròn 0.01. Warm min/median/max lấy đúng lượt 2–4.

d01–d24 DOCX được thử; d10.docx là PDF mang đuôi DOCX, app báo lỗi rõ và không tính như DOCX hợp lệ. 23 DOCX hợp lệ và MYTIME.docx được mở bằng app; chỉ có sample-3.pptx, không có PPTX thứ hai. Từng phiên chạy tuần tự. Word và PowerPoint COM chạy ẩn, tuần tự sau các phép đo app. Excel COM không chạy theo quy tắc Q42.

Không bật hai app song song. Không lưu tài liệu benchmark. Cộng thời gian khởi chạy và mở để tính C; ở các đường có tiến trình nền, stage có thể chồng lấp nên không cộng stage để suy ra wall time.

Memory entry feedback_open_speed_bench_warm_profile không có nguồn đọc trong phiên công cụ này; cách đo được đối chiếu theo mô tả trong phiếu và script mẫu claude-open-warm.mjs.

## Writer

| Tệp | Khởi động A | Nội dung B (lượt 1 / median 2–4) | Sửa được (lượt 1 / min–median–max 2–4) | Tổng C (lượt 1 / median 2–4) |
|---|---:|---:|---:|---:|
| d01 | 2.39 s | 19.00 / 2.53 s | 19.12 / 2.62 / 2.67 / 2.67 s | 21.51 / 5.05 s |
| d02 | 2.29 s | 17.92 / 0.89 s | 18.06 / 1.00 / 1.03 / 1.05 s | 20.35 / 3.31 s |
| d03 | 2.36 s | 16.44 / 0.24 s | 16.57 / 0.38 / 0.39 / 0.42 s | 18.93 / 2.75 s |
| d04 | 2.39 s | 17.88 / 1.60 s | 18.07 / 1.68 / 1.73 / 1.79 s | 20.46 / 4.12 s |
| d05 | 2.40 s | 16.54 / 0.25 s | 16.69 / 0.35 / 0.36 / 0.37 s | 19.10 / 2.77 s |
| d06 | 2.29 s | 22.81 / 4.96 s | 22.94 / 5.06 / 5.07 / 9.22 s | 25.22 / 7.36 s |
| d07 | 2.33 s | 17.97 / 1.06 s | 18.10 / 1.17 / 1.19 / 1.25 s | 20.43 / 3.52 s |
| d08 | 2.31 s | 16.68 / 0.28 s | 16.81 / 0.37 / 0.40 / 0.41 s | 19.12 / 2.71 s |
| d09 | 2.28 s | 23.06 / 5.42 s | 23.19 / 5.54 / 5.54 / 9.88 s | 25.47 / 7.82 s |
| d10.docx (PDF mang đuôi DOCX) | 2.35 s | lỗi sau 0.72 s | — | — |
| d11 | 2.49 s | 17.33 / 0.55 s | 17.48 / 0.70 / 0.71 / 0.76 s | 19.97 / 3.20 s |
| d12 | 2.27 s | 16.52 / 0.30 s | 16.64 / 0.44 / 0.45 / 0.46 s | 18.90 / 2.71 s |
| d13 | 2.27 s | 17.27 / 0.76 s | 17.40 / 0.87 / 0.89 / 0.92 s | 19.67 / 3.15 s |
| d14 | 2.31 s | 16.65 / 0.40 s | 16.77 / 0.52 / 0.55 / 0.58 s | 19.08 / 2.86 s |
| d15 | 2.35 s | 17.11 / 0.75 s | 17.23 / 0.84 / 0.88 / 0.89 s | 19.58 / 3.23 s |
| d16 | 2.30 s | 17.65 / 0.91 s | 17.78 / 1.02 / 1.03 / 1.03 s | 20.08 / 3.33 s |
| d17 | 2.34 s | 16.76 / 0.38 s | 16.88 / 0.50 / 0.50 / 0.52 s | 19.22 / 2.85 s |
| d18 | 2.33 s | 16.57 / 0.31 s | 16.68 / 0.42 / 0.43 / 0.49 s | 19.01 / 2.75 s |
| d19 | 2.31 s | 20.23 / 0.28 s | 20.36 / 0.38 / 0.40 / 0.42 s | 22.67 / 2.71 s |
| d20 | 2.26 s | 22.00 / 4.56 s | 22.13 / 4.64 / 4.72 / 9.03 s | 24.39 / 6.98 s |
| d21 | 2.29 s | 17.04 / 0.83 s | 17.19 / 1.00 / 1.01 / 1.01 s | 19.48 / 3.31 s |
| d22 | 2.32 s | 16.69 / 0.39 s | 16.82 / 0.48 / 0.52 / 0.55 s | 19.14 / 2.84 s |
| d23 | 2.56 s | 16.59 / 0.24 s | 16.72 / 0.35 / 0.35 / 0.37 s | 19.29 / 2.92 s |
| d24 | 2.37 s | 25.54 / 7.96 s | 25.81 / 8.13 / 8.15 / 12.18 s | 28.17 / 10.52 s |
| MYTIME.docx | 2.27 s | 39.49 / 23.06 s | 39.95 / 22.92 / 23.23 / 26.05 s | 42.22 / 25.51 s |

## Slides

| Tệp | Khởi động A | Nội dung B (lượt 1 / median 2–4) | Sửa được (lượt 1 / min–median–max 2–4) | Tổng C (lượt 1 / median 2–4) |
|---|---:|---:|---:|---:|
| sample-3 | 2.28 s | 23.83 / 10.08 s | 24.08 / 10.24 / 10.29 / 10.49 s | 26.35 / 12.57 s |

## Sheet

| Tệp | Khởi động A | Nội dung B (lượt 1 / median 2–4) | Sửa được (lượt 1 / min–median–max 2–4) | Tổng C (lượt 1 / median 2–4) |
|---|---:|---:|---:|---:|
| lan01 | 2.43 s | 0.16 / 0.04 s | 68.00 / 51.34 / 51.73 / 51.87 s | 70.43 / 54.16 s |
| lan09 | 2.46 s | 0.22 / 0.08 s | 52.77 / 41.97 / 42.03 / 42.11 s | 55.23 / 44.49 s |
| lan28 | 2.52 s | 0.13 / 0.02 s | 19.51 / 3.47 / 3.50 / 3.50 s | 22.03 / 6.02 s |

## Đối chiếu Office và LibreOffice

| Tệp | COM ẩn: lượt 1 / median lượt 2–4 | Kết quả |
|---|---:|---|
| d01.docx | 0.44 / 0.23 s | PASS |
| d02.docx | 0.15 / 0.16 s | PASS |
| d03.docx | 0.15 / 0.14 s | PASS |
| d04.docx | 0.21 / 0.15 s | PASS |
| d05.docx | 0.20 / 0.14 s | PASS |
| d06.docx | 0.16 / 0.14 s | PASS |
| d07.docx | 0.18 / 0.16 s | PASS |
| d08.docx | 0.13 / 0.14 s | PASS |
| d09.docx | 0.20 / 0.16 s | PASS |
| d10.docx | — | BLOCKED: tệp là PDF, không đo COM để tránh lặp lượt treo đã biết |
| d11.docx | 0.15 / 0.14 s | PASS |
| d12.docx | 0.16 / 0.14 s | PASS |
| d13.docx | 0.19 / 0.18 s | PASS |
| d14.docx | 0.14 / 0.14 s | PASS |
| d15.docx | 0.14 / 0.14 s | PASS |
| d16.docx | 0.14 / 0.13 s | PASS |
| d17.docx | 0.15 / 0.14 s | PASS |
| d18.docx | 0.15 / 0.14 s | PASS |
| d19.docx | 0.13 / 0.14 s | PASS |
| d20.docx | 0.16 / 0.16 s | PASS |
| d21.docx | 0.15 / 0.14 s | PASS |
| d22.docx | 0.14 / 0.14 s | PASS |
| d23.docx | 0.15 / 0.13 s | PASS |
| d24.docx | 0.30 / 0.25 s | PASS |
| MYTIME.docx | 0.28 / 0.19 s | PASS |
| sample-3.pptx | 0.77 / 0.19 s | PASS |

Excel COM: BLOCKED theo quy tắc chung; không khởi chạy. LibreOffice --headless --convert-to fods chạy riêng, profile riêng cho từng tệp, một lần đo có số liệu lưu lại cho mỗi tệp. Đây là thời gian chuyển đổi, không phải thời gian mở và sửa trong GUI.

| Tệp Sheet | App sửa được (lượt 1 / median warm) | LibreOffice convert-to FODS | Kích thước FODS |
|---|---:|---:|---:|
| lan01.xlsx | 68.00 / 51.73 s | 6.10 s | 6,213,447 byte |
| lan09.xlsx | 52.77 / 42.03 s | 9.07 s | 25,826,328 byte |
| lan28.xlsx | 19.51 / 3.50 s | 5.03 s | 1,189,046 byte |

Chênh lệch không phải so GUI ngang hàng: LibreOffice chỉ chuyển đổi sang FODS, còn app đo tới model sửa được.

## Timeline các tệp chậm nhất và Sheet

| Tệp | Startup / worker | Convert / import | JS render và layout | Nhận định |
|---|---|---|---|---|
| MYTIME.docx | App 2.27 s; UNO worker 15.86 s; UNO load/store 8.03 s, chồng lấp một phần với convert | soffice convert 23.73 s lượt 1, 10.87 / 8.14 / 7.71 s warm; overlay OOXML 0.41 s đầu | normalize HTML 9.12–9.49 s mỗi lượt; render shapes 0.1–0.2 ms; pagination/layout 0.17–0.21 s | Convert và normalize HTML đều đáng kể; normalize là stage JS lớn nhất đã đo riêng. |
| d24.docx | App 2.37 s; worker 15.71 s lượt 1, lần khởi động kế tiếp 2.74 s; worker và convert chồng lấp | fallback soffice convert vì writer-docx-textboxes: 23.57 s lượt 1, 10.41 / 6.39 / 6.39 s; overlay OOXML 0.24 s đầu | normalize HTML ~0.40 s; render shapes ~0.03 s; pagination ~0.03–0.04 s; layout ổn định 25.68 / 12.04 / 8.00 / 8.01 s | soffice_convert là stage lớn nhất ở lượt đầu; warm convert còn 6.4–10.4 s. |
| sample-3.pptx | App 2.28 s; đường nhập PPTX dùng CLI, không cần worker | convert sang FODP 20.22 s đầu, 6.58 / 6.52 / 6.56 s warm; overlay native 0.40 / 0.39 s; nạp FODP 0.86 / 0.82 / 0.82 / 0.83 s | layout ổn định 23.92 / 10.31 / 10.08 / 10.12 s | Convert chiếm đa số; overlay và FODP load nhỏ hơn nhiều. |
| lan01.xlsx | Nội dung quick view 0.16 s; model sửa được 68.00 s | convert FODS ~3.20 s; overlay native ~28 s (cell metadata 14.45 s, chart metadata 5.18 s, pivot/chart metadata 2.89 s); optimize FODS ~5.47 s | parse FODS 1.45 s; first grid render 1.50 s; selection-to-first-grid 51.51 s | Chờ tới grid đầu tiên và overlay lớn hơn parser/render JS. |
| lan09.xlsx | Nội dung quick view 0.22 s; model sửa được 52.77 s | convert FODS ~4.53 s; cell metadata ~4.04 s, chart metadata ~7.12 s | compact payload ~3.16 s; nạp payload ~6.09 s; first grid render ~4.41 s; selection-to-first-grid 41.59 s | Nhiều sheet; chờ backend/overlay và dựng payload chiếm phần lớn. |

## Đề xuất theo lợi ích × độ an toàn

Điểm sơ bộ là lợi ích wall-time ước tính × độ an toàn (1–5), không phải kết quả tối ưu hóa.

| Hạng | Đề xuất | Lợi ích ước tính | An toàn | Điểm | Điều kiện trước khi triển khai |
|---:|---|---:|---:|---:|---|
| 1 | Tối ưu đường normalize HTML Writer cho tệp lớn như MYTIME | tới ~9.4 s | 2/5 | 18.8 | VNO_ flag, fallback normalize hiện tại, kiểm bodyHash DOM, số trang và ảnh trang trước/sau. |
| 2 | Giảm chi phí overlay metadata cho workbook lớn | tiềm năng >10 s ở lan01/09 | 1/5 | >10 | Không bỏ metadata; cần đường nhanh có VNO_ flag và fallback đầy đủ, so FODS hash, số sheet/trang, ảnh và DOM/bodyHash. |
| 3 | Bỏ phần khởi động worker không dùng trên đường nhập CLI-only | wall-time đo được có thể tới ~2.5 s; worker startup không đồng nghĩa tiết kiệm đủ 15.7 s do chồng lấp | 4/5 | ~10 | Xác định đường dùng CLI trước khi prewarm; VNO_ flag để tắt và fallback worker gốc. |

Không áp dụng tối ưu hiệu năng trong Q42. Chưa có ứng viên nào chứng minh được đầu ra tương đương kèm fallback đủ an toàn. Vì không thay đường import/export, số đo before/after, hash FODS, số trang hoặc ảnh trang before/after cho tối ưu hiệu năng là NOT RUN.

## Sửa lỗi UI phát hiện khi đo

Sheet báo Đã nạp đầy đủ 99% dù model đã nạp xong. Test hồi quy trước sửa: 18/19 PASS, 1 FAIL; CDP đọc 99% ở trạng thái model đầy đủ. Đã sửa clamp từ 99 lên 100 và thêm test unit. Sau sửa: 19/19 PASS. CDP sau sửa đọc Đã nạp đầy đủ 100%; status bar x=16, y=684, width=110.64, height=14, scroll/client 111/111 × 14/14, overflow visible, không tràn. Ảnh sau khi quick view biến mất và layout ổn định: E:\VNOffice-briefs\runs\q42-ui-check-final.png.

## Giao diện đã xem

- Writer: ảnh lượt 1 của từng màn hình d01–d24 và MYTIME.docx tại E:\VNOffice-briefs\runs\q42-app, q42-app-tail, q42-timeline. Ribbon, thanh cuộn, trạng thái trang nằm trong cửa sổ. Nội dung một số tệp bị đè/chật: tiêu đề d03/d23 (ảnh d03: E:\VNOffice-briefs\runs\q42-app\writer-d03\lap-1.png); ảnh và chữ bìa d24 (E:\VNOffice-briefs\runs\q42-timeline\writer-d24\lap-1.png); chữ biểu mẫu d20 (E:\VNOffice-briefs\runs\q42-app-tail\writer-d20\lap-1.png); tiêu đề văn bản d12/d22 sát nhau. Đây là hiển thị nội dung tài liệu, ghi nhận và không sửa trong phạm vi đo tốc độ.
- d04 có thanh cuộn ngang vì trang/bố cục nguồn rộng; nội dung nhìn thấy. Trang dài cuộn dọc bình thường.
- d10: hộp lỗi đọc được, nằm gọn ở 1366×768, nội dung/nút đóng đủ; banner tiến trình biến mất sau khi hộp lỗi ổn định. Ảnh: E:\VNOffice-briefs\runs\q42-app-tail\writer-d10\lap-1-error.png. Tệp thực chất là PDF.
- Slides sample-3.pptx: ribbon, danh sách slide, canvas và status hiển thị đầy đủ; trang chiếu đang chọn cuộn bình thường.
- Sheet lan01 quick view và model đầy đủ; lan09 và lan28 model đầy đủ. Ribbon, grid, tab và status vừa khung. lan28 chụp lại sau 1.5 giây ổn định, không còn lớp render chuyển tiếp; status 100%. Ảnh ổn định status: E:\VNOffice-briefs\runs\q42-ui-check-final.png.
- lan14: FODS trung gian 323,219,496 byte; trang không phản hồi CDP sau 562.8 s. Chụp ảnh và đóng tab qua CDP cũng không nhận phản hồi; đã dừng PID riêng của lượt test để batch chạy tiếp. Không có ảnh ổn định; FAIL ghi nhận, không kết luận bố cục UI.

## Round-trip và cổng kiểm tra

- Dirty-save DOCX nhỏ d05,d03,d23,d14,d11,d19,d02,d17: 8/8 PASS, sửa được, số trang gốc/lưu lần lượt 2/2, 1/1, 1/1, 3/3, 5/5, 2/2, 11/11, 5/5; page delta 0.
- Batch Sheet lan01–lan27, không gọi Excel COM: 26/27 có bản lưu, diffs=0, lint sạch; lan14 FAIL do app không phản hồi. Excel COM BLOCKED cho 26 tệp đã lưu. Báo cáo: E:\VNOffice-briefs\runs\q42-sheet-roundtrip\batch_document_audit_report.md.
- node tests/run-tests.js: PASS 3790/3790 (tuần tự); npm test: PASS 3790/3790.
- i18n_parity: 0 missingVI / 0 missingEN, 3153 VI và 3153 EN. verify_checklist_evidence --all --no-fix: 0 dòng hạ.
- pytest tests -q -k writer/slides/sheet/docx/pptx/xlsx: PASS 818, 305 deselected.
- Word COM ẩn tuần tự: 23 DOCX hợp lệ + MYTIME, 4 lượt/tệp; PowerPoint COM ẩn: sample-3, 4 lượt. Excel COM BLOCKED. LibreOffice FODS conversion: lan01/09/28 PASS.
- Trước lượt Node tuần tự có một chạy đồng thời với pytest: 3789/3790; sau khi pytest kết thúc chạy lại tuần tự đạt 3790/3790. Không tái hiện lỗi.

## Mã và giới hạn

- 6000e3d7 — sửa trạng thái Sheet 100% và unit regression.
- b463bed0 — sửa harness đo quick view, model sửa được và ảnh Sheet riêng.
- 976f72a1 — log stage convert/overlay khi VNO_PERF_DEBUG=1; không đổi hành vi tài liệu.
- Không sửa định dạng lưu. Không lưu tài liệu benchmark; bản dirty-save audit lưu ngoài thư mục corpus.
- Kết quả phản ánh máy và profile lần đo này, không phải benchmark phần cứng độc lập.
