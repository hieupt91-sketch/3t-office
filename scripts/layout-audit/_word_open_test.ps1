param([string[]]$Files)
# Opens each DOCX in ONE hidden Word instance; prints "OK pages=N" (Information(4) after Repaginate) or "FAIL <msg>".
# CH-6.5: khong dung Stop-Process theo ten WINWORD; chi dong cung PID ma script nay tai ra.
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class VnoWordOpenAuditWindow {
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
}
"@ -ErrorAction SilentlyContinue

$before = @(Get-Process -Name WINWORD -ErrorAction SilentlyContinue | ForEach-Object { $_.Id })
$word = New-Object -ComObject Word.Application
$ownedPid = 0
if ($word.Hwnd) {
  $owner = [uint32]0
  [void][VnoWordOpenAuditWindow]::GetWindowThreadProcessId([IntPtr]$word.Hwnd, [ref]$owner)
  if ($owner -gt 0 -and $before -notcontains [int]$owner) { $ownedPid = [int]$owner }
}
for ($i = 0; $i -lt 30 -and $ownedPid -eq 0; $i++) {
  $created = @(Get-Process -Name WINWORD -ErrorAction SilentlyContinue | Where-Object { $before -notcontains $_.Id })
  if ($created.Count -eq 1) { $ownedPid = [int]$created[0].Id }
  Start-Sleep -Milliseconds 100
}
if ($ownedPid -eq 0) {
  "FAIL could not identify a newly created WINWORD process; existing Word instances were left untouched"
  [void][Runtime.InteropServices.Marshal]::ReleaseComObject($word)
  exit 1
}
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
try { $word.Quit() } catch { }
[void][Runtime.InteropServices.Marshal]::ReleaseComObject($word)
$owned = Get-Process -Id $ownedPid -ErrorAction SilentlyContinue
if ($owned -and $owned.MainWindowHandle -eq 0) {
  Stop-Process -Id $ownedPid -Force -ErrorAction SilentlyContinue
}
