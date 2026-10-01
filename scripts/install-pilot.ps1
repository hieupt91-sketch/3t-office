# Install (or uninstall) a 3T Office pilot package for the current Windows user. No admin rights needed.
# Run from the unpacked package folder:  powershell -ExecutionPolicy Bypass -File install-pilot.ps1 [-Uninstall] [-NoDesktopShortcuts] [-NoLibreOfficeWarmup]
# Installs to %LOCALAPPDATA%\VNOffice\app-install, creates Doc / Sheet / Slide shortcuts in Start Menu (+ Desktop).
# Does NOT change file associations, so existing default apps continue opening documents during the pilot.
# ASCII only: Windows PowerShell 5.1 reads BOM-less scripts in the ANSI code page.
param(
    [switch]$Uninstall,
    [switch]$NoDesktopShortcuts,
    [switch]$NoLibreOfficeWarmup,
    [string]$InstallDir = (Join-Path $env:LOCALAPPDATA "VNOffice\app-install")
)

$ErrorActionPreference = "Stop"
$source = $PSScriptRoot
$startMenu = Join-Path ([Environment]::GetFolderPath("Programs")) "3T Office"
$legacyStartMenu = Join-Path ([Environment]::GetFolderPath("Programs")) "VN Office"
$desktop = [Environment]::GetFolderPath("Desktop")
$apps = @(
    @{ Id = "writer"; Name = "Doc" },
    @{ Id = "sheet"; Name = "Sheet" },
    @{ Id = "slides"; Name = "Slide" }
)

function Remove-Shortcuts {
    $legacyShortcutNames = @("3T Doc", "3T Sheet", "3T Slide", "VN Writer", "VN Sheet", "VN Slides", "Go cai dat VN Office")
    foreach ($menuFolder in @($legacyStartMenu, $startMenu)) {
        foreach ($shortcutName in $legacyShortcutNames) {
            $legacyLink = Join-Path $menuFolder "$shortcutName.lnk"
            if (Test-Path -LiteralPath $legacyLink) { Remove-Item -LiteralPath $legacyLink -Force }
        }
    }
    if (Test-Path -LiteralPath $startMenu) { Remove-Item -LiteralPath $startMenu -Recurse -Force }
    if ((Test-Path -LiteralPath $legacyStartMenu) -and -not (Get-ChildItem -LiteralPath $legacyStartMenu -Force | Select-Object -First 1)) {
        Remove-Item -LiteralPath $legacyStartMenu -Force
    }
    foreach ($app in $apps) {
        $link = Join-Path $desktop "$($app.Name).lnk"
        if (Test-Path -LiteralPath $link) { Remove-Item -LiteralPath $link -Force }
    }
    foreach ($legacyName in @("3T Doc", "3T Sheet", "3T Slide", "VN Writer", "VN Sheet", "VN Slides")) {
        $legacyLink = Join-Path $desktop "$legacyName.lnk"
        if (Test-Path -LiteralPath $legacyLink) { Remove-Item -LiteralPath $legacyLink -Force }
    }
}

if ($Uninstall) {
    Get-Process pythonw -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "$InstallDir*" } | Stop-Process -Force
    Remove-Shortcuts
    if (Test-Path -LiteralPath $InstallDir) { Remove-Item -LiteralPath $InstallDir -Recurse -Force }
    Write-Host "Da go 3T Office (ban thu nghiem). Du lieu cai dat/bao loi trong %APPDATA%\VNOffice duoc giu lai."
    return
}

foreach ($required in @("python\python.exe", "python\pythonw.exe", "app\main.py", "app\tools\libreoffice\program\soffice.exe")) {
    if (-not (Test-Path -LiteralPath (Join-Path $source $required))) { throw "Goi cai dat thieu tep: $required" }
}

# WebView2 runtime is required by the UI (preinstalled on current Windows 10/11 with Edge).
$webView2Keys = @(
    "HKLM:\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}",
    "HKLM:\SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}",
    "HKCU:\Software\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}"
)
if (-not ($webView2Keys | Where-Object { Test-Path $_ })) {
    Write-Warning "May chua co Microsoft Edge WebView2 Runtime. Hay cai WebView2 Runtime (mien phi tu Microsoft) roi chay lai."
}

