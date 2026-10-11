# Agent Handoff

TASK: P2 - giam thoi gian JS dung mo hinh khi mo Sheet lon
AGENT/ROLE: Codex / Sheet performance
BRANCH: perf/p2-sheet-js-codex
WORKTREE: E:\VNOffice-codex-p2
OBJECTIVE: Profile va toi uu `buildSheetPayloadModel`; mac dinh dung ban moi, giu ban cu sau co; model phai deep-equal va khong doi hien thi/hanh vi.
FINDINGS: Profile payload lan14 cho thay pass 1 normalize row XML 10.984 ms; pass 2 normalize lap lai 11.667 ms; pass 2 build rows 28.153 ms. CPU profile chi ra `JSON.parse(vno:number-format)` lap tren o va `_computeStyleHash` la hai hotspot lon trong `_cellFromFodsAttributes`; khong phai LibreOffice Core.
IMPLEMENTATION SUMMARY: WIP. Mac dinh P2 giu record da normalize de khong inflate/parse hai lan; record P2 giu attrs object thay vi object->entries->object; parser entity mot luot; cache number-format/style/hash; bo rich-text/image scan khi markup khong the co du lieu. Duong cu con nguyen qua `{ legacy: true }` hoac `globalThis.__VNO_OPEN_LEGACY = true` va wrapper `_cellFromFodsAttributesLegacy`.
FILES CHANGED: `adapters/libreoffice/sheet/sheet-payload-parser.js`; `adapters/libreoffice/sheet/sheet-adapter.js`; `tests/unit/sheet-payload-p2-equivalence.test.js`; `tests/run-tests.js`; `docs/HANDOFF-PERF-P2.md`.
COMMANDS RUN: Doc toan bo spec; profile desktop lan14; tao payload lan14 that bang harness co san; benchmark Node va CPU profile; syntax check; chay rieng 2 suite payload.
BUILD RESULT: NOT RUN (khong co build rieng; dung theo moc dung WIP cua brief).
TEST RESULTS: PASS 2/2 suite P2 equivalence; PASS 6/6 suite `sheet-open-payload`; full Node NOT RUN; desktop regression NOT RUN; cac bai Sheet CDP NOT RUN; A1:J30 NOT RUN.
KNOWN FAILURES: Muc tieu lan14 <=10 s CHUA DAT: desktop 19.510 ms sau toi uu (1 lan), truoc 53.343 ms (1 lan). Chua co trung vi 3 lan; chua deep-equal tren 4 payload that.
RISKS: Thu tu Map/Set; rich text, image, merge, layout; progress callback; tai nguyen may khi do lan14.
DEPENDENCIES/BLOCKERS: Payload that sinh boi luong desktop; khong sua `main.py`, `ooxml_zip_patch.py`, `sheet_open_payload.py` vi P1 so huu.
CORE PATCH ID (if any): Khong co; khong sua LibreOffice Core.
NEXT ACTION: Tiep tuc P2 bang xu ly tung sheet/one-pass de giam 5-9 s normalize con lai va ap luc GC; sau do deep-equal day du 4 payload that, benchmark 3 lan va chay mot lan full gate.

## Plan gate

- Current capability: parser payload v2 xac thuc support XML, doc record nen hai luot, tao model day du va commit sau khi thanh cong.
- Files/modules du kien: `adapters/libreoffice/sheet/sheet-payload-parser.js`, test Node moi trong `tests/unit/`, `tests/run-tests.js`, script benchmark/doi chieu trong `tests/perf/`, tep handoff nay.
- Dependency: `SheetAdapter` hien huu va payload that tu bon file LAN; khong them thu vien ngoai.
- Test plan: deep-equal ban cu/ban moi sau chuan hoa; benchmark 3 lan lay trung vi; full Node; desktop regression; Sheet CDP lien quan; A1:J30 gia tri va hien thi.
- Rollback: `globalThis.__VNO_OPEN_LEGACY`; giu nguyen implementation cu voi chu thich `superseded by P2 - xoa chi khi chu so huu duyet`.

## Bang profile va benchmark

| File / phep do | Truoc | Sau | Ket luan |
|---|---:|---:|---|
| lan14 desktop buildSheetPayloadModel | 53.343 ms (1 lan) | 19.510 ms (1 lan) | Giam 63,4%; FAIL muc tieu <=10 s; chua co trung vi |
| lan14 Node, payload that sinh tu file | 61.532 ms | 17.392 ms | Giam 71,7%; so dung de profile, khong thay the desktop gate |
| lan03 buildSheetPayloadModel | NOT RUN | NOT RUN | Het moc thoi gian WIP |
| lan16 buildSheetPayloadModel | NOT RUN | NOT RUN | Het moc thoi gian WIP |
| lan26 buildSheetPayloadModel | NOT RUN | NOT RUN | Het moc thoi gian WIP |

## Bang profile lan14 truoc toi uu

| Buoc | Thoi gian Node |
|---|---:|
| validate + support/styles | 167 ms |
| pass 1 total | 14.962 ms |
| pass 1 normalize row XML | 10.984 ms |
| pass 1 scan cells | 1.587 ms |
| pass 2 total | 46.144 ms |
| pass 2 normalize row XML | 11.667 ms |
| pass 2 build rows | 28.153 ms |
| attach metadata | 102 ms |

## Cong kiem bat buoc

| Cong | Ket qua |
|---|---|
| `node tests/run-tests.js` | NOT RUN |
| `node tests/live/cdp/run-desktop-regression.mjs` | NOT RUN |
| A1:J30 lan03/16/26 truoc/sau | NOT RUN |
| `sheet-format-state.desktop.mjs` | NOT RUN |
| context menu CDP | NOT RUN |
| `ch4-6-keep-focus` CDP | NOT RUN |
