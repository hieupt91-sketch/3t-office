"""
Live test script for Save-In-Place and Legacy .doc/.xls formatting in VN Office.
Tuân thủ TASK-BRIEF-SAVE-IN-PLACE-AGY.md và AGENTS.md.
Mỗi bài test chạy trong một process riêng biệt để pywebview hoạt động ổn định.
"""

import argparse
import json
import os
import shutil
import subprocess
import sys
import tempfile
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

LOCAL_APPDATA_DIR = r"E:\VNOffice-profiles\agy"
os.environ["LOCALAPPDATA"] = LOCAL_APPDATA_DIR


def check_word_text_com(file_path, expected_text):
    """Mở file bằng Word COM và kiểm tra xem văn bản có xuất hiện trong nội dung không."""
    abs_path = os.path.abspath(file_path).replace("\\", "\\\\")
    ps_cmd = f"""
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false; $word.DisplayAlerts = 0
    try {{
        $doc = $word.Documents.Open("{abs_path}", $false, $true, $false)
        $txt = $doc.Content.Text
        $doc.Close(0)
        if ($txt -match "{expected_text}") {{
            Write-Output "FOUND"
        }} else {{
            Write-Output "NOT_FOUND"
        }}
    }} catch {{
        Write-Output "ERROR: $($_.Exception.Message)"
    }} finally {{
        $word.Quit()
        [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
    }}
    """
    res = subprocess.run(
        ["powershell", "-NoProfile", "-Command", ps_cmd],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=120,
    )
    output = (res.stdout or "").strip()
    return "FOUND" in output, output


def check_excel_cell_com(file_path, expected_value=None):
    """Mở file bằng Excel COM và kiểm tra xem file có mở được và có giá trị mong muốn không."""
    abs_path = os.path.abspath(file_path).replace("\\", "\\\\")
    val_check = (
        f'if ($val -match "{expected_value}") {{ Write-Output "FOUND" }} else {{ Write-Output "VAL_MISMATCH: $val" }}'
        if expected_value
        else 'Write-Output "FOUND"'
    )
    ps_cmd = f"""
    $before = @(Get-Process -Name EXCEL -ErrorAction SilentlyContinue | ForEach-Object {{ $_.Id }})
    $xl = New-Object -ComObject Excel.Application
    $ownedPid = 0
    for ($i = 0; $i -lt 30 -and $ownedPid -eq 0; $i++) {{
        $created = @(Get-Process -Name EXCEL -ErrorAction SilentlyContinue | Where-Object {{ $before -notcontains $_.Id }})
        if ($created.Count -gt 0) {{ $ownedPid = [int]$created[0].Id }} else {{ Start-Sleep -Milliseconds 100 }}
    }}
    if ($ownedPid -eq 0) {{
        [System.Runtime.InteropServices.Marshal]::ReleaseComObject($xl) | Out-Null
        Write-Output "ERROR: Excel không tạo được process riêng, các instance Excel đang mở không bị đóng"
        return
    }}
    $xl.DisplayAlerts = $false
    $xl.Visible = $false
    try {{
        $wb = $xl.Workbooks.Open("{abs_path}", $false, $true)
        $found = $false
        $allVals = @()
        if ("{expected_value}") {{
            foreach ($ws in $wb.Worksheets) {{
                $v = [string]($ws.Range("A1").Value2)
                $allVals += "$($ws.Name): $v"
                if ($v -match "{expected_value}") {{
                    $found = $true
                    break
                }}
            }}
        }} else {{
            $found = $true
        }}
        $wb.Close($false)
        if ($found) {{
            Write-Output "FOUND"
        }} else {{
            Write-Output "VAL_MISMATCH: $($allVals -join '; ')"
        }}
    }} catch {{
        Write-Output "ERROR: $($_.Exception.Message)"
    }} finally {{
        try {{ $xl.Quit() }} catch {{ }}
        [System.Runtime.InteropServices.Marshal]::ReleaseComObject($xl) | Out-Null
        for ($i = 0; $i -lt 20 -and (Get-Process -Id $ownedPid -ErrorAction SilentlyContinue); $i++) {{ Start-Sleep -Milliseconds 100 }}
        $owned = Get-Process -Id $ownedPid -ErrorAction SilentlyContinue
        if ($owned) {{ Stop-Process -Id $ownedPid -Force -ErrorAction SilentlyContinue }}
    }}
    """
    res = subprocess.run(
        ["powershell", "-NoProfile", "-Command", ps_cmd],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=120,
    )
    output = (res.stdout or "").strip()
    return "FOUND" in output, output


