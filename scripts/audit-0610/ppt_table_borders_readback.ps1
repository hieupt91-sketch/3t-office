param([Parameter(Mandatory = $true)][string]$Path)
# PowerPoint thật (ẩn): in viền 4 cạnh (T,L,B,R) từng ô của bảng đầu tiên: Visible/Weight(pt)/màu RGB hex.
$app = New-Object -ComObject PowerPoint.Application
try {
    $p = $app.Presentations.Open($Path, -1, 0, 0)
    foreach ($sh in $p.Slides.Item(1).Shapes) {
        if ($sh.HasTable -eq -1) {
            $t = $sh.Table
            for ($r = 1; $r -le $t.Rows.Count; $r++) {
                for ($c = 1; $c -le $t.Columns.Count; $c++) {
                    $parts = @()
                    foreach ($b in 1, 2, 3, 4) {
                        $bd = $t.Cell($r, $c).Borders.Item($b)
                        if ($bd.Visible -eq -1 -and $bd.Weight -gt 0.1) { $v = $bd.ForeColor.RGB; $parts += ("{0:N2}pt/{1:X2}{2:X2}{3:X2}" -f $bd.Weight, ($v -band 255), (($v -shr 8) -band 255), (($v -shr 16) -band 255)) } else { $parts += "-" }
                    }
                    "cell({0},{1}) T={2} L={3} B={4} R={5}" -f $r, $c, $parts[0], $parts[1], $parts[2], $parts[3]
                }
            }
            break
        }
    }
    $p.Close()
} finally { $app.Quit() }
