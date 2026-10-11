# Agent Handoff
TASK: `serializeToFodp()` / `parseFodp()` ghi và đọc `slide.comments[]` qua XML ODF trang chiếu — hết mất nhận xét khi Lưu/Mở
AGENT/ROLE: Grok (Integration / adapter + test)
BRANCH: `fix/fodp-save-slides-comments`
WORKTREE: `E:\VNOffice-grok-slides-comments-fodp`
OBJECTIVE: Comment Slides đang chỉ sống trong phiên làm việc. Sau Lưu FODP/PPTX rồi Mở lại bị mất vì adapter không serialize/parse. Sửa trên adapter, chứng minh bằng round-trip in-memory, hop soffice PPTX thật, và đường import độc lập (FODP viết tay → soffice PPTX → FODP → `loadFromFodp()`, không qua serializer VN).

---

## Plan gate

Thay đổi parse/serialize FODP trên Slides adapter + test round-trip. Không đụng Core, Writer, Sheet, canvas logic, build system, không gửi nội dung tài liệu ra cloud. **Không merge vào main.**

- **Objective:** `serializeToFodp()` ghi `slide.comments[]` ra XML ODF chuẩn trên `<draw:page>`; `parseFodp()` đọc lại text/author/timestamp. Vòng serialize → soffice PPTX → FODP → parse đo sức chịu đựng thật. Đường mở PPTX có comment không đi qua serializer VN.
- **Current capability trước task:** Canvas gán `slide.comments[] = {id,text,author,timestamp}`. `serializeToFodp()` không ghi field này. `parseFodp()` không đọc annotation. Roadmap đã ghi rõ metadata comment là trạng thái phiên.
- **Files/modules:** `adapters/libreoffice/slides/slides-adapter.js`; unit `tests/unit/slides-file-io.test.js`; live `tests/live/fodp-save-slides-comments-real-conversion.mjs`; fixture `tests/fixtures/real-office-samples/src/sample-slides-comments.fodp`.
- **Dependency:** `soffice.exe` tại `C:\Users\3T Computer\tools\libreoffice\program\soffice.exe` (chỉ live test).
- **Risk:** Annotation `text:p` nếu không tách khỏi `draw:page` sẽ lẫn vào title/body (đã đo trên hop PPTX trước khi sửa). Parse thêm `officeooo:annotation` vì Impress không giữ nguyên `office:annotation` sau hop. Không đổi nhánh parse shape/title/notes.
- **Test plan:** unit in-memory + canned XML kiểu soffice (<60s) + live soffice comments + live save-shapes / table-arrow / transition-animation / title-body-animation cũ.
- **Rollback:** revert branch; serializer cũ không ghi comments.

---

## FINDINGS (đo trên code thật + hop soffice, không suy diễn)

### Bug xác nhận trước khi sửa

Probe in-memory trên adapter **chưa sửa** (`tests/scripts/probe-slides-comments-fodp.mjs`):

| Kiểm tra | Kết quả |
|---|---|
| `serializeToFodp()` có `office:annotation` / `dc:creator` / chữ comment | **false** (grep `comments` trong adapter = 0) |
| `parseFodp()` → `slide.comments` | **undefined** |
| Canvas (`apps/slides/slides-canvas.js`, chỉ đọc) | `addComment()` đẩy `{id, text, author, timestamp}` vào `slide.comments[]` |

Đây là lỗi mất dữ liệu thật khi Lưu, cùng pattern shapes/table/arrow/transition trước đó — không phải giới hạn LibreOffice.

### XML ODF thật (LibreOffice Impress)

Không bịa cấu trúc. FODP viết tay có `<office:annotation>` con của `<draw:page>` (kèm `svg:x/y/width/height`, `<dc:creator>`, `<dc:date>`, `<text:p>`), khác Sheet (`office:annotation` trong `<table:table-cell>`) và khác Writer (annotation range + `office:annotation-end`).

Hop soffice LibreOffice 26.2.5.2:

| Bước | Tag comment | Author/text/date |
|---|---|---|
| FODP viết tay | `office:annotation` trên `draw:page` | giữ |
| FODP → FODP rewrite | **`officeooo:annotation`** (ns `http://openoffice.org/2009/office`) | giữ |
| FODP → PPTX | `ppt/commentAuthors.xml` + `ppt/comments/comment1.xml` (`p:cm` classic) | giữ |
| PPTX → FODP | **`officeooo:annotation`** trên `draw:page` | giữ |

PPTX classic comment (đo được):

```xml
<p:cmAuthor id="0" name="Tran Thi Hoa" .../>
<p:cm authorId="0" dt="2026-09-05T09:10:00.000000000" idx="1">
  <p:pos x="4989" y="91"/>
  <p:text>Can doi chieu so lieu quy II truoc khi trinh.</p:text>
</p:cm>
```

