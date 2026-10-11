# Agent Handoff

TASK: Writer FODT Migration — Phase E.1 (Track Changes native, một phần của Phase E)
AGENT/ROLE: Grok (coding agent), worktree riêng, không đụng Sheet/Slides source.
BRANCH: `feature/writer-fodt-migration-phase-e1`
WORKTREE: `E:\VNOffice-grok-writer-fodt-phase-e1`
BASE: `main` @ `4cae9a3` — đo thật `node tests/run-tests.js` **1210/1210 PASS** trước khi làm (không dùng số trong handoff cũ).
**KHÔNG merge tự động vào main** — cùng gate như Phase A/B/B.1/B.2/C/D, người phụ trách đọc lại trước.

## Bối cảnh

Phase D (đã merge) hỗ trợ footnote/endnote/comment/TOC. Phase E gốc trong `docs/PLAN-WRITER-FODT-MIGRATION.md` mục 7 gồm WordArt/shape/chart/diagram/watermark **và** Track Changes. E.1 tách riêng chỉ Track Changes vì Phase E gốc quá rộng.

Đo engine trước khi viết serializer: `docs/HANDOFF-WRITER-FODT-PHASE-E1-FINDINGS.md` (commit `898ff97`, trước mọi thay đổi `writer-adapter.js`).

Nguyên tắc: không đánh dấu "hỗ trợ" nếu không có fixture, VN round-trip idempotent, và phép đo LibreOffice thật.

Cả insert lẫn delete (kèm author/date khi có) làm xong trong lượt này. Format-change / move / wrap-delete-trong-body **không** làm — throw rõ.

## Nghiên cứu trước khi thiết kế

1. Writer DOM thật (không đoán):
   - Phiên: `<ins data-vno-change="insert">` / `<del data-vno-change="delete" contenteditable="false">` — **không** có creator/date. `_insertTrackedText` / `_markRangeDeleted`.
   - Import DOCX: thêm `data-vno-author` / `data-vno-date` / `title` (`_wrapImportedRevisionMatch`).
   - `_stripSessionMarkup()` (và comment CSS): del bị xóa cả chữ, ins giữ chữ bỏ thẻ. Đường HTML save vẫn accepted view.
2. Probe soffice LibreOffice **26.2.5**: xem FINDINGS.
   - Insert = `text:change-start`/`text:change-end` quanh chữ; region chỉ `text:insertion` + `office:change-info`.
   - Delete = empty `<text:change/>` trong body; chữ nằm `text:deletion`/`text:p`. Wrap del bằng start/end trong body → DOCX **nhân đôi** chữ.
   - Empty `office:change-info` hoặc thiếu `dc:date` → LO **xóa** region. Chỉ creator không đủ. Date-only đủ (`w:author=""`).
   - `text:format-change` → `w:rPrChange`, không phải `w:ins`/`w:del`.
   - `office:settings` ShowRedlineChanges **không** bắt buộc.
3. Pattern serialize/parse Phase A–D: registry style deterministic, fail-closed `WRITER_FODT_UNSUPPORTED_CONTENT`, idempotence `serialize → parse → serialize`. Tái dùng `inlineXml` / `inlineHtml` trong region deletion và nội dung insert.

## Implementation summary

- Nới guard `data-vno-change|author|date`.
- Insert: `text:change-start` + children + `text:change-end`; region `text:insertion`. Id deterministic `ct1`, `ct2`, … (cả `xml:id` lẫn `text:id`).
- Delete: empty `<text:change/>`; region `text:deletion` + `<text:p>` nội dung.
- change-info: `dc:creator` khi có author; `dc:date` = attr hoặc sentinel `1970-01-01T00:00:00`. Parser không khôi phục `data-vno-date` cho sentinel khi không có author.
- `xmlns:dc` khi có annotation **hoặc** tracked-changes.
- `text:tracked-changes` đứng đầu `office:text`. Không emit `office:settings`.
- Parse: đọc region trước; start/end chỉ cho insertion; empty `text:change` chỉ cho deletion; format-change / mismatch → throw, không sửa `bodyDom`.
- Header/footer, lồng ins/del/note/ảnh trong revision → throw.
- `save()`/`exportPdf()`/`_contentForExport()` không đổi.

## FILES CHANGED

- `adapters/libreoffice/writer/writer-adapter.js` — Track Changes serialize+parse (additive).
- `tests/unit/writer-fodt-phase-e1.test.js` — **mới**, 10 test.
- `tests/live/writer-fodt-phase-e1-real-conversion.mjs` — **mới**, soffice thật.
- `tests/scripts/probe-writer-fodt-phase-e1.mjs` — đo trước code.
- `tests/scripts/probe-writer-fodt-phase-e1-changeinfo.mjs` — đo tối thiểu `office:change-info`.
- `tests/scripts/word-verify-fodt-phase-e1.mjs` — Start-Process Word thụ động.
- `tests/run-tests.js` — suite 111e.
- `docs/PLAN-WRITER-FODT-MIGRATION.md` — đánh dấu mục 7a hoàn thành; 7b để lại E.2.
- `docs/HANDOFF-WRITER-FODT-PHASE-E1-FINDINGS.md` — đo trước code.
- `docs/HANDOFF-WRITER-FODT-MIGRATION-PHASE-E1.md` — file này.

