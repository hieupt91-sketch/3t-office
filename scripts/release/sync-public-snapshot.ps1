# Dong bo ban chup SACH (khong kem lich su cu) cua nhanh hien tai len kho GitHub dung chung voi team macOS.
# Dung: powershell -File scripts\release\sync-public-snapshot.ps1 -Dest E:\VNOffice-publish -Message "Dong bo 0.9.10" -Tag v0.9.10
# Token: dat bien moi truong GH_PUSH_TOKEN (khong ghi vao tep, khong luu vao cau hinh git). Khong dat -> chi tao commit cuc bo.
param(
    [string]$Source = "",
    [Parameter(Mandatory = $true)][string]$Dest,
    [Parameter(Mandatory = $true)][string]$Message,
    [string]$Tag = "",
    [string]$Remote = "https://github.com/hieupt91-sketch/3t-office.git",
    [string[]]$Branches = @("main", "platform/macos")
)
$ErrorActionPreference = "Stop"
if (-not $Source) { $Source = (Resolve-Path (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "..\..")).Path }
if (-not (Test-Path (Join-Path $Dest ".git"))) { throw "Dest khong phai kho git: $Dest" }

$stage = Join-Path ([IO.Path]::GetTempPath()) ("vno-snap-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $stage | Out-Null
$zip = "$stage.zip"
git -C $Source archive --format=zip -o $zip HEAD
if ($LASTEXITCODE -ne 0) { throw "git archive that bai" }
Expand-Archive -Path $zip -DestinationPath $stage

# Chi lay tep da theo doi (git archive); loai tep rac sinh ra khi chay thu.
$junkFiles = @(".ch9-*", "clipboard-cdp-*", "clipboard-desktop-*")
robocopy $stage $Dest /MIR /XD ".git" /XF @junkFiles /NFL /NDL /NJH /NJS /NP | Out-Null
if ($LASTEXITCODE -ge 8) { throw "robocopy loi ($LASTEXITCODE)" }

# Quet bi mat co ban truoc khi commit.
git -C $Dest add -A
$hits = git -C $Dest grep --cached -nIE "ghp_[A-Za-z0-9]{30}|github_pat_[A-Za-z0-9_]{30}|AKIA[0-9A-Z]{16}"
if ($hits) { throw "Phat hien chuoi giong token/khoa trong ban chup, dung lai:`n$hits" }

$msgFile = Join-Path $env:TEMP "vno-snap-msg.txt"
[IO.File]::WriteAllText($msgFile, $Message + "`n`nCo-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`nClaude-Session: https://claude.ai/code/session_01GCitafXeWe8jPKCTMAdGZ6", (New-Object Text.UTF8Encoding $false))
git -C $Dest commit -q -F $msgFile
if ($LASTEXITCODE -ne 0) { Write-Host "Khong co thay doi de commit." }
if ($Tag) { git -C $Dest tag -f $Tag }
foreach ($b in $Branches) { if ($b -ne "main") { git -C $Dest branch -f $b main } }

if ($env:GH_PUSH_TOKEN) {
    $u = $Remote -replace "^https://", "https://x-access-token:$($env:GH_PUSH_TOKEN)@"
    $env:GIT_TERMINAL_PROMPT = "0"
    foreach ($b in $Branches) { git -C $Dest -c credential.helper= push $u $b 2>&1 | ForEach-Object { $_.ToString() -replace [regex]::Escape($env:GH_PUSH_TOKEN), "***" } }
    if ($Tag) { git -C $Dest -c credential.helper= push -f $u $Tag 2>&1 | ForEach-Object { $_.ToString() -replace [regex]::Escape($env:GH_PUSH_TOKEN), "***" } }
} else {
    Write-Host "Chua dat GH_PUSH_TOKEN: da commit cuc bo, chua day len GitHub."
}
Write-Host "Xong. Commit: $(git -C $Dest rev-parse --short HEAD)"
