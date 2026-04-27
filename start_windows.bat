@echo off
setlocal

cd /d "%~dp0"

if "%PORT%"=="" set "PORT=5000"
if "%HOST%"=="" set "HOST=127.0.0.1"
set "APP_URL=http://%HOST%:%PORT%"
set "PUBLIC_URL=%APP_URL%"
set "VENV_DIR=.venv_win"
set "VENV_PY=%VENV_DIR%\Scripts\python.exe"

echo.
echo Campus Coworking
echo =================
echo Directory: %CD%
echo URL:       %APP_URL%
echo.

set "ADMIN_INPUT="
if "%COWORKING_ADMIN_EMAIL%"=="" if "%ADMIN_EMAIL%"=="" if not "%SKIP_ADMIN_PROMPT%"=="1" set /p "ADMIN_INPUT=Service admin email (Enter to keep saved): "
if not "%ADMIN_INPUT%"=="" set "COWORKING_ADMIN_EMAIL=%ADMIN_INPUT%"

set "PYTHON_CMD="
where py >nul 2>nul
if not errorlevel 1 (
    set "PYTHON_CMD=py -3"
) else (
    where python >nul 2>nul
    if not errorlevel 1 set "PYTHON_CMD=python"
)

if not defined PYTHON_CMD (
    echo Python 3 was not found. Install Python 3.10+ and run this file again.
    pause
    exit /b 1
)

if not exist "%VENV_PY%" (
    echo Creating virtual environment...
    %PYTHON_CMD% -m venv "%VENV_DIR%"
    if errorlevel 1 (
        echo Failed to create virtual environment.
        pause
        exit /b 1
    )
)

echo Installing dependencies...
"%VENV_PY%" -m pip install --upgrade pip
if errorlevel 1 (
    echo Failed to upgrade pip.
    pause
    exit /b 1
)

"%VENV_PY%" -m pip install -r requirements.txt
if errorlevel 1 (
    echo Failed to install requirements.
    pause
    exit /b 1
)

if not "%NO_BROWSER%"=="1" (
    echo Opening browser...
    start "" "%APP_URL%"
)

echo Starting server. Press Ctrl+C to stop.
echo.
"%VENV_PY%" main.py

pause
