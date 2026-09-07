# HANDOFF: Writer Paragraph Spacing Before/After — Báo cáo hoàn thành

## Tổng quan

Tính năng "Khoảng cách trước/sau đoạn" (Paragraph Spacing Before/After) đã được triển khai đầy đủ trên nhánh `feature/writer-paragraph-spacing-before-after`.

## Cấu trúc thay đổi

### 1. DOM Storage (Mục 3.1)
- `_applyParagraphVisualStyle` trong `adapters/libreoffice/writer/writer-adapter.js:679-687` ghi `marginTop`/`marginBottom` CSS đơn vị `pt` lên block đoạn đang chọn.
- Không dùng `px`, không gộp shorthand `margin`.

### 2. Commands (Mục 3.2)
- `writer.para.spacingBefore` và `writer.para.spacingAfter` đăng ký trong `platform/commands/command-definitions.js:89-90`.
- Args: `"0" | "6" | "8" | "12" | "18"` (preset 5 nấc).
- Bind handler: `writer-adapter.js:364-365`.
- Execute dispatch: `writer-adapter.js:2404-2407`.
- Handler: `applyParagraphSpacingBefore/After` tại `writer-adapter.js:712-722`.
- Helper `_parseParagraphSpacingPt` tại `writer-adapter.js:703-710`.
- UNO mapping: `.uno:ParSpaceBefore` / `.uno:ParSpaceAfter`.

### 3. UI (Mục 3.3)
- 2 select trong tab **B bố cục** (Layout), nhóm **Đoạn văn** (Paragraph): `apps/writer/writer-ribbon.js:414-437`.
- `ariaLabel`: "Khoảng trước đoạn" / "Khoảng sau đoạn".
- Label tự mô tả: "Trước: 0 pt" … "Sau: 18 pt".
- Không thêm control lên tab Home (tránh tràn 1280px).

### 4. FODT Serialize/Parse (Mục 3.4)
- `_fodtCssMap` default allow-list đã bao gồm `margin-top`/`margin-bottom`: `writer-adapter.js:5149-5168`.
- `paragraphXml` normalize `margin-top`/`margin-bottom` → `props.marginTop`/`props.marginBottom` (đơn vị pt): `writer-adapter.js:6162-6163`.
- `paragraphStyleXml` emit `fo:margin-top`/`fo:margin-bottom` vào `paraProps`: `writer-adapter.js:6540-6541`.
- `parseFodt` đọc `fo:margin-top`/`fo:margin-bottom` và normalize về pt: `writer-adapter.js:6628-6629`.
- `paragraphBlockHtml` emit inline `margin-top`/`margin-bottom` CSS: `writer-adapter.js:6924-6925`.
- `0pt` tường minh được emit và giữ nguyên round-trip.

### 5. Help/i18n (Mục 3.5)
- `platform/i18n/strings-vi.js:532-533`: label/tooltip tiếng Việt.
- `platform/i18n/strings-en.js:533-534`: label/tooltip tiếng Anh.
- `platform/help/entries-writer.js:310-312`: bài hướng dẫn tiếng Việt `writer.para.spacingBeforeAfter`.

## Kết quả kiểm thử

### check-syntax.js
```
89/89 files hợp lệ | 0 lỗi cú pháp
```

### run-tests.js
```
1511/1511 PASS | 0 FAIL
```

Bao gồm test suite #117: "Writer paragraph spacing before/after (pt)" — 11 tests:
- Hai lệnh WRITER_COMMANDS + i18n VI/EN + UNO map
- Tab Bố cục nhóm Đoạn văn có hai select 0/6/8/12/18 pt
- Bài hướng dẫn tiếng Việt khớp UI Layout
- Parse pt args; giá trị âm/lạ bị từ chối
- FODT serialize đúng fo:margin-top/bottom (pt)
- Đoạn không spacing không phát sinh fo:margin-*
- 0pt tường minh được emit (đè CSS canvas 6pt)
- Spacing + text-align dùng chung registry P*
- Spacing round-trip đúng idempotent
- Parse fo:margin cm (canonical LO) ra pt
- CSS margin shorthand trên đoạn vẫn bị từ chối

### ribbon-audit-1280.playwright.mjs
```
100% PASS: 104/104 tab kiểm tra, 0px tràn ngang tại 1280px
```

### writer-paragraph-spacing-dom-interaction.playwright.mjs (MỚI)
```
8/8 PASS:
- Spacing Before sets margin-top:12pt on selected paragraph
- Spacing After sets margin-bottom:6pt on selected paragraph
- Spacing Before 0pt sets explicit margin-top:0pt (overrides CSS 6pt)
- Spacing After 18pt sets margin-bottom:18pt
- Different paragraph gets independent spacing (8pt before/after)
- First paragraph spacing unchanged after selecting second paragraph
- Unselected paragraph has no inline margin (stylesheet default applies)
- No browser page errors during paragraph spacing DOM test
```

## Git status

Branch: `feature/writer-paragraph-spacing-before-after`

```
On branch feature/writer-paragraph-spacing-before-after
Untracked files:
  TASK-BRIEF-PARAGRAPH-SPACING.md
  tests/live/writer-paragraph-spacing-dom-interaction.playwright.mjs
```

Không có commit mới trên nhánh so với main — toàn bộ code tính năng đã được commit trước đó bởi agent Grok. Agent này chỉ bổ sung test Playwright DOM interaction và báo cáo.

## Ranh giới an toàn

- Không persist `line-height` ra FODT.
- Không đụng `margin-left`/`margin-right`/indent.
- Không làm `style:contextual-spacing`.
- Không spinbox nhập số tự do — chỉ preset 5 nấc (0/6/8/12/18pt).
- Không header/footer paragraph spacing.
- Không sửa `main.py`.
- Không đụng Sheet/Slides.
