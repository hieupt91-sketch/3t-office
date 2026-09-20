# Handoff R14 - Phan loai nguyen nhan lop page

| file | Word page breaks | Canvas match | Page divergences | a (day nguyen khoi) | b (bang dai) | c (keepNext/keepLines) | d (khac) |
|---|---:|---:|---:|---:|---:|---:|---:|
| d01 | 14 | 4 | 232 | 0 | 1 | 0 | 13 |
| d02 | 10 | 0 | 34 | 0 | 0 | 0 | 10 |
| d03 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| d04 | 1 | 1 | 6 | 0 | 1 | 0 | 0 |
| d06 | 2 | 1 | 1 | 0 | 0 | 0 | 2 |
| d07 | 19 | 4 | 30 | 0 | 0 | 0 | 19 |
| d08 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| d09 | 11 | 3 | 39 | 0 | 1 | 0 | 10 |
| d11 | 4 | 2 | 27 | 0 | 0 | 0 | 4 |
| d12 | 1 | 1 | 7 | 0 | 1 | 0 | 0 |
| d13 | 9 | 3 | 25 | 1 | 0 | 2 | 6 |
| d14 | 2 | 2 | 1 | 0 | 0 | 0 | 2 |
| d15 | 8 | 4 | 14 | 0 | 0 | 0 | 8 |
| d16 | 7 | 1 | 14 | 0 | 0 | 0 | 7 |
| d17 | 4 | 0 | 5 | 0 | 0 | 0 | 4 |
| d18 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| d19 | 1 | 1 | 0 | 0 | 0 | 1 | 0 |
| d20 | 1 | 1 | 2 | 0 | 1 | 0 | 0 |
| d21 | 7 | 7 | 0 | 0 | 0 | 0 | 7 |
| d22 | 4 | 0 | 5 | 0 | 0 | 0 | 4 |
| d23 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| **Tong** | **105** | **35** | **442** | **1** | **5** | **3** | **96** |

## Vi du nguyen nhan (A)

- d13: doan "Không " - para_bottom=746.5pt > body_bottom=745.2pt (Word cat, canvas day sang trang 9)

## Vi du nguyen nhan (B)

- d01: bang cao 10022px tren 3 trang canvas (> 1377px/trang) tai Word trang 1
- d04: bang cao 4985px tren 3 trang canvas (> 1787px/trang) tai Word trang 1
- d09: bang cao 2208px tren 3 trang canvas (> 732px/trang) tai Word trang 2

## Vi du nguyen nhan (C)

- d13: doan "Email " trang 5 - next(keepNext=True keepLines=True pgBrkBefore=False) curr(keepNext=False)
- d13: doan "14.2 C" trang 8 - next(keepNext=True keepLines=True pgBrkBefore=False) curr(keepNext=False)
- d19: doan "You ca" trang 2 - next(keepNext=True keepLines=True pgBrkBefore=False) curr(keepNext=False)

## Vi du nguyen nhan (D)

- d01: doan "Địa ch" trang 6/3 - drift=5.0px
- d01: doan "a) Tha" trang 7/4 - drift=3.0px
- d01: doan "5. Chị" trang 8/5 - drift=-2.0px

