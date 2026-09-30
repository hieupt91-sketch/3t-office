# Agent Handoff

TASK: Replace the Windows installer with NSIS under the owner's free-license requirement
AGENT/ROLE: Codex / implementation + verification
BRANCH: `feature/setup-installer-codex`
WORKTREE: `E:\VNOffice-codex-installer`
OBJECTIVE: Provide a Vietnamese-first, offline-capable, per-user Setup.exe at `%LOCALAPPDATA%\VNOffice\app-install`, compatible with the in-place updater. Do not merge into `main`.
PLAN: Reuse the existing pilot package layout, wrap it with NSIS, and keep preflight/process checks in a PowerShell helper. Main files: `scripts/installer/vnoffice.nsi`, `scripts/installer/SetupPreflight.ps1`, and `scripts/build-installer.ps1`. No new runtime service or external dependency is introduced. Risks are overwriting a running app, deleting updater state, and losing user data; checks cover live upgrade, updater-cache preservation, and uninstall data retention. Rollback is to run a previously trusted Setup.exe over the same install; uninstall removes only the installed app tree unless the user selects the data-deletion checkbox.
FINDINGS: `scripts/build-pilot.ps1` already supplies the `python\`, `app\`, `icons\`, version/build metadata, and third-party notices needed by the installer. The updater stages data under `%LOCALAPPDATA%\VNOffice\updates`, beside `app-install`, and updates managed files in place. NSIS 3.13 was downloaded from the official SourceForge release as a portable ZIP and installed only under the current user's `%LOCALAPPDATA%\Programs\NSIS\3.13` (`E:\VNOffice-profiles\codex3\Programs\NSIS\3.13` in this environment); archive SHA-256: `BA63DFFC4410EE89193E1CB5A41989991BD77C61068DA17E3156D136B7B0B3D8`. No machine-wide NSIS installation was made.
IMPLEMENTATION SUMMARY:
- Replaced the prior installer sources with `scripts/installer/vnoffice.nsi` and rewrote `scripts/build-installer.ps1` to find the current-user NSIS compiler, validate the package, compile Setup.exe, and report its size/hash.
- The Unicode NSIS installer uses the official Vietnamese MUI language, `RequestExecutionLevel user`, the fixed LocalAppData install path, Start Menu shortcuts, and a Desktop shortcut section selected by default. File associations are an optional unchecked section and write only to HKCU.
- Preflight checks require 64-bit Windows 10+, WebView2 Runtime, and package-sized free space plus 256 MiB. The helper uses Windows process inventory so 32-bit NSIS/PowerShell can detect 64-bit VN Office processes; it requests a graceful close and waits before replacing files. It removes Mark-of-the-Web from installed files.
- Upgrade copies over the existing package roots without removing the install directory and does not touch the sibling `updates\` cache. The uninstaller removes the install directory and its shortcuts/registry entry. Its data-deletion checkbox defaults off; silent uninstall preserves `%APPDATA%\VNOffice`.
- Setup uses solid LZMA compression. `scripts/installer/NSIS-COPYING.txt` is embedded under the installed `THIRD-PARTY-NOTICES\NSIS-COPYING.txt` path.
- NSIS `COPYING` says its core and other included files (excluding separately licensed compression modules) use zlib/libpng. License excerpt: “Permission is granted to anyone to use this software for any purpose, including commercial applications.” The selected LZMA compression module is separately under Common Public License 1.0 with NSIS's linking exception; the full upstream license and exception are included in `NSIS-COPYING.txt`. Sources: [NSIS license](https://nsis.sourceforge.io/License) and [NSIS 3.13 release](https://sourceforge.net/projects/nsis/files/NSIS%203/3.13/).
- Updated `scripts/pilot/CAI-DAT.txt` so Setup.exe is the first install path and NSIS is the build dependency. Removed the stale installer-specific files and licensing claims from the handoff.
FILES CHANGED: `.gitattributes`; `.gitignore`; `scripts/build-installer.ps1`; `scripts/installer/vnoffice.nsi`; `scripts/installer/SetupPreflight.ps1`; `scripts/installer/NSIS-COPYING.txt`; `scripts/installer/NOTICE-VI.txt`; `scripts/installer/NOTICE-VI.rtf`; `scripts/pilot/CAI-DAT.txt`; this handoff.
COMMANDS RUN:
- Downloaded the official NSIS 3.13 portable ZIP; checked `makensis.exe /VERSION` (`v3.13`).
- `powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File scripts\build-installer.ps1 -PackageDir E:\VNOffice-dist\VNOffice-0.9.0-pilot2test -OutDir E:\VNOffice-dist`
- `python -m unittest discover -s tests`
- `node tests/run-tests.js`, followed by focused reruns of the four failing LibreOffice-dependent tests.
- Parsed `SetupPreflight.ps1`, ran its system/WebView2/disk preflight, and exercised `InspectRunning`/`CloseRunning` from 32-bit PowerShell against the 64-bit Writer process.
- Silent install, shortcut/registry/license checks, Writer launch, live silent upgrade, installed-file stream audit, silent uninstall, and test-marker cleanup. Ran `git diff --check`.
BUILD RESULT: PASS — NSIS 3.13 compiled `E:\VNOffice-dist\VNOffice-Setup-0.9.0-pilot2test.exe` in 745.1 seconds. Final size: 320,939,691 bytes (306.07 MiB); SHA-256: `E6A16F983E3E0D6A0786D38E6CB4EDA579B2EB5514C6B8A04BAF02D67A270501`. Compiler reported no warnings. Installer uses solid LZMA compression; package payload was 1,645,499,212 bytes. Signature status: `NotSigned`.
TEST RESULTS:
- PASS — `python -m unittest discover -s tests`: 419 tests, 2,431.179 seconds, `OK`. The app suites ran before the final one-file PowerShell cross-bitness fix; that fix was separately parsed and exercised from 32-bit PowerShell and in the final installer E2E.
- FAIL — `node tests/run-tests.js`: 2,022/2,026 PASS, 4 FAIL. Focused reruns reproduced the same four failures; each reports `soffice --convert-to xlsx:Calc MS Excel 2007 XML failed:` with empty output:
  - `Sheet FODS save: LibreOffice giữ CF và validation qua FODS -> XLSX -> FODS`
  - `Sheet Pivot save: LibreOffice giữ DataPilot qua FODS -> XLSX -> FODS`
  - `FODS thật qua soffice: FODS → XLSX → FODS giữ height/width/visibility`
  - `LibreOffice FODS -> XLSX: textRotation 45/135/90/180/255 đúng XML`
- PASS — final clean silent install exited 0 in 68.4 seconds at `C:\Users\3T Computer\AppData\Local\VNOffice\app-install`. Start Menu and Desktop Writer/Sheet/Slides links target the installed `pythonw.exe` with the expected `--app=` arguments. Apps & Features shows the expected HKCU VN Office entry. The default install did not register `VNOffice.Writer.Document`.
- PASS — launched Writer from its Start Menu shortcut and observed the `VN Writer — Soạn thảo văn bản` window. Live silent upgrade of the final Setup.exe exited 0 in 71.9 seconds, closed the original Writer PID, restored a locally modified managed JS file to the package SHA-256, and preserved update-cache markers under both the Windows LocalAppData path and the runner's overridden LocalAppData path.
- PASS — `SetupPreflight.ps1` parsed; its OS/WebView2/disk check returned 0. From 32-bit PowerShell, the process check returned 20 while Writer was open, the close helper returned 0, and no install processes remained.
- PASS — stream audit found 0 `Zone.Identifier` streams across 20,518 installed files.
- PASS — final silent uninstall exited 0 and removed the install tree, Apps & Features entry, and VN Office Start Menu/Desktop app shortcuts. It preserved the `%APPDATA%\VNOffice` test marker and update-cache markers; only those test marker files and the empty test-created cache directories were removed afterward. User data directory was left in place.
- NOT RUN — manual inspection of interactive wizard pages, selecting the optional file-association section, and ticking the interactive uninstaller data-deletion checkbox. The default association state and silent uninstall data preservation were verified.
- PASS — `git diff --check`; final generated Setup signature is `NotSigned`, as expected for this pilot.
KNOWN FAILURES: The four Node suite failures above are LibreOffice conversion failures with no `soffice` diagnostic output; all reproduced in focused reruns. No installer E2E failure remains.
RISKS: Setup.exe is unsigned and may trigger SmartScreen. The current 32-bit NSIS stub relies on built-in Windows PowerShell 5.1/CIM for cross-bitness process discovery. The owner should retain `NSIS-COPYING.txt` with distributed installs because the solid LZMA module has separate license terms.
DEPENDENCIES/BLOCKERS: No blocker. NSIS is needed only to rebuild; the generated Setup.exe installs without a separate NSIS runtime.
CORE PATCH ID (if any): Not applicable.
NEXT ACTION: Review and pilot this branch. Do not merge into `main`.
