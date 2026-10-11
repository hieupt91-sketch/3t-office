# BAO CAO BAN GIAO: VN WRITER RIBBON PARITY - ROUND 2 (4 TAB CON LAI)

- Nhanh: fix/writer-ribbon-parity-round2 (tach tu main, KHONG merge vao main)
- Worktree: E:\VNOffice-agy-writer-ribbon-parity-r2
- Tac gia: agy (UI/Design Agent)
- Trang thai: Hoan tat 4/4 tab (References, Mailings, Review, View)
- Kiem thu chat luong:
  - node tests/run-tests.js: 1277/1277 PASS (100%)
  - node tests/live/ribbon-audit-1280.playwright.mjs: 104/104 PASS (0px tran ngang tai 1280px o ca Tieng Viet va Tieng Anh)
  - Live browser interactive click test: PASS (100% nut thu gon hoat dong binh thuong, 0 loi DOM/runtime)

---

## 1. Tong quan va chien luoc thuc hien

Dot nay la dot 2 (tiep noi dot 1 da merge vao main), hoan tat 4 tab con lai cua VN Writer: Tham chieu (References), Tron thu (Mailings), Danh gia (Review), Che do xem (View) doi chieu truc tiep voi Microsoft Word chuan.

Cac nguyen tac tuan thu nghiem ngat:
1. Chi lam UI/Thiet ke: Khong sua bat ky logic tinh toan, serializer hay command handler nao.
2. Khong bia lenh gia: Neu Word co ma app chua co logic, ghi nhan ro thanh GAP cho Grok/Codex, khong tao command rong.
3. Tai su dung command co san: Dua lenh Tham chieu cheo (writer.insert.crossReference) da co san trong app vao nhom Chu thich anh tren tab Tham chieu theo dung thiet ke Microsoft Word.
4. Chuan hoa ID nhom: Toan bo cac nhom tren ca 4 tab deu co thuoc tinh id ro rang de CSS va test truy cap dong nhat.
5. Thu gon cot thong minh, giu 0px tran ngang tai 1280px: O tab Review (tung sat nguong 1245px tai 1280px), da to chuc lai cac nut Nhan xet (Xoa/Xu ly va Truoc/Sau) thanh 2 cot kep, giup be rong tab giam xuong 963px (VI) va 1038px (EN), du du khoang trong an toan tren man hinh 1280px.
6. Commit doc lap tung tab: Moi tab sau khi sua deu chay qua 100% bo test va commit rieng re.

---

## 2. Bang doi chieu chi tiet tung tab

### 2.1. Tab Tham chieu (References)

| Nhom Word chuan | Chuan Microsoft Word | Hien trang VN Writer truoc dot | Da xu ly trong dot 2 | GAP con lai cho Grok / Codex |
|---|---|---|---|---|
| Muc luc (tableOfContents) | Table of Contents, Add Text, Update Table | Co tocInsert (large), tocUpdate (large), chua co id nhom | Them id tableOfContents, giu nguyen 2 nut lon | Add Text (Them van ban vao muc luc theo Cap do 1, 2, 3) |
| Chu thich (footnotes) | Insert Footnote, Insert Endnote, Next Footnote, Show Notes | Co footnoteInsert (large), endnoteInsert (large), chua co id nhom | Them id footnotes, giu nguyen 2 nut lon | Next Footnote (split button chuyen chu thich tiep theo / truoc), Show Notes (hien thi vung chu thich) |
| Nghien cuu (Research) | Search / Researcher, Thesaurus | Chua co | Giu nguyen khong bia lenh gia | Researcher panel tra cuu tai lieu qua mang / Bing, Thesaurus (tu dien dong nghia) |
| Trich dan & Thu muc (citationsBibliography) | Insert Citation (large), Manage Sources, Style (select), Bibliography (large) | Co du 4 thanh phan nhung cot Manage Sources va Style bi dat truoc nut Insert Citation | Dao lai thu tu dung Word: Insert Citation (large) -> Cot Manage Sources va Style -> Bibliography (large). Bo sung id citationsBibliography | Dialog Manage Sources nang cao (Master list / Current list ODF) |
| Chu thich anh (captions) | Insert Caption (large), Insert Table of Figures, Update Table, Cross-reference | Co captionInsert (large), tofInsert (large), tofUpdate (large) | Chuyen tofInsert va tofUpdate vao cot nho, bo sung command co san writer.insert.crossReference vao nhom dung chuan Word. Them id captions | Custom Caption Label numbering builder |
| Chi muc (Index) | Mark Entry, Insert Index, Update Index | Chua co | Khong bia lenh gia | Mark Entry (danh dau muc tu chi muc), Insert Index (chen bang tra cuu chu de A-Z), Update Index |
| Bang tham quyen (Table of Authorities) | Mark Citation, Insert Table of Authorities | Chua co | Khong bia lenh gia | Mark Citation cho van ban luat / an le, Insert TOA |

