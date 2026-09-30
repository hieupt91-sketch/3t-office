# -*- coding: utf-8 -*-
; Build with scripts\build-installer.ps1. The install overlays the app tree in place.
Unicode true

!ifndef PackageDir
  !error "PackageDir must point to a build-pilot package directory"
!endif
!ifndef OutputDir
  !error "OutputDir must point to the setup output directory"
!endif
!ifndef AppVersion
  !error "AppVersion must come from the package VERSION.txt"
!endif
!ifndef PackageSizeBytes
  !error "PackageSizeBytes must be calculated by build-installer.ps1"
!endif
!ifndef RequiredFreeBytes
  !error "RequiredFreeBytes must be calculated by build-installer.ps1"
!endif
!ifndef InstallerSourceDir
  !define InstallerSourceDir "${__FILEDIR__}"
!endif

!include "MUI2.nsh"
!include "LogicLib.nsh"
!include "nsDialogs.nsh"

!define UninstallRegKey "Software\Microsoft\Windows\CurrentVersion\Uninstall\VNOffice"

!macro RegisterFileType EXT PROGID APPKIND
  WriteRegStr HKCU "Software\Classes\${EXT}" "" "${PROGID}"
  WriteRegStr HKCU "Software\Classes\${EXT}\OpenWithProgids" "${PROGID}" ""
  WriteRegStr HKCU "Software\Classes\${PROGID}" "" "${PROGID}"
  WriteRegStr HKCU "Software\Classes\${PROGID}\DefaultIcon" "" "$INSTDIR\icons\${APPKIND}.ico,0"
  WriteRegStr HKCU "Software\Classes\${PROGID}\shell\open\command" "" "$\"$INSTDIR\python\pythonw.exe$\" -s -E $\"$INSTDIR\app\main.py$\" --app=${APPKIND} $\"%1$\""
!macroend

!macro RemoveExtension EXT PROGID
  ReadRegStr $R0 HKCU "Software\Classes\${EXT}" ""
  ${If} $R0 == "${PROGID}"
    DeleteRegValue HKCU "Software\Classes\${EXT}" ""
  ${EndIf}
  DeleteRegValue HKCU "Software\Classes\${EXT}\OpenWithProgids" "${PROGID}"
  DeleteRegKey /ifempty HKCU "Software\Classes\${EXT}\OpenWithProgids"
  DeleteRegKey /ifempty HKCU "Software\Classes\${EXT}"
!macroend

Name "VN Office ${AppVersion}"
OutFile "${OutputDir}\VNOffice-Setup-${AppVersion}.exe"
InstallDir "$LOCALAPPDATA\VNOffice\app-install"
RequestExecutionLevel user
ShowInstDetails nevershow
ShowUninstDetails nevershow
; zlib (zlib/libpng license): the LZMA module is CPL-1.0 (weak copyleft) - owner rule: no copyleft without sign-off.
SetCompressor /SOLID zlib
SetDatablockOptimize on
CRCCheck on
BrandingText "VN Office"
Icon "${PackageDir}\icons\writer.ico"
UninstallIcon "${PackageDir}\icons\writer.ico"
VIProductVersion "1.0.0.0"

!define MUI_ABORTWARNING
!define MUI_ICON "${PackageDir}\icons\writer.ico"
!define MUI_UNICON "${PackageDir}\icons\writer.ico"
!define MUI_WELCOMEPAGE_TITLE "Cài đặt VN Office"
!define MUI_WELCOMEPAGE_TEXT "Bộ cài sẽ thiết lập VN Office ${AppVersion} cho tài khoản Windows hiện tại. Không cần quyền quản trị viên. Sau khi cài, các ứng dụng có thể dùng ngoại tuyến. Hãy lưu tài liệu đang mở trước khi nâng cấp."

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "${InstallerSourceDir}\NOTICE-VI.rtf"
!insertmacro MUI_PAGE_COMPONENTS
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
UninstPage custom un.DataPage un.DataPageLeave
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_UNPAGE_FINISH
!insertmacro MUI_LANGUAGE "Vietnamese"

