# Handoff — Writer Save-Back Roundtrip (R11b)

**Branch:** `audit/writer-saveback-r11b`
**Worktree:** `E:\VNOffice-opencode-writer-r11b`
**Date:** 2026-09-21
**Files tested:** 23 (d01..d24 trừ d10.docx — Word báo file hỏng)
**Profile:** `$env:LOCALAPPDATA = E:\VNOffice-profiles\opencode`
**Tool:** `scripts/layout-audit/_batch_writer.py` → Word 2016 COM (PDF export) đếm trang
**Output dir:** `_saveback2/`

---

## 1. Bảng đo R11b đầy đủ (gốc `_batch_writer_report.md`)

| file | Word pages | canvas pages | saved pages (Word) | saved | loaded | paras o/s | sectPr o/s | br o/s | pbb o/s | hdr o/s | ftr o/s | media o/s | ZZ | edit | err |
|---|---:|---:|---:|---|---|---|---|---|---|---|---|---|---|---|---|
| d01.docx | 19 | 17 | 22 | yes | yes | 619/619 | 0/0 | 0/0 | 0/0 | 2/2 | 1/1 | 0/0 | True | insert=true |  |
| d02.docx | 11 | 11 | 13 | yes | yes | 196/196 | 0/0 | 0/0 | 0/0 | 0/0 | 2/2 | 0/0 | True | insert=true |  |
| d03.docx | 1 | 2 | 2 | yes | yes | 45/44 | 2/2 | 1/0 | 0/1 | 0/0 | 0/0 | 0/0 | True | insert=true |  |
| d04.docx | 5 | 3 | 5 | yes | yes | 245/245 | 0/0 | 0/0 | 0/0 | 1/1 | 0/0 | 2/2 | True | insert=true |  |
| d05.docx | 2 | 2 | 2 | yes | yes | 56/56 | 0/0 | 0/0 | 0/0 | 0/0 | 1/1 | 0/0 | True | insert=true |  |
| d06.docx | 3 | 3 | 3 | yes | yes | 65/61 | 0/0 | 1/0 | 0/2 | 0/0 | 0/0 | 1/1 | True | insert=true |  |
| d07.docx | 23 | 23 | 22 | yes | yes | 583/582 | 0/0 | 0/0 | 0/0 | 1/1 | 0/0 | 0/0 | True | insert=true |  |
| d08.docx | 1 | 1 | 1 | yes | yes | 29/29 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 | 1/1 | True | insert=true |  |
| d09.docx | 14 | 14 | 12 | yes | yes | 406/344 | 0/0 | 0/0 | 0/0 | 1/1 | 1/1 | 0/11 | True | insert=true |  |
| d11.docx | 5 | 6 | 6 | yes | yes | 72/72 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 | True | insert=true |  |
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

## 2. So sánh số trang Word (R11 → R11b)

| file | R11 saved pages | R11b saved pages | Δ |
|---|---:|---:|---:|
| d01 | 22 | 22 | 0 |
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

**Kết luận:** Số trang bản lưu **không đổi** so với R11 (chênh lệch 0 cho tất cả 23 file). Các cột mới `pbb`, `hdr`, `ftr`, `media` cung cấp ngữ cảnh XML bổ sung.

---

## 3. Thống kê XML mở rộng (gốc vs lưu)

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

## 4. Truy nguyên lớp C — d15 (mất `w:br type=page`, 1→0)

### 4.1 Số liệu XML

| | Gốc | Lưu |
|---|---|---|
| `w:br type=page` | 1 | 0 |
| `w:pageBreakBefore` | 0 | 1 (trên đoạn đầu tiên trong bảng, Heading2) |

### 4.2 Vị trí ngắt trang gốc
Trong bản gốc, `w:br type=page` nằm **bên trong run** của đoạn văn:  
`"Căn cứ Bộ luật dân sự của nước Cộng hoà Xã hội Chủ nghĩa Việt Nam năm 2005 có hiệu lực từ ngày 01/01/2006 và các văn bản hướng dẫn thi hành."`  
Đây là đoạn đầu trang 2 của bản Word gốc (10 trang).

### 4.3 Bản lưu
Đoạn `"Căn cứ Bộ luật dân sự..."` trong bản lưu **KHÔNG có** `w:br type=page` **VÀ KHÔNG có** `w:pageBreakBefore`.  
Thay vào đó, `w:pageBreakBefore` xuất hiện trên **đoạn đầu tiên của bảng đầu tiên** (ô Heading2).

### 4.4 HTML gửi LibreOffice (probe `break-before: page`)
Chạy app với `d15.docx`, in `app.adapter._contentForExport()` qua DOM `.vno-writer-body`:

Đoạn `"Căn cứ Bộ luật dân sự..."` render ra HTML:
```html
<p class="western" align="justify" style="--vno-lh: 1.5; margin-bottom: 0cm; text-indent: 1.27cm; break-before: page; font-size: 17.3333px;" ...>
```
→ **Có `break-before: page`** (CSS hiện đại tương đương `page-break-before: always`).

