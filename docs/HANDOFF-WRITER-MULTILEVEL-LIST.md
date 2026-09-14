# Agent Handoff

TASK: Writer Multilevel List (GAP Ribbon Parity Round 1 mục 5)
AGENT/ROLE: Grok (coding agent), worktree riêng, không đụng Sheet/Slides source, không merge main.
BRANCH: `feature/writer-multilevel-list`
WORKTREE: `E:\VNOffice-grok-writer-multilevel-list`
BASE: `main` @ `fbd236d` — đo thật `node tests/run-tests.js` **1307/1307 PASS** trước khi làm.
**KHÔNG merge tự động vào main** — người phụ trách đọc lại trước.

## Bối cảnh

VN Writer đã có Dấu đầu dòng / Đánh số (`execCommand` `ul`/`ol`) và serialize `text:list` lồng nhau từ Phase A, nhưng list-style chỉ 1 cấp (`LBullet`/`LNumber`). Word Multilevel List (1. / 1.1. / 1.1.1., 1. / a. / i.) và văn bản hành chính NĐ 30 (Điều / Khoản / Điểm) chưa có.

GAP: `docs/HANDOFF-WRITER-RIBBON-PARITY-ROUND1.md` mục 5.

Đo engine trước khi viết code: `docs/HANDOFF-WRITER-MULTILEVEL-LIST-FINDINGS.md` (commit `5d5886c`, trước mọi thay đổi adapter/UI).

## Quyết định phạm vi

**3 cấp, 3 preset.** Probe soffice 26.2.5 chứng minh cả ba preset ra đúng `w:lvl` / `w:ilvl` với cùng độ phức tạp serializer (chỉ khác attribute style). Không làm 9 cấp UI.

| Preset (args) | Class DOM | FODT style | Nhãn DOCX đo được |
|---|---|---|---|
| `decimal` | `vno-ml-decimal` | `LMultiDecimal` + `text:display-levels` 2/3 | `%1.` / `%1.%2.` / `%1.%2.%3.` |
| `letter` | `vno-ml-letter` | `LMultiLetter` 1/a/i | `decimal`/`lowerLetter`/`lowerRoman` `%1.`/`%2.`/`%3.` |
| `nd30` | `vno-ml-nd30` | `LMultiNd30` prefix `Điều ` | `Điều %1.` / `%2.` / `%3)` |

`<ol>`/`<ul>` không class: giữ `LNumber`/`LBullet` (Phase A không đổi). Không gắn 1.1.1 lên mọi list cũ.

## Implementation summary

### Lưu trữ + lệnh

- Cấp = độ sâu `<ol>` lồng. Không viết engine đếm riêng.
- `writer.para.multilevelList` nhận args `"decimal"|"letter"|"nd30"`.
- UNO: `.uno:OutlineBullet` (không đụng `.uno:DefaultNumbering`).
- Tab trong `li` (không phải ô bảng) → tăng cấp; Shift+Tab → giảm cấp. Trần 3 cấp. Tái sử dụng indent/outdent + copy class preset xuống list con.
- Ô bảng: Tab vẫn điều hướng ô (ưu tiên cũ).

### UI

- Tab **Trang đầu**, nhóm Đoạn văn, hàng 1: dropdown gallery **ngay sau** Đánh số, **trước** Giảm thụt lề. `iconOnly` + mũi tên (tránh tràn 1280px).
- Ba item gallery nhãn thật: `1. / 1.1. / 1.1.1.` · `1. / a. / i.` · `Điều 1. / 1. / a)`.
- Canvas CSS counter / `list-style-type` theo class.

### FODT

- `listXml(node, inheritedStyle)`: class → `LMulti*`, không thì inherit, không nữa thì LNumber/LBullet.
- Emit `text:style-name` trên mọi `text:list` (deterministic Phase A). Parse inherit khi list con thiếu style-name (canonical LO).
- Chỉ emit `LMulti*` khi được dùng. `LBullet`/`LNumber` luôn emit như cũ.
- Idempotence VN = output pt/tên `LMulti*` 3 level. Không so canonical LO (đổi tên `L1`, pad 10 level).

### Help

Bài `writer.para.multilevelList` tiếng Việt: tab Trang đầu / nhóm Đoạn văn, 3 preset, Tab/Shift+Tab, trần 3 cấp, phân biệt Đánh số một cấp.

## FILES CHANGED

