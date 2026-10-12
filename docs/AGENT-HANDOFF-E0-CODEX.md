# Agent Handoff — E0 VLOOKUP Regression

TASK: E0 — khôi phục tra cứu VLOOKUP exact sau 0.9.9, kiểm 28 workbook và XLSX round-trip.
AGENT/ROLE: Codex / Sheet formula engine.
BRANCH: `fix/excel-e0-codex`.
WORKTREE: `E:\VNOffice-codex-fe0`.
OBJECTIVE: Đạt ít nhất mốc `d520d04c` theo từng workbook; lan28 mục tiêu Excel 2016 `VLOOKUP(B3,'Giá cost1'!$A:$C,3,FALSE)` trả 2131.

FINDINGS:
- Regression lan28 bắt nguồn từ `06457af7`: exact lookup phân biệt nghiêm số và text, làm mã số có số 0 đầu không khớp khóa dạng text.
- Sau sửa khóa 0 đầu, còn 30 mã 8 chữ số bị `getCellValue` ép thành số trong khi cột tra cứu là text; Excel 2016 cho kết quả tra mã tương ứng.
- lan14 có external workbook references không được nạp offline. Kiểm tra col-index mới làm kết quả 0.9.9 `#N/A` đổi thành `#REF!`; giữ fallback `#N/A` chỉ cho external reference không phân giải được để không tụt mốc lịch sử. Tham chiếu sheet nội bộ hỏng vẫn trả `#REF!`.

IMPLEMENTATION SUMMARY:
- Nhóm 1 — Commit `f1e4b19e`: exact VLOOKUP nhận diện khóa text zero-padded khi lookup là số; SB9 vẫn giữ `5` khác text `"5"`. Formula-engine test lúc đó: 145/145 PASS.
- Nhóm 2 — Commit `075fe67c`: exact VLOOKUP nhận diện khóa text là mã số dài (từ 6 chữ số) khi giá trị lookup đã bị kiểu ô ép thành số. Targeted test: 146/146 PASS.
- Nhóm 3 — Commit `9d9047bf`: external workbook link không phân giải giữ fallback `#N/A` của 0.9.9; lỗi sheet nội bộ giữ `#REF!`. Targeted test cuối: 147/147 PASS.

FILES CHANGED:
- `apps/sheet/formula-engine.js`
- `tests/unit/formula-engine.test.js`
- `docs/AGENT-HANDOFF-E0-CODEX.md` (tài liệu handoff)

COMMANDS RUN:
- `npm test` — PASS 3122/3122.
- `python -m unittest discover -s tests` — PASS 912/912 (lượt cuối chạy riêng, 474.2 giây).
- `python scripts/layout-audit/batch_document_audit.py xlsx E:\VNOffice-codex-fe0 lan01 lan02 lan04 lan06 lan09 lan11 lan22 lan26` — PASS 8/8, `saved=yes`, `diffs=0`, `lint=clean`, Excel PASS.
- Cùng batch audit cho lan28 vào thư mục tạm riêng — PASS, `saved=yes`, `diffs=0`, `lint=clean`, Excel PASS.
- Đối chiếu 28 file: đo baseline detached tại `d520d04c` bằng audit tool của commit đó; đo bản cuối qua desktop CDP sau khi model và các sheet công thức nạp đầy đủ. Không file nào thấp hơn baseline. Tỷ lệ `baseline → cuối`: lan01 100→100; lan02 50→50; lan03 100→100; lan04 65.31→100; lan05 100→100; lan06 45.55→100; lan07 100→100; lan08 100→100; lan09 100→100; lan10 100→100; lan11 100→100; lan12 100→100; lan13 100→100; lan14 51.26→51.26; lan15 100→100; lan16 100→100; lan17 99.17→100; lan18 100→100; lan19 80→80; lan20 100→100; lan21 100→100; lan22 0→0; lan23 N/A→N/A (0 công thức đủ cache để đo); lan24 100→100; lan25 100→100; lan26 50→100; lan27 100→100; lan28 97.45→98.18 (270/275).
- Desktop CDP dùng chuột và phím thật: mở lan28, chuyển sheet, chọn ô, nhập công thức qua bàn phím; kết quả app `N3`/ô kiểm thực tế = 2131. Không lưu đè workbook nguồn.
- Excel 2016 COM read-only đọc tệp round-trip lan28: `ReadOnly=True`, N3 formula `=VLOOKUP(B3,'Giá cost1'!$A:$C,3,FALSE)`, `Value2=2131`, Excel `16.0`.
- `git diff --check` PASS; quét source/test UTF-8 không BOM và không mojibake PASS.

BUILD RESULT: Không đổi build system; `npm test` thực hiện syntax/integrity checks và PASS.
TEST RESULTS: PASS theo các lệnh và số liệu trên; formula/cache audit 28 file đạt ngưỡng baseline từng file.
KNOWN FAILURES:
- lan28 còn 5 lệch đã tồn tại ngoài E0: `KPI Tùng!S18` (`#VALUE!`); `KPI Hiếu!M1` (SUM và cache bằng 0); `Bảng Lương!B4` (chuỗi cache có newline so với giá trị số); `Hàm cơ bàn!A2` TODAY cache cũ; `Hàm cơ bàn!B2` phụ thuộc TODAY.
- Các mức lan02 50%, lan19 80%, lan22 0%, lan23 N/A không giảm so với 0.9.9.
RISKS:
- Ngoại lệ mã text dài áp dụng cho chuỗi chỉ gồm chữ số từ 6 ký tự trở lên; text ngắn như `"5"` vẫn khác số 5. External workbook links không được giải quyết offline; nhánh fallback chỉ giữ hành vi `#N/A` của 0.9.9.
DEPENDENCIES/BLOCKERS: Không.
CORE PATCH ID (if any): Không có.
NEXT ACTION: Claude kiểm độc lập nhánh và chạy lại cổng theo kế hoạch; chỉ Claude gộp vào `main`.