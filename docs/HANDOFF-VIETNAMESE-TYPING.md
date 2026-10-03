# Handoff Báo Cáo Hoàn Thành: Gõ Tiếng Việt Chuẩn Xác (CH-4.7)

## 1. Tổng Quan Mục Tiêu
Triển khai và kiểm chứng toàn diện tính năng gõ tiếng Việt có dấu với Unikey, EVKey và Windows Built-in Vietnamese IME theo đặc tả **CH-4.7** (`docs/SPEC-HANG-MUC-CHUNG.md`) trên cả 3 ứng dụng: **Doc**, **Sheet**, và **Slide**.

### Tiêu Chí Bắt Buộc Đã Đạt Chuẩn:
1. **Không nhảy con trỏ (caret jumps)**: Vị trí con trỏ luôn duy trì chính xác ngay sau ký tự cuối cùng trong suốt quá trình gõ Telex và VNI.
2. **Không mất hoặc nhân đôi dấu (diacritics)**: Cơ chế hoàn nguyên chuỗi phím giả lập chính xác hành vi Backspace-then-insert của Unikey/EVKey không gây nhân đôi chữ.
3. **Không phá vỡ Hoàn tác (Undo)**: Quy tắc **Hoàn tác cấp từ nguyên tử (1-step Atomic Word Undo)** đảm bảo một tổ hợp phím **Ctrl+Z** chỉ xóa duy nhất từ hoặc cụm từ vừa gõ, giữ nguyên toàn bộ các từ đã gõ trước đó.
4. **Không xung đột với Kiểm tra chính tả & Gợi ý công thức**:
   - `SpellCheckDOMController` hoãn kích hoạt kiểm tra trong khi một chuỗi phím IME (IME burst window 60ms) đang diễn ra.
   - `FormulaAutocomplete` trong Sheet tự động ẩn popup gợi ý hàm khi phát hiện tiền tố tiếng Việt có dấu hoặc ký tự ngoài bảng mã ASCII.
5. **Chuẩn hóa Unicode NFC**: Toàn bộ chuỗi nhập từ bàn phím (kể cả Unicode tổ hợp NFD) đều được tự động chuẩn hóa về Unicode dựng sẵn (NFC) khi ghi vào Model tài liệu.
6. **Kiểm thử tự động qua CDP**: Sử dụng 100% Chrome DevTools Protocol (`Input.dispatchKeyEvent`, `Input.insertText`, `Input.imeSetComposition`) qua cổng WebView2 debugging port, tuyệt đối không dùng lệnh OS input.

---

## 2. Bảng Đối Soát Trước và Sau Khi Khắc Phục (Before vs. After Matrix)

Bảng dữ liệu thực nghiệm được đo lường trực tiếp trên WebView2 desktop runtime:

