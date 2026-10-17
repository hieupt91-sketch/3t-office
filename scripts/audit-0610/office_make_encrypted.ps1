# Tao tep Office co mat khau mo tep bang ung dung that: -App excel|word|powerpoint -Source <tep> -Out <tep dich> -Password <mk>
param([Parameter(Mandatory = $true)][string]$Source, [Parameter(Mandatory = $true)][string]$Out, [Parameter(Mandatory = $true)][string]$Password, [ValidateSet("excel","word","powerpoint")][string]$App = "excel")
$ErrorActionPreference = "Stop"
function Retry([scriptblock]$b) { $last = $null; for ($k = 0; $k -lt 25; $k++) { try { return (& $b) } catch { $last = $_; if ($_.Exception.Message -notmatch 'rejected|busy|RPC') { throw }; Start-Sleep -Milliseconds 700 } }; throw $last }
$procName = @{ excel = "EXCEL"; word = "WINWORD"; powerpoint = "POWERPNT" }[$App]
$progId = @{ excel = "Excel.Application"; word = "Word.Application"; powerpoint = "PowerPoint.Application" }[$App]
$before = @(Get-Process $procName -ErrorAction SilentlyContinue | % Id)
$obj = $null
for ($a = 0; $a -lt 30 -and -not $obj; $a++) { try { $obj = New-Object -ComObject $progId } catch { Start-Sleep -Milliseconds 700 } }
$mine = @(Get-Process $procName -ErrorAction SilentlyContinue | % Id | ? { $before -notcontains $_ })
try {
    try { $obj.DisplayAlerts = 0 } catch {}
    if (Test-Path $Out) { Remove-Item -LiteralPath $Out -Force }
    if ($App -eq "excel") { $wb = Retry { $obj.Workbooks.Open($Source, 0, $true) }; Retry { $wb.SaveAs($Out, 51, $Password) } | Out-Null; $wb.Close($false) }
    elseif ($App -eq "word") { $doc = Retry { $obj.Documents.Open($Source, $false, $true) }; Retry { $doc.SaveAs2($Out, 16, $false, $Password) } | Out-Null; $doc.Close(0) }
    else { $pres = Retry { $obj.Presentations.Open($Source, 0, 0, 0) }; Retry { $pres.Password = $Password }; Retry { $pres.SaveAs($Out, 24) } | Out-Null; $pres.Close() }
    "ok $((Get-Item $Out).Length)"
} finally { try { $obj.Quit() } catch {}; foreach ($p in $mine) { Stop-Process -Id $p -Force -ErrorAction SilentlyContinue } }