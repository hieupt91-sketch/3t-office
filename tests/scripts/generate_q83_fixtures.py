#!/usr/bin/env python3
"""
Generate synthetic DOCX fixtures for measuring list numbering behavior against Word 2016 COM and VN Writer.
All fixtures are synthetic and do not use real document content.
"""
import io
import os
import zipfile

FIXTURES_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "fixtures", "q83-numbering"))

CONTENT_TYPES_XML = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>
"""

RELS_XML = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>
"""

DOC_RELS_XML = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>
"""

STYLES_XML = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="22"/></w:rPr></w:rPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
  </w:style>
  <w:style w:type="paragraph" w:styleId="ListParagraph">
    <w:name w:val="List Paragraph"/>
    <w:basedOn w:val="Normal"/>
    <w:pPr>
      <w:ind w:left="720"/>
    </w:pPr>
  </w:style>
</w:styles>
"""

def create_docx(dest_path: str, document_xml: str, numbering_xml: str, styles_xml: str = STYLES_XML):
    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
    with zipfile.ZipFile(dest_path, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", CONTENT_TYPES_XML.strip())
        z.writestr("_rels/.rels", RELS_XML.strip())
        z.writestr("word/_rels/document.xml.rels", DOC_RELS_XML.strip())
        z.writestr("word/styles.xml", styles_xml.strip())
        z.writestr("word/numbering.xml", numbering_xml.strip())
        z.writestr("word/document.xml", document_xml.strip())

def make_para(text: str, num_id: int = None, ilvl: int = 0) -> str:
    if num_id is not None:
        return f'<w:p><w:pPr><w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="{ilvl}"/><w:numId w:val="{num_id}"/></w:numPr></w:pPr><w:r><w:t>{text}</w:t></w:r></w:p>'
    else:
        return f'<w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr><w:r><w:t>{text}</w:t></w:r></w:p>'

def wrap_doc(paras: list) -> str:
    body = "\n".join(paras)
    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
{body}
    <w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr>
  </w:body>
</w:document>"""

def generate_all():
    # 1. start-override.docx: override with w:startOverride
    num_xml_1 = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:abstractNum w:abstractNumId="1">
    <w:multiLevelType w:val="multilevel"/>
    <w:lvl w:ilvl="0">
      <w:start w:val="1"/>
      <w:numFmt w:val="decimal"/>
      <w:lvlText w:val="%1."/>
      <w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr>
    </w:lvl>
  </w:abstractNum>
  <w:num w:numId="1">
    <w:abstractNumId w:val="1"/>
    <w:lvlOverride w:ilvl="0">
      <w:startOverride w:val="5"/>
    </w:lvlOverride>
  </w:num>
</w:numbering>"""
    doc_xml_1 = wrap_doc([
        make_para("Muc mot bat dau tu nam", num_id=1, ilvl=0),
        make_para("Muc hai tiep theo", num_id=1, ilvl=0),
        make_para("Muc ba tiep theo", num_id=1, ilvl=0),
    ])
    create_docx(os.path.join(FIXTURES_DIR, "case1_start_override.docx"), doc_xml_1, num_xml_1)

    # 2. lvl-start-override.docx: override with w:lvl containing w:start
    num_xml_2 = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:abstractNum w:abstractNumId="1">
    <w:multiLevelType w:val="multilevel"/>
    <w:lvl w:ilvl="0">
      <w:start w:val="1"/>
      <w:numFmt w:val="decimal"/>
      <w:lvlText w:val="%1."/>
      <w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr>
    </w:lvl>
  </w:abstractNum>
  <w:num w:numId="1">
    <w:abstractNumId w:val="1"/>
    <w:lvlOverride w:ilvl="0">
      <w:lvl w:ilvl="0">
        <w:start w:val="10"/>
        <w:numFmt w:val="decimal"/>
        <w:lvlText w:val="%1."/>
      </w:lvl>
    </w:lvlOverride>
  </w:num>
</w:numbering>"""
    doc_xml_2 = wrap_doc([
        make_para("Doan mot cua lvl start override", num_id=1, ilvl=0),
        make_para("Doan hai cua lvl start override", num_id=1, ilvl=0),
        make_para("Doan ba cua lvl start override", num_id=1, ilvl=0),
    ])
    create_docx(os.path.join(FIXTURES_DIR, "case2_lvl_start_override.docx"), doc_xml_2, num_xml_2)

    # 3. lvl-restart-0.docx: override with w:lvl containing w:lvlRestart val=0
    num_xml_3 = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:abstractNum w:abstractNumId="1">
    <w:multiLevelType w:val="multilevel"/>
    <w:lvl w:ilvl="0">
      <w:start w:val="1"/>
      <w:numFmt w:val="decimal"/>
      <w:lvlText w:val="%1."/>
      <w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr>
    </w:lvl>
    <w:lvl w:ilvl="1">
      <w:start w:val="1"/>
      <w:numFmt w:val="lowerLetter"/>
      <w:lvlText w:val="%2)"/>
      <w:pPr><w:ind w:left="1440" w:hanging="360"/></w:pPr>
    </w:lvl>
  </w:abstractNum>
  <w:num w:numId="1">
    <w:abstractNumId w:val="1"/>
    <w:lvlOverride w:ilvl="1">
      <w:lvl w:ilvl="1">
        <w:start w:val="1"/>
        <w:numFmt w:val="lowerLetter"/>
        <w:lvlRestart w:val="0"/>
        <w:lvlText w:val="%2)"/>
      </w:lvl>
    </w:lvlOverride>
  </w:num>
</w:numbering>"""
    doc_xml_3 = wrap_doc([
        make_para("Phan mot", num_id=1, ilvl=0),
        make_para("Muc con a", num_id=1, ilvl=1),
        make_para("Muc con b", num_id=1, ilvl=1),
        make_para("Phan hai", num_id=1, ilvl=0),
        make_para("Muc con sau phan hai", num_id=1, ilvl=1),
    ])
    create_docx(os.path.join(FIXTURES_DIR, "case3_lvl_restart_0.docx"), doc_xml_3, num_xml_3)

    # 3b. abstract_lvl_restart_0.docx: w:lvlRestart val=0 directly in w:abstractNum/w:lvl
    num_xml_3b = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:abstractNum w:abstractNumId="1">
    <w:multiLevelType w:val="multilevel"/>
    <w:lvl w:ilvl="0">
      <w:start w:val="1"/>
      <w:numFmt w:val="decimal"/>
      <w:lvlText w:val="%1."/>
      <w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr>
    </w:lvl>
    <w:lvl w:ilvl="1">
      <w:start w:val="1"/>
      <w:numFmt w:val="lowerLetter"/>
      <w:lvlRestart w:val="0"/>
      <w:lvlText w:val="%2)"/>
      <w:pPr><w:ind w:left="1440" w:hanging="360"/></w:pPr>
    </w:lvl>
  </w:abstractNum>
  <w:num w:numId="1">
    <w:abstractNumId w:val="1"/>
  </w:num>
</w:numbering>"""
    doc_xml_3b = wrap_doc([
        make_para("Phan mot", num_id=1, ilvl=0),
        make_para("Muc con a", num_id=1, ilvl=1),
        make_para("Muc con b", num_id=1, ilvl=1),
        make_para("Phan hai", num_id=1, ilvl=0),
        make_para("Muc con tiep tuc sau phan hai", num_id=1, ilvl=1),
    ])
    create_docx(os.path.join(FIXTURES_DIR, "case3b_abstract_lvl_restart_0.docx"), doc_xml_3b, num_xml_3b)

    # 4. lvl-restart-n.docx: override with w:lvl containing w:lvlRestart val=N (val=1)
    # ilvl 0 (top level, 1-based index 1): decimal %1.
    # ilvl 1 (mid level, 1-based index 2): lowerLetter %2)
    # ilvl 2 (deep level, 1-based index 3): lowerRoman %3.
    # lvlOverride on ilvl=2 with lvlRestart=1
    num_xml_4 = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:abstractNum w:abstractNumId="1">
    <w:multiLevelType w:val="multilevel"/>
    <w:lvl w:ilvl="0">
      <w:start w:val="1"/>
      <w:numFmt w:val="decimal"/>
      <w:lvlText w:val="%1."/>
      <w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr>
    </w:lvl>
    <w:lvl w:ilvl="1">
      <w:start w:val="1"/>
      <w:numFmt w:val="lowerLetter"/>
      <w:lvlText w:val="%2)"/>
      <w:pPr><w:ind w:left="1440" w:hanging="360"/></w:pPr>
    </w:lvl>
    <w:lvl w:ilvl="2">
      <w:start w:val="1"/>
      <w:numFmt w:val="lowerRoman"/>
      <w:lvlText w:val="%3."/>
      <w:pPr><w:ind w:left="2160" w:hanging="360"/></w:pPr>
    </w:lvl>
  </w:abstractNum>
  <w:num w:numId="1">
    <w:abstractNumId w:val="1"/>
    <w:lvlOverride w:ilvl="2">
      <w:lvl w:ilvl="2">
        <w:start w:val="1"/>
        <w:numFmt w:val="lowerRoman"/>
        <w:lvlRestart w:val="1"/>
        <w:lvlText w:val="%3."/>
      </w:lvl>
    </w:lvlOverride>
  </w:num>
</w:numbering>"""
    doc_xml_4 = wrap_doc([
        make_para("Cap khong dot mot", num_id=1, ilvl=0),
        make_para("Cap mot dot mot", num_id=1, ilvl=1),
        make_para("Cap hai muc mot", num_id=1, ilvl=2),
        make_para("Cap mot dot hai", num_id=1, ilvl=1),
        make_para("Cap hai muc hai", num_id=1, ilvl=2),
        make_para("Cap khong dot hai", num_id=1, ilvl=0),
        make_para("Cap mot dot ba", num_id=1, ilvl=1),
        make_para("Cap hai muc ba", num_id=1, ilvl=2),
    ])
    create_docx(os.path.join(FIXTURES_DIR, "case4_lvl_restart_n.docx"), doc_xml_4, num_xml_4)

    # 4b. abstract_lvl_restart_n.docx: w:lvlRestart val=1 directly in w:abstractNum/w:lvl
    num_xml_4b = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:abstractNum w:abstractNumId="1">
    <w:multiLevelType w:val="multilevel"/>
    <w:lvl w:ilvl="0">
      <w:start w:val="1"/>
      <w:numFmt w:val="decimal"/>
      <w:lvlText w:val="%1."/>
      <w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr>
    </w:lvl>
    <w:lvl w:ilvl="1">
      <w:start w:val="1"/>
      <w:numFmt w:val="lowerLetter"/>
      <w:lvlText w:val="%2)"/>
      <w:pPr><w:ind w:left="1440" w:hanging="360"/></w:pPr>
    </w:lvl>
    <w:lvl w:ilvl="2">
      <w:start w:val="1"/>
      <w:numFmt w:val="lowerRoman"/>
      <w:lvlRestart w:val="1"/>
      <w:lvlText w:val="%3."/>
      <w:pPr><w:ind w:left="2160" w:hanging="360"/></w:pPr>
    </w:lvl>
  </w:abstractNum>
  <w:num w:numId="1">
    <w:abstractNumId w:val="1"/>
  </w:num>
</w:numbering>"""
    doc_xml_4b = wrap_doc([
        make_para("Cap khong dot mot", num_id=1, ilvl=0),
        make_para("Cap mot dot mot", num_id=1, ilvl=1),
        make_para("Cap hai muc mot", num_id=1, ilvl=2),
        make_para("Cap mot dot hai", num_id=1, ilvl=1),
        make_para("Cap hai muc hai", num_id=1, ilvl=2),
        make_para("Cap khong dot hai", num_id=1, ilvl=0),
        make_para("Cap mot dot ba", num_id=1, ilvl=1),
        make_para("Cap hai muc ba", num_id=1, ilvl=2),
    ])
    create_docx(os.path.join(FIXTURES_DIR, "case4b_abstract_lvl_restart_n.docx"), doc_xml_4b, num_xml_4b)

    # 5. multi-numid.docx: two numIds sharing the same abstractNum
    num_xml_5 = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:abstractNum w:abstractNumId="1">
    <w:multiLevelType w:val="multilevel"/>
    <w:lvl w:ilvl="0">
      <w:start w:val="1"/>
      <w:numFmt w:val="decimal"/>
      <w:lvlText w:val="%1."/>
      <w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr>
    </w:lvl>
  </w:abstractNum>
  <w:num w:numId="1">
    <w:abstractNumId w:val="1"/>
  </w:num>
  <w:num w:numId="2">
    <w:abstractNumId w:val="1"/>
  </w:num>
</w:numbering>"""
    doc_xml_5 = wrap_doc([
        make_para("Danh sach A muc mot", num_id=1, ilvl=0),
        make_para("Danh sach A muc hai", num_id=1, ilvl=0),
        make_para("Danh sach B muc mot", num_id=2, ilvl=0),
        make_para("Danh sach B muc hai", num_id=2, ilvl=0),
        make_para("Danh sach A muc ba", num_id=1, ilvl=0),
    ])
    create_docx(os.path.join(FIXTURES_DIR, "case5_multi_numid_same_abstract.docx"), doc_xml_5, num_xml_5)

    # 5b. multi_numid_with_start_override.docx: two numIds sharing abstractNum, but num 2 has startOverride
    num_xml_5b = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:abstractNum w:abstractNumId="1">
    <w:multiLevelType w:val="multilevel"/>
    <w:lvl w:ilvl="0">
      <w:start w:val="1"/>
      <w:numFmt w:val="decimal"/>
      <w:lvlText w:val="%1."/>
      <w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr>
    </w:lvl>
  </w:abstractNum>
  <w:num w:numId="1">
    <w:abstractNumId w:val="1"/>
  </w:num>
  <w:num w:numId="2">
    <w:abstractNumId w:val="1"/>
    <w:lvlOverride w:ilvl="0">
      <w:startOverride w:val="10"/>
    </w:lvlOverride>
  </w:num>
</w:numbering>"""
    doc_xml_5b = wrap_doc([
        make_para("Danh sach 1 muc mot", num_id=1, ilvl=0),
        make_para("Danh sach 1 muc hai", num_id=1, ilvl=0),
        make_para("Danh sach 2 muc mot", num_id=2, ilvl=0),
        make_para("Danh sach 2 muc hai", num_id=2, ilvl=0),
        make_para("Danh sach 1 muc ba", num_id=1, ilvl=0),
    ])
    create_docx(os.path.join(FIXTURES_DIR, "case5b_multi_numid_with_start_override.docx"), doc_xml_5b, num_xml_5b)

    # 6. deep-then-shallow.docx: deeper level after shallower level
    num_xml_6 = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:abstractNum w:abstractNumId="1">
    <w:multiLevelType w:val="multilevel"/>
    <w:lvl w:ilvl="0">
      <w:start w:val="1"/>
      <w:numFmt w:val="decimal"/>
      <w:lvlText w:val="%1."/>
      <w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr>
    </w:lvl>
    <w:lvl w:ilvl="1">
      <w:start w:val="1"/>
      <w:numFmt w:val="lowerLetter"/>
      <w:lvlText w:val="%2)"/>
      <w:pPr><w:ind w:left="1440" w:hanging="360"/></w:pPr>
    </w:lvl>
    <w:lvl w:ilvl="2">
      <w:start w:val="1"/>
      <w:numFmt w:val="lowerRoman"/>
      <w:lvlText w:val="%3."/>
      <w:pPr><w:ind w:left="2160" w:hanging="360"/></w:pPr>
    </w:lvl>
  </w:abstractNum>
  <w:num w:numId="1">
    <w:abstractNumId w:val="1"/>
  </w:num>
</w:numbering>"""
    doc_xml_6 = wrap_doc([
        make_para("Cap nong mot", num_id=1, ilvl=0),
        make_para("Cap trung a", num_id=1, ilvl=1),
        make_para("Cap sau mot", num_id=1, ilvl=2),
        make_para("Cap sau hai", num_id=1, ilvl=2),
        make_para("Cap nong hai", num_id=1, ilvl=0),
        make_para("Cap sau sau cap nong hai", num_id=1, ilvl=2),
        make_para("Cap trung sau cap sau", num_id=1, ilvl=1),
        make_para("Cap sau tiep theo", num_id=1, ilvl=2),
    ])
    create_docx(os.path.join(FIXTURES_DIR, "case6_deep_then_shallow.docx"), doc_xml_6, num_xml_6)

    # 7. control-no-override.docx: control case without any override
    num_xml_7 = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:abstractNum w:abstractNumId="1">
    <w:multiLevelType w:val="multilevel"/>
    <w:lvl w:ilvl="0">
      <w:start w:val="1"/>
      <w:numFmt w:val="decimal"/>
      <w:lvlText w:val="%1."/>
      <w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr>
    </w:lvl>
    <w:lvl w:ilvl="1">
      <w:start w:val="1"/>
      <w:numFmt w:val="lowerLetter"/>
      <w:lvlText w:val="%2)"/>
      <w:pPr><w:ind w:left="1440" w:hanging="360"/></w:pPr>
    </w:lvl>
  </w:abstractNum>
  <w:num w:numId="1">
    <w:abstractNumId w:val="1"/>
  </w:num>
</w:numbering>"""
    doc_xml_7 = wrap_doc([
        make_para("Doi chung phan mot", num_id=1, ilvl=0),
        make_para("Doi chung muc a", num_id=1, ilvl=1),
        make_para("Doi chung muc b", num_id=1, ilvl=1),
        make_para("Doi chung phan hai", num_id=1, ilvl=0),
        make_para("Doi chung muc a sau phan hai", num_id=1, ilvl=1),
    ])
    create_docx(os.path.join(FIXTURES_DIR, "case7_control_no_override.docx"), doc_xml_7, num_xml_7)

    print("Generated 7 test DOCX files in:", FIXTURES_DIR)

if __name__ == "__main__":
    generate_all()
