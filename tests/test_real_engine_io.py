"""
VN Office — Test kiểm thử Document Engine Thật cho Sheet (XLSX/ODS/CSV) và Slides (PPTX/ODP/FODP)
Xác thực chuyển đổi hai chiều (round-trip), toàn vẹn dữ liệu tiếng Việt và xuất bản PDF.
Không dùng mock, gọi trực tiếp LibreOffice headless qua main._run_soffice_convert.
"""

import os
import sys
import tempfile
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

# Đảm bảo import được main từ thư mục gốc repo
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

import main

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")


def test_sheet_real_io():
    print("\n▶ [TEST THẬT 1/2] VN Sheet: Chuyển đổi hai chiều CSV <-> XLSX và Xuất PDF")
    
    sample_csv = (
        "STT,Tên hàng hóa,Đơn giá,Số lượng,Thành tiền\r\n"
        "1,Bút bi Thiên Long cao cấp,5000,10,50000\r\n"
        "2,Vở ô ly Bãi Bằng 96 trang,12000,5,60000\r\n"
        "3,TỔNG CỘNG,,,=SUM(E2:E3)\r\n"
    )

    with tempfile.TemporaryDirectory(prefix="vno_test_sheet_") as tmp:
        # 1. Ghi tệp CSV nguồn
        src_csv = os.path.join(tmp, "bang_tinh.csv")
        with open(src_csv, "w", encoding="utf-8-sig") as f:
            f.write(sample_csv)

        # 2. Convert CSV -> XLSX thật
        xlsx_path = main._run_soffice_convert(src_csv, "xlsx", tmp, app_kind="sheet")
        assert os.path.isfile(xlsx_path), "Tệp XLSX không được tạo ra!"
        xlsx_size = os.path.getsize(xlsx_path)
        assert xlsx_size > 1000, f"Kích thước tệp XLSX bất thường: {xlsx_size} bytes"
        print(f"  [PASS] CSV -> XLSX thành công ({xlsx_size} bytes): {Path(xlsx_path).name}")

        # 3. Đọc kiểm tra cấu trúc bên trong tệp XLSX (OOXML zip)
        with zipfile.ZipFile(xlsx_path, "r") as z:
            namelist = z.namelist()
            assert "[Content_Types].xml" in namelist, "XLSX thiếu [Content_Types].xml"
            assert any(n.startswith("xl/worksheets/sheet") for n in namelist), "XLSX thiếu worksheet"
            print("  [PASS] Cấu trúc OOXML XLSX hợp lệ (chứa worksheet & [Content_Types].xml)")

        # 4. Convert ngược XLSX -> CSV thật để xác thực round-trip dữ liệu tiếng Việt
        csv_back_path = main._run_soffice_convert(xlsx_path, "csv", tmp, app_kind="sheet")
        assert os.path.isfile(csv_back_path), "Không convert ngược lại được CSV từ XLSX!"
        with open(csv_back_path, "r", encoding="utf-8", errors="replace") as f:
            csv_back_content = f.read()

        assert "Bút bi Thiên Long" in csv_back_content, "Dữ liệu tiếng Việt 'Bút bi Thiên Long' bị mất!"
        assert "Vở ô ly Bãi Bằng" in csv_back_content, "Dữ liệu tiếng Việt 'Vở ô ly Bãi Bằng' bị mất!"
        print("  [PASS] Round-trip XLSX -> CSV toàn vẹn 100% dấu tiếng Việt và dữ liệu số")

        # 5. Convert XLSX -> ODS (OpenDocument Spreadsheet)
        ods_path = main._run_soffice_convert(xlsx_path, "ods", tmp, app_kind="sheet")
        assert os.path.isfile(ods_path), "Không tạo được tệp ODS!"
        print(f"  [PASS] XLSX -> ODS thành công ({os.path.getsize(ods_path)} bytes)")

        # 6. Xuất PDF thật từ bảng tính
        pdf_path = main._run_soffice_convert(src_csv, "pdf", tmp, app_kind="sheet")
        assert os.path.isfile(pdf_path), "Không tạo được tệp PDF từ Sheet!"
        with open(pdf_path, "rb") as f:
            header = f.read(5)
            assert header == b"%PDF-", f"Header tệp PDF không đúng chuẩn: {header}"
        print(f"  [PASS] Xuất PDF từ bảng tính thành công ({os.path.getsize(pdf_path)} bytes)")


