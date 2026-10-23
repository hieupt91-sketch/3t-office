#!/usr/bin/env python3
"""Sinh fixture DOCX giống đầu ra Word 365 (viết tay XML).

Chạy: python3 scripts/fixtures/make_docx_fixtures.py Tests/OOXMLTestSupport/Fixtures
rich-word.docx gom các tính năng phải GIỮ NGUYÊN khi sửa văn bản: style, đánh số, bookmark,
liên kết, trường (PAGE phức + fldSimple), theo dõi thay đổi (ins/del), chú thích (comments + commentsExtended + people),
chú thích cuối trang, ảnh inline, hộp văn bản trong mc:AlternateContent (+ VML fallback), bảng gộp ô,
content control (sdt), header có ảnh, footer có trường, w14:paraId + mc:Ignorable, custom XML, thuộc tính tùy biến.
"""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from ooxml_common import *

OUT = sys.argv[1] if len(sys.argv) > 1 else "Tests/OOXMLTestSupport/Fixtures"
D = os.path.join(OUT, "docx")
os.makedirs(D, exist_ok=True)
THEME = theme_from(os.path.join(OUT, "real", "sample-writer.docx"))
W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
NSDECL = (f'xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" '
    'xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" '
    'xmlns:o="urn:schemas-microsoft-com:office:office" '
    f'xmlns:r="{R_NS}" '
    'xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:v="urn:schemas-microsoft-com:vml" '
    'xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing" '
    'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" '
    'xmlns:w10="urn:schemas-microsoft-com:office:word" '
    f'xmlns:w="{W}" '
    'xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" '
    'xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml" '
    'xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup" '
    'xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" '
    'mc:Ignorable="w14 w15 wp14"')
RPR = '<w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="26"/></w:rPr>'

def p(inner, ppr="", pid="00000001"):
    return f'<w:p w14:paraId="{pid}" w14:textId="77777777" w:rsidR="00A1B2C3" w:rsidRDefault="00A1B2C3">{ppr}{inner}</w:p>'

def r(text, rpr=RPR):
    sp = ' xml:space="preserve"' if text != text.strip() else ""
    return f'<w:r>{rpr}<w:t{sp}>{text}</w:t></w:r>'

def inline_image(rid, docpr_id, name, cx=1219200, cy=762000):
    return ('<w:r><w:rPr><w:noProof/></w:rPr><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0" wp14:anchorId="1A2B3C4D" wp14:editId="5E6F7A8B">'
            f'<wp:extent cx="{cx}" cy="{cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="{docpr_id}" name="{name}" descr="Logo đơn vị"/>'
            '<wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr>'
            '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">'
            '<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="0" name="logo.png"/><pic:cNvPicPr/></pic:nvPicPr>'
            f'<pic:blipFill><a:blip r:embed="{rid}"><a:extLst><a:ext uri="{{28A0092B-C50C-407E-A947-70E740481C1C}}"><a14:useLocalDpi xmlns:a14="http://schemas.microsoft.com/office/drawing/2010/main" val="0"/></a:ext></a:extLst></a:blip>'
            '<a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/>'
            f'<a:ext cx="{cx}" cy="{cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>')

