# FIX-S8 (Sheet vs Excel) - phan con lai cua S7
Bang chung: docs/AGENT-HANDOFF-FIX-S7-CODEX.md (da merge main). Con lai:
1. Hop thoai Dinh nghia ten (Name Manager): nhap ten/tham chieu roi Luu nhung khong vao danh sach ten, file luu Names=0 -> sua cho dung, doi chieu Excel COM (Names.Count, RefersTo).
2. Xoay chu (text rotation) va le in (margins): do voi Excel COM (Orientation, Page margins), sua lech.
3. Do rong cot 8.43 vs 8.5/10.88 sau chen cot: probe co kiem soat, ket luan truoc khi sua.
4. Format as Table chi to mau, khong tao ListObject: CHI ghi nhan, KHONG lam (chu so huu quyet).
Quy tac: Excel COM CHI DOC (chua kich hoat); app ghi XLSX, Excel doc lai; thao tac bang chuot+phim that qua CDP (cam SendKeys, kill theo PID), chup anh; VNO_APP_ROOT=<worktree>, VNO_AUDIT_MARK_DIRTY=1; moi muc 1 commit; kem huong dan tieng Viet + i18n; bao cao 3 dong. TIET KIEM TOKEN: chi delta.