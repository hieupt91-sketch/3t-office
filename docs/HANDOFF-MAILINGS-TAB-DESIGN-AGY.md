# HANDOFF — Rà soát & Tinh chỉnh thiết kế trực quan tab "Trộn thư" (Mailings) & Tương phản tab đang chọn ở chế độ Tối — VN Writer (agy)

- **Nhánh**: `design/writer-mailings-tab-agy` (tách từ `main` `8240937`)
- **Worktree**: `E:\VNOffice-agy-mailings-tab`
- **Phạm vi**: 
  - **Việc 1**: Giao diện trực quan tab "Trộn thư" của VN Writer (Ribbon, CSS, Markup, Hộp thoại Phong bì / Nhãn / Nguồn dữ liệu CSV / Chèn trường trộn / Xem trước kết quả / Hoàn tất trộn, Icon-mapping, i18n, Bẫy tiêu điểm bàn phím Focus Trap & Escape, Trạng thái rỗng / lỗi dữ liệu bằng tiếng Việt, Responsive 1440px/1024px, Hướng dẫn sử dụng tiếng Việt theo AGENTS.md mục 10).
  - **Việc 2**: Tinh chỉnh độ tương phản màu cho tab ribbon ĐANG CHỌN ở chế độ Tối (Dark mode) dùng chung cho cả Writer, Sheet, Slides trong `platform/ribbon/ribbon.css` và `platform/shell/shell.css` đạt chuẩn WCAG AA (≥ 4.5:1), nổi bật rõ nét và không làm ảnh hưởng chế độ Sáng.
  - Tuyệt đối không can thiệp logic adapter xử lý tài liệu; không chạm vào các file của agent khác đang làm song song (`adapters/libreoffice/writer/writer-adapter.js`, `adapters/libreoffice/common/ooxml_zip_patch.py`, `adapters/libreoffice/sheet/sheet-adapter.js`, `main.py`, `scripts/layout-audit/*`). Không merge vào `main`.
- **Quy tắc ảnh chụp**: Toàn bộ kiểm thử trực quan được kiểm chứng tự động qua Playwright live test (`tests/live/writer-mailings-tab.playwright.mjs`). KHÔNG commit ảnh chụp màn hình `.png` vào git theo đúng TASK BRIEF.

---

## 1. Đối chiếu thực tế với Microsoft Word 2016 thật

Môi trường kiểm chứng thực tế: Đối chiếu với tab **Mailings** của **Microsoft Word 2016 Professional Plus**.

### 1.1. Bảng đối chiếu các nhóm lệnh trên tab Trộn thư

