#!/usr/bin/env python3
"""
Enhanced PDF Parser v2 for IGCSE Question Extraction
Optimized for accuracy and performance with advanced structure detection.

Key Improvements:
- Parallel page processing for large PDFs
- Smart text reconstruction for cross-page questions
- Advanced MCQ detection with multiple patterns
- Optimized regex compilation
- Better memory management
- Comprehensive error handling
"""

import re
import logging
from typing import Dict, List, Tuple, Optional, Set
from dataclasses import dataclass, asdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from functools import lru_cache

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

try:
    import pdfplumber
    HAS_PDFPLUMBER = True
except ImportError:
    HAS_PDFPLUMBER = False
    logger.warning("pdfplumber not available - install with: pip install pdfplumber")

try:
    import fitz  # PyMuPDF
    HAS_PYMUPDF = True
except ImportError:
    HAS_PYMUPDF = False
    logger.warning("PyMuPDF not available - install with: pip install PyMuPDF")


@dataclass
class AnswerLine:
    """Represents an answer line (dotted/underlined area) in the PDF"""
    page: int
    y_position: float
    length: float
    preceding_text: str
    confidence: float = 1.0  # Confidence score 0-1


@dataclass
class MCQTable:
    """Represents a detected MCQ options table"""
    page: int
    options: List[Dict[str, str]]
    question_number: Optional[int]
    confidence: float = 1.0


@dataclass
class QuestionBoundary:
    """Represents detected question boundaries for better extraction"""
    question_number: int
    start_page: int
    end_page: int
    start_y: float
    end_y: float


@dataclass
class StructuredText:
    """Enhanced text extraction with structure metadata"""
    raw_text: str
    cleaned_text: str
    answer_lines: List[AnswerLine]
    mcq_tables: List[MCQTable]
    question_boundaries: List[QuestionBoundary]
    page_count: int
    metadata: Dict


# Compile regex patterns once for performance
class RegexPatterns:
    """Pre-compiled regex patterns for better performance"""
    
    # Question detection
    QUESTION_NUMBER = re.compile(r'^\s*(\d{1,2})\s+([A-Z])', re.MULTILINE)
    QUESTION_PREFIX = re.compile(r'^Q(\d{1,2}):\s*', re.IGNORECASE)
    
    # Part labels
    PART_LABEL_LETTER = re.compile(r'\n\s*\(([a-z])\)\s*', re.IGNORECASE)
    PART_LABEL_ROMAN = re.compile(r'\n\s*\(([ivx]+)\)\s*', re.IGNORECASE)
    
    # Marks detection
    MARKS_BRACKET_END = re.compile(r'\[(\d+)\]\s*$', re.MULTILINE)
    MARKS_WORD = re.compile(r'\[(\d+)\s*marks?\]', re.IGNORECASE)
    MARKS_PAREN = re.compile(r'\((\d+)\s*marks?\)', re.IGNORECASE)
    
    # Answer lines
    DOTTED_LINE = re.compile(r'(\.{4,}\s*)+')
    UNDERSCORE_LINE = re.compile(r'(_{4,}\s*)+')
    
    # Artifacts
    PAGE_NUMBER = re.compile(r'^\s*\d{1,2}\s*$', re.MULTILINE)
    PAGE_HEADER = re.compile(r'\n\s*Page\s+\d+\s*\n', re.IGNORECASE)
    UCLES_COPYRIGHT = re.compile(r'©\s*UCLES\s*\d{4}', re.IGNORECASE)
    CAMBRIDGE_HEADER = re.compile(r'Cambridge\s+(?:International\s+)?(?:IGCSE|O\s+Level|A\s+Level)', re.IGNORECASE)
    MARGIN_WARNING = re.compile(r'DO NOT WRITE IN THIS MARGIN', re.IGNORECASE)
    TURN_OVER = re.compile(r'(?:\[)?Turn over(?:\])?', re.IGNORECASE)
    FILE_REFERENCE = re.compile(r'\d{2}_\d{4}_\d{2}_\d{4}_\d+\.\d+')
    BARCODE_CHARS = re.compile(r'[ĬĭĮįİıĲĳĴĵĶķĸĹĺĻļĽľĿŀŁłŃńŅņŇňŉŊŋŌōŎŏŐőŒœŔŕŖŗŘřŚśŜŝŞşŠšŢţŤťŦŧŨũŪūŬŭŮůŰűŲųŴŵŶŷŸŹźŻżŽžſ]{3,}')
    ENCODING_ARTIFACTS = re.compile(r'[Ġ´íÈõÏĪÅĊÝú¸þ×ĥąåÕµõąõĕµåąąµÅÕµÕ]{3,}')
    ASTERISK_PATTERN = re.compile(r'\*\s*\d+\s*\*')
    BARCODE_PIPES = re.compile(r'\|{3,}')
    BARCODE_BRACKETS = re.compile(r'[\[\]]{3,}')
    COMMA_PATTERN = re.compile(r',\s*,')
    
    # MCQ patterns
    MCQ_OPTION = re.compile(r'^([A-H])\s*[.)]\s*(.+)$', re.IGNORECASE)
    MCQ_INLINE = re.compile(r'\b([A-H])\s*[.)]\s*([A-Za-z][^A-H.)\n]{2,})', re.IGNORECASE)
    
    # Text cleaning
    EXCESSIVE_NEWLINES = re.compile(r'\n{4,}')
    EXCESSIVE_SPACES = re.compile(r'[ \t]+')
    
    # Cross-page joining
    SPLIT_SENTENCE = re.compile(r'([a-z,])\s*\n\s*([a-z])')
    HYPHENATED_WORD = re.compile(r'(\w+)-\s*\n\s*(\w+)')


