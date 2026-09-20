# Handoff Writer R16 — Table Split & KeepNext Audit

## Tong quan

- Tong so file xu ly: 23
- Tong so bang: 49
- Bang trai >= 2 trang Word: 20
- So file co bang trai nhieu trang: 10
- Bang co tblHeader (can lap tieu de): 0
- Bang co cantSplit: 1
- Tong diem chuyen trang co keepNext: 121
- So diem Word da day doan 'giu voi doan sau': 2
- Tong trang Word cho bang trai nhieu trang: 90
- Tong trang tuong duong Canvas (h/body_height): 2.6
- Trung binh chenh lech trang sau bang (Canvas - Word): -2.6

## Bang 1: Bang trai nhieu trang Word (>= 2 trang)

| File | Bang | Hang | tblHeader | cantSplit | Long | Noi | Word Trang | Word Sau | Canvas h | Canvas Trang | Canvas Pages | Canvas Sau | Chenh |
|------|------|------|-----------|-----------|------|-----|------------|----------|----------|--------------|--------------|------------|-------|
| d01.docx | 0 | 64 | 0 | 0 | Khong | Khong | 1→7 | 8 | 10022 | 2 | 0.4 | 3 | -5 |
| d01.docx | 2 | 5 | 0 | 0 | Khong | Khong | 7→15 | 16 | 190 | 3 | 0.0 | 3 | -13 |
| d01.docx | 4 | 5 | 0 | 0 | Khong | Khong | 15→19 | 20 | 190 | 4 | 0.0 | 4 | -16 |
| d04.docx | 0 | 11 | 0 | 0 | Khong | Khong | 1→5 | 6 | 4985 | 2 | 0.9 | 3 | -3 |
| d07.docx | 3 | 1 | 0 | 0 | Khong | Khong | 9→11 | 12 | 66 | 11 | 0.0 | 11 | -1 |
| d07.docx | 4 | 1 | 0 | 0 | Khong | Khong | 11→14 | 15 | 60 | 14 | 0.0 | 14 | -1 |
| d07.docx | 5 | 2 | 0 | 0 | Khong | Khong | 14→21 | 22 | 241 | 17 | 0.0 | 17 | -5 |
| d07.docx | 7 | 1 | 0 | 0 | Khong | Khong | 22→23 | 24 | 120 | 22 | 0.0 | 22 | -2 |
| d09.docx | 0 | 64 | 0 | 0 | Khong | Khong | 2→11 | 12 | 2208 | 3 | 0.2 | 4 | -8 |
| d12.docx | 0 | 9 | 0 | 0 | Khong | Khong | 1→2 | 3 | 486 | 2 | 0.3 | 2 | -1 |
| d13.docx | 1 | 10 | 0 | 0 | Khong | Khong | 2→3 | 4 | 204 | 3 | 0.0 | 3 | -1 |
| d13.docx | 2 | 8 | 0 | 0 | Khong | Khong | 3→4 | 5 | 133 | 3 | 0.0 | 3 | -2 |
| d13.docx | 5 | 12 | 0 | 0 | Khong | Khong | 5→6 | 7 | 179 | 6 | 0.0 | 6 | -1 |
| d13.docx | 6 | 6 | 0 | 0 | Khong | Khong | 6→9 | 10 | 104 | 9 | 0.0 | 9 | -1 |
| d15.docx | 0 | 1 | 0 | 0 | Khong | Khong | 1→9 | 10 | 949 | 1 | 0.1 | 2 | -8 |
| d15.docx | 1 | 4 | 0 | 0 | Khong | Khong | 9→10 | 11 | 568 | 10 | 0.1 | 10 | -1 |
| d17.docx | 0 | 2 | 0 | 0 | Khong | Khong | 1→5 | 6 | 248 | 1 | 0.1 | 1 | -5 |
| d20.docx | 2 | 10 | 0 | 0 | Khong | Khong | 1→2 | 3 | 621 | 2 | 0.1 | 2 | -1 |
| d20.docx | 3 | 24 | 0 | 23 | Khong | Khong | 2→3 | 4 | 1967 | 3 | 0.4 | 4 | 0 |
| d22.docx | 0 | 2 | 0 | 0 | Khong | Khong | 1→5 | 6 | 248 | 1 | 0.1 | 1 | -5 |

## Bang 2: Diem chuyen trang Word day doan vi keepNext

| File | So diem | Vi du (6 ky tu dau) |
|------|---------|---------------------|
| d01.docx | 2 | Điều 1, Điều 2 |

## Ket luan cho W24

- Tong so trang lech do bang: Canvas dem bang la 1 khoi (khong cat), Word cat theo hang. Tong so bang trai >= 2 trang Word: 20. Tong trang Word: 90, tong trang tuong duong Canvas: 2.6. Chenh lech trung binh sau bang: -2.6 trang. Can trien khai cat bang theo hang va lap hang tblHeader (neu co).
- Tong so trang lech do keepNext: 2 diem chuyen trang bi day (keepNext/keepLines/widowControl). Can xu ly keepNext/keepLines/widowControl khi tinh layout.

> Khong sua code san pham. Chi bao cao so lieu thuc te tu cache.