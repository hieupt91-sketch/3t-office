# Install (or uninstall) a VN Office pilot package for the current Windows user. No admin rights needed.
# Run from the unpacked package folder:  powershell -ExecutionPolicy Bypass -File install-pilot.ps1 [-Uninstall] [-NoDesktopShortcuts]
# Installs to %LOCALAPPDATA%\VNOffice\app-install, creates Start Menu (+ Desktop) shortcuts for VN Writer / VN Sheet / VN Slides.
# Does NOT change file associations, so Microsoft Office keeps opening documents by default during the pilot.
# ASCII only: Windows PowerShell 5.1 reads BOM-less scripts in the ANSI code page.
param(
    [switch]$Uninstall,
    [switch]$NoDesktopShortcuts,
    [string]$InstallDir = (Join-Path $env:LOCALAPPDATA "VNOffice\app-install")
)

$ErrorActionPreference = "Stop"
$source = $PSScriptRoot
$startMenu = Join-Path ([Environment]::GetFolderPath("Programs")) "VN Office"
$desktop = [Environment]::GetFolderPath("Desktop")
$apps = @(
    @{ Id = "writer"; Name = "VN Writer" },
    @{ Id = "sheet"; Name = "VN Sheet" },
    @{ Id = "slides"; Name = "VN Slides" }
)

function Remove-Shortcuts {
    if (Test-Path -LiteralPath $startMenu) { Remove-Item -LiteralPath $startMenu -Recurse -Force }
    foreach ($app in $apps) {
        $link = Join-Path $desktop "$($app.Name).lnk"
        if (Test-Path -LiteralPath $link) { Remove-Item -LiteralPath $link -Force }
    }
}

if ($Uninstall) {
    Get-Process pythonw -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "$InstallDir*" } | Stop-Process -Force
    Remove-Shortcuts
    if (Test-Path -LiteralPath $InstallDir) { Remove-Item -LiteralPath $InstallDir -Recurse -Force }
    Write-Host "Da go VN Office (ban thu nghiem). Du lieu cai dat/bao loi trong %APPDATA%\VNOffice duoc giu lai."
    return
}

foreach ($required in @("python\pythonw.exe", "app\main.py", "app\tools\libreoffice\program\soffice.exe")) {
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
if ($running) { throw "VN Office dang chay. Hay dong tat ca cua so VN Writer/Sheet/Slides roi cai lai." }

Write-Host "Dang chep VN Office vao $InstallDir (co the mat vai phut)..."
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
        $link.Description = "$($app.Name) - VN Office (ban thu nghiem)"
        $link.Save()
    }
}
$uninstallLink = $shell.CreateShortcut((Join-Path $startMenu "Go cai dat VN Office.lnk"))
$uninstallLink.TargetPath = "powershell.exe"
$uninstallLink.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$(Join-Path $InstallDir 'install-pilot.ps1')`" -Uninstall"
$uninstallLink.Save()

$version = Get-Content -LiteralPath (Join-Path $InstallDir "VERSION.txt") -ErrorAction SilentlyContinue
Write-Host "Da cai VN Office $version. Mo VN Writer / VN Sheet / VN Slides tu Start Menu hoac Desktop."
