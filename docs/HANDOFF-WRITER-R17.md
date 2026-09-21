# Handoff — Writer Save-Back Roundtrip (R17)

**Branch:** `audit/writer-r17`
**Worktree:** `E:\VNOffice-opencode-writer-r17`
**Date:** 2026-09-21
**Files tested:** 23 (d01..d24 tru d10.docx — Word bao file hong)
**Profile:** `$env:LOCALAPPDATA = E:\VNOffice-profiles\opencode`
**Tool:** `scripts/layout-audit/_batch_writer.py` → Word 2016 COM (PDF export) dem trang
**Output dir:** `_saveback3/`
**Doi chieu:** `docs/HANDOFF-WRITER-SAVEBACK-R11B.md`

---

## 1. Bang do R17 day du (goc `_batch_writer_report.md`)

| file | Word pages | canvas pages | saved pages (Word) | saved | loaded | paras o/s | sectPr o/s | br o/s | pbb o/s | hdr o/s | ftr o/s | media o/s | ZZ | edit | err |
|---|---:|---:|---:|---|---|---|---|---|---|---|---|---|---|---|---|
| d01.docx | 19 | 20 | 20 | yes | yes | 619/619 | 0/0 | 0/0 | 0/0 | 2/2 | 1/1 | 0/0 | True | insert=true |  |
| d02.docx | 11 | 11 | 13 | yes | yes | 196/196 | 0/0 | 0/0 | 0/0 | 0/0 | 2/2 | 0/0 | True | insert=true |  |
| d03.docx | 1 | 2 | 2 | yes | yes | 45/44 | 2/2 | 1/0 | 0/1 | 0/0 | 0/0 | 0/0 | True | insert=true |  |
| d04.docx | 5 | 5 | 5 | yes | yes | 245/245 | 0/0 | 0/0 | 0/0 | 1/1 | 0/0 | 2/2 | True | insert=true |  |
| d05.docx | 2 | 2 | 2 | yes | yes | 56/56 | 0/0 | 0/0 | 0/0 | 0/0 | 1/1 | 0/0 | True | insert=true |  |
| d06.docx | 3 | 3 | 3 | yes | yes | 65/61 | 0/0 | 1/0 | 0/2 | 0/0 | 0/0 | 1/1 | True | insert=true |  |
| d07.docx | 23 | 23 | 22 | yes | yes | 583/582 | 0/0 | 0/0 | 0/0 | 1/1 | 0/0 | 0/0 | True | insert=true |  |
| d08.docx | 1 | 1 | 1 | yes | yes | 29/29 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 | 1/1 | True | insert=true |  |
| d09.docx | 14 | 14 | 12 | yes | yes | 406/344 | 0/0 | 0/0 | 0/0 | 1/1 | 1/1 | 0/11 | True | insert=true |  |
| d11.docx | 5 | 5 | 6 | yes | yes | 72/72 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 | True | insert=true |  |
| d12.docx | 3 | 3 | 3 | yes | yes | 118/115 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 | True | insert=true |  |
| d13.docx | 10 | 10 | 9 | yes | yes | 328/335 | 0/0 | 1/0 | 0/0 | 1/1 | 1/1 | 1/1 | True | insert=true |  |
| d14.docx | 3 | 4 | 3 | yes | yes | 49/49 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 | True | insert=true |  |
| d15.docx | 10 | 10 | 10 | yes | yes | 238/238 | 0/0 | 1/0 | 0/1 | 2/2 | 2/2 | 2/2 | True | insert=true |  |
| d16.docx | 8 | 9 | 11 | yes | yes | 165/166 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 | 1/1 | True | insert=true |  |
| d17.docx | 5 | 5 | 5 | yes | yes | 116/116 | 0/0 | 0/0 | 0/0 | 3/3 | 3/3 | 0/0 | True | insert=true |  |
| d18.docx | 2 | 2 | 2 | yes | yes | 48/48 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 | 2/2 | True | insert=true |  |
| d19.docx | 2 | 2 | 3 | yes | yes | 43/41 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 | 1/1 | True | insert=true |  |
| d20.docx | 3 | 5 | 7 | yes | yes | 329/330 | 0/0 | 1/1 | 0/0 | 1/1 | 0/0 | 1/1 | True | insert=true |  |
| d21.docx | 9 | 10 | 9 | yes | yes | 39/39 | 0/0 | 1/0 | 0/0 | 0/0 | 0/0 | 11/11 | True | insert=true |  |
| d22.docx | 5 | 5 | 5 | yes | yes | 116/116 | 0/0 | 0/0 | 0/0 | 3/3 | 3/3 | 0/0 | True | insert=true |  |
| d23.docx | 1 | 2 | 2 | yes | yes | 45/44 | 2/2 | 1/0 | 0/1 | 0/0 | 0/0 | 0/0 | True | insert=true |  |
| d24.docx | 16 | 16 | 16 | yes | yes | 18/18 | 2/2 | 9/9 | 0/0 | 0/0 | 9/9 | 139/139 | True | insert=true |  |

