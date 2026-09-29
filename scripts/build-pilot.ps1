# Build a portable VN Office pilot package (Windows x64).
# Output: <OutDir>\VNOffice-<Version>\ (app + bundled Python + bundled LibreOffice) and, with -Zip, a .zip next to it.
# No new build dependency: copies the local CPython install (PSF), the runtime packages pywebview needs
# (pywebview BSD, pythonnet MIT, clr_loader MIT, cffi MIT, pycparser BSD, bottle MIT, proxy_tools MIT,
# typing_extensions PSF) and a LibreOffice install (MPL-2.0). Never packages tests, docs, sample or real documents.
# ASCII only: Windows PowerShell 5.1 reads BOM-less scripts in the ANSI code page.
param(
    [string]$Version = "0.9.0-pilot1",
    [string]$OutDir = "E:\VNOffice-dist",
    [string]$PythonDir = (Join-Path $env:LOCALAPPDATA "Programs\Python\Python312"),
    [string]$LibreOfficeDir = (Join-Path $HOME "tools\libreoffice"),
    [switch]$Zip
)

$ErrorActionPreference = "Stop"
$repo = Split-Path -Parent $PSScriptRoot
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
foreach ($file in @("main.py", "index.html")) { Copy-Item -LiteralPath (Join-Path $repo $file) -Destination $appDir }
foreach ($dir in @("apps", "platform", "adapters", "branding")) {
    $source = Join-Path $repo $dir
    if (Test-Path -LiteralPath $source) {
        Invoke-Robocopy $source (Join-Path $appDir $dir) @("/XD", "__pycache__", "node_modules", "/XF", "*.pyc")
    }
}
$example = Join-Path $repo "vnoffice-config.example.json"
if (Test-Path -LiteralPath $example) { Copy-Item -LiteralPath $example -Destination $appDir }

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

# 4. Icons (simple generated placeholders until branding/ provides real ones), version, notices.
Write-Host "[4/5] Icons, version, notices"
Add-Type -AssemblyName System.Drawing
$iconDir = Join-Path $dist "icons"
New-Item -ItemType Directory -Force $iconDir | Out-Null
$iconSpecs = @(
    @{ Name = "writer"; Letter = "W"; Color = [System.Drawing.Color]::FromArgb(255, 30, 94, 180) },
    @{ Name = "sheet"; Letter = "S"; Color = [System.Drawing.Color]::FromArgb(255, 22, 128, 74) },
    @{ Name = "slides"; Letter = "P"; Color = [System.Drawing.Color]::FromArgb(255, 204, 88, 30) }
)
foreach ($spec in $iconSpecs) {
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
Set-Content -LiteralPath (Join-Path $dist "VERSION.txt") -Value $Version -Encoding ASCII
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