### 2.2. Tab Tron thu (Mailings)

| Nhom Word chuan | Chuan Microsoft Word | Hien trang VN Writer truoc dot | Da xu ly trong dot 2 | GAP con lai cho Grok / Codex |
|---|---|---|---|---|
| Tao (createMailings) | Envelopes, Labels | Co envelopes (large), labels (large), thieu id nhom | Bo sung id createMailings | Custom printer feed options cho phong bi |
| Bat dau tron (startMerge) | Start Mail Merge, Select Recipients, Edit Recipient List | Co mailMerge.open (large) mo nguon CSV, thieu id nhom | Bo sung id startMerge | Step-by-Step Mail Merge Wizard, tach rieng Select Recipients (Type New List / Use Existing List / Outlook Contacts) |
| Viet & Chen truong (writeInsert) | Highlight Merge Fields, Address Block, Greeting Line, Insert Merge Field, Rules, Match Fields, Update Labels | Co mailMerge.insertField (large), thieu id nhom | Bo sung id writeInsert | Highlight Merge Fields (to sang truong tron), Address Block (khoi dia chi tu dong), Greeting Line (dong chao hoi "Kinh gui..."), Rules (If...Then...Else) |
| Xem truoc ket qua (previewResults) | Preview Results (large), nut dieu huong (First, Prev, So ban ghi, Next, Last), Find Recipient, Auto Check for Errors | Co preview (large), cot prevRecord, nextRecord, thieu id nhom | Bo sung id previewResults | Nhap so ban ghi truc tiep, nut First/Last record, Find Recipient, Auto Check for Errors |
| Hoan tat (finishMerge) | Finish & Merge | Co mailMerge.finish (large), thieu id nhom | Bo sung id finishMerge | Gui email truc tiep qua SMTP / MAPI |

### 2.3. Tab Danh gia (Review)

| Nhom Word chuan | Chuan Microsoft Word | Hien trang VN Writer truoc dot | Da xu ly trong dot 2 | GAP con lai cho Grok / Codex |
|---|---|---|---|---|
| Chinh ta & Ngu phap (proofread) | Spelling & Grammar, Thesaurus, Word Count | Co grammarCheck (large), wordCount (large), thieu id nhom | Bo sung id proofread | Thesaurus (tu dien dong nghia) |
| Giong noi (Speech) | Read Aloud | Khong co | Bo qua theo huong dan | Text-to-speech engine doc van ban tieng Viet |
| Tro nang (Accessibility) | Check Accessibility | Khong co | Bo qua theo huong dan | Bo kiem tra do tuong thich cho nguoi khiem thi |
| Ngon ngu (Language) | Translate, Language | Khong co | Khong bia lenh gia | Tich hop Translate API, Language preferences |
| Ghi chu (comments) | New Comment (large), Delete, Previous, Next, Show Comments / Resolve | Co comment.insert (large) va 4 nut rieng le ngang hang gay ton 450px lam sat nguong 1280px (1245px o ban EN) | Thu gon thanh 2 cot: Cot 1 (Delete, Resolve), Cot 2 (Previous, Next). Them id comments. Giam be rong tab con 963px (VI) / 1038px (EN) | Show Comments pane toggle |
| Theo doi thay doi (tracking) | Track Changes (large toggle), Display for Review, Show Markup, Reviewing Pane | Co trackChanges.toggle va cac cot accept/reject/nav xep lan lon | Sap xep lai theo dung Word: Toggle (large) -> Cot Chap nhan (acceptOne, acceptAll) -> Cot Tu choi (rejectOne, rejectAll) -> Cot Dieu huong (previous, next). Them id tracking | Display for Review (Simple Markup / All Markup / No Markup / Original), Show Markup filter, Reviewing Pane |
| So sanh (Compare) | Compare documents, Combine | Khong co | Bo qua theo huong dan | Engine so sanh 2 phien ban tai lieu docx |
| Bao ve (Protect) | Restrict Editing, Block Authors | Khong co | Khong bia lenh gia | Restrict Editing (khoa chi cho phep comment hoac form filling) |

