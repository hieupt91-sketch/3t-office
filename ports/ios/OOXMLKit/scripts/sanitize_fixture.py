#!/usr/bin/env python3
"""Làm sạch tệp OOXML thật → fixture NỘI DUNG GIẢ nhưng GIỮ NGUYÊN cấu trúc/tính năng, để commit được.

Thay chữ người đọc được bằng ký tự giả (chữ→X/x, số→0), giữ nguyên: cấu trúc gói, style, công thức
(cấu trúc tham chiếu), quan hệ, ảnh, biểu đồ, định dạng có điều kiện... Mục tiêu: tái tạo "góc khuất"
của Office thật (vd <font><family val="34"/>) mà KHÔNG lộ dữ liệu kinh doanh.

Dùng:  python3 scripts/sanitize_fixture.py <input.xlsx|docx|pptx> <output>
Tự KIỂM chống rò: nếu còn bất kỳ "từ" gốc (>=4 ký tự chữ-số) trong đầu ra → BÁO LỖI, không ghi.
Ảnh (media/*) bị thay bằng 1 ảnh PNG giả để không lộ hình.

GIỚI HẠN (đọc kỹ): đây là công cụ HỖ TRỢ, không bảo đảm tuyệt đối. Bộ kiểm rò ở mức "từ" nên có thể
báo nhầm từ khóa OOXML/Excel (đã có danh sách cho phép) và ngược lại có thể bỏ sót dạng mã hóa lạ.
Vì vậy: (1) tool TỪ CHỐI ghi nếu còn nghi ngờ; (2) NGƯỜI phải xem lại đầu ra trước khi commit;
(3) cách chắc chắn nhất vẫn là tạo file Office với nội dung GIẢ ngay từ đầu. Không commit đầu ra nếu chưa rà.
"""
import os, re, sys, zipfile, struct, zlib

# Phần nào được quét chữ: theo đuôi/đường dẫn.
SCRUB_TEXT_PARTS = re.compile(r"(?:document|sharedStrings|comments\d*|sheet\d+|slide\d+|notesSlide\d+|footnotes|endnotes|header\d+|footer\d+|chart\d+|item\d+|core|app|custom|workbook|table\d+|drawing\d+)\.xml$", re.I)
# Các cặp thẻ chứa chữ người đọc (giữ thuộc tính, chỉ thay nội dung).
TEXT_TAGS = ["t", "a:t", "v", "c:v", "w:t", "w:delText", "w:instrText", "w:delInstrText", "definedName", "formula1", "formula2",
             "dc:title", "dc:creator", "dc:subject", "dc:description", "cp:keywords", "cp:lastModifiedBy", "cp:category",
             "Company", "Manager", "vt:lpstr", "vt:lpwstr"]

def dummy_png():
    def chunk(t, d):
        return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xFFFFFFFF)
    raw = b"".join(b"\x00" + b"\xcc\xcc\xcc" * 8 for _ in range(8))
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", 8, 8, 8, 2, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(raw)) + chunk(b"IEND", b""))

# Từ khóa OOXML/Excel hay trùng với "chữ nhạy cảm" — bỏ qua trong bước kiểm rò (không phải dữ liệu người dùng).
ALLOW = {w.lower() for w in (
    "Microsoft Excel Word PowerPoint Office Application metadata GoBack Picture Title General Normal Hyperlink FollowedHyperlink"
    " LAMBDA ARRAYTOTEXT ARRAYTEXT TEXTAFTER TEXTBEFORE TEXTSPLIT XLOOKUP XMATCH FILTER SORT UNIQUE SEQUENCE SINGLE"
    " Calibri Arial Times Cambria Tahoma Verdana TableStyleMedium TableStyleLight PivotStyleLight SlicerStyle"
    " Worksheets Workbook Content Types Relationships"
).split()}

def scrub_char(c):
    if c.isascii():
        if c.islower(): return 'x'
        if c.isupper(): return 'X'
        if c.isdigit(): return '0'
        return c  # dấu câu, khoảng trắng giữ nguyên
    # ký tự ngoài ASCII (có dấu tiếng Việt, CJK): thay bằng 'x' để không lộ, vẫn là 1 ký tự
    return 'x' if c.isalnum() else c

def scrub_text(s):
    return ''.join(scrub_char(c) for c in s)

