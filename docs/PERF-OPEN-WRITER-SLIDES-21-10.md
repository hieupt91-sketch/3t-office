# Đo tốc độ mở tệp Writer/Slides — 21/10/2026

## Mục tiêu và phương pháp

Đo 24 tệp `d01.docx`–`d24.docx`, `MYTIME.docx` và các tệp trình chiếu được yêu cầu, mỗi tệp 3 lượt tuần tự. Mỗi lượt dùng app desktop thật qua CDP, profile `LOCALAPPDATA` riêng, không chạy phép đo app song song với Office COM. Mốc **Nội dung** là nội dung tài liệu/trang chiếu hiện trong vùng soạn thảo; mốc **Chỉnh sửa được** là nội dung đã được nhập vào model và có thể chỉnh sửa. Word COM chạy ẩn với `Documents.Open(ReadOnly=true)`; PowerPoint COM chạy ẩn `Presentations.Open(WithWindow=false)`. Bảng ghi min/median/max theo giây; tỉ số dùng median “Chỉnh sửa được” / median Office.

Kết quả phản ánh máy, profile, phiên bản app và tệp tại lần đo này; đây không phải benchmark kiểm soát phần cứng độc lập. Office mở tệp tuần tự, và app cũng chạy tuần tự. Những phép thử khởi động đầu tiên có profile/harness không hợp lệ bị loại; chỉ dùng triplet đo bằng profile mới, điều kiện nội dung đúng và nguồn tệp khớp.

## Kết quả Writer

Thời gian app/Office là min / median / max, giây. `—` là không có mốc hợp lệ.

| Tệp | MiB | Trang trong Word | Nội dung app (s) | Chỉnh sửa được app (s) | Word COM (s) | Tỉ số edit/Word |
|---|---:|---:|---:|---:|---:|---:|
| d01.docx | 0.08 | 19 | 20.187/20.301/24.368 | 20.204/20.310/24.387 | 0.230/0.232/0.399 | 87.5× |
| d02.docx | 0.05 | 11 | 18.857/18.970/19.102 | 18.865/18.978/19.111 | 0.145/0.160/0.161 | 118.6× |
| d03.docx | 0.02 | 1 | 17.777/17.787/18.045 | 17.784/17.793/18.053 | 0.144/0.146/0.150 | 121.9× |
| d04.docx | 2.11 | 5 | 19.096/19.219/19.446 | 19.101/19.225/19.456 | 0.149/0.175/0.184 | 109.9× |
| d05.docx | 0.01 | 2 | 17.840/17.846/18.194 | 17.848/17.852/18.201 | 0.142/0.151/0.207 | 118.2× |
| d06.docx | 0.26 | 3 | 23.655/23.758/23.892 | 23.666/23.770/23.901 | 0.144/0.146/0.158 | 162.8× |
| d07.docx | 0.04 | 23 | 18.931/19.212/19.454 | 18.940/19.226/19.462 | 0.161/0.161/0.169 | 119.4× |
| d08.docx | 0.09 | 1 | 18.125/18.294/18.309 | 18.132/18.302/18.318 | 0.126/0.136/0.143 | 134.6× |
| d09.docx | 0.07 | 14 | 24.080/24.182/24.519 | 24.091/24.193/24.531 | 0.158/0.161/0.164 | 150.3× |
| d10.docx (PDF mang đuôi DOCX) | 0.79 | — | 2.404/2.458/2.506 (lỗi) | Không mở được | BLOCKED (COM treo 78.592 s) | — |
| d11.docx | 0.02 | 5 | 18.028/18.043/18.441 | 18.176/18.181/18.592 | 0.129/0.144/0.344 | 126.3× |
| d12.docx | 0.03 | 3 | 17.687/17.758/17.876 | 17.814/17.894/18.007 | 0.128/0.154/0.160 | 116.2× |
| d13.docx | 0.18 | 10 | 18.283/18.327/18.480 | 18.406/18.451/18.604 | 0.175/0.176/0.187 | 104.8× |
| d14.docx | 0.02 | 3 | 17.765/17.802/17.864 | 17.892/17.925/17.989 | 0.142/0.144/0.154 | 124.5× |
| d15.docx | 0.66 | 10 | 18.026/18.285/18.498 | 18.137/18.402/18.617 | 0.139/0.144/0.162 | 127.8× |
| d16.docx | 0.13 | 8 | 18.754/19.200/19.267 | 18.890/19.369/19.392 | 0.144/0.150/0.154 | 129.1× |
| d17.docx | 0.02 | 5 | 17.929/18.068/18.215 | 18.055/18.190/18.335 | 0.130/0.144/0.146 | 126.3× |
| d18.docx | 0.25 | 2 | 17.678/17.826/18.120 | 17.801/17.954/18.238 | 0.119/0.126/0.136 | 142.5× |
| d19.docx | 0.02 | 2 | 17.828/17.833/17.845 | 17.960/17.960/17.991 | 0.129/0.131/0.141 | 137.1× |
| d20.docx | 0.28 | 3 | 23.247/23.248/23.620 | 23.381/23.393/23.748 | 0.143/0.146/0.178 | 160.2× |
| d21.docx | 1.77 | 9 | 18.662/18.725/18.880 | 18.795/18.876/19.015 | 0.150/0.158/0.158 | 119.5× |
| d22.docx | 0.02 | 5 | 17.964/18.049/18.062 | 18.096/18.179/18.189 | 0.126/0.128/0.145 | 142.0× |
| d23.docx | 0.02 | 1 | 17.822/17.870/17.906 | 17.955/17.994/18.028 | 0.124/0.143/0.143 | 125.8× |
| d24.docx | 22.67 | 16 | 26.914/26.974/27.235 | 27.030/27.069/27.334 | 0.248/0.257/0.279 | 105.3× |
| MYTIME.docx | 30.41 | 44 | 38.447/38.579/40.611 | 38.537/38.672/40.706 | 0.197/0.214/0.307 | 180.7× |

