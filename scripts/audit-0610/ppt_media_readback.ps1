param([Parameter(Mandatory = $true)][string]$Path)
# PowerPoint thật (ẩn): in tùy chọn phát của mọi phương tiện (âm thanh/video) trên trang 1: Loop, PlayOnEntry, số hiệu ứng.
$app = New-Object -ComObject PowerPoint.Application
try {
    $p = $app.Presentations.Open($Path, -1, 0, 0)
    foreach ($sh in $p.Slides.Item(1).Shapes) {
        if ($sh.Type -eq 16) {
            $loop = "?"; $entry = "?"
            try { $ps = $sh.AnimationSettings.PlaySettings; $loop = $ps.LoopUntilStopped; $entry = $ps.PlayOnEntry } catch { $loop = "ERR " + $_.Exception.Message }
            $kind = "?"
            try { $kind = $sh.MediaType } catch { }
            $eff = $p.Slides.Item(1).TimeLine.MainSequence.Count
            $inter = $p.Slides.Item(1).TimeLine.InteractiveSequences.Count
            "media name={0} mediaType={1} loop={2} playOnEntry={3} mainEffects={4} interactive={5}" -f $sh.Name, $kind, $loop, $entry, $eff, $inter
        }
    }
    $p.Close()
} finally { $app.Quit() }
