param(
    [Parameter(Mandatory = $true)][string]$Root,
    [Parameter(Mandatory = $true)][string]$InputPath,
    [Parameter(Mandatory = $true)][string]$OutputPath,
    [string]$LogPath = ".lan14-roundtrip.log",
    [string]$MetricsPath = ".lan14-roundtrip.metrics"
)

$ErrorActionPreference = "Stop"
$env:VNO_PERF_DEBUG = "1"
$runner = Join-Path $Root "scripts/layout-audit/_roundtrip_save_sheet.py"
$quoted = @($runner, $Root, $InputPath, $OutputPath) | ForEach-Object {
    if ($_ -match '"') { throw "Measurement paths cannot contain a double quote." }
    '"' + $_ + '"'
}
$process = Start-Process -FilePath "python" -ArgumentList @(
    "-s", $quoted[0], $quoted[1], $quoted[2], $quoted[3]
) -WorkingDirectory $Root -RedirectStandardOutput $LogPath `
    -RedirectStandardError ($LogPath + ".err") -PassThru -WindowStyle Hidden

$peakWebViewBytes = 0L
$peakTreeBytes = 0L
$started = [Diagnostics.Stopwatch]::StartNew()
while (-not $process.HasExited) {
    Start-Sleep -Milliseconds 500
    $all = @(Get-CimInstance Win32_Process | Select-Object ProcessId, ParentProcessId, Name, WorkingSetSize)
    $owned = [Collections.Generic.HashSet[uint32]]::new()
    [void]$owned.Add([uint32]$process.Id)
    do {
        $before = $owned.Count
        foreach ($item in $all) {
            if ($owned.Contains([uint32]$item.ParentProcessId)) {
                [void]$owned.Add([uint32]$item.ProcessId)
            }
        }
    } while ($owned.Count -gt $before)
    $tree = @($all | Where-Object { $owned.Contains([uint32]$_.ProcessId) })
    $webView = @($tree | Where-Object { $_.Name -eq "msedgewebview2.exe" })
    $treeBytes = [long](($tree | Measure-Object WorkingSetSize -Sum).Sum)
    $webViewBytes = [long](($webView | Measure-Object WorkingSetSize -Sum).Sum)
    $peakTreeBytes = [Math]::Max($peakTreeBytes, $treeBytes)
    $peakWebViewBytes = [Math]::Max($peakWebViewBytes, $webViewBytes)
    $process.Refresh()
}
$process.WaitForExit()
$process.Refresh()

@(
    "exit=$($process.ExitCode)"
    "elapsed_seconds=$([Math]::Round($started.Elapsed.TotalSeconds, 3))"
    "peak_webview2_bytes=$peakWebViewBytes"
    "peak_process_tree_bytes=$peakTreeBytes"
) | Set-Content -LiteralPath $MetricsPath -Encoding utf8
exit $process.ExitCode
