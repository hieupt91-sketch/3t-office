# Agent Handoff

TASK: Chẩn đoán GIF raster thừa khi VN Writer lưu `d09.docx` (shape thật bị chồng ảnh). Không sửa code nguồn.
AGENT/ROLE: Grok — chẩn đoán, worktree `audit/writer-d09-gif-grok` tạo từ main `5c0fdf1`.
BRANCH: `audit/writer-d09-gif-grok`
WORKTREE: `E:\VNOffice-grok-writer-d09-gif`
OBJECTIVE: Xác định bước sinh GIF, 15 shape nào bị raster, vì sao 15 `pic:pic` nhưng 11 file GIF, file `d01`–`d24` (trừ `d10`) có cùng hiện tượng không, và hướng sửa. Không sửa code, không merge `main`, không commit tài liệu thật.

FINDINGS:

## Kết luận

GIF sinh ở LibreOffice khi mở: filter `HTML (StarWriter)` (`main.py`, `FORMAT_FILTERS["html"]`) xuất **mọi** `wp:anchor` thành `<img name="ShapeN">` trỏ tới file GIF cạnh HTML. Canvas không vẽ thêm GIF và không bỏ bớt ảnh: lúc lưu, export vẫn có đủ 30 `img` `data:image/gif`. `soffice` HTML→DOCX nhúng các GIF đó thành `pic:pic`. `postprocess_created_writer_docx` không thêm, không bớt media. `postprocess_writer_docx` khôi phục 15 shape không có textbox và **chỉ thay 15 `pic:pic` đầu** trong thứ tự tài liệu; 15 ảnh còn lại nằm nguyên trong file lưu. 11 file GIF là do nhiều `pic:pic` dùng chung một bitmap (LibreOffice đã ghi nhiều `img` cùng một sidecar).

Bản lưu app trên profile `grok`, cả khi không sửa và khi chèn `ZZ` như `_batch_writer.py`, trùng cấu trúc baseline của Claude: 45 `wp:anchor` (30→45), 15 `pic:pic` tên `Shape*`, `wp:wrapNone`, 11 GIF, cùng 11 MD5.

## File gốc

`E:\VN OFice\file test\landocx\d09.docx`

| Đại lượng | Số |
|---|---:|
| `word/media` | 0 |
| `wp:anchor` (chỉ trong `word/document.xml`) | 30 |
| `wps:wsp` | 30 |
| có `wps:txbx` / `w:txbxContent` | 15 |
| `wps:wsp` không textbox | 15 |
| `pic:pic` | 0 |
| `wpg:wgp` | 0 |

`docPr/@name` không phải `Shape19`. Tên gốc là `Rectangle …`, `Elbow Connector …`, `Straight Arrow Connector …`. `ShapeN` là tên LibreOffice gán khi xuất HTML. Với file này, `N` = chỉ số anchor (0-based) + 1: rộng/cao HTML (px) khớp `wp:extent` / 9525. Ví dụ anchor 0 `Rectangle 2` 1571625×466725 EMU = 165×49 px = `Shape1`; anchor 18 `Elbow Connector 23` 45719×604217 EMU = 5×63 px = `Shape19`.

15 có textbox là hình chữ nhật sơ đồ (chữ nằm trong `w:txbxContent`, ví dụ BAN GIÁM ĐỐC, GIÁM ĐỐC, KỸ THUẬT). 15 không textbox là connector (`bentConnector3` hoặc `straightConnector1`), không có `w:t`.

## Bước sinh GIF — đo từng tầng

Profile mọi lần chạy app và `soffice` qua code app: `LOCALAPPDATA=E:\VNOffice-profiles\grok`. Hàm convert là `main._run_soffice_convert` (cùng filter, cùng `UserInstallation` `lo-profile-writer`).