def detect_answer_lines_optimized(page, page_num: int) -> List[AnswerLine]:
    """
    Optimized answer line detection with confidence scoring.
    """
    answer_lines = []
    
    if not HAS_PDFPLUMBER:
        return answer_lines
    
    try:
        # Get horizontal lines efficiently
        lines = page.lines if hasattr(page, 'lines') else []
        if not lines:
            return answer_lines
        
        # Get text words once
        words = page.extract_words() if hasattr(page, 'extract_words') else []
        
        # Build spatial index for faster word lookup
        word_index = {}
        for word in words:
            y_bucket = int(word.get('bottom', 0) / 10) * 10  # 10-point buckets
            if y_bucket not in word_index:
                word_index[y_bucket] = []
            word_index[y_bucket].append(word)
        
        for line in lines:
            height = line.get('height', 0)
            width = line.get('width', 0)
            
            # Filter: horizontal lines, reasonable length
            if height >= 2 or width < 30:
                continue
            
            y_pos = line.get('top', 0)
            
            # Calculate confidence based on line characteristics
            confidence = 1.0
            if width < 50:
                confidence *= 0.7  # Short lines less confident
            if height > 1:
                confidence *= 0.8  # Thicker lines less confident
            
            # Find preceding text using spatial index
            preceding_text = ""
            y_bucket = int(y_pos / 10) * 10
            
            # Check nearby buckets
            for bucket in range(y_bucket - 20, y_bucket + 20, 10):
                if bucket in word_index:
                    for word in word_index[bucket]:
                        word_bottom = word.get('bottom', 0)
                        if abs(word_bottom - y_pos) < 15:
                            preceding_text = word.get('text', '')
                            break
                if preceding_text:
                    break
            
            answer_lines.append(AnswerLine(
                page=page_num,
                y_position=y_pos,
                length=width,
                preceding_text=preceding_text,
                confidence=confidence
            ))
    
    except Exception as e:
        logger.warning(f"Error detecting answer lines on page {page_num}: {e}")
    
    return answer_lines


