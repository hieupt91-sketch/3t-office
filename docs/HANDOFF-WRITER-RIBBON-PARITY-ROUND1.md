# BAO CAO BAN GIAO: VN WRITER RIBBON PARITY - ROUND 1 (4 TAB DAU)

- **Nhanh**: fix/writer-ribbon-parity-round1 (tach tu main, KHONG merge vao main)
- **Worktree**: E:\VNOffice-agy-writer-ribbon-parity-r1
- **Tac gia**: agy (UI/Design Agent)
- **Trang thai**: Hoan tat 4/4 tab (Home, Insert, Design, Layout)
- **Kiem thu chat luong**:
  - node tests/run-tests.js: 1259/1259 PASS (100%)
  - node tests/live/ribbon-audit-1280.playwright.mjs: 104/104 PASS (0px tran ngang tai 1280px o ca Tieng Viet & Tieng Anh)
  - Live browser interactive test: PASS (100% nut hoat dong, 0 loi DOM/runtime)

---

## 1. Tong quan va chien luoc sap xep

Dot nay tap trung vao viec sap xep lai cau truc nhom lenh va thu tu cac nut tren 4 tab dau tien cua VN Writer (Home, Insert, Design, Layout) de tuong duong voi Microsoft Word that, dac biet la quy trinh thiet lap trang/bo cuc va in an.

Nguyen tac tuan thu nghiem ngat:
1. Chi lam UI/Thiet ke - Khong sua logic tinh toan, xu ly lenh, hoac serializer ODF/OOXML.
2. Khong bia lenh gia - Cac tinh nang Word co ma engine VN Writer chua ho tro duoc ghi nhan chi tiet thanh danh sach GAP cho Grok/Codex, tuyet doi khong tao command rong.
3. Tai su dung command that - Cac lenh Paragraph (thut le, gian dong) da co trong engine duoc dua them vao tab Layout dung chuan Word.
4. Bao toan 0px tran ngang tai 1280px - Moi thay doi deu duoc do dac that bang Playwright tai 1280x800 va 1280x720, dam bao khong co thanh cuon ngang.
5. Commit doc lap tung tab - Moi tab duoc kiem thu va commit rieng re ngay sau khi hoan thanh.

---

## 2. Bang doi chieu chi tiet tung tab

### 2.1. Tab Trang dau (Home)

| Thanh phan | Chuan Microsoft Word | Hien trang VN Writer truoc dot | Da sap xep / xu ly trong dot nay | GAP con lai can Grok / Codex |
|---|---|---|---|---|
| Bang nho tam (Clipboard) | Paste, Cut, Copy, Format Painter | Da co Paste (large), Cut, Copy, Format Painter | Giu nguyen vi da chuan 100% | Khong co |
| Phong chu (Font) - Dong 1 | Font Family, Font Size, Grow, Shrink, Change Case, Clear All Formatting | Family, Size, Grow, Shrink | Giu can doi kich thuoc dong 1 (~270px) tranh phinh ngang lam tran Home tab o 1280px | Text Effects & Typography (chua co trong engine) |
| Phong chu (Font) - Dong 2 | Bold, Italic, Underline, Strikethrough, Subscript, Superscript, Text Effects, Highlight, Font Color | Bold, Italic, Underline, Subscript, Superscript, Strike, Change Case, Clear Format, Text Color, Highlight | Sap xep lai thu tu: Bold - Italic - Underline - Strikethrough - Subscript - Superscript - Change Case - Clear Format - Highlight - Text Color (chuan vi tri Word) | Da dong bo |
| Doan van (Paragraph) - Dong 1 | Bullets, Numbering, Multilevel List, Decrease Indent, Increase Indent, Sort, Show/Hide Marks | Bullets, Numbering, Sort, Show Marks, Indent Dec, Indent Inc | Doi vi tri: dua Decrease/Increase Indent len ngay sau Bullets/Numbering, sau do moi den Sort va Show Formatting Marks | Multilevel List (danh sach da cap - can engine danh sach so) |
| Doan van (Paragraph) - Dong 2 | Align Left, Center, Right, Justify, Line Spacing, Shading, Borders | Align Left, Center, Right, Justify, Line Spacing (1.0/1.5/2.0), Shading, Borders | Chuan vi tri Word, giu nguyen | Borders dialog nang cao |
| Kieu dang (Styles) | Quick Styles Gallery Strip + Thu vien kieu dang | Style Gallery (large) + Quick Styles Strip (6 style chuan) | Giu nguyen (da chuan Word) | Tuy bien tao Style moi |
| Chinh sua (Editing) | Find, Replace, Select (Select All, Select Objects) | Find, Replace, Select dropdown (Select All) | Giu nguyen, day du 3 chuc nang | Select Objects (chon doi tuong hinh) |

### 2.2. Tab Chen (Insert)

| Thanh phan | Chuan Microsoft Word | Hien trang VN Writer truoc dot | Da sap xep / xu ly trong dot nay | GAP con lai can Grok / Codex |
|---|---|---|---|---|
| Trang van ban (Pages) | Cover Page, Blank Page, Page Break | Page Break (large) | Chuan hoa id: pages | Cover Page, Blank Page |
| Bang bieu (Tables) | Table | Table (large) | Chuan hoa id: tables | Quick Tables |
| Minh hoa (Illustrations) | Pictures, Shapes, Icons, SmartArt, Chart, Screenshot | Image, Shape, Diagram, Chart | Giu nguyen 4 nut vector lon theo dung thu tu | Icons (SVG library), Screenshot |
| Lien ket (Links) | Hyperlink, Bookmark, Cross-reference | Hyperlink (large), Bookmark, Cross-reference | Giu nguyen (day du ca 3) | Khong co |
| Ghi chu (Comments) | Comment | Comment (large) | Giu nguyen | Khong co |
| Dau/Chan trang (Header & Footer) | Header, Footer, Page Number | Header (large), Footer (large) | Chuan hoa id: headerFooter | Page Number menu rieng |
| Van ban (Text) | Text Box, Quick Parts, WordArt, Drop Cap, Signature Line, Date & Time, Object | Text Box (large), WordArt (large), Drop Cap, Date & Time | Giu nguyen cau truc | Quick Parts/AutoText, Signature Line, Object OLE |
| Ky hieu (Symbols) | Equation, Symbol | Equation (large), Symbol (large) | Giu nguyen day du | Equation Builder nang cao |

