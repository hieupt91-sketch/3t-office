"""MAC-9: build a small DOCX stress corpus, one document per common Office font (no font files involved).

Each document sets a single font on every script slot (ascii/hAnsi/eastAsia/cs) of the default run style and
holds ~2.5 pages of Vietnamese + Latin text, so a substitute with different advance widths or line height moves
the page count. The files are generated, never copied from another product, and are written OUTSIDE the repo.

Usage: python tests/macos/fonts/make_font_corpus.py --out-dir <scratch>/font-corpus
"""

from __future__ import annotations

import argparse
import re
import sys
import zipfile
from pathlib import Path
from xml.sax.saxutils import escape

REPO = Path(__file__).resolve().parents[3]

FONTS = (
    "Calibri", "Cambria", "Arial", "Times New Roman", "Courier New", "Segoe UI",
    "Lucida Sans", "NSimSun", "SimSun", "Aptos", "Calibri Light", "Consolas",
)

PARAGRAPHS = (
    "Căn cứ Luật Tổ chức Chính phủ ngày 19 tháng 6 năm 2015; Ủy ban nhân dân tỉnh ban hành quy định về việc "
    "tiếp nhận, thẩm định và phê duyệt hồ sơ đề nghị hỗ trợ kinh phí cho các doanh nghiệp nhỏ và vừa.",
    "Điều 1. Phạm vi điều chỉnh: Quy định này áp dụng đối với cơ quan, tổ chức, cá nhân có liên quan đến việc "
    "quản lý, sử dụng nguồn vốn ngân sách nhà nước; những trường hợp đặc biệt sẽ được xem xét riêng.",
    "Quarterly revenue grew 12.5% year over year, driven by strong demand in the northern region; operating "
    "expenses remained flat while gross margin improved by 180 basis points compared with the prior period.",
    "Người lập biểu kiểm tra số liệu, đối chiếu chứng từ gốc và ký xác nhận trước khi chuyển kế toán trưởng; "
    "mọi sai lệch phải được giải trình bằng văn bản, ghi rõ nguyên nhân, thời điểm phát hiện và hướng xử lý.",
    "Tiếng Việt có sáu thanh điệu: ngang, huyền (à), sắc (á), hỏi (ả), ngã (ã), nặng (ạ); các nguyên âm ă, â, "
    "ê, ô, ơ, ư cùng phụ âm đ phải hiển thị đúng dấu, không được rơi vào phông dự phòng khác kiểu chữ.",
)


def slug(font: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", font.lower()).strip("-")


def document_xml(font: str, repeats: int) -> str:
    body = []
    for i in range(repeats):
        text = PARAGRAPHS[i % len(PARAGRAPHS)]
        body.append(f'<w:p><w:r><w:t xml:space="preserve">{escape(f"{i + 1}. {text}")}</w:t></w:r></w:p>')
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'
        + "".join(body)
        + '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/>'
        '<w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/>'
        "</w:sectPr></w:body></w:document>"
    )


def styles_xml(font: str) -> str:
    f = escape(font, {'"': "&quot;"})
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        f'<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="{f}" w:hAnsi="{f}" w:eastAsia="{f}" w:cs="{f}"/>'
        '<w:sz w:val="22"/><w:szCs w:val="22"/><w:lang w:val="vi-VN" w:eastAsia="en-US" w:bidi="ar-SA"/></w:rPr></w:rPrDefault>'
        '<w:pPrDefault><w:pPr><w:spacing w:after="160" w:line="259" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>'
        '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>'
        "</w:styles>"
    )


def font_table_xml(font: str) -> str:
    f = escape(font, {'"': "&quot;"})
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<w:fonts xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        f'<w:font w:name="{f}"/></w:fonts>'
    )


CONTENT_TYPES = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
    '<Default Extension="xml" ContentType="application/xml"/>'
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
    '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>'
    '<Override PartName="/word/fontTable.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml"/>'
    "</Types>"
)
ROOT_RELS = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
    "</Relationships>"
)
DOC_RELS = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable" Target="fontTable.xml"/>'
    "</Relationships>"
)


def write_docx(path: Path, font: str, repeats: int) -> None:
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", CONTENT_TYPES)
        z.writestr("_rels/.rels", ROOT_RELS)
        z.writestr("word/_rels/document.xml.rels", DOC_RELS)
        z.writestr("word/document.xml", document_xml(font, repeats))
        z.writestr("word/styles.xml", styles_xml(font))
        z.writestr("word/fontTable.xml", font_table_xml(font))


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--out-dir", type=Path, required=True)
    ap.add_argument("--repeats", type=int, default=40, help="paragraphs per document (40 ≈ 2.5 A4 pages at 11 pt)")
    args = ap.parse_args(argv)
    out = args.out_dir.resolve()
    if out == REPO or REPO in out.parents:
        print("refusing to write the corpus inside the repo; pass --out-dir outside it", file=sys.stderr)
        return 2
    out.mkdir(parents=True, exist_ok=True)
    for font in FONTS:
        target = out / f"font-{slug(font)}.docx"
        write_docx(target, font, args.repeats)
        print(target)
    return 0


if __name__ == "__main__":
    sys.exit(main())