def _run_single_app_save_in_place(doc_path, app_kind, edit_js):
    """Hàm chạy trong process đơn lẻ: khởi động pywebview, nạp tệp, sửa, bấm Ctrl+S."""
    import main as vnmain
    import webview

    server, port = vnmain._start_static_server()
    parsed_app, initial_file = vnmain.parse_launch_args([doc_path])
    api = vnmain.VnOfficeApi(app_kind=parsed_app or app_kind, initial_file=initial_file)

    dialog_tracker = {"called": False}

    # Trap tất cả các hàm mở hộp thoại lưu
    orig_save_dialog = api.save_document_dialog

    def trap_save_dialog(*a, **k):
        dialog_tracker["called"] = True
        return orig_save_dialog(*a, **k)

    api.save_document_dialog = trap_save_dialog

    window = webview.create_window(
        title=f"VN Office Live Save Test - {os.path.basename(doc_path)}",
        url=vnmain.build_launch_url(parsed_app or app_kind, initial_file, port=port),
        width=1366,
        height=800,
        js_api=api,
    )

    def trap_file_dialog(*a, **k):
        dialog_tracker["called"] = True
        return None

    window.create_file_dialog = trap_file_dialog

    result_payload = {
        "loaded": False,
        "dialog_called": False,
        "save_success": False,
        "err": None,
    }

    def on_loaded(win):
        try:
            stem = os.path.splitext(os.path.basename(doc_path))[0][:6]
            for _ in range(100):
                time.sleep(2)
                tab_text = win.evaluate_js("(document.querySelector('.vno-doc-tab span')||{}).textContent||''") or ""
                if stem and stem.lower() in tab_text.lower():
                    result_payload["loaded"] = True
                    break

            if not result_payload["loaded"]:
                result_payload["err"] = f"Timeout chờ tải tài liệu '{stem}' (tab hiện tại: '{tab_text}')"
                win.destroy()
                return

            time.sleep(3)

            # Thực hiện chỉnh sửa
            win.evaluate_js(edit_js)
            time.sleep(2)

            # Kích hoạt common.file.save
            win.evaluate_js(
                "window.__saveDone = 0; window.__saveErr = ''; "
                "import('/platform/commands/command-bus.js').then(m => m.globalCommandBus.execute('common.file.save'))"
                ".then(() => { window.__saveDone = 1; })"
                ".catch(e => { window.__saveErr = String(e && e.stack || e); });"
            )

            for _ in range(60):
                time.sleep(2)
                is_done = win.evaluate_js("window.__saveDone")
                save_err = win.evaluate_js("window.__saveErr")
                status_text = win.evaluate_js("(document.getElementById('vno-status-docinfo')||{}).textContent||''") or ""
                if is_done == 1 or "Đã lưu" in status_text:
                    result_payload["save_success"] = True
                    break
                if save_err:
                    result_payload["err"] = save_err
                    break

            result_payload["dialog_called"] = dialog_tracker["called"]
            time.sleep(2)
        except Exception as exc:
            result_payload["err"] = str(exc)
        finally:
            win.destroy()

    webview.start(on_loaded, window, debug=False)
    print("PROBE_RESULT=" + json.dumps(result_payload, ensure_ascii=False), flush=True)


def _execute_probe(cmd):
    res = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=300)
    for line in res.stdout.splitlines():
        if line.startswith("PROBE_RESULT="):
            return json.loads(line[len("PROBE_RESULT="):])
    return {
        "loaded": False,
        "dialog_called": False,
        "save_success": False,
        "err": f"Không có PROBE_RESULT. Stderr: {res.stderr[:200]} Stdout: {res.stdout[:200]}",
    }


