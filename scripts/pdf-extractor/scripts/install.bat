@echo off
REM PDF Question Extractor - Installation Script for Windows
REM This script sets up the environment and installs all dependencies

echo 🚀 PDF Question Extractor - Installation
echo ==========================================

REM Check Python version
echo 📋 Checking Python version...
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python not found. Please install Python 3.8 or higher
    pause
    exit /b 1
)

for /f "tokens=2" %%i in ('python --version 2^>^&1') do set python_version=%%i
echo ✅ Python %python_version% found

REM Check if pip is installed
echo 📦 Checking pip...
pip --version >nul 2>&1
if errorlevel 1 (
    echo ❌ pip not found. Please install pip first
    pause
    exit /b 1
)
echo ✅ pip found

REM Create virtual environment
echo 🏗️  Creating virtual environment...
if not exist "venv" (
    python -m venv venv
    echo ✅ Virtual environment created
) else (
    echo ✅ Virtual environment already exists
)

REM Activate virtual environment
echo 🔄 Activating virtual environment...
call venv\Scripts\activate.bat

REM Upgrade pip
echo ⬆️  Upgrading pip...
python -m pip install --upgrade pip

REM Install requirements
echo 📚 Installing Python dependencies...
if exist "requirements.txt" (
    pip install -r requirements.txt
    echo ✅ Dependencies installed
) else (
    echo ❌ requirements.txt not found
    pause
    exit /b 1
)

REM Create .env file if it doesn't exist
echo 📝 Setting up environment...
if not exist ".env" (
    if exist ".env.example" (
        copy .env.example .env >nul
        echo ✅ .env file created from .env.example
        echo ⚠️  Please edit .env file with your API keys
    ) else (
        echo ⚠️  Creating basic .env file...
        (
            echo # OpenAI API Key ^(required for AI extraction^)
            echo OPENAI_API_KEY=your-openai-api-key-here
            echo.
            echo # Supabase Configuration ^(required for database upload^)
            echo SUPABASE_URL=https://your-project.supabase.co
            echo SUPABASE_SERVICE_KEY=your-service-role-key-here
        ) > .env
        echo ✅ Basic .env file created
        echo ⚠️  Please edit .env file with your actual API keys
    )
) else (
    echo ✅ .env file already exists
)

REM Create output directories
echo 📁 Creating output directories...
if not exist "output\json" mkdir output\json
if not exist "logs" mkdir logs
echo ✅ Output directories created

REM Test installation
echo 🧪 Testing installation...
python -c "import pdfplumber, fitz, openai, supabase; print('✅ All libraries imported successfully')" 2>nul
if errorlevel 1 (
    echo ❌ Library import test failed
    pause
    exit /b 1
)

echo.
echo 🎉 Installation complete!
echo.
echo Next steps:
echo 1. Edit .env file with your API keys
echo 2. Run test: python test_extraction.py
echo 3. Extract questions: python extract_and_upload.py --pdf your_file.pdf
echo.
echo Documentation:
echo - Quick Start: type QUICK_START.md
echo - Full Guide: type README.md
echo - Troubleshooting: type docs\TROUBLESHOOTING.md
echo.
echo To activate virtual environment in future:
echo venv\Scripts\activate.bat

pause
