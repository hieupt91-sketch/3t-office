#!/usr/bin/env python3
"""Sinh fixture PPTX giống đầu ra PowerPoint 365 (viết tay XML).

Chạy: python3 scripts/fixtures/make_pptx_fixtures.py Tests/OOXMLTestSupport/Fixtures
rich-deck.pptx gom: master/layout/theme, placeholder có run tách nhỏ, liên kết trên run, ảnh, nhóm hình,
bảng, biểu đồ (kèm workbook nhúng), bình luận cũ (comments + commentAuthors), ghi chú + notes master,
phân đoạn p14:sectionLst, trình chiếu tùy chỉnh (custShow), hiệu ứng chuyển p14 trong mc:AlternateContent, đường nối.
"""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from ooxml_common import *

OUT = sys.argv[1] if len(sys.argv) > 1 else "Tests/OOXMLTestSupport/Fixtures"
D = os.path.join(OUT, "pptx")
os.makedirs(D, exist_ok=True)
THEME = theme_from(os.path.join(OUT, "real", "sample-slides.pptx"))
P = "http://schemas.openxmlformats.org/presentationml/2006/main"
A = "http://schemas.openxmlformats.org/drawingml/2006/main"
NS = f'xmlns:a="{A}" xmlns:r="{R_NS}" xmlns:p="{P}"'
PCT = "application/vnd.openxmlformats-officedocument.presentationml."

def grp_root():
    return ('<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/>'
            '<a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>')

def sp(id_, name, ph, paras, xfrm=None):
    phx = f'<p:ph type="{ph}"/>' if ph in ("title", "ctrTitle", "subTitle") else (f'<p:ph idx="{ph}"/>' if ph else "")
    x = f'<p:spPr><a:xfrm><a:off x="{xfrm[0]}" y="{xfrm[1]}"/><a:ext cx="{xfrm[2]}" cy="{xfrm[3]}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr>' if xfrm else "<p:spPr/>"
    return (f'<p:sp><p:nvSpPr><p:cNvPr id="{id_}" name="{name}"/><p:cNvSpPr>{"<a:spLocks noGrp=\"1\"/>" if ph else ""}</p:cNvSpPr><p:nvPr>{phx}</p:nvPr></p:nvSpPr>'
            f'{x}<p:txBody><a:bodyPr/><a:lstStyle/>{"".join(paras)}</p:txBody></p:sp>')

def para(runs, ppr="", end='<a:endParaRPr lang="vi-VN" dirty="0"/>'):
    return f'<a:p>{ppr}{runs}{end}</a:p>'

def run(t, rpr='<a:rPr lang="vi-VN" dirty="0"/>'):
    return f'<a:r>{rpr}<a:t>{t}</a:t></a:r>'

master = (DECL + f'<p:sldMaster {NS}><p:cSld><p:bg><p:bgRef idx="1001"><a:schemeClr val="bg1"/></p:bgRef></p:bg><p:spTree>{grp_root()}'
    + sp(2, "Title Placeholder 1", "title", [para(run("Tiêu đề mẫu"))], (838200, 365125, 10515600, 1325563)) +
    '</p:spTree></p:cSld><p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>'
    '<p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/><p:sldLayoutId id="2147483650" r:id="rId2"/></p:sldLayoutIdLst>'
    '<p:txStyles><p:titleStyle><a:lvl1pPr><a:defRPr sz="4400"/></a:lvl1pPr></p:titleStyle><p:bodyStyle><a:lvl1pPr><a:defRPr sz="2800"/></a:lvl1pPr></p:bodyStyle><p:otherStyle/></p:txStyles></p:sldMaster>')
def layout(name, typ, shapes):
    return (DECL + f'<p:sldLayout {NS} type="{typ}" preserve="1"><p:cSld name="{name}"><p:spTree>{grp_root()}{shapes}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>')
