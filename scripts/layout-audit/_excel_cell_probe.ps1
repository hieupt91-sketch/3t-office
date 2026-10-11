# Doc mau chu / nen / vien cua mot o bang Excel COM (gia tri Excel THAT SU ve).
# Usage: powershell -File _excel_cell_probe.ps1 -File x.xlsx -Sheet 1 -Cells A1,B2
param([string]$File, [int]$Sheet = 1, [string[]]$Cells = @("A1"))
$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false; $excel.DisplayAlerts = $false
try {
  $wb = $excel.Workbooks.Open((Resolve-Path $File).Path, 0, $true)
  $ws = $wb.Worksheets.Item($Sheet)
  $cellList = @()
  foreach ($c in $Cells) {
    if ($c -match ",") { $cellList += ($c -split "," | ForEach-Object { $_.Trim() }) }
    else { $cellList += $c.Trim() }
  }
  foreach ($c in $cellList) {
    $r = $ws.Range($c)
    $bgr = [int]$r.Font.Color; $fbgr = [int]$r.Interior.Color
    $dfFont = try { [int]$r.DisplayFormat.Font.Color } catch { $null }
    $dfFill = try { [int]$r.DisplayFormat.Interior.Color } catch { $null }
    $fcCount = try { $r.FormatConditions.Count } catch { 0 }
    $hex = { param($v) if ($null -eq $v) { "none" } else { "#{0:X2}{1:X2}{2:X2}" -f ($v -band 0xFF), (($v -shr 8) -band 0xFF), (($v -shr 16) -band 0xFF) } }
    "{0} font={1} dfFont={2} colorIndex={3} fill={4} dfFill={5} fcCount={6} pattern={7} borderBottom={8}" -f $c, (& $hex $bgr), (& $hex $dfFont), $r.Font.ColorIndex, (& $hex $fbgr), (& $hex $dfFill), $fcCount, $r.Interior.Pattern, (& $hex ([int]$r.Borders.Item(9).Color))
  }
  $wb.Close($false)
} finally {
  $excel.Quit()
  [void][Runtime.InteropServices.Marshal]::ReleaseComObject($excel)
}
