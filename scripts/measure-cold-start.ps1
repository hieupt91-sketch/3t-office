# Measure Python/WebView milestones from an installed-like or packaged launch.
# This diagnostic sets an isolated LOCALAPPDATA for each run and only records timings.
param(
    [Parameter(Mandatory = $true)][string]$PythonwPath,
    [Parameter(Mandatory = $true)][string]$MainPyPath,
    [ValidateSet("writer", "sheet", "slides")][string]$AppKind = "writer",
    [string]$OpenFile = "",
    [switch]$VerifyFirstInput,
    [int]$TimeoutSeconds = 90
)

$ErrorActionPreference = "Stop"
if (-not ("VnoStartupInput" -as [type])) {
    Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class VnoStartupInput {
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }
  [StructLayout(LayoutKind.Sequential)] public struct POINT { public int X; public int Y; }
  [DllImport("user32.dll")] public static extern bool GetClientRect(IntPtr hwnd, out RECT rect);
  [DllImport("user32.dll")] public static extern bool ClientToScreen(IntPtr hwnd, ref POINT point);
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hwnd, int command);
  [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr hwnd);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hwnd);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern void mouse_event(uint flags, uint dx, uint dy, uint data, UIntPtr extraInfo);
}
"@
}
$pythonw = (Resolve-Path -LiteralPath $PythonwPath).Path
$mainPy = (Resolve-Path -LiteralPath $MainPyPath).Path
if ($OpenFile) { $openPath = (Resolve-Path -LiteralPath $OpenFile).Path }
else { $openPath = "" }

$runId = [Guid]::NewGuid().ToString("N")
$runRoot = Join-Path $env:TEMP "3toffice-startup-$runId"
New-Item -ItemType Directory -Path $runRoot | Out-Null
$tracePath = Join-Path $runRoot "timeline.jsonl"
$t0 = [System.Diagnostics.Stopwatch]::GetTimestamp() / [double][System.Diagnostics.Stopwatch]::Frequency
[System.IO.File]::WriteAllText(
    $tracePath,
    '{"stage":"process_start","elapsed_ms":0.0}' + [Environment]::NewLine,
    (New-Object System.Text.UTF8Encoding($false))
)

$quotedMain = '"' + $mainPy.Replace('"', '\"') + '"'
$arguments = "-s -E $quotedMain --app=$AppKind"
if ($openPath) { $arguments += ' "' + $openPath.Replace('"', '\"') + '"' }

$startInfo = New-Object System.Diagnostics.ProcessStartInfo
$startInfo.FileName = $pythonw
$startInfo.Arguments = $arguments
$startInfo.WorkingDirectory = Split-Path -Parent $mainPy
$startInfo.UseShellExecute = $false
$startInfo.CreateNoWindow = $true
$startInfo.EnvironmentVariables["VNO_STARTUP_TRACE_FILE"] = $tracePath
$startInfo.EnvironmentVariables["VNO_STARTUP_TRACE_T0"] = [string]::Format([Globalization.CultureInfo]::InvariantCulture, "{0:R}", $t0)
$startInfo.EnvironmentVariables["LOCALAPPDATA"] = Join-Path $runRoot "localappdata"
New-Item -ItemType Directory -Path $startInfo.EnvironmentVariables["LOCALAPPDATA"] | Out-Null