FODP sau hop (đo được):

```xml
<officeooo:annotation svg:x="22.217cm" svg:y="0cm" svg:width="1.079cm" svg:height="0.496cm">
  <dc:creator>Tran Thi Hoa</dc:creator>
  <dc:date>2026-09-05T09:10:00</dc:date>
  <text:p>Can doi chieu so lieu quy II truoc khi trinh.</text:p>
</officeooo:annotation>
```

Trước khi sửa parse: hop PPTX làm comment `text:p` còn lại trên page → `parseFodp()` lấy làm title/body (`title="Can doi chieu..."`). Sau khi tách annotation, không còn lẫn.

---

## IMPLEMENTATION SUMMARY

### Serialize
- Mỗi phần tử `slide.comments[]` có text → một `<office:annotation>` **con trực tiếp của** `<draw:page>` (sau notes, khớp thứ tự soffice).
- `draw:name` = id canvas (sống sót serialize→parse in-memory; **mất sau hop PPTX**).
- `dc:creator` = author, `dc:date` = ISO không ms/Z (`2026-09-05T09:10:00.000Z` → `2026-09-05T09:10:00`, khớp LO).
- `text:p` = nội dung (nhiều dòng = nhiều `text:p`).
- `svg:x/y/width/height` mặc định góc phải, xếp chồng theo index (VN model không có toạ độ pin).
- Thêm `xmlns:dc="http://purl.org/dc/elements/1.1/"`.

Không ghi `officeooo:annotation` khi serialize — ODF chuẩn `office:annotation` đủ để soffice nhận và xuất PPTX (đã đo).

### Parse
- Đọc cả `office:annotation` (FODP VN / viết tay) và `officeooo:annotation` (FODP sau soffice).
- Tách khối annotation **trước** khi gom `text:p` title/body để không lẫn chữ comment.
- Map `{id, text, author, timestamp}`. Thiếu `draw:name` thì id = `comment-1`, `comment-2`, …

### Không sửa
`apps/slides/slides-canvas.js` (chỉ đọc cấu trúc). Writer / Sheet. LibreOffice Core. Không SendKeys, không thư viện trả phí.

---

## Kết quả hop soffice PPTX thật

Live: `node tests/live/fodp-save-slides-comments-real-conversion.mjs` — **PASS, 26.7s**.

### A) Lưu VN Office (serialize → PPTX → FODP → parse)

Hai slide: slide 1 hai comment, slide 2 không comment.

| Thuộc tính | In-memory | PPTX | FODP sau hop | `parseFodp()` |
|---|---|---|---|---|
| Hoa text | `Can doi chieu so lieu quy II truoc khi trinh.` | `<p:text>` đúng | `officeooo:annotation` `text:p` | **giữ** |
| Hoa author | Tran Thi Hoa | `p:cmAuthor name=` | `dc:creator` | **giữ** |
| Hoa time | `2026-09-05T09:10:00.000Z` | `dt="2026-09-05T09:10:00.000000000"` | `dc:date=2026-09-05T09:10:00` | **giữ prefix** (mất `.000Z`) |
| Duc text/author/time | tương tự | giữ | giữ | **giữ** |
| id `comment-hoa-1` | giữ trên `draw:name` | không có trong `p:cm` | không có `draw:name` | **mất** → `comment-1` |
| Title slide 1 | Bao cao de an VN Office 2026 | giữ | giữ | **giữ** |
| Slide 2 comments | `[]` | không có comment file | không annotation | **[]** |

### B) Mở PPTX độc lập (FODP viết tay, **không** dùng serializer VN)

Fixture `tests/fixtures/real-office-samples/src/sample-slides-comments.fodp` → soffice `--convert-to pptx` → soffice PPTX→FODP → `loadFromFodp()` (cùng đường `adapter.open()` nhận FODP từ bridge).

| Thuộc tính | Kết quả |
|---|---|
| PPTX `commentAuthors.xml` | Tran Thi Hoa, Pham Minh Duc |
| FODP sau hop | 2× `officeooo:annotation` |
| `loadFromFodp()` comments | text/author/time **đúng**, 2 comment trên slide 1, slide 2 rỗng |
| Title sau hop | `"Trang chiếu 1"` — filter PPTX biến khung handwritten thành `draw:custom-shape` (mất `presentation:class`). **Không** phải comment làm hỏng title; chữ comment không thay title. Serializer VN có `presentation:class` nên đường Lưu (A) giữ title. |

Không chạy được Microsoft PowerPoint. PPTX đo được là classic `p:cm` do LibreOffice ghi ra từ ODF annotation — cùng pipeline Writer comments (`fodt` viết tay → soffice DOCX). Comment thread hiện đại (Office 365 `commentsExtended` / `p15`) **chưa đo**.

