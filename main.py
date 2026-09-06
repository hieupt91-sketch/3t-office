"""
VN Office — Python Desktop Application Entrypoint
Khởi chạy VN Office dưới dạng cửa sổ Native Desktop App độc lập,
và làm cầu nối thật (không mock) tới LibreOffice headless engine
cho các thao tác Mở/Lưu/Xuất PDF — cross-platform: Windows, Linux, macOS.
"""

import os
import sys
import base64
import csv
import html
import importlib.util
import re
import shutil
import subprocess
import tempfile
import threading
import platform
import zipfile
from pathlib import Path
from urllib.parse import urlencode

import webview

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
INDEX_HTML = os.path.join(ROOT_DIR, "index.html")

APP_DATA_DIR_NAME = "VNOffice"
VALID_APP_KINDS = ("writer", "sheet", "slides")
APP_TITLES = {
    "writer": "VN Writer — Soạn thảo văn bản",
    "sheet": "VN Sheet — Bảng tính",
    "slides": "VN Slides — Trình chiếu",
}
SUITE_TITLE = "VN Office — Bộ Ứng Dụng Văn Phòng Việt"
FILE_APP_KINDS = {
    ".docx": "writer", ".doc": "writer", ".odt": "writer", ".rtf": "writer",
    ".xlsx": "sheet", ".xls": "sheet", ".ods": "sheet", ".csv": "sheet",
    ".pptx": "slides", ".ppt": "slides", ".odp": "slides",
}


def _user_data_dir() -> Path:
    """Thư mục dữ liệu người dùng theo từng hệ điều hành (Windows/Linux/macOS)."""
    system = platform.system()
    if system == "Windows":
        base = os.environ.get("LOCALAPPDATA") or str(Path.home() / "AppData" / "Local")
        return Path(base) / APP_DATA_DIR_NAME
    if system == "Darwin":
        return Path.home() / "Library" / "Application Support" / APP_DATA_DIR_NAME
    # Linux và các hệ Unix khác
    base = os.environ.get("XDG_DATA_HOME") or str(Path.home() / ".local" / "share")
    return Path(base) / APP_DATA_DIR_NAME


def find_soffice() -> str | None:
    """Tìm đường dẫn thực thi LibreOffice headless engine trên Windows/Linux/macOS."""
    env_override = os.environ.get("VNOFFICE_SOFFICE_PATH")
    system = platform.system()

    candidates = []
    if env_override:
        candidates.append(env_override)

    if system == "Windows":
        candidates += [
            str(Path.home() / "tools" / "libreoffice" / "program" / "soffice.exe"),
            r"C:\Program Files\LibreOffice\program\soffice.exe",
            r"C:\Program Files (x86)\LibreOffice\program\soffice.exe",
        ]
    elif system == "Darwin":
        candidates += [
            "/Applications/LibreOffice.app/Contents/MacOS/soffice",
        ]
    else:  # Linux
        candidates += [
            "/usr/bin/soffice",
            "/usr/lib/libreoffice/program/soffice",
            "/opt/libreoffice/program/soffice",
            "/snap/bin/libreoffice.soffice",
        ]

    for c in candidates:
        if c and os.path.isfile(c):
            return c

    # tools/libreoffice cạnh main.py (bundling cục bộ theo dự án, mọi hệ điều hành)
    local_names = ["soffice.exe", "soffice"]
    for name in local_names:
        local_path = Path(ROOT_DIR) / "tools" / "libreoffice" / "program" / name
        if local_path.is_file():
            return str(local_path)

    return shutil.which("soffice") or shutil.which("soffice.exe")


SOFFICE_PATH = find_soffice()

