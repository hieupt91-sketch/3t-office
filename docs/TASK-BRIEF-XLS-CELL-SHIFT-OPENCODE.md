# TASK BRIEF — CHẨN ĐOÁN: lưu .xls Excel 95 làm lệch cột ô B2/C2 (opencode, KHÔNG sửa code)

Worktree: `E:\VNOffice-opencode-xls-shift` (nhánh `audit/xls-cell-shift-opencode`, tách từ `main`). Đặt `$env:LOCALAPPDATA = "E:\VNOffice-profiles\opencode"`.

## Hiện tượng (đã tái hiện, Claude xác nhận)
`python scripts\layout-audit\_batch_xls_roundtrip.py "E:\VN OFice" "E:\VN OFice\file test\lan-legacy" <out> legacy05.xls legacy09.xls legacy14.xls legacy17.xls legacy18.xls` (tệp thật, gitignored, KHÔNG commit/sao chép vào repo): cả 5 tệp, ô `B2` gốc là dòng "Đồng Hới, ngày …" / "Ba Đồn , ngày 27…" nhưng bản lưu `B2` = địa chỉ web "https://congnghe3t.com" (hoặc .vn) và dòng ngày bị đẩy sang `C2`. Tức nội dung ô bị lệch/chèn khi mở hoặc lưu.

## Việc (CHỈ CHẨN ĐOÁN)
Với `legacy05.xls`, đi theo từng bước và ghi bằng chứng THẬT (trích XML ngắn, không dán tài liệu dài):
1. FODS LibreOffice tạo khi MỞ: `python scripts\layout-audit\_time_sheet_open_stages.py <xls>` KHÔNG hỗ trợ .xls → dùng `main._run_soffice_convert(<xls>, "fods", <tmp>, app_kind="sheet")` rồi `main._apply_native_import_overlay` + `_optimize_fods_for_sheet`. Xem hàng 2: B2, C2 là gì (có `text:a` hyperlink? ô gộp `number-columns-spanned`? `draw:frame`? ghi chú?).
2. FODS app GỬI khi lưu: `_roundtrip_save_sheet.py` ghi `<out>.sent.fods` — xem hàng 2 ở đó.
3. .xls bản lưu: chuyển sang FODS bằng soffice, xem hàng 2.
4. Kết luận: lệch xảy ra ở bước nào (1→2 là phía app/JS `parseFods`/`serializeToFods`; 2→3 là LibreOffice xuất .xls), phần tử nào gây ra (ví dụ hyperlink trong ô gộp, text:a…). Kiểm tra thêm 1 tệp khác trong 5 tệp có cùng cơ chế không.

Ghi `docs/HANDOFF-XLS-CELL-SHIFT-FINDINGS.md`: lệnh đã chạy + trích đoạn XML thật của từng bước + kết luận. Claude sẽ tự chạy lại mọi lệnh bạn ghi — số liệu/trích đoạn không tái hiện được sẽ bị coi là bịa. Commit tiền tố `docs(audit): …`. KHÔNG sửa `main.py`, `adapters/**`, `apps/**`, `platform/**`. Không merge vào `main`. Không chạy tác vụ ở nền rồi ngồi chờ.