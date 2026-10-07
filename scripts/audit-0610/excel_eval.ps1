param(
    [Parameter(Mandatory = $true)]
    [string]$InputPath,

    [Parameter(Mandatory = $true)]
    [string]$OutputPath
)

$ErrorActionPreference = "Stop"

function Write-AuditTrace {
    param([string]$Message)
    Add-Content -LiteralPath ($OutputPath + ".log") -Value ((Get-Date -Format o) + " " + $Message) -Encoding UTF8
}

Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class VnoExcelWindowProcess {
    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
}
"@

function Release-ComObjectSafely {
    param([object]$ComObject)
    if ($null -ne $ComObject -and [Runtime.InteropServices.Marshal]::IsComObject($ComObject)) {
        [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($ComObject)
    }
}

function Get-CanonicalExcelValue {
    param([object]$Cell)

    $text = [string]$Cell.Text
    if ($text -match '^#(?:DIV/0!|N/A|VALUE!|REF!|NUM!|NAME\?|NULL!)$') {
        return [ordered]@{ kind = "error"; value = $text }
    }

    $value = $Cell.Value2
    if ($null -eq $value) {
        return [ordered]@{ kind = "blank"; value = $null }
    }
    if ($value -is [bool]) {
        return [ordered]@{ kind = "boolean"; value = [bool]$value }
    }
    if ($value -is [byte] -or $value -is [int16] -or $value -is [int32] -or
        $value -is [int64] -or $value -is [single] -or $value -is [double] -or
        $value -is [decimal]) {
        return [ordered]@{ kind = "number"; value = [double]$value }
    }
    return [ordered]@{ kind = "text"; value = [string]$value }
}

function Set-CellInput {
    param(
        [object]$Sheet,
        [string]$Address,
        [object]$Value
    )

    $cell = $null
    try {
        $cell = $Sheet.Range($Address)
        if ($Value -is [string] -and $Value.StartsWith("=")) {
            $cell.Formula = $Value
        } else {
            $cell.Value2 = $Value
        }
    } finally {
        Release-ComObjectSafely $cell
    }
}

$excel = $null
$workbook = $null
$worksheet = $null
$excelProcessId = 0
$excelVersion = ""
$results = @()
$input = Get-Content -LiteralPath $InputPath -Raw -Encoding UTF8 | ConvertFrom-Json

try {
    Write-AuditTrace "create Excel"
    $excel = New-Object -ComObject Excel.Application
    Write-AuditTrace "Excel created"
    $excel.Visible = $false
    $excel.DisplayAlerts = $false
    $excel.AskToUpdateLinks = $false
    $excelVersion = [string]$excel.Version

    [uint32]$openedProcessId = 0
    [void][VnoExcelWindowProcess]::GetWindowThreadProcessId([IntPtr]$excel.Hwnd, [ref]$openedProcessId)
    $excelProcessId = [int]$openedProcessId
    Write-AuditTrace ("Excel PID " + $excelProcessId)
    if ($excelProcessId -le 0) {
        throw "Khong xac dinh duoc PID cua phien Excel COM vua mo."
    }

    $workbooks = $null
    $worksheets = $null
    try {
        Write-AuditTrace "add workbook"
        $workbooks = $excel.Workbooks
        $workbook = $workbooks.Add()
        $worksheets = $workbook.Worksheets
        $worksheet = $worksheets.Item(1)
        Write-AuditTrace "workbook ready"
    } finally {
        Release-ComObjectSafely $worksheets
        Release-ComObjectSafely $workbooks
    }

    foreach ($test in $input.tests) {
        Write-Output ("EXCEL_CASE " + [string]$test.id)
        Write-AuditTrace ("case " + [string]$test.id)
        $clearRange = $null
        try {
            # Tat ca fixture cua audit nam trong A1:J20. Khong Clear() ca worksheet
            # (17 ty o), vi Excel COM co the mat nhieu phut va ton bo nho khong can thiet.
            $clearRange = $worksheet.Range("A1:J20")
            [void]$clearRange.Clear()
        } finally {
            Release-ComObjectSafely $clearRange
        }

        foreach ($property in $test.cells.PSObject.Properties) {
            Set-CellInput -Sheet $worksheet -Address $property.Name -Value $property.Value
        }

        $resultCell = $null
        try {
            if ($test.mode -eq "fillDown") {
                Set-CellInput -Sheet $worksheet -Address "D1" -Value $test.formula
                $fillRange = $null
                try {
                    $fillRange = $worksheet.Range("D1:D2")
                    [void]$fillRange.FillDown()
                } finally {
                    Release-ComObjectSafely $fillRange
                }
                $resultCell = $worksheet.Range("D2")
            } else {
                $resultCell = $worksheet.Range("J1")
                $resultCell.Formula = [string]$test.excelFormula
            }

            $resultCell.ColumnWidth = 60
            $excel.Calculate()
            $results += [ordered]@{
                id = [string]$test.id
                formula = [string]$resultCell.Formula
                result = Get-CanonicalExcelValue $resultCell
            }
        } catch {
            $results += [ordered]@{
                id = [string]$test.id
                formula = $null
                result = [ordered]@{ kind = "harness-error"; value = $_.Exception.Message }
            }
        } finally {
            Release-ComObjectSafely $resultCell
        }
    }

    [ordered]@{
        excelProcessId = $excelProcessId
        excelVersion = $excelVersion
        results = $results
    } | ConvertTo-Json -Depth 8 -Compress | Set-Content -LiteralPath $OutputPath -Encoding UTF8
    Write-AuditTrace "output written"
} finally {
    Write-Output "EXCEL_CLEANUP workbook"
    Write-AuditTrace "cleanup workbook"
    if ($null -ne $workbook) {
        try { $workbook.Close($false) } catch {}
    }
    Write-Output "EXCEL_CLEANUP quit"
    Write-AuditTrace "cleanup quit"
    if ($null -ne $excel) {
        try { $excel.Quit() } catch {}
    }

    Write-Output "EXCEL_CLEANUP release"
    Write-AuditTrace "cleanup release"
    Release-ComObjectSafely $worksheet
    Release-ComObjectSafely $workbook
    Release-ComObjectSafely $excel
    $worksheet = $null
    $workbook = $null
    $excel = $null
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()

    Write-Output ("EXCEL_CLEANUP pid " + $excelProcessId)
    Write-AuditTrace ("cleanup pid " + $excelProcessId)
    if ($excelProcessId -gt 0) {
        $deadline = [DateTime]::UtcNow.AddSeconds(5)
        while ([DateTime]::UtcNow -lt $deadline -and (Get-Process -Id $excelProcessId -ErrorAction SilentlyContinue)) {
            Start-Sleep -Milliseconds 100
        }
        if (Get-Process -Id $excelProcessId -ErrorAction SilentlyContinue) {
            Stop-Process -Id $excelProcessId -Force
        }
    }
    Write-Output "EXCEL_CLEANUP done"
    Write-AuditTrace "cleanup done"
}
