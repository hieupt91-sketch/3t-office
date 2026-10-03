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

; Always listed in "Open with" (not the default handler): the launcher exe carries its own icon and name, so Windows shows
; "Doc", "Sheet", "Slide" with the right icon on every machine instead of the shared Python icon.
!macro RegisterOpenWith EXT EXE
  WriteRegStr HKCU "Software\Classes\${EXT}\OpenWithList\${EXE}" "" ""
  WriteRegStr HKCU "Software\Classes\Applications\${EXE}\SupportedTypes" "${EXT}" ""
!macroend

!macro RegisterApplication EXE FRIENDLY
  WriteRegStr HKCU "Software\Classes\Applications\${EXE}" "FriendlyAppName" "${FRIENDLY}"
  WriteRegStr HKCU "Software\Classes\Applications\${EXE}\DefaultIcon" "" "$INSTDIR\${EXE},0"
  WriteRegStr HKCU "Software\Classes\Applications\${EXE}\shell\open" "FriendlyAppName" "${FRIENDLY}"
  WriteRegStr HKCU "Software\Classes\Applications\${EXE}\shell\open\command" "" "$\"$INSTDIR\${EXE}$\" $\"%1$\""
!macroend

; Older builds listed the shared "Python" entry (ProgID whose command is pythonw.exe) in "Open with" for all three apps.
!macro CleanLegacyOpenWithProgid EXT PROGID
  DeleteRegValue HKCU "Software\Classes\${EXT}\OpenWithProgids" "${PROGID}"
!macroend

; An older install that already registered the file types keeps working: point its command at the launcher.
!macro RefreshLegacyProgid PROGID EXE FRIENDLY
  ReadRegStr $R1 HKCU "Software\Classes\${PROGID}\shell\open\command" ""
  ${If} $R1 != ""
    WriteRegStr HKCU "Software\Classes\${PROGID}" "" "${FRIENDLY}"
    WriteRegStr HKCU "Software\Classes\${PROGID}" "FriendlyTypeName" "${FRIENDLY}"
    WriteRegStr HKCU "Software\Classes\${PROGID}\shell\open" "FriendlyAppName" "${FRIENDLY}"
    WriteRegStr HKCU "Software\Classes\${PROGID}\shell\open\command" "" "$\"$INSTDIR\${EXE}$\" $\"%1$\""
  ${EndIf}
!macroend

!macro UnregisterOpenWith EXT EXE
  DeleteRegKey HKCU "Software\Classes\${EXT}\OpenWithList\${EXE}"
  DeleteRegKey /ifempty HKCU "Software\Classes\${EXT}\OpenWithList"
  DeleteRegKey /ifempty HKCU "Software\Classes\${EXT}"
!macroend

!macro RegisterFileType EXT PROGID APPKIND EXE FRIENDLY
  WriteRegStr HKCU "Software\Classes\${EXT}" "" "${PROGID}"
  WriteRegStr HKCU "Software\Classes\${PROGID}" "" "${FRIENDLY}"
  WriteRegStr HKCU "Software\Classes\${PROGID}" "FriendlyTypeName" "${FRIENDLY}"
  WriteRegStr HKCU "Software\Classes\${PROGID}\DefaultIcon" "" "$INSTDIR\icons\${APPKIND}.ico,0"
  WriteRegStr HKCU "Software\Classes\${PROGID}\shell\open" "FriendlyAppName" "${FRIENDLY}"
  WriteRegStr HKCU "Software\Classes\${PROGID}\shell\open\command" "" "$\"$INSTDIR\${EXE}$\" $\"%1$\""
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

