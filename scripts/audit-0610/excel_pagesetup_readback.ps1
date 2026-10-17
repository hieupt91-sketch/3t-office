param([string]$Path)
$ErrorActionPreference="Stop"
function Retry([scriptblock]$b){ $last=$null; for($k=0;$k -lt 25;$k++){ try { return (& $b) } catch { $last=$_; if($_.Exception.Message -notmatch 'rejected|busy|RPC'){break}; Start-Sleep -Milliseconds 700 } }; throw ("Excel loi: "+$last.Exception.Message) }
$before=@(Get-Process EXCEL -ErrorAction SilentlyContinue | % Id)
$xl=$null; for($a=0;$a -lt 30 -and -not $xl;$a++){ try{ $xl=New-Object -ComObject Excel.Application } catch { Start-Sleep -Milliseconds 700 } }
$mine=@(Get-Process EXCEL -ErrorAction SilentlyContinue | % Id | ? { $before -notcontains $_ })
try {
  $xl.DisplayAlerts=$false
  $wb=Retry { $xl.Workbooks.Open($Path,0,$true) }
  $ws=Retry { $wb.Worksheets.Item(1) }
  $ps=$ws.PageSetup
  [pscustomobject]@{ top=[math]::Round($ps.TopMargin/72*2.54,2); bottom=[math]::Round($ps.BottomMargin/72*2.54,2); left=[math]::Round($ps.LeftMargin/72*2.54,2); right=[math]::Round($ps.RightMargin/72*2.54,2); header=[math]::Round($ps.HeaderMargin/72*2.54,2); footer=[math]::Round($ps.FooterMargin/72*2.54,2); orientation=[int]$ps.Orientation; paper=[int]$ps.PaperSize; zoom=[string]$ps.Zoom; wide=[string]$ps.FitToPagesWide; tall=[string]$ps.FitToPagesTall } | ConvertTo-Json
  Retry { $wb.Close($false) } | Out-Null
} finally { try { $xl.Quit() } catch {}; foreach($p in $mine){ Stop-Process -Id $p -Force -ErrorAction SilentlyContinue } }