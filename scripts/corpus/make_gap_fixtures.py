#!/usr/bin/env python3
"""Lấp ô trống của corpus: XLSX có biểu đồ + công thức + tiếng Việt; DOCX có biểu đồ + công thức toán (OMML) + tiếng Việt.
SYNTHETIC — viết tay XML tối giản, KHÔNG phải do Microsoft Office tạo. Chỉ thư viện chuẩn.
Dùng: make_gap_fixtures.py <thư-mục-gốc-fixture>   (ghi <gốc>/xlsx/gap-chart-vi.xlsx, <gốc>/docx/gap-chart-math-vi.docx)
"""
import os, sys, zipfile
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "ports", "ios", "OOXMLKit", "scripts", "fixtures"))
from ooxml_common import DECL, rels

OUT = sys.argv[1]
C = "http://schemas.openxmlformats.org/drawingml/2006/chart"
A = "http://schemas.openxmlformats.org/drawingml/2006/main"
CT_HEAD = DECL + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>'

def write(path, parts):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
        for n, d in parts:  # thời gian cố định → tất định
            zi = zipfile.ZipInfo(n, (2020, 1, 1, 0, 0, 0)); zi.compress_type = zipfile.ZIP_DEFLATED
            z.writestr(zi, d.encode("utf-8") if isinstance(d, str) else d)

def chart_xml(sheet=None):
    ref = lambda col: f'<c:f>{sheet}!${col}$2:${col}$4</c:f>' if sheet else ''
    cats = ["Hà Nội", "Đà Nẵng", "TP. Hồ Chí Minh"]; vals = [120, 95.5, 210]
    cat = '<c:cat><c:strRef>' + ref("A") + '<c:strCache><c:ptCount val="3"/>' + "".join(f'<c:pt idx="{i}"><c:v>{c}</c:v></c:pt>' for i, c in enumerate(cats)) + '</c:strCache></c:strRef></c:cat>'
    val = '<c:val><c:numRef>' + ref("B") + '<c:numCache><c:formatCode>General</c:formatCode><c:ptCount val="3"/>' + "".join(f'<c:pt idx="{i}"><c:v>{v}</c:v></c:pt>' for i, v in enumerate(vals)) + '</c:numCache></c:numRef></c:val>'
    if not sheet:  # biểu đồ nhúng DOCX: dùng literal (không có workbook nhúng)
        cat = cat.replace("strRef", "strLit").replace("<c:strCache>", "").replace("</c:strCache>", "")
        val = val.replace("numRef", "numLit").replace("<c:numCache>", "").replace("</c:numCache>", "")
    return (DECL + f'<c:chartSpace xmlns:c="{C}" xmlns:a="{A}"><c:chart><c:title><c:tx><c:rich><a:bodyPr/><a:p><a:r><a:t>Doanh thu theo chi nhánh</a:t></a:r></a:p></c:rich></c:tx></c:title>'
            '<c:plotArea><c:barChart><c:barDir val="col"/><c:grouping val="clustered"/><c:ser><c:idx val="0"/><c:order val="0"/>' + cat + val +
            '</c:ser><c:axId val="111"/><c:axId val="222"/></c:barChart><c:catAx><c:axId val="111"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="b"/><c:crossAx val="222"/></c:catAx>'
            '<c:valAx><c:axId val="222"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="l"/><c:crossAx val="111"/></c:valAx></c:plotArea><c:plotVisOnly val="1"/></c:chart></c:chartSpace>')