Name "3T Office ${AppVersion}"
OutFile "${OutputDir}\VNOffice-Setup-${AppVersion}.exe"
InstallDir "$LOCALAPPDATA\VNOffice\app-install"
RequestExecutionLevel user
ShowInstDetails nevershow
ShowUninstDetails nevershow
; zlib (zlib/libpng license): the LZMA module is CPL-1.0 (weak copyleft) - owner rule: no copyleft without sign-off.
SetCompressor /SOLID zlib
SetDatablockOptimize on
CRCCheck on
BrandingText "3T Office"
Icon "${PackageDir}\icons\vnoffice.ico"
UninstallIcon "${PackageDir}\icons\vnoffice.ico"
VIProductVersion "1.0.0.0"

!define MUI_ABORTWARNING
!define MUI_ICON "${PackageDir}\icons\vnoffice.ico"
!define MUI_UNICON "${PackageDir}\icons\vnoffice.ico"
; Product artwork (branding\installer, designed separately) is used when present.
!if /FileExists "${InstallerSourceDir}\..\..\branding\installer\welcome.bmp"
  !define MUI_WELCOMEFINISHPAGE_BITMAP "${InstallerSourceDir}\..\..\branding\installer\welcome.bmp"
  !define MUI_UNWELCOMEFINISHPAGE_BITMAP "${InstallerSourceDir}\..\..\branding\installer\welcome.bmp"
!endif
!if /FileExists "${InstallerSourceDir}\..\..\branding\installer\header.bmp"
  !define MUI_HEADERIMAGE
  !define MUI_HEADERIMAGE_BITMAP "${InstallerSourceDir}\..\..\branding\installer\header.bmp"
  !define MUI_HEADERIMAGE_UNBITMAP "${InstallerSourceDir}\..\..\branding\installer\header.bmp"
!endif
!define MUI_WELCOMEPAGE_TITLE "Chào mừng đến với 3T Office ${AppVersion}"
!define MUI_WELCOMEPAGE_TEXT "Bộ ứng dụng văn phòng Việt gồm:$\r$\n$\r$\n    •  Doc — soạn thảo văn bản$\r$\n    •  Sheet — bảng tính$\r$\n    •  Slide — trình chiếu$\r$\n$\r$\nMở và lưu trực tiếp tệp .docx, .doc, .xlsx, .xls, .pptx. Chạy hoàn toàn ngoại tuyến, tự lưu bản khôi phục, tự nhận bản cập nhật qua mạng nội bộ — không phải cài lại.$\r$\n$\r$\nCài cho tài khoản Windows hiện tại, không cần quyền quản trị. Bấm Tiến để tiếp tục."
!define MUI_FINISHPAGE_TITLE "Đã cài đặt xong 3T Office"
!define MUI_FINISHPAGE_TEXT "Doc, Sheet và Slide đã có trong thư mục 3T Office của menu Start và trên Màn hình nền.$\r$\n$\r$\nCác bản cập nhật sau này sẽ tự tải về; bạn chỉ cần khởi động lại ứng dụng khi được nhắc."
!define MUI_FINISHPAGE_RUN "$INSTDIR\python\pythonw.exe"
!define MUI_FINISHPAGE_RUN_PARAMETERS "-s -E $\"$INSTDIR\app\main.py$\" --app=writer"
!define MUI_FINISHPAGE_RUN_TEXT "Mở Doc ngay"
!define MUI_FINISHPAGE_SHOWREADME "$INSTDIR\CAI-DAT.txt"
!define MUI_FINISHPAGE_SHOWREADME_TEXT "Xem hướng dẫn cài đặt và sử dụng"
!define MUI_FINISHPAGE_SHOWREADME_NOTCHECKED

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

VIAddVersionKey /LANG=${LANG_VIETNAMESE} "ProductName" "3T Office"
VIAddVersionKey /LANG=${LANG_VIETNAMESE} "FileDescription" "Bộ cài 3T Office"
VIAddVersionKey /LANG=${LANG_VIETNAMESE} "CompanyName" "3T Office"
VIAddVersionKey /LANG=${LANG_VIETNAMESE} "ProductVersion" "${AppVersion}"
VIAddVersionKey /LANG=${LANG_VIETNAMESE} "FileVersion" "1.0.0.0"
VIAddVersionKey /LANG=${LANG_VIETNAMESE} "LegalCopyright" "Copyright 3T Office"

