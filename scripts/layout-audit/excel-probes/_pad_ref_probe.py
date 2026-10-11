"""Tham chieu descent (pad) den tu dau? Bien the: <cols> style, spans, dimension, o center/bottom."""
import zipfile, subprocess, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
def build(name, cols_xml, rows_xml, dimension=""):
    sheet = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
             + dimension + '<sheetFormatPr defaultRowHeight="15"/>' + cols_xml + '<sheetData>' + rows_xml + '</sheetData></worksheet>')
    wb = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="S" sheetId="1" r:id="rId1"/></sheets></workbook>'
    rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'
    root_rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'
    ct = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>'
    # fonts: 0 Calibri 11, 1 Calibri 10, 2 TNR 10, 3 Arial 12 ; xfs: 0 normal, 1 Cal10 wrap center, 2 Cal10 bottom, 3 Cal11 (col style), 4 Arial12 bottom, 5 TNR10 bottom, 6 Cal10 wrap bottom, 7 Arial12 center
    styles = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="4">'
              '<font><sz val="11"/><color theme="1"/><name val="Calibri"/><family val="2"/><scheme val="minor"/></font>'
              '<font><sz val="10"/><name val="Calibri"/><family val="2"/></font><font><sz val="10"/><name val="Times New Roman"/><family val="1"/></font><font><sz val="12"/><name val="Arial"/><family val="2"/></font></fonts>'
              '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders>'
              '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
              '<cellXfs count="8"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'
              '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>'
              '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>'
              '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyFont="1"/>'
              '<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/>'
              '<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>'
              '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment wrapText="1"/></xf>'
              '<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="center"/></xf>'
              '</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>')
    path = os.path.join(HERE, f"_padref_{name}.xlsx")
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", ct); z.writestr("_rels/.rels", root_rels); z.writestr("xl/workbook.xml", wb)
        z.writestr("xl/_rels/workbook.xml.rels", rels); z.writestr("xl/worksheets/sheet1.xml", sheet.encode("utf-8")); z.writestr("xl/styles.xml", styles)
    return path
nl = "&#10;"
two = f'<is><t xml:space="preserve">Xg{nl}Xg</t></is>'
one = '<is><t>Xg</t></is>'
cases = {
    # E center 2 lines Cal10 + A..D,F,G bottom Cal10 1 line ; cols A-G style Cal11
    "cols_AG_centerE_bottomOthers": ('<cols><col min="1" max="7" width="12" style="3" customWidth="1"/></cols>',
        f'<row r="1" spans="1:7"><c r="A1" s="2" t="inlineStr">{one}</c><c r="E1" s="1" t="inlineStr">{two}</c><c r="G1" s="2" t="inlineStr">{one}</c></row>'),
    "nocols_centerE_bottomOthers": ('', f'<row r="1" spans="1:7"><c r="A1" s="2" t="inlineStr">{one}</c><c r="E1" s="1" t="inlineStr">{two}</c><c r="G1" s="2" t="inlineStr">{one}</c></row>'),
    "cols_AG_centerE_only": ('<cols><col min="1" max="7" width="12" style="3" customWidth="1"/></cols>', f'<row r="1" spans="1:7"><c r="E1" s="1" t="inlineStr">{two}</c></row>'),
    "cols_all_centerE_only": ('<cols><col min="1" max="16384" width="12" style="3" customWidth="1"/></cols>', f'<row r="1"><c r="E1" s="1" t="inlineStr">{two}</c></row>'),
    "nocols_centerE_only": ('', f'<row r="1"><c r="E1" s="1" t="inlineStr">{two}</c></row>'),
    "nocols_bottomE_only": ('', f'<row r="1"><c r="E1" s="6" t="inlineStr">{two}</c></row>'),
    "cols_all_bottomE_only": ('<cols><col min="1" max="16384" width="12" style="3" customWidth="1"/></cols>', f'<row r="1"><c r="E1" s="6" t="inlineStr">{two}</c></row>'),
    "nocols_Arial12center_only": ('', f'<row r="1"><c r="E1" s="7" t="inlineStr">{one}</c></row>'),
    "nocols_Arial12bottom_only": ('', f'<row r="1"><c r="E1" s="4" t="inlineStr">{one}</c></row>'),
    "cols_all_TNR10style_TNR10bottom": ('<cols><col min="1" max="16384" width="12" style="5" customWidth="1"/></cols>', f'<row r="1"><c r="E1" s="5" t="inlineStr">{one}</c></row>'),
    "cols_all_TNR10style_Arial12bottom": ('<cols><col min="1" max="16384" width="12" style="5" customWidth="1"/></cols>', f'<row r="1"><c r="E1" s="4" t="inlineStr">{one}</c></row>'),
    "cols_all_TNR10style_empty_row": ('<cols><col min="1" max="16384" width="12" style="5" customWidth="1"/></cols>', '<row r="1"/>'),
    "cols_AG_TNR10style_Arial12bottom_dimAG": ('<cols><col min="1" max="7" width="12" style="5" customWidth="1"/></cols>', f'<row r="1" spans="1:7"><c r="E1" s="4" t="inlineStr">{one}</c></row>', '<dimension ref="A1:G1"/>'),
}
for name, spec in cases.items():
    path = build(name, spec[0], spec[1], spec[2] if len(spec) > 2 else "")
    ps = f'''
$excel = New-Object -ComObject Excel.Application; $excel.Visible = $false; $excel.DisplayAlerts = $false
try {{ $wb = $excel.Workbooks.Open("{path}"); $ws = $wb.Worksheets.Item(1); "{{0}}" -f ($ws.Rows.Item(1).RowHeight / 0.75) }} finally {{ $wb.Close($false); $excel.Quit() }}
'''
    psp = os.path.join(HERE, "_padref.ps1"); open(psp, "w", encoding="utf-8-sig").write(ps)
    r = subprocess.run(["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", psp], capture_output=True, text=True)
    print(f"{name:40} -> {r.stdout.strip()}px {r.stderr.strip()[-80:]}")
