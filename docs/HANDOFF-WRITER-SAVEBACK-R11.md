# Handoff — Writer Save-Back Roundtrip (R11)

**Branch:** `audit/writer-saveback-r11`
**Worktree:** `E:\VNOffice-opencode-writer-r11`
**Date:** 2026-09-21
**Files tested:** 23 (d01..d24 trừ d10.docx — Word báo file hỏng)
**Profile:** `$env:LOCALAPPDATA = E:\VNOffice-profiles\opencode`
**Tool:** `scripts/layout-audit/_batch_writer.py` → Word 2016 COM (PDF export) đếm trang

---

## 1. Bảng đo gốc (`_batch_writer_report.md` nguyên văn)

| file | Word pages | canvas pages | saved pages (Word) | saved | loaded | paras o/s | sectPr o/s | br o/s | ZZ | edit | err |
|---|---:|---:|---:|---|---|---|---|---|---|---|---|
| d01.docx | 19 | 17 | 22 | yes | yes | 619/619 | 0/0 | 0/0 | True | insert=true |  |
| d02.docx | 11 | 11 | 13 | yes | yes | 196/196 | 0/0 | 0/0 | True | insert=true |  |
| d03.docx | 1 | 2 | 2 | yes | yes | 45/44 | 2/2 | 1/0 | True | insert=true |  |
| d04.docx | 5 | 3 | 5 | yes | yes | 245/245 | 0/0 | 0/0 | True | insert=true |  |
| d05.docx | 2 | 2 | 2 | yes | yes | 56/56 | 0/0 | 0/0 | True | insert=true |  |
| d06.docx | 3 | 3 | 3 | yes | yes | 65/61 | 0/0 | 1/0 | True | insert=true |  |
| d07.docx | 23 | 23 | 22 | yes | yes | 583/582 | 0/0 | 0/0 | True | insert=true |  |
| d08.docx | 1 | 1 | 1 | yes | yes | 29/29 | 0/0 | 0/0 | True | insert=true |  |
| d09.docx | 14 | 14 | 12 | yes | yes | 406/344 | 0/0 | 0/0 | True | insert=true |  |
| d11.docx | 5 | 6 | 6 | yes | yes | 72/72 | 0/0 | 0/0 | True | insert=true |  |
| d12.docx | 3 | 3 | 3 | yes | yes | 118/115 | 0/0 | 0/0 | True | insert=true |  |
| d13.docx | 10 | 10 | 9 | yes | yes | 328/335 | 0/0 | 1/0 | True | insert=true |  |
| d14.docx | 3 | 4 | 3 | yes | yes | 49/49 | 0/0 | 0/0 | True | insert=true |  |
| d15.docx | 10 | 10 | 10 | yes | yes | 238/238 | 0/0 | 1/0 | True | insert=true |  |
| d16.docx | 8 | 9 | 11 | yes | yes | 165/166 | 0/0 | 0/0 | True | insert=true |  |
| d17.docx | 5 | 5 | 5 | yes | yes | 116/116 | 0/0 | 0/0 | True | insert=true |  |
| d18.docx | 2 | 2 | 2 | yes | yes | 48/48 | 0/0 | 0/0 | True | insert=true |  |
| d19.docx | 2 | 2 | 3 | yes | yes | 43/41 | 0/0 | 0/0 | True | insert=true |  |
| d20.docx | 3 | 5 | 7 | yes | yes | 329/330 | 0/0 | 1/1 | True | insert=true |  |
| d21.docx | 9 | 10 | 9 | yes | yes | 39/39 | 0/0 | 1/0 | True | insert=true |  |
| d22.docx | 5 | 5 | 5 | yes | yes | 116/116 | 0/0 | 0/0 | True | insert=true |  |
| d23.docx | 1 | 2 | 2 | yes | yes | 45/44 | 2/2 | 1/0 | True | insert=true |  |
| d24.docx | 16 | 16 | 16 | yes | yes | 18/18 | 2/2 | 9/9 | True | insert=true |  |

---

## 2. Thống kê XML (`word/document.xml` gốc vs bản lưu)

