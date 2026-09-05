param(
    [Parameter(Mandatory = $true)]
    [string]$ExecutablePath
)

$ErrorActionPreference = "Stop"
$resolvedExecutable = (Resolve-Path -LiteralPath $ExecutablePath).Path
$classesRoot = "HKCU:\Software\Classes"

$applications = @(
    @{
        ProgId = "VNOffice.Writer.Document"
        Description = "VN Writer Document"
        Extensions = @(".docx", ".doc", ".odt", ".rtf")
    },
    @{
        ProgId = "VNOffice.Sheet.Document"
        Description = "VN Sheet Workbook"
        Extensions = @(".xlsx", ".xls", ".ods", ".csv")
    },
    @{
        ProgId = "VNOffice.Slides.Document"
        Description = "VN Slides Presentation"
        Extensions = @(".pptx", ".ppt", ".odp")
    }
)

foreach ($application in $applications) {
    $progIdPath = Join-Path $classesRoot $application.ProgId
    New-Item -Path $progIdPath -Force | Out-Null
    Set-Item -LiteralPath $progIdPath -Value $application.Description

    $iconPath = Join-Path $progIdPath "DefaultIcon"
    New-Item -Path $iconPath -Force | Out-Null
    Set-Item -LiteralPath $iconPath -Value ('"{0}",0' -f $resolvedExecutable)

    $commandPath = Join-Path $progIdPath "shell\open\command"
    New-Item -Path $commandPath -Force | Out-Null
    Set-Item -LiteralPath $commandPath -Value ('"{0}" "%1"' -f $resolvedExecutable)

    foreach ($extension in $application.Extensions) {
        $extensionPath = Join-Path $classesRoot $extension
        New-Item -Path $extensionPath -Force | Out-Null
        Set-Item -LiteralPath $extensionPath -Value $application.ProgId

        $openWithPath = Join-Path $extensionPath "OpenWithProgids"
        New-Item -Path $openWithPath -Force | Out-Null
        New-ItemProperty -LiteralPath $openWithPath -Name $application.ProgId -PropertyType String -Value "" -Force | Out-Null
    }
}

$extensionCount = ($applications | ForEach-Object { $_.Extensions.Count } | Measure-Object -Sum).Sum
Write-Host "Da dang ky VN Office cho $extensionCount phan mo rong tai HKCU\Software\Classes."
Write-Host "Executable: $resolvedExecutable"
Write-Host "Windows co the yeu cau nguoi dung xac nhan Default Apps neu phan mo rong da co UserChoice."
