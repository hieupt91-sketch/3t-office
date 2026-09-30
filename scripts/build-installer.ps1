# Build a single per-user VN Office Setup.exe with the current-user NSIS compiler.
# Usage: powershell -ExecutionPolicy Bypass -File scripts\build-installer.ps1 -PackageDir E:\VNOffice-dist\VNOffice-0.9.0-pilot1
# ASCII only: compatible with Windows PowerShell 5.1.
param(
    [Parameter(Mandatory = $true)]
    [string]$PackageDir,
    [string]$OutDir = "",
    [string]$MakensisPath = ""
)

$ErrorActionPreference = "Stop"
$scriptDir = $PSScriptRoot
$installerDir = Join-Path $scriptDir "installer"
$nsiPath = Join-Path $installerDir "vnoffice.nsi"
$preflightPath = Join-Path $installerDir "SetupPreflight.ps1"
$nsisCopyingPath = Join-Path $installerDir "NSIS-COPYING.txt"
$packagePath = (Resolve-Path -LiteralPath $PackageDir).Path
if (-not $OutDir) { $OutDir = Split-Path -Parent $packagePath }
$outputPath = [System.IO.Path]::GetFullPath($OutDir)

foreach ($requiredFile in @($nsiPath, $preflightPath, $nsisCopyingPath)) {
    if (-not (Test-Path -LiteralPath $requiredFile -PathType Leaf)) { throw "Missing installer source file: $requiredFile" }
}

$required = @(
    "python\pythonw.exe",
    "app\main.py",
    "app\tools\libreoffice\program\soffice.exe",
    "icons\writer.ico",
    "icons\sheet.ico",
    "icons\slides.ico",
    "VERSION.txt",
    "BUILD-INFO.txt",
    "THIRD-PARTY-NOTICES"
)
foreach ($relative in $required) {
    if (-not (Test-Path -LiteralPath (Join-Path $packagePath $relative))) {
        throw "Package is missing required installer content: $relative"
    }
}
if (-not (Get-ChildItem -LiteralPath (Join-Path $packagePath "THIRD-PARTY-NOTICES") -File -Recurse | Select-Object -First 1)) {
    throw "Package THIRD-PARTY-NOTICES directory is empty."
}

$version = (Get-Content -LiteralPath (Join-Path $packagePath "VERSION.txt") -Raw).Trim()
if ($version -notmatch '^[A-Za-z0-9][A-Za-z0-9._-]*$') {
    throw "Invalid package version in VERSION.txt: $version"
}

if ($MakensisPath) {
    if (-not (Test-Path -LiteralPath $MakensisPath -PathType Leaf)) { throw "makensis.exe not found: $MakensisPath" }
    $compilerPath = (Resolve-Path -LiteralPath $MakensisPath).Path
} else {
    $candidates = @()
    $currentUserNsis = Join-Path $env:LOCALAPPDATA "Programs\NSIS"
    if (Test-Path -LiteralPath $currentUserNsis -PathType Container) {
        $candidates += Get-ChildItem -LiteralPath $currentUserNsis -Directory |
            Sort-Object { [version]::Parse(($_.Name -replace '^v', '')) } -Descending |
            ForEach-Object { Join-Path $_.FullName "makensis.exe" }
        $candidates += Join-Path $currentUserNsis "makensis.exe"
    }
    $candidates += @(
        (Join-Path ${env:ProgramFiles(x86)} "NSIS\makensis.exe"),
        (Join-Path $env:ProgramFiles "NSIS\makensis.exe")
    )
    $command = Get-Command makensis.exe -ErrorAction SilentlyContinue
    if ($command) { $candidates += $command.Source }
    $compilerPath = $candidates | Where-Object { $_ -and (Test-Path -LiteralPath $_ -PathType Leaf) } | Select-Object -First 1
    if (-not $compilerPath) {
        throw "NSIS makensis.exe was not found. Install the official portable NSIS release under %LOCALAPPDATA%\Programs\NSIS or pass -MakensisPath."
    }
    $compilerPath = (Resolve-Path -LiteralPath $compilerPath).Path
}

$compilerVersion = (& $compilerPath /VERSION | Out-String).Trim()
if ($LASTEXITCODE -ne 0 -or $compilerVersion -notmatch '^v?3\.') {
    throw "Unsupported NSIS compiler or failed to read its version: $compilerPath ($compilerVersion)"
}

New-Item -ItemType Directory -Force -Path $outputPath | Out-Null
$payloadRoots = @("python", "app", "icons", "THIRD-PARTY-NOTICES")
$payloadFiles = @("VERSION.txt", "BUILD-INFO.txt")
$packageBytes = 0L
foreach ($root in $payloadRoots) {
    $rootPath = Join-Path $packagePath $root
    $rootBytes = (Get-ChildItem -LiteralPath $rootPath -Recurse -File | Measure-Object -Property Length -Sum).Sum
    if ($rootBytes) { $packageBytes += [long]$rootBytes }
}
foreach ($relative in $payloadFiles) {
    $packageBytes += (Get-Item -LiteralPath (Join-Path $packagePath $relative)).Length
}
$packageBytes += (Get-Item -LiteralPath $nsisCopyingPath).Length
$requiredFreeBytes = $packageBytes + 268435456L

$makensisArgs = @(
    "/V3",
    "/INPUTCHARSET",
    "UTF8",
    "/DPackageDir=$packagePath",
    "/DOutputDir=$outputPath",
    "/DAppVersion=$version",
    "/DPackageSizeBytes=$packageBytes",
    "/DRequiredFreeBytes=$requiredFreeBytes",
    "/DInstallerSourceDir=$installerDir",
    $nsiPath
)
$stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
Write-Host "Compiling VN Office $version with NSIS $compilerVersion ($compilerPath)"
Write-Host "Required free space at install target: $([Math]::Round($requiredFreeBytes / 1MB, 1)) MiB"
& $compilerPath @makensisArgs
$compilerExit = $LASTEXITCODE
$stopwatch.Stop()
if ($compilerExit -ne 0) { throw "NSIS compilation failed with exit code $compilerExit." }

$setupPath = Join-Path $outputPath "VNOffice-Setup-$version.exe"
if (-not (Test-Path -LiteralPath $setupPath -PathType Leaf)) {
    throw "makensis completed but the expected setup file was not created: $setupPath"
}
$setupFile = Get-Item -LiteralPath $setupPath
$sizeMiB = [Math]::Round($setupFile.Length / 1MB, 2)
$elapsed = [Math]::Round($stopwatch.Elapsed.TotalSeconds, 1)
$hash = (Get-FileHash -LiteralPath $setupPath -Algorithm SHA256).Hash
Write-Host "Setup: $setupPath"
Write-Host "Size: $sizeMiB MiB ($($setupFile.Length) bytes)"
Write-Host "SHA256: $hash"
Write-Host "Build time: $elapsed seconds"
