# Python PDF Parser Service

This service provides advanced PDF parsing and image conversion capabilities for the IGCSE Simplified application.

## Features

1. **Enhanced Text Extraction** (`/parse-pdf`): Advanced PDF parsing with:
   - Answer line detection (dotted/underlined areas)
   - MCQ table extraction
   - Aggressive artifact removal (margin warnings, CID encoding, barcodes)
   - Cross-page text reconstruction
   - Smart question boundary detection
   - Dual library support (PyMuPDF + pdfplumber)
2. **Image Conversion** (`/pdf-to-images`): Convert PDF pages to base64-encoded images for GPT-4 Vision processing

## Installation

### 1. Install Python Dependencies

```bash
pip install -r requirements.txt
```

### 2. Install System Dependencies (for PDF to Images)

**Windows:**
1. Download poppler for Windows: https://github.com/oschwartz10612/poppler-windows/releases
2. Extract to a location (e.g., `C:\Program Files\poppler`)
3. Add the `bin` folder to your PATH environment variable

**macOS:**
```bash
brew install poppler
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get install poppler-utils
```

## Running the Service

### Quick Start (Windows)
Simply double-click `start.bat` or run:
```bash
start.bat
```

### Manual Start
```bash
# Activate virtual environment (if using one)
venv\Scripts\activate  # Windows
source venv/bin/activate  # macOS/Linux

# Start the service
python app.py
```

The service will start on `http://localhost:5000` by default.

## API Endpoints

### Health Check
```
GET /health
```

Returns service status and available features.

### Parse PDF (Text Extraction)
```
POST /parse-pdf
Content-Type: multipart/form-data

file: <PDF file>
```

Returns extracted text content with metadata.

### PDF to Images (Vision Extraction)
```
POST /pdf-to-images
Content-Type: multipart/form-data

file: <PDF file>
start_page: 1 (optional, default: 1)
end_page: 0 (optional, 0 = all pages)
dpi: 150 (optional, default: 150, range: 72-300)
format: PNG (optional, PNG or JPEG)
```

Returns array of base64-encoded images with metadata.

### Get Capabilities
```
GET /capabilities
```

Returns available features and their requirements.

## Environment Variables

- `PORT`: Server port (default: 5000)
- `PYTHON_PARSER_URL`: Set this in your Next.js `.env` file to point to this service

## Integration with Next.js App

Add to your `.env.local`:
```
PYTHON_PARSER_URL=http://localhost:5000
```

The Next.js API routes will automatically use this service when available.

## Troubleshooting

### "pdf2image not found" or "poppler not found"
- Ensure poppler-utils is installed and in your PATH
- On Windows, verify the poppler `bin` folder is in PATH
- Restart your terminal/IDE after adding to PATH

### "Module not found" errors
- Run `pip install -r requirements.txt` again
- Ensure you're using the correct Python environment

### Port already in use
- Change the port: `PORT=5001 python app.py`
- Or kill the process using port 5000
