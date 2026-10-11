param([string]$Dir)
$ErrorActionPreference="Stop"
$existingWordPids=@(Get-CimInstance Win32_Process -Filter "Name='WINWORD.EXE'" | ForEach-Object { [int]$_.ProcessId })
$wordPids=@()
$w=New-Object -ComObject Word.Application; $w.Visible=$false; $w.DisplayAlerts=0
try {
  $d=$w.Documents.Add()
  $wordPids=@(Get-CimInstance Win32_Process -Filter "Name='WINWORD.EXE'" | Where-Object { [int]$_.ProcessId -notin $existingWordPids } | ForEach-Object { [int]$_.ProcessId })
  if ($wordPids.Count -eq 0) { throw "Không tìm thấy PID Word Automation do phiên này khởi tạo." }
  Write-Output "Word COM PID: $($wordPids -join ',')"
  $d.Content.InsertAfter("Mot doan dau tien.`rAlpha beta gamma delta.`rDoan cuoi cung.")
  $d.Paragraphs.Item(2).Range.Font.Name="Times New Roman"; $d.Paragraphs.Item(2).Range.Font.Size=12
  $d.SaveAs2("$Dir\template.docx",16); $d.Close(0)
} finally {
  if ($w) { $w.Quit(); [void][System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($w) }
  $wordPids=@($wordPids + @(Get-CimInstance Win32_Process -Filter "Name='WINWORD.EXE'" | Where-Object { [int]$_.ProcessId -notin $existingWordPids } | ForEach-Object { [int]$_.ProcessId }) | Select-Object -Unique)
  foreach($wordPid in $wordPids){
    $ownWord=Get-Process -Id $wordPid -ErrorAction SilentlyContinue
    if ($ownWord) { $ownWord | Wait-Process -Timeout 3 -ErrorAction SilentlyContinue }
    if (Get-Process -Id $wordPid -ErrorAction SilentlyContinue) { Stop-Process -Id $wordPid -Force -ErrorAction SilentlyContinue }
  }
}
"template ok"