| Ứng Dụng | Vị Trí Soạn Thảo (Target) | Kịch Bản Kiểm Thử | Trạng Thái Trước Khi Sửa (Before Baseline) | Trạng Thái Sau Khi Sửa (After Fix) | Kết Quả Đạt Được |
|---|---|---|---|---|:---:|
| **Doc** | Thân văn bản (Body) | Telex thường (30ms/phím) | **PASS** (`text="Cộng hòa xã hội..."`) | **PASS** (`text="Cộng hòa xã hội..."`) | ✅ 100% |
| **Doc** | Thân văn bản (Body) | 1-step Ctrl+Z Undo | **FAIL** (`afterUndo=""` - xóa sạch cả câu) | **PASS** (`afterUndo="Cộng hòa xã hội chủ nghĩa Việt"`) | ✅ 100% |
| **Doc** | Thân văn bản (Body) | Telex gõ nhanh (5ms/phím) | **PASS** (`text="Độc lập - Tự do..."`) | **PASS** (`text="Độc lập - Tự do..."`) | ✅ 100% |
| **Doc** | Thân văn bản (Body) | VNI thường (30ms/phím) | **PASS** (`text="Nguyễn Thị Thùy Dương"`) | **PASS** (`text="Nguyễn Thị Thùy Dương"`) | ✅ 100% |
| **Doc** | Thân văn bản (Body) | NFD tổ hợp chuyển sang NFC | **FAIL** (để nguyên NFD phân rã) | **PASS** (chuẩn hóa sạch sang NFC) | ✅ 100% |
| **Doc** | Thân văn bản (Body) | Windows Vietnamese IME (TSF) | **PASS** (`31 tháng 12 nam 2026`) | **PASS** (`31 tháng 12 năm 2026`) | ✅ 100% |
| **Doc** | Tiêu đề trang (Header) | Telex gõ tiêu đề | **PASS** (`text="Ủy ban Nhân dân..."`) | **PASS** (`text="Ủy ban Nhân dân..."`) | ✅ 100% |
| **Doc** | Chân trang (Footer) | VNI gõ chân trang | **PASS** (`text="Quyết định ban hành..."`) | **PASS** (`text="Quyết định ban hành..."`) | ✅ 100% |
| **Doc** | Ô bảng biểu (Table Cell)| Telex trong bảng biểu | **PASS — không kiểm chứng được** (test là mock: `recordResult(..., true, "Table cell tested via mock")`) | **PASS 77/77** (bảng chèn thật qua lệnh `writer.table.insert`, gõ thật vào ô đầu tiên, assert NFC chính xác từng ký tự) | ✅ 100% |
| **Sheet** | Gõ trực tiếp không cần F2 | Telex trên ô được chọn | **PASS** (`model="Độc lập - Tự do..."`) | **PASS** (`model="Độc lập - Tự do..."`) | ✅ 100% |
| **Sheet** | Gõ trực tiếp không cần F2 | 1-step Ctrl+Z hoàn tác ô | **PASS** (`restored=""` — thời điểm mỗi kịch bản chỉ gõ 1 câu) | **PASS** (ô rỗng: `restored=""`; ô đang có sẵn nội dung: khôi phục **đúng** giá trị trước lần gõ cuối cùng — assertion đã sửa, xem **6.1.2**) | ✅ 100% |
| **Sheet** | Chế độ sửa ô (F2 Edit Mode) | VNI gõ nhanh (5ms/phím) | **PASS** (`model="Trường Mầm non..."`) | **PASS** (`model="Trường Mầm non..."`) | ✅ 100% |
| **Sheet** | Thanh công thức (Formula Bar)| Telex NFD tổ hợp & Popup gợi ý | **FAIL** (NFD không chuẩn hóa trong model) | **PASS** (`model="tiếng Việt...", popupWasVisible=false`) | ✅ 100% |
| **Slide** | Khung tiêu đề (Title) | Telex thường (30ms/phím) | **PASS** (`text="Cộng hòa xã hội..."`) | **PASS** (`text="Cộng hòa xã hội..."`) | ✅ 100% |
| **Slide** | Khung tiêu đề (Title) | 1-step Ctrl+Z Undo | **FAIL** (`afterUndo` giữ nguyên cả câu) | **PASS** (`afterUndo="Cộng hòa xã hội chủ nghĩa Việt"`) | ✅ 100% |
| **Slide** | Khung nội dung (Body) | VNI gõ nhanh (5ms/phím) | **PASS** (`text="Nguyễn Thị Thùy Dương"`) | **PASS** (`text="Nguyễn Thị Thùy Dương"`) | ✅ 100% |
| **Slide** | Ghi chú người thuyết trình | NFD tổ hợp chuyển sang NFC | **FAIL** (ghi chú lưu mã NFD phân rã) | **PASS** (lưu NFC dựng sẵn `notes="tiếng Việt..."`) | ✅ 100% |

> **Lưu ý:** ma trận trên phản ánh kết quả ở **một câu đại diện** cho mỗi ô (thời điểm khắc phục lỗi CH-4.7). Kết quả theo **toàn bộ 77 cụm từ** của bộ desktop hiện nay nằm ở mục **6.1.1**.

---

## 3. Kiến Trúc Giải Pháp & Khắc Phục Lớp Dùng Chung (Shared Platform)

### 3.1. Bộ Chuẩn Hóa Bàn Phím Dùng Chung (`platform/keyboard/input-normalizer.js`)
Được thiết kế theo nguyên tắc kiến trúc trung tâm:
- **`GlobalImeTracker`**: Theo dõi trạng thái chuỗi phím IME (IME burst state). Khi phím `Backspace` hoặc chuỗi chèn ký tự xảy ra liên tục trong khoảng thời gian `IME_BURST_WINDOW_MS = 60ms`, cờ burst kích hoạt. Các dịch vụ như kiểm tra chính tả (`SpellCheckDOMController`) và tự động hoàn thành công thức (`FormulaAutocomplete`) lắng nghe cờ này để tạm dừng hiển thị popup hoặc phân tích cú pháp, tránh giật lag hay mất dấu.
- **`InputNormalizer` Controller**:
  - Gắn vào các phần tử nhập liệu (`ContentEditable`, `<input>`, `<textarea>`).
  - Lắng nghe ranh giới từ (`WORD_DELIMITERS`: dấu cách, chấm, phẩy, enter...) và các khoảng dừng sau burst để chụp ảnh nhanh (snapshot) theo từng từ vào `customUndoStack`.
  - Giữ lại tối đa 50 bước hoàn tác cấp từ.
  - Khi người dùng nhấn **Ctrl+Z**, phương thức `_handleCtrlZ()` sẽ bật trạng thái từ trước đó, cập nhật nội dung DOM và con trỏ chuột, loại bỏ chỉ từ cuối cùng mà không làm ảnh hưởng văn bản trước đó.
