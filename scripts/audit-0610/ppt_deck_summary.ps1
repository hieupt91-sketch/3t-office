param([Parameter(Mandatory = $true)][string]$Path)
# PowerPoint thật (ẩn): tóm tắt từng slide: số hình theo loại, số bảng/biểu đồ/ảnh/phương tiện, hiệu ứng, văn bản đầu — để so tệp gốc và tệp đã mở-lưu.
$app = New-Object -ComObject PowerPoint.Application
try {
    $p = $app.Presentations.Open($Path, -1, 0, 0)
    "slides={0} size={1}x{2}" -f $p.Slides.Count, $p.PageSetup.SlideWidth, $p.PageSetup.SlideHeight
    foreach ($s in $p.Slides) {
        $types = @{}
        $tables = 0; $charts = 0; $pics = 0; $media = 0; $text = 0
        foreach ($sh in $s.Shapes) {
            $types[$sh.Type] = 1 + [int]$types[$sh.Type]
            if ($sh.HasTable -eq -1) { $tables++ }
            if ($sh.HasChart -eq -1) { $charts++ }
            if ($sh.Type -eq 13) { $pics++ }
            if ($sh.Type -eq 16) { $media++ }
            try { if ($sh.HasTextFrame -eq -1 -and $sh.TextFrame.HasText -eq -1) { $text += $sh.TextFrame.TextRange.Text.Length } } catch { }
        }
        "slide {0}: shapes={1} types={2} tables={3} charts={4} pics={5} media={6} textChars={7} effects={8} layout={9}" -f $s.SlideIndex, $s.Shapes.Count, (($types.GetEnumerator() | Sort-Object Name | ForEach-Object { "$($_.Name):$($_.Value)" }) -join ","), $tables, $charts, $pics, $media, $text, $s.TimeLine.MainSequence.Count, $s.CustomLayout.Name
    }
    $p.Close()
} finally { $app.Quit() }
