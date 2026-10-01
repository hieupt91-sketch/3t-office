# lan14 merged-branch save investigation

Objective: isolate and fix the lan14 save regression with measured main/original/merge runs; preserve all audit criteria and timeout limits.

Current capability: Sheet imports XLSX via LibreOffice and hydrates a payload/FODS model, then serializes FODS and converts back to XLSX. Legacy batch previously saved 27/28 files on this merge. CH-6 uses a separate CDP service-save harness.

Modules: Sheet adapter/grid and Python conversion lifecycle only if evidence identifies them; CDP/roundtrip test harness for reproducible measurement and legacy desktop automation. No upstream changes or dependencies planned.

Dependencies: installed Python/WebView2, Node, LibreOffice and hidden Excel COM; private Git snapshots inside this worktree. Run heavy audits sequentially only with >3 GiB free RAM and no competing Python batch audit.

Risks: premature save before hydration, LibreOffice profile contention, excessive serialization, harness false negatives. Keep source fixtures unchanged; keep document contents and generated artifacts untracked and local.

Tests: lan14 alone on main, audit/sheet-basics-codex and merge with existing perf hooks; targeted regression; legacy full 28-file batch with zero differences, clean lints and hidden Excel open; CH-6 failing inputs; node tests/run-tests.js foreground; python -m unittest discover -s tests.

Rollback: revert the focused fix commit. Do not merge main or change audit expectations/timeouts.
