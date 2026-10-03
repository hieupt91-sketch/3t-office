# Sync the signed update repository to the VPS. This script is never run by the app.
# Blob content is copied first and channel pointers last so clients never see a partial release.
# ASCII only: Windows PowerShell 5.1 reads BOM-less scripts in the ANSI code page.
param(
    [string]$Source = "\\192.168.1.252\company1\Software\VNOffice\updates",
    [string]$ConfigPath = "C:\Users\3T Computer\.vnoffice-release\deploy-ssh.json",
    [string]$RemotePath = "/srv/3t-office-cloud/updates",
    [int]$SampleCount = 3
)

$ErrorActionPreference = "Stop"
function Step([string]$Text) { Write-Host ("[{0}] {1}" -f (Get-Date).ToString("HH:mm:ss"), $Text) }

if (-not (Test-Path -LiteralPath $Source -PathType Container)) { throw "Update source not found: $Source" }
if (-not (Test-Path -LiteralPath $ConfigPath -PathType Leaf)) { throw "SSH config not found: $ConfigPath" }
if ($RemotePath -notmatch '^/[A-Za-z0-9._/-]+$' -or $RemotePath.Contains('..')) { throw "RemotePath is not safe" }
if ($SampleCount -lt 1 -or $SampleCount -gt 20) { throw "SampleCount must be between 1 and 20" }

$deploy = Get-Content -LiteralPath $ConfigPath -Raw | ConvertFrom-Json
$hostName = [string]$deploy.host
$userName = [string]$deploy.user
$port = [int]$deploy.port
if ($hostName -notmatch '^[A-Za-z0-9.-]+$') { throw "Invalid SSH host" }
if ($userName -notmatch '^[A-Za-z0-9._-]+$') { throw "Invalid SSH user" }
if ($port -lt 1 -or $port -gt 65535) { throw "Invalid SSH port" }
$remote = $userName + '@' + $hostName

$ssh = (Get-Command ssh.exe -ErrorAction Stop).Source
$scp = (Get-Command scp.exe -ErrorAction Stop).Source
$rsyncCommand = Get-Command rsync -ErrorAction SilentlyContinue
$rsync = if ($rsyncCommand) { $rsyncCommand.Source } else { $null }
$askpassRoot = $null
$oldAskpass = $env:SSH_ASKPASS
$oldAskpassRequire = $env:SSH_ASKPASS_REQUIRE
$oldDisplay = $env:DISPLAY
$oldDeployPassword = $env:VNOFFICE_DEPLOY_PASSWORD

