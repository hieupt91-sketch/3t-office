# Build a portable 3T Office pilot package (Windows x64).
# Output: <OutDir>\VNOffice-<Version>\ (app + bundled Python + bundled LibreOffice, Doc/Sheet/Slide launchers) and, with -Zip, a .zip next to it.
# No new build dependency: copies the local CPython install (PSF), the runtime packages pywebview needs
# (pywebview BSD, pythonnet MIT, clr_loader MIT, cffi MIT, pycparser BSD, bottle MIT, proxy_tools MIT,
# typing_extensions PSF) and a LibreOffice install (MPL-2.0). Never packages tests, docs, sample or real documents.
# ASCII only: Windows PowerShell 5.1 reads BOM-less scripts in the ANSI code page.
param(
    [string]$Version = "0.9.0-pilot1",
    [string]$OutDir = "E:\VNOffice-dist",
    [string]$PythonDir = (Join-Path $env:LOCALAPPDATA "Programs\Python\Python312"),
    [string]$LibreOfficeDir = (Join-Path $HOME "tools\libreoffice"),
    # Where installed copies look for signed patches, e.g. \\192.168.1.252\company1\Software\VNOffice\updates
    # (written to app\vnoffice-config.json, which updates never overwrite). Empty = updates off.
    [string]$UpdateSource = "",
    [string]$UpdateChannel = "pilot",
    [string]$InternetUpdateSource = "https://office.3tcomputer.com/updates",
    [string]$ErrorReportEndpoint = "https://office.3tcomputer.com",
    [switch]$Zip
)

$ErrorActionPreference = "Stop"
$repo = Split-Path -Parent $PSScriptRoot
$versionPattern = '^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(-[0-9A-Za-z.-]+)?(\+[0-9A-Za-z.-]+)?$'
if ($Version -notmatch $versionPattern) { throw "Version must use semantic x.y.z syntax: $Version" }
$trustPath = Join-Path $repo "adapters\updater\trust.py"
if (-not (Test-Path -LiteralPath $trustPath)) { throw "Missing embedded updater public key module: $trustPath" }
$trustText = [System.IO.File]::ReadAllText($trustPath, [System.Text.Encoding]::ASCII)
if ($trustText -notmatch 'PUBLIC_KEY_N_HEX\s*=\s*"[89a-f][0-9a-f]{767}"' -or $trustText -notmatch 'PUBLIC_KEY_E\s*=\s*65537') {
    throw "Embedded RSA-3072 public key is not configured. Run scripts/release/make-update.py --keygen before building release packages."
}
$dist = Join-Path $OutDir "VNOffice-$Version"
$appDir = Join-Path $dist "app"
$pyOut = Join-Path $dist "python"

foreach ($required in @((Join-Path $PythonDir "pythonw.exe"), (Join-Path $LibreOfficeDir "program\soffice.exe"), (Join-Path $repo "main.py"))) {
    if (-not (Test-Path -LiteralPath $required)) { throw "Missing: $required" }
}
if (Test-Path -LiteralPath $dist) { throw "Output already exists, choose another -Version or remove it first: $dist" }
New-Item -ItemType Directory -Force $appDir, $pyOut | Out-Null

function Invoke-Robocopy([string]$Source, [string]$Target, [string[]]$Extra) {
    $args = @($Source, $Target, "/E", "/NFL", "/NDL", "/NJH", "/NJS", "/NP", "/R:1", "/W:1") + $Extra
    & robocopy @args | Out-Null
    if ($LASTEXITCODE -ge 8) { throw "robocopy failed ($LASTEXITCODE): $Source -> $Target" }
}