| Tầng | `img` / `pic:pic` | file GIF | Ghi chú |
|---|---:|---:|---|
| DOCX gốc | 0 pic | 0 | 30 anchor, 30 wsp |
| DOCX→HTML StarWriter | 30 `img name="Shape1"`…`Shape30` | 22 sidecar | 0 `div` absolute; 15 `span id="FrameN"` cho chữ của hình chữ nhật. Bytes GIF đã có **trước** canvas và trước postprocess |
| `_inline_html_images` | 30 `data:image/gif` | — | 0 ảnh bị loại. `_is_decorative_hairline_image` không trúng: GIF nhỏ nhất đo được là 8×49 px, ngưỡng hairline là một chiều ≤2 px |
| HTML→DOCX data-URI, chưa postprocess | 30 pic | 22 | `postprocess_created_writer_docx` giữ nguyên 30 pic / 22 GIF |
| Cùng file + `postprocess_writer_docx` **không** có marker `vno-untouched` | 30 pic | 22 | Không khôi phục connector. Postprocess không phải chỗ **tạo** GIF |
| Canvas sau khi mở thật | 30 `img` trong `.vno-writer-body`, 30 `data-vno-float="image"`, 15 textbox float, `this.shapes` = 0 | — | `_contentForExport()` vẫn 30 GIF. `vno-pristine-document` vắng (`_isOpenedDocumentPristine` false dù `isDirty` false — fingerprint đổi sau khi mở). `vno-untouched` = 411 |
| App lưu, không gõ | 15 pic | 11 | 45 anchor = 15 pic + 15 `Frame` textbox + 15 connector gốc |
| App lưu sau bold + `ZZ` (đúng chỗ `_batch_writer.py` chèn) | 15 pic | 11 | Cùng 11 MD5 với lần không gõ và với `E:\VNOffice-profiles\claude\d09-main-baseline\_rt_d09.docx` |

MD5 sidecar HTML trùng từng byte với GIF trong bản lưu (ví dụ `d09_html_32a7a52.gif` = `word/media/image13.gif` = `0adc3b4b…`, bitmap của `Shape19`). Canvas không mã hóa lại ảnh.

`Shape19` trong file lưu **không** phải `docPr` gốc. Nó là raster của anchor 18 (`Elbow Connector 23`). Extent của `pic` trong file lưu (389255×2544445) là kích thước canvas gán nhầm từ anchor khác (`data-vno-width/height`), không phải kích thước bitmap 13×68 px. Bitmap mở ra vẫn là nét connector.

## 15 pic nào còn, và vì sao chỉ 11 GIF

Canvas/export giữ cả 30 ảnh, đúng thứ tự HTML. `postprocess_writer_docx` bật `trust_order` vì XML chuyển đổi có `vno-untouched-` (`ooxml_zip_patch.py`, lời gọi `_passthrough_writer_anchors`, khoảng dòng 10366). `_writer_passthrough_matches` chỉ ghép được shape nguồn loại passthrough — `wps:wsp` **không** textbox (`_writer_anchor_passthrough_kind`, khoảng dòng 8353). d09 có đúng 15 connector loại đó. `zip(remaining_converted_pictures, remaining_source_shapes)` nuốt **15 `pic:pic` đầu** theo thứ tự tài liệu và thay bằng XML connector gốc. 15 ảnh sau giữ nguyên tên `Shape*`. Media của ảnh bị thay, nếu không còn `r:embed`, bị bỏ ở `obsolete_anchor_media` (khoảng dòng 10559).

15 ảnh đầu (bị thay, không còn trong file lưu), theo thứ tự HTML: `Shape1, 2, 3, 4, 6, 5, 9, 8, 7, 11, 12, 10, 21, 17, 20`.

15 ảnh còn lại (đúng thứ tự trong `_rt_d09`):

