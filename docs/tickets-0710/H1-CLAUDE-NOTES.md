# H1 - ghi chu cua Claude (14/10 ~06:30) cho Codex lam tiep

## Trang thai
- npm test 3198/3198 PASS; bai CDP `tests/live/cdp/sheet-format-cells-controls.desktop.mjs` 18/18 PASS (khi khong con tien trinh EXCEL mo coi; da them Retry vao ps1 doc COM).
- **CHUA DAT cong LAN**: ban WIP gay hoi quy khi luu XLSX. Khong merge cho den khi `batch_document_audit.py xlsx ... lan01 lan02 lan04 lan06 lan09 lan11 lan22 lan26 lan13 lan19` = 0 diff VA khong treo.

## Da tim ra va da sua (chua kiem het tren 10 file)
1. `ooxml_zip_patch.py` (_xlsx_native_formats_by_xf): o to nen "solid" bi ghi nhu mau (fillPattern=solid, mau mat) -> o trang/xam thanh DEN (lan02: 38 diff, lan04: 231, lan01, lan06). Sua: bo qua patternType "solid".
2. Cung ham: `<u val="none"/>` bi doc thanh fontUnderline "none"; da bo qua val="none".
3. `sheet-adapter.js` (import, doan ap nativeFormat): LibreOffice them gach chan gia (`fo:text-decoration=underline`) vao FODS cho o khong co gach chan o XLSX goc -> style.fontUnderline="single" sai (lan01: 172 diff, cot D sheet "Nguon le phi"). Sua: neu overlay nguon khong co fontUnderline va o co origXf thi xoa style.fontUnderline.
4. `sheet-adapter.js` (export): `vno:cell-format` bi ghi cho MOI o (lan09 sheet DVR: 49.182 o). `_apply_native_cell_formats_from_fods` (py ~6282) voi moi o chay `re.compile(...).search(xml)` tren CA sheet => O(so o x kich thuoc sheet) => luu lan09 treo vo han. Da sua: chi ghi `vno:cell-format` khi o KHONG co `vno:xf` (o da sua hoac o moi); o chua sua duoc khoi phuc nguyen xf goc.
   **Chua xac nhan**: sau sua nay batch lan09 van chay >10 phut va khong ghi lai `sent.fods` (nghi treo o buoc MO, khong phai luu). Main chay lan09 111 giay. Kiem tra mo + luu tung buoc (do thoi gian) truoc khi bam batch.
5. Nen viet lai vong lap o 6282 thanh mot lan quet (re.sub voi ham thay the tren toan bo `<c ...>`), khong tim tung o.

## Cong bat buoc truoc khi bao xong
npm test; batch LAN 10 file 0 diff; `sheet_formulas_vs_cache.mjs --force --file lan28` >= 98.18% (lan01/lan04 100%); Excel 2016 COM doc cung gia tri; Help tieng Viet.
Luu y moi truong: tien trinh EXCEL.exe mo coi gay RPC_E_CALL_REJECTED; chi kill theo PID, khong kill theo ten.