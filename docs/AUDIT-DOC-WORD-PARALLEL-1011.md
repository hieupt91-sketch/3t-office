# Đối chiếu VN Writer với Word thật — 11/10/2026

## Kế hoạch (FIX-T7)
- **Mục tiêu:** khớp lưu DOCX với Word COM cho các sai lệch đã tái hiện; lập và mở rộng ma trận đối chiếu theo nhóm trong ticket.
- **Năng lực hiện tại:** harness chạy CommandBus trên app desktop, lưu DOCX thật, rồi dùng Word COM đọc thuộc tính. Bộ đầu có 20 thao tác Trang đầu.
- **Files/modules:** hậu xử lý DOCX `ooxml_zip_patch.py`, unit test Writer, harness `scripts/audit-0610/word_parallel`, báo cáo và handoff. Không sửa LibreOffice Core, không thêm dependency.
- **Dependency:** LibreOffice chuyển DOCX; Word COM cục bộ làm oracle. App dùng `VNO_APP_ROOT=E:\VNOffice-codex-ft7`, `VNO_CDP_LOCALAPPDATA=E:\VNOffice-profiles\codex-ft7`, CDP chọn cổng trống cho từng phiên.
- **Rủi ro:** HTML import của LibreOffice có thể chia run hoặc làm tròn số đo; sửa theo nội dung được đánh dấu và kiểm tra page count bộ DOCX hồi quy.
- **Kiểm thử:** unit, npm, unittest, audit COM, mở/lưu lại highlight Word, batch d01/d07/d13/d20/d24.
- **Rollback:** các thay đổi DOCX cô lập trong adapter; bỏ commit fix T7 nếu hồi quy tài liệu thất bại.

## Kế hoạch đối chiếu mở rộng (FIX-T8)
- **Mục tiêu:** hoàn tất lần lượt các nhóm Bảng, Bố cục trang, Heading 1–3, Kiểu/Tham chiếu, Ghi chú, Theo dõi thay đổi, Tìm/Thay, Ký hiệu, TextBox/Hình khối/Hình ảnh theo Word COM làm chuẩn; chỉ kết luận KHỚP khi app và Word cùng thao tác trên DOCX thật rồi đọc lại thuộc tính trong Word.
- **Năng lực hiện tại:** app có các command Writer cho bảng, bố cục/section, style, TOC/footnote, comments/track changes, find/replace, symbol và textbox; harness hiện mới đối chiếu Trang đầu, Heading và số cột.
- **Files/modules:** harness trong `scripts/audit-0610/word_parallel/`, ma trận trong tài liệu này, help Writer hiện có và handoff theo mẫu. Chỉ sửa adapter/app khi đo được sai lệch tái hiện, trong đúng vùng Writer/adapter.
- **Dependency:** Word COM cục bộ làm oracle; app desktop khởi chạy qua `main.py`. Dùng `VNO_APP_ROOT=E:\VNOffice-codex-ft8`, profile riêng `VNO_CDP_LOCALAPPDATA=E:\VNOffice-profiles\codex-ft8`, cổng CDP tự cấp bởi `tests/live/cdp/session.mjs`.
- **Rủi ro:** Word có thể chuẩn hóa XML/giá trị khi mở hoặc lưu; section, style theo theme và tracked changes có semantics phụ thuộc tài liệu. Không áp sửa toàn cục nếu chưa xác định quy tắc tương thích.
- **Kiểm thử:** từng nhóm chạy trên desktop và Word COM, đối chiếu thuộc tính; sau các thay đổi chạy `npm test`, Python unittest và batch DOCX d01/d07/d13/d20/d24; ghi đúng PASS/FAIL/NOT RUN/BLOCKED.
- **Rollback:** mỗi nhóm là commit riêng theo ticket; nếu nhóm gây hồi quy, revert riêng commit nhóm đó.

## Đối chiếu Trang đầu

| Phép thử | App | Word COM | Kết quả |
|---|---:|---:|---|
| Bold | PASS | PASS | KHỚP |
| Italic | PASS | PASS | KHỚP |
| Underline | PASS | PASS | KHỚP |
| Strike | PASS | PASS | KHỚP |
| Subscript | PASS | PASS | KHỚP |
| Superscript | PASS | PASS | KHỚP |
| Cỡ chữ 16 | PASS | PASS | KHỚP |
| Phông Arial | PASS | PASS | KHỚP |
| Màu chữ đỏ | PASS | PASS | KHỚP |
| Highlight vàng | PASS | PASS | KHỚP |
| Căn giữa | PASS | PASS | KHỚP |
| Căn phải | PASS | PASS | KHỚP |
| Căn đều | PASS | PASS | KHỚP |
| Bullet | PASS | PASS | KHỚP |
| Numbered | PASS | PASS | KHỚP |
| Tăng thụt lề | PASS | PASS | KHỚP |
| Giãn dòng 1.5 | PASS | PASS | KHỚP |
| SpaceBefore 12 pt | PASS | PASS | KHỚP |
| SpaceAfter 12 pt | PASS | PASS | KHỚP |
| Đổi hoa | PASS | PASS | KHỚP |
| Baseline SpaceAfter `0.28cm`, không lệnh định dạng | 8 pt / 160 twips | 8 pt | KHỚP |
| Word Highlight vàng → mở/lưu lại bằng app | `w:highlight yellow` còn nguyên | `HighlightColorIndex=7` nguồn | KHỚP |

Lượt so sánh COM cuối: **21/21 KHỚP**. Hai lượt chẩn đoán trước có các lệch thật: `ListType` 4 và indent 35.5 pt; `SpaceAfter` 7.9 pt. Sau sửa, cả ListType và LeftIndent 36 pt đã khớp trong Word COM.

## Đối chiếu nhóm mở rộng

