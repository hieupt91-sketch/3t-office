param([Parameter(Mandatory = $true)][string]$Path)
# Mở DOCX bằng Word thật (ẩn, tiến trình riêng) và in AutoShapeType từng hình. Không đặt Visible, chỉ đóng tiến trình của mình.
$word = New-Object -ComObject Word.Application
$word.DisplayAlerts = 0
try {
    $doc = $word.Documents.Open($Path, $false, $true)
    foreach ($s in $doc.Shapes) { "{0} | type={1} | autoShape={2}" -f $s.Name, $s.Type, $s.AutoShapeType }
    "count=" + $doc.Shapes.Count
    $doc.Close($false)
} finally {
    $word.Quit()
}