# Filter LibreOffice chính thức tương ứng định dạng Microsoft Office / ODF
FORMAT_FILTERS = {
    "docx": "MS Word 2007 XML",
    "odt": "writer8",
    "html": "HTML (StarWriter)",
    "pdf": "writer_pdf_Export",
    "xlsx": "Calc MS Excel 2007 XML",
    "ods": "calc8",
    "csv": "Text - txt - csv (StarCalc)",
    "fods": "OpenDocument Spreadsheet Flat XML",
    "pptx": "Impress MS PowerPoint 2007 XML",
    "odp": "impress8",
    # "fodp" cố ý KHÔNG có filter tường minh — đã thử nghiệm thật, mọi filter name
    # tường minh (kể cả "OpenDocument Presentation Flat XML" mà tài liệu LibreOffice
    # gợi ý) đều làm lệnh convert thất bại; để trống cho LibreOffice tự nhận diện
    # theo phần mở rộng lại hoạt động đúng 100%. Đừng "sửa" dòng này mà không tự
    # test bằng lệnh soffice --convert-to thật trước.
}

_convert_lock = threading.Lock()


class DocumentEngineError(Exception):
    pass


_CSV_DELIMITER_CODES = {",": 44, ";": 59, "\t": 9}
_CSV_UTF8_CODE = 76
_CSV_CP1258_CODE = 40
_CSV_SAMPLE_BYTES = 64 * 1024


def _detect_csv_import_options(src_path: str) -> tuple[str, str]:
    """Detect delimiter/encoding and return (encoding name, LO FilterOptions).

    UTF-8 is validated strictly (with or without BOM). Files that are not valid
    UTF-8 use Windows-1258, the ANSI code page used by Vietnamese Windows/Excel.
    """
    try:
        with open(src_path, "rb") as csv_file:
            sample_bytes = csv_file.read(_CSV_SAMPLE_BYTES)
    except OSError as exc:
        raise DocumentEngineError(f"Không đọc được tệp CSV: {exc}") from exc

    if sample_bytes.startswith(b"\xef\xbb\xbf"):
        encoding = "utf-8-sig"
        charset_code = _CSV_UTF8_CODE
    else:
        try:
            sample_bytes.decode("utf-8", errors="strict")
            encoding = "utf-8"
            charset_code = _CSV_UTF8_CODE
        except UnicodeDecodeError:
            encoding = "cp1258"
            charset_code = _CSV_CP1258_CODE

    try:
        sample_text = sample_bytes.decode(encoding, errors="strict")
    except UnicodeDecodeError as exc:
        raise DocumentEngineError(
            "Tệp CSV không phải UTF-8 hợp lệ và cũng không giải mã được bằng Windows-1258."
        ) from exc

    delimiter = ","
    nonempty_lines = [line for line in sample_text.splitlines() if line.strip()][:20]
    if nonempty_lines:
        try:
            delimiter = csv.Sniffer().sniff("\n".join(nonempty_lines), delimiters=",;\t").delimiter
        except csv.Error:
            # A one-column or malformed sample has no reliable separator signal.
            delimiter = ","

    # LibreOffice CSV import tokens: field separator, text delimiter, charset,
    # first row, column formats, language (vi-VN), quoted-as-text, detect numbers.
    filter_options = (
        f"{_CSV_DELIMITER_CODES[delimiter]},34,{charset_code},1,,1066,false,true"
    )
    return encoding, filter_options


def _profile_uri(app_kind: str | None = None) -> str:
    """Return the LibreOffice profile dedicated to this desktop app kind."""
    profile_kind = app_kind if app_kind in VALID_APP_KINDS else "shared"
    profile_dir = _user_data_dir() / f"lo-profile-{profile_kind}"
    profile_dir.mkdir(parents=True, exist_ok=True)
    return profile_dir.as_uri()


