# Đọc lại bằng PowerPoint 2016 thật (ẩn, chỉ đọc) tệp do tests/live/cdp/slides-ink-keep.desktop.mjs lưu ra:
# liệt kê hình trang 1 (tên, loại, kích thước, màu/độ dày nét).
param([string]$Path = "E:\VNOffice-profiles\claude-slidetrans\ink_keep.pptx")
$ErrorActionPreference = "Stop"
$p = New-Object -ComObject PowerPoint.Application
try {
  $d = $p.Presentations.Open($Path, -1, 0, 0)
  $rows = @()
  foreach ($s in $d.Slides.Item(1).Shapes) {
    $rows += [ordered]@{ name = $s.Name; type = $s.Type; w = [math]::Round($s.Width, 1); h = [math]::Round($s.Height, 1); lineVisible = $s.Line.Visible; lineWeight = $s.Line.Weight; lineRGB = $s.Line.ForeColor.RGB; fillVisible = $s.Fill.Visible }
  }
  $d.Close()
  $rows | ConvertTo-Json -Depth 3
} finally {
  $p.Quit()
}