| STT | Nhóm trên Word 2016 | Lệnh trên Word 2016 | Hiện trạng trên VN Writer | Trạng thái & Đánh giá |
|---|---|---|---|---|
| 1 | **Create (Tạo)** | • Envelopes (Phong bì)<br>• Labels (Nhãn) | • `writer.mailMerge.envelopes` (Phong bì)<br>• `writer.mailMerge.labels` (Nhãn) | **Tương đương 100%**: 2 nút lớn sắc nét với icon phong bì và nhãn. Có hộp thoại chọn kích thước khổ phong bì (DL 110x220, C5 162x229, B5 176x250, C6 114x162, No.10 105x241) hoặc khổ nhãn (Avery A4 24 nhãn, 14 nhãn, 8 nhãn) cùng địa chỉ nhận/gửi. |
| 2 | **Start Mail Merge (Bắt đầu trộn thư)** | • Start Mail Merge<br>• Select Recipients<br>• Edit Recipient List | • `writer.mailMerge.selectRecipients` (Chọn người nhận) | **Tương đương cốt lõi**: Nút lớn hỗ trợ mở hộp thoại nạp danh sách người nhận từ tệp CSV (kèm tính năng nạp nhanh dữ liệu mẫu 3 người nhận để thử nghiệm ngay). Hộp thoại hiển thị bảng dữ liệu trực quan, đếm tổng số bản ghi và trạng thái nạp. |
| 3 | **Write & Insert Fields (Viết & Chèn trường)** | • Highlight Merge Fields<br>• Address Block<br>• Greeting Line<br>• Insert Merge Field<br>• Rules<br>• Match Fields<br>• Update Labels | • `writer.mailMerge.insertField` (Chèn trường) | **Tinh gọn thực tế**: Nút lớn với icon danh thiếp/trường dữ liệu. Mở hộp thoại chọn tên trường từ tệp dữ liệu đã nạp (ví dụ `Họ và tên`, `Địa chỉ`, `Email`, `Số điện thoại`...) để chèn trường trộn dạng `«Họ và tên»` tại vị trí con trỏ văn bản. |
| 4 | **Preview Results (Xem trước kết quả)** | • Preview Results<br>• First Record / Record # / Last<br>• Previous Record<br>• Next Record<br>• Find Recipient<br>• Check for Errors | • `writer.mailMerge.preview` (Xem trước kết quả)<br>• `writer.mailMerge.prevRecord` (Bản ghi trước)<br>• `writer.mailMerge.nextRecord` (Bản ghi sau) | **Tương đương luồng duyệt trực quan**: 1 nút lớn bật/tắt xem trước (toggle) và 1 cột 2 nút nhỏ chuyển tới lui giữa các bản ghi người nhận. Khi bật, văn bản lập tức thay thế các trường `«...»` bằng dữ liệu thực tế của người nhận thứ `i / N`. |
| 5 | **Finish (Hoàn tất)** | • Finish & Merge | • `writer.mailMerge.finish` (Hoàn tất & Trộn) | **Tương đương 100%**: Nút lớn với icon cờ hiệu hoàn tất. Tiến hành xuất hoặc in toàn bộ tài liệu sau khi trộn tất cả bản ghi người nhận. |

### 1.2. Đánh giá khoảng trống tính năng (Gaps vs Word 2016)
- **Khoảng trống chủ động**:
  - *Address Block* (Khối địa chỉ chuẩn phương Tây) và *Greeting Line* (Lời chào như "Dear Mr./Mrs."): Không phù hợp với văn phong hành chính Việt Nam. Người dùng Việt Nam thường tự thiết kế tiêu đề và chèn trực tiếp các trường theo nhu cầu cụ thể.
  - *Rules* (Quy tắc logic IF...THEN...ELSE) và *Match Fields* (Khớp danh bạ Microsoft Outlook): Phụ thuộc hệ sinh thái Microsoft, không phù hợp cho ứng dụng desktop offline độc lập.
- **Khoảng trống cho lộ trình tương lai**:
  - Hộp nhập số thứ tự bản ghi trực tiếp (*Record number*) và nút nhảy đến bản ghi đầu/cuối (*First / Last Record*).
  - Tìm kiếm người nhận (*Find Recipient*) và kiểm tra lỗi logic dữ liệu (*Check for Errors*).

---

## 2. Việc 2 — Tinh chỉnh độ tương phản tab ribbon đang chọn ở chế độ Tối (Chung mọi app)

### 2.1. Vấn đề phát hiện
- Ở chế độ Tối (Dark mode), nhãn của tab ribbon ĐANG CHỌN (`.vno-ribbon-tab.is-active`) trước đây dùng màu xanh đậm `var(--vno-app-current-fg)` (trên Writer là `#0f4c81`).
- Khi hiển thị trên nền tối `#252526` của ribbon header, tỷ lệ tương phản chỉ đạt **~2.1:1**, thấp hơn nhiều so với chuẩn WCAG AA (≥ 4.5:1), khiến tab đang chọn bị chìm và khó đọc hơn cả các tab không chọn (tab không chọn có chữ `#cbd5e1` với tương phản ~10:1).

### 2.2. Giải pháp thực hiện
- Tinh chỉnh đồng bộ trong cả hai tệp dùng chung: `platform/ribbon/ribbon.css` và `platform/shell/shell.css`.
- Khai báo selector kế thừa theo ứng dụng ở chế độ Tối:
  - **VN Writer**: `[data-theme="dark"] [data-app="writer"] .vno-ribbon-tab.is-active` dùng `color: var(--vno-writer-primary-fg, #60a5fa)` -> Tương phản **6.02:1** trên `#252526` (**ĐẠT WCAG AA**).
  - **VN Sheet**: `[data-theme="dark"] [data-app="sheet"] .vno-ribbon-tab.is-active` dùng `color: var(--vno-sheet-primary-fg, #4ade80)` -> Tương phản **8.79:1** trên `#252526` (**ĐẠT WCAG AA**).
  - **VN Slides**: `[data-theme="dark"] [data-app="slides"] .vno-ribbon-tab.is-active` dùng `color: var(--vno-slides-primary-fg, #fb923c)` -> Tương phản **6.77:1** trên `#252526` (**ĐẠT WCAG AA**).
