# BÁO CÁO BÀN GIAO: VN WRITER RIBBON PARITY — ROUND 1 (4 TAB ĐẦU)

> **Nhánh**: ix/writer-ribbon-parity-round1 (tách từ main, KHÔNG merge vào main)  
> **Worktree**: E:\VNOffice-agy-writer-ribbon-parity-r1  
> **Tác giả**: agy (UI/Design Agent)  
> **Trạng thái**: Hoàn tất 4/4 tab (Home, Insert, Design, Layout)  
> **Kiểm thử chất lượng**:  
> - 
ode tests/run-tests.js: **1259/1259 PASS (100%)**  
> - 
ode tests/live/ribbon-audit-1280.playwright.mjs: **104/104 PASS (0px tràn ngang tại 1280px ở cả Tiếng Việt & Tiếng Anh)**  
> - Live browser interactive test: **PASS (100% nút hoạt động, 0 lỗi DOM/runtime)**

---

## 1. TỔNG QUAN VÀ CHIẾN LƯỢC SẮP XẾP

Đợt này tập trung vào việc **sắp xếp lại cấu trúc nhóm lệnh và thứ tự các nút** trên 4 tab đầu tiên của VN Writer (**Home, Insert, Design, Layout**) để tương đương với **Microsoft Word thật**, đặc biệt là quy trình thiết lập trang/bố cục và in ấn.

Nguyên tắc tuân thủ nghiêm ngặt:
1. **Chỉ làm UI/Thiết kế**: Không sửa logic tính toán, xử lý lệnh, hoặc serializer ODF/OOXML.
2. **Không bịa lệnh giả**: Các tính năng Word có mà engine VN Writer chưa hỗ trợ được ghi nhận chi tiết thành danh sách GAP cho Grok/Codex, tuyệt đối không tạo command rỗng.
3. **Tái sử dụng command thật**: Các lệnh Paragraph (thụt lề, giãn dòng) đã có trong engine được đưa thêm vào tab Layout đúng chuẩn Word.
4. **Bảo toàn 0px tràn ngang tại 1280px**: Mọi thay đổi đều được đo đạc thật bằng Playwright tại 1280x800 và 1280x720, đảm bảo không có thanh cuộn ngang.
5. **Commit độc lập từng tab**: Mỗi tab được kiểm thử và commit riêng rẽ ngay sau khi hoàn thành.

---

## 2. BẢNG ĐỐI CHIẾU CHI TIẾT TỪNG TAB

### 2.1. Tab Trang đầu (Home)

| Thành phần | Chuẩn Microsoft Word | Hiện trạng VN Writer trước đợt | Đã sắp xếp / xử lý trong đợt này | GAP còn lại cần Grok / Codex |
|---|---|---|---|---|
| **Bảng nhớ tạm (Clipboard)** | Paste, Cut, Copy, Format Painter | Đã có Paste (large), Cut, Copy, Format Painter | Giữ nguyên vì đã chuẩn 100% | Không có |
| **Phông chữ (Font) — Dòng 1** | Font Family, Font Size, Grow, Shrink, Change Case, Clear All Formatting | Family, Size, Grow, Shrink | Giữ cân đối kích thước dòng 1 (~270px) tránh phình ngang làm tràn Home tab ở 1280px | Text Effects & Typography (chưa có trong engine) |
| **Phông chữ (Font) — Dòng 2** | Bold, Italic, Underline, Strikethrough, Subscript, Superscript, Text Effects, Highlight, Font Color | Bold, Italic, Underline, Subscript, Superscript, Strike, Change Case, Clear Format, Text Color, Highlight | Sắp xếp lại thứ tự: Bold → Italic → Underline → **Strikethrough** → Subscript → Superscript → Change Case → Clear Format → **Highlight** → **Text Color** (chuẩn vị trí Word) | Đã đồng bộ |
| **Đoạn văn (Paragraph) — Dòng 1** | Bullets, Numbering, Multilevel List, Decrease Indent, Increase Indent, Sort, Show/Hide Marks (¶) | Bullets, Numbering, Sort, Show Marks, Indent Dec, Indent Inc | Đổi vị trí: Đưa **Decrease Indent & Increase Indent** lên ngay sau Bullets/Numbering, sau đó mới đến **Sort** và **Show Formatting Marks (¶)** | Multilevel List (danh sách đa cấp — cần engine danh sách số) |
| **Đoạn văn (Paragraph) — Dòng 2** | Align Left, Center, Right, Justify, Line Spacing, Shading, Borders | Align Left, Center, Right, Justify, Line Spacing (1.0/1.5/2.0), Shading, Borders | Chuẩn vị trí Word, giữ nguyên | Borders dialog nâng cao |
| **Kiểu dáng (Styles)** | Quick Styles Gallery Strip + Thư viện kiểu dáng | Style Gallery (large) + Quick Styles Strip (6 style chuẩn) | Giữ nguyên (đã chuẩn Word, tuân thủ one-feature-one-display) | Tùy biến tạo Style mới |
| **Chỉnh sửa (Editing)** | Find, Replace, Select (Select All, Select Objects) | Find, Replace, Select dropdown (Select All) | Giữ nguyên, đầy đủ 3 chức năng | Select Objects (chọn đối tượng hình) |

