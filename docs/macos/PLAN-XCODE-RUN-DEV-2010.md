# Plan gate — Xcode Product Run development layout

## Objective

Make the Xcode `VNOfficeLauncher` Debug Run start from a complete local development
layout: the Python runtime and LibreOffice from an existing offline pilot, the
current checkout as the app payload, and the existing `cryptography` requirement.
Keep the production launcher path under `~/Library/Application Support/VNOffice`
and keep installed apps self-contained and offline. Do not select or install a
different UI engine, change Qt licensing, or add a product dependency.

## Current capability

- The Xcode target has only a Swift compile phase. `AppDelegate` looks for
  `Runtime/bin/python3` beside the app and `Application Support/VNOffice/current/app/main.py`.
- The project has no shared scheme, so the checked-in Product Run configuration
  is not guaranteed to use Debug in another Xcode checkout.
- The existing Xcode development build script creates shell-only app bundles; it
  does not stage runtime or app payload for Product Run.
- The provided x86_64 pilot has Python 3.12, pip, pywebview and PySide6, but lacks
  `cryptography`. Installing the newest allowed wheel (50.0.2) into an overlay
  fails on this runtime with `_BIO_ADDR_free`; `cryptography==44.0.2` passes the
  Agile AES-256 runtime validator. This is a runtime constraint within the
  existing `requirements.txt` range, not a new dependency.
- The Xcode/Debug layout will be development-only and use relative paths derived
  from Xcode build settings. It will link to a pilot found in the repository's
  `ports/macos/build/` folder (or a local Xcode build-setting override); it will
  not write into the pilot. The app payload link points back to the active
  checkout so edits are visible on Run.

## Files and modules

- `ports/macos/VNOfficeLauncher.xcodeproj/project.pbxproj` and
  `xcshareddata/xcschemes/VNOfficeLauncher.xcscheme`: define a shared Debug Run
  scheme and output under repo-relative `ports/macos/build/`; add a Debug-only
  staging build phase.
- `ports/macos/launcher/AppDelegate.swift`: in Debug, resolve the staged
  `Versions/development/app`, runtime overlay and LibreOffice path beside the
  app; preserve Application Support resolution in Release.
- `ports/macos/requirements-xcode-run-constraints.txt`: constrain the existing
  cryptography requirement to the tested version for this bundled runtime.
- `ports/macos/scripts/prepare-xcode-run-payload.sh`: link the selected pilot's
  runtime/LibreOffice and checkout payload into Xcode products, install the
  constrained requirement into a build-only overlay when needed, then validate.
- `ports/macos/scripts/validate-xcode-run-payload.py` and
  `ports/macos/scripts/validate-encryption-runtime.py`: verify product layout
  and encryption using the exact pilot interpreter.
- `tests/macos/test_xcode_run_payload.py`: verify path/layout and dependency
  constraints without requiring Xcode.
- `09-templates/AGENT-HANDOFF.md`: required task handoff.

## Dependencies and boundaries

Reuse the already-selected Python/PySide6/Qt/LibreOffice runtime. The only
Python package staged is `cryptography`, already required by the root manifest;
the Mac runtime constraint is `44.0.2` because 50.0.2 failed the exact pilot
interpreter test. Pip runs only during Debug build preparation. The editor uses
the staged local runtime and source checkout after build and needs no network.
No product code, document format, shared platform, license selection, signing,
notarization, or production install/update behavior changes.

## Risks

- Product Run requires a pilot compatible with the selected Xcode architecture;
  an x86_64 pilot can serve an arm64 Debug launcher only through Rosetta, and
  the staged runtime architecture marker selects the matching Python overlay.
  Absence of either native or Rosetta execution must fail with an actionable message.
- The checkout and pilot links are intentionally development-only and stop
  working if either source directory moves. Release packaging must continue to
  materialize its own offline runtime and version payload.
- First Debug build may need network access to resolve the already-declared
  `cryptography` wheel. App launch itself remains offline; a validated overlay
  is reused on subsequent builds.
- The x86_64 pilot requires Rosetta when Product Run is arm64; validation must
  report architecture rather than silently mixing binaries.

## Test plan

1. Run focused Python tests for the Xcode layout/dependency validator.
2. Build the actual Xcode Debug target with `DEVELOPER_DIR` scoped to the
   installed Xcode and a compatible pilot root supplied as a build-setting
   override; verify the Debug product directory contains the app, runtime,
   development payload, LibreOffice link and crypto overlay.
3. Run the encryption validator using that exact `Runtime/bin/python3` and
   overlay; verify launcher dry-run resolves the same paths.
4. Run `plutil -lint` on project/Info plist inputs and `git diff --check`.
5. Repeat the Debug build with an arm64 launcher and x86_64 pilot, validating
   the Rosetta runtime marker and launcher path. Release configuration remains
   unchanged; compare its Swift selection with existing launcher behavior.
   Full native editor/CDP launch is attempted only if safely isolated from user data.

## Rollback

Revert the dedicated Xcode Run change. Generated output and crypto overlay stay
under ignored build output and can be recreated; no source runtime or
Application Support data is modified.

## Update MAC-12-RUNTIME (2026-10-25): cryptography + pypdf, hash-locked

The section "Dependencies and boundaries" above is superseded for the package
set: the macOS runtime now ships **both** packages declared in the root
`requirements.txt` — `cryptography` (OOXML password encryption) and `pypdf`
(Slides handout printing, `platform/print/print_pipeline.py`).

- Exact set: `ports/macos/requirements-runtime-macos.lock` — `cryptography==44.0.2`,
  `cffi==2.1.1`, `pycparser==3.12`, `pypdf==6.21.2`, each with sha256 hashes for
  CPython 3.12 arm64 + x86_64 wheels (verified against PyPI). The human-readable
  pins in `requirements-xcode-run-constraints.txt` must match it (tested).
- Installer (release Runtime and Debug overlay):
  `ports/macos/scripts/install-runtime-python-deps.sh`. It installs only from a
  local wheelhouse (`--no-index --require-hashes --only-binary=:all:`, default
  `ports/macos/build/wheelhouse`, git-ignored); `--download` fills the wheelhouse
  once on a networked build machine. It then runs the validator in the same
  interpreter. No document content is involved.
- Release runtime, owner step (per architecture):

  ```bash
  ports/macos/scripts/install-runtime-python-deps.sh \
    --runtime <pilot>/Runtime --arch arm64 --download
  # later rebuilds, offline:
  ports/macos/scripts/install-runtime-python-deps.sh --runtime <pilot>/Runtime --arch arm64
  ```

- Debug Product → Run: `prepare-xcode-run-payload.sh` rebuilds the overlay when
  it is missing or its `lock.sha256` stamp differs from the lock (so old
  cryptography-only overlays are refreshed), then validates.
- Validator `validate-encryption-runtime.py` FAILS (exit 1) when either module is
  missing, has a version other than the lock, lacks `dist-info`, or is loaded
  from user site-packages; otherwise it smoke-runs AES-256-GCM, OOXML Agile
  encrypt/decrypt, pypdf write/read and `build_slides_handout_pdf`.
  `validate-xcode-run-payload.py` also requires `pypdf/` in the overlay.
- Run interpreters with `-s` (done by the scripts) so `~/Library/Python` cannot
  mask a missing bundle module.
