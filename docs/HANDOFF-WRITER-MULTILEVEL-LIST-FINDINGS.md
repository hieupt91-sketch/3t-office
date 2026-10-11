# Writer Multilevel List — đo thật trước khi viết code

**KHÔNG phải implementation.** File này ghi sự thật đã đo: chỗ Writer UI lưu bullet/number hiện tại, cấu trúc ODF `text:list` lồng nhau / `text:list-style` nhiều cấp, và kết quả soffice → DOCX `word/numbering.xml` + `w:numPr`/`w:ilvl` (unzip XML thật, không đoán). Agent tiếp theo đọc file này rồi làm serializer/UI, không đo lại từ đầu.

- AGENT: Grok
- BRANCH: `feature/writer-multilevel-list`
- WORKTREE: `E:\VNOffice-grok-writer-multilevel-list`
- BASE: `main` @ `fbd236d` — `node tests/run-tests.js` đo thật **1307/1307 PASS**
- SOFFICE: `C:\Users\3T Computer\tools\libreoffice\program\soffice.exe` — LibreOffice **26.2.5** (`version.ini` Vendor=The Document Foundation, buildid `cd7284b4cbbfeb507e630c1aac019f4157393acb`)
- Probe: `tests/scripts/probe-writer-multilevel-list.mjs` (7 FODT tay, mỗi cái convert DOCX + canonical FODT)
- Nguồn GAP: `docs/HANDOFF-WRITER-RIBBON-PARITY-ROUND1.md` mục 5 (Multilevel List)
- **Chưa sửa** `writer-adapter.js` / ribbon / command-definitions.

---

## 0. Writer UI thật (không đoán)

### 0.1 Lệnh hiện có = `execCommand` list HTML, không phải engine đếm cấp

Tên lệnh **không** phải `writer.para.bullets` / `writer.para.numbering` như GAP ghi. Code thật:

| Lệnh | `handleDispatch` | UNO |
|---|---|---|
| `writer.list.bullet` | `document.execCommand("insertUnorderedList")` | `.uno:DefaultBullet` |
| `writer.list.numbered` | `document.execCommand("insertOrderedList")` | `.uno:DefaultNumbering` |
| `writer.para.indentInc` | `document.execCommand("indent")` | `.uno:IncrementIndent` |
| `writer.para.indentDec` | `document.execCommand("outdent")` | `.uno:DecrementIndent` |

Canvas = `contenteditable`. Danh sách sống là `<ul>` / `<ol>` / `<li>` lồng nhau. Không có counter CSS, không có `data-vno-list-level`, không có style list riêng từng cấp.

Ribbon tab **Trang đầu**, nhóm **Đoạn văn**, hàng 1 (sau đợt Ribbon Parity Round 1):

```
writer.list.bullet → writer.list.numbered → writer.para.indentDec → writer.para.indentInc → writer.para.sort → writer.para.showFormattingMarks
```

Chưa có nút/dropdown Multilevel List. Word đặt nút đó **ngay sau** Numbering, **trước** Decrease Indent.

### 0.2 FODT Phase A đã serialize nested `text:list` — nhưng chỉ 1 cấp style

`listXml` trong `serializeToFodt()`:

- `<ul>` → `text:style-name="LBullet"`
- `<ol>` → `text:style-name="LNumber"`
- Con `<ul>`/`<ol>` trong `<li>` → `text:list` lồng trong `text:list-item` (đúng mô hình ODF)
- Thuộc tính `type` khác `"1"`, `start`, hoặc attr ngoài `style`/`class`/`type`/`start` → **throw** `WRITER_FODT_UNSUPPORTED_CONTENT`
- `class` **được phép** nhưng **không đọc** — chưa có cách đánh dấu preset multilevel

`automatic-styles` luôn emit đúng 2 style, mỗi cái **chỉ level 1**:

```xml
<text:list-style style:name="LBullet">
  <text:list-level-style-bullet text:level="1" text:bullet-char="•">…</text:list-level-style-bullet>
</text:list-style>
<text:list-style style:name="LNumber">
  <text:list-level-style-number text:level="1" style:num-format="1" style:num-suffix=".">…</text:list-level-style-number>
</text:list-style>
```

`parseFodt()` `listHtml`:

- Chỉ nhận `LBullet` / `LNumber` — tên khác → throw
- Nested `text:list` **bắt buộc** có `text:style-name` (không inherit)
- Cấu trúc item: đúng một `text:p` rồi 0..n `text:list`

Fixture Phase A đã có `<ol><li>Hai<ul><li>Con</li></ul></li></ol>` — round-trip idempotent **mixed** number+bullet, không phải outline 1.1.1.

### 0.3 Tab hiện tại = điều hướng ô bảng, không đổi cấp list

`_workflowKeydownHandler` chỉ bắt `Tab` khi caret nằm trong `td`/`th`. Ngoài bảng, Tab **không** `preventDefault` → trình duyệt chèn ký tự tab / nhảy focus.

`Ctrl+M` / `Ctrl+Shift+M` = indent/outdent `execCommand`. Trong list, trình duyệt thường lồng `<li>` vào list con — đó **là** hành vi tăng/giảm cấp HTML. Writer **chưa** bắt Tab để gọi lệnh đó.

Thứ tự ưu tiên bắt buộc khi mở rộng: **bảng trước, list sau**. Tab trong ô bảng phải giữ điều hướng ô (không được tăng cấp list trong ô).

### 0.4 Canvas CSS không định kiểu list

`apps/writer/writer.css` không có rule `ul`/`ol`/`li` trên `.vno-writer-page`. Marker là mặc định user-agent (`disc` / `decimal`). Outline `1.1.1` và `Điều 1` **không** hiện đúng nếu chỉ lồng `<ol>` — cần CSS counter / `list-style-type` theo class preset.

### 0.5 Pattern sẵn có — tái sử dụng, không viết engine đếm riêng

| Việc | API đã có | Ghi chú |
|---|---|---|
| Bật/tắt list | `insertUnorderedList` / `insertOrderedList` | Giữ cho bullet/number đơn. Multilevel **đóng dấu class lên `<ol>`**, không thay model. |
| Tăng/giảm cấp HTML | `indent` / `outdent` | Tab/Shift+Tab trong `li` gọi lại `writer.para.indentInc`/`indentDec`, rồi copy class preset xuống list con. |
| Block đang chọn (kể cả `li`) | `_getSelectedParagraphBlocks()` | Đã special-case `li` + sibling. Dùng khi áp preset lên đoạn/list đang chọn. |
| Dropdown gallery + args | `createDropdownButton` → `execute(commandId, subItem.args)` | Pattern `writer.para.borders` / line-spacing. **Không** cần 3 command id riêng. |
| Registry style FODT | `styleName(..., JSON.stringify)` | List style hiện **hard-code** tên. Multilevel thêm 3 tên deterministic (`LMultiDecimal` / `LMultiLetter` / `LMultiNd30`), không sinh P1/P2. |

Không viết counter engine song song với `<ol>`/`<ul>`. Cấp = độ sâu lồng HTML. Nhãn = `text:list-style` (ODF) / CSS (canvas).

---

## 1. DOCX / ODF chuẩn — đo soffice 26.2.5

ECMA-376: mỗi đoạn list có `w:numPr` (`w:ilvl` = cấp 0-based, `w:numId` trỏ `w:num` trong `word/numbering.xml`). `w:abstractNum` định nghĩa tối đa **9** `w:lvl` (`ilvl` 0–8) với `w:numFmt` + `w:lvlText` (`%1.`, `%1.%2.`, `Điều %1.`, …).