def detect_mcq_options_advanced(page, page_num: int, page_text: str) -> List[MCQTable]:
    """
    Advanced MCQ detection with multiple strategies.
    """
    mcq_tables = []
    
    if not HAS_PDFPLUMBER:
        return mcq_tables
    
    try:
        # Strategy 1: Table-based detection
        tables = page.extract_tables() if hasattr(page, 'extract_tables') else []
        
        for table in tables:
            if not table or len(table) < 2:
                continue
            
            options = []
            flat_cells = [cell for row in table for cell in row if cell]
            
            # Pattern 1: "A) Text" or "A. Text" in cells
            for cell in flat_cells:
                if not cell:
                    continue
                match = RegexPatterns.MCQ_OPTION.match(str(cell).strip())
                if match:
                    options.append({
                        'label': match.group(1).upper(),
                        'text': match.group(2).strip()
                    })
            
            # Pattern 2: Two-column format (label | text)
            if not options and len(table) > 0 and len(table[0]) >= 2:
                for row in table:
                    if len(row) >= 2 and row[0] and row[1]:
                        label = str(row[0]).strip()
                        if re.match(r'^[A-H]$', label, re.IGNORECASE):
                            options.append({
                                'label': label.upper(),
                                'text': str(row[1]).strip()
                            })
            
            if options and len(options) >= 2:  # At least 2 options
                mcq_tables.append(MCQTable(
                    page=page_num,
                    options=options,
                    question_number=None,
                    confidence=0.9
                ))
        
        # Strategy 2: Inline text-based detection
        # Look for patterns like "A) Option1  B) Option2  C) Option3"
        inline_options = []
        for match in RegexPatterns.MCQ_INLINE.finditer(page_text):
            inline_options.append({
                'label': match.group(1).upper(),
                'text': match.group(2).strip()
            })
        
        if len(inline_options) >= 3:  # At least 3 options for inline
            mcq_tables.append(MCQTable(
                page=page_num,
                options=inline_options,
                question_number=None,
                confidence=0.7  # Lower confidence for inline
            ))
        
        # Strategy 3: Space-separated options on single line
        # "Actuator  Blu-ray disc  Cloud  Keyboard  Hard disk  Printer"
        lines = page_text.split('\n')
        for line in lines:
            words = line.split()
            # If line has 4-8 capitalized words/phrases, might be MCQ options
            if 4 <= len(words) <= 8:
                capitalized = [w for w in words if w and w[0].isupper()]
                if len(capitalized) >= 4:
                    options = [{'label': chr(65 + i), 'text': w} for i, w in enumerate(capitalized)]
                    mcq_tables.append(MCQTable(
                        page=page_num,
                        options=options,
                        question_number=None,
                        confidence=0.6  # Lowest confidence
                    ))
    
    except Exception as e:
        logger.warning(f"Error detecting MCQ options on page {page_num}: {e}")
    
    return mcq_tables


def detect_question_boundaries(text: str) -> List[QuestionBoundary]:
    """
    Detect question number boundaries for better cross-page handling.
    """
    boundaries = []
    
    # Find all question numbers
    for match in RegexPatterns.QUESTION_NUMBER.finditer(text):
        q_num = int(match.group(1))
        boundaries.append(QuestionBoundary(
            question_number=q_num,
            start_page=0,  # Will be updated with page info
            end_page=0,
            start_y=0,
            end_y=0
        ))
    
    return boundaries


@lru_cache(maxsize=128)
def clean_pdf_artifacts_optimized(text: str) -> str:
    """
    Optimized artifact removal with compiled regex patterns.
    Aggressively removes margin warnings, reversed text, and CID encoding artifacts.
    """
    # Remove CID encoding artifacts (e.g., (cid:44), (cid:1), etc.)
    text = re.sub(r'\(cid:\d+\)', '', text)
    
    # Remove reversed margin warnings (common in rotated text)
    text = re.sub(r'NIGRAM\s+SIHT\s+NI\s+ETIRW\s+TON\s+OD', '', text, flags=re.IGNORECASE)
    text = re.sub(r'DO\s+NOT\s+WRITE\s+IN\s+THIS\s+MARGIN', '', text, flags=re.IGNORECASE)
    
    # Remove page numbers and headers
    text = RegexPatterns.PAGE_NUMBER.sub('', text)
    text = RegexPatterns.PAGE_HEADER.sub('\n', text)
    
    # Remove Cambridge/UCLES headers
    text = RegexPatterns.UCLES_COPYRIGHT.sub('', text)
    text = RegexPatterns.CAMBRIDGE_HEADER.sub('', text)
    
    # Remove margin warnings (multiple patterns)
    text = RegexPatterns.MARGIN_WARNING.sub('', text)
    text = RegexPatterns.TURN_OVER.sub('', text)
    text = re.sub(r'Turn\s+over', '', text, flags=re.IGNORECASE)
    
    # Remove file references
    text = RegexPatterns.FILE_REFERENCE.sub('', text)
    
    # Remove barcode/encoding artifacts
    text = RegexPatterns.BARCODE_CHARS.sub('', text)
    text = RegexPatterns.ENCODING_ARTIFACTS.sub('', text)
    text = RegexPatterns.ASTERISK_PATTERN.sub('', text)
    text = RegexPatterns.BARCODE_PIPES.sub('', text)
    text = RegexPatterns.BARCODE_BRACKETS.sub('', text)
    text = RegexPatterns.COMMA_PATTERN.sub('', text)
    
    # Remove any remaining reversed/garbled text patterns
    text = re.sub(r'(\b[A-Z]{5,}\b\s+){3,}', '', text)  # Multiple consecutive uppercase words
    
    # Remove Unicode replacement characters and other artifacts
    text = re.sub(r'[\ufffd\u0000-\u001f\u007f-\u009f]', '', text)
    
    # Clean up whitespace
    text = RegexPatterns.EXCESSIVE_NEWLINES.sub('\n\n', text)
    text = RegexPatterns.EXCESSIVE_SPACES.sub(' ', text)
    
    return text.strip()


