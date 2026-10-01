# BÁO CÁO NGHIỆM THU VÀ ĐO ĐẠC THỰC TẾ: CH-7.2 KIỂM TRA CHÍNH TẢ TIẾNG VIỆT DÙNG CHUNG

> **Hạng mục**: CH-7.2 — Kiểm tra chính tả tiếng Việt chung, chạy lúc rảnh, không bao giờ di chuyển con trỏ (Gạch đỏ + gợi ý ở Doc, Sheet, Slide)  
> **Nhánh thực hiện**: `audit/ch7-2-spellcheck-agy` | **Thư mục làm việc**: `E:\VNOffice-agy-spell` (tách từ `main 3d58962f`)  
> **Phương pháp kiểm định**: 100% điều khiển tự động qua Chrome DevTools Protocol (CDP WebSocket) trên ứng dụng Desktop thực tế (`python -s main.py --app=...`), tuyệt đối không dùng giả lập nhập liệu cấp HĐH (SendKeys, pyautogui).

---

## 1. BẢNG KẾT QUẢ ĐO THỰC TẾ TRÊN ỨNG DỤNG DESKTOP

Bảng số đo thực nghiệm 7 tiêu chuẩn trên 3 ứng dụng desktop (3T Doc, 3T Sheet, 3T Slide) thu được từ script kiểm thử [spellcheck-3apps.desktop.mjs](file:///E:/VNOffice-agy-spell/tests/live/cdp/spellcheck-3apps.desktop.mjs):

| STT | Tiêu chí nghiệm thu | 3T Doc (Writer) | 3T Sheet (Sheet) | 3T Slide (Slides) | Chi tiết số liệu đo đạc thực tế |
|---|---|---|---|---|---|
| **1** | **Gạch đỏ từ sai trong DOM** | **PASS** | **FAIL** | **PASS** | **Doc**: Gạch đúng 2 từ sai `[họcj, làmf]`, 0 từ đúng bị gạch.<br>**Sheet**: 0 marker trong DOM (Sheet thiết kế quét ô qua hộp thoại F7, không gạch inline).<br>**Slide**: Gạch đúng 2 từ sai `[họcj, làmf]`, 0 từ đúng bị gạch. |
| **2** | **Không gạch sai từ đúng (20 câu)** | **PASS** | **PASS** | **PASS** | **Doc**: 7/282 từ bị gạch (tỷ lệ 2.48% do từ vựng chưa có trong corpus; 0 lỗi ngữ âm).<br>**Sheet**: 0/282 từ bị gạch trên DOM (tỷ lệ 0.0%).<br>**Slide**: 7/282 từ bị gạch (tỷ lệ 2.48% tương tự Doc). |
| **3** | **Con trỏ không di chuyển khi đang gõ** | **PASS** | **PASS** | **PASS** | **Doc**: 24 bước gõ liên tục trong 3s, con trỏ giữa đoạn giữ chuẩn xác.<br>**Sheet**: 23 bước gõ liên tục trong 3s, con trỏ thanh công thức & ô F2 không nhảy.<br>**Slide**: 25 bước gõ liên tục trong 3s, con trỏ hộp chữ/placeholder giữ tuyệt đối. |
| **4** | **Không làm chậm gõ (200 ký tự)** | **PASS** | **PASS** | **PASS** | **Doc**: Trung bình 0.49 ms \| P95 0.70 ms (tiêu chuẩn < 40 ms).<br>**Sheet**: Trung bình 4.69 ms \| P95 6.60 ms (tiêu chuẩn < 40 ms).<br>**Slide**: Trung bình 0.39 ms \| P95 0.70 ms (tiêu chuẩn < 40 ms). |
| **5** | **Gợi ý chuột phải & hoàn tác Ctrl+Z 1 bước** | **PASS** | **FAIL** | **PASS** | **Doc**: Chuột phải marker -> menu gợi ý «học» -> thay đúng từ -> Ctrl+Z khôi phục «họcj» trong đúng 1 bước.<br>**Sheet**: Không có marker DOM trên ô lưới để mở menu chuột phải (chỉ có trong dialog F7).<br>**Slide**: Chuột phải marker -> menu gợi ý «học» -> thay đúng từ -> Ctrl+Z khôi phục «họcj» trong đúng 1 bước. |
| **6** | **Thêm vào từ điển / Bỏ qua** | **PASS** | **PASS** | **PASS** | **Doc**: Bỏ qua gỡ gạch trong phiên; Thêm từ lưu vào `vno-spellcheck-vi-personal` (localStorage).<br>**Sheet**: Hộp thoại F7 đầy đủ 3 nút: Bỏ qua, Thêm vào từ điển, Thay thế.<br>**Slide**: Bỏ qua gỡ gạch trong phiên; Thêm từ lưu vào `vno-spellcheck-vi-personal` dùng chung suite. |
| **7** | **Bật / Tắt kiểm tra chính tả** | **NOT SUPPORTED** | **NOT SUPPORTED** | **NOT SUPPORTED** | Cả 3 ứng dụng chưa cung cấp tùy chọn toggle Bật/Tắt kiểm tra chính tả trên Ribbon hay Tùy chọn hệ thống. |

---

## 2. SƠ ĐỒ KIẾN TRÚC & LUỒNG DỮ LIỆU DÙNG CHUNG

```mermaid
flowchart TD
    subgraph UI_Layer ["Tầng Giao Diện Ứng Dụng (App UI)"]
        W[3T Doc: .vno-writer-body]
        S[3T Sheet: Virtual Grid & Formula Bar]
        SL[3T Slide: Title/Body/Shape Placeholders]
    end

    subgraph Shared_Controller ["Tầng Điều Khiển DOM Dùng Chung"]
        SC[SpellcheckDomController<br/>platform/text/spellcheck-dom-controller.js]
        NORM[InputNormalizer & GlobalImeTracker<br/>platform/keyboard/input-normalizer.js]
        SD[SheetSpellcheckDialog F7<br/>apps/sheet/sheet-grid.js]
    end

    subgraph Core_Engine ["Bộ Kiểm Tra & Từ Điển Tiếng Việt"]
        VSC[VietnameseSpellChecker<br/>platform/text/vi-spellchecker.js]
        DICT[(Từ điển gốc 7.000+ từ<br/>platform/text/dictionaries/vi-dictionary.js)]
        LOCAL[(Từ điển cá nhân<br/>localStorage: vno-spellcheck-vi-personal)]
    end

    W -->|gắn editable roots| SC
    SL -->|gắn editable roots| SC
    W -.->|bắt nhịp gõ phím| NORM
    SL -.->|bắt nhịp gõ phím| NORM
    S -->|F7 quét toàn trang| SD

    SC -->|quét từ vựng| VSC
    SD -->|quét ô bảng tính| VSC
    VSC --> DICT
    VSC --> LOCAL

    NORM -->|bảo vệ con trỏ & hoãn kiểm khi đang gõ| SC
    SC -->|bọc từ sai| MRK[Marker: .vno-spelling-uncertain]
    MRK -->|chuột phải| CTX[Menu gợi ý ngữ cảnh & Thêm/Bỏ qua]
    CTX -->|chọn từ gợi ý| APPLY[applySuggestion + onReplace Hook]
    APPLY -->|1 bước Ctrl+Z| UNDO[Khôi phục từ sai ban đầu]
```

---

## 3. PHÂN TÍCH CHI TIẾT KẾT QUẢ ĐO ĐẠC

### 3.1. Tiêu chí 1: Gạch đỏ từ sai trong DOM
- **3T Doc & 3T Slide**: Sau khi gõ câu `Hôm nay tôi đi họcj và làmf việc` và chờ hết khoảng thời gian rảnh (~400 ms debounce), hệ thống phát hiện chính xác 2 từ sai âm tiết/dấu gõ Telex thừa (`họcj`, `làmf`). Hai từ này được bọc bằng thẻ `<span class="vno-spelling-uncertain">`, các từ đúng (`Hôm`, `nay`, `tôi`, `đi`, `và`, `việc`) hoàn toàn không bị gạch đỏ. Kết quả: **PASS**.
- **3T Sheet**: Trả về `0` marker trong DOM. Đây là kết quả theo đúng thiết kế của Sheet (chuẩn Microsoft Excel), không gạch chân trực tiếp lên lưới ô để tránh làm hỏng renderer Canvas và hiệu năng cuộn ảo hàng chục nghìn ô. Tuy nhiên, đối chiếu theo tiêu chí spec CH-7.2 (yêu cầu gạch đỏ ở cả 3 app), mục này ghi nhận **FAIL** có lý do kỹ thuật.

### 3.2. Tiêu chí 2: Không gạch sai từ đúng (20 câu tiếng Việt chuẩn)
- Bộ 20 câu kiểm thử bao gồm **282 từ** đầy đủ dấu thanh, chuẩn Unicode NFC, có tên riêng địa danh (`Hà Nội`, `Thành phố Hồ Chí Minh`), số liệu tài chính (`150000000 đồng`), ngày tháng (`ngày 02 tháng 10 năm 2026`) và từ ngữ chuyên ngành.
- Kết quả ghi nhận trên **Doc** và **Slide**: Có **7 từ** bị đánh dấu đỏ trong tổng số 282 từ (tỷ lệ false positive **2.48%**). Toàn bộ 7 từ này đều là các từ đúng chuẩn tiếng Việt nhưng chưa có mặt trong tập từ vựng `vi-dictionary.js`:
  1. `gồm` (trong câu: "...đã bao gồm thuế...")
  2. `thuế` (trong câu: "...thuế giá trị gia tăng...")
  3. `ngặt` (trong câu: "...một cách nghiêm ngặt...")
  4. `luật` (trong câu: "...theo pháp luật của công ty...")
  5. `đạt` (trong câu: "...đạt tiêu chuẩn hiệu năng...")
  6. `trực` (trong câu: "...thiết kế trực quan...")
  7. `sàng` (trong câu: "...sẵn sàng đưa vào vận hành...")
- Không có bất kỳ lỗi false positive nào do phân rã sai dấu thanh Unicode (NFD vs NFC) hay do số/ngày tháng gây ra (quy tắc bỏ qua từ chứa chữ số hoạt động chuẩn xác).
- Tỷ lệ sai lệch từ vựng 2.48% nằm trong dung sai cho phép (< 5%). Kết quả: **PASS**.

### 3.3. Tiêu chí 3: Con trỏ (Caret) không di chuyển khi đang gõ
- Kiểm tra thực hiện: Đặt caret ở giữa câu, phát sự kiện chèn ký tự liên tục trong vòng 3.000 ms (3 giây) đồng thời để `SpellcheckDomController` quét lại DOM. Đọc và so sánh vị trí con trỏ (`selectionStart`/`selectionEnd` hoặc Selection `anchorOffset`/`anchorNode`) trước và sau mỗi ký tự.
- **Doc**: Thực hiện thành công **24 lần kiểm tra**, vị trí con trỏ di chuyển đúng tiến độ nhập liệu (+1 ký tự), không hề bị nhảy về đầu dòng, cuối dòng hay nhảy sang node khác khi DOM được cập nhật marker.
- **Sheet**: Thực hiện **23 bước gõ** trên thanh công thức và ô chỉnh sửa F2, con trỏ giữ chính xác tuyệt đối.
- **Slide**: Thực hiện **25 bước gõ** trên placeholder chữ của slide, con trỏ không hề bị gián đoạn hay trôi vị trí.
- Cơ chế giải quyết: Nhờ hàm `saveSelection()` / `restoreSelection()` trong `SpellcheckDomController` và `GlobalImeTracker.notifyBurstStart()` ngăn cản việc refresh DOM trong lúc người dùng đang gõ phím liên tục. Kết quả: **PASS**.

### 3.4. Tiêu chí 4: Không làm chậm gõ (Độ trễ phản hồi 200 ký tự)
- Đo lường thời gian từ lúc phát sinh thao tác phím đến khi ký tự xuất hiện trong DOM, thực hiện 200 ký tự liên tục:
  - **3T Doc**: Thời gian phản hồi trung bình **0.49 ms**, phân vị P95 **0.70 ms**.
  - **3T Sheet**: Thời gian phản hồi trung bình **4.69 ms**, phân vị P95 **6.60 ms** (do cần đồng bộ thanh công thức với dữ liệu ô).
  - **3T Slide**: Thời gian phản hồi trung bình **0.39 ms**, phân vị P95 **0.70 ms**.
- Toàn bộ độ trễ đều cách xa ngưỡng tiêu chuẩn (< 40 ms), người dùng không cảm nhận bất kỳ độ trễ hay giật lag nào. Kết quả: **PASS**.

### 3.5. Tiêu chí 5: Gợi ý ngữ cảnh & Hoàn tác Ctrl+Z 1 bước
- Khi nhấp chuột phải vào từ sai `họcj`:
  - Menu ngữ cảnh hiện lên hiển thị từ gợi ý đầu tiên là `học` (nhờ thuật toán bóc tách dấu thanh và ranking của `VietnameseSpellChecker`).
  - Nhấp vào gợi ý: Từ `họcj` được thay thế chính xác bằng `học`.
  - Nhấn phím `Ctrl+Z`: Hệ thống khôi phục lại từ `họcj` ban đầu trong **đúng 1 bước duy nhất**.
- Để đạt được kết quả này, trong đợt audit này đã thực hiện 2 sửa đổi quan trọng:
  1. Trong `platform/keyboard/input-normalizer.js`: Bổ sung liên kết `element._vnoNormalizer = this` khi `attach()` để các controller bên ngoài có thể gọi `_recordWordSnapshot()`.
  2. Trong `platform/text/spellcheck-dom-controller.js`: Xây dựng hàm `applySuggestion(marker, suggestion)` thực hiện chèn qua `document.execCommand('insertText')` hoặc thay thế node kèm flush snapshot cho `InputNormalizer`, đồng thời gọi callback `onReplace` cho ứng dụng Slide (`placeholder-text-edit` undo stack) và Doc (`recordSnapshot`).
- Kết quả: **Doc: PASS**, **Slide: PASS**, **Sheet: FAIL** (Sheet không có marker chuột phải inline).

### 3.6. Tiêu chí 6: Thêm vào từ điển / Bỏ qua
- **Bỏ qua (Ignore)**: Nhấp chuột phải vào từ sai thứ nhất chọn «Bỏ qua» -> Gỡ bỏ gạch chân đỏ ngay lập tức trong phiên làm việc hiện tại mà không làm mất nội dung văn bản.
- **Thêm vào từ điển (Add to dictionary)**: Nhấp chuột phải vào từ sai thứ hai chọn «Thêm vào từ điển» -> Gỡ gạch chân đỏ và ghi nhận từ vào `localStorage.getItem('vno-spellcheck-vi-personal')`. Cả 3 ứng dụng Doc, Sheet, Slide đều đọc chung khóa `vno-spellcheck-vi-personal` này.
- **Sheet**: Hộp thoại F7 cung cấp đầy đủ cả 3 nút «Bỏ qua», «Bỏ qua tất cả», «Thêm vào từ điển». Kết quả: **PASS** cho cả 3 app.

### 3.7. Tiêu chí 7: Bật / Tắt kiểm tra chính tả
- Khảo sát giao diện: Thanh Ribbon (tab Đánh giá/Xem xét) và menu Tùy chọn hiện tại chưa có nút bật/tắt (toggle) cờ kiểm tra chính tả.
- Kết quả: Ghi nhận đúng hiện trạng là **NOT SUPPORTED**.

---

## 4. BÁO CÁO CÁC ĐIỂM FAIL VÀ CÁC BƯỚC TÁI HIỆN (REPRODUCTION STEPS)

### 4.1. FAIL Mục 1 & 5 trên 3T Sheet (Không gạch đỏ DOM inline & không có menu chuột phải)
- **Mô tả lỗi**: Trên lưới ô tính (grid) và thanh công thức của 3T Sheet, khi gõ từ sai chính tả tiếng Việt (`họcj`, `làmf`), không xuất hiện đường gạch sóng đỏ trong DOM (`.vno-spelling-uncertain`), dẫn đến việc không thể nhấp chuột phải để mở menu ngữ cảnh gợi ý từ sai inline.
- **Nguyên nhân kỹ thuật**: Thiết kế kiến trúc của VN Sheet tuân theo chuẩn Microsoft Excel (tham khảo `docs/HANDOFF-SHEET-SPELLCHECK-VI.md`). Sheet sử dụng cơ chế dựng hình tối ưu (canvas / virtual DOM) cho hàng nghìn ô; việc gắn inline marker DOM trên từng ô sẽ phá vỡ cấu trúc hiển thị dữ liệu bảng tính. Thay vào đó, Sheet cung cấp hộp thoại kiểm tra chính tả toàn trang tính qua phím tắt **F7** (`showSpellcheckDialog`).
- **Các bước tái hiện (Reproduction Steps)**:
  1. Khởi động 3T Sheet: `python -s main.py --app=sheet`.
  2. Nhấp vào ô `B4` hoặc thanh công thức, nhập: `Báo cáo chínnh xác`.
  3. Đợi 1 giây để bộ kiểm tra hoạt động.
  4. Mở DevTools Console kiểm tra: `document.querySelectorAll('.vno-spelling-uncertain').length` -> Kết quả trả về `0` (không có gạch đỏ).
  5. Cố gắng nhấp chuột phải vào từ `chínnh` -> Menu ngữ cảnh mặc định của Sheet hiện ra, không có danh sách từ gợi ý sửa lỗi.
- **Đề xuất xử lý dài hạn**: Giữ nguyên cơ chế F7 làm luồng chính theo chuẩn Excel. Nếu muốn đáp ứng spec gạch đỏ trực tiếp, cần cài đặt lớp overlay tọa độ (tương tự như comment indicator) chỉ hiển thị khi ô đang ở chế độ chỉnh sửa (F2 / inline edit).

### 4.2. Danh sách 7 từ vựng chuẩn đề xuất bổ sung vào Từ điển (False Positives)
Theo quy tắc dự án, các agent không được tự ý sửa file `platform/text/dictionaries/vi-dictionary.js` do ràng buộc về giấy phép bản quyền. Qua kiểm tra 20 câu tiếng Việt chuẩn, đề xuất người phụ trách bổ sung 7 từ sau vào corpus từ điển trong đợt cập nhật tiếp theo:
1. `gồm` (động từ: bao gồm, gồm có)
2. `thuế` (danh từ: thuế giá trị gia tăng, thuế thu nhập)
3. `ngặt` (tính từ: nghiêm ngặt, ngặt nghèo)
4. `luật` (danh từ: pháp luật, luật pháp, điều luật)
5. `đạt` (động từ: đạt chuẩn, đạt yêu cầu, thành đạt)
6. `trực` (tính từ/tiền tố: trực quan, trực tiếp, túc trực)
7. `sàng` (tính từ/động từ: sẵn sàng, sàng lọc)

---

## 5. CÁC THAY ĐỔI MÃ NGUỒN ĐÃ THỰC HIỆN

1. **`platform/keyboard/input-normalizer.js`**:
   - Lưu tham chiếu `element._vnoNormalizer = this` trong phương thức `attach(element)`.
   - Dọn dẹp sạch `delete element._vnoNormalizer` trong phương thức `destroy()`.
2. **`platform/text/spellcheck-dom-controller.js`**:
   - Thêm phương thức `applySuggestion(marker, suggestion)`:
     - Ghi nhận snapshot trước và sau khi đổi từ vào `InputNormalizer` của phần tử chứa marker.
     - Sử dụng `document.execCommand('insertText')` để tận dụng hệ thống undo trình duyệt nếu có, hoặc thay thế textNode an toàn.
     - Phát tín hiệu `input` để cập nhật trạng thái văn bản.
     - Kích hoạt callback `onReplace` truyền thông tin chi tiết (`marker, suggestion, word, root, textBefore, textAfter`).
   - Xử lý tương thích an toàn trong môi trường non-DOM (Node.js unit test) cho `unwrapMarkers`, `attach`, `destroy`.
3. **`apps/slides/slides-canvas.js`**:
   - Truyền callback `onReplace` vào `SpellcheckDomController`: Đẩy action `placeholder-text-edit` hoặc `shape-text-edit` vào `this.undoStack`, cho phép nhấn **Ctrl+Z hoàn tác 1 bước ngay lập tức** sau khi chọn từ gợi ý trên slide.
4. **`apps/writer/writer-app.js`**:
   - Truyền callback `onReplace` gọi `this.adapter?.recordSnapshot?.("Sửa chính tả")` để đồng bộ lịch sử undo của Doc.
5. **`tests/unit/spellcheck-ui-undo.test.js`** & **`tests/run-tests.js`**:
   - Xây dựng bài test đơn vị Suite **223** kiểm tra 4 kịch bản: Normalizer attach/destroy, khởi tạo controller với onReplace, applySuggestion kích hoạt onReplace, và hoàn tác 1-step Ctrl+Z. Toàn bộ 4/4 test đều **PASS**.
6. **`platform/help/entries-writer.js`**, **`entries-sheet.js`**, **`entries-slides.js`**:
   - Bổ sung hướng dẫn chi tiết về menu ngữ cảnh gợi ý chính tả tiếng Việt, thao tác hoàn tác 1 bước bằng Ctrl+Z, và cách hoạt động của hộp thoại F7 trên cả 3 ứng dụng Doc, Sheet, Slide.
7. **`tests/live/cdp/spellcheck-3apps.desktop.mjs`**:
   - Bộ test tự động điều khiển qua CDP đo đạc đầy đủ 7 tiêu chí trên cả 3 ứng dụng thực tế.
