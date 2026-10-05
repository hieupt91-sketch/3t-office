# HANDOFF: Help Audit 2 — Bổ sung 15 bài hướng dẫn tiếng Việt với vị trí ribbon chính xác

**Ngày:** 04/10/2026  
**Nhánh:** `help-audit2-opencode` (worktree `E:\VNOffice-opencode-help2`)  
**Tác giả:** opencode agent  
**Test:** 2758/2758 PASS

---

## 1. Mục tiêu

Ra soát toàn bộ lệnh ribbon của 3 app (Writer, Sheet, Slides) đối chiếu với catalog hướng dẫn (`platform/help/entries-*.js`), phát hiện 79 lệnh có vị trí ribbon trong bài hướng dẫn **khác** với cấu hình ribbon thực tế (`apps/*/ribbon.js`). Viết 15 bài hướng dẫn mới cho các lệnh dùng hàng ngày quan trọng nhất, ghi rõ vị trí ribbon chính xác (tab/nhóm), thêm vào `platform/help/entries-audit2-0410.js` và đăng ký qua `help-catalog.js`.

---

## 2. Kết quả ra soát (Mapping table)

Script: `scripts/generate-mapping-table.mjs` → output `scripts/ribbon-help-mapping.csv`

| Chỉ số | Trước audit | Sau audit |
|--------|-------------|-----------|
| Tổng lệnh ribbon (có vị trí) | 255 | 255 |
| Lệnh có bài hướng dẫn (commandIds) | 255 (100%) | 255 (100%) |
| Vị trí ribbon khớp chính xác | 176 | 176 (giữ nguyên) |
| Vị trí ribbon **không khớp** (mismatch) | 79 | 79 (giữ nguyên) |
| **Bài hướng dẫn mới bổ sung (audit2)** | 0 | **15** |

> **Lưu ý:** 15 bài mới có `commandIds: []` để không xung đột với bài cũ (tránh làm hỏng `getHelpEntryById`). Các bài mới vẫn có thể tìm kiếm theo từ khóa/tiêu đề, và ghi rõ vị trí ribbon CHUẨN trong nội dung.

---

## 3. 15 lệnh quan trọng đã bổ sung bài hướng dẫn mới

| STT | Command ID | App | Vị trí ribbon CHUẨN (từ `apps/*/ribbon.js`) | Vị trí ribbon CŨ (trong bài cũ) | Entry ID mới |
|-----|------------|-----|---------------------------------------------|----------------------------------|--------------|
| 1 | `writer.page.break` | Writer | **Chèn > Trang văn bản** | Bố cục > Thiết lập trang | `writer.page.break.audit2` |
| 2 | `writer.comment.insert` | Writer | **Chèn > Ghi chú** | Đánh giá > Ghi chú | `writer.comment.insert.audit2` |
| 3 | `writer.para.indentInc` | Writer | **Bố cục > Đoạn văn** | Trang đầu > Đoạn văn | `writer.para.indentInc.audit2` |
| 4 | `writer.para.indentDec` | Writer | **Bố cục > Đoạn văn** | Trang đầu > Đoạn văn | `writer.para.indentDec.audit2` |
| 5 | `sheet.sheet.protect` | Sheet | **Xem xét > Bảo vệ** | Trang đầu > Ô | `sheet.sheet.protect.audit2` |
| 6 | `sheet.data.pivotTable` | Sheet | **Chèn > Bảng** | Dữ liệu > Bảng tổng hợp | `sheet.data.pivotTable.audit2` |
| 7 | `sheet.format.quickCategory` | Sheet | **Trang đầu > Số** | Trag đầu > Định dạng số | `sheet.format.quickCategory.audit2` |
| 8 | `sheet.format.cellsDialog` | Sheet | **Trag đầu > Phông chữ** (launcher) | Trang đầu > Định dạng số | `sheet.format.cellsDialog.audit2` |
| 9 | `sheet.formula.sum` | Sheet | **Trag đầu > Chỉnh sửa** | Công thức > Hàm tính toán | `sheet.formula.sum.audit2` |
| 10 | `slides.text.insert` | Slides | **Trag đầu > Vẽ** | Trag đầu > Đối tượng vẽ | `slides.text.insert.audit2` |
| 11 | `slides.shape.insert` | Slides | **Trag đầu > Vẽ** | Trag đầu > Đối tượng vẽ | `slides.shape.insert.audit2` |
| 12 | `slides.image.insert` | Slides | **Trag đầu > Vẽ** | Trag đầu > Đối tượng vẽ | `slides.image.insert.audit2` |
| 13 | `slides.review.commentInsert` | Slides | **Chèn > Nhận xét** | Đánh giá > Nhận xét | `slides.review.commentInsert.audit2` |
| 14 | `slides.notes.toggle` | Slides | **Trình chiếu > Người thuyết trình** | Chế độ xem > Dạng xem bản trình chiếu | `slides.notes.toggle.audit2` |
| 15 | `slides.arrange.alignLeft` (và 8 lệnh arrange liên quan) | Slides | **Trag đầu > Vẽ** (menu Sắp xếp) | Trag đầu > Đối tượng vẽ | `slides.arrange.alignLeft.audit2` |