| pic còn | Anchor gốc | docPr gốc | Textbox | Bitmap |
|---|---:|---|---|---|
| Shape19 | 18 | Elbow Connector 23 | không | connector, GIF riêng |
| Shape18 | 17 | Elbow Connector 24 | không | connector, GIF riêng |
| Shape16 | 15 | Elbow Connector 28 | không | connector, GIF riêng |
| Shape15 | 14 | Elbow Connector 29 | không | connector, GIF riêng |
| Shape13 | 12 | Elbow Connector 37 | không | connector, GIF riêng |
| Shape14 | 13 | Elbow Connector 30 | không | connector, GIF riêng |
| Shape22 | 21 | Rectangle 25 | có | chữ nhật 147×38, dùng chung GIF với Rectangle 4 và 5 (hai pic kia đã bị thay) |
| Shape24 | 23 | Rectangle 6 | có | 143×58, chung GIF với Shape27 |
| Shape23 | 22 | Rectangle 8 | có | 145×35, chung GIF với Shape26, 29, 30 |
| Shape26 | 25 | Rectangle 10 | có | cùng bitmap Shape23 |
| Shape25 | 24 | Rectangle 26 | có | GIF riêng |
| Shape27 | 26 | Rectangle 7 | có | cùng bitmap Shape24 |
| Shape29 | 28 | Rectangle 21 | có | cùng bitmap Shape23 |
| Shape28 | 27 | Rectangle 36 | có | GIF riêng |
| Shape30 | 29 | Rectangle 27 | có | cùng bitmap Shape23 |

Không phải “15 shape không textbox” hay “15 shape có textbox”. Sáu pic còn là connector (vector đã được khôi phục song song nên chồng ảnh). Chín pic còn là hình chữ nhật có chữ: GIF chỉ là nền/viền (các ô cùng cỡ ra cùng một bitmap, chữ nằm ở `span id="FrameN"`), Frame là hộp chữ LibreOffice tách ra (`background: #ffffff`, `border: none` trong HTML).

11 file = 15 pic trừ bản sao: nhóm 4 pic (`Shape23/26/29/30`) tính 1 file, nhóm 2 pic (`Shape24/27`) tính 1 file, 9 pic kia mỗi pic một file. 15 − 3 − 1 = 11. Cả 11 đều là GIF89a, khoảng 1 KB.

File lưu còn đủ 15 connector gốc (tên `Elbow Connector` / `Straight Arrow Connector`) và 15 `Frame1`…`Frame15` thay cho 15 hình chữ nhật. Cộng 15 pic = 45 anchor.

## d01–d24 trên main (trừ d10)

Đo lại bằng app thật của worktree này, `LOCALAPPDATA=E:\VNOffice-profiles\grok`, mở rồi lưu, không chèn `ZZ`, không gọi Word. 23/23 file lưu được. Bản lưu: `E:\VNOffice-profiles\grok\writer-d09-gif-cohort\_rt_dNN.docx` (ngoài repo). Tiêu chí hiện tượng: media bản lưu lớn hơn media gốc, hoặc `pic:pic` có tên không có trong gốc.

Chỉ `d09` dương tính: media 0→11 (cả 11 là GIF), anchor 30→45, 15 `pic` mới đúng danh sách `Shape19, Shape18, Shape16, Shape15, Shape13, Shape14, Shape22, Shape24, Shape23, Shape26, Shape25, Shape27, Shape29, Shape28, Shape30`.

Các file kia không thêm media và không thêm `pic` tên mới:

| File | media gốc → lưu | anchor gốc → lưu | pic gốc → lưu | Hiện tượng GIF |
|---|---|---|---|---|
| d01, d02, d03, d05, d11, d12, d14, d17, d22, d23 | 0→0 | 0→0 | 0→0 | không |
| d04 | 2→2 | 5→5 | 5→5 | không |
| d08 | 1→1 | 1→1 | 1→1 | không |
| d13 | 1→1 | 0→0 | 0→0 | không |
| d15 | 2→2 | 0→0 | 0→0 | không |
| d16 | 1→1 | 0→0 | 0→0 | không |
| d18 | 2→2 | 0→0 | 0→0 | không |
| d19 | 1→1 | 0→0 | 0→0 | không |
| d20 | 1→1 | 0→0 | 0→0 | không |
| d21 | 11→11 | 0→0 | 0→0 | không (11 media cũ, 0 GIF mới) |
| d24 | 139→139 | 11→11 | 11→11 | không (0 GIF trong media bản lưu) |
| d06 | 1→0 | 60→47 | 1→0 | không thêm. Mất pic và media gốc; bare wsp 36→27, textbox 23→20 |
| d07 | 0→0 | 1→0 | 0→0 | không thêm. Mất 1 connector không textbox, không sinh GIF |

