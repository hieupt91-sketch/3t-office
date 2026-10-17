param([string]$Path = "E:\VNOffice-profiles\claude-slidetrans\anim_tab.pptx")
# Đọc lại hiệu ứng hoạt hình từng slide bằng PowerPoint thật (ẩn, chỉ đọc): kiểu, thời điểm bắt đầu, thời lượng, trễ.
$app = New-Object -ComObject PowerPoint.Application
try {
  $p = $app.Presentations.Open($Path, -1, 0, 0)
  foreach ($s in $p.Slides) {
    foreach ($e in $s.TimeLine.MainSequence) {
      "slide {0}: effect={1} trigger={2} duration={3} delay={4} shape={5}" -f $s.SlideIndex, $e.EffectType, $e.Timing.TriggerType, $e.Timing.Duration, $e.Timing.TriggerDelayTime, $e.Shape.Name
    }
  }
  $p.Close()
} finally { $app.Quit() }
