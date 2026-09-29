# TASK BRIEF — Sheet tăng tốc mở tệp: HOÀN THIỆN PHASE 1 (Codex)

Worktree: `E:\VNOffice-codex-sheet-open-phase1` (nhánh `perf/sheet-open-phase1-claude` — nguyên mẫu của Claude). Đặt `$env:LOCALAPPDATA = "E:\VNOffice-profiles\codex"`. Người phụ trách ĐÃ DUYỆT `docs/PLAN-SHEET-OPEN-PERF.md`.

## Hiện trạng (Claude đo 29/9, `scripts/perf-proto/phase1_skip_initial_xf.py`)
Bỏ tem `vno:xf` ở lượt overlay đầu (`_overlay_sheet_cell_metadata_from_xlsx` qua `_xlsx_cells_with_metadata`), vì `optimize_fods_streaming` gộp ô chỉ theo `style-name` (giữ vno:xf của ô đầu, bỏ của ô sau) và `reoverlay_sheet_xf_indices` xoá mọi vno:xf rồi gắn lại:
- lan06: 119,8 s → 85,7 s, FODS cuối **byte-identical**. lan12, lan28: byte-identical. lan11: khác byte nhưng model `parseFods` IDENTICAL.
- lan14: 96,6 s → 80,5 s, nhưng model KHÁC ở các ô VLOOKUP liên kết ngoài `Sheet1!AP10295…` (`=VLOOKUP(AQ…,'[1. DS ALL SV thoi học.xlsx]ds'!N$8:O$7760,2,0)`): đường hiện tại (A) cho `formula=""`, `val="Nga"`; nguyên mẫu (B) cho formula giữ nguyên + `externalLink`, `val="#N/A"`. Excel lưu cả công thức lẫn giá trị cache "Nga". So model: `node --max-old-space-size=14000 scripts/perf-proto/compare_parsefods_models.mjs A.fods B.fods` (cần ~14 GB — chạy khi máy rảnh, KHÔNG chạy cùng lúc với app nặng khác).

## Việc
1. Tìm vì sao A và B khác ở các ô đó (bước nào làm A mất công thức? vì sao B mất cache "Nga"?). Xác định hành vi ĐÚNG theo Excel: giữ công thức liên kết ngoài + giá trị cache. Sửa để đường mới cho đúng hành vi đó (có thể cả đường cũ đang sai). Commit sớm findings `docs/HANDOFF-SHEET-OPEN-PHASE1-FINDINGS.md`.
2. Đưa phase 1 vào code sản phẩm sau cờ `SHEET_OPEN_SKIP_INITIAL_XF` trong `main.py`/`ooxml_zip_patch.py` (mặc định **bật** chỉ khi đạt tiêu chí dưới; nếu không đạt, mặc định tắt và báo trung thực). Không đổi ngữ nghĩa lưu.
3. Kiểm chứng: model `parseFods` IDENTICAL (hoặc khác chỉ ở chỗ đã chứng minh là sửa đúng theo Excel) trên lan06/11/12/14/28 + 4 fixture; `python scripts\layout-audit\_batch_audit.py <worktree> lanNN.xlsx` 26 tệp TỔNG lệch 0; đo thời gian 2 lượt lan14/lan06; `node tests/run-tests.js` + `python -m unittest discover -s tests`. Ghi số trước/sau.

## Luật cứng
Máy 16 GB RAM, agent khác có thể đang chạy: chạy tệp lớn (lan14/lan06) tuần tự, không song song. KHÔNG chạy tác vụ ở nền rồi ngồi chờ. Không tăng timeout test. Không commit tài liệu thật/FODS. Commit tiền tố `perf(sheet): S33p1`. Không merge vào `main`. Handoff `docs/HANDOFF-SHEET-OPEN-PHASE1.md`, PASS/FAIL/NOT RUN trung thực.