# Writer FODT Phase B.2 — đo thật trước khi viết serializer

**KHÔNG phải implementation.** File này ghi các sự thật đã đo bằng LibreOffice soffice thật, GDI+ thật, và Buffer.equals() trên DOCX ZIP thật. Agent tiếp theo (nếu quota hết giữa chừng) đọc file này rồi làm tiếp, không đo lại từ đầu.

- AGENT: Grok
- BRANCH: `feature/writer-fodt-migration-phase-b2`
- WORKTREE: `E:\VNOffice-grok-writer-fodt-phase-b2`
- BASE: `main` @ `4b5a297` — `node tests/run-tests.js` đo thật **1170/1170 PASS** (không dùng số 1151 trong handoff B.1 cũ)
- SOFFICE: `C:\Users\3T Computer\tools\libreoffice\program\soffice.exe` — LibreOffice **26.2.5** (`version.ini` Vendor=The Document Foundation, MSI `LibreOffice_26.2.5_Win_x86-64.msi`)
- Probe: `tests/scripts/probe-writer-fodt-phase-b2.mjs` và `tests/scripts/probe-writer-fodt-phase-b2-shapes-in-para.mjs`
- **Chưa sửa** `writer-adapter.js`.

## 0. Writer UI thật (không đoán)

`apps/writer/writer-illustrations.js` `SHAPE_TYPES` và `WriterAdapter.insertShape` / `insertTextBox`:

| UI type | Tên tiếng Việt | Mặc định | Lưu ở đâu |
|---|---|---|---|
| `rectangle` | Hình chữ nhật | 140×80, fill `#2563eb`, stroke `#1d4ed8` | `this.shapes[]` overlay, **không** nằm trong `bodyDom` HTML |
| `round-rect` | Chữ nhật bo tròn | 140×80, cùng màu rect | như trên |
| `circle` | Hình tròn / Elip | 110×110, fill `#0ea5e9`, stroke `#0284c7` | như trên; SVG là `<ellipse>`, w/h độc lập nên thực tế là oval |
| `arrow` | Mũi tên sang phải | 140×70, fill `#f59e0b`, stroke `#d97706` | như trên |
| `line` | Đường thẳng ngang | 160×30, fill `none`, stroke `#0f172a`, width 3 | như trên |
| `textbox` | Hộp văn bản | 220×80, fill `transparent`, stroke `#2563eb`, text `"Nhập văn bản"` | `this.shapes[]`, render `.vno-writer-textbox-body` |

`_insertImageDialog()` dùng `input.accept = "image/*"` rồi nhúng data URI vào body — JPEG/GIF/WEBP/BMP/TIFF đều có thể vào HTML. Phase B.2 chỉ được nhận JPEG/GIF/WEBP khi đọc được kích thước thật; BMP/TIFF vẫn fail-closed.

`serializeToFodt()` hiện chỉ đọc `bodyDom.innerHTML`. Shape overlay **sẽ bị mất** nếu không serialize `this.shapes` — đó là lỗ hổng dữ liệu, không phải HTML.

## 1. Ảnh — kích thước header thật

### JPEG (GDI+ System.Drawing, 16×10, 633 bytes)

- Marker thật: **SOF0 `0xFFC0`** (baseline). GDI+ trên máy này **không** sinh SOF2.
- SOF: precision=8, **width=16, height=10** — khớp `Bitmap(16,10)`.
- Công thức Phase B `_fodtPxToCm`: `16/96*2.54 = 0.423cm`, `10/96*2.54 = 0.265cm`. LibreOffice canonical FODT ghi đúng `svg:width="0.423cm" svg:height="0.265cm"`.
- Reader phải quét segment JPEG: bỏ APP/DQT/DHT, đọc height/width big-endian ngay sau length+precision của SOF0 **hoặc SOF2 (`0xFFC2`)**. SOF khác (C1/C3/…) fail-closed. Unit test SOF2 dùng header tự ghép (soffice không có file SOF2 từ GDI+).

### GIF (GDI+, 12×8, 865 bytes)

- Header thật: **`GIF89a`**. Logical screen: bytes 6–9 little-endian **width=12, height=8**.
- Hex đầu: `47 49 46 38 39 61 0c 00 08 00` = `GIF89a` + 12 + 8.
- Reader nhận cả `GIF87a` và `GIF89a`; khác signature thì từ chối.
- `_fodtPxToCm(12)=0.318cm`, `_fodtPxToCm(8)=0.212cm` — khớp canonical FODT LibreOffice.

### WEBP — ba biến thể đo riêng, không gộp một parser