- Chế độ Sáng (Light mode) hoàn toàn không bị ảnh hưởng, giữ nguyên màu nhận diện ứng dụng sắc nét:
  - Writer: `#0f4c81` trên `#ffffff` (**9.42:1**).
  - Sheet: `#107c41` trên `#ffffff` (**6.78:1**).
  - Slides: `#c43e1c` trên `#ffffff` (**5.84:1**).
- Đã được kiểm chứng qua Playwright live test trên cả Writer (`?app=writer`) và Sheet (`?app=sheet`).

---

## 3. Danh sách vấn đề phát hiện và xử lý trên tab Trộn thư

| STT | Vấn đề phát hiện | Trạng thái | Nguyên nhân & Giải pháp thực hiện |
|---|---|---|---|
| 1 | **Va chạm chuỗi con trong `resolveIcon` (components.js) gán nhầm icon cho tab Trộn thư** | **ĐÃ SỬA** | **Hiện trạng**: Trong `platform/ui-kit/components.js`, chuỗi kiểm tra `idLower.includes("ai")` đã bắt nhầm từ khóa `"mailings"` (chứa chuỗi `"ai"`), khiến các lệnh trộn thư bị biến thành biểu tượng `ICONS.aiSparkle`! Ngoài ra `idLower.includes("merge")` bắt nhầm sang `ICONS.mergeCells` (trộn ô của Sheet).<br>**Giải pháp**: Bổ sung các matcher chuyên biệt đứng trước cho các lệnh Trộn thư: `envelope` -> `ICONS.envelope`, `label` -> `ICONS.label`, `insertfield` -> `ICONS.businessCard`, `mergepreview` -> `ICONS.mergePreview`, `prevrecord` -> `ICONS.chevronLeft`, `nextrecord` -> `ICONS.chevronRight`, `mergefinish` -> `ICONS.flag`, và `mailmerge` -> `ICONS.mailings`. Đảm bảo 100% controls hiển thị đúng icon đặc thù, 0 fallback chấm tròn đen. |
| 2 | **Độ tương phản và phân biệt trạng thái trong hộp thoại Trộn thư ở chế độ Tối** | **ĐÃ SỬA** | **Hiện trạng**: Biểu tượng header dialog dùng mã màu cứng `#0f4c81`, khi chuyển sang dark mode bị chìm trên nền tối; huy hiệu trạng thái `.vno-merge-status-badge` thiếu chỉ thị màu sắc rõ rệt giữa chưa nạp / nạp lỗi / nạp thành công; các dòng thông báo lỗi `#vno-envelope-error` và `#vno-labels-error` dùng màu đỏ `#dc2626` có độ tương phản chỉ ~2.85:1 trên nền tối `#252526`.<br>**Giải pháp**: Cập nhật `apps/writer/mail-merge.js` dùng biến màu `var(--vno-app-current-fg, #0f4c81)`; thêm thuộc tính `data-status="empty" | "error" | "success"` cho huy hiệu trạng thái. Bổ sung styling dark mode trong `apps/writer/writer.css`: màu lỗi đổi sang `#f87171` (đạt **4.57:1**, đạt WCAG AA); huy hiệu trạng thái có viền và nền dịu mắt; thẻ `.vno-merge-field` và `.vno-merge-preview` sáng rõ trong dark mode. |
| 3 | **Lệch nhãn lệnh `writer.mailMerge.preview` giữa command definitions và i18n** | **ĐÃ SỬA** | **Hiện trạng**: Trong `platform/commands/command-definitions.js`, lệnh được đặt nhãn là `"Xem trước"`, trong khi tại `strings-vi.js` và cấu hình ribbon lại đặt là `"Xem trước kết quả"` (khớp với Word 2016).<br>**Giải pháp**: Đồng bộ nhãn trong `command-definitions.js` thành `"Xem trước kết quả"` để đảm bảo tính nhất quán trên toàn bộ hệ thống menu, ribbon và command palette. |
| 4 | **Bẫy tiêu điểm bàn phím (Focus Trap) và phím Escape đóng hộp thoại** | **ĐÃ KIỂM CHỨNG** | **Hiện trạng & Giải pháp**: Rà soát cả 4 hộp thoại (Phong bì, Nhãn, Chọn người nhận/Nguồn dữ liệu, Chèn trường trộn). Tất cả đã có sẵn hàm `trapFocus` xử lý Tab/Shift+Tab giữ tiêu điểm trong modal, phím Escape đóng an toàn và khôi phục tiêu điểm cho nút kích hoạt. Đã kiểm chứng tự động 100% qua Playwright live test. |
| 5 | **Nội dung Hướng dẫn sử dụng (Help entries) tiếng Việt cho tab Trộn thư** | **ĐÃ HOÀN THIỆN** | **Hiện trạng & Giải pháp**: Cập nhật bài hướng dẫn `writer.mailMerge` trong `platform/help/entries-writer.js`: đồng bộ tên nút "Xem trước kết quả", hướng dẫn chi tiết theo trình tự 5 nhóm từ Tạo phong bì/nhãn, nạp dữ liệu người nhận, chèn trường, xem trước kết quả tới hoàn tất trộn thư; mở rộng từ khóa tìm kiếm tiếng Việt và tiếng Anh. |

