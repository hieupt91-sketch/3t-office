"""Tiện ích chung cho các script sinh fixture OOXML (chỉ thư viện chuẩn)."""
import struct, zipfile, zlib

DECL = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n'
R_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/"


def png(width=4, height=3, rgb=(0x1F, 0x6F, 0xD0)):
    """Ảnh PNG hợp lệ tối giản."""
    def chunk(t, d):
        return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xFFFFFFFF)
    raw = b"".join(b"\x00" + bytes(rgb) * width for _ in range(height))
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(raw)) + chunk(b"IEND", b""))


def rels(items):
    """items: list of (id, type-suffix-or-full-uri, target[, external])"""
    out = [DECL, '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">']
    for it in items:
        rid, typ, target = it[0], it[1], it[2]
        if not typ.startswith("http"):
            typ = REL + typ
        ext = ' TargetMode="External"' if len(it) > 3 and it[3] else ""
        out.append(f'<Relationship Id="{rid}" Type="{typ}" Target="{target}"{ext}/>')
    out.append("</Relationships>")
    return "".join(out)


def content_types(defaults, overrides):
    out = [DECL, '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">']
    for ext, ct in defaults:
        out.append(f'<Default Extension="{ext}" ContentType="{ct}"/>')
    for part, ct in overrides:
        out.append(f'<Override PartName="{part}" ContentType="{ct}"/>')
    out.append("</Types>")
    return "".join(out)


def core_props(title, creator="Phòng Kế toán 3T"):
    return (DECL + '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" '
            'xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" '
            'xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">'
            f'<dc:title>{title}</dc:title><dc:creator>{creator}</dc:creator><cp:lastModifiedBy>{creator}</cp:lastModifiedBy>'
            '<dcterms:created xsi:type="dcterms:W3CDTF">2026-10-01T08:00:00Z</dcterms:created>'
            '<dcterms:modified xsi:type="dcterms:W3CDTF">2026-10-20T10:15:00Z</dcterms:modified></cp:coreProperties>')


def custom_props():
    return (DECL + '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/custom-properties" '
            'xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">'
            '<property fmtid="{D5CDD505-2E9C-101B-9397-08002B2CF9AE}" pid="2" name="MaHoSo"><vt:lpwstr>HS-2026-0042</vt:lpwstr></property>'
            '<property fmtid="{D5CDD505-2E9C-101B-9397-08002B2CF9AE}" pid="3" name="DaDuyet"><vt:bool>true</vt:bool></property>'
            '</Properties>')


def custom_xml_parts(prefix_rel_target="../customXml/item1.xml"):
    item = DECL + '<hoSo xmlns="urn:3t:hoso"><ma>HS-2026-0042</ma><nguoiKy>Nguyễn Văn A</nguoiKy></hoSo>'
    props = (DECL + '<ds:datastoreItem ds:itemID="{6E3F1C2A-1111-4C3B-9D21-000000000001}" '
             'xmlns:ds="http://schemas.openxmlformats.org/officeDocument/2006/customXml"><ds:schemaRefs/></ds:datastoreItem>')
    item_rels = rels([("rId1", "customXmlProps", "itemProps1.xml")])
    return {"customXml/item1.xml": item, "customXml/itemProps1.xml": props, "customXml/_rels/item1.xml.rels": item_rels}


def write_package(path, parts):
    """parts: list of (name, str|bytes). [Content_Types].xml phải đứng đầu như Office."""
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as zf:
        for name, data in parts:
            zi = zipfile.ZipInfo(name, date_time=(1980, 1, 1, 0, 0, 0))
            zi.compress_type = zipfile.ZIP_DEFLATED
            zf.writestr(zi, data.encode("utf-8") if isinstance(data, str) else data)


def theme_from(path):
    """Lấy theme1.xml thật từ fixture LibreOffice có sẵn để không phải viết tay."""
    with zipfile.ZipFile(path) as z:
        for n in z.namelist():
            if n.endswith("theme/theme1.xml"):
                return z.read(n)
    raise RuntimeError("no theme in " + path)
