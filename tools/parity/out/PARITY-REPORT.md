# PARITY-REPORT — khung cong doi chieu W2 (OOXMLKit <-> LibreOffice/app <-> Office COM)

Bo thi lieu: `file test\lan\lan01..lan28.xlsx` (bo lan14), `file test\landocx\d01..d24.docx` (bo d10 — d10.docx la PDF that), `file test\sample-3.pptx`.
Ban LO: tao qua duong save that cua app (tests/live/cdp/roundtrip-file.mjs -> globalUnoBridge.saveRealFileInPlace). Sheet: VNO_AUDIT_MARK_DIRTY=1, khong sua noi dung. Writer: edit ban phim nhu audit chinh thuc (them chu ZZ). Slides: save khong sua.
Ban OOXMLKit edit: xlsx-edit (dat chuoi AGY-PARITY-EDIT vao 1 o moi ben duoi used range), docx-replace (thay doan dau 6 ky tu trong 1 doan van bang doan do + AGYPAR), pptx-title (dat tieu de slide 1).
Cac tep *.json trong tools/parity/out chua du lieu dump (co the co noi dung tai lieu) — .gitignore tu cho commit, chi giu PARITY-REPORT.md.

## Excel (XLSX - 3T Sheet)

| Tep | OOXMLKit: pass | giu nguyen byte? | OOXMLKit: save | phan khac (sua 1 o) | c14n part khac | Excel COM lech (OOXMLKit) | LO | Excel COM lech (LO) |
|---|---|---|---|---|---|---|---|---|
| lan01 | PASS | BYTE-IDENTICAL | PASS | 3/13 | 0/3 | 0 lech | PASS | 0 lech |
| lan02 | PASS | BYTE-IDENTICAL | PASS | 3/20 | 0/3 | 0 lech | PASS | 0 lech |
| lan03 | PASS | BYTE-IDENTICAL | PASS | 3/327 | 0/3 | 11 lech [only_other=11] | PASS | 1957 lech [type=30, value=30, formula=30, only_orig=1787, only_other=80] |
| lan04 | PASS | BYTE-IDENTICAL | PASS | 3/126 | 0/3 | 0 lech | PASS | 0 lech |
| lan05 | PASS | BYTE-IDENTICAL | PASS | 3/13 | 0/3 | 0 lech | PASS | 0 lech |
| lan06 | PASS | BYTE-IDENTICAL | PASS | 3/23 | 0/3 | 5 lech [only_other=5] | PASS | 0 lech |
| lan07 | PASS | BYTE-IDENTICAL | PASS | 3/24 | 0/3 | 13 lech [only_other=13] | PASS | 0 lech |
| lan08 | PASS | BYTE-IDENTICAL | PASS | 3/46 | 0/3 | 14 lech [only_other=14] | PASS | 629 lech [type=92, value=232, formula=232, only_orig=51, only_other=22] |
| lan09 | PASS | BYTE-IDENTICAL | PASS | 3/474 | 0/3 | 0 lech | PASS | 36800 lech [numberformat=20800, only_orig=16000] |
| lan10 | PASS | BYTE-IDENTICAL | PASS | 3/179 | 0/3 | 34 lech [only_other=34] | PASS | 395 lech [type=16, value=35, formula=35, only_orig=294, only_other=15] |
| lan11 | PASS | BYTE-IDENTICAL | PASS | 3/219 | 0/3 | 0 lech | PASS | 29837 lech [only_orig=29837] |
| lan12 | PASS | BYTE-IDENTICAL | PASS | 3/314 | 0/3 | 11 lech [only_other=11] | PASS | 549 lech [only_orig=114, only_other=435] |
| lan13 | PASS | BYTE-IDENTICAL | PASS | 3/26 | 0/3 | BLOCKED(oracle chua PASS: None/None) | NOT RUN | BLOCKED(oracle chua PASS: None/None) |
| lan15 | PASS | BYTE-IDENTICAL | PASS | 3/27 | 0/3 | BLOCKED(oracle chua PASS: None/None) | NOT RUN | BLOCKED(oracle chua PASS: None/None) |
| lan16 | PASS | BYTE-IDENTICAL | PASS | 3/369 | 0/3 | BLOCKED(oracle chua PASS: None/None) | NOT RUN | BLOCKED(oracle chua PASS: None/None) |
| lan17 | PASS | BYTE-IDENTICAL | PASS | 3/39 | 0/3 | BLOCKED(oracle chua PASS: None/None) | NOT RUN | BLOCKED(oracle chua PASS: None/None) |
| lan18 | PASS | BYTE-IDENTICAL | PASS | 3/24 | 0/3 | BLOCKED(oracle chua PASS: None/None) | NOT RUN | BLOCKED(oracle chua PASS: None/None) |
| lan19 | PASS | BYTE-IDENTICAL | PASS | 3/16 | 0/3 | BLOCKED(oracle chua PASS: None/None) | NOT RUN | BLOCKED(oracle chua PASS: None/None) |
| lan20 | PASS | BYTE-IDENTICAL | PASS | 3/13 | 0/3 | BLOCKED(oracle chua PASS: None/None) | NOT RUN | BLOCKED(oracle chua PASS: None/None) |
| lan21 | PASS | BYTE-IDENTICAL | PASS | 4/27 | 0/4 | BLOCKED(oracle chua PASS: None/None) | NOT RUN | BLOCKED(oracle chua PASS: None/None) |
| lan22 | PASS | BYTE-IDENTICAL | PASS | 3/30 | 0/3 | BLOCKED(oracle chua PASS: None/None) | NOT RUN | BLOCKED(oracle chua PASS: None/None) |
| lan23 | PASS | khac byte chi o vỏ ZIP: same=17/17 phan | PASS | 3/17 | 0/3 | BLOCKED(oracle chua PASS: None/None) | NOT RUN | BLOCKED(oracle chua PASS: None/None) |
| lan24 | PASS | BYTE-IDENTICAL | PASS | 3/23 | 0/3 | BLOCKED(oracle chua PASS: None/None) | NOT RUN | BLOCKED(oracle chua PASS: None/None) |
| lan25 | PASS | BYTE-IDENTICAL | PASS | 3/12 | 0/3 | BLOCKED(oracle chua PASS: None/None) | NOT RUN | BLOCKED(oracle chua PASS: None/None) |
| lan26 | PASS | BYTE-IDENTICAL | PASS | 3/88 | 0/3 | BLOCKED(oracle chua PASS: None/None) | NOT RUN | BLOCKED(oracle chua PASS: None/None) |
| lan27 | PASS | BYTE-IDENTICAL | PASS | 3/10 | 0/3 | BLOCKED(oracle chua PASS: None/None) | NOT RUN | BLOCKED(oracle chua PASS: None/None) |
| lan28 | PASS | BYTE-IDENTICAL | PASS | 3/27 | 0/3 | BLOCKED(oracle chua PASS: None/None) | NOT RUN | BLOCKED(oracle chua PASS: None/None) |