---

## Coverage

### Unit (`node tests/run-tests.js`)
**PASS 734/734, 45.4s** (dưới 60s). Bốn test mới trong `tests/unit/slides-file-io.test.js`:

- serialize ghi `office:annotation` trên đúng `draw:page`, không rò slide 2
- serialize → parse giữ text/author/timestamp/id, không lẫn title/body/notes
- parse handwritten `office:annotation` + canned `officeooo:annotation` kiểu soffice
- escape XML + `adapter.open()` stub nạp `officeooo:annotation`

### Live (không nằm trong run-tests.js)
| Lệnh | Kết quả |
|---|---|
| `node tests/live/fodp-save-slides-comments-real-conversion.mjs` | **PASS, 26.7s** |
| `node tests/live/fodp-save-shapes-real-conversion.mjs` | **PASS** (không hồi quy) |
| `node tests/live/fodp-save-table-arrow-real-conversion.mjs` | **PASS** |
| `node tests/live/fodp-save-transition-animation-real-conversion.mjs` | **PASS** (flip vẫn mất — giới hạn filter cũ) |
| `node tests/live/fodp-save-title-body-animation-real-conversion.mjs` | **PASS** |

---

## FILES CHANGED
- `adapters/libreoffice/slides/slides-adapter.js` — serialize/parse page comments
- `tests/unit/slides-file-io.test.js` — unit round-trip + canned soffice XML + open stub
- `tests/live/fodp-save-slides-comments-real-conversion.mjs` — hop soffice A + import độc lập B
- `tests/fixtures/real-office-samples/src/sample-slides-comments.fodp` — FODP viết tay, không qua serializer VN
- `tests/fixtures/real-office-samples/README.md` — ghi nguồn fixture
- `tests/scripts/probe-slides-comments-fodp.mjs` — probe cấu trúc XML thật (không phải suite)
- `docs/FEATURE-PARITY-ROADMAP.md` — cập nhật mục Comments Slides
- `docs/HANDOFF-FODP-SAVE-SLIDES-COMMENTS.md` — tài liệu này

Không sửa `apps/slides/slides-canvas.js`, Writer, Sheet, Core.

---

## COMMANDS RUN
- `node tests/run-tests.js` — PASS 734/734, 45.4s
- `node tests/scripts/probe-slides-comments-fodp.mjs` — đo XML trước/sau hop
- `node tests/live/fodp-save-slides-comments-real-conversion.mjs` — PASS
- `node tests/live/fodp-save-shapes-real-conversion.mjs` — PASS
- `node tests/live/fodp-save-table-arrow-real-conversion.mjs` — PASS
- `node tests/live/fodp-save-transition-animation-real-conversion.mjs` — PASS
- `node tests/live/fodp-save-title-body-animation-real-conversion.mjs` — PASS

BUILD RESULT: NOT RUN — repo HTML/CSS/JS thuần, không có build step.

TEST RESULTS: PASS — unit 734/734; live comments + 4 live FODP cũ.

KNOWN FAILURES: Không có trong phạm vi. Giới hạn còn lại ghi ở dưới, không phải fail test.

---

## Giới hạn còn lại (trung thực)

1. **Id comment** (`comment-${Date.now()}-…`) mất sau hop PPTX vì `p:cm` không mang `draw:name`. FODP thuần VN (serialize→parse, không qua PPTX) **giữ id**.
2. **`dc:date`** mất hậu tố `.000Z`; còn `YYYY-MM-DDTHH:mm:ss`. `new Date()` trên chuỗi không timezone là local time — có thể lệch hiển thị so với UTC gốc.
3. **Toạ độ pin** không có trong model VN; serializer ghi vị trí mặc định. LO thu nhỏ box annotation (~1.08×0.50cm) sau hop.
4. **PowerPoint 365 threaded comments** chưa đo (không có PowerPoint). Chỉ chứng minh classic `p:cm` mà soffice ghi từ ODF annotation.
5. **Presenter / F5** vẫn không hiện comment — chủ đích canvas từ trước, ngoài phạm vi adapter.
6. Fixture handwritten sau hop PPTX mất `presentation:class` → title parse thành `"Trang chiếu N"`; comment vẫn đúng. Đường Lưu VN (có class) giữ title.

RISKS: Parse `officeooo:annotation` phụ thuộc prefix soffice hiện tại; nếu bản LO khác đổi local-name sẽ cần nới regex.

DEPENDENCIES/BLOCKERS: Không thêm dependency. soffice chỉ live test.

CORE PATCH ID: Không có.

NEXT ACTION: Review; **không merge main**.

Template `/09-templates/AGENT-HANDOFF.md` không có ở root worktree (nằm trong `VN-Office-AI-Engineering-Standard-V2/`); handoff này đủ các mục chuẩn.