### 2.4. Tab Che do xem (View)

| Nhom Word chuan | Chuan Microsoft Word | Hien trang VN Writer truoc dot | Da xu ly trong dot 2 | GAP con lai cho Grok / Codex |
|---|---|---|---|---|
| Dang xem (views) | Read Mode, Print Layout, Web Layout, Outline, Draft | Co readMode (large), printLayout (large), webLayout (large), thieu id nhom | Bo sung id views, giu dung thu tu Word | Outline view (danh muc phan cap tieu de), Draft view (soan thao nhanh khong hien le trang) |
| Hoc tap (Immersive) | Immersive Reader | Khong co | Bo qua theo huong dan | Immersive Reader (chinh khoang cach chu, nen sepia/dark) |
| Chuyen dong trang (Page Movement) | Vertical, Side to Side | Khong co | Bo qua theo huong dan | Side to side page flipping view |
| Hien thi (show) | Ruler, Gridlines, Navigation Pane | Co ruler, gridlines, da co id show | Giu nguyen 2 nut | Navigation Pane (tim kiem tieu de va trang truc quan ben trai) |
| Thu phong (zoom) | Zoom (large), 100% (large), Page Width, One Page, Multiple Pages | Co zoomIn (large) va 2 cot nho, nut 100% bi giau trong cot | Chuyen nut 100% (writer.view.zoom100) thanh nut lon dung chuan Word; gop cac nut phu (zoomOut, pageWidth, zoomReset) vao 1 cot 3 hang gon gang. Them id zoom | One Page, Multiple Pages tile view |
| Cua so (window) | New Window, Arrange All, Split, View Side by Side, Switch Windows | Co newWindow (large), thieu id nhom | Bo sung id window | Arrange All (sap xep tat ca cua so), Split (chia doi man hinh soan thao), View Side by Side |
| Macro | Macros view | Khong co | Bo qua theo huong dan | StarBasic / Python Macro IDE |

---

## 3. Tham chieu cheo ve cac tinh nang dang duoc giao phan cong khac

- Spacing Before/After (Khoang cach truoc/sau doan van): Dot 1 da ghi nhan GAP va ban giao cho Grok/Codex xu ly engine/logic. Dot 2 nay tuan thu tuyet doi khong tu y can thiep vao phan logic nay de tranh trung lap ma nguon.

---

## 4. Danh sach commit tren nhanh fix/writer-ribbon-parity-round2

1. Commit a1709cd: fix(writer/ribbon): sap xep tab References theo chuan Microsoft Word
2. Commit e44995e: fix(writer/ribbon): chuan hoa id cac nhom tab Mailings theo Microsoft Word
3. Commit ef8fd21: fix(writer/ribbon): sap xep tab Review theo chuan Microsoft Word
4. Commit 88fb344: fix(writer/ribbon): sap xep tab View theo chuan Microsoft Word

---

## 5. Ket qua do luong Ribbon Audit tai 1280px

- Tong so luot kiem tra Playwright: 104 luot (26 tab x 2 do phan giai x 2 ngon ngu).
- 100% PASS, 0px tran ngang tren toan bo cac tab.
- So lieu be rong cu the cua 4 tab dot nay tai 1280px:
  - Tab References: 974px (VI) / 969px (EN) -> An toan tuyet doi (< 1280px).
  - Tab Mailings: 634px (VI) / 681px (EN) -> An toan tuyet doi (< 1280px).
  - Tab Review: 963px (VI) / 1038px (EN) -> Du hon 240px khoang dem tai 1280px sau khi gom cot Nhan xet.
  - Tab View: 642px (VI) / 641px (EN) -> An toan tuyet doi (< 1280px).


> **Correction 2026-09-14 (Claude):** every MYTIME page count in this document was measured with Word COM ComputeStatistics(wdStatisticPages), which is wrong in a hidden window (it reports 88 for a 44-page document). Word's PDF export of the original MYTIME has **44** pages; the edited-save output currently has **73** (43 section breaks lost). Use _word_oracle3.ps1 (PDF-based) going forward. See HANDOFF-WRITER-SAVE-SECTIONS*.md.
