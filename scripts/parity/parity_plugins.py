"""Plugin oracle/giai đoạn CẦN MÁY ĐẶC BIỆT. KHÔNG giả lập: mỗi plugin chỉ trả BLOCKED/NOT RUN kèm lý do.

Hợp đồng (để người có máy điền vào sau): hàm run(ctx) -> dict {status, reason, ...} với
status ∈ {PASS, FAIL, NOT RUN, BLOCKED}. ctx = {file, format, engine_output_dir, entry}.
Khi có triển khai thật, thay thân hàm — đừng đổi tên khóa kết quả.
"""
import shutil

def _blocked(reason, todo): return {"status": "BLOCKED", "reason": reason, "todo": todo}

def _lo_convert(exe, src, fmt, outdir, prof):
    import subprocess, os
    r = subprocess.run([exe, "--headless", f"-env:UserInstallation=file://{prof}", "--convert-to", fmt, "--outdir", outdir, src],
                       capture_output=True, text=True, timeout=180)
    base = os.path.splitext(os.path.basename(src))[0]
    out = os.path.join(outdir, base + "." + fmt.split(":")[0])
    return (os.path.exists(out), out, r.returncode)

def oracle_libreoffice(ctx):
    """Oracle THAM KHẢO (không phải Office thật): LibreOffice có TẢI và xuất được tệp nguồn / tệp OOXMLKit đã lưu không,
    và (DOCX→txt, XLSX→csv) dấu vết sửa đổi có xuất hiện trong văn bản LibreOffice đọc ra không.
    PASS ở đây KHÔNG chứng minh Microsoft Office mở được (không có 'repair')."""
    import os, tempfile
    exe = shutil.which("soffice") or shutil.which("libreoffice")
    if not exe:
        return _blocked("LibreOffice (soffice) không có trên máy này.",
                        "TODO: chạy `soffice --headless --convert-to pdf` trên bản gốc và bản OOXMLKit lưu.")
    work = tempfile.mkdtemp(prefix="lo-parity-"); prof = os.path.join(work, "profile")
    checks, status = [], "PASS"
    targets = [("source", ctx["file"])] + [(k, v) for k, v in ctx.get("outputs", {}).items()]
    try:
        for label, f in targets:
            ok, out, rc = _lo_convert(exe, f, "pdf", os.path.join(work, label), prof)
            checks.append({"file": label, "convert": "pdf", "ok": ok, "returncode": rc})
            if not ok: status = "FAIL"
            textfmt = {"docx": "txt:Text", "xlsx": "csv"}.get(ctx["format"])
            if label == "edit" and textfmt and ctx.get("marker"):
                ok2, out2, _ = _lo_convert(exe, f, textfmt, os.path.join(work, label + "-txt"), prof)
                seen = ok2 and ctx["marker"] in open(out2, encoding="utf-8", errors="replace").read()
                checks.append({"file": label, "convert": textfmt, "ok": ok2, "marker_visible_in_libreoffice": seen})
                if not seen: status = "FAIL"
    except Exception as e:
        return {"status": "FAIL", "reason": f"{type(e).__name__}: {e}", "checks": checks}
    note = "" if len(targets) > 1 else " (chỉ tệp nguồn: chưa có engine nên không có bản OOXMLKit để kiểm)"
    return {"status": status, "reason": "LibreOffice tải/xuất được" + note if status == "PASS" else "LibreOffice không tải/xuất được hoặc dấu sửa không thấy",
            "checks": checks, "scope": "reference-only, not Microsoft Office"}

def oracle_msoffice(ctx):
    return _blocked("Microsoft Office thật (Windows/macOS) không có; không giả lập. Oracle cuối của dự án.",
                    "TODO: trên máy có Office: mở bản OOXMLKit lưu (COM/AppleScript ngoài phạm vi repo này), ghi nhận cảnh báo 'repair', xuất PDF/ảnh làm baseline thật; nạp kết quả vào MANIFEST.oracle.microsoft_office.")

def visual_diff(ctx):
    return _blocked("Cần ảnh render từ Office/LibreOffice thật để so; không có engine render trong môi trường này.",
                    "TODO: render bản gốc và bản lưu cùng DPI/font, so pixel (ngưỡng theo trang) — cần cố định bộ font.")

def repair_check(ctx):
    return _blocked("Chỉ Microsoft Office thật mới cho biết tệp có bị 'Repair'; PackageValidator của OOXMLKit KHÔNG thay thế được.",
                    "TODO: tự động hóa mở tệp bằng Office, bắt hộp thoại repair/ghi log.")

def device_perf(ctx):
    return _blocked("Không có iPhone/iPad thật. Mục tiêu: 1MB < 1s, 10MB < 3s (mở+lưu) trên thiết bị — chưa đo.",
                    "TODO: XCTest/instrument trên thiết bị thật với tệp 1MB và 10MB sinh bằng scripts/corpus (chưa có tệp 10MB).")

PLUGINS = [("oracle_libreoffice", oracle_libreoffice), ("oracle_msoffice", oracle_msoffice),
           ("visual_diff", visual_diff), ("repair_check", repair_check), ("device_perf", device_perf)]