# 1. Application sources (runtime only).
Write-Host "[1/5] App sources"
# The packaged app must report the package version (error reports, Help, updater), not the repo default.
$mainTarget = Join-Path $appDir "main.py"
Copy-Item -LiteralPath (Join-Path $repo "main.py") -Destination $mainTarget
$mainText = [System.IO.File]::ReadAllText($mainTarget, [System.Text.Encoding]::UTF8)
$appVersionMatches = [System.Text.RegularExpressions.Regex]::Matches($mainText, '(?m)^APP_VERSION\s*=.*$')
if ($appVersionMatches.Count -ne 1) { throw "Expected exactly one APP_VERSION assignment in main.py" }
$versionRegex = New-Object System.Text.RegularExpressions.Regex('(?m)^APP_VERSION\s*=.*$')
$mainText = $versionRegex.Replace($mainText, ('APP_VERSION = "' + $Version + '"'), 1)
[System.IO.File]::WriteAllText($mainTarget, $mainText, (New-Object System.Text.UTF8Encoding($false)))
Copy-Item -LiteralPath (Join-Path $repo "index.html") -Destination $appDir
foreach ($dir in @("apps", "platform", "adapters", "branding")) {
    $source = Join-Path $repo $dir
    if (Test-Path -LiteralPath $source) {
        Invoke-Robocopy $source (Join-Path $appDir $dir) @("/XD", "__pycache__", "node_modules", "/XF", "*.pyc")
    }
}
$example = Join-Path $repo "vnoffice-config.example.json"
if (Test-Path -LiteralPath $example) { Copy-Item -LiteralPath $example -Destination $appDir }
if ($UpdateSource) {
    $updateSources = @($UpdateSource)
    if ($InternetUpdateSource -and $InternetUpdateSource -ne $UpdateSource) { $updateSources += $InternetUpdateSource }
    $config = [ordered]@{
        errorReporting = [ordered]@{ enabled = $true; endpoint = $ErrorReportEndpoint }
        update = [ordered]@{ source = $UpdateSource; sources = $updateSources; channel = $UpdateChannel }
    }
    $configJson = $config | ConvertTo-Json -Depth 4
    [System.IO.File]::WriteAllText((Join-Path $appDir "vnoffice-config.json"), $configJson, (New-Object System.Text.UTF8Encoding $false))
}

# 2. Python runtime: interpreter, stdlib (without tests/IDLE/tkinter/pip), only the packages the app imports.
Write-Host "[2/5] Python runtime"
Get-ChildItem -LiteralPath $PythonDir -File | Where-Object { $_.Extension -in ".exe", ".dll", ".txt", ".zip" } |
    Where-Object { $_.Name -notlike "Removed*" } | Copy-Item -Destination $pyOut
Invoke-Robocopy (Join-Path $PythonDir "DLLs") (Join-Path $pyOut "DLLs") @("/XF", "_tkinter.pyd", "tcl*.dll", "tk*.dll")
Invoke-Robocopy (Join-Path $PythonDir "Lib") (Join-Path $pyOut "Lib") @(
    "/XD", "site-packages", "test", "tests", "idlelib", "tkinter", "turtledemo", "ensurepip", "__pycache__", "lib2to3", "venv",
    "/XF", "*.pyc")
$siteIn = Join-Path $PythonDir "Lib\site-packages"
$siteOut = Join-Path $pyOut "Lib\site-packages"
New-Item -ItemType Directory -Force $siteOut | Out-Null
$packages = @("webview", "pythonnet", "clr_loader", "cffi", "pycparser", "bottle", "proxy_tools")
foreach ($name in $packages) {
    $pkgDir = Join-Path $siteIn $name
    if (Test-Path -LiteralPath $pkgDir) { Invoke-Robocopy $pkgDir (Join-Path $siteOut $name) @("/XD", "__pycache__", "/XF", "*.pyc") }
}
Get-ChildItem -LiteralPath $siteIn -File | Where-Object { $_.Name -match '^(bottle|clr|typing_extensions|_cffi_backend)\.' } | Copy-Item -Destination $siteOut
Get-ChildItem -LiteralPath $siteIn -Directory | Where-Object { $_.Name -match '^(pywebview|pythonnet|clr_loader|cffi|pycparser|bottle|proxy_tools|typing_extensions)-.*\.dist-info$' } |
    ForEach-Object { Invoke-Robocopy $_.FullName (Join-Path $siteOut $_.Name) @() }

# 3. LibreOffice engine, found by main.find_soffice() at app\tools\libreoffice\program\soffice.exe.
Write-Host "[3/5] LibreOffice (large, a few minutes)"
Invoke-Robocopy $LibreOfficeDir (Join-Path $appDir "tools\libreoffice") @()

# 3b. Pre-warmed LibreOffice profiles (~1 MB each): the first launch copies them instead of building a profile
# from nothing, which costs ~12 s of the first document open (main._seed_profile_dir).
Write-Host "      Seed profiles"
& (Join-Path $PythonDir "python.exe") -s (Join-Path $PSScriptRoot "release\build-seed-profiles.py") (Join-Path $appDir "seed")
if ($LASTEXITCODE -ne 0) { throw "build-seed-profiles.py failed ($LASTEXITCODE)" }

# 3b2. Precompiled bytecode (checked-hash = valid wherever the files are copied, independent of file times).
# Without it the first run compiles ooxml_zip_patch.py and the other large modules (and every Sheet worker process
# does it again): measured on 0.9.9-rc1, first lan03 open 25.7 s vs 14.8 s once __pycache__ existed. Set
# VNO_SKIP_PYC=1 to skip this step.
if ($env:VNO_SKIP_PYC -ne "1") {
    Write-Host "      Precompile bytecode"
    $pyExe = Join-Path $pyOut "python.exe"
    $compileTargets = @((Join-Path $appDir "adapters"), (Join-Path $appDir "apps"), (Join-Path $appDir "platform"), (Join-Path $pyOut "Lib"))
    foreach ($target in $compileTargets) {
        if (Test-Path -LiteralPath $target) {
            & $pyExe -s -m compileall -q -j 0 --invalidation-mode checked-hash $target | Out-Null
        }
    }
}

# 3c. Per-app launchers (Doc.exe / Sheet.exe / Slide.exe): own icon + name for "Open with", taskbar, Task Manager.
Write-Host "      Launchers"
& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "installer\build-launchers.ps1") -OutDir (Join-Path $appDir "launchers") -Version $Version
if ($LASTEXITCODE -ne 0) { throw "build-launchers.ps1 failed ($LASTEXITCODE)" }

# 4. Icons (copy real multi-size icons from branding/icons/, or fallback to generated placeholders), version, notices.
Write-Host "[4/5] Icons, version, notices"
# Needed before $iconSpecs below: [System.Drawing.Color] is not loaded in a fresh PowerShell 5.1.
Add-Type -AssemblyName System.Drawing
$iconDir = Join-Path $dist "icons"
New-Item -ItemType Directory -Force $iconDir | Out-Null
$vnoIcon = Join-Path $repo "branding\icons\vnoffice.ico"
if (Test-Path -LiteralPath $vnoIcon) {
    Copy-Item -LiteralPath $vnoIcon -Destination (Join-Path $iconDir "vnoffice.ico")
}
$iconSpecs = @(
    @{ Name = "writer"; Letter = "W"; Color = [System.Drawing.Color]::FromArgb(255, 30, 94, 180) },
    @{ Name = "sheet"; Letter = "S"; Color = [System.Drawing.Color]::FromArgb(255, 22, 128, 74) },
    @{ Name = "slides"; Letter = "P"; Color = [System.Drawing.Color]::FromArgb(255, 204, 88, 30) }
)
foreach ($spec in $iconSpecs) {
    $realIcon = Join-Path $repo "branding\icons\$($spec.Name).ico"
    if (Test-Path -LiteralPath $realIcon) {
        Copy-Item -LiteralPath $realIcon -Destination (Join-Path $iconDir "$($spec.Name).ico")
    } else {
        $bitmap = New-Object System.Drawing.Bitmap 64, 64
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
        $graphics.SmoothingMode = "AntiAlias"
        $graphics.TextRenderingHint = "AntiAliasGridFit"
        $graphics.Clear([System.Drawing.Color]::Transparent)
        $graphics.FillRectangle((New-Object System.Drawing.SolidBrush $spec.Color), 4, 4, 56, 56)
        $font = New-Object System.Drawing.Font "Segoe UI", 30, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
        $format = New-Object System.Drawing.StringFormat
        $format.Alignment = "Center"; $format.LineAlignment = "Center"
        $graphics.DrawString($spec.Letter, $font, [System.Drawing.Brushes]::White, (New-Object System.Drawing.RectangleF 4, 6, 56, 56), $format)
        $graphics.Dispose()
        $icon = [System.Drawing.Icon]::FromHandle($bitmap.GetHicon())
        $stream = [System.IO.File]::Create((Join-Path $iconDir "$($spec.Name).ico"))
        $icon.Save($stream); $stream.Close(); $bitmap.Dispose()
    }
}
Set-Content -LiteralPath (Join-Path $dist "VERSION.txt") -Value $Version -Encoding ASCII
$packagedVersion = (Get-Content -LiteralPath (Join-Path $dist "VERSION.txt") -Encoding ASCII -Raw).Trim()
$packagedMain = [System.IO.File]::ReadAllText($mainTarget, [System.Text.Encoding]::UTF8)
if ($packagedVersion -ne $Version -or $packagedMain -notmatch ('(?m)^APP_VERSION\s*=\s*"' + [regex]::Escape($Version) + '"\s*$')) {
    throw "Packaged APP_VERSION and VERSION.txt do not match: $Version"
}
$commit = (& git -C $repo rev-parse --short HEAD).Trim()
Set-Content -LiteralPath (Join-Path $dist "BUILD-INFO.txt") -Value "version=$Version`r`ncommit=$commit`r`nbuilt=$((Get-Date).ToString('yyyy-MM-dd HH:mm'))" -Encoding ASCII
$notices = Join-Path $dist "THIRD-PARTY-NOTICES"
New-Item -ItemType Directory -Force $notices | Out-Null
Copy-Item -LiteralPath (Join-Path $PythonDir "LICENSE.txt") -Destination (Join-Path $notices "Python-LICENSE.txt")
foreach ($lo in @("LICENSE.html", "LICENSE", "license.txt", "NOTICE", "CREDITS.fodt")) {
    $path = Join-Path $LibreOfficeDir $lo
    if (Test-Path -LiteralPath $path) { Copy-Item -LiteralPath $path -Destination (Join-Path $notices "LibreOffice-$lo") }
}
Get-ChildItem -LiteralPath $siteOut -Directory -Filter "*.dist-info" | ForEach-Object {
    $info = $_
    Get-ChildItem -LiteralPath $info.FullName -Recurse -File | Where-Object { $_.Name -match '^(LICEN[CS]E|COPYING|NOTICE)' } |
        ForEach-Object { Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $notices "$($info.Name)-$($_.Name)") }
}
$fontLicense = Join-Path $appDir "platform\theme\fonts\OFL.txt"
if (Test-Path -LiteralPath $fontLicense) { Copy-Item -LiteralPath $fontLicense -Destination (Join-Path $notices "BeVietnamPro-OFL.txt") }
Copy-Item -LiteralPath (Join-Path $PSScriptRoot "install-pilot.ps1") -Destination $dist
Copy-Item -LiteralPath (Join-Path $PSScriptRoot "pilot\CAI-DAT.txt") -Destination $dist

