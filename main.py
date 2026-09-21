"""
VN Office — Python Desktop Application Entrypoint
Khởi chạy VN Office dưới dạng cửa sổ Native Desktop App độc lập,
và làm cầu nối thật (không mock) tới LibreOffice headless engine
cho các thao tác Mở/Lưu/Xuất PDF — cross-platform: Windows, Linux, macOS.
"""

import http.server
import os
import socket
import sys
import base64
import csv
from collections import Counter
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
from urllib.parse import urlencode, unquote

import webview

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
INDEX_HTML = os.path.join(ROOT_DIR, "index.html")

# ---------------------------------------------------------------------------
# Embedded static-file server (runs inside the Python process)
# ---------------------------------------------------------------------------

_STATIC_MIME_OVERRIDES = {
    ".js": "text/javascript; charset=UTF-8",
    ".mjs": "text/javascript; charset=UTF-8",
    ".css": "text/css; charset=UTF-8",
    ".json": "application/json; charset=UTF-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".gif": "image/gif",
    ".html": "text/html; charset=UTF-8",
    ".htm": "text/html; charset=UTF-8",
}

_DEFAULT_STATIC_PORT = 8080
_MAX_PORT_ATTEMPTS = 20


class _StaticFileHandler(http.server.SimpleHTTPRequestHandler):
    """Serve files from ROOT_DIR with correct MIME types for JS/CSS."""

    def __init__(self, *args, directory=None, **kwargs):
        super().__init__(*args, directory=directory or ROOT_DIR, **kwargs)

    def guess_type(self, path):
        ext = os.path.splitext(path)[1].lower()
        if ext in _STATIC_MIME_OVERRIDES:
            return _STATIC_MIME_OVERRIDES[ext]
        return super().guess_type(path)

    def log_message(self, fmt, *args):
        pass  # quiet — do not spam console on every request


class _QuietTCPServer(http.server.ThreadingHTTPServer):
    allow_reuse_address = False

    def server_bind(self):
        self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 0)
        super().server_bind()


def _start_static_server():
    """Find a free port, start the embedded HTTP server on a daemon thread,
    wait until it is ready, and return (server, port).

    Raises RuntimeError if no port is available within _MAX_PORT_ATTEMPTS.
    """
    for attempt in range(_MAX_PORT_ATTEMPTS):
        port = _DEFAULT_STATIC_PORT + attempt
        try:
            server = _QuietTCPServer(("127.0.0.1", port), _StaticFileHandler)
        except OSError:
            continue  # port occupied, try next

        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()

        # Quick readiness check
        import time
        time.sleep(0.05)
        if thread.is_alive():
            return server, port
        # Thread died immediately — port was not truly free
        server.server_close()

    raise RuntimeError(
        f"Không tìm thấy cổng trống trong khoảng {_DEFAULT_STATIC_PORT}–"
        f"{_DEFAULT_STATIC_PORT + _MAX_PORT_ATTEMPTS - 1}"
    )

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


_CSV_VN_LANG = 1066
_CSV_EN_LANG = 1033
_CSV_DESCRIPTION_MAX_FIELDS = 3


