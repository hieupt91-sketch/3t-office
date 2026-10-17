# PPTX bằng PowerPoint thật: hình A hiện khi BẤM vào hình B (kích hoạt - interactive sequence).
param([Parameter(Mandatory = $true)][string]$Path)
$app = New-Object -ComObject PowerPoint.Application
try {
    $p = $app.Presentations.Add(0)
    $s = $p.Slides.Add(1, 12)
    $a = $s.Shapes.AddShape(1, 60, 60, 160, 90); $a.Name = "ShapeA"
    $b = $s.Shapes.AddShape(1, 300, 60, 160, 90); $b.Name = "ShapeB"
    $seq = $s.TimeLine.InteractiveSequences.Add(1)
    $e = $seq.AddEffect($a, 10, 0, 4)   # Mờ dần (vào)
    $e.Timing.TriggerShape = $b
    $p.SaveAs($Path, 24)
    $p.Close()
} finally { $app.Quit() }
"saved " + $Path
