# Báo cáo Tái hiện trên Windows các Lỗi D1–D13 từ Soạn thảo Thực tế macOS (AGY-REPRO-D)

> **Mã phiếu công việc**: `AGY-REPRO-D`  
> **Tài liệu căn cứ**: [`BRIEF-AGY-REPRO-D.md`](file:///E:/VNOffice-briefs/BRIEF-AGY-REPRO-D.md), [`docs/EXPLORE-MAC-2510.md`](file:///E:/VNOffice-agy-repro/docs/EXPLORE-MAC-2510.md), mục #22 trong [`docs/sync/INBOX-WIN.md`](file:///E:/VNOffice-agy-repro/docs/sync/INBOX-WIN.md).  
> **Môi trường thử nghiệm**: Windows 11 64-bit, monorepo [`VNOffice-agy-repro`](file:///E:/VNOffice-agy-repro), nhánh `agy/repro-d`.  
> **Phương pháp kiểm định**: Desktop app thực tế điều khiển độc quyền qua giao thức CDP sạch (`tests/live/cdp/session.mjs` / `launchApp`), `LOCALAPPDATA` cô lập, **KHÔNG SendKeys**, đối chiếu độc lập với Microsoft Word/Excel/PowerPoint 16.0 qua giao diện tự động hóa COM chạy ngầm (`Visible = False`, tự dọn dẹp PID). **Tuyệt đối KHÔNG can thiệp/chỉnh sửa mã nguồn sản phẩm**.

---

## I. BẢNG TỔNG HỢP KẾT QUẢ TÁI HIỆN (D1 – D13)

| Mã | Ứng dụng | Hiện tượng mô tả | Kết quả Windows | Mức độ | Kết luận | Minh chứng đã đối chiếu | Tệp:dòng nghi ngờ nguyên nhân |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **D1** | Slides | Mở lại `.pptx` do 3T lưu: Tiêu đề & nội dung bị vẽ **HAI LẦN LỆCH NHAU** trên cùng một slide | **TÁI HIỆN** | **Critical** | **Chung Monorepo** | [p3-slides-reopen-slide1-win.png](file:///E:/VNOffice-agy-repro/docs/evidence/repro-d-2510/p3-slides-reopen-slide1-win.png)<br>vs [p3-slides-reopen-slide1-duplicate.png](file:///E:/VNOffice-agy-repro/docs/macos/evidence/explore-mac-2510/p3-slides-reopen-slide1-duplicate.png) | [`adapters/libreoffice/slides/slides-adapter.js:4480-4505`](file:///E:/VNOffice-agy-repro/adapters/libreoffice/slides/slides-adapter.js#L4480-L4505) (`_extractShapeFrames`) |
| **D2** | Writer | Bảng mới chèn: Sau khi lưu và mở lại bị **MẤT TOÀN BỘ VIỀN** và **CO HẸP CÒN MỘT NỬA BỀ RỘNG** | **TÁI HIỆN** | **High** | **Chung Monorepo** | [w3-writer-reopen-top-win.png](file:///E:/VNOffice-agy-repro/docs/evidence/repro-d-2510/w3-writer-reopen-top-win.png)<br>vs [w3-writer-reopen-top.png](file:///E:/VNOffice-agy-repro/docs/macos/evidence/explore-mac-2510/w3-writer-reopen-top.png) | [`adapters/libreoffice/writer/writer-adapter.js:6665-6675`](file:///E:/VNOffice-agy-repro/adapters/libreoffice/writer/writer-adapter.js#L6665-L6675) & [`7148-7180`](file:///E:/VNOffice-agy-repro/adapters/libreoffice/writer/writer-adapter.js#L7148-L7180) |
| **D3** | Writer | Thiết lập mặc định NĐ 30 (Times New Roman, 14pt, giãn dòng 1.5) **KHÔNG GHI VÀO `.docx`**, mở lại bị rớt về 12pt / 1.15 | **TÁI HIỆN** | **High** | **Chung Monorepo** | [w3-writer-reopen-top-win.png](file:///E:/VNOffice-agy-repro/docs/evidence/repro-d-2510/w3-writer-reopen-top-win.png) | [`adapters/libreoffice/writer/writer-adapter.js:18117-18158`](file:///E:/VNOffice-agy-repro/adapters/libreoffice/writer/writer-adapter.js#L18117-L18158) (`_applyNewDocumentParagraphDefaults`) |
| **D4** | Writer | Số trang chân trang (`PAGE`/`NUMPAGES`): Sau khi lưu và mở lại bị biến thành **CHỮ CỐ ĐỊNH** (`Trang 1 / 2`) | **TÁI HIỆN** | **High** | **Chung Monorepo** | [w4-writer-reopen-bottom-win.png](file:///E:/VNOffice-agy-repro/docs/evidence/repro-d-2510/w4-writer-reopen-bottom-win.png)<br>vs [w4-writer-reopen-bottom.png](file:///E:/VNOffice-agy-repro/docs/macos/evidence/explore-mac-2510/w4-writer-reopen-bottom.png) | [`adapters/libreoffice/writer/writer-adapter.js:12627-12650`](file:///E:/VNOffice-agy-repro/adapters/libreoffice/writer/writer-adapter.js#L12627-L12650) (`_parseFooterXml`) |
| **D5** | Writer | Ngắt trang (Page Break) không phân trang thực tế, toàn bộ tài liệu nằm dồn trong **1 CONTAINER DUY NHẤT** | **TÁI HIỆN** | **High** | **Chung Monorepo** | [w2-writer-before-save-page2-win.png](file:///E:/VNOffice-agy-repro/docs/evidence/repro-d-2510/w2-writer-before-save-page2-win.png)<br>vs [w2-writer-before-save-page2.png](file:///E:/VNOffice-agy-repro/docs/macos/evidence/explore-mac-2510/w2-writer-before-save-page2.png) | [`apps/writer/writer.css`](file:///E:/VNOffice-agy-repro/apps/writer/writer.css) & [`writer-adapter.js:11431`](file:///E:/VNOffice-agy-repro/adapters/libreoffice/writer/writer-adapter.js#L11431) |
| **D6** | Toàn bộ | Lỗi rendering phông tiếng Việt trên macOS Cocoa / CoreText | **BỎ QUA** | **Info** | **Riêng Mac** | *(Bỏ qua theo chỉ đạo của brief vì thuộc đặc thù font-rendering trên macOS)* | `ports/macos/` |
| **D7** | Slides | Dấu đầu dòng danh sách (`ul`/`li`) bị **CẮT / ẨN KHỎI KHUNG NHÌN** khi soạn thảo | **TÁI HIỆN** | **Medium** | **Chung Monorepo** | [p1-slides-bullets-win.png](file:///E:/VNOffice-agy-repro/docs/evidence/repro-d-2510/p1-slides-bullets-win.png)<br>vs [p1-slides-bullets-invisible.png](file:///E:/VNOffice-agy-repro/docs/macos/evidence/explore-mac-2510/p1-slides-bullets-invisible.png) | [`apps/slides/slides.css:455-466`](file:///E:/VNOffice-agy-repro/apps/slides/slides.css#L455-L466) (`.vno-slide-body`) |
| **D8** | Slides | Chèn hình mới (Mũi tên phải): Không hiện text khi chèn; mở lại bị biến thành **HÌNH CHỮ NHẬT XANH** | **TÁI HIỆN** | **Medium** | **Chung Monorepo** | [p2-slides-shape-text-win.png](file:///E:/VNOffice-agy-repro/docs/evidence/repro-d-2510/p2-slides-shape-text-win.png)<br>vs [p2-slides-shape-text-missing.png](file:///E:/VNOffice-agy-repro/docs/macos/evidence/explore-mac-2510/p2-slides-shape-text-missing.png) | [`apps/slides/slides-canvas.js:5766-5784`](file:///E:/VNOffice-agy-repro/apps/slides/slides-canvas.js#L5766-L5784) |
| **D10** | Sheet | Biểu đồ khi mở lại bị **CHỒNG LÊN DỮ LIỆU** và **MẤT TÊN CHUỖI** (thành `Series 1`) | **TÁI HIỆN** | **Medium** | **Chung Monorepo** | [s2-sheet-reopen-win.png](file:///E:/VNOffice-agy-repro/docs/evidence/repro-d-2510/s2-sheet-reopen-win.png)<br>vs [s2-sheet-reopen.png](file:///E:/VNOffice-agy-repro/docs/macos/evidence/explore-mac-2510/s2-sheet-reopen.png) | [`adapters/libreoffice/sheet/sheet-adapter.js:2902-2903`](file:///E:/VNOffice-agy-repro/adapters/libreoffice/sheet/sheet-adapter.js#L2902-L2903) & [`5085-5130`](file:///E:/VNOffice-agy-repro/adapters/libreoffice/sheet/sheet-adapter.js#L5085-L5130) |
| **D12** | Writer | Số lượng từ bị lệch trước vs sau khi lưu (**158 từ -> 144 từ**) do đếm lẫn chú thích chân trang | **TÁI HIỆN** | **Low** | **Chung Monorepo** | [w4-writer-reopen-bottom-win.png](file:///E:/VNOffice-agy-repro/docs/evidence/repro-d-2510/w4-writer-reopen-bottom-win.png) | [`adapters/libreoffice/writer/writer-adapter.js:3186-3203`](file:///E:/VNOffice-agy-repro/adapters/libreoffice/writer/writer-adapter.js#L3186-L3203) (`_wordCountSourceText`) |
| **D13** | Writer | Không thống nhất thuật ngữ: Ribbon dùng **"Nhận xét"**, Sidebar/Adapter dùng **"Ghi chú"** | **TÁI HIỆN** | **Low** | **Chung Monorepo** | [w5-writer-comments-term-win.png](file:///E:/VNOffice-agy-repro/docs/evidence/repro-d-2510/w5-writer-comments-term-win.png) | [`platform/i18n/strings-vi.js:1632`](file:///E:/VNOffice-agy-repro/platform/i18n/strings-vi.js#L1632) vs [`writer-adapter.js:9685-9859`](file:///E:/VNOffice-agy-repro/adapters/libreoffice/writer/writer-adapter.js#L9685-L9859) |

---

## II. CHI TIẾT TỪNG LỖI TÁI HIỆN TRÊN WINDOWS

---

### D1. Slides — Mở lại `.pptx` do 3T lưu: Tiêu đề và Thân vẽ HAI LẦN LỆCH NHAU

- **Trạng thái**: **TÁI HIỆN 100%**.
- **Mức độ nghiêm trọng**: **Critical** (Giao diện hỏng hoàn toàn khi mở lại bất kỳ tệp trình chiếu nào đã soạn).
- **Kết luận**: **Lỗi chung Monorepo** (Cả macOS và Windows đều bị, nằm ở tầng Adapter nạp FODP/ODP).

#### 1. Các bước thực nghiệm trên Windows
1. Khởi động 3T Slides qua CDP (`session.mjs`).
2. Slide 1 (Bìa): Nhập Title `"Kế hoạch Quý 4 - 2026"`, Body `"Phòng Kế hoạch và Đầu tư"`.
3. Thêm Slide 2: Nhập Title `"Mục tiêu trọng tâm"`, Body 3 dòng: `"Hoàn thiện hệ thống core"`, `"Nâng cao độ trung thực hiển thị"`, `"Đạt chuẩn văn phòng điện tử"`.
4. Lưu tệp ra định dạng `.pptx` (`author-slides-d1.pptx`) thông qua Adapter.
5. Đóng phiên và mở lại tệp `.pptx` vừa lưu trong phiên Slides hoàn toàn mới.

#### 2. Số liệu đo lường thực tế
- **Trước khi lưu**:
  - Slide 1 chỉ có 2 thành phần layout mặc định: `.vno-slide-title` (chứa tiêu đề) và `.vno-slide-body` (chứa phụ đề). Mảng `slide.shapes` rỗng (`[]`).
- **Sau khi mở lại**:
  - Trên Canvas xuất hiện đồng thời:
    1. Các phần tử layout cố định: `.vno-slide-title` (text: `"Kế hoạch Quý 4 - 2026"`) và `.vno-slide-body` (text: `"Phòng Kế hoạch và Đầu tư"`).
    2. Hai shape `textbox` bổ sung được chèn thêm vào mảng `slide.shapes`:
       - Shape 1: `id: 1792932780996, type: "textbox", cls: "title", x: 91, y: 91, w: 1097, h: 137`.
       - Shape 2: `id: 1792932781675, type: "textbox", cls: "outline", x: 91, y: 251, w: 1097, h: 503`.
  - Kết quả trên DOM: Phần tử `.vno-slide-title` và phần tử `.vno-slide-shape-item.is-textbox` cùng vẽ đè lên nhau tại tọa độ xấp xỉ `(91px, 91px)`, tạo thành hiệu ứng bóng ma chữ đôi (duplicate text overlap).
- **Đối chiếu Microsoft PowerPoint COM ngầm** (`check_slides_com.ps1`):
  - Tệp `.pptx` thực tế chỉ có 2 shapes trên Slide 1 và 3 shapes trên Slide 2:
    - Slide 1: `PlaceHolder 1` (Type 14, AutoShapeType 1) và `PlaceHolder 2` (Type 14, AutoShapeType 1).
    - Slide 2: `PlaceHolder 1` (Title), `PlaceHolder 2` (Body), và `Mũi tên phải 1` (AutoShapeType 33 - `msoShapeRightArrow`).
  - PowerPoint hiển thị hoàn toàn bình thường, không hề có 4 hay 5 shapes.

#### 3. Minh chứng hình ảnh
- Ảnh Windows: [p3-slides-reopen-slide1-win.png](file:///E:/VNOffice-agy-repro/docs/evidence/repro-d-2510/p3-slides-reopen-slide1-win.png) và [p4-slides-reopen-slide2-win.png](file:///E:/VNOffice-agy-repro/docs/evidence/repro-d-2510/p4-slides-reopen-slide2-win.png).
- Ảnh macOS đối chiếu: [p3-slides-reopen-slide1-duplicate.png](file:///E:/VNOffice-agy-repro/docs/macos/evidence/explore-mac-2510/p3-slides-reopen-slide1-duplicate.png).
- *Quan sát ảnh*: Chữ "Kế hoạch Quý 4 - 2026" và "Mục tiêu trọng tâm" bị vẽ hai lần lệch nhau trên cả hai hệ điều hành giống hệt nhau 100%.

#### 4. Phân tích nguyên nhân gốc
- **Tệp:Dòng**: [`adapters/libreoffice/slides/slides-adapter.js:4480-4505`](file:///E:/VNOffice-agy-repro/adapters/libreoffice/slides/slides-adapter.js#L4480-L4505) trong hàm `_extractShapeFrames(pageXml)`.
- Khi LibreOffice chuyển đổi `.pptx` sang `.fodp`, các placeholder tiêu đề và nội dung được gắn thuộc tính `presentation:class="title"` và `presentation:class="outline"`.
- Trong `slides-adapter.js`, hàm nhập nạp nội dung của các khung này vào `slide.title` và `slide.body`. Tuy nhiên, logic phân tách shape thông thường và placeholder dựa vào cờ `presentation:user-transformed="true"` hoặc logic `isPlaceholder` bị hở, khiến hai khung này **vừa được gán vào layout title/body, vừa bị đẩy tiếp vào mảng `slide.shapes` dưới dạng `type: "textbox"`**.
- Khi render, [`apps/slides/slides-canvas.js`](file:///E:/VNOffice-agy-repro/apps/slides/slides-canvas.js) vẽ cả tiêu đề của layout lẫn các shape trong `shapes`, dẫn đến chữ bị render 2 lần chồng lệch.

---

### D2. Writer — Bảng mất viền và co hẹp còn một nửa bề rộng khi lưu `.docx`

- **Trạng thái**: **TÁI HIỆN 100%**.
- **Mức độ nghiêm trọng**: **High** (Làm biến dạng nghiêm trọng văn bản công vụ có bảng biểu).
- **Kết luận**: **Lỗi chung Monorepo**.

#### 1. Các bước thực nghiệm trên Windows
1. Khởi động 3T Writer qua CDP.
2. Chèn một bảng 4 dòng × 3 cột (`STT`, `Hạng mục`, `Ghi chú`).
3. Lưu tệp `.docx` (`author-writer-test.docx`).
4. Mở lại tệp `.docx` vừa lưu trong phiên Writer mới.

#### 2. Số liệu đo lường thực tế
- **Trước khi lưu**:
  - Chiều rộng bảng DOM: `623.61px` (chiếm 100% bề rộng trang văn bản).
  - Viền ô `td`: `1px solid rgb(148, 163, 184)`.
- **Sau khi mở lại**:
  - Chiều rộng bảng DOM: Co xuống còn **`349px`** (mất gần 45% chiều rộng).
  - Viền ô `td`: Biến thành **`0px none rgb(15, 23, 42)`** (mất sạch viền).
- **Đối chiếu Microsoft Word COM ngầm** (`check_writer_com.ps1`):
  - `Table1.PreferredWidth`: `9999999` (Word hằng số `wdPreferredWidthAuto` = không thiết lập chiều rộng ưa thích cho bảng).
  - `Cell11Width`: `27.35 pt` (~36.5 px).
  - `BorderTop: 0`, `BorderBottom: 0`, `BorderLeft: 0`, `BorderRight: 0`, `BorderInsideH: 0`, `BorderInsideV: 0` (Tất cả viền trong và ngoài đều bằng 0).

#### 3. Minh chứng hình ảnh
- Ảnh Windows: [w1-writer-before-save-page1-win.png](file:///E:/VNOffice-agy-repro/docs/evidence/repro-d-2510/w1-writer-before-save-page1-win.png) (trước lưu) và [w3-writer-reopen-top-win.png](file:///E:/VNOffice-agy-repro/docs/evidence/repro-d-2510/w3-writer-reopen-top-win.png) (sau mở lại).
- Ảnh macOS đối chiếu: [w3-writer-reopen-top.png](file:///E:/VNOffice-agy-repro/docs/macos/evidence/explore-mac-2510/w3-writer-reopen-top.png).

#### 4. Phân tích nguyên nhân gốc
- **Tệp:Dòng**:
  - Chiều rộng: [`adapters/libreoffice/writer/writer-adapter.js:6665-6675`](file:///E:/VNOffice-agy-repro/adapters/libreoffice/writer/writer-adapter.js#L6665-L6675) (`_restoreLibreOfficeTableWidthsForExport`). Bảng mới chèn không có thuộc tính `data-vno-lo-width`, hàm xuất xóa style `width` inline nhưng không gán thuộc tính `width="100%"`, khiến LibreOffice tính bề rộng theo độ dài ngắn của text bên trong từng cột, dẫn tới bảng bị co rúm.
  - Viền bảng: [`adapters/libreoffice/writer/writer-adapter.js:7148-7180`](file:///E:/VNOffice-agy-repro/adapters/libreoffice/writer/writer-adapter.js#L7148-L7180) (`_restoreTableBordersForExport`). Bộ xử lý dựa vào `data-vno-borders`. Khi bảng tạo mới từ giao diện không được đính thuộc tính này, trình xuất HTML bỏ qua việc tạo các thẻ `border` CSS inline chuẩn cho LibreOffice, khiến LibreOffice xuất sang `.docx` với định dạng bảng `no-border`.

---

### D3. Writer — Phông, cỡ chữ và giãn dòng mặc định NĐ 30 không ghi vào `.docx`

- **Trạng thái**: **TÁI HIỆN 100%**.
- **Mức độ nghiêm trọng**: **High** (Vi phạm chuẩn văn bản hành chính Nghị định 30/2020/NĐ-CP).
- **Kết luận**: **Lỗi chung Monorepo**.

#### 1. Các bước thực nghiệm trên Windows
1. Mở tài liệu mới trong 3T Writer.
2. Kiểm tra định dạng mặc định được áp dụng trên văn bản: Times New Roman, 14pt, giãn dòng 1.5 dòng.
3. Nhập đoạn văn bản và lưu ra `.docx`.
4. Mở lại tệp `.docx` trong phiên Writer mới và đọc thuộc tính bằng Word COM.

#### 2. Số liệu đo lường thực tế
- **Trước khi lưu (Giao diện 3T Writer)**:
  - `computedFontFamily`: `"Times New Roman", "Be Vietnam Pro", Georgia, serif`.
  - `computedFontSize`: `18.6667px` (tương đương chuẩn 14pt).
  - `computedLineHeight`: `30.0533px` (tương đương chuẩn giãn dòng 1.5 dòng).
- **Sau khi mở lại trong 3T Writer**:
  - `computedFontSize`: **`16px` (tương đương 12pt)**.
  - `computedLineHeight`: **`18.4px` (tương đương giãn dòng đơn 1.15)**.
- **Đối chiếu Microsoft Word COM ngầm** (`check_writer_com.ps1`):
  - `Paragraph1.FontName`: `"Times New Roman"`.
  - `Paragraph1.FontSize`: **`12.0 pt`** (thay vì 14pt).
  - `Paragraph1.LineSpacing`: **`12.0 pt`**, `LineSpacingRule: 0` (`wdLineSpaceSingle` - giãn dòng đơn thay vì 1.5 line).

#### 3. Minh chứng hình ảnh
- Ảnh Windows: [w3-writer-reopen-top-win.png](file:///E:/VNOffice-agy-repro/docs/evidence/repro-d-2510/w3-writer-reopen-top-win.png).

#### 4. Phân tích nguyên nhân gốc
- **Tệp:Dòng**: [`adapters/libreoffice/writer/writer-adapter.js:18117-18158`](file:///E:/VNOffice-agy-repro/adapters/libreoffice/writer/writer-adapter.js#L18117-L18158) trong hàm `_applyNewDocumentParagraphDefaults`.
- Hàm này chỉ áp dụng các thuộc tính CSS như `text-align`, `margin-top`, `margin-bottom` cho tài liệu mới, nhưng **hoàn toàn không ghi các thuộc tính `font-size: 14pt; line-height: 1.5;` vào payload HTML chuyển đổi sang LibreOffice**.
- Khi xuất sang `.docx`, LibreOffice Writer sử dụng style mặc định nội bộ của nó (`Normal` style = 12pt, line spacing single), khiến toàn bộ thiết lập mặc định của VN Office bị mất sạch.

---

### D4. Writer — Số trang chân trang (`PAGE`/`NUMPAGES`) biến thành chữ cố định

- **Trạng thái**: **TÁI HIỆN 100%**.
- **Mức độ nghiêm trọng**: **High** (Chân trang mất khả năng tự động cập nhật số trang khi in ấn hoặc chỉnh sửa).
- **Kết luận**: **Lỗi chung Monorepo**.

#### 1. Các bước thực nghiệm trên Windows
1. Chèn chân trang vào tài liệu với cấu trúc: `"Trang "` + Trường `PAGE` + `" / "` + Trường `NUMPAGES`.
2. Lưu ra `.docx`.
3. Kiểm tra mã nguồn tệp `.docx` bằng Word COM và mở lại trong 3T Writer.

#### 2. Số liệu đo lường thực tế
- **Trước khi lưu**:
  - Footer DOM: `<p style="text-align: center; font-size: 10pt; margin: 0;">Trang <span data-vno-field="PAGE">1</span> / <span data-vno-field="NUMPAGES">1</span></p>`.
  - Có đầy đủ 2 trường động `PAGE` và `NUMPAGES`.
- **Trong tệp `.docx` (Đối chiếu Microsoft Word COM ngầm)**:
  - `Footers[0].FieldsCount`: **`2`**.
  - `Field 1`: Type `33` (`wdFieldPage`), Code `"PAGE"`, Result `"2"`.
  - `Field 2`: Type `26` (`wdFieldNumPages`), Code `"NUMPAGES"`, Result `"2"`.
  - *Kết luận*: Tệp `.docx` trên đĩa có trường trang Word chuẩn 100%!
- **Sau khi mở lại trong 3T Writer**:
  - Footer DOM: `<p style="text-align: center;">Trang 1 / 2</p>`.
  - `fieldsCount`: **`0`** (Không còn bất kỳ thẻ `span[data-vno-field]` nào). Toàn bộ đã bị ép phẳng thành chuỗi tĩnh thô.

#### 3. Minh chứng hình ảnh
- Ảnh Windows: [w4-writer-reopen-bottom-win.png](file:///E:/VNOffice-agy-repro/docs/evidence/repro-d-2510/w4-writer-reopen-bottom-win.png).
- Ảnh macOS đối chiếu: [w4-writer-reopen-bottom.png](file:///E:/VNOffice-agy-repro/docs/macos/evidence/explore-mac-2510/w4-writer-reopen-bottom.png).

#### 4. Phân tích nguyên nhân gốc
- **Tệp:Dòng**: [`adapters/libreoffice/writer/writer-adapter.js:12627-12650`](file:///E:/VNOffice-agy-repro/adapters/libreoffice/writer/writer-adapter.js#L12627-L12650) (`_parseFooterXml`).
- Trình phân tích XML chân trang của adapter chỉ tìm kiếm trường đơn giản `<w:fldSimple w:instr="PAGE">`. Nhưng LibreOffice khi xuất file `.docx` lại sử dụng cơ chế trường phức hợp (`w:fldChar` + `w:instrText PAGE`). Trình nạp bỏ qua cấu trúc này và chỉ lấy text thô trong `<w:t>`, làm rớt mất `data-vno-field`.

---

### D5. Writer — Ngắt trang dồn văn bản vào 1 container liên tục duy nhất

- **Trạng thái**: **TÁI HIỆN 100%**.
- **Mức độ nghiêm trọng**: **High** (Trải nghiệm soạn thảo không trực quan kiểu trang A4 rời).
- **Kết luận**: **Lỗi chung Monorepo**.

#### 1. Các bước thực nghiệm trên Windows
1. Soạn văn bản vượt quá 1 trang A4 hoặc chèn Ngắt trang (Page Break).
2. Quan sát phân trang trên DOM và giao diện trực quan.

#### 2. Số liệu đo lường thực tế
- DOM chỉ có duy nhất `pageElementsCount = 1` (`.vno-writer-page`), chiều cao container kéo dài vô tận (`1169px` hoặc hơn).
- Ngắt trang chỉ được biểu diễn bằng một thẻ phân cách `<p data-vno-page-break="true">` với viền gạch đứt nét nằm bên trong cùng một trang duy nhất.
- Chân trang và chú thích chân trang (Footnotes) bị đẩy tút xuống đáy của trang 2 thay vì gắn cố định ở chân từng trang A4 riêng biệt.
- Trong Word COM: Tài liệu thực tế phân thành `PageCount: 2`.

#### 3. Minh chứng hình ảnh
- Ảnh Windows: [w2-writer-before-save-page2-win.png](file:///E:/VNOffice-agy-repro/docs/evidence/repro-d-2510/w2-writer-before-save-page2-win.png) và [w4-writer-reopen-bottom-win.png](file:///E:/VNOffice-agy-repro/docs/evidence/repro-d-2510/w4-writer-reopen-bottom-win.png).
- Ảnh macOS đối chiếu: [w2-writer-before-save-page2.png](file:///E:/VNOffice-agy-repro/docs/macos/evidence/explore-mac-2510/w2-writer-before-save-page2.png).

#### 4. Phân tích nguyên nhân gốc
- **Tệp:Dòng**: [`apps/writer/writer.css`](file:///E:/VNOffice-agy-repro/apps/writer/writer.css) và [`adapters/libreoffice/writer/writer-adapter.js:11431`](file:///E:/VNOffice-agy-repro/adapters/libreoffice/writer/writer-adapter.js#L11431).
- Kiến trúc hiện tại của 3T Writer dùng mô hình tài liệu liên tục dạng web (continuous web view) mô phỏng một thẻ `.vno-writer-page`, chưa chia trang vật lý độc lập (multi-page card layout) theo chuẩn in ấn WYSIWYG.

---

### D6. Phông hiển thị tiếng Việt đặc thù trên macOS Cocoa / WebKit

- **Trạng thái**: **BỎ QUA THEO CHỈ ĐẠO CỦA BRIEF**.
- **Kết luận**: **Riêng Mac**.
- **Ghi chú**: Trên Windows, phông hệ thống Segoe UI và Times New Roman được render thông qua DirectWrite / Blink hoàn toàn chuẩn xác, không gặp lỗi khoảng cách chữ hay mất dấu tiếng Việt như trên macOS Cocoa.

---

### D7. Slides — Dấu đầu dòng danh sách bị cắt / ẩn khi soạn thảo

- **Trạng thái**: **TÁI HIỆN 100%**.
- **Mức độ nghiêm trọng**: **Medium** (Gây cảm giác tính năng danh sách không hoạt động khi người dùng gõ).
- **Kết luận**: **Lỗi chung Monorepo**.

#### 1. Các bước thực nghiệm trên Windows
1. Chọn khung nội dung thân slide (Body).
2. Kích hoạt tính năng Dấu đầu dòng (Bullets) và gõ các dòng văn bản.

#### 2. Số liệu đo lường thực tế
- Thẻ `ul` bên trong `.vno-slide-body` có computed style: `paddingLeft: 0px`, `marginLeft: 0px`.
- Thuộc tính mặc định của trình duyệt cho `list-style-position` là `outside`. Điểm chấm tròn (bullet marker) bị vẽ lùi về phía bên trái 0px.
- Khung cha `.vno-slide-body` có CSS `overflow: auto; position: absolute;`. Toàn bộ marker dấu đầu dòng bị đẩy ra ngoài biên khung chữ nhật và bị cắt mất (`clipped`), người dùng nhìn vào tưởng chừng danh sách không có dấu đầu dòng.

#### 3. Minh chứng hình ảnh
- Ảnh Windows: [p1-slides-bullets-win.png](file:///E:/VNOffice-agy-repro/docs/evidence/repro-d-2510/p1-slides-bullets-win.png).
- Ảnh macOS đối chiếu: [p1-slides-bullets-invisible.png](file:///E:/VNOffice-agy-repro/docs/macos/evidence/explore-mac-2510/p1-slides-bullets-invisible.png).

#### 4. Phân tích nguyên nhân gốc
- **Tệp:Dòng**: [`apps/slides/slides.css:455-466`](file:///E:/VNOffice-agy-repro/apps/slides/slides.css#L455-L466) (quy tắc CSS cho `.vno-slide-body`).
- Thiếu khai báo `padding-left: 20px;` hoặc `list-style-position: inside;` cho các thẻ `ul` / `ol` nằm trong thân slide, kết hợp với thuộc tính `overflow: auto` gây clip dấu đầu dòng.

---

### D8. Slides — Chữ gõ vào hình mới chèn; mở lại mũi tên biến thành hình chữ nhật màu xanh

- **Trạng thái**: **TÁI HIỆN 100%**.
- **Mức độ nghiêm trọng**: **Medium** (Hỏng hình dạng vector khi lưu và nạp lại).
- **Kết luận**: **Lỗi chung Monorepo**.

#### 1. Các bước thực nghiệm trên Windows
1. Chèn một hình khối Mũi tên phải (`rightArrow`) vào slide.
2. Nhập văn bản `"Mục tiêu 2026"` vào hình.
3. Lưu ra tệp `.pptx`.
4. Mở lại tệp `.pptx` trong phiên mới và kiểm tra hình khối.

#### 2. Số liệu đo lường thực tế
- **Trước khi lưu**:
  - Khi chèn hình mũi tên bằng lệnh `slides.shape.insertPreset`, tọa độ mặc định chèn tại `left: 507px, top: 280px` chồng đè lên khung văn bản nội dung.
- **Sau khi mở lại trong 3T Slides**:
  - Đối tượng shape được nạp lại có model: `id: "Mũi tên phải 1", type: "arrow", geomType: "ooxml-rightArrow"`.
  - Tuy nhiên, phần tử DOM thực tế được render ra là một thẻ `div` hình chữ nhật thông thường:
    - CSS: `background-color: rgb(59, 130, 246)` (màu xanh dương đậm đặc), không có bất kỳ đường dẫn vector SVG nào của mũi tên.
    - Chữ `"Mục tiêu 2026"` nằm trong hộp chữ nhật xanh thay vì hình mũi tên.
- **Đối chiếu Microsoft PowerPoint COM ngầm** (`check_slides_com.ps1`):
  - Slide 2, Shape 3: `Name: "Mũi tên phải 1"`, `AutoShapeType: 33` (`msoShapeRightArrow` - chuẩn mũi tên nhọn sang phải của Microsoft Office).
  - Có text: `"Mục tiêu 2026"`.
  - *Kết luận*: Tệp `.pptx` lưu trên đĩa hoàn toàn chuẩn hình khối Mũi tên phải! Lỗi nằm ở bộ dựng hình Canvas của VN Office khi đọc lại file.

#### 3. Minh chứng hình ảnh
- Ảnh Windows: [p2-slides-shape-text-win.png](file:///E:/VNOffice-agy-repro/docs/evidence/repro-d-2510/p2-slides-shape-text-win.png) và [p4-slides-reopen-slide2-win.png](file:///E:/VNOffice-agy-repro/docs/evidence/repro-d-2510/p4-slides-reopen-slide2-win.png).
- Ảnh macOS đối chiếu: [p2-slides-shape-text-missing.png](file:///E:/VNOffice-agy-repro/docs/macos/evidence/explore-mac-2510/p2-slides-shape-text-missing.png).

#### 4. Phân tích nguyên nhân gốc
- **Tệp:Dòng**: [`apps/slides/slides-canvas.js:5766-5784`](file:///E:/VNOffice-agy-repro/apps/slides/slides-canvas.js#L5766-L5784).
- Khi render hình khối, mã nguồn chỉ kiểm tra nhánh `shape.type === "rect"` để gọi `presetOf(shape.geomType)`. Với các shape được nạp lại từ tệp nhập khẩu có `shape.type === "arrow"` hoặc `shape.geomType === "ooxml-rightArrow"`, nó rơi vào nhánh `else` dự phòng: vẽ một thẻ `div` nền xanh đơn thuần (`background-color: rgb(59, 130, 246)`) mà không nhúng đường dẫn SVG `renderPresetGeometry`.

---

### D10. Sheet — Biểu đồ chồng lên dữ liệu khi mở lại, mất tên chuỗi (`Series 1`)

- **Trạng thái**: **TÁI HIỆN 100%**.
- **Mức độ nghiêm trọng**: **Medium** (Che khuất số liệu và mất ngữ cảnh biểu đồ sau khi lưu).
- **Kết luận**: **Lỗi chung Monorepo**.

#### 1. Các bước thực nghiệm trên Windows
1. Khởi động 3T Sheet qua CDP.
2. Nhập bảng số liệu vào vùng `B1:C5`:
   - `B1`: "Tên hàng", `C1`: "Số lượng"
   - `B2:C5`: 4 mặt hàng văn phòng phẩm và số lượng (120, 85, 200, 45).
3. Chọn vùng `B1:C5` và chèn biểu đồ Cột (`bar`).
4. Lưu ra tệp `.xlsx` (`author-sheet-d10.xlsx`).
5. Mở lại tệp `.xlsx` trong phiên Sheet mới và đối chiếu với Excel COM.

#### 2. Số liệu đo lường thực tế
- **Trước khi lưu**:
  - `chartDomStyle.left`: **`346px`**, `top`: `28px`. (Nằm tách biệt ở bên phải cột C, không che dữ liệu).
  - `titleText`: `"Biểu đồ B1:C5"`.
  - `seriesNames`: **`["Số lượng"]`** (Lấy đúng tiêu đề cột C1).
  - `series[0].labelCell`: `{ c: "C", r: 1 }`.
- **Sau khi mở lại trong 3T Sheet**:
  - `chartDomStyle.left`: **`165px`** (Bị dịch sang trái `181px`!).
  - Bảng dữ liệu: Cột A (46px + 64px = 110px), Cột B (110px..174px), Cột C (174px..238px).
  - Vị trí `left: 165px` khiến biểu đồ **BẮT ĐẦU NGAY GIỮA CỘT B VÀ CHE PHỦ TOÀN BỘ CỘT C, D, E**.
  - `seriesNames`: **`["Series 1"]`** (Tên chuỗi "Số lượng" bị mất sạch, biến thành chữ mặc định vô nghĩa).
  - `range` biểu đồ bị co thành `B2:C5` (mất hàng tiêu đề 1).
- **Đối chiếu Microsoft Excel COM ngầm** (`check_sheet_com.ps1`):
  - `SheetName`: `"Sheet1"`.
  - `Chart1.Name`: `"chart-1792933783965-jhl9ez"`.
  - `Chart1.Left`: `123.89 pt` (~165.2 px), `Top`: `11.34 pt` (~15.1 px).
  - `Series[1].Name`: `"Số lượng"`.
  - `Series[1].Formula`: `"=SERIES(Sheet1!$C$1,Sheet1!$B$2:$B$5,Sheet1!$C$2:$C$5,1)"`.
  - *Phát hiện cốt lõi qua Excel COM*:
    1. Vị trí lệch đè lên dữ liệu (`Left: 123.89pt`) đã bị ghi trực tiếp vào file `.xlsx` ngay từ lúc 3T Office lưu!
    2. Trong khi đó, tên chuỗi `"Số lượng"` và tham chiếu ô tiêu đề `$C$1` vẫn tồn tại nguyên vẹn trong tệp `.xlsx` trên đĩa. Sự cố mất tên chuỗi thành `"Series 1"` hoàn toàn do bộ nạp của 3T Sheet gây ra khi mở lại file.

#### 3. Minh chứng hình ảnh
- Ảnh Windows: [s1-sheet-chart-inserted-win.png](file:///E:/VNOffice-agy-repro/docs/evidence/repro-d-2510/s1-sheet-chart-inserted-win.png) (trước lưu) và [s2-sheet-reopen-win.png](file:///E:/VNOffice-agy-repro/docs/evidence/repro-d-2510/s2-sheet-reopen-win.png) (sau mở lại đè lên cột B và C).
- Ảnh macOS đối chiếu: [s1-sheet-chart-inserted.png](file:///E:/VNOffice-agy-repro/docs/macos/evidence/explore-mac-2510/s1-sheet-chart-inserted.png) và [s2-sheet-reopen.png](file:///E:/VNOffice-agy-repro/docs/macos/evidence/explore-mac-2510/s2-sheet-reopen.png).

#### 4. Phân tích nguyên nhân gốc
- **Tệp:Dòng**:
  - **Lỗi vị trí dịch đè lên dữ liệu**: [`adapters/libreoffice/sheet/sheet-adapter.js:2902-2903`](file:///E:/VNOffice-agy-repro/adapters/libreoffice/sheet/sheet-adapter.js#L2902-L2903) trong hàm `_serializeChartsXml`.
    Khi chèn biểu đồ mới bằng `insertChart`, model biểu đồ chưa được gán thuộc tính `chart.x`. Khi xuất ODF/FODS, mã nguồn rơi vào nhánh fallback:
    `const x = Number.isFinite(Number(chart.x)) ? this._pxToOdfCm(chart.x) : (5.5 + (index % 2) * 0.4).toFixed(3);`
    Giá trị `5.500cm` tương đương `165pt` (~208px), bị LibreOffice ghi vào drawing của Excel đè lên cột C.
  - **Lỗi mất tên chuỗi**: [`adapters/libreoffice/sheet/sheet-adapter.js:5085-5130`](file:///E:/VNOffice-agy-repro/adapters/libreoffice/sheet/sheet-adapter.js#L5085-L5130) trong hàm `_attachImportedCharts`.
    Khi nạp biểu đồ từ FODS, adapter tính toán `union` vùng dữ liệu chỉ từ `values` (`C2:C5`) và `categories` (`B2:B5`), bỏ qua hàng tiêu đề `labelCellAddress` (`C1`). Khi gọi `extractSheetChartData` với vùng `B2:C5`, dòng đầu tiên là số liệu thay vì text, khiến hàm không nhận diện được tiêu đề cột và tự động gán tên dự phòng `"Series 1"`.

---

### D12. Writer — Số từ bị lệch trước vs sau khi lưu (158 -> 144)

- **Trạng thái**: **TÁI HIỆN 100%**.
- **Mức độ nghiêm trọng**: **Low** (Không ảnh hưởng tới nội dung tài liệu, chỉ gây sai lệch số liệu thống kê ở thanh trạng thái).
- **Kết luận**: **Lỗi chung Monorepo**.

#### 1. Các bước thực nghiệm trên Windows
1. Soạn văn bản có 1 chú thích chân trang (Footnote chứa 14 từ).
2. Kiểm tra bộ đếm từ ở thanh trạng thái trước khi lưu.
3. Lưu và mở lại tệp, kiểm tra lại bộ đếm từ và đối chiếu với Word COM.

#### 2. Số liệu đo lường thực tế
- **Trước khi lưu**:
  - Thống kê Writer: **`158 từ`** (Ký tự không cách: 545, Ký tự có cách: 686).
- **Sau khi mở lại**:
  - Thống kê Writer: **`144 từ`** (Ký tự không cách: 494, Ký tự có cách: 622).
  - Độ chênh lệch: Đúng **`14 từ`**!
- **Đối chiếu Microsoft Word COM ngầm** (`check_writer_com.ps1`):
  - `WordCount` (Thân văn bản chính): **`144 từ`**.
  - `FootnoteWords` (Nội dung chú thích chân trang): **`14 từ`**.
  - Tổng số từ thực tế: `144 + 14 = 158 từ`.

#### 3. Phân tích nguyên nhân gốc
- **Tệp:Dòng**: [`adapters/libreoffice/writer/writer-adapter.js:3186-3203`](file:///E:/VNOffice-agy-repro/adapters/libreoffice/writer/writer-adapter.js#L3186-L3203) (`_wordCountSourceText`) và [`apps/writer/word-count.js`](file:///E:/VNOffice-agy-repro/apps/writer/word-count.js).
- Trước khi lưu, hàm đếm từ quét trực tiếp trên toàn bộ DOM của body (bao gồm cả khối `.vno-footnotes-container`), do đó đếm luôn cả 14 từ trong footnote.
- Sau khi mở lại từ `.docx`, adapter lấy văn bản nguồn `_wordCountSourceText` chỉ từ `word/document.xml`. Các chú thích chân trang nằm trong tệp riêng `word/footnotes.xml` không được cộng gộp vào, khiến số từ hiển thị ở status bar giảm đúng 14 từ.

---

### D13. Writer — Không thống nhất thuật ngữ 'Ghi chú' vs 'Nhận xét'

- **Trạng thái**: **TÁI HIỆN 100%**.
- **Mức độ nghiêm trọng**: **Low** (Ảnh hưởng tính nhất quán giao diện người dùng).
- **Kết luận**: **Lỗi chung Monorepo**.

#### 1. Các bước thực nghiệm trên Windows
1. Mở tab Xem lại (Review) trên thanh Ribbon của 3T Writer.
2. Kiểm tra tên nhóm và các nút bấm liên quan đến tính năng bình luận/comment.
3. Kích hoạt sidebar và kiểm tra tiêu đề panel cũng như chuỗi i18n trong Adapter.

#### 2. Số liệu đo lường thực tế
- **Trên Ribbon (Xem lại)**:
  - Tên nhóm: **`"Nhận xét"`**.
  - Danh sách nút: `"Thêm nhận xét"`, `"Xóa nhận xét"`, `"Đã xử lý"`, `"Trả lời nhận xét"`, `"Nhận xét trước"`, `"Nhận xét sau"`.
- **Trong Sidebar và Adapter**:
  - Tiêu đề thanh bên hiển thị: **`"Ghi chú (1)"`**.
  - Mã nguồn [`adapters/libreoffice/writer/writer-adapter.js:9685, 9697, 9706, 9859`](file:///E:/VNOffice-agy-repro/adapters/libreoffice/writer/writer-adapter.js#L9685-L9859) hardcode chuỗi: `"Ghi chú"`, `"Ghi chú mới"`, `"Chưa có ghi chú nào"`.
  - Trong khi đó, từ "Ghi chú" thường được người dùng tiếng Việt hiểu là "Notes" (như Speaker Notes trong Slides) hoặc "Footnote" chứ không phải "Comment".

#### 3. Minh chứng hình ảnh
- Ảnh Windows: [w5-writer-comments-term-win.png](file:///E:/VNOffice-agy-repro/docs/evidence/repro-d-2510/w5-writer-comments-term-win.png).

#### 4. Phân tích nguyên nhân gốc
- **Tệp:Dòng**: [`platform/i18n/strings-vi.js:1632`](file:///E:/VNOffice-agy-repro/platform/i18n/strings-vi.js#L1632) (khai báo "Nhận xét") chưa được đồng bộ hóa vào các hàm tạo giao diện bình luận tại [`writer-adapter.js:9685, 9697, 9706, 9859`](file:///E:/VNOffice-agy-repro/adapters/libreoffice/writer/writer-adapter.js#L9685-L9859).

---

## III. KẾT LUẬN & ĐỀ XUẤT CHO CÁC BƯỚC TIẾP THEO

1. **Tính chất lỗi**:
   - Ngoại trừ **D6** (đặc thù macOS font rendering), toàn bộ các lỗi **D1, D2, D3, D4, D5, D7, D8, D10, D12, D13** đều là **LỖI CHUNG CỦA MONOREPO**.
   - Các lỗi này hoàn toàn không phải do môi trường macOS hay hệ điều hành gây ra, mà nằm trực tiếp trong logic JavaScript của tầng Shared Adapter (`adapters/libreoffice/`) và tầng Ứng dụng (`apps/writer/`, `apps/slides/`, `apps/sheet/`).
2. **Kế hoạch xử lý ưu tiên**:
   - **Gói 1 (Khẩn cấp - Critical & High)**:
     - Sửa **D1**: Lọc bỏ placeholder frames trong `slides-adapter.js` để triệt tiêu lỗi vẽ chữ 2 lần.
     - Sửa **D2**: Thiết lập `width="100%"` và bảo lưu thuộc tính borders cho bảng mới chèn trong `writer-adapter.js`.
     - Sửa **D3**: Bổ sung `font-size: 14pt; line-height: 1.5;` vào hàm thiết lập đoạn văn bản mặc định mới.
     - Sửa **D4**: Mở rộng bộ phân tích footer để nhận diện complex fields (`w:fldChar` + `w:instrText`).
   - **Gói 2 (Trung bình - Medium)**:
     - Sửa **D10**: Gán tọa độ `chart.x` thực tế lúc chèn vào model biểu đồ Sheet và bổ sung hàng header vào vùng `union` khi nạp biểu đồ.
     - Sửa **D8**: Bổ sung cơ chế render hình khối vector SVG cho các shape preset khi mở lại file trong Slides.
     - Sửa **D7**: Thêm CSS `padding-left: 20px;` cho `ul` bên trong `.vno-slide-body`.
   - **Gói 3 (Hoàn thiện - Low)**:
     - Sửa **D12**: Đọc thêm số từ trong `footnotes.xml` khi mở tài liệu DOCX.
     - Sửa **D13**: Chuẩn hóa toàn bộ thuật ngữ "Ghi chú" thành "Nhận xét" theo bộ từ điển i18n thống nhất.
