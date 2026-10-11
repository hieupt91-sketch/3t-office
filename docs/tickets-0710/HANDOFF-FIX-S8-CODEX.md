# Agent Handoff
TASK: FIX-S8 — VN Sheet vs Excel: names, text rotation, print margins, inserted-column width
AGENT/ROLE: Codex / VN Sheet audit
BRANCH: `fix/sheet-s8-codex`
WORKTREE: `E:\VNOffice-codex-fs8`
OBJECTIVE: Complete remaining S7 Sheet parity checks, with real CDP UI actions and read-only Excel COM readback.
FINDINGS: Correcting the desktop harness's Name Manager sequence (click New, Ctrl+A with the CDP modifier API, fill both fields, click Save) made `SampleNames` persist. Excel read-only reports Names.Count=1 and RefersTo `=Sheet1!$B$2`. Rotation 90° yields Excel Orientation=-4171 (xlUpward). Page setup landscape yields Orientation=2 and all 1.27 cm margins read as 0.5 in. A no-op save control and insert-column output both read A:C widths 8.43/8.43/8.43; the historical 8.5/10.88 discrepancy was not reproduced. Format as Table remains a recorded gap only, as requested.
IMPLEMENTATION SUMMARY: Corrected the audit harness instead of changing app code: the previous Name Manager probe skipped the New button and used a nonfunctional chord string. Added real CDP inputs for name, rotation, margins and screenshots; exposed the dynamic CDP port to the desktop process; extended Excel read-only output for Names/RefersTo and page margins. No product-layer behavior was changed.
FILES CHANGED: `scripts/audit-0610/word_parallel/app-ops-sheet.desktop.mjs`; `scripts/audit-0610/word_parallel/excel-read.ps1`; `tests/live/cdp/session.mjs`; `docs/tickets-0710/FIX-S8-RESULTS.md`; `docs/tickets-0710/evidence/{fix-s8-name-manager.png,fix-s8-text-rotation.png,fix-s8-page-setup.png,fix-s8-insert-column.png}`; this handoff.
COMMANDS RUN: `node --check scripts/audit-0610/word_parallel/app-ops-sheet.desktop.mjs`; desktop `OPS=definedName,rotation90,pageSetup,widthControl,insertCol` with `VNO_APP_ROOT=E:\VNOffice-codex-fs8`, `VNO_CDP_LOCALAPPDATA=E:\VNOffice-profiles\codex-fs8`, `VNO_AUDIT_MARK_DIRTY=1`, `node --experimental-websocket`; read-only Excel COM through `scripts/audit-0610/word_parallel/excel-read.ps1` for every output.
BUILD RESULT: NOT RUN.
TEST RESULTS: Desktop and targeted Excel COM audit PASS for names/RefersTo, text rotation, page orientation/margins and controlled inserted-column widths. The corrected desktop harness wrote the XLSX files. `node --check` PASS. Full test suite/build NOT RUN.
KNOWN FAILURES: None in the completed cases. The initial Name Manager mismatch came from the old harness sending invalid UI actions and is resolved in the harness. Format as Table's ListObject gap remains intentionally unfixed and is already listed in `docs/RIBBON-BACKLOG.md`.
RISKS: The controlled width probe uses the checked-in Sheet fixture and does not explain the earlier 8.5/10.88 observation from another probe. No width change was justified by the current reproducible evidence.
DEPENDENCIES/BLOCKERS: Excel desktop COM was available. Its workbook opens used ReadOnly=true. No external blocker.
CORE PATCH ID (if any): N/A.
NEXT ACTION: None for FIX-S8. Leave Format as Table implementation to its owner decision.
