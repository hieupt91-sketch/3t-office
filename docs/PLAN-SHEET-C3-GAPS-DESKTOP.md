# Sheet C3 gaps desktop acceptance

- Objective: complete the five requested desktop CDP acceptance proofs, hidden Excel COM readback, final gates and 28-file LAN regression audit.
- Current capability: commits 2652f6f9, 2153a7c4 and 0f2e9aae implement the fixes; desktop probing found General `25%` still stored as text.
- Files/modules: Sheet input normalization and its native-value tests; update the existing Sheet-owned Vietnamese Help entry in the shared Help registry; CDP acceptance harness; audit report and handoff. Reuse the existing formatter, command bus, desktop Python server, page setup dialogs and COM audit ownership checks.
- Dependencies: WebView2 CDP, installed LibreOffice/Excel; wait for the claude-types lan14 investigation/audit to finish, no other Python batch audit, free RAM >3 GB before heavy work.
- Risk: incorrect percentage coercion or lost styles/history; constrain recognition to numeric percent input in General, preserve forced text, check calculation/export/Undo and desktop XLSX reopening.
- Desktop follow-up: tab color menu extended below the window. Clamp it inside the viewport and use arrow keys/Enter/Escape with listener cleanup; verify the actual desktop menu bounds and keyboard selection.
- Adapter follow-up: LibreOffice adds header/footer spacing to XLSX page margins. Use existing `vno:page-margins` metadata to restore standard XLSX `pageMargins` on save, and overlay native XLSX margins into that existing metadata on open. Files: `adapters/libreoffice/common/ooxml_zip_patch.py`, `tests/test_sheet_page_margins_roundtrip.py`. Preserve other page settings and header/footer distances; verify schema order, native units, malformed metadata and multi-sheet identity, then repeat desktop/COM proof and the LAN audit. No Core changes.
- Test plan: all five desktop cases, private hidden Excel COM Value2/PageSetup/tab color, JavaScript suite, Python unittest discovery, syntax and whitespace lint, exact prescribed 28-file LAN audit with per-file TONG 0 and clean lint.
- Rollback: revert the scoped follow-up commit on this branch if necessary; do not alter main or other worktrees.
