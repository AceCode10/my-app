"""
PDF to Images Converter
Converts PDF pages to base64-encoded images for GPT-4 Vision processing
"""

import io
import base64
from typing import List, Dict, Any
from pdf2image import convert_from_bytes
from PIL import Image

def pdf_to_images(
    pdf_bytes: bytes,
    start_page: int = 1,
    end_page: int = 0,
    dpi: int = 150,
    format: str = 'PNG'
) -> Dict[str, Any]:
    """
    Convert PDF pages to base64-encoded images
    
    Args:
        pdf_bytes: PDF file content as bytes
        start_page: First page to convert (1-indexed)
        end_page: Last page to convert (0 = all pages)
        dpi: Image resolution (150 recommended for vision, 300 for high quality)
        format: Image format (PNG, JPEG)
    
    Returns:
        Dictionary with success status and list of image data
    """
    try:
        # Convert PDF to PIL Images
        if end_page > 0:
            images = convert_from_bytes(
                pdf_bytes,
                dpi=dpi,
                first_page=start_page,
                last_page=end_page,
                fmt=format.lower()
            )
        else:
            images = convert_from_bytes(
                pdf_bytes,
                dpi=dpi,
                first_page=start_page,
                fmt=format.lower()
            )
        
        result_images = []
        
        for idx, img in enumerate(images):
            # Convert PIL Image to base64
            buffer = io.BytesIO()
            
            # Optimize image size for API transmission
            # For vision tasks, we can reduce quality slightly
            if format.upper() == 'JPEG':
                img.save(buffer, format='JPEG', quality=85, optimize=True)
            else:
                # PNG with optimization
                img.save(buffer, format='PNG', optimize=True)
            
            buffer.seek(0)
            img_base64 = base64.b64encode(buffer.read()).decode('utf-8')
            
            result_images.append({
                'page_number': start_page + idx,
                'base64_data': img_base64,
                'width': img.width,
                'height': img.height,
                'format': format.lower()
            })
        
        return {
            'success': True,
            'images': result_images,
            'total_pages': len(result_images),
            'dpi': dpi
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'message': f'Failed to convert PDF to images: {str(e)}'
        }


def optimize_image_for_vision(img: Image.Image, max_dimension: int = 2048) -> Image.Image:
    """
    Optimize image for GPT-4 Vision API
    - Resize if too large (max 2048px on longest side)
    - Maintain aspect ratio
    
    Args:
        img: PIL Image object
        max_dimension: Maximum dimension in pixels
    
    Returns:
        Optimized PIL Image
    """
    width, height = img.size
    
    # Check if resizing is needed
    if width <= max_dimension and height <= max_dimension:
        return img
    
    # Calculate new dimensions maintaining aspect ratio
    if width > height:
        new_width = max_dimension
        new_height = int(height * (max_dimension / width))
    else:
        new_height = max_dimension
        new_width = int(width * (max_dimension / height))
    
    # Resize with high-quality resampling
    return img.resize((new_width, new_height), Image.Resampling.LANCZOS)
