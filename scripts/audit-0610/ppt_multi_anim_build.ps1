# Dựng PPTX bằng PowerPoint thật: 1 hình có 2 hiệu ứng (Vào rồi Thoát) + 1 hình có hiệu ứng kích hoạt khi bấm hình khác.
# Dùng: ppt_multi_anim_build.ps1 -Path <ra.pptx>   (ẩn, tiến trình riêng, không đặt Visible)
param([Parameter(Mandatory = $true)][string]$Path)
$app = New-Object -ComObject PowerPoint.Application
try {
    $p = $app.Presentations.Add(0)
    $s = $p.Slides.Add(1, 12)
    $a = $s.Shapes.AddShape(1, 60, 60, 160, 90); $a.Name = "ShapeA"
    $b = $s.Shapes.AddShape(1, 300, 60, 160, 90); $b.Name = "ShapeB"
    $seq = $s.TimeLine.MainSequence
    $e1 = $seq.AddEffect($a, 10, 0, 1)   # msoAnimEffectFade, vào, khi bấm
    $e2 = $seq.AddEffect($a, 10, 0, 1)   # lặp lại để đổi sang Thoát
    $e2.Exit = -1
    $e3 = $seq.AddEffect($b, 10, 0, 1)
    $p.SaveAs($Path, 24)
    $p.Close()
} finally { $app.Quit() }
"saved " + $Path
