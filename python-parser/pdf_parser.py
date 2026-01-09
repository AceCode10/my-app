#!/usr/bin/env python3
"""
PDF Parser for IGCSE Question Extraction
Wrapper around enhanced_pdf_parser_v2 for the Flask API service
"""

import sys
import os

# Import enhanced parser from same directory
try:
    from enhanced_pdf_parser_v2 import extract_to_dict
    HAS_ENHANCED_PARSER = True
except ImportError:
    HAS_ENHANCED_PARSER = False
    print("Warning: enhanced_pdf_parser_v2 not found")


def parse_pdf_content(pdf_bytes: bytes) -> dict:
    """
    Parse PDF content and return structured data.
    
    Args:
        pdf_bytes: PDF file content as bytes
        
    Returns:
        dict with:
            - success: bool
            - data: dict with cleaned_text, metadata, etc.
            - error: str (if failed)
    """
    if not HAS_ENHANCED_PARSER:
        return {
            'success': False,
            'error': 'Enhanced PDF parser not available. Please ensure enhanced_pdf_parser_v2.py is in scripts/pdf-extractor/'
        }
    
    try:
        # Write bytes to temp file (enhanced parser expects file path)
        import tempfile
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp:
            tmp.write(pdf_bytes)
            tmp_path = tmp.name
        
        try:
            # Extract using enhanced parser
            result = extract_to_dict(tmp_path, max_workers=4)
            
            return {
                'success': True,
                'data': result,
                'page_count': result.get('page_count', 0)
            }
        finally:
            # Clean up temp file
            try:
                os.unlink(tmp_path)
            except:
                pass
    
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }
