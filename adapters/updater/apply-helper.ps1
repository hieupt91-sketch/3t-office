# Runs from a staged copy after the 3T Office process exits. Keep this PowerShell 5.1 compatible.
param([Parameter(Mandatory = $true)][string]$Task)

$ErrorActionPreference = "Stop"
$script:LogFile = Join-Path (Join-Path $env:LOCALAPPDATA 'VNOffice') 'updates\update-log.txt'
function Write-UpdateLog([string]$message) {
    try {
        $parent = Split-Path -Parent $script:LogFile
        New-Item -ItemType Directory -Force -Path $parent | Out-Null
        $line = ('{0} {1}{2}' -f [DateTime]::UtcNow.ToString('o'), $message, [Environment]::NewLine)
        [System.IO.File]::AppendAllText($script:LogFile, $line, (New-Object System.Text.UTF8Encoding($false)))
    } catch { }
}
Write-UpdateLog 'STEP helper-started'
Write-UpdateLog ('STEP task-read path="{0}"' -f $Task)
try {
    $taskData = Get-Content -LiteralPath $Task -Raw -Encoding UTF8 | ConvertFrom-Json
    $install = [System.IO.Path]::GetFullPath([string]$taskData.install_dir).TrimEnd('\')
    $stage = [System.IO.Path]::GetFullPath([string]$taskData.stage_dir).TrimEnd('\')
    $updates = [System.IO.Path]::GetFullPath([string]$taskData.updates_dir).TrimEnd('\')
    $script:LogFile = if ($taskData.log_file) { [System.IO.Path]::GetFullPath([string]$taskData.log_file) } else { Join-Path $updates 'update-log.txt' }
} catch {
    Write-UpdateLog ('STEP task-read-failed message="{0}"' -f $_.Exception.Message)
    exit 1
}
Write-UpdateLog ('STEP task-loaded install="{0}" stage="{1}" old={2} new={3}' -f $install, $stage, $taskData.old_version, $taskData.new_version)
$healthFile = [string]$taskData.health_file
$backup = Join-Path $updates ("backup-" + [string]$taskData.old_version)
$appKind = [string]$taskData.launch_app
$sofficeProfile = [System.IO.Path]::GetFullPath((Join-Path (Split-Path -Parent $updates) ("lo-profile-" + $appKind))).TrimEnd('\')
$sofficeWorkerScript = [System.IO.Path]::GetFullPath((Join-Path $install 'app\adapters\libreoffice\common\soffice_uno_worker.py'))
Write-UpdateLog ('STEP soffice-ownership-profile path="{0}" app={1}' -f $sofficeProfile, $appKind)
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

function Normalize-ProcessPath([string]$path) {
    $full = [System.IO.Path]::GetFullPath($path)
    try {
        $buffer = New-Object System.Text.StringBuilder 32768
        $length = [VnoUpdatePathApi]::GetLongPathName($full, $buffer, [uint32]$buffer.Capacity)
        if ($length -gt 0 -and $length -lt $buffer.Capacity) { $full = $buffer.ToString() }
    } catch { }
    return $full.TrimEnd('\')
}

function Uses-InstallSofficeProfile([string]$commandLine) {
    if ([string]::IsNullOrWhiteSpace($commandLine)) { return $false }
    $decoded = [Uri]::UnescapeDataString($commandLine).Replace('/', '\')
    return $decoded.IndexOf($sofficeProfile, [StringComparison]::OrdinalIgnoreCase) -ge 0
}

function Get-InstallProcesses {
    $appExecutables = @(
        (Normalize-ProcessPath (Join-Path $install 'python\pythonw.exe')),
        (Normalize-ProcessPath (Join-Path $install 'python\python.exe'))
    )
    $sofficeExecutables = @(
        (Normalize-ProcessPath (Join-Path $install 'app\tools\libreoffice\program\soffice.exe')),
        (Normalize-ProcessPath (Join-Path $install 'app\tools\libreoffice\program\soffice.bin'))
    )
    $found = @()
    foreach ($process in @(Get-CimInstance Win32_Process -ErrorAction Stop)) {
        if (-not $process.ExecutablePath) { continue }
        $executable = Normalize-ProcessPath ([string]$process.ExecutablePath)
        $commandLine = [string]$process.CommandLine
        $usesOwnedProfile = Uses-InstallSofficeProfile $commandLine
        if ($appExecutables -contains $executable) {
            $found += [pscustomobject]@{ ProcessId = [int]$process.ProcessId; ExecutablePath = $executable; Role = 'app' }
        } elseif (($sofficeExecutables -contains $executable) -or ($usesOwnedProfile -and [System.IO.Path]::GetFileName($executable) -match '^soffice(\.bin)?(\.exe)?$')) {
            $found += [pscustomobject]@{ ProcessId = [int]$process.ProcessId; ExecutablePath = $executable; Role = 'soffice' }
        } elseif ($usesOwnedProfile -and $commandLine.IndexOf('soffice_uno_worker.py', [StringComparison]::OrdinalIgnoreCase) -ge 0) {
            $found += [pscustomobject]@{ ProcessId = [int]$process.ProcessId; ExecutablePath = $executable; Role = 'soffice-worker' }
        }
    }
    return $found
}

function Stop-InstallSofficeProcesses {
    $owned = @(Get-InstallProcesses | Where-Object { $_.Role -in @('soffice', 'soffice-worker') })
    foreach ($process in $owned) {
        Write-UpdateLog ('STEP stop-owned-soffice pid={0} role={1} path="{2}"' -f $process.ProcessId, $process.Role, $process.ExecutablePath)
        Stop-Process -Id $process.ProcessId -Force -ErrorAction SilentlyContinue
    }
}

function Wait-InstallProcesses([int]$seconds, [bool]$stopOwnedSofficeOnTimeout = $false) {
    $deadline = [DateTime]::UtcNow.AddSeconds($seconds)
    $lastCount = -1
    while ([DateTime]::UtcNow -lt $deadline) {
        $processes = @(Get-InstallProcesses)
        if ($processes.Count -eq 0) { return $true }
        if ($processes.Count -ne $lastCount) {
            Write-UpdateLog ('STEP waiting-for-install-processes count={0} pids={1}' -f $processes.Count, (($processes | ForEach-Object { '{0}:{1}' -f $_.ProcessId, $_.Role }) -join ','))
            $lastCount = $processes.Count
        }
        Start-Sleep -Milliseconds 500
    }
    $processes = @(Get-InstallProcesses)
    if ($processes.Count -eq 0) { return $true }
    Write-UpdateLog ('STEP process-wait-timeout count={0} pids={1}' -f $processes.Count, (($processes | ForEach-Object { '{0}:{1}' -f $_.ProcessId, $_.Role }) -join ','))
    if (-not $stopOwnedSofficeOnTimeout) { return $false }
    Stop-InstallSofficeProcesses
    $sofficeDeadline = [DateTime]::UtcNow.AddSeconds([int]$taskData.soffice_exit_wait_seconds)
    while ([DateTime]::UtcNow -lt $sofficeDeadline) {
        if (@(Get-InstallProcesses).Count -eq 0) { return $true }
        Start-Sleep -Milliseconds 500
    }
    return (@(Get-InstallProcesses).Count -eq 0)
}

function Start-VNOffice([bool]$withHealthToken) {
    $arguments = @()
    $arguments += @($taskData.launch_prefix_args | ForEach-Object { [string]$_ })
    $arguments += @($taskData.launch_args | ForEach-Object { [string]$_ })
    $arguments += @($taskData.restore_documents | ForEach-Object { '--restore-document=' + [string]$_ })
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
    Write-UpdateLog ('STEP relaunch-start version={0} health={1} documents={2}' -f $(if ($withHealthToken) { $taskData.new_version } else { $taskData.old_version }), $withHealthToken, @($taskData.restore_documents).Count)
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
    Add-Type -TypeDefinition @"
using System.Runtime.InteropServices;
using System.Text;
public static class VnoUpdatePathApi {
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    public static extern uint GetLongPathName(string shortPath, StringBuilder longPath, uint bufferLength);
}
"@ -ErrorAction Stop
    Write-UpdateLog 'STEP process-path-normalizer-ready'
    Remove-Item -LiteralPath (Join-Path $updates 'update-failure.json') -Force -ErrorAction SilentlyContinue
    Write-UpdateLog 'STEP wait-for-old-app-start'
    $processWait = if ($taskData.process_wait_seconds) { [int]$taskData.process_wait_seconds } else { 45 }
    if (-not (Wait-InstallProcesses $processWait $true)) { throw 'Không thể đóng hoàn toàn 3T Office và LibreOffice trong thời gian chờ; bản cập nhật chưa được áp dụng.' }
    $originalExited = $true
    Write-UpdateLog 'STEP old-app-exited'
    if (Test-Path -LiteralPath $backup) {
        $preservedBackup = Join-Path $updates ("backup-" + [string]$taskData.old_version + "-previous-" + [Guid]::NewGuid().ToString('N'))
        Move-Item -LiteralPath $backup -Destination $preservedBackup
    }
    New-Item -ItemType Directory -Force -Path $backup | Out-Null
    $createdBackup = $true
    Write-UpdateLog ('STEP backup-created path="{0}" files={1}' -f $backup, $changedPaths.Count)

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
        Write-UpdateLog ('STEP apply-file path="{0}"' -f $relative)
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
        Write-UpdateLog ('STEP remove-file path="{0}"' -f $relative)
        $target = Resolve-InstallPath ([string]$relative)
        if (Test-Path -LiteralPath $target -PathType Leaf) { [System.IO.File]::Delete($target) }
    }
    $versionFile = Join-Path $install 'VERSION.txt'
    if (-not (Test-Path -LiteralPath $versionFile -PathType Leaf) -or (Get-Content -LiteralPath $versionFile -Raw -Encoding ASCII).Trim() -ne [string]$taskData.new_version) {
        throw 'VERSION.txt does not match the signed release manifest.'
    }
    Write-UpdateLog ('STEP version-verified version={0}' -f $taskData.new_version)

    Remove-Item -LiteralPath $healthFile -Force -ErrorAction SilentlyContinue
    Write-UpdateLog ('STEP health-check-start timeout={0}' -f $taskData.health_timeout_seconds)
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
        Write-UpdateLog ('STEP health-check-passed version={0}' -f $taskData.new_version)
        Write-UpdateLog 'STEP helper-exit code=0'
        exit 0
    }

    Write-UpdateLog ('STEP health-check-failed version={0}; stopping launched app' -f $taskData.new_version)
    try { $newProcess.Refresh(); if (-not $newProcess.HasExited) { Stop-Process -Id $newProcess.Id -Force -ErrorAction SilentlyContinue } } catch { }
    if (-not (Wait-InstallProcesses 20 $true)) { throw 'Không thể đóng phiên bản mới để quay lại phiên bản trước.' }
    Write-UpdateLog 'STEP rollback-start reason=health-marker-missing'
    Restore-Backup
    $report = @{
        old_version = [string]$taskData.old_version
        new_version = [string]$taskData.new_version
        reason = 'health-marker-missing'
        created_at = [DateTime]::UtcNow.ToString('o')
    } | ConvertTo-Json -Compress
    [System.IO.File]::WriteAllText((Join-Path $updates 'rollback-report.json'), $report, (New-Object System.Text.UTF8Encoding($false)))
    $failure = @{ message = 'Bản cập nhật chưa khởi động thành công. 3T Office đã khôi phục phiên bản trước.'; created_at = [DateTime]::UtcNow.ToString('o') } | ConvertTo-Json -Compress
    [System.IO.File]::WriteAllText((Join-Path $updates 'update-failure.json'), $failure, (New-Object System.Text.UTF8Encoding($false)))
    Write-UpdateLog ('STEP rollback-complete restored-version={0}' -f $taskData.old_version)
    $null = Start-VNOffice $false
    Write-UpdateLog 'STEP helper-exit code=2'
    exit 2
} catch {
    $failureMessage = [string]$_.Exception.Message
    Write-UpdateLog ('STEP failed message="{0}"' -f $failureMessage.Replace('"', "'"))
    try {
        if ($applyStarted -and $createdBackup -and (Test-Path -LiteralPath $backup -PathType Container)) {
            Write-UpdateLog 'STEP restoring-backup-after-error'
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
    } catch { Write-UpdateLog ('STEP rollback-error message="{0}"' -f ([string]$_.Exception.Message).Replace('"', "'")) }
    if ($originalExited -and -not $oldRelaunched) {
        try { $null = Start-VNOffice $false; $oldRelaunched = $true } catch { Write-UpdateLog ('STEP old-version-relaunch-failed message="{0}"' -f $_.Exception.Message) }
    }
    try {
        $log = Join-Path $updates 'apply-error.txt'
        [System.IO.File]::WriteAllText($log, $failureMessage, (New-Object System.Text.UTF8Encoding($false)))
    } catch { }
    try {
        $failure = @{ message = 'Không thể áp dụng bản cập nhật. 3T Office đang mở lại phiên bản trước.'; created_at = [DateTime]::UtcNow.ToString('o') } | ConvertTo-Json -Compress
        [System.IO.File]::WriteAllText((Join-Path $updates 'update-failure.json'), $failure, (New-Object System.Text.UTF8Encoding($false)))
    } catch { }
    Write-UpdateLog ('STEP helper-exit code=1 old-relaunched={0}' -f $oldRelaunched)
    exit 1
}
