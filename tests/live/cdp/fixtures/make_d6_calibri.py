"""FIX-D6-2510: writes d6-calibri.docx / d6-calibri.xlsx (Calibri body, Calibri Light heading) into argv[1]."""
import zipfile, sys, os
out = sys.argv[1]
CT = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
def w(path, files):
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
        for n, d in files.items(): z.writestr(n, d)
W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'
docx = {
"[Content_Types].xml": CT+'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>',
"_rels/.rels": CT+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
"word/_rels/document.xml.rels": CT+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
"word/styles.xml": CT+f'<w:styles {W}><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Calibri" w:cs="Calibri"/><w:sz w:val="22"/></w:rPr></w:rPrDefault></w:docDefaults>'
  '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="22"/></w:rPr></w:style>'
  '<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="240"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:rFonts w:ascii="Calibri Light" w:hAnsi="Calibri Light"/><w:color w:val="2F5496"/><w:sz w:val="32"/></w:rPr></w:style></w:styles>',
"word/document.xml": CT+f'<w:document {W}><w:body>'
  '<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Tiêu đề Calibri Light — Kế hoạch năm 2026</w:t></w:r></w:p>'
  '<w:p><w:r><w:t>Đoạn văn Calibri: Hà Nội, ngày 25 tháng 10 năm 2026. Quốc hội thông qua nghị quyết.</w:t></w:r></w:p>'
  '<w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Chữ đậm Calibri</w:t></w:r><w:r><w:t xml:space="preserve"> và </w:t></w:r><w:r><w:rPr><w:i/></w:rPr><w:t>chữ nghiêng Calibri</w:t></w:r></w:p>'
  '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr></w:body></w:document>',
}
w(os.path.join(out, "d6-calibri.docx"), docx)
S = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"'
R = 'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"'
def c(ref, text, s=0): return f'<c r="{ref}" t="inlineStr" s="{s}"><is><t>{text}</t></is></c>'
xlsx = {
"[Content_Types].xml": CT+'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>',
"_rels/.rels": CT+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
"xl/_rels/workbook.xml.rels": CT+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
"xl/workbook.xml": CT+f'<workbook {S} {R}><sheets><sheet name="Trang1" sheetId="1" r:id="rId1"/></sheets></workbook>',
"xl/styles.xml": CT+f'<styleSheet {S}><fonts count="3"><font><sz val="11"/><name val="Calibri"/><family val="2"/></font><font><b/><sz val="11"/><name val="Calibri"/><family val="2"/></font><font><sz val="14"/><name val="Calibri Light"/><family val="2"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="3"><xf fontId="0"/><xf fontId="1" applyFont="1"/><xf fontId="2" applyFont="1"/></cellXfs></styleSheet>',
"xl/worksheets/sheet1.xml": CT+f'<worksheet {S}><cols><col min="1" max="3" width="28" customWidth="1"/></cols><sheetData>'
  f'<row r="1">{c("A1","Tiêu đề Calibri Light",2)}</row>'
  f'<row r="2">{c("A2","Mặt hàng",1)}{c("B2","Số lượng",1)}</row>'
  f'<row r="3">{c("A3","Bút bi Thiên Long")}{c("B3","Hà Nội — Quốc hội")}</row>'
  '</sheetData></worksheet>',
}
w(os.path.join(out, "d6-calibri.xlsx"), xlsx)
print("ok")