Batch Codex `E:\VNOffice-profiles\codex\writer-shape-import-b3-batch` cũng chỉ thấy `d09` tăng media, nhưng đó là nhánh khác: Codex ghi `d09` 60 anchor và `d06` 139 anchor, trong khi main ghi `d09` 45 anchor và `d06` 47 anchor. Không lấy số Codex làm kết luận.

## Điều không gây ra GIF

- `this.shapes` / `renderShapeSvg` trong `_contentForExport`: mảng rỗng sau khi mở d09.
- `postprocess_created_writer_docx`: đếm pic và media không đổi.
- Lọc hairline trong `_inline_html_images`: không bỏ ảnh nào của d09.
- Thao tác bold + `ZZ`: không cần. Bản không sửa đã ra 15 pic / 11 GIF cùng MD5.

IMPLEMENTATION SUMMARY: Không sửa code sản phẩm. Bằng chứng nằm ở HTML trung gian `E:\VNOffice-profiles\grok\d09-gif-stages\` (ngoài repo) và hai bản lưu app `E:\VNOffice-profiles\grok\d09-gif-app\_rt_d09_noedit.docx`, `_rt_d09_edited.docx` (ngoài repo, không commit).

FILES CHANGED: Chỉ tài liệu này.

COMMANDS RUN:

- `LOCALAPPDATA=E:\VNOffice-profiles\grok` trước mọi lần gọi app và trước `main._run_soffice_convert`.
- Tách tầng DOCX→HTML→DOCX + hai postprocess bằng hàm thật của `main.py` / `ooxml_zip_patch.py` trên `d09.docx`.
- Mở VN Writer thật (pywebview, cùng đường `save_document_dialog`) hai lần lưu d09: không sửa, và bold+`ZZ`.
- Đối chiếu MD5 với `E:\VNOffice-profiles\claude\d09-main-baseline\_rt_d09.docx`.
- Quét zip batch Codex `E:\VNOffice-profiles\codex\writer-shape-import-b3-batch` — chỉ là gợi ý, không phải kết luận main.
- Mở+lưu lần lượt `d01.docx`–`d24.docx` trừ `d10` bằng cùng app, không `ZZ`, không Word. Khoảng 444 giây, 23/23 `saved=True`.

BUILD RESULT: NOT RUN. Task cấm sửa code; không build.

TEST RESULTS:

- PASS: GIF sinh ở DOCX→HTML StarWriter, 30 `img`, 22 sidecar, MD5 khớp media bản lưu.
- PASS: `_inline_html_images` giữ 30 GIF; hairline không kích hoạt.
- PASS: HTML→DOCX nhúng GIF thành `pic:pic`. `postprocess_created_writer_docx` không đổi số media.
- PASS: Canvas export còn 30 GIF. App lưu (có và không `ZZ`) ra 45 anchor, 15 pic, 11 GIF, trùng baseline Claude từng MD5.
- PASS: Giải thích 15 pic / 11 GIF bằng thứ tự 15 ảnh đầu bị `trust_order` thay và bằng GIF dùng chung.
- PASS: cohort `d01`–`d24` trừ `d10`, app main, profile grok, 23/23 lưu được. Chỉ `d09` có media tăng (0→11 GIF) và 15 `pic` tên mới. `d06` và `d07` mất drawing (không thêm GIF). File còn lại media và tên `pic` không tăng.

KNOWN FAILURES: Hiện tượng d09 tái hiện trên main. Cohort không có file thứ hai bị thêm GIF. `d06` mất 1 media và giảm anchor 60→47. `d07` mất 1 connector. Hai lệch đó không phải chồng ảnh GIF; task này không sửa.

RISKS: Xem hướng sửa. Xóa mọi `pic` tên `ShapeN` sẽ mất nền xanh của hình chữ nhật, vì vector `Rectangle` có textbox không được passthrough (cố ý, để không nuốt chữ người dùng sửa).

DEPENDENCIES/BLOCKERS: Không sửa `ooxml_zip_patch.py` / `writer-adapter.js` trong worktree này — Codex đang sửa vùng xuất shape Writer ở nhánh khác.

CORE PATCH ID (if any): Không có. Không vá.

## Hướng sửa đề xuất (không làm trong task này)

Chỗ lọc đúng là sau khi `_passthrough_writer_anchors` đã chép connector gốc, không phải lúc tạo GIF.

1. `adapters/libreoffice/common/ooxml_zip_patch.py`, `_writer_passthrough_matches` (nhánh `trust_order`, khoảng dòng 8492) và phần xóa media `obsolete_anchor_media`. Hôm nay `zip` chỉ ăn 15 pic đầu vì chỉ có 15 shape nguồn loại `shape`. Các pic `ShapeN` phía sau vẫn là raster của chính các connector đó (tên `Shape{n}` = anchor `n-1`, đã kiểm trên d09). Điều kiện xóa một `pic:pic`:
   - `docPr/@name` khớp `^Shape\d+$` và tên đó không có trong `docPr` của DOCX gốc;
   - `int(N) - 1` nằm trong danh sách anchor gốc và `_writer_anchor_passthrough_kind` của anchor đó là `shape` (có `wps:wsp`, không có `wps:txbx` / `w:txbxContent`);
   - anchor gốc tương ứng đã có mặt trong XML kết quả (passthrough đã chép vector).
   Đưa `r:embed` của pic bị xóa vào `obsolete_anchor_media` như các pic đã được thay. Với d09, điều này gỡ 6 pic connector còn sót (`Shape13, 14, 15, 16, 18, 19`) và GIF chỉ mình chúng dùng. Chín pic hình chữ nhật không thỏa điều kiện vì anchor gốc có textbox.

2. Chín pic hình chữ nhật (`Shape22`–`Shape30` trừ các số connector đã liệt kê) là nền/viền; `FrameN` là chữ tách rời, nền trắng, không viền. Xóa chúng mà không trả lại `wps` gốc thì mất ô màu. Hướng: với textbox **chưa sửa** (`vno-untouched`, không có `vno-edited` trong khung), cho `_writer_anchor_passthrough_kind` trả `shape` cả khi có textbox, chép `wps` gốc, rồi xóa cả `Frame` lẫn `pic` `ShapeN` cùng chỉ số. Giữ ngoại lệ hiện tại khi khung đã sửa — comment ở dòng 8359 nói rõ vì sao textbox đang bị loại khỏi passthrough.

Không lọc ở `_is_decorative_hairline_image`: các GIF này cao hơn 2 px và là nội dung sơ đồ, không phải hairline. Không lọc trong `postprocess_created_writer_docx`: hàm đó không đụng media của d09.

Rủi ro:

- Ghép `ShapeN` = anchor `n-1` đúng với d09 (khớp px với EMU/9525) nhưng là quy ước bộ đếm của LibreOffice. File khác nếu bộ đếm không đi theo thứ tự anchor thì điều kiện (2) xóa nhầm hoặc chừa ảnh. Nên chỉ xóa khi kích thước HTML/bitmap còn lệch có kiểm được, hoặc khi extent pic (trước lúc canvas ghi đè) khớp extent anchor đó. Trên bản lưu, extent pic **đã bị canvas gán nhầm** (`_preserveImportedFloatingFrames` đi theo thứ tự `img`, không theo số `ShapeN`), nên không được dùng extent trong file DOCX đã lưu để nhận shape.
- Một ảnh người dùng đặt tên `Shape19` sẵn trong file gốc bị điều kiện “tên không có trong nguồn” bảo vệ. Ảnh Word thật tên `Picture 1` không bị xóa.
- Passthrough textbox chưa sửa có thể đè chữ nếu marker `vno-untouched` dán nhầm lên đoạn đã sửa. Chỉ chép khi chính khung đó untouched.
- `d06` (nhóm `wpg`) đi đường passthrough khác. Đừng nới `trust_order` thành “xóa mọi pic thừa” mà không kiểm nhóm.

NEXT ACTION: Nhánh sửa shape của Codex áp điều kiện xóa `pic` `ShapeN` ở mục hướng sửa, chỉ với connector đã được passthrough, rồi mới xét textbox chưa sửa. Không merge `main` từ worktree này. Không sửa code tại đây.