def run_step_1():
    print("\n[1/5] Kiểm tra Live: Writer lưu tại chỗ file .docx...")
    work_dir = tempfile.mkdtemp(prefix="vno_test_step1_")
    try:
        orig = os.path.join(ROOT, "file test", "landocx", "d01.docx")
        target = os.path.join(work_dir, "test_d01.docx")
        shutil.copyfile(orig, target)
        orig_mtime = os.path.getmtime(target)

        edit_js = """
        (function() {
            const body = document.querySelector('.vno-writer-body');
            const p = document.createElement('p');
            p.textContent = 'VN_OFFICE_LIVE_TEST_DOCX_SUCCESS';
            body.insertBefore(p, body.firstChild);
            const inst = window.__vnoAppInstance;
            if (inst && inst.adapter) inst.adapter.isDirty = true;
            return true;
        })()
        """
        # Chạy subprocess
        cmd = [sys.executable, __file__, "--internal-run", target, "writer", edit_js]
        probe = _execute_probe(cmd)

        new_mtime = os.path.getmtime(target)
        word_ok, word_msg = check_word_text_com(target, "VN_OFFICE_LIVE_TEST_DOCX_SUCCESS")

        ok = (
            probe.get("loaded")
            and not probe.get("dialog_called")
            and probe.get("save_success")
            and new_mtime >= orig_mtime
            and word_ok
        )
        print(f"  • Nạp giao diện: {'PASS' if probe.get('loaded') else 'FAIL'}")
        print(f"  • Không mở hộp thoại dialog: {'PASS' if not probe.get('dialog_called') else 'FAIL'}")
        print(f"  • Lưu thành công: {'PASS' if probe.get('save_success') else 'FAIL (err: ' + str(probe.get('err')) + ')'}")
        print(f"  • Tệp được cập nhật trên đĩa: {'PASS' if new_mtime >= orig_mtime else 'FAIL'}")
        print(f"  • Word COM mở được và có nội dung sửa: {'PASS' if word_ok else 'FAIL: ' + word_msg}")
        return ok
    finally:
        shutil.rmtree(work_dir, ignore_errors=True)


def run_step_2():
    print("\n[2/5] Kiểm tra Live: Writer lưu tại chỗ file .doc cũ (Word 97-2003)...")
    work_dir = tempfile.mkdtemp(prefix="vno_test_step2_")
    try:
        orig = os.path.join(ROOT, "file test", "lan-legacy", "legacy02.doc")
        target = os.path.join(work_dir, "test_legacy02.doc")
        shutil.copyfile(orig, target)

        edit_js = """
        (function() {
            const body = document.querySelector('.vno-writer-body');
            const p = document.createElement('p');
            p.textContent = 'VN_OFFICE_LIVE_TEST_DOC_SUCCESS';
            body.insertBefore(p, body.firstChild);
            const inst = window.__vnoAppInstance;
            if (inst && inst.adapter) inst.adapter.isDirty = true;
            return true;
        })()
        """
        cmd = [sys.executable, __file__, "--internal-run", target, "writer", edit_js]
        probe = _execute_probe(cmd)

        with open(target, "rb") as f:
            magic_doc = f.read(4).hex().upper()
        word_ok, word_msg = check_word_text_com(target, "VN_OFFICE_LIVE_TEST_DOC_SUCCESS")

        ok = (
            probe.get("loaded")
            and not probe.get("dialog_called")
            and probe.get("save_success")
            and magic_doc == "D0CF11E0"
            and word_ok
        )
        print(f"  • Nạp giao diện: {'PASS' if probe.get('loaded') else 'FAIL'}")
        print(f"  • Không mở hộp thoại dialog: {'PASS' if not probe.get('dialog_called') else 'FAIL'}")
        print(f"  • Lưu thành công: {'PASS' if probe.get('save_success') else 'FAIL (err: ' + str(probe.get('err')) + ')'}")
        print(f"  • Byte đầu khớp nhị phân OLE2 Word 97-2003 (D0 CF 11 E0): {'PASS (' + magic_doc + ')' if magic_doc == 'D0CF11E0' else 'FAIL (' + magic_doc + ')'}")
        print(f"  • Word COM mở được và có nội dung sửa: {'PASS' if word_ok else 'FAIL: ' + word_msg}")
        return ok
    finally:
        shutil.rmtree(work_dir, ignore_errors=True)


