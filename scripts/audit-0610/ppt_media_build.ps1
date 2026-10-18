param([Parameter(Mandatory = $true)][string]$Path, [string]$Media = "C:\Windows\Media\Alarm02.wav", [switch]$Loop, [switch]$Auto)
# PPTX bằng PowerPoint thật (ẩn): một âm thanh với tùy chọn lặp / tự phát.
$app = New-Object -ComObject PowerPoint.Application
try {
    $p = $app.Presentations.Add(0)
    $s = $p.Slides.Add(1, 12)
    $m = $s.Shapes.AddMediaObject2($Media, 0, -1, 100, 100, 60, 60)
    $m.Name = "Media1"
    $ps = $m.AnimationSettings.PlaySettings
    $ps.LoopUntilStopped = [int]($Loop.IsPresent) * -1
    if ($Auto.IsPresent) { $m.AnimationSettings.PlaySettings.PlayOnEntry = -1 }
    $p.SaveAs($Path, 24)
    $p.Close()
} finally { $app.Quit() }
"saved " + $Path
