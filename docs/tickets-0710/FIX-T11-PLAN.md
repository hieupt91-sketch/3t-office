# Kế hoạch FIX-T11 — đối chiếu ribbon Writer với Word

## Mục tiêu
Làm lần lượt sáu nhóm ưu tiên trong `FIX-T11.md`. Với mỗi nút, thao tác trong Writer desktop qua CDP và trong Word COM trên tài liệu DOCX đối chứng; ghi thuộc tính/đầu ra, sửa lệch tái hiện được, bổ sung Help VI/EN khớp ribbon, cập nhật ma trận và tạo một commit riêng cho nhóm.

## Năng lực hiện tại
Có `tests/live/cdp/session.mjs`, harness CDP/Word COM trong `scripts/audit-0610/word_parallel/`, Help catalog Writer tại `platform/help/entries-writer.js`, i18n tại `platform/i18n/strings-vi.js` và `strings-en.js`, cùng adapter Writer hiện hữu. Ma trận nêu 61 nút chưa đối chiếu; chỉ các kết quả chạy mới được đổi trạng thái.

## Phạm vi theo nhóm
1. Trang đầu: clipboard, cỡ chữ, định dạng đoạn và ký tự định dạng.
2. Chèn: trang, bảng từ văn bản, liên kết/dấu trang, drop cap, ngày giờ, phương trình, biểu đồ, sơ đồ.
3. Thiết kế/Bố cục: watermark/nền/viền/theme, số dòng/thụt đầu dòng, in/xem trước và đầu ra PDF.
4. Tham chiếu: citations, nguồn, style, bibliography.
5. Trộn thư: nguồn/trường/quy tắc/preview/navigation/finish và phong bì/nhãn.
6. Đánh giá/Xem: spellcheck, word count, views/navigation/ruler/grid/zoom/macros.

## Files/modules và dependency
Tái dùng `adapters/libreoffice/writer/writer-adapter.js`, `apps/writer/**`, `platform/help/entries-writer.js`, `platform/i18n/strings-vi.js`, `platform/i18n/strings-en.js`, các harness trong `scripts/audit-0610/word_parallel/`, `docs/DOC-BUTTON-MATRIX-1011.md` và `docs/AUDIT-DOC-WORD-PARALLEL-1011.md`. Không thêm dependency, không sửa Core, không đổi định dạng ngoài tương thích Word đã chứng minh.

## Rủi ro
Word chuẩn hóa DOCX khi mở/lưu; một số tính năng có semantics khác nhau giữa Word và VN Office. Không kết luận KHỚP khi chỉ có unit test hoặc quan sát giao diện. Không dùng dữ liệu tài liệu thật; tạo fixture cục bộ. Không dừng/kill PID Word tồn tại trước phiên audit.

## Test plan
Mỗi nhóm: thao tác CDP qua ribbon/phím, Word COM trên fixture riêng, kiểm tra thuộc tính/đầu ra và ảnh chụp; cập nhật trạng thái/note bằng `python -X utf8 scripts/audit-0610/gen_doc_button_matrix.py` khi có nguồn scan. Cuối lượt: `npm test`, `python -m unittest discover -s tests`, batch DOCX d01,d02,d06,d07,d13,d20,d24, quét BOM/mojibake. Ghi trung thực PASS/FAIL/NOT RUN/BLOCKED.

## Rollback
Mỗi nhóm là một commit riêng. Nếu phát hiện hồi quy ở nhóm đó, có thể revert đúng commit nhóm; không dùng destructive Git trong quá trình này.