---

### 2.2. Tab Chèn (Insert)

| Thành phần | Chuẩn Microsoft Word | Hiện trạng VN Writer trước đợt | Đã sắp xếp / xử lý trong đợt này | GAP còn lại cần Grok / Codex |
|---|---|---|---|---|
| **Trang văn bản (Pages)** | Cover Page, Blank Page, Page Break | Page Break (large) | Chuẩn hóa id: "pages" | Cover Page (Trang bìa mẫu), Blank Page (Trang trắng) |
| **Bảng biểu (Tables)** | Table | Table (large) | Chuẩn hóa id: "tables" | Quick Tables (Bảng mẫu định dạng sẵn) |
| **Minh họa (Illustrations)** | Pictures, Shapes, Icons, SmartArt, Chart, Screenshot | Image, Shape, Diagram, Chart | Giữ nguyên 4 nút vector lớn theo đúng thứ tự | Icons (SVG library), Screenshot (chụp màn hình) |
| **Liên kết (Links)** | Hyperlink, Bookmark, Cross-reference | Hyperlink (large), Bookmark, Cross-reference | Giữ nguyên (đầy đủ cả 3) | Không có |
| **Ghi chú (Comments)** | Comment | Comment (large) | Giữ nguyên | Không có |
| **Đầu/Chân trang (Header & Footer)** | Header, Footer, Page Number | Header (large), Footer (large) | Chuẩn hóa id: "headerFooter" | Page Number menu riêng (hiện đang chèn qua template footer) |
| **Văn bản (Text)** | Text Box, Quick Parts, WordArt, Drop Cap, Signature Line, Date & Time, Object | Text Box (large), WordArt (large), Drop Cap, Date & Time | Giữ nguyên cấu trúc | Quick Parts / AutoText, Signature Line, Object OLE |
| **Ký hiệu (Symbols)** | Equation, Symbol | Equation (large), Symbol (large) | Giữ nguyên đầy đủ | Equation Builder nâng cao |

---

### 2.3. Tab Thiết kế (Design)

| Thành phần | Chuẩn Microsoft Word | Hiện trạng VN Writer trước đợt | Đã sắp xếp / xử lý trong đợt này | GAP còn lại cần Grok / Codex |
|---|---|---|---|---|
| **Định dạng tài liệu (Document Formatting)** | Themes / Style Set gallery, Colors, Fonts, Paragraph Spacing, Effects, Set as Default | Theme Gallery (large) bao gồm font, màu, giãn dòng | Giữ nguyên nút writer.design.themeGallery chuẩn | Bộ chọn màu theme riêng rẽ (Color Palette picker), Font picker theo theme |
| **Nền & Viền trang (Page Background)** | Watermark, Page Color, Page Borders | Watermark, Page Color, Page Border | Chuẩn hóa id: "pageBackground", giữ đúng thứ tự: Watermark → Page Color → Page Border | Tùy biến Picture Watermark (hiện đã hỗ trợ Text Watermark) |

---

### 2.4. Tab Bố cục (Layout)

