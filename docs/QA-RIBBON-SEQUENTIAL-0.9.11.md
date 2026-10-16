# Báo cáo QA tuần tự Ribbon — 3T Office 0.9.11

## Phạm vi

Kiểm tra trên bản cài thực tế trong `/Applications/3T Office`, dùng CDP để gửi click chuột tuần tự qua từng tab và từng control ribbon đang hiển thị. Mỗi lượt dùng hồ sơ người dùng tạm, không đụng dữ liệu thật.

Kịch bản chạy: `tests/live/cdp/installed-ribbon-sequential.mjs`.

## Kết quả

| Ứng dụng | Tổng control | Click thật PASS | SKIP an toàn | FAIL | Runtime error |
|---|---:|---:|---:|---:|---:|
| Doc | 136 | 117 | 19 | 0 | 0 |
| Sheet | 140 | 121 | 19 | 0 | 0 |
| Slide | 88 | 73 | 15 | 0 | 0 |
| **Tổng** | **364** | **311** | **53** | **0** | **0** |

Lưu ý: 387 là tổng số command ribbon trong static audit; 364 control hiển thị trong lượt chạy này vì một số command nằm trong dropdown/contextual state không xuất hiện đồng thời trên tài liệu trống.

## Chính sách SKIP

Đã ghi nhận nhưng không click thật các nhóm có tác động hoặc phụ thuộc môi trường:

- xóa, bảo vệ tài liệu, in và xem trước in;
- macro, mở cửa sổ mới, trình chiếu/presenter/rehearse;
- AI/cloud, voice và media;
- mở/lưu file hoặc hộp thoại hệ thống;
- hoàn tất mail merge.

Các mục này cần vòng QA riêng với file mẫu disposable và xác nhận thao tác trước khi chạy.

## Kết luận

Không có lỗi ribbon/icon nào cần sửa sau vòng QA này. Icon SVG, nhãn/tooltip, tab active, handler và phản hồi click của 311 control an toàn đều đạt. Không claim PASS cho 53 mục SKIP; chúng đang ở trạng thái **NOT RUN — SAFE-SCOPE SKIP**.

## Bằng chứng

- `/tmp/vno-ribbon-sequential-writer.json`
- `/tmp/vno-ribbon-sequential-sheet.json`
- `/tmp/vno-ribbon-sequential-slides.json`
