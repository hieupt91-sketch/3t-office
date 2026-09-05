param(
    [int]$ObservationSeconds = 8
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$mainPath = Join-Path $repoRoot "main.py"
$processes = @()

try {
    foreach ($appKind in @("writer", "sheet")) {
        $processes += Start-Process -FilePath "python" `
            -ArgumentList @($mainPath, "--app=$appKind") `
            -WorkingDirectory $repoRoot `
            -WindowStyle Hidden `
            -PassThru
    }

    Start-Sleep -Seconds $ObservationSeconds
    $failed = @($processes | Where-Object { $_.HasExited })
    if ($failed.Count -gt 0) {
        throw "Co tien trinh desktop thoat som: $($failed.Id -join ', ')"
    }

    Write-Host "PASS: VN Writer va VN Sheet dang chay dong thoi trong hai tien trinh pywebview doc lap."
    Write-Host "PID: $($processes.Id -join ', ')"
    Write-Host "Hay xac nhan truc quan ca hai cua so trong thoi gian quan sat."
}
finally {
    foreach ($process in $processes) {
        if (-not $process.HasExited) {
            Stop-Process -Id $process.Id
        }
    }
}
