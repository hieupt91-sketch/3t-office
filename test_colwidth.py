from adapters.libreoffice.common.ooxml_zip_patch import _get_fods_column_widths_by_letter

# Create a minimal FODS with column widths
fods = '''<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0">
<office:automatic-styles>
<style:style style:name="co1" style:family="table-column"><style:table-column-properties style:column-width="1.41cm"/></style:style>
<style:style style:name="co2" style:family="table-column"><style:table-column-properties style:column-width="11.27cm"/></style:style>
<style:style style:name="co3" style:family="table-column"><style:table-column-properties style:column-width="10.92cm"/></style:style>
</office:automatic-styles>
<office:body><office:spreadsheet>
<table:table table:name="Sheet1">
<table:table-column table:style-name="co1"/>
<table:table-column table:style-name="co2"/>
<table:table-column table:style-name="co3"/>
<table:table-row><table:table-cell/><table:table-cell/><table:table-cell/></table:table-row>
</table:table>
</office:spreadsheet></office:body></office:document>'''

col_widths = _get_fods_column_widths_by_letter(fods)
print('Column widths:', col_widths)