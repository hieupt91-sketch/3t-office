#!/usr/bin/env python3
"""Sinh fixture XLSX giống đầu ra Excel 365 (viết tay XML, không qua thư viện nào).

Chạy: python3 scripts/fixtures/make_xlsx_fixtures.py Tests/OOXMLTestSupport/Fixtures
rich-excel.xlsx gom các tính năng mà thư viện phải GIỮ NGUYÊN khi sửa ô:
chuỗi chia sẻ có định dạng (rich text), style/numFmt/dxf, ô gộp, định dạng có điều kiện kèm x14 extLst,
xác thực dữ liệu, liên kết (ngoài + trong), chú thích (comments + VML), ảnh (drawing + media),
bảng (table), tên định nghĩa, công thức chia sẻ + mảng, calcChain, sheet ẩn, cố định ô,
mc:Ignorable + x14ac, printerSettings nhị phân, custom XML, thuộc tính tùy biến.
"""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from ooxml_common import *

OUT = sys.argv[1] if len(sys.argv) > 1 else "Tests/OOXMLTestSupport/Fixtures"
D = os.path.join(OUT, "xlsx")
os.makedirs(D, exist_ok=True)
THEME = theme_from(os.path.join(OUT, "real", "sample-sheet.xlsx"))
S = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
CT = "application/vnd.openxmlformats-officedocument.spreadsheetml."
MC = ('xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" '
      'xmlns:x14ac="http://schemas.microsoft.com/office/spreadsheetml/2009/9/ac" '
      'xmlns:xr="http://schemas.microsoft.com/office/spreadsheetml/2014/revision" mc:Ignorable="x14ac xr"')

workbook = (DECL + f'<workbook xmlns="{S}" xmlns:r="{R_NS}" '
    'xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" mc:Ignorable="x15 xr xr6 xr10 xr2" '
    'xmlns:x15="http://schemas.microsoft.com/office/spreadsheetml/2010/11/main" '
    'xmlns:xr="http://schemas.microsoft.com/office/spreadsheetml/2014/revision" '
    'xmlns:xr6="http://schemas.microsoft.com/office/spreadsheetml/2016/revision6" '
    'xmlns:xr10="http://schemas.microsoft.com/office/spreadsheetml/2016/revision10" '
    'xmlns:xr2="http://schemas.microsoft.com/office/spreadsheetml/2015/revision2">'
    '<fileVersion appName="xl" lastEdited="7" lowestEdited="7" rupBuild="27425"/>'
    '<workbookPr defaultThemeVersion="202300"/>'
    '<mc:AlternateContent xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"><mc:Choice Requires="x15">'
    '<x15ac:absPath url="C:\\Users\\ketoan\\Documents\\" xmlns:x15ac="http://schemas.microsoft.com/office/spreadsheetml/2010/11/ac"/>'
    '</mc:Choice></mc:AlternateContent>'
    '<xr:revisionPtr revIDLastSave="0" documentId="8_{3T-0001}" xr6:coauthVersionLast="47" xr6:coauthVersionMax="47" xr10:uidLastSave="{00000000-0000-0000-0000-000000000000}"/>'
    '<bookViews><workbookView xWindow="-110" yWindow="-110" windowWidth="19420" windowHeight="10300" activeTab="0" xr2:uid="{1A2B3C4D-0000-0000-0000-000000000001}"/></bookViews>'
    '<sheets><sheet name="Dữ liệu" sheetId="1" r:id="rId1"/><sheet name="Tổng hợp" sheetId="2" r:id="rId2"/>'
    '<sheet name="Ẩn" sheetId="5" state="hidden" r:id="rId3"/></sheets>'
    '<definedNames><definedName name="_xlnm.Print_Area" localSheetId="0">\'Dữ liệu\'!$A$1:$E$8</definedName>'
    '<definedName name="DuLieu">\'Dữ liệu\'!$A$1:$E$6</definedName>'
    '<definedName name="TongDoanhThu">\'Tổng hợp\'!$B$2</definedName></definedNames>'
    '<calcPr calcId="191029"/>'
    '<extLst><ext uri="{140A7094-0E35-4892-8432-C4D2E57EDEB5}" xmlns:x15="http://schemas.microsoft.com/office/spreadsheetml/2010/11/main">'
    '<x15:workbookPr chartTrackingRefBase="1"/></ext></extLst></workbook>')