VIAddVersionKey /LANG=${LANG_VIETNAMESE} "ProductName" "VN Office"
VIAddVersionKey /LANG=${LANG_VIETNAMESE} "FileDescription" "Bộ cài VN Office"
VIAddVersionKey /LANG=${LANG_VIETNAMESE} "CompanyName" "VN Office"
VIAddVersionKey /LANG=${LANG_VIETNAMESE} "ProductVersion" "${AppVersion}"
VIAddVersionKey /LANG=${LANG_VIETNAMESE} "FileVersion" "1.0.0.0"
VIAddVersionKey /LANG=${LANG_VIETNAMESE} "LegalCopyright" "Copyright VN Office"

LangString TASK_DESKTOP ${LANG_VIETNAMESE} "Tạo lối tắt VN Office trên Màn hình nền"
LangString TASK_ASSOC ${LANG_VIETNAMESE} "Đăng ký mở định dạng tài liệu bằng VN Office"
LangString TASK_DESKTOP_DESC ${LANG_VIETNAMESE} "Tạo lối tắt VN Writer, VN Sheet và VN Slides trên Màn hình nền."
LangString TASK_ASSOC_DESC ${LANG_VIETNAMESE} "Tùy chọn này đăng ký định dạng tài liệu trong tài khoản Windows hiện tại."
LangString MSG_OS ${LANG_VIETNAMESE} "VN Office cần Windows 10 hoặc mới hơn, phiên bản 64-bit."
LangString MSG_WEBVIEW ${LANG_VIETNAMESE} "Chưa tìm thấy Microsoft Edge WebView2 Runtime. VN Office cần thành phần này để hiển thị giao diện.$\r$\nTải miễn phí tại:$\r$\nhttps://developer.microsoft.com/microsoft-edge/webview2/$\r$\nBạn vẫn muốn tiếp tục cài đặt?"
LangString MSG_DISK ${LANG_VIETNAMESE} "Ổ đĩa cài đặt không đủ dung lượng trống. Cần dung lượng bằng kích thước gói ứng dụng cộng thêm 256 MiB."
LangString MSG_PREFLIGHT ${LANG_VIETNAMESE} "Không thể kiểm tra yêu cầu hệ thống. Hãy đảm bảo Windows PowerShell 5.1 có sẵn rồi chạy lại bộ cài."
LangString MSG_CLOSE_RUNNING ${LANG_VIETNAMESE} "VN Office đang chạy. Hãy lưu tài liệu. Chọn Có để yêu cầu ứng dụng đóng trước khi nâng cấp. Nếu tài liệu có thay đổi chưa lưu, VN Office sẽ hỏi bạn cách xử lý."
LangString MSG_CLOSE_FAILED ${LANG_VIETNAMESE} "Không thể đóng VN Office. Hãy lưu công việc, đóng tất cả cửa sổ VN Office rồi chạy lại bộ cài."
LangString MSG_UNBLOCK_FAILED ${LANG_VIETNAMESE} "Không thể gỡ dấu chặn tải xuống khỏi một số tệp đã cài. Bộ cài đã dừng; hãy chạy lại bằng tài khoản Windows hiện tại."
LangString DATA_TITLE ${LANG_VIETNAMESE} "Dữ liệu người dùng VN Office"
LangString DATA_PROMPT ${LANG_VIETNAMESE} "Khi gỡ cài đặt, VN Office sẽ xóa chương trình và lối tắt. Dữ liệu trong %APPDATA%\VNOffice (thiết lập, tệp khôi phục và báo cáo lỗi đang chờ gửi) sẽ được giữ lại, trừ khi bạn chọn xóa bên dưới."
LangString DATA_CHECK ${LANG_VIETNAMESE} "Xóa cả dữ liệu người dùng VN Office trong %APPDATA%\VNOffice"

Var RemoveUserData
Var UninstallDataCheckbox