## Word (DOCX - 3T Doc)

| Tep | OOXMLKit: pass | giu nguyen byte? | OOXMLKit: save | phan khac (thay 1 doan) | c14n part khac | Word COM lech (OOXMLKit, bo hash van ban) | LO | Word COM lech (LO) |
|---|---|---|---|---|---|---|---|---|
| d01 | PASS | BYTE-IDENTICAL | PASS | 1/33 | 0/1 | 0 lech | PASS | 1 lech [textSha256=1] |
| d02 | PASS | BYTE-IDENTICAL | PASS | 1/16 | 0/1 | 0 lech | PASS | 1 lech [textSha256=1] |
| d03 | PASS | BYTE-IDENTICAL | FAIL | n/a/n/a | 0/0 | BLOCKED(oracle chua PASS) | PASS | 1 lech [textSha256=1] |
| d04 | PASS | BYTE-IDENTICAL | PASS | 1/22 | 0/1 | 0 lech | PASS | 1 lech [textSha256=1] |
| d05 | PASS | khac byte chi o vỏ ZIP: same=13/13 phan | PASS | 1/13 | 0/1 | 0 lech | PASS | 1 lech [textSha256=1] |
| d06 | PASS | BYTE-IDENTICAL | PASS | 1/17 | 0/1 | 0 lech | PASS | 2 lech [paragraphs=1, textSha256=1] |
| d07 | PASS | BYTE-IDENTICAL | PASS | 1/18 | 0/1 | 0 lech | PASS | 2 lech [inlineShapes=1, textSha256=1] |
| d08 | PASS | BYTE-IDENTICAL | PASS | 1/13 | 0/1 | 0 lech | PASS | 1 lech [textSha256=1] |
| d09 | PASS | BYTE-IDENTICAL | PASS | 1/19 | 0/1 | 0 lech | PASS | 2 lech [paragraphs=1, textSha256=1] |
| d11 | PASS | BYTE-IDENTICAL | PASS | 1/12 | 0/1 | 0 lech | PASS | 1 lech [textSha256=1] |
| d12 | PASS | BYTE-IDENTICAL | PASS | 1/15 | 0/1 | 0 lech | PASS | 3 lech [paragraphs=3, shapes=4, textSha256=1] |
| d13 | PASS | BYTE-IDENTICAL | PASS | 1/20 | 0/1 | 0 lech | PASS | 1 lech [textSha256=1] |
| d14 | PASS | BYTE-IDENTICAL | PASS | 1/15 | 0/1 | BLOCKED(oracle chua PASS) | NOT RUN | BLOCKED(oracle chua PASS) |
| d15 | PASS | BYTE-IDENTICAL | PASS | 1/22 | 0/1 | BLOCKED(oracle chua PASS) | NOT RUN | BLOCKED(oracle chua PASS) |
| d16 | PASS | BYTE-IDENTICAL | PASS | 1/13 | 0/1 | BLOCKED(oracle chua PASS) | NOT RUN | BLOCKED(oracle chua PASS) |
| d17 | PASS | BYTE-IDENTICAL | PASS | 1/19 | 0/1 | BLOCKED(oracle chua PASS) | NOT RUN | BLOCKED(oracle chua PASS) |
| d18 | PASS | BYTE-IDENTICAL | PASS | 1/13 | 0/1 | BLOCKED(oracle chua PASS) | NOT RUN | BLOCKED(oracle chua PASS) |
| d19 | PASS | BYTE-IDENTICAL | PASS | 1/13 | 0/1 | BLOCKED(oracle chua PASS) | NOT RUN | BLOCKED(oracle chua PASS) |
| d20 | PASS | BYTE-IDENTICAL | PASS | 1/20 | 0/1 | BLOCKED(oracle chua PASS) | NOT RUN | BLOCKED(oracle chua PASS) |
| d21 | PASS | BYTE-IDENTICAL | PASS | 1/24 | 0/1 | BLOCKED(oracle chua PASS) | NOT RUN | BLOCKED(oracle chua PASS) |
| d22 | PASS | BYTE-IDENTICAL | PASS | 1/19 | 0/1 | BLOCKED(oracle chua PASS) | NOT RUN | BLOCKED(oracle chua PASS) |
| d23 | PASS | BYTE-IDENTICAL | FAIL | n/a/n/a | 0/0 | BLOCKED(oracle chua PASS) | NOT RUN | BLOCKED(oracle chua PASS) |
| d24 | PASS | BYTE-IDENTICAL | FAIL | n/a/n/a | 0/0 | BLOCKED(oracle chua PASS) | NOT RUN | BLOCKED(oracle chua PASS) |

