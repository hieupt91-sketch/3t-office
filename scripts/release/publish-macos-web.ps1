# Phat hanh bo cai macOS cho web noi bo: tinh SHA-256, goi upload va cap nhat server/3t-web/data/release-macos.json
# Quy uoc dat ten tep bo cai: 3T-Office-<ver>-<arch>[-unsigned][-final][-vN].pkg (hoac VNOffice-macOS-... .dmg)
# Vi du mau: 3T-Office-0.9.11-arm64-unsigned-final-v2.pkg
# Dung:
#   powershell -File scripts\release\publish-macos-web.ps1 -Installer E:\VNOffice-dist\3T-Office-0.9.11-arm64-unsigned-final-v2.pkg -WhatIf
#   powershell -File scripts\release\publish-macos-web.ps1 -Installer E:\VNOffice-dist\3T-Office-0.9.11-arm64-unsigned-final-v2.pkg
param(
    [Parameter(Mandatory = $true)][string]$Installer,
    [string]$WebDataDir = "",
    [string]$RemoteDir = "/srv/3t-office-cloud/app/downloads",
    [string]$ConfigPath = "C:\Users\3T Computer\.vnoffice-release\deploy-ssh.json",
    [switch]$WhatIf
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $Installer -PathType Leaf)) {
    throw "Khong tim thay tep bo cai macOS: $Installer"
}

$fileName = Split-Path -Leaf $Installer
if ($fileName -notmatch '^(?:3T-Office|VNOffice-macOS)-([0-9]+\.[0-9]+\.[0-9]+(?:-(?:rc|beta|alpha|preview)\.?[0-9]*)?)-([A-Za-z0-9]+)(?:-(?:unsigned|signed))?(?:-(?:final))?(?:-(?:v[0-9]+))?\.(pkg|dmg)$') {
    throw "Ten tep bo cai macOS khong dung quy uoc 3T-Office-<ver>-<arch>[-unsigned][-final][-vN].pkg (vi du: 3T-Office-0.9.11-arm64-unsigned-final-v2.pkg): $fileName"
}

$version = $Matches[1]
$rawArch = $Matches[2].ToLower()
$ext = $Matches[3].ToLower()
$arch = switch -Regex ($rawArch) {
    '^(arm64|aarch64|apple-silicon)$' { "Apple Silicon (arm64)" }
    '^(x64|x86_64|intel)$'          { "Intel" }
    '^(universal|all)$'              { "Apple Silicon / Intel (Universal)" }
    default                          { $rawArch }
}

$hashResult = Get-FileHash -LiteralPath $Installer -Algorithm SHA256
$sha256 = $hashResult.Hash.ToUpper()

$item = Get-Item -LiteralPath $Installer
$fileSizeBytes = $item.Length
$sizeFormatted = [string]([Math]::Round($fileSizeBytes / 1MB, 0)) + " MB"

Write-Host "=== THONG TIN BO CAI MACOS ==="
Write-Host "Tep nguon  : $Installer"
Write-Host "Ten tep    : $fileName"
Write-Host "Phien ban  : $version"
Write-Host "Kien truc  : $arch"
Write-Host "Dinh dang  : .$ext"
Write-Host "Dung luong : $sizeFormatted ($fileSizeBytes bytes)"
Write-Host "SHA-256    : $sha256"

# Tai su dung script upload-installer-to-vps.ps1, khong copy-paste
$uploadScript = Join-Path $PSScriptRoot "upload-installer-to-vps.ps1"
if (-not (Test-Path -LiteralPath $uploadScript -PathType Leaf)) {
    throw "Khong tim thay script upload: $uploadScript"
}

if ($WhatIf) {
    Write-Host "`n[WhatIf] Goi script upload o che do WhatIf..."
    & $uploadScript -Installer $Installer -RemoteDir $RemoteDir -WhatIf
} else {
    Write-Host "`nDang tai len may chu..."
    & $uploadScript -Installer $Installer -RemoteDir $RemoteDir -ConfigPath $ConfigPath
    if ($LASTEXITCODE -ne 0) {
        throw "Tai len may chu that bai"
    }
}

# Xac dinh duong dan file release-macos.json
if (-not $WebDataDir) {
    $repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
    $releaseJsonPath = Join-Path $repoRoot "server\3t-web\data\release-macos.json"
} else {
    $releaseJsonPath = Join-Path $WebDataDir "release-macos.json"
}

$releaseData = [ordered]@{
    product         = "3T Office"
    version         = $version
    channel         = "pilot"
    file_name       = $fileName
    size            = $sizeFormatted
    file_size_bytes = $fileSizeBytes
    sha256          = $sha256
    min_os          = "macOS 12 Monterey trở lên"
    arch            = $arch
    released_at     = (Get-Date -Format "yyyy-MM-dd")
    install_note    = "Chưa ký: tải về, chuột phải vào tệp .pkg > Mở > Mở; hoặc System Settings > Privacy & Security > Open Anyway"
    status          = "ready"
}

$jsonContent = ConvertTo-Json -InputObject $releaseData -Depth 4

if ($WhatIf) {
    Write-Host "`n[WhatIf] Se cap nhat release-macos.json tai: $releaseJsonPath"
    Write-Host "[WhatIf] Noi dung JSON se ghi:"
    Write-Host $jsonContent
    Write-Host "`n[WhatIf] HOAN THANH: Chi in viec se lam, khong dung may chu va khong thay doi tep that."
} else {
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [IO.File]::WriteAllText($releaseJsonPath, $jsonContent, $utf8NoBom)
    Write-Host "`nDa cap nhat thanh cong: $releaseJsonPath"
}
