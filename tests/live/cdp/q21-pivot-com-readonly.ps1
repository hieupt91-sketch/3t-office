param([Parameter(Mandatory = $true)][string]$Path)
$ErrorActionPreference = 'Stop'
$excel = $null
$book = $null
try {
  $excel = New-Object -ComObject Excel.Application
  $excel.DisplayAlerts = $false
  $book = $excel.Workbooks.Open((Resolve-Path -LiteralPath $Path).Path, 0, $true)
  $sheets = @()
  for ($i = 1; $i -le $book.Worksheets.Count; $i++) {
    $sheet = $book.Worksheets.Item($i)
    $sheets += [ordered]@{ Name=[string]$sheet.Name; A1=[string]$sheet.Range('A1').Text; B2=[string]$sheet.Range('B2').Text }
    [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($sheet)
  }
  [ordered]@{ ReadOnly=[bool]$book.ReadOnly; SheetCount=[int]$book.Worksheets.Count; Sheets=$sheets } | ConvertTo-Json -Compress
} finally {
  if ($book) { $book.Close($false); [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($book) }
  if ($excel) { $excel.Quit(); [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($excel) }
  [GC]::Collect(); [GC]::WaitForPendingFinalizers()
}