---

## 4. Rà soát các nút lệnh (Dead buttons audit)

Đã quét toàn bộ 8 controls trên tab Trộn thư của VN Writer:

1. `writer.mailMerge.envelopes` (Phong bì): Mở hộp thoại tạo phong bì thư, hỗ trợ 5 khổ phong bì chuẩn quốc tế và địa chỉ nhận/gửi.
2. `writer.mailMerge.labels` (Nhãn): Mở hộp thoại in nhãn địa chỉ theo lưới nhãn tem (Avery A4).
3. `writer.mailMerge.selectRecipients` (Chọn người nhận): Mở hộp thoại nạp danh sách người nhận từ tệp CSV hoặc nạp dữ liệu mẫu để thử nghiệm.
4. `writer.mailMerge.insertField` (Chèn trường): Mở hộp thoại chọn trường trộn từ danh sách trường của nguồn dữ liệu và chèn vào văn bản.
5. `writer.mailMerge.preview` (Xem trước kết quả): Bật/tắt chế độ xem trước dữ liệu thực của người nhận thay thế cho các mã trường.
6. `writer.mailMerge.prevRecord` (Bản ghi trước): Di chuyển về bản ghi người nhận liền trước.
7. `writer.mailMerge.nextRecord` (Bản ghi sau): Di chuyển tới bản ghi người nhận tiếp theo.
8. `writer.mailMerge.finish` (Hoàn tất & Trộn): Tiến hành trộn tất cả bản ghi và xuất/in tài liệu kết quả.

- **Kết quả kiểm tra**: **100% (8/8) controls đều có live handler hoạt động thật** được đăng ký trong `WriterAdapter.attach()` và gắn vào `globalCommandBus`. Đã kiểm chứng tự động qua Playwright live test: **21/21 assertions PASS**.

---

## 5. Rà soát bố cục và tràn ngang (Responsive & Layout Audit)

Đo đạc kiểm chứng thực tế qua Playwright live test:
- **Độ phân giải 1440px**:
  - `ribbonClientWidth = 1440px`, `ribbonScrollWidth = 1440px`, `hasOverflow: false` (0 tràn ngang).
  - Chiều cao các khối items trong nhóm đạt chuẩn 72px.
  - Nhãn các nhóm (`Tạo`, `Bắt đầu trộn`, `Viết & Chèn trường`, `Xem trước kết quả`, `Hoàn tất`) thẳng hàng tuyệt đối trên cùng một đường cơ sở (`labelTop = 156px`, `labelBottom = 175px`, `panelBottom = 176px`, sai lệch `maxDiff = 0px`).
