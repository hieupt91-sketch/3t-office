# TASK BRIEF — Writer save-back, vòng R13 (Grok): sửa 2 lỗi đã chẩn đoán ở R12 (bảng nhân đôi d09, mất `w:br type="page"` d13/d21)

Worktree: `E:\VNOffice-grok-writer-saveback-r13` (nhánh `fix/writer-saveback-r13-grok`, tách từ `main`). Chỉ làm trong worktree này.
Claude kiểm chứng độc lập rồi merge.

## Bối cảnh — ĐỌC TRƯỚC
`docs/HANDOFF-WRITER-SAVEBACK-R12.md` (đã có sẵn trong worktree này) đã đo chiều lưu thật (mở DOCX → sửa → lưu → Word 2016 mở lại) qua 4 tầng (LO Import, App Export, LO HTML→DOCX, Real Save) cho 5 file (d09, d06, d15, d13, d21) và chẩn đoán CHÍNH XÁC 4 lỗi (A/B/C/D). **Lỗi C (d15, `w:pageBreakBefore` gán nhầm vào cell rỗng) đã được sửa** (commit `fbfe063 fix(writer): W22d`). **Lỗi A và D dưới đây CHƯA sửa — đây là nhiệm vụ của bạn.** Lỗi B (d06 mất Rectangle/Connector) là lỗi CHIỀU NHẬP (không phải lưu) và KHÔNG thuộc phạm vi task này — bỏ qua, đừng động vào.

### Lỗi A — d09: bảng bị nhân đôi khi lưu (tầng 3, LibreOffice HTML→DOCX)
Stage1/Stage2 (import + export HTML) chỉ có 2 bảng. Stage3 (LibreOffice chuyển HTML→DOCX khi lưu) tự sinh ra bảng thứ 3 là **bản sao y hệt bảng 2** (nội dung: "Năm Tài Chính 2019 2020 2021" / "Doanh Thu ..." / "Chi Phí ..."). Vị trí sửa đề xuất trong `adapters/libreoffice/common/ooxml_zip_patch.py`, hàm `postprocess_created_writer_docx`: phát hiện bảng trùng lặp hoàn toàn (cùng nội dung header + toàn bộ cell) đứng liền/sát nhau trong body và loại bỏ bản sao thừa.

### Lỗi D — d13, d21: mất hoàn toàn `w:br type="page"` khi lưu (tầng 3)
Nguồn có 1 `w:br type="page"`, còn nguyên tới Stage1/Stage2 (HTML giữ `page-break-before: always`/`break-before: page`), nhưng biến mất hoàn toàn ở Stage3 (LibreOffice HTML→DOCX) — không sinh ra `w:pageBreakBefore` cũng không giữ `w:br`. Vị trí sửa đề xuất: cùng hàm `postprocess_created_writer_docx`, mở rộng logic W22d đã sửa lỗi C (dùng bookmark `vno-untouched-N` để map đúng đoạn) — áp dụng cho trường hợp LibreOffice bỏ qua hoàn toàn thay vì gán nhầm.

## Cách làm
1. Đọc kỹ `docs/HANDOFF-WRITER-SAVEBACK-R12.md` và code W22d hiện tại (tìm `# W22d` trong `ooxml_zip_patch.py`, dòng ~10790) để hiểu cơ chế bookmark `vno-untouched-N` đã dùng — tái dùng, không viết cơ chế mới song song.
2. Dùng lại script đã có `scripts/layout-audit/_saveback_stages.py` (đã commit từ R12) để đo lại 4 tầng cho d09/d13/d21 TRƯỚC khi sửa (xác nhận lỗi vẫn còn), rồi đo lại SAU mỗi thay đổi nhỏ.
3. Sửa lỗi A trước, đo lại d09 (bảng phải về đúng 2, không phá số đoạn/bảng của 4 file còn lại), commit. Sau đó sửa lỗi D, đo lại d13/d21 (br phải giữ lại đúng vị trí), commit riêng.
4. Chạy lại **toàn bộ 23 file .docx hợp lệ** trong `file test\landocx` (đo bằng Word 2016 COM thật, không suy đoán) để xác nhận: (a) 2 lỗi mục tiêu hết; (b) không file nào khác bị hồi quy số trang/số đoạn/số bảng so với baseline hiện tại (canvas = Word 22/22 phải giữ nguyên — đây là mốc vừa đạt được, KHÔNG được làm giảm).

## Ràng buộc
- Không đụng lỗi B (d06 Rectangle/Connector, chiều nhập) — ngoài phạm vi.
- Không sửa UI ribbon/command-definitions/i18n/help.
- `$env:LOCALAPPDATA = "E:\VNOffice-profiles\grok"` trước khi chạy app/soffice/Word COM.
- Không commit tài liệu thật, không đổi tên file trong `file test\`.
- Test bắt buộc trước mỗi commit: `node tests/run-tests.js` (foreground). Nếu có test soffice-dependent flake do agent khác chạy song song, chạy lại 1 lần với profile riêng trước khi kết luận hồi quy thật.
- Commit tiền tố `fix(writer): W-saveback-r13a ...` (lỗi A) và `fix(writer): W-saveback-r13d ...` (lỗi D), mỗi lỗi 1 commit riêng. Không rebase/force.

## Bàn giao
`docs/HANDOFF-WRITER-SAVEBACK-R13.md`: với mỗi lỗi — cách sửa, đo trước/sau trên file mục tiêu, đo lại toàn bộ 23 file lưu (không hồi quy), kết luận trung thực (nếu không sửa được sạch, nói rõ tại sao và còn gì sót — đừng ép kết luận tích cực).