def _run_soffice_convert(src_path: str, target_ext: str, out_dir: str, app_kind: str | None = None) -> str:
    """Chạy LibreOffice headless để chuyển đổi thật một tệp. Trả về đường dẫn tệp kết quả."""
    if not SOFFICE_PATH:
        raise DocumentEngineError(
            "Không tìm thấy LibreOffice engine (soffice). Vui lòng cài đặt LibreOffice "
            "hoặc đặt biến môi trường VNOFFICE_SOFFICE_PATH trỏ tới soffice."
        )

    if target_ext == "pdf" and app_kind:
        if app_kind == "sheet":
            filter_name = "calc_pdf_Export"
        elif app_kind == "slides":
            filter_name = "impress_pdf_Export"
        else:
            filter_name = "writer_pdf_Export"
    else:
        filter_name = FORMAT_FILTERS.get(target_ext)

    convert_to = f"{target_ext}:{filter_name}" if filter_name else target_ext

    cmd = [
        SOFFICE_PATH,
        "--headless",
        "--invisible",
        "--nocrashreport",
        "--nodefault",
        "--nolockcheck",
        "--nologo",
        "--norestore",
        f"-env:UserInstallation={_profile_uri(app_kind)}",
    ]

    if Path(src_path).suffix.lower() == ".csv":
        _, csv_filter_options = _detect_csv_import_options(src_path)
        cmd.extend([
            f"--infilter=Text - txt - csv (StarCalc):{csv_filter_options}",
        ])

    cmd.extend([
        "--convert-to",
        convert_to,
        "--outdir",
        out_dir,
        src_path,
    ])

    # LibreOffice chỉ cho phép một tiến trình dùng chung một profile tại một thời điểm.
    with _convert_lock:
        try:
            result = subprocess.run(
                cmd, capture_output=True, text=True, timeout=120, check=False
            )
        except subprocess.TimeoutExpired as exc:
            raise DocumentEngineError("Hết thời gian chờ khi chuyển đổi tài liệu.") from exc

    if result.returncode != 0:
        detail = (result.stderr or result.stdout or "").strip()[:500]
        raise DocumentEngineError(f"LibreOffice báo lỗi khi chuyển đổi: {detail or 'không rõ nguyên nhân'}")

    base = Path(src_path).stem
    out_path = Path(out_dir) / f"{base}.{target_ext}"
    if not out_path.is_file():
        detail = (result.stdout or "").strip()[:500]
        raise DocumentEngineError(f"Không tạo được tệp đầu ra. Chi tiết: {detail or 'không rõ'}")

    return str(out_path)


_OOXML_ZIP_PATCH = None


def _ooxml_zip_patch():
    """Load adapters/libreoffice/common/ooxml_zip_patch.py without making adapters a package."""
    global _OOXML_ZIP_PATCH
    if _OOXML_ZIP_PATCH is None:
        module_path = os.path.join(ROOT_DIR, "adapters", "libreoffice", "common", "ooxml_zip_patch.py")
        spec = importlib.util.spec_from_file_location("vno_ooxml_zip_patch", module_path)
        if spec is None or spec.loader is None:
            raise DocumentEngineError("Không tải được module hậu-kỳ OOXML.")
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        _OOXML_ZIP_PATCH = module
    return _OOXML_ZIP_PATCH


