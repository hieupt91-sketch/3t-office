param([string]$Path)
$app = New-Object -ComObject PowerPoint.Application
try {
  $p = $app.Presentations.Open($Path, -1, 0, 0)
  "slides=$($p.Slides.Count)"
  "size=$($p.PageSetup.SlideSize)"
  foreach ($s in $p.Slides) {
    "slide=$($s.SlideIndex);layout=$($s.CustomLayout.Name);shapes=$($s.Shapes.Count);transition=$($s.SlideShowTransition.EntryEffect);auto=$($s.SlideShowTransition.AdvanceOnTime)/$($s.SlideShowTransition.AdvanceTime)"
    foreach ($e in $s.TimeLine.MainSequence) {
      "  effect=$($e.EffectType);trigger=$($e.Timing.TriggerType);duration=$($e.Timing.Duration);delay=$($e.Timing.TriggerDelayTime);shape=$($e.Shape.Name)"
    }
  }
  $p.Close()
} finally {
  $app.Quit()
}
