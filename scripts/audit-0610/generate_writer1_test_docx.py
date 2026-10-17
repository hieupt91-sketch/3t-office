"""Tao file DOCX kiem thu tron ven 5 tinh nang AGY-WRITER1 de Word 2016 COM doc va kiem chung."""

import io
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from adapters.libreoffice.common import ooxml_zip_patch as patcher

def generate_test_docx(out_path: str):
    source_html = (
        '<html><body>'
        '<p data-vno-tabs="5:l:n;10:dec:d;14:r:u;16:bar:n">Dong 1 co diem dung Tab</p>'
        '<table data-vno-table-align="center" data-vno-table-indent="18" data-vno-cell-spacing="2.83" '
        'data-vno-cell-mar-top="5.67" data-vno-cell-mar-bottom="5.67" data-vno-cell-mar-left="8.5" data-vno-cell-mar-right="8.5">'
        '<tr>'
        '<td data-vno-text-direction="tbRl"><p>Cot Doc 90</p></td>'
        '<td data-vno-text-direction="btLr"><p>Cot Doc 270</p></td>'
        '<td><p>Cot Ngang</p></td>'
        '</tr>'
        '<tr><td><p>A2</p></td><td><p>B2</p></td><td><p>C2</p></td></tr>'
        '</table>'
        '<p><br></p>'
        '<table>'
        '<tr><td><p>Bang 2 o 1</p></td><td><p>Bang 2 o 2</p></td></tr>'
        '</table>'
        '</body></html>'
    )

    doc_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        '<w:body>'
        '<w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr><w:r><w:t>Dong 1 co diem dung Tab</w:t></w:r></w:p>'
        '<w:tbl>'
        '<w:tblPr><w:tblW w:w="8500" w:type="dxa"/></w:tblPr>'
        '<w:tr>'
        '<w:tc><w:tcPr><w:tcW w:w="2800" w:type="dxa"/></w:tcPr><w:p><w:r><w:t>Cot Doc 90</w:t></w:r></w:p></w:tc>'
        '<w:tc><w:tcPr><w:tcW w:w="2800" w:type="dxa"/></w:tcPr><w:p><w:r><w:t>Cot Doc 270</w:t></w:r></w:p></w:tc>'
        '<w:tc><w:tcPr><w:tcW w:w="2900" w:type="dxa"/></w:tcPr><w:p><w:r><w:t>Cot Ngang</w:t></w:r></w:p></w:tc>'
        '</w:tr>'
        '<w:tr>'
        '<w:tc><w:tcPr><w:tcW w:w="2800" w:type="dxa"/></w:tcPr><w:p><w:r><w:t>A2</w:t></w:r></w:p></w:tc>'
        '<w:tc><w:tcPr><w:tcW w:w="2800" w:type="dxa"/></w:tcPr><w:p><w:r><w:t>B2</w:t></w:r></w:p></w:tc>'
        '<w:tc><w:tcPr><w:tcW w:w="2900" w:type="dxa"/></w:tcPr><w:p><w:r><w:t>C2</w:t></w:r></w:p></w:tc>'
        '</w:tr>'
        '</w:tbl>'
        '<w:p><w:r><w:t></w:t></w:r></w:p>'
        '<w:tbl>'
        '<w:tblPr><w:tblW w:w="8500" w:type="dxa"/></w:tblPr>'
        '<w:tr>'
        '<w:tc><w:tcPr><w:tcW w:w="4250" w:type="dxa"/></w:tcPr><w:p><w:r><w:t>Bang 2 o 1</w:t></w:r></w:p></w:tc>'
        '<w:tc><w:tcPr><w:tcW w:w="4250" w:type="dxa"/></w:tcPr><w:p><w:r><w:t>Bang 2 o 2</w:t></w:r></w:p></w:tc>'
        '</w:tr>'
        '</w:tbl>'
        '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr>'
        '</w:body></w:document>'
    )

    content_types = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
        '<Default Extension="xml" ContentType="application/xml"/>'
        '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
        '</Types>'
    )

    rels = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
        '</Relationships>'
    )

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", content_types)
        z.writestr("_rels/.rels", rels)
        z.writestr("word/document.xml", doc_xml)

    raw_bytes = buf.getvalue()
    patched = patcher.postprocess_created_writer_docx(raw_bytes, source_html=source_html)
    
    os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
    with open(out_path, "wb") as f:
        f.write(patched)
    print(f"Da tao thanh cong: {out_path} ({len(patched)} bytes)")

if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "docs/writer1_test_output.docx"
    generate_test_docx(out)