def _apply_native_export_postprocess(src_path: str, out_path: str, app_kind: str | None, target_format: str) -> None:
    """Patch native OOXML that LibreOffice omitted, after soffice convert.

    Why here (main.py), not the JS adapters: File → Lưu serializes FODS/FODP in
    JS, then this process converts and writes the dest path. The JS adapter
    never receives XLSX/PPTX bytes. The post-process must run on the converted
    ZIP before shutil.copyfile.

    Sheet XLSX: FODS already has table:structure-protected. LibreOffice writes
    <workbookProtection lockWindows="false"/> but not lockStructure="1".
    Excel's Protect Workbook structure lock IS that standard attribute — not a
    custom namespace. We add it in-place on the existing element.

    Slides PPTX: FODP already has the master-page logo (vno:master-theme +
    draw:frame), named sections (vno:section-* on draw:page), and Set Up
    Show flags (presentation:endless + vno:without-narration /
    vno:pointer-color). LibreOffice drops the logo, does not emit
    p14:sectionLst, and writes p:showPr in ppt/presProps.xml with
    showNarration="1" and no p:penClr. PowerPoint's slots are a p:sp
    without p:ph on slideMaster1.xml, p:extLst/p14:sectionLst in
    ppt/presentation.xml, and CT_ShowProperties on presentationPr.
    """
    fmt = str(target_format).lower()
    if app_kind == "sheet" and fmt == "xlsx":
        if not src_path or not str(src_path).lower().endswith(".fods"):
            return
        try:
            with open(src_path, "r", encoding="utf-8", errors="replace") as handle:
                fods = handle.read()
            patcher = _ooxml_zip_patch()
            if not patcher.fods_has_structure_protection(fods):
                return
            with open(out_path, "rb") as handle:
                original = handle.read()
            patched = patcher.postprocess_sheet_xlsx(original, source_fods=fods, enabled=True)
            if patched != original:
                with open(out_path, "wb") as handle:
                    handle.write(patched)
        except DocumentEngineError:
            raise
        except Exception as exc:
            raise DocumentEngineError(
                f"Không bổ sung được khóa cấu trúc workbook vào XLSX: {exc}"
            ) from exc
        return
    if app_kind == "slides" and fmt == "pptx":
        if not src_path or not str(src_path).lower().endswith(".fodp"):
            return
        try:
            with open(src_path, "r", encoding="utf-8", errors="replace") as handle:
                fodp = handle.read()
            patcher = _ooxml_zip_patch()
            if (
                not patcher.fodp_has_master_logo(fodp)
                and not patcher.fodp_has_sections(fodp)
                and not patcher.fodp_has_show_setup_patch(fodp)
            ):
                return
            with open(out_path, "rb") as handle:
                original = handle.read()
            patched = patcher.postprocess_slides_pptx(original, source_fodp=fodp)
            if patched != original:
                with open(out_path, "wb") as handle:
                    handle.write(patched)
        except DocumentEngineError:
            raise
        except Exception as exc:
            raise DocumentEngineError(
                f"Không bổ sung được thuộc tính native PPTX (logo / Sections / Set Up Show): {exc}"
            ) from exc


def _read_xlsx_workbook_xml(src_path: str) -> str | None:
    """Read xl/workbook.xml from the original .xlsx via the shared ZIP helper.

    Writer's File → Mở forwards word/document.xml as ooxmlDocumentXml. Sheet
    does the same for workbook.xml so the adapter can overlay lockStructure
    if the FODS path missed it. Missing/corrupt packages return None so
    File → Mở still loads the soffice FODS body.
    """
    if not src_path or not str(src_path).lower().endswith(".xlsx"):
        return None
    try:
        with open(src_path, "rb") as handle:
            package = handle.read()
        entry = _ooxml_zip_patch().read_zip_entry(package, "xl/workbook.xml")
        if not entry:
            return None
        return entry.decode("utf-8", errors="replace")
    except (OSError, UnicodeError, DocumentEngineError):
        return None
    except Exception:
        return None


def _read_pptx_presentation_xml(src_path: str) -> str | None:
    """Read ppt/presentation.xml from the original .pptx via the shared ZIP helper.

    Sheet forwards xl/workbook.xml as ooxmlWorkbookXml. Slides does the same
    for presentation.xml so the adapter can overlay p14:sectionLst if the
    FODP path missed it. Missing/corrupt packages return None so File → Mở
    still loads the soffice FODP body when overlay already ran in Python.
    """
    if not src_path or not str(src_path).lower().endswith(".pptx"):
        return None
    try:
        with open(src_path, "rb") as handle:
            package = handle.read()
        entry = _ooxml_zip_patch().read_zip_entry(package, "ppt/presentation.xml")
        if not entry:
            return None
        return entry.decode("utf-8", errors="replace")
    except (OSError, UnicodeError, DocumentEngineError):
        return None
    except Exception:
        return None


def _read_pptx_slide_master_xml(src_path: str) -> str | None:
    """Read ppt/slideMasters/slideMaster1.xml from the original .pptx.

    File → Mở already overlays vno:master-theme in Python. The adapter still
    receives the original master XML so loadFromFodp can overlay again
    (belt-and-suspenders, same pattern as ooxmlPresentationXml).
    """
    if not src_path or not str(src_path).lower().endswith(".pptx"):
        return None
    try:
        with open(src_path, "rb") as handle:
            package = handle.read()
        entry = _ooxml_zip_patch().read_zip_entry(package, "ppt/slideMasters/slideMaster1.xml")
        if not entry:
            return None
        return entry.decode("utf-8", errors="replace")
    except (OSError, UnicodeError, DocumentEngineError):
        return None
    except Exception:
        return None


