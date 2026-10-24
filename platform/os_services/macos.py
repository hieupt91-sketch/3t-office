"""macOS backend (FIX-MAC-1 C-5): native error dialog, reveal in the file manager, open with the default app.

Data directories and the document-engine lookup keep the exact results of the portable backend that macOS used
before (``~/Library/Application Support/VNOffice``, the same folder the Swift launcher in ports/macos uses), so no
user data moves. Everything that talks to macOS goes through the system tools ``open`` and ``osascript`` with
arguments passed as an argv list: never a shell, and user text never becomes part of a script.
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path
from typing import Callable

from .base import DocumentFontSources, FontSubstitution, OSServices, ServiceResult
from .portable import APP_DATA_DIR_NAME, VALID_APP_KINDS, PortableLauncher

# A startup error box must not keep a helper process alive forever if nobody is at the screen.
ERROR_DIALOG_GIVE_UP_SECONDS = 300
OPEN_TIMEOUT_SECONDS = 10

# The script only reads its arguments; title and message arrive through argv, so quotes, backslashes or
# AppleScript keywords in them are plain text.
_ALERT_SCRIPT = (
    "on run argv",
    "display alert (item 1 of argv) message (item 2 of argv) as critical "
    f'buttons {{"Đóng"}} default button 1 giving up after {ERROR_DIALOG_GIVE_UP_SECONDS}',
    "end run",
)


def alert_command(title: str, message: str) -> list[str]:
    command = ["/usr/bin/osascript"]
    for line in _ALERT_SCRIPT:
        command += ["-e", line]
    # "--" ends osascript's own options, so a title starting with "-" is still an argument.
    return command + ["--", str(title or "3T Office"), str(message or "")]


class MacDataDirs:
    def user_data_dir(self) -> Path:
        return Path.home() / "Library" / "Application Support" / APP_DATA_DIR_NAME

    def document_profile_dir(self, app_kind: str) -> Path:
        kind = app_kind if app_kind in VALID_APP_KINDS else "shared"
        return self.user_data_dir() / f"lo-profile-{kind}"


class MacLauncher(PortableLauncher):
    """find_document_engine / native_io_path are inherited unchanged from the portable backend."""

    def __init__(self, run: Callable[..., object] | None = None, popen: Callable[..., object] | None = None):
        self._run = run or subprocess.run
        self._popen = popen or subprocess.Popen

    def _open(self, arguments: list[str], failure: str) -> ServiceResult[None]:
        try:
            completed = self._run(
                ["/usr/bin/open", *arguments], capture_output=True, text=True,
                timeout=OPEN_TIMEOUT_SECONDS, check=False,
            )
        except (OSError, subprocess.SubprocessError):
            return ServiceResult.fail("not_available", failure)
        if getattr(completed, "returncode", 1) != 0:
            return ServiceResult.fail("not_available", failure)
        return ServiceResult.ok()

    def open_path(self, path: Path) -> ServiceResult[None]:
        target = Path(path)
        if not str(path or "").strip() or not target.exists():
            return ServiceResult.fail("invalid_input", "Không tìm thấy tệp hoặc thư mục cần mở.")
        # An absolute path always starts with "/", so it can never be read as an option of `open`.
        return self._open([str(target.resolve())], "Không mở được tệp bằng ứng dụng mặc định.")

    def reveal_path(self, path: Path) -> ServiceResult[None]:
        target = Path(path)
        if not str(path or "").strip() or not target.exists():
            return ServiceResult.fail("invalid_input", "Không tìm thấy tệp để mở thư mục chứa nó.")
        # -R: show the item selected in its folder instead of opening it.
        return self._open(["-R", str(target.resolve())], "Không mở được thư mục chứa tệp.")

    def show_error(self, title: str, message: str) -> ServiceResult[None]:
        # Keep the text in the log too: the dialog can be dismissed or time out.
        print(f"[3T Office] {message}", file=sys.stderr)
        try:
            # Not waited for: the caller (for example a failed start-up) may exit right away, and the dialog,
            # owned by its own process, stays on screen until the user closes it or it gives up.
            self._popen(
                alert_command(title, message),
                stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                close_fds=True,
            )
        except (OSError, subprocess.SubprocessError, ValueError):
            return ServiceResult.fail("not_available", "Không hiện được hộp thông báo lỗi.")
        return ServiceResult.ok()


# MAC-9 — fonts for layout in the document engine.
# The engine runs headless on macOS and, unless told otherwise, sees only the fonts bundled with it: no Arial,
# Lucida Grande or any font the user installed with Font Book, and a missing font fell back to a serif face.
# These are the macOS folders it may read at runtime (in place, never copied or bundled). Fonts inside other
# applications' bundles are never listed: their licence covers only those applications.
SYSTEM_FONT_DIR = Path("/System/Library/Fonts")
# Top-level system fonts worth reading. The rest of that folder (emoji, Asian UI faces, braille, the system
# Symbol font that would replace the engine's bullet-symbol mapping) doubles the engine start time (~0.7 s per
# conversion, measured) and is not used by office documents. Supplemental holds Arial, Times New Roman,
# Courier New, Georgia, Tahoma, Verdana, Trebuchet MS, Songti...
_SYSTEM_FONT_FILES = (
    "LucidaGrande.ttc", "HelveticaNeue.ttc", "Helvetica.ttc", "Times.ttc", "Courier.ttc", "Menlo.ttc",
    "Geneva.ttf", "Monaco.ttf", "Avenir.ttc", "Avenir Next.ttc", "Optima.ttc", "Palatino.ttc",
    "STHeiti Light.ttc", "STHeiti Medium.ttc",
)

_SANS_LOOKALIKE = ("Helvetica Neue", "Arial", "Liberation Sans")  # Vietnamese complete in all three
# Heiti SC first: complete Vietnamese and closer line height than Songti SC (a SimSun-bodied test page ran
# 4 pages with Heiti SC, 5 with Songti SC); Songti SC stays as the Song-style fallback.
_SONG_CJK = ("Heiti SC", "Songti SC", "STSong")

# Font a document asks for -> substitutes tried in order when it is not installed. Carlito, Caladea and
# Liberation ship with the document engine (metric-compatible, open licences); the others are macOS fonts.
MAC_FONT_SUBSTITUTIONS = (
    FontSubstitution("Calibri", ("Carlito",), metric_compatible=True),
    FontSubstitution("Cambria", ("Caladea",), metric_compatible=True),
    FontSubstitution("Arial", ("Liberation Sans",), metric_compatible=True),
    FontSubstitution("Times New Roman", ("Liberation Serif",), metric_compatible=True),
    FontSubstitution("Courier New", ("Liberation Mono",), metric_compatible=True),
    FontSubstitution("Calibri Light", ("Carlito",)),
    FontSubstitution("Segoe UI", _SANS_LOOKALIKE),
    FontSubstitution("Aptos", _SANS_LOOKALIKE),
    FontSubstitution("Aptos Display", _SANS_LOOKALIKE),
    FontSubstitution("Lucida Sans", ("Lucida Grande",)),
    FontSubstitution("Lucida Sans Unicode", ("Lucida Grande",)),
    FontSubstitution("Consolas", ("Liberation Mono", "Menlo")),
    FontSubstitution("NSimSun", _SONG_CJK),
    FontSubstitution("SimSun", _SONG_CJK),
    FontSubstitution("SimHei", ("Heiti SC",)),
    FontSubstitution("Microsoft YaHei", ("Heiti SC",)),
)


class MacDocumentFonts:
    def __init__(self, home: Path | None = None):
        self._home = Path(home) if home is not None else Path.home()

    def substitutions(self) -> tuple[FontSubstitution, ...]:
        return MAC_FONT_SUBSTITUTIONS

    def sources(self) -> DocumentFontSources:
        system = str(SYSTEM_FONT_DIR)
        accept = (f"{system}/Supplemental", f"{system}/Supplemental/*",
                  *(f"{system}/{name}" for name in _SYSTEM_FONT_FILES))
        return DocumentFontSources(
            # Font Book installs for one user into ~/Library/Fonts and for all users into /Library/Fonts.
            directories=(SYSTEM_FONT_DIR, Path("/Library/Fonts"), self._home / "Library" / "Fonts"),
            accept_globs=accept,
            # The glob also matches sub-folders, which is why Supplemental itself is accepted above.
            reject_globs=(f"{system}/*",),
        )


def build_services() -> OSServices:
    return OSServices(data_dirs=MacDataDirs(), launcher=MacLauncher(), document_fonts=MacDocumentFonts())
