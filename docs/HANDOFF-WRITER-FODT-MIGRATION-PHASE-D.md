# Agent Handoff

TASK: Writer FODT Migration — Phase D (footnote/endnote, comment, TOC native)
AGENT/ROLE: Grok (coding agent), worktree riêng, không đụng Sheet/Slides source.
BRANCH: `feature/writer-fodt-migration-phase-d`
WORKTREE: `E:\VNOffice-grok-writer-fodt-phase-d`
BASE: `main` @ `9f05f15` — đo thật `node tests/run-tests.js` **1198/1198 PASS** trước khi làm (không dùng số 1187 trong handoff Phase C cũ).
**KHÔNG merge tự động vào main** — cùng gate như Phase A/B/B.1/B.2/C, người phụ trách đọc lại trước.

## Bối cảnh

Phase C (đã merge) hỗ trợ page-layout / header-footer / section geometry. Phase D theo `docs/PLAN-WRITER-FODT-MIGRATION.md` mục 6: cấu trúc tham chiếu native — footnote/endnote `text:note`, comment `office:annotation`, TOC `text:table-of-content`.

Đo engine trước khi viết serializer: `docs/HANDOFF-WRITER-FODT-PHASE-D-FINDINGS.md` (commit `aa2ee3a`, trước mọi thay đổi `writer-adapter.js`).

Nguyên tắc: không đánh dấu "hỗ trợ" nếu không có fixture, VN round-trip idempotent, và phép đo LibreOffice thật.

Thứ tự commit: footnote/endnote (`4dd8254`) → comment (`6be4212`) → TOC (`43d1f92`). Cả ba loại đều làm xong trong lượt này.

## Nghiên cứu trước khi thiết kế

1. Writer DOM thật (không đoán):
   - Footnote: `<sup data-vno-footnote-ref>` + container `[data-vno-footnotes=true]` ở cuối body; số 1,2,3 do `renumberFootnotes()` ghi chữ tĩnh.
   - Endnote: cùng pattern, số La Mã i, ii, iii, container riêng sau footnotes.
   - TOC: khối tĩnh `[data-vno-toc=true]` từ H1–H3, số trang heuristic, nút Cập nhật/Xóa là chrome.
   - Comment: `this.comments[]` `{id, anchorText, content, createdAt, author?}` + `<mark class="vno-comment-anchor" data-comment-id>`; panel Review là chrome. `_contentForExport()` vẫn strip mark.
2. Probe soffice LibreOffice **26.2.5**: xem FINDINGS. `text:note` → `word/footnotes.xml` / `endnotes.xml` + `w:footnoteReference` / `w:endnoteReference`. Range `office:annotation`+`annotation-end` → `commentRangeStart/End` + `comments.xml`. `text:table-of-content` với **index-body điền sẵn** → `w:sdt` Table of Contents + field `TOC \f \o "1-3"`. Index-body rỗng → field có nhưng mục lục trống.
3. Pattern serialize/parse Phase A–C: registry style deterministic, fail-closed `WRITER_FODT_UNSUPPORTED_CONTENT`, idempotence `serialize → parse → serialize`. Tái dùng `inlineXml` / `inlineHtml` cho note-body và chữ neo comment.

## Implementation summary

- Nới guard `data-vno-*` cho footnote/endnote/toc/comment-author. `<sup>` chỉ khi là note; `<mark>` chỉ khi có `data-comment-id` + entry `this.comments`.
- Note: serialize lấy body từ `.vno-note-text` cùng id, bỏ container chrome. Parse `text:note` → sup + đúng một container mỗi loại. `office:styles` + hai `text:notes-configuration` chỉ khi có note.
- Comment: serialize `office:annotation` + children + `office:annotation-end`. `xmlns:dc` chỉ khi có annotation. Parse đi bộ sibling đến `annotation-end`, hydrate `this.comments`.
- TOC: serialize khối `data-vno-toc` thành `text:table-of-content` name `Table of Contents1`, source outline-level 3, index-body từ `.vno-toc-item`. Styles `Contents_20_*` automatic. Parse dựng lại khối TOC (gắn lại nút chrome). Heading vẫn `text:h`.
- `save()`/`exportPdf()`/`_contentForExport()` không đổi.

## FILES CHANGED

- `adapters/libreoffice/writer/writer-adapter.js` — note / annotation / TOC serialize+parse (additive).
- `tests/unit/writer-fodt-phase-d.test.js` — **mới**, 12 test.
- `tests/unit/writer-fodt-phase-a.test.js` — ví dụ reject footnote đổi thành `<sup>` thường (footnote giờ hợp lệ).
- `tests/live/writer-fodt-phase-d-real-conversion.mjs` — **mới**, soffice thật.
- `tests/scripts/probe-writer-fodt-phase-d.mjs` — đo trước code.
- `tests/scripts/word-verify-fodt-phase-d.mjs` — Start-Process Word thụ động.
- `tests/run-tests.js` — suite 111d.
- `docs/PLAN-WRITER-FODT-MIGRATION.md` — đánh dấu mục 6 hoàn thành.
- `docs/HANDOFF-WRITER-FODT-PHASE-D-FINDINGS.md` — đo trước code.
- `docs/HANDOFF-WRITER-FODT-MIGRATION-PHASE-D.md` — file này.