ODF 1.3: một `text:list-style` chứa nhiều `text:list-level-style-number` (`text:level` 1-based). Outline `1.1.1` dùng `text:display-levels`. Prefix/suffix = `style:num-prefix` / `style:num-suffix`. List lồng: `text:list` trong `text:list-item`. Nested list **cùng style** = cấp kế tiếp (không phải list mới).

### 1.1 Bảng đo thật (FODT tay → soffice DOCX)

Cùng cây 3 cấp (L1_ONE → L2_ONE → L3_ONE/L3_TWO, L2_TWO, L1_TWO). Mọi đoạn đo được **cùng `w:numId="1"`**, `ilvl` = 0 / 1 / 2 đúng độ sâu. `word/numbering.xml` luôn có `w:abstractNum` 9 cấp (LO pad) + một abstract `numFmt="none"` rỗng.

| FODT input | `w:lvl` 0 / 1 / 2 đo được | Canonical FODT (LO rewrite) |
|---|---|---|
| **VN hiện tại**: `LNumber` chỉ `text:level="1"`, nested **lặp** `text:style-name="LNumber"` | `decimal` `%1.` / `%2.` / `%3.` — **không** ra 1.1.1. Nested vẫn ra đúng `ilvl` 0/1/2 | Đổi tên style thành `L1`, pad **10** level số `1` + `.`, **bỏ** `text:style-name` trên list con (`canonicalStyledListCount=1`) |
| `LMultiDecimal` level 1–3, `text:display-levels="2"`/`"3"`, nested **lặp** style-name | `decimal` **`%1.` / `%1.%2.` / `%1.%2.%3.`** | Giữ `display-levels` 2 và 3; pad level 4–10 **không** display-levels |
| Cùng `LMultiDecimal` nhưng list con **không** style-name (inherit) | **Giống hệt** case trên | Giống hệt |
| `LMultiLetter` 1 / a / i, suffix `.` | `decimal` `%1.` / `lowerLetter` `%2.` / `lowerRoman` `%3.` | Canonical format `1` / `a` / `i`, **không** display-levels |
| `LMultiNd30`: prefix `Điều ` + suffix `.` / `.` / `)` | **`Điều %1.`** / `%2.` / `lowerLetter` **`%3)`** | Giữ prefix `Điều `, suffix `)` ở level 3 |
| 9 cấp `display-levels` 1–9 | `ilvl` 0–8, `lvlText` `%1.` … `%1.%2.…%9.` | 9 level có display-levels + level 10 pad không display-levels |
| Mixed `LNumber` + `LBullet` lồng (Phase A) | Đoạn số `numId=1` `ilvl=0`; bullet con `numId=4` `ilvl=1` (list **khác**) | Hai họ style — không phải một multilevel |

`text:space-before="0.635cm"` × cấp + `text:min-label-width="0.635cm"` (form VN đang dùng) — soffice nhận, không cần `label-alignment` cho round-trip DOCX `numPr`.

### 1.2 Hệ quả bắt buộc cho serializer VN

1. **Nested `text:list` cùng một `text:style-name` đã đủ** để soffice gán `w:ilvl` 0/1/2 và cùng `w:numId`. Không cần `w:numPr` viết tay, không cần post-process DOCX.
2. **Nhãn 1.1.1 không tự có.** `LNumber` chỉ level 1 → DOCX `%1.`/`%2.`/`%3.` (mỗi cấp đếm riêng). Phải emit `text:display-levels="2"` và `"3"` trên style decimal.
3. **1/a/i** = `style:num-format` `1`/`a`/`i` (không display-levels). soffice → `decimal`/`lowerLetter`/`lowerRoman`.
4. **NĐ 30** đo được: `style:num-prefix="Điều "` (có dấu cách) + `style:num-suffix="."` / `"."` / `")"`. Không cần Core patch, không cần meta side-channel.
5. Nested **có** hoặc **không** `text:style-name` (cùng style) → DOCX **giống nhau**. Canonical LO **chỉ** ghi style-name ở list gốc. Parse VN **phải inherit** khi list con thiếu style-name — nếu không, file qua soffice FODT sẽ throw.
6. LO canonical **đổi tên** `LMultiDecimal` → `L1` và pad 10 level. Idempotence VN = output VN (tên `LMulti*` + đúng 3 level đã dùng), **không** so file canonical LO.
7. `data-*` trên `<ol>` hiện **throw**. Dùng **`class`** (`vno-ml-decimal` / `vno-ml-letter` / `vno-ml-nd30`) — attr đã nằm allow-list.

