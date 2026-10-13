# Dua trang web san pham (server/3t-web) len may chu: sao luu ban dang chay, giai nen TAI CHO de container thay ngay (bind mount theo inode).
# Dung: powershell -File scripts\release\deploy-web-to-vps.ps1 [-Tar E:\VNOffice-dist\web.tar]
param(
    [string]$Tar = "",
    [string]$RemoteApp = "/srv/3t-office-cloud/app",
    [string]$ConfigPath = "C:\Users\3T Computer\.vnoffice-release\deploy-ssh.json"
)
$ErrorActionPreference = "Stop"
$repo = (Resolve-Path (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "..\..")).Path
if (-not $Tar) {
    $Tar = Join-Path ([IO.Path]::GetTempPath()) ("vno-web-" + [Guid]::NewGuid().ToString('N') + ".tar")
    tar -cf $Tar -C (Join-Path $repo "server\3t-web") .
    if ($LASTEXITCODE -ne 0) { throw "tar that bai" }
}
if ($RemoteApp -notmatch '^/[A-Za-z0-9._/-]+$' -or $RemoteApp.Contains('..')) { throw "RemoteApp khong an toan" }
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
    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    & $scp -P $port $Tar ($remote + ':/tmp/vno-web-deploy.tar')
    if ($LASTEXITCODE -ne 0) { throw "scp that bai" }
    $cmd = "set -e; cd '$RemoteApp'; tar -czf 'web.bak-$stamp.tgz' web; " +
           "rm -rf /tmp/vno-web-stage; mkdir -p /tmp/vno-web-stage; tar -xf /tmp/vno-web-deploy.tar -C /tmp/vno-web-stage; " +
           "test -f /tmp/vno-web-stage/index.html; test -f /tmp/vno-web-stage/404.html; " +
           "tar -xf /tmp/vno-web-deploy.tar -C web; rm -rf /tmp/vno-web-stage /tmp/vno-web-deploy.tar; " +
           "ls -la web/index.html web/data/releases.json; echo 'DA GIAI NEN TAI CHO (backup web.bak-$stamp.tgz)'"
    & $ssh -p $port $remote $cmd
    if ($LASTEXITCODE -ne 0) { throw "Trien khai tren may chu that bai" }
} finally {
    $env:VNOFFICE_DEPLOY_PASSWORD = $null; $env:SSH_ASKPASS = $null; $env:SSH_ASKPASS_REQUIRE = $null; $env:DISPLAY = $null
}
