param([Parameter(Mandatory = $true)][string]$Path)
# PowerPoint thật (ẩn): in căn ngang (1 trái, 2 giữa, 3 phải) và căn dọc (1 trên, 3 giữa, 4 dưới) của từng ô trong bảng đầu tiên.
$app = New-Object -ComObject PowerPoint.Application
try {
    $p = $app.Presentations.Open($Path, -1, 0, 0)
    foreach ($sh in $p.Slides.Item(1).Shapes) {
        if ($sh.HasTable -eq -1) {
            $t = $sh.Table
            for ($r = 1; $r -le $t.Rows.Count; $r++) {
                for ($c = 1; $c -le $t.Columns.Count; $c++) {
                    $tf = $t.Cell($r, $c).Shape.TextFrame
                    "cell({0},{1}) text='{2}' halign={3} valign={4}" -f $r, $c, $tf.TextRange.Text, $tf.TextRange.ParagraphFormat.Alignment, $tf.VerticalAnchor
                }
            }
            break
        }
    }
    $p.Close()
} finally { $app.Quit() }