layout1 = layout("Title Slide", "title", sp(2, "Title 1", "ctrTitle", [para(run("Tiêu đề"))]) + sp(3, "Subtitle 2", "subTitle", [para(run("Phụ đề"))]))
layout2 = layout("Title and Content", "obj", sp(2, "Title 1", "title", [para(run("Tiêu đề"))]) + sp(3, "Content Placeholder 2", "1", [para(run("Nội dung"))]))

slide1 = (DECL + f'<p:sld {NS}><p:cSld><p:spTree>{grp_root()}'
    + sp(2, "Tiêu đề 1", "ctrTitle", [para(run("Kế hoạch ") + run("kinh doanh", '<a:rPr lang="vi-VN" b="1" dirty="0"/>') + run(" 2027"))])
    + sp(3, "Phụ đề 2", "subTitle", [para(run("Công ty TNHH 3T — ") +
         f'<a:r><a:rPr lang="vi-VN" dirty="0"><a:hlinkClick r:id="rId3"/></a:rPr><a:t>3t.vn</a:t></a:r>')])
    + '<p:pic><p:nvPicPr><p:cNvPr id="4" name="Logo 3T" descr="Logo đơn vị"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr>'
      '<p:blipFill><a:blip r:embed="rId2"/><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr><a:xfrm><a:off x="10287000" y="5715000"/><a:ext cx="1219200" cy="762000"/></a:xfrm>'
      '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>'
    + '</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>'
    '<mc:AlternateContent xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"><mc:Choice xmlns:p14="http://schemas.microsoft.com/office/powerpoint/2010/main" Requires="p14">'
    '<p:transition spd="slow" p14:dur="2000"><p14:prism/></p:transition></mc:Choice><mc:Fallback><p:transition spd="slow"><p:fade/></p:transition></mc:Fallback></mc:AlternateContent>'
    '<p:timing><p:tnLst><p:par><p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot"/></p:par></p:tnLst></p:timing></p:sld>')
slide1_rels = rels([("rId1", "slideLayout", "../slideLayouts/slideLayout1.xml"), ("rId2", "image", "../media/image1.png"),
                    ("rId3", "hyperlink", "https://3t.vn/", True), ("rId4", "notesSlide", "../notesSlides/notesSlide1.xml")])

table = ('<p:graphicFrame><p:nvGraphicFramePr><p:cNvPr id="6" name="Bảng 5"/><p:cNvGraphicFramePr><a:graphicFrameLocks noGrp="1"/></p:cNvGraphicFramePr><p:nvPr/></p:nvGraphicFramePr>'
    '<p:xfrm><a:off x="838200" y="4000000"/><a:ext cx="5000000" cy="740000"/></p:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/table">'
    '<a:tbl><a:tblPr firstRow="1" bandRow="1"><a:tableStyleId>{5C22544A-7EE6-4342-B048-85BDC9FD1C3A}</a:tableStyleId></a:tblPr><a:tblGrid><a:gridCol w="2500000"/><a:gridCol w="2500000"/></a:tblGrid>'
    + "".join(f'<a:tr h="370000"><a:tc><a:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="vi-VN"/><a:t>{a}</a:t></a:r></a:p></a:txBody><a:tcPr/></a:tc>'
              f'<a:tc><a:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="vi-VN"/><a:t>{b}</a:t></a:r></a:p></a:txBody><a:tcPr/></a:tc></a:tr>'
              for a, b in [("Quý", "Doanh thu"), ("Q4/2026", "14,1 tỷ")]) +
    '</a:tbl></a:graphicData></a:graphic></p:graphicFrame>')
chart_frame = ('<p:graphicFrame><p:nvGraphicFramePr><p:cNvPr id="7" name="Biểu đồ 6"/><p:cNvGraphicFramePr/><p:nvPr/></p:nvGraphicFramePr>'
    '<p:xfrm><a:off x="6200000" y="1800000"/><a:ext cx="5000000" cy="3500000"/></p:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart">'
    f'<c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" r:id="rId2"/></a:graphicData></a:graphic></p:graphicFrame>')
