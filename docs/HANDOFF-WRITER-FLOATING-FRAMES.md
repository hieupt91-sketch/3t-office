# Agent Handoff

TASK: Writer floating frames fidelity
AGENT/ROLE: Codex / Writer + Integration owner
BRANCH: fix/writer-floating-frames-fidelity
WORKTREE: E:\VNOffice-codex-writer-frames
OBJECTIVE: Không dàn phẳng ảnh neo/hộp văn bản khi mở và lưu DOCX; giữ số trang tương đương Word 2016.
FINDINGS: LibreOffice HTML đã có `position:absolute`, top/left/width/height nhưng adapter cũ đổi tất cả sang inline và sanitizer xóa geometry. LibreOffice HTML import có thể sinh hai `a:solidFill` trong `wps:spPr`, khiến Word 2016 từ chối file.
IMPLEMENTATION SUMMARY: Import tạo marker `data-vno-float` với geometry cm và metadata anchor OOXML; cụm textbox dùng container neo `position:relative`; export ảnh thành `img` absolute và textbox thành `div` absolute; sanitizer giữ geometry của float. Post-process gộp `a:solidFill` (giữ fill cuối) và khôi phục `relativeFrom`, `behindDoc`, wrap theo thứ tự tài liệu.
FILES CHANGED: adapters/libreoffice/writer/writer-adapter.js; adapters/libreoffice/common/ooxml_zip_patch.py; tests/unit/writer-floating-image-import.test.js; tests/test_writer_section_headerfooter_postprocess.py; platform/help/entries-writer.js; docs/HANDOFF-WRITER-FLOATING-FRAMES.md
COMMANDS RUN: targeted JS/Python tests; `_roundtrip_save_writer.py`; `_docx_struct.py`; `_word_oracle.ps1`; reopen round-trip; full syntax/JS/Python suites.
BUILD RESULT: node scripts/check-syntax.js OK (Claude chạy lại sau khi Codex hết hạn mức).
TEST RESULTS: JS 1708/1708 PASS; Python writer (section header/footer post-process, track changes import, image inline) 23/23 OK. Xác minh độc lập của Claude bằng Word 2016 COM: Aquara 29 → 17 trang (gốc 16), MYTIME 173 → 88 trang (gốc 88), cả hai OK; anchor 148/137, txbxContent 274 (Aquara).
KNOWN FAILURES: Canvas soạn thảo hiển thị khung nổi theo toạ độ LibreOffice tương đối đoạn neo; trang bìa Aquara (ảnh neo trang, toạ độ âm) còn lệch so với Word — cần vòng hiển thị riêng (so ảnh trang Word vs canvas).
RISKS: LibreOffice biểu diễn 498 paragraph trong textbox Aquara thành 148 HTML textbox, rồi ghi mỗi textbox thành một `wp:anchor`; nội dung/geometry và Word-open được giữ nhưng cấu trúc không byte-equivalent nguồn.
DEPENDENCIES/BLOCKERS: Word 2016 COM và LibreOffice cục bộ chỉ dùng để xác minh; app production vẫn offline, không thêm dependency/server.
CORE PATCH ID (if any): N/A
NEXT ACTION: QA trực quan thêm các trang Aquara có cụm textbox dày nếu cần pixel-level comparison.

## Khớp anchor khi post-process

Metadata nguồn được đọc từ `word/document.xml` theo thứ tự xuất hiện của `wp:anchor`. Anchor thứ N do LibreOffice tạo được ghép với anchor nguồn thứ N; khôi phục độc lập `wp:positionH/@relativeFrom`, `wp:positionV/@relativeFrom`, `behindDoc` và loại wrap. Nếu số lượng lệch, chỉ cặp có ở cả hai phía được áp; anchor dư giữ semantics LibreOffice, không đoán.

## Word 2016 và cấu trúc thật

| File | Word gốc | Word sau | Cấu trúc gốc | Cấu trúc sau |
|---|---:|---:|---|---|
| Aquara | 16 | **17 (OK)** | anchor 11; inline 5; txbxContent 498; paragraph 516 | anchor 148; inline 5; txbxContent 274; paragraph 402 |
| MYTIME | 88 | **88 (OK)** | anchor 137; inline 4; txbxContent 0; paragraph 438 | anchor 137; inline 4; txbxContent 0; paragraph 395 |

Hai file sau lưu đều mở lại qua luồng LibreOffice HTML → `WriterAdapter._normalizeImportedHtml()` → export → DOCX không lỗi. Aquara lệch +1 trang, nằm trong ngưỡng ≤18; MYTIME khớp mục tiêu 88 và dưới ngưỡng ≤97.

## Hướng dẫn sử dụng

Mở DOCX như bình thường bằng **Tệp → Mở**. Ảnh neo và hộp văn bản nổi được giữ tại tọa độ gốc; ảnh phía sau chữ vẫn nằm sau chữ, các kiểu bọc chữ lấy từ DOCX được giữ khi lưu. Có thể tìm kiếm, hoàn tác và xem trước khi in bình thường. Phiên bản này chưa cho chọn/kéo khung nhập trực tiếp; để đổi vị trí, chỉnh trong ứng dụng nguồn rồi mở lại. Bài **Chèn hình ảnh** trong tab **Trợ giúp** cũng nêu giới hạn này.