wb_rels = rels([("rId1", "worksheet", "worksheets/sheet1.xml"), ("rId2", "worksheet", "worksheets/sheet2.xml"),
                ("rId3", "worksheet", "worksheets/sheet3.xml"), ("rId4", "theme", "theme/theme1.xml"),
                ("rId5", "styles", "styles.xml"), ("rId6", "sharedStrings", "sharedStrings.xml"),
                ("rId7", "calcChain", "calcChain.xml"), ("rId8", "customXml", "../customXml/item1.xml")])

# Chuỗi chia sẻ: 0..4 tiêu đề, 5 rich text, 6.. tên hàng
shared = ["Mã", "Tên hàng", "Số lượng", "Đơn giá", "Thành tiền"]
items = ["Giấy A4 Double A", "Bút bi Thiên Long", "Mực in HP 12A", "Kẹp tài liệu", "Sổ tay da"]
sst = [DECL, f'<sst xmlns="{S}" count="17" uniqueCount="12">']
for t in shared:
    sst.append(f"<si><t>{t}</t></si>")
sst.append('<si><r><rPr><b/><sz val="11"/><color rgb="FFC00000"/><rFont val="Calibri"/><family val="2"/><scheme val="minor"/></rPr>'
           '<t>Chú ý:</t></r><r><rPr><sz val="11"/><color theme="1"/><rFont val="Calibri"/><family val="2"/><scheme val="minor"/></rPr>'
           '<t xml:space="preserve"> số liệu tạm tính</t></r></si>')
for t in items:
    sst.append(f"<si><t>{t}</t></si>")
sst.append('<si><t>Ghi chú_x000D_ dòng 2</t></si>')
sst.append("</sst>")
sst = "".join(sst)

styles = (DECL + f'<styleSheet xmlns="{S}" {MC.replace("xmlns:xr=", "xmlns:x16r2=").replace("mc:Ignorable=\"x14ac xr\"", "mc:Ignorable=\"x14ac x16r2\"")}>'
    '<numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0&quot; ₫&quot;"/></numFmts>'
    '<fonts count="3" x14ac:knownFonts="1">'
    '<font><sz val="11"/><color theme="1"/><name val="Calibri"/><family val="2"/><scheme val="minor"/></font>'
    '<font><b/><sz val="11"/><color theme="1"/><name val="Calibri"/><family val="2"/><scheme val="minor"/></font>'
    '<font><u/><sz val="11"/><color theme="10"/><name val="Calibri"/><family val="2"/><scheme val="minor"/></font></fonts>'
    '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>'
    '<fill><patternFill patternType="solid"><fgColor rgb="FFDDEBF7"/><bgColor indexed="64"/></patternFill></fill></fills>'
    '<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>'
    '<border><left style="thin"><color indexed="64"/></left><right style="thin"><color indexed="64"/></right>'
    '<top style="thin"><color indexed="64"/></top><bottom style="thin"><color indexed="64"/></bottom><diagonal/></border></borders>'
    '<cellStyleXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>'
    '<xf numFmtId="0" fontId="2" fillId="0" borderId="0" applyNumberFormat="0" applyFill="0" applyBorder="0" applyAlignment="0" applyProtection="0"/></cellStyleXfs>'
    '<cellXfs count="5"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'
    '<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>'
    '<xf numFmtId="14" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>'
    '<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"><protection locked="0"/></xf>'
    '<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="1"/></cellXfs>'
    '<cellStyles count="2"><cellStyle name="Hyperlink" xfId="1" builtinId="8"/><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>'
    '<dxfs count="1"><dxf><font><color rgb="FF9C0006"/></font><fill><patternFill><bgColor rgb="FFFFC7CE"/></patternFill></fill></dxf></dxfs>'
    '<tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/>'
    '<extLst><ext uri="{EB79DEF2-80B8-43e5-95BD-54CBDDF9020C}" xmlns:x14="http://schemas.microsoft.com/office/spreadsheetml/2009/9/main">'
    '<x14:slicerStyles defaultSlicerStyle="SlicerStyleLight1"/></ext></extLst></styleSheet>')

