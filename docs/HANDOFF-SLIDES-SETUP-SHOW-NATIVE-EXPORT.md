# Agent Handoff

TASK: Phase 3b — Native export post-process: Set Up Slide Show `p:showPr` trên PPTX thật
AGENT/ROLE: Grok — Slides native-export fidelity (không đụng Writer/Sheet source)
BRANCH: `feature/slides-setup-show-native-export`
WORKTREE: `E:\VNOffice-grok-slides-setup-show-native`
BASE: `main` @ `77398d7` (Merge `feature/slides-masterlogo-open-overlay`; **1258/1259 PASS** đo lại trước task — 1 FAIL flake suite 64 Sheet CF soffice, ngoài scope)
**KHÔNG merge vào main.** Không đụng Writer/Sheet source.

---

## Bối cảnh

PLAN Phase 3b và các handoff Phase 1/2b/3a ghi: Set Up Show `vno:without-narration` / `vno:pointer-color` mất qua PPTX; `presentation:endless` giữ; pointer “có thể không có chỗ OOXML”. **Đo lại từ đầu** (file findings commit trước code): `docs/HANDOFF-SLIDES-SETUP-SHOW-NATIVE-FINDINGS.md`.

Đây **không** phải giới hạn kiến trúc PowerPoint cho hai cờ `vno:*`. LibreOffice đã ghi `p:showPr` nhưng thiếu đúng hai slot chuẩn.

---

## Probe soffice thật (trước khi viết patch)

Script `tests/scripts/probe-slides-setup-show-pptx.mjs`. Fixture: 3 `draw:page`, `presentation:settings` VN serialize.

| Mục | Giá trị đo |
|---|---|
| `ppt/presentation.xml` | 784 byte, compact, **không** có `p:showPr` |
| Chỗ chuẩn | **`ppt/presProps.xml`** / `p:presentationPr` / `p:showPr` (ECMA-376 `CT_ShowProperties`) |
| LO khi FODP có `presentation:endless` | `<p:showPr loop="1" showNarration="1"></p:showPr>` |
| `vno:without-narration` | **bỏ**; LO vẫn `showNarration="1"` |
| `vno:pointer-color` | **không** `p:penClr` |
| PPTX→FODP | `presentation:endless` **giữ**; `vno:*` **mất** |
| `presentation:start-page` (ODF viết tay) | LO **đã** ghi `<p:sldRg st="…" end="…"/>` |
| `presentation:show` / full-screen / mouse-as-pen | **không** `p:custShow` / `p:kiosk` / `p:penClr` |

VN UI (`showSetupShowDialog`) **chỉ** lưu `loopUntilEsc` / `showWithoutNarration` / `pointerColor`. Không kiosk, không start/end.

---

## Việc đã làm — tính năng OOXML thật

Sau soffice FODP→PPTX, twin JS+Python mở ZIP (`ooxml_zip_patch`, không viết ZIP riêng) và vá `ppt/presProps.xml`:

- `vno:without-narration="true"` → `@showNarration="0"`
- `vno:pointer-color="#112233"` → `<p:penClr><a:srgbClr val="112233"/></p:penClr>`
- **Giữ** `@loop` và `p:sldRg` LibreOffice đã viết
- Không nhét `vno:*` vào PPTX
- No-op khi FODP chỉ có `presentation:endless` (LO đã đủ)
- `main.py` nới gate: bài chỉ Set Up Show (không logo, không phần) vẫn vá

Loop **không** vá — filter Impress đã map `presentation:endless`.

---

## FILES CHANGED

- `docs/HANDOFF-SLIDES-SETUP-SHOW-NATIVE-FINDINGS.md` — **commit trước code**
- `tests/scripts/probe-slides-setup-show-pptx.mjs` — probe soffice
- `adapters/libreoffice/slides/pptx-show-properties.js` — **mới**. XML thuần, browser-safe
- `adapters/libreoffice/slides/pptx-native-postprocess.js` — patch `presProps.xml` cùng ZIP rewrite
- `adapters/libreoffice/common/ooxml_zip_patch.py` — twin Python
- `adapters/libreoffice/slides/slides-adapter.js` — comment tại serialize settings (không đổi FODP)
- `main.py` — gate + docstring `_apply_native_export_postprocess`
- `tests/unit/slides-pptx-show-properties.test.js` — suite 115 (7 test)
- `tests/live/slides-pptx-setup-show-native-export.mjs` — soffice thật
- `tests/test_slides_pptx_show_properties.py` — Python + `save_document_dialog` mock
- `tests/run-tests.js` — đăng ký suite 115
- `platform/help/entries-slides.js` — bước Lưu PPTX `showNarration` / `penClr` (AGENTS.md §10)
- `docs/PLAN-SHEET-SLIDES-NATIVE-EXPORT-FIDELITY.md`
- `docs/HANDOFF-SLIDES-SETUP-SHOW-NATIVE-EXPORT.md`