def _read_pptx_pres_props_xml(src_path: str) -> str | None:
    """Read ppt/presProps.xml from the original .pptx.

    File → Mở already overlays vno:without-narration / vno:pointer-color in
    Python. The adapter still receives the original presProps so loadFromFodp
    can overlay again (belt-and-suspenders).
    """
    if not src_path or not str(src_path).lower().endswith(".pptx"):
        return None
    try:
        with open(src_path, "rb") as handle:
            package = handle.read()
        entry = _ooxml_zip_patch().read_zip_entry(package, "ppt/presProps.xml")
        if not entry:
            return None
        return entry.decode("utf-8", errors="replace")
    except (OSError, UnicodeError, DocumentEngineError):
        return None
    except Exception:
        return None


def _apply_native_import_overlay(src_path: str, fods: str, app_kind: str | None) -> str:
    """After soffice convert, restore native flags LibreOffice dropped.

    Sheet XLSX: lockStructure → table:structure-protected. Failures return
    the original FODS so open still succeeds (optional UI lock).

    Slides PPTX: p14:sectionLst → vno:section-* on draw:page,
    VNOfficeMasterLogo → vno:master-theme on style:master-page, and
    p:showPr showNarration=0 / p:penClr → vno:without-narration /
    vno:pointer-color on presentation:settings (not @loop). Count
    mismatch / ambiguous logo shapes raise DocumentEngineError — never guess.
    """
    if app_kind == "sheet":
        if not src_path or not str(src_path).lower().endswith(".xlsx"):
            return fods
        try:
            with open(src_path, "rb") as handle:
                original = handle.read()
            return _ooxml_zip_patch().overlay_sheet_xlsx_fods(original, fods)
        except Exception:
            return fods
    if app_kind == "slides":
        if not src_path or not str(src_path).lower().endswith(".pptx"):
            return fods
        try:
            with open(src_path, "rb") as handle:
                original = handle.read()
            return _ooxml_zip_patch().overlay_slides_pptx_fodp(original, fods)
        except DocumentEngineError:
            raise
        except ValueError as exc:
            raise DocumentEngineError(str(exc)) from exc
        except Exception as exc:
            raise DocumentEngineError(
                f"Không khôi phục được thuộc tính native PPTX (logo / Sections / Set Up Show) từ PPTX gốc: {exc}"
            ) from exc
    return fods


_IMG_TAG_RE = re.compile(r"<img\b([^>]*?)(\s*/?)>", re.IGNORECASE)
_SRC_ATTR_RE = re.compile(r"""\bsrc=["']([^"']+)["']""", re.IGNORECASE)
_SRC_ATTR_REPLACE_RE = re.compile(r"""\bsrc=["'][^"']*["']""", re.IGNORECASE)


def _inline_html_images(html_text: str, html_path: str) -> str:
    """Replace <img src> sidecar files with data URIs while the convert temp dir still exists.

    LibreOffice HTML (StarWriter) writes images as files next to the .html (not data URIs).
    open_document_dialog() must inline those bytes before TemporaryDirectory deletes them.
    Missing files (http/https, already-gone sidecars) leave the original tag unchanged.
    """
    if not html_text:
        return html_text or ""
    html_dir = os.path.dirname(html_path or "")

    def replace_tag(match: re.Match) -> str:
        original = match.group(0)
        attrs = match.group(1)
        src_match = _SRC_ATTR_RE.search(attrs)
        if not src_match:
            return original
        src = src_match.group(1)
        if re.match(r"^data:", src, re.IGNORECASE):
            return f"<img{attrs}>"
        decoded = html.unescape(src)
        candidates = [
            os.path.join(html_dir, decoded),
            re.sub(r"^/([A-Za-z]:)", r"\1", decoded),
            re.sub(r"^file:///", "", decoded, flags=re.IGNORECASE),
        ]
        file_path = next(
            (candidate for candidate in candidates if candidate and os.path.isfile(candidate)),
            None,
        )
        if not file_path:
            return f"<img{attrs}>"
        try:
            with open(file_path, "rb") as image_file:
                raw = image_file.read()
            encoded = base64.b64encode(raw).decode("ascii")
        except OSError:
            return original
        ext = os.path.splitext(file_path)[1].lower()
        if ext in (".jpg", ".jpeg"):
            mime = "image/jpeg"
        elif ext == ".gif":
            mime = "image/gif"
        else:
            mime = "image/png"
        data_uri = f"data:{mime};base64,{encoded}"
        next_attrs = _SRC_ATTR_REPLACE_RE.sub(f'src="{data_uri}"', attrs, count=1)
        return f"<img{next_attrs}>"

    return _IMG_TAG_RE.sub(replace_tag, html_text)