group = ('<p:grpSp><p:nvGrpSpPr><p:cNvPr id="8" name="Nhóm 7"/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="838200" y="5000000"/><a:ext cx="3000000" cy="600000"/>'
    '<a:chOff x="838200" y="5000000"/><a:chExt cx="3000000" cy="600000"/></a:xfrm></p:grpSpPr>'
    + sp(9, "Hộp A", None, [para(run("Bước 1"))], (838200, 5000000, 1400000, 600000))
    + sp(10, "Hộp B", None, [para(run("Bước 2"))], (2438200, 5000000, 1400000, 600000)) + '</p:grpSp>')
slide2 = (DECL + f'<p:sld {NS}><p:cSld><p:spTree>{grp_root()}'
    + sp(2, "Tiêu đề 1", "title", [para(run("Mục tiêu năm 2027"))])
    + sp(3, "Nội dung 2", "1", [para(run("Tăng doanh thu 20%")), para(run("Mở rộng thị trường miền Trung"), '<a:pPr lvl="1"/>'),
                                 para(run("Đà Nẵng, Huế"), '<a:pPr lvl="2"/>'), para(run("Công ty TNHH 3T") + run(" phát triển bền vững"))])
    + table + chart_frame + group +
    '</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>')
slide2_rels = rels([("rId1", "slideLayout", "../slideLayouts/slideLayout2.xml"), ("rId2", "chart", "../charts/chart1.xml"),
                    ("rId3", "comments", "../comments/comment1.xml")])
slide3 = (DECL + f'<p:sld {NS}><p:cSld><p:spTree>{grp_root()}'
    + sp(2, "Tiêu đề 1", "title", [para(run("Cảm ơn quý vị!"))]) +
    '<p:cxnSp><p:nvCxnSpPr><p:cNvPr id="3" name="Đường nối 2"/><p:cNvCxnSpPr/><p:nvPr/></p:nvCxnSpPr><p:spPr><a:xfrm><a:off x="1000000" y="3000000"/><a:ext cx="4000000" cy="0"/></a:xfrm>'
    '<a:prstGeom prst="line"><a:avLst/></a:prstGeom></p:spPr></p:cxnSp>'
    '</p:spTree><p:extLst><p:ext uri="{BB962C8B-B14F-4D97-AF65-F5344CB8AC3E}"><p14:creationId xmlns:p14="http://schemas.microsoft.com/office/powerpoint/2010/main" val="1234567890"/></p:ext></p:extLst></p:cSld>'
    '<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>')
slide3_rels = rels([("rId1", "slideLayout", "../slideLayouts/slideLayout2.xml")])

chart = (DECL + f'<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="{A}" xmlns:r="{R_NS}"><c:lang val="vi-VN"/>'
    '<c:chart><c:autoTitleDeleted val="0"/><c:plotArea><c:layout/><c:barChart><c:barDir val="col"/><c:grouping val="clustered"/><c:varyColors val="0"/>'
    '<c:ser><c:idx val="0"/><c:order val="0"/><c:tx><c:strRef><c:f>Sheet1!$B$1</c:f><c:strCache><c:ptCount val="1"/><c:pt idx="0"><c:v>Doanh thu</c:v></c:pt></c:strCache></c:strRef></c:tx>'
    '<c:cat><c:strRef><c:f>Sheet1!$A$2:$A$3</c:f><c:strCache><c:ptCount val="2"/><c:pt idx="0"><c:v>Q3</c:v></c:pt><c:pt idx="1"><c:v>Q4</c:v></c:pt></c:strCache></c:strRef></c:cat>'
    '<c:val><c:numRef><c:f>Sheet1!$B$2:$B$3</c:f><c:numCache><c:formatCode>General</c:formatCode><c:ptCount val="2"/><c:pt idx="0"><c:v>12.5</c:v></c:pt><c:pt idx="1"><c:v>14.1</c:v></c:pt></c:numCache></c:numRef></c:val></c:ser>'
    '<c:axId val="111"/><c:axId val="222"/></c:barChart><c:catAx><c:axId val="111"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="b"/><c:crossAx val="222"/></c:catAx>'
    '<c:valAx><c:axId val="222"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="l"/><c:crossAx val="111"/></c:valAx></c:plotArea><c:plotVisOnly val="1"/></c:chart>'
    '<c:externalData r:id="rId1"><c:autoUpdate val="0"/></c:externalData></c:chartSpace>')