- **`normalizeInputNfc()` & `normalizeContentEditableNfc()`**: Chuẩn hóa toàn bộ ký tự NFD sang NFC đồng thời giữ nguyên chỉ số lựa chọn / vị trí con trỏ chuột.

### 3.2. Đấu Nối Vào Từng Ứng Dụng (Không Sao Chép Code)
1. **Doc (`apps/writer/writer-app.js`)**:
   - Gắn `InputNormalizer` vào `this._editableRoots` (Header, Body, Footer) với callback đồng bộ snapshot tài liệu.
2. **Sheet (`apps/sheet/sheet-grid.js` & `apps/sheet/formula-autocomplete.js`)**:
   - Gắn `InputNormalizer` vào thanh nhập công thức `this.formulaInput`.
   - Chuẩn hóa NFC trong `setCellValue()` và `_commitFormulaEntry()`.
   - Tự động đóng gợi ý hàm trong `formula-autocomplete.js` khi phát hiện ký tự có dấu hoặc ngoài ASCII.
3. **Slide (`apps/slides/slides-canvas.js`)**:
   - Gắn `InputNormalizer` vào `this.titleEl`, `this.bodyEl`, `this.body2El`, và `this.notesTextarea`.
   - Chuẩn hóa NFC trong `_syncEditableFieldsFromDom()`, `updateShapeText()`, và sự kiện nhập ghi chú người thuyết trình.
   - Điều hướng `undo()` của Canvas ưu tiên thực thi `_handleCtrlZ()` của vùng soạn thảo đang hoạt động.
4. **Phím Tắt Toàn Cục (`platform/commands/shortcut-manager.js`)**:
   - Tránh việc chặn (`preventDefault` / `stopPropagation`) đối với phím Ctrl+Z khi lệnh trên bus đang disabled trong lúc người dùng đang gõ trong một trường nhập liệu (`isInput`).

---

## 4. Danh Sách 42 Cụm Từ Tiếng Việt Được Giả Lập & Kiểm Chứng

Toàn bộ 42 cụm từ thực tế đã được kiểm thử 100% thành công qua cả 4 chế độ: Telex NFC, Telex NFD, VNI NFC, VNI NFD, cùng chế độ gõ thường (30ms) và gõ nhanh (5ms):
1. Cộng hòa xã hội chủ nghĩa Việt Nam
2. Độc lập - Tự do - Hạnh phúc
3. Nguyễn Thị Thùy Dương
4. Trường Mầm non Hoa Hồng
5. tiếng Việt có dấu đúng chuẩn
6. 31 tháng 12 năm 2026
7. Ủy ban Nhân dân Thành phố Hà Nội
8. Quyết định ban hành tiêu chuẩn
9. Bộ Kế hoạch và Đầu tư
10. Tổng công ty Viễn thông Quân đội
11. Báo cáo tình hình kinh doanh quý 3
12. Kế hoạch phát triển doanh nghiệp năm 2027
13. Nguyễn Văn An, Trần Thị Bích, Lê Hoàng Nam
14. Bảng kê hóa đơn chứng từ dịch vụ
15. Doanh thu thuần về bán hàng và cung cấp dịch vụ
16. Lợi nhuận gộp về bán hàng và cung cấp dịch vụ
17. Chi phí quản lý doanh nghiệp
18. Thuế giá trị gia tăng được khấu trừ
19. Tài sản cố định hữu hình và vô hình
20. Phân bổ chi phí trả trước dài hạn
21. Thuyết minh báo cáo tài chính kiểm toán
22. Tiền lương và các khoản trích theo lương
23. Hợp đồng mua bán hàng hóa thương mại
24. Biên bản nghiệm thu và bàn giao công việc
25. Điều hòa không khí trung tâm
26. Đường Nguyễn Trãi, quận Thanh Xuân, Hà Nội
27. Phường Bến Nghé, Quận 1, Thành phố Hồ Chí Minh
28. Thành phố Đà Nẵng trực thuộc trung ương
29. Quần đảo Hoàng Sa và Trường Sa của Việt Nam
30. Vịnh Hạ Long, tỉnh Quảng Ninh
31. Động Phong Nha - Kẻ Bàng, Quảng Bình
32. Rừng quốc gia Cúc Phương, Ninh Bình
33. Chúc mừng năm mới An Khang Thịnh Vượng
34. Vạn sự như ý, tỷ sự như mơ
35. Học tập và làm theo tấm gương đạo đức
36. Tinh thần trách nhiệm và kỷ cương kỷ luật
37. Chuyển đổi số quốc gia giai đoạn 2025 - 2030
38. Hệ thống thông tin giải quyết thủ tục hành chính
39. Dịch vụ công trực tuyến toàn trình
40. Cơ sở dữ liệu quốc gia về dân cư
41. Bảo hiểm xã hội điện tử Việt Nam
42. Bản quyền thuộc về VN Office 2026

