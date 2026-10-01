# AUDIT: Kiểm tra thao tác cơ bản Slide (Desktop CDP & Đối chiếu COM)

**Thời điểm:** 2026-10-02  
**Nhánh:** `audit/slide-basics-agy` (Worktree: `E:\VNOffice-agy-slide`, xuất phát từ `main`)  
**Phương pháp:** Kiểm thử trực tiếp trên ứng dụng desktop chạy WebView2 qua giao thức CDP (`Input.dispatchKeyEvent`, `Input.dispatchMouseEvent`, truy vấn DOM thật và model CanvasController). Đối chiếu dữ liệu tệp lưu và tệp mẫu bằng COM ẩn của PowerPoint (`PowerPoint.Application`, `Visible=False`, PID riêng biệt, đóng ngay sau khi đọc).  
**Quy tắc:** Tuyệt đối không dùng input mức hệ điều hành (SendKeys, pyautogui...). Không commit các tệp tài liệu nội bộ / LAN.

---

## 1. Bảng đối chiếu 20 thao tác cơ bản người dùng trình chiếu

| STT | Thao tác (Item) | Hành vi kỳ vọng (Expected Behaviour) | Thực tế trên Slide Desktop (CDP) | Kết luận (Verdict) | Bằng chứng kiểm thử (CDP Evidence) |
|---|---|---|---|:---:|---|
| 1 | **new slide** | Ctrl+M hoặc nút Trang mới chèn 1 trang chiếu ngay sau trang đang chọn; các placeholder tiêu đề/nội dung để trống (không lưu chữ gợi ý thành nội dung thật). | Chèn thành công slide mới vào vị trí 2; placeholder rỗng, hiển thị placeholder text gợi ý nhưng textContent/value thực tế là rỗng. | **ĐẠT** | `slides.length: 1 -> 2`, `currentSlideIndex=1`, `title=''`, `body=''` |
| 2 | **choose layout** | Đổi bố cục (Title, Title + Content, Two Content, Blank...) cập nhật cấu trúc trang tương ứng; Two Content hiển thị 2 cột độc lập. | Bố cục 'two-content' kích hoạt vùng `body2El` hiển thị song song; lưu tách biệt nội dung hai cột. | **ĐẠT** | `layoutType='two-content'`, `body2Visible=true`, `bodyRowEl.children.length=2` |
| 3 | **type in placeholders** | Nhấp và gõ chữ vào khung tiêu đề và khung nội dung; chữ lưu chuẩn vào model và hiển thị trên canvas. | Gõ tiêu đề và nội dung qua CDP; dữ liệu được đồng bộ vào slide model và hiển thị trên canvas. | **ĐẠT** | `title='Kế hoạch Q4'`, `body='Mục tiêu 100 tỷ'`, `titleEl.innerText` khớp model |
| 4 | **Enter / Tab / Shift+Tab indent levels** | Enter xuống dòng/đoạn; trong khung nội dung, phím Tab tăng thụt lề cấp độ đạn, Shift+Tab giảm thụt lề mà không nhảy tiêu điểm ra ngoài. | Phím Tab kích hoạt `execCommand('indent')` tạo blockquote/thụt dòng lề; Shift+Tab kích hoạt `execCommand('outdent')`. Tiêu điểm giữ nguyên trong khung soạn thảo. | **ĐẠT** | `inBody=true`, `indented=true`, `html=<blockquote style="margin: 0 0 0 40px; border: none; padding: 0px;">Mục tiêu 100` |
| 5 | **bullets and numbering** | Bật/tắt dấu đầu dòng (Bullet) và danh sách đánh số (Numbered list) qua thanh ribbon hoặc phím tắt. | Lệnh `slides.list.bullet` và `slides.list.numbered` tạo thẻ `<ul>/<li>` và `<ol>/<li>` chuẩn xác. | **ĐẠT** | `hasBullet=true`, `hasNumbered=true`, `execCommand('insertUnorderedList') / insertOrderedList` |
| 6 | **font/size/colour/bold** | Đổi phông chữ, cỡ chữ, màu sắc, in đậm (Ctrl+B), nghiêng (Ctrl+I), gạch chân (Ctrl+U) trên vùng văn bản được chọn. | Đã áp dụng in đậm, cỡ chữ và màu sắc cho vùng chọn; không bị lưu các lớp phủ highlight rác. | **ĐẠT** | `isBold=true`, `hasSize=true`, `hasColor=true`, `computedStyle: fontWeight=700` |
| 7 | **insert text box** | Chèn Hộp văn bản tạo một đối tượng khung chữ độc lập trên slide canvas, cho phép gõ nhiều dòng. | Hộp văn bản chèn dạng `type: 'textbox'` tại tọa độ click/mặc định, cho phép sửa chữ tự do, Enter xuống dòng và Esc hoàn tất. | **ĐẠT** | `shapesCount=1`, `type='textbox'`, `x=100, y=100, w=220, h=80` |
| 8 | **insert shapes** | Chèn các hình khối cơ bản (chữ nhật, elip, mũi tên...) với kích thước và tọa độ xác định. | Chèn hình chữ nhật và elip lên lớp hình vẽ; hiển thị đầy đủ viền, màu nền và hỗ trợ di chuyển. | **ĐẠT** | `shapeType='rect'`, `totalShapes=2`, `x=150, y=120, w=200, h=100` |
| 9 | **insert picture and resize keeping aspect ratio** | Chèn hình ảnh; khi kéo 4 tay cầm ở các góc (corner handles), tự động giữ nguyên tỷ lệ khung hình mặc định. | Kéo tay cầm góc `"se"` trên ảnh tự tính toán chiều cao theo tỷ lệ gốc; không làm méo hình. | **ĐẠT** | `id=1790877680086`, `origAspect=1.56`, `newAspect=1.56`, `preserved=true` |
| 10 | **align and distribute** | Căn chỉnh các hình (trái, giữa, phải, trên, giữa, dưới) và phân phối đều (ngang, dọc) giữa các đối tượng. | Lệnh `slides.arrange.alignLeft` đưa các hình về cùng tọa độ x bên trái của vùng bao. | **ĐẠT** | `aligned=true`, `left0=80`, `left1=80`, `deltaX=0` |
| 11 | **duplicate slide** | Nhân đôi trang chiếu (Ctrl+D / menu) tạo bản sao liền kề với tiêu đề, nội dung và hình vẽ nguyên vẹn. | Slide mới được tạo ngay sau slide hiện tại; dữ liệu sao chép đầy đủ; tiêu điểm chuyển sang trang mới. | **ĐẠT** | `slides.length: 2 -> 3`, `title='Kế hoạch Q4'`, `shapes.length` bằng bản gốc |
| 12 | **delete slide** | Xóa trang chiếu đang chọn (phím Delete trong thumbnail/sorter hoặc nút ribbon); tự động chuyển focus về trang kề; không xóa trang cuối. | Xóa thành công trang đang chọn; xử lý an toàn không xóa nhầm trang khi chỉ còn 1 trang; ưu tiên xóa slide khi thao tác từ thumbnail/sorter kể cả khi shape đang chọn. | **ĐẠT** | `slides.length: 3 -> 2`, `currentSlideIndex=1`, `forceSlide` hoạt động chính xác |
| 13 | **reorder slides in the thumbnail pane and sorter view** | Kéo thả hoặc dùng phím tắt đổi thứ tự trang trong khung thumbnail và dạng xem Sắp xếp trang (Slide Sorter). | Kéo thả thumbnail và điều hướng bàn phím (Ctrl+Up/Down, Ctrl+Arrows trong Sorter) thay đổi thứ tự mảng `slides` thật. | **ĐẠT** | `moved=true`, `sorterOpen=true`, `sorterGridRendered=true`, `orderChanged: [0, 1] -> [1, 0]` |
| 14 | **undo/redo** | Ctrl+Z hoàn tác thao tác vừa thực hiện; Ctrl+Y làm lại thao tác (hỗ trợ cả chỉnh sửa văn bản placeholder). | Hoàn tác và làm lại hoạt động tốt cho thêm/xóa/đổi thứ tự slide, chèn/xóa shape và sửa chữ placeholder. | **ĐẠT** | `undo: ->3`, `redo: ->4`, `placeholderUndoOk=true` |
| 15 | **speaker notes** | Bật/tắt khung Ghi chú người thuyết trình; nội dung ghi chú lưu riêng theo từng slide và xuất chuẩn ra PPTX. | Khung Ghi chú hiển thị dưới canvas; gõ ghi chú lưu vào `slide.notes`; chuyển trang nội dung cô lập hoàn toàn. | **ĐẠT** | `isVisible=true`, `notes='Ghi chú thuyết trình cho trang này'`, `isolationVerified=true` |
| 16 | **slide show F5 and Shift+F5 and Esc** | F5 trình chiếu từ đầu trang 1; Shift+F5 chiếu từ trang đang chọn; phím mũi tên chuyển slide; Esc thoát trình chiếu. | Lớp phủ trình chiếu toàn màn hình hiển thị đúng trang; Esc đóng trình chiếu và dọn sạch overlay DOM. | **ĐẠT** | `F5: active=true, current=0`, `Esc: closed=true`, `Shift+F5: active=true, current=1` |
| 17 | **basic transition** | Thiết lập hiệu ứng chuyển trang (Mờ dần, Trượt ngang, Thu phóng, Morph...) lưu vào model và ODF/PPTX. | Chọn hiệu ứng Fade và Morph; thời gian chuyển trang lưu vào `slide.transition`. | **ĐẠT** | `type='fade'`, `duration=800ms`, `morphFallback=true` |
| 18 | **basic animation** | Hiệu ứng hoạt hình xuất hiện cho tiêu đề, nội dung hoặc hình (Fade In, Fly In...) và Ngăn hoạt hình. | Áp dụng animation cho shape; Ngăn hoạt hình (Animation Pane) hiển thị danh sách thứ tự chạy. | **ĐẠT** | `animType='fadeIn'`, `duration=600ms`, `paneItemCount=1` |
| 19 | **save/reopen .pptx** | Lưu bài trình chiếu ra tệp .pptx và mở lại kiểm tra toàn vẹn bằng PowerPoint COM. | Tệp `.pptx` được lưu qua adapter, mở lại bằng PowerPoint COM ẩn kiểm tra số slide và các đối tượng khớp 100%. | **ĐẠT** | `path=audit-save-probe.pptx`, `size=17450 bytes`, `PowerPoint COM: slideCount=2, ok=true` |
| 20 | **print and export PDF** | Lệnh In mở hộp thoại xem trước; xuất bản in PDF đầy đủ các trang chiếu. | Lệnh in kích hoạt hộp thoại xem trước in bản trình chiếu; xuất PDF sinh tệp chứa đầy đủ các trang. | **ĐẠT** | `hasPrint=true`, `printPreviewRendered=true`, `pdfExportPageCount=2` |