$process = [System.Diagnostics.Process]::Start($startInfo)
$deadline = [DateTime]::UtcNow.AddSeconds($TimeoutSeconds)
$terminalStage = if ($openPath) { "initial_file_open_resolved" } else { "blank_document_first_paint" }
$requiredStages = @($terminalStage)
$requiredStages += "lo_worker_ready"
if ($VerifyFirstInput -and -not $openPath) { $requiredStages += "first_editor_key" }
$events = @()
$probeSent = $false
$probeAttempts = 0
$lastProbeAt = [DateTime]::MinValue
$shell = $null
try {
    while ([DateTime]::UtcNow -lt $deadline) {
        if (Test-Path -LiteralPath $tracePath) {
            $events = @(Get-Content -LiteralPath $tracePath | ForEach-Object {
                try { $_ | ConvertFrom-Json } catch { $null }
            } | Where-Object { $_ })
            if ($VerifyFirstInput -and -not $openPath -and -not ($events.stage -contains "first_editor_key") -and $events.stage -contains "blank_document_first_paint" -and $probeAttempts -lt 6 -and ([DateTime]::UtcNow - $lastProbeAt).TotalMilliseconds -ge 700) {
                $process.Refresh()
                if ($process.MainWindowHandle -ne [IntPtr]::Zero) {
                    if (-not $shell) { $shell = New-Object -ComObject WScript.Shell }
                    [void][VnoStartupInput]::ShowWindow($process.MainWindowHandle, 9)
                    [void][VnoStartupInput]::BringWindowToTop($process.MainWindowHandle)
                    [void][VnoStartupInput]::SetForegroundWindow($process.MainWindowHandle)
                    Start-Sleep -Milliseconds 100
                    if ([VnoStartupInput]::GetForegroundWindow() -eq $process.MainWindowHandle) {
                        $clientRect = New-Object VnoStartupInput+RECT
                        $point = New-Object VnoStartupInput+POINT
                        if ([VnoStartupInput]::GetClientRect($process.MainWindowHandle, [ref]$clientRect)) {
                            $clientWidth = $clientRect.Right - $clientRect.Left
                            $clientHeight = $clientRect.Bottom - $clientRect.Top
                            switch ($AppKind) {
                                "writer" { $point.X = [int]($clientWidth * 0.52); $point.Y = [int]($clientHeight * 0.80) }
                                "sheet" { $point.X = [int]($clientWidth * 0.08); $point.Y = [int]($clientHeight * 0.48) }
                                "slides" { $point.X = [int]($clientWidth * 0.52); $point.Y = [int]($clientHeight * 0.80) }
                            }
                            if ([VnoStartupInput]::ClientToScreen($process.MainWindowHandle, [ref]$point)) {
                                [void][VnoStartupInput]::SetCursorPos($point.X, $point.Y)
                                [VnoStartupInput]::mouse_event(0x0002, 0, 0, 0, [UIntPtr]::Zero)
                                Start-Sleep -Milliseconds 40
                                [VnoStartupInput]::mouse_event(0x0004, 0, 0, 0, [UIntPtr]::Zero)
                                Start-Sleep -Milliseconds 60
                                $shell.SendKeys("x{BACKSPACE}")
                                $probeSent = $true
                                $probeAttempts++
                                $lastProbeAt = [DateTime]::UtcNow
                            }
                        }
                    }
                }
            }
            if (@($requiredStages | Where-Object { $events.stage -notcontains $_ }).Count -eq 0) { break }
        }
        if ($process.HasExited) { break }
        Start-Sleep -Milliseconds 100
    }
} finally {
    if (-not $process.HasExited) {
        try {
            if (-not $process.CloseMainWindow() -or -not $process.WaitForExit(5000)) {
                $process.Kill()
                $process.WaitForExit(5000)
            }
        } catch {
            try { $process.Kill() } catch { }
        }
    }
}

$appName = @{writer="Doc";sheet="Sheet";slides="Slide"}[$AppKind]
Write-Output "App: 3T $appName"
Write-Output "Layout: $mainPy"
Write-Output "Open file: $(if ($openPath) { $openPath } else { '(blank document)' })"
if ($VerifyFirstInput -and -not $openPath) {
    Write-Output "First input probe sent: $probeSent"
    Write-Output "First editor key observed: $($events.stage -contains 'first_editor_key')"
}
Write-Output "Trace: $tracePath"
if ($events.Count -eq 0) {
    Write-Output "No startup trace was recorded."
} else {
    $events | Select-Object stage, elapsed_ms, renderer_elapsed_ms, worker_elapsed_ms, app | Format-Table -AutoSize
}
if (-not ($events.stage -contains $terminalStage)) {
    throw "Timed out or process exited before '$terminalStage'. See $tracePath"
}