`d10.docx` thực tế là PDF (823,958 byte) có đuôi `.docx`: app trả lỗi rõ ràng sau 2.404/2.458/2.506 s; Word COM bị treo ở lượt mở, chờ 78.592 s rồi bị dừng theo đúng PID do phép đo tạo ra. Không tính tỉ số hoặc số trang cho tệp này.

## Kết quả Slides

| Tệp / lượt đo | MiB | Số trang chiếu | Nội dung app (s) | Chỉnh sửa được app (s) | PowerPoint COM (s) | Tỉ số edit/PowerPoint |
|---|---:|---:|---:|---:|---:|---:|
| sample-3.pptx | 18.04 | 10 trang chiếu | 28.470/28.532/28.631 | 28.693/28.753/28.843 | 0.191/0.192/0.193 | 149.8× |
| sample-3.pptx sau tối ưu | — | 10 | 26.026/26.126/26.130 | 26.268/26.342/26.355 | — | — |

Tệp `E:\VN OFice\file test\BAO CAO KET QUA KINH DOANH NAM 2021.pptx` không tồn tại trong thư mục đầu vào; thư mục chỉ có `sample-3.pptx`. Do đó không có phép đo hoặc số trang cho tệp được yêu cầu này.

## Timeline và xử lý ba trường hợp chậm nhất

Ba trường hợp chậm nhất trước thay đổi là `MYTIME.docx` (median editable 38.672 s), `sample-3.pptx` (28.753 s), và `d24.docx` (27.069 s). Instrumentation hiện có cho phép thấy các giai đoạn lớn; phần dư được tính gần đúng từ tổng thời gian, không phải mốc đo độc lập.

| Tệp | Khởi động/profile worker | Nạp/chuyển đổi tài liệu | Vẽ/nạp vào vùng soạn thảo | Nhận định |
|---|---:|---:|---:|---|
| MYTIME.docx, 31.89 MB, 44 trang | 16.7–17.0 s (khoảng 44% median) | UNO load/store 4.5–7.2 s (khoảng 12%) | Phần còn lại xấp xỉ 14.5–17 s (khoảng 44%), gồm đọc, overlay và renderer; chưa có log tách nhỏ hơn | Không một giai đoạn đơn lẻ nào vượt 50%; cả startup và xử lý nội dung đều đáng kể. |
| d24.docx, 23.77 MB, 16 trang | 16.57–16.76 s (khoảng 61% wall time ban đầu) | Bị chuyển sang CLI fallback vì `writer-docx-textboxes`; phần chuyển đổi/import không được log thành mốc riêng | Phần thời gian còn lại khoảng 10.5 s, ước lượng | Worker nền khởi chạy nhưng đường DOCX này không dùng nó. Bỏ lần khởi chạy thừa chỉ giảm khoảng 2.4 s wall time vì startup diễn ra song song. |
| sample-3.pptx, 18.92 MB, 10 trang chiếu | Log worker nền khoảng 16.3 s | Không có mốc FODP/CLI-convert/import riêng cho PPTX | Phần còn lại khoảng 12 s, ước lượng | Bỏ startup worker không dùng cho nhập PPTX giảm khoảng 2.4 s wall time. Đây chưa phải tối ưu hóa thời gian parse/render PPTX. |

Các phép đo cho thấy phần khởi động worker là cơ hội an toàn có thể tránh được trên hai đường nhập không sử dụng worker. Với MYTIME, không có bằng chứng một giai đoạn đơn chiếm trên 50%; cần instrument chi tiết hơn trước khi chọn một tối ưu hóa parse/render khác. Không thực hiện thay đổi sang định dạng FODT/FODP, không sửa LibreOffice Core, và không thay dữ liệu tài liệu.

## Thay đổi an toàn và rollback

