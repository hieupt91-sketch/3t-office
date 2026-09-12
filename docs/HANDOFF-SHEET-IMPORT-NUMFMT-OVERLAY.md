# Agent Handoff

TASK: Overlay number format tung o tu XLSX goc khi mo bang tinh
AGENT/ROLE: Codex / Sheet import fidelity
BRANCH: `fix/sheet-import-numfmt-overlay`
WORKTREE: `E:\VNOffice-codex-sheet-numfmt`
OBJECTIVE: Khoi phuc sparse `numFmt` XLSX bi LibreOffice doi/mat trong FODS, khong mo rong toan bo khoi lap.

## Ket qua audit truoc / sau

Lenh: `node scripts/audit-sheet-import.mjs _dss_real.xlsx <fods>`.

| Chi so | Truoc | Sau |
|---|---:|---:|
| O du lieu khop hoan toan | 1.586 / 2.290 | 2.120 / 2.290 |
| Lech number format | 542 | 8 |
| Tong sai lech | 803 | 175 |

- Number format giam 534/542 (98,5%). Tam o con lai dung built-in format `0` tai `Camera IP!D26:D29,D37,D43,D44` va `Camera HDCVI!D57`; cac o nay nhan format ke thua thay vi co `c@s` rieng trong worksheet, nen sparse cell-XF overlay khong suy dien them.
- Gap ngoai scope con lai: 166 value/whitespace va 1 formula (`Camera IP!F45`). Audit hien thi tong 175 vi gom them 8 number format tren.

## Benchmark file that

File XLSX 38 MB, LibreOffice tai `%USERPROFILE%\tools\libreoffice`. Soffice conversion do 1 lan; overlay in-memory do 5 lan de tranh nhieu khoi dong Python/ghi dia.

| Pha | Thoi gian |
|---|---:|
| XLSX -> FODS bang soffice | 9,455 s |
| Overlay cu, trung binh 5 lan | 0,399 s |
| Overlay moi, trung binh 5 lan | 1,635 s |
| Tong import cu -> moi | 9,854 s -> 11,090 s (+12,55%) |

FODS sach sau soffice: 38.439.978 byte; sau overlay: 38.495.114 byte, tang 55.136 byte (+0,14%). Dat gioi han thoi gian <=20% va dung luong <=5%.

IMPLEMENTATION SUMMARY:
- Doc `xl/styles.xml`: custom `numFmts`, built-in 0..49 va `cellXfs`; map tung `c@s` co value/formula sang formatCode.
- Chen `vno:number-format` theo sheet/toa do. Transformer tach toi thieu row/cell lap va dung scanner `str.find` de khong quet regex cham qua anh base64 38 MB.
- `numberFormatFromExcelCode()` chuyen number, percentage, currency/accounting, date/time, text, scientific va custom sang model VN Sheet. Ca parser DOM va regex deu di qua `_cellFromFodsAttributes`; metadata overlay uu tien hon style ODF da bi soffice doi.
- Chieu luu khong doi: `serializeToFods()` tiep tuc ghi JSON `vno:number-format` hien co.

FILES CHANGED:
- `adapters/libreoffice/common/ooxml_zip_patch.py`
- `adapters/libreoffice/sheet/sheet-adapter.js`
- `tests/test_sheet_numfmt_overlay.py`
- `tests/unit/sheet-import-audit.test.js`
- `docs/HANDOFF-SHEET-IMPORT-NUMFMT-OVERLAY.md`

COMMANDS RUN:
- `node scripts/check-syntax.js`
- `node tests/run-tests.js`
- `python -m unittest discover -s tests -p "test_*.py"`
- `python adapters/libreoffice/common/ooxml_zip_patch.py --xlsx _dss_real.xlsx --overlay-fods _dss_real.fods --out _audit_numfmt_overlay.fods`
- `node scripts/audit-sheet-import.mjs _dss_real.xlsx _audit_numfmt_overlay.fods`

BUILD RESULT: PASS, syntax 92/92.
TEST RESULTS: PASS, Node 1643/1643; Python 184/184.
KNOWN FAILURES: Audit con 8 number format ke thua, 166 value/whitespace va 1 formula neu tren; khong co test regression fail.
RISKS: Format XLSX khong nhan dang duoc duoc giu `category=custom` voi nguyen `code`; formatter hien co chi render tap custom pattern no ho tro va khong crash.
DEPENDENCIES/BLOCKERS: Khong co.
CORE PATCH ID (if any): Khong co; khong sua LibreOffice Core.
NEXT ACTION: Neu can audit 0 number-format, phase sau co the doc style ke thua tu row/column XF; xu ly value/whitespace va formula la task rieng.

ROLLBACK: `git revert <commit-cua-task-nay>`.

## Follow-up: style tu dong va o chuoi

- Sua toan bo regex doc `style:style` trong Sheet de the tu dong `/>` co body rong, khong an nham body cua style ke tiep.
- Overlay XLSX bo qua number format tren cell OOXML co `t="s"`, `t="str"` hoac `t="inlineStr"`.
- Parser FODS va renderer chi ap dung number format so cho gia tri so; chuoi hien nguyen van va van co text overflow dung.
- Regression tests bao phu parser visual style, parser number format, overlay Python va renderer.
- Xac minh follow-up: syntax 92/92 PASS; Node 1661/1661 PASS; Python test dich 3/3 PASS. Python discover: FAIL 12/185 do cac lan goi LibreOffice tra ve loi chuyen doi khong ro nguyen nhan; khong co failure nao trong overlay numfmt. File `_dss_real.xlsx` dung cho audit truoc khong co trong worktree, nen audit that follow-up NOT RUN.