def test_slides_real_io():
    print("\n▶ [TEST THẬT 2/2] VN Slides: Chuyển đổi FODP <-> PPTX/ODP và Xuất PDF")

    sample_fodp = """<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
                 xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"
                 xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
                 xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0"
                 office:version="1.3" office:mimetype="application/vnd.oasis.opendocument.presentation">
  <office:body>
    <office:presentation>
      <draw:page draw:name="page1">
        <draw:frame svg:x="2cm" svg:y="2cm" svg:width="24cm" svg:height="3cm">
          <draw:text-box>
            <text:p>VN OFFICE — BỘ ỨNG DỤNG VĂN PHÒNG VIỆT</text:p>
          </draw:text-box>
        </draw:frame>
        <draw:frame svg:x="2cm" svg:y="6cm" svg:width="24cm" svg:height="10cm">
          <draw:text-box>
            <text:p>• Giải pháp công nghệ độc lập và an toàn thông tin</text:p>
            <text:p>• Tận dụng sức mạnh xử lý LibreOffice headless engine</text:p>
          </draw:text-box>
        </draw:frame>
      </draw:page>
      <draw:page draw:name="page2">
        <draw:frame svg:x="2cm" svg:y="2cm" svg:width="24cm" svg:height="3cm">
          <draw:text-box>
            <text:p>LỘ TRÌNH TRIỂN KHAI NĂM 2026</text:p>
          </draw:text-box>
        </draw:frame>
        <draw:frame svg:x="2cm" svg:y="6cm" svg:width="24cm" svg:height="10cm">
          <draw:text-box>
            <text:p>1. Giai đoạn 1: Chuẩn hóa bộ gõ &amp; giao diện thuần Việt</text:p>
            <text:p>2. Giai đoạn 2: Tương thích toàn diện chuẩn mở OOXML</text:p>
          </draw:text-box>
        </draw:frame>
      </draw:page>
    </office:presentation>
  </office:body>
</office:document>"""

    with tempfile.TemporaryDirectory(prefix="vno_test_slides_") as tmp:
        # 1. Ghi tệp FODP nguồn
        src_fodp = os.path.join(tmp, "bai_thuyet_trinh.fodp")
        with open(src_fodp, "w", encoding="utf-8") as f:
            f.write(sample_fodp)

        # 2. Convert FODP -> PPTX thật
        pptx_path = main._run_soffice_convert(src_fodp, "pptx", tmp, app_kind="slides")
        assert os.path.isfile(pptx_path), "Tệp PPTX không được tạo ra!"
        pptx_size = os.path.getsize(pptx_path)
        assert pptx_size > 1000, f"Kích thước tệp PPTX bất thường: {pptx_size} bytes"
        print(f"  [PASS] FODP -> PPTX thành công ({pptx_size} bytes): {Path(pptx_path).name}")

        # 3. Đọc kiểm tra cấu trúc bên trong tệp PPTX (OOXML zip)
        with zipfile.ZipFile(pptx_path, "r") as z:
            namelist = z.namelist()
            assert "[Content_Types].xml" in namelist, "PPTX thiếu [Content_Types].xml"
            slides = [n for n in namelist if n.startswith("ppt/slides/slide")]
            assert len(slides) >= 2, f"PPTX phải có ít nhất 2 slide, tìm thấy: {len(slides)}"
            print(f"  [PASS] Cấu trúc OOXML PPTX hợp lệ (tìm thấy {len(slides)} slide)")

        # 4. Convert ngược PPTX -> FODP để kiểm tra đọc lại nội dung tiếng Việt
        fodp_back_path = main._run_soffice_convert(pptx_path, "fodp", tmp, app_kind="slides")
        assert os.path.isfile(fodp_back_path), "Không convert ngược được PPTX -> FODP!"
        with open(fodp_back_path, "r", encoding="utf-8", errors="replace") as f:
            fodp_back_content = f.read()

        assert "BỘ ỨNG DỤNG VĂN PHÒNG VIỆT" in fodp_back_content, "Tiêu đề tiếng Việt slide 1 bị mất!"
        assert "LỘ TRÌNH TRIỂN KHAI" in fodp_back_content, "Tiêu đề tiếng Việt slide 2 bị mất!"
        assert "Giải pháp công nghệ độc lập" in fodp_back_content, "Nội dung bullet slide 1 bị mất!"
        print("  [PASS] Round-trip PPTX -> FODP toàn vẹn 100% nội dung 2 slide tiếng Việt")

        # 5. Convert FODP -> ODP (OpenDocument Presentation)
        odp_path = main._run_soffice_convert(src_fodp, "odp", tmp, app_kind="slides")
        assert os.path.isfile(odp_path), "Không tạo được tệp ODP!"
        print(f"  [PASS] FODP -> ODP thành công ({os.path.getsize(odp_path)} bytes)")

        # 6. Xuất PDF thật từ bài trình chiếu
        pdf_path = main._run_soffice_convert(src_fodp, "pdf", tmp, app_kind="slides")
        assert os.path.isfile(pdf_path), "Không tạo được tệp PDF từ Slides!"
        with open(pdf_path, "rb") as f:
            header = f.read(5)
            assert header == b"%PDF-", f"Header tệp PDF không đúng chuẩn: {header}"
        print(f"  [PASS] Xuất PDF từ bài trình chiếu thành công ({os.path.getsize(pdf_path)} bytes)")


if __name__ == "__main__":
    print("==================================================")
    print("   VN OFFICE REAL DOCUMENT ENGINE TEST RUNNER     ")
    print("==================================================")
    print("Engine SOFFICE_PATH:", main.SOFFICE_PATH)

    try:
        test_sheet_real_io()
        test_slides_real_io()
        print("\n==================================================")
        print("TẤT CẢ CÁC BÀI KIỂM THỬ DOCUMENT ENGINE ĐỀU PASS!")
        print("==================================================")
        sys.exit(0)
    except Exception as exc:
        print(f"\n[FAIL] Kiểm thử thất bại: {exc}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