| Nhóm | App | Word COM | Kết quả |
|---|---|---|---|
| Bảng: chèn bảng 3×4; thêm hàng dưới; thêm cột phải; xóa hàng | Đã chạy; số ô sau thao tác khớp | Đã chạy COM; số ô sau thao tác khớp | KHỚP |
| Bảng: gộp/tách ngang; Ctrl+Z sau tách | Đã chạy; số ô khớp, Ctrl+Z trả về trạng thái gộp | Đã chạy; số ô khớp, Undo trả về trạng thái gộp | KHỚP |
| Bảng: căn giữa dọc; lặp hàng tiêu đề | Đã chạy: `VerticalAlignment=1`, `HeadingFormat=-1` | Đã chạy: `VerticalAlignment=1`, `HeadingFormat=-1` | KHỚP |
| Bảng: xóa cột, gộp/tách dọc, căn ngang, nền/viền, AutoFit, chiều cao/rộng | CDP + DOCX đã lưu; Word COM đọc lại | Word COM thao tác tương đương; kích thước XML khớp | KHỚP (viền/đo chiều cao có ghi chú) |
| Bố cục trang: A4/A5/Letter, lề Normal/Narrow/Moderate/Wide, hướng | CDP + DOCX; COM đọc lại kích thước/lề | Word COM đối chứng A4/A5; Letter đọc COM | KHỚP |
| Bố cục trang: 1/2/3 cột | Đã chạy | Đã chạy | 3/3 KHỚP |
| Đầu/chân trang, trang đầu khác, chẵn/lẻ, số trang | CDP + DOCX đã lưu; `differentFirstPage=true`, `differentOddEven=true`, start=3 | Word COM đọc `DifferentFirstPage=-1`, `OddAndEven=-1`, `StartingNumber=3`; header/footer chính khớp | KHỚP cờ/field; app chưa có vùng nhập nội dung riêng cho header/footer trang đầu và chẵn/lẻ |
| Ngắt trang; mục NextPage/Continuous/EvenPage/OddPage | CDP + DOCX đã lưu; 5 section | Word COM đọc 5 section, đúng loại bắt đầu | KHỚP |
| Mục lục tự động + Heading 1 | CDP tạo, sửa Heading rồi cập nhật; Word COM đọc lại | COM tạo/cập nhật tương đương | KHỚP; TOC có heading đã sửa |
| Chú thích trang/cuối trang và cuối tài liệu | CDP thêm nội dung `Footnote content`/`Endnote content` | Word COM tạo và đọc lại | KHỚP: mỗi loại 1, nội dung đúng |
| Tham chiếu chéo | CDP chèn tới `Target heading`; Word đọc lại | COM tạo REF field/bookmark cùng kết quả | KHỚP |
| Danh mục hình | CDP chèn 2 caption, tạo ToF; Word COM đọc lại | COM tạo caption và ToF native | KHỚP: 2 SEQ fields, 1 TableOfFigures |
| Ghi chú | CDP tạo 2, điều hướng, resolve Alpha, xóa Beta; DOCX lưu | COM tạo/resolve/xóa cùng cách | KHỚP: còn một comment `3T Office` / `Alpha` / `Resolve audit`, Done=True |
| Theo dõi thay đổi: chèn + xóa, điều hướng, accept one/reject all | CDP tạo 2 revision; accept insertion rồi reject deletion; trạng thái cuối kiểm tra | COM tạo 2 revision cùng type/author/text | KHỚP: deletion Type 2 `beta`, insertion Type 1 ` added`; còn lại 1 sau accept one, 0 sau reject all |
| Heading 1–3 (kiểu mặc định tài liệu mới) | CDP gõ/chọn/lưu; Word COM đọc đủ thuộc tính | Word COM tạo và đọc cùng kiểu | KHỚP; DOCX nhập giữ nguyên |
| Thư viện kiểu: Normal/Title/Quote | CDP đã áp dụng và đọc Word COM | COM tạo kiểu Word tương ứng | Chạy đủ; các preset VN có chủ ý khác định dạng Normal/Title/Quote mặc định Word (TNR, 14pt/căn đều; Title đậm xanh/căn giữa; Quote có viền trái) |
| Tìm/Thay thế: case, toàn từ, Find Previous, thay một kết quả | CDP chọn đúng `Hoa`/`hoa`, Previous wrap-around, `hoang`→`Hoang` | Word COM MatchCase/MatchWholeWord + ReplaceOne | KHỚP; nội dung sau lưu giống nhau |
| Ký hiệu: ©, ₫, ∑, → | CDP chọn từ nhóm thường/tiền tệ/toán/mũi tên; DOCX lưu đúng chuỗi | Word COM tạo chuỗi tương đương và đọc cả hai DOCX | KHỚP: `Audit symbols:©₫∑→` |
| Hộp văn bản | Sau lưu, COM đọc 53.6×19.5 pt; AutoSize=0; lề 7.2/3.6 pt | COM đọc cùng kích thước, AutoSize và lề | KHỚP |
| Hình khối chữ nhật mới | CDP chọn dialog; DOCX đọc Type 1, 59.8×34.2 pt, Left/Top 75/120, fill/line/1.5pt | Word COM tạo cùng AutoShape và format | KHỚP |
| Hình ảnh PNG: kích thước, wrap, vị trí | CDP chọn ảnh, sửa kích thước/wrap/position và lưu; Word COM đọc lại | Word COM áp cùng wrap/vị trí, lưu và mở lại | KHỚP sau mở lại: 1 Shape, 23.9×13.6 pt, wrap Square, tọa độ 510.8/56.7 pt |

### FIX-T8 — kết quả lần chạy `codex-ft8`

- Bảng — đã bấm **Chèn > Bảng biểu**, **Bố cục Bảng > Chèn hàng phía dưới / Chèn cột bên phải / Xóa hàng / Gộp ô / Tách ô / Căn giữa dọc**, và **Thiết kế Bảng > Hàng tiêu đề** qua CDP mouse. COM áp thao tác tương đương lên template Word riêng rồi đọc DOCX.
- Kết quả Bảng: chèn 3×4 KHỚP; sau thêm hàng, thêm cột và xóa hàng, số ô từng hàng khớp; gộp ngang và tách ngang khớp số ô từng hàng; Ctrl+Z của app và Undo của Word sau tách đều trở lại trạng thái gộp; `VerticalAlignment=1` và `HeadingFormat=-1` khớp.
### FIX-T8 — Bảng — 11/10/2026

