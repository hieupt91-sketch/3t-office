# Đọc lại bằng PowerPoint 2016 thật (ẩn, chỉ đọc): tên và Visible của từng hình trên trang 1.
param([string]$Path = "E:\VNOffice-profiles\claude-shapenames\shape_names.pptx")
$ErrorActionPreference = "Stop"
$p = New-Object -ComObject PowerPoint.Application
try {
  $d = $p.Presentations.Open($Path, -1, 0, 0)
  $rows = @(); foreach ($s in $d.Slides(1).Shapes) { $rows += [ordered]@{ name = $s.Name; visible = $s.Visible; type = $s.Type } }
  [ordered]@{ count = $d.Slides(1).Shapes.Count; shapes = $rows } | ConvertTo-Json -Depth 4
  $d.Close()
} finally { $p.Quit() }