rows = []
rows.append('<row r="1" spans="1:5" ht="30" customHeight="1" x14ac:dyDescent="0.35">' +
            ''.join(f'<c r="{c}1" s="1" t="s"><v>{i}</v></c>' for i, c in enumerate("ABCDE")) + '</row>')
qty = [500, 120, 8, 300, 25]
price = [85000, 4500, 1650000, 2000, 120000]
for k in range(5):
    r = k + 2
    f = '<f t="shared" ref="E2:E6" si="0">C2*D2</f>' if k == 0 else '<f t="shared" si="0"/>'
    rows.append(f'<row r="{r}" spans="1:5" x14ac:dyDescent="0.35"><c r="A{r}"><v>{k + 1}</v></c>'
                f'<c r="B{r}" t="s"><v>{6 + k}</v></c><c r="C{r}"><v>{qty[k]}</v></c>'
                f'<c r="D{r}" s="3"><v>{price[k]}</v></c><c r="E{r}" s="3">{f}<v>{qty[k] * price[k]}</v></c></row>')
rows.append('<row r="7" spans="1:5" x14ac:dyDescent="0.35"><c r="A7" s="2"><v>46318</v></c><c r="B7" t="b"><v>1</v></c>'
            '<c r="C7" t="e"><v>#DIV/0!</v></c><c r="D7" t="inlineStr"><is><t>Chuỗi nội tuyến</t></is></c>'
            '<c r="E7" t="str"><f>"Tổng: "&amp;TEXT(SUM(E2:E6),"#,##0")</f><v>Tổng: 59,340,000</v></c></row>')
rows.append('<row r="8" spans="1:5" x14ac:dyDescent="0.35"><c r="A8" t="s"><v>5</v></c><c r="B8" s="1"/><c r="C8" s="1"/></row>')
rows.append('<row r="10" spans="1:5" x14ac:dyDescent="0.35"><c r="A10" s="4" t="s"><v>11</v></c>'
            '<c r="C10"><f t="array" ref="C10:C11">C2:C3*2</f><v>1000</v></c></row>')
rows.append('<row r="11" spans="1:5" x14ac:dyDescent="0.35"><c r="C11"><v>240</v></c></row>')

