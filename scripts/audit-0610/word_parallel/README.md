# Doi chieu SONG SONG voi Word that (Word COM) — khung kiem nut ribbon Doc

Cach dung (11/10, Claude): lam CUNG MOT thao tac o hai ben roi so thuoc tinh doc lai bang Word COM.
1. `make-template.ps1 -Dir <thu-muc>`: Word tao `template.docx` (3 doan; doan 2 "Alpha beta gamma delta." Times New Roman 12).
2. `app-ops.desktop.mjs` (node --experimental-websocket; dat VNO_APP_ROOT=<worktree>; sua duong dan `dir` o dau tep): moi thao tac mo app, chon doan 2, chay lenh qua CommandBus, luu DOCX that (`app_<op>.docx`).
3. `word-compare.ps1 -Dir <thu-muc>`: Word ap dung cung thao tac (`word_<op>.docx`) roi doc Bold/Italic/Underline/Strike/Sub/Sup/Size/Name/Color/Highlight/Align/LeftIndent/Space*/LineRule/ListType va in bang KHOP/LECH.
Mo rong: them thao tac vao danh sach `ops` (ca ba tep) — tab Chen, Bo cuc, Tham chieu, Danh gia...
Ket qua 11/10 (20 thao tac Trang dau): khop gan het; LECH that: chi so tren/duoi (app luu w:position thay vi w:vertAlign), to sang (app luu w:shd thay vi w:highlight), danh sach (ListType 4 thay vi 2/3), SpaceAfter 7.9 vs 8 pt.