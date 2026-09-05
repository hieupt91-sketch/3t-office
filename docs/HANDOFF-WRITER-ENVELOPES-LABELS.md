# Agent Handoff

TASK: Writer Envelopes/Labels (Mailings > Create group)
AGENT/ROLE: Grok / Writer implementation and verification
BRANCH: `feature/writer-envelopes-labels`
WORKTREE: `E:\VNOffice-grok-writer-envelopes-labels`
BASE: `main` @ `a08f306` (Slides Sections merged, 1092/1092 PASS)
OBJECTIVE: Thêm Phong bì và Nhãn trên tab Trộn thư, nhóm Tạo. Tái sử dụng nguồn Mail Merge CSV nếu có. Không merge vào main.

---

## FINDINGS (đọc mail-merge.js trước khi thiết kế)

`apps/writer/mail-merge.js` + `WriterAdapter.mailMergeData`:

- Nguồn: CSV dán vào dialog, parse thuần JS (`parseCsv`).
- State: `{ rawCsv, fields[], records[] }` trên adapter; preview `{ enabled, recordIndex }`.
- Marker trường: `<span class="vno-merge-field" data-field="TenCot">«TenCot»</span>`.
- `replaceMergeFields(html, record)` thay span theo `data-field`.
- CSV mẫu: `HoTen,ChucVu,DonVi,NgayKy` — không phải schema địa chỉ cố định.

**Tái sử dụng được:** mảng `records` + `fields`. Envelopes/Labels không chèn merge-field vào thư; chúng **đọc nguồn đã lưu** và ghép mỗi bản ghi thành khối địa chỉ nhiều dòng (`formatRecordAsAddress`: nối các cột không rỗng theo thứ tự tiêu đề).

Không đụng Sheet/Slides source. Không core patch.

---

## IMPLEMENTATION SUMMARY

Tab **Trộn thư**, nhóm mới **Tạo** (đứng trước Bắt đầu trộn), hai nút lớn: **Phong bì**, **Nhãn**.

### Phong bì (`writer.mailings.envelopes`)

- Dialog: địa chỉ người nhận, địa chỉ người gửi (có thể ẩn), khổ DL 220×110 mm / C5 229×162 mm / Number 10 241,3×104,8 mm, vị trí Đầu hoặc Cuối tài liệu.
- Nếu đã có nguồn Trộn thư: checkbox “Dùng nguồn Trộn thư hiện có” — mỗi bản ghi một trang phong bì; người gửi dùng chung.
- Trang phong bì là **mục (section) riêng**: khổ giấy = khổ phong bì. Người gửi `top:10mm; left:12mm`; người nhận `top:52%; left:42%` (giữa-dưới).
- Canvas đổi `width`/`minHeight` theo mm (DL → 831.5px @ 96dpi). Undo/Redo snapshot Writer hiện có.

### Nhãn (`writer.mailings.labels`)

- Dialog: nội dung một nhãn + kiểu lưới Avery L7160 (3×7, 63,5×38,1 mm) hoặc 3×8 (~66×34 mm) trên A4.
- Không Mail Merge: **mọi ô cùng nội dung**.
- Có Mail Merge: **mỗi ô một bản ghi khác nhau**; dư thì sang tờ mới (`paginateLabelContents`).
- Chèn trang mới (ngắt mục Next Page) khổ A4.

### Mail Merge

**Có tích hợp**, không chỉ bản ghi đơn:

| Chế độ | Envelopes | Labels |
|---|---|---|
| Gõ tay | 1 địa chỉ → 1 trang | 1 nội dung → mọi ô trên 1 tờ |
| Nguồn CSV đã lưu | 1 trang / bản ghi | 1 ô / bản ghi, nhiều tờ nếu cần |

---

## EXPORT — đo thật qua soffice (không giả định)

Cùng kỹ thuật Section Breaks/Page Color: `_contentForExport()` → `soffice --convert-to pdf:writer_pdf_Export` → đọc `/MediaBox`.

| Trường hợp | HTML xuất | PDF thật (MediaBox) |
|---|---|---|
| A4 + phong bì DL cuối tài liệu | `@page { size: 220mm 110mm }` + named `@page vno-section-*` | **Cả 2 trang 220×110 mm** — trang công văn A4 cũng bị kéo theo khổ phong bì |
| Chỉ phong bì DL | `@page { size: 220mm 110mm }` | Trang PDF **đúng 220×110 mm** |
| Nhãn Avery trên A4 | `@page { size: 210mm 297mm }` | **Đúng A4 210×297 mm** |

**Giới hạn (giống HANDOFF-WRITER-SECTIONBREAKS-PAGECOLOR):** LibreOffice HTML import chỉ áp dụng **một** `@page {}` document-level (khổ của mục đang active lúc xuất). Named `@page vno-<id>` bị bỏ qua. Canvas/xem trước vẫn đúng từng mục.

Hệ quả:

- Tài liệu **chỉ phong bì** (hoặc xuất khi đang đứng ở mục phong bì): PDF đúng khổ phong bì.
- Tài liệu **trộn A4 + phong bì**: PDF **không** giữ hai khổ khác nhau. Sửa thật cần `w:sectPr` / ODF section properties sau convert — ngoài phạm vi.
- **Nhãn** dùng A4 nên in/PDF khớp lưới trên canvas.

### Lỗi thật tìm thêm và đã sửa trong quá trình review (Claude, không phải Grok)