### 1.3 Giới hạn 3 cấp — lý do đo được, không phải đoán

Word/LO hỗ trợ 9 cấp (`ilvl` 0–8); probe 9 cấp **chạy được**. Vẫn **cố ý dừng ở 3 cấp** trong đợt này:

- Văn bản hành chính NĐ 30 chỉ cần Điều / Khoản / Điểm (3 cấp).
- Canvas CSS counter + Tab cap + test XML 3 cấp là một đường đi khép kín; 9 cấp nhân CSS/indent/edge-case (item đầu, list rỗng, mixed bullet) mà không thêm giá trị NĐ 30.
- Level 4–9 của LO pad `decimal` `%N.` — VN **không emit**; soffice tự pad khi convert.

Tab tăng cấp khi đang ở cấp 3: **không** lồng thêm (giữ cấp 3). Shift+Tab cấp 1: ra đoạn thường (cùng hướng `outdent` hiện có).

---

## 2. Quyết định mặc định (ghi rõ lý do)

**Không** biến mọi `<ol>` hiện có thành outline 1.1.1.

Lý do đo được:

1. Fixture Phase A (`LNumber`/`LBullet`) và tài liệu user đã lưu phải round-trip như cũ. Đổi `LNumber` sang `display-levels` sẽ đổi nhãn DOCX từ `%2.` thành `%1.%2.` — phá idempotence Phase A.
2. soffice đo: list không `display-levels` vẫn là multilevel **cấp** (`ilvl`) nhưng nhãn từng cấp độc lập — đó là Numbering lồng, không phải Multilevel List gallery của Word.

**Quyết định:**

| Lớp | Hành vi |
|---|---|
| `<ul>` / `<ol>` không class multilevel | Giữ `LBullet` / `LNumber` (1 level), như Phase A |
| `<ol class="vno-ml-decimal">` | `LMultiDecimal` — 1. / 1.1. / 1.1.1. |
| `<ol class="vno-ml-letter">` | `LMultiLetter` — 1. / a. / i. |
| `<ol class="vno-ml-nd30">` | `LMultiNd30` — Điều 1. / 1. / a) |
| List con cùng cây | Cùng class + cùng `text:style-name`; serialize truyền inherited style |
| Bullet/Number nút cũ | Không đổi |

Ba preset **cùng độ phức tạp serializer** (chỉ khác attribute style) — probe đã chứng minh cả ba ra đúng `w:lvl`. Làm đủ 3, không bỏ NĐ 30.

Không làm trong đợt này: 9 cấp UI, gallery Word đầy đủ (legal, article, v.v.), `w:lvlText` tùy chỉnh, restart numbering (`start=` vẫn throw), list trong ô bảng (Phase B cấm list trong cell).

---

## 3. Ánh xạ implementation (chưa làm code)

### 3.1 Lưu trữ DOM

- Root list: `<ol class="vno-ml-decimal|vno-ml-letter|vno-ml-nd30">`.
- List con: cùng class (copy sau `indent`). Thiếu class lúc serialize → inherit từ tổ tiên.
- Cấp = số `<ol>`/`<ul>` tổ tiên. Không lưu `data-level`.
- CSS canvas (`.vno-writer-page`):
  - decimal: `counter` `1.` / `1.1.` / `1.1.1.` + `list-style: none`
  - letter: `list-style-type` decimal / lower-alpha / lower-roman
  - nd30: `counter` `Điều N.` / `N.` / `a)`

### 3.2 Command + UI

