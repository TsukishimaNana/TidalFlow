!macro customUnInstall
  ; Custom uninstall cleanup for TidalFlow
  ; This runs during uninstall to clean up residual files

  ; Remove AppData/Roaming/TidalFlow user data (with user prompt)
  MessageBox MB_YESNO|MB_ICONQUESTION "Do you want to delete your TidalFlow settings and data?$\n$\nThis will remove:$\n- All task data$\n- Settings$\n- Logs$\n$\nClick No to keep your data for a future reinstall." IDNO skipUserData

  RMDir /r "$APPDATA\TidalFlow"

  skipUserData:

  ; Remove LocalAppData/TidalFlow cache
  RMDir /r "$LOCALAPPDATA\TidalFlow"

  ; Clean up Start Menu shortcut
  Delete "$SMPROGRAMS\TidalFlow.lnk"

  ; Clean up Desktop shortcut
  Delete "$DESKTOP\TidalFlow.lnk"

  ; Remove any leftover files in installation directory
  RMDir /r "$INSTDIR"
!macroend

!macro customInstallMode
  ; Show installation directory page in assisted mode
  ; This is handled by oneClick: false automatically
!macroend
