"""
VN Office — Python Desktop Application Entrypoint
Khởi chạy VN Office dưới dạng cửa sổ Native Desktop App độc lập,
và làm cầu nối thật (không mock) tới LibreOffice headless engine
cho các thao tác Mở/Lưu/Xuất PDF — cross-platform: Windows, Linux, macOS.
"""

import os
import sys
import shutil
import subprocess
import tempfile
import threading
import platform
from pathlib import Path

import webview

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
INDEX_HTML = os.path.join(ROOT_DIR, "index.html")

APP_DATA_DIR_NAME = "VNOffice"


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
    "pptx": "Impress MS PowerPoint 2007 XML",
    "odp": "impress8",
}

_convert_lock = threading.Lock()


class DocumentEngineError(Exception):
    pass


def _profile_uri() -> str:
    profile_dir = _user_data_dir() / "lo-profile"
    profile_dir.mkdir(parents=True, exist_ok=True)
    return profile_dir.as_uri()


def _run_soffice_convert(src_path: str, target_ext: str, out_dir: str) -> str:
    """Chạy LibreOffice headless để chuyển đổi thật một tệp. Trả về đường dẫn tệp kết quả."""
    if not SOFFICE_PATH:
        raise DocumentEngineError(
            "Không tìm thấy LibreOffice engine (soffice). Vui lòng cài đặt LibreOffice "
            "hoặc đặt biến môi trường VNOFFICE_SOFFICE_PATH trỏ tới soffice."
        )

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
        f"-env:UserInstallation={_profile_uri()}",
        "--convert-to",
        convert_to,
        "--outdir",
        out_dir,
        src_path,
    ]

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

    def engine_status(self):
        """Cho UI biết document engine thật có sẵn sàng hay không (không giả vờ)."""
        return {"available": SOFFICE_PATH is not None, "path": SOFFICE_PATH or ""}

    def open_document_dialog(self, app_kind="writer"):
        """Mở hộp thoại chọn tệp NATIVE thật của hệ điều hành, chuyển đổi tệp thật sang
        định dạng trung gian mà UI có thể hiển thị."""
        if not self.window:
            return {"status": "error", "message": "Cửa sổ ứng dụng chưa sẵn sàng."}

        file_types = OPEN_FILE_TYPES.get(app_kind, ("Tất cả tệp (*.*)",))
        try:
            result = self.window.create_file_dialog(webview.OPEN_DIALOG, file_types=file_types)
        except Exception as exc:  # lỗi hệ thống khi mở hộp thoại
            return {"status": "error", "message": f"Không mở được hộp thoại: {exc}"}

        if not result:
            return {"status": "cancelled"}
        src_path = result[0]

        if app_kind == "slides":
            return {
                "status": "error",
                "message": "Mở tệp PowerPoint/ODP chưa được hỗ trợ ở phiên bản này.",
            }

        target_ext = "html" if app_kind == "writer" else "csv"
        try:
            with tempfile.TemporaryDirectory(prefix="vnoffice_open_") as tmp:
                out_path = _run_soffice_convert(src_path, target_ext, tmp)
                with open(out_path, "r", encoding="utf-8", errors="replace") as f:
                    content = f.read()
        except DocumentEngineError as exc:
            return {"status": "error", "message": str(exc)}

        return {
            "status": "ok",
            "sourcePath": src_path,
            "fileName": Path(src_path).name,
            "format": target_ext,
            "content": content,
        }

    def save_document_dialog(self, content, app_kind="writer", target_format=None, suggested_name="TaiLieu"):
        """Mở hộp thoại lưu tệp NATIVE thật, chuyển đổi nội dung soạn thảo hiện tại
        sang định dạng Office/ODF thật và ghi ra đĩa thật."""
        if not self.window:
            return {"status": "error", "message": "Cửa sổ ứng dụng chưa sẵn sàng."}
        if app_kind == "slides":
            return {"status": "error", "message": "Lưu tệp cho Slides chưa được hỗ trợ ở phiên bản này."}

        target_format = target_format or DEFAULT_SAVE_FORMAT.get(app_kind, "pdf")

        try:
            save_result = self.window.create_file_dialog(
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
                else:  # sheet
                    src_path = os.path.join(tmp, "draft.csv")
                    with open(src_path, "w", encoding="utf-8") as f:
                        f.write(content)

                out_path = _run_soffice_convert(src_path, target_format, tmp)
                shutil.copyfile(out_path, dest_path)
        except DocumentEngineError as exc:
            return {"status": "error", "message": str(exc)}

        return {"status": "ok", "message": f"Đã lưu tại {dest_path}", "path": dest_path}

    def export_pdf_dialog(self, content, app_kind="writer", suggested_name="TaiLieu"):
        return self.save_document_dialog(
            content, app_kind=app_kind, target_format="pdf", suggested_name=suggested_name
        )


def main():
    api = VnOfficeApi()

    window = webview.create_window(
        title="VN Office — Bộ Ứng Dụng Văn Phòng Việt",
        url="http://localhost:8080",
        width=1366,
        height=820,
        min_size=(960, 640),
        js_api=api,
        text_select=True,
    )
    api.window = window

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
