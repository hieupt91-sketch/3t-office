# Đọc lại từng hiệu ứng của PPTX bằng PowerPoint thật (ẩn): trang, tên hình, kiểu, Vào/Thoát, cách bắt đầu, thời lượng.
param([Parameter(Mandatory = $true)][string]$Path)
$app = New-Object -ComObject PowerPoint.Application
try {
    $p = $app.Presentations.Open($Path, -1, 0, 0)
    foreach ($s in $p.Slides) {
        foreach ($e in $s.TimeLine.MainSequence) {
            "slide {0}: shape={1} effect={2} exit={3} trigger={4} dur={5}" -f $s.SlideIndex, $e.Shape.Name, $e.EffectType, $e.Exit, $e.Timing.TriggerType, $e.Timing.Duration
        }
    }
    $p.Close()
} finally { $app.Quit() }