$running = Get-Process pythonw -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "$InstallDir*" }
if ($running) { throw "3T Office dang chay. Hay dong tat ca cua so 3T Doc/3T Sheet/3T Slide roi cai lai." }

Write-Host "Dang chep 3T Office vao $InstallDir (co the mat vai phut)..."
$staging = "$InstallDir.new"
if (Test-Path -LiteralPath $staging) { Remove-Item -LiteralPath $staging -Recurse -Force }
# Skip only package archives lying next to this script: a bare /XF *.zip also dropped LibreOffice's
# share\config\images_*.zip icon themes (21 files, 78 MB) from every install.
$topLevelZips = @(Get-ChildItem -LiteralPath $source -File -Filter "*.zip" | ForEach-Object { $_.FullName })
$excludeArgs = @()
if ($topLevelZips.Count -gt 0) { $excludeArgs = @("/XF") + $topLevelZips }
& robocopy $source $staging /E /NFL /NDL /NJH /NJS /NP /R:1 /W:1 @excludeArgs | Out-Null
if ($LASTEXITCODE -ge 8) { throw "Chep tep that bai (robocopy $LASTEXITCODE)" }
if (Test-Path -LiteralPath $InstallDir) { Remove-Item -LiteralPath $InstallDir -Recurse -Force }
Rename-Item -LiteralPath $staging -NewName (Split-Path -Leaf $InstallDir)
# A zip downloaded from Drive/Internet marks every extracted file as "from the Internet" (Zone.Identifier);
# pythonw.exe and its DLLs would then show a security warning on every launch. The package is ours: unblock it.
Get-ChildItem -LiteralPath $InstallDir -Recurse -File | Unblock-File

if (-not $NoLibreOfficeWarmup) {
    Write-Host "Preparing offline Writer and Sheet profiles (one-time, about 30 seconds)..."
    $warmupPython = Join-Path $InstallDir "python\python.exe"
    $mainScript = Join-Path $InstallDir "app\main.py"
    & $warmupPython -s -E $mainScript --warmup-libreoffice-profiles
    $warmupExitCode = $LASTEXITCODE
    if ($warmupExitCode -ne 0) {
        Write-Warning "LibreOffice profile warm-up did not finish. 3T Office will try again in the background when it starts."
    }
}

Remove-Shortcuts
New-Item -ItemType Directory -Force $startMenu | Out-Null
$shell = New-Object -ComObject WScript.Shell
foreach ($app in $apps) {
    $targets = @((Join-Path $startMenu "$($app.Name).lnk"))
    if (-not $NoDesktopShortcuts) { $targets += (Join-Path $desktop "$($app.Name).lnk") }
    foreach ($linkPath in $targets) {
        $link = $shell.CreateShortcut($linkPath)
        $link.TargetPath = Join-Path $InstallDir "python\pythonw.exe"
        $link.Arguments = "-s -E `"$(Join-Path $InstallDir 'app\main.py')`" --app=$($app.Id)"
        $link.WorkingDirectory = Join-Path $InstallDir "app"
        $link.IconLocation = Join-Path $InstallDir "icons\$($app.Id).ico"
        $link.Description = "$($app.Name) - 3T Office (ban thu nghiem)"
        $link.Save()
    }
}
$uninstallLink = $shell.CreateShortcut((Join-Path $startMenu "Go cai dat 3T Office.lnk"))
$uninstallLink.TargetPath = "powershell.exe"
$uninstallLink.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$(Join-Path $InstallDir 'install-pilot.ps1')`" -Uninstall"
$uninstallLink.Save()

$version = Get-Content -LiteralPath (Join-Path $InstallDir "VERSION.txt") -ErrorAction SilentlyContinue
Write-Host "Da cai 3T Office $version. Mo Doc / Sheet / Slide tu Start Menu > 3T Office hoac Desktop."