- `platform/commands/command-definitions.js` — `writer.para.multilevelList`
- `platform/i18n/strings-vi.js` / `strings-en.js`
- `adapters/libreoffice/common/command-dispatch-mapper.js` — `.uno:OutlineBullet`
- `platform/ui-kit/icons.js` — `listMultilevel`
- `platform/ui-kit/components.js` + `ribbon-host.js` + `ui-kit.css` — dropdown `iconOnly`
- `apps/writer/writer-ribbon.js` — gallery Home
- `apps/writer/writer.css` — marker 3 cấp
- `platform/help/entries-writer.js`
- `adapters/libreoffice/writer/writer-adapter.js` — apply, Tab, serialize/parse
- `tests/unit/writer-multilevel-list.test.js` — mới, 11 test
- `tests/live/writer-multilevel-list-real-conversion.mjs` — soffice numbering.xml
- `tests/scripts/probe-writer-multilevel-list.mjs` — đo trước code
- `tests/run-tests.js` — suite 120
- `docs/HANDOFF-WRITER-MULTILEVEL-LIST-FINDINGS.md`
- `docs/HANDOFF-WRITER-MULTILEVEL-LIST.md` — file này

Không đụng Sheet/Slides, Core, build system, `save()`/`exportPdf()` đường HTML.

## COMMANDS RUN

```
node tests/run-tests.js
node tests/live/writer-multilevel-list-real-conversion.mjs
node tests/live/ribbon-audit-1280.playwright.mjs
node tests/scripts/probe-writer-multilevel-list.mjs
```

(Audit 1280 chạy cổng 8895 vì 8893 đang bị chiếm; file audit không đổi, PORT trả về 8893.)

## TEST RESULTS

- Baseline trước task: **1307/1307 PASS** @ `fbd236d`.
- Sau task: `node tests/run-tests.js` **1318/1318 PASS** (100%). 11 test mới, 0 fail. Không disable / nuốt exception.
- Live soffice LibreOffice 26.2.5: FODT VN → DOCX, unzip `word/numbering.xml` + `word/document.xml`:
  - decimal → `lvlText` `%1.` / `%1.%2.` / `%1.%2.%3.`
  - letter → `decimal` / `lowerLetter` / `lowerRoman`
  - nd30 → `Điều %1.` / `%2.` / `%3)`
  - mọi đoạn L1/L2/L3 cùng `w:numId`, `ilvl` 0/1/2
  - serialize → parse → serialize byte-identical trước convert.
- `node tests/live/ribbon-audit-1280.playwright.mjs`: **104/104 PASS**, 0px tràn ngang VI+EN, 1280×800 và 1280×720. Writer Home sum 1265px (VI) / 1239px (EN).

## SOFFICE / XML THẬT (không đoán)

Công thức đo được: nested `text:list` cùng `text:style-name` → soffice gán `w:ilvl`. `text:display-levels` → `%1.%2.%3.`. `style:num-prefix="Điều "` → `w:lvlText="Điều %1."`. Probe 7 FODT tay trước code + live test sau serializer, cùng kết quả.

Canonical LO rewrite `LMulti*` → `L1` và pad 10 level. Idempotence VN không so file canonical LO.

## Rủi ro / giới hạn còn lại

- Trần **3 cấp** (Tab cấp 3 no-op). Word/LO hỗ trợ 9; ngoài scope.
- Không restart numbering (`start=` vẫn throw).
- List trong ô bảng vẫn cấm (Phase B).
- Parse FODT sau soffice rewrite (`L1`) vẫn throw — cùng convention Phase A.
- `execCommand("indent")` trên item đầu có thể tạo `li` cha rỗng; serializer cho phép `text:p` rỗng + nested list.
- Writer Home 1265px tại 1280 — còn ~15px đệm; gallery `iconOnly` để không tràn.

## Rollback

Không merge. Xóa worktree / không lấy branch. Không đụng main.

## Handoff cho người phụ trách

1. Đọc FINDINGS rồi file này.
2. Soát UI tab Trang đầu: gallery đa cấp sau Đánh số, Tab/Shift+Tab trong list, 3 preset kể cả Điều/Khoản/Điểm.
3. Quyết định merge `feature/writer-multilevel-list` khi sẵn sàng.
4. GAP Round 1 còn: Hyphenation, Selection Pane (Line Numbers và Spacing Before/After đã có nhánh riêng).


> **Correction 2026-09-14 (Claude):** every MYTIME page count in this document was measured with Word COM ComputeStatistics(wdStatisticPages), which is wrong in a hidden window (it reports 88 for a 44-page document). Word's PDF export of the original MYTIME has **44** pages; the edited-save output currently has **73** (43 section breaks lost). Use _word_oracle3.ps1 (PDF-based) going forward. See HANDOFF-WRITER-SAVE-SECTIONS*.md.