chart_rels = rels([("rId1", "package", "../embeddings/Microsoft_Excel_Worksheet.xlsx")])
embedded = open(os.path.join(OUT, "real", "sample-sheet.xlsx"), "rb").read()

comments = (DECL + f'<p:cmLst {NS}><p:cm authorId="0" dt="2026-10-21T09:30:00.000" idx="1"><p:pos x="10" y="10"/><p:text>Kiểm tra lại số liệu Q4</p:text></p:cm></p:cmLst>')
authors = (DECL + f'<p:cmAuthorLst {NS}><p:cmAuthor id="0" name="Nguyễn Văn A" initials="NA" lastIdx="1" clrIdx="0"/></p:cmAuthorLst>')

notes_master = (DECL + f'<p:notesMaster {NS}><p:cSld><p:bg><p:bgRef idx="1001"><a:schemeClr val="bg1"/></p:bgRef></p:bg><p:spTree>{grp_root()}'
    '<p:sp><p:nvSpPr><p:cNvPr id="2" name="Slide Image Placeholder 1"/><p:cNvSpPr><a:spLocks noGrp="1" noRot="1" noChangeAspect="1"/></p:cNvSpPr><p:nvPr><p:ph type="sldImg" idx="2"/></p:nvPr></p:nvSpPr><p:spPr/></p:sp>'
    '<p:sp><p:nvSpPr><p:cNvPr id="3" name="Notes Placeholder 2"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr><p:ph type="body" sz="quarter" idx="3"/></p:nvPr></p:nvSpPr><p:spPr/>'
    '<p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="vi-VN"/><a:t>Ghi chú mẫu</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld>'
    '<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>'
    '<p:notesStyle><a:lvl1pPr marL="0" algn="l"><a:defRPr sz="1200"/></a:lvl1pPr></p:notesStyle></p:notesMaster>')
notes1 = (DECL + f'<p:notes {NS}><p:cSld><p:spTree>{grp_root()}'
    '<p:sp><p:nvSpPr><p:cNvPr id="2" name="Slide Image Placeholder 1"/><p:cNvSpPr><a:spLocks noGrp="1" noRot="1" noChangeAspect="1"/></p:cNvSpPr><p:nvPr><p:ph type="sldImg"/></p:nvPr></p:nvSpPr><p:spPr/></p:sp>'
    '<p:sp><p:nvSpPr><p:cNvPr id="3" name="Notes Placeholder 2"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr><p:ph type="body" idx="1"/></p:nvPr></p:nvSpPr><p:spPr/>'
    '<p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="vi-VN" dirty="0"/><a:t>Chào mừng, giới thiệu thành phần tham dự.</a:t></a:r></a:p>'
    '<a:p><a:r><a:rPr lang="vi-VN" dirty="0"/><a:t>Nhấn mạnh mục tiêu Công ty TNHH 3T.</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld>'
    '<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:notes>')
notes1_rels = rels([("rId1", "notesMaster", "../notesMasters/notesMaster1.xml"), ("rId2", "slide", "../slides/slide1.xml")])

