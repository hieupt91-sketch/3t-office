# One-command pilot release: package -> signed patch -> LAN share -> Setup.exe -> LAN share.
#   powershell -ExecutionPolicy Bypass -File scripts\release\release-pilot.ps1 -Version 0.9.5 -NotesFile E:\VNOffice-dist\notes-0.9.5.txt
# Installed copies (0.9.1+) pick the patch up automatically from <Share>\updates; new machines use the Setup.exe.
# ASCII only: Windows PowerShell 5.1 reads BOM-less scripts in the ANSI code page.
param(
    [Parameter(Mandatory = $true)][string]$Version,
    [Parameter(Mandatory = $true)][string]$NotesFile,
    [string]$Share = "\\192.168.1.252\company1\Software\VNOffice",
    [string]$OutDir = "E:\VNOffice-dist",
    [string]$Staging = "E:\VNOffice-dist\updates-staging",
    [string]$MinVersion = "0.9.0",
    [string]$Channel = "pilot",
    [string]$MakensisPath = "",
    [switch]$SkipSetup
)

$ErrorActionPreference = "Stop"
$repo = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$package = Join-Path $OutDir "VNOffice-$Version"
function Step([string]$text) { Write-Host ("[{0}] {1}" -f (Get-Date).ToString("HH:mm:ss"), $text) }

if (-not (Test-Path -LiteralPath $NotesFile)) { throw "Missing release notes file: $NotesFile" }
if (-not (Test-Path -LiteralPath $Share)) { throw "LAN share not reachable: $Share" }
$dirty = (& git -C $repo status --porcelain --untracked-files=no)
if ($dirty) { throw "Working tree has uncommitted changes; release only committed code." }

Step "1/6 Build package $Version"
& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $repo "scripts\build-pilot.ps1") -Version $Version -OutDir $OutDir -UpdateSource (Join-Path $Share "updates") -UpdateChannel $Channel
if ($LASTEXITCODE -ne 0) { throw "build-pilot.ps1 failed" }

Step "2/6 Sign and stage patch"
& python (Join-Path $repo "scripts\release\make-update.py") --package $package --source $Staging --version $Version --min-version $MinVersion --channel $Channel --notes-file $NotesFile
if ($LASTEXITCODE -ne 0) { throw "make-update.py failed" }

Step "3/6 Publish patch to $Share\updates"
& robocopy $Staging (Join-Path $Share "updates") /E /MT:32 /NFL /NDL /NJH /NJS /NP /R:2 /W:2 | Out-Null
if ($LASTEXITCODE -ge 8) { throw "robocopy of update repository failed ($LASTEXITCODE)" }
$channelFile = Join-Path $Share "updates\channels\$Channel.json"
$published = (Get-Content -LiteralPath $channelFile -Raw | ConvertFrom-Json).version
if ($published -ne $Version) { throw "Channel on share reports $published, expected $Version" }

if ($SkipSetup) { Step "Setup.exe skipped"; return }

Step "4/6 Build Setup.exe"
if (-not $MakensisPath) {
    $candidates = @(
        (Join-Path $env:LOCALAPPDATA "Programs\NSIS\3.13\makensis.exe"),
        "E:\VNOffice-profiles\codex3\Programs\NSIS\3.13\makensis.exe",
        "C:\Program Files (x86)\NSIS\makensis.exe"
    )
    $MakensisPath = $candidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
}
if (-not $MakensisPath) { throw "makensis.exe (NSIS) not found; pass -MakensisPath" }
& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $repo "scripts\build-installer.ps1") -PackageDir $package -OutDir $OutDir -MakensisPath $MakensisPath
if ($LASTEXITCODE -ne 0) { throw "build-installer.ps1 failed" }
$setup = Join-Path $OutDir "VNOffice-Setup-$Version.exe"
if (-not (Test-Path -LiteralPath $setup)) { throw "Setup.exe not produced: $setup" }

Step "5/6 Publish Setup.exe (older setups move to $Share\cu)"
$old = Join-Path $Share "cu"
New-Item -ItemType Directory -Force $old | Out-Null
Get-ChildItem -LiteralPath $Share -File | Where-Object { $_.Name -like "VNOffice-*" -and $_.Name -ne (Split-Path -Leaf $setup) } |
    ForEach-Object { Move-Item -LiteralPath $_.FullName -Destination $old -Force }
Copy-Item -LiteralPath $setup -Destination $Share -Force
$guide = Join-Path $package "CAI-DAT.txt"
if (Test-Path -LiteralPath $guide) { Copy-Item -LiteralPath $guide -Destination (Join-Path $Share "HUONG-DAN-CAI-DAT.txt") -Force }

Step "6/6 Verify copy"
$localHash = (Get-FileHash -LiteralPath $setup -Algorithm SHA256).Hash
$shareHash = (Get-FileHash -LiteralPath (Join-Path $Share (Split-Path -Leaf $setup)) -Algorithm SHA256).Hash
if ($localHash -ne $shareHash) { throw "Setup.exe on share does not match the local build" }
Step "Released $Version : patch on $Share\updates (channel $Channel), setup $(Split-Path -Leaf $setup) SHA256 $localHash"
