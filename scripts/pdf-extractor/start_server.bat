@echo off
REM Start Python PDF Parser API Server
REM This script starts the Flask API server for enhanced PDF extraction

echo ========================================
echo  IGCSE Simplified - PDF Parser API
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.8+ from https://www.python.org/
    pause
    exit /b 1
)

REM Check if virtual environment exists
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Install/update dependencies
echo Installing dependencies...
pip install -r requirements.txt --quiet

REM Start the server
echo.
echo ========================================
echo  Starting PDF Parser API Server
echo  URL: http://localhost:5000
echo  Press Ctrl+C to stop
echo ========================================
echo.

python api_server.py

pause
