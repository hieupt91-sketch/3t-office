# Agent Handoff

TASK: Audit dinh dang run/doan DOCX goc voi DOCX do VN Writer luu
AGENT/ROLE: Codex / Writer Integration + QA
BRANCH: `fix/writer-run-format-audit`
WORKTREE: `E:\VNOffice-codex-writer-audit`

## Objective and implementation

Them auditor DOCX khong dependency, do gia tri hieu luc sau `docDefaults`, style `basedOn` va theme font. Auditor can lai doan bang LCS tren text chuan hoa, bo `w:txbxContent`, va bao cao toi da 20 vi du cho moi nhom.

Lenh chay:

```powershell
node scripts/audit-writer-docx.mjs "goc.docx" "luu-ra.docx"
```

Buoc luu that da dung `_roundtrip_save_writer.py`: mo cua so desktop, doi tai lieu load, va goi `common.file.save` qua command bus. Khong dung SendKeys/SetForegroundWindow. Doi chung LO dung chinh HTML app gui khi Save, dua thang vao `main._run_soffice_convert(..., 'docx', ..., 'writer')`, khong qua postprocess cua app.

Fix nam tai Adapter/integration boundary: `postprocess_writer_docx` can doan bang text trung khop chinh xac, chi khoi phuc direct `w:rPr` va cac child `w:ind`, `w:jc`, `w:numPr`. Noi dung/run text/drawing cua output khong bi thay. Khong khoi phuc `w:spacing`: phep thu ban dau lam MYTIME tang 88 len 89 trang do cong don voi page break cua HTML bridge; scope an toan cuoi cung giu 88 trang.

## Before/after: two real documents

| Nhom | Aquara before | Aquara after | MYTIME before | MYTIME after |
|---|---:|---:|---:|---:|
| Font | 0 | 0 | 306 | 8 |
| Size | 0 | 0 | 57 | 8 |
| Bold | 0 | 0 | 57 | 8 |
| Italic | 0 | 0 | 57 | 3 |
| Spacing | 16 | 16 | 233 | 233 |
| Indent | 16 | 16 | 233 | 98 |
| Align | 16 | 16 | 95 | 95 |
| List | 0 | 0 | 0 | 0 |
| Text | 114 | 114 | 107 | 107 |
| Total | 188 | 188 | 1421 | 836 |

Word 2016 `ComputeStatistics(2)` tren output app cuoi: Aquara `OK pages=17`; MYTIME `OK pages=88`. Hai moc khong xau di.

## Seven real-office fixtures (final real-app save)

| Fixture | Text | Font | Size | Spacing | Indent | Align | Table | Image | Total |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| comments | 0 | 0 | 1 | 3 | 0 | 0 | 0 | 0 | 5 (gom 1 List) |
| footnotes | 10 | 0 | 1 | 1 | 0 | 0 | 0 | 0 | 13 (gom 1 List) |
| headerfooter | 0 | 0 | 1 | 2 | 0 | 0 | 0 | 0 | 4 (gom 1 List) |
| image | 1 | 0 | 1 | 3 | 0 | 0 | 0 | 0 | 9 (gom 3 Color, 1 List) |
| tables | 0 | 0 | 1 | 3 | 0 | 0 | 0 | 0 | 5 (gom 1 List) |
| trackchanges | 0 | 0 | 1 | 2 | 0 | 0 | 0 | 0 | 4 (gom 1 List) |
| basic | 0 | 0 | 1 | 5 | 0 | 0 | 0 | 0 | 10 (gom 3 Style, 1 List) |

## Attribution evidence

| Nhom | App before | LO direct HTML->DOCX | App after | Ket luan |
|---|---:|---:|---:|---|
| MYTIME Font | 306 | 306 | 8 | VN; da sua |
| MYTIME Size/Bold | 57 moi nhom | 57 moi nhom | 8 moi nhom | VN; da sua |
| MYTIME Italic | 57 | 57 | 3 | VN; da sua |
| MYTIME Indent | 233 | 233 | 98 | VN co the khoi phuc an toan mot phan; da sua |
| MYTIME Spacing | 233 | 233 | 233 | LibreOffice HTML; doi chung van lech |
| MYTIME Align | 95 | 95 | 95 | LibreOffice HTML; doi chung van lech |
| MYTIME PageBreak | 43 | 43 | 43 | LibreOffice HTML; doi chung van lech |
| Aquara cac nhom con lai | 188 total | 188 total | 188 total | LibreOffice HTML/cau truc text box; doi chung giong app |

`LO direct` la ket qua auditor tren DOCX do soffice tao truc tiep tu payload HTML. Day la chung cu phan loai, khong phai suy doan.

## Tests and risk

- Unit postprocess rieng cho font+size, indent, align+list.
- Unit CLI/auditor tren fixture nho tu so sanh, ky vong total 0.
- Full commands bat buoc: xem ket qua commit handoff cuoi.
- Khong dependency, khong Core/upstream, khong thay build/security/AI flow.
- Risk con lai: LCS chi overlay doan co text trung khop chinh xac; doan rong, doan bi gop/tach va run bi gop/tach khong duoc doan phuc hoi. Day la chu dich de khong sua noi dung theo heuristic.
- Rollback: revert commit cua task.

FILES CHANGED:

- `scripts/audit-writer-docx.mjs`
- `adapters/libreoffice/common/ooxml_zip_patch.py`
- `tests/unit/writer-docx-audit.test.js`
- `tests/test_writer_section_headerfooter_postprocess.py`
- `tests/run-tests.js`
- `docs/HANDOFF-WRITER-RUN-FORMAT-AUDIT.md`

CORE PATCH ID: Khong co.
DEPENDENCIES/BLOCKERS: Khong co.

COMMANDS RUN / RESULTS:

- `node scripts/check-syntax.js`: PASS, 92/92.
- `node tests/run-tests.js`: PASS, 1719/1719.
- `python -m unittest discover -s tests -p "test_writer*.py"`: PASS, 32 tests.
- Chin round-trip app that: PASS (2 file nguoi dung + 7 fixture; moi log co `LOADED`, `SAVE_ARGS`, `EXISTS: True`).
- Word 2016 oracle: PASS, Aquara 17 trang va MYTIME 88 trang.
- Hai doi chung HTML truc tiep qua soffice: PASS conversion; so lieu nam trong bang phan loai tren.

BUILD RESULT: Khong co build rieng; syntax va full suite deu PASS.
KNOWN FAILURES: Cac lech LibreOffice HTML con lai da liet ke; khong co test bat buoc nao fail.
NEXT ACTION: Neu muon xu ly spacing/page-break con lai, can thiet ke native OOXML overlay rieng va kiem chung Word page count truoc khi mo rong; khong them vao fix an toan nay.