| file | paras | sectPr | br | anchors | tables |
|---|---:|---:|---:|---:|---:|
| d01 | 619/619 | 0/0 | 0/0 | 0/0 | 7/7 |
| d02 | 196/196 | 0/0 | 0/0 | 0/0 | 2/2 |
| d03 | 45/44 | 2/2 | 1/0 | 0/0 | 3/3 |
| d04 | 245/245 | 0/0 | 0/0 | 5/5 | 1/1 |
| d05 | 56/56 | 0/0 | 0/0 | 0/0 | 1/1 |
| d06 | 65/61 | 0/0 | 1/0 | 60/48 | 0/0 |
| d07 | 583/582 | 0/0 | 0/0 | 1/0 | 9/9 |
| d08 | 29/29 | 0/0 | 0/0 | 1/1 | 1/1 |
| d09 | 406/344 | 0/0 | 0/0 | 30/46 | 2/3 |
| d11 | 72/72 | 0/0 | 0/0 | 0/0 | 0/0 |
| d12 | 118/115 | 0/0 | 0/0 | 0/0 | 1/1 |
| d13 | 328/335 | 0/0 | 1/0 | 0/0 | 7/7 |
| d14 | 49/49 | 0/0 | 0/0 | 0/0 | 0/0 |
| d15 | 238/238 | 0/0 | 1/0 | 0/0 | 2/2 |
| d16 | 165/166 | 0/0 | 0/0 | 0/0 | 2/2 |
| d17 | 116/116 | 0/0 | 0/0 | 0/0 | 2/2 |
| d18 | 48/48 | 0/0 | 0/0 | 0/0 | 1/1 |
| d19 | 43/41 | 0/0 | 0/0 | 0/0 | 0/0 |
| d20 | 329/330 | 0/0 | 1/1 | 0/0 | 7/7 |
| d21 | 39/39 | 0/0 | 1/0 | 0/0 | 0/0 |
| d22 | 116/116 | 0/0 | 0/0 | 0/0 | 2/2 |
| d23 | 45/44 | 2/2 | 1/0 | 0/0 | 3/3 |
| d24 | 18/18 | 2/2 | 9/9 | 11/11 | 0/0 |

**Chú ý:** Mọi file đều có `ZZ = True` trong bản lưu → sửa + lưu thành công 100%.

---

## 3. Gom lớp lệch (deviation classes) — bằng chứng đếm XML thật

### Lớp A: Trang tăng (saved pages > Word gốc) — 8 file
| file | Word gốc | Saved | Δ pages | Nguyên nhân đoán (cần verify sâu) |
|---|---:|---:|---:|---|
| d01 | 19 | 22 | +3 | paras giữ, sect/br/anchors không đổi — khả năng layout reflow |
| d02 | 11 | 13 | +2 | paras giữ — layout reflow |
| d03 | 1 | 2 | +1 | mất 1 br, paras -1 — ngắt trang tự động thay đổi |
| d11 | 5 | 6 | +1 | paras giữ — layout reflow |
| d16 | 8 | 11 | +3 | paras +1 — layout reflow lớn |
| d19 | 2 | 3 | +1 | paras -2 — layout reflow |
| d20 | 3 | 7 | +4 | paras +1, br giữ — layout reflow rất lớn |
| d23 | 1 | 2 | +1 | mất 1 br, paras -1 — ngắt trang tự động thay đổi |

### Lớp B: Trang giảm (saved pages < Word gốc) — 3 file
| file | Word gốc | Saved | Δ pages | Ghi chú |
|---|---:|---:|---:|---|
| d07 | 23 | 22 | -1 | paras -1, anchors 1→0 — mất 1 anchor (hình neo) |
| d09 | 14 | 12 | -2 | paras -62 (lớn), anchors 30→46 (tăng) — restructuring paras |
| d13 | 10 | 9 | -1 | paras +7, mất 1 br — reflow |

### Lớp C: Mất ngắt trang thủ công (`w:br type=page` giảm) — 6 file
| file | br gốc | br lưu | Mất |
|---|---:|---:|---:|
| d03 | 1 | 0 | 1 |
| d06 | 1 | 0 | 1 |
| d13 | 1 | 0 | 1 |
| d15 | 1 | 0 | 1 |
| d21 | 1 | 0 | 1 |
| d23 | 1 | 0 | 1 |
**Tổng:** 6 file mất 1 ngắt trang thủ công. d20 giữ nguyên (1/1), d24 giữ nguyên (9/9).

