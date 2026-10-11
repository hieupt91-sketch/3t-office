# Brief R17 (opencode) — Đo lại chiều lưu 23 file sau các sửa nhập trong ngày (W10b/W12e/W23/W24a/W25/W26/W30/W31) và soát tác dụng phụ lên DOCX lưu. CHỈ ĐO

Main `ec654d3`. Các sửa nhập thêm style inline vào HTML (li `margin-left`/`--vno-lh`, `<p>` rỗng `font-size`, `<table
width=px>`/`<col width=px>`, header/footer `font-size` vùng…). Khi lưu, HTML này gửi LibreOffice → DOCX có thể đổi (vd
`w:ind` của mục danh sách bị cộng thêm, `w:tblW`/`w:gridCol` đổi, `w:sz` của dấu đoạn rỗng đổi). Cần số.

Worktree `E:\VNOffice-opencode-writer-r17` (branch `audit/writer-r17`), `$env:LOCALAPPDATA = "E:\VNOffice-profiles\opencode"`.
Mẫu `E:\VN OFice\file test\landocx` (bỏ d10). Đối chiếu với `docs/HANDOFF-WRITER-SAVEBACK-R11B.md`.

## Việc

1. `python scripts/layout-audit/_batch_writer.py . "E:\VN OFice\file test\landocx" _saveback3` theo nhóm 4–5 file (như
   R11), gộp bảng đầy đủ 23 dòng; cột so sánh `saved pages` R11b → R17 và `paras/br/pbb/hdr/ftr/media` (đã có từ R11b).
2. Soát 4 tác dụng phụ (giải nén DOCX gốc vs bản lưu `_saveback3/_rt_dNN.docx`, đếm bằng regex, dán số):
   - **Danh sách (W10b)**: d15, d09, d07 — với 5 đoạn `numPr` đầu: `w:ind` (`left/hanging`) gốc vs lưu; số `<w:numPr>` gốc vs lưu.
   - **Bảng (W30)**: d01, d04, d13 — `w:tblW` (w, type) và dãy `w:gridCol` gốc vs lưu (twips; sai lệch ≤ 20 twips = OK).
   - **Đoạn rỗng (W26)**: d07, d15 — 5 `w:p` rỗng đầu: `pPr/rPr/sz` gốc vs lưu.
   - **Header/footer (W23/W26b)**: d09, d15 — `header*.xml`/`footer*.xml`: số đoạn và `w:sz` gốc vs lưu; `w:pgMar`
     top/bottom/header/footer gốc vs lưu.
3. Handoff `docs/HANDOFF-WRITER-R17.md`: bảng 23 file + 4 bảng soát + kết luận "hồi quy ở đâu" (file, thuộc tính, gốc →
   lưu). Không sửa code, không bịa số, không commit `file test`/`_saveback3`, không tên tài liệu thật. Commit handoff
   (`git commit -F`, tiếng Việt không dấu).
