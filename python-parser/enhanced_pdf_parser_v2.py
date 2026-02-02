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
class ParsedQuestion:
    """
    Represents a fully parsed question with support for 3-level hierarchy:
    - Level 1: Main question (e.g., Q2) - may have context_text
    - Level 2: Letter parts (e.g., (a), (b)) - may have context_text
    - Level 3: Roman numeral sub-parts (e.g., (i), (ii))
    
    Example structure from PDF:
    2 A computer system consists of both hardware and software.  <- context for Q2
      (a) Explain what the following types of software...        <- Q2a
      (b) Give two examples of each type of software.            <- context for Q2b
          (i) Applications                                        <- Q2b(i)
          (ii) System                                             <- Q2b(ii)
    """
    question_number: int
    part_label: str  # e.g., "a", "b", "a(i)", "b(ii)", or "" for main question
    question_text: str
    marks: int
    question_type: str  # "mcq", "short_answer", "structured", "essay", "context"
    options: Optional[List[Dict[str, str]]] = None  # For MCQ
    context_text: Optional[str] = None  # Shared context for parent questions
    is_context_only: bool = False  # True if this is just context (no marks)
    parent_part: Optional[str] = None  # Parent part label for sub-parts (e.g., "b" for "b(i)")
    needs_answer: bool = True  # Whether this requires student answer
    
    def get_full_id(self) -> str:
        """Returns full question identifier like '1', '1a', '1a(i)'"""
        if self.part_label:
            return f"{self.question_number}{self.part_label}"
        return str(self.question_number)
    
    def get_hierarchy_level(self) -> int:
        """Returns hierarchy level: 0=main, 1=letter part, 2=roman sub-part"""
        if not self.part_label:
            return 0
        if '(' in self.part_label:  # Has sub-part like "a(i)"
            return 2
        return 1  # Just letter like "a"


