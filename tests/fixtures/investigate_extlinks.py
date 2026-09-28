"""
Script điều tra behavior của VN Sheet khi mở XLSX có external links.

Kịch bản:
- A-extlinks.xlsx: A1 = [1]Sheet1!A1 (cache=10), A2 = SUM('[1]Sheet1'!A1:A3) (cache=60)
- LibreOffice khi convert XLSX→FODS sẽ:
  + Convert công thức [N] dạng index sang dạng file:// URL
  + Có thể giữ/xóa cached values
  + Không giữ xl/externalLinks/ (FODS không có khái niệm này)

Script này mô phỏng FODS output điển hình của LibreOffice để kiểm tra:
1. Các hàm _formulaFromOdf có xử lý đúng URL ngoài không?
2. overlay_sheet_xlsx_fods có restore công thức/cache không?

Ghi kết quả vào docs/HANDOFF-SHEET-EXTLINKS-FINDINGS.md.
"""

import sys
import os
import zipfile

# Add project root to path
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, PROJECT_ROOT)

FIXTURE_DIR = os.path.join(PROJECT_ROOT, "tests", "fixtures")
A_XLSX = os.path.join(FIXTURE_DIR, "A-extlinks.xlsx")

# ============================================================================
# 1. Kiểm tra cấu trúc file A-extlinks.xlsx tự tạo
# ============================================================================
print("=== 1. Cấu trúc file A-extlinks.xlsx ===")
with zipfile.ZipFile(A_XLSX, "r") as zf:
    print("Files trong ZIP:")
    for name in sorted(zf.namelist()):
        print(f"  {name}")
    
    print("\n--- xl/workbook.xml ---")
    print(zf.read("xl/workbook.xml").decode("utf-8", errors="replace"))
    
    print("\n--- xl/_rels/workbook.xml.rels ---")
    print(zf.read("xl/_rels/workbook.xml.rels").decode("utf-8", errors="replace"))
    
    print("\n--- xl/worksheets/sheet1.xml ---")
    print(zf.read("xl/worksheets/sheet1.xml").decode("utf-8", errors="replace"))
    
    print("\n--- xl/externalLinks/externalLink1.xml ---")
    print(zf.read("xl/externalLinks/externalLink1.xml").decode("utf-8", errors="replace"))
    
    print("\n--- xl/externalLinks/_rels/externalLink1.xml.rels ---")
    print(zf.read("xl/externalLinks/_rels/externalLink1.xml.rels").decode("utf-8", errors="replace"))

# ============================================================================
# 2. Mô phỏng FODS output của LibreOffice (dựa trên kiến thức ODF)
# ============================================================================
# LibreOffice khi convert XLSX có external link [1]Sheet1!A1:
# - Công thức `[1]Sheet1!A1` → `of:=['file:///path/B.xlsx'#$Sheet1.$A$1]`
# - Công thức `SUM('[1]Sheet1'!A1:A3)` → `of:=SUM(['file:///path/B.xlsx'#$Sheet1.$A$1:$Sheet1.$A$3])`  
# - Cached values: soffice thường GIỮ lại trong office:value
# NOTE: Đây là mô phỏng dựa trên spec ODF và behavior LibreOffice đã biết.
# Cần chạy soffice thực tế để xác nhận chính xác.

SIMULATED_FODS = """<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"
  xmlns:of="urn:oasis:names:tc:opendocument:xmlns:of:1.2">
  <office:body>
    <office:spreadsheet>
      <table:table table:name="Sheet1">
        <table:table-row>
          <table:table-cell office:value-type="float" office:value="10"
            table:formula="of:=[&apos;file:///D:/test/B.xlsx&apos;#$Sheet1.$A$1]">
            <text:p>10</text:p>
          </table:table-cell>
          <table:table-cell office:value-type="string">
            <text:p>Kiểm tra</text:p>
          </table:table-cell>
        </table:table-row>
        <table:table-row>
          <table:table-cell office:value-type="float" office:value="60"
            table:formula="of:=SUM([&apos;file:///D:/test/B.xlsx&apos;#$Sheet1.$A$1:$Sheet1.$A$3])">
            <text:p>60</text:p>
          </table:table-cell>
        </table:table-row>
      </table:table>
    </office:spreadsheet>
  </office:body>
</office:document>"""

# ============================================================================
# 3. Test _formulaFromOdf với external link patterns
# ============================================================================
print("\n=== 3. Test _formulaFromOdf với external link ODF ===")

import re