Một lệnh nhận args (pattern `writer.para.borders`):

- `writer.para.multilevelList` — args `"decimal"` \| `"letter"` \| `"nd30"`
- UNO: `.uno:OutlineBullet` (không đụng `.uno:DefaultNumbering` của nút Đánh số)

Ribbon tab Trang đầu, nhóm Đoạn văn, hàng 1: dropdown **ngay sau** `writer.list.numbered`, **trước** `indentDec`. Ba item gallery nhãn thật:

- `1. / 1.1. / 1.1.1.`
- `1. / a. / i.`
- `Điều 1. / 1. / a)`

Dropdown **icon + mũi tên**, không nhãn chữ trên ribbon (tránh tràn Home 1280px; Writer Home VI đang ~1055px). `createDropdownButton` hiện luôn render label — cần `iconOnly` (cùng pattern `createCommandButton`). Đây là chỉnh `platform/ui-kit` + `ribbon-host` tối thiểu để gallery nằm được hàng icon.

Tab trong `li` (không phải ô bảng): `preventDefault` → `indentInc`. Shift+Tab → `indentDec`. Cấp ≥ 3: Tab no-op. Sau indent: propagate class preset xuống `ol` mới.

Áp preset: đoạn thường → bọc/đổi thành `<ol class="…">`; list đã có → đổi tag + class (không xóa nội dung). Cùng preset bấm lại: giữ (gallery Word không toggle off). Tắt list: nút Đánh số / Dấu đầu dòng hiện có.

### 3.3 FODT

- `listXml(node, inheritedName)`: class → tên style, không có thì inherited, không có nữa thì `LNumber`/`LBullet`.
- Emit `text:style-name` trên **mọi** `text:list` (deterministic như Phase A). Parse vẫn inherit khi thiếu.
- `LMultiDecimal` / `LMultiLetter` / `LMultiNd30`: đúng 3 `text:list-level-style-number`, `space-before` 0.635 / 1.27 / 1.905 cm. Chỉ emit style nào **được dùng**.
- `LBullet`/`LNumber` giữ emit như hiện tại (Phase A match).
- Parse nhận 5 tên + inherit. Tên lạ vẫn throw (không nuốt).

### 3.4 Help

Bài tiếng Việt riêng: tab Trang đầu / nhóm Đoạn văn / dropdown đa cấp, 3 preset, Tab/Shift+Tab, trần 3 cấp, phân biệt với Đánh số 1. 2. 3.

### 3.5 Test bắt buộc

- Unit: serialize 3 preset × 3 cấp, inherit parse, idempotence, Phase A list cũ không đổi, command/i18n/UNO/ribbon vị trí.
- Live soffice: FODT VN → unzip `numbering.xml` + `document.xml` — assert `lvlText`/`numFmt`/`ilvl` như bảng §1.1 (không đoán).
- `node tests/live/ribbon-audit-1280.playwright.mjs` 100% trước commit có nút mới.

---

## 4. Rủi ro đã thấy (chưa code)

- `execCommand("indent")` trên item đầu (không sibling trước) có thể tạo `<li>` cha rỗng chỉ chứa list con. Serializer hiện cho phép `text:p` rỗng + nested list — giữ, đừng throw.
- `createDropdownButton` iconOnly đụng `platform/ui-kit` + `ribbon-host` (ngoài danh sách file user liệt kê, nhưng bắt buộc để gallery không phá audit 1280). Không đụng Sheet/Slides ribbon.
- Canonical LO đổi `LMulti*` → `L1`: không parse-đòi hỏi tên LO; mở FODT sau soffice rewrite sẽ throw “list style L1” trừ khi mở rộng parse sau này (ngoài scope — cùng convention Phase A).
- Không jsdom trong repo: test Tab/apply dựa innerHTML đã lồng + serialize; live soffice kiểm XML thật.

---

## 5. Rollback

Không merge. Xóa worktree / không lấy branch. Không đụng `main`.
