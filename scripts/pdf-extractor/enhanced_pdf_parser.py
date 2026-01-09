#!/usr/bin/env python3
"""
Enhanced PDF Parser for IGCSE Question Extraction
Extracts structured text with layout preservation, table detection, and answer line identification.
"""

import re
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass, asdict

try:
    import pdfplumber
    HAS_PDFPLUMBER = True
except ImportError:
    HAS_PDFPLUMBER = False

try:
    import fitz  # PyMuPDF
    HAS_PYMUPDF = True
except ImportError:
    HAS_PYMUPDF = False


@dataclass
class AnswerLine:
    """Represents an answer line (dotted/underlined area) in the PDF"""
    page: int
    y_position: float
    length: float
    preceding_text: str


@dataclass
class MCQTable:
    """Represents a detected MCQ options table"""
    page: int
    options: List[Dict[str, str]]
    question_number: Optional[int]


@dataclass
class StructuredText:
    """Enhanced text extraction with structure metadata"""
    raw_text: str
    cleaned_text: str
    answer_lines: List[AnswerLine]
    mcq_tables: List[MCQTable]
    page_count: int
    metadata: Dict


def detect_answer_lines(page) -> List[AnswerLine]:
    """
    Detect answer lines (dotted lines, underscores) in the PDF page.
    These indicate where students should write answers.
    """
    answer_lines = []
    
    if not HAS_PDFPLUMBER:
        return answer_lines
    
    # Get all horizontal lines
    lines = page.lines if hasattr(page, 'lines') else []
    
    # Get text words for context
    words = page.extract_words() if hasattr(page, 'extract_words') else []
    
    for line in lines:
        # Check if line is horizontal and long enough to be an answer line
        if line.get('height', 0) < 2 and line.get('width', 0) > 50:
            y_pos = line.get('top', 0)
            length = line.get('width', 0)
            
            # Find text immediately before this line
            preceding_text = ""
            for word in words:
                word_bottom = word.get('bottom', 0)
                if abs(word_bottom - y_pos) < 10:  # Within 10 points
                    preceding_text = word.get('text', '')
                    break
            
            answer_lines.append(AnswerLine(
                page=page.page_number,
                y_position=y_pos,
                length=length,
                preceding_text=preceding_text
            ))
    
    return answer_lines


def detect_mcq_tables(page) -> List[MCQTable]:
    """
    Detect MCQ option tables in the PDF.
    Common patterns: options laid out in rows/columns.
    """
    mcq_tables = []
    
    if not HAS_PDFPLUMBER:
        return mcq_tables
    
    # Extract tables from page
    tables = page.extract_tables() if hasattr(page, 'extract_tables') else []
    
    for table in tables:
        if not table or len(table) < 2:
            continue
        
        # Check if table looks like MCQ options
        # Pattern: Single row with multiple options, or multiple rows with A/B/C/D labels
        options = []
        
        # Flatten table and look for option patterns
        flat_cells = [cell for row in table for cell in row if cell]
        
        # Pattern 1: "A) Text" or "A. Text" in cells
        mcq_pattern = re.compile(r'^([A-H])\s*[.)]\s*(.+)$', re.IGNORECASE)
        
        for cell in flat_cells:
            if not cell:
                continue
            match = mcq_pattern.match(str(cell).strip())
            if match:
                options.append({
                    'label': match.group(1).upper(),
                    'text': match.group(2).strip()
                })
        
        # Pattern 2: First column is labels (A, B, C), second column is text
        if not options and len(table) > 0 and len(table[0]) >= 2:
            for row in table:
                if len(row) >= 2 and row[0] and row[1]:
                    label = str(row[0]).strip()
                    if re.match(r'^[A-H]$', label, re.IGNORECASE):
                        options.append({
                            'label': label.upper(),
                            'text': str(row[1]).strip()
                        })
        
        if options:
            mcq_tables.append(MCQTable(
                page=page.page_number,
                options=options,
                question_number=None  # Will be inferred from context
            ))
    
    return mcq_tables


