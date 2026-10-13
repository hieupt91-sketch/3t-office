param([Parameter(Mandatory=$true)][string]$Path)
$ErrorActionPreference = 'Stop'
if (-not (Test-Path -LiteralPath $Path)) { throw "Missing workbook: $Path" }

Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class VnoExcelG2WindowPid {
  [DllImport("user32.dll", SetLastError=true)]
  public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
}
'@

$app = $null
$book = $null
$ownedPid = 0
try {
  $app = New-Object -ComObject Excel.Application
  $app.Visible = $false
  $app.DisplayAlerts = $false
  $pidValue = [uint32]0
  [void][VnoExcelG2WindowPid]::GetWindowThreadProcessId([IntPtr]$app.Hwnd, [ref]$pidValue)
  $ownedPid = [int]$pidValue
  $book = $app.Workbooks.Open((Resolve-Path -LiteralPath $Path).Path, 0, $true)
  $sheet = $book.Worksheets.Item(1)
  $expected = @(
    @{ Cell='D2'; Type=1; Operator=1 },
    @{ Cell='E2'; Type=2; Operator=5 },
    @{ Cell='F2'; Type=4; Operator=1 },
    @{ Cell='G2'; Type=5; Operator=6 },
    @{ Cell='H2'; Type=6; Operator=8 },
    @{ Cell='I2'; Type=7; Operator=0 },
    @{ Cell='J2'; Type=3; Operator=1 }
  )
  $rules = @()
  foreach ($item in $expected) {
    $validation = $sheet.Range($item.Cell).Validation
    $actual = [ordered]@{
      Cell = $item.Cell
      Type = [int]$validation.Type
      Operator = [int]$validation.Operator
      Formula1 = [string]$validation.Formula1
      Formula2 = [string]$validation.Formula2
      ErrorTitle = [string]$validation.ErrorTitle
      ErrorMessage = [string]$validation.ErrorMessage
      InputTitle = [string]$validation.InputTitle
      InputMessage = [string]$validation.InputMessage
      AlertStyle = [int]$validation.AlertStyle
    }
    if ($actual.Type -ne $item.Type) { throw "$($item.Cell) Validation.Type=$($actual.Type), expected $($item.Type)" }
    if ($item.Operator -and $actual.Operator -ne $item.Operator) { throw "$($item.Cell) Validation.Operator=$($actual.Operator), expected $($item.Operator)" }
    $rules += $actual
  }
  if ($rules[0].ErrorTitle -ne 'Chưa đúng' -or $rules[0].ErrorMessage -ne 'Kiểm tra lại' -or $rules[0].InputTitle -ne 'Gợi ý' -or $rules[0].AlertStyle -ne 2) {
    throw "D2 validation messages/alert style do not match"
  }
  $hidden = @(2..6 | Where-Object { $sheet.Rows.Item($_).Hidden } | ForEach-Object { [int]$_ })
  if (($hidden -join ',') -ne '3,5') { throw "Filtered hidden rows=$($hidden -join ','), expected 3,5" }
  [ordered]@{ ReadOnly=$book.ReadOnly; OwnedPid=$ownedPid; Rules=$rules; HiddenRows=$hidden } | ConvertTo-Json -Depth 5
} finally {
  if ($book) { try { $book.Close($false) } catch {} }
  if ($app) { try { $app.Quit() } catch {} }
  foreach ($obj in @($sheet, $book, $app)) { if ($obj) { try { [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($obj) } catch {} } }
  [GC]::Collect(); [GC]::WaitForPendingFinalizers()
  if ($ownedPid -gt 0) {
    $process = Get-Process -Id $ownedPid -ErrorAction SilentlyContinue
    if ($process) { Stop-Process -Id $ownedPid -Force }
  }
}
