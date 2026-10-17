# Đọc lại hiệu ứng kích hoạt: mỗi interactive sequence có hình kích hoạt và các hiệu ứng.
param([Parameter(Mandatory = $true)][string]$Path)
$app = New-Object -ComObject PowerPoint.Application
try {
    $p = $app.Presentations.Open($Path, -1, 0, 0)
    foreach ($s in $p.Slides) {
        "slide {0}: main={1} interactive={2}" -f $s.SlideIndex, $s.TimeLine.MainSequence.Count, $s.TimeLine.InteractiveSequences.Count
        foreach ($q in $s.TimeLine.InteractiveSequences) {
            for ($i = 1; $i -le $q.Count; $i++) { $e = $q.Item($i); "  trigger-shape={0} effect shape={1} type={2} exit={3}" -f $e.Timing.TriggerShape.Name, $e.Shape.Name, $e.EffectType, $e.Exit }
        }
    }
    $p.Close()
} finally { $app.Quit() }
