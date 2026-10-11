"""
Slides Save Roundtrip Bridge
Sử dụng trực tiếp main.py để thực hiện luồng Lưu và Mở lại tài liệu Slides thật:
1. Nhận FODP content từ canvas Slides
2. Gọi main.VnOfficeApi.save_document_dialog(content, "slides", "pptx") -> xuất file PPTX thật
3. Gọi main.VnOfficeApi.open_document_dialog("slides") với file PPTX vừa xuất -> đọc lại FODP thật
4. Ghi kết quả payload ra file JSON để Playwright nạp lại vào Slides canvas.
"""
import sys
import os
import json
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT_DIR))

import webview
import main


class HeadlessWindowMock:
    def __init__(self, target_save_path):
        self.target_save_path = str(target_save_path)

    def create_file_dialog(self, dialog_type, **kwargs):
        if dialog_type == webview.SAVE_DIALOG:
            return [self.target_save_path]
        return [self.target_save_path]


def run_roundtrip(fodp_in_path, pptx_out_path, payload_out_path):
    fodp_in = Path(fodp_in_path)
    pptx_out = Path(pptx_out_path)
    payload_out = Path(payload_out_path)

    with open(fodp_in, "r", encoding="utf-8") as f:
        content = f.read()

    # Mock window cho save_document_dialog
    pptx_out.parent.mkdir(parents=True, exist_ok=True)
    mock_window = HeadlessWindowMock(pptx_out)
    main._active_window = lambda: mock_window

    print(f"[Bridge] Bắt đầu Lưu FODP -> PPTX thật: {pptx_out}")
    save_api = main.VnOfficeApi("slides")
    save_result = save_api.save_document_dialog(
        content=content,
        app_kind="slides",
        target_format="pptx",
        suggested_name=pptx_out.stem
    )
    if save_result.get("status") != "ok":
        raise RuntimeError(f"Lưu thất bại: {save_result}")
    print(f"[Bridge] Lưu PPTX thành công: {save_result.get('path')} (size={os.path.getsize(pptx_out)} bytes)")

    print(f"[Bridge] Bắt đầu Mở lại PPTX thật -> FODP: {pptx_out}")
    open_api = main.VnOfficeApi("slides", initial_file=str(pptx_out))
    open_payload = open_api.open_document_dialog("slides")
    if open_payload.get("status") != "ok":
        raise RuntimeError(f"Mở lại thất bại: {open_payload}")

    payload_out.parent.mkdir(parents=True, exist_ok=True)
    with open(payload_out, "w", encoding="utf-8") as f:
        json.dump(open_payload, f, ensure_ascii=False, indent=2)

    print(f"[Bridge] Xuất payload thành công: {payload_out} (fodp len={len(open_payload.get('content', ''))})")
    return open_payload


if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python slides_save_roundtrip_bridge.py <input_fodp> <output_pptx> <output_payload_json>")
        sys.exit(1)
    run_roundtrip(sys.argv[1], sys.argv[2], sys.argv[3])
