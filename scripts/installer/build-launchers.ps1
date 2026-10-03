# Build the three small per-app launchers (Doc.exe, Sheet.exe, Slide.exe) with the .NET Framework compiler
# that ships with Windows (no extra dependency, works offline).
#
# Why: every app used to run as "python\pythonw.exe main.py --app=..." so Windows showed the Python icon and name in
# "Open with", Task Manager and pinned taskbar items, and the three apps looked identical or different from PC to PC.
# Each launcher carries its own icon and version info (FileDescription = Doc / Sheet / Slide), so the shell shows the
# right name and icon everywhere, independent of icon-cache or shortcut state.
#
# Usage: powershell -ExecutionPolicy Bypass -File scripts\installer\build-launchers.ps1 -OutDir <package dir> -Version 0.9.8
# ASCII only: compatible with Windows PowerShell 5.1.
param(
    [Parameter(Mandatory = $true)][string]$OutDir,
    [string]$Version = "0.0.0",
    [string]$IconDir = ""
)

$ErrorActionPreference = "Stop"
$repo = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
if (-not $IconDir) { $IconDir = Join-Path $repo "branding\icons" }
$csc = Join-Path $env:WINDIR "Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if (-not (Test-Path -LiteralPath $csc)) { $csc = Join-Path $env:WINDIR "Microsoft.NET\Framework\v4.0.30319\csc.exe" }
if (-not (Test-Path -LiteralPath $csc)) { throw "csc.exe (.NET Framework 4) not found" }
$versionParts = ($Version -replace '[^0-9.].*$', '').Split('.')
while ($versionParts.Count -lt 4) { $versionParts += "0" }
$assemblyVersion = ($versionParts[0..3] -join '.')

$template = @'
using System;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text;

[assembly: AssemblyTitle("__TITLE__")]
[assembly: AssemblyDescription("__TITLE__")]
[assembly: AssemblyProduct("3T Office")]
[assembly: AssemblyCompany("3T")]
[assembly: AssemblyVersion("__VERSION__")]
[assembly: AssemblyFileVersion("__VERSION__")]

internal static class Launcher
{
    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    private static extern int MessageBoxW(IntPtr hWnd, string text, string caption, uint type);

    private static string Quote(string value)
    {
        // Standard Windows command-line quoting (CommandLineToArgvW rules).
        var builder = new StringBuilder("\"");
        int backslashes = 0;
        foreach (char c in value)
        {
            if (c == '\\') { backslashes++; continue; }
            if (c == '"') { builder.Append('\\', backslashes * 2 + 1).Append('"'); }
            else { builder.Append('\\', backslashes).Append(c); }
            backslashes = 0;
        }
        builder.Append('\\', backslashes * 2).Append('"');
        return builder.ToString();
    }

    [STAThread]
    private static int Main(string[] args)
    {
        // The launcher lives in <install>\app\launchers; walk up to the folder that holds python\ and app\main.py.
        string dir = AppDomain.CurrentDomain.BaseDirectory.TrimEnd('\\');
        string pythonw = null, appDir = null, main = null;
        for (int level = 0; level < 4 && !string.IsNullOrEmpty(dir); level++)
        {
            string candidatePython = Path.Combine(dir, "python", "pythonw.exe");
            string candidateMain = Path.Combine(dir, "app", "main.py");
            if (File.Exists(candidatePython) && File.Exists(candidateMain))
            {
                pythonw = candidatePython;
                appDir = Path.Combine(dir, "app");
                main = candidateMain;
                break;
            }
            dir = Path.GetDirectoryName(dir);
        }
        if (pythonw == null)
        {
            MessageBoxW(IntPtr.Zero,
                "Không tìm thấy tệp của 3T Office. Vui lòng cài lại.",
                "__TITLE__", 0x10);
            return 2;
        }
        var arguments = new StringBuilder("-s -E ").Append(Quote(main)).Append(" --app=__KIND__");
        foreach (string arg in args) arguments.Append(' ').Append(Quote(arg));
        var info = new ProcessStartInfo(pythonw, arguments.ToString())
        {
            WorkingDirectory = appDir,
            UseShellExecute = false,
            CreateNoWindow = true
        };
        try { Process.Start(info); }
        catch (Exception)
        {
            MessageBoxW(IntPtr.Zero,
                "Không khởi động được 3T Office. Vui lòng thử lại hoặc cài lại.",
                "__TITLE__", 0x10);
            return 3;
        }
        return 0;
    }
}
'@

$apps = @(
    @{ Kind = "writer"; Title = "Doc"; Exe = "Doc.exe"; Icon = "writer.ico" },
    @{ Kind = "sheet"; Title = "Sheet"; Exe = "Sheet.exe"; Icon = "sheet.ico" },
    @{ Kind = "slides"; Title = "Slide"; Exe = "Slide.exe"; Icon = "slides.ico" }
)
New-Item -ItemType Directory -Force $OutDir | Out-Null
$work = Join-Path ([System.IO.Path]::GetTempPath()) ("vno-launchers-" + [Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force $work | Out-Null
try {
    foreach ($app in $apps) {
        $icon = Join-Path $IconDir $app.Icon
        if (-not (Test-Path -LiteralPath $icon)) { throw "Missing icon: $icon" }
        $source = $template.Replace("__KIND__", $app.Kind).Replace("__TITLE__", $app.Title).Replace("__VERSION__", $assemblyVersion)
        $sourcePath = Join-Path $work ($app.Kind + ".cs")
        [System.IO.File]::WriteAllText($sourcePath, $source, (New-Object System.Text.UTF8Encoding $true))
        $target = Join-Path $OutDir $app.Exe
        & $csc /nologo /target:winexe /optimize+ /platform:anycpu "/win32icon:$icon" "/out:$target" $sourcePath | Out-Null
        if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $target)) { throw "csc failed for $($app.Exe)" }
        Write-Host ("  launcher {0}  ({1} KB)" -f $app.Exe, [int]((Get-Item -LiteralPath $target).Length / 1KB))
    }
} finally {
    if (Test-Path -LiteralPath $work) { [System.IO.Directory]::Delete($work, $true) }
}