File tự dựng (RIFF), đọc header trước khi convert:

| Biến thể | Bytes | Chunk thật | Kích thước đọc từ chunk đó |
|---|---|---|---|
| VP8 (lossy, không VP8X) | 44 | `VP8 ` size=24, start code `9d 01 2a` | width/height 14-bit LE tại offset payload+6/+8 → **1×1** |
| VP8L (lossless, không VP8X) | 34 | `VP8L` size=14, signature `0x2F` | 14-bit width-1 / height-1 packed sau signature → **1×1** |
| VP8X (extended + inner VP8) | 62 | `VP8X` size=10 rồi `VP8 ` | canvas 24-bit LE tại payload+4 / +7 (cộng 1) → **1×1**; **không** lấy size từ inner VP8 khi đã có VP8X |

Reader phải: nhìn fourcc **đầu tiên** sau `WEBP`. `VP8X` → canvas VP8X. `VP8 ` → bitstream VP8. `VP8L` → bitstream VP8L. Chunk lạ → từ chối. Không dùng một công thức cho cả ba.

## 2. Ảnh — convert soffice FODT → DOCX/PDF/FODT (Buffer.equals)

Pattern XML (tái sử dụng Phase B / Slides): `draw:frame text:anchor-type="as-char"` + `draw:image xlink:href="" ... draw:mime-type="..."` + `office:binary-data`.

| Định dạng | DOCX | `word/media/` | Buffer.equals(gốc) | Canonical FODT mime | PDF |
|---|---|---|---|---|---|
| JPEG `image/jpeg` | OK 5885 | `image1.jpeg` (633) | **true** | `image/jpeg` | OK |
| GIF `image/gif` | OK 5973 | `image1.gif` (865) | **true** | `image/gif` | OK |
| WEBP VP8 | OK 5518 | `image1.png` (90) | **false** | **`image/png`** | OK |
| WEBP VP8L | OK 5517 | `image1.png` (89) | **false** | **`image/png`** | OK |
| WEBP VP8X | OK 5520 | `image1.png` (90) | **false** | **`image/png`** | OK |

JPEG/GIF: native `<w:drawing>`, **không** VML `w:pict`, byte gốc giữ nguyên (LibreOffice không mã hóa lại).

WEBP (cả ba biến thể, LibreOffice 26.2.5): engine **mở được** FODT có `image/webp` nhưng filter DOCX/FODT **raster hóa thành PNG**. Không được assert `Buffer.equals` với bytes WEBP gốc — đó là sự thật của engine, không phải lỗi serializer. VN FODT round-trip vẫn có thể giữ `image/webp` (LibreOffice chỉ đổi khi chính nó canonicalize). Đánh dấu "hỗ trợ FODT + VN idempotence"; live DOCX assertion phải ghi **re-encode PNG**, không giả byte-exact.

BMP (magic `BM`, 246 bytes) / TIFF: **không** đưa vào serializer. Từ chối `WRITER_FODT_UNSUPPORTED_CONTENT`.

LibreOffice canonical FODT **bỏ** `xlink:href=""` (không có attribute). Parser phải nhận `draw:image` khi có `office:binary-data`, không bắt buộc href rỗng.

## 3. Shape / Text Box — cấu trúc ODF thật

### 3.1 Bắt buộc nằm trong `text:p`

Lần 1: `draw:rect` / `draw:ellipse` / `draw:line` / `draw:custom-shape` / `draw:frame`+`draw:text-box` đặt **cùng cấp** `text:p` trong `office:text` (anchor `paragraph`) → soffice convert **không lỗi** nhưng **nuốt hết drawing**. Canonical FODT không còn `draw:*`, DOCX không có `w:drawing`. Chỉ còn text.

Lần 2: cùng primitive **bên trong** `<text:p>...</text:p>` → drawing sống, ra native Word shape.

Kết luận: serializer phải nhúng drawing vào một `text:p`. Không phát `draw:*` như block sibling.

### 3.2 Mapping đo được (input ODF 1.3 tay → soffice → canonical FODT + DOCX)

Mọi primitive dưới đây nằm trong `text:p`. Cả `text:anchor-type="as-char"` và `text:anchor-type="paragraph"` + `svg:x`/`svg:y` đều sống.

