param([Parameter(Mandatory = $true)][string]$Path)
# PowerPoint thật (ẩn): in màu nền từng ô của bảng đầu tiên (RGB hex; "none" nếu không tô) và số hàng, cột.
$app = New-Object -ComObject PowerPoint.Application
try {
    $p = $app.Presentations.Open($Path, -1, 0, 0)
    foreach ($sh in $p.Slides.Item(1).Shapes) {
        if ($sh.HasTable -eq -1) {
            $t = $sh.Table
            "table rows={0} cols={1}" -f $t.Rows.Count, $t.Columns.Count
            for ($r = 1; $r -le $t.Rows.Count; $r++) {
                $line = @()
                for ($c = 1; $c -le $t.Columns.Count; $c++) {
                    $f = $t.Cell($r, $c).Shape.Fill
                    if ($f.Visible -eq -1 -and $f.Type -eq 1) { $v = $f.ForeColor.RGB; $line += ("{0:X2}{1:X2}{2:X2}" -f ($v -band 255), (($v -shr 8) -band 255), (($v -shr 16) -band 255)) } else { $line += "none" }
                }
                "row {0}: {1}" -f $r, ($line -join " ")
            }
            break
        }
    }
    $p.Close()
} finally { $app.Quit() }