@dataclass
class MarkSchemeEntry:
    """Represents a mark scheme answer for a specific question"""
    question_number: int
    part_label: str
    answer_text: str
    marks: int
    accept_alternatives: List[str] = None  # Alternative acceptable answers
    
    def get_full_id(self) -> str:
        """Returns full question identifier like '1', '1a', '1a(i)'"""
        if self.part_label:
            return f"{self.question_number}{self.part_label}"
        return str(self.question_number)


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
    
    # ============================================
    # IMPROVED Question Detection Patterns for Cambridge IGCSE
    # ============================================
    
    # Pattern 1: Standalone question number at start of line followed by text
    # Matches: "1 Circle two items..." or "2 A computer system..."
    QUESTION_STANDALONE = re.compile(r'^(\d{1,2})\s+([A-Z][a-z])', re.MULTILINE)
    
    # Pattern 2: Question number with part label inline
    # Matches: "1(a) Describe..." or "7(b)(i) Explain..."
    QUESTION_WITH_PART = re.compile(r'^(\d{1,2})\s*\(([a-z])\)\s*(?:\(([ivx]+)\))?\s*(.+)', re.MULTILINE | re.IGNORECASE)
    
    # Pattern 3: Mark scheme format "Question Answer Marks" header row
    MARK_SCHEME_HEADER = re.compile(r'Question\s+Answer\s+Marks', re.IGNORECASE)
    
    # Pattern 4: Mark scheme question reference like "1(a)(i)" or "7(b)"
    MARK_SCHEME_QUESTION_REF = re.compile(r'^(\d{1,2})(?:\(([a-z])\))?(?:\(([ivx]+)\))?\s+(.+?)(?:\s+(\d{1,2})\s*)?$', re.MULTILINE | re.IGNORECASE)
    
    # Legacy patterns for backwards compatibility
    QUESTION_NUMBER = re.compile(r'^\s*(\d{1,2})\s+([A-Z])', re.MULTILINE)
    QUESTION_PREFIX = re.compile(r'^Q(\d{1,2}):\s*', re.IGNORECASE)
    QUESTION_AQA = re.compile(r'^\s*0\s*(\d{1,2})\s+', re.MULTILINE)
    QUESTION_TOTAL = re.compile(r'\(Total for Question\s*(\d+)\s*=\s*(\d+)\s*marks?\)', re.IGNORECASE)
    
    # ============================================
    # Part Labels - Enhanced patterns
    # ============================================
    # Matches "(a)" at start of line or after question number
    PART_LABEL_LETTER = re.compile(r'(?:^|\n)\s*\(([a-z])\)\s*', re.IGNORECASE)
    # Matches "(i)", "(ii)", "(iii)" etc.
    PART_LABEL_ROMAN = re.compile(r'(?:^|\n)\s*\(([ivx]+)\)\s*', re.IGNORECASE)
    # Combined part detection for segmentation
    PART_COMBINED = re.compile(r'\(([a-z])\)(?:\s*\(([ivx]+)\))?', re.IGNORECASE)
    
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
    # Edexcel page markers like *P74457RA02332*
    EDEXCEL_PAGE_MARKER = re.compile(r'\*P\d+[A-Z]{2}\d+\*')
    # Unicode box/form characters that appear in scanned PDFs
    UNICODE_BOXES = re.compile(r'[\uf0a2\uf000-\uf0ff]+')
    # Extended Latin characters often from OCR errors
    EXTENDED_LATIN_ARTIFACTS = re.compile(r'[\u0100-\u017f]{4,}')
    # AQA markers
    AQA_MARKERS = re.compile(r'IB/G/[A-Za-z]+\d+/\d+/\d+')
    AQA_DO_NOT_WRITE = re.compile(r'Do not write\s*outside the\s*box', re.IGNORECASE)
    
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
    Uses multiple patterns for better accuracy.
    """
    boundaries = []
    found_numbers: Set[int] = set()
    
    # Pattern 1: Standalone question numbers (most common for Cambridge)
    for match in RegexPatterns.QUESTION_STANDALONE.finditer(text):
        q_num = int(match.group(1))
        if q_num not in found_numbers and 1 <= q_num <= 30:
            found_numbers.add(q_num)
            boundaries.append(QuestionBoundary(
                question_number=q_num,
                start_page=0,
                end_page=0,
                start_y=match.start(),
                end_y=0
            ))
    
    # Pattern 2: Questions with part labels
    for match in RegexPatterns.QUESTION_WITH_PART.finditer(text):
        q_num = int(match.group(1))
        if q_num not in found_numbers and 1 <= q_num <= 30:
            found_numbers.add(q_num)
            boundaries.append(QuestionBoundary(
                question_number=q_num,
                start_page=0,
                end_page=0,
                start_y=match.start(),
                end_y=0
            ))
    
    # Fallback: Legacy pattern
    if not boundaries:
        for match in RegexPatterns.QUESTION_NUMBER.finditer(text):
            q_num = int(match.group(1))
            if q_num not in found_numbers and 1 <= q_num <= 30:
                found_numbers.add(q_num)
                boundaries.append(QuestionBoundary(
                    question_number=q_num,
                    start_page=0,
                    end_page=0,
                    start_y=match.start(),
                    end_y=0
                ))
    
    # Sort by position in text
    boundaries.sort(key=lambda b: b.start_y)
    
    return boundaries


def segment_questions(text: str) -> List[ParsedQuestion]:
    """
    Segment the cleaned text into individual ParsedQuestion objects.
    Uses [Q:X], [PART:X], [SUBPART:X], and [MARKS:X] markers for segmentation.
    
    Supports 3-level hierarchy:
    - Level 0: Main question (Q2) with optional context
    - Level 1: Letter parts (a), (b) - may have their own context
    - Level 2: Roman sub-parts (i), (ii) under letter parts
    """
    questions = []
    
    # PRIMARY STRATEGY: Split by [MARKS:X] markers and use [Q:X]/[PART:X] for numbering
    marks_pattern = re.compile(r'\[MARKS:(\d+)\]')
    marks_positions = list(marks_pattern.finditer(text))
    
    if not marks_positions:
        logger.warning("No [MARKS:X] markers found in text")
        return questions
    
    # Track current question/part state
    current_main_q = 0
    current_part = ''
    current_subpart = ''
    current_context = ''  # Track context for parent questions
    prev_end = 0
    
    # Skip header content - find where actual questions begin
    first_marks = text.find('[MARKS:')
    if first_marks > 0:
        header_text = text[:first_marks]
        for marker in ['indicated.', 'hardware.', 'Any s are indicated.']:
            pos = header_text.rfind(marker)
            if pos > 0:
                prev_end = max(prev_end, pos + len(marker))
    
    for i, marks_match in enumerate(marks_positions):
        marks_val = int(marks_match.group(1))
        segment_text = text[prev_end:marks_match.start()].strip()
        
        if not segment_text or len(segment_text) < 5:
            prev_end = marks_match.end()
            continue
        
        # Reset context tracking when we see a new main question
        q_marker = re.search(r'\[Q:(\d+)\]', segment_text)
        if q_marker:
            new_q_num = int(q_marker.group(1))
            if new_q_num != current_main_q:
                current_main_q = new_q_num
                current_part = ''
                current_subpart = ''
                current_context = ''
        
        # Extract part label from [PART:X] marker
        part_marker = re.search(r'\[PART:([a-z])\]', segment_text, re.IGNORECASE)
        if part_marker:
            new_part = part_marker.group(1).lower()
            if new_part != current_part:
                current_part = new_part
                current_subpart = ''  # Reset subpart when part changes
        
        # Extract subpart from [SUBPART:X] marker
        subpart_marker = re.search(r'\[SUBPART:([ivx]+)\]', segment_text, re.IGNORECASE)
        if subpart_marker:
            current_subpart = subpart_marker.group(1).lower()
        
        # Also check for inline part labels like "(a)" or "(b)(i)"
        if not part_marker and not subpart_marker:
            inline_part = re.search(r'\(([a-z])\)(?:\s*\(([ivx]+)\))?', segment_text, re.IGNORECASE)
            if inline_part:
                new_part = inline_part.group(1).lower()
                if new_part != current_part:
                    current_part = new_part
                    current_subpart = ''
                if inline_part.group(2):
                    current_subpart = inline_part.group(2).lower()
        
        # Build part label - supports 3 levels: "", "a", "a(i)"
        part_label = current_part
        parent_part = None
        if current_subpart:
            parent_part = current_part  # Track parent for hierarchy
            part_label = f"{current_part}({current_subpart})" if current_part else current_subpart
        
        # If no question number yet, try to find one in the segment
        q_num = current_main_q
        if not q_num:
            num_match = re.search(r'(?:^|\s)(\d{1,2})\s+[A-Z]', segment_text)
            if num_match:
                potential_q = int(num_match.group(1))
                context = segment_text[num_match.start():num_match.start()+30].lower()
                if 1 <= potential_q <= 20 and not any(w in context for w in ['hour', 'minute', 'page']):
                    q_num = potential_q
                    current_main_q = q_num
        
        # Infer question number if still missing
        if not q_num:
            q_num = 1 if i == 0 else current_main_q if current_main_q > 0 else i + 1
            current_main_q = q_num
        
        # Clean up question text - remove all markers
        clean_text = segment_text
        clean_text = re.sub(r'\[Q:\d+\]', '', clean_text)
        clean_text = re.sub(r'\[PART:[a-z]\]', '', clean_text, flags=re.IGNORECASE)
        clean_text = re.sub(r'\[SUBPART:[ivx]+\]', '', clean_text, flags=re.IGNORECASE)
        clean_text = re.sub(r'\[ANSWER_LINE\]', '', clean_text)
        clean_text = re.sub(r'^\s*\d{1,2}\s*\([a-z]\)\s*(?:\([ivx]+\))?\s*', '', clean_text, flags=re.IGNORECASE)
        clean_text = re.sub(r'^\s*\([a-z]\)\s*(?:\([ivx]+\))?\s*', '', clean_text, flags=re.IGNORECASE)
        clean_text = re.sub(r'^\s*\d{1,2}\s+', '', clean_text)
        clean_text = ' '.join(clean_text.split()).strip()
        
        # Skip header/footer content
        skip_phrases = ['INSTRUCTIONS', 'INFORMATION', 'copyright', 'UCLES', 'Cambridge Assessment',
                        'Permission to reproduce', 'hour 30 minutes', 'question paper', 'February/March']
        if any(phrase.lower() in clean_text.lower() for phrase in skip_phrases):
            prev_end = marks_match.end()
            continue
        
        # Determine question type based on marks and content
        q_type = "short_answer"
        if marks_val >= 6:
            q_type = "essay"
        elif marks_val >= 4:
            q_type = "structured"
        
        # Check for MCQ
        if re.search(r'(?:DVD|Cloud|Blu-ray|SD card|Flash|circle)', clean_text, re.IGNORECASE):
            q_type = "mcq"
        
        # Determine if this needs an answer (has answer lines in original)
        needs_answer = '[ANSWER_LINE]' in segment_text or marks_val > 0
        
        # Only add if meaningful content
        if q_num > 0 and clean_text and len(clean_text) > 10:
            questions.append(ParsedQuestion(
                question_number=q_num,
                part_label=part_label,
                question_text=clean_text[:500],
                marks=marks_val,
                question_type=q_type,
                options=None,
                context_text=None,  # Will be set during post-processing
                is_context_only=False,
                parent_part=parent_part,
                needs_answer=needs_answer
            ))
        
        prev_end = marks_match.end()
    
    # Sort by question number and part
    questions.sort(key=lambda q: (q.question_number, q.part_label))
    
    return questions


def parse_mark_scheme(text: str) -> List[MarkSchemeEntry]:
    """
    Parse mark scheme text to extract answers keyed by question number and part.
    Handles Cambridge IGCSE mark scheme format.
    
    Cambridge mark scheme format typically:
    - Has "Question Answer Marks" headers
    - Question references like "1", "1(a)", "1(a)(i)"
    - Answer text with marking points
    - Common phrases: "Two from:", "Max three from:", "One mark for each"
    """
    entries = []
    
    # Detect if this is a mark scheme by looking for common patterns
    is_mark_scheme = bool(
        re.search(r'Question\s+Answer\s+Marks', text, re.IGNORECASE) or
        re.search(r'Mark\s+Scheme', text, re.IGNORECASE) or
        re.search(r'(?:Two|Three|Four|One)\s+(?:from|mark)', text, re.IGNORECASE) or
        re.search(r'(?:Max|Maximum)\s+\d+\s+(?:from|marks?)', text, re.IGNORECASE)
    )
    
    if not is_mark_scheme:
        logger.info("Text does not appear to be a mark scheme")
        return entries
    
    logger.info("Detected mark scheme format, parsing...")
    
    # Strategy 1: Find question references with format "1(a)(i)" followed by answer text
    # Pattern matches: "1 Two from:", "1(a) Description...", "7(b)(i) Answer text"
    pattern = re.compile(
        r'(\d{1,2})(?:\(([a-z])\))?(?:\(([ivx]+)\))?\s+'  # Question ref
        r'([A-Z][^0-9\n]{10,}?)'  # Answer text starting with capital, at least 10 chars
        r'(?:\s+(\d{1,2})\s*)?',  # Optional marks at end
        re.IGNORECASE
    )
    
    for match in pattern.finditer(text):
        q_num = int(match.group(1))
        part_a = match.group(2).lower() if match.group(2) else ''
        part_b = match.group(3).lower() if match.group(3) else ''
        answer = match.group(4).strip()
        marks = int(match.group(5)) if match.group(5) else 1
        
        # Skip if this looks like question paper text (has answer lines)
        if '[ANSWER_LINE]' in answer or '[MARKS:' in answer:
            continue
        
        # Skip header/footer content
        if any(skip in answer.lower() for skip in ['ucles', 'cambridge', 'copyright', 'page']):
            continue
        
        # Build part label
        part_label = part_a
        if part_b:
            part_label = f"{part_a}({part_b})"
        
        # Check for duplicates
        full_id = f"{q_num}{part_label}"
        if any(e.get_full_id() == full_id for e in entries):
            continue
        
        # Parse alternative answers
        alternatives = []
        if ' or ' in answer.lower():
            parts = re.split(r'\s+or\s+', answer, flags=re.IGNORECASE)
            answer = parts[0].strip()
            alternatives = [p.strip() for p in parts[1:] if p.strip()]
        
        if len(answer) > 5:  # Minimum answer length
            entries.append(MarkSchemeEntry(
                question_number=q_num,
                part_label=part_label,
                answer_text=answer,
                marks=marks,
                accept_alternatives=alternatives if alternatives else None
            ))
    
    # Strategy 2: Parse by splitting on question number patterns
    # This handles cases where answers span multiple lines
    sections = re.split(r'(?=\d{1,2}(?:\([a-z]\))?(?:\([ivx]+\))?\s+[A-Z])', text)
    
    for section in sections:
        section = section.strip()
        if not section or len(section) < 10:
            continue
        
        # Extract question reference from start
        ref_match = re.match(r'^(\d{1,2})(?:\(([a-z])\))?(?:\(([ivx]+)\))?\s+(.+)', section, re.IGNORECASE | re.DOTALL)
        if not ref_match:
            continue
        
        q_num = int(ref_match.group(1))
        part_a = ref_match.group(2).lower() if ref_match.group(2) else ''
        part_b = ref_match.group(3).lower() if ref_match.group(3) else ''
        answer = ref_match.group(4).strip()
        
        # Build part label
        part_label = part_a
        if part_b:
            part_label = f"{part_a}({part_b})"
        
        # Skip if already exists
        full_id = f"{q_num}{part_label}"
        if any(e.get_full_id() == full_id for e in entries):
            continue
        
        # Skip non-mark-scheme content
        if '[ANSWER_LINE]' in answer or any(skip in answer.lower() for skip in ['ucles', 'copyright']):
            continue
        
        # Extract marks from end if present
        marks = 1
        marks_match = re.search(r'\s+(\d{1,2})\s*$', answer)
        if marks_match:
            marks = int(marks_match.group(1))
            answer = answer[:marks_match.start()].strip()
        
        # Clean up answer text
        answer = ' '.join(answer.split())[:500]  # Limit length, normalize whitespace
        
        if len(answer) > 5 and q_num <= 20:
            entries.append(MarkSchemeEntry(
                question_number=q_num,
                part_label=part_label,
                answer_text=answer,
                marks=marks,
                accept_alternatives=None
            ))
    
    # Sort by question number and part
    entries.sort(key=lambda e: (e.question_number, e.part_label))
    
    logger.info(f"Parsed {len(entries)} mark scheme entries")
    return entries


def match_questions_with_answers(
    questions: List[ParsedQuestion], 
    mark_scheme: List[MarkSchemeEntry]
) -> List[Dict]:
    """
    Match extracted questions with their corresponding mark scheme entries.
    Returns a list of dicts with question data and matched answers.
    """
    results = []
    
    # Build lookup dict for mark scheme entries
    ms_lookup = {}
    for entry in mark_scheme:
        key = entry.get_full_id()
        ms_lookup[key] = entry
    
    for question in questions:
        q_id = question.get_full_id()
        
        result = {
            'question_number': question.question_number,
            'part_label': question.part_label,
            'full_id': q_id,
            'question_text': question.question_text,
            'marks': question.marks,
            'question_type': question.question_type,
            'options': question.options,
            'context_text': question.context_text,
            'is_context_only': question.is_context_only,
            'parent_part': question.parent_part,
            'needs_answer': question.needs_answer,
            'correct_answer': '',
            'mark_scheme': '',
            'alternatives': []
        }
        
        # Try exact match first
        if q_id in ms_lookup:
            entry = ms_lookup[q_id]
            result['correct_answer'] = entry.answer_text
            result['mark_scheme'] = entry.answer_text
            result['marks'] = entry.marks  # Use mark scheme marks if available
            result['alternatives'] = entry.accept_alternatives or []
        
        # Try partial match (question number only) if no exact match
        elif str(question.question_number) in ms_lookup:
            entry = ms_lookup[str(question.question_number)]
            result['mark_scheme'] = entry.answer_text
        
        results.append(result)
    
    return results


@lru_cache(maxsize=128)
def clean_pdf_artifacts_optimized(text: str) -> str:
    """
    Optimized artifact removal with compiled regex patterns.
    Aggressively removes margin warnings, reversed text, and CID encoding artifacts.
    Handles Cambridge, Edexcel, AQA, OCR, and AP exam board formats.
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
    
    # Remove Edexcel-specific markers
    text = RegexPatterns.EDEXCEL_PAGE_MARKER.sub('', text)
    text = RegexPatterns.UNICODE_BOXES.sub('', text)
    
    # Remove extended Latin encoding artifacts (common in scanned PDFs)
    text = RegexPatterns.EXTENDED_LATIN_ARTIFACTS.sub('', text)
    
    # Remove AQA-specific markers
    text = RegexPatterns.AQA_MARKERS.sub('', text)
    text = RegexPatterns.AQA_DO_NOT_WRITE.sub('', text)
    
    # Remove any remaining reversed/garbled text patterns
    text = re.sub(r'(\b[A-Z]{5,}\b\s+){3,}', '', text)  # Multiple consecutive uppercase words
    
    # Remove Unicode replacement characters and other artifacts
    text = re.sub(r'[\ufffd\u0000-\u001f\u007f-\u009f]', '', text)
    
    # Remove BLANK PAGE markers
    text = re.sub(r'BLANK\s*PAGE', '', text, flags=re.IGNORECASE)
    
    # Remove "Extra space" markers from AQA
    text = re.sub(r'Extra\s+space', '', text, flags=re.IGNORECASE)
    
    # Remove specimen/draft watermarks
    text = re.sub(r'\bSPECIMEN\b', '', text)
    text = re.sub(r'\bDRAFT\b', '', text)
    
    # Clean up whitespace
    text = RegexPatterns.EXCESSIVE_NEWLINES.sub('\n\n', text)
    text = RegexPatterns.EXCESSIVE_SPACES.sub(' ', text)
    
    return text.strip()