def clean_pdf_artifacts(text: str) -> str:
    """
    Remove common PDF extraction artifacts and noise.
    Aggressively removes margin warnings, reversed text, and CID encoding artifacts.
    """
    # Remove CID encoding artifacts (e.g., (cid:44), (cid:1), etc.)
    text = re.sub(r'\(cid:\d+\)', '', text)
    
    # Remove reversed margin warnings (common in rotated text)
    text = re.sub(r'NIGRAM\s+SIHT\s+NI\s+ETIRW\s+TON\s+OD', '', text, flags=re.IGNORECASE)
    text = re.sub(r'DO\s+NOT\s+WRITE\s+IN\s+THIS\s+MARGIN', '', text, flags=re.IGNORECASE)
    
    # Remove page numbers and headers (standalone numbers on lines)
    text = re.sub(r'^\s*\d{1,2}\s*$', '', text, flags=re.MULTILINE)
    text = re.sub(r'\n\s*Page\s+\d+\s*\n', '\n', text, flags=re.IGNORECASE)
    
    # Remove Cambridge/UCLES headers and footers
    text = re.sub(r'©\s*UCLES\s*\d{4}', '', text, flags=re.IGNORECASE)
    text = re.sub(r'Cambridge\s+(?:International\s+)?(?:IGCSE|O\s+Level|A\s+Level)', '', text, flags=re.IGNORECASE)
    
    # Remove margin warnings (multiple patterns)
    text = re.sub(r'Turn\s+over', '', text, flags=re.IGNORECASE)
    text = re.sub(r'\[Turn over\]?', '', text, flags=re.IGNORECASE)
    
    # Remove file references (e.g., 06_0417_11_2025_1.6)
    text = re.sub(r'\d{2}_\d{4}_\d{2}_\d{4}_\d+\.\d+', '', text)
    
    # Remove barcode/encoding artifacts
    text = re.sub(r'[ĬĭĮįİıĲĳĴĵĶķĸĹĺĻļĽľĿŀŁłŃńŅņŇňŉŊŋŌōŎŏŐőŒœŔŕŖŗŘřŚśŜŝŞşŠšŢţŤťŦŧŨũŪūŬŭŮůŰűŲųŴŵŶŷŸŹźŻżŽžſ]{3,}', '', text)
    text = re.sub(r'[Ġ´íÈõÏĪÅĊÝú¸þ×ĥąåÕµõąõĕµåąąµÅÕµÕ]{3,}', '', text)
    
    # Remove asterisk patterns (* 0000800000002 *)
    text = re.sub(r'\*\s*\d+\s*\*', '', text)
    
    # Remove barcode-like patterns
    text = re.sub(r'\|{3,}', '', text)
    text = re.sub(r'[\[\]]{3,}', '', text)
    
    # Remove comma patterns (, ,)
    text = re.sub(r',\s*,', '', text)
    
    # Remove any remaining reversed/garbled text patterns
    text = re.sub(r'(\b[A-Z]{5,}\b\s+){3,}', '', text)
    
    # Remove Unicode replacement characters and other artifacts
    text = re.sub(r'[\ufffd\u0000-\u001f\u007f-\u009f]', '', text)
    
    # Clean up excessive whitespace but preserve paragraph breaks
    text = re.sub(r'\n{4,}', '\n\n', text)
    text = re.sub(r'[ \t]+', ' ', text)
    
    return text.strip()


def normalize_question_markers(text: str) -> str:
    """
    Normalize question numbers, part labels, marks, and answer lines.
    Enhanced to handle cross-page questions and better structure detection.
    """
    # First, join lines that were split across pages
    # Pattern: text ending without punctuation followed by lowercase continuation
    text = re.sub(r'([a-z,])\s*\n\s*([a-z])', r'\1 \2', text)
    
    # Normalize question numbers at line start - be more specific
    # Only match standalone numbers followed by text (not marks like [2])
    text = re.sub(r'^\s*(\d{1,2})\s+([A-Z])', r'\n\nQ\1: \2', text, flags=re.MULTILINE)
    
    # Normalize part labels - preserve the structure
    text = re.sub(r'\n\s*\(([a-z])\)\s*', r'\n(\1) ', text, flags=re.IGNORECASE)
    text = re.sub(r'\n\s*\(([ivx]+)\)\s*', r'\n(\1) ', text, flags=re.IGNORECASE)
    
    # Normalize marks - various formats to [MARKS:X]
    # Handle [2] at end of lines (common Cambridge format)
    text = re.sub(r'\[(\d+)\]\s*$', r'[MARKS:\1]', text, flags=re.MULTILINE)
    text = re.sub(r'\[(\d+)\s*marks?\]', r'[MARKS:\1]', text, flags=re.IGNORECASE)
    text = re.sub(r'\((\d+)\s*marks?\)', r'[MARKS:\1]', text, flags=re.IGNORECASE)
    
    # Normalize answer lines (dotted lines, underscores)
    # Multiple answer lines on same question should be consolidated
    text = re.sub(r'(\.{4,}\s*)+', '[ANSWER_LINE] ', text)
    text = re.sub(r'(_{4,}\s*)+', '[ANSWER_LINE] ', text)
    
    # Ensure marks come after answer lines
    text = re.sub(r'\[MARKS:(\d+)\]\s*\[ANSWER_LINE\]', r'[ANSWER_LINE] [MARKS:\1]', text)
    
    # Clean up multiple consecutive answer line markers
    text = re.sub(r'(\[ANSWER_LINE\]\s*)+', '[ANSWER_LINE] ', text)
    
    return text