### 2.3. Tab Thiet ke (Design)

| Thanh phan | Chuan Microsoft Word | Hien trang VN Writer truoc dot | Da sap xep / xu ly trong dot nay | GAP con lai can Grok / Codex |
|---|---|---|---|---|
| Dinh dang tai lieu (Document Formatting) | Themes/Style Set gallery, Colors, Fonts, Paragraph Spacing, Effects, Set as Default | Theme Gallery (large) bao gom font, mau, gian dong | Giu nguyen nut writer.design.themeGallery chuan | Color Palette picker rieng, Font picker theo theme |
| Nen & Vien trang (Page Background) | Watermark, Page Color, Page Borders | Watermark, Page Color, Page Border | Chuan hoa id: pageBackground, giu dung thu tu: Watermark - Page Color - Page Border | Picture Watermark tuy bien |

### 2.4. Tab Bo cuc (Layout)

| Thanh phan | Chuan Microsoft Word | Hien trang VN Writer truoc dot | Da sap xep / xu ly trong dot nay | GAP con lai can Grok / Codex |
|---|---|---|---|---|
| Thiet lap trang (Page Setup) | Margins, Orientation, Size, Columns, Breaks, Line Numbers, Hyphenation | Margins, Orientation, Size, Breaks dropdown, Columns, Columns 1/2/3 | Sap xep lai dung thu tu chuan Word: Margins - Orientation - Size - Columns (kem chon nhanh 1/2/3) - Breaks (dropdown co lon) | Line Numbers (engine chua co logic), Hyphenation (engine chua co logic) |
| Doan van (Paragraph) | Indent Left, Indent Right, Spacing Before, Spacing After | Chua co tren tab Layout | Da bo sung nhom paragraph tren Layout gom: Giam thut le (writer.para.indentDec), Thut le (writer.para.indentInc) va Dropdown Gian dong (writer.para.spacing1/15/2, tai su dung command da co) | Spinbox do khoang cach Before/After theo point (pt) |
| Nen & Vien trang (Page Background) | Word de o tab Design (Writer giu o ca Layout de in an tien loi va tuong thich nguoc) | Watermark, Border | Giu nguyen tren Layout theo yeu cau tuong thich nguoc & tien loi in an | Da dong bo |
| In an (Print) | Word dua vao Backstage (VN Writer dua len ribbon Layout de in an/soat trang nhanh) | In tai lieu (Print), Xem truoc khi in (Print Preview) | Chuan hoa id: print, dat o cuoi tab Layout sau thiet lap trang | Da dong bo |
| Sap xep doi tuong (Arrange) | Position, Wrap Text, Bring Forward, Send Backward, Selection Pane, Align, Group, Rotate | Hien nam tren tab ngu canh pictureFormat (kich hoat khi chon anh) | Giu nguyen tren tab ngu canh pictureFormat cho anh dang chon (dung logic Word) | Selection Pane, Group/Rotate shape trong Writer |

---

## 3. Lich su commit tren branch fix/writer-ribbon-parity-round1

1. ca596a1: fix(writer/ribbon): sap xep tab Home theo chuan Microsoft Word (Font va Paragraph)
2. 69cb7e4: fix(writer/ribbon): chuan hoa id va cau truc nhom tab Insert theo Microsoft Word
3. 41db4df: fix(writer/ribbon): chuan hoa id nhom pageBackground tab Design theo Microsoft Word
4. cb99246: fix(writer/ribbon): sap xep tab Layout theo chuan Microsoft Word (Page Setup, Paragraph, Page Background, Print)

---

## 4. Danh sach GAP ky thuat ban giao cho Grok / Codex

Cac tinh nang chuan Microsoft Word ma VN Writer chua co engine/command xu ly ngam (khong thuoc pham vi UI-only):

1. **Line Numbers (Danh so dong)**: cho phep danh so tung dong van ban (Continuous, Restart Each Page, Restart Each Section). Can engine phan trang live dem dong that va render so dong o le trai, serialize vao FODT/DOCX.
2. **Hyphenation (Ngat noi tu tu dong)**: tu dong chen dau gach noi ngat tu o cuoi dong. Can tu dien am tiet tieng Viet/tieng Anh va thuat toan hyphenation tren canvas text rendering.
3. **Selection Pane (Ngan chon doi tuong)**: sidebar hien thi danh sach tat ca hinh anh/so do/bieu do/shape tren trang de an-hien hoac doi thu tu z-index. Can quan ly danh sach ID doi tuong trong WriterAdapter.shapes va img elements.
4. **Spacing Before/After Spinboxes**: nhap thong so gian doan truoc/sau theo don vi pt. Hien Writer moi ho tro line spacing (1.0/1.5/2.0); can bo sung margin-top/margin-bottom paragraph property va luu vao FODT.
5. **Multilevel List (Danh sach da cap)**: danh so 1., 1.1., 1.1.1., a., b. theo chuan phan cap. Can bo sung engine dem cap the danh sach co counter CSS/LibreOffice list styles.