def normalize_question_markers_optimized(text: str) -> str:
    """
    Optimized question marker normalization with better cross-page handling.
    """
    # Join hyphenated words split across lines
    text = RegexPatterns.HYPHENATED_WORD.sub(r'\1\2', text)
    
    # Join sentences split across pages
    text = RegexPatterns.SPLIT_SENTENCE.sub(r'\1 \2', text)
    
    # Normalize question numbers
    text = RegexPatterns.QUESTION_NUMBER.sub(r'\n\nQ\1: \2', text)
    
    # Normalize part labels
    text = RegexPatterns.PART_LABEL_LETTER.sub(r'\n(\1) ', text)
    text = RegexPatterns.PART_LABEL_ROMAN.sub(r'\n(\1) ', text)
    
    # Normalize marks - order matters!
    text = RegexPatterns.MARKS_BRACKET_END.sub(r'[MARKS:\1]', text)
    text = RegexPatterns.MARKS_WORD.sub(r'[MARKS:\1]', text)
    text = RegexPatterns.MARKS_PAREN.sub(r'[MARKS:\1]', text)
    
    # Normalize answer lines
    text = RegexPatterns.DOTTED_LINE.sub('[ANSWER_LINE] ', text)
    text = RegexPatterns.UNDERSCORE_LINE.sub('[ANSWER_LINE] ', text)
    
    # Ensure marks come after answer lines
    text = re.sub(r'\[MARKS:(\d+)\]\s*\[ANSWER_LINE\]', r'[ANSWER_LINE] [MARKS:\1]', text)
    
    # Clean up multiple consecutive markers
    text = re.sub(r'(\[ANSWER_LINE\]\s*)+', '[ANSWER_LINE] ', text)
    
    return text


def process_page(page_data: Tuple) -> Dict:
    """
    Process a single page - designed for parallel execution.
    Returns dict with page text and detected structures.
    """
    page, page_num = page_data
    
    try:
        # Extract text WITHOUT layout to avoid reversed/rotated text issues
        # layout=True causes margin warnings to be extracted backwards
        page_text = page.extract_text() or ""
        
        # Detect structures
        answer_lines = detect_answer_lines_optimized(page, page_num)
        mcq_tables = detect_mcq_options_advanced(page, page_num, page_text)
        
        return {
            'page_num': page_num,
            'text': page_text,
            'answer_lines': answer_lines,
            'mcq_tables': mcq_tables,
            'success': True
        }
    
    except Exception as e:
        logger.error(f"Error processing page {page_num}: {e}")
        return {
            'page_num': page_num,
            'text': '',
            'answer_lines': [],
            'mcq_tables': [],
            'success': False,
            'error': str(e)
        }


