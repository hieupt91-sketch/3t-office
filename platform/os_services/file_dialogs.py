"""Native Open / Save / Save As dialogs: shared rules with per-OS capability flags (MAC-3-2610).

Nothing here talks to an operating system. A backend (macos.py) describes what its native dialogs do with a
``FileDialogPolicy``; main.py asks the policy for the arguments of ``window.create_file_dialog`` and for how to read
the result. A backend that leaves ``OSServices.file_dialogs`` as None keeps main.py's previous code path unchanged.

Filter strings follow pywebview's contract ``Description (*.ext;*.ext)``: the description may contain only letters,
digits and spaces (``[\\w ]+``) and must be NFC so Vietnamese letters count as letters.
"""

from __future__ import annotations

import os
import unicodedata
from dataclasses import dataclass
from pathlib import Path

ALL_FILES_FILTER = "Tất cả tệp (*.*)"
ALL_SUPPORTED_LABEL = "Tất cả tệp được hỗ trợ"
PDF_FILTER = "Tài liệu PDF (*.pdf)"

DEFAULT_SAVE_FORMAT = {"writer": "docx", "sheet": "xlsx", "slides": "pptx"}

# Name of a new, never saved document, as the app shows it ("Tài liệu 1.docx").
NEW_DOCUMENT_PREFIX = {"writer": "Tài liệu", "sheet": "Bảng tính", "slides": "Bản trình bày"}
# Old ASCII fallbacks some callers still send when a document has no name yet.
_PLACEHOLDER_STEMS = {"tailieu", "bangtinh", "bantrinhchieu", "bantrinhbay"}

# Formats each app opens, in the order of the Open dialog's file-type menu.
OPEN_TYPES: dict[str, tuple[tuple[str, tuple[str, ...]], ...]] = {
    "writer": (
        ("Tài liệu Word", ("docx",)),
        ("Tài liệu Word 97 đến 2003", ("doc",)),
        ("Mẫu tài liệu Word", ("dotx",)),
        ("Tài liệu ODF", ("odt",)),
        ("Định dạng Rich Text", ("rtf",)),
        ("Văn bản thuần", ("txt",)),
        ("Trang web", ("htm", "html")),
    ),
    "sheet": (
        ("Bảng tính Excel", ("xlsx",)),
        ("Bảng tính Excel 97 đến 2003", ("xls",)),
        ("Mẫu bảng tính Excel", ("xltx",)),
        ("Mẫu bảng tính Excel 97 đến 2003", ("xlt",)),
        ("Bảng tính ODF", ("ods",)),
        ("Văn bản phân tách", ("csv", "tsv")),
    ),
    "slides": (
        ("Bản trình chiếu PowerPoint", ("pptx",)),
        ("Bản trình chiếu PowerPoint 97 đến 2003", ("ppt",)),
        ("Mẫu bản trình chiếu PowerPoint", ("potx",)),
        ("Bản trình chiếu ODF", ("odp",)),
    ),
}

# Formats each app writes (Save As). "htm" is written as "html".
SAVE_TYPES: dict[str, tuple[tuple[str, tuple[str, ...]], ...]] = {
    "writer": (
        ("Tài liệu Word", ("docx",)),
        ("Tài liệu Word 97 đến 2003", ("doc",)),
        ("Mẫu tài liệu Word", ("dotx",)),
        ("Tài liệu ODF", ("odt",)),
        ("Định dạng Rich Text", ("rtf",)),
        ("Văn bản thuần", ("txt",)),
        ("Trang web", ("htm", "html")),
        ("Tài liệu PDF", ("pdf",)),
    ),
    "sheet": (
        ("Bảng tính Excel", ("xlsx",)),
        ("Bảng tính Excel 97 đến 2003", ("xls",)),
        ("Mẫu bảng tính Excel", ("xltx",)),
        ("Bảng tính ODF", ("ods",)),
        ("Văn bản phân tách dấu phẩy", ("csv",)),
        ("Tài liệu PDF", ("pdf",)),
    ),
    "slides": (
        ("Bản trình chiếu PowerPoint", ("pptx",)),
        ("Bản trình chiếu PowerPoint 97 đến 2003", ("ppt",)),
        ("Mẫu bản trình chiếu PowerPoint", ("potx",)),
        ("Bản trình chiếu ODF", ("odp",)),
        ("Tài liệu PDF", ("pdf",)),
    ),
}


