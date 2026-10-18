param([Parameter(Mandatory = $true)][string]$Path)
# PowerPoint thật (ẩn): in chiều cao từng hàng và bề rộng từng cột (pt) của bảng đầu tiên, cùng kích thước khung.
$app = New-Object -ComObject PowerPoint.Application
try {
    $p = $app.Presentations.Open($Path, -1, 0, 0)
    foreach ($sh in $p.Slides.Item(1).Shapes) {
        if ($sh.HasTable -eq -1) {
            $t = $sh.Table
            "frame w={0:N1} h={1:N1}" -f $sh.Width, $sh.Height
            "rows: " + ((1..$t.Rows.Count | ForEach-Object { "{0:N1}" -f $t.Rows.Item($_).Height }) -join " ")
            "cols: " + ((1..$t.Columns.Count | ForEach-Object { "{0:N1}" -f $t.Columns.Item($_).Width }) -join " ")
            break
        }
    }
    $p.Close()
} finally { $app.Quit() }