Function .onInit
  SetShellVarContext current
  SetRegView 64
  InitPluginsDir
  SetOutPath "$PLUGINSDIR"
  File "${InstallerSourceDir}\SetupPreflight.ps1"

  ExecWait '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoLogo -NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File "$PLUGINSDIR\SetupPreflight.ps1" -Mode Check -InstallDir "$INSTDIR" -RequiredBytes ${RequiredFreeBytes}' $R0
  ${If} $R0 == 10
    MessageBox MB_OK|MB_ICONSTOP "$(MSG_OS)"
    SetErrorLevel 10
    Abort
  ${ElseIf} $R0 == 11
    IfSilent silentWebView
    MessageBox MB_YESNO|MB_ICONEXCLAMATION "$(MSG_WEBVIEW)" IDYES continueSetup
    SetErrorLevel 11
    Abort
silentWebView:
    SetErrorLevel 11
    Abort
continueSetup:
  ${ElseIf} $R0 == 12
    MessageBox MB_OK|MB_ICONSTOP "$(MSG_DISK)"
    SetErrorLevel 12
    Abort
  ${ElseIf} $R0 != 0
    MessageBox MB_OK|MB_ICONSTOP "$(MSG_PREFLIGHT)"
    SetErrorLevel 13
    Abort
  ${EndIf}

  IfFileExists "$INSTDIR\python\pythonw.exe" 0 doneCloseCheck
  ExecWait '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoLogo -NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File "$PLUGINSDIR\SetupPreflight.ps1" -Mode InspectRunning -InstallDir "$INSTDIR"' $R0
  ${If} $R0 == 20
    IfSilent closeRunning
    MessageBox MB_YESNO|MB_ICONEXCLAMATION "$(MSG_CLOSE_RUNNING)" IDYES closeRunning
    SetErrorLevel 20
    Abort
closeRunning:
    ExecWait '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoLogo -NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File "$PLUGINSDIR\SetupPreflight.ps1" -Mode CloseRunning -InstallDir "$INSTDIR"' $R0
    ${If} $R0 != 0
      MessageBox MB_OK|MB_ICONSTOP "$(MSG_CLOSE_FAILED)"
      SetErrorLevel 21
      Abort
    ${EndIf}
  ${ElseIf} $R0 != 0
    MessageBox MB_OK|MB_ICONSTOP "$(MSG_PREFLIGHT)"
    SetErrorLevel 13
    Abort
  ${EndIf}
doneCloseCheck:
FunctionEnd