def _filter(label: str, extensions: tuple[str, ...]) -> str:
    return f"{label} ({';'.join('*.' + ext for ext in extensions)})"


def open_file_types(app_kind: str) -> tuple[str, ...]:
    """Open filters: every supported type first (the default selection), each type, then all files."""
    types = OPEN_TYPES.get(app_kind)
    if not types:
        return (ALL_FILES_FILTER,)
    every = tuple(ext for _label, extensions in types for ext in extensions)
    return (_filter(ALL_SUPPORTED_LABEL, every), *(_filter(label, ext) for label, ext in types), ALL_FILES_FILTER)


def open_extensions(app_kind: str) -> frozenset[str]:
    return frozenset(ext for _label, extensions in OPEN_TYPES.get(app_kind, ()) for ext in extensions)


def save_file_types(app_kind: str, current_ext: str | None) -> tuple[str, ...]:
    """Save filters with the document's current format first, as Office selects it."""
    types = SAVE_TYPES.get(app_kind, ())
    target = (current_ext or "").lower()
    first = [item for item in types if target in item[1]]
    rest = [item for item in types if item not in first]
    return (*(_filter(label, ext) for label, ext in first + rest), ALL_FILES_FILTER)


def save_extensions(app_kind: str, target_format: str | None = None) -> frozenset[str]:
    """Extensions a typed file name may keep. An export to PDF accepts only .pdf."""
    if (target_format or "").lower() == "pdf":
        return frozenset({"pdf"})
    return frozenset(ext for _label, extensions in SAVE_TYPES.get(app_kind, ()) for ext in extensions)


def suggested_save_name(app_kind: str, suggested_name: str | None, target_format: str | None) -> tuple[str, str]:
    """(stem, extension) the Save dialog starts with.

    The extension is the format the user is saving to (target_format, else the suggested name's own supported
    extension, else the app default). An unnamed document gets the app's own new-document name ("Tài liệu 1").
    """
    default_ext = DEFAULT_SAVE_FORMAT.get(app_kind, "docx")
    allowed = save_extensions(app_kind, target_format)
    name = unicodedata.normalize("NFC", Path(str(suggested_name or "")).name).strip()
    stem, suffix = os.path.splitext(name)
    suffix = suffix.lower().lstrip(".")
    if suffix and suffix not in allowed and suffix not in open_extensions(app_kind) | {"pdf"}:
        # "Báo cáo v1.2" — the dot is part of the name, not an extension.
        stem, suffix = name, ""
    requested = (target_format or "").lower()
    if requested in allowed:
        extension = requested
    elif suffix in allowed:
        extension = suffix
    else:
        extension = default_ext
    if extension == "htm":
        extension = "html"
    if not stem.strip() or stem.strip().lower().replace(" ", "") in _PLACEHOLDER_STEMS:
        stem = f"{NEW_DOCUMENT_PREFIX.get(app_kind, 'Tài liệu')} 1"
    return stem, extension


def resolve_saved_path(path: str, chosen_ext: str, allowed: frozenset[str]) -> tuple[str, str, bool]:
    """Fix the extension of the name returned by the Save dialog.

    Returns (path, format, corrected). A supported extension the user typed is kept and decides the format (as when
    choosing that format in Office); no extension or a foreign one gets the chosen format's extension appended, so
    "Báo cáo" -> "Báo cáo.docx" and "Báo cáo v1.2" -> "Báo cáo v1.2.docx".
    """
    text = str(path)
    folder, name = os.path.split(text)
    suffix = os.path.splitext(name)[1].lower().lstrip(".")
    if suffix in allowed:
        return text, ("html" if suffix == "htm" else suffix), False
    stem = name.rstrip(". ") or name
    return os.path.join(folder, f"{stem}.{chosen_ext}"), chosen_ext, True