LangString TASK_DESKTOP ${LANG_VIETNAMESE} "Tạo lối tắt Doc, Sheet và Slide trên Màn hình nền"
LangString TASK_ASSOC ${LANG_VIETNAMESE} "Đăng ký mở định dạng tài liệu bằng 3T Office"
LangString TASK_DESKTOP_DESC ${LANG_VIETNAMESE} "Tạo Doc.lnk, Sheet.lnk và Slide.lnk trên Màn hình nền."
LangString TASK_ASSOC_DESC ${LANG_VIETNAMESE} "Tùy chọn này đăng ký định dạng tài liệu trong tài khoản Windows hiện tại."
LangString MSG_OS ${LANG_VIETNAMESE} "3T Office cần Windows 10 hoặc mới hơn, phiên bản 64-bit."
LangString MSG_WEBVIEW ${LANG_VIETNAMESE} "Chưa tìm thấy thành phần WebView2 để hiển thị giao diện. 3T Office cần thành phần này để hiển thị giao diện.$\r$\nLiên hệ người cung cấp bộ cài để nhận thành phần còn thiếu.$\r$\nBạn vẫn muốn tiếp tục cài đặt?"
LangString MSG_DISK ${LANG_VIETNAMESE} "Ổ đĩa cài đặt không đủ dung lượng trống. Cần dung lượng bằng kích thước gói ứng dụng cộng thêm 256 MiB."
LangString MSG_PREFLIGHT ${LANG_VIETNAMESE} "Không thể kiểm tra yêu cầu hệ thống. Hãy đảm bảo Windows PowerShell 5.1 có sẵn rồi chạy lại bộ cài."
LangString MSG_CLOSE_RUNNING ${LANG_VIETNAMESE} "3T Office đang chạy. Hãy lưu tài liệu. Chọn Có để yêu cầu ứng dụng đóng trước khi nâng cấp. Nếu tài liệu có thay đổi chưa lưu, 3T Office sẽ hỏi bạn cách xử lý."
LangString MSG_CLOSE_FAILED ${LANG_VIETNAMESE} "Không thể đóng 3T Office. Hãy lưu công việc, đóng tất cả cửa sổ 3T Office rồi chạy lại bộ cài."
LangString MSG_UNBLOCK_FAILED ${LANG_VIETNAMESE} "Không thể gỡ dấu chặn tải xuống khỏi một số tệp đã cài. Bộ cài đã dừng; hãy chạy lại bằng tài khoản Windows hiện tại."
LangString DATA_TITLE ${LANG_VIETNAMESE} "Dữ liệu người dùng 3T Office"
LangString DATA_PROMPT ${LANG_VIETNAMESE} "Khi gỡ cài đặt, 3T Office sẽ xóa chương trình và lối tắt. Dữ liệu trong %APPDATA%\VNOffice (thiết lập, tệp khôi phục và báo cáo lỗi đang chờ gửi) sẽ được giữ lại, trừ khi bạn chọn xóa bên dưới."
LangString DATA_CHECK ${LANG_VIETNAMESE} "Xóa cả dữ liệu người dùng 3T Office trong %APPDATA%\VNOffice"

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
  File "${PackageDir}\CAI-DAT.txt"
  File "${PackageDir}\Doc.exe"
  File "${PackageDir}\Sheet.exe"
  File "${PackageDir}\Slide.exe"

  WriteUninstaller "$INSTDIR\Uninstall.exe"
  ; Remove the previous pilot launchers while keeping the existing install and registry locations.
  Delete "$SMPROGRAMS\VN Office\VN Writer.lnk"
  Delete "$SMPROGRAMS\VN Office\VN Sheet.lnk"
  Delete "$SMPROGRAMS\VN Office\VN Slides.lnk"
  Delete "$SMPROGRAMS\VN Office\Gỡ cài đặt VN Office.lnk"
  Delete "$SMPROGRAMS\VN Office\Go cai dat VN Office.lnk"
  RMDir "$SMPROGRAMS\VN Office"
  ; Remove previous long launcher names before creating the short shortcuts.
  Delete "$SMPROGRAMS\3T Office\3T Doc.lnk"
  Delete "$SMPROGRAMS\3T Office\3T Sheet.lnk"
  Delete "$SMPROGRAMS\3T Office\3T Slide.lnk"
  Delete "$DESKTOP\VN Writer.lnk"
  Delete "$DESKTOP\VN Sheet.lnk"
  Delete "$DESKTOP\VN Slides.lnk"
  Delete "$DESKTOP\3T Doc.lnk"
  Delete "$DESKTOP\3T Sheet.lnk"
  Delete "$DESKTOP\3T Slide.lnk"
  ; Remove the older ASCII uninstall shortcut from the current 3T menu before replacing it.
  Delete "$SMPROGRAMS\3T Office\Go cai dat 3T Office.lnk"
  CreateDirectory "$SMPROGRAMS\3T Office"
  CreateShortCut "$SMPROGRAMS\3T Office\Doc.lnk" "$INSTDIR\Doc.exe" "" "$INSTDIR\Doc.exe" 0 SW_SHOWNORMAL "" "Doc" "$INSTDIR\app"
  CreateShortCut "$SMPROGRAMS\3T Office\Sheet.lnk" "$INSTDIR\Sheet.exe" "" "$INSTDIR\Sheet.exe" 0 SW_SHOWNORMAL "" "Sheet" "$INSTDIR\app"
  CreateShortCut "$SMPROGRAMS\3T Office\Slide.lnk" "$INSTDIR\Slide.exe" "" "$INSTDIR\Slide.exe" 0 SW_SHOWNORMAL "" "Slide" "$INSTDIR\app"
  ; "Open with" lists Doc / Sheet / Slide with their own icons (does not change the default program).
  !insertmacro RegisterApplication "Doc.exe" "Doc"
  !insertmacro RegisterApplication "Sheet.exe" "Sheet"
  !insertmacro RegisterApplication "Slide.exe" "Slide"
  !insertmacro RefreshLegacyProgid "VNOffice.Writer.Document" "Doc.exe" "Doc"
  !insertmacro RefreshLegacyProgid "VNOffice.Sheet.Workbook" "Sheet.exe" "Sheet"
  !insertmacro RefreshLegacyProgid "VNOffice.Slides.Presentation" "Slide.exe" "Slide"
  !insertmacro CleanLegacyOpenWithProgid ".docx" "VNOffice.Writer.Document"
  !insertmacro CleanLegacyOpenWithProgid ".doc" "VNOffice.Writer.Document"
  !insertmacro CleanLegacyOpenWithProgid ".odt" "VNOffice.Writer.Document"
  !insertmacro CleanLegacyOpenWithProgid ".rtf" "VNOffice.Writer.Document"
  !insertmacro CleanLegacyOpenWithProgid ".xlsx" "VNOffice.Sheet.Workbook"
  !insertmacro CleanLegacyOpenWithProgid ".xls" "VNOffice.Sheet.Workbook"
  !insertmacro CleanLegacyOpenWithProgid ".ods" "VNOffice.Sheet.Workbook"
  !insertmacro CleanLegacyOpenWithProgid ".csv" "VNOffice.Sheet.Workbook"
  !insertmacro CleanLegacyOpenWithProgid ".pptx" "VNOffice.Slides.Presentation"
  !insertmacro CleanLegacyOpenWithProgid ".ppt" "VNOffice.Slides.Presentation"
  !insertmacro CleanLegacyOpenWithProgid ".odp" "VNOffice.Slides.Presentation"
  !insertmacro RegisterOpenWith ".docx" "Doc.exe"
  !insertmacro RegisterOpenWith ".doc" "Doc.exe"
  !insertmacro RegisterOpenWith ".odt" "Doc.exe"
  !insertmacro RegisterOpenWith ".rtf" "Doc.exe"
  !insertmacro RegisterOpenWith ".txt" "Doc.exe"
  !insertmacro RegisterOpenWith ".xlsx" "Sheet.exe"
  !insertmacro RegisterOpenWith ".xls" "Sheet.exe"
  !insertmacro RegisterOpenWith ".ods" "Sheet.exe"
  !insertmacro RegisterOpenWith ".csv" "Sheet.exe"
  !insertmacro RegisterOpenWith ".pptx" "Slide.exe"
  !insertmacro RegisterOpenWith ".ppt" "Slide.exe"
  !insertmacro RegisterOpenWith ".odp" "Slide.exe"
  CreateShortCut "$SMPROGRAMS\3T Office\Gỡ cài đặt 3T Office.lnk" "$INSTDIR\Uninstall.exe" "" "$INSTDIR\icons\vnoffice.ico" 0 SW_SHOWNORMAL "" "Gỡ cài đặt 3T Office" "$INSTDIR"

  WriteRegStr HKCU "${UninstallRegKey}" "DisplayName" "3T Office"
  WriteRegStr HKCU "${UninstallRegKey}" "DisplayVersion" "${AppVersion}"
  WriteRegStr HKCU "${UninstallRegKey}" "Publisher" "3T Office"
  WriteRegStr HKCU "${UninstallRegKey}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "${UninstallRegKey}" "DisplayIcon" "$INSTDIR\icons\vnoffice.ico"
  WriteRegStr HKCU "${UninstallRegKey}" "UninstallString" "$\"$INSTDIR\Uninstall.exe$\""
  WriteRegStr HKCU "${UninstallRegKey}" "QuietUninstallString" "$\"$INSTDIR\Uninstall.exe$\" /S"
  WriteRegDWORD HKCU "${UninstallRegKey}" "NoModify" 1
  WriteRegDWORD HKCU "${UninstallRegKey}" "NoRepair" 1
  IntOp $R0 ${PackageSizeBytes} / 1024
  WriteRegDWORD HKCU "${UninstallRegKey}" "EstimatedSize" $R0
  ; Tell Explorer the associations/icons changed so "Open with" and shortcuts refresh without a restart.
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, p 0, p 0)'

  ExecWait '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoLogo -NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File "$PLUGINSDIR\SetupPreflight.ps1" -Mode Unblock -InstallDir "$INSTDIR"' $R0
  ${If} $R0 != 0
    MessageBox MB_OK|MB_ICONSTOP "$(MSG_UNBLOCK_FAILED)"
    SetErrorLevel 30
    Abort
  ${EndIf}