presentation = (DECL + f'<p:presentation {NS} xmlns:p14="http://schemas.microsoft.com/office/powerpoint/2010/main" saveSubsetFonts="1">'
    '<p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:notesMasterIdLst><p:notesMasterId r:id="rId5"/></p:notesMasterIdLst>'
    '<p:sldIdLst><p:sldId id="256" r:id="rId2"/><p:sldId id="257" r:id="rId3"/><p:sldId id="258" r:id="rId4"/></p:sldIdLst>'
    '<p:sldSz cx="12192000" cy="6858000"/><p:notesSz cx="6858000" cy="9144000"/>'
    '<p:custShowLst><p:custShow name="Bản rút gọn" id="0"><p:sldLst><p:sld r:id="rId2"/><p:sld r:id="rId4"/></p:sldLst></p:custShow></p:custShowLst>'
    '<p:defaultTextStyle><a:defPPr><a:defRPr lang="vi-VN"/></a:defPPr></p:defaultTextStyle>'
    '<p:extLst><p:ext uri="{521415D9-36F7-43E2-AB2F-B90AF26B5E84}"><p14:sectionLst>'
    '<p14:section name="Mở đầu" id="{A1B2C3D4-0000-4000-8000-000000000001}"><p14:sldIdLst><p14:sldId id="256"/></p14:sldIdLst></p14:section>'
    '<p14:section name="Nội dung" id="{A1B2C3D4-0000-4000-8000-000000000002}"><p14:sldIdLst><p14:sldId id="257"/><p14:sldId id="258"/></p14:sldIdLst></p14:section>'
    '</p14:sectionLst></p:ext></p:extLst></p:presentation>')
pres_rels = rels([("rId1", "slideMaster", "slideMasters/slideMaster1.xml"), ("rId2", "slide", "slides/slide1.xml"),
                  ("rId3", "slide", "slides/slide2.xml"), ("rId4", "slide", "slides/slide3.xml"),
                  ("rId5", "notesMaster", "notesMasters/notesMaster1.xml"), ("rId6", "presProps", "presProps.xml"),
                  ("rId7", "viewProps", "viewProps.xml"), ("rId8", "theme", "theme/theme1.xml"),
                  ("rId9", "tableStyles", "tableStyles.xml"), ("rId10", "commentAuthors", "commentAuthors.xml")])
pres_props = DECL + f'<p:presentationPr {NS}><p:showPr showNarration="1"><p:present/><p:sldAll/><p:penClr><a:prstClr val="red"/></p:penClr></p:showPr></p:presentationPr>'
view_props = DECL + f'<p:viewPr {NS}><p:normalViewPr><p:restoredLeft sz="15620"/><p:restoredTop sz="94660"/></p:normalViewPr><p:gridSpacing cx="76200" cy="76200"/></p:viewPr>'
table_styles = DECL + f'<a:tblStyleLst xmlns:a="{A}" def="{{5C22544A-7EE6-4342-B048-85BDC9FD1C3A}}"/>'
app = (DECL + '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">'
       '<Application>Microsoft Office PowerPoint</Application><Slides>3</Slides><Notes>1</Notes><AppVersion>16.0000</AppVersion></Properties>')