def _detect_csv_import_options(src_path: str) -> tuple[str, str]:
    """Detect delimiter/encoding and return (encoding name, LO FilterOptions).

    UTF-8 is validated strictly (with or without BOM). Files that are not valid
    UTF-8 use Windows-1258, the ANSI code page used by Vietnamese Windows/Excel.

    The delimiter is detected by counting field splits across many lines (not just
    the first few), which avoids mis-detection when description/blank rows precede
    the real header.  The language code is set to English (1033) when US-style
    decimal numbers are detected (e.g. ``1234.56`` or ``1,234.56``), so
    LibreOffice recognises the dot as a decimal separator instead of a thousands
    separator.
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

    # --- delimiter detection -------------------------------------------------
    # Take many non-empty lines so that leading description/blank rows do not
    # skew the detection.  Then pick the delimiter that produces the highest
    # *consistent* field count (mode), falling back to csv.Sniffer as a last
    # resort.
    nonempty_lines = [line for line in sample_text.splitlines() if line.strip()][:200]
    delimiter = ","

    if nonempty_lines:
        best_delim = ","
        best_score = 0
        for delim in (",", ";", "\t"):
            counts = [len(line.split(delim)) for line in nonempty_lines]
            if not counts:
                continue
            mode_count = Counter(counts).most_common(1)[0][1]
            max_fields = max(counts)
            # Require at least 2 fields in the majority of lines to be useful.
            if mode_count > best_score and max_fields >= 2:
                best_score = mode_count
                best_delim = delim
        if best_score > 0:
            delimiter = best_delim
        else:
            # Fallback: single-column or malformed – let Sniffer have a try.
            try:
                delimiter = csv.Sniffer().sniff(
                    "\n".join(nonempty_lines[:50]), delimiters=",;\t"
                ).delimiter
            except csv.Error:
                delimiter = ","

    # --- number format / language detection ----------------------------------
    # If the data contains US-style decimal numbers (e.g. 1234.56 or 1,234.56)
    # without VN-style digit-dot grouping (1.234), switch the language to
    # English so that LibreOffice interprets the dot as a decimal separator.
    lang_code = _CSV_VN_LANG
    if _looks_like_us_numbers(sample_text, delimiter):
        lang_code = _CSV_EN_LANG

    # LibreOffice CSV import tokens: field separator, text delimiter, charset,
    # first row, column formats, language, quoted-as-text, detect numbers.
    filter_options = (
        f"{_CSV_DELIMITER_CODES[delimiter]},34,{charset_code},1,,{lang_code},false,true"
    )
    return encoding, filter_options


def _looks_like_us_numbers(text: str, delimiter: str) -> bool:
    """Return True when the text likely contains US-style decimal numbers.

    US style: ``1234.56`` or ``1,234.56`` (comma = thousands, dot = decimal).
    VN style: ``1.234,56`` (dot = thousands, comma = decimal).
    """
    # US thousands+decimal: 1,234.56 — comma must be followed by exactly 3
    # digits so that short ambiguous fragments (12,34) are excluded.
    us_grouped_re = re.compile(r"[-+]?\d{1,3}(?:,\d{3})+\.\d+")
    # VN grouped: 1.234 or 1.234,56 — three digits after each dot.
    vn_grouped_re = re.compile(r"[-+]?\d{1,3}(?:\.\d{3})+(?:,\d+)?")
    us_count = len(us_grouped_re.findall(text))
    vn_count = len(vn_grouped_re.findall(text))
    # Simple US decimals like 1234.56 (no thousands separator) — only count
    # when there is no VN-style grouping in the file at all.
    if vn_count == 0:
        simple_us_re = re.compile(r"(?:^|(?<=" + re.escape(delimiter) + r"))[-+]?\d+\.\d+(?=" + re.escape(delimiter) + r"|$)")
        us_count += len(simple_us_re.findall(text))
    return us_count > vn_count


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


def _apply_native_export_postprocess(src_path: str, out_path: str, app_kind: str | None, target_format: str, source_path: str | None = None) -> None:
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
            # LƯU Ý: KHÔNG early-return khi thiếu structure-protected — trường
            # hợp đó chỉ tắt phần lockStructure; postprocess_sheet_xlsx() còn
            # tự kiểm tra Freeze Panes ĐỘC LẬP (vno:frozen-rows/cols), việc
            # nào cũng phổ biến hơn nhiều so với khóa cấu trúc workbook. Luôn
            # gọi và để hàm tự quyết định không cần vá gì (trả về bytes y hệt).
            with open(out_path, "rb") as handle:
                original = handle.read()
            # Read original XLSX for font/column width restoration
            source_xlsx_bytes = None
            if source_path and os.path.isfile(source_path) and source_path.lower().endswith(".xlsx"):
                with open(source_path, "rb") as handle:
                    source_xlsx_bytes = handle.read()
            # Read source FODS for activeTab preservation
            patched = patcher.postprocess_sheet_xlsx(original, source_fods=fods, source_xlsx_bytes=source_xlsx_bytes)
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
            # Không còn early-return khi thiếu logo/sections/show-setup: soffice
            # --convert-to pptx BỎ QUA style:page-layout-properties của FODP và
            # luôn tự ghi <p:sldSz> mặc định 28cm x 15.75cm - postprocess_slides_pptx
            # giờ LUÔN cần được gọi để có cơ hội khôi phục khổ trang thật, kể cả
            # khi tài liệu không dùng logo/sections/show-setup nào (trường hợp
            # phổ biến nhất). Bản thân postprocess_slides_pptx đã tự kiểm tra và
            # trả về nguyên bytes gốc nếu thực sự không cần sửa gì.
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
                f"Không bổ sung được thuộc tính native PPTX (khổ trang / logo / Sections / Set Up Show): {exc}"
            ) from exc
    if app_kind == "writer" and fmt == "docx":
        try:
            with open(out_path, "rb") as handle:
                converted_docx = handle.read()
            patcher = _ooxml_zip_patch()
            source_html = None
            if src_path and str(src_path).lower().endswith(".html"):
                with open(src_path, "r", encoding="utf-8", errors="replace") as handle:
                    source_html = handle.read()
            patched = patcher.postprocess_created_writer_docx(converted_docx, source_html=source_html)
            if source_path and os.path.isfile(source_path):
                with open(source_path, "rb") as handle:
                    original_docx = handle.read()
                patched = patcher.postprocess_writer_docx(patched, source_docx=original_docx)
            if patched != converted_docx:
                with open(out_path, "wb") as handle:
                    handle.write(patched)
        except DocumentEngineError:
            raise
        except Exception as exc:
            raise DocumentEngineError(
                f"Không khôi phục được section/header/footer cho DOCX: {exc}"
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


def _optimize_fods_for_sheet(fods_xml: str) -> str:
    """Optimize FODS for Sheet: merge repeated empty cells, trim style-only tail.
    
    Delegates to the shared implementation in ooxml_zip_patch.
    """
    return _ooxml_zip_patch().optimize_fods_streaming(fods_xml)


_IMG_TAG_RE = re.compile(r"<img\b([^>]*?)(\s*/?)>", re.IGNORECASE)
_SRC_ATTR_RE = re.compile(r"""\bsrc=["']([^"']+)["']""", re.IGNORECASE)
_SRC_ATTR_REPLACE_RE = re.compile(r"""\bsrc=["'][^"']*["']""", re.IGNORECASE)


def _probe_pixel_dimensions(raw: bytes, ext: str) -> tuple[int, int] | None:
    """Đọc kích thước pixel THẬT từ bytes ảnh (không tin cậy thuộc tính HTML
    width/height, có thể bị soffice ghi lệch tỷ lệ). Chỉ hỗ trợ GIF/PNG —
    đủ cho mục đích lọc hairline bên dưới; định dạng khác trả về None (an
    toàn, không đoán)."""
    if ext == ".gif" and len(raw) >= 10 and raw[:6] in (b"GIF87a", b"GIF89a"):
        width = raw[6] | (raw[7] << 8)
        height = raw[8] | (raw[9] << 8)
        return (width, height)
    if ext == ".png" and len(raw) >= 24 and raw[:8] == b"\x89PNG\r\n\x1a\n":
        width = int.from_bytes(raw[16:20], "big")
        height = int.from_bytes(raw[20:24], "big")
        return (width, height)
    return None


def _is_decorative_hairline_image(raw: bytes, ext: str) -> bool:
    """Loi that phat hien qua file .docx that ("1. QD thanh lap TO MUA
    SAM.docx"): LibreOffice StarWriter HTML xuat hinh ve duong ke ngang
    trang tri (Word "Insert Shapes" -> duong thang mong) thanh anh GIF
    THAT SU 1px cao (vi du 126x1, 203x1) voi align="left", va vi tri anh
    trong luong HTML giu nguyen dung vi tri ky tu trong van ban goc - CO
    THE nam GIUA mot tu (vi du "P<img...>HONG" thay vi "PHONG"). Anh noi
    (float) 1px lam vo bo cuc dong chu, tao khoang trang/ngat tu nhin
    thay duoc, trong khi ban than duong ke nay khong mang thong tin gi
    (thuan tuy trang tri, thuong khong con nhin thay duoc trong ngu canh
    HTML). Danh cho: chieu cao (hoac chieu rong) <=2px VA chieu con lai
    >=10px (hinh dang duong ke, khong phai icon nho that su)."""
    dims = _probe_pixel_dimensions(raw, ext)
    if not dims:
        return False
    width, height = dims
    return (height <= 2 and width >= 10) or (width <= 2 and height >= 10)


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
        # Loi that phat hien qua file .docx that co dau tieng Viet/khoang trang
        # trong ten: LibreOffice StarWriter HTML ghi src bi URL-encode
        # (vi du "h%E1%BB%A3p%20..."), truoc day chi html.unescape() ma
        # QUEN unquote() nen os.path.isfile() luon False -> anh vo vinh vien.
        decoded = unquote(html.unescape(src))
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
        except OSError:
            return original
        ext = os.path.splitext(file_path)[1].lower()
        if _is_decorative_hairline_image(raw, ext):
            # Duong ke trang tri 1px that su (xac nhan qua pixel that, khong
            # phai thuoc tinh HTML) - bo qua hoan toan thay vi nhung, vi
            # align="left" cua no co the roi giua mot tu trong van ban va
            # lam vo dong chu nhin thay duoc (xem _is_decorative_hairline_image).
            return ""
        encoded = base64.b64encode(raw).decode("ascii")
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


def _read_docx_header_footer_xmls(src_path: str) -> tuple[str | None, str | None]:
    """Quy ước W26b: Đọc các part header/footer XML từ DOCX theo thứ tự rels của sectPr đầu (default trước, first/even sau)."""
    if not src_path or not str(src_path).lower().endswith(".docx"):
        return None, None
    try:
        with zipfile.ZipFile(src_path) as z:
            namelist = set(z.namelist())
            if "word/document.xml" not in namelist:
                return None, None
            doc_xml = z.read("word/document.xml").decode("utf-8", errors="replace")

            rels = {}
            if "word/_rels/document.xml.rels" in namelist:
                rels_xml = z.read("word/_rels/document.xml.rels").decode("utf-8", errors="replace")
                for match in re.finditer(r"<Relationship\b([^>]*?)/?>", rels_xml, re.IGNORECASE):
                    attrs = match.group(1) or ""
                    id_match = re.search(r'\bId\s*=\s*["\']([^"\']+)["\']', attrs, re.IGNORECASE)
                    target_match = re.search(r'\bTarget\s*=\s*["\']([^"\']+)["\']', attrs, re.IGNORECASE)
                    if id_match and target_match:
                        rels[id_match.group(1)] = target_match.group(1)

            sect_match = re.search(r"<w:sectPr\b[^>]*>[\s\S]*?</w:sectPr\s*>", doc_xml, re.IGNORECASE)
            sect_xml = sect_match.group(0) if sect_match else doc_xml

            type_order = {"default": 0, "first": 1, "even": 2}

            def extract_parts(tag_name: str) -> str | None:
                pattern = rf"<w:{tag_name}Reference\b([^>]*?)(?:/\s*>|>([\s\S]*?)</w:{tag_name}Reference\s*>)"
                refs = []
                for m in re.finditer(pattern, sect_xml, re.IGNORECASE):
                    attrs_str = m.group(1) or ""
                    id_match = re.search(r'r:id\s*=\s*["\']([^"\']+)["\']', attrs_str, re.IGNORECASE)
                    type_match = re.search(r'w:type\s*=\s*["\']([^"\']+)["\']', attrs_str, re.IGNORECASE)
                    if id_match:
                        r_id = id_match.group(1)
                        w_type = (type_match.group(1) if type_match else "default").lower()
                        refs.append((type_order.get(w_type, 3), w_type, r_id))

                refs.sort(key=lambda x: x[0])

                parts = []
                used_entries = set()
                for _, _, r_id in refs:
                    target = rels.get(r_id, "")
                    if target:
                        entry = f"word/{target}" if not target.startswith(("word/", "/")) else target.lstrip("/")
                        if entry in namelist and entry not in used_entries:
                            used_entries.add(entry)
                            parts.append(z.read(entry).decode("utf-8", errors="replace"))

                if not parts:
                    prefix = f"word/{tag_name}"
                    matching_entries = sorted([n for n in namelist if n.startswith(prefix) and n.endswith(".xml")])
                    for entry in matching_entries:
                        parts.append(z.read(entry).decode("utf-8", errors="replace"))

                return "\n".join(parts) if parts else None

            header_xml = extract_parts("header")
            footer_xml = extract_parts("footer")
            return header_xml, footer_xml
    except Exception:
        return None, None


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
                convert_src_path = src_path
                if app_kind == "sheet" and src_path.lower().endswith(".xlsx") and os.path.isfile(src_path):
                    with open(src_path, "rb") as source_file:
                        original_xlsx = source_file.read()
                    import_xlsx = _ooxml_zip_patch().make_all_sheets_visible_for_import(original_xlsx)
                    if import_xlsx != original_xlsx:
                        convert_src_path = os.path.join(tmp, "import-visible.xlsx")
                        with open(convert_src_path, "wb") as import_file:
                            import_file.write(import_xlsx)
                out_path = _run_soffice_convert(convert_src_path, target_ext, tmp, app_kind=app_kind)
                with open(out_path, "r", encoding="utf-8", errors="replace") as f:
                    content = f.read()
                if app_kind == "writer":
                    content = _inline_html_images(content, out_path)
                    # Quy ước W9: font/cỡ mặc định từ docDefaults + theme khi LibreOffice không ghi p.western.
                    if src_path.lower().endswith(".docx"):
                        try:
                            with open(src_path, "rb") as f:
                                docx_bytes = f.read()
                            patcher = _ooxml_zip_patch()
                            # W12b: font theme của tài liệu tiếng Việt = typeface script="Viet" (Word), không phải latin
                            content = patcher.apply_docx_theme_script_fonts(docx_bytes, content)
                            content = patcher.inject_docx_default_font_css(docx_bytes, content)
                            # W25a: cỡ chữ style nửa điểm (w:sz lẻ: 8,5 / 11,5 / 14,5 pt) bị LibreOffice làm tròn
                            content = patcher.inject_docx_half_point_styles_css(docx_bytes, content)
                        except OSError:
                            pass
                elif app_kind == "sheet":
                    # Overlay BEFORE the FODS leaves this process — SheetAdapter.parseFods
                    # must see table:structure-protected when the original XLSX is locked.
                    content = _apply_native_import_overlay(src_path, content, app_kind)
                    # Optimize FODS: merge repeated empty cells, trim style-only tail.
                    content = _optimize_fods_for_sheet(content)
                    # Cell runs can move to their final logical coordinates during
                    # optimization. Reapply only XF ownership at those coordinates;
                    # all other native overlays retain their established ordering.
                    if src_path.lower().endswith(".xlsx") and os.path.isfile(src_path):
                        with open(src_path, "rb") as source_file:
                            content = _ooxml_zip_patch().reoverlay_sheet_xf_indices(
                                source_file.read(), content
                            )
                elif app_kind == "slides":
                    # Overlay BEFORE the FODP leaves this process — SlidesAdapter.parseFodp
                    # must see vno:section-*, vno:master-theme, and Set Up Show vno:*
                    # when the original PTTX has p14:sectionLst / VNOfficeMasterLogo /
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
            # Quy ước W11: style bảng (TableGrid: spacing after=0, line=240) nằm trong styles.xml.
            styles_xml = _read_docx_zip_entry(src_path, "word/styles.xml")
            if styles_xml:
                payload["ooxmlStylesXml"] = styles_xml
            # Quy ước W21b: định dạng danh sách/bullet nằm trong numbering.xml.
            numbering_xml = _read_docx_zip_entry(src_path, "word/numbering.xml")
            if numbering_xml:
                payload["ooxmlNumberingXml"] = numbering_xml
            # Quy ước W26b: header/footer XML để chuẩn hóa đoạn rỗng theo cỡ dấu đoạn zone.
            header_xml, footer_xml = _read_docx_header_footer_xmls(src_path)
            if header_xml:
                payload["ooxmlHeaderXml"] = header_xml
            if footer_xml:
                payload["ooxmlFooterXml"] = footer_xml
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

    def save_document_dialog(self, content, app_kind="writer", target_format=None, suggested_name="TaiLieu", source_path=None):
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
                _apply_native_export_postprocess(src_path, out_path, app_kind, target_format, source_path=source_path)
                shutil.copyfile(out_path, dest_path)
        except DocumentEngineError as exc:
            return {"status": "error", "message": str(exc)}

        return {"status": "ok", "message": f"Đã lưu tại {dest_path}", "path": dest_path}

    def export_pdf_dialog(self, content, app_kind="writer", suggested_name="TaiLieu", source_path=None):
        return self.save_document_dialog(
            content, app_kind=app_kind, target_format="pdf", suggested_name=suggested_name, source_path=source_path
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


def build_launch_url(app_kind: str | None, initial_file: str | None, port: int = _DEFAULT_STATIC_PORT) -> str:
    if not app_kind:
        return f"http://localhost:{port}"
    query = {"app": app_kind, "singleApp": "1"}
    if initial_file:
        query["openFile"] = "1"
    return f"http://localhost:{port}/?{urlencode(query)}"


def main(argv: list[str] | None = None):
    try:
        app_kind, initial_file = parse_launch_args(list(sys.argv[1:] if argv is None else argv))
    except ValueError as exc:
        print(f"[VN Office] {exc}", file=sys.stderr)
        return 2

    # Start embedded static-file server BEFORE creating the webview window
    # so the UI is guaranteed to load without ERR_CONNECTION_REFUSED.
    try:
        server, port = _start_static_server()
    except RuntimeError as exc:
        msg = (
            f"VN Office không thể khởi động.\n\n"
            f"Nguyên nhân: {exc}\n\n"
            f"Vui lòng kiểm tra:\n"
            f"• Phần mềm diệt virus hoặc tường lửa có đang chặn ứng dụng không.\n"
            f"• Thử khởi động lại máy tính."
        )
        if platform.system() == "Windows":
            try:
                import ctypes
                ctypes.windll.user32.MessageBoxW(0, msg, "VN Office — Lỗi khởi động", 0x10)
            except Exception:
                print(f"[VN Office] {msg}", file=sys.stderr)
        else:
            print(f"[VN Office] {msg}", file=sys.stderr)
        return 3

    print(f"[VN Office] Embedded server ready at http://localhost:{port}")

    api = VnOfficeApi(app_kind=app_kind, initial_file=initial_file)

    window = webview.create_window(
        title=APP_TITLES.get(app_kind, SUITE_TITLE),
        url=build_launch_url(app_kind, initial_file, port=port),
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
