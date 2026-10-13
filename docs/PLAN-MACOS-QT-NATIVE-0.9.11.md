# Plan — macOS Qt native shell for 0.9.11

## Objective

Restore the previously implemented macOS Qt/QtWebEngine selection on the 0.9.11 branch so Doc, Sheet and Slide use the Chromium-compatible native desktop shell without changing Windows behavior.

## Current capability

- `main.py` starts pywebview without a backend selection, so macOS falls back to its default backend.
- `platform/os_services/macos.py` already owns macOS-specific launcher and updater behavior.
- Commit `ab5e182` on `mac/m1-qt-cdp` already proved the minimal OS-service capability shape.

## Files/modules

- `platform/os_services/base.py`: add the optional desktop webview capability.
- `platform/os_services/macos.py`: select `qt` for macOS.
- `main.py`: pass the capability to `webview.start` without a platform conditional.
- `tests/test_os_services_contract.py`: lock the macOS selection and service contract.
- This plan and the task handoff.

## Dependencies

- Runtime packaging must provide pywebview plus PySide6/QtWebEngine.
- Qt/PySide6 licensing approval remains a release decision; this task only restores the development implementation already present in project history.

## Risks

- A runtime without Qt will fail at native startup instead of silently using WKWebView. This is intentional for parity, but packaging must validate the dependency.
- Adding a service field changes strict service-contract fixtures; focused contract tests cover it.

## Test plan

- Compile the touched Python modules.
- Run `tests/test_os_services_contract.py` and the macOS OS-service tests.
- Do not use `scripts/serve.js` or browser/web testing.

## Rollback

Revert this commit; pywebview will return to platform-default backend selection and the OS-service contract loses the optional field.
