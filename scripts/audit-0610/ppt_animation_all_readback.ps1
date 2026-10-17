# Đọc lại hiệu ứng (kiểu, hướng, bắt đầu, thời lượng, trễ), chuyển tiếp và Tác vụ từng trang bằng PowerPoint thật (ẩn, chỉ đọc).
param([string]$Path)
$app = New-Object -ComObject PowerPoint.Application
try { $p = $app.Presentations.Open($Path, -1, 0, 0)
 foreach($s in $p.Slides){
  foreach($e in $s.TimeLine.MainSequence){ "slide {0}: effect={1} direction={2} trigger={3} dur={4} delay={5}" -f $s.SlideIndex,$e.EffectType,$e.EffectParameters.Direction,$e.Timing.TriggerType,$e.Timing.Duration,$e.Timing.TriggerDelayTime }
  "slide {0}: transition effect={1} onClick={2} onTime={3}/{4}" -f $s.SlideIndex,$s.SlideShowTransition.EntryEffect,$s.SlideShowTransition.AdvanceOnClick,$s.SlideShowTransition.AdvanceOnTime,$s.SlideShowTransition.AdvanceTime
  foreach($sh in $s.Shapes){ $a=$sh.ActionSettings(1); if($a.Action -ne 0){ "  shape {0}: action={1} link={2} sub={3}" -f $sh.Name,$a.Action,$a.Hyperlink.Address,$a.Hyperlink.SubAddress } } }
 $p.Close() } finally { $app.Quit() }

