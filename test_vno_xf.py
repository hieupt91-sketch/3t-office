import sys
sys.path.insert(0, '.')
from adapters.libreoffice.common.ooxml_zip_patch import _fods_cells_with_vno_xf, _parse_xlsx_styles_for_xf, read_zip_entry

# Test parsing vno:xf from sent FODS
with open('_rt_lan18.xlsx.sent.fods', 'r', encoding='utf-8') as f:
    fods = f.read()

vno_cells = _fods_cells_with_vno_xf(fods)
print('vno_cells:', vno_cells)

# Test parsing styles from original XLSX
with open('file test/lan/lan18.xlsx', 'rb') as f:
    xlsx_bytes = f.read()

xf_elements, font_elements, fill_elements, border_elements, numfmt_elements = _parse_xlsx_styles_for_xf(xlsx_bytes)
print('xf count:', len(xf_elements))
print('font count:', len(font_elements))
print('fill count:', len(fill_elements))
print('border count:', len(border_elements))
print('numfmt count:', len(numfmt_elements))