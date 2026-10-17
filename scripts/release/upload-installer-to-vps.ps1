# Tai bo cai len thu muc downloads cua may chu va kiem tra SHA-256 (dung cung co che dang nhap voi sync-updates-to-vps.ps1).
# Ho tro .exe, .msi, .zip, .tar.gz, .dmg, .pkg.
# Dung: powershell -File scripts\release\upload-installer-to-vps.ps1 -Installer E:\VNOffice-dist\VNOffice-Setup-0.9.11.exe [-WhatIf]
param(
    [Parameter(Mandatory = $true)][string]$Installer,
    [string]$RemoteDir = "/srv/3t-office-cloud/app/downloads",
    [string]$ConfigPath = "C:\Users\3T Computer\.vnoffice-release\deploy-ssh.json",
    [switch]$WhatIf
)
$ErrorActionPreference = "Stop"
if (-not (Test-Path -LiteralPath $Installer -PathType Leaf)) { throw "Khong thay bo cai: $Installer" }
if ($RemoteDir -notmatch '^/[A-Za-z0-9._/-]+$' -or $RemoteDir.Contains('..')) { throw "RemoteDir khong an toan" }

$name = Split-Path -Leaf $Installer
if ($name -notmatch '^[A-Za-z0-9_.-]+\.(?:exe|msi|zip|tar\.gz|dmg|pkg)$') {
    throw "Dinh dang tep bo cai khong hop le hoac khong duoc ho tro: $name"
}

$localHash = (Get-FileHash -LiteralPath $Installer -Algorithm SHA256).Hash.ToLower()

if ($WhatIf) {
    Write-Host "[WhatIf] Bo cai hop le: $Installer"
    Write-Host "[WhatIf] SHA256 local  : $localHash"
    Write-Host "[WhatIf] Se scp len    : $RemoteDir/$name.part"
    Write-Host "[WhatIf] Se kiem tra   : sha256sum '$RemoteDir/$name.part' tren may chu"
    Write-Host "[WhatIf] Se doi ten    : $name.part -> $name va xac minh"
    return
}

$deploy = Get-Content -LiteralPath $ConfigPath -Raw | ConvertFrom-Json
$hostName = [string]$deploy.host; $userName = [string]$deploy.user; $port = [int]$deploy.port
if ($hostName -notmatch '^[A-Za-z0-9.-]+$' -or $userName -notmatch '^[A-Za-z0-9._-]+$') { throw "Cau hinh SSH khong hop le" }
$remote = "$userName@$hostName"
$ssh = (Get-Command ssh.exe -ErrorAction Stop).Source
$scp = (Get-Command scp.exe -ErrorAction Stop).Source

$askpassRoot = Join-Path ([IO.Path]::GetTempPath()) ("vnoffice-askpass-" + [Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $askpassRoot | Out-Null
$askpass = Join-Path $askpassRoot "askpass.exe"
Add-Type -TypeDefinition 'using System; public static class AskPass { public static void Main() { Console.Write(Environment.GetEnvironmentVariable("VNOFFICE_DEPLOY_PASSWORD")); } }' -Language CSharp -OutputAssembly $askpass -OutputType ConsoleApplication
$env:VNOFFICE_DEPLOY_PASSWORD = [string]$deploy.password
$env:SSH_ASKPASS = $askpass; $env:SSH_ASKPASS_REQUIRE = "force"; $env:DISPLAY = "vnoffice-askpass"
$deploy = $null
try {
    Write-Host "SHA256 local : $localHash"
    & $scp -P $port $Installer ($remote + ':' + $RemoteDir + '/' + $name + '.part')
    if ($LASTEXITCODE -ne 0) { throw "scp that bai" }
    $remoteHash = (& $ssh -p $port $remote ("sha256sum '" + $RemoteDir + "/" + $name + ".part'")) -split '\s+' | Select-Object -First 1
    Write-Host "SHA256 remote: $remoteHash"
    if ($remoteHash -ne $localHash) { throw "SHA-256 khong khop, khong cong bo" }
    & $ssh -p $port $remote ("mv -f '" + $RemoteDir + "/" + $name + ".part' '" + $RemoteDir + "/" + $name + "' && ls -la '" + $RemoteDir + "/" + $name + "'")
    Write-Host "Da tai len va xac minh: $name"
} finally {
    $env:VNOFFICE_DEPLOY_PASSWORD = $null; $env:SSH_ASKPASS = $null; $env:SSH_ASKPASS_REQUIRE = $null; $env:DISPLAY = $null
}