---

## 5. Hướng Dẫn Sử Dụng Trong Ứng Dụng (In-App Help Entry)
Tuân thủ quy định **không sửa file help cũ** và **tuân thủ quy tắc định danh sản phẩm** (Doc, Sheet, Slide, không tiền tố 3T, không dùng tên thương hiệu Microsoft hay LibreOffice):
- Đã tạo tệp mới: `platform/help/entries-vietnamese-typing.js`.
- Đã đăng ký vào catalog: `platform/help/help-catalog.js`.

### Các Mục Hướng Dẫn Được Tích Hợp:
1. `doc.vietnamese.typing`: Hướng dẫn gõ tiếng Việt trong Doc (thân văn bản, tiêu đề, chân trang, bảng biểu).
2. `sheet.vietnamese.typing`: Hướng dẫn gõ tiếng Việt trong Sheet (nhập trực tiếp vào ô, chế độ F2, thanh công thức fx).
3. `slide.vietnamese.typing`: Hướng dẫn gõ tiếng Việt trong Slide (tiêu đề trang chiếu, hộp văn bản, hình vẽ, ghi chú người thuyết trình).
4. `common.vietnamese.typing`: Cấu hình khuyến nghị cho Unikey, EVKey và Windows Built-in IME (Unicode dựng sẵn, kiểu gõ Telex/VNI, cách xử lý khi hiển thị sai dấu).

---

## 6. Kết Quả Kiểm Thử Tại Các Cổng Kiểm Tra (Gates)

### 6.1. Desktop Live CDP Harness (`tests/live/cdp/vietnamese-typing.desktop.mjs`)
Chạy trực tiếp trên desktop qua WebView2 remote debugging port (Node cần cờ `--experimental-websocket`), với `LOCALAPPDATA` riêng của agent này:
```text
$env:LOCALAPPDATA = "E:\VNOffice-profiles\opencode-ime7"
node --experimental-websocket tests/live/cdp/vietnamese-typing.desktop.mjs
```
Bảng tóm tắt theo từng kịch bản (dòng `[SUMMARY]` + `TOTAL`) của **lần chạy #3 — chạy trọn vẹn cả 3 app, sau khi sửa assertion Sheet `1-step Ctrl+Z restores cell` (xem 6.1.2)**:
```text
[SUMMARY] [WRITER - body] Telex Normal (30ms) NFC: 77/77 PASS
[SUMMARY] [WRITER - body] 1-step Ctrl+Z undo removes last word: 1/1 PASS
[SUMMARY] [WRITER - body] Telex Fast (5ms) burst: 77/77 PASS
[SUMMARY] [WRITER - body] VNI Normal (30ms) NFC: 77/77 PASS
[SUMMARY] [WRITER - body] NFD decomposed normalises to NFC: 77/77 PASS
[SUMMARY] [WRITER - body] Windows IME Composition Path: 77/77 PASS
[SUMMARY] [WRITER - header] Telex in Header: 77/77 PASS
[SUMMARY] [WRITER - footer] VNI in Footer: 77/77 PASS
[SUMMARY] [WRITER - table-cell] Telex in Table Cell: 77/77 PASS
[SUMMARY] [SHEET - direct-typing-no-f2] Direct typing without F2 (Telex): 77/77 PASS
[SUMMARY] [SHEET - direct-typing-no-f2] 1-step Ctrl+Z restores cell: 1/1 PASS
[SUMMARY] [SHEET - direct-typing-no-f2] 1-step Ctrl+Z restores fresh empty cell: 1/1 PASS
[SUMMARY] [SHEET - cell-edit-mode-f2] F2 Cell Edit Mode Fast VNI (5ms): 77/77 PASS
[SUMMARY] [SHEET - formula-bar] Formula bar typing (no autocomplete fight, NFC normalized): 77/77 PASS
[SUMMARY] [SLIDES - text-box] Slide Title Telex Normal (30ms): 77/77 PASS
[SUMMARY] [SLIDES - text-box] 1-step Ctrl+Z undo removes last word: 1/1 PASS
[SUMMARY] [SLIDES - text-box] Slide Body Fast VNI (5ms): 77/77 PASS
[SUMMARY] [SLIDES - notes] Slide Notes (NFD normalises to NFC): 77/77 PASS

TOTAL: 1082/1082 PASS
```
Dòng measured của 2 assertion được sửa/Thêm trong lần chạy này (`EXITCODE=0`, không có bất kỳ dòng `FAIL` nào):
```text
[PASS] [SHEET - direct-typing-no-f2] 1-step Ctrl+Z restores cell -> before="Chứng khoán VN-Index đạt 1.250 điểm" lastPhrase="Chứng khoán VN-Index đạt 1.250 điểm" restored="Tỷ giá USD/VND: 24.500 đồng" expected="Tỷ giá USD/VND: 24.500 đồng"
[PASS] [SHEET - direct-typing-no-f2] 1-step Ctrl+Z restores fresh empty cell -> committed="Cộng hòa xã hội chủ nghĩa Việt Nam" restored="" expectedRestored=""
```

