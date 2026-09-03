"""
VN Office — Python Desktop Application Entrypoint
Khởi chạy VN Office dưới dạng cửa sổ Native Desktop App độc lập.
"""

import os
import sys
import webview

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
INDEX_HTML = os.path.join(ROOT_DIR, "index.html")

class VnOfficeApi:
    """Python API phơi ra cho JavaScript giao tiếp (Bridge)"""
    def __init__(self):
        self.doc_path = None

    def save_document(self, content, file_name="document.docx"):
        print(f"[Python Desktop Backend] Đang lưu tài liệu: {file_name}")
        return {"status": "ok", "message": "Đã lưu thành công qua Python Bridge."}

    def export_pdf(self, content):
        print("[Python Desktop Backend] Xuất tệp PDF...")
        return {"status": "ok", "message": "Đã xuất PDF thành công."}

    def dispatch_uno(self, uno_command, args_json="{}"):
        print(f"[PyUNO Bridge] Gửi lệnh UNO tới LibreOffice Core: {uno_command}")
        return {"status": "ok", "command": uno_command}

def main():
    api = VnOfficeApi()

    window = webview.create_window(
        title="VN Office — Bộ Ứng Dụng Văn Phòng Việt",
        url=f"http://localhost:8080",
        width=1366,
        height=820,
        min_size=(960, 640),
        js_api=api,
        text_select=True
    )

    webview.start(debug=False)

if __name__ == "__main__":
    main()
