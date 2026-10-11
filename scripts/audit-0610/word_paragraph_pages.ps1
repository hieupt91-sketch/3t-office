# Read-only Word COM oracle for D26. Records the page on which each main-story
# paragraph starts. Run beside word_dialog_dismisser.ps1.
param(
    [Parameter(Mandatory = $true)][string]$File,
    [Parameter(Mandatory = $true)][string]$Out,
    [string]$PidFile = ""
)

$ErrorActionPreference = "Stop"

Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class D26WordWindow {
    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
}
"@

function Invoke-WordRetry([scriptblock]$Block, [int]$Attempts = 30) {
    for ($i = 0; $i -lt $Attempts; $i++) {
        try { return (& $Block) } catch {
            if ($_.Exception.Message -notmatch "rejected|busy|RPC|0x8001010A|0x80010001") { throw }
            Start-Sleep -Milliseconds 700
        }
    }
    throw "Word van tu choi sau $Attempts lan thu"
}

function Get-ShortText($Range, [int]$Limit = 240) {
    $text = [string](Invoke-WordRetry { $Range.Text })
    $text = ($text -replace "[`r`n`a`t]+", " " -replace "\s+", " ").Trim()
    if ($text.Length -gt $Limit) { return $text.Substring(0, $Limit) }
    return $text
}

function Get-StartPage($Range) {
    $point = $Range.Duplicate
    try {
        $point.SetRange($point.Start, $point.Start)
        return [int](Invoke-WordRetry { $point.Information(3) })
    } finally {
        if ($point) { [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($point) }
    }
}

function Get-OptionalValue([scriptblock]$Block) {
    try { return (Invoke-WordRetry $Block 5) } catch { return $null }
}

$word = $null
$doc = $null
$wordPid = 0
try {
    $resolved = (Resolve-Path -LiteralPath $File).Path
    $wordPidsBefore = @(Get-Process WINWORD -ErrorAction SilentlyContinue | ForEach-Object { [int]$_.Id })
    $word = New-Object -ComObject Word.Application
    Start-Sleep -Seconds 3
    $pidValue = [uint32]0
    [void][D26WordWindow]::GetWindowThreadProcessId([IntPtr]([int64]$word.Hwnd), [ref]$pidValue)
    $wordPid = [int]$pidValue
    if ($wordPid -le 0) {
        $newWordPids = @(Get-Process WINWORD -ErrorAction SilentlyContinue | Where-Object { $wordPidsBefore -notcontains [int]$_.Id } | ForEach-Object { [int]$_.Id })
        if ($newWordPids.Count -eq 1) { $wordPid = $newWordPids[0] }
    }
    if ($PidFile -and $wordPid -gt 0) {
        $pidParent = Split-Path -Parent $PidFile
        if ($pidParent) { New-Item -ItemType Directory -Force -Path $pidParent | Out-Null }
        [System.IO.File]::WriteAllText($PidFile, [string]$wordPid, (New-Object System.Text.UTF8Encoding($false)))
    }

    Invoke-WordRetry { $word.Visible = $false } | Out-Null
    Invoke-WordRetry { $word.DisplayAlerts = 0 } | Out-Null
    $doc = Invoke-WordRetry { $word.Documents.Open($resolved, $false, $true, $false) }
    try { $word.ActiveWindow.View.Type = 3 } catch { }
    Invoke-WordRetry { $doc.Repaginate() } | Out-Null

    $paragraphs = New-Object System.Collections.Generic.List[object]
    $index = 0
    foreach ($paragraph in $doc.Paragraphs) {
        $index++
        $range = $paragraph.Range
        try {
            $paragraphs.Add([pscustomobject]@{
                index = $index
                rangeStart = [int]$range.Start
                rangeEnd = [int]$range.End
                pageStart = Get-StartPage $range
                inTable = [bool](Invoke-WordRetry { $range.Information(12) })
                text = Get-ShortText $range
                style = [string](Get-OptionalValue { $paragraph.Style.NameLocal })
                fontName = [string](Get-OptionalValue { $range.Font.Name })
                fontSizePt = Get-OptionalValue { [Math]::Round([double]$range.Font.Size, 2) }
                spaceBeforePt = Get-OptionalValue { [Math]::Round([double]$paragraph.SpaceBefore, 2) }
                spaceAfterPt = Get-OptionalValue { [Math]::Round([double]$paragraph.SpaceAfter, 2) }
                lineSpacingRule = Get-OptionalValue { [int]$paragraph.LineSpacingRule }
                lineSpacingPt = Get-OptionalValue { [Math]::Round([double]$paragraph.LineSpacing, 2) }
                keepWithNext = Get-OptionalValue { [bool]$paragraph.KeepWithNext }
                keepTogether = Get-OptionalValue { [bool]$paragraph.KeepTogether }
                widowControl = Get-OptionalValue { [bool]$paragraph.WidowControl }
                pageBreakBefore = Get-OptionalValue { [bool]$paragraph.PageBreakBefore }
            })
        } finally {
            if ($range) { [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($range) }
            if ($paragraph) { [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($paragraph) }
        }
    }

    $result = [ordered]@{
        source = $resolved
        measuredAt = (Get-Date).ToString("o")
        wordPid = $wordPid
        viewType = $(try { [int]$word.ActiveWindow.View.Type } catch { $null })
        pages = [int](Invoke-WordRetry { $doc.Content.Information(4) })
        paragraphs = $paragraphs
    }
    $parent = Split-Path -Parent $Out
    if ($parent) { New-Item -ItemType Directory -Force -Path $parent | Out-Null }
    [System.IO.File]::WriteAllText($Out, ($result | ConvertTo-Json -Depth 8), (New-Object System.Text.UTF8Encoding($false)))
    "OK pages={0} paragraphs={1} pid={2} out={3}" -f $result.pages, $paragraphs.Count, $wordPid, $Out
    try { $doc.Saved = $true } catch { }
} catch {
    Write-Error $_
} finally {
    if ($doc) { try { $doc.Saved = $true } catch { } }
    if ($word) { try { Invoke-WordRetry { $word.Quit(0) } 10 | Out-Null } catch { } }
    if ($doc) { try { [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($doc) } catch { } }
    if ($word) { try { [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($word) } catch { } }
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}
