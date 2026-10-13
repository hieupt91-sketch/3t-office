# FIX-S13 (Sheet) - 10 loi LUU XLSX tim ra o FIX-S12 (docs/SHEET-BUTTON-MATRIX-1011.md, cot LECH DA BIET; chi tiet docs/AGENT-HANDOFF-FIX-S12-*.md)
Cac thao tac trong app dung nhung KHONG duoc luu vao XLSX nen Excel doc lai thay mac dinh:
1. Giam thut le: IndentLevel van 1 sau khi giam ve 0.
2. Xoa vung in: PrintArea van con.
3. Duong luoi / Tieu de hang-cot (an): Excel DisplayGridlines/Headings van 1.
4. Hien cong thuc (Ctrl+`): ActiveWindow.DisplayFormulas = 0.
5. Thanh cong thuc an: DisplayFormulaBar = 1.
6. Xem ngat trang / Bo tri trang: ActiveWindow.View = 1 (Normal).
7. Zoom 110%/90%: ActiveWindow.Zoom = 100.
8. Lam moi Pivot: ket qua cu con, lap hang sau refresh.
Day la loi luu (save pipeline) -> PLAN GATE: viet docs/PLAN-SHEET-S13.md truoc (muc tieu, cach luu trang thai xem vao XLSX: sheetView showGridLines/showRowColHeaders/showFormulas/view/zoomScale/zoomScaleNormal... + workbookView + showFormulaBar qua LibreOffice/ooxml_zip_patch.py, rui ro, test, rollback). Muc tieu: moi muc 1-8 Excel COM (CHI DOC) doc lai dung gia tri, XLSX khong thay doi trang thai xem se luu y nhu truoc (khong mac dinh nao bi doi), mo lai file tu Excel giu trang thai xem.
Quy tac: UTF-8 khong BOM; VNO_APP_ROOT=<worktree>, VNO_AUDIT_MARK_DIRTY=1, VNO_CDP_LOCALAPPDATA rieng, junction file test da co; cong: npm test + python -m unittest discover -s tests + batch XLSX lan01,02,04,06,09,11,22,26 (bat buoc: thay doi luu) + quet ma hoa; moi muc COMMIT NGAY; chuot+phim that qua CDP; cap nhat bang bang gen_sheet_button_matrix.py; huong dan VI + i18n neu doi hanh vi nguoi dung thay; dung bao cao som, 3 dong/muc. TIET KIEM TOKEN.