---

## 2. So sanh so trang Word (R11b -> R17)

| file | R11b saved pages | R17 saved pages | Δ |
|---|---:|---:|---:|
| d01 | 22 | 20 | -2 |
| d02 | 13 | 13 | 0 |
| d03 | 2 | 2 | 0 |
| d04 | 5 | 5 | 0 |
| d05 | 2 | 2 | 0 |
| d06 | 3 | 3 | 0 |
| d07 | 22 | 22 | 0 |
| d08 | 1 | 1 | 0 |
| d09 | 12 | 12 | 0 |
| d11 | 6 | 6 | 0 |
| d12 | 3 | 3 | 0 |
| d13 | 9 | 9 | 0 |
| d14 | 3 | 3 | 0 |
| d15 | 10 | 10 | 0 |
| d16 | 11 | 11 | 0 |
| d17 | 5 | 5 | 0 |
| d18 | 2 | 2 | 0 |
| d19 | 3 | 3 | 0 |
| d20 | 7 | 7 | 0 |
| d21 | 9 | 9 | 0 |
| d22 | 5 | 5 | 0 |
| d23 | 2 | 2 | 0 |
| d24 | 16 | 16 | 0 |

**Ket luan:** Chi **d01** giam 2 trang (22 -> 20). 22/23 file giu nguyen so trang so voi R11b.

---

## 3. Thong ke XML mo rong (goc vs luu) — R17