1. **App/CDP:** thao tác thật bằng chuột/phím, lưu DOCX: xóa cột; gộp/tách dọc; căn ngang/dọc; nền/viền tất cả/ngoài/trong/không; AutoFit nội dung/cửa sổ; kéo rộng cột/cao hàng. Ảnh nằm ở `E:\VNOffice-profiles\codex-ft8\cdp-run-03\table-*.png`.
2. **Word COM:** cùng thao tác trên DOCX đối chứng. Đọc lại số ô, căn, nền `15788258`, 6 cạnh viền, AutoFit `True` và widths 28.5/3.1/3.1 pt hoặc 150.4 pt; cột kéo 258.8/96.3/96.2 pt khớp. Cao hàng DOCX hai bên đều `w:trHeight exact 840` (COM Height trả 0 sau reopen).
3. **Kết quả/sửa:** xóa cột, merge/split, căn, nền, bốn kiểu viền và AutoFit khớp. Sửa độ rộng bảng tạo mới bị hẹp (giờ 451.2 pt), giữ cột kéo, lưu cao hàng exact; thêm AutoFit và dropdown viền. Test `python -m unittest tests.test_writer_word_parity_t7` 11/11 PASS; JS table controls 15/15 PASS. Hướng dẫn: **Thiết kế Bảng > Màu & Viền**, **Bố cục Bảng > Kích cỡ ô / Căn chỉnh**; VI/EN keys cập nhật.

### FIX-T8 — Bố cục trang — 11/10/2026

1. **App/CDP:** qua Bố cục > Thiết lập trang chọn Normal/Narrow/Moderate/Wide, A4/A5/Letter, Dọc/Ngang; thêm ngắt trang và 4 loại ngắt mục; Header/Footer, Trang đầu khác, restart số trang tại 3. Ảnh `E:\VNOffice-profiles\codex-ft8\cdp-run-06\layout-*.png`.
2. **Word COM:** A5 ngang 595.3×419.5 pt; A4 lề 36/72/54/144 pt theo preset; Letter 612×792 pt. DOCX cuối hai bên có 5 section start `2,2,0,3,4`, header/footer giống nhau, `DifferentFirstPage=-1`, số bắt đầu 3.
3. **Kết quả/sửa:** các giá trị và break types KHỚP. Đã bổ sung A5 + preset lề Word; sửa chèn ngắt mục để tách đoạn tại caret nên Word giữ đủ section. Unit `writer-sectionbreaks-pagecolor` 18/18 PASS; Word COM/CDP PASS. Help cụ thể ở **Bố cục > Thiết lập trang**, **Chèn > Đầu trang/Chân trang**, **Bố cục > Ngắt**; VI/EN i18n cập nhật.

### FIX-T8 — Heading 1–3 — 11/10/2026

1. **App/CDP:** tài liệu trắng mới, gõ ba đoạn, chọn từng đoạn bằng kéo chuột và áp dụng qua **Trang đầu > Kiểu dáng**; lưu DOCX, ảnh `E:\VNOffice-profiles\codex-ft8\heading-run-09\heading-t8-before.png`.
2. **Word COM:** tạo cùng ba Heading và đọc lại cả hai DOCX: Calibri Light; 16/13/12 pt; không đậm; màu/theme `-738148353/-738148353/-738164737`; trước 12/2/2 pt, sau 0; outline 1/2/3; căn trái; khớp từng thuộc tính.
3. **Kết quả/sửa:** **KHỚP**; hậu xử lý chỉ áp theme/style Word cho tài liệu mới và không sửa định dạng đoạn/kết quả mở DOCX nguồn. Canvas mới cũng theo cỡ/màu/spacing; Help F1 **Thư viện kiểu và kiểu Thường** cùng tooltip VI/EN cập nhật. Test Python 4/4 và heading shortcut/help 4/4 PASS.

### FIX-T8 — Kiểu và tham chiếu — 11/10/2026

1. App/CDP: áp dụng Normal/Title/Quote; tạo Heading, TOC rồi sửa Heading và cập nhật; thêm footnote/endnote, cross-reference và danh mục hình; lưu DOCX, ảnh `E:\VNOffice-profiles\codex-ft8\references-run-07\references-t8-before.png` và `captions-run-08\captions-t8-before.png`.
2. Word COM: TOC cập nhật giữ heading mới; footnote/endnote mỗi loại 1 và nội dung đúng; cross-reference có 1 REF field/bookmark; ToF có 1 bảng, 2 caption SEQ field; style gallery được đo song song.
3. Kết quả/sửa: sửa caption app thành Word SEQ/Caption và ToF native `TOC \c`, regression Python 4/4 PASS. References KHỚP; Normal/Title/Quote giữ chủ đích thiết kế VN (không cùng format built-in Word). Help F1 và i18n đã có.

### FIX-T8 — Hộp văn bản — 11/10/2026

1. **App/CDP:** Chèn qua **Chèn > Văn bản > Hộp văn bản**, gõ `Audit textbox` bằng bàn phím thật, lưu DOCX; ảnh `E:\VNOffice-profiles\codex-ft8\textbox-run-05\textbox-t8-before.png`.
2. **Word COM:** tạo shape type 17 cùng kích thước 94.1×34.2 pt trước lưu; sau mở lại app và Word đều 53.6×19.5 pt, AutoSize=0, wrap bật, lề trái/phải 7.2 pt và trên/dưới 3.6 pt; OOXML ext/bodyPr cũng giống.
3. **Kết quả/sửa:** **KHỚP**. Nguyên nhân là khung app mặc định 220×80 CSS px quá lớn và phép đổi px làm tròn; đặt mặc định 125.47×45.6 px, xuất kích thước phân số theo pt và khớp lề Word; cỡ người dùng chỉ định giữ nguyên. Test Python 6/6, JS 2/2 PASS; Help F1 và tooltip VI/EN cập nhật.

