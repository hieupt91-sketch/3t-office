# Agent Handoff — 3T display name rename

**TASK:** Rename user-visible VN Office product names to the approved 3T names.

**AGENT/ROLE:** Codex — implementation and verification.

**BRANCH:** `chore/rename-3t-display-codex`

**WORKTREE:** `E:\VNOffice-codex-rename3t`

**OBJECTIVE:** Change display names to 3T Office, 3T Doc, 3T Sheet, 3T Slide, and Trợ lý 3T AI while keeping internal identifiers and the 0.9.4 update path stable.

## Findings

- Product names appeared in app chrome, document titles and generated examples, Vietnamese and English i18n, in-app Help, update/error notices, metadata defaults, installer screens, and pilot instructions.
- The installer already detects the pilot install through `Software\Microsoft\Windows\CurrentVersion\Uninstall\VNOffice` and installs to `%LOCALAPPDATA%\VNOffice\app-install`; both remain unchanged.
- Saved slide documents may contain the old `VN OFFICE` default logo. The adapter still recognizes that 0.9.4 value alongside the new 3T defaults.
- No old product labels remain in user-visible i18n or Help values; a regression test checks both locales, the Vietnamese JSON catalog, and all Writer/Sheet/Slides Help entries.

## Implementation summary

- Updated display strings in `apps/`, `platform/`, `adapters/`, `main.py`, and `index.html`, including app/window titles, switcher labels, dialogs, Help, update notices, templates, and default saved-document authors.
- Updated installer product and wizard strings, uninstall display name, Start Menu group, and shortcuts. The installer removes old VN shortcut names before creating `3T Doc`, `3T Sheet`, and `3T Slide` shortcuts. The pilot PowerShell flow performs the same legacy shortcut cleanup.
- Updated `CAI-DAT.txt`, installer notices, and pilot install messages. A local `HUONG-DAN-CAI-DAT.txt` copy was checked in scratch; no release was published to the LAN share.
- Added a regression guard for user-visible i18n and Help labels. Updated the error-reporting Help assertion for the renamed apps.
- No new dependencies, format changes, or LibreOffice Core patches.

## Files changed

- Display text matches across `apps/**`, `platform/**`, `adapters/**`, `main.py`, and `index.html`.
- Installer and pilot assets: `scripts/installer/vnoffice.nsi`, `scripts/installer/NOTICE-VI.*`, `scripts/build-installer.ps1`, `scripts/build-pilot.ps1`, `scripts/install-pilot.ps1`, and `scripts/pilot/CAI-DAT.txt`.
- Tests: `tests/unit/3t-display-name.test.js`, `tests/unit/error-reporting.test.js`, and `tests/run-tests.js`.
- This handoff: `docs/HANDOFF-RENAME-3T.md`.

## Intentionally unchanged internal names

- Data/profile paths and install directory: `%LOCALAPPDATA%\VNOffice`, `%APPDATA%\VNOffice`, and `%LOCALAPPDATA%\VNOffice\app-install`.
- Installer lookup key: `Software\Microsoft\Windows\CurrentVersion\Uninstall\VNOffice`; document ProgIDs such as `VNOffice.Writer.Document`; app kinds `writer`, `sheet`, and `slides`.
- Package and updater identifiers: `VNOffice-Setup-*`, `VNOffice-*`, update channel `pilot`, update configuration names, and the existing embedded public signing key in `adapters/updater/trust.py`.
- Existing file names, repo folders, JS class names, `vno-*` CSS classes, `vno:` FODS namespace, localStorage keys, and icon filenames/assets.
- Old `VN Writer`/`VN Sheet`/`VN Slides` shortcut names and the old `VN Office` Start Menu folder appear only in installer cleanup. Old `VN OFFICE` slide logo strings remain only for 0.9.4 document compatibility.

## Commands run / results

- **PASS** — `git diff --check`.
- **PASS** — `node tests/run-tests.js`: 2,183/2,183 checks passed. The first run exposed one stale error-reporting Help expectation; it was updated and the complete suite passed on rerun.
- **PASS** — `python -m unittest discover -s tests`: 499 tests passed in 351.533 seconds. The FODS-to-XLSX round-trip cases passed, so no isolated rerun was needed.
- **PASS** — Local signed update staging from 0.9.4 to 0.9.5 on channel `pilot`; the target manifest verified and staged as ready.
- **PASS** — `scripts/build-pilot.ps1` built version 0.9.5 in a temp scratch directory (package size 1,593 MB).
- **PASS** — `scripts/build-installer.ps1` compiled the package with NSIS v3.13 in that scratch directory. Setup size: 526,415,431 bytes; SHA-256: `1D14F9CC357F7E35F11ABBEE554E20606CB5B618A53A729B4A2B1CB344342227`.
- **PASS** — Confirmed `.nsi` welcome/finish strings say 3T Office and 3T app names, preserve the existing uninstall registry key, remove old shortcuts, and create new shortcuts. Packaged `CAI-DAT.txt` and its local guide copy contain no old display labels.
- **PASS** — Parsed `scripts/install-pilot.ps1` as PowerShell; confirmed it remains ASCII-only for Windows PowerShell 5.1.

**BUILD RESULT:** PASS — package and installer were built under `%TEMP%`, not on the LAN share.

**TEST RESULTS:** PASS — requested Node and Python suites, plus the targeted 0.9.4 → 0.9.5 signed staging check.

**KNOWN FAILURES:** None in final runs. One stale assertion failed in the initial Node run and passed after its expected string was updated.

**RISKS:** The NSIS installer was compiled but not interactively installed over a real 0.9.4 pilot installation. The registry/install locations and legacy shortcut cleanup were checked in source; the signed update staging path was exercised locally.

**DEPENDENCIES/BLOCKERS:** None.

**CORE PATCH ID:** None.

**NEXT ACTION:** Owner review on `chore/rename-3t-display-codex`. No merge into `main` was performed.
