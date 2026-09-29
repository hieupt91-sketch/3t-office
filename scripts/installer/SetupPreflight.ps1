param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("Check", "InspectRunning", "CloseRunning", "Unblock")]
    [string]$Mode,
    [Parameter(Mandatory = $true)]
    [string]$InstallDir,
    [long]$RequiredBytes = 0
)

$ErrorActionPreference = "Stop"

function Get-InstalledProcesses {
    $root = [System.IO.Path]::GetFullPath($InstallDir).TrimEnd('\') + '\'
    foreach ($entry in Get-CimInstance -ClassName Win32_Process) {
        $path = $entry.ExecutablePath
        if ($path -and $path.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase)) {
            try {
                [System.Diagnostics.Process]::GetProcessById([int]$entry.ProcessId)
            } catch {
                # The process may exit after WMI reports it and before it is opened.
            }
        }
    }
}

function Test-WebView2Runtime {
    $clientId = '{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}'
    foreach ($hive in @([Microsoft.Win32.RegistryHive]::LocalMachine, [Microsoft.Win32.RegistryHive]::CurrentUser)) {
        foreach ($view in @([Microsoft.Win32.RegistryView]::Registry64, [Microsoft.Win32.RegistryView]::Registry32)) {
            $base = $null
            $key = $null
            try {
                $base = [Microsoft.Win32.RegistryKey]::OpenBaseKey($hive, $view)
                $key = $base.OpenSubKey("SOFTWARE\Microsoft\EdgeUpdate\Clients\$clientId")
                if ($key -and $key.GetValue('pv')) { return $true }
            } finally {
                if ($key) { $key.Dispose() }
                if ($base) { $base.Dispose() }
            }
        }
    }
    return $false
}

try {
    switch ($Mode) {
        'Check' {
            if (-not [Environment]::Is64BitOperatingSystem) { exit 10 }
            $base = [Microsoft.Win32.RegistryKey]::OpenBaseKey(
                [Microsoft.Win32.RegistryHive]::LocalMachine,
                [Microsoft.Win32.RegistryView]::Registry64)
            try {
                $key = $base.OpenSubKey('SOFTWARE\Microsoft\Windows NT\CurrentVersion')
                if (-not $key -or [int]$key.GetValue('CurrentMajorVersionNumber', 0) -lt 10) { exit 10 }
            } finally {
                if ($key) { $key.Dispose() }
                $base.Dispose()
            }
            if (-not (Test-WebView2Runtime)) { exit 11 }
            $driveRoot = [System.IO.Path]::GetPathRoot([System.IO.Path]::GetFullPath($InstallDir))
            $drive = New-Object System.IO.DriveInfo($driveRoot)
            if ($drive.AvailableFreeSpace -lt $RequiredBytes) { exit 12 }
            exit 0
        }
        'InspectRunning' {
            $processes = @(Get-InstalledProcesses)
            if ($processes.Count -gt 0) { exit 20 }
            exit 0
        }
        'CloseRunning' {
            $deadline = [DateTime]::UtcNow.AddSeconds(120)
            $requested = @{}
            while ([DateTime]::UtcNow -lt $deadline) {
                $processes = @(Get-InstalledProcesses)
                if ($processes.Count -eq 0) { exit 0 }
                foreach ($process in $processes) {
                    try {
                        if (-not $requested.ContainsKey($process.Id)) {
                            [void]$process.CloseMainWindow()
                            $requested[$process.Id] = $true
                        }
                    } catch { }
                    $process.Dispose()
                }
                Start-Sleep -Milliseconds 500
            }
            exit 21
        }
        'Unblock' {
            Get-ChildItem -LiteralPath $InstallDir -File -Force -Recurse | Unblock-File -ErrorAction Stop
            exit 0
        }
    }
} catch {
    exit 13
}

exit 13
