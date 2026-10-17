# Tạo mỗi hiệu ứng EffectType trong danh sách trên một hình riêng rồi lưu, để xem presetID/XML PowerPoint ghi.
param([Parameter(Mandatory = $true)][string]$Path, [int[]]$Ids = @(71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82))
$app = New-Object -ComObject PowerPoint.Application
try {
    $p = $app.Presentations.Add(0)
    $s = $p.Slides.Add(1, 12)
    $i = 0
    foreach ($id in $Ids) {
        $sh = $s.Shapes.AddShape(1, 20 + 60 * ($i % 8), 20 + 50 * [math]::Floor($i / 8), 50, 40); $sh.Name = "E$id"
        try { $e = $s.TimeLine.MainSequence.AddEffect($sh, $id, 0, 1); "{0} -> type={1} exit={2}" -f $id, $e.EffectType, $e.Exit } catch { "{0} -> ERR {1}" -f $id, $_.Exception.Message }
        $i++
    }
    $p.SaveAs($Path, 24)
    $p.Close()
} finally { $app.Quit() }