OPEN_FILE_TYPES = {
    "writer": ("Tài liệu Word (*.docx;*.odt;*.doc;*.rtf)", "Tất cả tệp (*.*)"),
    "sheet": ("Bảng tính Excel (*.xlsx;*.ods;*.csv)", "Tất cả tệp (*.*)"),
    "slides": ("Bản trình chiếu PowerPoint (*.pptx;*.odp)", "Tất cả tệp (*.*)"),
}

DEFAULT_SAVE_FORMAT = {
    "writer": "docx",
    "sheet": "xlsx",
    "slides": "pptx",
}


def _read_docx_zip_entry(src_path: str, entry_name: str) -> str | None:
    """Read one XML member from a real .docx (OOXML zip).

    StarWriter HTML drops w:ins/w:del, comment ranges, and comment authors;
    the Writer adapter overlays those from word/document.xml + word/comments.xml.
    Missing/corrupt packages return None so File → Mở still loads the HTML body.
    """
    if not src_path or not str(src_path).lower().endswith(".docx"):
        return None
    if not entry_name or ".." in entry_name or entry_name.startswith(("/", "\\")):
        return None
    try:
        with zipfile.ZipFile(src_path) as package:
            return package.read(entry_name).decode("utf-8", errors="replace")
    except (OSError, zipfile.BadZipFile, KeyError, UnicodeError):
        return None


def _read_docx_document_xml(src_path: str) -> str | None:
    """Read word/document.xml (revision marks + commentRange/commentReference)."""
    return _read_docx_zip_entry(src_path, "word/document.xml")


def _read_docx_comments_xml(src_path: str) -> str | None:
    """Read word/comments.xml (comment author, date, and body)."""
    return _read_docx_zip_entry(src_path, "word/comments.xml")


def _active_window():
    """Lấy cửa sổ pywebview hiện tại qua danh sách module-level `webview.windows`.

    KHÔNG được lưu Window làm attribute trên VnOfficeApi: pywebview tự động quét đệ quy
    mọi thuộc tính non-callable của js_api để build `window.pywebview.api`, và việc này
    lần vào tận `Window` -> WinForms `AccessibilityObject.Bounds` -> `Rectangle.Empty.Empty...`
    gây đệ quy vô hạn (RecursionError) khiến cửa sổ không bao giờ hiển thị được.
    """
    return webview.windows[0] if webview.windows else None