def make_xlsx():
    ns = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"'
    sheet = (DECL + f'<worksheet {ns}><sheetData>'
        '<row r="1"><c r="A1" t="inlineStr"><is><t>Chi nhánh</t></is></c><c r="B1" t="inlineStr"><is><t>Doanh thu (triệu đồng)</t></is></c></row>'
        '<row r="2"><c r="A2" t="inlineStr"><is><t>Hà Nội</t></is></c><c r="B2"><v>120</v></c></row>'
        '<row r="3"><c r="A3" t="inlineStr"><is><t>Đà Nẵng</t></is></c><c r="B3"><v>95.5</v></c></row>'
        '<row r="4"><c r="A4" t="inlineStr"><is><t>TP. Hồ Chí Minh</t></is></c><c r="B4"><v>210</v></c></row>'
        '<row r="5"><c r="A5" t="inlineStr"><is><t>Tổng</t></is></c><c r="B5"><f>SUM(B2:B4)</f><v>425.5</v></c></row>'
        '</sheetData><drawing r:id="rId1"/></worksheet>')
    drawing = (DECL + f'<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="{A}" xmlns:c="{C}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
        '<xdr:twoCellAnchor><xdr:from><xdr:col>3</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>0</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:to><xdr:col>10</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>15</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>'
        '<xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="2" name="Biểu đồ 1"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr><xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm>'
        f'<a:graphic><a:graphicData uri="{C}"><c:chart r:id="rId1"/></a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor></xdr:wsDr>')
    write(os.path.join(OUT, "xlsx", "gap-chart-vi.xlsx"), [
        ("[Content_Types].xml", CT_HEAD + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/><Override PartName="/xl/charts/chart1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/></Types>'),
        ("_rels/.rels", rels([("rId1", "officeDocument", "xl/workbook.xml")])),
        ("xl/workbook.xml", DECL + f'<workbook {ns}><sheets><sheet name="Doanh thu" sheetId="1" r:id="rId1"/></sheets></workbook>'),
        ("xl/_rels/workbook.xml.rels", rels([("rId1", "worksheet", "worksheets/sheet1.xml"), ("rId2", "styles", "styles.xml")])),
        ("xl/styles.xml", DECL + '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs></styleSheet>'),
        ("xl/worksheets/sheet1.xml", sheet),
        ("xl/worksheets/_rels/sheet1.xml.rels", rels([("rId1", "drawing", "../drawings/drawing1.xml")])),
        ("xl/drawings/drawing1.xml", drawing),
        ("xl/drawings/_rels/drawing1.xml.rels", rels([("rId1", "chart", "../charts/chart1.xml")])),
        ("xl/charts/chart1.xml", chart_xml("'Doanh thu'")),
    ])

def make_docx():
    W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
    body = ('<w:p><w:r><w:t>Báo cáo quý — Tiếng Việt: ắằẳẵặ ếềểễệ ơờởỡợ ưừửữự</w:t></w:r></w:p>'
        f'<m:oMathPara><m:oMath><m:r><m:t>E=mc</m:t></m:r><m:sSup><m:e><m:r><m:t></m:t></m:r></m:e><m:sup><m:r><m:t>2</m:t></m:r></m:sup></m:sSup></m:oMath></m:oMathPara>'
        '<w:p><w:r><w:drawing><wp:inline><wp:extent cx="4572000" cy="2743200"/><wp:docPr id="1" name="Biểu đồ 1"/><a:graphic><a:graphicData uri="' + C + '"><c:chart r:id="rId2"/></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>'
        '<w:sectPr/>')
    doc = (DECL + f'<w:document xmlns:w="{W}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="{A}" xmlns:c="{C}"><w:body>{body}</w:body></w:document>')
    write(os.path.join(OUT, "docx", "gap-chart-math-vi.docx"), [
        ("[Content_Types].xml", CT_HEAD + '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/charts/chart1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/></Types>'),
        ("_rels/.rels", rels([("rId1", "officeDocument", "word/document.xml")])),
        ("word/document.xml", doc),
        ("word/_rels/document.xml.rels", rels([("rId1", "styles", "styles.xml"), ("rId2", "chart", "charts/chart1.xml")])),
        ("word/styles.xml", DECL + f'<w:styles xmlns:w="{W}"><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>'),
        ("word/charts/chart1.xml", chart_xml()),
    ])

make_xlsx(); make_docx()