Không đụng Sheet/Slides, Core, build system, `save()`/`exportPdf()`/`_contentForExport()`.

## COMMANDS RUN

```
node tests/run-tests.js
node tests/live/writer-fodt-phase-d-real-conversion.mjs
node --check adapters/libreoffice/writer/writer-adapter.js
node tests/scripts/probe-writer-fodt-phase-d.mjs
node tests/scripts/word-verify-fodt-phase-d.mjs
```

Cộng thêm (thủ công): FODT → soffice DOCX, `Start-Process` Microsoft Word thụ động (không SendKeys), chụp cửa sổ Word xác nhận bằng mắt, `Stop-Process WINWORD`. Ảnh chụp/DOCX không nằm trong repo (`tmp-word-d/` untracked).

## TEST RESULTS

- Baseline trước task: **1198/1198 PASS** @ `9f05f15`.
- `node tests/run-tests.js` sau task: **1210/1210 PASS** (0 FAIL). +12 test Phase D.
- Unit Phase A/C giữ nguyên PASS (FODT không có note/comment/TOC không thêm `office:styles`/`xmlns:dc`).
- `node tests/live/writer-fodt-phase-d-real-conversion.mjs`: **PASS**
  - Notes: `word/footnotes.xml` + `word/endnotes.xml`; 2 `w:footnoteReference` id=2,3; 1 `w:endnoteReference` id=2; `w:numFmt="lowerRoman"`; body `FOOTNOTE_ONE` / `FOOTNOTE_TWO` / `ENDNOTE_ONE` trong part XML; PDF `%PDF-`.
  - Comments: `word/comments.xml`; `w:commentRangeStart/End` + `w:commentReference` id=0; `w:author="Tran Thi Hoa"`; body `COMMENT_BODY…`.
  - TOC: `<w:sdt>` + `docPartGallery w:val="Table of Contents"` + `instrText` chứa `TOC`; chữ `MỤC LỤC` / `Báo cáo thẩm định` / `Căn cứ pháp lý` / `Nghị định 15/2021`.
- **Microsoft Word thật** (Start-Process thụ động, Compatibility Mode, có Document Recovery pane từ các lần probe trước):
  - Notes: số mũ **1** sau «NĐ-CP», số mũ **i** sau «kỹ thuật», body endnote `i ENDNOTE_ONE Phụ lục kỹ thuật…` ở cuối tài liệu. Body footnote nằm `word/footnotes.xml` (`FOOTNOTE_ONE…`); chân trang trên ảnh chụp bị Document Recovery che/không hiện trong vùng trang đang nhìn — không claim ảnh chân trang.
  - Comments: panel Review bên phải hiện **Tran Thi Hoa** và **COMMENT_BODY đối chiếu số liệu quý II.**
  - TOC: tiêu đề **MỤC LỤC**, ba dòng phân cấp (Báo cáo thẩm định / Căn cứ pháp lý / Nghị định 15/2021) + số trang 1; Navigation pane nhận outline Heading 1–3.

## KNOWN FAILURES / LIMITATIONS (ghi rõ)

1. **Index-body TOC phải điền sẵn.** Đo LO 26.2.5: source không có index-body → `w:sdt`+field TOC vẫn có nhưng sdtContent trống. Serializer luôn ghi entries từ khối Writer.
2. Số trang TOC là heuristic Writer, không phải số trang in. Word/LO Update Field sẽ tính lại. Live test assert cấu trúc field + chữ heading.
3. Comment phiên không có author → `dc:creator` rỗng. Import có author thì ghi `data-vno-comment-author`.
4. Point annotation (không `annotation-end`) convert được `comments.xml` nhưng không có range highlight. Writer session luôn range (`<mark>`).
5. Note-body chỉ một `text:p` (plain/inline). Nhiều đoạn/bảng → throw.
6. LO canonicalize `text:id` endnote `edn1` → `ftn1`; thêm `loext:resolved` trên annotation; thêm `text:style-name="Sect1"` trên TOC. Idempotence VN là serialize→parse→serialize output VN, không so canonical LO.
7. Phase D chưa nối Save/Open/Export mặc định (cùng cutover gate). Không thêm bài Help giả cho luồng người dùng chưa có. Đường HTML export vẫn strip comment mark.
8. Citation, track changes, comment trong note-body, TOC trong header: ngoài phạm vi.
9. `<sup>` superscript thường (không phải note) vẫn bị từ chối.

## RISKS

Thấp — additive. Rủi ro: FODT ngoài VN (LO thêm named style Footnote/Endnote, `loext:`, đổi id). Parser đọc `text:note-class` + body `text:p`; bỏ `loext:*`. Không claim parse mọi canonical LO.

## DEPENDENCIES/BLOCKERS

Không thư viện trả phí/ngoài. LibreOffice soffice bắt buộc cho live test.

## CORE PATCH ID: N/A

## NEXT ACTION

1. Người phụ trách đọc branch `feature/writer-fodt-migration-phase-d` trước khi merge — **không tự merge**.
2. Phase E (đề xuất): WordArt / watermark / track changes qua FODT, sau probe DOCX fidelity.
3. Khi cutover FODT thành default Save, bổ sung bài Help tiếng Việt cụ thể (Tham chiếu > Chú thích/Mục lục, Đánh giá > Ghi chú, cảnh báo đường HTML cũ không ghi `footnotes.xml`/`comments.xml`).
