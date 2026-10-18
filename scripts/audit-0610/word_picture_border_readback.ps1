param([Parameter(Mandatory = $true)][string]$Path)
# Word thật (ẩn): in viền của mọi ảnh trong thân văn bản (inline và nổi). Line.Visible -1 = có viền; DashStyle 4 = đứt; Color BGR.
$word = New-Object -ComObject Word.Application
$word.DisplayAlerts = 0
try {
    $doc = $word.Documents.Open($Path, $false, $true)
    foreach ($s in $doc.InlineShapes) { "inline type={0} visible={1} weight={2} dash={3} color={4}" -f $s.Type, $s.Line.Visible, $s.Line.Weight, $s.Line.DashStyle, $s.Line.ForeColor.RGB }
    foreach ($s in $doc.Shapes) { "floating type={0} visible={1} weight={2} dash={3} color={4}" -f $s.Type, $s.Line.Visible, $s.Line.Weight, $s.Line.DashStyle, $s.Line.ForeColor.RGB }
    $doc.Close($false)
} finally { $word.Quit() }