parts = [
    ("[Content_Types].xml", content_types(
        [("png", "image/png"), ("rels", "application/vnd.openxmlformats-package.relationships+xml"), ("xml", "application/xml"),
         ("xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")],
        [("/ppt/presentation.xml", PCT + "presentation.main+xml"), ("/ppt/slideMasters/slideMaster1.xml", PCT + "slideMaster+xml"),
         ("/ppt/slides/slide1.xml", PCT + "slide+xml"), ("/ppt/slides/slide2.xml", PCT + "slide+xml"), ("/ppt/slides/slide3.xml", PCT + "slide+xml"),
         ("/ppt/notesMasters/notesMaster1.xml", PCT + "notesMaster+xml"), ("/ppt/notesSlides/notesSlide1.xml", PCT + "notesSlide+xml"),
         ("/ppt/presProps.xml", PCT + "presProps+xml"), ("/ppt/viewProps.xml", PCT + "viewProps+xml"),
         ("/ppt/theme/theme1.xml", "application/vnd.openxmlformats-officedocument.theme+xml"),
         ("/ppt/theme/theme2.xml", "application/vnd.openxmlformats-officedocument.theme+xml"),
         ("/ppt/tableStyles.xml", PCT + "tableStyles+xml"), ("/ppt/slideLayouts/slideLayout1.xml", PCT + "slideLayout+xml"),
         ("/ppt/slideLayouts/slideLayout2.xml", PCT + "slideLayout+xml"), ("/ppt/charts/chart1.xml", "application/vnd.openxmlformats-officedocument.drawingml.chart+xml"),
         ("/ppt/comments/comment1.xml", PCT + "comments+xml"), ("/ppt/commentAuthors.xml", PCT + "commentAuthors+xml"),
         ("/docProps/core.xml", "application/vnd.openxmlformats-package.core-properties+xml"),
         ("/docProps/app.xml", "application/vnd.openxmlformats-officedocument.extended-properties+xml")])),
    ("_rels/.rels", rels([("rId3", "extended-properties", "docProps/app.xml"),
                          ("rId2", "http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties", "docProps/core.xml"),
                          ("rId1", "officeDocument", "ppt/presentation.xml")])),
    ("ppt/presentation.xml", presentation), ("ppt/_rels/presentation.xml.rels", pres_rels),
    ("ppt/slideMasters/slideMaster1.xml", master),
    ("ppt/slideMasters/_rels/slideMaster1.xml.rels", rels([("rId1", "slideLayout", "../slideLayouts/slideLayout1.xml"),
        ("rId2", "slideLayout", "../slideLayouts/slideLayout2.xml"), ("rId3", "theme", "../theme/theme1.xml")])),
    ("ppt/slideLayouts/slideLayout1.xml", layout1), ("ppt/slideLayouts/slideLayout2.xml", layout2),
    ("ppt/slideLayouts/_rels/slideLayout1.xml.rels", rels([("rId1", "slideMaster", "../slideMasters/slideMaster1.xml")])),
    ("ppt/slideLayouts/_rels/slideLayout2.xml.rels", rels([("rId1", "slideMaster", "../slideMasters/slideMaster1.xml")])),
    ("ppt/slides/slide1.xml", slide1), ("ppt/slides/_rels/slide1.xml.rels", slide1_rels),
    ("ppt/slides/slide2.xml", slide2), ("ppt/slides/_rels/slide2.xml.rels", slide2_rels),
    ("ppt/slides/slide3.xml", slide3), ("ppt/slides/_rels/slide3.xml.rels", slide3_rels),
    ("ppt/charts/chart1.xml", chart), ("ppt/charts/_rels/chart1.xml.rels", chart_rels),
    ("ppt/embeddings/Microsoft_Excel_Worksheet.xlsx", embedded),
    ("ppt/comments/comment1.xml", comments), ("ppt/commentAuthors.xml", authors),
    ("ppt/notesMasters/notesMaster1.xml", notes_master), ("ppt/notesMasters/_rels/notesMaster1.xml.rels", rels([("rId1", "theme", "../theme/theme2.xml")])),
    ("ppt/notesSlides/notesSlide1.xml", notes1), ("ppt/notesSlides/_rels/notesSlide1.xml.rels", notes1_rels),
    ("ppt/theme/theme1.xml", THEME), ("ppt/theme/theme2.xml", THEME),
    ("ppt/presProps.xml", pres_props), ("ppt/viewProps.xml", view_props), ("ppt/tableStyles.xml", table_styles),
    ("ppt/media/image1.png", png(24, 16)),
    ("docProps/core.xml", core_props("Kế hoạch kinh doanh 2027")), ("docProps/app.xml", app),
]
write_package(os.path.join(D, "rich-deck.pptx"), parts)
print("PPTX fixtures written to", D)