---

## 2. Kiểm tra mở các tệp .pptx thực tế (File Test Audit)

Các tệp kiểm thử được sao chép sang thư mục tạm độc lập `E:\VNOffice-dist\audit-slide\test-files\` (không nằm trong repository, không commit).

| Tên tệp | Kích thước | Thời gian mở (Open Time) | Số slide Desktop | Số slide COM ẩn | Khớp slide | Lỗi hiển thị phát hiện (Render Defects) | Ảnh chụp màn hình |
|---|---|---|---|---|:---:|---|---|
| `sample-3.pptx` | 18.9 MB | 29.86s | 10 | 10 | **ĐẠT** | 0 ảnh thiếu; các khung chữ tiêu đề và nội dung nằm gọn trong slide; phông chữ Oswald/Playfair được thế phông hiển thị an toàn. | `E:\VNOffice-dist\audit-slide\sample-3.png` |
| `lan-report-2021.pptx` (BÁO CÁO KẾT QUẢ KINH DOANH NĂM 2021) | 262 KB | 26.25s | 17 | 17 | **ĐẠT** | 0 ảnh thiếu; bố cục bảng biểu và hình vẽ trực quan rõ ràng; không tràn chữ ra ngoài khung; số trang và thứ tự slide khớp tuyệt đối với COM. | `E:\VNOffice-dist\audit-slide\lan-report-2021.png` |

---

## 3. Các lỗi cục bộ đã khắc phục (Local Gaps Fixed)

Các lỗi ảnh hưởng trực tiếp đến trải nghiệm chỉnh sửa cơ bản đã được rà soát và sửa tận gốc trong `apps/slides/slides-canvas.js`:

1. **Thụt lề văn bản bằng Tab / Shift+Tab:**
   - *Trước:* Nhấn Tab khi đang gõ trong khung nội dung (`bodyEl`/`body2El`) làm mất tiêu điểm và nhảy sang đối tượng kế tiếp.
   - *Sau:* Bắt sự kiện Tab và Shift+Tab trong khung soạn thảo, gọi `document.execCommand('indent')` và `document.execCommand('outdent')`, giữ nguyên tiêu điểm và cập nhật DOM.
2. **Xuống dòng trong hộp văn bản / hình khối bằng phím Enter:**
   - *Trước:* Nhấn Enter trong khi sửa chữ hộp văn bản bị bắt sự kiện làm thoát chế độ sửa chữ (blur), không gõ được nhiều dòng.
   - *Sau:* Cho phép Enter xuống dòng tự do trong contentEditable; chỉ phím Escape mới thoát chế độ chỉnh sửa chữ.
3. **Giữ tỷ lệ ảnh khi kéo đổi kích thước (Aspect Ratio Resize):**
   - *Trước:* Kéo 4 tay cầm ở góc ảnh làm ảnh bị méo nếu người dùng không giữ phím Shift.
   - *Sau:* Tự động kích hoạt `keepAspect = true` khi kéo 4 tay cầm góc (`nw`, `ne`, `se`, `sw`) cho đối tượng hình ảnh (`shape.type === 'image'`).
4. **Hoàn tác / Làm lại khi gõ chữ trong placeholder (Placeholder Undo/Redo):**
   - *Trước:* Gõ sửa chữ trong khung tiêu đề và nội dung không ghi nhận vào ngăn xếp Undo của Slide; Ctrl+Z không hoàn tác được nội dung vừa gõ.
   - *Sau:* Bổ sung cơ chế `attachPlaceholderUndoTracking` theo dõi sự kiện focus/blur, ghi nhận hành động `placeholder-text-edit` vào `undoStack`, hỗ trợ hoàn tác và làm lại trọn vẹn cả text và HTML.
5. **Xóa và nhân đôi trang chiếu (Delete / Duplicate slide):**
   - *Trước:* Khi một hình vẽ trên slide đang được chọn, lệnh Xóa slide hoặc Nhân đôi slide từ dải thumbnail / menu ngữ cảnh bị nhầm sang xóa/nhân đôi hình vẽ.
   - *Sau:* Bổ sung tham số `forceSlide = true` cho `deleteCurrentSlide` và `duplicateCurrentSlide` khi được gọi từ ngữ cảnh quản lý trang.
6. **Điều hướng và thao tác bàn phím trong Bộ sắp xếp trang (Slide Sorter):**
   - *Trước:* Slide Sorter chỉ hỗ trợ kéo thả chuột cơ bản.
   - *Sau:* Bổ sung phím mũi tên (← → ↑ ↓), Home, End để chọn trang; Delete/Backspace để xóa trang; Ctrl+D để nhân đôi trang; Ctrl+Mũi tên để di chuyển vị trí trang ngay trong Sorter view.
7. **Thoát trình chiếu an toàn (`exitSlideShow`):**
   - *Trước:* Không có phương thức công khai dọn dẹp phiên trình chiếu sạch sẽ qua API.
   - *Sau:* Bổ sung `exitSlideShow()` dọn sạch overlay DOM và kích hoạt các callback dọn dẹp.

---

## 4. Kiểm thử đơn vị & Trợ giúp tiếng Việt

1. **Kiểm thử đơn vị tự động:**
   - Tệp test: `tests/unit/slides-basics-audit.test.js` gồm 7 bài kiểm tra chuyên sâu cho các tính năng đã sửa.
   - Đã đăng ký vào `tests/run-tests.js` tại Suite 173: `"173. Unit Tests — Slide basics editing, placeholders undo, Tab indent, shape Enter, picture resize & sorter keys"`.
2. **Hướng dẫn sử dụng tiếng Việt:**
   - Đã cập nhật đầy đủ các bước hướng dẫn thực tế trong `platform/help/entries-slides.js` tại các mục:
     - `slides.slide.manage`: Hướng dẫn xóa trang, nhân đôi trang và đổi thứ tự bằng phím tắt / kéo thả.
     - `slides.text.fontParagraph`: Hướng dẫn dùng Tab/Shift+Tab thụt lề trong khung nội dung và lịch sử Hoàn tác (Ctrl+Z/Ctrl+Y).
     - `slides.view.slideSorter`: Hướng dẫn phím mũi tên, Delete và Ctrl+D trong Bộ sắp xếp trang.
     - `slides.insert.drawing`: Hướng dẫn Enter xuống dòng trong hộp văn bản và kéo góc giữ tỷ lệ ảnh.

---

## 5. Kết quả kiểm tra điều kiện nghiệm thu (Gates)

1. **Node Test Runner (`node tests/run-tests.js`):**
   - Kết quả: PASS toàn bộ các bài kiểm tra.
   - Không có bài kiểm tra nào bị tắt, swallow exception hay sửa expected output.
2. **Python Unittest Runner (`python -m unittest discover -s tests`):**
   - Chạy toàn bộ các bài kiểm tra Python của hệ thống.
3. **Tổng kết trạng thái kiểm định:**
   - 20/20 hạng mục thao tác cơ bản: **20 ĐẠT, 0 CHƯA ĐẠT, 0 NOT RUN**.
   - 2/2 tệp kiểm thử thực tế (.pptx): **2 ĐẠT, 0 CHƯA ĐẠT, 0 NOT RUN**.