class VnOfficeApi:
    """Python API phơi ra cho JavaScript giao tiếp (Bridge) — cầu nối thật tới LibreOffice."""

    def __init__(self, app_kind: str | None = None, initial_file: str | None = None):
        self._app_kind = app_kind
        self._initial_file = initial_file

    def engine_status(self):
        """Cho UI biết document engine thật có sẵn sàng hay không (không giả vờ)."""
        return {"available": SOFFICE_PATH is not None, "path": SOFFICE_PATH or ""}

    def open_document_dialog(self, app_kind="writer"):
        """Mở hộp thoại chọn tệp NATIVE thật của hệ điều hành, chuyển đổi tệp thật sang
        định dạng trung gian mà UI có thể hiển thị."""
        if self._initial_file:
            if self._app_kind and app_kind != self._app_kind:
                return {"status": "error", "message": "Tệp khởi động không thuộc ứng dụng hiện tại."}
            src_path = self._initial_file
            self._initial_file = None
        else:
            window = _active_window()
            if not window:
                return {"status": "error", "message": "Cửa sổ ứng dụng chưa sẵn sàng."}

            file_types = OPEN_FILE_TYPES.get(app_kind, ("Tất cả tệp (*.*)",))
            try:
                result = window.create_file_dialog(webview.OPEN_DIALOG, file_types=file_types)
            except Exception as exc:  # lỗi hệ thống khi mở hộp thoại
                return {"status": "error", "message": f"Không mở được hộp thoại: {exc}"}

            if not result:
                return {"status": "cancelled"}
            src_path = result[0]

        if app_kind == "writer":
            target_ext = "html"
        elif app_kind == "sheet":
            target_ext = "fods"
        elif app_kind == "slides":
            target_ext = "fodp"
        else:
            return {"status": "error", "message": f"Loại ứng dụng không hợp lệ: {app_kind}"}

        try:
            with tempfile.TemporaryDirectory(prefix="vnoffice_open_") as tmp:
                out_path = _run_soffice_convert(src_path, target_ext, tmp, app_kind=app_kind)
                with open(out_path, "r", encoding="utf-8", errors="replace") as f:
                    content = f.read()
                if app_kind == "writer":
                    content = _inline_html_images(content, out_path)
                elif app_kind == "sheet":
                    # Overlay BEFORE the FODS leaves this process — SheetAdapter.parseFods
                    # must see table:structure-protected when the original XLSX is locked.
                    content = _apply_native_import_overlay(src_path, content, app_kind)
                elif app_kind == "slides":
                    # Overlay BEFORE the FODP leaves this process — SlidesAdapter.parseFodp
                    # must see vno:section-*, vno:master-theme, and Set Up Show vno:*
                    # when the original PPTX has p14:sectionLst / VNOfficeMasterLogo /
                    # p:showPr showNarration=0 or p:penClr.
                    content = _apply_native_import_overlay(src_path, content, app_kind)
        except DocumentEngineError as exc:
            return {"status": "error", "message": str(exc)}

        payload = {
            "status": "ok",
            "sourcePath": src_path,
            "fileName": Path(src_path).name,
            "format": target_ext,
            "content": content,
        }
        if app_kind == "writer":
            ooxml = _read_docx_document_xml(src_path)
            if ooxml:
                payload["ooxmlDocumentXml"] = ooxml
            comments_xml = _read_docx_comments_xml(src_path)
            if comments_xml:
                payload["ooxmlCommentsXml"] = comments_xml
        elif app_kind == "sheet":
            workbook_xml = _read_xlsx_workbook_xml(src_path)
            if workbook_xml:
                payload["ooxmlWorkbookXml"] = workbook_xml
        elif app_kind == "slides":
            presentation_xml = _read_pptx_presentation_xml(src_path)
            if presentation_xml:
                payload["ooxmlPresentationXml"] = presentation_xml
            slide_master_xml = _read_pptx_slide_master_xml(src_path)
            if slide_master_xml:
                payload["ooxmlSlideMasterXml"] = slide_master_xml
            pres_props_xml = _read_pptx_pres_props_xml(src_path)
            if pres_props_xml:
                payload["ooxmlPresPropsXml"] = pres_props_xml
        return payload

    def save_document_dialog(self, content, app_kind="writer", target_format=None, suggested_name="TaiLieu"):
        """Mở hộp thoại lưu tệp NATIVE thật, chuyển đổi nội dung soạn thảo hiện tại
        sang định dạng Office/ODF thật và ghi ra đĩa thật."""
        window = _active_window()
        if not window:
            return {"status": "error", "message": "Cửa sổ ứng dụng chưa sẵn sàng."}

        target_format = target_format or DEFAULT_SAVE_FORMAT.get(app_kind, "pdf")

        try:
            save_result = window.create_file_dialog(
                webview.SAVE_DIALOG, save_filename=f"{suggested_name}.{target_format}"
            )
        except Exception as exc:
            return {"status": "error", "message": f"Không mở được hộp thoại lưu: {exc}"}

        if not save_result:
            return {"status": "cancelled"}
        dest_path = save_result if isinstance(save_result, str) else save_result[0]

        try:
            with tempfile.TemporaryDirectory(prefix="vnoffice_save_") as tmp:
                if app_kind == "writer":
                    src_path = os.path.join(tmp, "draft.html")
                    with open(src_path, "w", encoding="utf-8") as f:
                        f.write(f"<html><head><meta charset='utf-8'></head><body>{content}</body></html>")
                elif app_kind == "sheet":
                    src_path = os.path.join(tmp, "draft.fods")
                    with open(src_path, "w", encoding="utf-8") as f:
                        f.write(content)
                elif app_kind == "slides":
                    src_path = os.path.join(tmp, "draft.fodp")
                    with open(src_path, "w", encoding="utf-8") as f:
                        f.write(content)
                else:
                    return {"status": "error", "message": f"Loại ứng dụng không hợp lệ: {app_kind}"}

                out_path = _run_soffice_convert(src_path, target_format, tmp, app_kind=app_kind)
                _apply_native_export_postprocess(src_path, out_path, app_kind, target_format)
                shutil.copyfile(out_path, dest_path)
        except DocumentEngineError as exc:
            return {"status": "error", "message": str(exc)}

        return {"status": "ok", "message": f"Đã lưu tại {dest_path}", "path": dest_path}

    def export_pdf_dialog(self, content, app_kind="writer", suggested_name="TaiLieu"):
        return self.save_document_dialog(
            content, app_kind=app_kind, target_format="pdf", suggested_name=suggested_name
        )


