# Excel 2016 probes (S31) — cac script do COM/anh chup dung de rut quy tac S31a..S31i, S32 (docs/QUY-UOC-DOI-CHIEU.md).
# Chay tu goc repo, can Excel 2016; duong dan scratch trong vai script tro toi thu muc nay hoac E:\VN OFice\file test\lan (khong commit).
#   _excel_multiline.ps1 / _excel_mixed2.ps1 : n dong, run dam/thuong, font Normal khac -> L, pad = max(0, D_Normal - d)
#   _excel_wrap_exact.py + _excel_wrap_lines.ps1 + _wrap_model2.py : nguong ngat dong -> be rong natural + le = 2*floor((MDW+3)/4)
#   _excel_rowpx_shot.ps1 / _custom_ht_probe.py : px man hinh hang customHeight = floor((ht*20+1)/15)
#   _auto_ht_probe.py / _lan12_r16_probe.py : hang tu dong bo qua ht
#   _std_height_probe*.py : StandardHeight = font style cot (khong phai defaultRowHeight)
#   _pad_ref_probe.py / _valign_probe.ps1 / _pad_single.ps1 : dem chi cho o can day, tham chieu = o ngam
#   _border_probe.ps1 : vien duoi medium/thick +1, double +2, vien tren thick/double +1
#   _break_chars.ps1 : diem ngat = khoang trang va '-'
#   _underline_probe.ps1 / _dydescent_probe.py : nghieng doi metric; gach chan/dau tieng Viet/dyDescent khong
#   _gdi_descent.py / _gdi_sum.py : tmDescent GDI, be rong GDI (khong phai be rong Excel)
#   _rows_all.py / _row_extents.py / _wrap_debug.py : doi chieu rows Python voi *.geom.json