| file | paras | sectPr | br | pbb | hdr | ftr | media | anchors | tables |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| d01 | 619/619 | 0/0 | 0/0 | 0/0 | 2/2 | 1/1 | 0/0 | 0/0 | 7/7 |
| d02 | 196/196 | 0/0 | 0/0 | 0/0 | 0/0 | 2/2 | 0/0 | 0/0 | 2/2 |
| d03 | 45/44 | 2/2 | 1/0 | 0/1 | 0/0 | 0/0 | 0/0 | 0/0 | 3/3 |
| d04 | 245/245 | 0/0 | 0/0 | 0/0 | 1/1 | 0/0 | 2/2 | 5/5 | 1/1 |
| d05 | 56/56 | 0/0 | 0/0 | 0/0 | 0/0 | 1/1 | 0/0 | 0/0 | 1/1 |
| d06 | 65/61 | 0/0 | 1/0 | 0/2 | 0/0 | 0/0 | 1/1 | 60/48 | 0/0 |
| d07 | 583/582 | 0/0 | 0/0 | 0/0 | 1/1 | 0/0 | 0/0 | 1/0 | 9/9 |
| d08 | 29/29 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 | 1/1 | 1/1 | 1/1 |
| d09 | 406/344 | 0/0 | 0/0 | 0/0 | 1/1 | 1/1 | 0/11 | 30/46 | 2/3 |
| d11 | 72/72 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 |
| d12 | 118/115 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 | 1/1 |
| d13 | 328/335 | 0/0 | 1/0 | 0/0 | 1/1 | 1/1 | 1/1 | 0/0 | 7/7 |
| d14 | 49/49 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 |
| d15 | 238/238 | 0/0 | 1/0 | 0/1 | 2/2 | 2/2 | 2/2 | 0/0 | 2/2 |
| d16 | 165/166 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 | 1/1 | 0/0 | 2/2 |
| d17 | 116/116 | 0/0 | 0/0 | 0/0 | 3/3 | 3/3 | 0/0 | 0/0 | 2/2 |
| d18 | 48/48 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 | 2/2 | 0/0 | 1/1 |
| d19 | 43/41 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 | 1/1 | 0/0 | 0/0 |
| d20 | 329/330 | 0/0 | 1/1 | 0/0 | 1/1 | 0/0 | 1/1 | 0/0 | 7/7 |
| d21 | 39/39 | 0/0 | 1/0 | 0/0 | 0/0 | 0/0 | 11/11 | 0/0 | 0/0 |
| d22 | 116/116 | 0/0 | 0/0 | 0/0 | 3/3 | 3/3 | 0/0 | 0/0 | 2/2 |
| d23 | 45/44 | 2/2 | 1/0 | 0/1 | 0/0 | 0/0 | 0/0 | 0/0 | 3/3 |
| d24 | 18/18 | 2/2 | 9/9 | 0/0 | 0/0 | 9/9 | 139/139 | 11/11 | 0/0 |

---

## 4. Soat 4 tac dung phu (regex tren XML goc vs ban luu)

### 4.1 Danh sach (W10b) — d15, d09, d07
**Chi tieu:** 5 doan `numPr` dau: `w:ind` (left/hanging) goc vs luu; so `<w:numPr>` goc vs luu.

| File | `<w:numPr>` count (goc/luu) | 5 `w:ind` dau (left/hanging) — Goc -> Luu |
|---|---|---|
| d15 | 95 / 95 | Tat ca 5 doan dau: `{}` -> `{}` (khong co `w:ind` trong `numPr` ca 2 ben) |
| d09 | 87 / 87 | Tat ca 5 doan dau: `{}` -> `{}` (khong co `w:ind` trong `numPr` ca 2 ben) |
| d07 | 34 / 34 | Tat ca 5 doan dau: `{}` -> `{}` (khong co `w:ind` trong `numPr` ca 2 ben) |

**Ket luan:** So luong `<w:numPr>` **giu nguyen** het 3 file. `w:ind` trong `numPr` khong xuat hien o 5 doan dau cua ca 3 file (cai dat thuc le do `w:ind` thuong nam o `w:pPr` chinh cua doan, khong trong `numPr`). **Khong co hoi quy** ve dem danh sach.

---

### 4.2 Bang (W30) — d01, d04, d13
**Chi tieu:** `w:tblW` (w, type) va day `w:gridCol` goc vs luu (twips; sai lech <= 20 twips = OK).

#### d01.docx (7 bang)
| Table | w:tblW goc -> luu | gridCol goc -> luu (sai lech twips) |
|---|---|---|
| 0 | 5000 pct -> 9645 dxa | [909,5803,1607,1314] -> [978,5669,1626,1372] **DEV: 69,134,19,58** |
| 1 | 0 auto -> 9630 dxa | [1383,8256] -> [1564,8066] **DEV: 181,190** |
| 2 | 5000 pct -> 9630 dxa | [2853,247,3258,3281] -> [2944,23,3308,3355] **DEV: 91,224,50,74** |
| 3 | 0 auto -> 9630 dxa | [2835,551,2706,3547] -> [3020,23,2872,3715] **DEV: 185,528,166,168** |
| 4 | 0 auto -> 9630 dxa | [2835,551,2706,3547] -> [3020,23,2872,3715] **DEV: 185,528,166,168** |
| 5 | 5000 pct -> 9630 dxa | [2812,241,3212,3374] -> [2901,23,3266,3440] **DEV: 89,218,54,66** |
| 6 | 0 auto -> 9645 dxa | [4681,4958] -> [4682,4963] **OK: 1,5** |

