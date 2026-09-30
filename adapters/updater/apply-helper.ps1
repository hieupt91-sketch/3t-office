# Runs from a staged copy after the 3T Office process exits. Keep this PowerShell 5.1 compatible.
param([Parameter(Mandatory = $true)][string]$Task)

$ErrorActionPreference = "Stop"
$taskData = Get-Content -LiteralPath $Task -Raw -Encoding UTF8 | ConvertFrom-Json
$install = [System.IO.Path]::GetFullPath([string]$taskData.install_dir).TrimEnd('\')
$stage = [System.IO.Path]::GetFullPath([string]$taskData.stage_dir).TrimEnd('\')
$updates = [System.IO.Path]::GetFullPath([string]$taskData.updates_dir).TrimEnd('\')
$healthFile = [string]$taskData.health_file
$backup = Join-Path $updates ("backup-" + [string]$taskData.old_version)
$changedPaths = @()
$applyStarted = $false
$createdBackup = $false
$preservedBackup = $null
$originalExited = $false
$oldRelaunched = $false
foreach ($item in @($taskData.replacements)) { $changedPaths += [string]$item.path }
foreach ($item in @($taskData.removals)) { $changedPaths += [string]$item }
$changedPaths = @($changedPaths | Sort-Object -Unique)

function Resolve-InstallPath([string]$relative) {
    if ([string]::IsNullOrWhiteSpace($relative) -or $relative.Contains('\') -or $relative.Contains(':') -or $relative.StartsWith('/')) {
        throw "Unsafe package path"
    }
    $parts = $relative.Split('/')
    if ($parts.Count -lt 1 -or ($parts | Where-Object { $_ -eq '..' -or $_ -eq '.' -or $_ -eq '' }).Count -gt 0) {
        throw "Unsafe package path"
    }
    $allowed = @('app', 'python', 'icons', 'THIRD-PARTY-NOTICES')
    $rootFile = @('VERSION.txt', 'BUILD-INFO.txt', 'install-pilot.ps1', 'CAI-DAT.txt')
    if (($parts[0] -notin $allowed) -and ($relative -notin $rootFile)) { throw "Path outside managed package roots" }
    if ($relative -eq 'app/vnoffice-config.json') { throw "Refusing to replace user configuration" }
    $target = [System.IO.Path]::GetFullPath((Join-Path $install ($relative.Replace('/', '\'))))
    $prefix = $install + '\'
    if (-not $target.StartsWith($prefix, [System.StringComparison]::OrdinalIgnoreCase)) { throw "Package path escaped install root" }
    return $target
}

function Quote-ProcessArgument([string]$value) {
    if ($value.Length -gt 0 -and $value -notmatch '[\s"]') { return $value }
    $result = '"'
    $slashes = 0
    foreach ($character in $value.ToCharArray()) {
        if ($character -eq '\') { $slashes++; continue }
        if ($character -eq '"') {
            $result += ('\' * (2 * $slashes + 1)) + '"'
            $slashes = 0
            continue
        }
        if ($slashes -gt 0) { $result += '\' * $slashes; $slashes = 0 }
        $result += $character
    }
    if ($slashes -gt 0) { $result += '\' * (2 * $slashes) }
    return $result + '"'
}

function Move-FileAtomically([string]$source, [string]$target) {
    if (Test-Path -LiteralPath $target -PathType Leaf) {
        $swapBackup = $target + '.vno-swap-' + [Guid]::NewGuid().ToString('N')
        [System.IO.File]::Replace($source, $target, $swapBackup, $true)
        [System.IO.File]::Delete($swapBackup)
    } else {
        [System.IO.File]::Move($source, $target)
    }
}

function Get-InstallProcesses {
    $managedExecutables = @(
        [System.IO.Path]::GetFullPath((Join-Path $install 'python\pythonw.exe')),
        [System.IO.Path]::GetFullPath((Join-Path $install 'python\python.exe')),
        [System.IO.Path]::GetFullPath((Join-Path $install 'app\tools\libreoffice\program\soffice.exe')),
        [System.IO.Path]::GetFullPath((Join-Path $install 'app\tools\libreoffice\program\soffice.bin'))
    )
    return @(Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {
        $_.ExecutablePath -and $managedExecutables -contains [System.IO.Path]::GetFullPath([string]$_.ExecutablePath)
    })
}

function Wait-InstallProcesses([int]$seconds) {
    $deadline = [DateTime]::UtcNow.AddSeconds($seconds)
    while ([DateTime]::UtcNow -lt $deadline) {
        if (@(Get-InstallProcesses).Count -eq 0) { return $true }
        Start-Sleep -Milliseconds 500
    }
    return (@(Get-InstallProcesses).Count -eq 0)
}

function Start-VNOffice([bool]$withHealthToken) {
    $arguments = @()
    $arguments += @($taskData.launch_prefix_args | ForEach-Object { [string]$_ })
    $arguments += @($taskData.launch_args | ForEach-Object { [string]$_ })
    if ($withHealthToken) { $arguments += ('--update-health-token=' + [string]$taskData.health_token) }
    $quoted = @($arguments | ForEach-Object { Quote-ProcessArgument $_ }) -join ' '
    $info = New-Object System.Diagnostics.ProcessStartInfo
    $info.FileName = [string]$taskData.launch_executable
    $info.WorkingDirectory = Join-Path $install 'app'
    $info.Arguments = $quoted
    $info.UseShellExecute = $false
    if ($withHealthToken) {
        $info.EnvironmentVariables['VNO_UPDATE_HEALTH_FILE'] = $healthFile
        $info.EnvironmentVariables['VNO_UPDATE_HEALTH_TOKEN'] = [string]$taskData.health_token
    }
    return [System.Diagnostics.Process]::Start($info)
}

function Restore-Backup {
    foreach ($relative in $changedPaths) {
        $target = Resolve-InstallPath $relative
        $backupFile = Join-Path $backup ($relative.Replace('/', '\'))
        if (Test-Path -LiteralPath $backupFile -PathType Leaf) {
            $parent = Split-Path -Parent $target
            New-Item -ItemType Directory -Force -Path $parent | Out-Null
            $restoreTemp = $target + '.vno-restore-tmp'
            [System.IO.File]::Copy($backupFile, $restoreTemp, $true)
            Move-FileAtomically $restoreTemp $target
        } elseif (Test-Path -LiteralPath $target -PathType Leaf) {
            [System.IO.File]::Delete($target)
        }
    }
}

try {
    if (-not (Wait-InstallProcesses 600)) { throw '3T Office is still running; update was not applied.' }
    $originalExited = $true
    if (Test-Path -LiteralPath $backup) {
        $preservedBackup = Join-Path $updates ("backup-" + [string]$taskData.old_version + "-previous-" + [Guid]::NewGuid().ToString('N'))
        Move-Item -LiteralPath $backup -Destination $preservedBackup
    }
    New-Item -ItemType Directory -Force -Path $backup | Out-Null
    $createdBackup = $true

    # Save every affected old file before changing or removing anything.
    foreach ($relative in $changedPaths) {
        $target = Resolve-InstallPath $relative
        if (Test-Path -LiteralPath $target -PathType Leaf) {
            $backupFile = Join-Path $backup ($relative.Replace('/', '\'))
            New-Item -ItemType Directory -Force -Path (Split-Path -Parent $backupFile) | Out-Null
            [System.IO.File]::Copy($target, $backupFile, $false)
        }
    }

    $applyStarted = $true
    foreach ($item in @($taskData.replacements)) {
        $relative = [string]$item.path
        $target = Resolve-InstallPath $relative
        $blob = Join-Path (Join-Path $stage 'blobs') ([string]$item.sha256)
        if (-not (Test-Path -LiteralPath $blob -PathType Leaf)) { throw "Staged blob is missing: $relative" }
        $blobInfo = Get-Item -LiteralPath $blob
        if ($blobInfo.Length -ne [long]$item.size -or (Get-FileHash -LiteralPath $blob -Algorithm SHA256).Hash.ToLowerInvariant() -ne [string]$item.sha256) {
            throw "Staged blob verification failed: $relative"
        }
        $parent = Split-Path -Parent $target
        New-Item -ItemType Directory -Force -Path $parent | Out-Null
        $temp = $target + '.vno-update-tmp'
        [System.IO.File]::Copy($blob, $temp, $true)
        Move-FileAtomically $temp $target
    }
    foreach ($relative in @($taskData.removals)) {
        $target = Resolve-InstallPath ([string]$relative)
        if (Test-Path -LiteralPath $target -PathType Leaf) { [System.IO.File]::Delete($target) }
    }
    $versionFile = Join-Path $install 'VERSION.txt'
    if (-not (Test-Path -LiteralPath $versionFile -PathType Leaf) -or (Get-Content -LiteralPath $versionFile -Raw -Encoding ASCII).Trim() -ne [string]$taskData.new_version) {
        throw 'VERSION.txt does not match the signed release manifest.'
    }

    Remove-Item -LiteralPath $healthFile -Force -ErrorAction SilentlyContinue
    $newProcess = Start-VNOffice $true
    $healthy = $false
    $deadline = [DateTime]::UtcNow.AddSeconds([int]$taskData.health_timeout_seconds)
    while ([DateTime]::UtcNow -lt $deadline) {
        if (Test-Path -LiteralPath $healthFile -PathType Leaf) { $healthy = $true; break }
        try { $newProcess.Refresh(); if ($newProcess.HasExited) { break } } catch { break }
        Start-Sleep -Milliseconds 500
    }
    if ($healthy) {
        Remove-Item -LiteralPath $healthFile -Force -ErrorAction SilentlyContinue
        exit 0
    }

    try { $newProcess.Refresh(); if (-not $newProcess.HasExited) { Stop-Process -Id $newProcess.Id -Force -ErrorAction SilentlyContinue } } catch { }
    if (-not (Wait-InstallProcesses 60)) { throw 'Failed app process did not exit; rollback is waiting for the install to unlock.' }
    Restore-Backup
    $report = @{
        old_version = [string]$taskData.old_version
        new_version = [string]$taskData.new_version
        reason = 'health-marker-missing'
        created_at = [DateTime]::UtcNow.ToString('o')
    } | ConvertTo-Json -Compress
    [System.IO.File]::WriteAllText((Join-Path $updates 'rollback-report.json'), $report, (New-Object System.Text.UTF8Encoding($false)))
    $null = Start-VNOffice $false
    exit 2
} catch {
    $failureMessage = [string]$_.Exception.Message
    try {
        if ($applyStarted -and $createdBackup -and (Test-Path -LiteralPath $backup -PathType Container)) {
            Restore-Backup
            $null = Start-VNOffice $false
            $oldRelaunched = $true
        } elseif ($createdBackup -and (Test-Path -LiteralPath $backup -PathType Container)) {
            Remove-Item -LiteralPath $backup -Recurse -Force
            $null = Start-VNOffice $false
            $oldRelaunched = $true
        }
        if ($preservedBackup -and (Test-Path -LiteralPath $preservedBackup -PathType Container) -and -not (Test-Path -LiteralPath $backup)) {
            Move-Item -LiteralPath $preservedBackup -Destination $backup
        }
    } catch { }
    if ($originalExited -and -not $oldRelaunched) {
        try { $null = Start-VNOffice $false; $oldRelaunched = $true } catch { }
    }
    try {
        $log = Join-Path $updates 'apply-error.txt'
        [System.IO.File]::WriteAllText($log, $failureMessage, (New-Object System.Text.UTF8Encoding($false)))
    } catch { }
    exit 1
}
