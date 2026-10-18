# Đọc lại bằng PowerPoint 2016 thật (ẩn, chỉ đọc) tệp do tests/live/cdp/slides-shape-size-dialog.desktop.mjs lưu ra: kích thước điểm (pt) và góc xoay.
param([string]$Path = "E:\VNOffice-profiles\claude-slidetrans\shape_size.pptx")
$ErrorActionPreference = "Stop"
$p = New-Object -ComObject PowerPoint.Application
try {
  $d = $p.Presentations.Open($Path, -1, 0, 0)
  $rows = @()
  foreach ($s in $d.Slides.Item(1).Shapes) {
    if ($s.Type -eq 14) { continue }
    $rows += [ordered]@{ name = $s.Name; w = [math]::Round($s.Width, 1); h = [math]::Round($s.Height, 1); rotation = [math]::Round($s.Rotation, 1); left = [math]::Round($s.Left, 1); top = [math]::Round($s.Top, 1) }
  }
  $d.Close()
  $rows | ConvertTo-Json
} finally {
  $p.Quit()
}