def normalize_question_markers_optimized(text: str) -> str:
    """
    Simplified text normalization for Cambridge IGCSE papers.
    IMPORTANT: Mark question numbers FIRST while newlines are preserved.
    """
    # STEP 1: Mark question numbers BEFORE collapsing newlines
    # Cambridge format: question number alone on a line, followed by question text
    # Pattern: newline, number (1-20), newline or text starting with capital
    
    # Pattern 1: Number on its own line followed by text
    # Matches: "\n1\nDVD\n" or "\n2\nExplain..."
    text = re.sub(
        r'\n(\d{1,2})\n([A-Z])',
        r'\n[Q:\1] \2',
        text
    )
    
    # Pattern 2: Number followed by part label on next line
    # Matches: "\n7\n(a)\n"
    text = re.sub(
        r'\n(\d{1,2})\n\(([a-z])\)',
        r'\n[Q:\1] (\2)',
        text,
        flags=re.IGNORECASE
    )
    
    # Pattern 3: Part labels on their own line
    # Matches: "\n(a)\n" or "\n(b)\n"
    text = re.sub(
        r'\n\(([a-z])\)\n',
        r'\n[PART:\1] ',
        text,
        flags=re.IGNORECASE
    )
    
    # Pattern 4: Sub-part labels like (i), (ii)
    text = re.sub(
        r'\n\(([ivx]+)\)\n',
        r'\n[SUBPART:\1] ',
        text,
        flags=re.IGNORECASE
    )
    
    # Join hyphenated words split across lines
    text = RegexPatterns.HYPHENATED_WORD.sub(r'\1\2', text)
    
    # Join sentences split across pages
    text = RegexPatterns.SPLIT_SENTENCE.sub(r'\1 \2', text)
    
    # Remove page numbers that appear after copyright notices
    # Pattern: "© UCLES 2024\n2\n\n\n" - the 2 here is a page number
    text = re.sub(r'©\s*UCLES\s*\d{4}\s*\n\s*\d{1,2}\s*\n', '', text)
    
    # Remove file reference codes like 03_0417_12_2024_1.7
    text = re.sub(r'\d{2}_\d{4}_\d{2}_\d{4}_\d+\.\d+', '', text)
    
    # Normalize marks - convert [2] format to [MARKS:2]
    text = re.sub(r'\[(\d{1,2})\]', r' [MARKS:\1] ', text)
    text = RegexPatterns.MARKS_WORD.sub(r' [MARKS:\1] ', text)
    text = RegexPatterns.MARKS_PAREN.sub(r' [MARKS:\1] ', text)
    
    # Normalize answer lines (dotted lines) - consolidate to single marker
    text = RegexPatterns.DOTTED_LINE.sub(' [ANSWER_LINE] ', text)
    text = RegexPatterns.UNDERSCORE_LINE.sub(' [ANSWER_LINE] ', text)
    
    # Clean up multiple consecutive answer line markers
    text = re.sub(r'(\[ANSWER_LINE\]\s*)+', '[ANSWER_LINE] ', text)
    
    # Ensure marks come after answer lines when they're adjacent
    text = re.sub(r'\[MARKS:(\d+)\]\s*\[ANSWER_LINE\]', r'[ANSWER_LINE] [MARKS:\1]', text)
    
    # Clean up excessive whitespace
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = re.sub(r' {2,}', ' ', text)
    
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
    
    # IMPORTANT: Normalize question markers FIRST while newlines are preserved
    # Then clean artifacts (which may collapse some whitespace)
    logger.info("Normalizing question markers...")
    cleaned_text = normalize_question_markers_optimized(raw_text)
    
    logger.info(f"Cleaning {len(cleaned_text)} characters of extracted text...")
    cleaned_text = clean_pdf_artifacts_optimized(cleaned_text)
    
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
    Now includes parsed questions for better accuracy.
    
    Args:
        pdf_path: Path to PDF file
        max_workers: Number of parallel workers
    """
    result = extract_structured_pdf_optimized(pdf_path, max_workers)
    
    # Segment questions from cleaned text
    parsed_questions = segment_questions(result.cleaned_text)
    
    # Check if this might be a mark scheme
    mark_scheme_entries = parse_mark_scheme(result.cleaned_text)
    
    output = {
        'raw_text': result.raw_text,
        'cleaned_text': result.cleaned_text,
        'answer_lines': [asdict(al) for al in result.answer_lines],
        'mcq_tables': [asdict(mt) for mt in result.mcq_tables],
        'question_boundaries': [asdict(qb) for qb in result.question_boundaries],
        'parsed_questions': [asdict(q) for q in parsed_questions],
        'mark_scheme_entries': [asdict(e) for e in mark_scheme_entries],
        'page_count': result.page_count,
        'metadata': result.metadata
    }
    
    # Add question/mark scheme counts to metadata
    output['metadata']['parsed_question_count'] = len(parsed_questions)
    output['metadata']['mark_scheme_entry_count'] = len(mark_scheme_entries)
    output['metadata']['is_mark_scheme'] = len(mark_scheme_entries) > len(parsed_questions)
    
    return output


def extract_and_match(
    question_paper_path: str,
    mark_scheme_path: str,
    max_workers: int = 4
) -> Dict:
    """
    Extract questions from a question paper and match them with mark scheme answers.
    This is the primary function for accurate question-answer extraction.
    
    Args:
        question_paper_path: Path to question paper PDF
        mark_scheme_path: Path to mark scheme PDF
        max_workers: Number of parallel workers
        
    Returns:
        Dict with matched questions containing both question text and answers
    """
    logger.info(f"Extracting question paper: {question_paper_path}")
    qp_result = extract_structured_pdf_optimized(question_paper_path, max_workers)
    
    logger.info(f"Extracting mark scheme: {mark_scheme_path}")
    ms_result = extract_structured_pdf_optimized(mark_scheme_path, max_workers)
    
    # Parse questions from question paper
    questions = segment_questions(qp_result.cleaned_text)
    logger.info(f"Parsed {len(questions)} questions from question paper")
    
    # Parse mark scheme entries
    mark_scheme = parse_mark_scheme(ms_result.cleaned_text)
    logger.info(f"Parsed {len(mark_scheme)} entries from mark scheme")
    
    # Match questions with answers
    matched = match_questions_with_answers(questions, mark_scheme)
    logger.info(f"Matched {sum(1 for m in matched if m['mark_scheme'])} questions with answers")
    
    return {
        'success': True,
        'matched_questions': matched,
        'question_count': len(questions),
        'mark_scheme_count': len(mark_scheme),
        'match_rate': round(sum(1 for m in matched if m['mark_scheme']) / len(matched) * 100, 1) if matched else 0,
        'metadata': {
            'question_paper_pages': qp_result.page_count,
            'mark_scheme_pages': ms_result.page_count,
            'extraction_method': qp_result.metadata.get('extraction_method', 'unknown')
        }
    }


if __name__ == '__main__':
    import sys
    import json
    import time
    
    if len(sys.argv) < 2:
        print("Usage: python enhanced_pdf_parser_v2.py <pdf_file> [max_workers]")
        print("       python enhanced_pdf_parser_v2.py --match <question_paper> <mark_scheme>")
        sys.exit(1)
    
    # Check for --match mode for combined extraction
    if sys.argv[1] == '--match' and len(sys.argv) >= 4:
        qp_file = sys.argv[2]
        ms_file = sys.argv[3]
        
        try:
            start_time = time.time()
            result = extract_and_match(qp_file, ms_file)
            elapsed = time.time() - start_time
            
            result['metadata']['extraction_time_seconds'] = round(elapsed, 2)
            
            print(json.dumps(result, indent=2))
            logger.info(f"Extraction and matching completed in {elapsed:.2f} seconds")
            logger.info(f"Match rate: {result['match_rate']}%")
            
        except Exception as e:
            logger.error(f"Error: {e}", exc_info=True)
            print(json.dumps({'error': str(e)}), file=sys.stderr)
            sys.exit(1)
        
        sys.exit(0)
    
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
