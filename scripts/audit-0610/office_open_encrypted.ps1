# Mo tep Office da ma hoa bang mat khau bang ung dung that (COM, chi doc) va in ket qua. Dung: -Path <tep> -Password <mk> -App excel|word|powerpoint
param([Parameter(Mandatory = $true)][string]$Path, [string]$Password = "", [ValidateSet("excel","word","powerpoint")][string]$App = "excel")
$ErrorActionPreference = "Stop"
function Retry([scriptblock]$b) { $last = $null; for ($k = 0; $k -lt 25; $k++) { try { return (& $b) } catch { $last = $_; if ($_.Exception.Message -notmatch 'rejected|busy|RPC') { throw }; Start-Sleep -Milliseconds 700 } }; throw $last }
$procName = @{ excel = "EXCEL"; word = "WINWORD"; powerpoint = "POWERPNT" }[$App]
$progId = @{ excel = "Excel.Application"; word = "Word.Application"; powerpoint = "PowerPoint.Application" }[$App]
$before = @(Get-Process $procName -ErrorAction SilentlyContinue | % Id)
$obj = $null
for ($a = 0; $a -lt 30 -and -not $obj; $a++) { try { $obj = New-Object -ComObject $progId } catch { Start-Sleep -Milliseconds 700 } }
if (-not $obj) { throw "Khong khoi dong duoc $progId" }
$mine = @(Get-Process $procName -ErrorAction SilentlyContinue | % Id | ? { $before -notcontains $_ })
$result = [ordered]@{ app = $App; opened = $false; detail = "" }
try {
    try { $obj.DisplayAlerts = 0 } catch {}
    if ($App -eq "excel") {
        $wb = Retry { $obj.Workbooks.Open($Path, 0, $true, [Type]::Missing, $Password) }
        $ws = $wb.Worksheets.Item(1)
        $result.opened = $true; $result.detail = "sheets=$($wb.Worksheets.Count); A1='" + [string]$ws.Range("A1").Value2 + "'; used=" + $ws.UsedRange.Address($false, $false)
        $wb.Close($false)
    } elseif ($App -eq "word") {
        $doc = Retry { $obj.Documents.Open($Path, $false, $true, $false, $Password) }
        $result.opened = $true; $result.detail = "paragraphs=$($doc.Paragraphs.Count); text='" + ([string]$doc.Range().Text).Substring(0, [Math]::Min(40, ([string]$doc.Range().Text).Length)).Replace("`r", " ") + "'"
        $doc.Close(0)
    } else {
        $pres = Retry { $obj.Presentations.Open("$Path::$Password::", -1, 0, 0) }
        $result.opened = $true; $result.detail = "slides=$($pres.Slides.Count)"
        $pres.Close()
    }
} catch { $result.detail = "LOI: " + $_.Exception.Message.Split("`n")[0] }
finally { try { $obj.Quit() } catch {}; foreach ($p in $mine) { Stop-Process -Id $p -Force -ErrorAction SilentlyContinue } }
[pscustomobject]$result | ConvertTo-Json -Compress