# Excel ngat dong sau ky tu nao (ngoai khoang trang)? Cot ~60px TNR 10: "WWWW<sep>WWWW" — 2 dong neu ngat duoc tai sep, else ngat theo ky tu (van 2 dong)...
# -> dung chuoi "WWW<sep>WWW" voi cot vua du cho "WWW<sep>" + mot phan: neu ngat tai sep thi dong 1 = "WWW<sep>", dong 2 = "WWW" (2 dong);
#    neu khong ngat duoc thi ngat ky tu -> cung 2 dong. Phan biet bang cach do: "WWWWWW<sep>WW" (8 ky tu) trong cot chua vua 7 ky tu:
#    ngat tai sep -> "WWWWWW<sep>" | "WW" = 2 dong; khong -> ngat ky tu: 7 | 1 = 2 dong. Van 2. Dung cach khac:
# Do ChieuCao voi text "AAAA<sep>BBBB CCCC" trong cot chua vua "AAAA<sep>BBBB" + 1 ky tu nhung khong vua "... CCCC":
#    - ngat sau khoang trang: dong 1 "AAAA<sep>BBBB " dong 2 "CCCC" -> 2 dong
#    - neu sep cung la diem ngat thi khong doi. Khong phan biet duoc.
# => Cach dung: text "AAAAAAAA<sep>BB" trong cot chua vua 9 ky tu: neu sep la diem ngat -> "AAAAAAAA<sep>" (9) | "BB" = 2 dong;
#    neu khong -> ngat ky tu tai 9: "AAAAAAAA<sep>" | "BB" cung 2 dong. Hmm. Dung cot chua vua 10 ky tu voi "AAAAAAAA<sep>BBBB":
#    ngat tai sep -> "AAAAAAAA<sep>" | "BBBB" (2 dong); ngat ky tu -> "AAAAAAAA<sep>B" | "BBB" (2 dong). Van 2!
# => Phai do bang 3 dong: "AAAAAAAA<sep>BBBBBBBB<sep>CC" cot vua 10 ky tu: ngat tai sep: "AAAAAAAA<sep>" | "BBBBBBBB<sep>" | "CC" = 3;
#    ngat ky tu: 10 | 10 | 0 -> "AAAAAAAA<sep>B" | "BBBBBBB<sep>CC" = 2 dong. Phan biet duoc.
$excel = New-Object -ComObject Excel.Application; $excel.Visible = $false; $excel.DisplayAlerts = $false
try {
  $wb = $excel.Workbooks.Add(); $ws = $wb.Worksheets.Item(1)
  $ws.Columns.Item(2).ColumnWidth = [double]((80 - 5) / 7)   # 80px: TNR 10 avail 76: "WWWW-W" (71) vua, "WWWW-WW" (85) khong
  $seps = @("-", "/", "_", ",", ".", ";", ":", ")", "]", "?", "!", [string][char]0x2013, [string][char]0x2014, "+", "=", "&", "*", "|", "\", "'", '"', [string][char]0x00A0, [string][char]0x2009)
  $r = 1
  foreach ($sep in $seps) {
    $c = $ws.Cells.Item($r, 2); $c.Font.Name = "Times New Roman"; $c.Font.Size = 10; $c.WrapText = $true; $c.NumberFormat = "@"
    $c.Value2 = "WWWW" + $sep + "WWWW" + $sep + "WW"
    $ws.Rows.Item($r).AutoFit() | Out-Null
    $h = $ws.Rows.Item($r).RowHeight
    $cref = $ws.Cells.Item($r, 3); $cref.Font.Name = "Times New Roman"; $cref.Font.Size = 10; $cref.WrapText = $true; $cref.Value2 = "X";
    "U+{0:X4} '{1}' -> {2}pt" -f [int][char]$sep, $sep, $h
    $r++
  }
  $c = $ws.Cells.Item($r, 2); $c.Font.Name = "Times New Roman"; $c.Font.Size = 10; $c.WrapText = $true; $c.Value2 = "WWWW WWWW WW"; $ws.Rows.Item($r).AutoFit() | Out-Null; "space -> " + $ws.Rows.Item($r).RowHeight + "pt"; $r++
  $c = $ws.Cells.Item($r, 2); $c.Font.Name = "Times New Roman"; $c.Font.Size = 10; $c.WrapText = $true; $c.Value2 = "WWWWWWWWWW"; $ws.Rows.Item($r).AutoFit() | Out-Null; "none -> " + $ws.Rows.Item($r).RowHeight + "pt"
} finally { $wb.Close($false); $excel.Quit() }
