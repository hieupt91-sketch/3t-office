# Q27 — Writer xuất PDF qua API in (20/10/2026)

## Phạm vi và cách kiểm tra

- Worktree `E:\VNOffice-codex-queue`, nhánh `codex/queue-19-10`; `git merge main` trả `Already up to date`.
- Nguồn: ba DOCX Q26 trong `docs/assets/q26-writer-2026-10-20/`. Word COM chạy ẩn, chỉ đọc, `ComputeStatistics(2)` báo 2 trang cho từng tệp.
- CDP mở mỗi DOCX trong tiến trình Writer mới, với `VNO_CDP_LOCALAPPDATA` riêng. Sau khi tài liệu tải đủ, lấy HTML xuất hiện hành từ `adapter._contentForExport()`, gọi `prepare_print_document('writer', …)` rồi `print_document` với `destinationPath`.
- PDF được kiểm bằng `pypdf` 6.21.1. Không dùng PyMuPDF/fitz. Không mở hộp thoại hệ điều hành.

## Kết quả

| Tài liệu | Word COM trang | API chuẩn bị/in | PDF pypdf | Nội dung/khổ |
|---|---:|---|---:|---|
| `A-cong-van.docx` | 2 | PASS — engine Microsoft Office; API lưu tới `A-cong-van.pdf` | 2 | 1.661 ký tự trích xuất; vùng chân trang trang đầu không có số trang đứng riêng |
| `B-bien-ban.docx` | 2 | PASS — engine Microsoft Office; API lưu tới `B-bien-ban.pdf` | 2 | 1.282 ký tự trích xuất |
| `C-mau-bieu.docx` | 2 | PASS — engine Microsoft Office; API lưu tới `C-mau-bieu.pdf` | 2 | 1.752 ký tự trích xuất; khổ PDF `841.92 × 595.32 pt`, ngang |

CDP tổng hợp: **11/11 PASS**. Bản đầu của harness không chờ DOCX mở hoàn toàn và dùng serializer FODT không phù hợp Writer; bài kiểm tra báo lỗi harness. Sau khi dùng `_contentForExport()` và đợi `_sourcePath` cùng nội dung tải xong, cả ba PDF đều thành công. Không có thay đổi mã sản phẩm và không có lỗi Writer PDF cần sửa trong lượt này.

## Tệp và kiểm tra

- Bài CDP: `tests/live/cdp/writer-q27-pdf-api.desktop.mjs`.
- PDF và profile dùng để đối chiếu: `E:\VNOffice-profiles\q27-writer-pdf-run-04` và `E:\VNOffice-profiles\q27-writer-pdf-profile-04`.
- Word COM: `tests/live/cdp/q26-writer-word-readonly.ps1`.
- Commit bài CDP: `a43f7f28` (`test(writer): verify Q27 print API PDFs`).
- Gate repo và handoff chung được ghi trong `docs/EXPLORE-SLIDES-2026-10-20-Q27.md` và phần Q27 trong `09-templates/AGENT-HANDOFF.md`.
