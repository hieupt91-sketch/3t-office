# Tu dong dong hop thoai "Word khong phai chuong trinh mac dinh" (va nut OK cua hop thoai "khong the dong Word") cua cac tien trinh Word tu dong hoa
# bang thong diep cua so (BM_CLICK) - khong dung SendKeys/chuot. Chay song song voi word_pages.ps1.
# Dung: powershell -File scripts/audit-0610/word_dialog_dismisser.ps1 -Seconds 600
param([int]$Seconds = 600, [string]$ProcessName = 'WINWORD')
Add-Type @"
using System; using System.Text; using System.Runtime.InteropServices; using System.Collections.Generic;
public class WordDlg {
  public delegate bool EP(IntPtr h, IntPtr l);
  [DllImport("user32.dll")] static extern bool EnumWindows(EP p, IntPtr l);
  [DllImport("user32.dll")] static extern bool EnumChildWindows(IntPtr h, EP p, IntPtr l);
  [DllImport("user32.dll")] static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] static extern int GetClassName(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] static extern IntPtr SendMessage(IntPtr h, int m, IntPtr w, IntPtr l);
  public static int Dismiss(uint[] pids) {
    int handled = 0;
    EnumWindows((h, l) => {
      uint pid; GetWindowThreadProcessId(h, out pid);
      if (Array.IndexOf(pids, pid) < 0 || !IsWindowVisible(h)) return true;
      var cls = new StringBuilder(64); GetClassName(h, cls, 64);
      if (cls.ToString() != "#32770") return true;
      IntPtr no = IntPtr.Zero, dontShow = IntPtr.Zero, ok = IntPtr.Zero; bool defaultProgram = false; bool seriousError = false;
      EnumChildWindows(h, (c, ll) => {
        var t = new StringBuilder(300); var cc = new StringBuilder(64); GetWindowText(c, t, 300); GetClassName(c, cc, 64);
        string text = t.ToString();
        if (cc.ToString() == "Button" && text == "&No") no = c;
        if (cc.ToString() == "Static" && text.Contains("caused a serious error")) seriousError = true;
        if (cc.ToString() == "Button" && text.StartsWith("Don't show")) dontShow = c;
        if (cc.ToString() == "Button" && text == "OK") ok = c;
        if (cc.ToString() == "Static" && text.Contains("default program")) defaultProgram = true;
        return true;
      }, IntPtr.Zero);
      if (seriousError && no != IntPtr.Zero) { SendMessage(no, 0x00F5, IntPtr.Zero, IntPtr.Zero); handled++; }
      else if (defaultProgram && no != IntPtr.Zero) { if (dontShow != IntPtr.Zero) SendMessage(dontShow, 0x00F5, IntPtr.Zero, IntPtr.Zero); SendMessage(no, 0x00F5, IntPtr.Zero, IntPtr.Zero); handled++; }
      else if (ok != IntPtr.Zero) { SendMessage(ok, 0x00F5, IntPtr.Zero, IntPtr.Zero); handled++; }
      return true;
    }, IntPtr.Zero);
    return handled;
  }
}
"@
$deadline = (Get-Date).AddSeconds($Seconds)
while ((Get-Date) -lt $deadline) {
    $ids = @(Get-Process $ProcessName -ErrorAction SilentlyContinue | ForEach-Object { [uint32]$_.Id })
    if ($ids.Count) { [void][WordDlg]::Dismiss($ids) }
    Start-Sleep -Milliseconds 500
}
