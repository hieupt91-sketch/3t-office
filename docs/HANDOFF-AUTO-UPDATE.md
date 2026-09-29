# Agent Handoff

## Plan — automatic patch updates

### Objective
Add a signed, patch-based updater for the installed VN Office pilot. It checks in the background, downloads only content-addressed blobs whose installed file hashes differ, asks the user to restart, and applies the patch after all app and LibreOffice processes from that install exit. A health marker gates success; a failed launch restores the previous files and relaunches the prior app. Updates remain permitted for every license tier for now; one hook is reserved for future subscription and perpetual rules.

### Current capability and reuse
- `scripts/build-pilot.ps1` builds a package tree with `python`, `app`, `icons`, `VERSION.txt`, and `BUILD-INFO.txt`; `scripts/install-pilot.ps1` installs it at `%LOCALAPPDATA%\VNOffice\app-install`.
- `main.py` already starts its own Python `http.server` and exposes a `VnOfficeApi` to the UI. Its startup must stay usable when the update source is offline.
- `platform/ui-kit/notification-bar.js` and `platform/help/` already provide shared UI primitives and a searchable, app-aware Help panel. Reuse these for update notices, actions, status, and Vietnamese guidance across Writer, Sheet, and Slides.
- `adapters/error_reporting/` queues technical errors locally. Rollback reports will use that reporter without including document content.
- No LibreOffice feature or Core change is needed; update lifecycle belongs in the shared adapter/platform boundary.