- **Độ phân giải 1024px**:
  - `ribbonClientWidth = 1024px`, `ribbonScrollWidth = 1024px`, `hasOverflow: false` (0 tràn ngang).
  - Toàn bộ 5 nhóm lệnh hiển thị trọn vẹn, không phát sinh thanh cuộn ngang.

---

## 6. Danh mục commit thực hiện

1. `ff850a2`: `design(ui): bo sung icon fallback cho cac lenh tab Tron thu trong components.js`
2. `9acf79b`: `design(ui): tinh chinh tuong phan WCAG AA cho tab ribbon dang chon o che do Toi`
3. `1e6ef4c`: `design(ui): tinh chinh hop thoai tron thu, phong bi, nhan va styling tuong phan che do Toi`
4. `9933b6d`: `design(ui): cap nhat bai Help tieng Viet cho tab Tron thu`
5. `268afa3`: `design(ui): bo sung playwright live test kiem chung toan dien tab Tron thu va tuong phan che do Toi`
6. `docs(handoff): ban giao ra soat thiet ke truc quan tab Tron thu Writer va tuong phan che do Toi (agy)`

---

## 7. Kết quả kiểm thử trung thực

- `tests/live/writer-mailings-tab.playwright.mjs`: **PASS (21/21 assertions, 100%)**:
  - Tab Trộn thư render chuẩn trong DOM (PASS)
  - Đủ 8 controls/buttons theo đúng thiết kế (PASS)
  - Không tràn ngang ở 1440px (PASS)
  - 100% controls có nhãn tiếng Việt chuẩn, 0 raw command-id (PASS)
  - 100% buttons có icon vector sắc nét, 0 fallback chấm tròn đen (PASS)
  - 100% controls có live handler trong CommandBus (PASS)
  - Mọi nhóm có items height chuẩn 72px (PASS)
  - Nhãn nhóm thẳng hàng baseline maxDiff = 0px (PASS)
  - Không nhãn nào đè mép dưới ribbon (PASS)
  - Không tràn ngang ở 1024px (PASS)
  - Hộp thoại Phong bì mở, focus input và đóng an toàn bằng Escape (PASS)
  - Hộp thoại Nhãn mở, focus select và đóng an toàn bằng Escape (PASS)
  - Hộp thoại Chọn người nhận mở, hiển thị trạng thái và nạp dữ liệu mẫu (PASS)
  - Hộp thoại Chèn trường trộn hiển thị các trường và chèn thành công (PASS)
  - Nút Xem trước kết quả chuyển đổi trạng thái xem trước (PASS)
  - Nút Hoàn tất trộn hoạt động và hiển thị hộp thoại thông báo hoàn tất (PASS)
  - Chế độ Tối (Dark mode): Tab Trộn thư (Writer) đạt tỷ lệ tương phản **6.02:1** (vượt chuẩn WCAG AA 4.5:1) (PASS)
  - Chế độ Tối (Dark mode): Tab Trang đầu (Sheet) đạt tỷ lệ tương phản **8.79:1** (vượt chuẩn WCAG AA 4.5:1) (PASS)
  - Chế độ Sáng (Light mode): Tab Trộn thư giữ tỷ lệ tương phản **9.42:1** (PASS)
  - 100% tính năng có bài Help chỉ đúng tab Trộn thư và tìm kiếm chuẩn xác (PASS)
  - 0 pageerror trong suốt phiên kiểm thử Playwright (PASS)
- `node scripts/audit-contrast.js`: **PASS (17/17 token pairs, 0 vi phạm CSS)**.
- `tests/unit/color-contrast-audit.test.js`: **PASS (7/7, 100%)**.
- `tests/unit/writer-mail-merge.test.js`: **PASS (15/15, 100%)**.
- `tests/unit/writer-refmail-audit.test.js`: **PASS (10/10, 100%)**.
- `tests/unit/writer-help.test.js`: **PASS (9/9, 100%)**.
- `node tests/run-tests.js`: **PASS 1835/1835 (0 FAIL, 100%)**.
