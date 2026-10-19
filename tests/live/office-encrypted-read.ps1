param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$PlainPath,
    [Parameter(Mandatory = $true)][ValidateSet("word", "powerpoint")][string]$App
)
$ErrorActionPreference = "Stop"
$password = [Console]::In.ReadLine()
$processName = @{ word = "WINWORD"; powerpoint = "POWERPNT" }[$App]
$progId = @{ word = "Word.Application"; powerpoint = "PowerPoint.Application" }[$App]
$before = @(Get-Process $processName -ErrorAction SilentlyContinue | ForEach-Object Id)
$office = $null
$opened = $false
$failure = ""
$stage = "create"
try {
    $office = New-Object -ComObject $progId
    try { $office.DisplayAlerts = 0 } catch { }
    if ($App -eq "word") {
        try { $office.Visible = $false } catch { }
        $stage = "control"
        $control = $office.Documents.Open($PlainPath, $false, $true, $false)
        $control.Close(0)
        $stage = "open"
        $document = $office.Documents.Open($Path, $false, $true, $false, $password)
        $stage = "read"
        $opened = $document.Paragraphs.Count -gt 0
        $document.Close(0)
    } else {
        $stage = "control"
        $control = $office.Presentations.Open($PlainPath, -1, 0, 0)
        $control.Close()
        $stage = "open"
        $presentation = $office.Presentations.Open("$Path::$password::", -1, 0, 0)
        $stage = "read"
        $opened = $presentation.Slides.Count -gt 0
        $presentation.Close()
    }
} catch {
    $opened = $false
    $failure = $stage + ":" + $_.Exception.HResult.ToString("X8")
} finally {
    if ($office) { try { $office.Quit() } catch { } }
    $mine = @(Get-Process $processName -ErrorAction SilentlyContinue | Where-Object { $before -notcontains $_.Id })
    foreach ($process in $mine) { Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue }
}
if ($opened) { "OPENED" } else { "FAILED:$failure" }
