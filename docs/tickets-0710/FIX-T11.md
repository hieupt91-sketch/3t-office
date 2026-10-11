# FIX-T11 (Doc vs Word) - 61 nut ribbon chua doi chieu
Nguon: docs/DOC-BUTTON-MATRIX-1011.md (cot "CHUA DOI CHIEU"). Chu so huu yeu cau: moi nut phai dung chinh xac va tuong duong Word that.
Thu tu uu tien (moi nhom 1 commit, cap nhat bang bang `python -X utf8 scripts/audit-0610/gen_doc_button_matrix.py` sau khi them muc vao STATUS/NOTE):
1. Trang dau: Dan/Cat/Sao chep/Dan dac biet (giu dinh dang, chi giu chu, hinh anh, bang), Sao chep dinh dang, Xoa dinh dang, Tang/Giam co chu (danh sach co chuan cua Word), Giam thut le, Sap xep doan, Hien/an ky tu dinh dang, To nen doan, Vien doan van.
2. Chen: Trang trang, Van ban thanh bang, Lien ket (Ctrl+K), Danh dau, Chu dau doan, Ngay & Gio, Phuong trinh, Bieu do, So do.
3. Thiet ke/Bo cuc: Hinh mo, Mau trang, Vien trang, Chu de, Danh so dong, Thut dau dong; Xem truoc khi in/In (so trang & kich thuoc PDF).
4. Tham chieu: Chen trich dan, Quan ly nguon, Kieu trich dan, Thu muc tai lieu.
5. Tron thu: Nguon du lieu, Chen truong, Quy tac, Xem truoc, Ban ghi truoc/sau, Hoan tat & Tron (doi chieu ket qua tron voi Word), Phong bi, Nhan.
6. Danh gia/Xem: Kiem tra chinh ta, Dem tu (ky tu co khoang trang lech 0.5-7%: tim quy luat dem cua Word - ky tu dac biet, o bang, hop van ban, tab, ngat dong - roi sua), Che do doc, Bo tri Web, Ngan dan huong, Thuoc, Duong luoi, Zoom (Word zoom theo %), Ghi/Xem Macro.
Quy trinh moi nut: lam cung thao tac trong app (chuot+phim that qua CDP, chup anh, cam SendKeys/OS input, kill theo PID) va trong Word COM; so thuoc tinh/ket qua; lech tai hien duoc -> sua ma (khong sua test cho xanh), kem huong dan tieng Viet + i18n VI/EN, khong ten san pham hang khac trong help/i18n. Nut that su KHONG co tuong duong Word -> ghi "KHAC CO CHU Y" kem ly do.
Cong: npm test + python -m unittest discover -s tests + batch DOCX d01,d02,d06,d07,d13,d20,d24 (VNO_APP_ROOT=<worktree>, junction file test) + quet ma hoa (khong mojibake/BOM). Ghi tep UTF-8 khong BOM. Dung bao cao som, 3 dong/nhom. TIET KIEM TOKEN.