def _formula_from_odf_current(formula):
    """Current implementation (từ sheet-adapter.js, dịch sang Python để test)."""
    if not formula:
        return ""
    expression = re.sub(r'^of:=', '=', formula, flags=re.IGNORECASE)
    
    def replace_bracket(m):
        reference = m.group(1)
        parts = reference.split(":")
        result_parts = []
        for part in parts:
            if part.startswith("."):
                result_parts.append(part[1:])
            else:
                match = re.match(r'^\$((?:\'[^\']+\'|[^.]+))\.(.+)$', part)
                if match:
                    result_parts.append(f"{match.group(1)}!{match.group(2)}")
                else:
                    result_parts.append(part)
        # Whole-column range check
        if len(result_parts) == 2:
            first = re.match(r'^((?:\'[^\']+\'|[^!]+)!)?(\$?[A-Z]{1,3})\$?1$', result_parts[0])
            second = re.match(r'^((?:\'[^\']+\'|[^!]+)!)?(\$?[A-Z]{1,3})\$?1048576$', result_parts[1])
            if first and second:
                return f"{first.group(1) or ''}{first.group(2)}:{second.group(2)}"
        return ":".join(result_parts)
    
    expression = re.sub(r'\[([^\]]+)\]', replace_bracket, expression)
    return expression

# Test cases dựa trên LibreOffice ODF output
test_cases = [
    # (input ODF formula, expected Excel formula)
    ("of:=[.A1]", "=A1"),
    ("of:=[.$Sheet1.$A$1]", "=Sheet1!$A$1"),
    ("of:=SUM([.A1:.A3])", "=SUM(A1:A3)"),
    # External link - LibreOffice style (FILE URL)
    ("of:=['file:///D:/test/B.xlsx'#$Sheet1.$A$1]", "=?"),  # Unknown behavior
    ("of:=SUM(['file:///D:/test/B.xlsx'#$Sheet1.$A$1:$Sheet1.$A$3])", "=?"),  # Unknown
]

for odf, expected in test_cases:
    result = _formula_from_odf_current(odf)
    status = "✓" if result == expected else "?"
    print(f"  {status} Input:  {odf}")
    print(f"    Result: {result}")
    print(f"    Expect: {expected}")
    print()

# ============================================================================
# 4. Phân tích: _formulaFromOdf hiện tại xử lý external URL thế nào?
# ============================================================================
print("=== 4. Phân tích external link formula conversion ===")

# LibreOffice ODF external link format:
# ['file:///D:/test/B.xlsx'#$Sheet1.$A$1]
# 
# _formulaFromOdf hiện tại:
# - reference = "'file:///D:/test/B.xlsx'#$Sheet1.$A$1"
# - split(":") → ["'file", "///D", "/test/B.xlsx'#$Sheet1.$A$1"]  SACH! SAI!
# - Đây là BUG: split(":") cắt ở dấu ":" trong "file://"!

sample_odf_ref = "'file:///D:/test/B.xlsx'#$Sheet1.$A$1"
print(f"Reference: {sample_odf_ref}")
print(f"split(':'): {sample_odf_ref.split(':')}")
print()
print("PHÁT HIỆN: split(':') cắt sai tại 'file://' và đường dẫn Windows 'D:'")
print("Cần fix để nhận dạng external link URL và convert sang dạng Excel [B.xlsx]Sheet1!A1")

# ============================================================================
# 5. Kết luận
# ============================================================================
print("\n=== 5. Kết luận điều tra ===")
print("""
FINDINGS (mô phỏng - chưa có soffice):
A. Behavior dự kiến khi mở A-extlinks.xlsx:
   - LibreOffice convert công thức [1]Sheet1!A1 → ODF file URL format
   - Cache values (10, 60) GIỮ lại trong office:value (soffice thường không xóa)
   - Công thức hiển thị trong VN Sheet sẽ là dạng file:// URL (SAI so với Excel)
   - Thanh công thức hiển thị sai (file URL thay vì [B.xlsx]Sheet1!A1)

B. Vấn đề cần sửa:
   1. _formulaFromOdf: không xử lý đúng external link URL dạng ODF
      - Bug: split(':') cắt sai tại 'file://'
      - Fix: detect external link pattern và convert sang [B.xlsx]Sheet1!A1
   2. overlay_sheet_xlsx_fods: cần overlay external formulas khi MỞ file
      - Dùng vno:formula để lưu công thức Excel gốc (đã có cơ chế này)
   3. UI: cần thanh cảnh báo "File có liên kết ngoài" khi mở
   4. JS: hasExternalLinks flag từ Python

C. Behavior khi lưu (đã implement):
   - _preserve_external_links đã copy externalLinks/ từ source XLSX
   - Nếu file mở bằng File→Mở (có source), lưu sẽ giữ nguyên externalLinks
   - Nhưng formula text trong sheet XML cần đúng dạng [1]Sheet1!A1

D. Yêu cầu kiểm chứng:
   - Cần chạy soffice thực tế để xác nhận behavior
   - Cần kiểm tra Excel COM round-trip
""")