### Design and modules
1. `adapters/updater/` will contain standard-library-only PKCS#1 v1.5 SHA-256 signature verification, manifest validation, source access, version comparison, delta calculation, bounded resumable staging, and a license hook that returns `True` today. Trust is an embedded 3072-bit RSA public modulus and exponent. The private key is PKCS#1 PEM, generated and used by `scripts/release/make-update.py` using only Python standard-library prime generation, Miller–Rabin, `secrets`, and modular exponentiation; neither the key nor any secret is stored in the repository.
2. Each release has canonical UTF-8 `manifest.json` plus a detached binary `manifest.sig`. The signed manifest contains the version, minimum supported version, channel, Vietnamese notes, UTC creation time, and a complete inventory of package files (`path`, `size`, `sha256`). The signature covers the exact manifest bytes. The source layout is `channels/<channel>.json`, `<version>/manifest.json`, `<version>/manifest.sig`, and `files/<sha256>`. Local, UNC, and HTTPS sources share the same validated relative-path resolver. A channel pointer is treated as untrusted input until its manifest signature and channel are verified.
3. The release tool supports `--keygen` (private key defaults to `%USERPROFILE%\.vnoffice-release\signing-key.pem`, public components go to the embedded trust module), and publishing from a completed build directory. Existing blobs are retained by hash and uploaded once. Build checks keep `main.py`'s `APP_VERSION`, package `VERSION.txt`, and the embedded public-key shape consistent.
4. `main.py` starts a daemon update worker only after the window has loaded; the worker checks on startup and every few hours. It exposes update state/check/restart APIs but never waits on the source during startup. The shared platform displays a `NotificationBar` with “Khởi động lại ngay”, “Để sau”, and “Xem thay đổi”; update status and a manual check are available from Help. Restart uses the existing save command/dirty-state signal before closing the app.
5. Verified blobs are staged under `%LOCALAPPDATA%\VNOffice\updates\<version>\`, with `.part` resume files, hash checks, a total-size cap, and age-based cleanup. Applying is delegated to a detached Windows PowerShell helper copied into the stage so it does not load replaceable VN Office Python DLLs. It waits for this install's `pythonw.exe` and bundled `soffice.exe`, backs up replaced and removed managed files, atomically moves staged files, writes `VERSION.txt`, and relaunches the same app and arguments. The relaunch writes a one-time health marker after the UI load event. Missing marker or early crash triggers restoration and relaunch of the prior version; the error reporter queues a content-free technical event.
6. Untracked per-user configuration and update state are outside the managed file inventory and are preserved. Removals are limited to the install's managed package roots and installer metadata. No updater request sends document content or contacts an AI/cloud service; HTTPS is only a configurable update transport.

### Files and ownership
- Adapter/release tool: `adapters/updater/**`, `scripts/release/make-update.py`, `.gitignore`, `vnoffice-config.example.json`.
- Desktop bridge: `main.py`.
- Shared UI and in-app instructions: `platform/updater/**`, `platform/shell/app-shell.js`, `platform/help/**`, and `index.html` only if required by the existing module loading pattern.
- Package version/trust checks: `scripts/build-pilot.ps1`.
- Verification: `tests/test_updater.py`, JS unit tests and `tests/run-tests.js` registration.
- Completion record: this handoff.

### Dependencies and risks
- No third-party dependency. RSA signing and verification use only the Python standard library and PKCS#1 v1.5 with SHA-256.
- A signed manifest authenticates content but does not encrypt it; HTTPS remains required for public Internet hosting. A LAN share is the pilot transport.
- Interrupted or low-space staging, malformed paths, hash mismatch, downgrade attempts, helper failure, locked files, and failed startup are handled without blocking document use; update failure leaves the installed version in place or restores its backup.
- PowerShell 5.1 and Windows process-path behavior need tests on Windows. The fake install end-to-end test exercises download/apply/rollback logic without the 1.6 GB production package.

### Test plan
- Python unit tests: valid/tampered/wrong-key/truncated signatures, manifest validation, delta, interrupted resume, downgrade, unreachable source, local and UNC-like paths, helper apply and rollback with a temporary fake install.
- JavaScript unit tests: shared notification actions and Help content/controls for all three apps; keep `tests/unit/help-coverage.test.js` passing.
- Run `node tests/run-tests.js` and `python -m unittest discover -s tests`; if a soffice-dependent test fails in the full run, rerun that exact test alone and report both outcomes without changing timeout or expected output.
- End-to-end fake release: publish 0.9.1 over 0.9.0, report exact downloaded bytes, apply and verify health/relaunch; make 0.9.2 fail health and prove rollback; tamper a manifest and prove refusal.
- Run syntax/compile and `git diff --check`; report build separately from tests and do not claim a production package build unless it ran.

### Rollback
Disable updates by clearing `update.source` in the external `vnoffice-config.json`; this does not affect app use. A failed post-update launch restores the exact backed-up managed files, old version text, and old launch command automatically. If owner disables the feature in a later release, remove the shared updater UI/bridge and updater adapter while preserving the app's normal launch and user data.


# Agent Handoff
TASK: Automatic signed patch updates for VN Office pilot
AGENT/ROLE: Codex / implementation + verification
BRANCH: `feature/auto-update-codex`
WORKTREE: `E:\VNOffice-codex-updater`
OBJECTIVE: Ship an offline-tolerant, signed patch updater that downloads only changed content-addressed files, asks the user to restart, applies after app processes exit, checks launch health, and rolls back on failure. Leave future subscription/perpetual policy behind a pluggable hook; do not implement those tiers now.
FINDINGS: The installed desktop layout is a self-contained Python/LibreOffice tree. Update transport can be static local/UNC or HTTPS; the app must remain usable if the source is offline. Shared Help and NotificationBar components already existed and were reused. Updates are limited to the package's managed file roots; user files/configuration and update cache are outside that inventory. The updater is bootstrapped only by installing a package that contains it, so users on older pilot packages need one installer upgrade before patch-only updates work.
IMPLEMENTATION SUMMARY: Added standard-library RSA-3072 key generation and RSA PKCS#1 v1.5 SHA-256 signing/verification; manifest validation; signed channel and release manifests; local/UNC/HTTPS source access; hash-based delta calculation; bounded resumable blob staging; downgrade refusal; an always-allowed future license hook; and a detached PowerShell 5.1 apply helper with per-file backup, relaunch, health marker, and rollback. Added background startup/periodic checks and Help/manual-check/update status wiring in `main.py`, plus a shared Vietnamese restart/later/release-notes notification that asks the app to save dirty documents before restart. Added Vietnamese Help instructions for Writer, Sheet, and Slides. The release tool writes immutable blobs once, manifests/signatures, and channel pointers. The private signing key was generated at `C:\Users\3T Computer\.vnoffice-release\signing-key.pem`, outside the repository; only the matching public key in `adapters/updater/trust.py` is part of the source tree. No third-party dependency or LibreOffice Core patch was added.

Operator steps (Vietnamese):
1. Tạo khóa ký đúng một lần trên máy phát hành bằng `python scripts/release/make-update.py --keygen`. Lệnh này đã chạy trong worktree hiện tại. Sao lưu an toàn `C:\Users\3T Computer\.vnoffice-release\signing-key.pem`; tuyệt đối không gửi hoặc commit khóa riêng. Chỉ commit module khóa công khai `adapters/updater/trust.py`. Không chạy lại keygen trên key hiện tại trừ khi chủ sở hữu quyết định xoay khóa; gói cài đặt mới phải chứa đúng khóa công khai dùng để ký.
2. Tạo gói phiên bản mới: `powershell -ExecutionPolicy Bypass -File scripts/build-pilot.ps1 -Version 0.9.1 -OutDir E:\VNOffice-dist`. Gói sẽ ở `E:\VNOffice-dist\VNOffice-0.9.1`. Bản cập nhật đầu tiên cần được cài đặt như một gói đầy đủ để đưa updater tới các máy pilot hiện có.
3. Tạo file ghi chú phát hành tiếng Việt UTF-8, ví dụ `E:\VNOffice-dist\notes-0.9.1.txt`, rồi phát hành vào thư mục chia sẻ LAN có quyền ghi cho người phát hành: `python scripts/release/make-update.py --package E:\VNOffice-dist\VNOffice-0.9.1 --source '\\192.168.1.252\company1\VNOffice-updates' --version 0.9.1 --min-version 0.9.0 --channel pilot --notes-file E:\VNOffice-dist\notes-0.9.1.txt`.
4. Công cụ tạo/cập nhật các đường dẫn trên share: `<share>\channels\pilot.json`, `<share>\0.9.1\manifest.json`, `<share>\0.9.1\manifest.sig`, và blob `<share>\files\<sha256>`. Blob đã có được giữ nguyên và không tải/chép lại. Cấp quyền đọc cho máy người dùng và quyền ghi cho máy phát hành. Máy trạm cấu hình `%LOCALAPPDATA%\VNOffice\app-install\app\vnoffice-config.json` với `"update": {"source": "\\\\192.168.1.252\\company1\\VNOffice-updates", "channel": "pilot"}`. Sau đó app tự kiểm tra nền; người dùng chọn khởi động lại để áp dụng.
5. Với máy chủ HTTPS, giữ nguyên cấu trúc thư mục trên và đồng bộ cây phát hành từ share lên web root HTTPS tĩnh; release tool hiện ghi vào local/UNC filesystem, không PUT lên server. Kiểm tra quyền đọc trước khi bật URL cho người dùng.

FILES CHANGED: `.gitignore`; `adapters/updater/**`; `main.py`; `vnoffice-config.example.json`; `scripts/build-pilot.ps1`; `scripts/release/make-update.py`; `platform/updater/**`; `platform/help/help-catalog.js`, `platform/help/help.css`, `platform/help/entries-updater.js`; `platform/ui-kit/notification-bar.js`, `platform/ui-kit/ui-kit.css`; `index.html`; `tests/test_updater.py`; `tests/unit/updater-ui.test.js`, `tests/unit/notification-bar.test.js`; `tests/run-tests.js`; this handoff.
COMMANDS RUN:
- `python scripts/release/make-update.py --keygen` — generated RSA-3072 key outside repository and embedded its public key.
- `node tests/run-tests.js` — final full suite.
- `python -m unittest discover -s tests` — exact required command, final full suite. `python -m unittest discover -s tests -v` was also run as an additional full-suite pass.
- `python -m compileall -q main.py adapters/updater scripts/release/make-update.py tests/test_updater.py` — passed before the final helper process-filter adjustment; the final full unittest run imported and exercised the adjusted updater/helper.
- Focused PowerShell helper test — passed after the final process-filter adjustment.
- `git diff --check` — no whitespace errors; Git emitted only expected LF-to-CRLF working-copy warnings.
- Fake-runtime build smoke using `scripts/build-pilot.ps1` and version `0.9.77` — passed; verified packaged `APP_VERSION` equals `VERSION.txt`. This was not a production runtime build.
- Release-tool smoke against a temporary fake package with the real signing key — signature and publish path passed; 3 files and 1,250 new blob bytes.
BUILD RESULT: NOT RUN — the real bundled Python + LibreOffice production package from `scripts/build-pilot.ps1` (approximately 1.6 GB) was not built. PASS — fake-runtime build smoke for version `0.9.77`, including version consistency.
TEST RESULTS:
- PASS — `node tests/run-tests.js`: `KẾT QUẢ KIỂM THỬ: 2037/2037 PASS | 0 FAIL`; exit code 0. Includes Help coverage and notification/update UI tests.
- PASS — `python -m unittest discover -s tests`: `Ran 430 tests in 283.343s`; `OK`; exit code 0. No full-suite failures, so no isolated rerun was needed for soffice tests. An additional verbose full run also passed: `Ran 430 tests in 287.920s`; `OK`.
- PASS — fake release/update E2E: `0.9.1 apply=OK health_marker=OK relaunch=OK`; `0.9.2 crash=detected rollback=OK relaunch_old=OK`; `tampered_manifest=refused blobs_downloaded=0`.
- PASS — E2E delta measured `downloaded_bytes=48` from `package_bytes=12224` for the 0.9.1 test package.
- PASS — Python signature tests cover valid signature, tampered manifest, wrong key, and truncated signature; updater tests also cover delta, staging/resume, downgrade refusal, unreachable source, UNC-like paths, and apply/rollback using a temporary fake install.
- PASS — fake package build and release-tool smoke as listed above. NOT RUN — live LAN share or HTTPS server integration and full GUI/WebView packaged health verification.
KNOWN FAILURES: None in the final required test runs. An earlier isolated JS test invocation inherited a stub `document` from another test; test isolation was corrected, then the full final Node suite passed.
RISKS: Older installed packages cannot receive a patch until an updater-capable package has first been installed. The release private key is a critical offline secret and must be backed up/access-controlled outside the repository. Production health marking after actual WebView load, LAN permissions, and HTTPS hosting were not exercised against a real pilot deployment. The detached apply helper targets Windows PowerShell 5.1 and the installed directory layout documented above.
DEPENDENCIES/BLOCKERS: No new third-party package. Windows PowerShell 5.1 is required for the detached apply helper. No blocker to source review; deployment needs an updater-capable bootstrap package and a readable update share/configuration.
CORE PATCH ID (if any): None — no LibreOffice Core changes.
NEXT ACTION: Review the implementation and handoff, build and install one updater-capable pilot package to bootstrap existing users, configure the LAN share, then publish later versions with the documented release command. Commits on this branch: `fc6c2e3` (engine/release) and `61dc9f5` (shared Help/UI). Keep the private key outside Git. Do not merge to `main` as part of this task.