# Scripts Directory

This directory contains utility scripts for the PDF Question Extractor system.

## 🚀 Quick Start

### Windows Users
```bash
# Run the installation script
scripts\install.bat

# Run all tests
scripts\run_tests.py
```

### Mac/Linux Users
```bash
# Make script executable and run
chmod +x scripts/install.sh
./scripts/install.sh

# Run all tests
python scripts/run_tests.py
```

## 📋 Available Scripts

### `install.sh` / `install.bat`
Automated installation script that:
- Checks Python version (requires 3.8+)
- Creates virtual environment
- Installs all dependencies
- Sets up .env file
- Creates output directories
- Tests the installation

### `run_tests.py`
Comprehensive test suite that:
- Checks environment variables
- Verifies library installations
- Validates file structure
- Runs unit tests
- Tests API connections
- Generates detailed report

### `monitor.py`
Directory monitoring script that:
- Watches for new PDF files
- Automatically processes them
- Maintains processed files log
- Supports continuous monitoring

### `cleanup.py`
Cleanup utility that:
- Removes temporary files
- Cleans old outputs
- Resets processed logs
- Shows disk usage

### `migrate.py`
Data migration tool that:
- Converts old JSON formats
- Validates JSON files
- Updates configurations
- Creates backups

### `benchmark.py`
Performance testing tool that:
- Measures extraction speed
- Tests AI performance
- Runs stress tests
- Generates performance reports

## 🛠️ Manual Installation

If you prefer manual setup:

```bash
# 1. Create virtual environment
python -m venv venv

# 2. Activate it
# Windows: venv\Scripts\activate
# Mac/Linux: source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Set up environment
cp .env.example .env
# Edit .env with your API keys

# 5. Test installation
python test_extraction.py
```

## 📊 Test Results

After running `run_tests.py`, you'll get:
- Console output with pass/fail status
- `test_report.json` with detailed results
- Recommendations for any issues

## 🔧 Troubleshooting

### Installation Issues
- **Python not found**: Install Python 3.8+ from python.org
- **Permission denied**: Run as administrator or use user directories
- **Network errors**: Check internet connection and firewall

### Test Failures
- **Missing API keys**: Edit .env file with your keys
- **Library import errors**: Reinstall with `pip install -r requirements.txt`
- **Connection issues**: Check API keys and network status

## 📁 Directory Structure

```
scripts/
├── install.sh          # Linux/Mac installation script
├── install.bat         # Windows installation script
├── run_tests.py        # Comprehensive test suite
├── monitor.py          # Directory monitoring
├── cleanup.py          # Cleanup utility
├── migrate.py          # Data migration tool
├── benchmark.py        # Performance testing
└── README.md          # This file

../
├── extract_and_upload.py  # Main extraction script
├── batch_process.py       # Batch processing
├── test_extraction.py     # Basic tests
├── requirements.txt       # Dependencies
└── .env.example          # Environment template
```

## 🚀 Usage Examples

### Monitoring a Directory
```bash
# Watch for new PDFs and process them
python scripts/monitor.py --dir ./pdfs --watch --interval 60

# Process all files once
python scripts/monitor.py --dir ./pdfs --process-once
```

### Running Benchmarks
```bash
# Benchmark single PDF
python scripts/benchmark.py --pdf exam_paper.pdf

# Stress test directory
python scripts/benchmark.py --stress ./pdfs/
```

### Cleaning Up
```bash
# Clean temporary files
python scripts/cleanup.py --temp

# Clean old outputs (older than 30 days)
python scripts/cleanup.py --output --days 30

# Clean everything
python scripts/cleanup.py --all
```

### Data Migration
```bash
# Convert old JSON format
python scripts/migrate.py --convert old.json new.json

# Validate JSON file
python scripts/migrate.py --validate questions.json

# Full directory migration
python scripts/migrate.py --migrate --input old_data/ --output new_data/
```

## 🔍 Monitoring Features

The `monitor.py` script provides:
- **Automatic Processing**: Detects and processes new PDFs
- **Logging**: Tracks processed and failed files
- **Resume Capability**: Remembers what was processed
- **Flexible Options**: Upload to database, save JSON, etc.

### Monitor Commands
```bash
# Basic monitoring
python scripts/monitor.py --dir ./pdfs --watch

# With database upload
python scripts/monitor.py --dir ./pdfs --watch --upload --subject-id "uuid"

# One-time processing
python scripts/monitor.py --dir ./pdfs --process-once

# Check status
python scripts/monitor.py --dir ./pdfs --status
```

## 📈 Performance Tips

1. **Use Virtual Environment**: Isolates dependencies
2. **Monitor Resources**: Use benchmark.py to check performance
3. **Batch Processing**: Process multiple files at once
4. **Regular Cleanup**: Use cleanup.py to maintain performance
5. **Monitor Logs**: Check for errors and optimization opportunities

## 🚀 Next Steps

1. Run the installation script
2. Edit .env with your API keys
3. Run tests to verify setup
4. Start extracting questions!

```bash
# Quick test
python test_extraction.py

# Extract from PDF
python extract_and_upload.py --pdf your_file.pdf --output questions.json

# Process multiple files
python batch_process.py --config batch_config.json

# Monitor directory
python scripts/monitor.py --dir ./pdfs --watch
```