sheet1 = (DECL + f'<worksheet xmlns="{S}" xmlns:r="{R_NS}" {MC} xmlns:x14="http://schemas.microsoft.com/office/spreadsheetml/2009/9/main" '
    'xmlns:xm="http://schemas.microsoft.com/office/excel/2006/main" xr:uid="{9A1B2C3D-0000-0000-0000-000000000001}">'
    '<sheetPr><tabColor rgb="FF00B050"/><pageSetUpPr fitToPage="1"/></sheetPr><dimension ref="A1:E11"/>'
    '<sheetViews><sheetView tabSelected="1" zoomScale="110" zoomScaleNormal="110" workbookViewId="0">'
    '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="B3" sqref="B3"/></sheetView></sheetViews>'
    '<sheetFormatPr defaultRowHeight="14.5" x14ac:dyDescent="0.35"/>'
    '<cols><col min="1" max="1" width="6.54296875" customWidth="1"/><col min="2" max="2" width="24.81640625" customWidth="1"/><col min="3" max="5" width="14.6328125" customWidth="1"/></cols>'
    '<sheetData>' + "".join(rows) + '</sheetData>'
    '<sheetProtection algorithmName="SHA-512" hashValue="qLE3cM7u1cE=" saltValue="c2FsdA==" spinCount="100000" sheet="0" objects="1" scenarios="1"/>'
    '<mergeCells count="1"><mergeCell ref="A8:C8"/></mergeCells>'
    '<conditionalFormatting sqref="E2:E6"><cfRule type="cellIs" dxfId="0" priority="2" operator="greaterThan"><formula>10000000</formula></cfRule></conditionalFormatting>'
    '<dataValidations count="1"><dataValidation type="whole" operator="between" allowBlank="1" showInputMessage="1" showErrorMessage="1" '
    'errorTitle="Sai số lượng" error="Nhập số nguyên 0–10000" sqref="C2:C6"><formula1>0</formula1><formula2>10000</formula2></dataValidation></dataValidations>'
    '<hyperlinks><hyperlink ref="A10" r:id="rId1" display="Trang 3T"/><hyperlink ref="B10" location="\'Tổng hợp\'!A1" display="Sang tổng hợp"/></hyperlinks>'
    '<pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>'
    '<pageSetup paperSize="9" orientation="landscape" r:id="rId2"/>'
    '<headerFooter><oddHeader>&amp;C&amp;"-,Bold"BẢNG KÊ VĂN PHÒNG PHẨM</oddHeader><oddFooter>&amp;RTrang &amp;P/&amp;N</oddFooter></headerFooter>'
    '<drawing r:id="rId3"/><legacyDrawing r:id="rId4"/><tableParts count="1"><tablePart r:id="rId5"/></tableParts>'
    '<extLst><ext uri="{78C0D931-6437-407d-A8EE-F0AAD7539E65}" xmlns:x14="http://schemas.microsoft.com/office/spreadsheetml/2009/9/main">'
    '<x14:conditionalFormattings><x14:conditionalFormatting xmlns:xm="http://schemas.microsoft.com/office/excel/2006/main">'
    '<x14:cfRule type="dataBar" id="{8C6D8C10-AAAA-4C35-9A9E-000000000001}"><x14:dataBar minLength="0" maxLength="100" gradient="0">'
    '<x14:cfvo type="autoMin"/><x14:cfvo type="autoMax"/><x14:negativeFillColor rgb="FFFF0000"/><x14:axisColor rgb="FF000000"/></x14:dataBar></x14:cfRule>'
    '<xm:sqref>C2:C6</xm:sqref></x14:conditionalFormatting></x14:conditionalFormattings></ext></extLst></worksheet>')

sheet1_rels = rels([("rId1", "hyperlink", "https://3t.vn/ho-tro?ma=HS%202026", True),
                    ("rId2", "printerSettings", "../printerSettings/printerSettings1.bin"),
                    ("rId3", "drawing", "../drawings/drawing1.xml"),
                    ("rId4", "vmlDrawing", "../drawings/vmlDrawing1.vml"),
                    ("rId5", "table", "../tables/table1.xml"),
                    ("rId6", "comments", "../comments1.xml")])

sheet2 = (DECL + f'<worksheet xmlns="{S}" xmlns:r="{R_NS}" {MC}><dimension ref="A1:B4"/>'
    '<sheetViews><sheetView workbookViewId="0"/></sheetViews><sheetFormatPr defaultRowHeight="14.5" x14ac:dyDescent="0.35"/>'
    '<sheetData><row r="1" spans="1:2"><c r="A1" t="s"><v>4</v></c></row>'
    '<row r="2" spans="1:2"><c r="A2" t="inlineStr"><is><t>Tổng</t></is></c><c r="B2" s="3"><f>SUM(\'Dữ liệu\'!E2:E6)</f><v>59340000</v></c></row>'
    '<row r="3" spans="1:2"><c r="A3" t="inlineStr"><is><t>Gấp đôi</t></is></c><c r="B3"><f>TongDoanhThu*2</f><v>118680000</v></c></row>'
    '<row r="4" spans="1:2"><c r="A4" t="inlineStr"><is><t>Đếm</t></is></c><c r="B4"><f>COUNTA(DuLieu)-COUNTIF(\'Dữ liệu\'!B:B,"Giấy*")+LOG10(100)</f><v>28</v></c></row>'
    '</sheetData><pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/></worksheet>')