- Ghi chú trạng thái trung gian tại thời điểm viết đã lỗi thời; kết quả hoàn tất của từng nhóm được ghi trong các mục FIX-T8 phía trên và ma trận hiện hành. Baseline Heading sai lệch bên dưới được giữ làm lịch sử trước sửa.
- Batch DOCX hồi quy cuối trên worktree/profile `codex-ft8`: chạy d01,d02,d07,d13,d20,d24; chi tiết 6/6 và đường dẫn ở phần tổng kết cuối báo cáo.
- Số liệu test cũ ở đây đã được thay bằng lần chạy cuối trong phần tổng kết. Lượt unittest dùng `LOCALAPPDATA` mặc định từng va chạm LibreOffice; lần chạy profile riêng là nguồn kết quả hợp lệ.

### Heading 1–3 — 11/10/2026

Đã chạy riêng `OPS=heading1,heading2,heading3` trên app desktop và Word COM, sau đó đọc thuộc tính bằng Word COM. Cả ba DOCX đều có `w:pStyle` tương ứng `Heading1`, `Heading2`, `Heading3` ở cả app và Word. Tuy vậy các thuộc tính hiển thị sau khi mở bằng Word lệch:

| Kiểu | Thuộc tính lệch (app → Word) | Kết quả |
|---|---|---|
| Heading 1 | đậm `-1 → 0`; cỡ `12 → 16 pt`; phông `Times New Roman → Calibri Light`; trước `0 → 12 pt`; sau `8 → 0 pt`; màu khác | LECH |
| Heading 2 | đậm `-1 → 0`; cỡ `12 → 13 pt`; phông `Times New Roman → Calibri Light`; trước `0 → 2 pt`; sau `8 → 0 pt`; màu khác | LECH |
| Heading 3 | đậm `-1 → 0`; phông `Times New Roman → Calibri Light`; trước `0 → 2 pt`; sau `8 → 0 pt`; màu khác | LECH |

Đây là baseline trước sửa; phép thử Heading 1–3 sau sửa và giới hạn chỉ áp dụng tài liệu mới được ghi ở mục **FIX-T8 — Heading 1–3** phía trên. Ghi chú “Normal/Title/Quote và cập nhật TOC chưa hoàn tất” là trạng thái giữa chừng, đã được cập nhật trong mục Kiểu và tham chiếu.

### FIX-T8 tiếp tục — Kiểu/TOC/Footnote — 11/10/2026

Trong app desktop, chọn đoạn “Alpha beta gamma delta.” bằng chuột, mở **Trang đầu > Thư viện kiểu**, áp dụng **Tiêu đề 1**; tại vị trí con trỏ, mở **Tham chiếu > Chú thích trang**, rồi **Mục lục tự động**. Lưu DOCX. Word COM tạo DOCX đối chứng với `Style='Heading 1'`, một TOC và một footnote. Đọc lại cả hai file trong Word COM: app và Word đều có `TablesOfContents.Count=1`, `Footnotes.Count=1`; đoạn Heading của DOCX app được Word nhận là `Heading 1`. Nội dung footnote để trống ở cả hai. **KHỚP** về cấu trúc đã đo.

Trợ giúp tiếng Việt hiện có tại F1/Trợ giúp với các chủ đề **Thư viện kiểu và Chủ đề tài liệu**, **Mục lục tự động**, **Chú thích cuối trang và chú thích cuối tài liệu** (`platform/help/entries-writer.js`); nhãn/tooltip có trong `platform/i18n/strings-vi.js` và `strings-en.js`.

Các phép Normal/Title/Quote, cập nhật TOC, footnote/endnote có nội dung, tham chiếu chéo và danh mục hình đã được đo ở nhóm Kiểu và tham chiếu phía trên. Preset VN Normal/Title/Quote được giữ khác kiểu dựng sẵn của Word theo chủ đích sản phẩm; tài liệu DOCX nguồn giữ nguyên.

### FIX-T8 tiếp tục — Ghi chú — 11/10/2026

Chọn đúng từ **Alpha** bằng chuột/phím CDP, mở **Đánh giá > Thêm ghi chú**, nhập `Audit note`, lưu DOCX. Word COM tạo comment trên cùng phạm vi và lưu DOCX đối chứng. COM đọc lại cả hai file: số comment `1/1`, Author `3T Office/3T Office`, Scope `Alpha/Alpha`, Text `Audit note/Audit note`: **KHỚP**. Bài hướng dẫn tiếng Việt **Thêm và quản lý ghi chú** đã có trong Trợ giúp Writer; nhãn có i18n.

Baseline này chỉ đo tạo comment. Kết quả Done/Resolved, xóa và điều hướng được đo sau đó trong mục **FIX-T8 — Ghi chú (đối chiếu trạng thái)**; UI hiện không có lệnh sửa nội dung comment.

### FIX-T8 — Ghi chú — 11/10/2026 (đối chiếu trạng thái)

1. App/CDP: tạo hai ghi chú trên Alpha/Beta bằng mouse+keyboard; Previous tới Alpha, đánh dấu đã xử lý, Next rồi xóa Beta; ảnh `E:\VNOffice-profiles\codex-ft8\comments-run-01\comments-t8-before.png`.
2. Word COM: tạo, resolve và xóa comment tương đương; sau lưu/mở cả hai DOCX có một comment, author `3T Office`, scope `Alpha`, text `Resolve audit`, Done=True.
3. Kết quả: navigation, resolve, delete và OOXML `w15:done` **KHỚP**. Help F1/i18n hiện có; sửa nội dung comment chưa có thao tác UI và cần bổ sung/đối chiếu riêng.

### FIX-T8 tiếp tục — Theo dõi thay đổi — 11/10/2026

Mở **Đánh giá > Theo dõi thay đổi**, đặt con trỏ cuối đoạn Alpha và gõ ` added` bằng CDP keyboard, rồi lưu DOCX. Word COM bật `TrackRevisions`, chèn cùng chuỗi và lưu DOCX đối chứng. Đọc lại bằng COM: cả hai tệp có một Revision, `Type=1` (insertion), Author `3T Office`, text `added`: **KHỚP**. Help tiếng Việt **Theo dõi thay đổi** và nhãn thao tác đã có trong `platform/help/entries-writer.js` cùng `platform/i18n/strings-vi.js`/`strings-en.js`.