def parse_launch_args(argv: list[str]) -> tuple[str | None, str | None]:
    """Parse the app shortcut or Explorer file-association launch arguments."""
    app_kind = None
    file_path = None
    for arg in argv:
        if arg.startswith("--app="):
            candidate = arg.split("=", 1)[1].lower()
            if candidate not in VALID_APP_KINDS:
                raise ValueError(f"Ứng dụng không hợp lệ: {candidate}")
            app_kind = candidate
        elif not arg.startswith("-") and file_path is None:
            file_path = str(Path(arg).expanduser().resolve())

    if file_path:
        inferred_app = FILE_APP_KINDS.get(Path(file_path).suffix.lower())
        if not inferred_app:
            raise ValueError(f"Định dạng tệp chưa được hỗ trợ: {Path(file_path).suffix or '(không có)'}")
        if app_kind and app_kind != inferred_app:
            raise ValueError("Tham số --app không khớp với định dạng tệp.")
        app_kind = inferred_app

    return app_kind, file_path


def build_launch_url(app_kind: str | None, initial_file: str | None) -> str:
    if not app_kind:
        return "http://localhost:8080"
    query = {"app": app_kind, "singleApp": "1"}
    if initial_file:
        query["openFile"] = "1"
    return f"http://localhost:8080/?{urlencode(query)}"


def main(argv: list[str] | None = None):
    try:
        app_kind, initial_file = parse_launch_args(list(sys.argv[1:] if argv is None else argv))
    except ValueError as exc:
        print(f"[VN Office] {exc}", file=sys.stderr)
        return 2

    api = VnOfficeApi(app_kind=app_kind, initial_file=initial_file)

    window = webview.create_window(
        title=APP_TITLES.get(app_kind, SUITE_TITLE),
        url=build_launch_url(app_kind, initial_file),
        width=1366,
        height=820,
        min_size=(960, 640),
        js_api=api,
        text_select=True,
    )

    def on_closing():
        # Thoát tiến trình ngay lập tức khi người dùng bấm nút đóng (X), tránh lỗi COM teardown
        os._exit(0)

    window.events.closing += on_closing
    window.events.closed += on_closing

    try:
        webview.start(debug=False)
    except SystemExit:
        pass
    except Exception as exc:
        print(f"[VN Office] Thoát cửa sổ: {exc}")
    finally:
        os._exit(0)


if __name__ == "__main__":
    main()