Không đụng `apps/writer/**`, `apps/sheet/**`, `adapters/libreoffice/writer/**`, `adapters/libreoffice/sheet/**`, Core, build system.

---

## COMMANDS RUN

```
node tests/run-tests.js                          # trước: 1258/1259 (FAIL flake suite 64 Sheet)
node tests/scripts/probe-slides-setup-show-pptx.mjs
python -m py_compile adapters/libreoffice/common/ooxml_zip_patch.py main.py
python -m unittest tests.test_slides_pptx_show_properties tests.test_slides_pptx_sections tests.test_slides_pptx_master_logo
node tests/live/slides-pptx-setup-show-native-export.mjs
node tests/run-tests.js                          # sau
```

---

## TEST RESULTS

- `node tests/run-tests.js` sau task: **1267/1267 PASS** (0 FAIL). +7 suite 115 + 1 `node --check` `pptx-show-properties.js`; suite 64 flake trước đó PASS lại khi soffice không bị kẹt.
- Python unittest showPr + regression sections/logo: **12/12 PASS**
- Live soffice `slides-pptx-setup-show-native-export.mjs`: **PASS**

```json
{
  "loHadShowPr": true,
  "loShowNarration": true,
  "loHadPenClr": false,
  "loLoop": true,
  "jsShowNarration": false,
  "jsPenRgb": "112233",
  "jsLoop": true,
  "pythonShowNarration": false,
  "pythonPenRgb": "112233",
  "sofficeReopenFodpOk": true,
  "sofficeReopenPdfOk": true,
  "loRoundTripEndless": true,
  "loRoundTripVno": false,
  "pptxBytes": 11702
}
```

File patched **hợp lệ**: soffice PPTX→FODP và PPTX→PDF không lỗi. `showNarration="0"` + `penClr val="112233"` đúng chỗ `ppt/presProps.xml`. `ppt/presentation.xml` không bị nhét `showPr`.

**Đây là tính năng OOXML/PowerPoint thật**, không giả.

---

## KNOWN FAILURES / LIMITATIONS

1. **LibreOffice không map ngược** `showNarration="0"` / `p:penClr` → `vno:*` khi PPTX→FODP (`loRoundTripVno=false`). File → Mở PPTX trong VN Slides mất cờ trên dialog dù PowerPoint thấy. Overlay import = phase sau (pattern 3a-open). Loop **không** mất (`loRoundTripEndless=true`).
2. **Kiosk / presenter / browse không vá.** VN UI không lưu loại chiếu. LO không sinh `p:kiosk` từ ODF `full-screen` đã thử. OOXML **có** chỗ; thiếu dữ liệu UI — không bịa.
3. **Slide start/end không vá.** VN không serialize `presentation:start-page`. LO **đã** map sang `p:sldRg` nếu ODF có. Cần task UI (`apps/slides`, ngoài scope).
4. **Pen/laser runtime** vẫn chưa vẽ trên F5 — chỉ lưu màu vào file.
5. **Rewrite ZIP** bỏ extra field/compression gốc. soffice mở lại PASS trên fixture nhỏ.
6. PowerPoint desktop không có trên máy đo — chưa chứng minh Repair.

---

## RISKS

Thấp với 3b: chỉ sửa attribute/child trên element LibreOffice đã sinh, đúng file `presProps.xml`. Không đụng `@loop`. Hex không 6 chữ thì ném. Rủi ro lệch JS/Python được live test bắt.

---

## DEPENDENCIES/BLOCKERS

Không. `soffice.exe` sẵn. Không merge main. Không thư viện trả phí.

---

## CORE PATCH ID (if any): N/A

Không sửa LibreOffice Core. Filter convert thiếu `showNarration=0` / `penClr`; OOXML đã hỗ trợ.

---

## NEXT ACTION

1. Review branch `feature/slides-setup-show-native-export` trên worktree `E:\VNOffice-grok-slides-setup-show-native`. **Không tự merge.**
2. Overlay File → Mở: đọc `ppt/presProps.xml` gốc, gắn lại `vno:without-narration` / `vno:pointer-color` trước `parseFodp` — nếu không, người dùng Lưu rồi Mở lại trong VN Slides mất cờ dù PowerPoint còn.
3. Nếu product muốn kiosk / start–end: làm UI + serialize ODF (`presentation:start-page` đã có đường LO → `p:sldRg`); không bịa ở hậu-kỳ.

Rollback: revert commit; hoặc xóa nhánh showPr trong `postprocess_slides_pptx` / gate `main.py` — File → Lưu lại đúng convert thuần LibreOffice (loop vẫn còn, narration/pen mất như trước 3b).