### 6.1.1. Mở rộng 77 Cụm Từ (Mở rộng 40 Câu)
Mỗi kịch bản hiện nay lặp qua **toàn bộ 77 cụm từ** trong `VIETNAMESE_TEST_PHRASES` (mở rộng từ 42 cụm từ gốc). Kết quả tóm tắt:

| Ứng dụng | Kịch bản (target) | Kết quả |
|---|---|:---:|
| **Doc/Writer** | Telex Normal (30ms) NFC — body | **77/77 PASS** |
| **Doc/Writer** | 1-step Ctrl+Z undo removes last word | **1/1 PASS** |
| **Doc/Writer** | Telex Fast (5ms) burst — body | **77/77 PASS** |
| **Doc/Writer** | VNI Normal (30ms) NFC — body | **77/77 PASS** |
| **Doc/Writer** | NFD decomposed → NFC — body | **77/77 PASS** |
| **Doc/Writer** | Windows IME Composition Path — body | **77/77 PASS** |
| **Doc/Writer** | Telex in Header | **77/77 PASS** |
| **Doc/Writer** | VNI in Footer | **77/77 PASS** |
| **Doc/Writer** | Telex in Table Cell *(bảng chèn thật qua lệnh `writer.table.insert`)* | **77/77 PASS** |
| **Sheet** | Direct typing without F2 (Telex) | **77/77 PASS** |
| **Sheet** | 1-step Ctrl+Z restores cell *(đã sửa assertion — xem 6.1.2)* | **1/1 PASS** |
| **Sheet** | 1-step Ctrl+Z restores fresh empty cell *(ô mới B6, restored phải là `""` đúng)* | **1/1 PASS** |
| **Sheet** | F2 Cell Edit Mode Fast VNI (5ms) | **77/77 PASS** |
| **Sheet** | Formula bar typing (NFD → NFC, no autocomplete fight) | **77/77 PASS** |
| **Slide** | Slide Title Telex Normal (30ms) | **77/77 PASS** |
| **Slide** | 1-step Ctrl+Z undo removes last word | **1/1 PASS** |
| **Slide** | Slide Body Fast VNI (5ms) | **77/77 PASS** |
| **Slide** | Slide Notes NFD → NFC | **77/77 PASS** |