SectionEnd

Section "$(TASK_DESKTOP)" SEC_DESKTOP
  CreateShortCut "$DESKTOP\Doc.lnk" "$INSTDIR\Doc.exe" "" "$INSTDIR\Doc.exe" 0 SW_SHOWNORMAL "" "Doc" "$INSTDIR\app"
  CreateShortCut "$DESKTOP\Sheet.lnk" "$INSTDIR\Sheet.exe" "" "$INSTDIR\Sheet.exe" 0 SW_SHOWNORMAL "" "Sheet" "$INSTDIR\app"
  CreateShortCut "$DESKTOP\Slide.lnk" "$INSTDIR\Slide.exe" "" "$INSTDIR\Slide.exe" 0 SW_SHOWNORMAL "" "Slide" "$INSTDIR\app"
SectionEnd

Section /o "$(TASK_ASSOC)" SEC_ASSOC
  !insertmacro RegisterFileType ".docx" "VNOffice.Writer.Document" "writer" "Doc.exe" "Doc"
  !insertmacro RegisterFileType ".doc" "VNOffice.Writer.Document" "writer" "Doc.exe" "Doc"
  !insertmacro RegisterFileType ".odt" "VNOffice.Writer.Document" "writer" "Doc.exe" "Doc"
  !insertmacro RegisterFileType ".rtf" "VNOffice.Writer.Document" "writer" "Doc.exe" "Doc"
  !insertmacro RegisterFileType ".xlsx" "VNOffice.Sheet.Workbook" "sheet" "Sheet.exe" "Sheet"
  !insertmacro RegisterFileType ".xls" "VNOffice.Sheet.Workbook" "sheet" "Sheet.exe" "Sheet"
  !insertmacro RegisterFileType ".ods" "VNOffice.Sheet.Workbook" "sheet" "Sheet.exe" "Sheet"
  !insertmacro RegisterFileType ".csv" "VNOffice.Sheet.Workbook" "sheet" "Sheet.exe" "Sheet"
  !insertmacro RegisterFileType ".pptx" "VNOffice.Slides.Presentation" "slides" "Slide.exe" "Slide"
  !insertmacro RegisterFileType ".ppt" "VNOffice.Slides.Presentation" "slides" "Slide.exe" "Slide"
  !insertmacro RegisterFileType ".odp" "VNOffice.Slides.Presentation" "slides" "Slide.exe" "Slide"
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
  Delete "$SMPROGRAMS\VN Office\Go cai dat VN Office.lnk"
  RMDir "$SMPROGRAMS\VN Office"
  Delete "$SMPROGRAMS\3T Office\3T Doc.lnk"
  Delete "$SMPROGRAMS\3T Office\3T Sheet.lnk"
  Delete "$SMPROGRAMS\3T Office\3T Slide.lnk"
  Delete "$SMPROGRAMS\3T Office\Doc.lnk"
  Delete "$SMPROGRAMS\3T Office\Sheet.lnk"
  Delete "$SMPROGRAMS\3T Office\Slide.lnk"
  Delete "$SMPROGRAMS\3T Office\Gỡ cài đặt 3T Office.lnk"
  RMDir "$SMPROGRAMS\3T Office"
  Delete "$DESKTOP\3T Doc.lnk"
  Delete "$DESKTOP\3T Sheet.lnk"
  Delete "$DESKTOP\3T Slide.lnk"
  Delete "$DESKTOP\Doc.lnk"
  Delete "$DESKTOP\Sheet.lnk"
  Delete "$DESKTOP\Slide.lnk"
  Delete "$DESKTOP\VN Writer.lnk"
  Delete "$DESKTOP\VN Sheet.lnk"
  Delete "$DESKTOP\VN Slides.lnk"

  !insertmacro UnregisterOpenWith ".xlsx" "Sheet.exe"
  !insertmacro UnregisterOpenWith ".xls" "Sheet.exe"
  !insertmacro UnregisterOpenWith ".ods" "Sheet.exe"
  !insertmacro UnregisterOpenWith ".csv" "Sheet.exe"
  !insertmacro UnregisterOpenWith ".docx" "Doc.exe"
  !insertmacro UnregisterOpenWith ".doc" "Doc.exe"
  !insertmacro UnregisterOpenWith ".odt" "Doc.exe"
  !insertmacro UnregisterOpenWith ".rtf" "Doc.exe"
  !insertmacro UnregisterOpenWith ".txt" "Doc.exe"
  !insertmacro UnregisterOpenWith ".pptx" "Slide.exe"
  !insertmacro UnregisterOpenWith ".ppt" "Slide.exe"
  !insertmacro UnregisterOpenWith ".odp" "Slide.exe"
  DeleteRegKey HKCU "Software\Classes\Applications\Doc.exe"
  DeleteRegKey HKCU "Software\Classes\Applications\Sheet.exe"
  DeleteRegKey HKCU "Software\Classes\Applications\Slide.exe"
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
