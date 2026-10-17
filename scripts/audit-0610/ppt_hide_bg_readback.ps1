param([string]$Path = "E:\VNOffice-profiles\claude-slidetrans\hide_bg.pptx")
# Đọc lại DisplayMasterShapes từng slide bằng PowerPoint thật (ẩn, chỉ đọc).
$app = New-Object -ComObject PowerPoint.Application
try {
  $p = $app.Presentations.Open($Path, -1, 0, 0)
  foreach ($s in $p.Slides) { "{0}: DisplayMasterShapes={1} FollowMaster={2}" -f $s.SlideIndex, $s.DisplayMasterShapes, $s.FollowMasterBackground }
  $p.Close()
} finally { $app.Quit() }
