param([Parameter(Mandatory = $true)][string]$Path)
# Mở DOCX bằng Word thật (ẩn, tiến trình riêng) và in dừng tab của từng đoạn: vị trí (pt), căn (0 trái,1 giữa,2 phải,3 thập phân,4 thanh), ký tự dẫn (0 không,1 chấm,2 gạch ngang,3 gạch dưới).
$word = New-Object -ComObject Word.Application
$word.DisplayAlerts = 0
try {
    $doc = $word.Documents.Open($Path, $false, $true)
    $i = 0
    foreach ($p in $doc.Paragraphs) {
        $i++
        $stops = @($p.TabStops | ForEach-Object { "{0:N1}pt align={1} leader={2}" -f $_.Position, $_.Alignment, $_.Leader })
        if ($stops.Count -gt 0) { "para {0}: {1}" -f $i, ($stops -join " | ") }
    }
    $doc.Close($false)
} finally { $word.Quit() }