#### d04.docx (1 bang)
| Table | w:tblW goc -> luu | gridCol goc -> luu (sai lech twips) |
|---|---|---|
| 0 | 11135 dxa -> 11135 dxa | [549,6883,476,555,1256,1416] -> [549,6883,476,555,1256,1416] **OK: 0 het** |

#### d13.docx (7 bang)
| Table | w:tblW goc -> luu | gridCol goc -> luu (sai lech twips) |
|---|---|---|
| 0 | auto -> 10380 dxa | [5184,5184] -> [5183,5197] **OK: 1,13** |
| 1 | auto -> 10350 dxa | [3456,3456,3456] -> [3442,3446,3462] **OK: 14,10,6** |
| 2 | auto -> 10380 dxa | [5184,5184] -> [5202,5178] **OK: 18,6** |
| 3 | auto -> 10380 dxa | [5184,5184] -> [5190,5190] **OK: 6,6** |
| 4 | auto -> 10380 dxa | [5184,5184] -> [5190,5190] **OK: 6,6** |
| 5 | auto -> 10380 dxa | [5184,5184] -> [5190,5190] **OK: 6,6** |
| 6 | auto -> 10380 dxa | [5184,5184] -> [5174,5206] **OK/DEV: 10,22** |

**Ket luan:**
- **d04**: **Hoan toan giu nguyen** `w:tblW` va `w:gridCol` (sai lech 0).
- **d13**: Giu nguyen tot (tat ca <= 20 twips, tru gridCol[1] bang 6: 22 twips — ngan xep).
- **d01**: **Hoi quy manh**. `w:tblW` doi tu `pct`/`auto` sang `dxa` (9630~9645 twips ~ 13.3 cm). `w:gridCol` lech lon (nhieu cot > 100 twips, cot 1 bang 3/4/5 lech 528 twips). **File d01 la outlier** ve bang.

---

### 4.3 Doan rong (W26) — d07, d15
**Chi tieu:** 5 `w:p` rong dau: `pPr/rPr/sz` goc vs luu.

| File | 5 doan rong dau — `w:sz` (half-points) Goc -> Luu |
|---|---|
| d07 | 26, 26, 26, 26, 26 -> **rong (khong co sz)** het 5 doan |
| d15 | 26, 26, 30, 30, 30 -> **rong (khong co sz)** het 5 doan |

**Ket luan:** **Hoi quy toan bo** ve `w:sz` cua doan rong. Goc co `w:sz` (26~30 half-points = 13~15 pt), luu mat di het. Do LibreOffice khong xuat `w:sz` cho run rong trong doan rong khi roundtrip.

---

### 4.4 Header/Footer (W23/W26b) — d09, d15
**Chi tieu:** `header*.xml`/`footer*.xml`: so doan va `w:sz` goc vs luu; `w:pgMar` top/bottom/header/footer goc vs luu.

#### d09.docx
| Phần | Goc | Luu | Δ |
|---|---|---|---|
| header1.xml: paras | 3 | 3 | 0 |
| header1.xml: w:sz (7 gia tri) | 20x7 | 20x7 | 0 |
| footer1.xml: paras | 2 | 2 | 0 |
| footer1.xml: w:sz (17 gia tri) | 20x17 | 20x17 | 0 |
| pgMar (top/bottom/header/footer) | {} (khong co) | {} (khong co) | — |

