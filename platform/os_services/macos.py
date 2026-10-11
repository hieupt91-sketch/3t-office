"""macOS services used while the native shell is implemented incrementally.

The data-directory and LibreOffice discovery behaviour is already portable, so
reuse it here.  macOS additionally selects QtWebEngine: the shared editors were
validated on Chromium and the desktop regression suite requires CDP.
"""

from __future__ import annotations

from .base import OSServices
from .portable import PortableDataDirs, PortableLauncher


def build_services() -> OSServices:
    return OSServices(
        data_dirs=PortableDataDirs(),
        launcher=PortableLauncher(),
        desktop_webview_gui="qt",
    )