Baseline này chỉ đo insertion. Xóa, Accept One và Reject All được đo trong mục **FIX-T8 — Theo dõi thay đổi (xóa và xử lý revision)**; chế độ hiển thị và tác giả tùy chỉnh vẫn ngoài phép đo.

### FIX-T8 — Theo dõi thay đổi — 11/10/2026 (xóa và xử lý revision)

1. App/CDP: bật theo dõi, gõ ` added`, xóa `beta`, Next, Accept One rồi Reject All; ảnh `E:\VNOffice-profiles\codex-ft8\track-run-02\track-changes-t8-before.png`.
2. Word COM: cùng DOCX baseline có hai revision, Type 2 `beta` và Type 1 ` added`, cùng tác giả `3T Office`; COM đọc lại app và Word.
3. Kết quả: cấu trúc revision khớp; app còn 1 sau Accept One, hết revision sau Reject All và giữ nội dung như semantics Word. Help F1/i18n đã có; chế độ hiển thị và tác giả tùy chỉnh chưa đo.

### FIX-T8 tiếp tục — Tìm/Thay thế — 11/10/2026

Nhấn **Ctrl+H**, nhập `Alpha` ở ô **Tìm gì**, nhập `Gamma` ở ô **Thay bằng**, nhấn **Thay thế tất cả**. App báo 1 thay thế; DOCX sau lưu còn `Gamma`, không còn `Alpha`. Word COM chạy `Find.Execute` với `ReplaceAll` trên DOCX đối chứng; đọc nội dung bằng COM cho cùng kết quả: **KHỚP**. Hướng dẫn tiếng Việt có trong Trợ giúp Writer, chủ đề **Tìm kiếm và Thay thế trong Doc**; Ctrl+H và nhãn nút đã có i18n.

Đã chạy khớp hoa/thường, toàn từ, Find Previous wrap-around và thay một kết quả. Bỏ dấu dùng lại cùng query/đổi tùy chọn và trước sửa bị giữ index cũ, nên đã bổ sung reset state theo tùy chọn; Help tiếng Việt và i18n đã có.

### FIX-T8 — Tìm/Thay thế — 11/10/2026 (tùy chọn và điều hướng)

1. App/CDP: gõ `Hoa hoa Hòa hoang hoa`; thử Match Case, Whole Word, Find Previous, Replace One; ảnh `E:\VNOffice-profiles\codex-ft8\find-run-04\find-replace-t8-before.png`.
2. Word COM: đọc các kết quả `Hoa`, `Hoa`; Replace One `hoang` thành `Hoang`; mở lại hai DOCX cho nội dung giống hệt.
3. Kết quả/sửa: Find Previous trước đó không wrap khi cùng đoạn và option state cũ được dùng lại; reset state theo query/options, cho phép wrap ở cùng text node. Harness CDP + Word COM chạy; Help F1/i18n hiện có.

### FIX-T8 tiếp tục — Ký hiệu — 11/10/2026

Đặt con trỏ cuối đoạn Alpha bằng chuột, mở **Chèn > Ký hiệu > Toán học**, chọn **π** bằng chuột và lưu DOCX. Word COM tạo DOCX có `π` tại cùng vị trí. Đọc lại bằng COM: mỗi tài liệu có đúng một `π`, đoạn văn bằng nhau: **KHỚP**. Trợ giúp tiếng Việt **Chèn ký hiệu** mô tả nhóm Thường dùng/Toán học/Mũi tên, đường dẫn và bước chèn; i18n cho nhãn Ký hiệu đã có.

### FIX-T8 — Ký hiệu — 11/10/2026 (nhiều nhóm)

1. App/CDP: qua Chèn > Ký hiệu chọn ©, ₫, ∑, → từ các nhóm ký hiệu; lưu DOCX, ảnh `E:\VNOffice-profiles\codex-ft8\symbols-run-10\symbols-t8-before.png`.
2. Word COM: tạo cùng chuỗi bằng các ký tự Unicode rồi mở lại DOCX app; nội dung cả hai là `Audit symbols:©₫∑→`.
3. Kết quả: vị trí và ký tự **KHỚP**. Trợ giúp tiếng Việt cho nhóm Thường dùng/Toán học/Mũi tên cùng nhãn i18n hiện có.

### FIX-T8 tiếp tục — Hộp văn bản/Hình ảnh — 11/10/2026

Đây là baseline trước sửa; số đo sau sửa, AutoSize và lề Word được ghi ở mục **FIX-T8 — Hộp văn bản** phía trên.

Đã dùng CDP `Page.setInterceptFileChooserDialog` nhận `Page.fileChooserOpened`, rồi `DOM.setFileInputFiles` cấp ảnh 32×32; ảnh được chèn/lưu qua UI thật. Word COM đọc cả app và DOCX đối chứng: một InlineShape type 3, 24×24 pt, alignment 0. Không dùng OS input. Help **Chèn hình ảnh**/Hình khối và VI/EN i18n có sẵn.

### Bố cục trang: cột — 11/10/2026

Đây là kết quả cột riêng lẻ trước khi nhóm Bố cục trang hoàn tất. Lề, hướng và khổ giấy đã được đo trong mục FIX-T8 — Bố cục trang phía trên.

### FIX-T8 tiếp tục — Thiết lập trang — 11/10/2026

Đã dùng chuột CDP mở **Bố cục > Thiết lập trang…**, dùng bàn phím chọn **Ngang**, nhập lề trên/dưới 25 mm và trái/phải 20 mm, rồi lưu DOCX. Word COM tạo DOCX riêng với A4 ngang và cùng lề; mở cả hai tệp bằng Word COM để đọc `PageSetup`. Kết quả: hướng `1/1`, khổ `841.9×595.3 / 842×595.3 pt`, lề trên `70.8/70.8 pt`, trái `56.7/56.7 pt`: **KHỚP** (sai số khổ giấy do làm tròn dưới 0.1 pt). Lần tạo Word ban đầu đặt kích thước portrait sau orientation nên bị Word chuẩn hóa về dọc; phép thử được sửa để chọn `PaperSize=A4` trước orientation và chạy lại thành công.