## PowerPoint (PPTX - 3T Slides)

| Tep | OOXMLKit: pass | giu nguyen byte? | OOXMLKit: save (doi tieu de) | phan khac | c14n part khac | PPT COM lech (OOXMLKit) | LO | PPT COM lech (LO) |
|---|---|---|---|---|---|---|---|---|
| sample-3 | PASS | khac byte chi o vỏ ZIP: same=103/103 phan | PASS | 1/103 | 0/1 | 0 lech | PASS | 0 lech |

## Chi tiet LO FAIL

## Ket luan

So lieu tong hop duoc dien tu ket qua that cac stage ooxml/lo/mso da chay (khong suy dien).

## Phan OOXMLKit con thieu (tong hop tu README cua OOXMLKit)

- XLSX: khong tinh lai cong thuc khi sua (chi ghi gia tri cache/dat co fullCalcOnLoad); chen/xoa cot chi ap dung trong pham vi du lieu bang; chua co API sua dinh dang co dieu kien, xac thuc du lieu, bnh luan, pivot, bieu do.
- DOCX: setText lam mat lien ket/truong trong doan; chua tao bang moi/danh sach co so/section/binh luan; chua co theo doi thay doi (track changes).
- PPTX: nhan ban slide khong chep ghi chu; chua co API sua bieu do; bonh luan slide chua duoc xu ly.
- Tong quat: khong ho tro tep co mat khau o ma hoa OLE/CFB; khong ho tro dinh dang nhi phan cu (DOC/XLS/PPT); DOM nap toan bo phan XML vao bo nho.