def _same_file(first: str, second: str) -> bool:
    try:
        return os.path.samefile(first, second)
    except (OSError, ValueError):
        return False


def normalize_existing_path(path: str, form: str | None) -> str:
    """Unicode form for a path that exists (Open). Changed only if the new spelling opens the very same file."""
    text = str(path)
    if not form:
        return text
    normalized = unicodedata.normalize(form, text)
    if normalized == text or not _same_file(normalized, text):
        return text
    return normalized


def normalize_new_path(path: str, form: str | None) -> str:
    """Unicode form for a file about to be written: the new name always, the folder only if it is the same folder."""
    text = str(path)
    if not form:
        return text
    folder, name = os.path.split(text)
    name = unicodedata.normalize(form, name)
    normalized_folder = unicodedata.normalize(form, folder)
    if normalized_folder != folder and _same_file(normalized_folder, folder):
        folder = normalized_folder
    return os.path.join(folder, name) if folder else name


@dataclass(frozen=True)
class FileDialogPolicy:
    """What the OS's native dialogs already do, so the app neither repeats nor misses a step."""

    # The Save panel shows a file-type menu and appends the chosen type's extension itself (Windows). When False
    # the default name carries its extension and the app fixes the extension afterwards (macOS NSSavePanel).
    save_dialog_has_type_menu: bool = True
    # The Save panel asks before replacing an existing file (all native panels). The app then asks only when it
    # changed the name after the panel closed.
    save_dialog_confirms_overwrite: bool = True
    open_allows_multiple: bool = False
    # Unicode normalization for paths coming back from the OS (macOS file names are often decomposed, NFD).
    path_unicode_form: str | None = None
    # Folder a Save dialog starts in when the document has no folder yet (macOS: ~/Documents).
    default_directory: Path | None = None

    def open_file_types(self, app_kind: str) -> tuple[str, ...]:
        return open_file_types(app_kind)

    def save_file_types(self, app_kind: str, target_format: str | None) -> tuple[str, ...]:
        if (target_format or "").lower() == "pdf":
            return (PDF_FILTER, ALL_FILES_FILTER)
        return save_file_types(app_kind, target_format)

    def suggested_save_name(self, app_kind: str, suggested_name: str | None,
                            target_format: str | None) -> tuple[str, str]:
        return suggested_save_name(app_kind, suggested_name, target_format)

    def dialog_save_filename(self, stem: str, extension: str) -> str:
        return stem if self.save_dialog_has_type_menu else f"{stem}.{extension}"

    def initial_directory(self, source_path: str | None) -> str | None:
        folder = os.path.dirname(str(source_path)) if source_path else ""
        if folder and os.path.isdir(folder):
            return folder
        if self.default_directory is not None and Path(self.default_directory).is_dir():
            return str(self.default_directory)
        return None

    def save_extensions(self, app_kind: str, target_format: str | None) -> frozenset[str]:
        return save_extensions(app_kind, target_format)

    def resolve_saved_path(self, path: str, chosen_ext: str, allowed: frozenset[str]) -> tuple[str, str, bool]:
        return resolve_saved_path(normalize_new_path(path, self.path_unicode_form), chosen_ext, allowed)

    def needs_overwrite_confirmation(self, path: str, corrected: bool) -> bool:
        if not os.path.exists(path):
            return False
        return corrected or not self.save_dialog_confirms_overwrite

    def normalize_existing_path(self, path: str) -> str:
        return normalize_existing_path(path, self.path_unicode_form)

