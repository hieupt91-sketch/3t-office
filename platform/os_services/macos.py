"""macOS services used while the native shell is implemented incrementally.

The data-directory and LibreOffice discovery behaviour is already portable, so
reuse it here.  macOS additionally selects QtWebEngine: the shared editors were
validated on Chromium and the desktop regression suite requires CDP.
"""

from __future__ import annotations

from .base import ClipboardPayload, OSServices, ServiceResult
from .portable import PortableDataDirs, PortableLauncher


class MacClipboardExtras:
    """Read and write rich clipboard data through the active Qt application."""

    def __init__(self, clipboard_getter=None):
        # The optional getter keeps unit tests off the user's real system clipboard.
        self._clipboard_getter = clipboard_getter

    def _clipboard(self):
        if self._clipboard_getter is not None:
            return self._clipboard_getter()
        from qtpy.QtWidgets import QApplication

        app = QApplication.instance()
        if app is None:
            raise RuntimeError("Qt clipboard is unavailable before the application starts.")
        return app.clipboard()

    def read(self) -> ServiceResult[ClipboardPayload]:
        try:
            clipboard = self._clipboard()
            mime_data = clipboard.mimeData()
            text = mime_data.text() if mime_data.hasText() else clipboard.text()
            html = mime_data.html() if mime_data.hasHtml() else ""
            return ServiceResult.ok(ClipboardPayload(text=text or "", html=html or ""))
        except Exception:
            return ServiceResult.fail("not_available", "Không đọc được bộ nhớ tạm trên máy Mac.")

    def write(self, payload: ClipboardPayload) -> ServiceResult[None]:
        try:
            from qtpy.QtCore import QMimeData

            mime_data = QMimeData()
            mime_data.setText(str(payload.text or ""))
            if payload.html:
                mime_data.setHtml(str(payload.html))
            self._clipboard().setMimeData(mime_data)
            return ServiceResult.ok()
        except Exception:
            return ServiceResult.fail("not_available", "Không ghi được bộ nhớ tạm trên máy Mac.")


def build_services() -> OSServices:
    return OSServices(
        data_dirs=PortableDataDirs(),
        launcher=PortableLauncher(),
        clipboard_extras=MacClipboardExtras(),
        desktop_webview_gui="qt",
    )