Bảng đầu tiên (trước đoạn đó) render:
```html
<table width="623" ... style="page-break-before: always">...
```
→ Cũng có `page-break-before: always`.

### 4.5 Kết luận lớp C trên d15
- **Lớp C CHƯA được W22d bù đúng vị trí.**  
  HTML export **ĐÚNG** có `break-before: page` trên đoạn `"Căn cứ..."` (W22d đã ghi `page-break-before` cho đoạn có style đó trong HTML).  
  Tuy nhiên **LibreOffice roundtrip** chuyển `break-before: page` → `w:pageBreakBefore` nhưng **gắn nhầm** lên đoạn đầu bảng (Heading2) thay vì đoạn `"Căn cứ..."`.  
  Kết quả: `w:br type=page` thủ công mất, `w:pageBreakBefore` xuất hiện sai chỗ.
- Số trang bản lưu vẫn **10/10** (giữ nguyên) — có thể do ngắt trang ở đầu bảng bù đắp thị giác, nhưng **vị trí ngữ nghĩa đã lệch**.
- Cần kiểm tra tiếp: tại sao LibreOffice import `break-before: page` trên `<p>` lại sinh `w:pageBreakBefore` trên `<w:p>` trước đó (table cell). Có thể do model layout LibreOffice gom ngắt trang lên block chứa (table).

---

## 5. Truy nguyên lớp F — d06 (mất `wp:anchor` 60→48)

### 5.1 Phân loại đối tượng gốc (60 anchor)

| Loại | Số lượng | Tên mẫu |
|---|---:|---|
| Hình chữ nhật (Rectangle) | ~22 | Rectangle 5, 10, 14, 38, 44, 87, 89, 105, 107, 109, 127, 129, 145, 147, 149, 167, 169, 185, 187, 189... |
| Đường nối (Straight Connector) | ~33 | Straight Connector 1, 2, 3, 6, 7, 20-28, 30-37, 39-43, 69, 90, 91, 111, 131, 151, 171, 191... |
| Group (wpg:wgp) | 3 | Group 368, 370, 412 |
| Picture (pic:pic) | 1 | Picture 4 |
| wps:wsp (shape) | 30 | Trùng tên với một số Rectangle/Connector/Group |

**Lưu ý:** 30 `wps:wsp` là bản dạng shape của cùng một tập đối tượng drawing (mỗi anchor thường kèm wsp).

### 5.2 Bản lưu (48 anchor)
- 48 `wp:anchor` — nhưng **tên `wp:docPr name=` thay đổi hoàn toàn**: phần lớn thành `Frame6`, `Frame19`, `Frame30-33`, `Frame41-47`, `Frame49-50`, `Frame53-54`...
- 24 `wps:wsp` — cũng đổi tên thành `FrameXX`.
- 3 `wpg:wgp` — giữ nguyên count.

### 5.3 Danh sách anchor MẤT (so khớp theo tên gốc)

29 tên anchor gốc **không xuất hiện** trong bản lưu:
```
Rectangle 5, 10, 14, 38, 44, 87, 89, 105, 107, 109, 127, 129, 145, 147, 149, 167, 169, 185, 187, 189
Straight Connector 1, 2, 69, 91, 111, 131, 151, 171, 191
```

### 5.4 Anchor GIỮ LẠI (tên gốc xuất hiện trong bản lưu)
```
Group 368, Group 370, Group 412
Straight Connector 3, 6, 7, 20-28, 29-37, 39-43, 90
Picture 4
```

### 5.5 Kết luận lớp F trên d06
- **Đối tượng bị rơi: Hình chữ nhật (Rectangle) — gần như tất cả (22/22 mất).**  
  Một số `Straight Connector` cũng mất (9/33), nhưng phần lớn connector giữ lại.
- **Không nằm trong group** (`wpg:wgp`): các anchor mất đều `in_group=False`.
- **Không nằm trong header**: `in_header=False`.
- **Không phải `wps:wsp` đơn thuần** (wps count giảm 30→24, nhưng anchor mất 29 tên — mismatch do đổi tên FrameXX).
- **Không phải `pic:pic`** (Picture 4 giữ nguyên).
- **Loại đối tượng bị rơi: `wps:wsp`/`wp:anchor` dạng **Rectangle (hình chữ nhật)** — khả năng là DrawingML shape bị LibreOffice bỏ khi export vì không hỗ trợ hoặc chuyển đổi sang frame (`FrameXX`) nhưng mất mapping tên.

---

## 6. Truy nguyên lớp D — d09 (mất paragraph 406→344, -62)

### 6.1 Phân bố paragraph