def extract_structured_pdf_optimized(pdf_path: str, max_workers: int = 4) -> StructuredText:
    """
    Optimized PDF extraction with parallel processing and better accuracy.
    
    Args:
        pdf_path: Path to PDF file
        max_workers: Number of parallel workers (default: 4)
    """
    if not HAS_PDFPLUMBER and not HAS_PYMUPDF:
        raise ImportError(
            "No PDF library available. Install with: pip install pdfplumber PyMuPDF"
        )
    
    raw_text = ""
    all_answer_lines = []
    all_mcq_tables = []
    question_boundaries = []
    page_count = 0
    extraction_method = "unknown"
    
    # Try PyMuPDF first - better font handling, avoids CID encoding issues
    if HAS_PYMUPDF:
        extraction_method = "pymupdf"
        try:
            doc = fitz.open(pdf_path)
            page_count = len(doc)
            
            for page in doc:
                page_text = page.get_text()
                raw_text += page_text + "\n\n"
            
            doc.close()
            
            # If we got good text (not mostly encoding artifacts), use it
            cid_count = raw_text.count('(cid:')
            text_length = len(raw_text)
            
            # If more than 10% is CID artifacts, try pdfplumber
            if text_length > 0 and (cid_count / text_length) > 0.1:
                logger.warning(f"PyMuPDF extracted {cid_count} CID artifacts, trying pdfplumber...")
                raw_text = ""
                extraction_method = "pdfplumber_fallback"
            else:
                logger.info(f"PyMuPDF extraction successful: {text_length} chars")
        except Exception as e:
            logger.error(f"PyMuPDF extraction failed: {e}, trying pdfplumber...")
            raw_text = ""
            extraction_method = "pdfplumber_fallback"
    
    # Use pdfplumber if PyMuPDF failed or not available
    if (not raw_text or extraction_method == "pdfplumber_fallback") and HAS_PDFPLUMBER:
        if extraction_method != "pdfplumber_fallback":
            extraction_method = "pdfplumber_parallel"
        
        with pdfplumber.open(pdf_path) as pdf:
            page_count = len(pdf.pages)
            
            # For small PDFs (< 5 pages), process sequentially
            if page_count < 5:
                extraction_method = "pdfplumber_sequential"
                for page in pdf.pages:
                    result = process_page((page, page.page_number))
                    raw_text += result['text'] + "\n\n"
                    all_answer_lines.extend(result['answer_lines'])
                    all_mcq_tables.extend(result['mcq_tables'])
            
            # For larger PDFs, use parallel processing
            else:
                page_data = [(page, page.page_number) for page in pdf.pages]
                
                with ThreadPoolExecutor(max_workers=max_workers) as executor:
                    futures = {executor.submit(process_page, pd): pd[1] for pd in page_data}
                    
                    # Collect results in order
                    results = {}
                    for future in as_completed(futures):
                        result = future.result()
                        results[result['page_num']] = result
                    
                    # Combine in page order
                    for page_num in sorted(results.keys()):
                        result = results[page_num]
                        raw_text += result['text'] + "\n\n"
                        all_answer_lines.extend(result['answer_lines'])
                        all_mcq_tables.extend(result['mcq_tables'])
    
    # Clean and normalize text
    logger.info(f"Cleaning {len(raw_text)} characters of extracted text...")
    cleaned_text = clean_pdf_artifacts_optimized(raw_text)
    
    logger.info("Normalizing question markers...")
    cleaned_text = normalize_question_markers_optimized(cleaned_text)
    
    # Detect question boundaries
    question_boundaries = detect_question_boundaries(cleaned_text)
    
    # Build metadata
    metadata = {
        'answer_line_count': len(all_answer_lines),
        'mcq_table_count': len(all_mcq_tables),
        'question_boundary_count': len(question_boundaries),
        'has_structure_detection': HAS_PDFPLUMBER,
        'extraction_method': extraction_method,
        'raw_text_length': len(raw_text),
        'cleaned_text_length': len(cleaned_text),
        'compression_ratio': round(len(cleaned_text) / len(raw_text), 2) if raw_text else 0
    }
    
    logger.info(f"Extraction complete: {page_count} pages, {len(all_answer_lines)} answer lines, "
                f"{len(all_mcq_tables)} MCQ tables, {len(question_boundaries)} questions detected")
    
    return StructuredText(
        raw_text=raw_text,
        cleaned_text=cleaned_text,
        answer_lines=all_answer_lines,
        mcq_tables=all_mcq_tables,
        question_boundaries=question_boundaries,
        page_count=page_count,
        metadata=metadata
    )


def extract_to_dict(pdf_path: str, max_workers: int = 4) -> Dict:
    """
    Extract PDF and return as dictionary for JSON serialization.
    
    Args:
        pdf_path: Path to PDF file
        max_workers: Number of parallel workers
    """
    result = extract_structured_pdf_optimized(pdf_path, max_workers)
    
    return {
        'raw_text': result.raw_text,
        'cleaned_text': result.cleaned_text,
        'answer_lines': [asdict(al) for al in result.answer_lines],
        'mcq_tables': [asdict(mt) for mt in result.mcq_tables],
        'question_boundaries': [asdict(qb) for qb in result.question_boundaries],
        'page_count': result.page_count,
        'metadata': result.metadata
    }


if __name__ == '__main__':
    import sys
    import json
    import time
    
    if len(sys.argv) < 2:
        print("Usage: python enhanced_pdf_parser_v2.py <pdf_file> [max_workers]")
        sys.exit(1)
    
    pdf_file = sys.argv[1]
    max_workers = int(sys.argv[2]) if len(sys.argv) > 2 else 4
    
    try:
        start_time = time.time()
        result = extract_to_dict(pdf_file, max_workers)
        elapsed = time.time() - start_time
        
        result['metadata']['extraction_time_seconds'] = round(elapsed, 2)
        
        print(json.dumps(result, indent=2))
        logger.info(f"Extraction completed in {elapsed:.2f} seconds")
        
    except Exception as e:
        logger.error(f"Error: {e}", exc_info=True)
        print(json.dumps({'error': str(e)}), file=sys.stderr)
        sys.exit(1)