body = [
    p(r("BÁO CÁO TỔNG KẾT NĂM 2026", '<w:rPr><w:b/></w:rPr>'), '<w:pPr><w:pStyle w:val="Heading1"/></w:pPr>', "10000001"),
    p(r("Kính gửi: ", '<w:rPr><w:b/><w:sz w:val="26"/></w:rPr>') + '<w:bookmarkStart w:id="0" w:name="NguoiNhan"/>' + r("Ban Giám đốc") +
      '<w:bookmarkEnd w:id="0"/>' + r(" Công ty ") + r("TN", '<w:rPr><w:i/></w:rPr>') + r("HH 3T", '<w:rPr><w:b/><w:color w:val="C00000"/></w:rPr>') +
      '<w:proofErr w:type="spellStart"/>' + r(" Việt Nam.") + '<w:proofErr w:type="spellEnd"/>', "", "10000002"),
    p(r("Xem chi tiết tại ") + '<w:hyperlink r:id="rId20" w:history="1"><w:r><w:rPr><w:rStyle w:val="Hyperlink"/></w:rPr><w:t>trang web 3T</w:t></w:r></w:hyperlink>' + r("."), "", "10000003"),
    p(r("Trang ") + '<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r>'
      '<w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>1</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r>' + r(" / ") +
      '<w:fldSimple w:instr=" NUMPAGES "><w:r><w:t>3</w:t></w:r></w:fldSimple>', "", "10000004"),
    p(r("Nội dung ") + '<w:ins w:id="1" w:author="Trần Thị B" w:date="2026-10-20T09:00:00Z"><w:r><w:t xml:space="preserve">đã bổ sung </w:t></w:r></w:ins>'
      '<w:del w:id="2" w:author="Trần Thị B" w:date="2026-10-20T09:01:00Z"><w:r><w:delText xml:space="preserve">đã xóa </w:delText></w:r></w:del>' + r("theo góp ý."), "", "10000005"),
    p('<w:commentRangeStart w:id="0"/>' + r("Doanh thu tăng 15%") + '<w:commentRangeEnd w:id="0"/><w:r><w:rPr><w:rStyle w:val="CommentReference"/></w:rPr><w:commentReference w:id="0"/></w:r>' + r(" so với năm trước."), "", "10000006"),
    p(r("Số liệu đã kiểm toán") + '<w:r><w:rPr><w:rStyle w:val="FootnoteReference"/></w:rPr><w:footnoteReference w:id="1"/></w:r>' + r("."), "", "10000007"),
    p(inline_image("rId21", 1, "Hình 1"), '<w:pPr><w:jc w:val="center"/></w:pPr>', "10000008"),
    p('<w:r><mc:AlternateContent><mc:Choice Requires="wps"><w:drawing><wp:anchor distT="0" distB="0" distL="114300" distR="114300" simplePos="0" relativeHeight="251659264" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1">'
      '<wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="column"><wp:posOffset>0</wp:posOffset></wp:positionH><wp:positionV relativeFrom="paragraph"><wp:posOffset>0</wp:posOffset></wp:positionV>'
      '<wp:extent cx="2286000" cy="457200"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapSquare wrapText="bothSides"/><wp:docPr id="2" name="Hộp văn bản 2"/><wp:cNvGraphicFramePr/>'
      '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"><wps:wsp><wps:cNvSpPr txBox="1"/>'
      '<wps:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="2286000" cy="457200"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></wps:spPr>'
      '<wps:txbx><w:txbxContent><w:p><w:r><w:t>Nội dung hộp văn bản</w:t></w:r></w:p></w:txbxContent></wps:txbx><wps:bodyPr/></wps:wsp></a:graphicData></a:graphic></wp:anchor></w:drawing></mc:Choice>'
      '<mc:Fallback><w:pict><v:shape id="_x0000_s1026" type="#_x0000_t202" style="width:180pt;height:36pt"><v:textbox><w:txbxContent><w:p><w:r><w:t>Nội dung hộp văn bản</w:t></w:r></w:p></w:txbxContent></v:textbox></v:shape></w:pict></mc:Fallback></mc:AlternateContent></w:r>' + r("Đoạn có hộp văn bản."), "", "10000009"),
    '<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="0" w:type="auto"/><w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="1" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/></w:tblPr>'
    '<w:tblGrid><w:gridCol w:w="3000"/><w:gridCol w:w="3000"/><w:gridCol w:w="3000"/></w:tblGrid>'
    '<w:tr><w:tc><w:tcPr><w:tcW w:w="6000" w:type="dxa"/><w:gridSpan w:val="2"/><w:shd w:val="clear" w:color="auto" w:fill="DDEBF7"/></w:tcPr>' + p(r("Chỉ tiêu"), "", "20000001") + '</w:tc>'
    '<w:tc><w:tcPr><w:tcW w:w="3000" w:type="dxa"/></w:tcPr>' + p(r("Giá trị"), "", "20000002") + '</w:tc></w:tr>'
    '<w:tr><w:tc><w:tcPr><w:tcW w:w="3000" w:type="dxa"/><w:vMerge w:val="restart"/></w:tcPr>' + p(r("Doanh thu"), "", "20000003") + '</w:tc>'
    '<w:tc><w:tcPr><w:tcW w:w="3000" w:type="dxa"/></w:tcPr>' + p(r("Quý 3"), "", "20000004") + '</w:tc><w:tc><w:tcPr><w:tcW w:w="3000" w:type="dxa"/></w:tcPr>' + p(r("12,5 tỷ"), "", "20000005") + '</w:tc></w:tr>'
    '<w:tr><w:tc><w:tcPr><w:tcW w:w="3000" w:type="dxa"/><w:vMerge/></w:tcPr>' + p("", "", "20000006") + '</w:tc>'
    '<w:tc><w:tcPr><w:tcW w:w="3000" w:type="dxa"/></w:tcPr>' + p(r("Quý 4"), "", "20000007") + '</w:tc><w:tc><w:tcPr><w:tcW w:w="3000" w:type="dxa"/></w:tcPr>' + p(r("14,1 tỷ"), "", "20000008") + '</w:tc></w:tr></w:tbl>',
    '<w:sdt><w:sdtPr><w:alias w:val="Ngày ký"/><w:tag w:val="NgayKy"/><w:id w:val="-1234567"/><w:date w:fullDate="2026-10-23T00:00:00Z"><w:dateFormat w:val="dd/MM/yyyy"/><w:lid w:val="vi-VN"/></w:date></w:sdtPr>'
    '<w:sdtContent>' + p(r("Ngày ký: 23/10/2026"), "", "30000001") + '</w:sdtContent></w:sdt>',
    p(r("Mục thứ nhất"), '<w:pPr><w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr>', "40000001"),
    p(r("Mục thứ hai"), '<w:pPr><w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr>', "40000002"),
    p(r("Công ty TNHH 3T Việt Nam — Công ty TNHH 3T"), "", "40000003"),
    '<w:sectPr w:rsidR="00A1B2C3"><w:headerReference w:type="default" r:id="rId8"/><w:footerReference w:type="default" r:id="rId9"/>'
    '<w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="851" w:bottom="1134" w:left="1701" w:header="709" w:footer="709" w:gutter="0"/>'
    '<w:cols w:space="708"/><w:docGrid w:linePitch="360"/></w:sectPr>',
]
document = DECL + f'<w:document {NSDECL}><w:body>' + "".join(body) + '</w:body></w:document>'