def scrub_xml(data: bytes) -> bytes:
    text = data.decode('utf-8', 'surrogatepass')
    for tag in TEXT_TAGS:
        # <t ...>noi dung</t>  — không đụng thẻ rỗng <t/>
        pat = re.compile(r"(<%s(?:\s[^>]*)?>)(.*?)(</%s>)" % (re.escape(tag), re.escape(tag)), re.S)
        def repl(m):
            inner = m.group(2)
            # giữ các thực thể &...; nguyên vẹn (thay phần chữ xung quanh)
            parts = re.split(r"(&[a-zA-Z#0-9]+;)", inner)
            return m.group(1) + ''.join(p if p.startswith('&') else scrub_text(p) for p in parts) + m.group(3)
        text = pat.sub(repl, text)
    return text.encode('utf-8', 'surrogatepass')

def scrub_rels(data: bytes) -> bytes:
    # Liên kết ngoài (email/URL) → example
    text = data.decode('utf-8', 'surrogatepass')
    text = re.sub(r'(Target=")(mailto:[^"]+)(")', r'\1mailto:nguoi@example.com\3', text)
    text = re.sub(r'(TargetMode="External"[^>]*Target=")([^"]+)(")',
                  lambda m: m.group(1) + ('https://example.com/' if not m.group(2).startswith('mailto:') else 'mailto:nguoi@example.com') + m.group(3), text)
    text = re.sub(r'(Target=")([^"]+)("[^>]*TargetMode="External")',
                  lambda m: m.group(1) + ('https://example.com/' if not m.group(2).startswith('mailto:') else 'mailto:nguoi@example.com') + m.group(3), text)
    return text.encode('utf-8', 'surrogatepass')

def original_tokens(z):
    toks = set()
    for n in z.namelist():
        if n.endswith('.xml') and SCRUB_TEXT_PARTS.search(n):
            raw = z.read(n).decode('utf-8','surrogatepass')
            for tag in TEXT_TAGS:
                for m in re.finditer(r"<%s(?:\s[^>]*)?>(.*?)</%s>" % (re.escape(tag), re.escape(tag)), raw, re.S):
                    for w in re.findall(r"[0-9A-Za-zÀ-ỹ]{4,}", m.group(1)):
                        if any(c.isalpha() for c in w) and w.lower() not in ALLOW:
                            toks.add(w)
            for m in re.finditer(r'(?:name|descr|displayName|alias)="([^"]*)"', raw):
                for w in re.findall(r"[0-9A-Za-zÀ-ỹ]{4,}", m.group(1)):
                    if any(c.isalpha() for c in w) and w.lower() not in ALLOW: toks.add(w)
    return toks

def main():
    if len(sys.argv) != 3:
        print(__doc__); return 2
    src, dst = sys.argv[1], sys.argv[2]
    png = dummy_png()
    with zipfile.ZipFile(src) as z:
        toks = original_tokens(z)
        out_items = []
        for info in z.infolist():
            data = z.read(info.filename)
            low = info.filename.lower()
            if '/media/' in low or low.startswith('media/'):
                if low.endswith('.png'): data = png
                elif low.endswith(('.jpg', '.jpeg')): data = png  # thay bằng png giả; đuôi giữ nguyên, đủ cho test cấu trúc
                # emf/wmf/… giữ nguyên (không phải ảnh bitmap nhận dạng được)
            elif low.endswith('.rels'):
                data = scrub_rels(data)
            elif low.endswith('.xml') and SCRUB_TEXT_PARTS.search(low):
                data = scrub_xml(data)
            out_items.append((info, data))
    # Kiểm chống rò trên toàn bộ đầu ra.
    blob = b''.join(d for _, d in out_items).decode('utf-8', 'ignore')
    leaked = sorted(t for t in toks if len(t) >= 4 and re.search(r"(?<![0-9A-Za-zÀ-ỹ])" + re.escape(t) + r"(?![0-9A-Za-zÀ-ỹ])", blob))
    if leaked:
        print("LỖI: còn %d từ gốc trong đầu ra, KHÔNG ghi tệp. Ví dụ:" % len(leaked), leaked[:10], file=sys.stderr)
        return 1
    with zipfile.ZipFile(dst, 'w', zipfile.ZIP_DEFLATED) as zo:
        for info, data in out_items:
            zi = zipfile.ZipInfo(info.filename, date_time=(1980, 1, 1, 0, 0, 0))
            zi.compress_type = zipfile.ZIP_DEFLATED
            zi.external_attr = info.external_attr
            zo.writestr(zi, data)
    print("OK: đã ghi %s (đã kiểm: 0 từ gốc rò ra; %d phần)" % (dst, len(out_items)))
    return 0

if __name__ == "__main__":
    sys.exit(main())
