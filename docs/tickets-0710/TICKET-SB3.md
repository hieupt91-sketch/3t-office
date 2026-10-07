# TICKET SB3 — SUA lan truyen loi trong Sheet (phuong an A cua docs/AUDIT-SHEET-ERRORS-DATES-0710.md)
Worktree rieng (nhanh fix/sheet-error-propagation-agy), tu main hien tai. Chi sua trong worktree nay.
Muc tieu: loi (#DIV/0!, #N/A, #VALUE!, #NUM!, #NAME?, #REF!) lan truyen qua phep tinh nhu Excel thay vi bi ep thanh 0.
Hien trang (da chan doan, doc muc 2.1 va 3A cua bao cao): (1) FormulaEngine.getCellValue lam sach chuoi tien te bang replace(/[^\d-]/g,"") nen "#DIV/0!" thanh "0"; (2) _evaluateArithmetic ep chuoi/loi thanh 0 bang (Number(val)||0), chi #REF! duoc xu ly; (3) SUM va collectNumericValues loc loi thanh 0 (chi #REF!); (4) IF khong bao loi khi dieu kien la loi.
Viec (dung de xuat A cua bao cao, 4 vi tri trong apps/sheet/formula-engine.js):
1. getCellValue: neu this._isError(raw) thi tra ve chinh loi — GIU NGUYEN logic lam sach tien te VND cho cac gia tri KHAC loi (khong dung vao hanh vi chuoi co chu so).
2. _evaluateArithmetic: gap loi thi tra ve loi do (#N/A uu tien neu co nhieu loi theo bao cao), chuoi khong ep duoc thanh so -> #VALUE! (chi khi chuoi KHONG lam sach thanh so theo quy tac tien te hien co — de khong pha tinh nang nhap so tien dang chuoi nhu "25.000.000 ₫").
3. SUM, AVERAGE, MIN, MAX, PRODUCT (collectNumericValues): neu doi so (ke ca o trong vung) chua loi thi tra ve loi dau tien; KHONG doi hanh vi voi o van ban thuan (Excel bo qua chuoi trong vung).
4. IF: dieu kien la loi -> tra ve loi; nhanh khong duoc chon van khong duoc tinh (ngan mach).
Tieu chi xong (do bang app desktop that qua CDP, KHONG web):
(a) node --experimental-websocket scripts/audit-0610/sheet_formulas_vs_excel.mjs --oracle-expected: cac phep thu E01,E02,E03,E05,E06,E08,E09 PASS; khong phep thu nao dang PASS bi tut (hien 69 PASS/12 FAIL; sau SB3 phai >= 76 PASS; 5 phep DATE con lai la viec SB4).
(b) them test don vi vao tests/unit/formula-engine.test.js cho tung truong hop muc 5.2 cua bao cao (khong lam phan DATE).
(c) node tests/run-tests.js khong FAIL moi (hien 2860 PASS).
(d) HOI QUY FIDELITY: chay bo 28 xlsx truoc va sau (python scripts/layout-audit/batch_document_audit.py xlsx <worktree>): so lieu cot "saved" va "diffs" (so o sai) phai giu nhu cu (saved=yes diffs=0 cho ca 28). Cot "excel=" se FAIL do Office khong kich hoat — BO QUA cot do, khong sua gi vi no.
Cam: doi expected cho xanh, SendKeys/OS input, kill theo ten tien trinh, pywebview evaluate_js, them dependency, refactor ngoai pham vi, dung vao DATE (SB4). LOCALAPPDATA rieng (VNO_CDP_LOCALAPPDATA). Commit tren nhanh cua ban, KHONG push main, KHONG merge.
Cho agy: chay test trong foreground, khong de tac vu nen; commit som sau moi vi tri sua; bao cao 3 dong.