Section "-Core" SEC_CORE
  SetOverwrite on
  CreateDirectory "$INSTDIR"

  SetOutPath "$INSTDIR\python"
  File /r "${PackageDir}\python\*"
  SetOutPath "$INSTDIR\app"
  File /r "${PackageDir}\app\*"
  SetOutPath "$INSTDIR\icons"
  File /r "${PackageDir}\icons\*"
  SetOutPath "$INSTDIR\THIRD-PARTY-NOTICES"
  File /r "${PackageDir}\THIRD-PARTY-NOTICES\*"
  File /oname=NSIS-COPYING.txt "${InstallerSourceDir}\NSIS-COPYING.txt"
  SetOutPath "$INSTDIR"
  File "${PackageDir}\VERSION.txt"
  File "${PackageDir}\BUILD-INFO.txt"

  WriteUninstaller "$INSTDIR\Uninstall.exe"
  CreateDirectory "$SMPROGRAMS\VN Office"
  CreateShortCut "$SMPROGRAMS\VN Office\VN Writer.lnk" "$INSTDIR\python\pythonw.exe" "-s -E $\"$INSTDIR\app\main.py$\" --app=writer" "$INSTDIR\icons\writer.ico" 0 SW_SHOWNORMAL "" "VN Writer" "$INSTDIR\app"
  CreateShortCut "$SMPROGRAMS\VN Office\VN Sheet.lnk" "$INSTDIR\python\pythonw.exe" "-s -E $\"$INSTDIR\app\main.py$\" --app=sheet" "$INSTDIR\icons\sheet.ico" 0 SW_SHOWNORMAL "" "VN Sheet" "$INSTDIR\app"
  CreateShortCut "$SMPROGRAMS\VN Office\VN Slides.lnk" "$INSTDIR\python\pythonw.exe" "-s -E $\"$INSTDIR\app\main.py$\" --app=slides" "$INSTDIR\icons\slides.ico" 0 SW_SHOWNORMAL "" "VN Slides" "$INSTDIR\app"
  CreateShortCut "$SMPROGRAMS\VN Office\Gỡ cài đặt VN Office.lnk" "$INSTDIR\Uninstall.exe" "" "$INSTDIR\icons\writer.ico" 0 SW_SHOWNORMAL "" "Gỡ cài đặt VN Office" "$INSTDIR"

  WriteRegStr HKCU "${UninstallRegKey}" "DisplayName" "VN Office"
  WriteRegStr HKCU "${UninstallRegKey}" "DisplayVersion" "${AppVersion}"
  WriteRegStr HKCU "${UninstallRegKey}" "Publisher" "VN Office"
  WriteRegStr HKCU "${UninstallRegKey}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "${UninstallRegKey}" "DisplayIcon" "$INSTDIR\icons\writer.ico"
  WriteRegStr HKCU "${UninstallRegKey}" "UninstallString" "$\"$INSTDIR\Uninstall.exe$\""
  WriteRegStr HKCU "${UninstallRegKey}" "QuietUninstallString" "$\"$INSTDIR\Uninstall.exe$\" /S"
  WriteRegDWORD HKCU "${UninstallRegKey}" "NoModify" 1
  WriteRegDWORD HKCU "${UninstallRegKey}" "NoRepair" 1
  IntOp $R0 ${PackageSizeBytes} / 1024
  WriteRegDWORD HKCU "${UninstallRegKey}" "EstimatedSize" $R0

  ExecWait '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoLogo -NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File "$PLUGINSDIR\SetupPreflight.ps1" -Mode Unblock -InstallDir "$INSTDIR"' $R0
  ${If} $R0 != 0
    MessageBox MB_OK|MB_ICONSTOP "$(MSG_UNBLOCK_FAILED)"
    SetErrorLevel 30
    Abort
  ${EndIf}
SectionEnd

Section "$(TASK_DESKTOP)" SEC_DESKTOP
  CreateShortCut "$DESKTOP\VN Writer.lnk" "$INSTDIR\python\pythonw.exe" "-s -E $\"$INSTDIR\app\main.py$\" --app=writer" "$INSTDIR\icons\writer.ico" 0 SW_SHOWNORMAL "" "VN Writer" "$INSTDIR\app"
  CreateShortCut "$DESKTOP\VN Sheet.lnk" "$INSTDIR\python\pythonw.exe" "-s -E $\"$INSTDIR\app\main.py$\" --app=sheet" "$INSTDIR\icons\sheet.ico" 0 SW_SHOWNORMAL "" "VN Sheet" "$INSTDIR\app"
  CreateShortCut "$DESKTOP\VN Slides.lnk" "$INSTDIR\python\pythonw.exe" "-s -E $\"$INSTDIR\app\main.py$\" --app=slides" "$INSTDIR\icons\slides.ico" 0 SW_SHOWNORMAL "" "VN Slides" "$INSTDIR\app"
SectionEnd

Section /o "$(TASK_ASSOC)" SEC_ASSOC
  !insertmacro RegisterFileType ".docx" "VNOffice.Writer.Document" "writer"
  !insertmacro RegisterFileType ".doc" "VNOffice.Writer.Document" "writer"
  !insertmacro RegisterFileType ".odt" "VNOffice.Writer.Document" "writer"
  !insertmacro RegisterFileType ".rtf" "VNOffice.Writer.Document" "writer"
  !insertmacro RegisterFileType ".xlsx" "VNOffice.Sheet.Workbook" "sheet"
  !insertmacro RegisterFileType ".xls" "VNOffice.Sheet.Workbook" "sheet"
  !insertmacro RegisterFileType ".ods" "VNOffice.Sheet.Workbook" "sheet"
  !insertmacro RegisterFileType ".csv" "VNOffice.Sheet.Workbook" "sheet"
  !insertmacro RegisterFileType ".pptx" "VNOffice.Slides.Presentation" "slides"
  !insertmacro RegisterFileType ".ppt" "VNOffice.Slides.Presentation" "slides"
  !insertmacro RegisterFileType ".odp" "VNOffice.Slides.Presentation" "slides"