| Thành phần | Chuẩn Microsoft Word | Hiện trạng VN Writer trước đợt | Đã sắp xếp / xử lý trong đợt này | GAP còn lại cần Grok / Codex |
|---|---|---|---|---|
| **Thiết lập trang (Page Setup)** | Margins, Orientation, Size, Columns, Breaks, Line Numbers, Hyphenation | Margins, Orientation, Size, Breaks dropdown, Columns, Columns 1/2/3 | Sắp xếp lại thứ tự đúng chuẩn Word: **Margins → Orientation → Size → Columns (kèm chọn nhanh 1/2/3) → Breaks (dropdown cỡ lớn)** | Line Numbers (Đánh số dòng — engine chưa có logic), Hyphenation (Gạch nối từ — engine chưa có logic) |
| **Đoạn văn (Paragraph)** | Indent Left, Indent Right, Spacing Before, Spacing After | Chưa có trên tab Layout | **ĐÃ BỔ SUNG** nhóm paragraph trên Layout gồm: Giảm thụt lề (writer.para.indentDec), Thụt lề (writer.para.indentInc) và Dropdown Giãn dòng (writer.para.lineSpacingLayout 1.0, 1.5, 2.0) | Spinbox đo lường khoảng cách Before/After theo point (pt) |
| **Nền & Viền trang (Page Background)** | Word để ở tab Design (nhưng Writer giữ ở cả Layout để in ấn tiện lợi và tương thích ngược) | Watermark, Border | Giữ nguyên trên Layout theo yêu cầu tương thích ngược & tiện lợi in ấn | Đã đồng bộ |
| **In ấn (Print)** | Word đưa vào Backstage (nhưng VN Writer đưa lên ribbon Layout để in ấn/soát trang nhanh) | In tài liệu (Print), Xem trước khi in (Print Preview) | Chuẩn hóa id: "print", đặt ở cuối tab Layout sau thiết lập trang | Đã đồng bộ |
| **Sắp xếp đối tượng (Arrange)** | Position, Wrap Text, Bring Forward, Send Backward, Selection Pane, Align, Group, Rotate | Hiện nằm trên tab ngữ cảnh pictureFormat (Định dạng Hình ảnh) kích hoạt khi nhấp chọn ảnh | Giữ nguyên trên tab ngữ cảnh pictureFormat cho ảnh đang chọn (đúng logic Word) | Selection Pane (Bảng quản lý danh sách layer đối tượng), Group/Rotate shape trong Writer |

---

## 3. LỊCH SỬ COMMIT TRÊN BRANCH ix/writer-ribbon-parity-round1

1. ca596a1: ix(writer/ribbon): sap xep tab Home theo chuan Microsoft Word (Font va Paragraph)
2. 69cb7e4: ix(writer/ribbon): chuan hoa id va cau truc nhom tab Insert theo Microsoft Word
3. 41db4df: ix(writer/ribbon): chuan hoa id nhom pageBackground tab Design theo Microsoft Word
4. cb99246: ix(writer/ribbon): sap xep tab Layout theo chuan Microsoft Word (Page Setup, Paragraph, Page Background, Print)

---

## 4. DANH SÁCH GAP KỸ THUẬT BÀN GIAO CHO GROK / CODEX

Dưới đây là các tính năng chuẩn Microsoft Word mà VN Writer **chưa có engine/command xử lý ngầm** (không thuộc phạm vi UI-only):

1. **Line Numbers (Đánh số dòng)**:
   - *Mô tả*: Cho phép đánh số từng dòng văn bản (Continuous, Restart Each Page, Restart Each Section).
   - *Yêu cầu Grok/Codex*: Cần engine phân trang live đếm dòng thật và render số dòng ở lề trái, serialize vào FODT/DOCX <w:lnNumType>.
2. **Hyphenation (Ngắt nối từ tự động)**:
   - *Mô tả*: Tự động chèn dấu gạch nối ngắt từ ở cuối dòng để căn đều đẹp mắt.
   - *Yêu cầu Grok/Codex*: Cần từ điển âm tiết tiếng Việt/tiếng Anh và thuật toán hyphenation trên canvas text rendering.
3. **Selection Pane (Ngăn chọn đối tượng)**:
   - *Mô tả*: Sidebar hiển thị danh sách tất cả hình ảnh, sơ đồ, biểu đồ, shape trên trang để ẩn/hiện hoặc đổi thứ tự z-index.
   - *Yêu cầu Grok/Codex*: Quản lý danh sách ID đối tượng trong WriterAdapter.shapes và img elements.
4. **Spacing Before / Spacing After Spinboxes**:
   - *Mô tả*: Nhập thông số giãn đoạn trước/sau theo đơn vị pt.
   - *Yêu cầu Grok/Codex*: Hiện tại Writer mới hỗ trợ line spacing (giãn dòng 1.0, 1.5, 2.0); cần bổ sung margin-top / margin-bottom paragraph property và lưu vào FODT o:margin-top, o:margin-bottom.
5. **Multilevel List (Danh sách đa cấp)**:
   - *Mô tả*: Đánh số 1., 1.1., 1.1.1., a., b. theo chuẩn phân cấp Nghị định 30.
   - *Yêu cầu Grok/Codex*: Bổ sung engine đếm cấp thẻ danh sách có counter CSS / LibreOffice list styles.