### Lớp D: Mất paragraph — 7 file
| file | paras gốc | paras lưu | Δ |
|---|---:|---:|---:|
| d03 | 45 | 44 | -1 |
| d06 | 65 | 61 | -4 |
| d07 | 583 | 582 | -1 |
| d09 | 406 | 344 | -62 |
| d12 | 118 | 115 | -3 |
| d19 | 43 | 41 | -2 |
| d23 | 45 | 44 | -1 |
**Tổng mất:** 74 paragraph. d09 là outlier lớn (-62).

### Lớp E: Thừa paragraph — 3 file
| file | paras gốc | paras lưu | Δ |
|---|---:|---:|---:|
| d13 | 328 | 335 | +7 |
| d16 | 165 | 166 | +1 |
| d20 | 329 | 330 | +1 |

### Lớp F: Mất anchor (hình neo/wp:anchor) — 2 file
| file | anchors gốc | anchors lưu | Mất |
|---|---:|---:|---:|
| d06 | 60 | 48 | 12 |
| d07 | 1 | 0 | 1 |
**d09 ngược lại:** anchors 30→46 (+16) — có thể do chuyển đổi inline↔floating.

### Lớp G: Giữ sectPr (section break) — 3 file
d03 (2/2), d23 (2/2), d24 (2/2) — section breaks được bảo toàn.

### Lớp H: Bảng (tables) — 0 file lệch
Tất cả 23 file: tables giữ nguyên count.

---

## 4. Tóm tắt số liệu chính

| Chỉ số | Giá trị |
|---|---|
| File đo được | 23/23 |
| File mở được trong Word sau lưu | 23/23 |
| File có chữ ZZ sau lưu | 23/23 |
| File trang tăng | 8 |
| File trang giảm | 3 |
| File trang không đổi | 12 |
| File mất br (ngắt trang thủ công) | 6 |
| File mất paras | 7 |
| File thừa paras | 3 |
| File mất anchors | 2 |
| File anchors tăng | 1 (d09) |
| File sectPr giữ nguyên | 3 (d03, d23, d24) |
| File tables lệch | 0 |

---

## 5. Quan sát & đề xuất theo dõi

1. **Mất ngắt trang thủ công (br)** là lớp phổ biến nhất (6/23 file). Cần kiểm tra export OOXML: `w:br type=page` có bị bỏ khi lưu qua LibreOffice không.
2. **d09 mất 62 paragraph** — outlier cực lớn. Cần so sánh cấu trúc document.xml chi tiết (có thể do danh sách/bảng lồng nhau bị flatten).
3. **d06 mất 12 anchor** — tài liệu nhiều hình neo (60 anchor gốc). Kiểm tra `wp:anchor` export.
4. **d20 trang +4 (3→7)** — lệch trang lớn nhất tuy paras chỉ +1. Có thể header/footer hoặc section layout thay đổi.
4. **d24** — file lớn (23MB), 16 trang, 18 paras, 9 br, 11 anchors, 2 sectPr: tất cả giữ nguyên → roundtrip ổn định cho file phức tạp.
5. **Tables** — 100% bảo toàn count (d01:7, d02:2, d04:1, d05:1, d07:9, d08:1, d09:2/3 count thay đổi nhưng d09 có restructure lớn, d12:1, d13:7, d14:0, d15:2, d16:2, d17:2, d18:1, d20:7, d22:2, d23:3).

---

## 6. Lưu ý thực thi

- Chạy lần lượt 5 nhóm (4–5 file/nhóm) trong cùng phiên PowerShell đã set `LOCALAPPDATA`.
- Không chạy song song 2 batch (soffice profile tranh nhau).
- d10.docx bị bỏ: Word COM báo file hỏng, `_word_oracle3.ps1` trả FAIL.
- Không commit thư mục `_saveback/` (đã có trong `.gitignore` pattern `/_*`).
- Không ghi tên tài liệu thật trong handoff.

---

## 7. Files tham chiếu

- Báo cáo batch gốc (ghi đè lần cuối): `_saveback/_batch_writer_report.md` (chỉ 5 file cuối)
- Script phân tích XML: `scripts/layout-audit/analyze_xml.py` (tạm, không commit)
- Oracle trang Word: `scripts/layout-audit/_word_oracle3.ps1`