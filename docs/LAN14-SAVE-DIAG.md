# Q9 — Chẩn đoán lưu lan14.xlsx

Ngày: 2026-10-20
Worktree/nhánh: `E:\\VNOffice-codex-lan14` / `perf/lan14-open-codex`
Merge đầu phiếu: `main` fast-forward từ `53db39bb` lên `11d572a0`.

## Tái hiện trên nhánh hiện tại

Chạy `tests/live/cdp/roundtrip-file.mjs` với `VNO_AUDIT_MARK_DIRTY=1`, `VNO_CDP_AUDIT_TIMINGS=1`, profile riêng `E:\\VNOffice-profiles\\Q9-lan14-20261020-run1`, input gốc và output dưới thư mục log riêng.

- App process bắt đầu lúc 00:55:29 (+07); file `.sent.fods` hoàn tất lúc 00:57:28, kích thước 323,219,496 byte. FODS serialize và bản kiểm tra đã được ghi.
- Lời gọi `saveRealFileInPlace` vào bước chuyển nội dung lớn qua `_stageLargeContent`; file staging Python đạt 109,667,465 byte lúc 00:57:31, rồi đứng đến 01:05:49 (ít nhất 8 phút 18 giây).
- Không có XLSX output, `.save-timings.json`, hoặc báo cáo CDP hoàn tất. Không thấy thư mục lưu tạm mới `vnoffice_save_inplace_*`. Pipeline chưa vào `_write_save_source`, `soffice --convert-to`, hay `ooxml_zip_patch`.
- Harness do phiếu khởi chạy được dừng bằng Ctrl+C sau 10 phút; app con và WebView đã đóng. Không dùng Excel COM hay điều khiển OS.

## Đối chứng snapshot trước Q7

Xuất snapshot `427ddf55^` (`6cf93a11`) ra thư mục log tạm, dùng profile riêng và harness CDP gọi trực tiếp cùng `globalUnoBridge.saveRealFileInPlace`. Harness đối chứng bỏ bước ghi bản `.sent.fods` ra đĩa vì đường ghi đó tự timeout CDP trên snapshot cũ.

- Mở workbook: **110,270 ms**; serialize trong trang: **321,316,585 ký tự**, hoàn tất ở **122,970 ms** từ lúc khởi chạy.
- File staging Python đạt **8,430,164 byte** lúc 01:20:18; không tăng đến 01:28:26 (ít nhất **8 phút 08 giây**). Không có XLSX output hay sidecar thời gian. Lời gọi save cũng chưa tới `_write_save_source`, soffice, hoặc patch OOXML.
- Trước đối chứng runtime, so sánh source xác nhận ba commit Q7 (`def682d0`, `be96c13a`, `e8a7ef30`) chỉ sửa `ooxml_zip_patch.py` và test. `main.py`, `uno-bridge.js`, `sheet-adapter.js` giống `427ddf55^`.

**Kết luận:** hiện tượng treo ở bước chuyển FODS lớn qua cầu nối đã có trên snapshot trước Q7; Q7 không tạo ra lỗi loại này. Hai lần dừng ở dung lượng khác nhau (109,667,465 và 8,430,164 byte), nên bằng chứng phù hợp với lỗi/chờ không ổn định trong đường staging, chưa xác định được request/chunk hay nguyên nhân thấp hơn. Chưa chạy tới LibreOffice hoặc hậu xử lý OOXML; không có căn cứ sửa ở các pha đó.

## Đề xuất bước tiếp

Thêm phép thử đơn vị cho `append_content_stage` theo chuỗi nhiều chunk và một probe CDP ghi thời gian/kết quả từng lần gọi bridge, trước khi thay logic staging. Giữ nguyên API lưu hiện tại đến khi probe xác định call nào chờ hoặc mất phản hồi; sau khi sửa cần tái hiện cả hai snapshot và chạy batch 27 tệp LAN không gồm lan14.

## Trạng thái

- Nhánh hiện tại: **FAIL** — save treo ở staging sau 10 phút; 109,667,465 byte.
- Snapshot trước Q7: **FAIL** — cùng pha staging treo ít nhất 8 phút 08 giây; 8,430,164 byte.
- JS serialize/write FODS hiện tại: **PASS** — 323,219,496 byte; snapshot cũ serialize 321,316,585 ký tự.
- LibreOffice convert và OOXML patch: **NOT RUN** — cả hai lần chưa tới pipeline.
- Sửa code và batch LAN 27 tệp: **NOT RUN** — chưa tìm được request/chunk gây chờ; không có thay đổi mã sản phẩm.