- Với DOCX Writer mà `_persistent_writer_html_safe` xác định phải dùng CLI fallback, bỏ khởi chạy UNO worker thừa ở startup và tại yêu cầu mở. Mặc định bật; đặt `VNO_WRITER_SKIP_UNSAFE_PREWARM=0` để khôi phục hành vi khởi chạy worker cũ.
- Với PPTX/ODP đầu vào Slides, bỏ khởi chạy worker không được dùng trong đường nhập; đặt `VNO_SLIDES_SKIP_UNUSED_PREWARM=0` để khôi phục hành vi cũ.
- Median editable d24 giảm từ 27.069 s xuống 24.770 s (−2.299 s, −8.5%); `sample-3.pptx` giảm từ 28.753 s xuống 26.342 s (−2.411 s, −8.4%). Ở mốc quick view, d24 giảm từ 26.974 s xuống 24.673 s (−2.301 s); Slides giảm từ 28.532 s xuống 26.126 s (−2.406 s). Ba lượt sau thay đổi không có bước lưu. Không tạo bản xuất để so hash/trang; do đó kết luận này chỉ nói đến thời gian mở và không tuyên bố round-trip/hash đầu ra đã được kiểm chứng. Các tệp nguồn không được sửa.
- CDP trước/sau cho cả hai app xác nhận đúng file và nội dung đã nạp. Slides: 10 slide đã import; thanh mở tài liệu có `getBoundingClientRect()` 0×0 sau khi hoàn tất. Writer d24 đã vào model, mở được để chỉnh sửa.
- Sửa trạng thái tiến trình dùng chung bị giữ lại sau khi import Slides thành công và sau lỗi mở tệp Writer; lỗi không thay đổi thời gian đo nội dung. Test hộp lỗi Writer: trước sửa tiến trình hiện (300×41.55 px), sau sửa ẩn (0×0). Test Slides: trước sửa vẫn hiện (300×41.5 px), sau sửa ẩn (0×0).

## Giao diện đã xem

Đã mở và xem ảnh CDP của 3 lượt cho từng tệp `d01.docx`–`d24.docx` và `MYTIME.docx`, cùng 3 lượt `sample-3.pptx`; ảnh nằm ngoài repo tại `E:\VNOffice-briefs\q41-shots\` (ảnh `writer-<tệp>-r1..r3.png`, `slides-sample-3-r1..r3.png`). Từng nhóm màn hình Writer cho thấy ribbon, trang tài liệu, trạng thái trang và thanh cuộn; thanh ribbon/khung app không bị cắt hoặc chồng. Trang dưới viewport được cuộn bình thường. Tệp d24 có chữ/đồ họa trên bìa mẫu tự chồng lấp; hiện tượng nằm trong nội dung tệp, được giữ nguyên và ghi nhận, không quy thành lỗi do thay đổi lần này.

Đã xem hộp lỗi mở d10: hộp thoại vừa cửa sổ và đọc được, nhưng banner “Đang mở tài liệu…” còn nằm phía sau trước sửa; ảnh sau sửa `writer-error-progress-post-final.png` xác nhận banner biến mất. Đã xem lại cùng hộp lỗi ở viewport 1366×768 (`writer-error-1366x768.png`): hộp thoại vẫn nằm gọn, phần nội dung và nút Đồng ý hiện đủ; tràn ngang/dọc tài liệu bằng 0, tiến trình có kích thước 0×0. Đã xem Slides sau khi nạp: ảnh `slides-progress-post-final-guard.png`; ribbon, danh sách slide, trang đang chọn và thanh trạng thái hiển thị đầy đủ, không có banner treo; kiểm tra CDP cho thấy tràn ngang app/canvas bằng 0, tràn dọc app 3 px.

## Dirty-save DOCX 8 tệp nhỏ

Chạy `batch_document_audit.py docx` cho `d05`, `d03`, `d23`, `d14`, `d11`, `d19`, `d02`, `d17` (theo thứ tự kích thước tăng dần trong nhóm đã chọn), với CDP runner được trỏ tới checkout này. Cả **8/8 PASS**: app lưu được và giữ chỉnh sửa, số trang Word trước/sau lần lượt là 2/2, 1/1, 1/1, 3/3, 5/5, 2/2, 11/11, 5/5; page delta 0 cho cả 8. Bản lưu và báo cáo audit ở `E:\VNOffice-briefs\q41-docx-roundtrip\`. Đây là xác nhận round-trip cho tám tệp nhỏ; không tuyên bố bao phủ mọi DOCX.

## Trạng thái

- Đo app/Office: PASS cho 23 tệp DOCX numbered hợp lệ, `MYTIME.docx` và `sample-3.pptx`; d10 không đúng định dạng và PPTX thứ hai không có sẵn như đã nêu.
- Đo sau tối ưu: PASS, ba lượt mỗi tệp d24 và `sample-3.pptx`.
- So sánh hash/trang/ảnh sau lưu: NOT RUN (không lưu/chuyển đổi tài liệu).
- Gate: `node tests/run-tests.js` PASS 3789/3789; i18n parity PASS 0 missing; checklist evidence PASS 0 dòng hạ; `pytest -k "writer or slides or docx or pptx"` PASS 477, 646 deselected; dirty-save DOCX PASS 8/8, page delta 0.
- Office COM Excel: BLOCKED theo quy tắc chung; không dùng Excel COM.
- Phạm vi còn lại: MYTIME còn 38.672 s median editable (~180.7× Word); tối ưu hóa hiện tại chỉ tránh phần startup không cần thiết.
