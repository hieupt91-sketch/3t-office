param([string]$Path = "E:\VNOffice-profiles\claude-slidetrans\variants.pptx")
# Đọc lại bảng màu / phông chủ đề của bản cái bằng PowerPoint thật (ẩn, chỉ đọc).
$app = New-Object -ComObject PowerPoint.Application
try {
  $p = $app.Presentations.Open($Path, -1, 0, 0)
  $m = $p.SlideMaster
  $cs = $m.Theme.ThemeColorScheme
  $out = [ordered]@{}
  foreach ($i in 1..12) { $c = $cs.Colors($i).RGB; $out["c$i"] = "{0:X2}{1:X2}{2:X2}" -f ($c -band 255), (($c -shr 8) -band 255), (($c -shr 16) -band 255) }
  $out.major = $m.Theme.ThemeFontScheme.MajorFont.Item(1).Name
  $out.minor = $m.Theme.ThemeFontScheme.MinorFont.Item(1).Name
  $out | ConvertTo-Json -Compress
  $p.Close()
} finally { $app.Quit() }
