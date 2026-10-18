# Đọc lại bằng Word 2016 thật (ẩn, chỉ đọc) tệp do tests/live/cdp/writer-table-column-options.desktop.mjs lưu ra:
# với từng ô bảng 1: Font.Bold và Shading.BackgroundPatternColor (-16777216 = không tô).
param([string]$Path)
$ErrorActionPreference = "Stop"
$w = New-Object -ComObject Word.Application
try {
  $w.Visible = $false
  $w.DisplayAlerts = 0
  $d = $w.Documents.Open($Path, $false, $true)
  $t = $d.Tables.Item(1)
  $rows = @()
  for ($r = 1; $r -le $t.Rows.Count; $r++) {
    $line = @()
    for ($c = 1; $c -le $t.Columns.Count; $c++) {
      $cell = $t.Cell($r, $c)
      $line += ("{0}{1}" -f $(if ($cell.Range.Font.Bold -ne 0) { "B" } else { "-" }), $(if ($cell.Shading.BackgroundPatternColor -ne -16777216) { "S" } else { "-" }))
    }
    $rows += ($line -join " ")
  }
  $d.Close(0)
  $rows
} finally {
  $w.Quit()
}