styles = (DECL + f'<w:styles {NSDECL}><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi"/><w:sz w:val="24"/><w:lang w:val="vi-VN"/></w:rPr></w:rPrDefault>'
    '<w:pPrDefault><w:pPr><w:spacing w:after="160" w:line="259" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>'
    '<w:latentStyles w:defLockedState="0" w:defUIPriority="99" w:defSemiHidden="0" w:defUnhideWhenUsed="0" w:defQFormat="0" w:count="376"><w:lsdException w:name="Normal" w:uiPriority="0" w:qFormat="1"/></w:latentStyles>'
    '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>'
    '<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:uiPriority w:val="9"/><w:qFormat/><w:pPr><w:keepNext/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:sz w:val="32"/></w:rPr></w:style>'
    '<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/><w:sz w:val="28"/></w:rPr></w:style>'
    '<w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/><w:pPr><w:ind w:left="720"/></w:pPr></w:style>'
    '<w:style w:type="character" w:default="1" w:styleId="DefaultParagraphFont"><w:name w:val="Default Paragraph Font"/><w:uiPriority w:val="1"/><w:semiHidden/></w:style>'
    '<w:style w:type="character" w:styleId="Hyperlink"><w:name w:val="Hyperlink"/><w:rPr><w:color w:val="0563C1"/><w:u w:val="single"/></w:rPr></w:style>'
    '<w:style w:type="character" w:styleId="CommentReference"><w:name w:val="annotation reference"/><w:rPr><w:sz w:val="16"/></w:rPr></w:style>'
    '<w:style w:type="character" w:styleId="FootnoteReference"><w:name w:val="footnote reference"/><w:rPr><w:vertAlign w:val="superscript"/></w:rPr></w:style>'
    '<w:style w:type="table" w:default="1" w:styleId="TableNormal"><w:name w:val="Normal Table"/><w:tblPr><w:tblInd w:w="0" w:type="dxa"/></w:tblPr></w:style>'
    '<w:style w:type="table" w:styleId="TableGrid"><w:name w:val="Table Grid"/><w:basedOn w:val="TableNormal"/><w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/></w:tblBorders></w:tblPr></w:style>'
    '</w:styles>')
numbering = (DECL + f'<w:numbering {NSDECL}><w:abstractNum w:abstractNumId="0" w15:restartNumberingAfterBreak="0"><w:multiLevelType w:val="hybridMultilevel"/>'
    '<w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum>'
    '<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num></w:numbering>')