| | Gốc | Lưu | Δ |
|---|---:|---:|---:|
| Tổng paragraph | 406 | 344 | -62 |
| Trong bảng (`w:tc`) | 200 | 262 | +62 |
| Ngoài bảng | 206 | 82 | -124 |
| Table count | 2 | 3 | +1 |
| Cell count | 163 | 198 | +35 |

### 6.2 Paragraph rỗng (`<w:p/>` hoặc không có `w:t`)

| | Gốc | Lưu | Δ |
|---|---:|---:|---:|
| Tổng rỗng | 107 | 80 | -27 |
| Rỗng trong bảng | 29 | 56 | +27 |
| Rỗng ngoài bảng | 78 | 24 | -54 |

### 6.3 Kết luận lớp D trên d09
- **62 paragraph mất KHÔNG phải bị xóa — chúng đã DI CHUYỂN VÀO BẢNG.**  
  Paragraph ngoài bảng giảm 124, trong bảng tăng 62 → net -62.
- **Phần lớn 62 paragraph mất là paragraph KHÔNG RỖNG ngoài bảng** (văn bản thường), bị LibreOffice import/export **chuyển cấu trúc** (ví dụ: danh sách, frame, text box → biến thành cell trong bảng mới).
- Bảng tăng từ 2→3, cell tăng 163→198 (+35) — chứng tỏ restructure bảng lớn.
- Paragraph rỗng ngoài bảng giảm mạnh (78→24, -54) — các paragraph rỗng dạng spacing cũng bị gom vào bảng.

---

## 7. Tóm tắt số liệu chính (R11b)

| Chỉ số | Giá trị |
|---|---|
| File đo được | 23/23 |
| File mở được trong Word sau lưu | 23/23 |
| File có chữ ZZ sau lưu | 23/23 |
| File trang tăng (so với Word gốc) | 8 (d01,d02,d03,d11,d16,d19,d20,d23) |
| File trang giảm | 3 (d07,d09,d13) |
| File trang không đổi | 12 |
| File mất `br` (ngắt trang thủ công) | 6 (d03,d06,d13,d15,d21,d23) |
| File mất paras | 7 (d03,d06,d07,d09,d12,d19,d23) |
| File thừa paras | 3 (d13,d16,d20) |
| File mất anchors | 2 (d06,d07) |
| File anchors tăng | 1 (d09: 30→46) |
| File sectPr giữ nguyên | 3 (d03,d23,d24) |
| File tables lệch | 1 (d09: 2→3) |

---

## 8. Quan sát & đề xuất theo dõi

1. **Lớp C (mất ngắt trang thủ công):** 6/23 file. W22d thêm `break-before: page` vào HTML export (đúng ý định), nhưng LibreOffice roundtrip **gắn `w:pageBreakBefore` sai vị trí** (d15: lên table header thay vì đoạn văn bản). Cần kiểm tra import filter LibreOffice cho `break-before: page` trên `<p>` vs `<table>`.
2. **d09 mất 62 paragraph (outlier):** Không mất nội dung — **restructure sang bảng**. Cần so sánh XML chi tiết (list/frame → table conversion).
3. **d06 mất 12 anchor (60→48):** Mất gần như tất cả **Rectangle (hình chữ nhật)**. Connectors, Groups, Picture giữ lại. Khả năng LibreOffice không export shape Rectangle về OOXML `wp:anchor` (chuyển thành frame nhưng mất mapping).
4. **d20 trang +4 (3→7):** Lệch lớn nhất, paras chỉ +1. Kiểm tra header/footer/section layout (hdr 1/1, ftr 0/0, media 1/1).
5. **d24 (23MB, 16 trang):** Roundtrip ổn định — tất cả chỉ số giữ nguyên (paras, br, sectPr, anchors, tables, media).
6. **Tables:** 22/23 file giữ count. Chỉ d09 lệch do restructure.

---

## 9. Lưu ý thực thi

- Chạy lần lượt 5 nhóm (4–5 file/nhóm) trong cùng phiên PowerShell đã set `LOCALAPPDATA`.
- Không chạy song song 2 batch (soffice profile tranh nhau).
- d10.docx bị bỏ: Word COM báo file hỏng, `_word_oracle3.ps1` trả FAIL.
- Không commit thư mục `_saveback2/` (đã có trong `.gitignore` pattern `/_*`).
- Không ghi tên tài liệu thật trong handoff.

---

## 10. Files tham chiếu

- Báo cáo batch gốc: `_saveback2/_batch_writer_report.md`
- Script phân tích XML: `analyze_d15.py`, `analyze_d06.py`, `analyze_d09.py` (tạm, không commit)
- Probe HTML export: `probe_d15_children.py` (tạm, không commit)
- Oracle trang Word: `scripts/layout-audit/_word_oracle3.ps1`
- Script batch đã cập nhật: `scripts/layout-audit/_batch_writer.py` (đã thêm cột pbb/hdr/ftr/media)