# Keep the portable package's launcher names and its install guide in sync with the bundled installer script.
$packagedPilotInstaller = [System.IO.File]::ReadAllText((Join-Path $dist "install-pilot.ps1"), [System.Text.Encoding]::ASCII)
$packagedPilotGuide = [System.IO.File]::ReadAllText((Join-Path $dist "CAI-DAT.txt"), [System.Text.Encoding]::UTF8)
foreach ($launcher in @("Doc", "Sheet", "Slide")) {
    if ($packagedPilotInstaller -notmatch ('Name = "' + [regex]::Escape($launcher) + '"')) {
        throw "Portable installer is missing the expected $launcher shortcut name."
    }
    if ($packagedPilotGuide -notmatch ('\b' + [regex]::Escape($launcher) + '\b')) {
        throw "Portable install guide is missing the $launcher shortcut instructions."
    }
}
if ($packagedPilotGuide -notmatch 'Start Menu > 3T Office') {
    throw "Portable install guide is missing the Start Menu > 3T Office path."
}
foreach ($previousName in @("3T Doc", "3T Sheet", "3T Slide")) {
    if ($packagedPilotInstaller -notmatch [regex]::Escape($previousName)) {
        throw "Portable installer is missing cleanup for the previous $previousName shortcut."
    }
}

# 5. Optional zip.
if ($Zip) {
    Write-Host "[5/5] Zip"
    $zipPath = "$dist.zip"
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::CreateFromDirectory($dist, $zipPath, [System.IO.Compression.CompressionLevel]::Optimal, $true)
    Write-Host "Zip: $zipPath ($([int]((Get-Item $zipPath).Length / 1MB)) MB)"
}
$size = [int]((Get-ChildItem -LiteralPath $dist -Recurse -File | Measure-Object Length -Sum).Sum / 1MB)
Write-Host "Built $dist ($size MB)"
