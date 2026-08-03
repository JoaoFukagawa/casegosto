@echo off
title Casegosto - Impressao Automatica
echo Abrindo o Casegosto com impressao automatica...
echo (imprime direto na impressora padrao, sem tela de impressao)
echo.

set "URL=https://casegosto.vercel.app"

if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
  start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk --kiosk-printing --no-first-run --disable-translate --disable-pinch --disable-features=TranslateUI "%URL%"
  goto :fim
)

if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
  start "" "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" --kiosk --kiosk-printing --no-first-run --disable-translate --disable-pinch --disable-features=TranslateUI "%URL%"
  goto :fim
)

if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" (
  start "" "%LocalAppData%\Google\Chrome\Application\chrome.exe" --kiosk --kiosk-printing --no-first-run --disable-translate --disable-pinch --disable-features=TranslateUI "%URL%"
  goto :fim
)

if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
  start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --kiosk --kiosk-printing --no-first-run "%URL%"
  goto :fim
)

if exist "C:\Program Files\Microsoft\Edge\Application\msedge.exe" (
  start "" "C:\Program Files\Microsoft\Edge\Application\msedge.exe" --kiosk --kiosk-printing --no-first-run "%URL%"
  goto :fim
)

echo Nao encontrei Chrome nem Edge. Abra o navegador normalmente.
pause

:fim
