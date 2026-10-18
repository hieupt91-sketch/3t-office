param([Parameter(Mandatory = $true)][string]$Path)
# PowerPoint thật (ẩn): in biểu đồ của trang 1: ChartType (51 cột, 4/65 đường, 5 tròn, 1 miền), tiêu đề, số chuỗi, giá trị chuỗi đầu.
$app = New-Object -ComObject PowerPoint.Application
try {
    $p = $app.Presentations.Open($Path, -1, 0, 0)
    foreach ($sh in $p.Slides.Item(1).Shapes) {
        if ($sh.HasChart -eq -1) {
            $c = $sh.Chart
            $title = ""; try { if ($c.HasTitle) { $title = $c.ChartTitle.Text } } catch { }
            $vals = ""; try { $vals = ($c.SeriesCollection(1).Values -join ",") } catch { }
            "chart type={0} title='{1}' series={2} values={3}" -f $c.ChartType, $title, $c.SeriesCollection().Count, $vals
        }
    }
    $p.Close()
} finally { $app.Quit() }
