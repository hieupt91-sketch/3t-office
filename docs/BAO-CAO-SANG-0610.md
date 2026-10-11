# Báo cáo tổng hợp sáng 06/10/2026 (7h15)

Phạm vi: từ báo cáo tổng quan 05–06/10 đến 06/10 sáng. Mọi con số dưới đây là số đã đo hoặc đã chạy; mục nào chưa đo ghi rõ "chưa đo".

## 1. Việc đã xong và đã vào `main` (đêm qua → sáng nay)

| Nhóm | Kết quả |
|---|---|
| **Doc – Dừng tab** (mới) | Hộp thoại Đoạn văn có nút "Dừng tab…": tab trái/giữa/phải/thập phân, dẫn dấu. Hiển thị đúng trên màn hình (UBND bắt đầu đúng 8 cm, số 99 kết thúc đúng 15 cm, sai số ≤ 0,15 cm) và lưu DOCX đúng `w:tabs` (4535 / 8504 twip, dẫn chấm) cùng 2 ký tự `w:tab`. Có hoàn tác, có hướng dẫn tiếng Việt. e2e 7/7 PASS. |
| **Doc – lỗi lưu** | Phím Tab không còn bị đổi thành dấu cách khi lưu DOCX; `w:jc` không còn trùng hoặc sai thứ tự. |
| **Doc – D13 (so với Word)** | Trang trắng, Văn bản thành bảng, Trang bìa (4 mẫu) + gỡ trang bìa, cỡ chữ 13 pt (chuẩn văn bản hành chính), hàng tiêu đề bảng lặp mỗi trang. |
| **Doc – D1/D3/D4a** | Căn đều + khoảng cách đoạn của tài liệu mới được ghi vào DOCX; hộp thoại Thiết lập trang chuẩn NĐ 30; thẻ "Ngắt dòng và ngắt trang". |
| **Doc – D7 (đối chiếu corpus)** | 44 tài liệu thật (24 docx + 20 doc), mở–lưu qua VN Writer, số trang so với LibreOffice làm chuẩn: **42 PASS, 1 FAIL, 1 BLOCKED**. FAIL: `legacy13.doc` lệch 1 trang (1 → 2; ký tự lệch 0,044%). BLOCKED: `d10.docx` do lỗi ghi tệp của LibreOffice khi trích TXT (lỗi của bài đo, chưa phải lỗi sản phẩm). Số trang Word thật vẫn chưa đo. |
| **Sheet** | Nhập `₫250000` / `250.000 ₫` / `250000 VND` giờ thành số 250000 + định dạng tiền tệ (đã kiểm trên app thật + unit test). Copy/Cut/Paste qua CommandBus giữ định dạng (agy). Lỗi tham chiếu tuyệt đối `$` đã sửa trước đó. |
| **Kiểm tra UI qua CDP** | Slides: 17 hạng mục, báo cáo ghi PASS cả 17. Sheet: 15 PASS / 2 FAIL / 3 BLOCKED (hộp thoại hệ điều hành); 2 FAIL đều đã sửa (định dạng khi dán, tiền tệ). |
| **Pháp lý** | L1 bản nháp EULA/chính sách bảo mật/điều khoản dùng thử; L2 THIRD-PARTY-NOTICES (LibreOffice MPL, WebView2, từ điển CC0); L3 gói LibreOffice gọn (bỏ 24 gói từ điển GPL + 24 LGPL, wiki-publisher, .msi). |
| **Hiệu năng mở file** | Pipeline payload v3 (nén và lọc ở worker), mở file Sheet nặng nhanh hơn, không tăng RAM so với trước; có cờ lui về (rollback). |

Kiểm thử: `node tests/run-tests.js` = **2809/2809 PASS**; Python (tabs export, pPr upsert, review/save roundtrip) = 21/21 PASS.

## 2. Phần trăm hoàn thành (ước lượng, có căn cứ)