Không đụng Sheet/Slides, Core, build system, `save()`/`exportPdf()`/`_contentForExport()`.

Không thêm bài Help giả — FODT chưa phải đường Save mặc định (cùng cutover gate Phase D).

## COMMANDS RUN

```
node tests/run-tests.js
node tests/live/writer-fodt-phase-e1-real-conversion.mjs
node --check adapters/libreoffice/writer/writer-adapter.js
node tests/scripts/probe-writer-fodt-phase-e1.mjs
node tests/scripts/probe-writer-fodt-phase-e1-changeinfo.mjs
node tests/scripts/word-verify-fodt-phase-e1.mjs
```

Cộng thêm: FODT serializer → soffice DOCX, `Start-Process` Microsoft Word thụ động (không SendKeys), chụp màn hình xác nhận bằng mắt, `Stop-Process WINWORD`. Ảnh/DOCX không nằm trong repo (`tmp-word-e1/` untracked).

## TEST RESULTS

- Baseline trước task: **1210/1210 PASS** @ `4cae9a3`.
- `node tests/run-tests.js` sau task: **1220/1220 PASS** (0 FAIL). +10 test Phase E.1.
- Unit Phase A–D giữ nguyên PASS (FODT không có Track Changes không thêm `xmlns:dc` / `text:tracked-changes`).
- `node tests/live/writer-fodt-phase-e1-real-conversion.mjs`: **PASS**
  - Import-style insert+delete: `word/document.xml` có
    `<w:del w:id="0" w:author="Nguyen Van An" w:date="2026-09-05T08:16:00Z">` + `w:delText` `bản nháp nội bộ `
    và `<w:ins w:id="1" w:author="Nguyen Van An" w:date="2026-09-05T08:15:00Z">` + `w:t` `theo yêu cầu khẩn `.
  - `word/settings.xml` có `<w:trackRevisions/>`.
  - 0 `w:rPrChange` / `w:moveFrom`.
  - Session (không author): vẫn ra `w:ins`/`w:del` nhờ sentinel date.
  - Idempotence VN `serialize → parse → serialize` trên FODT live.
- **Microsoft Word thật** (Start-Process thụ động, Compatibility Mode, Document Recovery pane từ các lần probe trước):
  - Cửa sổ `phase-e1-track-changes [Compatibility Mode] - Word`.
  - Simple Markup: **vạch đỏ lề trái** (chỉ báo revision Word), câu hiện `…đã hoàn thành theo yêu cầu khẩn báo cáo quý III.` — chữ xóa `bản nháp nội bộ` **không** còn trên trang (nếu là chữ màu tĩnh thì cả insert lẫn delete đều hiện). Không bấm tab Review (cấm SendKeys); panel Review không mở trong ảnh. Nhận diện Track Changes dựa trên vạch lề + XML native, không claim đã nhìn All Markup/gạch ngang.

## KNOWN FAILURES / LIMITATIONS (ghi rõ)

1. **Date bắt buộc.** LO 26.2.5 nuốt region nếu `office:change-info` thiếu `dc:date`. Phiên Writer không có date → sentinel `1970-01-01T00:00:00`. Parser không gắn `data-vno-date` cho sentinel khi không có author.
2. **Không wrap delete bằng change-start/end trong body.** Đo fixture 04: chữ bị nhân đôi. Serializer dùng empty `text:change` + nội dung trong region.
3. `text:format-change` / move / revision lồng note-comment-ảnh / Track Changes trong header: throw `WRITER_FODT_UNSUPPORTED_CONTENT`.
4. LO canonicalize đổi `text:id` thành `ct<số lớn>`; thêm `text:sequence-decls`. Idempotence VN là serialize→parse→serialize output VN, không so canonical LO.
5. Một region insert có inline đậm có thể thành nhiều `w:ins` cùng author/date (mỗi run OOXML). Canonical FODT vẫn một cặp start/end.
6. Phase E.1 chưa nối Save/Open/Export mặc định (cùng cutover gate). Đường HTML vẫn strip ins/del.
7. WordArt / shape / chart / diagram / watermark: **không** làm — để Phase E.2.
8. Word visual: Simple Markup + Document Recovery pane; không claim All Markup hay panel Review đã mở.

## RISKS

Thấp — additive. Rủi ro: FODT ngoài VN (LO thêm sequence-decls, đổi id, named style trên `text:p` trong deletion). Parser đọc `text:id`/`xml:id` + loại insertion/deletion; một `text:p` trong deletion. Không claim parse mọi canonical LO.

## DEPENDENCIES/BLOCKERS

Không thư viện trả phí/ngoài. LibreOffice soffice bắt buộc cho live test.

## CORE PATCH ID: N/A

## NEXT ACTION

1. Người phụ trách đọc branch `feature/writer-fodt-migration-phase-e1` trước khi merge — **không tự merge**.
2. Phase E.2 (đề xuất): WordArt / watermark / chart / diagram qua FODT, sau probe DOCX fidelity.
3. Khi cutover FODT thành default Save, bổ sung bài Help tiếng Việt cụ thể (Đánh giá > Theo dõi thay đổi, cảnh báo đường HTML cũ không ghi `w:ins`/`w:del`).
