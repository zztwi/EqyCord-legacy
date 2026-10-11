@echo off
setlocal
set "EQY_WEB_BROWSER=%ProgramFiles%\BraveSoftware\Brave-Browser\Application\brave.exe"
if not exist "%EQY_WEB_BROWSER%" set "EQY_WEB_BROWSER=%LOCALAPPDATA%\BraveSoftware\Brave-Browser\Application\brave.exe"
if not exist "%EQY_WEB_BROWSER%" (
  echo Brave is required for this portable developer build.
  echo Install it from https://brave.com/download/ and run this launcher again.
  pause
  exit /b 1
)
if not exist "%~dp0extension\manifest.json" (
  echo The EqyCord Web extension folder is missing. Extract the complete package.
  pause
  exit /b 1
)
start "" "%EQY_WEB_BROWSER%" "--user-data-dir=%LOCALAPPDATA%\EqyCord\WebProfile" "--load-extension=%~dp0extension" "--app=https://discord.com/app" --no-first-run
exit /b 0