`buildLabelSheetHtml()` đặt CSS ngắt trang (`pageBreak: index > 0`) trên `<div class="vno-label-sheet">` bọc ngoài — **đúng lỗi giống hệt** đã tìm/sửa ở Section Breaks: LibreOffice HTML-import chỉ tôn trọng `page-break-before` trên `<p>`, không phải `<div>`. Đo bằng nội dung siêu nhỏ (1 ô, không thể tự tràn trang do chiều cao) để loại trừ khả năng trùng hợp: kết quả PDF thật ban đầu là **1 trang** dù `pageBreak:true` — nghĩa là khi Mail Merge cho ra nhiều tờ nhãn **nhỏ** (không tự nhiên tràn trang như Avery L7160 gần đầy A4), các tờ sẽ bị dồn chung 1 trang thật trong file xuất, dù trên canvas nhìn đúng.

Đã sửa: chèn `<p style="page-break-before:always;...">` marker riêng trước mỗi tờ nhãn thứ 2 trở đi, thay vì dựa vào style của `<div>` bọc ngoài. Xác nhận lại bằng cùng phép đo (nội dung siêu nhỏ): PDF thật ra đúng 2 trang. Thêm assertion thật (`node:assert`) vào `tests/live/writer-envelopes-labels-real-conversion.mjs` (`LABELS_MULTIPAGE_REAL_BREAK_PAGES`) để giữ hồi quy.

**Lưu ý quan trọng:** kết quả `LABELS_PAGES: 2` trong bảng trên (dùng nội dung Avery L7160 đầy 21 ô) **không đủ để chứng minh** ngắt trang hoạt động, vì 1 tờ Avery L7160 gần như tự tràn sang trang 2 do chiều cao bảng (~267mm trên A4 297mm) — đây chính là lý do cần phép đo cô lập bằng nội dung siêu nhỏ ở trên.

Probe: `node tests/live/writer-envelopes-labels-real-conversion.mjs` (không nằm trong `run-tests.js`).

---

## FILES CHANGED

- `apps/writer/envelopes-labels.js` — mới: khổ, lưới, HTML, dialog.
- `adapters/libreoffice/writer/writer-adapter.js` — `insertEnvelope` / `insertLabels`, PAGE_SIZES_MM thêm dl/c5/number10.
- `apps/writer/writer-ribbon.js` — nhóm Tạo.
- `apps/writer/writer.css` — `.vno-envelope-page`, `.vno-label-sheet`.
- `platform/commands/command-definitions.js` — `writer.mailings.envelopes`, `writer.mailings.labels`.
- `platform/i18n/strings-vi.js`, `strings-en.js`
- `platform/ui-kit/icons.js` — `envelope`, `labels`
- `platform/help/entries-writer.js` — 2 bài tiếng Việt
- `tests/unit/writer-envelopes-labels.test.js`
- `tests/live/writer-envelopes-labels.playwright.mjs`
- `tests/live/writer-envelopes-labels-real-conversion.mjs`
- `tests/run-tests.js` — suite 105
- `docs/HANDOFF-WRITER-ENVELOPES-LABELS.md`

Không đụng `apps/sheet/**`, `apps/slides/**`, `command-dispatch-mapper.js`.

---

## COMMANDS RUN

- `node tests/run-tests.js`
- `node tests/live/writer-envelopes-labels.playwright.mjs` (Edge headless, click thật, không SendKeys)
- `node tests/live/writer-envelopes-labels-real-conversion.mjs` (soffice PDF MediaBox)

BUILD RESULT: không đổi build system.

---

## TEST RESULTS

- `node tests/run-tests.js`: **1103/1103 PASS**, ~70s (dưới 90s). Suite 105: 10/10 PASS.
- Live Playwright: **PASS** — Phong bì DL 220×110 mm, người nhận 52%/42%, người gửi 10mm/12mm, canvas 831.5px; Nhãn Avery 21 ô 63.5×38.1 mm, 3 bản ghi CSV mẫu mỗi ô khác nhau.
- Soffice PDF: đo như bảng trên (KNOWN LIMIT khổ lẫn; nhãn A4 đúng; phong bì đơn đúng 220×110).

Không disable test, không đổi expected để xanh.

---

## KNOWN FAILURES

Không. Giới hạn export khổ lẫn là hành vi đo được, không phải fail im lặng.

---

## RISKS

- Xuất DOCX/PDF tài liệu vừa công văn A4 vừa phong bì: mọi trang cùng một khổ (mục active).
- `formatRecordAsAddress` nối **mọi cột** CSV; CSV hành chính (`HoTen,ChucVu,DonVi,NgayKy`) ra 4 dòng, không phải block địa chỉ bưu chính chuẩn trừ khi người dùng đặt cột đúng.

---

## DEPENDENCIES/BLOCKERS

Không. Phụ thuộc Mail Merge đã có trên main.

CORE PATCH ID: không.

---

## COMMITS

- `feat(writer): add Envelopes (Phong bì) on Mailings Create group`
- `feat(writer): add Labels (Nhãn) with Mail Merge fill + handoff`

---

## NEXT ACTION

Không merge vào main. Review trên `feature/writer-envelopes-labels`. Follow-up (không chặn): xuất `w:sectPr` để một tệp vừa A4 vừa khổ phong bì; template địa chỉ chọn cột (Họ tên / Đường / Tỉnh).
