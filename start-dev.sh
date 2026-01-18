#!/bin/bash

# Quick Start Script for IGCSE Prep App
# This script helps you start both the main app and Python parser locally

echo "🚀 Starting IGCSE Prep App Development Environment"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the root directory of the project"
    exit 1
fi

# Start Python PDF Parser in background
echo "📄 Starting Python PDF Parser..."
cd python-parser

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "🔧 Creating Python virtual environment..."
    python -m venv venv
fi

# Activate virtual environment and install dependencies
source venv/Scripts/activate 2>/dev/null || source venv/bin/activate
pip install -r requirements.txt

# Start Python parser in background
python app.py &
PYTHON_PID=$!
echo "✅ Python PDF Parser started (PID: $PYTHON_PID)"

# Go back to main directory
cd ..

# Start Next.js app
echo "⚛️ Starting Next.js application..."
echo "📍 Main app will be available at: http://localhost:3000"
echo "📍 Python parser at: http://localhost:5001"
echo ""
echo "🛑 To stop both services, press Ctrl+C"
echo ""

# Function to cleanup background processes
cleanup() {
    echo ""
    echo "🛑 Shutting down services..."
    kill $PYTHON_PID 2>/dev/null
    echo "✅ All services stopped"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Start Next.js development server
npm run dev

# This will only run if npm run dev exits
cleanup