| UI Writer | XML gửi vào | Canonical LibreOffice | Word `prstGeom` |
|---|---|---|---|
| rectangle | `draw:rect` + graphic style fill/stroke | `draw:rect` (giữ width/height, thêm `draw:z-index`, `draw:text-style-name`, `<text:p/>`) | `rect` + `wps:wsp` |
| round-rect | `draw:rect` + `draw:corner-radius="0.3cm"` | **giữ** `draw:corner-radius="0.3cm"` | `roundRect` |
| circle (w=h) | `draw:ellipse` w=h | LibreOffice **đổi thành `draw:circle`** | `ellipse` |
| line | `draw:line` `svg:x1/y1/x2/y2` | `draw:line` (as-char có thể bỏ x1/y1 = origin) | `line` |
| arrow | `draw:custom-shape` + `draw:enhanced-geometry draw:type="right-arrow"` + path Slides đã đo | giữ type `right-arrow`, **thêm** `draw:modifiers="16200 5400"` và `draw:equation` | `rightArrow` |
| textbox | `draw:frame` chứa `draw:text-box` chứa `text:p` | giữ nguyên cấu trúc frame/text-box | `rect` + **txbx** (`w:txbxContent` / `wps:txbx` / `v:textbox`, 4 hit) |

Graphic style input (`draw:fill` / `draw:fill-color` / `draw:stroke` / `svg:stroke-color` / `svg:stroke-width`) được LibreOffice giữ, đổi tên thành `gr1`. Text Box: `draw:fill="none"` + stroke `#2563eb` — khớp UI `fill: transparent`.

Parser **phải nhận** `draw:circle` (output LO) lẫn `draw:ellipse` (input VN). Không bịa shape ngoài 6 loại UI.

### 3.3 Neo cho overlay Writer

`this.shapes` có `x,y,w,h` tuyệt đối trên layer. `paragraph` + `svg:x`/`svg:y` (cm từ px, cùng `_fodtPxToCm`) **bên trong `text:p`** là primitive ODF khớp overlay. `as-char` cũng convert đúng nhưng bỏ vị trí tuyệt đối.

Quyết định serializer (dựa trên đo, chưa viết code):

- Ảnh HTML `<img>`: giữ Phase B `as-char` (inline trong dòng).
- `this.shapes`: `text:anchor-type="paragraph"` + `svg:x`/`svg:y`/`svg:width`/`svg:height` (line dùng x1/y1/x2/y2), **nhét vào `text:p` đầu tiên**; nếu body không có `text:p` thì tạo một `text:p` host.
- Parse: tách drawing ra `this.shapes`, không nhét overlay vào HTML body (đúng mô hình UI hiện có). `draw:frame`+`draw:image` vẫn ra `<img>` như Phase B.

## 4. Hệ quả cho implementation (chưa làm)

1. `_fodtPngDimensionsPx` mở thành dispatcher theo mime: PNG / JPEG (SOF0+SOF2) / GIF (byte 6–9) / WEBP (VP8|VP8L|VP8X riêng). Mime khác → `WRITER_FODT_UNSUPPORTED_CONTENT`.
2. `imageXml`/`imageHtml`: `draw:mime-type` đúng `image/jpeg|gif|webp|png`; data URI parse giữ mime thật.
3. Test JPEG Phase A/B đang dùng JPEG làm ví dụ "ngoài phạm vi" phải đổi sang BMP/TIFF (cùng pattern B.1 đổi colspan).
4. Shape: graphic automatic-styles deterministic (`grN`), 6 loại UI, fail-closed custom-shape không phải `right-arrow`.
5. Live soffice:
   - JPEG/GIF: `Buffer.equals` media DOCX với bytes gốc.
   - WEBP: assert media là PNG (engine re-encode), có `w:drawing`, PDF hợp lệ — **không** equals WEBP gốc.
   - Shape/Text Box: `w:drawing` + `prstGeom` đúng (`rect`/`roundRect`/`ellipse`/`line`/`rightArrow`), text box có txbx + chữ.
6. BMP/TIFF vẫn bị từ chối rõ ràng.

## 5. Việc chưa đo / giới hạn

- Không có file JPEG SOF2 từ GDI+; reader SOF2 chỉ unit-test bằng header ghép.
- WEBP 1×1 tự dựng (không phải ảnh lớn). Header 1×1 đủ để phân biệt VP8/VP8L/VP8X; soffice chấp nhận cả ba rồi đều ra PNG.
- `draw:ellipse` lệch tỉ lệ (oval thật) chưa convert riêng — UI `circle` cho phép w≠h; serializer nên luôn ghi `draw:ellipse`, parser nhận cả `circle` lẫn `ellipse`.
- Chưa mở Microsoft Word bằng mắt (làm sau khi có serializer, cùng quy trình Phase A/B/B.1: Start-Process thụ động, chụp màn hình, xóa rác, Stop-Process).