sheet3 = (DECL + f'<worksheet xmlns="{S}" xmlns:r="{R_NS}"><dimension ref="A1"/><sheetData>'
    '<row r="1"><c r="A1" t="inlineStr"><is><t>Dữ liệu ẩn</t></is></c></row></sheetData></worksheet>')

calc = DECL + f'<calcChain xmlns="{S}"><c r="E2" i="1"/><c r="E3"/><c r="E4"/><c r="E5"/><c r="E6"/><c r="E7"/><c r="C10" a="1"/><c r="B2" i="2"/><c r="B3"/><c r="B4"/></calcChain>'

drawing = (DECL + '<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" '
    'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><xdr:twoCellAnchor editAs="oneCell">'
    '<xdr:from><xdr:col>6</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>1</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>'
    '<xdr:to><xdr:col>8</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>5</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>'
    '<xdr:pic><xdr:nvPicPr><xdr:cNvPr id="2" name="Logo 3T" descr="Logo đơn vị"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr>'
    f'<xdr:blipFill><a:blip xmlns:r="{R_NS}" r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill>'
    '<xdr:spPr><a:xfrm><a:off x="4000000" y="190500"/><a:ext cx="1219200" cy="762000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr>'
    '</xdr:pic><xdr:clientData/></xdr:twoCellAnchor></xdr:wsDr>')
drawing_rels = rels([("rId1", "image", "../media/image1.png")])

comments = (DECL + f'<comments xmlns="{S}" {MC.replace(" xmlns:x14ac=\"http://schemas.microsoft.com/office/spreadsheetml/2009/9/ac\"", "").replace("x14ac xr", "xr")} >'
    '<authors><author>Trần Thị B</author></authors><commentList>'
    '<comment ref="C4" authorId="0" shapeId="0" xr:uid="{AB12CD34-0000-0000-0000-000000000001}"><text><r><rPr><b/><sz val="9"/><color indexed="81"/><rFont val="Tahoma"/><family val="2"/></rPr>'
    '<t>Trần Thị B:</t></r><r><rPr><sz val="9"/><color indexed="81"/><rFont val="Tahoma"/><family val="2"/></rPr><t xml:space="preserve">\nKiểm tra lại tồn kho mực in</t></r></text></comment>'
    '</commentList></comments>')
vml = ('<xml xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">\r\n'
    ' <o:shapelayout v:ext="edit">\r\n  <o:idmap v:ext="edit" data="1"/>\r\n </o:shapelayout><v:shapetype id="_x0000_t202" coordsize="21600,21600" o:spt="202" path="m,l,21600r21600,l21600,xe">\r\n'
    '  <v:stroke joinstyle="miter"/>\r\n  <v:path gradientshapeok="t" o:connecttype="rect"/>\r\n </v:shapetype><v:shape id="_x0000_s1025" type="#_x0000_t202" style="position:absolute;margin-left:200pt;margin-top:30pt;width:108pt;height:59.25pt;z-index:1;visibility:hidden" fillcolor="#ffffe1" o:insetmode="auto">\r\n'
    '  <v:fill color2="#ffffe1"/>\r\n  <v:shadow on="t" color="black" obscured="t"/>\r\n  <v:path o:connecttype="none"/>\r\n  <v:textbox style="mso-direction-alt:auto"><div style="text-align:left"></div></v:textbox>\r\n'
    '  <x:ClientData ObjectType="Note">\r\n   <x:MoveWithCells/>\r\n   <x:SizeWithCells/>\r\n   <x:Anchor>3, 15, 2, 10, 5, 15, 6, 4</x:Anchor>\r\n   <x:AutoFill>False</x:AutoFill>\r\n   <x:Row>3</x:Row>\r\n   <x:Column>2</x:Column>\r\n  </x:ClientData>\r\n </v:shape></xml>')