try {
    $password = [string]$deploy.password
    if ($password) {
        $askpassRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("vnoffice-askpass-" + [Guid]::NewGuid().ToString('N'))
        New-Item -ItemType Directory -Path $askpassRoot | Out-Null
        $askpass = Join-Path $askpassRoot "askpass.exe"
        $askpassSource = 'using System; public static class AskPass { public static void Main() { Console.Write(Environment.GetEnvironmentVariable("VNOFFICE_DEPLOY_PASSWORD")); } }'
        Add-Type -TypeDefinition $askpassSource -Language CSharp -OutputAssembly $askpass -OutputType ConsoleApplication
        $env:VNOFFICE_DEPLOY_PASSWORD = $password
        $env:SSH_ASKPASS = $askpass
        $env:SSH_ASKPASS_REQUIRE = "force"
        $env:DISPLAY = "vnoffice-askpass"
    }
    $password = $null
    $deploy = $null

    $sshArgs = @('-p', [string]$port)
    if (-not $env:VNOFFICE_DEPLOY_PASSWORD) { $sshArgs += @('-o', 'BatchMode=yes') }
    $sshArgs += @($remote)

    Step "Prepare remote update directory"
    & $ssh @sshArgs ("mkdir -p '" + $RemotePath + "/files' '" + $RemotePath + "/channels'")
    if ($LASTEXITCODE -ne 0) { throw "Could not prepare remote update directory" }

    if ($rsync) {
        $transport = 'ssh -p ' + $port
        Step "Copy content-addressed blobs with rsync"
        & $rsync '-az' '--partial' '-e' $transport ((Join-Path $Source 'files') + [IO.Path]::DirectorySeparatorChar) ($remote + ':' + $RemotePath + '/files/')
        if ($LASTEXITCODE -ne 0) { throw "rsync blob phase failed" }
        Step "Copy signed version metadata with rsync"
        Get-ChildItem -LiteralPath $Source -Directory | Where-Object { $_.Name -notin @('files', 'channels') } | ForEach-Object {
            & $rsync '-az' '--partial' '-e' $transport ($_.FullName + [IO.Path]::DirectorySeparatorChar) ($remote + ':' + $RemotePath + '/' + $_.Name + '/')
            if ($LASTEXITCODE -ne 0) { throw "rsync version phase failed" }
        }
        Step "Publish channel pointers last with rsync"
        & $rsync '-az' '--delay-updates' '-e' $transport ((Join-Path $Source 'channels') + [IO.Path]::DirectorySeparatorChar) ($remote + ':' + $RemotePath + '/channels/')
        if ($LASTEXITCODE -ne 0) { throw "rsync channel phase failed" }
    } else {
        $scpArgs = @('-P', [string]$port, '-r')
        if (-not $env:VNOFFICE_DEPLOY_PASSWORD) { $scpArgs += @('-o', 'BatchMode=yes') }
        Step "Copy content-addressed blobs with scp (rsync unavailable)"
        & $scp @scpArgs (Join-Path $Source 'files') ($remote + ':' + $RemotePath + '/')
        if ($LASTEXITCODE -ne 0) { throw "scp blob phase failed" }
        Step "Copy signed version metadata with scp"
        Get-ChildItem -LiteralPath $Source -Directory | Where-Object { $_.Name -notin @('files', 'channels') } | ForEach-Object {
            & $scp @scpArgs $_.FullName ($remote + ':' + $RemotePath + '/')
            if ($LASTEXITCODE -ne 0) { throw "scp version phase failed" }
        }
        Step "Publish channel pointers last with scp"
        & $scp @scpArgs (Join-Path $Source 'channels') ($remote + ':' + $RemotePath + '/')
        if ($LASTEXITCODE -ne 0) { throw "scp channel phase failed" }
    }

    $localCount = @(Get-ChildItem -LiteralPath $Source -Recurse -File).Count
    $remoteCountText = & $ssh @sshArgs ("find '" + $RemotePath + "' -type f | wc -l")
    if ($LASTEXITCODE -ne 0) { throw "Could not count remote files" }
    $remoteCount = 0
    if (-not [int]::TryParse(([string]$remoteCountText).Trim(), [ref]$remoteCount)) { throw "Remote file count is invalid" }
    if ($remoteCount -lt $localCount) { throw "Remote file count $remoteCount is smaller than local count $localCount" }
    Step "File count verified: local=$localCount remote=$remoteCount"

    $samples = @(Get-ChildItem -LiteralPath (Join-Path $Source 'files') -File | Sort-Object Name | Select-Object -First $SampleCount)
    if ($samples.Count -lt 1) { throw "No update blob available for SHA-256 verification" }
    foreach ($sample in $samples) {
        if ($sample.Name -notmatch '^[0-9a-f]{64}$') { throw "Invalid blob name in source: $($sample.Name)" }
        $localHash = (Get-FileHash -LiteralPath $sample.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
        $remoteHashLine = & $ssh @sshArgs ("sha256sum '" + $RemotePath + "/files/" + $sample.Name + "'")
        if ($LASTEXITCODE -ne 0) { throw "Remote SHA-256 command failed for a sampled blob" }
        $remoteHash = (([string]$remoteHashLine).Trim() -split '\s+')[0].ToLowerInvariant()
        if ($localHash -ne $remoteHash -or $remoteHash -ne $sample.Name) { throw "Sampled blob SHA-256 mismatch: $($sample.Name)" }
    }
    Step "Verified SHA-256 for $($samples.Count) sampled blob(s)"
    Step "Update repository sync completed; channel pointers were published last"
} finally {
    $env:SSH_ASKPASS = $oldAskpass
    $env:SSH_ASKPASS_REQUIRE = $oldAskpassRequire
    $env:DISPLAY = $oldDisplay
    $env:VNOFFICE_DEPLOY_PASSWORD = $oldDeployPassword
    if ($askpassRoot) {
        $resolvedTemp = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath()).TrimEnd('\') + '\'
        $resolvedAskpass = [System.IO.Path]::GetFullPath($askpassRoot)
        if ($resolvedAskpass.StartsWith($resolvedTemp, [System.StringComparison]::OrdinalIgnoreCase) -and (Split-Path -Leaf $resolvedAskpass) -like 'vnoffice-askpass-*') {
            Remove-Item -LiteralPath $resolvedAskpass -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
}