settings = (DECL + f'<w:settings {NSDECL}><w:zoom w:percent="110"/><w:trackRevisions/><w:defaultTabStop w:val="720"/><w:characterSpacingControl w:val="doNotCompress"/>'
    '<w:footnotePr><w:footnote w:id="-1"/><w:footnote w:id="0"/></w:footnotePr><w:endnotePr><w:endnote w:id="-1"/><w:endnote w:id="0"/></w:endnotePr>'
    '<w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat>'
    '<w:rsids><w:rsidRoot w:val="00A1B2C3"/><w:rsid w:val="00A1B2C3"/></w:rsids><w:themeFontLang w:val="vi-VN"/><w:decimalSymbol w:val=","/><w:listSeparator w:val=";"/>'
    '<w15:docId w15:val="{1D2C3B4A-0000-4000-8000-000000000003}"/></w:settings>')
font_table = (DECL + f'<w:fonts {NSDECL}><w:font w:name="Times New Roman"><w:panose1 w:val="02020603050405020304"/><w:charset w:val="00"/><w:family w:val="roman"/><w:pitch w:val="variable"/></w:font></w:fonts>')
web_settings = DECL + f'<w:webSettings {NSDECL}><w:optimizeForBrowser/><w:allowPNG/></w:webSettings>'
footnotes = (DECL + f'<w:footnotes {NSDECL}><w:footnote w:type="separator" w:id="-1"><w:p><w:r><w:separator/></w:r></w:p></w:footnote>'
    '<w:footnote w:type="continuationSeparator" w:id="0"><w:p><w:r><w:continuationSeparator/></w:r></w:p></w:footnote>'
    '<w:footnote w:id="1"><w:p><w:pPr><w:pStyle w:val="FootnoteText"/></w:pPr><w:r><w:rPr><w:rStyle w:val="FootnoteReference"/></w:rPr><w:footnoteRef/></w:r><w:r><w:t xml:space="preserve"> Theo báo cáo kiểm toán số 12/2026 của Công ty TNHH 3T.</w:t></w:r></w:p></w:footnote></w:footnotes>')
endnotes = (DECL + f'<w:endnotes {NSDECL}><w:endnote w:type="separator" w:id="-1"><w:p><w:r><w:separator/></w:r></w:p></w:endnote>'
    '<w:endnote w:type="continuationSeparator" w:id="0"><w:p><w:r><w:continuationSeparator/></w:r></w:p></w:endnote></w:endnotes>')
comments = (DECL + f'<w:comments {NSDECL}><w:comment w:id="0" w:author="Nguyễn Văn A" w:date="2026-10-21T10:00:00Z" w:initials="NA">'
    '<w:p w14:paraId="50000001" w14:textId="77777777"><w:r><w:rPr><w:rStyle w:val="CommentReference"/></w:rPr><w:annotationRef/></w:r><w:r><w:t>Cần nguồn số liệu cho Công ty TNHH 3T.</w:t></w:r></w:p></w:comment></w:comments>')
comments_ext = (DECL + f'<w15:commentsEx {NSDECL}><w15:commentEx w15:paraId="50000001" w15:done="0"/></w15:commentsEx>')
people = (DECL + f'<w15:people {NSDECL}><w15:person w15:author="Nguyễn Văn A"><w15:presenceInfo w15:providerId="None" w15:userId="Nguyễn Văn A"/></w15:person></w15:people>')
header = (DECL + f'<w:hdr {NSDECL}>' + p(inline_image("rId1", 3, "Logo header", 609600, 381000) + r("  CÔNG TY TNHH 3T — Văn bản nội bộ"), '<w:pPr><w:pStyle w:val="Header"/></w:pPr>', "60000001") + '</w:hdr>')
footer = (DECL + f'<w:ftr {NSDECL}>' + p(r("Trang ") + '<w:fldSimple w:instr=" PAGE "><w:r><w:t>1</w:t></w:r></w:fldSimple>' + r(" — Công ty TNHH 3T"), '<w:pPr><w:jc w:val="right"/></w:pPr>', "60000002") + '</w:ftr>')