Trong app, mở **Bố cục > Thiết lập trang…**, chọn khổ/hướng, nhập bốn lề theo mm, chọn phạm vi áp dụng rồi nhấn **Áp dụng**. Trợ giúp tiếng Việt hiện có tại F1/Trợ giúp, chủ đề **Lề, hướng giấy và khổ giấy**; khóa giao diện đã có trong `platform/i18n/strings-vi.js` và `strings-en.js`.

Phần “chưa chạy” này là ghi nhận giữa chừng, đã được thay thế bởi kết quả nhóm Bố cục trang đầy đủ ngay phía trên: các preset/khổ giấy, ngắt, đầu/chân trang và số trang đã được đối chiếu.

## Batch DOCX hồi quy

`batch_document_audit.py docx` trên d01,d02,d07,d13,d20,d24 chạy cuối với `VNO_APP_ROOT=E:\VNOffice-codex-ft8`; kết quả chi tiết ghi ở tổng kết cuối báo cáo.


## Tổng kết FIX-T8 — 11/10/2026

- `main` đã được merge trước Nhóm 1 (merge `3985fae6`); đồng bộ `main` lần nữa trước Nhóm 6 (`350ea9f2`). Nhóm 1–10 có commit riêng: `a0e8dd23`, `130156af`, `fc7fb854`, `143f7e2c`, `9a1bcc7c`, `307e50e4`, `f5e24336`, `e77f2dad`, `7f07c310`, `993fb118`.
- `npm test` với `VNO_APP_ROOT=E:\VNOffice-codex-ft8`: **3064/3064 PASS**. Hai lỗi ban đầu do test mock `classList` không có `toggle` đã được guard; nội dung Help/VI/EN được sửa để không dùng tên thương hiệu bị cấm. Help coverage kiểm tra toàn bộ lệnh động thay vì số cứng.
- `python -m unittest discover -s tests` với `VNO_APP_ROOT` và `LOCALAPPDATA=E:\VNOffice-profiles\codex-ft8\python-localappdata`: **855 tests OK**, 468.399 giây; có `ResourceWarning` hai pipe chưa đóng sau khi chạy, không có test fail.
- Batch `scripts/layout-audit/batch_document_audit.py docx` chạy với `VNO_APP_ROOT=E:\VNOffice-codex-ft8`, nguồn `E:\VN OFice\file test\landocx`: **6/6 PASS**, edit PASS, page delta 0. Số trang Word/lưu: d01 19/19, d02 11/11, d07 23/23, d13 10/10, d20 3/3, d24 16/16. Báo cáo: `E:\VNOffice-profiles\codex-ft8\batch-audit-final\batch_document_audit_report.md`.
- Không chạy build. Không có test FAIL/BLOCKED. Giới hạn chưa đo trong scope phụ: sửa nội dung comment (UI hiện chưa có lệnh chỉnh sửa), các chế độ hiển thị revision và tên tác giả tùy chỉnh; ma trận chính phía trên nêu rõ các phép đã đối chiếu.


### FIX-T9 — Hình ảnh — 11/10/2026

1. **App/CDP:** dùng chuột chọn ảnh qua **Chèn > Hình ảnh**, tab **Định dạng ảnh**, đặt 56×32 px, wrap Vuông, vị trí trên-phải; lưu DOCX. Ảnh trước/sau: `E:\VNOffice-profiles\codex-ft9\image-t8-before.png`, `image-edit-t9.png`.
2. **Word COM:** đối chứng cùng ảnh, wrap Square và vị trí tương ứng; mở lại hai DOCX bằng Word. Cả hai đọc `inline=0`, `shapes=1`, `23.9×13.6 pt`, wrap `0`, relative page `1/1`, position `510.8/56.7 pt`.
3. **Kết quả/sửa:** trước sửa app DOCX thành InlineShape nên wrap/vị trí mất; adapter giờ chuyển ảnh đã chỉnh thành OOXML anchor, giữ wrap/offset. Unit mới 3/3 PASS; Help tiếng Việt ở **Định dạng ảnh > Sắp xếp & Kích thước**, khóa VI/EN cập nhật.

### FIX-T9 — Đầu/chân trang và số trang — 11/10/2026

1. **App/CDP:** chọn Trang đầu khác, Trang chẵn và lẻ khác nhau, đánh lại số trang từ 3; header/footer chính có `Word parity header` và PAGE/NUMPAGES; ảnh `E:\VNOffice-profiles\codex-ft9\layout-header-footer.png`, `layout-page-numbers.png`.
2. **Word COM:** đọc lại DOCX app và tạo tài liệu đối chứng tương ứng. Cả hai có 5 section cùng loại bắt đầu `2,2,0,3,4`; section đầu `DifferentFirst=-1`, `OddAndEven=-1`, số bắt đầu 3; nội dung header/footer chính giống nhau.
3. **Kết quả:** tùy chọn và field số trang **KHỚP**. Header/footer trang đầu/chẵn/lẻ riêng chưa có vùng biên tập riêng trong app; các vùng đó đang rỗng trong cả hai DOCX đối chứng. Harness COM nay đọc `PageSetup.OddAndEvenPagesHeaderFooter` chính xác.

### FIX-T9 — Ngắt dòng/ngắt cột — 11/10/2026

1. **App/CDP:** bật 2 cột, gõ `Alpha`, Shift+Enter, `Line after`, chèn **Bố cục > Ngắt > Ngắt cột**, gõ `Next column`; ảnh `E:\VNOffice-profiles\codex-ft9\line-column-break-t9.png`.
2. **Word COM:** sau sửa, app và Word đều có 2 cột, 1 ngắt cột, giữ đủ `Alpha`/`Line after`/`Next column`; Word có 1 soft break, app có 0.
3. **Kết quả/sửa:** ngắt cột **KHỚP** sau khi tách marker thành paragraph riêng và đưa caret vào paragraph sau; Shift+Enter vẫn **LỆCH**. Harness `line-column-break-t9.desktop.mjs` + `word-line-column-break-t9.ps1` xác nhận.

### FIX-T9 — Chú thích cuối trang/cuối tài liệu — 11/10/2026

