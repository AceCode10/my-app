#!/usr/bin/env python3
"""
Flask API Server for Enhanced PDF Parser
Exposes PDF extraction functionality via REST endpoints.

Features:
- Automatic fallback between v2 (optimized) and v1 (stable)
- Performance monitoring and metrics
- Request validation and error handling
- Configurable worker threads
"""

import os
import sys
import tempfile
import time
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Try to import optimized parser first, fallback to v1
try:
    from enhanced_pdf_parser_v2 import extract_to_dict as extract_v2
    PARSER_VERSION = "v2_optimized"
    logger.info("Using enhanced_pdf_parser_v2 (optimized)")
except ImportError as e:
    logger.warning(f"Could not import v2 parser: {e}, falling back to v1")
    try:
        from enhanced_pdf_parser import extract_to_dict as extract_v2
        PARSER_VERSION = "v1_stable"
        logger.info("Using enhanced_pdf_parser (stable)")
    except ImportError as e2:
        logger.error(f"Could not import any parser: {e2}")
        extract_v2 = None
        PARSER_VERSION = "none"

app = Flask(__name__)
CORS(app)  # Enable CORS for Next.js integration

# Configuration
UPLOAD_FOLDER = tempfile.gettempdir()
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_SIZE
MAX_WORKERS = int(os.environ.get('PDF_PARSER_WORKERS', 4))
ALLOWED_EXTENSIONS = {'pdf'}

# Performance metrics
request_count = 0
total_processing_time = 0
error_count = 0

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint with parser info"""
    return jsonify({
        'status': 'healthy',
        'service': 'pdf-parser',
        'version': '1.0.0',
        'parser_version': PARSER_VERSION,
        'max_workers': MAX_WORKERS
    })


@app.route('/metrics', methods=['GET'])
def get_metrics():
    """Get performance metrics"""
    global request_count, total_processing_time, error_count
    
    avg_time = total_processing_time / request_count if request_count > 0 else 0
    success_rate = ((request_count - error_count) / request_count * 100) if request_count > 0 else 100
    
    return jsonify({
        'total_requests': request_count,
        'successful_requests': request_count - error_count,
        'failed_requests': error_count,
        'success_rate_percent': round(success_rate, 2),
        'total_processing_time_seconds': round(total_processing_time, 2),
        'average_processing_time_seconds': round(avg_time, 2),
        'parser_version': PARSER_VERSION,
        'max_workers': MAX_WORKERS
    })


@app.route('/parse-pdf', methods=['POST'])
def parse_pdf():
    """
    Parse PDF file and return structured text with performance tracking.
    
    Request:
        - file: PDF file (multipart/form-data)
        - workers: (optional) Number of parallel workers (default: 4)
    
    Response:
        {
            "success": true,
            "data": {
                "raw_text": "...",
                "cleaned_text": "...",
                "answer_lines": [...],
                "mcq_tables": [...],
                "page_count": 10,
                "metadata": {...}
            }
        }
    """
    global request_count, total_processing_time, error_count
    
    if extract_v2 is None:
        return jsonify({
            'success': False,
            'error': 'PDF parser not available. Please install dependencies: pip install pdfplumber'
        }), 500
    
    # Check if file is present
    if 'file' not in request.files:
        error_count += 1
        return jsonify({
            'success': False,
            'error': 'No file provided'
        }), 400
    
    file = request.files['file']
    
    # Check if file is selected
    if file.filename == '':
        error_count += 1
        return jsonify({
            'success': False,
            'error': 'No file selected'
        }), 400
    
    # Check file extension
    if not allowed_file(file.filename):
        error_count += 1
        return jsonify({
            'success': False,
            'error': 'Invalid file type. Only PDF files are allowed.'
        }), 400
    
    # Get optional workers parameter
    workers = request.form.get('workers', MAX_WORKERS, type=int)
    workers = max(1, min(workers, 8))  # Clamp between 1-8
    
    temp_path = None
    start_time = time.time()
    
    try:
        # Save file temporarily
        filename = secure_filename(file.filename)
        temp_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(temp_path)
        
        file_size = os.path.getsize(temp_path)
        logger.info(f"Processing {filename} ({file_size / 1024 / 1024:.2f} MB) with {workers} workers")
        
        # Extract structured data with optimized parser
        if PARSER_VERSION == "v2_optimized":
            result = extract_v2(temp_path, max_workers=workers)
        else:
            result = extract_v2(temp_path)
        
        # Calculate processing time
        processing_time = time.time() - start_time
        
        # Add performance metrics to metadata
        if 'metadata' not in result:
            result['metadata'] = {}
        
        result['metadata']['processing_time_seconds'] = round(processing_time, 2)
        result['metadata']['file_size_mb'] = round(file_size / 1024 / 1024, 2)
        result['metadata']['parser_version'] = PARSER_VERSION
        result['metadata']['workers_used'] = workers
        
        # Update global metrics
        request_count += 1
        total_processing_time += processing_time
        
        logger.info(f"Processed {filename} in {processing_time:.2f}s - "
                   f"{result.get('page_count', 0)} pages, "
                   f"{len(result.get('answer_lines', []))} answer lines")
        
        # Clean up temp file
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)
        
        return jsonify({
            'success': True,
            'data': result
        })
    
    except Exception as e:
        error_count += 1
        processing_time = time.time() - start_time
        
        logger.error(f"Error processing {file.filename}: {e}", exc_info=True)
        
        # Clean up temp file if it exists
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except:
                pass
        
        return jsonify({
            'success': False,
            'error': str(e),
            'processing_time_seconds': round(processing_time, 2)
        }), 500


@app.route('/parse-text', methods=['POST'])
def parse_text():
    """
    Parse already extracted text (fallback endpoint).
    
    Request:
        {
            "text": "raw PDF text..."
        }
    
    Response:
        {
            "success": true,
            "data": {
                "cleaned_text": "..."
            }
        }
    """
    from enhanced_pdf_parser import clean_pdf_artifacts, normalize_question_markers
    
    data = request.get_json()
    
    if not data or 'text' not in data:
        return jsonify({
            'success': False,
            'error': 'No text provided'
        }), 400
    
    try:
        raw_text = data['text']
        cleaned_text = clean_pdf_artifacts(raw_text)
        cleaned_text = normalize_question_markers(cleaned_text)
        
        return jsonify({
            'success': True,
            'data': {
                'cleaned_text': cleaned_text,
                'metadata': {
                    'original_length': len(raw_text),
                    'cleaned_length': len(cleaned_text)
                }
            }
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.errorhandler(413)
def request_entity_too_large(error):
    """Handle file too large error"""
    return jsonify({
        'success': False,
        'error': f'File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB'
    }), 413


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    debug = os.environ.get('DEBUG', 'false').lower() == 'true'
    
    print(f"Starting PDF Parser API on port {port}")
    print(f"Debug mode: {debug}")
    
    app.run(
        host='0.0.0.0',
        port=port,
        debug=debug
    )
