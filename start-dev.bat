@echo off
REM Quick Start Script for IGCSE Prep App (Windows)
REM This script helps you start both the main app and Python parser locally

echo 🚀 Starting IGCSE Prep App Development Environment

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ Error: Please run this script from the root directory of the project
    pause
    exit /b 1
)

REM Start Python PDF Parser
echo 📄 Starting Python PDF Parser...
cd python-parser

REM Check if virtual environment exists
if not exist "venv" (
    echo 🔧 Creating Python virtual environment...
    python -m venv venv
)

REM Activate virtual environment and install dependencies
call venv\Scripts\activate
pip install -r requirements.txt

REM Start Python parser in new window
start "Python PDF Parser" cmd /k "python app.py"
echo ✅ Python PDF Parser started in new window

REM Go back to main directory
cd ..

REM Start Next.js app
echo ⚛️ Starting Next.js application...
echo 📍 Main app will be available at: http://localhost:3000
echo 📍 Python parser at: http://localhost:5001
echo.
echo 🛑 Close the Python parser window when done
echo.

npm run dev
