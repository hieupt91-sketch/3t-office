# TICKET FIX-T5 — Doc: lo loi nho con lai (Codex)  [CHI SUA hanh vi DA CO, KHONG them tinh nang moi]
Nguon: docs/UI-TEST-DOC-1010.md. Moi muc 1 commit nho + test + do bang so (CHUOT va PHIM TAT) tren app desktop, COMMIT SAU MOI MUC. Lam theo thu tu:
1. U7: Bo cuc Bang > nhom "Bang" (Chon o/hang/cot/bang, Xoa bang) bi cat mep tren: sua CSS/bo cuc de hien du.
2. U11 + U12: Gop o khi chua chon nhieu o: hien thong bao tieng Viet ngan (khong im lang); Chon hang/cot/bang: vung chon phai nhin thay duoc (to sang) va dung duoc voi Sao chep/Dinh dang.
3. U14: nut vua bam (To mau o, Vien trang, Can le) khong duoc giu nen "sang" sau khi dong hop thoai (chi sang khi that su la trang thai bat).
4. U17: panel Tro giup mo ra da cuon giua chung: mo ra phai o dau danh sach chu de (scrollTop=0), thay ro ten muc dau.
5. U2: kiem tra chinh ta tieng Viet gach nham tu dung pho bien ("dat" co dau "đạt", "ty" co dau "tỷ"...): xem platform/text/vi-spellchecker.js va tu dien; bo sung THEO CACH HOP LE (khong nap tu dien GPL/co ban quyen khac — nguon tu dien phai la tu viet/CC0; tu dien LibreOffice can chu so huu duyet, KHONG dung); them test cac tu hay gap. Neu khong co nguon hop le -> chi sua loi logic (vd. tu da co dau thanh) va ghi ro con thieu.
6. U3: Ctrl+Space khi chua chon chu: dua trang thai "sap go" (dam/nghieng/gach chan/mau) ve mac dinh nhu Word (lien quan sua U1 o platform/text/spellcheck-dom-controller.js: da co ham hasPendingTypingStyle).
7. U21: nut Sap xep tren 1 doan/khong du doan: hien thong bao tieng Viet ngan.
8. U25: tab Chen o 1366px: nhom ribbon qua rong, nut cuoi ("Ky hieu") bi cat: dung co che thu gon nhom (responsive group collapsing) da co cho cac tab khac / cuon, khong viet lai ca ribbon.
KHONG lam: U5 (luoi chon so hang/cot cua Bang bieu — tinh nang moi), U9/U22 (bang mau), U13 (menu nhanh Huong giay), U4/U24/U32/U34/U36/U39/U41 (thieu chuc nang so voi Word).
Quy trinh/CAM/TIET KIEM TOKEN: nhu TICKET-FIX-T1.md. Worktree E:\VNOffice-codex-ft5 nhanh fix/doc-minor-t5-codex tu main. Sau khi xong: npm test + python unittest, bao so that. Them/chinh Tro giup tieng Viet neu thay doi hanh vi. Bao cao 3 dong.