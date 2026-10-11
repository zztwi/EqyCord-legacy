@echo off
setlocal
rem EqyCord contributors, 2026. SPDX-License-Identifier: GPL-3.0-or-later
where node >nul 2>nul
if errorlevel 1 (
    echo EqyCord requires Node.js 22 or later: https://nodejs.org/
    pause
    exit /b 1
)
if "%~1"=="" (
    node "%~dp0scripts\eqycord\installer.mjs" menu
) else (
    node "%~dp0scripts\eqycord\installer.mjs" %*
)
set "eqyExit=%errorlevel%"
if "%~1"=="" pause
exit /b %eqyExit%