SectionEnd

!insertmacro MUI_FUNCTION_DESCRIPTION_BEGIN
  !insertmacro MUI_DESCRIPTION_TEXT ${SEC_DESKTOP} $(TASK_DESKTOP_DESC)
  !insertmacro MUI_DESCRIPTION_TEXT ${SEC_ASSOC} $(TASK_ASSOC_DESC)
!insertmacro MUI_FUNCTION_DESCRIPTION_END

Function un.DataPage
  !insertmacro MUI_HEADER_TEXT "$(DATA_TITLE)" "$(DATA_TITLE)"
  nsDialogs::Create 1018
  Pop $0
  ${If} $0 == error
    Abort
  ${EndIf}
  ${NSD_CreateLabel} 0 0 100% 62u "$(DATA_PROMPT)"
  Pop $1
  ${NSD_CreateCheckbox} 0 70u 100% 24u "$(DATA_CHECK)"
  Pop $UninstallDataCheckbox
  ${NSD_Uncheck} $UninstallDataCheckbox
  nsDialogs::Show
FunctionEnd

Function un.DataPageLeave
  ${NSD_GetState} $UninstallDataCheckbox $0
  ${If} $0 == ${BST_CHECKED}
    StrCpy $RemoveUserData 1
  ${Else}
    StrCpy $RemoveUserData 0
  ${EndIf}
FunctionEnd

Function un.onInit
  SetShellVarContext current
  SetRegView 64
  StrCpy $RemoveUserData 0
FunctionEnd

Section "Uninstall"
  Delete "$SMPROGRAMS\VN Office\VN Writer.lnk"
  Delete "$SMPROGRAMS\VN Office\VN Sheet.lnk"
  Delete "$SMPROGRAMS\VN Office\VN Slides.lnk"
  Delete "$SMPROGRAMS\VN Office\Gỡ cài đặt VN Office.lnk"
  RMDir "$SMPROGRAMS\VN Office"
  Delete "$DESKTOP\VN Writer.lnk"
  Delete "$DESKTOP\VN Sheet.lnk"
  Delete "$DESKTOP\VN Slides.lnk"

  !insertmacro RemoveExtension ".docx" "VNOffice.Writer.Document"
  !insertmacro RemoveExtension ".doc" "VNOffice.Writer.Document"
  !insertmacro RemoveExtension ".odt" "VNOffice.Writer.Document"
  !insertmacro RemoveExtension ".rtf" "VNOffice.Writer.Document"
  DeleteRegKey HKCU "Software\Classes\VNOffice.Writer.Document"
  !insertmacro RemoveExtension ".xlsx" "VNOffice.Sheet.Workbook"
  !insertmacro RemoveExtension ".xls" "VNOffice.Sheet.Workbook"
  !insertmacro RemoveExtension ".ods" "VNOffice.Sheet.Workbook"
  !insertmacro RemoveExtension ".csv" "VNOffice.Sheet.Workbook"
  DeleteRegKey HKCU "Software\Classes\VNOffice.Sheet.Workbook"
  !insertmacro RemoveExtension ".pptx" "VNOffice.Slides.Presentation"
  !insertmacro RemoveExtension ".ppt" "VNOffice.Slides.Presentation"
  !insertmacro RemoveExtension ".odp" "VNOffice.Slides.Presentation"
  DeleteRegKey HKCU "Software\Classes\VNOffice.Slides.Presentation"

  DeleteRegKey HKCU "${UninstallRegKey}"
  SetOutPath "$TEMP"
  Delete "$INSTDIR\Uninstall.exe"
  RMDir /r "$INSTDIR"
  ${If} $RemoveUserData == 1
    RMDir /r "$APPDATA\VNOffice"
  ${EndIf}
SectionEnd