#### d15.docx
| Phần | Goc | Luu | Δ |
|---|---|---|---|
| header1.xml: paras | 1 | 1 | 0 |
| header1.xml: w:sz | [] (khong co) | [] (khong co) | — |
| header2.xml: paras | 2 | 2 | 0 |
| header2.xml: w:sz | [] (khong co) | [] (khong co) | — |
| footer1.xml: paras | 5 | 5 | 0 |
| footer1.xml: w:sz (6 gia tri) | 20x6 | 20x6 | 0 |
| footer2.xml: paras | 6 | 6 | 0 |
| footer2.xml: w:sz (5 gia tri) | 20x5 | 20x5 | 0 |
| pgMar (top/bottom/header/footer) | {} (khong co) | {} (khong co) | — |

**Ket luan:** Header/Footer **giu nguyen hoan toan** ve so doan, `w:sz`, va `pgMar` (khong co `pgMar` trong goc ca 2 file). **Khong co hoi quy**.

---

## 5. Tong ket hoi quy (file, thuoc tinh, goc -> luu)

| Loai | File | Thuoc tinh | Goc -> Luu | Muc do |
|---|---|---|---|---|
| **So trang** | d01 | saved pages (Word) | 22 -> 20 | Giam 2 trang |
| **Bang** | d01 | w:tblW type | pct/auto -> dxa | Doi don vi, mat % |
| **Bang** | d01 | w:gridCol | Nhieu cot lech > 100 twips (max 528) | Lech lon |
| **Doan rong** | d07 | w:sz (5 doan dau) | 26 -> mat | Mat sz |
| **Doan rong** | d15 | w:sz (5 doan dau) | 26/30 -> mat | Mat sz |
| **Danh sach** | — | — | — | **Khong co hoi quy** |
| **Header/Footer** | — | — | — | **Khong co hoi quy** |

---

## 6. Quan sat & de xuat theo doi

1. **d01 giam 2 trang & bang lech manh:** `w:tblW` tu `pct`/`auto` -> `dxa` co dinh (~9630 twips) lam thay doi layout bang. Can kiem tra W30 (bang width/gridCol) va HTML export `table width=px`/`col width=px` co anh huong den roundtrip LibreOffice khong.
2. **Doan rong mat `w:sz` (d07, d15):** W26 them `font-size` cho `<p>` rong trong HTML export. LibreOffice import/export khong giu `w:sz` cho run rong. Can kiem tra adapter export co can giu `w:sz` cho doan rong khong.
3. **d09 media 0->11:** Giong R11b, media tang tu 0->11. Can kiem tra la hinh anh header/footer hay drawing moi sinh ra.
4. **d06 anchor 60->48:** Giong R11b, mat gan het Rectangle shape. Can kiem tra W25 (drawing/shape export).
5. **Tong the:** 22/23 file giu so trang. Chi d01 co hoi quy ro rang ve so trang va bang. Cac tac dung phu khac (danh sach, header/footer) on dinh.

---

## 7. Lenh thuc thi

```powershell
$env:LOCALAPPDATA = "E:\VNOffice-profiles\opencode"
python scripts/layout-audit/_batch_writer.py . "E:\VN OFice\file test\landocx" _saveback3 d01.docx d02.docx d03.docx d04.docx d05.docx d06.docx d07.docx d08.docx d09.docx d11.docx d12.docx d13.docx d14.docx d15.docx d16.docx d17.docx d18.docx d19.docx d20.docx d21.docx d22.docx d23.docx d24.docx
python scripts/layout-audit/analyze_side_effects_r17.py
```

---

## 8. File tham chieu

- Bao cao batch goc: `_saveback3/_batch_writer_report.md`
- Script phan tich tac dung phu: `scripts/layout-audit/analyze_side_effects_r17.py`
- Oracle trang Word: `scripts/layout-audit/_word_oracle3.ps1`
- Handoff R11b: `docs/HANDOFF-WRITER-SAVEBACK-R11B.md`

---

## 9. Ghi chu

- Khong sua code, chi do va soat.
- Khong commit thu muc `_saveback3/` (da co trong `.gitignore` pattern `/_*`).
- Khong ghi ten tai lieu that trong handoff.
- Commit handoff bang `git commit -F` tieng Viet khong dau.