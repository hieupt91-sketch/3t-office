# Plan: Slides Speaker Notes import fidelity

## Objective

Đo và (nếu sửa được trong adapter) sửa đường mở file PPTX **thật** có Speaker Notes (cấu trúc OOXML `ppt/notesSlides/notesSlideN.xml` + relationship trên `ppt/slides/_rels/slideN.xml.rels`) để VN Slides hiện đúng nội dung ghi chú trên panel.

Câu hỏi chưa từng kiểm: luồng VN Slides tự tạo notes rồi tự đọc lại FODP đã có; **chưa** đo PPTX PowerPoint/LibreOffice → soffice FODP → `parseFodp()`.

## Current capability

- `serializeToFodp()` ghi `<presentation:notes>` với `presentation:class="notes"`.
- `parseFodp()` lấy **mọi** `<text:p>` trong `<presentation:notes>` (`_paragraphsFromXml`), không lọc placeholder header/footer/date/page-number/thumbnail.
- Test hiện có (`slides-animations-notes.test.js`) chỉ round-trip FODP do VN serialize — không có PPTX `notesSlides`.
- Đường mở thật: `common.file.open` → `SlidesAdapter.open()` → `soffice --convert-to fodp` → `loadFromFodp()` / `parseFodp()`.

## Files / modules (dự kiến)

- `adapters/libreoffice/slides/slides-adapter.js` — chỉ parse notes nếu đo được mất/sai
- `tests/fixtures/real-office-samples/src/sample-slides-notes.fodp` — ODF viết tay
- `tests/fixtures/real-office-samples/sample-slides-notes.pptx` — soffice convert, **không** VN serialize
- `tests/scripts/probe-slides-speakernotes-import.mjs`
- `tests/unit/slides-speakernotes-import.test.js`
- `tests/live/slides-speakernotes-import-real-conversion.mjs`
- `tests/run-tests.js` — thêm suite
- `docs/HANDOFF-SLIDES-SPEAKERNOTES-IMPORT-FIDELITY.md`

Không đụng `apps/writer/**`, `apps/sheet/**`, Writer/Sheet adapters, Core LibreOffice, `apps/slides/slides-canvas.js` (chỉ đọc).

## Dependency

- `soffice.exe` cho generate fixture / probe / live. Unit `run-tests.js` **không** gọi soffice (canned FODP đo được).

## Risk

- soffice FODP→PPTX có thể không emit `notesSlides` (giống SmartArt không emit `ppt/diagrams`). Nếu vậy: ghi rõ; cân nhắc pack OOXML notes native **chỉ** khi giải nén chứng minh FODP→PPTX thiếu part — không bịa part giả.
- `parseFodp` lấy hết paragraph trong notes page → lẫn date/số trang/header. Sửa bằng lọc `presentation:class="notes"`.
- Regex `draw:page` / `presentation:notes` non-greedy — đo snippet thật trước khi đổi.

## Test plan

1. Viết FODP tay có notes tiếng Việt (slide có notes / slide không notes / nhiều đoạn).
2. `soffice --convert-to pptx` → giải nén, xác nhận `ppt/notesSlides/notesSlideN.xml` + rels (không bịa).
3. `soffice --convert-to fodp` (đúng `main.py`) → dump `presentation:notes` + `parseFodp()`.
4. Unit canned FODP (snapshot soffice) + zip PPTX, <60s.
5. Live soffice conversion riêng.
6. `node tests/run-tests.js` 100% PASS < 60s.

## Rollback

Revert branch. Parser cũ vẫn đọc notes do VN tự serialize. Không merge `main`.
