param(
  [Parameter(Mandatory = $true)][ValidateSet('sheet', 'writer')][string]$App
)

$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$readyFile = Join-Path $PSScriptRoot 'clipboard-office.ready.json'
$stopFile = Join-Path $PSScriptRoot 'clipboard-office.stop'
$copyRequestFile = Join-Path $PSScriptRoot 'clipboard-office.copy'
$copyDoneFile = Join-Path $PSScriptRoot 'clipboard-office.copy-done'
if (Test-Path -LiteralPath $readyFile) { Remove-Item -LiteralPath $readyFile -Force }
if (Test-Path -LiteralPath $stopFile) { Remove-Item -LiteralPath $stopFile -Force }
if (Test-Path -LiteralPath $copyRequestFile) { Remove-Item -LiteralPath $copyRequestFile -Force }
if (Test-Path -LiteralPath $copyDoneFile) { Remove-Item -LiteralPath $copyDoneFile -Force }

$office = $null
$document = $null
$workbook = $null
$sourceRange = $null
$officeProcessId = 0
$officeProcessStart = $null
try {
  if ($App -eq 'sheet') {
    $office = New-Object -ComObject Excel.Application
    $office.Visible = $false
    $office.DisplayAlerts = $false
    $workbook = $office.Workbooks.Add()
    $sheet = $workbook.Worksheets.Item(1)
    $sheet.Cells.Item(1, 1).Value2 = "T$([char]0x00EA)n"
    $sheet.Cells.Item(1, 2).Value2 = "S$([char]0x1ED1) l$([char]0x01B0)$([char]0x1EE3)ng"
    $sheet.Cells.Item(1, 3).Value2 = "Ng$([char]0x00E0)y"
    $sheet.Cells.Item(2, 1).Value2 = "B$([char]0x00FA)t"
    $sheet.Cells.Item(2, 2).Value2 = 1250
    $sheet.Cells.Item(2, 2).NumberFormat = '#,##0'
    $sheet.Cells.Item(2, 3).Value2 = 46387
    $sheet.Cells.Item(2, 3).NumberFormat = 'dd/mm/yyyy'
    $sheet.Cells.Item(3, 1).Value2 = "Gi$([char]0x1EA5)y"
    $sheet.Cells.Item(3, 2).Value2 = 0.25
    $sheet.Cells.Item(3, 2).NumberFormat = '0%'
    $sheet.Cells.Item(3, 3).Value2 = 1234.56
    $sheet.Cells.Item(3, 3).NumberFormat = '#,##0.00'
    $sheet.Range('A1:C1').Font.Bold = $true
    $sheet.Range('A1:C1').Interior.Color = 65535
    $sourceRange = $sheet.Range('A1:C3')
    $sourceRange.Copy()
    $title = 'Excel'
  } else {
    $office = New-Object -ComObject Word.Application
    $office.Visible = $false
    $office.DisplayAlerts = 0
    $document = $office.Documents.Add()
    $selection = $office.Selection
    $selection.Style = 'Heading 1'
    $selection.TypeText('Heading clipboard test')
    $selection.TypeParagraph()
    $selection.Style = 'Normal'
    $selection.TypeText('Bold sentence')
    $selection.Range.Font.Bold = 1
    $selection.TypeParagraph()
    $bulletStart = $document.Content.End - 1
    $selection.TypeText('Bullet item one')
    $selection.TypeParagraph()
    $selection.TypeText('Bullet item two')
    $selection.TypeParagraph()
    $bulletEnd = $document.Content.End - 1
    $document.Range($bulletStart, $bulletEnd).ListFormat.ApplyBulletDefault()
    $tableRange = $document.Range($document.Content.End - 1, $document.Content.End - 1)
    $table = $document.Tables.Add($tableRange, 2, 2)
    $table.Cell(1, 1).Range.Text = 'Table 1,1'
    $table.Cell(1, 2).Range.Text = 'Table 1,2'
    $table.Cell(2, 1).Range.Text = 'Table 2,1'
    $table.Cell(2, 2).Range.Text = 'Table 2,2'
    $sourceRange = $document.Range(0, $document.Content.End - 1)
    $sourceRange.Copy()
    $title = 'Word'
  }

  if (-not ('ClipboardOfficeWindow' -as [type])) {
    Add-Type 'using System; using System.Runtime.InteropServices; public static class ClipboardOfficeWindow { [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId); }'
  }
  [uint32]$officeProcessId = 0
  [void][ClipboardOfficeWindow]::GetWindowThreadProcessId([IntPtr]$office.Hwnd, [ref]$officeProcessId)
  $process = Get-Process -Id $officeProcessId -ErrorAction Stop
  $officeProcessStart = $process.StartTime
  [pscustomobject]@{
    app = $App
    officeProcessId = $officeProcessId
    officeProcessStart = $officeProcessStart.ToString('o')
    ownerProcessId = $PID
    stopFile = $stopFile
    title = $title
  } | ConvertTo-Json | Set-Content -LiteralPath $readyFile -Encoding UTF8

  while (-not (Test-Path -LiteralPath $stopFile)) {
    if (Test-Path -LiteralPath $copyRequestFile) {
      $requestId = Get-Content -LiteralPath $copyRequestFile -Raw -Encoding ASCII
      Remove-Item -LiteralPath $copyRequestFile -Force
      $copyError = $null
      $copied = $false
      for ($attempt = 0; $attempt -lt 40 -and -not $copied; $attempt++) {
        try {
          [void]$sourceRange.Copy()
          $copied = $true
        } catch {
          $copyError = $_.Exception.Message
          Start-Sleep -Milliseconds 100
        }
      }
      if ($copied) { Set-Content -LiteralPath $copyDoneFile -Value $requestId -Encoding ASCII }
      else { Set-Content -LiteralPath $copyDoneFile -Value "ERROR:${requestId}:$copyError" -Encoding ASCII }
    }
    Start-Sleep -Milliseconds 50
  }
} finally {
  if ($workbook) { try { $workbook.Close($false) } catch {} }
  if ($document) { try { $document.Close(0) } catch {} }
  if ($office) { try { $office.Quit() } catch {} }
  foreach ($comObject in @($sheet, $table, $sourceRange, $tableRange, $selection, $document, $workbook, $office)) {
    if ($null -ne $comObject -and [Runtime.InteropServices.Marshal]::IsComObject($comObject)) {
      try { [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($comObject) } catch {}
    }
  }
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
  if ($officeProcessId -gt 0) {
    Start-Sleep -Milliseconds 500
    $remainingOffice = Get-Process -Id $officeProcessId -ErrorAction SilentlyContinue
    if ($remainingOffice -and $remainingOffice.ProcessName -eq $(if ($App -eq 'sheet') { 'EXCEL' } else { 'WINWORD' }) -and $remainingOffice.StartTime -eq $officeProcessStart) {
      try { Stop-Process -Id $officeProcessId -Force -ErrorAction Stop } catch {}
    }
  }
  if (Test-Path -LiteralPath $stopFile) { Remove-Item -LiteralPath $stopFile -Force }
  if (Test-Path -LiteralPath $readyFile) { Remove-Item -LiteralPath $readyFile -Force }
  if (Test-Path -LiteralPath $copyRequestFile) { Remove-Item -LiteralPath $copyRequestFile -Force }
  if (Test-Path -LiteralPath $copyDoneFile) { Remove-Item -LiteralPath $copyDoneFile -Force }
}