---

## 4. File thay đổi / mới

### File mới
- `platform/help/entries-audit2-0410.js` — 15 bài hướng dẫn tiếng Việt có vị trí ribbon chính xác, `commandIds: []`.

### File sửa đổi
- `platform/help/help-catalog.js` — Import `AUDIT2_HELP_ENTRIES` và spread vào `HELP_ENTRIES`.

### Scripts hỗ trợ (đã có sẵn, dùng để ra soát)
- `scripts/extract-ribbon-commands3.mjs` — Trích xuất lệnh ribbon + vị trí từ `apps/*/ribbon.js`
- `scripts/extract-help-commands.mjs` — Trích xuất `commandIds` từ `platform/help/entries-*.js`
- `scripts/compare-locations.mjs` — So sánh vị trí ribbon bài hướng dẫn vs thực tế
- `scripts/generate-mapping-table.mjs` — Xuất bảng mapping CSV

---

## 5. Cấu trúc bài hướng dẫn mới (mẫu)

Mỗi entry trong `entries-audit2-0410.js` tuân thủ cấu trúc chuẩn:

```javascript
{
  id: "sheet.data.pivotTable.audit2",
  app: "sheet",
  commandIds: [], // để trống tránh xung đột getHelpEntryById
  title: "Bang tong hop (Pivot Table) -- vi tri ribbon chuan",
  summary: "Tao bang tong hop... Vi tri ribbon chuan: tab Chen > nhom Bang. (Bai cu: Du lieu > Bang tong hop)",
  ribbon: { tab: "Chen", tabId: "insert", group: "Bang" },
  keywords: ["pivot", "bang tong hop", "chen", "bang", ...],
  steps: [
    "Buoc 1...",
    "Buoc 2...",
    "Buoc 3...",
    "Buoc 4...",
    "Buoc 5...",
    "Luu y: Bai huong dan cu (sheet.data.pivotTable) co vi tri ribbon la 'Du lieu > Bang tong hop' -- day la sai. Vi tri that la 'Chen > Bang'."
  ]
}
```

---

## 6. Test kết quả

```
KẾT QUẢ KIỂM THỬ: 2758/2758 PASS | 0 FAIL
```

Tất cả test hiện có pass, bao gồm:
- Test `Help Sheet: getHelpEntryById nhận cả id bài và commandId thành viên` (trước FAIL do xung đột commandIds, nay PASS)
- Test coverage 100% ribbon commands có help
- Test không dùng tên độc quyền (Word/Excel/PowerPoint)
- Test i18n, keyboard shortcuts, F1 help, v.v.

---

## 7. Hạn chế / Follow-up

1. **79 lệnh vẫn mismatch** — Các bài hướng dẫn cũ (entries-writer.js, entries-sheet.js, entries-slides.js, entries-gaps-0410.js, v.v.) vẫn giữ vị trí ribbon sai. Cần agent sở hữu từng app cập nhật `ribbon` field trong entry gốc để khớp với `apps/*/ribbon.js` thực tế.

2. **commandIds rỗng** — 15 bài mới không claim `commandIds` để không phá vỡ `getHelpEntryById`. F1/contextual help vẫn trỏ về bài cũ (vị trí sai). Khi agent sở hữu cập nhật bài cũ, có thể xóa bài audit2 tương ứng.

3. **Không refactor ngoài scope** — Chỉ thêm file mới, không sửa bài cũ, không đổi UI, không đổi ribbon config.

---

## 8. Handoff cho agent tiếp theo

- **Platform/Help owner**: Cập nhật `ribbon` field trong các entry gốc (entries-writer.js, entries-sheet.js, entries-slides.js, entries-gaps-0410.js, v.v.) để khớp 100% với `apps/*/ribbon.js`. Sau khi xong, có thể xóa các entry `*.audit2` tương ứng.
- **Writer/Sheet/Slides owner**: Kiểm tra các lệnh trong bảng mục 3 thuộc app mình, xác nhận vị trí ribbon trong code thực tế.
- **QA**: Chạy `node scripts/compare-locations.mjs` để verify mismatch còn lại = 0.

---

## 9. Checklist hoàn tất

- [x] Mapping table toàn bộ 255 lệnh ribbon (CSV + console)
- [x] Phát hiện 79 mismatch vị trí ribbon
- [x] Chọn 15 lệnh quan trọng nhất (dùng hàng ngày, mismatch rõ rệt)
- [x] Viết 15 bài hướng dẫn tiếng Việt có nội dung thật, bước cụ thể, vị trí ribbon chính xác
- [x] Tạo file `platform/help/entries-audit2-0410.js` theo cấu trúc chuẩn
- [x] Đăng ký qua `help-catalog.js`
- [x] `commandIds: []` tránh xung đột `getHelpEntryById`
- [x] Chạy `node tests/run-tests.js` → 2758/2758 PASS
- [x] Tài liệu handoff này