1. **App/CDP:** chèn một footnote và một endnote, nhập `Footnote content`/`Endnote content`, lưu DOCX; ảnh `E:\VNOffice-profiles\codex-ft9\references-t8-before.png`.
2. **Word COM:** mở lại tệp app và đối chứng; `Footnotes=1`, `Endnotes=1`, đúng nội dung từng note.
3. **Kết quả:** **KHỚP** về số lượng/vị trí/nội dung sau roundtrip; không có sai lệch tái hiện.

### FIX-T9 — Mục lục, cập nhật TOC — 11/10/2026

1. **App/CDP:** tạo TOC tự động, sửa heading đầu thành `Updated first heading`, bấm cập nhật; lưu DOCX.
2. **Word COM:** chạy `TablesOfContents.Item(1).Update()` trên cả DOCX app và Word; cả hai đọc `Updated first heading` và `Second heading` cùng số trang `1`, có field `TOC \o "1-3" \h \z \u`.
3. **Kết quả:** **KHỚP sau cập nhật trong Word**; số trang được điền khi Word refresh field. Hướng dẫn TOC F1 và i18n đã có.

### FIX-T9 — Comments: thêm/trả lời/xóa — 11/10/2026

1. **App/CDP:** thêm Alpha/Beta, resolve Alpha và xóa Beta; ảnh `E:\VNOffice-profiles\codex-ft9\comments-t8-before.png`.
2. **Word COM:** app và Word còn cùng một comment của `3T Office`, scope Alpha, text `Resolve audit`, `Done=True`; Word COM tạo được reply trong thread.
3. **Kết quả:** thêm/xóa/resolve **KHỚP**; app chưa có lệnh trả lời, ghi gap ở `docs/RIBBON-BACKLOG.md`; chưa kết luận parity cho reply.

### FIX-T9 — Track Changes: chấp nhận/từ chối — 11/10/2026

1. **App/CDP:** bật Theo dõi thay đổi, chèn ` added`, xóa `beta`, chấp nhận insertion rồi từ chối deletion; ảnh `E:\VNOffice-profiles\codex-ft9\track-changes-t8-before.png`.
2. **Word COM:** hai revision đọc cùng type/author/text: deletion Type 2 `beta`, insertion Type 1 ` added`; trạng thái còn 1 sau accept one và 0 sau reject all.
3. **Kết quả:** **KHỚP** về revision và thao tác accept/reject; hướng dẫn VI/EN đã có, không phát hiện sai lệch mới.

### FIX-T9 — Thư viện kiểu: Title/Subtitle/Quote/List Paragraph — 11/10/2026

1. **App/CDP:** áp Normal/Title/Quote qua gallery, lưu DOCX; ảnh `E:\VNOffice-profiles\codex-ft9\styles-t8-before.png`; Subtitle/List Paragraph không có card để chọn.
2. **Word COM:** app đọc style `Body Text` cho Normal/Title, `Block Quotation` cho Quote; Word đọc Normal/Title/Quote. Title/Quote formats cũng lệch built-in Word theo preset VN.
3. **Kết quả:** **LỆCH/MISSING** về semantic style; Subtitle và List Paragraph thiếu. Gap ghi ở backlog; không coi các preset VN là Word style tương đương.

### FIX-T9 — Hình khối: màu, viền, xoay — 11/10/2026

1. **App/CDP:** tạo rectangle trong dialog, chọn fill/line và độ dày; ảnh `E:\VNOffice-profiles\codex-ft9\shapes-t8-before.png`.
2. **Word COM:** app/Word đều đọc một AutoShape loại 1, `59.8×34.2 pt`, trái/trên `75/120 pt`, fill `15426341`, line `14175773`, rộng viền `1.5 pt`.
3. **Kết quả:** thuộc tính lúc tạo **KHỚP**; không có luồng chọn hình để sửa màu/viền hoặc xoay trong UI hiện tại. Gap ghi ở backlog; chưa đo parity cho chỉnh sửa/xoay.

### FIX-T9 — Tìm/Thay nâng cao — 11/10/2026

1. **App/CDP:** kiểm tra Match Case, Whole Word, Find Previous vòng lại và Replace One; ảnh `E:\VNOffice-profiles\codex-ft9\find-replace-t8-before.png`.
2. **Word COM:** cùng các tùy chọn; kết quả Hoa/Hoa và nội dung sau thay một kết quả giống hệt `Hoa hoa Hòa Hoang hoa` ở cả hai DOCX.
3. **Kết quả:** phép thử nâng cao **KHỚP**; Help Ctrl+H và nhãn tùy chọn VI/EN có sẵn, không phát hiện lệch mới.

### FIX-T9 — Danh sách nhiều cấp — 11/10/2026

1. **App/CDP:** thử tạo danh sách qua Trang đầu > Đa cấp và đổi cấp bằng phím; thao tác UI không cho ra ba cấp ổn định (lần thử có paragraph mất/Tab thành ký tự), không có ảnh kết quả tin cậy.
2. **Word COM:** phép so sánh UI app/Word **NOT RUN** do đầu vào CDP không hợp lệ; serializer live test hiện hữu chạy FODT→DOCX và xác nhận decimal 1/1.1/1.1.1, letter 1/a/i, NĐ30 cùng numId, ilvl 0/1/2.
3. **Kết quả:** roundtrip serializer **PASS**; parity UI/COM **NOT RUN**, không suy rộng kết quả serializer thành xác nhận ribbon. Cần harness cấp danh sách ổn định rồi chạy lại COM.

## Tổng kết FIX-T9 — 11/10/2026

