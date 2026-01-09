"""
Python PDF Parser Service
Provides PDF parsing and image conversion endpoints for the IGCSE app
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import traceback
import sys
import os

# Add current directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import existing parser
try:
    from pdf_parser import parse_pdf_content
    PDF_PARSER_AVAILABLE = True
except ImportError:
    print("Warning: pdf_parser.py not found, text parsing will be unavailable")
    PDF_PARSER_AVAILABLE = False

# Import new image converter
try:
    from pdf_to_images import pdf_to_images
    IMAGE_CONVERTER_AVAILABLE = True
except ImportError:
    print("Warning: pdf_to_images.py not found, image conversion will be unavailable")
    IMAGE_CONVERTER_AVAILABLE = False

app = Flask(__name__)
CORS(app)

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'python-pdf-parser',
        'features': {
            'text_parsing': PDF_PARSER_AVAILABLE,
            'image_conversion': IMAGE_CONVERTER_AVAILABLE
        }
    })

@app.route('/parse-pdf', methods=['POST'])
def parse_pdf():
    """
    Parse PDF and extract text content
    Legacy endpoint for text-based extraction
    """
    if not PDF_PARSER_AVAILABLE:
        return jsonify({
            'success': False,
            'error': 'PDF text parser not available'
        }), 503
    
    try:
        if 'file' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No file provided'
            }), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({
                'success': False,
                'error': 'Empty filename'
            }), 400
        
        if not file.filename.lower().endswith('.pdf'):
            return jsonify({
                'success': False,
                'error': 'File must be a PDF'
            }), 400
        
        # Read PDF content
        pdf_bytes = file.read()
        
        # Parse PDF
        result = parse_pdf_content(pdf_bytes)
        
        return jsonify(result)
        
    except Exception as e:
        print(f"Error parsing PDF: {str(e)}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500

@app.route('/pdf-to-images', methods=['POST'])
def convert_pdf_to_images():
    """
    Convert PDF pages to base64-encoded images
    For GPT-4 Vision processing
    """
    if not IMAGE_CONVERTER_AVAILABLE:
        return jsonify({
            'success': False,
            'error': 'PDF to images converter not available. Please install pdf2image and poppler.'
        }), 503
    
    try:
        if 'file' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No file provided'
            }), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({
                'success': False,
                'error': 'Empty filename'
            }), 400
        
        if not file.filename.lower().endswith('.pdf'):
            return jsonify({
                'success': False,
                'error': 'File must be a PDF'
            }), 400
        
        # Get parameters
        start_page = int(request.form.get('start_page', 1))
        end_page = int(request.form.get('end_page', 0))  # 0 = all pages
        dpi = int(request.form.get('dpi', 150))
        format = request.form.get('format', 'PNG').upper()
        
        # Validate parameters
        if dpi < 72 or dpi > 300:
            return jsonify({
                'success': False,
                'error': 'DPI must be between 72 and 300'
            }), 400
        
        if format not in ['PNG', 'JPEG']:
            return jsonify({
                'success': False,
                'error': 'Format must be PNG or JPEG'
            }), 400
        
        # Read PDF content
        pdf_bytes = file.read()
        
        # Convert to images
        result = pdf_to_images(
            pdf_bytes=pdf_bytes,
            start_page=start_page,
            end_page=end_page,
            dpi=dpi,
            format=format
        )
        
        return jsonify(result)
        
    except Exception as e:
        print(f"Error converting PDF to images: {str(e)}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500

@app.route('/capabilities', methods=['GET'])
def get_capabilities():
    """
    Return available capabilities and requirements
    """
    capabilities = {
        'text_parsing': {
            'available': PDF_PARSER_AVAILABLE,
            'endpoint': '/parse-pdf',
            'requirements': ['PyPDF2', 'pdfplumber']
        },
        'image_conversion': {
            'available': IMAGE_CONVERTER_AVAILABLE,
            'endpoint': '/pdf-to-images',
            'requirements': ['pdf2image', 'Pillow', 'poppler-utils']
        }
    }
    
    return jsonify(capabilities)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"Starting Python PDF Parser Service on port {port}")
    print(f"Text parsing available: {PDF_PARSER_AVAILABLE}")
    print(f"Image conversion available: {IMAGE_CONVERTER_AVAILABLE}")
    
    if not IMAGE_CONVERTER_AVAILABLE:
        print("\nTo enable image conversion, install:")
        print("  pip install pdf2image Pillow")
        print("  And install poppler-utils (system dependency)")
    
    app.run(host='0.0.0.0', port=port, debug=True)