def extract_structured_pdf(pdf_path: str) -> StructuredText:
    """
    Main extraction function with enhanced structure detection.
    """
    if not HAS_PDFPLUMBER and not HAS_PYMUPDF:
        raise ImportError(
            "No PDF library available. Install with: pip install pdfplumber PyMuPDF"
        )
    
    raw_text = ""
    all_answer_lines = []
    all_mcq_tables = []
    page_count = 0
    
    # Try PyMuPDF first - better font handling
    if HAS_PYMUPDF:
        doc = fitz.open(pdf_path)
        page_count = len(doc)
        
        for page in doc:
            page_text = page.get_text()
            raw_text += page_text + "\n\n"
        
        doc.close()
        
        # Check if we got good text (not mostly CID artifacts)
        cid_count = raw_text.count('(cid:')
        if cid_count > 100 and HAS_PDFPLUMBER:
            # Too many CID artifacts, try pdfplumber
            raw_text = ""
    
    # Use pdfplumber if PyMuPDF had issues or not available
    if not raw_text and HAS_PDFPLUMBER:
        with pdfplumber.open(pdf_path) as pdf:
            page_count = len(pdf.pages)
            
            for page in pdf.pages:
                # Extract text WITHOUT layout to avoid reversed text
                page_text = page.extract_text() or ""
                raw_text += page_text + "\n\n"
                
                # Detect answer lines
                answer_lines = detect_answer_lines(page)
                all_answer_lines.extend(answer_lines)
                
                # Detect MCQ tables
                mcq_tables = detect_mcq_tables(page)
                all_mcq_tables.extend(mcq_tables)
    
    # Clean and normalize
    cleaned_text = clean_pdf_artifacts(raw_text)
    cleaned_text = normalize_question_markers(cleaned_text)
    
    # Build metadata
    metadata = {
        'answer_line_count': len(all_answer_lines),
        'mcq_table_count': len(all_mcq_tables),
        'has_structure_detection': HAS_PDFPLUMBER,
        'extraction_method': 'pdfplumber' if HAS_PDFPLUMBER else 'pymupdf'
    }
    
    return StructuredText(
        raw_text=raw_text,
        cleaned_text=cleaned_text,
        answer_lines=all_answer_lines,
        mcq_tables=all_mcq_tables,
        page_count=page_count,
        metadata=metadata
    )


def extract_to_dict(pdf_path: str) -> Dict:
    """
    Extract PDF and return as dictionary for JSON serialization.
    """
    result = extract_structured_pdf(pdf_path)
    
    return {
        'raw_text': result.raw_text,
        'cleaned_text': result.cleaned_text,
        'answer_lines': [asdict(al) for al in result.answer_lines],
        'mcq_tables': [asdict(mt) for mt in result.mcq_tables],
        'page_count': result.page_count,
        'metadata': result.metadata
    }


if __name__ == '__main__':
    import sys
    import json
    
    if len(sys.argv) < 2:
        print("Usage: python enhanced_pdf_parser.py <pdf_file>")
        sys.exit(1)
    
    pdf_file = sys.argv[1]
    
    try:
        result = extract_to_dict(pdf_file)
        print(json.dumps(result, indent=2))
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
