param([Parameter(Mandatory = $true)][string]$Path)
# Word thật (ẩn): in kiểu nét/độ dày/màu của 4 cạnh ô (1,1) và ô (2,2) của bảng đầu tiên.
# LineStyle: 0 không, 1 liền, 2 chấm, 3 đứt, 7 đôi...; LineWidth: 2=0.25pt 4=0.5 6=0.75 8=1 12=1.5 18=2.25 24=3 36=4.5 48=6; Color: BGR.
$word = New-Object -ComObject Word.Application
$word.DisplayAlerts = 0
try {
    $doc = $word.Documents.Open($Path, $false, $true)
    $t = $doc.Tables.Item(1)
    foreach ($pair in @(@(1, 1), @(1, 2), @(2, 1), @(2, 2))) {
        $cell = $t.Cell($pair[0], $pair[1])
        foreach ($b in @(@(-1, "top"), @(-2, "left"), @(-3, "bottom"), @(-4, "right"))) {
            $br = $cell.Borders.Item($b[0])
            "cell({0},{1}) {2}: style={3} width={4} color={5}" -f $pair[0], $pair[1], $b[1], $br.LineStyle, $br.LineWidth, $br.Color
        }
    }
    $doc.Close($false)
} finally { $word.Quit() }