def run_step_3():
    print("\n[3/5] Kiểm tra Live: Sheet lưu tại chỗ file .xlsx...")
    work_dir = tempfile.mkdtemp(prefix="vno_test_step3_")
    try:
        orig = os.path.join(ROOT, "file test", "lan", "lan11.xlsx")
        target = os.path.join(work_dir, "test_lan11.xlsx")
        shutil.copyfile(orig, target)
        orig_mtime = os.path.getmtime(target)

        edit_js = """
        (function() {
            const inst = window.__vnoAppInstance;
            if (inst && inst.adapter && inst.adapter.grid) {
                inst.adapter.grid.setCellValue("A", 1, 'VN_OFFICE_LIVE_TEST_XLSX_SUCCESS');
                inst.adapter.isDirty = true;
                return true;
            }
            return false;
        })()
        """
        cmd = [sys.executable, __file__, "--internal-run", target, "sheet", edit_js]
        probe = _execute_probe(cmd)

        new_mtime = os.path.getmtime(target)
        excel_ok, excel_msg = check_excel_cell_com(target, "VN_OFFICE_LIVE_TEST_XLSX_SUCCESS")

        ok = (
            probe.get("loaded")
            and not probe.get("dialog_called")
            and probe.get("save_success")
            and new_mtime >= orig_mtime
            and excel_ok
        )
        print(f"  • Nạp giao diện: {'PASS' if probe.get('loaded') else 'FAIL'}")
        print(f"  • Không mở hộp thoại dialog: {'PASS' if not probe.get('dialog_called') else 'FAIL'}")
        print(f"  • Lưu thành công: {'PASS' if probe.get('save_success') else 'FAIL (err: ' + str(probe.get('err')) + ')'}")
        print(f"  • Tệp được cập nhật trên đĩa: {'PASS' if new_mtime >= orig_mtime else 'FAIL'}")
        print(f"  • Excel COM mở được và có giá trị ô sửa: {'PASS' if excel_ok else 'FAIL: ' + excel_msg}")
        return ok
    finally:
        shutil.rmtree(work_dir, ignore_errors=True)


def run_step_4():
    print("\n[4/5] Kiểm tra Live: Sheet lưu tại chỗ file .xls cũ (Excel 97-2003)...")
    work_dir = tempfile.mkdtemp(prefix="vno_test_step4_")
    try:
        import main as vnmain
        orig_xlsx = os.path.join(ROOT, "file test", "lan", "lan11.xlsx")
        target_xls = os.path.join(work_dir, "test_lan11_legacy.xls")
        # Chuyển đổi thành .xls hợp lệ qua LibreOffice
        converted = vnmain._run_soffice_convert(orig_xlsx, "xls", work_dir, app_kind="sheet")
        shutil.move(converted, target_xls)

        edit_js = """
        (function() {
            const inst = window.__vnoAppInstance;
            if (inst && inst.adapter && inst.adapter.grid) {
                inst.adapter.grid.setCellValue("A", 1, 'VN_OFFICE_LIVE_TEST_XLS_SUCCESS');
                inst.adapter.isDirty = true;
                return true;
            }
            return false;
        })()
        """
        cmd = [sys.executable, __file__, "--internal-run", target_xls, "sheet", edit_js]
        probe = _execute_probe(cmd)

        with open(target_xls, "rb") as f:
            magic_xls = f.read(4).hex().upper()
        excel_ok, excel_msg = check_excel_cell_com(target_xls, "VN_OFFICE_LIVE_TEST_XLS_SUCCESS")

        ok = (
            probe.get("loaded")
            and not probe.get("dialog_called")
            and probe.get("save_success")
            and magic_xls == "D0CF11E0"
            and excel_ok
        )
        print(f"  • Nạp giao diện: {'PASS' if probe.get('loaded') else 'FAIL'}")
        print(f"  • Không mở hộp thoại dialog: {'PASS' if not probe.get('dialog_called') else 'FAIL'}")
        print(f"  • Lưu thành công: {'PASS' if probe.get('save_success') else 'FAIL (err: ' + str(probe.get('err')) + ')'}")
        print(f"  • Byte đầu khớp nhị phân OLE2 Excel 97-2003 (D0 CF 11 E0): {'PASS (' + magic_xls + ')' if magic_xls == 'D0CF11E0' else 'FAIL (' + magic_xls + ')'}")
        print(f"  • Excel COM mở được và có giá trị ô sửa: {'PASS' if excel_ok else 'FAIL: ' + excel_msg}")
        return ok
    finally:
        shutil.rmtree(work_dir, ignore_errors=True)