- `main` đã được merge trước audit; branch `audit/doc-t9-codex`. Mỗi nhóm audit có commit riêng; image layout fix `ebbc4335`, header/footer measurement `bb49aa60`, line/column test `7d01148a`, các nhóm còn lại ở log commit branch.
- `npm test`: **3066/3066 PASS** sau sửa vị trí Ribbon trong Help.
- `python -m unittest discover -s tests` với `VNO_APP_ROOT=E:\VNOffice-codex-ft9`, `LOCALAPPDATA=E:\VNOffice-profiles\codex-ft9\python-localappdata`: **861 tests OK**, 502.437 giây; còn ResourceWarning hai pipe chưa đóng.
- Batch `scripts/layout-audit/batch_document_audit.py docx` với nguồn `E:\VN OFice\file test\landocx`: **5/5 PASS**, edit PASS, page delta 0. d01 19/19; d07 23/23; d13 10/10; d20 3/3; d24 16/16. Báo cáo ở `E:\VNOffice-profiles\codex-ft9\batch-audit-final\batch_document_audit_report.md`.
- Hạn chế tái hiện: header/footer First/Even chưa có vùng nhập riêng; Comment reply chưa có UI; gallery thiếu Subtitle/List Paragraph và lưu Title thành Body Text; shape chưa có sửa/xoay; Shift+Enter soft break không roundtrip; CDP parity của danh sách đa cấp chưa xác minh. Ngắt cột đã sửa và kiểm chứng giữ nội dung sau marker. Chi tiết và hướng xử lý nằm ở `docs/RIBBON-BACKLOG.md`.

### FIX-T11 nhóm 1 — Trang đầu — 11/10/2026

1. **App/CDP:** dùng chuột chọn đoạn và bấm ribbon cho Tăng/Giảm cỡ, Xóa định dạng, Sao chép định dạng, Giảm thụt lề, Tô nền, Sắp xếp, Hiện ký tự định dạng, Viền đoạn, Sao chép/Cắt/Dán và hai kiểu Dán đặc biệt; ảnh từng thao tác ở `E:\VNOffice-profiles\codex-ft11\t11_*.png`, DOCX ở cùng profile.
2. **Word COM:** tạo fixture ba đoạn tương ứng, thực hiện lệnh và đọc lại cỡ/phông, thụt lề, nền đoạn, viền, thứ tự đoạn, ShowAll, định dạng đoạn thứ ba và nội dung. `t11_group1_compare.json` ghi **13/13 nút KHỚP**; clipboard thường và Dán đặc biệt nguồn giữ định dạng, Dán đặc biệt văn bản thuần đưa nội dung về Calibri 11 và giữ cùng đoạn như Word.
3. **Kết quả/sửa:** Word tăng 12→14 pt và giảm 12→11 pt; app đã khớp. COM phát hiện khoảng trắng thiếu giữa hai câu khi Dán thường, đã sửa smart paste. Dán văn bản thuần trước đó biến xuống dòng định dạng nội bộ thành ngắt đoạn; serializer clipboard chuẩn hóa khoảng trắng và adapter ưu tiên text đã tuần tự hóa khi payload HTML cùng nội dung. Chạy lại CDP và COM sau sửa, không còn khác biệt. Help cụ thể cho các lệnh đã có trong `platform/help/entries-writer.js` và i18n VI/EN tương ứng.

### FIX-T11 nhóm 2 — Chèn — 11/10/2026

1. **App/CDP:** bấm ribbon Chèn và thao tác trên DOCX fixture riêng; ảnh `E:\VNOffice-profiles\codex-ft11\t11_*.png`. Kết quả sau mở lại bằng Word COM: Trang trắng 3 trang; Văn bản thành bảng 2×4; hyperlink giữ đoạn chọn và URL; bookmark `SectionStart`; Drop Cap 3 dòng; ngày `2026-10-11`; phương trình 1 OMath.
2. **Word COM:** chạy lệnh tương ứng trong tài liệu mới rồi đọc thuộc tính: 3 trang, bảng 2×4, hyperlink + URL, bookmark cùng chữ hoa/thường, DropCap Position=1/3 dòng, ngày văn bản cùng giá trị, một OMath. Đầu ra DOCX app khớp ở cả 7 phép thử này. Word COM tạo biểu đồ native bị treo tại `InlineShapes.AddChart`; không kết luận PASS cho Chart/Diagram.
3. **Kết quả/sửa:** CDP phát hiện `common.edit.hyperlink` và `writer.table.fromText` có implementation nhưng thiếu đăng ký CommandBus; đã thêm binding. Thao tác link phát hiện selection bị mất khi hộp thoại lấy focus, làm hyperlink bị thêm ở cuối tài liệu; adapter giờ chụp và khôi phục Range nên thay đúng vùng chọn. Bookmark trước đó đổi hoa/thường; `slugBookmarkName` giữ casing tên hợp lệ như Word. Tài liệu app có 0 đối tượng Chart/SmartArt native (0 InlineShapes/Shapes), nên `writer.chart.insert` và `writer.diagram.insert` ghi **LỆCH ĐÃ BIẾT**; chưa sửa serializer/OOXML.

## FIX-T11 nhóm 3 — Thiết kế/Bố cục
- CDP thật: theme Administrative (Times New Roman, line-height 22px), watermark `DỰ THẢO T11` đỏ 20%/45°/72px, nền #dbeafe, viền dashed 3 pt đỏ, line numbers mỗi trang, thụt đầu dòng 14.17 pt. Preview tích hợp hoàn tất trạng thái `Sẵn sàng in.`, 1 trang A4 dọc.
- Word COM mở các DOCX do app lưu: màu nền, viền trang (dashed, 3 pt, #dc2626), khổ A4 và first-line indent (14.15 pt) khớp. Sửa giữ vùng chọn khi bấm select thụt đầu dòng.
- Lệch đo được: theme Administrative không thành theme Word; watermark được nhập thành dòng text thường; Word COM không thấy numbering type dù app lưu cấu hình `page`. Đánh dấu LỆCH ĐÃ BIẾT.
- PDF: chưa có phép đo byte/page size từ file PDF của app; Xuất PDF gọi hộp thoại Save native, không điều khiển được bằng CDP. Word COM print preview không có giao diện cùng cơ chế để so trực tiếp. Ma trận ghi rõ giới hạn, không tính là PASS.

## FIX-T11 nhóm 4 — Tham chiếu
- CDP qua ribbon Tham chiếu: thêm nguồn (tác giả, tiêu đề, năm, nhà xuất bản, URL), chọn MLA, chèn trích dẫn và Works Cited; lưu DOCX.
- Word COM mở DOCX app: có `(Nguyễn)`, `Works Cited`, tiêu đề nguồn, nhà xuất bản và năm; 1 trang. Ma trận đánh dấu 4 lệnh KHỚP.