doc_rels = rels([("rId1", "styles", "styles.xml"), ("rId2", "settings", "settings.xml"), ("rId3", "webSettings", "webSettings.xml"),
                 ("rId4", "fontTable", "fontTable.xml"), ("rId5", "theme", "theme/theme1.xml"), ("rId6", "numbering", "numbering.xml"),
                 ("rId7", "customXml", "../customXml/item1.xml"), ("rId8", "header", "header1.xml"), ("rId9", "footer", "footer1.xml"),
                 ("rId10", "footnotes", "footnotes.xml"), ("rId11", "endnotes", "endnotes.xml"), ("rId12", "comments", "comments.xml"),
                 ("rId13", "http://schemas.microsoft.com/office/2011/relationships/commentsExtended", "commentsExtended.xml"),
                 ("rId14", "http://schemas.microsoft.com/office/2011/relationships/people", "people.xml"),
                 ("rId20", "hyperlink", "https://3t.vn/bao-cao?nam=2026&amp;loai=tong-ket", True), ("rId21", "image", "media/image1.png")])
WCT = "application/vnd.openxmlformats-officedocument.wordprocessingml."
app = (DECL + '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">'
       '<Template>Normal.dotm</Template><TotalTime>42</TotalTime><Pages>1</Pages><Words>120</Words><Application>Microsoft Office Word</Application><DocSecurity>0</DocSecurity>'
       '<Company>Công ty TNHH 3T</Company><AppVersion>16.0000</AppVersion></Properties>')
cx = custom_xml_parts()
parts = [
    ("[Content_Types].xml", content_types(
        [("png", "image/png"), ("rels", "application/vnd.openxmlformats-package.relationships+xml"), ("xml", "application/xml")],
        [("/word/document.xml", WCT + "document.main+xml"), ("/word/styles.xml", WCT + "styles+xml"), ("/word/settings.xml", WCT + "settings+xml"),
         ("/word/webSettings.xml", WCT + "webSettings+xml"), ("/word/fontTable.xml", WCT + "fontTable+xml"),
         ("/word/theme/theme1.xml", "application/vnd.openxmlformats-officedocument.theme+xml"), ("/word/numbering.xml", WCT + "numbering+xml"),
         ("/word/header1.xml", WCT + "header+xml"), ("/word/footer1.xml", WCT + "footer+xml"), ("/word/footnotes.xml", WCT + "footnotes+xml"),
         ("/word/endnotes.xml", WCT + "endnotes+xml"), ("/word/comments.xml", WCT + "comments+xml"),
         ("/word/commentsExtended.xml", WCT + "commentsExtended+xml"), ("/word/people.xml", WCT + "people+xml"),
         ("/customXml/itemProps1.xml", "application/vnd.openxmlformats-officedocument.customXmlProperties+xml"),
         ("/docProps/core.xml", "application/vnd.openxmlformats-package.core-properties+xml"),
         ("/docProps/app.xml", "application/vnd.openxmlformats-officedocument.extended-properties+xml"),
         ("/docProps/custom.xml", "application/vnd.openxmlformats-officedocument.custom-properties+xml")])),
    ("_rels/.rels", rels([("rId3", "extended-properties", "docProps/app.xml"),
                          ("rId2", "http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties", "docProps/core.xml"),
                          ("rId1", "officeDocument", "word/document.xml"), ("rId4", "custom-properties", "docProps/custom.xml")])),
    ("word/document.xml", document), ("word/_rels/document.xml.rels", doc_rels), ("word/styles.xml", styles),
    ("word/settings.xml", settings), ("word/webSettings.xml", web_settings), ("word/fontTable.xml", font_table),
    ("word/theme/theme1.xml", THEME), ("word/numbering.xml", numbering), ("word/header1.xml", header),
    ("word/_rels/header1.xml.rels", rels([("rId1", "image", "media/image2.png")])), ("word/footer1.xml", footer),
    ("word/footnotes.xml", footnotes), ("word/endnotes.xml", endnotes), ("word/comments.xml", comments),
    ("word/commentsExtended.xml", comments_ext), ("word/people.xml", people),
    ("word/media/image1.png", png(32, 20)), ("word/media/image2.png", png(16, 10, (0xC0, 0, 0))),
    ("docProps/core.xml", core_props("Báo cáo tổng kết năm 2026")), ("docProps/app.xml", app), ("docProps/custom.xml", custom_props()),
] + list(cx.items())
write_package(os.path.join(D, "rich-word.docx"), parts)
print("DOCX fixtures written to", D)
