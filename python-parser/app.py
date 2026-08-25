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

# v2 extraction stack: the corrected text layer, deterministic mark-scheme
# tables, and deterministic figure cropping.
try:
    from extract_v2 import extract_document
    from mark_scheme_tables import parse_mark_scheme
    from figure_extractor import extract_document_figures
    V2_AVAILABLE = True
except ImportError as exc:
    print(f"Warning: v2 extraction stack unavailable: {exc}")
    V2_AVAILABLE = False

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
            'image_conversion': IMAGE_CONVERTER_AVAILABLE,
            'v2_extraction': V2_AVAILABLE
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

def _require_v2():
    if not V2_AVAILABLE:
        return jsonify({'success': False, 'error': 'v2 extraction stack unavailable'}), 503
    return None


def _read_upload():
    """Shared multipart validation for the v2 endpoints."""
    if 'file' not in request.files:
        return None, (jsonify({'success': False, 'error': 'No file provided'}), 400)
    file = request.files['file']
    if not file.filename:
        return None, (jsonify({'success': False, 'error': 'Empty filename'}), 400)
    if not file.filename.lower().endswith('.pdf'):
        return None, (jsonify({'success': False, 'error': 'File must be a PDF'}), 400)
    return file.read(), None


@app.route('/v2/extract', methods=['POST'])
def v2_extract():
    """
    PDF -> canonical ParsedDocument.

    The only endpoint the ingestion pipeline needs for question papers. Returns
    per-page text/lines/tables/figures plus the mark-tag and question-anchor
    markers the segmenter works from.
    """
    guard = _require_v2()
    if guard:
        return guard

    try:
        pdf_bytes, error = _read_upload()
        if error:
            return error

        indent_bands = None
        raw_bands = request.form.get('indentBands')
        if raw_bands:
            import json as _json
            try:
                indent_bands = _json.loads(raw_bands)
            except ValueError:
                return jsonify({'success': False, 'error': 'indentBands is not valid JSON'}), 400

        max_pages = request.form.get('maxPages')
        result = extract_document(
            pdf_bytes,
            indent_bands=indent_bands,
            with_figures=request.form.get('withFigures', 'true') != 'false',
            render_figures=request.form.get('renderFigures', 'false') == 'true',
            caption_pattern=request.form.get('captionPattern') or None,
            max_pages=int(max_pages) if max_pages else None,
        )
        return jsonify({'success': True, 'data': result})

    except Exception as e:
        print(f"Error in /v2/extract: {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/v2/mark-scheme', methods=['POST'])
def v2_mark_scheme():
    """
    Mark-scheme PDF -> {ref, answerText, marks, points, answerMap} entries.

    Deterministic; no language model. On boards that publish no answer table
    this returns an empty entry list and the caller escalates to the LLM.
    """
    guard = _require_v2()
    if guard:
        return guard

    try:
        pdf_bytes, error = _read_upload()
        if error:
            return error

        result = parse_mark_scheme(
            pdf_bytes,
            qid_pattern=request.form.get('qidPattern') or None,
            header_pattern=request.form.get('headerPattern') or None,
        )
        return jsonify({'success': True, 'data': result})

    except Exception as e:
        print(f"Error in /v2/mark-scheme: {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/v2/figures', methods=['POST'])
def v2_figures():
    """Detect and render figure crops as base64 PNGs, per page."""
    guard = _require_v2()
    if guard:
        return guard

    try:
        pdf_bytes, error = _read_upload()
        if error:
            return error

        pages = extract_document_figures(
            pdf_bytes,
            render=request.form.get('render', 'true') != 'false',
            caption_pattern=request.form.get('captionPattern') or None,
        )
        return jsonify({'success': True, 'data': {'pages': pages}})

    except Exception as e:
        print(f"Error in /v2/figures: {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


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
        },
        'v2_extraction': {
            'available': V2_AVAILABLE,
            'endpoints': ['/v2/extract', '/v2/mark-scheme', '/v2/figures'],
            'requirements': ['pdfplumber', 'PyMuPDF']
        }
    }
    
    return jsonify(capabilities)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug_mode = os.environ.get('FLASK_ENV') != 'production'
    
    print(f"Starting Python PDF Parser Service on port {port}")
    print(f"Environment: {os.environ.get('FLASK_ENV', 'development')}")
    print(f"Text parsing available: {PDF_PARSER_AVAILABLE}")
    print(f"Image conversion available: {IMAGE_CONVERTER_AVAILABLE}")
    
    if not IMAGE_CONVERTER_AVAILABLE:
        print("\nTo enable image conversion, install:")
        print("  pip install pdf2image Pillow")
        print("  And install poppler-utils (system dependency)")
    
    app.run(host='0.0.0.0', port=port, debug=debug_mode)
