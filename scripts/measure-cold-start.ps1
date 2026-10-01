param(
    [Parameter(Mandatory = $true)][string]$PythonwPath,
    [Parameter(Mandatory = $true)][string]$MainPyPath,
    [ValidateSet("writer", "sheet", "slides")][string]$AppKind = "writer",
    [string]$OpenFile = "",
    [switch]$VerifyFirstInput,
    [int]$TimeoutSeconds = 240,
    [string]$Layout = "installed-like",
    [string]$LocalAppData = ""
)

$ErrorActionPreference = "Stop"
$pythonw = (Resolve-Path -LiteralPath $PythonwPath).Path
$mainPy = (Resolve-Path -LiteralPath $MainPyPath).Path
if ($OpenFile) { $openPath = (Resolve-Path -LiteralPath $OpenFile).Path }
else { $openPath = "" }

$runId = [Guid]::NewGuid().ToString("N")
$runRoot = Join-Path $env:TEMP "3toffice-startup-$runId"
$tracePath = Join-Path $runRoot "timeline.jsonl"
if ($LocalAppData) { $localAppData = [System.IO.Path]::GetFullPath($LocalAppData) }
else { $localAppData = Join-Path $runRoot "localappdata" }
New-Item -ItemType Directory -Path $runRoot, $localAppData -Force | Out-Null
[System.IO.File]::WriteAllText(
    $tracePath,
    '{"stage":"process_start","elapsed_ms":0.0}' + [Environment]::NewLine,
    (New-Object System.Text.UTF8Encoding($false))
)

# Reserve an unused loopback port for this WebView2 process's local CDP endpoint.
$portProbe = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, 0)
$portProbe.Start()
$debugPort = ([System.Net.IPEndPoint]$portProbe.LocalEndpoint).Port
$portProbe.Stop()

$t0 = [System.Diagnostics.Stopwatch]::GetTimestamp() / [double][System.Diagnostics.Stopwatch]::Frequency
$debugArguments = "--remote-debugging-port=$debugPort"
$previousDebugArguments = $env:WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS
$env:WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS = $debugArguments
try {
    $quotedMain = '"' + $mainPy.Replace('"', '\"') + '"'
    $arguments = "-s -E $quotedMain --app=$AppKind"
    if ($openPath) { $arguments += ' "' + $openPath.Replace('"', '\"') + '"' }
    $startInfo = New-Object System.Diagnostics.ProcessStartInfo
    $startInfo.FileName = $pythonw
    $startInfo.Arguments = $arguments
    $startInfo.WorkingDirectory = Split-Path -Parent $mainPy
    $startInfo.UseShellExecute = $false
    $startInfo.CreateNoWindow = $true
    $startInfo.EnvironmentVariables["WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS"] = $env:WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS
    $startInfo.EnvironmentVariables["VNO_STARTUP_TRACE_FILE"] = $tracePath
    $startInfo.EnvironmentVariables["VNO_STARTUP_TRACE_T0"] = [string]::Format([Globalization.CultureInfo]::InvariantCulture, "{0:R}", $t0)
    $startInfo.EnvironmentVariables["LOCALAPPDATA"] = $localAppData

    $process = [System.Diagnostics.Process]::Start($startInfo)
} finally {
    if ($null -ne $previousDebugArguments) { $env:WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS = $previousDebugArguments }
    else { Remove-Item Env:WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS -ErrorAction SilentlyContinue }
}

$probeScript = Join-Path $PSScriptRoot "cdp-cold-start-probe.mjs"
$probeArgs = @(
    "--experimental-websocket",
    $probeScript,
    "--port", "$debugPort",
    "--trace", $tracePath,
    "--process-id", "$($process.Id)",
    "--app", $AppKind,
    "--layout", $Layout,
    "--timeout-seconds", "$TimeoutSeconds"
)
if ($openPath) { $probeArgs += @("--open-file", $openPath) }
if ($VerifyFirstInput -and -not $openPath) { $probeArgs += "--verify-first-input" }

try {
    & node @probeArgs
    $probeExitCode = $LASTEXITCODE
} finally {
    if (-not $process.HasExited) {
        try {
            # The CDP client requests a normal close. This is a process-cleanup fallback only.
            if (-not $process.WaitForExit(8000)) {
                $process.Kill()
                $process.WaitForExit(5000)
            }
        } catch {
            try { $process.Kill() } catch { }
        }
    }
}

if ($probeExitCode -ne 0) {
    throw "CDP startup probe exited with code $probeExitCode. Trace: $tracePath"
}
