# Agent Handoff
TASK: S24a/S24b/S24c - Mac dinh tai lieu VN Sheet tao moi tuong thich Excel 2016
AGENT/ROLE: Codex - Sheet implementation va nghiem thu
BRANCH: fix/sheet-new-doc-defaults
WORKTREE: E:\VNOffice-codex-sheet-s24
OBJECTIVE: Dong bo chieu rong pixel, font/row/column mac dinh va co chu ribbon cua workbook moi voi Excel 2016.
FINDINGS: Excel doc workbook moi dung Calibri 11 pt, hang 20 px, cot 64 px; width can quy doi truc tiep px/MDW; gia tri co chu tren ribbon la pt.
IMPLEMENTATION SUMMARY: Cap nhat model/CSS Sheet ve 20/64 va Calibri 11 pt; serialize FODS khai bao default style; hau xu ly XLSX moi khoi phuc Normal font va sheetFormatPr; quy doi co chu pt sang px; bao toan luong import va bo sung Help tieng Viet. Dong thoi giu cac sua chua lien quan hidden sheet, cell repair va drawing da co trong worktree.
FILES CHANGED: apps/sheet; adapters/libreoffice; main.py; platform/help/entries-sheet.js; scripts/layout-audit/_create_new_sheet.py; tests/test_sheet*.py; tests/unit/sheet*.test.js; docs/QUY-UOC-DOI-CHIEU.md.
COMMANDS RUN: python scripts/layout-audit/_create_new_sheet.py . _new.xlsx; powershell -File scripts/layout-audit/_excel_readback.ps1 -File _new.xlsx; python scripts/layout-audit/_batch_audit.py .; node scripts/check-syntax.js; node tests/run-tests.js; python -m unittest discover -s tests -p "test_sheet*.py".
BUILD RESULT: PASS - JavaScript syntax 92/92, 0 loi.
TEST RESULTS: PASS - Excel COM CHECKS=40 DIFFS=0; batch 26/26 file saved, total diffs 0, Excel OK, lint clean; Node 1779/1779 PASS, 0 FAIL; Python 163 tests OK.
KNOWN FAILURES: Khong.
RISKS: Luong import van dung fallback layout 26/100 truoc khi overlay kich thuoc goc; can giu batch audit khi sua tiep quy doi kich thuoc. Cac artifact _new*, _rt_*, _audit_* va _batch_audit_report.md chi la dau ra nghiem thu, khong commit.
DEPENDENCIES/BLOCKERS: Can LibreOffice/soffice va Excel COM de lap lai nghiem thu day du tren Windows.
CORE PATCH ID (if any): Khong - khong sua LibreOffice Core.
NEXT ACTION: Review commit va merge branch neu khong co yeu cau bo sung.
