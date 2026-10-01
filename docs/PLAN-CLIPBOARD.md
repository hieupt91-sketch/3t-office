# CH-4.2 / CH-4.3 — resume plan

- Objective: finish actual desktop Excel/Word clipboard fidelity, ribbon Paste/Paste Special and one-step Undo on `feat/clipboard-office-interop-agy`.
- Current capability: WIP `bd89271c` contains Office HTML parser, adapter paste handlers, Python Windows clipboard bridge, Vietnamese help and CDP/hidden COM probes. Existing uncommitted fixes cover localized Excel number formats and Writer dialog translation. No previous clipboard handoff exists here.
- Reuse: preserve existing parser, desktop bridge, adapter commands and undo stack; no LibreOffice core patch.
- Files: existing clipboard platform, Sheet/Writer adapters, `main.py`, help entries and clipboard tests; add completion evidence in `docs/HANDOFF-CLIPBOARD.md`. Audit helper cleanup must target only the hidden COM instance it creates.
- Dependencies: installed WebView2, hidden Excel/Word COM, existing Python embedded server; fixed XLSX linters from `E:\VNOffice-codex-audit-sheet\scripts\layout-audit` (read-only).
- Risks: Chromium HTML excludes Office head CSS; localized formats; clipboard ownership during asynchronous bridge read; Writer selection/undo; Office delayed clipboard rendering. Desktop checks use CDP exclusively.
- Test plan: real COM copy to each desktop app using Ctrl+V, ribbon Paste, Ctrl+Alt+V, plus one Undo; then run JS suite, Python suite and 26 LAN roundtrips sequentially once. Record actual failures without masking them.
- Rollback: revert the final task commit if necessary; preserve existing WIP history. No changes to OOXML zip patch or save paths, no merge.

Audit execution adjustment: the existing roundtrip helper evaluated WebView2 directly. Route those same checks through a local CDP JSON-lines helper using Node's existing WebSocket capability, preserving the Python app/server and save behavior. Run LAN01–LAN26; LAN27/28 are additional files outside the requested 26-file gate. The repository had no tracked `test_output*.txt` remaining when resumed; `git rm --ignore-unmatch` confirms this.
