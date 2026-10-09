# TICKET RB-D1b — Doc tab Trang dau: lam tiep theo QUY TAC MOI (Codex)
Doc docs/tickets-0710/RIBBON-AUDIT-RULES.md (BAT BUOC, thay the cac yeu cau ngan cua TICKET-RB-D1). Worktree E:\VNOffice-codex-rbd1 (nhanh audit/doc-ribbon-home-codex) da co 7 commit: khung scripts/audit-0610/ribbon_functional.mjs, word_home_oracle.ps1, tests/live/ribbon-specs/doc-home.json (53 dieu khien), sua highlight va gach chan. LAM TIEP:
(1) git merge main truoc (main da co SB7-SB13, SC1, SC2) va sua xung dot.
(2) Nang khung len TAI LIEU DAI nhieu ngu canh (quy tac 1-2): doc-home.json hien dung doan ngan -> them tai lieu corpus dai + tai lieu >= 30 trang tu tao, moi nut >= 3 ngu canh.
(3) Phim tat tab Trang dau (quy tac 4): bang day du, kiem tung phim, bo sung phim thieu.
(4) Icon thieu so voi Word tab Trang dau (quy tac 5): bo sung day du.
(5) Viet docs/AUDIT-DOC-RIBBON-HOME-1010.md (quy tac 7).
Tieu chi xong: node tests/run-tests.js khong FAIL moi (2957); python -m unittest discover -s tests OK; chay toan tab 2 lan lien tiep cung ket qua; bao cao co du 7 cot.