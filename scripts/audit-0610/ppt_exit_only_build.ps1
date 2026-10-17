# PPTX bằng PowerPoint thật: hình A chỉ có hiệu ứng THOÁT (Mờ dần ra), hình B chỉ có hiệu ứng vào.
param([Parameter(Mandatory = $true)][string]$Path)
$app = New-Object -ComObject PowerPoint.Application
try {
    $p = $app.Presentations.Add(0)
    $s = $p.Slides.Add(1, 12)
    $a = $s.Shapes.AddShape(1, 60, 60, 160, 90); $a.Name = "ShapeA"
    $b = $s.Shapes.AddShape(1, 300, 60, 160, 90); $b.Name = "ShapeB"
    $e1 = $s.TimeLine.MainSequence.AddEffect($a, 10, 0, 1)
    $e1.Exit = -1
    $e2 = $s.TimeLine.MainSequence.AddEffect($b, 10, 0, 1)
    $p.SaveAs($Path, 24)
    $p.Close()
} finally { $app.Quit() }
"saved " + $Path