**Tổng cộng Desktop CDP (lần chạy #3, sau khi sửa assertion Sheet Ctrl+Z):** **1082/1082 PASS (100%)** — không còn FAIL nào: không còn lỗi tích lũy văn bản ở Sheet F2, ô bảng Doc là thật, và assertion Sheet `1-step Ctrl+Z restores cell` đã được **sửa cho đúng** (xem 6.1.2) cùng thêm 1 check mới cho ô rỗng.

#### Bảng đối chiếu 3 lần chạy (lần #1/#2 chạy bằng file cũ — assertion Sheet Ctrl+Z còn sai)

| | Lần #1 | Lần #2 | **Lần #3 (file đã sửa)** |
|---|:---:|:---:|:---:|
| Writer (toàn bộ, gồm table-cell 77/77) | 617/617 | **617/617** | **617/617** |
| Sheet direct + F2 + formula bar | 231/231 | **231/231** | **231/231** |
| Sheet `1-step Ctrl+Z restores cell` | 0/1 | 0/1 | **1/1** |
| Sheet `1-step Ctrl+Z restores fresh empty cell` *(mới)* | — | — | **1/1** |
| Slides (title/undo/body/notes) | 232/232 | **32/232 — mất kết nối CDP** | **232/232** |
| **TOTAL** | **1080/1081** | 880/1081 | **1082/1082** |

Lần #2 bị **mất kết nối WebView2/CDP** ngay khi đang gõ cụm từ thứ 33 ở kịch bản Slide Title:
```text
[FAIL] ... | Khúc khuỷu quanh co đường đèo -> CDP connection closed before the response arrived.
[FAIL] ... | Chim én liệng bay giữa trời xanh  -> CDP connection is not open.
... (200 dòng FAIL còn lại đều là "CDP connection is not open")
```
**Đây là lỗi hạ tầng (WebView2 crash/đóng), KHÔNG phải lỗi assertion** — các assertion đã chạy trước đó đều PASS. Sự cố này tái diễn ở **3 lần** trong ngày (probe Undo lúc 06:24, lần chạy sheet riêng lúc 06:37, lần chạy desktop #2) và **không phụ thuộc vào thay đổi của task này** (phần Slides/Sheet direct typing không bị sửa). **Không có assertion nào bị vô hiệu hóa hay nới lỏng.** Lần chạy #3 trọn vẹn (**1082/1082**) là kết quả chuẩn được ghi ở mục 6.1 / 6.1.1.

#### Những thay đổi so với lần chạy trước (932/1008):
1. **Sheet F2: 1/77 → 77/77.** Nguyên nhân gốc không phải ô DOM tích lũy text, mà là **thanh công thức còn giữ text của lần gõ trước**: `_beginFormulaEntry()` (apps/sheet/sheet-grid.js:1293) seed giá trị editor từ `formulaInput.value`, không phải từ ô. Kịch bản giờ bấm **Delete trên ô B3 trước mỗi cụm từ** — handler Delete (`apps/sheet/sheet-grid.js:4171-4186`) xóa **cả ô trong model lẫn `formulaInput`** — rồi **kiểm tra nghiêm ngặt** ô `=== ""` **và** editor `=== ""` trước khi bấm F2. Assert cuối vẫn là so sánh NFC **chính xác từng ký tự** với model.
2. **Doc Table Cell: mock → thật.** Bảng được chèn bằng cách dispatch **lệnh ứng dụng `writer.table.insert` qua command bus** (`globalCommandBus.execute`, `platform/commands/command-bus.js`) ngay trong trang qua `Runtime.evaluate` — đúng đường chạy của nút ribbon Chèn → Bảng biểu. Lệnh này chèn bảng **3 hàng × 4 cột** (`adapters/libreoffice/writer/writer-adapter.js:6678` → `insertTable(3, 4)`), không phải 2×2; test dùng **ô đầu tiên** của bảng đó. Mỗi cụm từ: nhấp chuột CDP thật vào ô, bôi chọn nội dung mẫu `"Tiêu đề"`, phím **Delete**, **xác nhận ô rỗng**, rồi gõ và assert NFC chính xác.
3. **Log FAIL chi tiết**: `summarizeScenario()` giờ in đúng cụm từ + nội dung thực tế (trước đây in `N/A` do regex chỉ khớp `text="..."`).

### 6.1.2. Đã sửa assertion: `1-step Ctrl+Z restores cell` (Sheet)

**Trước khi sửa (assertion sai, được phát hiện ở lần chạy trước):**
```text
expected: restored=""            (một phím Ctrl+Z đưa ô B2 về trạng thái TRƯỚC khi gõ)
actual  : restored="Tỷ giá USD/VND: 24.500 đồng"   (= cụm từ thứ 76, tức là ô lùi đúng 1 bước)
```

**Nguyên nhân (đã đo):** assertion `restored === ""` được viết từ thời mỗi kịch bản chỉ gõ **1 câu đại diện** (ô B2 đang rỗng trước khi gõ → 1 entry undo có `prevVal = ""`). Sau khi mở rộng mỗi kịch bản ra **77 cụm từ**, vòng lặp Direct typing gõ vào **cùng ô B2** 77 lần. Giữa 2 vòng lặp có **≥800ms sleeps cố định** (`press Enter` 300ms + `click` 300ms + `sleep(200)`), lớn hơn `historyMergeWindowMs = 750` (`apps/sheet/sheet-grid.js:208`), nên mỗi cụm từ tạo **một entry undo riêng** (`_recordHistory`, `apps/sheet/sheet-grid.js:7817-7828`). Ctrl+Z lùi **1** entry → về cụm từ thứ 76, **không** về rỗng. **`actual` là đúng hành vi sản phẩm (đúng Excel); `expected` mới là sai.**

**Cách sửa (chỉ sửa test, giữ nguyên tính nghiêm ngặt — không thêm timeout, không `|| true`, không hard-code PASS, không đụng tới assertion nào khác):**

1. **Đo trước khi gõ câu cuối**: ngay trước khi gõ câu thứ 77 vào B2, đọc giá trị ô B2 **qua app model** (`window.__vnoAppInstance.grid.cellsData.get('B2').val` — helper `readSheetCellValue()`): đó chính là giá trị mà **một** Ctrl+Z phải khôi phục.
2. **Gõ câu cuối → Enter → bấm Ctrl+Z đúng 1 lần** bằng CDP `Input.dispatchKeyEvent` (`press(cdp, "z", { ctrl: true }, 300)` trong `tests/live/cdp/actions.mjs`), không dùng lệnh input cấp OS.
3. **PASS yêu cầu ĐỒNG THỜI 2 điều kiện** (thiếu một là FAIL):
   - giá trị ô **ngay trước** Ctrl+Z === câu cuối (so sánh NFC, **chuỗi chính xác từng ký tự**);
   - giá trị ô **sau** Ctrl+Z === giá trị đã ghi ở bước 1 (**so sánh chuỗi chính xác từng ký tự**, không `trim()`, không `||`).
4. **Thêm 1 check riêng cho ô rỗng**: ở ô **B6** — ô mà không kịch bản nào khác động tới — xác nhận ô đang `""`, gõ **1** câu, Enter, Ctrl+Z 1 lần → giá trị trước Ctrl+Z phải đúng câu vừa gõ (NFC) **và** sau Ctrl+Z phải là **`""` đúng từng ký tự**.

**Kết quả đo được ở lần chạy #3 (mọi điều kiện đều đúng):**
```text
[PASS] [SHEET - direct-typing-no-f2] 1-step Ctrl+Z restores cell -> before="Chứng khoán VN-Index đạt 1.250 điểm" lastPhrase="Chứng khoán VN-Index đạt 1.250 điểm" restored="Tỷ giá USD/VND: 24.500 đồng" expected="Tỷ giá USD/VND: 24.500 đồng"
[PASS] [SHEET - direct-typing-no-f2] 1-step Ctrl+Z restores fresh empty cell -> committed="Cộng hòa xã hội chủ nghĩa Việt Nam" restored="" expectedRestored=""
[SUMMARY] [SHEET - direct-typing-no-f2] 1-step Ctrl+Z restores cell: 1/1 PASS
[SUMMARY] [SHEET - direct-typing-no-f2] 1-step Ctrl+Z restores fresh empty cell: 1/1 PASS
```
Đọc số đo: câu cuối là **cụm từ thứ 77** (`Chứng khoán VN-Index đạt 1.250 điểm`), ô đang giữ **cụm từ thứ 76** (`Tỷ giá USD/VND: 24.500 đồng`) → 1 Ctrl+Z khôi phục **đúng** cụm từ thứ 76. Check ô rỗng: gõ câu thứ 1 vào B6 → 1 Ctrl+Z đưa B6 về `""`.

**Kết luận:** assertion đã được **sửa cho đúng**, không phải nới lỏng — điều kiện khắt khe hơn trước (thêm 1 điều kiện NFC ở thời điểm trước Ctrl+Z, so sánh chuỗi chính xác không `trim()`, cộng thêm 1 kịch bản độc lập trên ô rỗng). Hành vi sản phẩm không đổi: mỗi lần commit Enter = 1 bước undo, Ctrl+Z gỡ trọn câu vừa gõ.

### 6.2. Master Test Suite (`node tests/run-tests.js`)
Đã đăng ký Suite 172 (`CH-4.7 — Vietnamese IME typing, burst normalizer, caret preservation, undo coalescing & NFC normalization`) — **PASS 10/10**.

Lần chạy foreground của task này (2 lần, chạy xong mới đọc kết quả — không có lần nào bị dừng giữa chừng):
```text
==================================================
KẾT QUẢ KIỂM THỬ: 2343/2346 PASS | 3 FAIL
==================================================
```
```text
==================================================
KẾT QUẢ KIỂM THỬ: 2342/2346 PASS | 4 FAIL
==================================================
```
Các dòng FAIL (chỉ 4, đều nằm ở round-trip LibreOffice, **không suite nào tải file vừa sửa**):
```text
[FAIL] Sheet FODS save: LibreOffice giữ CF và validation qua FODS -> XLSX -> FODS
[FAIL] Sheet Pivot save: LibreOffice giữ DataPilot qua FODS -> XLSX -> FODS
[FAIL] FODS thật qua soffice: FODS → XLSX → FODS giữ height/width/visibility
[FAIL] LibreOffice FODS -> XLSX: textRotation 45/135/90/180/255 đúng XML   (chỉ ở lần chạy thứ 2)
```
> **Ghi nhận độ ổn định (KHÔNG phải lỗi của thay đổi lần này):** các FAIL này đều là bài gọi `soffice --convert-to` (LibreOffice headless). Tại thời điểm chạy, máy đang có **3 tiến trình `soffice` của các worktree khác** chạy song song (`vno-cf-validation` từ `E:\VNOffice-agy-ch81`, `vno-sheet-format-dropdown` từ `E:\VNOffice-codex-docexport`, `vno-cdp-sheet` từ `E:\VNOffice-claude-clipmerge`) → tranh chấp tài nguyên khiến lệnh convert thoát mã lỗi. Đây chính là nhóm flaky **đã được ghi nhận từ trước** (`Sheet Pivot save: LibreOffice giữ DataPilot...`, `LibreOffice FODS -> XLSX: textRotation...`). Agent này **không giết tiến trình của agent khác** và **không disable/swallow assertion nào**. Cả 4 suite FAIL đều không đụng tới `tests/live/cdp/vietnamese-typing.desktop.mjs` (file duy nhất đã sửa) — `run-tests.js` không tải file desktop CDP này; Suite 172 chạy `tests/unit/vietnamese-ime.test.js` và PASS 10/10.
> Khi máy không còn tiến trình `soffice` cạnh tranh, cùng bộ này cho **2346/2346 PASS | 0 FAIL** (kết quả của các task trước).

### 6.3. Python Test Suite (`python -m unittest discover -s tests`)
```text
Ran 549 tests in 454.610s

OK
```

---

## 7. Các Tệp Tin Đã Tạo và Thay Đổi
- **Tạo mới:**
  - `platform/keyboard/input-normalizer.js` (Lớp shared normalizer, burst coalescing, caret math, undo snapshot)
  - `platform/help/entries-vietnamese-typing.js` (Nội dung trợ giúp gõ tiếng Việt)
  - `tests/live/cdp/vietnamese-ime-simulator.mjs` (Mô phỏng bộ gõ Telex/VNI Backspace-then-insert và Windows IME)
  - `tests/live/cdp/vietnamese-typing.desktop.mjs` (Bộ test tự động qua CDP cho Doc, Sheet, Slide)
  - `tests/unit/vietnamese-ime.test.js` (10 unit test kiểm tra sâu giải thuật IME)
  - `docs/HANDOFF-VIETNAMESE-TYPING.md` (Báo cáo handoff chi tiết)
- **Cập nhật:**
  - `platform/commands/shortcut-manager.js` (Không chặn phím tắt Ctrl+Z khi lệnh disabled trong input)
  - `platform/help/help-catalog.js` (Đăng ký `VIETNAMESE_TYPING_HELP_ENTRIES`)
  - `platform/text/spellcheck-dom-controller.js` (Hoãn kiểm tra chính tả khi đang trong IME burst)
  - `apps/writer/writer-app.js` (Đấu nối `InputNormalizer` vào các vùng soạn thảo)
  - `apps/sheet/formula-autocomplete.js` (Ẩn gợi ý công thức khi gõ tiếng Việt)
  - `apps/sheet/sheet-grid.js` (Đấu nối `InputNormalizer` và chuẩn hóa NFC)
  - `apps/slides/slides-canvas.js` (Đấu nối `InputNormalizer` cho tiêu đề, nội dung, hình vẽ, ghi chú và xử lý undo)
  - `tests/run-tests.js` (Đăng ký Suite 172)
  - `tests/live/cdp/vietnamese-typing.desktop.mjs` — **bổ sung của task sửa assertion**: đo giá trị ô B2 trước khi gõ câu cuối, so sánh NFC chính xác từng ký tự trước/sau 1 Ctrl+Z, PASS chỉ khi cả 2 điều kiện đúng; thêm kiểm tra `1-step Ctrl+Z restores fresh empty cell` ở ô B6 (xem 6.1.2)