| Hạng mục | Trước | Nay | Căn cứ |
|---|---:|---:|---|
| VN Writer (Doc) | 85% | **88%** | Thêm Dừng tab, 4 mục D13, sửa lỗi lưu; corpus 42/44 khớp số trang. Chưa có số trang Word thật, chưa có macro/đồng soạn thảo. |
| VN Sheet | 88% | **90%** | Sửa tiền tệ + định dạng khi dán; UI qua CDP 15 PASS. Còn 3 mục bị hộp thoại hệ điều hành chặn (mở tệp, F12, xuất PDF). |
| VN Slides | 78% | **80%** | UI qua CDP 17/17 PASS theo báo cáo agy. Vẫn chỉ có 5 pptx mẫu. |
| Pháp lý | 40% | **50%** | L1–L3 xong. Còn SBOM, ký số, rà soát luật sư. |
| Các hạng mục khác | — | không đổi | Xem báo cáo tổng quan: nền tảng 90%, phân phối 80%, thương mại 50% (treo), macOS 35%, mobile 5%. |

Tổng có trọng số ≈ **78%** (trước 77%). Bỏ G5 và thương mại (đang treo) ≈ 85%.

## 3. Lỗi mở và rủi ro (chưa xử lý xong)

1. **Word COM vẫn bị chặn** bởi hộp thoại "Word không phải chương trình mặc định" → chưa có số trang Word thật. Cần một người bấm "Không" + "Không hỏi lại" một lần trên máy (chuột, UIA, MSAA, registry đều đã thử, không vượt được). Excel thì đã chạy lại bình thường.
2. **`legacy13.doc` lệch 1 trang** sau mở–lưu (cần xem tay).
3. **Độ trễ gõ phím tài liệu 150–200 trang**: P95 ≈ 270 ms (hàm `_recomputeLivePagination`), chưa sửa.
4. **Ma trận Undo/Redo (đo lại theo luồng thật, agy bài 2):** 44 lệnh: 36 PASS, 4 FAIL, 4 bỏ qua. Tôi kiểm lại 4 FAIL: `writer.para.lineSpacing`/`lineSpacingLayout` **không tái hiện** khi con trỏ nằm trong chữ (Ctrl+Z và lệnh undo đều khôi phục đúng; agy chọn vùng khác nên lệnh không áp dụng đúng); `writer.list.bullet`/`numbered` redo chỉ lệch cấu trúc HTML (thẻ `<p>` rỗng quanh danh sách), chưa chứng minh mất dữ liệu. Kết luận: chưa có lỗi Undo thật của sản phẩm; đã bỏ mục sửa lỗi này khỏi danh sách việc.
5. Corpus D7 chưa có tài liệu nào kiểm bằng Word thật; chuẩn đối chiếu là LibreOffice.
6. `docs/RELEASE-0.9.9-DRAFT.md` còn ghi xem nhanh (view-first) mặc định tắt, thực tế đang bật — phải sửa trước khi phát hành. **Bản 0.9.9 vẫn giữ nguyên chưa phát hành; G5 vẫn treo.**
7. Hai tiến trình agy (Sheet UI, Slides UI) và Codex tiền tệ đã chết âm thầm đêm qua (log đứng); agy được chạy lại và xong, phần tiền tệ tôi tiếp nhận và hoàn tất. Opencode (D10 trợ giúp) chưa có kết quả.

## 4. Việc kế tiếp (không cần chờ bạn)

- Doc: D6 kịch bản 11–30, D9 phím tắt, Điều kiện trộn thư, mức đại cương (D4b), sửa P95 gõ phím, xem tay `legacy13.doc`.
- Sheet: 28 xlsx + 20 xls, lan14 chậm (57 s so mục tiêu 35 s), 3 mục UI cần hộp thoại hệ điều hành.
- Slides: thêm pptx mẫu, Morph/phát sóng/âm thanh.
- Pháp lý: SBOM, gói hồ sơ cho luật sư (L4).

## 5. Việc cần bạn quyết định

1. Bấm "Không" + "Không hỏi lại" ở hộp thoại Word (một lần) để mở đo số trang Word thật — hoặc cho phép tôi cài lại/đặt Word làm chương trình mặc định.
2. Nhà cung cấp thanh toán, chính sách khóa cho đơn miễn phí, chính sách sau 30 ngày dùng thử, chứng chỉ ký số, nhãn hiệu (các quyết định thuộc về chủ sở hữu, tôi không tự quyết).
3. Có phát hành 0.9.9 hay chờ Doc đạt 100% (hiện đang giữ).
