# Agent Handoff
TASK: Bao toan danh sach da cap, Heading va muc luc dong khi Doc xuat DOCX
AGENT/ROLE: Codex / Writer export
BRANCH: fix/doc-docx-export-styles-codex
WORKTREE: E:\VNOffice-codex-docexport
OBJECTIVE: DOCX mo trong Word va 3T Doc giu dung `1.` / `a)` / `i.`, Heading 1/2 va truong TOC co the cap nhat.
FINDINGS: Bo loc HTML cua LibreOffice giu noi dung va bo cuc nhung lam phang kieu danh so thanh decimal, xuat heading thanh Body Text va muc luc thanh van ban tinh.
IMPLEMENTATION SUMMARY: Tiep tuc dung bo loc LibreOffice; hau xu ly OOXML chi cho semantics bi mat. Clone abstract numbering va dat lai numFmt/lvlText tung cap; gan pStyle Heading1/Heading2/Heading3 va khai bao built-in style; boc noi dung muc luc hien co trong complex TOC field, bat updateFields; khi nhap lai giu hau to `)` bang marker class. Bo sung Help tieng Viet ve cap nhat muc luc va Navigation Pane.
FILES CHANGED: adapters/libreoffice/common/ooxml_zip_patch.py; adapters/libreoffice/writer/writer-adapter.js; apps/writer/writer.css; platform/help/entries-writer.js; tests/test_writer_basic_ops_ooxml.py; tests/unit/writer-doc-font-spacing.test.js; scripts/recheck_doc_notrun.mjs; scripts/recheck_doc_word_com.ps1; docs/AUDIT-DOC-BASICS.md; docs/audit-results/audit-doc-notrun-results.json; docs/HANDOFF-WRITER-DOCX-STYLES-TOC.md
COMMANDS RUN: `node scripts/recheck_doc_notrun.mjs`; `python -s scripts\layout-audit\_batch_writer_legacy.py "E:\VNOffice-codex-docexport" "E:\VN OFice\file test\landocx" "E:\VNOffice-dist\audit-docexport"`; `node tests/run-tests.js`; `python -m unittest discover -s tests -p "test_writer*.py"`; `node --experimental-websocket tests/live/cdp/run-desktop-regression.mjs` voi LOCALAPPDATA rieng.
BUILD RESULT: NOT RUN - task khong co gate build rieng; da chay day du gate test duoc yeu cau.
TEST RESULTS: PASS - unit tong 2441/2441; Python Writer 124/124; B4/B5 Word COM PASS (`1.`, `a)`, `i.`, Heading 1/2, TOC count 1 va wdFieldTOC); audit LAN 24/24 hang co 0 chenh lech voi baseline o cot trang/doan/sectPr/header/footer/media, trong do d10 giu nguyen timeout da biet.
KNOWN FAILURES: Desktop regression 26 PASS / 1 FAIL / 6 N/A; FAIL da biet ngoai scope la Sheet khong nhan `13:45` thanh time. `recheck_doc_notrun.mjs` con 2 FAIL ngoai scope: A5 overwrite confirmation va B3 Undo paragraph spacing.
RISKS: Mapping OOXML dua tren thu tu va noi dung doan; test da bao phu van ban trung trong TOC va audit 24 tep, nhung tai lieu co nhieu doan danh sach trung het noi dung van can theo doi.
DEPENDENCIES/BLOCKERS: Khong co blocker. Khong sua LibreOffice Core, khong them dependency.
CORE PATCH ID (if any): Khong co.
NEXT ACTION: Reviewer xem commit, co the mo them DOCX thuc te co nhieu danh sach trung noi dung de mo rong regression neu can.
