param([string[]]$Files)
# Opens each DOCX in ONE hidden Word instance; prints "OK pages=N" (Information(4) after Repaginate) or "FAIL <msg>".
Get-Process WINWORD -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Milliseconds 800
$word = New-Object -ComObject Word.Application
$word.Visible = $false; $word.DisplayAlerts = 0
foreach ($f in $Files) {
  $name = Split-Path $f -Leaf
  try {
    $doc = $word.Documents.Open($f, $false, $true, $false)
    $doc.Repaginate()
    "$name OK pages=" + $doc.Content.Information(4)
    $doc.Close(0)
  } catch {
    "$name FAIL " + ($_.Exception.Message -replace "`r|`n", " ")
  }
}
$word.Quit()
[System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