table = (DECL + f'<table xmlns="{S}" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" mc:Ignorable="xr xr3" '
    'xmlns:xr="http://schemas.microsoft.com/office/spreadsheetml/2014/revision" xmlns:xr3="http://schemas.microsoft.com/office/spreadsheetml/2016/revision3" '
    'id="1" xr:uid="{11111111-2222-3333-4444-555555555555}" name="BangKe" displayName="BangKe" ref="A1:E6" totalsRowShown="0">'
    '<autoFilter ref="A1:E6" xr:uid="{11111111-2222-3333-4444-555555555556}"/><tableColumns count="5">'
    + "".join(f'<tableColumn id="{i + 1}" xr3:uid="{{11111111-2222-3333-4444-00000000000{i}}}" name="{n}"/>' for i, n in enumerate(shared)) +
    '</tableColumns><tableStyleInfo name="TableStyleMedium2" showFirstColumn="0" showLastColumn="0" showRowStripes="1" showColumnStripes="0"/></table>')

app = (DECL + '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" '
    'xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>Microsoft Excel</Application>'
    '<DocSecurity>0</DocSecurity><ScaleCrop>false</ScaleCrop><HeadingPairs><vt:vector size="2" baseType="variant"><vt:variant><vt:lpstr>Worksheets</vt:lpstr></vt:variant>'
    '<vt:variant><vt:i4>3</vt:i4></vt:variant></vt:vector></HeadingPairs><TitlesOfParts><vt:vector size="3" baseType="lpstr"><vt:lpstr>Dữ liệu</vt:lpstr>'
    '<vt:lpstr>Tổng hợp</vt:lpstr><vt:lpstr>Ẩn</vt:lpstr></vt:vector></TitlesOfParts><AppVersion>16.0300</AppVersion></Properties>')

cx = custom_xml_parts()
parts = [
    ("[Content_Types].xml", content_types(
        [("bin", "application/vnd.openxmlformats-officedocument.spreadsheetml.printerSettings"), ("png", "image/png"),
         ("rels", "application/vnd.openxmlformats-package.relationships+xml"), ("vml", "application/vnd.openxmlformats-officedocument.vmlDrawing"),
         ("xml", "application/xml")],
        [("/xl/workbook.xml", CT + "sheet.main+xml"), ("/xl/worksheets/sheet1.xml", CT + "worksheet+xml"),
         ("/xl/worksheets/sheet2.xml", CT + "worksheet+xml"), ("/xl/worksheets/sheet3.xml", CT + "worksheet+xml"),
         ("/xl/theme/theme1.xml", "application/vnd.openxmlformats-officedocument.theme+xml"), ("/xl/styles.xml", CT + "styles+xml"),
         ("/xl/sharedStrings.xml", CT + "sharedStrings+xml"), ("/xl/drawings/drawing1.xml", "application/vnd.openxmlformats-officedocument.drawing+xml"),
         ("/xl/tables/table1.xml", CT + "table+xml"), ("/xl/comments1.xml", CT + "comments+xml"), ("/xl/calcChain.xml", CT + "calcChain+xml"),
         ("/customXml/itemProps1.xml", "application/vnd.openxmlformats-officedocument.customXmlProperties+xml"),
         ("/docProps/core.xml", "application/vnd.openxmlformats-package.core-properties+xml"),
         ("/docProps/app.xml", "application/vnd.openxmlformats-officedocument.extended-properties+xml"),
         ("/docProps/custom.xml", "application/vnd.openxmlformats-officedocument.custom-properties+xml")])),
    ("_rels/.rels", rels([("rId3", "extended-properties", "docProps/app.xml"),
                          ("rId2", "http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties", "docProps/core.xml"),
                          ("rId1", "officeDocument", "xl/workbook.xml"), ("rId4", "custom-properties", "docProps/custom.xml")])),
    ("xl/workbook.xml", workbook), ("xl/_rels/workbook.xml.rels", wb_rels),
    ("xl/worksheets/sheet1.xml", sheet1), ("xl/worksheets/sheet2.xml", sheet2), ("xl/worksheets/sheet3.xml", sheet3),
    ("xl/worksheets/_rels/sheet1.xml.rels", sheet1_rels), ("xl/theme/theme1.xml", THEME), ("xl/styles.xml", styles),
    ("xl/sharedStrings.xml", sst), ("xl/drawings/drawing1.xml", drawing), ("xl/drawings/_rels/drawing1.xml.rels", drawing_rels),
    ("xl/drawings/vmlDrawing1.vml", vml), ("xl/comments1.xml", comments), ("xl/tables/table1.xml", table),
    ("xl/printerSettings/printerSettings1.bin", bytes(range(256)) * 8), ("xl/media/image1.png", png(16, 10)),
    ("xl/calcChain.xml", calc), ("docProps/core.xml", core_props("Bảng kê văn phòng phẩm")), ("docProps/app.xml", app),
    ("docProps/custom.xml", custom_props()),
] + list(cx.items())
write_package(os.path.join(D, "rich-excel.xlsx"), parts)