def run_step_5():
    print("\n[5/5] Kiểm tra Save As từ tài liệu mới sang .doc và .xls...")
    import main as vnmain
    work_dir = tempfile.mkdtemp(prefix="vno_test_step5_")
    try:
        # Test Save As .doc
        doc_dest = os.path.join(work_dir, "new_saved.doc")
        with tempfile.TemporaryDirectory() as tmp_save:
            html_src = os.path.join(tmp_save, "draft.html")
            with open(html_src, "w", encoding="utf-8") as f:
                f.write("<html><body><p>Van ban moi test doc</p></body></html>")
            out_doc = vnmain._run_soffice_convert(html_src, "doc", tmp_save, app_kind="writer")
            vnmain._atomic_replace_file(out_doc, doc_dest)
        with open(doc_dest, "rb") as f:
            magic_doc = f.read(4).hex().upper()
        word_ok, word_msg = check_word_text_com(doc_dest, "Van ban moi test doc")

        # Test Save As .xls
        xls_dest = os.path.join(work_dir, "new_saved.xls")
        fods_content = (
            '<?xml version="1.0" encoding="UTF-8"?>'
            '<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" '
            'xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" '
            'xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" '
            'office:version="1.3" office:mimetype="application/vnd.oasis.opendocument.spreadsheet">'
            '<office:body><office:spreadsheet><table:table table:name="Sheet1">'
            '<table:table-row><table:table-cell office:value-type="string">'
            '<text:p>Bang moi test xls</text:p>'
            '</table:table-cell></table:table-row></table:table></office:spreadsheet></office:body></office:document>'
        )
        with tempfile.TemporaryDirectory() as tmp_save:
            fods_src = os.path.join(tmp_save, "draft.fods")
            with open(fods_src, "w", encoding="utf-8") as f:
                f.write(fods_content)
            out_xls = vnmain._run_soffice_convert(fods_src, "xls", tmp_save, app_kind="sheet")
            vnmain._atomic_replace_file(out_xls, xls_dest)
        with open(xls_dest, "rb") as f:
            magic_xls = f.read(4).hex().upper()
        excel_ok, excel_msg = check_excel_cell_com(xls_dest, "Bang moi test xls")

        ok = (magic_doc == "D0CF11E0" and word_ok and magic_xls == "D0CF11E0" and excel_ok)
        print(f"  • Lưu .doc mới: Magic D0 CF 11 E0 = {'PASS (' + magic_doc + ')' if magic_doc == 'D0CF11E0' else 'FAIL'}")
        print(f"  • Word COM mở được file .doc mới: {'PASS' if word_ok else 'FAIL: ' + word_msg}")
        print(f"  • Lưu .xls mới: Magic D0 CF 11 E0 = {'PASS (' + magic_xls + ')' if magic_xls == 'D0CF11E0' else 'FAIL'}")
        print(f"  • Excel COM mở được file .xls mới: {'PASS' if excel_ok else 'FAIL: ' + excel_msg}")
        return ok
    finally:
        shutil.rmtree(work_dir, ignore_errors=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--internal-run", nargs=3, metavar=("DOC_PATH", "APP_KIND", "EDIT_JS"))
    parser.add_argument("--step", type=int, choices=[1, 2, 3, 4, 5])
    args = parser.parse_args()

    if args.internal_run:
        doc_path, app_kind, edit_js = args.internal_run
        _run_single_app_save_in_place(doc_path, app_kind, edit_js)
        return

    print("=" * 60)
    print("BẮT ĐẦU KIỂM THỬ LIVE: SAVE-IN-PLACE & TÔN TRỌNG ĐỊNH DẠNG .DOC/.XLS")
    print("=" * 60)

    steps = [run_step_1, run_step_2, run_step_3, run_step_4, run_step_5]
    if args.step:
        steps = [steps[args.step - 1]]

    results = []
    for step_fn in steps:
        res = step_fn()
        results.append(res)

    print("\n" + "=" * 60)
    all_ok = all(results)
    if all_ok:
        print(f"KẾT QUẢ KIỂM THỬ LIVE: TẤT CẢ {len(results)} BÀI TEST ĐỀU PASS 100%!")
    else:
        print(f"KẾT QUẢ KIỂM THỬ LIVE: {results.count(False)}/{len(results)} BÀI TEST THẤT BẠI!")
    print("=" * 60)

    if not all_ok:
        sys.exit(1)


if __name__ == "__main__":
    main()
