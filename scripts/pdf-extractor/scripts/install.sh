#!/bin/bash

# PDF Question Extractor - Installation Script
# This script sets up the environment and installs all dependencies

set -e  # Exit on any error

echo "🚀 PDF Question Extractor - Installation"
echo "=========================================="

# Check Python version
echo "📋 Checking Python version..."
python_version=$(python3 --version 2>&1 | awk '{print $2}' | cut -d. -f1,2)
required_version="3.8"

if [ "$(printf '%s\n' "$required_version" "$python_version" | sort -V | head -n1)" = "$required_version" ]; then
    echo "✅ Python version $python_version is compatible"
else
    echo "❌ Python $python_version detected. Requires Python 3.8 or higher"
    exit 1
fi

# Check if pip is installed
echo "📦 Checking pip..."
if ! command -v pip3 &> /dev/null; then
    echo "❌ pip3 not found. Please install pip3 first"
    exit 1
fi
echo "✅ pip3 found"

# Create virtual environment (optional but recommended)
echo "🏗️  Creating virtual environment..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "✅ Virtual environment created"
else
    echo "✅ Virtual environment already exists"
fi

# Activate virtual environment
echo "🔄 Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo "⬆️  Upgrading pip..."
pip install --upgrade pip

# Install requirements
echo "📚 Installing Python dependencies..."
if [ -f "requirements.txt" ]; then
    pip install -r requirements.txt
    echo "✅ Dependencies installed"
else
    echo "❌ requirements.txt not found"
    exit 1
fi

# Create .env file if it doesn't exist
echo "📝 Setting up environment..."
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "✅ .env file created from .env.example"
        echo "⚠️  Please edit .env file with your API keys"
    else
        echo "⚠️  Creating basic .env file..."
        cat > .env << EOF
# OpenAI API Key (required for AI extraction)
OPENAI_API_KEY=your-openai-api-key-here

# Supabase Configuration (required for database upload)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key-here
EOF
        echo "✅ Basic .env file created"
        echo "⚠️  Please edit .env file with your actual API keys"
    fi
else
    echo "✅ .env file already exists"
fi

# Create output directories
echo "📁 Creating output directories..."
mkdir -p output/json
mkdir -p logs
echo "✅ Output directories created"

# Make scripts executable
echo "🔧 Making scripts executable..."
chmod +x *.py
echo "✅ Scripts made executable"

# Test installation
echo "🧪 Testing installation..."
python3 -c "import pdfplumber, fitz, openai, supabase; print('✅ All libraries imported successfully')"

echo ""
echo "🎉 Installation complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your API keys"
echo "2. Run test: python3 test_extraction.py"
echo "3. Extract questions: python3 extract_and_upload.py --pdf your_file.pdf"
echo ""
echo "Documentation:"
echo "- Quick Start: cat QUICK_START.md"
echo "- Full Guide: cat README.md"
echo "- Troubleshooting: cat docs/TROUBLESHOOTING.md"
echo ""
echo "To activate virtual environment in future:"
echo "source venv/bin/activate"