# Biến thể tiền tố x: (OpenXML SDK) + hàng/ô không có thuộc tính r.
X = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
def minimal(path, sheet_xml, wb_ns_prefix=True, ns=X):
    p = "x:" if wb_ns_prefix else ""
    decl_ns = f'xmlns:x="{ns}"' if wb_ns_prefix else f'xmlns="{ns}"'
    wb = (DECL + f'<{p}workbook {decl_ns} xmlns:r="{R_NS}"><{p}sheets><{p}sheet name="Sheet1" sheetId="1" r:id="rId1"/></{p}sheets></{p}workbook>')
    st = (DECL + f'<{p}styleSheet {decl_ns}><{p}fonts count="1"><{p}font><{p}sz val="11"/><{p}name val="Calibri"/></{p}font></{p}fonts>'
          f'<{p}fills count="2"><{p}fill><{p}patternFill patternType="none"/></{p}fill><{p}fill><{p}patternFill patternType="gray125"/></{p}fill></{p}fills>'
          f'<{p}borders count="1"><{p}border/></{p}borders><{p}cellStyleXfs count="1"><{p}xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></{p}cellStyleXfs>'
          f'<{p}cellXfs count="1"><{p}xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></{p}cellXfs></{p}styleSheet>')
    write_package(path, [
        ("[Content_Types].xml", content_types([("rels", "application/vnd.openxmlformats-package.relationships+xml"), ("xml", "application/xml")],
            [("/xl/workbook.xml", CT + "sheet.main+xml"), ("/xl/worksheets/sheet1.xml", CT + "worksheet+xml"), ("/xl/styles.xml", CT + "styles+xml")])),
        ("_rels/.rels", rels([("rId1", "officeDocument", "xl/workbook.xml")])),
        ("xl/workbook.xml", wb),
        ("xl/_rels/workbook.xml.rels", rels([("rId1", "worksheet", "worksheets/sheet1.xml"), ("rId2", "styles", "styles.xml")])),
        ("xl/styles.xml", st), ("xl/worksheets/sheet1.xml", sheet_xml)])

minimal(os.path.join(D, "prefixed-x.xlsx"),
        DECL + f'<x:worksheet xmlns:x="{X}"><x:sheetData><x:row r="1"><x:c r="A1" t="inlineStr"><x:is><x:t>Tiền tố x</x:t></x:is></x:c>'
        '<x:c r="B1"><x:v>42</x:v></x:c></x:row></x:sheetData></x:worksheet>')
minimal(os.path.join(D, "implicit-refs.xlsx"),
        DECL + f'<worksheet xmlns="{X}"><sheetData><row><c><v>1</v></c><c><v>2</v></c><c t="inlineStr"><is><t>ba</t></is></c></row>'
        '<row><c><v>4</v></c></row><row r="5"><c r="C5"><v>9</v></c></row></sheetData></worksheet>', wb_ns_prefix=False)
SX = "http://purl.oclc.org/ooxml/spreadsheetml/main"
minimal(os.path.join(D, "strict.xlsx"),
        DECL + f'<worksheet xmlns="{SX}"><sheetData><row r="1"><c r="A1"><v>3.5</v></c></row></sheetData></worksheet>',
        wb_ns_prefix=False, ns=SX)
print("XLSX fixtures written to", D)
