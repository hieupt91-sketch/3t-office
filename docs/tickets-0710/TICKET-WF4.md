# TICKET WF4 — Doc: 3 loi luu/mo nho con ton dong (Codex, sau WF3)
Worktree rieng, nhanh fix/writer-small-gaps-codex, tu main. Moi muc = 1 commit + test (tests/test_writer_*.py hoac tests/unit). Bang chung: docs/GAP-DOC-VS-WORD-0610.md.
MUC 1 — "Ngat trang truoc" (pageBreakBefore) dang luu thanh ngat trang chen vao cuoi doan truoc (LibreOffice doi) thay vi w:pageBreakBefore tren doan. Do bang Word COM tren tep mau tu tao; sua o postprocess (adapters/libreoffice/common/ooxml_zip_patch.py) neu khong lam doi so trang corpus.
MUC 2 — Ten bookmark bi viet thuong khi luu DOCX (Word phan biet hoa thuong khi tham chieu REF/HYPERLINK). Giu nguyen ten goc; test round-trip.
MUC 3 — d05.docx thua 1 doan trong (+1 blank paragraph) sau luu: tim nguyen nhan (sectPr/ngat muc?) va sua neu an toan.
Tieu chi: corpus 43 tep (scripts/audit-0610/doc_linebreak_vs_word.mjs) so trang van 43/43, so doan lech khong tang; node tests/run-tests.js + python -m unittest discover -s tests khong FAIL moi.
Cam/Quy tac: nhu TICKET-WF3.md. KHONG push, KHONG merge. Bao cao 3 dong.